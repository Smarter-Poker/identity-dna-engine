/**
 * 🧠 IDENTITY_DNA_ENGINE — Identity & Reputation Mapping (Tasks 51-54)
 */

// TASK 51: TILT SENSOR DNA
export const TILT_SENSOR_CONFIG = {
    RAPID_BUYIN_WINDOW_MINUTES: 60,
    RAPID_BUYIN_THRESHOLD: 3,
    BUYIN_AMOUNT_MULTIPLIER: 2.0,
    COOLDOWN_HOURS: 2
};

export class TiltSensorDNA {
    constructor(supabase) { this.supabase = supabase; }

    async checkTilt(userId) {
        const { data } = await this.supabase.client.rpc('fn_tilt_sensor_check', { p_user_id: userId });
        return data;
    }

    static calculateTiltScore(rapidBuyins, threshold = 3) {
        return Math.min(1.0, rapidBuyins / threshold);
    }

    static isTilting(rapidBuyins, threshold = 3) {
        return rapidBuyins >= threshold;
    }
}

// TASK 52: REPUTATION DECAY
export const REPUTATION_CONFIG = {
    DECAY_START_DAYS: 7,
    DECAY_RATE_PER_DAY: 0.02,
    MIN_REPUTATION: 0.1,
    RECOVERY_RATE: 0.05,
    MAX_REPUTATION: 1.0
};

export class ReputationDecay {
    constructor(supabase) { this.supabase = supabase; }

    async calculateDecay(userId) {
        const { data } = await this.supabase.client.rpc('fn_calculate_reputation_decay', { p_user_id: userId });
        return data;
    }

    async recoverReputation(userId, activityType = 'GENERAL') {
        const { data } = await this.supabase.client.rpc('fn_reputation_recovery',
            { p_user_id: userId, p_activity_type: activityType });
        return data;
    }

    static calculateDecayAmount(daysInactive, config = REPUTATION_CONFIG) {
        if (daysInactive <= config.DECAY_START_DAYS) return 0;
        return (daysInactive - config.DECAY_START_DAYS) * config.DECAY_RATE_PER_DAY;
    }

    static applyDecay(currentRep, decayAmount, config = REPUTATION_CONFIG) {
        return Math.max(config.MIN_REPUTATION, currentRep - decayAmount);
    }
}

// TASK 53: BANKROLL VARIANCE SIMULATION
export class BankrollVarianceSim {
    constructor(supabase) { this.supabase = supabase; }

    async runSimulation(userId, bankroll, avgBuyin = 100, sessions = 100) {
        const { data } = await this.supabase.client.rpc('fn_bankroll_variance_simulation', {
            p_user_id: userId, p_current_bankroll: bankroll, p_avg_buyin: avgBuyin, p_sessions_to_simulate: sessions
        });
        return data;
    }

    static calculateRiskOfRuin(winRate, bankroll, avgBuyin) {
        if (winRate >= 1) return 0;
        if (winRate <= 0) return 1;
        const buyins = bankroll / avgBuyin;
        return Math.min(1.0, Math.pow((1 - winRate) / winRate, buyins));
    }

    static calculateKellyFraction(winRate) {
        return Math.max(0, (winRate * 2) - 1);
    }

    static getRecommendation(survivalProbability) {
        if (survivalProbability > 0.9) return 'HEALTHY';
        if (survivalProbability > 0.7) return 'CAUTION';
        if (survivalProbability > 0.5) return 'WARNING';
        return 'DANGER';
    }
}

// TASK 54: SETTINGS HARD LOCK
export const HARD_LAWS = {
    MASTERY_GATE_85: { id: 'MASTERY_GATE_85', value: 0.85, locked: true, level: 'PERMANENT' },
    XP_PERMANENCE: { id: 'XP_PERMANENCE', value: 1.0, locked: true, level: 'PERMANENT' },
    STREAK_EXPIRY_24H: { id: 'STREAK_EXPIRY_24H', value: 24.0, locked: true, level: 'PERMANENT' },
    PRO_HIGH_STAKES: { id: 'PRO_HIGH_STAKES', value: 5.0, locked: true, level: 'PERMANENT' }
};

export class SettingsHardLock {
    constructor(supabase) { this.supabase = supabase; }

    async getHardLaw(lawId) {
        const { data } = await this.supabase.client.rpc('fn_get_hard_law', { p_law_id: lawId });
        return data;
    }

    static isLocked(lawId) {
        return HARD_LAWS[lawId]?.level === 'PERMANENT';
    }

    static getMasteryGate() { return HARD_LAWS.MASTERY_GATE_85.value; }
    static getStreakExpiry() { return HARD_LAWS.STREAK_EXPIRY_24H.value; }

    static validateModification(lawId) {
        if (HARD_LAWS[lawId]?.level === 'PERMANENT') {
            return { allowed: false, reason: 'PERMANENT_HARD_LAW', message: `Cannot modify ${lawId}` };
        }
        return { allowed: true };
    }
}

// Combined Engine
export class IdentityReputationEngine {
    constructor(supabase) {
        this.tiltSensor = new TiltSensorDNA(supabase);
        this.reputation = new ReputationDecay(supabase);
        this.varianceSim = new BankrollVarianceSim(supabase);
        this.hardLock = new SettingsHardLock(supabase);
    }
}

export default {
    IdentityReputationEngine, TiltSensorDNA, ReputationDecay, BankrollVarianceSim, SettingsHardLock,
    TILT_SENSOR_CONFIG, REPUTATION_CONFIG, HARD_LAWS
};
