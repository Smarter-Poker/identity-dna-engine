-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 IDENTITY_DNA_ENGINE — XP Permanence Logic Migration
-- 003_xp_vault_permanence.sql
-- 
-- @project IDENTITY_DNA_ENGINE
-- @task XP_PERMANENCE_LOGIC
-- 
-- Constraint: XP can only be added, never subtracted.
-- Enforces LAW 2: Immutable History
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 🏦 XP VAULT TABLE
-- The permanent, immutable record of XP totals.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS xp_vault (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    xp_total BIGINT DEFAULT 0 NOT NULL CHECK (xp_total >= 0),
    xp_lifetime BIGINT DEFAULT 0 NOT NULL CHECK (xp_lifetime >= 0),
    last_deposit_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_deposit_amount BIGINT DEFAULT 0 NOT NULL,
    last_deposit_source TEXT,
    deposit_count BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraint: XP can never be negative
    CONSTRAINT xp_must_be_positive CHECK (xp_total >= 0 AND xp_lifetime >= 0)
);

-- Index for fast vault lookups
CREATE INDEX IF NOT EXISTS idx_xp_vault_user ON xp_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_vault_total ON xp_vault(xp_total DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 XP PERMANENCE TRIGGER: check_xp_gain
-- BLOCKS any transaction attempting to DECREASE xp_total.
-- This is the core enforcement of LAW 2.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_xp_gain()
RETURNS TRIGGER AS $$
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 🛡️ XP PERMANENCE CHECK
    -- XP can only be ADDED, never SUBTRACTED.
    -- ═══════════════════════════════════════════════════════════════════
    
    -- Block any attempt to decrease xp_total
    IF NEW.xp_total < OLD.xp_total THEN
        RAISE EXCEPTION 
            '🚫 LAW 2 VIOLATION: XP Permanence Breach Detected! '
            'Cannot decrease XP from % to %. '
            'XP is immutable and can only increase. '
            'User: %, Attempted Loss: % XP',
            OLD.xp_total, 
            NEW.xp_total, 
            OLD.user_id,
            OLD.xp_total - NEW.xp_total;
    END IF;
    
    -- Block any attempt to decrease xp_lifetime
    IF NEW.xp_lifetime < OLD.xp_lifetime THEN
        RAISE EXCEPTION 
            '🚫 LAW 2 VIOLATION: Lifetime XP Tampering Detected! '
            'Cannot decrease lifetime XP from % to %. '
            'User: %',
            OLD.xp_lifetime, 
            NEW.xp_lifetime, 
            OLD.user_id;
    END IF;
    
    -- Update deposit metadata if XP increased
    IF NEW.xp_total > OLD.xp_total THEN
        NEW.last_deposit_at := NOW();
        NEW.last_deposit_amount := NEW.xp_total - OLD.xp_total;
        NEW.deposit_count := OLD.deposit_count + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to xp_vault table
DROP TRIGGER IF EXISTS trigger_check_xp_gain ON xp_vault;
CREATE TRIGGER trigger_check_xp_gain
    BEFORE UPDATE ON xp_vault
    FOR EACH ROW
    EXECUTE FUNCTION check_xp_gain();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ PROFILES TABLE XP PROTECTION
-- Also enforce XP permanence on the main profiles table.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_profile_xp_gain()
RETURNS TRIGGER AS $$
BEGIN
    -- Block any attempt to decrease xp_total on profiles
    IF NEW.xp_total < OLD.xp_total THEN
        RAISE EXCEPTION 
            '🚫 LAW 2 VIOLATION: Profile XP Decrease Blocked! '
            'Cannot decrease XP from % to % for user %. '
            'XP is permanent and immutable.',
            OLD.xp_total, 
            NEW.xp_total, 
            OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS trigger_check_profile_xp_gain ON profiles;
CREATE TRIGGER trigger_check_profile_xp_gain
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total)
    EXECUTE FUNCTION check_profile_xp_gain();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📥 XP DEPOSIT FUNCTION (Safe way to add XP)
-- This is the ONLY approved method to increase XP.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION deposit_xp(
    p_user_id UUID,
    p_amount BIGINT,
    p_source TEXT DEFAULT 'UNKNOWN'
)
RETURNS TABLE (
    success BOOLEAN,
    new_total BIGINT,
    deposit_amount BIGINT,
    message TEXT
) AS $$
DECLARE
    v_old_total BIGINT;
    v_new_total BIGINT;
BEGIN
    -- Validate amount (must be positive)
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT 
            FALSE as success,
            NULL::BIGINT as new_total,
            p_amount as deposit_amount,
            'LAW 2: XP deposit must be positive'::TEXT as message;
        RETURN;
    END IF;
    
    -- Insert or update vault
    INSERT INTO xp_vault (user_id, xp_total, xp_lifetime, last_deposit_source)
    VALUES (p_user_id, p_amount, p_amount, p_source)
    ON CONFLICT (user_id) DO UPDATE SET
        xp_total = xp_vault.xp_total + p_amount,
        xp_lifetime = xp_vault.xp_lifetime + p_amount,
        last_deposit_source = p_source
    RETURNING xp_total INTO v_new_total;
    
    -- Sync to profiles table
    UPDATE profiles 
    SET xp_total = v_new_total, last_sync = NOW()
    WHERE id = p_user_id;
    
    -- Log to XP ledger (immutable append-only)
    INSERT INTO xp_ledger (user_id, source, base_amount, multiplier, amount, created_at)
    VALUES (p_user_id, p_source, p_amount, 1.0, p_amount, NOW());
    
    -- Increment DNA version
    INSERT INTO dna_version_control (user_id, current_version, updated_at, update_source)
    VALUES (p_user_id, 1, NOW(), 'xp_deposit')
    ON CONFLICT (user_id) DO UPDATE SET
        current_version = dna_version_control.current_version + 1,
        updated_at = NOW(),
        update_source = 'xp_deposit';
    
    RETURN QUERY SELECT 
        TRUE as success,
        v_new_total as new_total,
        p_amount as deposit_amount,
        format('Successfully deposited %s XP from %s', p_amount, p_source)::TEXT as message;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 XP AUDIT LOG TABLE
-- Immutable record of all XP transactions for forensic analysis.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS xp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('DEPOSIT', 'BLOCKED_WITHDRAWAL', 'CORRECTION')),
    amount BIGINT NOT NULL,
    old_total BIGINT,
    new_total BIGINT,
    source TEXT,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    session_id TEXT,
    ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_xp_audit_user ON xp_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_audit_created ON xp_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_audit_action ON xp_audit_log(action);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ AUDIT LOGGING TRIGGER
-- Logs all XP changes for security and compliance.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_xp_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO xp_audit_log (
        user_id,
        action,
        amount,
        old_total,
        new_total,
        source,
        created_at
    ) VALUES (
        NEW.user_id,
        'DEPOSIT',
        NEW.xp_total - COALESCE(OLD.xp_total, 0),
        COALESCE(OLD.xp_total, 0),
        NEW.xp_total,
        NEW.last_deposit_source,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to xp_vault
DROP TRIGGER IF EXISTS trigger_log_xp_audit ON xp_vault;
CREATE TRIGGER trigger_log_xp_audit
    AFTER INSERT OR UPDATE ON xp_vault
    FOR EACH ROW
    WHEN (NEW.xp_total > COALESCE(OLD.xp_total, 0))
    EXECUTE FUNCTION log_xp_audit();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE xp_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own vault
CREATE POLICY "Users can view own vault" ON xp_vault
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own audit log
CREATE POLICY "Users can view own audit" ON xp_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 XP LEADERBOARD VIEW
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT 
    p.id as user_id,
    p.username,
    COALESCE(v.xp_total, p.xp_total) as xp_total,
    COALESCE(v.xp_lifetime, p.xp_total) as xp_lifetime,
    p.skill_tier,
    v.deposit_count,
    RANK() OVER (ORDER BY COALESCE(v.xp_total, p.xp_total) DESC) as global_rank
FROM profiles p
LEFT JOIN xp_vault v ON p.id = v.user_id
ORDER BY xp_total DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ VERIFICATION QUERIES (Run to test the trigger)
-- ═══════════════════════════════════════════════════════════════════════════

-- Test 1: This should SUCCEED (adding XP)
-- SELECT * FROM deposit_xp('some-uuid', 100, 'TEST');

-- Test 2: This should FAIL (direct decrease attempt)
-- UPDATE xp_vault SET xp_total = xp_total - 10 WHERE user_id = 'some-uuid';
-- Expected: "LAW 2 VIOLATION: XP Permanence Breach Detected!"

-- Test 3: Verify audit log
-- SELECT * FROM xp_audit_log ORDER BY created_at DESC LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- XP PERMANENCE ENFORCED VIA check_xp_gain TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════
