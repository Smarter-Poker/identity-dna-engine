-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 IDENTITY_DNA_ENGINE — Skill, Trust & Holographic Export Migration
-- 004_skill_trust_hologram.sql
-- 
-- @task SKILL_TIER_AGGREGATOR - recalc_skill_tier function
-- @task TRUST_SCORE_DECAY - apply_trust_decay cron job
-- @task DNA_HOLOGRAPHIC_EXPORT - get_player_dna_summary function
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 DRILL PERFORMANCE TABLE (GREEN Folder Data Source)
-- Stores training drill results for skill tier calculation.
-- ═══════════════════════════════════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_drill_perf_user ON drill_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_perf_completed ON drill_performance(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_perf_user_recent ON drill_performance(user_id, completed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 TASK 1: SKILL_TIER_AGGREGATOR
-- Function: recalc_skill_tier
-- Logic: Fetch last 10 drill_performance records, calculate (Average_Accuracy * 100)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalc_skill_tier(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    new_tier INT,
    avg_accuracy FLOAT,
    drills_analyzed INT,
    message TEXT
) AS $$
DECLARE
    v_avg_accuracy FLOAT;
    v_drill_count INT;
    v_raw_score FLOAT;
    v_new_tier INT;
    v_old_tier INT;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 Fetch last 10 drill_performance records from GREEN folder
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        AVG(dp.accuracy),
        COUNT(*)
    INTO v_avg_accuracy, v_drill_count
    FROM (
        SELECT accuracy 
        FROM drill_performance 
        WHERE user_id = p_user_id 
        ORDER BY completed_at DESC 
        LIMIT 10
    ) dp;
    
    -- Handle case with no drills
    IF v_drill_count = 0 OR v_avg_accuracy IS NULL THEN
        RETURN QUERY SELECT 
            FALSE as success,
            1 as new_tier,
            0.0 as avg_accuracy,
            0 as drills_analyzed,
            'No drill records found for user'::TEXT as message;
        RETURN;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 🧮 Formula: (Average_Accuracy * 100) → Skill Tier (1-10)
    -- ═══════════════════════════════════════════════════════════════════
    v_raw_score := v_avg_accuracy * 100;
    
    -- Map score to tier (1-10)
    v_new_tier := CASE
        WHEN v_raw_score >= 95 THEN 10  -- LEGEND
        WHEN v_raw_score >= 90 THEN 9   -- MASTER
        WHEN v_raw_score >= 85 THEN 8   -- ELITE
        WHEN v_raw_score >= 80 THEN 7   -- DIAMOND
        WHEN v_raw_score >= 75 THEN 6   -- PLATINUM
        WHEN v_raw_score >= 70 THEN 5   -- GOLD
        WHEN v_raw_score >= 60 THEN 4   -- SILVER
        WHEN v_raw_score >= 50 THEN 3   -- BRONZE
        WHEN v_raw_score >= 30 THEN 2   -- APPRENTICE
        ELSE 1                           -- BEGINNER
    END;
    
    -- Get current tier for logging
    SELECT skill_tier INTO v_old_tier FROM profiles WHERE id = p_user_id;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📝 Update the 'skill_tier' column in 'profiles'
    -- ═══════════════════════════════════════════════════════════════════
    UPDATE profiles 
    SET 
        skill_tier = v_new_tier,
        last_sync = NOW()
    WHERE id = p_user_id;
    
    -- Increment DNA version
    INSERT INTO dna_version_control (user_id, current_version, updated_at, update_source)
    VALUES (p_user_id, 1, NOW(), 'recalc_skill_tier')
    ON CONFLICT (user_id) DO UPDATE SET
        current_version = dna_version_control.current_version + 1,
        updated_at = NOW(),
        update_source = 'recalc_skill_tier';
    
    -- Log to profile history
    IF v_old_tier IS DISTINCT FROM v_new_tier THEN
        INSERT INTO profile_history (user_id, field_changed, old_value, new_value, source_orb, changed_at)
        VALUES (p_user_id, 'skill_tier', v_old_tier::TEXT, v_new_tier::TEXT, 'SKILL_TIER_AGGREGATOR', NOW());
    END IF;
    
    RETURN QUERY SELECT 
        TRUE as success,
        v_new_tier as new_tier,
        v_avg_accuracy as avg_accuracy,
        v_drill_count as drills_analyzed,
        format('Skill tier updated from %s to %s (Accuracy: %s%%)', 
            v_old_tier, v_new_tier, ROUND(v_avg_accuracy * 100, 2))::TEXT as message;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📉 TASK 2: TRUST_SCORE_DECAY
-- Cron Job: apply_trust_decay
-- Logic: If 'last_active' > 30 days, reduce 'trust_score' by 0.01 daily
-- Recovery: Complete 'Verified Check-ins' in Orb 9
-- ═══════════════════════════════════════════════════════════════════════════

-- Trust decay configuration
CREATE TABLE IF NOT EXISTS trust_decay_config (
    id INT PRIMARY KEY DEFAULT 1,
    decay_threshold_days INT DEFAULT 30,
    daily_decay_rate FLOAT DEFAULT 0.01,
    min_trust_score FLOAT DEFAULT 10.0,
    recovery_per_checkin FLOAT DEFAULT 0.5,
    last_decay_run TIMESTAMPTZ
);

-- Insert default config
INSERT INTO trust_decay_config (id, decay_threshold_days, daily_decay_rate, min_trust_score, recovery_per_checkin)
VALUES (1, 30, 0.01, 10.0, 0.5)
ON CONFLICT (id) DO NOTHING;

-- Apply trust decay function
CREATE OR REPLACE FUNCTION apply_trust_decay()
RETURNS TABLE (
    users_affected INT,
    total_decay_applied FLOAT,
    execution_time_ms INT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_users_affected INT := 0;
    v_total_decay FLOAT := 0;
    v_decay_rate FLOAT;
    v_threshold_days INT;
    v_min_score FLOAT;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    -- Get decay configuration
    SELECT decay_threshold_days, daily_decay_rate, min_trust_score
    INTO v_threshold_days, v_decay_rate, v_min_score
    FROM trust_decay_config WHERE id = 1;
    
    v_cutoff_date := NOW() - (v_threshold_days || ' days')::INTERVAL;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📉 Apply decay to inactive users
    -- If 'last_sync' > 30 days, reduce 'trust_score' by 0.01
    -- ═══════════════════════════════════════════════════════════════════
    WITH decayed_users AS (
        UPDATE profiles
        SET 
            trust_score = GREATEST(v_min_score, trust_score - v_decay_rate),
            last_sync = NOW()
        WHERE 
            last_sync < v_cutoff_date
            AND trust_score > v_min_score
        RETURNING id, trust_score, v_decay_rate as decay_applied
    )
    SELECT 
        COUNT(*)::INT,
        COALESCE(SUM(decay_applied), 0)
    INTO v_users_affected, v_total_decay
    FROM decayed_users;
    
    -- Log decay execution
    UPDATE trust_decay_config SET last_decay_run = NOW() WHERE id = 1;
    
    -- Increment DNA versions for affected users
    INSERT INTO dna_version_control (user_id, current_version, updated_at, update_source)
    SELECT id, 1, NOW(), 'trust_decay'
    FROM profiles WHERE last_sync < v_cutoff_date
    ON CONFLICT (user_id) DO UPDATE SET
        current_version = dna_version_control.current_version + 1,
        updated_at = NOW(),
        update_source = 'trust_decay';
    
    RETURN QUERY SELECT 
        v_users_affected,
        v_total_decay,
        (EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time))::INT;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ TRUST RECOVERY FUNCTION (Verified Check-ins from Orb 9)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recover_trust_from_checkin(
    p_user_id UUID,
    p_checkin_type TEXT DEFAULT 'VERIFIED'
)
RETURNS TABLE (
    success BOOLEAN,
    new_trust_score FLOAT,
    recovery_amount FLOAT,
    message TEXT
) AS $$
DECLARE
    v_recovery_rate FLOAT;
    v_current_score FLOAT;
    v_new_score FLOAT;
BEGIN
    -- Get recovery rate from config
    SELECT recovery_per_checkin INTO v_recovery_rate 
    FROM trust_decay_config WHERE id = 1;
    
    -- Get current trust score
    SELECT trust_score INTO v_current_score 
    FROM profiles WHERE id = p_user_id;
    
    IF v_current_score IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 0.0, 0.0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new score (capped at 100)
    v_new_score := LEAST(100.0, v_current_score + v_recovery_rate);
    
    -- Update trust score and last_sync
    UPDATE profiles 
    SET 
        trust_score = v_new_score,
        last_sync = NOW()
    WHERE id = p_user_id;
    
    -- Log activity
    INSERT INTO user_activity (user_id, activity_type, activity_date, metadata)
    VALUES (p_user_id, 'VERIFIED_CHECKIN', CURRENT_DATE, jsonb_build_object('type', p_checkin_type));
    
    RETURN QUERY SELECT 
        TRUE,
        v_new_score,
        v_recovery_rate,
        format('Trust recovered by %s. New score: %s', v_recovery_rate, ROUND(v_new_score, 2))::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔮 TASK 3: DNA_HOLOGRAPHIC_EXPORT
-- Function: get_player_dna_summary
-- Logic: Combine Aggression, Grit, and Skill into JSON for 3D hologram rendering
-- ═══════════════════════════════════════════════════════════════════════════

-- Player personality traits table (for hologram calculation)
CREATE TABLE IF NOT EXISTS player_traits (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    aggression_score FLOAT DEFAULT 50 CHECK (aggression_score >= 0 AND aggression_score <= 100),
    grit_score FLOAT DEFAULT 50 CHECK (grit_score >= 0 AND grit_score <= 100),
    adaptability_score FLOAT DEFAULT 50,
    tilt_resistance FLOAT DEFAULT 50,
    risk_tolerance FLOAT DEFAULT 50,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_traits_user ON player_traits(user_id);

-- Get Player DNA Summary for Holographic Rendering
CREATE OR REPLACE FUNCTION get_player_dna_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_traits RECORD;
    v_drills RECORD;
    v_dna_summary JSONB;
BEGIN
    -- Fetch profile data
    SELECT 
        id, username, skill_tier, trust_score, xp_total, badges, last_sync
    INTO v_profile
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_profile.id IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'User not found',
            'user_id', p_user_id
        );
    END IF;
    
    -- Fetch personality traits
    SELECT 
        COALESCE(aggression_score, 50) as aggression,
        COALESCE(grit_score, 50) as grit,
        COALESCE(adaptability_score, 50) as adaptability,
        COALESCE(tilt_resistance, 50) as tilt_resistance,
        COALESCE(risk_tolerance, 50) as risk_tolerance
    INTO v_traits
    FROM player_traits
    WHERE user_id = p_user_id;
    
    -- Default traits if none exist
    IF v_traits IS NULL THEN
        v_traits := ROW(50, 50, 50, 50, 50);
    END IF;
    
    -- Fetch recent drill stats
    SELECT 
        COALESCE(AVG(accuracy), 0) as avg_accuracy,
        COALESCE(AVG(speed_score), 0) as avg_speed,
        COALESCE(AVG(gto_compliance), 0) as avg_gto,
        COUNT(*) as drill_count
    INTO v_drills
    FROM (
        SELECT accuracy, speed_score, gto_compliance
        FROM drill_performance
        WHERE user_id = p_user_id
        ORDER BY completed_at DESC
        LIMIT 20
    ) recent_drills;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 🔮 Build DNA Summary JSON for Antigravity UI 3D Hologram
    -- ═══════════════════════════════════════════════════════════════════
    v_dna_summary := jsonb_build_object(
        'user_id', v_profile.id,
        'username', v_profile.username,
        'generated_at', NOW(),
        
        -- Core DNA Triangle (for 3D hologram vertices)
        'dna_triangle', jsonb_build_object(
            'aggression', jsonb_build_object(
                'value', v_traits.aggression,
                'label', CASE 
                    WHEN v_traits.aggression >= 80 THEN 'Hyper-Aggressive'
                    WHEN v_traits.aggression >= 60 THEN 'Aggressive'
                    WHEN v_traits.aggression >= 40 THEN 'Balanced'
                    WHEN v_traits.aggression >= 20 THEN 'Passive'
                    ELSE 'Ultra-Passive'
                END,
                'color', CASE 
                    WHEN v_traits.aggression >= 70 THEN '#FF4500'
                    WHEN v_traits.aggression >= 40 THEN '#FFD700'
                    ELSE '#00BFFF'
                END
            ),
            'grit', jsonb_build_object(
                'value', v_traits.grit,
                'label', CASE 
                    WHEN v_traits.grit >= 80 THEN 'Unbreakable'
                    WHEN v_traits.grit >= 60 THEN 'Resilient'
                    WHEN v_traits.grit >= 40 THEN 'Steady'
                    WHEN v_traits.grit >= 20 THEN 'Fragile'
                    ELSE 'Tilting'
                END,
                'color', CASE 
                    WHEN v_traits.grit >= 70 THEN '#32CD32'
                    WHEN v_traits.grit >= 40 THEN '#FFD700'
                    ELSE '#FF6347'
                END
            ),
            'skill', jsonb_build_object(
                'value', v_profile.skill_tier * 10,
                'tier', v_profile.skill_tier,
                'label', CASE v_profile.skill_tier
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
                END,
                'color', CASE 
                    WHEN v_profile.skill_tier >= 8 THEN '#9400D3'
                    WHEN v_profile.skill_tier >= 5 THEN '#FFD700'
                    ELSE '#C0C0C0'
                END
            )
        ),
        
        -- Extended Traits (for hologram detail layers)
        'extended_traits', jsonb_build_object(
            'adaptability', v_traits.adaptability,
            'tilt_resistance', v_traits.tilt_resistance,
            'risk_tolerance', v_traits.risk_tolerance
        ),
        
        -- Performance Metrics
        'performance', jsonb_build_object(
            'accuracy', ROUND((v_drills.avg_accuracy * 100)::NUMERIC, 2),
            'speed', ROUND(v_drills.avg_speed::NUMERIC, 2),
            'gto_compliance', ROUND((v_drills.avg_gto * 100)::NUMERIC, 2),
            'drills_analyzed', v_drills.drill_count
        ),
        
        -- Trust & XP
        'reputation', jsonb_build_object(
            'trust_score', ROUND(v_profile.trust_score::NUMERIC, 2),
            'trust_tier', CASE 
                WHEN v_profile.trust_score >= 80 THEN 'HIGHLY_TRUSTED'
                WHEN v_profile.trust_score >= 60 THEN 'TRUSTED'
                WHEN v_profile.trust_score >= 40 THEN 'NEUTRAL'
                WHEN v_profile.trust_score >= 20 THEN 'CAUTIONED'
                ELSE 'UNTRUSTED'
            END,
            'xp_total', v_profile.xp_total
        ),
        
        -- Hologram Rendering Hints
        'hologram', jsonb_build_object(
            'glow_intensity', GREATEST(0.3, v_profile.skill_tier / 10.0),
            'rotation_speed', 0.5 + (v_traits.aggression / 200.0),
            'particle_density', CASE 
                WHEN v_profile.skill_tier >= 8 THEN 'high'
                WHEN v_profile.skill_tier >= 5 THEN 'medium'
                ELSE 'low'
            END,
            'aura_color', CASE 
                WHEN v_profile.skill_tier >= 9 THEN '#FF1493'
                WHEN v_profile.skill_tier >= 7 THEN '#00BFFF'
                WHEN v_profile.skill_tier >= 5 THEN '#FFD700'
                ELSE '#808080'
            END,
            'badge_count', jsonb_array_length(COALESCE(v_profile.badges, '[]'::JSONB))
        )
    );
    
    RETURN v_dna_summary;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE drill_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_decay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drills" ON drill_performance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drills" ON drill_performance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own traits" ON player_traits
    FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
