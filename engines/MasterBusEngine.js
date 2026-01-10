/**
 * 🛰️ IDENTITY_DNA_ENGINE — Master Bus Engine (Prompts 10-12)
 * 
 * @task_10: XP_PERMANENCE_TRIPLE_LOCK
 * @task_11: DNA_RADAR_DATA_NORMALIZATION
 * @task_12: STREAK_EXPIRY_ORACLE_CRON
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 TASK 10: XP TRIPLE LOCK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Triple Lock Validator
 * Enforces XP permanence - NO user can decrease XP
 */
export class XPTripleLock {
    constructor() {
        this.lockVersion = 'TRIPLE_LOCK_V1';
    }

    /**
     * Validate XP change - Lock 1
     * @returns {boolean} true if valid (increase or same), false if decrease attempt
     */
    validateXPChange(oldXP, newXP) {
        return newXP >= oldXP;
    }

    /**
     * Triple Lock Check
     * Returns the lock activation status
     */
    checkTripleLock(oldXP, newXP, callerRole = 'unknown') {
        // Lock 1: Check value
        if (newXP < oldXP) {
            const alert = {
                id: this._generateAlertId(),
                type: 'XP_DECREASE_ATTEMPT',
                severity: 'CRITICAL',
                oldValue: oldXP,
                attemptedValue: newXP,
                lossAmount: oldXP - newXP,
                callerRole,
                blocked: true,
                timestamp: new Date().toISOString(),
                lockVersion: this.lockVersion
            };

            // Lock 2: Log (would insert to xp_security_alerts)
            console.error('🔐 XP_TRIPLE_LOCK: Alert logged', alert);

            // Lock 3: Throw (triggers rollback)
            throw new Error(
                `🔐 XP_TRIPLE_LOCK_ACTIVATED [Alert: ${alert.id}] | ` +
                `ABSOLUTE PROTECTION: XP decrease from ${oldXP} to ${newXP} BLOCKED. ` +
                `Caller: ${callerRole}. Loss amount: ${oldXP - newXP}. ` +
                `NO USER, INCLUDING SERVICE-ROLE, CAN DECREASE XP.`
            );
        }

        return { blocked: false, allowed: true };
    }

    _generateAlertId() {
        return 'alert-' + Math.random().toString(36).substr(2, 9);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TASK 11: DNA RADAR NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Radar Data Normalizer
 * Converts all values to 0-1 scale
 */
export class RadarNormalizer {

    /**
     * Normalize a value from 0-100 scale to 0-1
     */
    static normalize(value, min = 0, max = 100) {
        const clamped = Math.max(min, Math.min(max, value));
        return (clamped - min) / (max - min);
    }

    /**
     * Denormalize from 0-1 to original scale
     */
    static denormalize(normalized, min = 0, max = 100) {
        return min + (normalized * (max - min));
    }

    /**
     * Normalize accuracy (expects 0-1 input, ensures proper clamping)
     */
    static normalizeAccuracy(accuracy) {
        return Math.max(0, Math.min(1, accuracy));
    }

    /**
     * Normalize grit from streak data
     * Formula: (current * 0.05 + longest * 0.02) capped at 1
     */
    static normalizeGrit(currentStreak, longestStreak) {
        const raw = (currentStreak * 0.05) + (longestStreak * 0.02);
        return Math.max(0.1, Math.min(1, raw)); // Minimum 0.1 baseline
    }

    /**
     * Normalize aggression from 0-100 trait score
     */
    static normalizeAggression(aggressionScore) {
        return Math.max(0, Math.min(1, aggressionScore / 100));
    }

    /**
     * Build complete normalized radar payload
     */
    static buildNormalizedPayload(data) {
        const accuracy = this.normalizeAccuracy(data.accuracy || 0.5);
        const grit = this.normalizeGrit(data.currentStreak || 0, data.longestStreak || 0);
        const aggression = this.normalizeAggression(data.aggression || 50);
        const tiltResistance = this.normalize(data.tiltResistance || 50);
        const speed = this.normalize(data.speed || 50);
        const gtoMastery = this.normalizeAccuracy(data.gtoCompliance || 0.5);
        const wealth = this.normalize(data.wealth || 50);

        // Calculate composite (0-1)
        const composite =
            (accuracy * 0.25) +
            (grit * 0.15) +
            (aggression * 0.15) +
            (tiltResistance * 0.15) +
            (gtoMastery * 0.20) +
            (speed * 0.10);

        return {
            radar: {
                accuracy: { value: accuracy, percent: accuracy * 100, label: 'Accuracy' },
                grit: { value: grit, percent: grit * 100, label: 'Grit' },
                aggression: { value: aggression, percent: aggression * 100, label: 'Aggression' },
                wealth: { value: wealth, percent: wealth * 100, label: 'Wealth' },
                tiltResistance: { value: tiltResistance, percent: tiltResistance * 100, label: 'Composure' },
                speed: { value: speed, percent: speed * 100, label: 'Speed' },
                gtoMastery: { value: gtoMastery, percent: gtoMastery * 100, label: 'GTO Mastery' }
            },
            composite: {
                value: Math.round(composite * 10000) / 10000,
                percent: Math.round(composite * 100 * 10) / 10
            },
            vertices: this._buildVertices(accuracy, grit, aggression, wealth, tiltResistance, speed)
        };
    }

    /**
     * Build 3D vertices for hexagon chart (normalized)
     */
    static _buildVertices(accuracy, grit, aggression, wealth, tiltResistance, speed) {
        return [
            { axis: 'accuracy', x: 0, y: accuracy },
            { axis: 'grit', x: grit * 0.866, y: grit * 0.5 },
            { axis: 'aggression', x: aggression * 0.866, y: aggression * -0.5 },
            { axis: 'wealth', x: 0, y: -wealth },
            { axis: 'composure', x: tiltResistance * -0.866, y: tiltResistance * -0.5 },
            { axis: 'speed', x: speed * -0.866, y: speed * 0.5 }
        ];
    }
}

/**
 * Radar Data Client
 * Fetches normalized radar data from database
 */
export class RadarDataClient {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get normalized radar payload for user
     */
    async getRadarPayload(userId) {
        const { data, error } = await this.supabase.client
            .rpc('fn_get_radar_payload', { p_user_id: userId });

        if (error) {
            console.error('Radar payload fetch error:', error);
            return null;
        }

        return data;
    }

    /**
     * Get normalized radar data from view
     */
    async getNormalizedRadarData(userId) {
        const { data, error } = await this.supabase.client
            .from('normalized_radar_data')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Normalized radar fetch error:', error);
            return null;
        }

        return data;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⏰ TASK 12: STREAK EXPIRY ORACLE CRON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Streak Oracle Configuration
 */
export const STREAK_CRON_CONFIG = {
    schedule: '1 0 * * *',  // 00:01 UTC daily
    jobId: 'daily-streak-reset',
    jobName: 'Daily Streak Reset Oracle',
    expirationHours: 24
};

/**
 * Streak Expiry Oracle
 * Manages daily streak reset logic
 */
export class StreakExpiryOracle {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Run daily streak reset (called by cron or edge function)
     */
    async runDailyReset() {
        const { data, error } = await this.supabase.client
            .rpc('fn_daily_streak_reset');

        if (error) {
            console.error('Daily streak reset error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    /**
     * Check for pending cron jobs
     */
    async checkPendingJobs() {
        const { data, error } = await this.supabase.client
            .rpc('fn_check_pending_cron_jobs');

        if (error) {
            console.error('Pending jobs check error:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Mark a cron job as completed
     */
    async markJobCompleted(jobId) {
        const { error } = await this.supabase.client
            .rpc('fn_mark_cron_job_completed', { p_job_id: jobId });

        if (error) {
            console.error('Mark job completed error:', error);
            return false;
        }

        return true;
    }

    /**
     * Get streak audit log
     */
    async getAuditLog(limit = 30) {
        const { data, error } = await this.supabase.client
            .from('streak_audit_log')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Audit log fetch error:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Check if streak should expire for a user
     */
    checkStreakExpiry(lastActiveDate) {
        const lastActive = new Date(lastActiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastActive.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

        return {
            shouldReset: diffDays > 1,
            daysSinceActive: diffDays,
            lastActiveDate
        };
    }
}

/**
 * Cron Job Runner (for Edge Function integration)
 */
export class CronJobRunner {
    constructor(oracle) {
        this.oracle = oracle;
    }

    /**
     * Execute pending cron jobs
     * Call this from an Edge Function on a schedule
     */
    async executePendingJobs() {
        const pendingJobs = await this.oracle.checkPendingJobs();
        const results = [];

        for (const job of pendingJobs) {
            if (job.should_run) {
                console.log(`Executing cron job: ${job.job_name}`);

                if (job.function_name === 'fn_daily_streak_reset') {
                    const result = await this.oracle.runDailyReset();
                    await this.oracle.markJobCompleted(job.job_id);
                    results.push({ job: job.job_id, result });
                }
            }
        }

        return {
            executed: results.length,
            results
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛰️ MASTER BUS ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class MasterBusEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.tripleLock = new XPTripleLock();
        this.radarClient = new RadarDataClient(supabaseClient);
        this.streakOracle = new StreakExpiryOracle(supabaseClient);
        this.cronRunner = new CronJobRunner(this.streakOracle);
    }

    /**
     * Get master bus status
     */
    async getStatus() {
        const { data, error } = await this.supabase?.client
            ?.from('master_bus_status')
            ?.select('*');

        const components = data || [
            { component: 'TRIPLE_LOCK', feature: 'XP Permanence', status: 'ACTIVE' },
            { component: 'RADAR_NORMALIZATION', feature: 'DNA Data Pipeline', status: 'ACTIVE' },
            { component: 'STREAK_CRON', feature: 'Daily Reset Oracle', status: 'SCHEDULED' }
        ];

        return {
            version: 'MASTER_BUS_V1',
            components,
            timestamp: new Date().toISOString()
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    MasterBusEngine,
    XPTripleLock,
    RadarNormalizer,
    RadarDataClient,
    StreakExpiryOracle,
    CronJobRunner,
    STREAK_CRON_CONFIG
};
