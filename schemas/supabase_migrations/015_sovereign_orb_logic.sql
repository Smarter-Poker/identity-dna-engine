-- ═══════════════════════════════════════════════════════════════════════════
-- 🌐 IDENTITY_DNA_ENGINE — SOVEREIGN ORB LOGIC (ORBS 01, 08, 10)
-- 015_sovereign_orb_logic.sql
-- 
-- @task_44: ORB_01_HOLOGRAPHIC_DNA_EXPANSION
-- @task_45: ORB_08_VARIANCE_SHIELD
-- @task_46: ORB_10_SETTINGS_SOVEREIGNTY
-- 
-- ⚡️ SOVEREIGN_ORB_LOGIC: CROSS-ORB INTEGRATION
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 TASK 44: ORB_01_HOLOGRAPHIC_DNA_EXPANSION
-- Expand DNA to include 'Bankroll_Stability' from Orb 8
-- Radar: Aggression, Grit, Accuracy, Bankroll Management, Social Reputation
-- ═══════════════════════════════════════════════════════════════════════════

-- Add bankroll stability to dna_attributes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dna_attributes' AND column_name = 'bankroll_stability') THEN
        ALTER TABLE dna_attributes ADD COLUMN bankroll_stability FLOAT DEFAULT 0.5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dna_attributes' AND column_name = 'social_reputation') THEN
        ALTER TABLE dna_attributes ADD COLUMN social_reputation FLOAT DEFAULT 0.5;
    END IF;
END $$;

-- Calculate bankroll stability from session history
CREATE OR REPLACE FUNCTION fn_calculate_bankroll_stability(p_user_id UUID)
RETURNS FLOAT AS $$
DECLARE
    v_sessions RECORD;
    v_stability FLOAT := 0.5;
    v_win_rate FLOAT;
    v_variance FLOAT;
    v_session_count INT;
BEGIN
    -- Get session stats from last 30 days
    SELECT 
        COUNT(*) AS total_sessions,
        COALESCE(AVG(CASE WHEN profit > 0 THEN 1.0 ELSE 0.0 END), 0.5) AS win_rate,
        COALESCE(STDDEV(profit), 0) AS profit_variance
    INTO v_sessions
    FROM bankroll_sessions
    WHERE user_id = p_user_id
      AND session_start >= NOW() - INTERVAL '30 days'
      AND cash_out IS NOT NULL;
    
    v_session_count := v_sessions.total_sessions;
    v_win_rate := v_sessions.win_rate;
    v_variance := v_sessions.profit_variance;
    
    -- Not enough data
    IF v_session_count < 5 THEN
        RETURN 0.5;
    END IF;
    
    -- Calculate stability (high win rate + low variance = stable)
    -- Normalize variance (lower is better)
    v_stability := (v_win_rate * 0.6) + ((1.0 - LEAST(v_variance / 1000, 1.0)) * 0.4);
    
    RETURN LEAST(1.0, GREATEST(0.0, v_stability));
END;
$$ LANGUAGE plpgsql STABLE;

-- Extended 6-point Holographic DNA Radar
CREATE OR REPLACE FUNCTION fn_get_holographic_dna_6point(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_dna RECORD;
    v_bankroll_stability FLOAT;
    v_social_reputation FLOAT;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    SELECT * INTO v_dna FROM dna_attributes WHERE user_id = p_user_id;
    
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Calculate bankroll stability
    v_bankroll_stability := fn_calculate_bankroll_stability(p_user_id);
    
    -- Get social reputation (from trust score + activity)
    v_social_reputation := COALESCE(v_profile.trust_score / 100.0, 0.5);
    
    -- Update DNA attributes with calculated values
    UPDATE dna_attributes SET
        bankroll_stability = v_bankroll_stability,
        social_reputation = v_social_reputation
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'version', 'HOLOGRAPHIC_6POINT_V1',
        'generated_at', NOW(),
        'radar', jsonb_build_object(
            'aggression', jsonb_build_object(
                'value', ROUND(COALESCE(v_dna.aggression, 0.5)::NUMERIC, 4),
                'color', '#FF4500',
                'label', 'Aggression'
            ),
            'grit', jsonb_build_object(
                'value', ROUND(COALESCE(v_dna.grit, 0.5)::NUMERIC, 4),
                'color', '#32CD32',
                'label', 'Grit'
            ),
            'accuracy', jsonb_build_object(
                'value', ROUND(COALESCE(v_dna.accuracy, 0.5)::NUMERIC, 4),
                'color', '#00BFFF',
                'label', 'Accuracy'
            ),
            'bankroll_management', jsonb_build_object(
                'value', ROUND(v_bankroll_stability::NUMERIC, 4),
                'color', '#FFD700',
                'label', 'Bankroll Mgmt',
                'source', 'ORB_08'
            ),
            'social_reputation', jsonb_build_object(
                'value', ROUND(v_social_reputation::NUMERIC, 4),
                'color', '#9400D3',
                'label', 'Social Rep',
                'source', 'ORB_03'
            ),
            'composure', jsonb_build_object(
                'value', ROUND(COALESCE(v_dna.adaptability, 0.5)::NUMERIC, 4),
                'color', '#FF1493',
                'label', 'Composure'
            )
        ),
        'hexagon_vertices', jsonb_build_array(
            COALESCE(v_dna.aggression, 0.5),
            COALESCE(v_dna.grit, 0.5),
            COALESCE(v_dna.accuracy, 0.5),
            v_bankroll_stability,
            v_social_reputation,
            COALESCE(v_dna.adaptability, 0.5)
        ),
        'composite_score', ROUND((
            COALESCE(v_dna.aggression, 0.5) * 0.15 +
            COALESCE(v_dna.grit, 0.5) * 0.20 +
            COALESCE(v_dna.accuracy, 0.5) * 0.25 +
            v_bankroll_stability * 0.20 +
            v_social_reputation * 0.10 +
            COALESCE(v_dna.adaptability, 0.5) * 0.10
        )::NUMERIC, 4)
    );
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ TASK 45: ORB_08_VARIANCE_SHIELD
-- Anti-Tilt Bankroll Logic: Flag 'Tilt Alert' if bankroll drops >20% in 24h
-- ═══════════════════════════════════════════════════════════════════════════

-- Tilt alerts table
CREATE TABLE IF NOT EXISTS tilt_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'BANKROLL_DROP', 'LOSS_STREAK', 'SESSION_TILT', 
        'PANIC_BEHAVIOR', 'CHASING_LOSSES', 'OVERPLAY'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    trigger_value FLOAT,
    threshold_value FLOAT,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    show_in_social_shell BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tilt_alerts_user ON tilt_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_tilt_alerts_unack ON tilt_alerts(user_id, acknowledged) WHERE acknowledged = FALSE;

-- Check for 20% bankroll drop in 24h
CREATE OR REPLACE FUNCTION fn_check_bankroll_tilt(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_24h_ago TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
    v_sessions RECORD;
    v_total_buyin DECIMAL(12,2) := 0;
    v_total_cashout DECIMAL(12,2) := 0;
    v_net_change DECIMAL(12,2);
    v_drop_percentage FLOAT;
    v_is_tilt BOOLEAN := FALSE;
    v_alert_id UUID;
BEGIN
    -- Get 24h session summary
    SELECT 
        COALESCE(SUM(buy_in), 0) AS total_buyin,
        COALESCE(SUM(COALESCE(cash_out, 0)), 0) AS total_cashout,
        COUNT(*) AS session_count
    INTO v_sessions
    FROM bankroll_sessions
    WHERE user_id = p_user_id
      AND session_start >= v_24h_ago;
    
    v_total_buyin := v_sessions.total_buyin;
    v_total_cashout := v_sessions.total_cashout;
    v_net_change := v_total_cashout - v_total_buyin;
    
    -- Calculate drop percentage (relative to buy-ins)
    IF v_total_buyin > 0 THEN
        v_drop_percentage := (v_net_change / v_total_buyin) * 100;
    ELSE
        v_drop_percentage := 0;
    END IF;
    
    -- Check for >20% drop
    IF v_drop_percentage < -20 THEN
        v_is_tilt := TRUE;
        
        -- Create tilt alert
        INSERT INTO tilt_alerts (
            user_id, alert_type, severity, 
            trigger_value, threshold_value, message,
            show_in_social_shell, metadata
        ) VALUES (
            p_user_id, 'BANKROLL_DROP', 
            CASE 
                WHEN v_drop_percentage < -50 THEN 'CRITICAL'
                WHEN v_drop_percentage < -35 THEN 'HIGH'
                ELSE 'MEDIUM'
            END,
            v_drop_percentage, -20,
            format('Bankroll dropped %.1f%% in the last 24 hours', ABS(v_drop_percentage)),
            TRUE,
            jsonb_build_object(
                'total_buyin', v_total_buyin,
                'total_cashout', v_total_cashout,
                'net_change', v_net_change,
                'session_count', v_sessions.session_count
            )
        ) RETURNING id INTO v_alert_id;
        
        -- Update DNA with tilt indicator
        UPDATE dna_attributes SET
            adaptability = GREATEST(0.1, COALESCE(adaptability, 0.5) - 0.2),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'checked_at', NOW(),
        'period', '24h',
        'stats', jsonb_build_object(
            'total_buyin', v_total_buyin,
            'total_cashout', v_total_cashout,
            'net_change', v_net_change,
            'drop_percentage', ROUND(v_drop_percentage::NUMERIC, 2)
        ),
        'tilt_detected', v_is_tilt,
        'alert_id', v_alert_id,
        'threshold', -20,
        'show_in_social_shell', v_is_tilt
    );
END;
$$ LANGUAGE plpgsql;

-- Auto-check after session closes
CREATE OR REPLACE FUNCTION fn_auto_tilt_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when session is closed (cash_out is set)
    IF NEW.cash_out IS NOT NULL AND OLD.cash_out IS NULL THEN
        PERFORM fn_check_bankroll_tilt(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_auto_tilt_check ON bankroll_sessions;
CREATE TRIGGER trig_auto_tilt_check
    AFTER UPDATE ON bankroll_sessions
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_tilt_check();

-- Get active tilt alerts for Social Shell
CREATE OR REPLACE FUNCTION fn_get_social_shell_tilt_alerts(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_alerts JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', alert_type,
            'severity', severity,
            'message', message,
            'created_at', created_at
        ) ORDER BY created_at DESC
    )
    INTO v_alerts
    FROM tilt_alerts
    WHERE user_id = p_user_id
      AND show_in_social_shell = TRUE
      AND acknowledged = FALSE
      AND created_at >= NOW() - INTERVAL '7 days';
    
    RETURN COALESCE(v_alerts, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- ⚙️ TASK 46: ORB_10_SETTINGS_SOVEREIGNTY
-- Global Hard Law Toggle: ONLY Orb 10 can modify profile visibility
-- ═══════════════════════════════════════════════════════════════════════════

-- Profile visibility settings (controlled ONLY by Orb 10)
CREATE TABLE IF NOT EXISTS profile_visibility_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    visibility_level TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility_level IN (
        'PUBLIC', 'FRIENDS_ONLY', 'PRIVATE', 'INVISIBLE'
    )),
    show_xp BOOLEAN DEFAULT TRUE,
    show_tier BOOLEAN DEFAULT TRUE,
    show_streak BOOLEAN DEFAULT TRUE,
    show_bankroll_stats BOOLEAN DEFAULT FALSE,
    show_session_history BOOLEAN DEFAULT FALSE,
    show_dna_radar BOOLEAN DEFAULT TRUE,
    show_badges BOOLEAN DEFAULT TRUE,
    show_social_reputation BOOLEAN DEFAULT TRUE,
    modified_by TEXT NOT NULL DEFAULT 'ORB_10',
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Hard Law: Only Orb 10 can modify visibility
CREATE OR REPLACE FUNCTION fn_enforce_visibility_sovereignty()
RETURNS TRIGGER AS $$
DECLARE
    v_caller TEXT;
BEGIN
    -- Get caller context
    v_caller := COALESCE(
        current_setting('app.orb_id', true),
        current_setting('request.headers', true)::jsonb->>'x-orb-id',
        'UNKNOWN'
    );
    
    -- HARD LAW: Only Orb 10 (Command Bridge) can modify visibility
    IF v_caller != 'ORB_10' AND v_caller != 'SYSTEM' THEN
        -- Log the violation
        INSERT INTO immutability_vault (
            event_type, user_id, source_identifier,
            blocked, severity, metadata
        ) VALUES (
            'SUSPICIOUS_PATTERN', 
            COALESCE(NEW.user_id, OLD.user_id),
            v_caller,
            TRUE, 'WARNING',
            jsonb_build_object(
                'violation', 'VISIBILITY_SOVEREIGNTY_BREACH',
                'attempted_by', v_caller,
                'table', 'profile_visibility_settings',
                'operation', TG_OP
            )
        );
        
        RAISE EXCEPTION 
            '⚙️ SETTINGS_SOVEREIGNTY_VIOLATION: Only Orb 10 (Command Bridge) can modify profile visibility. '
            'Attempted by: %. This is a HARD LAW.',
            v_caller
        USING ERRCODE = 'raise_exception';
    END IF;
    
    -- Set modified_by to Orb 10
    NEW.modified_by := 'ORB_10';
    NEW.last_modified := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_visibility_sovereignty ON profile_visibility_settings;
CREATE TRIGGER trig_visibility_sovereignty
    BEFORE INSERT OR UPDATE ON profile_visibility_settings
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_visibility_sovereignty();

-- Orb 10 API to modify visibility (sets proper context)
CREATE OR REPLACE FUNCTION rpc_orb10_set_visibility(
    p_user_id UUID,
    p_visibility_level TEXT DEFAULT NULL,
    p_show_xp BOOLEAN DEFAULT NULL,
    p_show_tier BOOLEAN DEFAULT NULL,
    p_show_streak BOOLEAN DEFAULT NULL,
    p_show_bankroll_stats BOOLEAN DEFAULT NULL,
    p_show_dna_radar BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    -- Set Orb 10 context
    PERFORM set_config('app.orb_id', 'ORB_10', true);
    
    -- Upsert visibility settings
    INSERT INTO profile_visibility_settings (
        user_id, visibility_level, show_xp, show_tier, show_streak,
        show_bankroll_stats, show_dna_radar
    ) VALUES (
        p_user_id,
        COALESCE(p_visibility_level, 'PUBLIC'),
        COALESCE(p_show_xp, TRUE),
        COALESCE(p_show_tier, TRUE),
        COALESCE(p_show_streak, TRUE),
        COALESCE(p_show_bankroll_stats, FALSE),
        COALESCE(p_show_dna_radar, TRUE)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        visibility_level = COALESCE(p_visibility_level, profile_visibility_settings.visibility_level),
        show_xp = COALESCE(p_show_xp, profile_visibility_settings.show_xp),
        show_tier = COALESCE(p_show_tier, profile_visibility_settings.show_tier),
        show_streak = COALESCE(p_show_streak, profile_visibility_settings.show_streak),
        show_bankroll_stats = COALESCE(p_show_bankroll_stats, profile_visibility_settings.show_bankroll_stats),
        show_dna_radar = COALESCE(p_show_dna_radar, profile_visibility_settings.show_dna_radar);
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'modified_by', 'ORB_10',
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get visibility settings (read-only for all orbs)
CREATE OR REPLACE FUNCTION fn_get_visibility_settings(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settings RECORD;
BEGIN
    SELECT * INTO v_settings FROM profile_visibility_settings WHERE user_id = p_user_id;
    
    IF v_settings IS NULL THEN
        -- Return defaults
        RETURN jsonb_build_object(
            'user_id', p_user_id,
            'visibility_level', 'PUBLIC',
            'show_xp', TRUE,
            'show_tier', TRUE,
            'show_streak', TRUE,
            'show_bankroll_stats', FALSE,
            'show_dna_radar', TRUE,
            'is_default', TRUE
        );
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', v_settings.user_id,
        'visibility_level', v_settings.visibility_level,
        'show_xp', v_settings.show_xp,
        'show_tier', v_settings.show_tier,
        'show_streak', v_settings.show_streak,
        'show_bankroll_stats', v_settings.show_bankroll_stats,
        'show_dna_radar', v_settings.show_dna_radar,
        'show_badges', v_settings.show_badges,
        'modified_by', v_settings.modified_by,
        'last_modified', v_settings.last_modified,
        'is_default', FALSE
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ SOVEREIGN ORB LOGIC COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🌐 SOVEREIGN ORB LOGIC (01, 08, 10) — COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🧬 TASK 44: HOLOGRAPHIC_DNA_6POINT     ✅ EXPANDED';
    RAISE NOTICE '   🛡️ TASK 45: VARIANCE_SHIELD            ✅ ACTIVE';
    RAISE NOTICE '   ⚙️ TASK 46: SETTINGS_SOVEREIGNTY       ✅ LOCKED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   6-Point Radar: Aggression, Grit, Accuracy,';
    RAISE NOTICE '                  Bankroll Mgmt, Social Rep, Composure';
    RAISE NOTICE '   Tilt Alert: >20%% bankroll drop in 24h';
    RAISE NOTICE '   Visibility: ONLY Orb 10 can modify';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
