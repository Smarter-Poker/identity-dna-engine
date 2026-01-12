-- ═══════════════════════════════════════════════════════════════════════════
-- 💰 SOCIAL ECONOMY & XP REWARD ENGINE
-- schemas/supabase_migrations/021_social_economy_integration.sql
-- 
-- Integrates Social Orb with XP and Diamond economy
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 XP REWARD CONSTANTS
-- ═══════════════════════════════════════════════════════════════════════════

-- XP Awards for social actions
-- POST_CREATED: 25 XP
-- REACTION_RECEIVED: 5 XP (per reaction)
-- COMMENT_CREATED: 10 XP
-- COMMENT_RECEIVED: 3 XP
-- HIGH_ENGAGEMENT_BONUS: 50 XP (for 20+ reactions)

-- Streak Multipliers
-- 3-day streak: 1.2x
-- 7-day streak: 1.5x
-- 14-day streak: 1.8x
-- 30-day streak: 2.0x

-- ═══════════════════════════════════════════════════════════════════════════
-- 📈 SOCIAL XP TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_xp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'post_created', 
        'reaction_received', 
        'comment_created', 
        'comment_received',
        'high_engagement_bonus',
        'diamond_earned'
    )),
    base_xp INT NOT NULL CHECK (base_xp >= 0),
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    final_xp INT NOT NULL CHECK (final_xp >= 0),
    source_id UUID, -- post_id or comment_id that triggered the XP
    streak_days INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_xp_log_user ON social_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_social_xp_log_created ON social_xp_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_xp_log_action ON social_xp_log(action_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 💎 DIAMOND MINING REWARDS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_diamond_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    diamonds_earned INT NOT NULL CHECK (diamonds_earned > 0),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'high_engagement', -- 20+ reactions
        'viral_post',      -- 100+ reactions
        'community_pick',  -- Admin selected
        'streak_bonus'     -- Streak achievement
    )),
    reaction_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Only one reward per trigger type per post
    UNIQUE(post_id, trigger_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_diamond_user ON social_diamond_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_social_diamond_post ON social_diamond_rewards(post_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 STREAK MULTIPLIER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_get_streak_multiplier(p_streak_days INT)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    RETURN CASE
        WHEN p_streak_days >= 30 THEN 2.0
        WHEN p_streak_days >= 14 THEN 1.8
        WHEN p_streak_days >= 7 THEN 1.5
        WHEN p_streak_days >= 3 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 AWARD SOCIAL XP FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_award_social_xp(
    p_user_id UUID,
    p_action_type TEXT,
    p_source_id UUID DEFAULT NULL
)
RETURNS TABLE (
    xp_awarded INT,
    multiplier_applied DECIMAL(3,2),
    streak_days INT,
    diamonds_awarded INT,
    total_xp INT
) AS $$
DECLARE
    v_base_xp INT;
    v_streak_days INT;
    v_multiplier DECIMAL(3,2);
    v_final_xp INT;
    v_diamonds INT := 0;
    v_reaction_count INT := 0;
    v_current_xp INT;
BEGIN
    -- Get base XP for action type
    v_base_xp := CASE p_action_type
        WHEN 'post_created' THEN 25
        WHEN 'reaction_received' THEN 5
        WHEN 'comment_created' THEN 10
        WHEN 'comment_received' THEN 3
        WHEN 'high_engagement_bonus' THEN 50
        ELSE 0
    END;
    
    -- Get user's current streak
    SELECT COALESCE(current_streak, 0) INTO v_streak_days
    FROM user_dna_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate multiplier
    v_multiplier := fn_get_streak_multiplier(COALESCE(v_streak_days, 0));
    
    -- Calculate final XP
    v_final_xp := ROUND(v_base_xp * v_multiplier);
    
    -- Check for diamond mining (high engagement posts)
    IF p_action_type = 'reaction_received' AND p_source_id IS NOT NULL THEN
        SELECT like_count INTO v_reaction_count
        FROM social_posts
        WHERE id = p_source_id;
        
        -- Award diamonds at engagement thresholds
        IF v_reaction_count = 20 THEN
            -- First threshold: 5 diamonds
            INSERT INTO social_diamond_rewards (user_id, post_id, diamonds_earned, trigger_type, reaction_count)
            VALUES (p_user_id, p_source_id, 5, 'high_engagement', v_reaction_count)
            ON CONFLICT (post_id, trigger_type) DO NOTHING
            RETURNING diamonds_earned INTO v_diamonds;
            
            IF v_diamonds IS NOT NULL THEN
                -- Update user's diamond balance
                UPDATE user_dna_profiles
                SET diamonds_total = COALESCE(diamonds_total, 0) + v_diamonds
                WHERE user_id = p_user_id;
            END IF;
        ELSIF v_reaction_count = 100 THEN
            -- Viral threshold: 25 diamonds
            INSERT INTO social_diamond_rewards (user_id, post_id, diamonds_earned, trigger_type, reaction_count)
            VALUES (p_user_id, p_source_id, 25, 'viral_post', v_reaction_count)
            ON CONFLICT (post_id, trigger_type) DO NOTHING
            RETURNING diamonds_earned INTO v_diamonds;
            
            IF v_diamonds IS NOT NULL THEN
                UPDATE user_dna_profiles
                SET diamonds_total = COALESCE(diamonds_total, 0) + v_diamonds
                WHERE user_id = p_user_id;
            END IF;
        END IF;
    END IF;
    
    -- Log the XP award
    INSERT INTO social_xp_log (user_id, action_type, base_xp, multiplier, final_xp, source_id, streak_days)
    VALUES (p_user_id, p_action_type, v_base_xp, v_multiplier, v_final_xp, p_source_id, v_streak_days);
    
    -- Update user's XP (XP CAN NEVER DECREASE - enforced by trigger)
    UPDATE user_dna_profiles
    SET xp_total = COALESCE(xp_total, 0) + v_final_xp,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING xp_total INTO v_current_xp;
    
    -- Return results
    RETURN QUERY SELECT 
        v_final_xp as xp_awarded,
        v_multiplier as multiplier_applied,
        COALESCE(v_streak_days, 0) as streak_days,
        COALESCE(v_diamonds, 0) as diamonds_awarded,
        COALESCE(v_current_xp, 0) as total_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 AUTO-AWARD XP ON POST CREATION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_trigger_post_xp()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_award_social_xp(NEW.author_id, 'post_created', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_post_xp ON social_posts;
CREATE TRIGGER trig_post_xp
AFTER INSERT ON social_posts
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_post_xp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 AUTO-AWARD XP ON REACTION RECEIVED
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_trigger_reaction_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get the post author
        SELECT author_id INTO v_post_author_id
        FROM social_posts
        WHERE id = NEW.post_id;
        
        -- Award XP to post author (not the person who reacted)
        IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
            PERFORM fn_award_social_xp(v_post_author_id, 'reaction_received', NEW.post_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_reaction_xp ON social_interactions;
CREATE TRIGGER trig_reaction_xp
AFTER INSERT ON social_interactions
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_reaction_xp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 AUTO-AWARD XP ON COMMENT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_trigger_comment_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Award XP to commenter
        PERFORM fn_award_social_xp(NEW.author_id, 'comment_created', NEW.id);
        
        -- Award XP to post author
        SELECT author_id INTO v_post_author_id
        FROM social_posts
        WHERE id = NEW.post_id;
        
        IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_id THEN
            PERFORM fn_award_social_xp(v_post_author_id, 'comment_received', NEW.post_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_comment_xp ON social_comments;
CREATE TRIGGER trig_comment_xp
AFTER INSERT ON social_comments
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_comment_xp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 SOCIAL LEADERBOARD VIEW
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW social_leaderboard_24h AS
SELECT 
    l.user_id,
    p.username,
    p.avatar_url,
    p.current_level,
    p.tier_id,
    p.is_verified,
    SUM(l.final_xp) as xp_earned_24h,
    COUNT(DISTINCT CASE WHEN l.action_type = 'post_created' THEN l.source_id END) as posts_24h,
    COUNT(DISTINCT CASE WHEN l.action_type = 'reaction_received' THEN l.id END) as reactions_received_24h,
    COALESCE(SUM(d.diamonds_earned), 0) as diamonds_earned_24h
FROM social_xp_log l
LEFT JOIN user_dna_profiles p ON p.user_id = l.user_id
LEFT JOIN social_diamond_rewards d ON d.user_id = l.user_id AND d.created_at >= NOW() - INTERVAL '24 hours'
WHERE l.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY l.user_id, p.username, p.avatar_url, p.current_level, p.tier_id, p.is_verified
ORDER BY xp_earned_24h DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🏆 GET LEADERBOARD FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_get_social_leaderboard(
    p_limit INT DEFAULT 10,
    p_timeframe TEXT DEFAULT '24h' -- '24h', '7d', '30d', 'all'
)
RETURNS TABLE (
    rank INT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    level INT,
    tier TEXT,
    is_verified BOOLEAN,
    xp_earned INT,
    posts_count INT,
    reactions_received INT,
    diamonds_earned INT
) AS $$
DECLARE
    v_interval INTERVAL;
BEGIN
    v_interval := CASE p_timeframe
        WHEN '24h' THEN INTERVAL '24 hours'
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        ELSE INTERVAL '100 years' -- All time
    END;

    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(l.final_xp) DESC)::INT as rank,
        l.user_id,
        COALESCE(p.username, 'Anonymous')::TEXT,
        p.avatar_url::TEXT,
        COALESCE(p.current_level, 1)::INT,
        COALESCE(p.tier_id, 'BRONZE')::TEXT,
        COALESCE(p.is_verified, FALSE)::BOOLEAN,
        SUM(l.final_xp)::INT as xp_earned,
        COUNT(DISTINCT CASE WHEN l.action_type = 'post_created' THEN l.source_id END)::INT as posts_count,
        COUNT(DISTINCT CASE WHEN l.action_type = 'reaction_received' THEN l.id END)::INT as reactions_received,
        COALESCE(SUM(DISTINCT d.diamonds_earned), 0)::INT as diamonds_earned
    FROM social_xp_log l
    LEFT JOIN user_dna_profiles p ON p.user_id = l.user_id
    LEFT JOIN social_diamond_rewards d ON d.user_id = l.user_id AND d.created_at >= NOW() - v_interval
    WHERE l.created_at >= NOW() - v_interval
    GROUP BY l.user_id, p.username, p.avatar_url, p.current_level, p.tier_id, p.is_verified
    ORDER BY xp_earned DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   💰 SOCIAL ECONOMY & XP REWARD ENGINE — DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Table: social_xp_log                  ✅ CREATED';
    RAISE NOTICE '   Table: social_diamond_rewards         ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_streak_multiplier    ✅ CREATED';
    RAISE NOTICE '   Function: fn_award_social_xp          ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_social_leaderboard   ✅ CREATED';
    RAISE NOTICE '   Trigger: trig_post_xp                 ⚡ ARMED';
    RAISE NOTICE '   Trigger: trig_reaction_xp             ⚡ ARMED';
    RAISE NOTICE '   Trigger: trig_comment_xp              ⚡ ARMED';
    RAISE NOTICE '   View: social_leaderboard_24h          ✅ CREATED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
