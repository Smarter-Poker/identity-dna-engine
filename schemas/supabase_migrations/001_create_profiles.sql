-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 IDENTITY_DNA_ENGINE — Supabase Migrations
-- 001_create_profiles.sql
-- 
-- Creates the unified profiles table (DNA MASTER SCHEMA)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 PROFILES TABLE (Unified Identity)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    xp_total BIGINT DEFAULT 0 NOT NULL,
    trust_score FLOAT DEFAULT 50.0 NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
    skill_tier INT DEFAULT 1 NOT NULL CHECK (skill_tier >= 1 AND skill_tier <= 10),
    badges JSONB DEFAULT '[]'::jsonb NOT NULL,
    last_sync TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📜 PROFILE HISTORY TABLE (LAW 2: Immutable History)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profile_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source_orb TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_profile_history_user_id ON profile_history(user_id);
CREATE INDEX idx_profile_history_changed_at ON profile_history(changed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🗃️ PROFILE ARCHIVE TABLE (LAW 4: GDPR Compliance)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profile_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    profile_data JSONB NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    retention_until TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_profile_archive_user_id ON profile_archive(user_id);
CREATE INDEX idx_profile_archive_retention ON profile_archive(retention_until);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🏆 USER BADGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_code TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT DEFAULT 'COMMON' CHECK (rarity IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC')),
    source_orb TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    progress INT DEFAULT 100 CHECK (progress >= 0 AND progress <= 100),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, badge_code)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_source ON user_badges(source_orb);
CREATE INDEX idx_user_badges_rarity ON user_badges(rarity);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🗑️ BADGE REVOCATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS badge_revocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_data JSONB NOT NULL,
    revoked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revocation_reason TEXT NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚡ XP LEDGER TABLE (Immutable Append-Only)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    base_amount INT NOT NULL CHECK (base_amount >= 0),
    multiplier FLOAT DEFAULT 1.0 NOT NULL,
    amount INT NOT NULL CHECK (amount >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_xp_ledger_user_id ON xp_ledger(user_id);
CREATE INDEX idx_xp_ledger_created_at ON xp_ledger(created_at DESC);
CREATE INDEX idx_xp_ledger_source ON xp_ledger(source);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔥 USER STREAKS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0 NOT NULL,
    longest_streak INT DEFAULT 0 NOT NULL,
    last_active_date DATE NOT NULL,
    streak_started_at DATE NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ⭐ USER REVIEWS TABLE (Trust Score Input)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_user_id UUID NOT NULL REFERENCES profiles(id),
    target_user_id UUID NOT NULL REFERENCES profiles(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(reviewer_user_id, target_user_id)
);

CREATE INDEX idx_user_reviews_target ON user_reviews(target_user_id);
CREATE INDEX idx_user_reviews_rating ON user_reviews(rating);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ USER VERIFICATION TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_verification (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    geo_verified BOOLEAN DEFAULT FALSE,
    profile_complete BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 USER ACTIVITY TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_date ON user_activity(activity_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🚨 USER REPORTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES profiles(id),
    reported_user_id UUID NOT NULL REFERENCES profiles(id),
    report_type TEXT NOT NULL CHECK (report_type IN ('GENERAL', 'DISPUTE', 'NO_SHOW', 'SPAM')),
    description TEXT,
    substantiated BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_type ON user_reports(report_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 BADGE LEADERBOARD FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_badge_leaderboard(limit_count INT DEFAULT 100)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    badge_count BIGINT,
    total_weight BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        COUNT(b.id) as badge_count,
        COALESCE(SUM(
            CASE b.rarity
                WHEN 'COMMON' THEN 1
                WHEN 'UNCOMMON' THEN 2
                WHEN 'RARE' THEN 3
                WHEN 'EPIC' THEN 5
                WHEN 'LEGENDARY' THEN 10
                WHEN 'MYTHIC' THEN 25
                ELSE 1
            END
        ), 0) as total_weight
    FROM profiles p
    LEFT JOIN user_badges b ON p.id = b.user_id
    GROUP BY p.id, p.username
    ORDER BY total_weight DESC, badge_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can read any profile
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- Users can only update their own profile (via service role for DNA Engine)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can view their own history
CREATE POLICY "Users can view own history" ON profile_history
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own badges
CREATE POLICY "Users can view own badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own XP ledger
CREATE POLICY "Users can view own XP" ON xp_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own streak
CREATE POLICY "Users can view own streak" ON user_streaks
    FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
