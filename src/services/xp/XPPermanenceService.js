/**
 * 🛡️ XP PERMANENCE SERVICE
 * src/services/xp/XPPermanenceService.js
 * 
 * Service to handle all XP increments with atomic verification.
 * Enforces the Hard Law: XP CAN NEVER DECREASE
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 HARD LAW CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const XP_HARD_LAWS = {
    NO_DECREASE: true,
    MASTERY_GATE: 0.85,
    MIN_INCREMENT: 1,
    MAX_SINGLE_INCREMENT: 100000
};

export const XP_SOURCES = {
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

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ XP PERMANENCE SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class XPPermanenceService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.hardLaws = XP_HARD_LAWS;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📈 INCREMENT XP (Atomic, Safe)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Safely increment XP with atomic verification
     * @param {string} userId - User UUID
     * @param {number} amount - XP amount to add (must be positive)
     * @param {string} source - Source of XP
     * @param {Object} options - Additional options
     */
    async incrementXP(userId, amount, source = XP_SOURCES.TRAINING, options = {}) {
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

        // Call database function for atomic operation
        const { data, error } = await this.supabase.client.rpc('fn_increment_xp', {
            p_user_id: userId,
            p_amount: amount,
            p_source: source,
            p_require_mastery: options.requireMastery !== false,
            p_accuracy: options.accuracy || null
        });

        if (error) {
            console.error('XP increment error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 VALIDATION METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Validate XP increment amount
     */
    validateIncrement(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return { valid: false, error: 'Amount must be a number' };
        }

        if (amount <= 0) {
            return { valid: false, error: 'XP amount must be positive (Hard Law: No XP Loss)' };
        }

        if (amount < this.hardLaws.MIN_INCREMENT) {
            return { valid: false, error: `Minimum increment is ${this.hardLaws.MIN_INCREMENT}` };
        }

        if (amount > this.hardLaws.MAX_SINGLE_INCREMENT) {
            return { valid: false, error: `Maximum single increment is ${this.hardLaws.MAX_SINGLE_INCREMENT}` };
        }

        if (!Number.isInteger(amount)) {
            return { valid: false, error: 'XP must be a whole number' };
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
     * Validate XP change (blocks any decrease)
     */
    validateXPChange(currentXP, newXP) {
        if (newXP < currentXP) {
            return {
                valid: false,
                blocked: true,
                error: 'HARD_LAW_VIOLATION',
                message: `Cannot decrease XP from ${currentXP} to ${newXP}`,
                delta: newXP - currentXP
            };
        }
        return { valid: true, blocked: false };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 XP QUERY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get current XP total
     */
    async getXP(userId) {
        const { data, error } = await this.supabase.client
            .from('user_dna_profiles')
            .select('xp_total, xp_lifetime, current_level, tier_id')
            .eq('user_id', userId)
            .single();

        if (error) return null;
        return data;
    }

    /**
     * Get XP history/log
     */
    async getXPHistory(userId, limit = 50) {
        const { data, error } = await this.supabase.client
            .from('xp_security_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return error ? [] : data;
    }

    /**
     * Get security violations
     */
    async getSecurityViolations(userId = null, limit = 100) {
        let query = this.supabase.client
            .from('xp_security_log')
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
     * Award training XP (requires 85% accuracy)
     */
    async awardTrainingXP(userId, baseAmount, accuracy) {
        return this.incrementXP(userId, baseAmount, XP_SOURCES.TRAINING, {
            requireMastery: true,
            accuracy
        });
    }

    /**
     * Award bonus XP (no mastery requirement)
     */
    async awardBonusXP(userId, amount, source = XP_SOURCES.ACHIEVEMENT) {
        return this.incrementXP(userId, amount, source, {
            requireMastery: false
        });
    }

    /**
     * Award streak bonus
     */
    async awardStreakBonus(userId, streakDays) {
        const bonusXP = Math.min(1000, streakDays * 50);
        return this.incrementXP(userId, bonusXP, XP_SOURCES.STREAK_BONUS, {
            requireMastery: false
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export function createXPService(supabaseClient) {
    return new XPPermanenceService(supabaseClient);
}

export default XPPermanenceService;
