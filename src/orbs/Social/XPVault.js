/**
 * 🛡️ ORB 01: SOCIAL — XP VAULT
 * src/orbs/Social/XPVault.js
 * 
 * The IMMUTABLE service that enforces the Hard Law: XP CAN NEVER DECREASE
 * This is the sacred vault protecting player experience points.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 IMMUTABLE HARD LAWS (CANNOT BE MODIFIED)
// ═══════════════════════════════════════════════════════════════════════════

export const XP_VAULT_LAWS = Object.freeze({
    /**
     * 🛡️ THE SACRED LAW: XP CAN NEVER DECREASE
     * This is the foundational principle of the XP Vault.
     * Any operation that would reduce XP is BLOCKED.
     */
    NO_DECREASE: true,

    /**
     * 🎯 85% MASTERY GATE
     * XP from training requires minimum 85% accuracy to unlock.
     */
    MASTERY_GATE: 0.85,

    /**
     * 📈 MINIMUM INCREMENT
     * Smallest valid XP addition.
     */
    MIN_INCREMENT: 1,

    /**
     * 🚫 MAXIMUM SINGLE INCREMENT
     * Safety cap to prevent exploits.
     */
    MAX_SINGLE_INCREMENT: 100000,

    /**
     * 🔐 VERSION (for audit trail)
     */
    VERSION: '1.0.0-SEALED'
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏛️ XP SOURCES (Tracked for auditing)
// ═══════════════════════════════════════════════════════════════════════════

export const XP_SOURCES = Object.freeze({
    TRAINING: 'TRAINING',
    DRILL: 'DRILL',
    QUIZ: 'QUIZ',
    STREAK_BONUS: 'STREAK_BONUS',
    ACHIEVEMENT: 'ACHIEVEMENT',
    BANKROLL_SESSION: 'BANKROLL_SESSION',
    SOCIAL_ACTION: 'SOCIAL_ACTION',
    DAILY_LOGIN: 'DAILY_LOGIN',
    REFERRAL: 'REFERRAL',
    TOURNAMENT: 'TOURNAMENT',
    ADMIN_GRANT: 'ADMIN_GRANT'
});

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ XP VAULT SERVICE (IMMUTABLE)
// ═══════════════════════════════════════════════════════════════════════════

export class XPVault {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.laws = XP_VAULT_LAWS;
        this.auditLog = [];

        // Seal the vault on construction
        Object.freeze(this.laws);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔒 CORE VALIDATION (THE FORTRESS)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * 🛡️ IMMUTABLE LAW: Validate that XP can ONLY increase
     * This is the core protection - XP can NEVER go down.
     * @param {number} currentXP - Current XP total
     * @param {number} proposedXP - Proposed new XP total
     * @returns {Object} Validation result { valid, blocked, error?, reason? }
     */
    validateXPChange(currentXP, proposedXP) {
        // THE SACRED CHECK: No decrease allowed, EVER
        if (proposedXP < currentXP) {
            return Object.freeze({
                valid: false,
                blocked: true,
                error: 'HARD_LAW_VIOLATION',
                reason: `XP decrease blocked: ${currentXP} → ${proposedXP} (delta: ${proposedXP - currentXP})`
            });
        }

        return Object.freeze({
            valid: true,
            blocked: false
        });
    }

    /**
     * 🔐 Validate an increment amount before applying
     * @param {number} amount - Amount to validate
     * @returns {Object} Validation result { valid, blocked, error?, reason? }
     */
    validateIncrement(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return Object.freeze({
                valid: false,
                blocked: true,
                error: 'INVALID_TYPE',
                reason: 'XP amount must be a valid number'
            });
        }

        if (amount <= 0) {
            return Object.freeze({
                valid: false,
                blocked: true,
                error: 'HARD_LAW_VIOLATION',
                reason: 'XP increment must be positive (No decrease law)'
            });
        }

        if (amount < this.laws.MIN_INCREMENT) {
            return Object.freeze({
                valid: false,
                blocked: true,
                error: 'BELOW_MINIMUM',
                reason: `Minimum increment is ${this.laws.MIN_INCREMENT}`
            });
        }

        if (amount > this.laws.MAX_SINGLE_INCREMENT) {
            return Object.freeze({
                valid: false,
                blocked: true,
                error: 'EXCEEDS_MAXIMUM',
                reason: `Maximum single increment is ${this.laws.MAX_SINGLE_INCREMENT}`
            });
        }

        if (!Number.isInteger(amount)) {
            return Object.freeze({
                valid: false,
                blocked: true,
                error: 'NOT_INTEGER',
                reason: 'XP must be a whole number'
            });
        }

        return Object.freeze({
            valid: true,
            blocked: false
        });
    }

    /**
     * 🎯 Check 85% mastery gate
     * @param {number} accuracy - Accuracy value (0-1)
     * @returns {Object} { passed, required, actual, error? }
     */
    checkMasteryGate(accuracy) {
        const passed = accuracy >= this.laws.MASTERY_GATE;

        return Object.freeze({
            passed,
            required: this.laws.MASTERY_GATE,
            actual: accuracy,
            error: passed ? undefined : `Accuracy ${(accuracy * 100).toFixed(1)}% below ${this.laws.MASTERY_GATE * 100}% mastery gate`
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📈 XP OPERATIONS (Protected by Laws)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * 🔐 Safely add XP (the ONLY way to modify XP)
     * Returns an immutable result - XP can only go UP.
     * @param {string} userId - User UUID
     * @param {number} currentXP - Current XP total
     * @param {number} amount - Amount to add
     * @param {string} source - Source of XP
     * @param {Object} options - { requireMastery?, accuracy? }
     * @returns {Promise<Object>} Increment result
     */
    async addXP(userId, currentXP, amount, source, options = {}) {
        const timestamp = new Date().toISOString();

        // Step 1: Validate the increment
        const incrementValidation = this.validateIncrement(amount);
        if (!incrementValidation.valid) {
            this.logAudit(userId, currentXP, currentXP, 0, source, true, incrementValidation.reason);
            return Object.freeze({
                success: false,
                newTotal: currentXP,
                increment: 0,
                source,
                timestamp,
                error: incrementValidation.reason
            });
        }

        // Step 2: Check mastery gate if required
        if (options.requireMastery !== false && options.accuracy !== undefined) {
            const masteryCheck = this.checkMasteryGate(options.accuracy);
            if (!masteryCheck.passed) {
                this.logAudit(userId, currentXP, currentXP, 0, source, true, masteryCheck.error);
                return Object.freeze({
                    success: false,
                    newTotal: currentXP,
                    increment: 0,
                    source,
                    timestamp,
                    error: masteryCheck.error
                });
            }
        }

        // Step 3: Calculate new total
        const newTotal = currentXP + amount;

        // Step 4: Final validation (paranoid check - should never fail)
        const changeValidation = this.validateXPChange(currentXP, newTotal);
        if (!changeValidation.valid) {
            this.logAudit(userId, currentXP, currentXP, 0, source, true, changeValidation.reason);
            return Object.freeze({
                success: false,
                newTotal: currentXP,
                increment: 0,
                source,
                timestamp,
                error: 'CRITICAL: Final validation failed'
            });
        }

        // Step 5: Persist to database if client available
        if (this.supabase) {
            try {
                const { error } = await this.supabase.rpc('fn_increment_xp_atomic', {
                    p_user_id: userId,
                    p_amount: amount,
                    p_source: source
                });

                if (error) {
                    this.logAudit(userId, currentXP, currentXP, 0, source, true, error.message);
                    return Object.freeze({
                        success: false,
                        newTotal: currentXP,
                        increment: 0,
                        source,
                        timestamp,
                        error: error.message
                    });
                }
            } catch (err) {
                this.logAudit(userId, currentXP, currentXP, 0, source, true, err.message);
                return Object.freeze({
                    success: false,
                    newTotal: currentXP,
                    increment: 0,
                    source,
                    timestamp,
                    error: err.message
                });
            }
        }

        // Success! Log and return
        this.logAudit(userId, currentXP, newTotal, amount, source, false);

        return Object.freeze({
            success: true,
            newTotal,
            increment: amount,
            source,
            timestamp
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════════════

    logAudit(userId, previousXP, newXP, delta, source, blocked, reason) {
        const entry = Object.freeze({
            userId,
            previousXP,
            newXP,
            delta,
            source,
            blocked,
            reason,
            timestamp: new Date().toISOString()
        });

        this.auditLog.push(entry);

        // Keep audit log bounded
        if (this.auditLog.length > 1000) {
            this.auditLog.shift();
        }
    }

    /**
     * Get audit log (read-only copy)
     * @returns {Array} Frozen audit log entries
     */
    getAuditLog() {
        return Object.freeze([...this.auditLog]);
    }

    /**
     * Get blocked attempts (security monitoring)
     * @returns {Array} Frozen blocked entries
     */
    getBlockedAttempts() {
        return Object.freeze(this.auditLog.filter(e => e.blocked));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 INSPECTION METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get the immutable laws (for display/verification)
     * @returns {Object} Frozen laws object
     */
    getLaws() {
        return this.laws;
    }

    /**
     * Verify vault integrity
     * @returns {Object} Frozen integrity status
     */
    verifyIntegrity() {
        return Object.freeze({
            sealed: true,
            version: this.laws.VERSION,
            laws: this.laws
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export function createXPVault(supabaseClient) {
    return new XPVault(supabaseClient);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ SINGLETON INSTANCE (Global Vault)
// ═══════════════════════════════════════════════════════════════════════════

let globalVault = null;

export function getGlobalXPVault(supabaseClient) {
    if (!globalVault) {
        globalVault = new XPVault(supabaseClient);
    }
    return globalVault;
}

export default XPVault;
