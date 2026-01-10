-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ IDENTITY_DNA_ENGINE — RED FOUNDATION (PROMPTS 1-3)
-- 006_red_foundation.sql
-- 
-- @task_01: PLAYER_DNA_CORE_SCHEMA
-- @task_02: XP_PERMANENCE_FORTRESS
-- @task_03: HOLOGRAPHIC_CHART_ENGINE
-- 
-- STATUS: FOUNDATION_COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 TASK 01: PLAYER_DNA_CORE_SCHEMA
-- Build 'profiles' and 'dna_attributes' tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure profiles table has all required columns
-- (Adds columns if they don't exist via safe ALTER)
DO $$
BEGIN
    -- Add streak_count if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'streak_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN streak_count INT DEFAULT 0 NOT NULL;
    END IF;
    
    -- Add total_xp alias view (maps to xp_total for backwards compatibility)
    -- Already exists as xp_total, this is just documentation
    RAISE NOTICE 'profiles.xp_total serves as total_xp';
END $$;

-- 🧬 DNA_ATTRIBUTES TABLE (Core Player DNA)
-- Stores the 4 primary DNA dimensions: Aggression, Grit, Accuracy, Wealth
CREATE TABLE IF NOT EXISTS dna_attributes (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- 📊 PRIMARY DNA DIMENSIONS (0-100 scale)
    aggression FLOAT DEFAULT 50.0 NOT NULL CHECK (aggression >= 0 AND aggression <= 100),
    grit FLOAT DEFAULT 50.0 NOT NULL CHECK (grit >= 0 AND grit <= 100),
    accuracy FLOAT DEFAULT 50.0 NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    wealth FLOAT DEFAULT 50.0 NOT NULL CHECK (wealth >= 0 AND wealth <= 100),
    
    -- 📈 SECONDARY DNA DIMENSIONS
    risk_tolerance FLOAT DEFAULT 50.0 CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
    tilt_resistance FLOAT DEFAULT 50.0 CHECK (tilt_resistance >= 0 AND tilt_resistance <= 100),
    speed FLOAT DEFAULT 50.0 CHECK (speed >= 0 AND speed <= 100),
    adaptability FLOAT DEFAULT 50.0 CHECK (adaptability >= 0 AND adaptability <= 100),
    
    -- 🎯 COMPOSITE SCORES
    dna_composite_score FLOAT GENERATED ALWAYS AS (
        (aggression * 0.20) + (grit * 0.25) + (accuracy * 0.35) + (wealth * 0.20)
    ) STORED,
    
    -- 📅 METADATA
    last_calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    calculation_version INT DEFAULT 1 NOT NULL,
    source_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for dna_attributes
CREATE INDEX IF NOT EXISTS idx_dna_attributes_user ON dna_attributes(user_id);
CREATE INDEX IF NOT EXISTS idx_dna_attributes_composite ON dna_attributes(dna_composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_dna_attributes_aggression ON dna_attributes(aggression DESC);
CREATE INDEX IF NOT EXISTS idx_dna_attributes_accuracy ON dna_attributes(accuracy DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_dna_attributes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dna_timestamp ON dna_attributes;
CREATE TRIGGER trigger_update_dna_timestamp
    BEFORE UPDATE ON dna_attributes
    FOR EACH ROW
    EXECUTE FUNCTION update_dna_attributes_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ TASK 02: XP_PERMANENCE_FORTRESS
-- Map Postgres Trigger 'enforce_xp_immutability'
-- Hard Law: RAISE EXCEPTION if NEW.total_xp < OLD.total_xp
-- ═══════════════════════════════════════════════════════════════════════════

-- 🛡️ XP IMMUTABILITY ENFORCEMENT FUNCTION
CREATE OR REPLACE FUNCTION enforce_xp_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_id UUID;
    v_xp_field TEXT;
    v_old_xp BIGINT;
    v_new_xp BIGINT;
BEGIN
    -- Determine which XP field is being modified
    IF TG_TABLE_NAME = 'profiles' THEN
        v_xp_field := 'xp_total';
        v_old_xp := OLD.xp_total;
        v_new_xp := NEW.xp_total;
    ELSIF TG_TABLE_NAME = 'xp_vault' THEN
        v_xp_field := 'xp_total';
        v_old_xp := OLD.xp_total;
        v_new_xp := NEW.xp_total;
    ELSE
        -- Unknown table, allow operation
        RETURN NEW;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 🛡️ HARD LAW: XP CANNOT BE LOST
    -- If NEW.total_xp < OLD.total_xp → RAISE EXCEPTION
    -- ═══════════════════════════════════════════════════════════════════
    IF v_new_xp < v_old_xp THEN
        -- Log the violation attempt
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
            COALESCE(
                CASE WHEN TG_TABLE_NAME = 'profiles' THEN OLD.id ELSE OLD.user_id END,
                CASE WHEN TG_TABLE_NAME = 'profiles' THEN NEW.id ELSE NEW.user_id END
            ),
            'XP_DECREASE_ATTEMPT',
            'CRITICAL',
            v_old_xp,
            v_new_xp,
            TRUE,
            'enforce_xp_immutability',
            jsonb_build_object(
                'trigger', TG_NAME,
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'attempted_loss', v_old_xp - v_new_xp,
                'timestamp', NOW()
            )
        ) RETURNING id INTO v_alert_id;
        
        -- 🚨 RAISE EXCEPTION — XP IMMUTABILITY VIOLATION
        RAISE EXCEPTION 
            '🛡️ XP_IMMUTABILITY_VIOLATION [Alert: %] | '
            'HARD LAW BREACH: NEW.total_xp (%) < OLD.total_xp (%). '
            'XP Loss of % blocked. '
            'XP IS PERMANENT. Transaction rolled back.',
            v_alert_id,
            v_new_xp,
            v_old_xp,
            v_old_xp - v_new_xp;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply enforce_xp_immutability to profiles
DROP TRIGGER IF EXISTS trigger_enforce_xp_immutability_profiles ON profiles;
CREATE TRIGGER trigger_enforce_xp_immutability_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total)
    EXECUTE FUNCTION enforce_xp_immutability();

-- Apply enforce_xp_immutability to xp_vault
DROP TRIGGER IF EXISTS trigger_enforce_xp_immutability_vault ON xp_vault;
CREATE TRIGGER trigger_enforce_xp_immutability_vault
    BEFORE UPDATE ON xp_vault
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total)
    EXECUTE FUNCTION enforce_xp_immutability();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 TASK 03: HOLOGRAPHIC_CHART_ENGINE
-- Build 'performance_history' for time-series tracking
-- Prepare data structures for 5-point holographic Radar Chart
-- ═══════════════════════════════════════════════════════════════════════════

-- 📈 PERFORMANCE_HISTORY TABLE (Time-Series Tracking)
CREATE TABLE IF NOT EXISTS performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- 📅 TIME PERIOD
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'SESSION')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- 📊 5-POINT RADAR CHART METRICS
    skill_score FLOAT DEFAULT 50.0 CHECK (skill_score >= 0 AND skill_score <= 100),
    grit_score FLOAT DEFAULT 50.0 CHECK (grit_score >= 0 AND grit_score <= 100),
    aggression_score FLOAT DEFAULT 50.0 CHECK (aggression_score >= 0 AND aggression_score <= 100),
    accuracy_score FLOAT DEFAULT 50.0 CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
    wealth_score FLOAT DEFAULT 50.0 CHECK (wealth_score >= 0 AND wealth_score <= 100),
    
    -- 📈 ADDITIONAL METRICS
    xp_earned BIGINT DEFAULT 0 NOT NULL,
    drills_completed INT DEFAULT 0 NOT NULL,
    streak_maintained BOOLEAN DEFAULT FALSE,
    gto_compliance FLOAT DEFAULT 0.0,
    avg_ev_loss FLOAT DEFAULT 0.0,
    
    -- 🎯 COMPOSITE SCORE
    composite_score FLOAT GENERATED ALWAYS AS (
        (skill_score * 0.25) + 
        (grit_score * 0.20) + 
        (aggression_score * 0.15) + 
        (accuracy_score * 0.25) + 
        (wealth_score * 0.15)
    ) STORED,
    
    -- 📊 DELTA FROM PREVIOUS PERIOD
    skill_delta FLOAT DEFAULT 0.0,
    grit_delta FLOAT DEFAULT 0.0,
    aggression_delta FLOAT DEFAULT 0.0,
    accuracy_delta FLOAT DEFAULT 0.0,
    wealth_delta FLOAT DEFAULT 0.0,
    
    -- 📋 METADATA
    source_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint for one entry per period per user
    UNIQUE(user_id, period_type, period_start)
);

-- Indexes for performance_history
CREATE INDEX IF NOT EXISTS idx_perf_history_user ON performance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_perf_history_recorded ON performance_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_history_period ON performance_history(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_perf_history_composite ON performance_history(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_perf_history_user_period ON performance_history(user_id, period_type, recorded_at DESC);

-- 🔮 HOLOGRAPHIC RADAR CHART VIEW
-- Prepares data for the 5-point holographic radar visualization
DROP VIEW IF EXISTS holographic_radar_chart CASCADE;
CREATE OR REPLACE VIEW holographic_radar_chart AS
WITH latest_dna AS (
    SELECT 
        user_id,
        aggression,
        grit,
        accuracy,
        wealth,
        dna_composite_score,
        last_calculated_at
    FROM dna_attributes
),
latest_history AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        skill_score,
        grit_score,
        aggression_score,
        accuracy_score,
        wealth_score,
        composite_score,
        skill_delta,
        grit_delta,
        aggression_delta,
        accuracy_delta,
        wealth_delta,
        recorded_at
    FROM performance_history
    WHERE period_type = 'DAILY'
    ORDER BY user_id, recorded_at DESC
)
SELECT 
    p.id AS user_id,
    p.username,
    p.skill_tier,
    p.xp_total,
    p.streak_count,
    
    -- 🔮 5-POINT RADAR CHART AXES
    jsonb_build_object(
        'skill', jsonb_build_object(
            'value', COALESCE(h.skill_score, d.accuracy, 50),
            'delta', COALESCE(h.skill_delta, 0),
            'label', 'Skill',
            'color', '#00BFFF'
        ),
        'grit', jsonb_build_object(
            'value', COALESCE(h.grit_score, d.grit, 50),
            'delta', COALESCE(h.grit_delta, 0),
            'label', 'Grit',
            'color', '#32CD32'
        ),
        'aggression', jsonb_build_object(
            'value', COALESCE(h.aggression_score, d.aggression, 50),
            'delta', COALESCE(h.aggression_delta, 0),
            'label', 'Aggression',
            'color', '#FF4500'
        ),
        'accuracy', jsonb_build_object(
            'value', COALESCE(h.accuracy_score, d.accuracy, 50),
            'delta', COALESCE(h.accuracy_delta, 0),
            'label', 'Accuracy',
            'color', '#FFD700'
        ),
        'wealth', jsonb_build_object(
            'value', COALESCE(h.wealth_score, d.wealth, 50),
            'delta', COALESCE(h.wealth_delta, 0),
            'label', 'Wealth',
            'color', '#9400D3'
        )
    ) AS radar_chart_data,
    
    -- 📊 NORMALIZED VERTICES (for 3D rendering)
    jsonb_build_object(
        'vertices', jsonb_build_array(
            -- Skill (top)
            jsonb_build_object(
                'x', 0,
                'y', COALESCE(h.skill_score, d.accuracy, 50) / 50.0,
                'z', 0
            ),
            -- Grit (top-right)
            jsonb_build_object(
                'x', COALESCE(h.grit_score, d.grit, 50) / 50.0 * 0.951,
                'y', COALESCE(h.grit_score, d.grit, 50) / 50.0 * 0.309,
                'z', 0
            ),
            -- Accuracy (bottom-right)
            jsonb_build_object(
                'x', COALESCE(h.accuracy_score, d.accuracy, 50) / 50.0 * 0.588,
                'y', COALESCE(h.accuracy_score, d.accuracy, 50) / 50.0 * -0.809,
                'z', 0
            ),
            -- Wealth (bottom-left)
            jsonb_build_object(
                'x', COALESCE(h.wealth_score, d.wealth, 50) / 50.0 * -0.588,
                'y', COALESCE(h.wealth_score, d.wealth, 50) / 50.0 * -0.809,
                'z', 0
            ),
            -- Aggression (top-left)
            jsonb_build_object(
                'x', COALESCE(h.aggression_score, d.aggression, 50) / 50.0 * -0.951,
                'y', COALESCE(h.aggression_score, d.aggression, 50) / 50.0 * 0.309,
                'z', 0
            )
        ),
        'center', jsonb_build_object('x', 0, 'y', 0, 'z', 0)
    ) AS holographic_vertices,
    
    -- 🎯 COMPOSITE SCORES
    COALESCE(h.composite_score, d.dna_composite_score, 50) AS composite_score,
    
    -- 🔮 HOLOGRAM RENDERING HINTS
    jsonb_build_object(
        'glow_intensity', GREATEST(0.3, p.skill_tier / 10.0),
        'rotation_speed', 0.5 + (COALESCE(d.aggression, 50) / 200.0),
        'pulse_rate', CASE 
            WHEN p.skill_tier >= 9 THEN 'fast'
            WHEN p.skill_tier >= 7 THEN 'medium'
            ELSE 'slow'
        END,
        'aura_color', CASE 
            WHEN p.skill_tier >= 9 THEN '#FF1493'
            WHEN p.skill_tier >= 7 THEN '#00BFFF'
            WHEN p.skill_tier >= 5 THEN '#FFD700'
            ELSE '#808080'
        END,
        'particle_density', CASE 
            WHEN p.skill_tier >= 8 THEN 'high'
            WHEN p.skill_tier >= 5 THEN 'medium'
            ELSE 'low'
        END
    ) AS hologram_effects,
    
    -- ⏰ FRESHNESS
    COALESCE(h.recorded_at, d.last_calculated_at, p.last_sync) AS last_updated
    
FROM profiles p
LEFT JOIN latest_dna d ON p.id = d.user_id
LEFT JOIN latest_history h ON p.id = h.user_id;

-- 📊 FUNCTION: Record Performance Snapshot
CREATE OR REPLACE FUNCTION record_performance_snapshot(
    p_user_id UUID,
    p_period_type TEXT DEFAULT 'DAILY'
)
RETURNS TABLE (
    success BOOLEAN,
    snapshot_id UUID,
    composite_score FLOAT,
    message TEXT
) AS $$
DECLARE
    v_snapshot_id UUID;
    v_composite FLOAT;
    v_prev_record RECORD;
    v_skill FLOAT;
    v_grit FLOAT;
    v_aggression FLOAT;
    v_accuracy FLOAT;
    v_wealth FLOAT;
BEGIN
    -- Get current DNA attributes
    SELECT 
        accuracy, grit, aggression, accuracy, wealth
    INTO v_skill, v_grit, v_aggression, v_accuracy, v_wealth
    FROM dna_attributes
    WHERE user_id = p_user_id;
    
    -- Default values if no DNA yet
    v_skill := COALESCE(v_skill, 50);
    v_grit := COALESCE(v_grit, 50);
    v_aggression := COALESCE(v_aggression, 50);
    v_accuracy := COALESCE(v_accuracy, 50);
    v_wealth := COALESCE(v_wealth, 50);
    
    -- Get previous record for delta calculation
    SELECT * INTO v_prev_record
    FROM performance_history
    WHERE user_id = p_user_id AND period_type = p_period_type
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    -- Insert new snapshot
    INSERT INTO performance_history (
        user_id,
        period_type,
        period_start,
        period_end,
        skill_score,
        grit_score,
        aggression_score,
        accuracy_score,
        wealth_score,
        skill_delta,
        grit_delta,
        aggression_delta,
        accuracy_delta,
        wealth_delta
    ) VALUES (
        p_user_id,
        p_period_type,
        CURRENT_DATE,
        CURRENT_DATE,
        v_skill,
        v_grit,
        v_aggression,
        v_accuracy,
        v_wealth,
        v_skill - COALESCE(v_prev_record.skill_score, v_skill),
        v_grit - COALESCE(v_prev_record.grit_score, v_grit),
        v_aggression - COALESCE(v_prev_record.aggression_score, v_aggression),
        v_accuracy - COALESCE(v_prev_record.accuracy_score, v_accuracy),
        v_wealth - COALESCE(v_prev_record.wealth_score, v_wealth)
    )
    ON CONFLICT (user_id, period_type, period_start) 
    DO UPDATE SET
        skill_score = EXCLUDED.skill_score,
        grit_score = EXCLUDED.grit_score,
        aggression_score = EXCLUDED.aggression_score,
        accuracy_score = EXCLUDED.accuracy_score,
        wealth_score = EXCLUDED.wealth_score,
        recorded_at = NOW()
    RETURNING id, composite_score INTO v_snapshot_id, v_composite;
    
    RETURN QUERY SELECT 
        TRUE,
        v_snapshot_id,
        v_composite,
        format('Performance snapshot recorded for %s', p_period_type)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 📊 FUNCTION: Get Radar Chart Data
CREATE OR REPLACE FUNCTION get_radar_chart_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', user_id,
        'username', username,
        'skill_tier', skill_tier,
        'radar_chart', radar_chart_data,
        'vertices', holographic_vertices,
        'composite_score', composite_score,
        'hologram', hologram_effects,
        'last_updated', last_updated
    ) INTO v_result
    FROM holographic_radar_chart
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_result, jsonb_build_object('error', 'User not found'));
END;
$$ LANGUAGE plpgsql STABLE;

-- 📊 FUNCTION: Calculate DNA from Drill Performance
CREATE OR REPLACE FUNCTION calculate_dna_from_drills(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    new_accuracy FLOAT,
    new_grit FLOAT,
    new_aggression FLOAT,
    message TEXT
) AS $$
DECLARE
    v_avg_accuracy FLOAT;
    v_drill_count INT;
    v_streak_grit FLOAT;
    v_aggression FLOAT;
BEGIN
    -- Calculate accuracy from recent drills
    SELECT 
        AVG(accuracy) * 100,
        COUNT(*)
    INTO v_avg_accuracy, v_drill_count
    FROM (
        SELECT accuracy FROM drill_performance
        WHERE user_id = p_user_id
        ORDER BY completed_at DESC
        LIMIT 20
    ) recent;
    
    v_avg_accuracy := COALESCE(v_avg_accuracy, 50);
    
    -- Calculate grit from streaks
    SELECT LEAST(100, current_streak * 5 + longest_streak * 2)
    INTO v_streak_grit
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    v_streak_grit := COALESCE(v_streak_grit, 50);
    
    -- Calculate aggression from player_traits or default
    SELECT aggression_score INTO v_aggression
    FROM player_traits WHERE user_id = p_user_id;
    
    v_aggression := COALESCE(v_aggression, 50);
    
    -- Update or insert DNA attributes
    INSERT INTO dna_attributes (user_id, accuracy, grit, aggression, last_calculated_at)
    VALUES (p_user_id, v_avg_accuracy, v_streak_grit, v_aggression, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        accuracy = EXCLUDED.accuracy,
        grit = EXCLUDED.grit,
        aggression = EXCLUDED.aggression,
        last_calculated_at = NOW(),
        calculation_version = dna_attributes.calculation_version + 1;
    
    RETURN QUERY SELECT 
        TRUE,
        v_avg_accuracy,
        v_streak_grit,
        v_aggression,
        format('DNA calculated from %s drills', v_drill_count)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE dna_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own DNA
CREATE POLICY "Users view own DNA" ON dna_attributes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own performance history  
CREATE POLICY "Users view own performance" ON performance_history
    FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ RED FOUNDATION COMPLETE (PROMPTS 1-3)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🛡️ RED FOUNDATION — PROMPTS 1-3 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   📊 TASK 01: PLAYER_DNA_CORE_SCHEMA     ✅ BUILT';
    RAISE NOTICE '   🛡️ TASK 02: XP_PERMANENCE_FORTRESS     ✅ ENFORCED';
    RAISE NOTICE '   🔮 TASK 03: HOLOGRAPHIC_CHART_ENGINE   ✅ DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Tables: profiles, dna_attributes, performance_history';
    RAISE NOTICE '   Trigger: enforce_xp_immutability';
    RAISE NOTICE '   View: holographic_radar_chart';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
