-- ═══════════════════════════════════════════════════════════════════════════
-- 💰 SOCIAL ECONOMY & XP REWARD ENGINE (SAFE VERSION)
-- Adds missing functionality without recreating existing tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📈 SOCIAL XP TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_xp_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    source_id UUID,
    streak_days INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_xp_log_user ON social_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_social_xp_log_created ON social_xp_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_xp_log_action ON social_xp_log(action_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 💎 DIAMOND MINING REWARDS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_diamond_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    diamonds_earned INT NOT NULL CHECK (diamonds_earned > 0),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'high_engagement',
        'viral_post',
        'community_pick',
        'streak_bonus'
    )),
    reaction_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, trigger_type)
);

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
-- 🏆 GET LEADERBOARD FUNCTION (Simplified - no user_dna_profiles dependency)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_get_social_leaderboard(
    p_limit INT DEFAULT 10,
    p_timeframe TEXT DEFAULT '24h'
)
RETURNS TABLE (
    rank INT,
    user_id UUID,
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
        ELSE INTERVAL '100 years'
    END;

    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(l.final_xp) DESC)::INT as rank,
        l.user_id,
        SUM(l.final_xp)::INT as xp_earned,
        COUNT(DISTINCT CASE WHEN l.action_type = 'post_created' THEN l.source_id END)::INT as posts_count,
        COUNT(DISTINCT CASE WHEN l.action_type = 'reaction_received' THEN l.id END)::INT as reactions_received,
        COALESCE(SUM(DISTINCT d.diamonds_earned), 0)::INT as diamonds_earned
    FROM social_xp_log l
    LEFT JOIN social_diamond_rewards d ON d.user_id = l.user_id AND d.created_at >= NOW() - v_interval
    WHERE l.created_at >= NOW() - v_interval
    GROUP BY l.user_id
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
    RAISE NOTICE '   💰 SOCIAL ECONOMY ENGINE — DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Table: social_xp_log                ✅ CREATED';
    RAISE NOTICE '   Table: social_diamond_rewards       ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_streak_multiplier  ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_social_leaderboard ✅ CREATED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
