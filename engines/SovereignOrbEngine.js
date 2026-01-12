/**
 * 🌐 IDENTITY_DNA_ENGINE — Sovereign Orb Logic (Orbs 01, 08, 10)
 * 
 * @task_44: ORB_01_HOLOGRAPHIC_DNA_EXPANSION
 * @task_45: ORB_08_VARIANCE_SHIELD
 * @task_46: ORB_10_SETTINGS_SOVEREIGNTY
 */

// ═══════════════════════════════════════════════════════════════
// 🧬 TASK 44: HOLOGRAPHIC DNA 6-POINT EXPANSION
// ═══════════════════════════════════════════════════════════════

export const DNA_RADAR_6POINT = {
    AGGRESSION: { key: 'aggression', color: '#FF4500', weight: 0.15 },
    GRIT: { key: 'grit', color: '#32CD32', weight: 0.20 },
    ACCURACY: { key: 'accuracy', color: '#00BFFF', weight: 0.25 },
    BANKROLL_MGMT: { key: 'bankroll_management', color: '#FFD700', weight: 0.20, source: 'ORB_08' },
    SOCIAL_REP: { key: 'social_reputation', color: '#9400D3', weight: 0.10, source: 'ORB_03' },
    COMPOSURE: { key: 'composure', color: '#FF1493', weight: 0.10 }
};

export class HolographicDNA6Point {
    constructor(supabase) { this.supabase = supabase; }

    async getRadar(userId) {
        const { data } = await this.supabase.client.rpc('fn_get_holographic_dna_6point', { p_user_id: userId });
        return data;
    }

    static calculateCompositeScore(values) {
        let score = 0;
        for (const [, config] of Object.entries(DNA_RADAR_6POINT)) {
            score += (values[config.key] || 0.5) * config.weight;
        }
        return Math.round(score * 10000) / 10000;
    }

    static calculateBankrollStability(winRate, variance) {
        const normalizedVariance = Math.min(variance / 1000, 1.0);
        return (winRate * 0.6) + ((1.0 - normalizedVariance) * 0.4);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🛡️ TASK 45: VARIANCE SHIELD (Anti-Tilt)
// ═══════════════════════════════════════════════════════════════

export const TILT_ALERT_TYPES = {
    BANKROLL_DROP: 'BANKROLL_DROP',
    LOSS_STREAK: 'LOSS_STREAK',
    SESSION_TILT: 'SESSION_TILT',
    PANIC_BEHAVIOR: 'PANIC_BEHAVIOR'
};

export const TILT_SEVERITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };

export class VarianceShield {
    constructor(supabase) { this.supabase = supabase; this.threshold = -20; }

    async checkTilt(userId) {
        const { data } = await this.supabase.client.rpc('fn_check_bankroll_tilt', { p_user_id: userId });
        return data;
    }

    async getSocialShellAlerts(userId) {
        const { data } = await this.supabase.client.rpc('fn_get_social_shell_tilt_alerts', { p_user_id: userId });
        return data || [];
    }

    static checkLocalTilt(stats) {
        const { totalBuyin, totalCashout } = stats;
        if (totalBuyin <= 0) return { isTilt: false, dropPercentage: 0 };
        const dropPercentage = ((totalCashout - totalBuyin) / totalBuyin) * 100;
        return {
            isTilt: dropPercentage < -20,
            dropPercentage: Math.round(dropPercentage * 100) / 100,
            severity: dropPercentage < -50 ? 'CRITICAL' : dropPercentage < -35 ? 'HIGH' : 'MEDIUM'
        };
    }

    static getSeverity(dropPercentage) {
        if (dropPercentage < -50) return TILT_SEVERITY.CRITICAL;
        if (dropPercentage < -35) return TILT_SEVERITY.HIGH;
        if (dropPercentage < -20) return TILT_SEVERITY.MEDIUM;
        return TILT_SEVERITY.LOW;
    }
}

// ═══════════════════════════════════════════════════════════════
// ⚙️ TASK 46: ORB 10 SETTINGS SOVEREIGNTY
// ═══════════════════════════════════════════════════════════════

export const VISIBILITY_LEVELS = {
    PUBLIC: 'PUBLIC',
    FRIENDS_ONLY: 'FRIENDS_ONLY',
    PRIVATE: 'PRIVATE',
    INVISIBLE: 'INVISIBLE'
};

export class SettingsSovereignty {
    constructor(supabase) { this.supabase = supabase; this.orbId = 10; }

    async setVisibility(userId, settings) {
        const { data } = await this.supabase.client.rpc('rpc_orb10_set_visibility', {
            p_user_id: userId,
            p_visibility_level: settings.visibilityLevel,
            p_show_xp: settings.showXP,
            p_show_tier: settings.showTier,
            p_show_streak: settings.showStreak,
            p_show_bankroll_stats: settings.showBankrollStats,
            p_show_dna_radar: settings.showDNARadar
        });
        return data;
    }

    async getVisibility(userId) {
        const { data } = await this.supabase.client.rpc('fn_get_visibility_settings', { p_user_id: userId });
        return data;
    }

    static validateSettingsSource(orbId) {
        if (orbId !== 10 && orbId !== 'ORB_10') {
            return { valid: false, error: 'SETTINGS_SOVEREIGNTY_VIOLATION', message: 'Only Orb 10 can modify visibility' };
        }
        return { valid: true };
    }
}

// ═══════════════════════════════════════════════════════════════
// 🌐 SOVEREIGN ORB ENGINE
// ═══════════════════════════════════════════════════════════════
export class SovereignOrbEngine {
    constructor(supabase) {
        this.dna6Point = new HolographicDNA6Point(supabase);
        this.varianceShield = new VarianceShield(supabase);
        this.settings = new SettingsSovereignty(supabase);
    }
}

export default {
    SovereignOrbEngine, HolographicDNA6Point, VarianceShield, SettingsSovereignty,
    DNA_RADAR_6POINT, TILT_ALERT_TYPES, TILT_SEVERITY, VISIBILITY_LEVELS
};
