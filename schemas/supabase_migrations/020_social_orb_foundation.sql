-- ═══════════════════════════════════════════════════════════════════════════
-- 🌐 ORB 01: SOCIAL DATA ARCHITECTURE
-- schemas/supabase_migrations/020_social_orb_foundation.sql
-- 
-- Creates social tables with RLS and real-time replication
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- 📝 SOCIAL POSTS TABLE
-- Core content storage for the social feed
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'achievement', 'milestone')),
    
    -- Media attachments (array of storage URLs)
    media_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Engagement metrics (denormalized for performance)
    like_count INT DEFAULT 0 CHECK (like_count >= 0),
    comment_count INT DEFAULT 0 CHECK (comment_count >= 0),
    share_count INT DEFAULT 0 CHECK (share_count >= 0),
    view_count INT DEFAULT 0 CHECK (view_count >= 0),
    
    -- Visibility & Moderation
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Achievement/Milestone metadata (for special posts)
    achievement_data JSONB DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Full-text search vector
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(content, ''))
    ) STORED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_visibility ON social_posts(visibility) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_posts_trending ON social_posts(like_count DESC, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_posts_search ON social_posts USING GIN(search_vector);

-- Enable real-time replication
ALTER PUBLICATION supabase_realtime ADD TABLE social_posts;

-- ═══════════════════════════════════════════════════════════════════════════
-- 💫 SOCIAL INTERACTIONS TABLE
-- Likes, reactions, and engagement tracking
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    
    -- Interaction type
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'love', 'fire', 'clap', 'mind_blown')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one interaction type per user per post
    UNIQUE(user_id, post_id, interaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_interactions_post ON social_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_user ON social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON social_interactions(interaction_type);

-- Enable real-time for interactions
ALTER PUBLICATION supabase_realtime ADD TABLE social_interactions;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🤝 SOCIAL CONNECTIONS TABLE
-- Following/followers relationships
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Connection status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked')),
    
    -- Notification preferences
    notify_posts BOOLEAN DEFAULT TRUE,
    notify_achievements BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Can't follow yourself
    CHECK (follower_id != following_id),
    
    -- Unique constraint
    UNIQUE(follower_id, following_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_connections_follower ON social_connections(follower_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_social_connections_following ON social_connections(following_id) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════
-- 💬 SOCIAL COMMENTS TABLE
-- Comments on posts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES social_comments(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    
    -- Engagement
    like_count INT DEFAULT 0 CHECK (like_count >= 0),
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_author ON social_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_parent ON social_comments(parent_id) WHERE parent_id IS NOT NULL;

-- Enable real-time for comments
ALTER PUBLICATION supabase_realtime ADD TABLE social_comments;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- SOCIAL POSTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Anyone can read public posts
CREATE POLICY "Public posts are viewable by everyone"
ON social_posts FOR SELECT
USING (visibility = 'public' AND is_deleted = FALSE);

-- Users can read their own posts (any visibility)
CREATE POLICY "Users can view their own posts"
ON social_posts FOR SELECT
USING (auth.uid() = author_id);

-- Users can read posts from people they follow
CREATE POLICY "Users can view follower-only posts from connections"
ON social_posts FOR SELECT
USING (
    visibility = 'followers' 
    AND is_deleted = FALSE
    AND EXISTS (
        SELECT 1 FROM social_connections 
        WHERE follower_id = auth.uid() 
        AND following_id = social_posts.author_id
        AND status = 'active'
    )
);

-- Users can create posts
CREATE POLICY "Users can create their own posts"
ON social_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON social_posts FOR UPDATE
USING (auth.uid() = author_id);

-- Users can delete their own posts (soft delete)
CREATE POLICY "Users can delete their own posts"
ON social_posts FOR DELETE
USING (auth.uid() = author_id);

-- ─────────────────────────────────────────────────────────────────────────
-- SOCIAL INTERACTIONS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Anyone can see interactions on visible posts
CREATE POLICY "Interactions on public posts are viewable"
ON social_interactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM social_posts 
        WHERE id = social_interactions.post_id 
        AND (visibility = 'public' OR author_id = auth.uid())
        AND is_deleted = FALSE
    )
);

-- Users can create their own interactions
CREATE POLICY "Users can create interactions"
ON social_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interactions
CREATE POLICY "Users can remove their interactions"
ON social_interactions FOR DELETE
USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- SOCIAL CONNECTIONS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Users can see their own connections
CREATE POLICY "Users can view their connections"
ON social_connections FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can follow others
CREATE POLICY "Users can create connections"
ON social_connections FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can update their connection preferences
CREATE POLICY "Users can update their connections"
ON social_connections FOR UPDATE
USING (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can remove connections"
ON social_connections FOR DELETE
USING (auth.uid() = follower_id);

-- ─────────────────────────────────────────────────────────────────────────
-- SOCIAL COMMENTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Anyone can read comments on visible posts
CREATE POLICY "Comments on public posts are viewable"
ON social_comments FOR SELECT
USING (
    is_deleted = FALSE AND
    EXISTS (
        SELECT 1 FROM social_posts 
        WHERE id = social_comments.post_id 
        AND (visibility = 'public' OR author_id = auth.uid())
        AND is_deleted = FALSE
    )
);

-- Users can comment on accessible posts
CREATE POLICY "Users can create comments"
ON social_comments FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update their comments"
ON social_comments FOR UPDATE
USING (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their comments"
ON social_comments FOR DELETE
USING (auth.uid() = author_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 ENGAGEMENT TRIGGER FUNCTIONS
-- Auto-update denormalized counts
-- ═══════════════════════════════════════════════════════════════════════════

-- Update like count on interaction change
CREATE OR REPLACE FUNCTION fn_update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts 
        SET like_count = like_count + 1,
            updated_at = NOW()
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE social_posts 
        SET like_count = GREATEST(0, like_count - 1),
            updated_at = NOW()
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trig_update_post_like_count
AFTER INSERT OR DELETE ON social_interactions
FOR EACH ROW
EXECUTE FUNCTION fn_update_post_like_count();

-- Update comment count
CREATE OR REPLACE FUNCTION fn_update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts 
        SET comment_count = comment_count + 1,
            updated_at = NOW()
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
        UPDATE social_posts 
        SET comment_count = GREATEST(0, comment_count - 1),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.post_id, OLD.post_id);
        RETURN COALESCE(NEW, OLD);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trig_update_post_comment_count
AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON social_comments
FOR EACH ROW
EXECUTE FUNCTION fn_update_post_comment_count();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📦 SOCIAL FEED FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get feed for user (personalized)
CREATE OR REPLACE FUNCTION fn_get_social_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_filter TEXT DEFAULT 'recent' -- 'recent', 'trending', 'following'
)
RETURNS TABLE (
    post_id UUID,
    author_id UUID,
    author_username TEXT,
    author_avatar TEXT,
    author_level INT,
    content TEXT,
    content_type TEXT,
    media_urls JSONB,
    like_count INT,
    comment_count INT,
    share_count INT,
    is_liked BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.author_id,
        COALESCE(u.username, 'Anonymous') as author_username,
        u.avatar_url as author_avatar,
        COALESCE(u.current_level, 1) as author_level,
        p.content,
        p.content_type,
        p.media_urls,
        p.like_count,
        p.comment_count,
        p.share_count,
        EXISTS(
            SELECT 1 FROM social_interactions i 
            WHERE i.post_id = p.id AND i.user_id = p_user_id
        ) as is_liked,
        p.created_at
    FROM social_posts p
    LEFT JOIN user_dna_profiles u ON u.user_id = p.author_id
    WHERE 
        p.is_deleted = FALSE
        AND (
            p.visibility = 'public'
            OR p.author_id = p_user_id
            OR (
                p.visibility = 'followers'
                AND EXISTS (
                    SELECT 1 FROM social_connections c
                    WHERE c.follower_id = p_user_id
                    AND c.following_id = p.author_id
                    AND c.status = 'active'
                )
            )
        )
        AND (
            p_filter != 'following'
            OR EXISTS (
                SELECT 1 FROM social_connections c
                WHERE c.follower_id = p_user_id
                AND c.following_id = p.author_id
                AND c.status = 'active'
            )
            OR p.author_id = p_user_id
        )
    ORDER BY 
        CASE p_filter
            WHEN 'trending' THEN p.like_count
            ELSE 0
        END DESC,
        p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ SOCIAL ORB SCHEMA COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🌐 ORB 01: SOCIAL DATA ARCHITECTURE — DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Table: social_posts                   ✅ CREATED';
    RAISE NOTICE '   Table: social_interactions            ✅ CREATED';
    RAISE NOTICE '   Table: social_connections             ✅ CREATED';
    RAISE NOTICE '   Table: social_comments                ✅ CREATED';
    RAISE NOTICE '   RLS Policies                          🔐 ENABLED';
    RAISE NOTICE '   Real-Time Replication                 ⚡ ACTIVE';
    RAISE NOTICE '   Engagement Triggers                   🎯 ARMED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
