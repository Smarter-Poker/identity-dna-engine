-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ IDENTITY_DNA_ENGINE — RED ACTIVE LOGIC (PROMPTS 4-6)
-- 007_red_active_logic.sql
-- 
-- @task_04: XP_PROTECTION_ENFORCEMENT_LAW
-- @task_05: HOLOGRAPHIC_DNA_CALCULATOR
-- @task_06: STREAK_INTEGRITY_ORACLE
-- 
-- STATUS: ACTIVE_LOGIC_COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ TASK 04: XP_PROTECTION_ENFORCEMENT_LAW
-- Final Postgres Trigger 'trig_block_xp_loss'
-- Hard Law: RAISE EXCEPTION and ROLLBACK if (NEW.total_xp < OLD.total_xp)
-- XP CAN NEVER BE LOST UNDER ANY CIRCUMSTANCES
-- ═══════════════════════════════════════════════════════════════════════════

-- 🚨 XP Loss Prevention Function (Final Implementation)
CREATE OR REPLACE FUNCTION fn_block_xp_loss()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_id UUID;
    v_user_id UUID;
    v_old_xp BIGINT;
    v_new_xp BIGINT;
BEGIN
    -- Extract user ID based on table
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
    -- 🚨 HARD LAW: XP CAN NEVER BE LOST
    -- If NEW.total_xp < OLD.total_xp → RAISE EXCEPTION + ROLLBACK
    -- ═══════════════════════════════════════════════════════════════════
    IF v_new_xp < v_old_xp THEN
        -- Log security alert
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
            TG_TABLE_NAME || '::' || TG_NAME,
            jsonb_build_object(
                'trigger', 'trig_block_xp_loss',
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'loss_amount', v_old_xp - v_new_xp,
                'timestamp', NOW(),
                'law', 'XP_PERMANENCE'
            )
        ) RETURNING id INTO v_alert_id;
        
        -- 🚨 RAISE EXCEPTION → Causes automatic ROLLBACK
        RAISE EXCEPTION 
            '🚨 XP_PROTECTION_VIOLATION [Alert: %] | '
            'HARD LAW BREACH: NEW.total_xp (%) < OLD.total_xp (%). '
            'Attempted XP loss of % blocked. '
            'XP CAN NEVER BE LOST. Transaction ROLLED BACK.',
            v_alert_id,
            v_new_xp,
            v_old_xp,
            v_old_xp - v_new_xp
        USING ERRCODE = 'raise_exception';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS trig_block_xp_loss_profiles ON profiles;
CREATE TRIGGER trig_block_xp_loss_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total AND NEW.xp_total < OLD.xp_total)
    EXECUTE FUNCTION fn_block_xp_loss();

-- Apply trigger to xp_vault table
DROP TRIGGER IF EXISTS trig_block_xp_loss_vault ON xp_vault;
CREATE TRIGGER trig_block_xp_loss_vault
    BEFORE UPDATE ON xp_vault
    FOR EACH ROW
    WHEN (OLD.xp_total IS DISTINCT FROM NEW.xp_total AND NEW.xp_total < OLD.xp_total)
    EXECUTE FUNCTION fn_block_xp_loss();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔮 TASK 05: HOLOGRAPHIC_DNA_CALCULATOR
-- Function: fn_refresh_dna_snapshot
-- Logic: Weight the last 50 drills to update Aggression, Grit, Accuracy
-- ═══════════════════════════════════════════════════════════════════════════

-- 🔮 DNA Snapshot Refresh Function
CREATE OR REPLACE FUNCTION fn_refresh_dna_snapshot(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    new_aggression FLOAT,
    new_grit FLOAT,
    new_accuracy FLOAT,
    drills_analyzed INT,
    message TEXT
) AS $$
DECLARE
    v_aggression FLOAT := 50.0;
    v_grit FLOAT := 50.0;
    v_accuracy FLOAT := 50.0;
    v_wealth FLOAT := 50.0;
    v_drill_count INT := 0;
    v_weighted_accuracy FLOAT := 0;
    v_weighted_speed FLOAT := 0;
    v_weighted_ev FLOAT := 0;
    v_streak_data RECORD;
    v_weight_sum FLOAT := 0;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE ACCURACY FROM LAST 50 DRILLS (Weighted by recency)
    -- More recent drills have higher weight
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        SUM(accuracy * weight) / NULLIF(SUM(weight), 0),
        SUM(speed_score * weight) / NULLIF(SUM(weight), 0),
        SUM(ev_loss * weight) / NULLIF(SUM(weight), 0),
        SUM(weight),
        COUNT(*)
    INTO v_weighted_accuracy, v_weighted_speed, v_weighted_ev, v_weight_sum, v_drill_count
    FROM (
        SELECT 
            accuracy,
            speed_score,
            COALESCE(ev_loss, 0) AS ev_loss,
            -- Weight: 1.0 to 0.5 based on recency (50 = oldest gets 0.5 weight)
            (1.0 - (ROW_NUMBER() OVER (ORDER BY completed_at DESC) - 1) * 0.01) AS weight
        FROM drill_performance
        WHERE user_id = p_user_id
        ORDER BY completed_at DESC
        LIMIT 50
    ) weighted_drills;
    
    -- Scale accuracy to 0-100
    v_accuracy := COALESCE(v_weighted_accuracy * 100, 50);
    v_accuracy := GREATEST(0, LEAST(100, v_accuracy));
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE GRIT FROM STREAK DATA
    -- Grit = (CurrentStreak * 5) + (LongestStreak * 2) + (ConsistencyBonus)
    -- ═══════════════════════════════════════════════════════════════════
    SELECT 
        current_streak,
        longest_streak,
        CASE 
            WHEN last_active_date >= CURRENT_DATE - INTERVAL '1 day' THEN 10
            WHEN last_active_date >= CURRENT_DATE - INTERVAL '3 days' THEN 5
            ELSE 0
        END AS consistency_bonus
    INTO v_streak_data
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    IF v_streak_data IS NOT NULL THEN
        v_grit := LEAST(100, 
            (COALESCE(v_streak_data.current_streak, 0) * 5) + 
            (COALESCE(v_streak_data.longest_streak, 0) * 2) + 
            v_streak_data.consistency_bonus
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE AGGRESSION FROM BETTING PATTERNS
    -- Aggression = Base 50 + (BetFrequency adjustment) - (Passive penalty)
    -- For now, derive from player_traits or default
    -- ═══════════════════════════════════════════════════════════════════
    SELECT COALESCE(aggression_score, 50)
    INTO v_aggression
    FROM player_traits
    WHERE user_id = p_user_id;
    
    v_aggression := COALESCE(v_aggression, 50);
    
    -- Adjust aggression based on speed (faster decisions = more aggressive)
    IF v_weighted_speed IS NOT NULL AND v_weighted_speed > 0 THEN
        v_aggression := LEAST(100, v_aggression + (v_weighted_speed * 0.2));
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 CALCULATE WEALTH (from bankroll data if available)
    -- ═══════════════════════════════════════════════════════════════════
    -- For now, default to 50 (will be synced from Orb #8)
    v_wealth := 50.0;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 💾 UPSERT DNA ATTRIBUTES
    -- ═══════════════════════════════════════════════════════════════════
    INSERT INTO dna_attributes (
        user_id,
        aggression,
        grit,
        accuracy,
        wealth,
        last_calculated_at,
        calculation_version,
        source_data
    ) VALUES (
        p_user_id,
        v_aggression,
        v_grit,
        v_accuracy,
        v_wealth,
        NOW(),
        1,
        jsonb_build_object(
            'drills_analyzed', v_drill_count,
            'weight_sum', v_weight_sum,
            'weighted_speed', v_weighted_speed,
            'ev_loss_avg', v_weighted_ev,
            'calculation_method', 'WEIGHTED_50_DRILLS'
        )
    )
    ON CONFLICT (user_id) DO UPDATE SET
        aggression = EXCLUDED.aggression,
        grit = EXCLUDED.grit,
        accuracy = EXCLUDED.accuracy,
        wealth = EXCLUDED.wealth,
        last_calculated_at = NOW(),
        calculation_version = dna_attributes.calculation_version + 1,
        source_data = EXCLUDED.source_data,
        updated_at = NOW();
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📊 RECORD PERFORMANCE SNAPSHOT
    -- ═══════════════════════════════════════════════════════════════════
    INSERT INTO performance_history (
        user_id,
        period_type,
        period_start,
        period_end,
        skill_score,
        grit_score,
        aggression_score,
        accuracy_score,
        wealth_score,
        drills_completed
    ) VALUES (
        p_user_id,
        'DAILY',
        CURRENT_DATE,
        CURRENT_DATE,
        v_accuracy,
        v_grit,
        v_aggression,
        v_accuracy,
        v_wealth,
        v_drill_count
    )
    ON CONFLICT (user_id, period_type, period_start) DO UPDATE SET
        skill_score = EXCLUDED.skill_score,
        grit_score = EXCLUDED.grit_score,
        aggression_score = EXCLUDED.aggression_score,
        accuracy_score = EXCLUDED.accuracy_score,
        wealth_score = EXCLUDED.wealth_score,
        drills_completed = EXCLUDED.drills_completed,
        recorded_at = NOW();
    
    RETURN QUERY SELECT 
        TRUE,
        v_aggression,
        v_grit,
        v_accuracy,
        v_drill_count,
        format('DNA refreshed from %s drills using weighted calculation', v_drill_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔥 TASK 06: STREAK_INTEGRITY_ORACLE
-- Function: fn_update_streak_count
-- Logic: If (now() - last_active > 24h) → RESET to 0, Else INCREMENT
-- Broadcast: Push streak_count updates to YELLOW Silo
-- ═══════════════════════════════════════════════════════════════════════════

-- Streak update event log (for YELLOW silo broadcast)
CREATE TABLE IF NOT EXISTS streak_broadcast_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_streak INT NOT NULL,
    new_streak INT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INCREMENT', 'RESET', 'MAINTAIN')),
    multiplier FLOAT DEFAULT 1.0,
    broadcast_to TEXT DEFAULT 'YELLOW_DIAMOND',
    broadcast_status TEXT DEFAULT 'PENDING' CHECK (broadcast_status IN ('PENDING', 'SENT', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    broadcast_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_streak_broadcast_pending ON streak_broadcast_queue(broadcast_status) WHERE broadcast_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_streak_broadcast_user ON streak_broadcast_queue(user_id);

-- 🔥 Streak Update Function
CREATE OR REPLACE FUNCTION fn_update_streak_count(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    new_streak INT,
    action TEXT,
    multiplier FLOAT,
    broadcast_queued BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current RECORD;
    v_new_streak INT;
    v_action TEXT;
    v_multiplier FLOAT := 1.0;
    v_hours_since_active FLOAT;
    v_is_new_day BOOLEAN;
BEGIN
    -- Get current streak data
    SELECT * INTO v_current
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    -- Initialize if no streak record exists
    IF v_current IS NULL THEN
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date, streak_started_at)
        VALUES (p_user_id, 1, 1, CURRENT_DATE, CURRENT_DATE)
        RETURNING * INTO v_current;
        
        v_new_streak := 1;
        v_action := 'INCREMENT';
        v_multiplier := 1.0;
    ELSE
        -- Calculate hours since last activity
        v_hours_since_active := EXTRACT(EPOCH FROM (NOW() - (v_current.last_active_date::TIMESTAMP + INTERVAL '23 hours 59 minutes'))) / 3600;
        v_is_new_day := CURRENT_DATE > v_current.last_active_date;
        
        -- ═══════════════════════════════════════════════════════════════════
        -- 🔥 STREAK LOGIC
        -- If (now() - last_active > 24h) → RESET to 0
        -- Else if new day → INCREMENT
        -- Else → MAINTAIN
        -- ═══════════════════════════════════════════════════════════════════
        IF CURRENT_DATE - v_current.last_active_date > INTERVAL '1 day' THEN
            -- More than 24 hours since last activity → RESET
            v_new_streak := 1;  -- Start fresh at 1 (not 0, since they're active now)
            v_action := 'RESET';
            v_multiplier := 1.0;
            
            -- Update streak record
            UPDATE user_streaks SET
                current_streak = v_new_streak,
                last_active_date = CURRENT_DATE,
                streak_started_at = CURRENT_DATE
            WHERE user_id = p_user_id;
            
        ELSIF v_is_new_day THEN
            -- New day within 24h window → INCREMENT
            v_new_streak := v_current.current_streak + 1;
            v_action := 'INCREMENT';
            
            -- Calculate multiplier based on streak
            v_multiplier := CASE
                WHEN v_new_streak >= 7 THEN 2.0    -- 7+ days = 2x
                WHEN v_new_streak >= 3 THEN 1.5    -- 3-6 days = 1.5x
                ELSE 1.0                            -- 1-2 days = 1x
            END;
            
            -- Update streak record
            UPDATE user_streaks SET
                current_streak = v_new_streak,
                longest_streak = GREATEST(longest_streak, v_new_streak),
                last_active_date = CURRENT_DATE
            WHERE user_id = p_user_id;
            
        ELSE
            -- Same day → MAINTAIN
            v_new_streak := v_current.current_streak;
            v_action := 'MAINTAIN';
            v_multiplier := CASE
                WHEN v_new_streak >= 7 THEN 2.0
                WHEN v_new_streak >= 3 THEN 1.5
                ELSE 1.0
            END;
        END IF;
        
        -- Update profiles.streak_count
        UPDATE profiles SET
            streak_count = v_new_streak,
            last_sync = NOW()
        WHERE id = p_user_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════
    -- 📡 BROADCAST TO YELLOW SILO
    -- Queue the streak update for broadcast to Diamond Economy Rails
    -- ═══════════════════════════════════════════════════════════════════
    IF v_action IN ('INCREMENT', 'RESET') THEN
        INSERT INTO streak_broadcast_queue (
            user_id,
            old_streak,
            new_streak,
            action,
            multiplier,
            broadcast_to
        ) VALUES (
            p_user_id,
            COALESCE(v_current.current_streak, 0),
            v_new_streak,
            v_action,
            v_multiplier,
            'YELLOW_DIAMOND'
        );
    END IF;
    
    RETURN QUERY SELECT 
        TRUE,
        v_new_streak,
        v_action,
        v_multiplier,
        v_action IN ('INCREMENT', 'RESET'),
        format('Streak %s: %s (multiplier: %sx)', v_action, v_new_streak, v_multiplier)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📡 Function to process broadcast queue
CREATE OR REPLACE FUNCTION fn_process_streak_broadcasts()
RETURNS TABLE (
    processed INT,
    failed INT,
    message TEXT
) AS $$
DECLARE
    v_processed INT := 0;
    v_failed INT := 0;
    v_broadcast RECORD;
BEGIN
    -- Process pending broadcasts
    FOR v_broadcast IN 
        SELECT * FROM streak_broadcast_queue 
        WHERE broadcast_status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 100
    LOOP
        BEGIN
            -- Mark as sent (actual HTTP broadcast would happen in application layer)
            UPDATE streak_broadcast_queue SET
                broadcast_status = 'SENT',
                broadcast_at = NOW()
            WHERE id = v_broadcast.id;
            
            v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            UPDATE streak_broadcast_queue SET
                broadcast_status = 'FAILED'
            WHERE id = v_broadcast.id;
            
            v_failed := v_failed + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_processed,
        v_failed,
        format('Processed %s broadcasts (%s failed)', v_processed, v_failed)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 🔄 Trigger to auto-update streak on drill completion
CREATE OR REPLACE FUNCTION fn_auto_update_streak_on_drill()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically update streak when a drill is recorded
    PERFORM fn_update_streak_count(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_auto_streak_on_drill ON drill_performance;
CREATE TRIGGER trig_auto_streak_on_drill
    AFTER INSERT ON drill_performance
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_update_streak_on_drill();

-- ═══════════════════════════════════════════════════════════════════════════
-- 🧹 DAILY STREAK CHECK FUNCTION
-- Should be called via cron to reset inactive streaks
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_daily_streak_check()
RETURNS TABLE (
    users_checked INT,
    streaks_reset INT,
    message TEXT
) AS $$
DECLARE
    v_checked INT := 0;
    v_reset INT := 0;
    v_user RECORD;
BEGIN
    -- Find all users whose last_active_date is more than 1 day ago
    FOR v_user IN 
        SELECT user_id, current_streak, last_active_date
        FROM user_streaks
        WHERE last_active_date < CURRENT_DATE - INTERVAL '1 day'
          AND current_streak > 0
    LOOP
        -- Reset streak to 0
        UPDATE user_streaks SET
            current_streak = 0,
            streak_started_at = NULL
        WHERE user_id = v_user.user_id;
        
        -- Update profiles
        UPDATE profiles SET
            streak_count = 0,
            last_sync = NOW()
        WHERE id = v_user.user_id;
        
        -- Queue broadcast
        INSERT INTO streak_broadcast_queue (
            user_id, old_streak, new_streak, action, multiplier, broadcast_to
        ) VALUES (
            v_user.user_id, v_user.current_streak, 0, 'RESET', 1.0, 'YELLOW_DIAMOND'
        );
        
        v_reset := v_reset + 1;
        v_checked := v_checked + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_checked,
        v_reset,
        format('Daily check: %s users checked, %s streaks reset', v_checked, v_reset)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 VIEW: Active Streak Status
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW active_streak_status AS
SELECT 
    s.user_id,
    p.username,
    s.current_streak,
    s.longest_streak,
    s.last_active_date,
    s.streak_started_at,
    CASE 
        WHEN s.current_streak >= 7 THEN 2.0
        WHEN s.current_streak >= 3 THEN 1.5
        ELSE 1.0
    END AS current_multiplier,
    CASE 
        WHEN s.current_streak >= 30 THEN '🔥 LEGENDARY'
        WHEN s.current_streak >= 14 THEN '💪 DEDICATED'
        WHEN s.current_streak >= 7 THEN '⭐ COMMITTED'
        WHEN s.current_streak >= 3 THEN '🌱 GROWING'
        WHEN s.current_streak >= 1 THEN '✨ STARTED'
        ELSE '😴 INACTIVE'
    END AS streak_tier,
    CURRENT_DATE - s.last_active_date AS days_since_active,
    CASE 
        WHEN CURRENT_DATE - s.last_active_date <= INTERVAL '1 day' THEN 'ACTIVE'
        WHEN CURRENT_DATE - s.last_active_date <= INTERVAL '2 days' THEN 'AT_RISK'
        ELSE 'BROKEN'
    END AS streak_status
FROM user_streaks s
JOIN profiles p ON s.user_id = p.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ RED ACTIVE LOGIC COMPLETE (PROMPTS 4-6)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🛡️ RED ACTIVE LOGIC — PROMPTS 4-6 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   🛡️ TASK 04: XP_PROTECTION_LAW         ✅ ENFORCED';
    RAISE NOTICE '   🔮 TASK 05: DNA_CALCULATOR            ✅ DEPLOYED';
    RAISE NOTICE '   🔥 TASK 06: STREAK_ORACLE             ✅ ACTIVE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Trigger: trig_block_xp_loss';
    RAISE NOTICE '   Function: fn_refresh_dna_snapshot (50 weighted drills)';
    RAISE NOTICE '   Function: fn_update_streak_count (24h reset logic)';
    RAISE NOTICE '   Broadcast: streak_broadcast_queue → YELLOW_DIAMOND';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
