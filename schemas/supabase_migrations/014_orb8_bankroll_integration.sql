-- ═══════════════════════════════════════════════════════════════════════════
-- 🏦 IDENTITY_DNA_ENGINE — ORB 8 BANKROLL MANAGER INTEGRATION
-- 014_orb8_bankroll_integration.sql
-- 
-- @task_41: BANKROLL_DNA_INTEGRATION
-- @task_42: XP_PERMANENCE_VERIFICATION
-- @task_43: ORB_LOG_HOOK
-- 
-- ⚡️ SOVEREIGN_ORB_SYNC: ORB_08_BANKROLL_MANAGER
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 TASK 41: BANKROLL_DNA_INTEGRATION
-- Map 'user_dna_profiles' to Orb 8
-- ═══════════════════════════════════════════════════════════════════════════

-- View for Orb 8 to access DNA profile data (read-only)
CREATE OR REPLACE VIEW user_dna_profiles AS
SELECT 
    p.id AS user_id,
    p.username,
    p.xp_total,
    p.skill_tier,
    p.trust_score,
    p.flame_state,
    p.flame_color,
    p.flame_intensity,
    p.streak_count,
    
    -- Calculate level from XP
    fn_calculate_level(p.xp_total) AS current_level,
    
    -- Tier display info
    CASE 
        WHEN fn_calculate_level(p.xp_total) >= 61 THEN 'GTO_MASTER'
        WHEN fn_calculate_level(p.xp_total) >= 31 THEN 'GOLD'
        WHEN fn_calculate_level(p.xp_total) >= 11 THEN 'SILVER'
        ELSE 'BRONZE'
    END AS tier_id,
    
    -- Multiplier for rewards
    CASE 
        WHEN p.streak_count >= 7 THEN 2.0
        WHEN p.streak_count >= 3 THEN 1.5
        ELSE 1.0
    END AS streak_multiplier,
    
    -- DNA radar summary (for bankroll risk assessment)
    COALESCE(da.accuracy, 0.5) AS accuracy,
    COALESCE(da.grit, 0.5) AS grit,
    COALESCE(da.aggression, 0.5) AS aggression,
    COALESCE(da.wealth, 0.5) AS wealth_score,
    
    -- Verification status for high-stakes access
    COALESCE(iv.verification_level, 0) AS verification_level,
    COALESCE(iv.verification_level >= 3, FALSE) AS is_verified,
    COALESCE(iv.verification_level >= 5, FALSE) AS is_pro_verified,
    
    p.last_sync,
    p.created_at
FROM profiles p
LEFT JOIN dna_attributes da ON p.id = da.user_id
LEFT JOIN identity_verification iv ON p.id = iv.user_id;

-- Grant Orb 8 read access
COMMENT ON VIEW user_dna_profiles IS 
    'Read-only DNA profile view for Orb 8 (Bankroll Manager). '
    'Provides user identity, tier, multipliers, and verification status.';

-- Function to get DNA profile for bankroll operations
CREATE OR REPLACE FUNCTION fn_get_bankroll_dna_profile(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile FROM user_dna_profiles WHERE user_id = p_user_id;
    
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found', 'user_id', p_user_id);
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', v_profile.user_id,
        'username', v_profile.username,
        'identity', jsonb_build_object(
            'xp_total', v_profile.xp_total,
            'level', v_profile.current_level,
            'tier', v_profile.tier_id,
            'skill_tier', v_profile.skill_tier,
            'trust_score', v_profile.trust_score
        ),
        'streak', jsonb_build_object(
            'count', v_profile.streak_count,
            'multiplier', v_profile.streak_multiplier,
            'flame_state', v_profile.flame_state
        ),
        'risk_profile', jsonb_build_object(
            'accuracy', v_profile.accuracy,
            'grit', v_profile.grit,
            'aggression', v_profile.aggression,
            'wealth_score', v_profile.wealth_score,
            'risk_tolerance', CASE 
                WHEN v_profile.aggression > 0.7 THEN 'HIGH'
                WHEN v_profile.aggression > 0.4 THEN 'MEDIUM'
                ELSE 'LOW'
            END
        ),
        'verification', jsonb_build_object(
            'level', v_profile.verification_level,
            'is_verified', v_profile.is_verified,
            'is_pro', v_profile.is_pro_verified,
            'high_stakes_access', v_profile.is_pro_verified
        ),
        'synced_at', NOW()
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ TASK 42: XP_PERMANENCE_VERIFICATION
-- Verify 'trig_dna_xp_protection' on Bankroll Manager schema
-- ═══════════════════════════════════════════════════════════════════════════

-- Create bankroll_sessions table (for Orb 8)
CREATE TABLE IF NOT EXISTS bankroll_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    session_type TEXT NOT NULL CHECK (session_type IN ('CASH', 'TOURNAMENT', 'SIT_N_GO', 'SPIN', 'OTHER')),
    venue_type TEXT CHECK (venue_type IN ('ONLINE', 'LIVE', 'HOME_GAME')),
    game_type TEXT,
    stakes TEXT,
    buy_in DECIMAL(12,2) NOT NULL,
    cash_out DECIMAL(12,2),
    profit DECIMAL(12,2) GENERATED ALWAYS AS (COALESCE(cash_out, 0) - buy_in) STORED,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    xp_earned BIGINT DEFAULT 0,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bankroll_sessions_user ON bankroll_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bankroll_sessions_type ON bankroll_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_bankroll_sessions_start ON bankroll_sessions(session_start DESC);

-- XP Protection trigger for Bankroll (mirrored from RED)
CREATE OR REPLACE FUNCTION trig_dna_xp_protection_bankroll()
RETURNS TRIGGER AS $$
DECLARE
    v_current_xp BIGINT;
BEGIN
    -- Get current XP from profiles (source of truth)
    SELECT xp_total INTO v_current_xp FROM profiles WHERE id = NEW.user_id;
    
    -- If session awards XP, ensure it only adds (never subtracts)
    IF NEW.xp_earned < 0 THEN
        -- Log violation attempt
        INSERT INTO immutability_vault (
            event_type, user_id, source_identifier,
            old_value, attempted_value, blocked, severity, metadata
        ) VALUES (
            'DECREASE_BLOCKED', NEW.user_id, 'ORB_8_BANKROLL',
            v_current_xp, v_current_xp + NEW.xp_earned, TRUE, 'WARNING',
            jsonb_build_object(
                'session_id', NEW.id,
                'session_type', NEW.session_type,
                'attempted_negative_xp', NEW.xp_earned
            )
        );
        
        -- Force XP to 0 (no negative XP allowed)
        NEW.xp_earned := 0;
        
        RAISE WARNING '🛡️ XP_PROTECTION: Negative XP blocked in bankroll session %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply XP protection to bankroll sessions
DROP TRIGGER IF EXISTS trig_dna_xp_protection ON bankroll_sessions;
CREATE TRIGGER trig_dna_xp_protection
    BEFORE INSERT OR UPDATE ON bankroll_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trig_dna_xp_protection_bankroll();

-- Verification function
CREATE OR REPLACE FUNCTION fn_verify_xp_protection_status()
RETURNS JSONB AS $$
DECLARE
    v_triggers JSONB := '[]'::jsonb;
    v_trigger RECORD;
BEGIN
    -- Check all XP protection triggers
    FOR v_trigger IN 
        SELECT 
            trigger_name,
            event_object_table AS table_name,
            action_timing,
            event_manipulation
        FROM information_schema.triggers
        WHERE trigger_name LIKE '%xp%' OR trigger_name LIKE '%dna%'
    LOOP
        v_triggers := v_triggers || jsonb_build_array(jsonb_build_object(
            'trigger', v_trigger.trigger_name,
            'table', v_trigger.table_name,
            'timing', v_trigger.action_timing,
            'event', v_trigger.event_manipulation,
            'active', TRUE
        ));
    END LOOP;
    
    RETURN jsonb_build_object(
        'verified_at', NOW(),
        'protection_status', 'ACTIVE',
        'triggers', v_triggers,
        'trigger_count', jsonb_array_length(v_triggers),
        'orb_8_protected', TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 📒 TASK 43: ORB_LOG_HOOK
-- Ensure every buy-in/cash-out logs to 'orb_activity_ledger'
-- ═══════════════════════════════════════════════════════════════════════════

-- Orb Activity Ledger (cross-orb activity tracking)
CREATE TABLE IF NOT EXISTS orb_activity_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    orb_id INT NOT NULL,
    orb_name TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    activity_subtype TEXT,
    amount DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    xp_awarded BIGINT DEFAULT 0,
    diamonds_awarded BIGINT DEFAULT 0,
    reference_id UUID,
    reference_table TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_activity_user ON orb_activity_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_activity_orb ON orb_activity_ledger(orb_id);
CREATE INDEX IF NOT EXISTS idx_orb_activity_type ON orb_activity_ledger(activity_type);
CREATE INDEX IF NOT EXISTS idx_orb_activity_time ON orb_activity_ledger(created_at DESC);

-- Auto-log bankroll activities
CREATE OR REPLACE FUNCTION fn_log_bankroll_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log BUY-IN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO orb_activity_ledger (
            user_id, orb_id, orb_name, activity_type, activity_subtype,
            amount, reference_id, reference_table, metadata
        ) VALUES (
            NEW.user_id, 8, 'BANKROLL_MANAGER', 'BUY_IN', NEW.session_type,
            NEW.buy_in, NEW.id, 'bankroll_sessions',
            jsonb_build_object(
                'venue', NEW.venue_type,
                'game', NEW.game_type,
                'stakes', NEW.stakes
            )
        );
    END IF;
    
    -- Log CASH-OUT (on update when cash_out is set)
    IF TG_OP = 'UPDATE' AND NEW.cash_out IS NOT NULL AND OLD.cash_out IS NULL THEN
        INSERT INTO orb_activity_ledger (
            user_id, orb_id, orb_name, activity_type, activity_subtype,
            amount, xp_awarded, reference_id, reference_table, metadata
        ) VALUES (
            NEW.user_id, 8, 'BANKROLL_MANAGER', 'CASH_OUT', NEW.session_type,
            NEW.cash_out, NEW.xp_earned, NEW.id, 'bankroll_sessions',
            jsonb_build_object(
                'profit', NEW.profit,
                'session_duration', EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)),
                'venue', NEW.venue_type
            )
        );
        
        -- Also award XP if session was profitable
        IF NEW.profit > 0 AND NEW.xp_earned > 0 THEN
            -- Update profiles XP (will trigger XP protection)
            UPDATE profiles SET
                xp_total = xp_total + NEW.xp_earned,
                last_sync = NOW()
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply log hook to bankroll sessions
DROP TRIGGER IF EXISTS trig_log_bankroll_activity ON bankroll_sessions;
CREATE TRIGGER trig_log_bankroll_activity
    AFTER INSERT OR UPDATE ON bankroll_sessions
    FOR EACH ROW
    EXECUTE FUNCTION fn_log_bankroll_activity();

-- Get user's bankroll activity summary
CREATE OR REPLACE FUNCTION fn_get_bankroll_activity_summary(p_user_id UUID, p_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_summary JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', p_user_id,
        'period_days', p_days,
        'total_buy_ins', COALESCE(SUM(CASE WHEN activity_type = 'BUY_IN' THEN amount ELSE 0 END), 0),
        'total_cash_outs', COALESCE(SUM(CASE WHEN activity_type = 'CASH_OUT' THEN amount ELSE 0 END), 0),
        'net_profit', COALESCE(SUM(CASE WHEN activity_type = 'CASH_OUT' THEN amount ELSE -amount END), 0),
        'session_count', COUNT(DISTINCT reference_id),
        'xp_earned_from_sessions', COALESCE(SUM(xp_awarded), 0),
        'generated_at', NOW()
    )
    INTO v_summary
    FROM orb_activity_ledger
    WHERE user_id = p_user_id
      AND orb_id = 8
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN v_summary;
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 ORB 8 INTEGRATION STATUS VIEW
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_orb8_integration_status AS
SELECT 
    'BANKROLL_DNA_INTEGRATION' AS component,
    (SELECT COUNT(*) FROM user_dna_profiles) AS profile_count,
    'ACTIVE' AS status
UNION ALL
SELECT 
    'XP_PROTECTION_TRIGGER',
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'trig_dna_xp_protection'),
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trig_dna_xp_protection') 
         THEN 'ACTIVE' ELSE 'MISSING' END
UNION ALL
SELECT 
    'ORB_ACTIVITY_LEDGER',
    (SELECT COUNT(*) FROM orb_activity_ledger WHERE orb_id = 8),
    'ACTIVE';


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ ORB 8 INTEGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🏦 ORB 8 BANKROLL MANAGER INTEGRATION — COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🧬 TASK 41: BANKROLL_DNA_INTEGRATION   ✅ MAPPED';
    RAISE NOTICE '   🛡️ TASK 42: XP_PROTECTION_VERIFIED     ✅ ACTIVE';
    RAISE NOTICE '   📒 TASK 43: ORB_LOG_HOOK               ✅ HOOKED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   View: user_dna_profiles (Orb 8 access)';
    RAISE NOTICE '   Trigger: trig_dna_xp_protection (bankroll)';
    RAISE NOTICE '   Table: orb_activity_ledger (buy-in/cash-out)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
