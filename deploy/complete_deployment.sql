-- ═══════════════════════════════════════════════════════════════════════════
-- 🛰️ ANTIGRAVITY AUTO-PILOT — COMPLETE DEPLOYMENT PACKAGE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- @order_13: AUTO_DEPLOY_DNA_VAULT
-- @order_14: ACTIVATE_XP_PERMANENCE_SHIELD
-- @order_15: HOLOGRAPHIC_DATA_SYNDICATION
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run" to execute
-- 4. Verify deployment in Table Editor
--
-- STATUS: AUTO_PILOT_READY 🚀
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🛰️ ORDER 13: AUTO_DEPLOY_DNA_VAULT
-- Deploy 'profiles' and 'xp_vault' tables
-- ═══════════════════════════════════════════════════════════════════════════

-- 📊 PROFILES TABLE (Core Identity)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    xp_total BIGINT DEFAULT 0 NOT NULL CHECK (xp_total >= 0),
    trust_score FLOAT DEFAULT 50.0 NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
    skill_tier INT DEFAULT 1 NOT NULL CHECK (skill_tier >= 1 AND skill_tier <= 10),
    badges JSONB DEFAULT '[]'::jsonb NOT NULL,
    last_sync TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 🏦 XP VAULT TABLE (Permanent XP Storage)
CREATE TABLE IF NOT EXISTS xp_vault (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    xp_total BIGINT DEFAULT 0 NOT NULL CHECK (xp_total >= 0),
    xp_lifetime BIGINT DEFAULT 0 NOT NULL CHECK (xp_lifetime >= 0),
    last_deposit_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_deposit_amount BIGINT DEFAULT 0 NOT NULL,
    last_deposit_source TEXT,
    deposit_count BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT xp_must_be_positive CHECK (xp_total >= 0 AND xp_lifetime >= 0)
);

-- 📜 PROFILE HISTORY TABLE (Immutable Audit)
CREATE TABLE IF NOT EXISTS profile_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source_orb TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ⚡ XP LEDGER TABLE (Append-Only)
CREATE TABLE IF NOT EXISTS xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    base_amount INT NOT NULL CHECK (base_amount >= 0),
    multiplier FLOAT DEFAULT 1.0 NOT NULL,
    amount INT NOT NULL CHECK (amount >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 🔥 USER STREAKS TABLE (for Grit calculation)
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0 NOT NULL,
    longest_streak INT DEFAULT 0 NOT NULL,
    last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
    streak_started_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 📊 DRILL PERFORMANCE TABLE (for Skill calculation)
CREATE TABLE IF NOT EXISTS drill_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    drill_type TEXT NOT NULL,
    accuracy FLOAT NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    speed_score FLOAT DEFAULT 0,
    ev_loss FLOAT DEFAULT 0,
    gto_compliance FLOAT DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    session_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 🎭 PLAYER TRAITS TABLE (for Aggression/Grit hologram)
CREATE TABLE IF NOT EXISTS player_traits (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    aggression_score FLOAT DEFAULT 50 CHECK (aggression_score >= 0 AND aggression_score <= 100),
    grit_score FLOAT DEFAULT 50 CHECK (grit_score >= 0 AND grit_score <= 100),
    adaptability_score FLOAT DEFAULT 50,
    tilt_resistance FLOAT DEFAULT 50,
    risk_tolerance FLOAT DEFAULT 50,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🚨 XP SECURITY ALERTS TABLE
CREATE TABLE IF NOT EXISTS xp_security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'XP_DECREASE_ATTEMPT', 
        'LIFETIME_TAMPER_ATTEMPT',
        'UNAUTHORIZED_WRITE_ATTEMPT',
        'SILO_BREACH_ATTEMPT'
    )),
    severity TEXT DEFAULT 'CRITICAL' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    old_value BIGINT,
    attempted_value BIGINT,
    blocked BOOLEAN DEFAULT TRUE,
    source_ip TEXT,
    source_silo TEXT,
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 🔐 SILO REGISTRY TABLE
CREATE TABLE IF NOT EXISTS silo_registry (
    silo_id TEXT PRIMARY KEY,
    silo_name TEXT NOT NULL,
    silo_color TEXT NOT NULL CHECK (silo_color IN ('RED', 'GREEN', 'YELLOW', 'ORANGE', 'BLUE', 'PURPLE')),
    api_key_hash TEXT NOT NULL,
    permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb,
    rate_limit_per_minute INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_handshake_at TIMESTAMPTZ
);

-- 📋 SILO HANDSHAKE LOG TABLE
CREATE TABLE IF NOT EXISTS silo_handshake_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('READ', 'WRITE', 'BLOCKED', 'HANDSHAKE')),
    target_table TEXT,
    target_user_id UUID,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 📊 DNA VERSION CONTROL TABLE
CREATE TABLE IF NOT EXISTS dna_version_control (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_version BIGINT DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    update_source TEXT DEFAULT 'SYSTEM' NOT NULL,
    change_hash TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_skill_tier ON profiles(skill_tier DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp_total ON profiles(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_xp_vault_user ON xp_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_vault_total ON xp_vault(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_id ON xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_created_at ON xp_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_perf_user ON drill_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_perf_completed ON drill_performance(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_security_alerts_user ON xp_security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_security_alerts_type ON xp_security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_silo_handshake_silo ON silo_handshake_log(silo_id);

-- Insert default silo registry
INSERT INTO silo_registry (silo_id, silo_name, silo_color, api_key_hash, permissions)
VALUES (
    'RED_IDENTITY_DNA',
    'Identity DNA Engine',
    'RED',
    encode(sha256('RED_SOVEREIGN_KEY_2026'::bytea), 'hex'),
    '{"read": true, "write": true, "admin": true}'::jsonb
)
ON CONFLICT (silo_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    last_handshake_at = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ ORDER 13 COMPLETE: DNA VAULT DEPLOYED
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ ORDER 14: ACTIVATE_XP_PERMANENCE_SHIELD
-- Deploy 'prevent_xp_loss' Postgres Trigger
-- Law: XP decrease detected → AUTO-ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════════

-- 🛡️ XP SHIELD FUNCTION: prevent_xp_loss
CREATE OR REPLACE FUNCTION prevent_xp_loss()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 🛡️ ANTIGRAVITY SHIELD CHECK
    -- XP can ONLY INCREMENT. Any decrease triggers AUTO-ROLLBACK.
    -- ═══════════════════════════════════════════════════════════════════
    
    IF NEW.xp_total < OLD.xp_total THEN
        -- Log security alert BEFORE rollback
        INSERT INTO xp_security_alerts (
            user_id,
            alert_type,
            severity,
            old_value,
            attempted_value,
            blocked,
            source_silo,
            metadata
        ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id, OLD.id),
            'XP_DECREASE_ATTEMPT',
            'CRITICAL',
            OLD.xp_total,
            NEW.xp_total,
            TRUE,
            TG_TABLE_NAME,
            jsonb_build_object(
                'trigger_name', TG_NAME,
                'operation', TG_OP,
                'attempted_loss', OLD.xp_total - NEW.xp_total,
                'timestamp', NOW(),
                'shield', 'ANTIGRAVITY'
            )
        ) RETURNING id INTO v_alert_id;
        
        -- 🚨 AUTO-ROLLBACK: Raise exception to cancel entire transaction
        RAISE EXCEPTION 
            '🛡️ ANTIGRAVITY_SHIELD_ACTIVATED [Alert: %] | '
            'XP decrease BLOCKED and ROLLED BACK. '
            'Attempted: % → % (Loss: % XP). '
            'User: % | Law: XP is INCREMENT-ONLY.',
            v_alert_id,
            OLD.xp_total, 
            NEW.xp_total, 
            OLD.xp_total - NEW.xp_total,
            COALESCE(NEW.user_id, OLD.user_id, OLD.id);
    END IF;
    
    -- Track deposit metadata for valid increases
    IF NEW.xp_total > OLD.xp_total AND TG_TABLE_NAME = 'xp_vault' THEN
        NEW.last_deposit_at := NOW();
        NEW.last_deposit_amount := NEW.xp_total - OLD.xp_total;
        NEW.deposit_count := COALESCE(OLD.deposit_count, 0) + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Shield to xp_vault
DROP TRIGGER IF EXISTS shield_xp_vault_loss ON xp_vault;
CREATE TRIGGER shield_xp_vault_loss
    BEFORE UPDATE ON xp_vault
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total)
    EXECUTE FUNCTION prevent_xp_loss();

-- Apply Shield to profiles
DROP TRIGGER IF EXISTS shield_profiles_xp_loss ON profiles;
CREATE TRIGGER shield_profiles_xp_loss
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total)
    EXECUTE FUNCTION prevent_xp_loss();

-- 📥 SAFE XP DEPOSIT FUNCTION
CREATE OR REPLACE FUNCTION deposit_xp(
    p_user_id UUID,
    p_amount BIGINT,
    p_source TEXT DEFAULT 'UNKNOWN'
)
RETURNS TABLE (
    success BOOLEAN,
    new_total BIGINT,
    deposit_amount BIGINT,
    message TEXT
) AS $$
DECLARE
    v_new_total BIGINT;
BEGIN
    -- Validate amount (must be positive)
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT 
            FALSE, NULL::BIGINT, p_amount, 'XP deposit must be positive'::TEXT;
        RETURN;
    END IF;
    
    -- Insert or update vault
    INSERT INTO xp_vault (user_id, xp_total, xp_lifetime, last_deposit_source)
    VALUES (p_user_id, p_amount, p_amount, p_source)
    ON CONFLICT (user_id) DO UPDATE SET
        xp_total = xp_vault.xp_total + p_amount,
        xp_lifetime = xp_vault.xp_lifetime + p_amount,
        last_deposit_source = p_source
    RETURNING xp_total INTO v_new_total;
    
    -- Sync to profiles
    UPDATE profiles 
    SET xp_total = v_new_total, last_sync = NOW()
    WHERE id = p_user_id;
    
    -- Log to ledger
    INSERT INTO xp_ledger (user_id, source, base_amount, multiplier, amount)
    VALUES (p_user_id, p_source, p_amount::INT, 1.0, p_amount::INT);
    
    RETURN QUERY SELECT 
        TRUE, v_new_total, p_amount, 
        format('Deposited %s XP from %s', p_amount, p_source)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ ORDER 14 COMPLETE: XP PERMANENCE SHIELD ACTIVATED
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 📡 ORDER 15: HOLOGRAPHIC_DATA_SYNDICATION
-- Sync Radar Chart data stream → Broadcast DNA to silos
-- ═══════════════════════════════════════════════════════════════════════════

-- 📊 DNA RADAR CHART VIEW (for 3D visualization)
DROP VIEW IF EXISTS dna_radar_chart_data CASCADE;
CREATE OR REPLACE VIEW dna_radar_chart_data AS
WITH recent_drills AS (
    SELECT 
        user_id,
        AVG(accuracy) AS avg_accuracy,
        AVG(speed_score) AS avg_speed,
        AVG(gto_compliance) AS avg_gto,
        COUNT(*) AS drill_count
    FROM drill_performance
    WHERE completed_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
),
streak_data AS (
    SELECT 
        user_id,
        current_streak,
        longest_streak,
        LEAST(100, current_streak * 5 + longest_streak * 2) AS grit_score
    FROM user_streaks
)
SELECT 
    p.id AS user_id,
    p.username,
    
    -- 📊 RADAR CHART AXES (0-100 scale)
    ROUND(COALESCE(rd.avg_accuracy * 100, 50)::NUMERIC, 1) AS axis_skill,
    ROUND(COALESCE(sd.grit_score, 50)::NUMERIC, 1) AS axis_grit,
    ROUND(COALESCE(pt.aggression_score, 50)::NUMERIC, 1) AS axis_aggression,
    ROUND(COALESCE(rd.avg_gto * 100, 50)::NUMERIC, 1) AS axis_gto_mastery,
    ROUND(COALESCE(pt.tilt_resistance, 50)::NUMERIC, 1) AS axis_tilt_resistance,
    ROUND(COALESCE(rd.avg_speed, 50)::NUMERIC, 1) AS axis_speed,
    
    -- 🎯 COMPOSITE DNA SCORE
    ROUND((
        COALESCE(rd.avg_accuracy * 100, 50) * 0.25 +
        COALESCE(sd.grit_score, 50) * 0.20 +
        COALESCE(pt.aggression_score, 50) * 0.15 +
        COALESCE(rd.avg_gto * 100, 50) * 0.20 +
        COALESCE(pt.tilt_resistance, 50) * 0.10 +
        COALESCE(rd.avg_speed, 50) * 0.10
    )::NUMERIC, 2) AS dna_composite_score,
    
    -- 🏆 TIER INFO
    p.skill_tier,
    CASE p.skill_tier
        WHEN 10 THEN 'LEGEND'
        WHEN 9 THEN 'MASTER'
        WHEN 8 THEN 'ELITE'
        WHEN 7 THEN 'DIAMOND'
        WHEN 6 THEN 'PLATINUM'
        WHEN 5 THEN 'GOLD'
        WHEN 4 THEN 'SILVER'
        WHEN 3 THEN 'BRONZE'
        WHEN 2 THEN 'APPRENTICE'
        ELSE 'BEGINNER'
    END AS tier_name,
    p.xp_total,
    p.trust_score,
    
    -- ⏰ FRESHNESS
    p.last_sync,
    COALESCE(rd.drill_count, 0) AS recent_drills,
    COALESCE(sd.current_streak, 0) AS current_streak,
    
    -- 🔮 HOLOGRAM RENDERING DATA
    GREATEST(0.3, p.skill_tier / 10.0) AS hologram_glow,
    CASE 
        WHEN p.skill_tier >= 9 THEN '#FF1493'
        WHEN p.skill_tier >= 7 THEN '#00BFFF'
        WHEN p.skill_tier >= 5 THEN '#FFD700'
        ELSE '#808080'
    END AS hologram_aura
    
FROM profiles p
LEFT JOIN recent_drills rd ON p.id = rd.user_id
LEFT JOIN streak_data sd ON p.id = sd.user_id
LEFT JOIN player_traits pt ON p.id = pt.user_id;

-- 📡 SILO BROADCAST FUNCTION
CREATE OR REPLACE FUNCTION broadcast_dna_to_silo(
    p_user_ids UUID[],
    p_requesting_silo TEXT
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    skill_tier INT,
    tier_name TEXT,
    axis_skill NUMERIC,
    axis_grit NUMERIC,
    axis_aggression NUMERIC,
    axis_gto_mastery NUMERIC,
    dna_composite_score NUMERIC,
    xp_total BIGINT,
    hologram_glow NUMERIC,
    hologram_aura TEXT
) AS $$
BEGIN
    -- Log the broadcast request
    INSERT INTO silo_handshake_log (silo_id, action, metadata)
    VALUES (
        p_requesting_silo, 
        'READ', 
        jsonb_build_object(
            'function', 'broadcast_dna_to_silo',
            'user_count', array_length(p_user_ids, 1),
            'timestamp', NOW()
        )
    );
    
    -- Return DNA data for requested users
    RETURN QUERY
    SELECT 
        r.user_id,
        r.username,
        r.skill_tier,
        r.tier_name,
        r.axis_skill,
        r.axis_grit,
        r.axis_aggression,
        r.axis_gto_mastery,
        r.dna_composite_score,
        r.xp_total,
        r.hologram_glow,
        r.hologram_aura
    FROM dna_radar_chart_data r
    WHERE r.user_id = ANY(p_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📡 GET SINGLE USER DNA SUMMARY
CREATE OR REPLACE FUNCTION get_dna_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', user_id,
        'username', username,
        'generated_at', NOW(),
        'radar_chart', jsonb_build_object(
            'skill', axis_skill,
            'grit', axis_grit,
            'aggression', axis_aggression,
            'gto_mastery', axis_gto_mastery,
            'tilt_resistance', axis_tilt_resistance,
            'speed', axis_speed
        ),
        'composite_score', dna_composite_score,
        'tier', jsonb_build_object(
            'level', skill_tier,
            'name', tier_name,
            'xp', xp_total
        ),
        'hologram', jsonb_build_object(
            'glow', hologram_glow,
            'aura', hologram_aura
        ),
        'activity', jsonb_build_object(
            'recent_drills', recent_drills,
            'current_streak', current_streak,
            'last_sync', last_sync
        )
    ) INTO v_result
    FROM dna_radar_chart_data
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_result, jsonb_build_object('error', 'User not found'));
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_traits ENABLE ROW LEVEL SECURITY;

-- Public read for profiles
CREATE POLICY "Profiles viewable by all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Users see own vault
CREATE POLICY "Users view own vault" ON xp_vault FOR SELECT USING (auth.uid() = user_id);

-- Users see own ledger
CREATE POLICY "Users view own ledger" ON xp_ledger FOR SELECT USING (auth.uid() = user_id);

-- Users see own streaks
CREATE POLICY "Users view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);

-- Users see own drills
CREATE POLICY "Users view own drills" ON drill_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own drills" ON drill_performance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users see own traits
CREATE POLICY "Users view own traits" ON player_traits FOR SELECT USING (auth.uid() = user_id);

-- Security alerts admin only
CREATE POLICY "Alerts admin only" ON xp_security_alerts FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ ORDER 15 COMPLETE: HOLOGRAPHIC DATA SYNDICATION ACTIVE
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🛰️ ANTIGRAVITY AUTO-PILOT — DEPLOYMENT COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🛰️ ANTIGRAVITY AUTO-PILOT — DEPLOYMENT COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   📊 ORDER 13: DNA VAULT           ✅ DEPLOYED';
    RAISE NOTICE '   🛡️ ORDER 14: XP SHIELD           ✅ ACTIVATED';
    RAISE NOTICE '   📡 ORDER 15: DATA SYNDICATION    ✅ ACTIVE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   STATUS: AUTO_PILOT_COMPLETE 🚀';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
