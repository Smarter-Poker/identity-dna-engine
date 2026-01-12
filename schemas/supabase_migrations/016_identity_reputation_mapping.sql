-- ═══════════════════════════════════════════════════════════════════════════
-- 🧠 IDENTITY_DNA_ENGINE — SOVEREIGN MAPPING (51-54)
-- 016_identity_reputation_mapping.sql
-- 
-- @task_51: TILT_SENSOR_DNA
-- @task_52: REPUTATION_DECAY
-- @task_53: BANKROLL_VARIANCE_SIM
-- @task_54: SETTINGS_HARD_LOCK
-- 
-- ⚡️ SOVEREIGN_MAPPING: IDENTITY & REPUTATION
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🎰 TASK 51: TILT_SENSOR_DNA
-- Monitor rapid buy-ins in Orb 8; flag DNA as tilting
-- ═══════════════════════════════════════════════════════════════════════════

-- Tilt sensor configuration
CREATE TABLE IF NOT EXISTS tilt_sensor_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    rapid_buyin_window_minutes INT DEFAULT 60,
    rapid_buyin_threshold INT DEFAULT 3,
    buyin_amount_multiplier FLOAT DEFAULT 2.0,
    cooldown_hours INT DEFAULT 2,
    auto_lockout_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tilt_sensor_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Tilt sensor function
CREATE OR REPLACE FUNCTION fn_tilt_sensor_check(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_rapid_buyins INT;
    v_last_buyin RECORD;
    v_avg_buyin DECIMAL(12,2);
    v_is_tilting BOOLEAN := FALSE;
    v_tilt_score FLOAT := 0;
    v_alert_id UUID;
BEGIN
    SELECT * INTO v_config FROM tilt_sensor_config WHERE id = 'default';
    
    -- Count rapid buy-ins in window
    SELECT COUNT(*), AVG(buy_in)
    INTO v_rapid_buyins, v_avg_buyin
    FROM bankroll_sessions
    WHERE user_id = p_user_id
      AND session_start >= NOW() - (v_config.rapid_buyin_window_minutes || ' minutes')::INTERVAL;
    
    -- Get last buy-in for size comparison
    SELECT * INTO v_last_buyin
    FROM bankroll_sessions
    WHERE user_id = p_user_id
    ORDER BY session_start DESC LIMIT 1;
    
    -- Calculate tilt score (0-1)
    v_tilt_score := LEAST(1.0, (v_rapid_buyins::FLOAT / v_config.rapid_buyin_threshold));
    
    -- Check for rapid buy-in pattern
    IF v_rapid_buyins >= v_config.rapid_buyin_threshold THEN
        v_is_tilting := TRUE;
        
        -- Create tilt alert
        INSERT INTO tilt_alerts (
            user_id, alert_type, severity, trigger_value, threshold_value,
            message, show_in_social_shell, metadata
        ) VALUES (
            p_user_id, 'PANIC_BEHAVIOR', 
            CASE WHEN v_rapid_buyins >= v_config.rapid_buyin_threshold * 2 THEN 'CRITICAL' ELSE 'HIGH' END,
            v_rapid_buyins, v_config.rapid_buyin_threshold,
            format('%s rapid buy-ins detected in %s minutes', v_rapid_buyins, v_config.rapid_buyin_window_minutes),
            TRUE,
            jsonb_build_object('avg_buyin', v_avg_buyin, 'window_minutes', v_config.rapid_buyin_window_minutes)
        ) RETURNING id INTO v_alert_id;
        
        -- Flag DNA with tilt indicator
        UPDATE dna_attributes SET
            adaptability = GREATEST(0.1, COALESCE(adaptability, 0.5) - 0.15),
            grit = GREATEST(0.1, COALESCE(grit, 0.5) - 0.1),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'checked_at', NOW(),
        'rapid_buyins', v_rapid_buyins,
        'threshold', v_config.rapid_buyin_threshold,
        'window_minutes', v_config.rapid_buyin_window_minutes,
        'tilt_score', ROUND(v_tilt_score::NUMERIC, 4),
        'is_tilting', v_is_tilting,
        'alert_id', v_alert_id,
        'dna_updated', v_is_tilting
    );
END;
$$ LANGUAGE plpgsql;

-- Auto-check on new session
CREATE OR REPLACE FUNCTION fn_auto_tilt_sensor()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_tilt_sensor_check(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_tilt_sensor ON bankroll_sessions;
CREATE TRIGGER trig_tilt_sensor
    AFTER INSERT ON bankroll_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_auto_tilt_sensor();


-- ═══════════════════════════════════════════════════════════════════════════
-- 📉 TASK 52: REPUTATION_DECAY
-- Social status drops if inactive (configurable decay rate)
-- ═══════════════════════════════════════════════════════════════════════════

-- Reputation decay configuration
CREATE TABLE IF NOT EXISTS reputation_decay_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    decay_start_days INT DEFAULT 7,
    decay_rate_per_day FLOAT DEFAULT 0.02,
    min_reputation FLOAT DEFAULT 0.1,
    recovery_rate_per_activity FLOAT DEFAULT 0.05,
    max_reputation FLOAT DEFAULT 1.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO reputation_decay_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Calculate reputation decay
CREATE OR REPLACE FUNCTION fn_calculate_reputation_decay(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_profile RECORD;
    v_last_activity TIMESTAMPTZ;
    v_days_inactive INT;
    v_current_reputation FLOAT;
    v_decay_amount FLOAT := 0;
    v_new_reputation FLOAT;
BEGIN
    SELECT * INTO v_config FROM reputation_decay_config WHERE id = 'default';
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Get last activity (most recent of various tables)
    SELECT GREATEST(
        COALESCE((SELECT MAX(session_start) FROM bankroll_sessions WHERE user_id = p_user_id), '1970-01-01'),
        COALESCE((SELECT MAX(completed_at) FROM drill_performance WHERE user_id = p_user_id), '1970-01-01'),
        COALESCE(v_profile.last_sync, '1970-01-01')
    ) INTO v_last_activity;
    
    v_days_inactive := EXTRACT(DAY FROM (NOW() - v_last_activity));
    v_current_reputation := COALESCE(v_profile.trust_score / 100.0, 0.5);
    
    -- Apply decay if inactive beyond threshold
    IF v_days_inactive > v_config.decay_start_days THEN
        v_decay_amount := (v_days_inactive - v_config.decay_start_days) * v_config.decay_rate_per_day;
        v_new_reputation := GREATEST(v_config.min_reputation, v_current_reputation - v_decay_amount);
        
        -- Update profile
        UPDATE profiles SET
            trust_score = v_new_reputation * 100,
            last_sync = NOW()
        WHERE id = p_user_id;
        
        -- Update DNA
        UPDATE dna_attributes SET
            social_reputation = v_new_reputation,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        v_new_reputation := v_current_reputation;
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'last_activity', v_last_activity,
        'days_inactive', v_days_inactive,
        'decay_threshold_days', v_config.decay_start_days,
        'decay_applied', v_decay_amount > 0,
        'decay_amount', ROUND(v_decay_amount::NUMERIC, 4),
        'old_reputation', ROUND(v_current_reputation::NUMERIC, 4),
        'new_reputation', ROUND(v_new_reputation::NUMERIC, 4)
    );
END;
$$ LANGUAGE plpgsql;

-- Reputation recovery on activity
CREATE OR REPLACE FUNCTION fn_reputation_recovery(p_user_id UUID, p_activity_type TEXT DEFAULT 'GENERAL')
RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_current FLOAT;
    v_new FLOAT;
    v_recovery FLOAT;
BEGIN
    SELECT * INTO v_config FROM reputation_decay_config WHERE id = 'default';
    
    SELECT COALESCE(trust_score / 100.0, 0.5) INTO v_current FROM profiles WHERE id = p_user_id;
    
    -- Calculate recovery (bonus for certain activities)
    v_recovery := v_config.recovery_rate_per_activity;
    IF p_activity_type = 'TRAINING' THEN v_recovery := v_recovery * 1.5; END IF;
    IF p_activity_type = 'SOCIAL' THEN v_recovery := v_recovery * 1.2; END IF;
    
    v_new := LEAST(v_config.max_reputation, v_current + v_recovery);
    
    UPDATE profiles SET trust_score = v_new * 100, last_sync = NOW() WHERE id = p_user_id;
    UPDATE dna_attributes SET social_reputation = v_new WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'activity_type', p_activity_type,
        'recovery_amount', ROUND(v_recovery::NUMERIC, 4),
        'old_reputation', ROUND(v_current::NUMERIC, 4),
        'new_reputation', ROUND(v_new::NUMERIC, 4)
    );
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 TASK 53: BANKROLL_VARIANCE_SIM
-- Forecast Orb 8 survival based on DNA profile
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_bankroll_variance_simulation(
    p_user_id UUID,
    p_current_bankroll DECIMAL(12,2),
    p_avg_buyin DECIMAL(12,2) DEFAULT 100,
    p_sessions_to_simulate INT DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
    v_dna RECORD;
    v_win_rate FLOAT;
    v_variance FLOAT;
    v_survival_probability FLOAT;
    v_expected_sessions_until_bust INT;
    v_risk_of_ruin FLOAT;
    v_kelly_fraction FLOAT;
    v_safe_buyin_count INT;
BEGIN
    -- Get DNA profile
    SELECT * INTO v_dna FROM dna_attributes WHERE user_id = p_user_id;
    
    IF v_dna IS NULL THEN
        RETURN jsonb_build_object('error', 'DNA profile not found');
    END IF;
    
    -- Calculate metrics from DNA
    v_win_rate := COALESCE(v_dna.accuracy, 0.5) * 0.6 + COALESCE(v_dna.grit, 0.5) * 0.4;
    v_variance := (1 - COALESCE(v_dna.bankroll_stability, 0.5)) * 100;
    
    -- Risk of ruin calculation (simplified)
    v_risk_of_ruin := POWER((1 - v_win_rate) / v_win_rate, p_current_bankroll / p_avg_buyin);
    v_risk_of_ruin := LEAST(1.0, v_risk_of_ruin);
    
    -- Survival probability
    v_survival_probability := 1 - v_risk_of_ruin;
    
    -- Expected sessions until bust (if losing player)
    IF v_win_rate < 0.5 THEN
        v_expected_sessions_until_bust := FLOOR(p_current_bankroll / (p_avg_buyin * (0.5 - v_win_rate)));
    ELSE
        v_expected_sessions_until_bust := NULL; -- Winning player
    END IF;
    
    -- Kelly criterion (optimal bet sizing)
    v_kelly_fraction := (v_win_rate * 2 - 1);
    v_kelly_fraction := GREATEST(0, v_kelly_fraction);
    
    -- Safe buy-in count
    v_safe_buyin_count := FLOOR(p_current_bankroll / p_avg_buyin);
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'simulation_params', jsonb_build_object(
            'current_bankroll', p_current_bankroll,
            'avg_buyin', p_avg_buyin,
            'sessions_simulated', p_sessions_to_simulate
        ),
        'dna_factors', jsonb_build_object(
            'accuracy', COALESCE(v_dna.accuracy, 0.5),
            'grit', COALESCE(v_dna.grit, 0.5),
            'bankroll_stability', COALESCE(v_dna.bankroll_stability, 0.5),
            'composure', COALESCE(v_dna.adaptability, 0.5)
        ),
        'projections', jsonb_build_object(
            'win_rate', ROUND(v_win_rate::NUMERIC, 4),
            'variance', ROUND(v_variance::NUMERIC, 2),
            'risk_of_ruin', ROUND(v_risk_of_ruin::NUMERIC, 4),
            'survival_probability', ROUND(v_survival_probability::NUMERIC, 4),
            'expected_sessions_until_bust', v_expected_sessions_until_bust,
            'kelly_fraction', ROUND(v_kelly_fraction::NUMERIC, 4),
            'safe_buyin_count', v_safe_buyin_count
        ),
        'recommendation', CASE
            WHEN v_survival_probability > 0.9 THEN 'HEALTHY - Continue playing'
            WHEN v_survival_probability > 0.7 THEN 'CAUTION - Consider smaller stakes'
            WHEN v_survival_probability > 0.5 THEN 'WARNING - High risk, reduce exposure'
            ELSE 'DANGER - Stop and rebuild bankroll'
        END
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🔒 TASK 54: SETTINGS_HARD_LOCK
-- Permanently fix 85% mastery rule in Orb 10
-- ═══════════════════════════════════════════════════════════════════════════

-- Hard law settings table
CREATE TABLE IF NOT EXISTS hard_law_settings (
    law_id TEXT PRIMARY KEY,
    law_name TEXT NOT NULL,
    law_value FLOAT NOT NULL,
    is_locked BOOLEAN DEFAULT TRUE,
    lock_level TEXT DEFAULT 'PERMANENT' CHECK (lock_level IN ('TEMPORARY', 'ADMIN_ONLY', 'PERMANENT')),
    enforcing_orb INT DEFAULT 10,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 85% mastery rule as PERMANENT
INSERT INTO hard_law_settings (law_id, law_name, law_value, is_locked, lock_level, enforcing_orb, description)
VALUES (
    'MASTERY_GATE_85',
    '85% Mastery Gate',
    0.85,
    TRUE,
    'PERMANENT',
    10,
    'Training XP requires 85% accuracy. This is a PERMANENT HARD LAW and cannot be modified.'
)
ON CONFLICT (law_id) DO UPDATE SET
    is_locked = TRUE,
    lock_level = 'PERMANENT';

-- Add other core hard laws
INSERT INTO hard_law_settings (law_id, law_name, law_value, is_locked, lock_level, enforcing_orb, description)
VALUES 
    ('XP_PERMANENCE', 'XP Can Never Decrease', 1.0, TRUE, 'PERMANENT', 10, 'XP cannot be subtracted from any user.'),
    ('STREAK_EXPIRY_24H', '24-Hour Streak Window', 24.0, TRUE, 'PERMANENT', 10, 'Streaks expire after 24 hours of inactivity.'),
    ('PRO_HIGH_STAKES', 'Pro Verification for High Stakes', 5.0, TRUE, 'PERMANENT', 10, 'Verification level 5 required for high-stakes access.')
ON CONFLICT (law_id) DO NOTHING;

-- Function to get a hard law value (enforced read)
CREATE OR REPLACE FUNCTION fn_get_hard_law(p_law_id TEXT)
RETURNS FLOAT AS $$
DECLARE
    v_law RECORD;
BEGIN
    SELECT * INTO v_law FROM hard_law_settings WHERE law_id = p_law_id;
    
    IF v_law IS NULL THEN
        RAISE EXCEPTION 'Hard law % not found', p_law_id;
    END IF;
    
    RETURN v_law.law_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Block any modification to PERMANENT hard laws
CREATE OR REPLACE FUNCTION fn_protect_hard_laws()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.lock_level = 'PERMANENT' THEN
        RAISE EXCEPTION 
            '🔒 HARD_LAW_VIOLATION: Cannot modify PERMANENT law [%]. '
            'This is an immutable system law enforced by Orb 10.',
            OLD.law_id
        USING ERRCODE = 'raise_exception';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_protect_hard_laws ON hard_law_settings;
CREATE TRIGGER trig_protect_hard_laws
    BEFORE UPDATE OR DELETE ON hard_law_settings
    FOR EACH ROW
    WHEN (OLD.lock_level = 'PERMANENT')
    EXECUTE FUNCTION fn_protect_hard_laws();

-- View all hard laws
CREATE OR REPLACE VIEW v_hard_laws AS
SELECT 
    law_id,
    law_name,
    law_value,
    is_locked,
    lock_level,
    enforcing_orb,
    description,
    CASE lock_level
        WHEN 'PERMANENT' THEN '🔒'
        WHEN 'ADMIN_ONLY' THEN '🔐'
        ELSE '🔓'
    END AS lock_icon
FROM hard_law_settings
ORDER BY law_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ IDENTITY & REPUTATION MAPPING COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🧠 IDENTITY & REPUTATION MAPPING (51-54) — COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🎰 TASK 51: TILT_SENSOR_DNA            ✅ MONITORING';
    RAISE NOTICE '   📉 TASK 52: REPUTATION_DECAY           ✅ ACTIVE';
    RAISE NOTICE '   📊 TASK 53: BANKROLL_VARIANCE_SIM      ✅ FORECASTING';
    RAISE NOTICE '   🔒 TASK 54: SETTINGS_HARD_LOCK         ✅ PERMANENT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Tilt: 3 rapid buy-ins in 60min = FLAGGED';
    RAISE NOTICE '   Decay: -2%% per day after 7 days inactive';
    RAISE NOTICE '   85%% Mastery Gate: PERMANENT HARD LAW';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
