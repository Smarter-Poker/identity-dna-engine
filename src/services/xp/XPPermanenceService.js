/**
 * 🛡️ DIAMOND PERMANENCE SERVICE
 * src/services/xp/XPPermanenceService.js
 *
 * Service to handle all diamond increments with atomic verification.
 * Enforces the Hard Law: DIAMONDS CAN NEVER DECREASE
 * (File path kept as xp/ for backwards compatibility)
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 HARD LAW CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const DIAMOND_HARD_LAWS = {
    NO_DECREASE: true,
    MASTERY_GATE: 0.85,
    MIN_INCREMENT: 1,
    MAX_SINGLE_INCREMENT: 100000
};

/** @deprecated Use DIAMOND_HARD_LAWS */
export const XP_HARD_LAWS = DIAMOND_HARD_LAWS;

export const DIAMOND_SOURCES = {
    TRAINING: 'TRAINING',
    DRILL: 'DRILL',
    QUIZ: 'QUIZ',
    STREAK_BONUS: 'STREAK_BONUS',
    ACHIEVEMENT: 'ACHIEVEMENT',
    BANKROLL_SESSION: 'BANKROLL_SESSION',
    SOCIAL_ACTION: 'SOCIAL_ACTION',
    DAILY_LOGIN: 'DAILY_LOGIN',
    REFERRAL: 'REFERRAL',
    ADMIN: 'ADMIN'
};

/** @deprecated Use DIAMOND_SOURCES */
export const XP_SOURCES = DIAMOND_SOURCES;

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ DIAMOND PERMANENCE SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class DiamondPermanenceService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.hardLaws = DIAMOND_HARD_LAWS;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📈 INCREMENT DIAMONDS (Atomic, Safe)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Safely increment diamonds with atomic verification
     * @param {string} userId - User UUID
     * @param {number} amount - Diamond amount to add (must be positive)
     * @param {string} source - Source of diamonds
     * @param {Object} options - Additional options
     */
    async incrementDiamonds(userId, amount, source = DIAMOND_SOURCES.TRAINING, options = {}) {
        // Validate amount
        const validation = this.validateIncrement(amount);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Check mastery gate if accuracy provided
        if (options.requireMastery !== false && options.accuracy !== undefined) {
            const masteryCheck = this.checkMasteryGate(options.accuracy);
            if (!masteryCheck.passed) {
                return {
                    success: false,
                    error: masteryCheck.error,
                    accuracy: options.accuracy,
                    required: this.hardLaws.MASTERY_GATE
                };
            }
        }

        // Call database function for atomic operation (legacy DB function name)
        const { data, error } = await this.supabase.client.rpc('fn_increment_xp', {
            p_user_id: userId,
            p_amount: amount,
            p_source: source,
            p_require_mastery: options.requireMastery !== false,
            p_accuracy: options.accuracy || null
        });

        if (error) {
            console.error('Diamond increment error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    /** @deprecated Use incrementDiamonds */
    async incrementXP(userId, amount, source, options) {
        return this.incrementDiamonds(userId, amount, source, options);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 VALIDATION METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Validate diamond increment amount
     */
    validateIncrement(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return { valid: false, error: 'Amount must be a number' };
        }

        if (amount <= 0) {
            return { valid: false, error: 'Diamond amount must be positive (Hard Law: No Diamond Loss)' };
        }

        if (amount < this.hardLaws.MIN_INCREMENT) {
            return { valid: false, error: `Minimum increment is ${this.hardLaws.MIN_INCREMENT}` };
        }

        if (amount > this.hardLaws.MAX_SINGLE_INCREMENT) {
            return { valid: false, error: `Maximum single increment is ${this.hardLaws.MAX_SINGLE_INCREMENT}` };
        }

        if (!Number.isInteger(amount)) {
            return { valid: false, error: 'Diamonds must be a whole number' };
        }

        return { valid: true };
    }

    /**
     * Check 85% mastery gate
     */
    checkMasteryGate(accuracy) {
        if (accuracy >= this.hardLaws.MASTERY_GATE) {
            return { passed: true };
        }
        return {
            passed: false,
            error: `Accuracy ${(accuracy * 100).toFixed(1)}% below ${this.hardLaws.MASTERY_GATE * 100}% mastery gate`
        };
    }

    /**
     * Validate diamond change (blocks any decrease)
     */
    validateDiamondChange(currentDiamonds, newDiamonds) {
        if (newDiamonds < currentDiamonds) {
            return {
                valid: false,
                blocked: true,
                error: 'HARD_LAW_VIOLATION',
                message: `Cannot decrease diamonds from ${currentDiamonds} to ${newDiamonds}`,
                delta: newDiamonds - currentDiamonds
            };
        }
        return { valid: true, blocked: false };
    }

    /** @deprecated Use validateDiamondChange */
    validateXPChange(currentXP, newXP) {
        return this.validateDiamondChange(currentXP, newXP);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 DIAMOND QUERY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get current diamond total
     */
    async getDiamonds(userId) {
        const { data, error } = await this.supabase.client
            .from('user_dna_profiles')
            .select('xp_total, xp_lifetime, current_level, tier_id') // legacy DB columns
            .eq('user_id', userId)
            .single();

        if (error) return null;
        return data;
    }

    /** @deprecated Use getDiamonds */
    async getXP(userId) {
        return this.getDiamonds(userId);
    }

    /**
     * Get diamond history/log
     */
    async getDiamondHistory(userId, limit = 50) {
        const { data, error } = await this.supabase.client
            .from('xp_security_log') // legacy DB table name
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return error ? [] : data;
    }

    /** @deprecated Use getDiamondHistory */
    async getXPHistory(userId, limit) {
        return this.getDiamondHistory(userId, limit);
    }

    /**
     * Get security violations
     */
    async getSecurityViolations(userId = null, limit = 100) {
        let query = this.supabase.client
            .from('xp_security_log') // legacy DB table name
            .select('*')
            .eq('blocked', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        return error ? [] : data;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 CONVENIENCE METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Award training diamonds (requires 85% accuracy)
     */
    async awardTrainingDiamonds(userId, baseAmount, accuracy) {
        return this.incrementDiamonds(userId, baseAmount, DIAMOND_SOURCES.TRAINING, {
            requireMastery: true,
            accuracy
        });
    }

    /** @deprecated Use awardTrainingDiamonds */
    async awardTrainingXP(userId, baseAmount, accuracy) {
        return this.awardTrainingDiamonds(userId, baseAmount, accuracy);
    }

    /**
     * Award bonus diamonds (no mastery requirement)
     */
    async awardBonusDiamonds(userId, amount, source = DIAMOND_SOURCES.ACHIEVEMENT) {
        return this.incrementDiamonds(userId, amount, source, {
            requireMastery: false
        });
    }

    /** @deprecated Use awardBonusDiamonds */
    async awardBonusXP(userId, amount, source) {
        return this.awardBonusDiamonds(userId, amount, source);
    }

    /**
     * Award streak bonus
     */
    async awardStreakBonus(userId, streakDays) {
        const bonusDiamonds = Math.min(100, streakDays * 5); // was 1000/50 XP, now 100/5 diamonds
        return this.incrementDiamonds(userId, bonusDiamonds, DIAMOND_SOURCES.STREAK_BONUS, {
            requireMastery: false
        });
    }
}

// Legacy alias
export const XPPermanenceService = DiamondPermanenceService;

// ═══════════════════════════════════════════════════════════════════════════
// 📦 FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export function createDiamondService(supabaseClient) {
    return new DiamondPermanenceService(supabaseClient);
}

/** @deprecated Use createDiamondService */
export function createXPService(supabaseClient) {
    return createDiamondService(supabaseClient);
}

export default DiamondPermanenceService;
