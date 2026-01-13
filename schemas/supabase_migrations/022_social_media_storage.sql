-- ═══════════════════════════════════════════════════════════════════════════
-- 📁 SOCIAL MEDIA STORAGE BUCKETS
-- schemas/supabase_migrations/022_social_media_storage.sql
-- 
-- Creates Supabase storage buckets for images, videos, and user avatars
-- with proper RLS policies for secure access control
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📸 STORAGE BUCKETS CONFIGURATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Note: Storage buckets and policies are created via the Supabase Dashboard
-- or using the Supabase CLI. This SQL file documents the required configuration.

-- The following buckets need to be created:
--
-- 1. social-images (PUBLIC - for post images)
--    - File types: image/jpeg, image/png, image/gif, image/webp
--    - Max size: 10MB
--
-- 2. social-videos (PUBLIC - for post videos)
--    - File types: video/mp4, video/webm, video/quicktime
--    - Max size: 100MB
--
-- 3. user-avatars (PUBLIC - for profile pictures)
--    - File types: image/jpeg, image/png, image/webp
--    - Max size: 5MB
--
-- 4. user-covers (PUBLIC - for profile cover images)
--    - File types: image/jpeg, image/png, image/webp
--    - Max size: 10MB

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 MEDIA METADATA TABLE
-- Track uploaded media with rich metadata
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File info
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    
    -- Media type
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'avatar', 'cover')),
    
    -- Dimensions (for images/videos)
    width INT,
    height INT,
    duration_seconds DECIMAL(10,2), -- For videos
    
    -- Thumbnails
    thumbnail_url TEXT,
    
    -- Processing status
    processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN (
        'uploading', 'uploaded', 'processing', 'ready', 'failed'
    )),
    
    -- Content moderation
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN (
        'pending', 'approved', 'rejected', 'flagged'
    )),
    
    -- Association (optional - can be linked to a post)
    post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_media_user ON social_media(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_post ON social_media(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_media_type ON social_media(media_type);
CREATE INDEX IF NOT EXISTS idx_social_media_status ON social_media(processing_status);

-- Enable RLS
ALTER TABLE social_media ENABLE ROW LEVEL SECURITY;

-- Users can view media on public posts or their own media
CREATE POLICY "Users can view public media or their own"
ON social_media FOR SELECT
USING (
    user_id = auth.uid()
    OR (
        post_id IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM social_posts p 
            WHERE p.id = social_media.post_id 
            AND (p.visibility = 'public' OR p.author_id = auth.uid())
            AND p.is_deleted = FALSE
        )
    )
    OR media_type IN ('avatar', 'cover') -- Avatars and covers are always public
);

-- Users can upload their own media
CREATE POLICY "Users can upload their own media"
ON social_media FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own media
CREATE POLICY "Users can update their own media"
ON social_media FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own media
CREATE POLICY "Users can delete their own media"
ON social_media FOR DELETE
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 HELPER FUNCTIONS FOR MEDIA
-- ═══════════════════════════════════════════════════════════════════════════

-- Generate public URL for a media file
CREATE OR REPLACE FUNCTION fn_get_media_public_url(
    p_bucket_name TEXT,
    p_file_path TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_supabase_url TEXT;
BEGIN
    -- Get the Supabase URL from environment (this is a placeholder)
    -- In production, this should be configured or use a constant
    v_supabase_url := current_setting('app.settings.supabase_url', TRUE);
    
    IF v_supabase_url IS NULL THEN
        -- Fallback to known production URL pattern
        RETURN '/storage/v1/object/public/' || p_bucket_name || '/' || p_file_path;
    END IF;
    
    RETURN v_supabase_url || '/storage/v1/object/public/' || p_bucket_name || '/' || p_file_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create media record and return upload metadata
CREATE OR REPLACE FUNCTION fn_create_media_upload(
    p_user_id UUID,
    p_file_name TEXT,
    p_mime_type TEXT,
    p_file_size BIGINT,
    p_media_type TEXT DEFAULT 'image'
)
RETURNS TABLE (
    media_id UUID,
    bucket_name TEXT,
    file_path TEXT,
    upload_url TEXT
) AS $$
DECLARE
    v_media_id UUID;
    v_bucket_name TEXT;
    v_file_path TEXT;
    v_extension TEXT;
BEGIN
    -- Determine bucket based on media type
    v_bucket_name := CASE p_media_type
        WHEN 'image' THEN 'social-images'
        WHEN 'video' THEN 'social-videos'
        WHEN 'avatar' THEN 'user-avatars'
        WHEN 'cover' THEN 'user-covers'
        ELSE 'social-images'
    END;
    
    -- Extract extension
    v_extension := COALESCE(
        LOWER(SUBSTRING(p_file_name FROM '\.([^\.]+)$')),
        'jpg'
    );
    
    -- Generate unique file path: user_id/timestamp_random.ext
    v_file_path := p_user_id::TEXT || '/' || 
                   EXTRACT(EPOCH FROM NOW())::BIGINT || '_' ||
                   SUBSTR(uuid_generate_v4()::TEXT, 1, 8) || '.' || v_extension;
    
    -- Create media record
    INSERT INTO social_media (
        user_id, file_path, file_name, file_size, 
        mime_type, bucket_name, media_type, processing_status
    )
    VALUES (
        p_user_id, v_file_path, p_file_name, p_file_size,
        p_mime_type, v_bucket_name, p_media_type, 'uploading'
    )
    RETURNING id INTO v_media_id;
    
    -- Return upload metadata
    RETURN QUERY SELECT 
        v_media_id as media_id,
        v_bucket_name as bucket_name,
        v_file_path as file_path,
        fn_get_media_public_url(v_bucket_name, v_file_path) as upload_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark media upload as complete
CREATE OR REPLACE FUNCTION fn_complete_media_upload(
    p_media_id UUID,
    p_width INT DEFAULT NULL,
    p_height INT DEFAULT NULL,
    p_duration_seconds DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE social_media
    SET 
        processing_status = 'ready',
        width = COALESCE(p_width, width),
        height = COALESCE(p_height, height),
        duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
        updated_at = NOW()
    WHERE id = p_media_id
    AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get media URLs for a post
CREATE OR REPLACE FUNCTION fn_get_post_media(p_post_id UUID)
RETURNS TABLE (
    media_id UUID,
    media_type TEXT,
    public_url TEXT,
    thumbnail_url TEXT,
    width INT,
    height INT,
    duration_seconds DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.media_type,
        fn_get_media_public_url(m.bucket_name, m.file_path),
        m.thumbnail_url,
        m.width,
        m.height,
        m.duration_seconds
    FROM social_media m
    WHERE m.post_id = p_post_id
    AND m.processing_status = 'ready'
    AND m.moderation_status IN ('pending', 'approved')
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 STORAGE QUOTA TRACKING
-- ═══════════════════════════════════════════════════════════════════════════

-- Add storage tracking to user profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_dna_profiles' AND column_name = 'storage_used_bytes'
    ) THEN
        ALTER TABLE user_dna_profiles 
        ADD COLUMN storage_used_bytes BIGINT DEFAULT 0,
        ADD COLUMN storage_limit_bytes BIGINT DEFAULT 1073741824; -- 1GB default
    END IF;
END $$;

-- Update storage usage on media changes
CREATE OR REPLACE FUNCTION fn_update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_dna_profiles
        SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + NEW.file_size
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_dna_profiles
        SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) - OLD.file_size)
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_update_storage_usage ON social_media;
CREATE TRIGGER trig_update_storage_usage
AFTER INSERT OR DELETE ON social_media
FOR EACH ROW
EXECUTE FUNCTION fn_update_storage_usage();

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════

-- IMPORTANT: After running this migration, you must also create the storage
-- buckets in Supabase Dashboard or via supabase CLI:
--
-- supabase storage buckets create social-images --public --file-size-limit 10MB
-- supabase storage buckets create social-videos --public --file-size-limit 100MB
-- supabase storage buckets create user-avatars --public --file-size-limit 5MB
-- supabase storage buckets create user-covers --public --file-size-limit 10MB

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   📁 SOCIAL MEDIA STORAGE — DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Table: social_media                   ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_media_public_url     ✅ CREATED';
    RAISE NOTICE '   Function: fn_create_media_upload      ✅ CREATED';
    RAISE NOTICE '   Function: fn_complete_media_upload    ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_post_media           ✅ CREATED';
    RAISE NOTICE '   Trigger: trig_update_storage_usage    ⚡ ARMED';
    RAISE NOTICE '   RLS Policies                          🔐 ENABLED';
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  MANUAL STEP REQUIRED:';
    RAISE NOTICE '   Create storage buckets in Supabase Dashboard:';
    RAISE NOTICE '   - social-images (10MB limit)';
    RAISE NOTICE '   - social-videos (100MB limit)';
    RAISE NOTICE '   - user-avatars (5MB limit)';
    RAISE NOTICE '   - user-covers (10MB limit)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
