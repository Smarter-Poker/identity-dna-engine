-- ═══════════════════════════════════════════════════════════════════════════
-- 🎨 IDENTITY_DNA_ENGINE — RED VISUAL ADDICTION (PROMPTS 19-21)
-- 011_red_visual_addiction.sql
-- 
-- @task_19: HOLOGRAPHIC_RADAR_ANIMATION
-- @task_20: XP_LEVEL_VISUAL_STATE
-- @task_21: STREAK_FLAME_INTENSITY_LOGIC
-- 
-- ⚡️ DANGEROUS_OMNIPOTENCE_OVERRIDE: ACTIVE
-- STATUS: VISUAL_ADDICTION_DEPLOYED 🎨
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🔮 TASK 19: HOLOGRAPHIC_RADAR_ANIMATION
-- DNA Pulse Engine - Dynamic 5-point Radar that grows/shrinks in real-time
-- ═══════════════════════════════════════════════════════════════════════════

-- Animation configuration table
CREATE TABLE IF NOT EXISTS dna_pulse_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    pulse_speed FLOAT DEFAULT 1.0 CHECK (pulse_speed BETWEEN 0.1 AND 5.0),
    glow_intensity FLOAT DEFAULT 0.7 CHECK (glow_intensity BETWEEN 0 AND 1),
    rotation_enabled BOOLEAN DEFAULT TRUE,
    rotation_speed FLOAT DEFAULT 0.5,
    particle_density TEXT DEFAULT 'MEDIUM' CHECK (particle_density IN ('LOW', 'MEDIUM', 'HIGH', 'ULTRA')),
    color_scheme TEXT DEFAULT 'DEFAULT',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dna_pulse_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- 🔮 DNA Pulse Engine Function
CREATE OR REPLACE FUNCTION dna_pulse_engine(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_accuracy FLOAT := 0.5;
    v_grit FLOAT := 0.5;
    v_aggression FLOAT := 0.5;
    v_wealth FLOAT := 0.5;
    v_luck FLOAT := 0.5;
    v_streak RECORD;
    v_config RECORD;
    v_pulse_phase FLOAT;
    v_time_offset FLOAT;
BEGIN
    -- Get profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Get animation config
    SELECT * INTO v_config FROM dna_pulse_config WHERE id = 'default';
    
    -- Calculate pulse phase (based on current time for real-time animation)
    v_time_offset := EXTRACT(EPOCH FROM NOW())::FLOAT;
    v_pulse_phase := SIN(v_time_offset * v_config.pulse_speed) * 0.1 + 1.0;
    
    -- Get base values
    SELECT 
        COALESCE(aggression, 0.5),
        COALESCE(grit, 0.5),
        COALESCE(accuracy, 0.5),
        COALESCE(wealth, 0.5)
    INTO v_aggression, v_grit, v_accuracy, v_wealth
    FROM dna_attributes
    WHERE user_id = p_user_id;
    
    -- Get streak for grit boost
    SELECT * INTO v_streak FROM user_streaks WHERE user_id = p_user_id;
    IF v_streak IS NOT NULL THEN
        v_grit := LEAST(1.0, v_grit + (v_streak.current_streak * 0.02));
    END IF;
    
    -- Calculate luck (variance indicator)
    v_luck := 0.5 + (RANDOM() - 0.5) * 0.2;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 🔮 DYNAMIC RADAR ANIMATION PAYLOAD
    -- Values pulse in real-time based on pulse_phase
    -- ═══════════════════════════════════════════════════════════════════
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'username', v_profile.username,
        'generated_at', NOW(),
        'animation', jsonb_build_object(
            'pulse_phase', ROUND(v_pulse_phase::NUMERIC, 4),
            'rotation_angle', ROUND((v_time_offset * v_config.rotation_speed * 57.2958)::NUMERIC % 360, 2),
            'glow_intensity', v_config.glow_intensity,
            'particle_density', v_config.particle_density
        ),
        'radar', jsonb_build_object(
            'aggression', jsonb_build_object(
                'base', ROUND(v_aggression::NUMERIC, 4),
                'animated', ROUND((v_aggression * v_pulse_phase)::NUMERIC, 4),
                'color', '#FF4500',
                'glow', '#FF6347'
            ),
            'grit', jsonb_build_object(
                'base', ROUND(v_grit::NUMERIC, 4),
                'animated', ROUND((v_grit * v_pulse_phase)::NUMERIC, 4),
                'color', '#32CD32',
                'glow', '#00FF00'
            ),
            'accuracy', jsonb_build_object(
                'base', ROUND(v_accuracy::NUMERIC, 4),
                'animated', ROUND((v_accuracy * v_pulse_phase)::NUMERIC, 4),
                'color', '#00BFFF',
                'glow', '#87CEEB'
            ),
            'wealth', jsonb_build_object(
                'base', ROUND(v_wealth::NUMERIC, 4),
                'animated', ROUND((v_wealth * v_pulse_phase)::NUMERIC, 4),
                'color', '#FFD700',
                'glow', '#FFA500'
            ),
            'luck', jsonb_build_object(
                'base', ROUND(v_luck::NUMERIC, 4),
                'animated', ROUND((v_luck * v_pulse_phase)::NUMERIC, 4),
                'color', '#9400D3',
                'glow', '#8A2BE2'
            )
        ),
        'webgl', jsonb_build_object(
            'vertices', jsonb_build_array(
                jsonb_build_object('x', 0, 'y', v_aggression * v_pulse_phase, 'z', 0),
                jsonb_build_object('x', v_grit * v_pulse_phase * 0.951, 'y', v_grit * v_pulse_phase * 0.309, 'z', 0),
                jsonb_build_object('x', v_accuracy * v_pulse_phase * 0.588, 'y', v_accuracy * v_pulse_phase * -0.809, 'z', 0),
                jsonb_build_object('x', v_wealth * v_pulse_phase * -0.588, 'y', v_wealth * v_pulse_phase * -0.809, 'z', 0),
                jsonb_build_object('x', v_luck * v_pulse_phase * -0.951, 'y', v_luck * v_pulse_phase * 0.309, 'z', 0)
            ),
            'center', jsonb_build_object('x', 0, 'y', 0, 'z', 0),
            'scale', v_pulse_phase
        ),
        'tier_visual', jsonb_build_object(
            'skill_tier', v_profile.skill_tier,
            'aura_color', CASE 
                WHEN v_profile.skill_tier >= 9 THEN '#FF1493'
                WHEN v_profile.skill_tier >= 7 THEN '#00BFFF'
                WHEN v_profile.skill_tier >= 5 THEN '#FFD700'
                ELSE '#808080'
            END,
            'aura_name', CASE 
                WHEN v_profile.skill_tier >= 9 THEN 'LEGENDARY'
                WHEN v_profile.skill_tier >= 7 THEN 'ELITE'
                WHEN v_profile.skill_tier >= 5 THEN 'GOLD'
                ELSE 'STANDARD'
            END
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🎨 TASK 20: XP_LEVEL_VISUAL_STATE
-- Tier Colors: Bronze (0-10), Silver (11-30), Gold (31-60), GTO-Master (61-100)
-- ═══════════════════════════════════════════════════════════════════════════

-- Tier visual configuration
CREATE TABLE IF NOT EXISTS tier_visual_config (
    tier_id TEXT PRIMARY KEY,
    tier_name TEXT NOT NULL,
    min_level INT NOT NULL,
    max_level INT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    glow_color TEXT NOT NULL,
    badge_icon TEXT,
    particle_effect TEXT DEFAULT 'NONE',
    aura_animation TEXT DEFAULT 'STATIC'
);

-- Insert tier configurations
INSERT INTO tier_visual_config (tier_id, tier_name, min_level, max_level, primary_color, secondary_color, glow_color, badge_icon, particle_effect, aura_animation)
VALUES
    ('BRONZE', 'Bronze', 0, 10, '#CD7F32', '#8B4513', '#DAA520', '🥉', 'NONE', 'STATIC'),
    ('SILVER', 'Silver', 11, 30, '#C0C0C0', '#A9A9A9', '#E8E8E8', '🥈', 'SPARKLE', 'PULSE'),
    ('GOLD', 'Gold', 31, 60, '#FFD700', '#FFA500', '#FFFACD', '🥇', 'SHIMMER', 'PULSE'),
    ('GTO_MASTER', 'GTO Master', 61, 100, '#4B0082', '#8A2BE2', '#FF1493', '👑', 'FLAME', 'ROTATE')
ON CONFLICT (tier_id) DO UPDATE SET
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    glow_color = EXCLUDED.glow_color;

-- 🎨 Tier Colors Function
CREATE OR REPLACE FUNCTION get_tier_colors(p_level INT)
RETURNS JSONB AS $$
DECLARE
    v_tier RECORD;
    v_progress FLOAT;
BEGIN
    -- Find matching tier
    SELECT * INTO v_tier
    FROM tier_visual_config
    WHERE p_level >= min_level AND p_level <= max_level
    ORDER BY min_level DESC
    LIMIT 1;
    
    -- Default to Bronze if not found
    IF v_tier IS NULL THEN
        SELECT * INTO v_tier FROM tier_visual_config WHERE tier_id = 'BRONZE';
    END IF;
    
    -- Calculate progress within tier
    v_progress := (p_level - v_tier.min_level)::FLOAT / 
                  NULLIF((v_tier.max_level - v_tier.min_level), 0)::FLOAT;
    v_progress := COALESCE(v_progress, 0);
    
    RETURN jsonb_build_object(
        'tier_id', v_tier.tier_id,
        'tier_name', v_tier.tier_name,
        'level', p_level,
        'level_range', jsonb_build_object('min', v_tier.min_level, 'max', v_tier.max_level),
        'progress_in_tier', ROUND(v_progress::NUMERIC, 4),
        'colors', jsonb_build_object(
            'primary', v_tier.primary_color,
            'secondary', v_tier.secondary_color,
            'glow', v_tier.glow_color
        ),
        'badge', v_tier.badge_icon,
        'effects', jsonb_build_object(
            'particle', v_tier.particle_effect,
            'aura', v_tier.aura_animation
        ),
        'css', jsonb_build_object(
            'background', format('linear-gradient(135deg, %s 0%%, %s 100%%)', v_tier.primary_color, v_tier.secondary_color),
            'border', format('2px solid %s', v_tier.glow_color),
            'box_shadow', format('0 0 20px %s', v_tier.glow_color),
            'text_color', CASE WHEN v_tier.tier_id IN ('BRONZE', 'GTO_MASTER') THEN '#FFFFFF' ELSE '#000000' END
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 🎨 Get user tier visual state
CREATE OR REPLACE FUNCTION get_user_tier_visual(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_level INT;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Calculate level from XP
    SELECT fn_calculate_level(v_profile.xp_total) INTO v_level;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'username', v_profile.username,
        'xp_total', v_profile.xp_total,
        'level', v_level,
        'skill_tier', v_profile.skill_tier
    ) || get_tier_colors(v_level);
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🔥 TASK 21: STREAK_FLAME_INTENSITY_LOGIC
-- 3 days = Small Blue Flame, 7 days = Roaring Orange, 30 days = Purple Fire
-- ═══════════════════════════════════════════════════════════════════════════

-- Flame visual configuration
CREATE TABLE IF NOT EXISTS streak_flame_config (
    flame_id TEXT PRIMARY KEY,
    flame_name TEXT NOT NULL,
    min_days INT NOT NULL,
    max_days INT NOT NULL,
    flame_color TEXT NOT NULL,
    glow_color TEXT NOT NULL,
    intensity FLOAT NOT NULL CHECK (intensity BETWEEN 0 AND 1),
    animation_speed FLOAT DEFAULT 1.0,
    particle_count INT DEFAULT 10,
    flame_height TEXT DEFAULT 'SMALL',
    sound_effect TEXT
);

-- Insert flame configurations
INSERT INTO streak_flame_config (flame_id, flame_name, min_days, max_days, flame_color, glow_color, intensity, animation_speed, particle_count, flame_height, sound_effect)
VALUES
    ('NONE', 'No Flame', 0, 2, 'transparent', 'transparent', 0, 0, 0, 'NONE', NULL),
    ('BLUE_STARTER', 'Small Blue Flame', 3, 6, '#1E90FF', '#00BFFF', 0.3, 1.0, 10, 'SMALL', 'flame_soft'),
    ('ORANGE_ROARING', 'Roaring Orange', 7, 29, '#FF4500', '#FFA500', 0.7, 1.5, 25, 'MEDIUM', 'flame_crackle'),
    ('PURPLE_INFERNO', 'Purple Fire', 30, 999, '#8B00FF', '#FF1493', 1.0, 2.0, 50, 'LARGE', 'flame_roar')
ON CONFLICT (flame_id) DO UPDATE SET
    flame_color = EXCLUDED.flame_color,
    glow_color = EXCLUDED.glow_color,
    intensity = EXCLUDED.intensity;

-- 🔥 Get Streak Flame Metadata
CREATE OR REPLACE FUNCTION get_streak_flame_metadata(p_streak_days INT)
RETURNS JSONB AS $$
DECLARE
    v_flame RECORD;
    v_progress FLOAT;
    v_next_tier RECORD;
BEGIN
    -- Find matching flame tier
    SELECT * INTO v_flame
    FROM streak_flame_config
    WHERE p_streak_days >= min_days AND p_streak_days <= max_days
    ORDER BY min_days DESC
    LIMIT 1;
    
    -- Default to no flame
    IF v_flame IS NULL THEN
        SELECT * INTO v_flame FROM streak_flame_config WHERE flame_id = 'NONE';
    END IF;
    
    -- Calculate progress within tier
    v_progress := (p_streak_days - v_flame.min_days)::FLOAT / 
                  NULLIF((v_flame.max_days - v_flame.min_days), 0)::FLOAT;
    v_progress := LEAST(1, COALESCE(v_progress, 0));
    
    -- Find next tier
    SELECT * INTO v_next_tier
    FROM streak_flame_config
    WHERE min_days > p_streak_days
    ORDER BY min_days ASC
    LIMIT 1;
    
    RETURN jsonb_build_object(
        'streak_days', p_streak_days,
        'flame', jsonb_build_object(
            'id', v_flame.flame_id,
            'name', v_flame.flame_name,
            'color', v_flame.flame_color,
            'glow', v_flame.glow_color,
            'intensity', v_flame.intensity,
            'height', v_flame.flame_height
        ),
        'animation', jsonb_build_object(
            'speed', v_flame.animation_speed,
            'particle_count', v_flame.particle_count,
            'sound', v_flame.sound_effect
        ),
        'progress', jsonb_build_object(
            'in_tier', ROUND(v_progress::NUMERIC, 4),
            'days_in_tier', p_streak_days - v_flame.min_days,
            'days_to_next', CASE WHEN v_next_tier IS NOT NULL 
                THEN v_next_tier.min_days - p_streak_days 
                ELSE NULL 
            END,
            'next_tier', v_next_tier.flame_name
        ),
        'css', jsonb_build_object(
            'filter', format('drop-shadow(0 0 %spx %s)', ROUND(v_flame.intensity * 20), v_flame.glow_color),
            'animation', format('flame-flicker %ss ease-in-out infinite', ROUND(1.0 / v_flame.animation_speed, 2)),
            'opacity', v_flame.intensity
        ),
        'webgl', jsonb_build_object(
            'emitter_rate', v_flame.particle_count,
            'color_start', v_flame.flame_color,
            'color_end', v_flame.glow_color,
            'velocity', v_flame.animation_speed * 2,
            'lifetime', 1.0 / v_flame.animation_speed
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 🔥 Get user streak visual state
CREATE OR REPLACE FUNCTION get_user_streak_visual(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_streak RECORD;
    v_flame_data JSONB;
BEGIN
    SELECT * INTO v_streak FROM user_streaks WHERE user_id = p_user_id;
    
    IF v_streak IS NULL THEN
        RETURN get_streak_flame_metadata(0) || jsonb_build_object('user_id', p_user_id);
    END IF;
    
    v_flame_data := get_streak_flame_metadata(v_streak.current_streak);
    
    RETURN v_flame_data || jsonb_build_object(
        'user_id', p_user_id,
        'streak', jsonb_build_object(
            'current', v_streak.current_streak,
            'longest', v_streak.longest_streak,
            'last_active', v_streak.last_active_date,
            'started_at', v_streak.streak_started_at
        ),
        'multiplier', CASE 
            WHEN v_streak.current_streak >= 7 THEN 2.0
            WHEN v_streak.current_streak >= 3 THEN 1.5
            ELSE 1.0
        END
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🎨 COMBINED VISUAL STATE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_complete_visual_state(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_pulse JSONB;
    v_tier JSONB;
    v_flame JSONB;
BEGIN
    v_pulse := dna_pulse_engine(p_user_id);
    v_tier := get_user_tier_visual(p_user_id);
    v_flame := get_user_streak_visual(p_user_id);
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'generated_at', NOW(),
        'version', 'VISUAL_ADDICTION_V1',
        'dna_pulse', v_pulse,
        'tier_visual', v_tier,
        'streak_flame', v_flame
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ RED VISUAL ADDICTION COMPLETE (PROMPTS 19-21)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🎨 RED VISUAL ADDICTION — PROMPTS 19-21 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🔮 TASK 19: HOLOGRAPHIC_RADAR        ✅ PULSING';
    RAISE NOTICE '   🎨 TASK 20: TIER_COLORS              ✅ MAPPED';
    RAISE NOTICE '   🔥 TASK 21: STREAK_FLAMES            ✅ BLAZING';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Function: dna_pulse_engine (real-time animation)';
    RAISE NOTICE '   Function: get_tier_colors (Bronze→GTO Master)';
    RAISE NOTICE '   Function: get_streak_flame_metadata (Blue→Purple)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
