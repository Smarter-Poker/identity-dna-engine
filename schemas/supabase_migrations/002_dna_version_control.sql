-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 IDENTITY_DNA_ENGINE — DNA Version Control Migration
-- 002_dna_version_control.sql
-- 
-- High-speed version stamps for cached DNA synchronization.
-- Enables atomic version checks before full profile fetches.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚡ DNA VERSION CONTROL TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dna_version_control (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_version BIGINT DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    update_source TEXT DEFAULT 'SYSTEM' NOT NULL,
    change_hash TEXT -- Optional: Hash of last change for integrity checks
);

-- Index for fast version lookups
CREATE INDEX IF NOT EXISTS idx_dna_version_user ON dna_version_control(user_id);
CREATE INDEX IF NOT EXISTS idx_dna_version_updated ON dna_version_control(updated_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔄 AUTO-INCREMENT VERSION ON PROFILE CHANGES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_dna_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment version on any profile update
    INSERT INTO dna_version_control (user_id, current_version, updated_at, update_source)
    VALUES (NEW.id, 1, NOW(), TG_TABLE_NAME)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        current_version = dna_version_control.current_version + 1,
        updated_at = NOW(),
        update_source = TG_TABLE_NAME;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on profiles table
DROP TRIGGER IF EXISTS trigger_increment_dna_version_profiles ON profiles;
CREATE TRIGGER trigger_increment_dna_version_profiles
    AFTER UPDATE ON profiles
    FOR EACH ROW
    WHEN (
        OLD.skill_tier IS DISTINCT FROM NEW.skill_tier OR
        OLD.trust_score IS DISTINCT FROM NEW.trust_score OR
        OLD.xp_total IS DISTINCT FROM NEW.xp_total OR
        OLD.badges IS DISTINCT FROM NEW.badges
    )
    EXECUTE FUNCTION increment_dna_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 VERSION BUMP ON XP CHANGES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_dna_version_on_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment version when XP is awarded
    INSERT INTO dna_version_control (user_id, current_version, updated_at, update_source)
    VALUES (NEW.user_id, 1, NOW(), 'xp_ledger')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        current_version = dna_version_control.current_version + 1,
        updated_at = NOW(),
        update_source = 'xp_ledger';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on xp_ledger table
DROP TRIGGER IF EXISTS trigger_increment_dna_version_xp ON xp_ledger;
CREATE TRIGGER trigger_increment_dna_version_xp
    AFTER INSERT ON xp_ledger
    FOR EACH ROW
    EXECUTE FUNCTION increment_dna_version_on_xp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🏆 VERSION BUMP ON BADGE CHANGES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_dna_version_on_badge()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment version when badge is earned
    INSERT INTO dna_version_control (user_id, current_version, updated_at, update_source)
    VALUES (NEW.user_id, 1, NOW(), 'user_badges')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        current_version = dna_version_control.current_version + 1,
        updated_at = NOW(),
        update_source = 'user_badges';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user_badges table
DROP TRIGGER IF EXISTS trigger_increment_dna_version_badges ON user_badges;
CREATE TRIGGER trigger_increment_dna_version_badges
    AFTER INSERT ON user_badges
    FOR EACH ROW
    EXECUTE FUNCTION increment_dna_version_on_badge();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE dna_version_control ENABLE ROW LEVEL SECURITY;

-- Users can read their own version info
CREATE POLICY "Users can read own version" ON dna_version_control
    FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 HELPER FUNCTION: Get Current Version
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_dna_version(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_version BIGINT;
BEGIN
    SELECT current_version INTO v_version
    FROM dna_version_control
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_version, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚡ FAST VERSION CHECK FUNCTION (for atomic client sync)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_dna_version_and_fetch(
    p_user_id UUID,
    p_client_version BIGINT
)
RETURNS TABLE (
    needs_sync BOOLEAN,
    server_version BIGINT,
    profile_data JSONB
) AS $$
DECLARE
    v_server_version BIGINT;
BEGIN
    -- Get current server version
    SELECT current_version INTO v_server_version
    FROM dna_version_control
    WHERE user_id = p_user_id;
    
    -- Default to 0 if no version control entry
    v_server_version := COALESCE(v_server_version, 0);
    
    -- Check if sync is needed
    IF v_server_version > p_client_version THEN
        -- Return with profile data
        RETURN QUERY
        SELECT 
            TRUE as needs_sync,
            v_server_version as server_version,
            to_jsonb(p.*) as profile_data
        FROM profiles p
        WHERE p.id = p_user_id;
    ELSE
        -- No sync needed, return without profile data
        RETURN QUERY
        SELECT 
            FALSE as needs_sync,
            v_server_version as server_version,
            NULL::JSONB as profile_data;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
