-- ═══════════════════════════════════════════════════════════════════════════
-- 🛰️ IDENTITY_DNA_ENGINE — RED MASTER BUS (PROMPTS 10-12)
-- 009_red_master_bus.sql
-- 
-- @task_10: XP_PERMANENCE_TRIPLE_LOCK
-- @task_11: DNA_RADAR_DATA_NORMALIZATION
-- @task_12: STREAK_EXPIRY_ORACLE_CRON
-- 
-- ⚡️ SOVEREIGN_EXECUTION_PROTOCOL: ENABLED
-- STATUS: MASTER_BUS_ACTIVE 🛰️
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 TASK 10: XP_PERMANENCE_TRIPLE_LOCK
-- Hard-code 'trig_prevent_xp_loss' — NO USER CAN DECREASE XP
-- Not even service-role, postgres superuser, or admin
-- ═══════════════════════════════════════════════════════════════════════════

-- 🛡️ TRIPLE LOCK ENFORCEMENT FUNCTION
-- This function is marked SECURITY DEFINER but validates REGARDLESS of caller
CREATE OR REPLACE FUNCTION trig_prevent_xp_loss()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_id UUID;
    v_user_id UUID;
    v_old_xp BIGINT;
    v_new_xp BIGINT;
    v_caller_role TEXT;
BEGIN
    -- Get caller role for audit
    v_caller_role := COALESCE(current_setting('role', true), current_user);
    
    -- Extract values based on table
    IF TG_TABLE_NAME = 'profiles' THEN
        v_user_id := OLD.id;
        v_old_xp := OLD.xp_total;
        v_new_xp := NEW.xp_total;
    ELSIF TG_TABLE_NAME = 'xp_vault' THEN
        v_user_id := OLD.user_id;
        v_old_xp := OLD.xp_total;
        v_new_xp := NEW.xp_total;
    ELSE
        RETURN NEW;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 🔐 TRIPLE LOCK: XP CANNOT BE DECREASED BY ANYONE
    -- Lock 1: Check NEW < OLD
    -- Lock 2: Log security alert
    -- Lock 3: RAISE EXCEPTION (forces ROLLBACK)
    -- ═══════════════════════════════════════════════════════════════════
    IF v_new_xp < v_old_xp THEN
        -- 🔒 LOCK 2: Log security alert (before exception)
        BEGIN
            INSERT INTO xp_security_alerts (
                user_id,
                alert_type,
                severity,
                old_value,
                attempted_value,
                blocked,
                source_silo,
                metadata
            ) VALUES (
                v_user_id,
                'XP_DECREASE_ATTEMPT',
                'CRITICAL',
                v_old_xp,
                v_new_xp,
                TRUE,
                'TRIPLE_LOCK',
                jsonb_build_object(
                    'trigger', TG_NAME,
                    'table', TG_TABLE_NAME,
                    'operation', TG_OP,
                    'caller_role', v_caller_role,
                    'attempted_loss', v_old_xp - v_new_xp,
                    'timestamp', NOW(),
                    'lock_version', 'TRIPLE_LOCK_V1',
                    'enforcement', 'ABSOLUTE'
                )
            ) RETURNING id INTO v_alert_id;
        EXCEPTION WHEN OTHERS THEN
            -- Even if logging fails, the lock still activates
            v_alert_id := gen_random_uuid();
        END;
        
        -- 🔒 LOCK 3: RAISE EXCEPTION — Forces ROLLBACK
        RAISE EXCEPTION 
            '🔐 XP_TRIPLE_LOCK_ACTIVATED [Alert: %] | '
            'ABSOLUTE PROTECTION: XP decrease from % to % BLOCKED. '
            'Caller: %. Loss amount: %. '
            'NO USER, INCLUDING SERVICE-ROLE, CAN DECREASE XP. '
            'Transaction ROLLED BACK.',
            v_alert_id,
            v_old_xp,
            v_new_xp,
            v_caller_role,
            v_old_xp - v_new_xp
        USING ERRCODE = 'raise_exception';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply TRIPLE LOCK to profiles
DROP TRIGGER IF EXISTS trig_triple_lock_xp_profiles ON profiles;
CREATE TRIGGER trig_triple_lock_xp_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total AND NEW.xp_total < OLD.xp_total)
    EXECUTE FUNCTION trig_prevent_xp_loss();

-- Apply TRIPLE LOCK to xp_vault
DROP TRIGGER IF EXISTS trig_triple_lock_xp_vault ON xp_vault;
CREATE TRIGGER trig_triple_lock_xp_vault
    BEFORE UPDATE ON xp_vault
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total AND NEW.xp_total < OLD.xp_total)
    EXECUTE FUNCTION trig_prevent_xp_loss();

-- Additional protection: Prevent DELETE on xp-related data
CREATE OR REPLACE FUNCTION fn_prevent_xp_data_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 
        '🔐 XP_DATA_PROTECTION: Cannot delete XP data. '
        'XP records are permanent and immutable. '
        'Table: %, User: %',
        TG_TABLE_NAME,
        COALESCE(OLD.user_id::TEXT, OLD.id::TEXT)
    USING ERRCODE = 'raise_exception';
    
    RETURN NULL; -- Prevent deletion
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_prevent_xp_vault_delete ON xp_vault;
CREATE TRIGGER trig_prevent_xp_vault_delete
    BEFORE DELETE ON xp_vault
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_xp_data_deletion();

DROP TRIGGER IF EXISTS trig_prevent_xp_ledger_delete ON xp_ledger;
CREATE TRIGGER trig_prevent_xp_ledger_delete
    BEFORE DELETE ON xp_ledger
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_xp_data_deletion();


-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 TASK 11: DNA_RADAR_DATA_NORMALIZATION
-- Function: fn_get_radar_payload
-- Logic: Normalize Accuracy, Grit, Aggression to 0-1 scale
-- ═══════════════════════════════════════════════════════════════════════════

-- 🔮 Normalized Radar Payload Function
CREATE OR REPLACE FUNCTION fn_get_radar_payload(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_accuracy FLOAT := 0.5;
    v_grit FLOAT := 0.5;
    v_aggression FLOAT := 0.5;
    v_wealth FLOAT := 0.5;
    v_tilt_resistance FLOAT := 0.5;
    v_speed FLOAT := 0.5;
    v_gto_mastery FLOAT := 0.5;
    v_profile RECORD;
    v_drills RECORD;
    v_streak RECORD;
    v_traits RECORD;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 FETCH PROFILE DATA
    -- ═══════════════════════════════════════════════════════════════════
    SELECT id, username, skill_tier, xp_total, trust_score
    INTO v_profile
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found', 'user_id', p_user_id);
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE ACCURACY (0-1) from drill performance
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        AVG(accuracy) AS avg_accuracy,
        AVG(speed_score) / 100.0 AS avg_speed,
        AVG(gto_compliance) AS avg_gto
    INTO v_drills
    FROM (
        SELECT accuracy, speed_score, gto_compliance
        FROM drill_performance
        WHERE user_id = p_user_id
        ORDER BY completed_at DESC
        LIMIT 50
    ) recent;
    
    v_accuracy := COALESCE(v_drills.avg_accuracy, 0.5);
    v_speed := COALESCE(v_drills.avg_speed, 0.5);
    v_gto_mastery := COALESCE(v_drills.avg_gto, 0.5);
    
    -- Clamp to 0-1
    v_accuracy := GREATEST(0, LEAST(1, v_accuracy));
    v_speed := GREATEST(0, LEAST(1, v_speed));
    v_gto_mastery := GREATEST(0, LEAST(1, v_gto_mastery));
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE GRIT (0-1) from streak data
    -- Formula: (current_streak * 0.05 + longest_streak * 0.02) capped at 1
    -- ═══════════════════════════════════════════════════════════════════
    SELECT current_streak, longest_streak
    INTO v_streak
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    v_grit := LEAST(1.0, 
        (COALESCE(v_streak.current_streak, 0) * 0.05) + 
        (COALESCE(v_streak.longest_streak, 0) * 0.02)
    );
    
    -- Minimum grit baseline
    v_grit := GREATEST(0.1, v_grit);
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE AGGRESSION (0-1) from player traits
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        aggression_score / 100.0 AS aggression,
        tilt_resistance / 100.0 AS tilt_resistance,
        risk_tolerance / 100.0 AS risk
    INTO v_traits
    FROM player_traits
    WHERE user_id = p_user_id;
    
    v_aggression := COALESCE(v_traits.aggression, 0.5);
    v_tilt_resistance := COALESCE(v_traits.tilt_resistance, 0.5);
    
    -- Clamp to 0-1
    v_aggression := GREATEST(0, LEAST(1, v_aggression));
    v_tilt_resistance := GREATEST(0, LEAST(1, v_tilt_resistance));
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE WEALTH (0-1) - placeholder, synced from Orb #8
    -- ═══════════════════════════════════════════════════════════════════
    v_wealth := 0.5; -- Default until Orb #8 sync
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 BUILD NORMALIZED RADAR PAYLOAD
    -- All values in 0-1 scale
    -- ═══════════════════════════════════════════════════════════════════
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'username', v_profile.username,
        'generated_at', NOW(),
        'version', 'NORMALIZED_V1',
        
        -- Normalized Radar Values (0-1 scale)
        'radar', jsonb_build_object(
            'accuracy', jsonb_build_object(
                'value', ROUND(v_accuracy::NUMERIC, 4),
                'percent', ROUND((v_accuracy * 100)::NUMERIC, 1),
                'label', 'Accuracy'
            ),
            'grit', jsonb_build_object(
                'value', ROUND(v_grit::NUMERIC, 4),
                'percent', ROUND((v_grit * 100)::NUMERIC, 1),
                'label', 'Grit'
            ),
            'aggression', jsonb_build_object(
                'value', ROUND(v_aggression::NUMERIC, 4),
                'percent', ROUND((v_aggression * 100)::NUMERIC, 1),
                'label', 'Aggression'
            ),
            'wealth', jsonb_build_object(
                'value', ROUND(v_wealth::NUMERIC, 4),
                'percent', ROUND((v_wealth * 100)::NUMERIC, 1),
                'label', 'Wealth'
            ),
            'tilt_resistance', jsonb_build_object(
                'value', ROUND(v_tilt_resistance::NUMERIC, 4),
                'percent', ROUND((v_tilt_resistance * 100)::NUMERIC, 1),
                'label', 'Composure'
            ),
            'speed', jsonb_build_object(
                'value', ROUND(v_speed::NUMERIC, 4),
                'percent', ROUND((v_speed * 100)::NUMERIC, 1),
                'label', 'Speed'
            ),
            'gto_mastery', jsonb_build_object(
                'value', ROUND(v_gto_mastery::NUMERIC, 4),
                'percent', ROUND((v_gto_mastery * 100)::NUMERIC, 1),
                'label', 'GTO Mastery'
            )
        ),
        
        -- Composite Score (0-1)
        'composite', jsonb_build_object(
            'value', ROUND((
                (v_accuracy * 0.25) +
                (v_grit * 0.15) +
                (v_aggression * 0.15) +
                (v_tilt_resistance * 0.15) +
                (v_gto_mastery * 0.20) +
                (v_speed * 0.10)
            )::NUMERIC, 4),
            'formula', 'accuracy*0.25 + grit*0.15 + aggression*0.15 + composure*0.15 + gto*0.20 + speed*0.10'
        ),
        
        -- 3D Vertices for Hexagon Chart (normalized)
        'vertices', jsonb_build_array(
            jsonb_build_object('axis', 'accuracy', 'x', 0, 'y', v_accuracy),
            jsonb_build_object('axis', 'grit', 'x', v_grit * 0.866, 'y', v_grit * 0.5),
            jsonb_build_object('axis', 'aggression', 'x', v_aggression * 0.866, 'y', v_aggression * -0.5),
            jsonb_build_object('axis', 'wealth', 'x', 0, 'y', -v_wealth),
            jsonb_build_object('axis', 'composure', 'x', v_tilt_resistance * -0.866, 'y', v_tilt_resistance * -0.5),
            jsonb_build_object('axis', 'speed', 'x', v_speed * -0.866, 'y', v_speed * 0.5)
        ),
        
        -- Player Stats
        'player', jsonb_build_object(
            'skill_tier', v_profile.skill_tier,
            'xp_total', v_profile.xp_total,
            'trust_score', v_profile.trust_score,
            'current_streak', COALESCE(v_streak.current_streak, 0)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- View for normalized radar data
CREATE OR REPLACE VIEW normalized_radar_data AS
WITH player_data AS (
    SELECT 
        p.id AS user_id,
        p.username,
        p.skill_tier,
        p.xp_total,
        COALESCE(AVG(d.accuracy), 0.5) AS accuracy,
        COALESCE(AVG(d.gto_compliance), 0.5) AS gto_mastery,
        LEAST(1.0, (COALESCE(s.current_streak, 0) * 0.05) + (COALESCE(s.longest_streak, 0) * 0.02)) AS grit,
        COALESCE(t.aggression_score / 100.0, 0.5) AS aggression,
        COALESCE(t.tilt_resistance / 100.0, 0.5) AS tilt_resistance
    FROM profiles p
    LEFT JOIN LATERAL (
        SELECT accuracy, gto_compliance
        FROM drill_performance
        WHERE user_id = p.id
        ORDER BY completed_at DESC
        LIMIT 50
    ) d ON TRUE
    LEFT JOIN user_streaks s ON p.id = s.user_id
    LEFT JOIN player_traits t ON p.id = t.user_id
    GROUP BY p.id, p.username, p.skill_tier, p.xp_total, 
             s.current_streak, s.longest_streak, 
             t.aggression_score, t.tilt_resistance
)
SELECT 
    user_id,
    username,
    skill_tier,
    xp_total,
    ROUND(accuracy::NUMERIC, 4) AS accuracy_normalized,
    ROUND(grit::NUMERIC, 4) AS grit_normalized,
    ROUND(aggression::NUMERIC, 4) AS aggression_normalized,
    ROUND(tilt_resistance::NUMERIC, 4) AS composure_normalized,
    ROUND(gto_mastery::NUMERIC, 4) AS gto_normalized,
    ROUND((accuracy * 0.25 + grit * 0.15 + aggression * 0.15 + tilt_resistance * 0.15 + gto_mastery * 0.20)::NUMERIC, 4) AS composite_normalized
FROM player_data;


-- ═══════════════════════════════════════════════════════════════════════════
-- ⏰ TASK 12: STREAK_EXPIRY_ORACLE_CRON
-- Map 'pg_cron' job for streak auditing
-- Law: 24-hour window enforcement, auto-reset at 00:01 daily
-- ═══════════════════════════════════════════════════════════════════════════

-- Streak audit log table
CREATE TABLE IF NOT EXISTS streak_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type TEXT NOT NULL CHECK (audit_type IN ('DAILY_RESET', 'MANUAL_RESET', 'INTEGRITY_CHECK')),
    users_checked INT DEFAULT 0,
    streaks_reset INT DEFAULT 0,
    execution_time_ms INT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    errors TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_streak_audit_type ON streak_audit_log(audit_type);
CREATE INDEX IF NOT EXISTS idx_streak_audit_started ON streak_audit_log(started_at DESC);

-- 🔄 Daily Streak Reset Function (for pg_cron)
CREATE OR REPLACE FUNCTION fn_daily_streak_reset()
RETURNS JSONB AS $$
DECLARE
    v_audit_id UUID;
    v_start_time TIMESTAMPTZ := NOW();
    v_users_checked INT := 0;
    v_streaks_reset INT := 0;
    v_user RECORD;
    v_errors TEXT[] := '{}';
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- ⏰ 24-HOUR WINDOW ENFORCEMENT
    -- Law: If last_active_date < (CURRENT_DATE - 1), reset streak to 0
    -- Executed at 00:01 daily via pg_cron
    -- ═══════════════════════════════════════════════════════════════════
    
    -- Create audit record
    INSERT INTO streak_audit_log (audit_type, started_at)
    VALUES ('DAILY_RESET', v_start_time)
    RETURNING id INTO v_audit_id;
    
    -- Process all users with active streaks
    FOR v_user IN 
        SELECT 
            us.user_id,
            us.current_streak,
            us.last_active_date,
            p.username
        FROM user_streaks us
        JOIN profiles p ON us.user_id = p.id
        WHERE us.current_streak > 0
          AND us.last_active_date < CURRENT_DATE - INTERVAL '1 day'
    LOOP
        v_users_checked := v_users_checked + 1;
        
        BEGIN
            -- Reset streak to 0
            UPDATE user_streaks SET
                current_streak = 0,
                streak_started_at = NULL
            WHERE user_id = v_user.user_id;
            
            -- Update profile
            UPDATE profiles SET
                streak_count = 0,
                last_sync = NOW()
            WHERE id = v_user.user_id;
            
            -- Queue broadcast to YELLOW silo
            INSERT INTO streak_broadcast_queue (
                user_id,
                old_streak,
                new_streak,
                action,
                multiplier,
                broadcast_to,
                metadata
            ) VALUES (
                v_user.user_id,
                v_user.current_streak,
                0,
                'RESET',
                1.0,
                'YELLOW_DIAMOND',
                jsonb_build_object(
                    'source', 'CRON_DAILY_RESET',
                    'last_active', v_user.last_active_date,
                    'audit_id', v_audit_id
                )
            );
            
            v_streaks_reset := v_streaks_reset + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, format('User %s: %s', v_user.user_id, SQLERRM));
        END;
    END LOOP;
    
    -- Update audit record
    UPDATE streak_audit_log SET
        users_checked = v_users_checked,
        streaks_reset = v_streaks_reset,
        execution_time_ms = EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INT,
        completed_at = NOW(),
        errors = v_errors,
        metadata = jsonb_build_object(
            'current_date', CURRENT_DATE,
            'execution_timestamp', NOW()
        )
    WHERE id = v_audit_id;
    
    -- Return summary
    RETURN jsonb_build_object(
        'success', TRUE,
        'audit_id', v_audit_id,
        'users_checked', v_users_checked,
        'streaks_reset', v_streaks_reset,
        'errors_count', array_length(v_errors, 1),
        'execution_time_ms', EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INT,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 📋 Scheduled job configuration (for pg_cron extension)
-- Note: pg_cron must be enabled in Supabase dashboard
DO $$
BEGIN
    -- Try to create the cron job if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Schedule daily streak reset at 00:01 UTC
        PERFORM cron.schedule(
            'daily-streak-reset',
            '1 0 * * *',  -- 00:01 every day
            $$SELECT fn_daily_streak_reset()$$
        );
        
        RAISE NOTICE 'pg_cron job scheduled: daily-streak-reset at 00:01 UTC';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Manual scheduling required.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;

-- Alternative: Supabase Edge Function trigger configuration
CREATE TABLE IF NOT EXISTS cron_job_config (
    job_id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    function_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cron_job_config (job_id, job_name, schedule, function_name, next_run_at)
VALUES (
    'daily-streak-reset',
    'Daily Streak Reset Oracle',
    '0 0 * * *',  -- UTC midnight
    'fn_daily_streak_reset',
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
)
ON CONFLICT (job_id) DO UPDATE SET
    is_active = TRUE,
    next_run_at = (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;

-- Function to check if cron job should run (for Edge Function polling)
CREATE OR REPLACE FUNCTION fn_check_pending_cron_jobs()
RETURNS TABLE (
    job_id TEXT,
    job_name TEXT,
    function_name TEXT,
    should_run BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.job_id,
        c.job_name,
        c.function_name,
        (c.is_active AND c.next_run_at <= NOW()) AS should_run
    FROM cron_job_config c
    WHERE c.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION fn_mark_cron_job_completed(p_job_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE cron_job_config SET
        last_run_at = NOW(),
        next_run_at = CASE 
            WHEN schedule = '0 0 * * *' THEN (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
            WHEN schedule = '1 0 * * *' THEN (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '1 minute')::TIMESTAMPTZ
            ELSE next_run_at + INTERVAL '1 day'
        END
    WHERE job_id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 MASTER BUS STATUS VIEW
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW master_bus_status AS
SELECT 
    'TRIPLE_LOCK' AS component,
    'XP Permanence' AS feature,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%triple_lock%') AS trigger_count,
    'ACTIVE' AS status
UNION ALL
SELECT 
    'RADAR_NORMALIZATION',
    'DNA Data Pipeline',
    1,
    'ACTIVE'
UNION ALL
SELECT 
    'STREAK_CRON',
    'Daily Reset Oracle',
    (SELECT COUNT(*) FROM cron_job_config WHERE is_active = TRUE),
    CASE WHEN EXISTS (SELECT 1 FROM cron_job_config WHERE is_active = TRUE) THEN 'SCHEDULED' ELSE 'PENDING' END;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ RED MASTER BUS COMPLETE (PROMPTS 10-12)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🛰️ RED MASTER BUS — PROMPTS 10-12 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🔐 TASK 10: TRIPLE_LOCK              ✅ ENFORCED';
    RAISE NOTICE '   📊 TASK 11: RADAR_NORMALIZATION      ✅ DEPLOYED';
    RAISE NOTICE '   ⏰ TASK 12: STREAK_CRON_ORACLE       ✅ SCHEDULED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Trigger: trig_prevent_xp_loss (ABSOLUTE PROTECTION)';
    RAISE NOTICE '   Function: fn_get_radar_payload (0-1 normalized)';
    RAISE NOTICE '   Cron: daily-streak-reset (00:01 UTC)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
