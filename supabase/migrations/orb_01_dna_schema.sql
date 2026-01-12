-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 ORB 01: SOCIAL DNA SCHEMA
-- supabase/migrations/orb_01_dna_schema.sql
-- 
-- Creates 'user_dna_profiles' with the Hard Law "No XP Loss" trigger
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- 🧬 USER DNA PROFILES TABLE
-- The core identity table for all player DNA metrics
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_dna_profiles (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    username TEXT,
    avatar_url TEXT,
    
    -- XP System (IMMUTABLE - Can ONLY increase)
    xp_total BIGINT NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
    xp_lifetime BIGINT NOT NULL DEFAULT 0 CHECK (xp_lifetime >= 0),
    current_level INT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    
    -- Tier System
    tier_id TEXT DEFAULT 'BRONZE' CHECK (tier_id IN ('BRONZE', 'SILVER', 'GOLD', 'GTO_MASTER')),
    skill_tier INT DEFAULT 1 CHECK (skill_tier BETWEEN 1 AND 10),
    
    -- DNA Radar Metrics (0.0 - 1.0 normalized)
    accuracy FLOAT DEFAULT 0.5 CHECK (accuracy BETWEEN 0 AND 1),
    grit FLOAT DEFAULT 0.5 CHECK (grit BETWEEN 0 AND 1),
    aggression FLOAT DEFAULT 0.5 CHECK (aggression BETWEEN 0 AND 1),
    composure FLOAT DEFAULT 0.5 CHECK (composure BETWEEN 0 AND 1),
    wealth FLOAT DEFAULT 0.5 CHECK (wealth BETWEEN 0 AND 1),
    
    -- Extended DNA (6-point radar)
    bankroll_stability FLOAT DEFAULT 0.5 CHECK (bankroll_stability BETWEEN 0 AND 1),
    social_reputation FLOAT DEFAULT 0.5 CHECK (social_reputation BETWEEN 0 AND 1),
    
    -- Streak System
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    streak_multiplier FLOAT DEFAULT 1.0,
    flame_state TEXT DEFAULT 'NONE' CHECK (flame_state IN ('NONE', 'BLUE_STARTER', 'ORANGE_ROARING', 'PURPLE_INFERNO')),
    flame_color TEXT DEFAULT NULL,
    flame_intensity FLOAT DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    
    -- Trust & Verification
    trust_score INT DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
    verification_level INT DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 5),
    is_verified BOOLEAN DEFAULT FALSE,
    is_pro_verified BOOLEAN DEFAULT FALSE,
    
    -- Badges
    badges JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dna_user_id ON user_dna_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dna_tier ON user_dna_profiles(tier_id);
CREATE INDEX IF NOT EXISTS idx_dna_level ON user_dna_profiles(current_level);
CREATE INDEX IF NOT EXISTS idx_dna_xp ON user_dna_profiles(xp_total DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ HARD LAW: NO XP LOSS TRIGGER
-- XP can ONLY increase. Any decrease attempt is blocked and logged.
-- ═══════════════════════════════════════════════════════════════════════════

-- XP Security Log Table
CREATE TABLE IF NOT EXISTS xp_security_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    old_xp BIGINT,
    attempted_xp BIGINT,
    delta BIGINT,
    source TEXT,
    blocked BOOLEAN DEFAULT TRUE,
    severity TEXT DEFAULT 'WARNING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_security_user ON xp_security_log(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_security_time ON xp_security_log(created_at DESC);

-- The Hard Law Trigger Function
CREATE OR REPLACE FUNCTION fn_enforce_xp_permanence()
RETURNS TRIGGER AS $$
DECLARE
    v_source TEXT;
BEGIN
    -- Get caller info
    v_source := COALESCE(
        current_setting('request.jwt.claims', true)::jsonb->>'sub',
        current_setting('app.caller', true),
        'UNKNOWN'
    );
    
    -- ════════════════════════════════════════════════════════════════
    -- 🛡️ HARD LAW: XP CAN NEVER DECREASE
    -- ════════════════════════════════════════════════════════════════
    IF NEW.xp_total < OLD.xp_total THEN
        -- Log the violation
        INSERT INTO xp_security_log (
            user_id, event_type, old_xp, attempted_xp, delta, source, blocked, severity
        ) VALUES (
            OLD.user_id,
            'XP_DECREASE_BLOCKED',
            OLD.xp_total,
            NEW.xp_total,
            NEW.xp_total - OLD.xp_total,
            v_source,
            TRUE,
            CASE 
                WHEN OLD.xp_total - NEW.xp_total > 10000 THEN 'CRITICAL'
                WHEN OLD.xp_total - NEW.xp_total > 1000 THEN 'HIGH'
                ELSE 'WARNING'
            END
        );
        
        -- BLOCK THE DECREASE
        RAISE EXCEPTION 
            '🛡️ HARD LAW VIOLATION: XP Permanence Breach! '
            'Cannot decrease XP from % to %. Delta: %. '
            'XP is immutable and can only increase. '
            'Source: %',
            OLD.xp_total, NEW.xp_total, OLD.xp_total - NEW.xp_total, v_source
        USING ERRCODE = 'raise_exception';
    END IF;
    
    -- Track lifetime XP (always increases)
    IF NEW.xp_total > OLD.xp_total THEN
        NEW.xp_lifetime := OLD.xp_lifetime + (NEW.xp_total - OLD.xp_total);
    END IF;
    
    -- Auto-calculate level
    NEW.current_level := GREATEST(1, FLOOR(POWER(NEW.xp_total / 100.0, 0.5))::INT + 1);
    
    -- Auto-calculate tier
    NEW.tier_id := CASE 
        WHEN NEW.current_level >= 61 THEN 'GTO_MASTER'
        WHEN NEW.current_level >= 31 THEN 'GOLD'
        WHEN NEW.current_level >= 11 THEN 'SILVER'
        ELSE 'BRONZE'
    END;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the Hard Law trigger
DROP TRIGGER IF EXISTS trig_xp_permanence ON user_dna_profiles;
CREATE TRIGGER trig_xp_permanence
    BEFORE UPDATE ON user_dna_profiles
    FOR EACH ROW
    WHEN (NEW.xp_total IS DISTINCT FROM OLD.xp_total)
    EXECUTE FUNCTION fn_enforce_xp_permanence();

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 XP INCREMENT FUNCTION (Safe atomic increment)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_increment_xp(
    p_user_id UUID,
    p_amount BIGINT,
    p_source TEXT DEFAULT 'SYSTEM',
    p_require_mastery BOOLEAN DEFAULT TRUE,
    p_accuracy FLOAT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_new_xp BIGINT;
    v_mastery_gate FLOAT := 0.85;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Amount must be positive');
    END IF;
    
    -- Check 85% mastery gate if required
    IF p_require_mastery AND p_accuracy IS NOT NULL THEN
        IF p_accuracy < v_mastery_gate THEN
            RETURN jsonb_build_object(
                'success', FALSE, 
                'error', 'Below 85% mastery gate',
                'accuracy', p_accuracy,
                'required', v_mastery_gate
            );
        END IF;
    END IF;
    
    -- Get current profile
    SELECT * INTO v_profile FROM user_dna_profiles WHERE user_id = p_user_id;
    
    IF v_profile IS NULL THEN
        -- Create profile if not exists
        INSERT INTO user_dna_profiles (user_id, xp_total)
        VALUES (p_user_id, p_amount);
        
        RETURN jsonb_build_object(
            'success', TRUE,
            'user_id', p_user_id,
            'old_xp', 0,
            'new_xp', p_amount,
            'delta', p_amount,
            'source', p_source,
            'created', TRUE
        );
    END IF;
    
    -- Apply streak multiplier
    v_new_xp := v_profile.xp_total + FLOOR(p_amount * COALESCE(v_profile.streak_multiplier, 1.0));
    
    -- Update XP (trigger will validate)
    UPDATE user_dna_profiles SET
        xp_total = v_new_xp,
        last_sync = NOW()
    WHERE user_id = p_user_id;
    
    -- Log success
    INSERT INTO xp_security_log (
        user_id, event_type, old_xp, attempted_xp, delta, source, blocked, severity
    ) VALUES (
        p_user_id, 'XP_INCREMENT_SUCCESS', v_profile.xp_total, v_new_xp,
        v_new_xp - v_profile.xp_total, p_source, FALSE, 'INFO'
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'old_xp', v_profile.xp_total,
        'new_xp', v_new_xp,
        'delta', v_new_xp - v_profile.xp_total,
        'multiplier', COALESCE(v_profile.streak_multiplier, 1.0),
        'source', p_source
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 GET DNA PROFILE (Safe read)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_get_dna_profile(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile FROM user_dna_profiles WHERE user_id = p_user_id;
    
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'Profile not found', 'user_id', p_user_id);
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', v_profile.user_id,
        'username', v_profile.username,
        'identity', jsonb_build_object(
            'xp_total', v_profile.xp_total,
            'xp_lifetime', v_profile.xp_lifetime,
            'level', v_profile.current_level,
            'tier', v_profile.tier_id,
            'skill_tier', v_profile.skill_tier
        ),
        'radar', jsonb_build_object(
            'accuracy', v_profile.accuracy,
            'grit', v_profile.grit,
            'aggression', v_profile.aggression,
            'composure', v_profile.composure,
            'wealth', v_profile.wealth
        ),
        'streak', jsonb_build_object(
            'current', v_profile.current_streak,
            'longest', v_profile.longest_streak,
            'multiplier', v_profile.streak_multiplier,
            'flame', v_profile.flame_state
        ),
        'trust', jsonb_build_object(
            'score', v_profile.trust_score,
            'verification_level', v_profile.verification_level,
            'is_verified', v_profile.is_verified,
            'is_pro', v_profile.is_pro_verified
        ),
        'badges', v_profile.badges,
        'updated_at', v_profile.updated_at
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ ORB 01 DNA SCHEMA COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🧬 ORB 01: SOCIAL DNA SCHEMA — DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Table: user_dna_profiles              ✅ CREATED';
    RAISE NOTICE '   Trigger: trig_xp_permanence           ✅ ARMED';
    RAISE NOTICE '   Function: fn_increment_xp             ✅ READY';
    RAISE NOTICE '   Function: fn_get_dna_profile          ✅ READY';
    RAISE NOTICE '   Hard Law: XP CAN NEVER DECREASE       🔒 ENFORCED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
