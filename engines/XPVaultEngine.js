/**
 * 🧬 IDENTITY_DNA_ENGINE — XP Vault Engine
 * 
 * @project IDENTITY_DNA_ENGINE
 * @task XP_PERMANENCE_LOGIC
 * 
 * Manages the xp_vault table with permanence enforcement.
 * Constraint: XP can only be added, never subtracted.
 * Works in conjunction with Postgres trigger 'check_xp_gain'.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ XP PERMANENCE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const XP_VAULT_CONFIG = {
    MIN_DEPOSIT: 1,            // Minimum XP deposit
    MAX_DEPOSIT: 100000,       // Maximum single deposit (sanity check)
    AUDIT_RETENTION_DAYS: 365  // Keep audit logs for 1 year
};

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ XP PERMANENCE ERRORS
// ═══════════════════════════════════════════════════════════════════════════
export class XPPermanenceViolation extends Error {
    constructor(userId, attemptedDecrease, currentTotal) {
        super(
            `🚫 LAW 2 VIOLATION: XP Permanence Breach! ` +
            `Cannot decrease XP by ${attemptedDecrease} for user ${userId}. ` +
            `Current total: ${currentTotal}. XP is immutable.`
        );
        this.name = 'XPPermanenceViolation';
        this.userId = userId;
        this.attemptedDecrease = attemptedDecrease;
        this.currentTotal = currentTotal;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏦 XP VAULT ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class XPVaultEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.stats = {
            depositsProcessed: 0,
            totalXPDeposited: 0,
            violationsBlocked: 0
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📥 DEPOSIT XP (The ONLY way to add XP)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Deposit XP to a user's vault.
     * This is the ONLY approved method to increase XP.
     * 
     * @param {string} userId - User ID
     * @param {number} amount - XP amount (must be positive)
     * @param {string} source - Source of XP (e.g., 'TRAINING', 'ARCADE')
     * @returns {Object} Deposit result
     */
    async deposit(userId, amount, source = 'UNKNOWN') {
        // ═══════════════════════════════════════════════════════════════
        // 🛡️ PRE-VALIDATION (Client-side enforcement)
        // ═══════════════════════════════════════════════════════════════

        // Validate amount is positive
        if (amount <= 0) {
            throw new XPPermanenceViolation(userId, Math.abs(amount), null);
        }

        // Validate amount is within bounds
        if (amount < XP_VAULT_CONFIG.MIN_DEPOSIT) {
            throw new Error(`XP deposit must be at least ${XP_VAULT_CONFIG.MIN_DEPOSIT}`);
        }

        if (amount > XP_VAULT_CONFIG.MAX_DEPOSIT) {
            throw new Error(`XP deposit cannot exceed ${XP_VAULT_CONFIG.MAX_DEPOSIT}`);
        }

        // Validate source
        if (!source || typeof source !== 'string') {
            source = 'UNKNOWN';
        }

        try {
            // Use the deposit_xp RPC function (enforces trigger)
            const { data, error } = await this.supabase.client
                .rpc('deposit_xp', {
                    p_user_id: userId,
                    p_amount: amount,
                    p_source: source
                });

            if (error) {
                // Check if this is a permanence violation from the trigger
                if (error.message.includes('LAW 2 VIOLATION')) {
                    this.stats.violationsBlocked++;
                    throw new XPPermanenceViolation(userId, amount, null);
                }
                throw error;
            }

            const result = data?.[0] || data;

            if (result?.success) {
                this.stats.depositsProcessed++;
                this.stats.totalXPDeposited += amount;

                console.log(`💰 XP Deposited: +${amount} to ${userId} from ${source}`);

                return {
                    success: true,
                    userId,
                    depositAmount: amount,
                    newTotal: result.new_total,
                    source,
                    timestamp: new Date().toISOString()
                };
            }

            return {
                success: false,
                userId,
                message: result?.message || 'Deposit failed'
            };

        } catch (error) {
            console.error(`❌ XP Deposit failed for ${userId}:`, error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 VAULT QUERIES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get user's current XP vault balance
     */
    async getBalance(userId) {
        const { data, error } = await this.supabase.client
            .from('xp_vault')
            .select('xp_total, xp_lifetime, deposit_count, last_deposit_at, last_deposit_source')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            // User has no vault yet, return default
            return {
                userId,
                xpTotal: 0,
                xpLifetime: 0,
                depositCount: 0,
                lastDeposit: null,
                exists: false
            };
        }

        return {
            userId,
            xpTotal: data.xp_total,
            xpLifetime: data.xp_lifetime,
            depositCount: data.deposit_count,
            lastDeposit: {
                at: data.last_deposit_at,
                source: data.last_deposit_source
            },
            exists: true
        };
    }

    /**
     * Get XP audit trail for a user
     */
    async getAuditTrail(userId, limit = 50) {
        const { data, error } = await this.supabase.client
            .from('xp_audit_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get global XP leaderboard
     */
    async getLeaderboard(limit = 100) {
        const { data, error } = await this.supabase.client
            .from('xp_leaderboard')
            .select('*')
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🛡️ PERMANENCE VERIFICATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Verify XP permanence is enforced.
     * Attempts a decrease and confirms it's blocked.
     * (Used for testing/validation only)
     */
    async verifyPermanenceEnforced(testUserId) {
        try {
            // Attempt to decrease XP (should fail)
            const { error } = await this.supabase.client
                .from('xp_vault')
                .update({ xp_total: 0 })
                .eq('user_id', testUserId);

            if (error && error.message.includes('LAW 2 VIOLATION')) {
                return {
                    enforced: true,
                    message: 'XP Permanence is correctly enforced',
                    triggerWorking: true
                };
            }

            // If no error, permanence might not be enforced
            return {
                enforced: false,
                message: 'WARNING: XP decrease was not blocked!',
                triggerWorking: false
            };

        } catch (error) {
            if (error.message.includes('LAW 2 VIOLATION')) {
                return {
                    enforced: true,
                    message: 'XP Permanence is correctly enforced',
                    triggerWorking: true
                };
            }
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📈 BATCH OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Batch deposit XP to multiple users
     */
    async batchDeposit(deposits) {
        const results = [];

        for (const { userId, amount, source } of deposits) {
            try {
                const result = await this.deposit(userId, amount, source);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    userId,
                    error: error.message
                });
            }
        }

        return {
            total: deposits.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATISTICS
    // ═══════════════════════════════════════════════════════════════════

    getStats() {
        return {
            ...this.stats,
            avgDepositSize: this.stats.depositsProcessed > 0
                ? Math.round(this.stats.totalXPDeposited / this.stats.depositsProcessed)
                : 0
        };
    }

    resetStats() {
        this.stats = {
            depositsProcessed: 0,
            totalXPDeposited: 0,
            violationsBlocked: 0
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate XP amount (client-side check)
 * Use before calling deposit() for early validation
 */
export function validateXPAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return { valid: false, reason: 'Amount must be a number' };
    }

    if (amount <= 0) {
        return { valid: false, reason: 'LAW 2: XP can only be positive' };
    }

    if (amount < XP_VAULT_CONFIG.MIN_DEPOSIT) {
        return { valid: false, reason: `Minimum deposit is ${XP_VAULT_CONFIG.MIN_DEPOSIT}` };
    }

    if (amount > XP_VAULT_CONFIG.MAX_DEPOSIT) {
        return { valid: false, reason: `Maximum deposit is ${XP_VAULT_CONFIG.MAX_DEPOSIT}` };
    }

    if (!Number.isInteger(amount)) {
        return { valid: false, reason: 'XP must be a whole number' };
    }

    return { valid: true };
}

/**
 * Calculate XP with multiplier (ensures result is always positive)
 */
export function calculateXPWithMultiplier(baseAmount, multiplier) {
    if (baseAmount <= 0) return 0;
    if (multiplier <= 0) return baseAmount;

    return Math.max(1, Math.floor(baseAmount * multiplier));
}
