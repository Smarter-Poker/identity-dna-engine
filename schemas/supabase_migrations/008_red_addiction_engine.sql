-- ═══════════════════════════════════════════════════════════════════════════
-- ⚡️ IDENTITY_DNA_ENGINE — RED ADDICTION ENGINE (PROMPTS 7-9)
-- 008_red_addiction_engine.sql
-- 
-- @task_07: HOLOGRAPHIC_RADAR_CHART_MAPPING
-- @task_08: XP_LEVEL_UP_TRIGGER_EVENTS
-- @task_09: PROFILE_SOVEREIGNTY_SEAL
-- 
-- STATUS: ADDICTION_ENGINE_ACTIVE ⚡️
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🔮 TASK 07: HOLOGRAPHIC_RADAR_CHART_MAPPING
-- Function: dna_visual_stream
-- Aggregates Grit (Streaks), Skill (Accuracy), Aggression (Range)
-- Output: 5-point data payload for 3D dashboard visualizer
-- ═══════════════════════════════════════════════════════════════════════════

-- 📊 DNA Visual Stream Function
CREATE OR REPLACE FUNCTION dna_visual_stream(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_grit FLOAT := 50.0;
    v_skill FLOAT := 50.0;
    v_aggression FLOAT := 50.0;
    v_wealth FLOAT := 50.0;
    v_tilt_resistance FLOAT := 50.0;
    v_streak RECORD;
    v_drills RECORD;
    v_traits RECORD;
    v_profile RECORD;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 AGGREGATE GRIT (from Streaks)
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        current_streak,
        longest_streak,
        LEAST(100, (current_streak * 5) + (longest_streak * 2)) AS grit_score
    INTO v_streak
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    v_grit := COALESCE(v_streak.grit_score, 50);
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 AGGREGATE SKILL (from Accuracy - last 30 drills)
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        AVG(accuracy) * 100 AS skill_score,
        AVG(gto_compliance) * 100 AS gto_score,
        COUNT(*) AS drill_count
    INTO v_drills
    FROM (
        SELECT accuracy, gto_compliance
        FROM drill_performance
        WHERE user_id = p_user_id
        ORDER BY completed_at DESC
        LIMIT 30
    ) recent_drills;
    
    v_skill := COALESCE(v_drills.skill_score, 50);
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 AGGREGATE AGGRESSION (from Range/Traits)
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        aggression_score,
        tilt_resistance,
        risk_tolerance
    INTO v_traits
    FROM player_traits
    WHERE user_id = p_user_id;
    
    v_aggression := COALESCE(v_traits.aggression_score, 50);
    v_tilt_resistance := COALESCE(v_traits.tilt_resistance, 50);
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 GET PROFILE DATA
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        id, username, skill_tier, xp_total, trust_score
    INTO v_profile
    FROM profiles
    WHERE id = p_user_id;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 🔮 BUILD 5-POINT RADAR PAYLOAD FOR 3D VISUALIZER
    -- ═══════════════════════════════════════════════════════════════════
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'username', v_profile.username,
        'generated_at', NOW(),
        'version', '2.0',
        
        -- 5-Point Radar Chart Data
        'radar_chart', jsonb_build_object(
            'points', jsonb_build_array(
                -- Point 1: SKILL (top)
                jsonb_build_object(
                    'axis', 'skill',
                    'value', ROUND(v_skill::NUMERIC, 1),
                    'normalized', ROUND((v_skill / 100)::NUMERIC, 3),
                    'color', '#00BFFF',
                    'label', 'Skill',
                    'angle', 90
                ),
                -- Point 2: GRIT (top-right)
                jsonb_build_object(
                    'axis', 'grit',
                    'value', ROUND(v_grit::NUMERIC, 1),
                    'normalized', ROUND((v_grit / 100)::NUMERIC, 3),
                    'color', '#32CD32',
                    'label', 'Grit',
                    'angle', 18
                ),
                -- Point 3: AGGRESSION (bottom-right)
                jsonb_build_object(
                    'axis', 'aggression',
                    'value', ROUND(v_aggression::NUMERIC, 1),
                    'normalized', ROUND((v_aggression / 100)::NUMERIC, 3),
                    'color', '#FF4500',
                    'label', 'Aggression',
                    'angle', -54
                ),
                -- Point 4: WEALTH (bottom-left)
                jsonb_build_object(
                    'axis', 'wealth',
                    'value', ROUND(v_wealth::NUMERIC, 1),
                    'normalized', ROUND((v_wealth / 100)::NUMERIC, 3),
                    'color', '#9400D3',
                    'label', 'Wealth',
                    'angle', -126
                ),
                -- Point 5: TILT_RESISTANCE (top-left)
                jsonb_build_object(
                    'axis', 'tilt_resistance',
                    'value', ROUND(v_tilt_resistance::NUMERIC, 1),
                    'normalized', ROUND((v_tilt_resistance / 100)::NUMERIC, 3),
                    'color', '#FFD700',
                    'label', 'Composure',
                    'angle', -198
                )
            ),
            'composite_score', ROUND((
                (v_skill * 0.25) + 
                (v_grit * 0.20) + 
                (v_aggression * 0.20) + 
                (v_wealth * 0.15) + 
                (v_tilt_resistance * 0.20)
            )::NUMERIC, 2)
        ),
        
        -- 3D Rendering Parameters
        'hologram', jsonb_build_object(
            'vertices', jsonb_build_array(
                jsonb_build_object('x', 0, 'y', (v_skill / 50.0), 'z', 0),
                jsonb_build_object('x', (v_grit / 50.0) * 0.951, 'y', (v_grit / 50.0) * 0.309, 'z', 0),
                jsonb_build_object('x', (v_aggression / 50.0) * 0.588, 'y', (v_aggression / 50.0) * -0.809, 'z', 0),
                jsonb_build_object('x', (v_wealth / 50.0) * -0.588, 'y', (v_wealth / 50.0) * -0.809, 'z', 0),
                jsonb_build_object('x', (v_tilt_resistance / 50.0) * -0.951, 'y', (v_tilt_resistance / 50.0) * 0.309, 'z', 0)
            ),
            'glow_intensity', GREATEST(0.3, v_profile.skill_tier / 10.0),
            'rotation_speed', 0.5 + (v_aggression / 200.0),
            'pulse_rate', CASE 
                WHEN v_profile.skill_tier >= 9 THEN 'fast'
                WHEN v_profile.skill_tier >= 7 THEN 'medium'
                ELSE 'slow'
            END,
            'aura', CASE 
                WHEN v_profile.skill_tier >= 9 THEN jsonb_build_object('color', '#FF1493', 'name', 'LEGENDARY')
                WHEN v_profile.skill_tier >= 7 THEN jsonb_build_object('color', '#00BFFF', 'name', 'ELITE')
                WHEN v_profile.skill_tier >= 5 THEN jsonb_build_object('color', '#FFD700', 'name', 'GOLD')
                ELSE jsonb_build_object('color', '#808080', 'name', 'STANDARD')
            END,
            'particle_system', jsonb_build_object(
                'density', CASE WHEN v_profile.skill_tier >= 8 THEN 'high' ELSE 'medium' END,
                'speed', v_aggression / 100.0,
                'color_variance', 0.2
            )
        ),
        
        -- Player Stats
        'stats', jsonb_build_object(
            'skill_tier', v_profile.skill_tier,
            'xp_total', v_profile.xp_total,
            'trust_score', v_profile.trust_score,
            'current_streak', COALESCE(v_streak.current_streak, 0),
            'drills_analyzed', COALESCE(v_drills.drill_count, 0)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 🏆 TASK 08: XP_LEVEL_UP_TRIGGER_EVENTS
-- Trigger: on_level_up notification logic
-- Requirement: When XP hits milestone → trigger "Rarity Badge" minting event
-- ═══════════════════════════════════════════════════════════════════════════

-- Level thresholds and badge mapping
CREATE TABLE IF NOT EXISTS xp_level_thresholds (
    level INT PRIMARY KEY,
    xp_required BIGINT NOT NULL,
    tier_name TEXT NOT NULL,
    badge_rarity TEXT NOT NULL CHECK (badge_rarity IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC')),
    badge_name TEXT NOT NULL,
    badge_icon TEXT,
    perks JSONB DEFAULT '[]'::jsonb
);

-- Insert level thresholds
INSERT INTO xp_level_thresholds (level, xp_required, tier_name, badge_rarity, badge_name, badge_icon, perks)
VALUES
    (1, 0, 'Rookie', 'COMMON', 'First Steps', '🎯', '["access_training"]'),
    (5, 1000, 'Apprentice', 'COMMON', 'Apprentice Badge', '📚', '["unlock_drills"]'),
    (10, 5000, 'Student', 'UNCOMMON', 'Dedicated Student', '🎓', '["custom_avatar"]'),
    (15, 15000, 'Practitioner', 'UNCOMMON', 'Practitioner Seal', '⚔️', '["leaderboard_access"]'),
    (20, 30000, 'Skilled', 'RARE', 'Skilled Player', '💎', '["advanced_stats"]'),
    (25, 50000, 'Expert', 'RARE', 'Expert Badge', '🏅', '["mentorship_access"]'),
    (30, 80000, 'Master', 'EPIC', 'Master Badge', '👑', '["create_clubs"]'),
    (40, 150000, 'Grandmaster', 'EPIC', 'Grandmaster Seal', '🔥', '["vip_support"]'),
    (50, 300000, 'Legend', 'LEGENDARY', 'Legend Status', '⭐', '["beta_features"]'),
    (75, 750000, 'Mythic', 'MYTHIC', 'Mythic Champion', '🌟', '["early_access", "exclusive_events"]'),
    (100, 2000000, 'Immortal', 'MYTHIC', 'Immortal God', '💫', '["lifetime_perks", "creator_program"]')
ON CONFLICT (level) DO UPDATE SET
    xp_required = EXCLUDED.xp_required,
    tier_name = EXCLUDED.tier_name,
    badge_rarity = EXCLUDED.badge_rarity,
    badge_name = EXCLUDED.badge_name;

-- Badge minting events queue
CREATE TABLE IF NOT EXISTS badge_mint_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    badge_name TEXT NOT NULL,
    badge_rarity TEXT NOT NULL,
    level_achieved INT NOT NULL,
    xp_at_mint BIGINT NOT NULL,
    mint_status TEXT DEFAULT 'PENDING' CHECK (mint_status IN ('PENDING', 'MINTED', 'FAILED', 'CLAIMED')),
    minted_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_badge_mint_user ON badge_mint_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_mint_status ON badge_mint_queue(mint_status);

-- Level-up notification events
CREATE TABLE IF NOT EXISTS level_up_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    old_level INT NOT NULL,
    new_level INT NOT NULL,
    old_xp BIGINT NOT NULL,
    new_xp BIGINT NOT NULL,
    badges_earned TEXT[],
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_type TEXT DEFAULT 'IN_APP',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_level_up_user ON level_up_events(user_id);
CREATE INDEX IF NOT EXISTS idx_level_up_created ON level_up_events(created_at DESC);

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION fn_calculate_level(p_xp BIGINT)
RETURNS INT AS $$
DECLARE
    v_level INT := 1;
BEGIN
    SELECT COALESCE(MAX(level), 1) INTO v_level
    FROM xp_level_thresholds
    WHERE xp_required <= p_xp;
    
    RETURN v_level;
END;
$$ LANGUAGE plpgsql STABLE;

-- On Level Up Function
CREATE OR REPLACE FUNCTION fn_on_level_up(
    p_user_id UUID,
    p_old_xp BIGINT,
    p_new_xp BIGINT
)
RETURNS TABLE (
    leveled_up BOOLEAN,
    old_level INT,
    new_level INT,
    badges_minted TEXT[],
    notification JSONB
) AS $$
DECLARE
    v_old_level INT;
    v_new_level INT;
    v_threshold RECORD;
    v_badges TEXT[] := '{}';
    v_mint_id UUID;
    v_notification JSONB;
BEGIN
    -- Calculate levels
    v_old_level := fn_calculate_level(p_old_xp);
    v_new_level := fn_calculate_level(p_new_xp);
    
    -- Check if leveled up
    IF v_new_level > v_old_level THEN
        -- Process each level crossed
        FOR v_threshold IN 
            SELECT * FROM xp_level_thresholds
            WHERE level > v_old_level AND level <= v_new_level
            ORDER BY level ASC
        LOOP
            -- Queue badge minting
            INSERT INTO badge_mint_queue (
                user_id, badge_name, badge_rarity, level_achieved, xp_at_mint, metadata
            ) VALUES (
                p_user_id,
                v_threshold.badge_name,
                v_threshold.badge_rarity,
                v_threshold.level,
                p_new_xp,
                jsonb_build_object(
                    'tier_name', v_threshold.tier_name,
                    'perks', v_threshold.perks,
                    'milestone', TRUE
                )
            ) RETURNING id INTO v_mint_id;
            
            v_badges := array_append(v_badges, v_threshold.badge_name);
            
            -- Update user badges in profiles
            UPDATE profiles SET
                badges = badges || jsonb_build_object(
                    'badge_id', v_mint_id,
                    'name', v_threshold.badge_name,
                    'rarity', v_threshold.badge_rarity,
                    'level', v_threshold.level,
                    'earned_at', NOW()
                ),
                skill_tier = GREATEST(skill_tier, v_threshold.level / 10)
            WHERE id = p_user_id;
        END LOOP;
        
        -- Record level-up event
        INSERT INTO level_up_events (
            user_id, old_level, new_level, old_xp, new_xp, badges_earned
        ) VALUES (
            p_user_id, v_old_level, v_new_level, p_old_xp, p_new_xp, v_badges
        );
        
        -- Build notification payload
        v_notification := jsonb_build_object(
            'type', 'LEVEL_UP',
            'title', format('🎉 Level %s Achieved!', v_new_level),
            'message', format('You reached Level %s and earned %s badge(s)!', v_new_level, array_length(v_badges, 1)),
            'badges', v_badges,
            'old_level', v_old_level,
            'new_level', v_new_level,
            'xp_total', p_new_xp,
            'timestamp', NOW()
        );
        
        RETURN QUERY SELECT TRUE, v_old_level, v_new_level, v_badges, v_notification;
    ELSE
        RETURN QUERY SELECT FALSE, v_old_level, v_new_level, v_badges, NULL::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-check level up on XP change
CREATE OR REPLACE FUNCTION fn_check_level_up_on_xp_change()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Only process XP increases
    IF NEW.xp_total > OLD.xp_total THEN
        SELECT * INTO v_result
        FROM fn_on_level_up(NEW.id, OLD.xp_total, NEW.xp_total);
        
        -- Log if leveled up
        IF v_result.leveled_up THEN
            RAISE NOTICE 'User % leveled up: % → % (Badges: %)', 
                NEW.id, v_result.old_level, v_result.new_level, v_result.badges_minted;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_check_level_up ON profiles;
CREATE TRIGGER trig_check_level_up
    AFTER UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total AND NEW.xp_total > OLD.xp_total)
    EXECUTE FUNCTION fn_check_level_up_on_xp_change();


-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 TASK 09: PROFILE_SOVEREIGNTY_SEAL
-- Function: identity_verification_rpc
-- Law: User cannot enter "High Stakes" Arena without 'Verified Pro' DNA badge
-- ═══════════════════════════════════════════════════════════════════════════

-- Verification status table
CREATE TABLE IF NOT EXISTS identity_verification (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    verification_level TEXT DEFAULT 'NONE' CHECK (verification_level IN (
        'NONE', 'EMAIL', 'PHONE', 'ID_BASIC', 'ID_FULL', 'VERIFIED_PRO'
    )),
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    documents_submitted BOOLEAN DEFAULT FALSE,
    documents_approved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Arena access requirements
CREATE TABLE IF NOT EXISTS arena_requirements (
    arena_id TEXT PRIMARY KEY,
    arena_name TEXT NOT NULL,
    arena_type TEXT NOT NULL CHECK (arena_type IN ('LOW_STAKES', 'MID_STAKES', 'HIGH_STAKES', 'ELITE', 'INVITATIONAL')),
    min_verification_level TEXT NOT NULL,
    min_skill_tier INT DEFAULT 1,
    min_xp BIGINT DEFAULT 0,
    required_badges TEXT[],
    stake_limits JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert arena requirements
INSERT INTO arena_requirements (arena_id, arena_name, arena_type, min_verification_level, min_skill_tier, min_xp, required_badges)
VALUES
    ('arena_low', 'Beginner Tables', 'LOW_STAKES', 'NONE', 1, 0, '{}'),
    ('arena_mid', 'Standard Arena', 'MID_STAKES', 'EMAIL', 3, 5000, '{}'),
    ('arena_high', 'High Stakes Arena', 'HIGH_STAKES', 'VERIFIED_PRO', 7, 100000, '{"Verified Pro DNA"}'),
    ('arena_elite', 'Elite Championship', 'ELITE', 'VERIFIED_PRO', 9, 500000, '{"Verified Pro DNA", "Legend Status"}'),
    ('arena_invite', 'Invitational Series', 'INVITATIONAL', 'VERIFIED_PRO', 10, 1000000, '{"Mythic Champion"}')
ON CONFLICT (arena_id) DO UPDATE SET
    min_verification_level = EXCLUDED.min_verification_level,
    min_skill_tier = EXCLUDED.min_skill_tier,
    required_badges = EXCLUDED.required_badges;

-- Identity Verification RPC Function
CREATE OR REPLACE FUNCTION identity_verification_rpc(
    p_user_id UUID,
    p_arena_id TEXT DEFAULT NULL,
    p_action TEXT DEFAULT 'CHECK'
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_verification RECORD;
    v_arena RECORD;
    v_has_required_badges BOOLEAN := TRUE;
    v_missing_badges TEXT[] := '{}';
    v_badge TEXT;
    v_badge_found BOOLEAN;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'USER_NOT_FOUND',
            'message', 'User profile not found'
        );
    END IF;
    
    -- Get verification status
    SELECT * INTO v_verification 
    FROM identity_verification 
    WHERE user_id = p_user_id;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- ACTION: CHECK - Return current verification status
    -- ═══════════════════════════════════════════════════════════════════
    IF p_action = 'CHECK' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'user_id', p_user_id,
            'username', v_profile.username,
            'verification_level', COALESCE(v_verification.verification_level, 'NONE'),
            'is_verified_pro', COALESCE(v_verification.verification_level, 'NONE') = 'VERIFIED_PRO',
            'skill_tier', v_profile.skill_tier,
            'xp_total', v_profile.xp_total,
            'badges', v_profile.badges,
            'can_access', jsonb_build_object(
                'low_stakes', TRUE,
                'mid_stakes', COALESCE(v_verification.verification_level, 'NONE') != 'NONE',
                'high_stakes', COALESCE(v_verification.verification_level, 'NONE') = 'VERIFIED_PRO',
                'elite', COALESCE(v_verification.verification_level, 'NONE') = 'VERIFIED_PRO' AND v_profile.skill_tier >= 9
            )
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- ACTION: VERIFY_ARENA - Check if user can enter specific arena
    -- ═══════════════════════════════════════════════════════════════════
    IF p_action = 'VERIFY_ARENA' AND p_arena_id IS NOT NULL THEN
        SELECT * INTO v_arena FROM arena_requirements WHERE arena_id = p_arena_id;
        
        IF v_arena IS NULL THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'ARENA_NOT_FOUND',
                'message', 'Arena not found'
            );
        END IF;
        
        -- Check verification level
        IF v_arena.arena_type IN ('HIGH_STAKES', 'ELITE', 'INVITATIONAL') THEN
            IF COALESCE(v_verification.verification_level, 'NONE') != 'VERIFIED_PRO' THEN
                -- 🚨 LAW: User cannot enter High Stakes without Verified Pro DNA badge
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'VERIFICATION_REQUIRED',
                    'message', '🔐 SOVEREIGNTY LAW: Verified Pro DNA badge required for High Stakes Arena',
                    'arena', v_arena.arena_name,
                    'required_level', 'VERIFIED_PRO',
                    'current_level', COALESCE(v_verification.verification_level, 'NONE'),
                    'action_required', 'Complete identity verification to unlock High Stakes access'
                );
            END IF;
        END IF;
        
        -- Check skill tier
        IF v_profile.skill_tier < v_arena.min_skill_tier THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'SKILL_TIER_INSUFFICIENT',
                'message', format('Minimum Skill Tier %s required', v_arena.min_skill_tier),
                'required_tier', v_arena.min_skill_tier,
                'current_tier', v_profile.skill_tier
            );
        END IF;
        
        -- Check XP
        IF v_profile.xp_total < v_arena.min_xp THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'XP_INSUFFICIENT',
                'message', format('Minimum %s XP required', v_arena.min_xp),
                'required_xp', v_arena.min_xp,
                'current_xp', v_profile.xp_total
            );
        END IF;
        
        -- Check required badges
        IF v_arena.required_badges IS NOT NULL AND array_length(v_arena.required_badges, 1) > 0 THEN
            FOREACH v_badge IN ARRAY v_arena.required_badges LOOP
                v_badge_found := v_profile.badges @> jsonb_build_array(
                    jsonb_build_object('name', v_badge)
                );
                
                IF NOT v_badge_found THEN
                    v_has_required_badges := FALSE;
                    v_missing_badges := array_append(v_missing_badges, v_badge);
                END IF;
            END LOOP;
            
            IF NOT v_has_required_badges THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'BADGES_MISSING',
                    'message', 'Required badges not found',
                    'missing_badges', v_missing_badges
                );
            END IF;
        END IF;
        
        -- All checks passed
        RETURN jsonb_build_object(
            'success', TRUE,
            'access_granted', TRUE,
            'arena_id', p_arena_id,
            'arena_name', v_arena.arena_name,
            'arena_type', v_arena.arena_type,
            'user', jsonb_build_object(
                'username', v_profile.username,
                'verification_level', v_verification.verification_level,
                'skill_tier', v_profile.skill_tier,
                'xp_total', v_profile.xp_total
            ),
            'message', format('✅ Access granted to %s', v_arena.arena_name)
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- ACTION: UPGRADE - Request verification upgrade
    -- ═══════════════════════════════════════════════════════════════════
    IF p_action = 'UPGRADE' THEN
        -- Create or update verification record
        INSERT INTO identity_verification (user_id, verification_level, updated_at)
        VALUES (p_user_id, 'NONE', NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'Verification upgrade request initiated',
            'current_level', COALESCE(v_verification.verification_level, 'NONE'),
            'next_steps', jsonb_build_array(
                'Verify email address',
                'Verify phone number',
                'Submit identity documents',
                'Complete video verification'
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_ACTION',
        'message', 'Valid actions: CHECK, VERIFY_ARENA, UPGRADE'
    );
END;
$$ LANGUAGE plpgsql;

-- View for arena access matrix
CREATE OR REPLACE VIEW user_arena_access AS
SELECT 
    p.id AS user_id,
    p.username,
    p.skill_tier,
    p.xp_total,
    COALESCE(v.verification_level, 'NONE') AS verification_level,
    ar.arena_id,
    ar.arena_name,
    ar.arena_type,
    CASE 
        WHEN ar.arena_type = 'LOW_STAKES' THEN TRUE
        WHEN ar.arena_type = 'MID_STAKES' AND COALESCE(v.verification_level, 'NONE') != 'NONE' THEN TRUE
        WHEN ar.arena_type IN ('HIGH_STAKES', 'ELITE', 'INVITATIONAL') 
             AND COALESCE(v.verification_level, 'NONE') = 'VERIFIED_PRO'
             AND p.skill_tier >= ar.min_skill_tier
             AND p.xp_total >= ar.min_xp
        THEN TRUE
        ELSE FALSE
    END AS has_access,
    ar.min_skill_tier,
    ar.min_xp,
    ar.required_badges
FROM profiles p
CROSS JOIN arena_requirements ar
LEFT JOIN identity_verification v ON p.id = v.user_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ RED ADDICTION ENGINE COMPLETE (PROMPTS 7-9)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   ⚡️ RED ADDICTION ENGINE — PROMPTS 7-9 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🔮 TASK 07: RADAR_CHART_MAPPING       ✅ DEPLOYED';
    RAISE NOTICE '   🏆 TASK 08: LEVEL_UP_TRIGGERS         ✅ ACTIVE';
    RAISE NOTICE '   🔐 TASK 09: SOVEREIGNTY_SEAL          ✅ ENFORCED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Functions: dna_visual_stream, fn_on_level_up';
    RAISE NOTICE '   RPC: identity_verification_rpc';
    RAISE NOTICE '   Law: No High Stakes without Verified Pro DNA';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
