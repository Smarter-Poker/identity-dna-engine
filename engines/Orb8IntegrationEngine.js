/**
 * 🏦 IDENTITY_DNA_ENGINE — Orb 8 Bankroll Manager Integration
 * 
 * @task_41: BANKROLL_DNA_INTEGRATION
 * @task_42: XP_PERMANENCE_VERIFICATION
 * @task_43: ORB_LOG_HOOK
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 TASK 41: BANKROLL DNA INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

export class BankrollDNAIntegration {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.orbId = 8;
        this.orbName = 'BANKROLL_MANAGER';
    }

    /**
     * Get DNA profile for bankroll operations
     */
    async getDNAProfile(userId) {
        const { data, error } = await this.supabase.client
            .rpc('fn_get_bankroll_dna_profile', { p_user_id: userId });

        return error ? null : data;
    }

    /**
     * Get user DNA from view
     */
    async getUserDNA(userId) {
        const { data, error } = await this.supabase.client
            .from('user_dna_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        return error ? null : data;
    }

    /**
     * Calculate risk tolerance from DNA
     */
    static calculateRiskTolerance(aggression) {
        if (aggression > 0.7) return 'HIGH';
        if (aggression > 0.4) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Check high-stakes access
     */
    async checkHighStakesAccess(userId) {
        const dna = await this.getUserDNA(userId);
        return dna?.is_pro_verified || false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ TASK 42: XP PERMANENCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export class XPProtectionVerifier {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Verify XP protection status
     */
    async verifyProtectionStatus() {
        const { data, error } = await this.supabase.client
            .rpc('fn_verify_xp_protection_status');

        return error ? { verified_at: new Date(), protection_status: 'UNKNOWN' } : data;
    }

    /**
     * Validate XP change (local check)
     */
    validateXPChange(currentXP, proposedXP) {
        if (proposedXP < currentXP) {
            return {
                valid: false,
                blocked: true,
                reason: 'XP_DECREASE_NOT_ALLOWED',
                message: `Cannot decrease XP from ${currentXP} to ${proposedXP}`
            };
        }
        return { valid: true, blocked: false };
    }

    /**
     * Ensure session XP is non-negative
     */
    sanitizeSessionXP(xpEarned) {
        return Math.max(0, xpEarned);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📒 TASK 43: ORB LOG HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Activity Types
 */
export const ACTIVITY_TYPES = {
    BUY_IN: 'BUY_IN',
    CASH_OUT: 'CASH_OUT',
    REBUY: 'REBUY',
    ADD_ON: 'ADD_ON',
    TIP: 'TIP'
};

/**
 * Session Types
 */
export const SESSION_TYPES = {
    CASH: 'CASH',
    TOURNAMENT: 'TOURNAMENT',
    SIT_N_GO: 'SIT_N_GO',
    SPIN: 'SPIN',
    OTHER: 'OTHER'
};

export class OrbActivityLogger {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.orbId = 8;
        this.orbName = 'BANKROLL_MANAGER';
    }

    /**
     * Log buy-in activity
     */
    async logBuyIn(userId, sessionId, amount, metadata = {}) {
        const { data, error } = await this.supabase.client
            .from('orb_activity_ledger')
            .insert({
                user_id: userId,
                orb_id: this.orbId,
                orb_name: this.orbName,
                activity_type: ACTIVITY_TYPES.BUY_IN,
                amount,
                reference_id: sessionId,
                reference_table: 'bankroll_sessions',
                metadata
            })
            .select()
            .single();

        return error ? null : data;
    }

    /**
     * Log cash-out activity
     */
    async logCashOut(userId, sessionId, amount, xpAwarded = 0, metadata = {}) {
        const { data, error } = await this.supabase.client
            .from('orb_activity_ledger')
            .insert({
                user_id: userId,
                orb_id: this.orbId,
                orb_name: this.orbName,
                activity_type: ACTIVITY_TYPES.CASH_OUT,
                amount,
                xp_awarded: xpAwarded,
                reference_id: sessionId,
                reference_table: 'bankroll_sessions',
                metadata
            })
            .select()
            .single();

        return error ? null : data;
    }

    /**
     * Get activity summary
     */
    async getActivitySummary(userId, days = 30) {
        const { data, error } = await this.supabase.client
            .rpc('fn_get_bankroll_activity_summary', { p_user_id: userId, p_days: days });

        return error ? null : data;
    }

    /**
     * Get recent activities
     */
    async getRecentActivities(userId, limit = 50) {
        const { data, error } = await this.supabase.client
            .from('orb_activity_ledger')
            .select('*')
            .eq('user_id', userId)
            .eq('orb_id', this.orbId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return error ? [] : (data || []);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏦 ORB 8 INTEGRATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class Orb8IntegrationEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.dna = new BankrollDNAIntegration(supabaseClient);
        this.xpProtection = new XPProtectionVerifier(supabaseClient);
        this.activityLogger = new OrbActivityLogger(supabaseClient);
    }

    /**
     * Create bankroll session with full integration
     */
    async createSession(userId, sessionData) {
        // Get DNA profile for risk assessment
        const dna = await this.dna.getDNAProfile(userId);

        // Create session
        const { data: session, error } = await this.supabase.client
            .from('bankroll_sessions')
            .insert({
                user_id: userId,
                session_type: sessionData.type || 'CASH',
                venue_type: sessionData.venue || 'ONLINE',
                game_type: sessionData.game,
                stakes: sessionData.stakes,
                buy_in: sessionData.buyIn,
                metadata: {
                    dna_profile: dna,
                    risk_tolerance: dna?.risk_profile?.risk_tolerance
                }
            })
            .select()
            .single();

        // Activity logging happens via trigger
        return error ? null : session;
    }

    /**
     * Close session with cash-out
     */
    async closeSession(sessionId, cashOut, xpEarned = 0) {
        // Sanitize XP (ensure non-negative)
        const safeXP = this.xpProtection.sanitizeSessionXP(xpEarned);

        const { data, error } = await this.supabase.client
            .from('bankroll_sessions')
            .update({
                cash_out: cashOut,
                session_end: new Date().toISOString(),
                xp_earned: safeXP
            })
            .eq('id', sessionId)
            .select()
            .single();

        // Activity logging happens via trigger
        return error ? null : data;
    }

    /**
     * Get integration status
     */
    async getIntegrationStatus() {
        const { data } = await this.supabase.client
            .from('v_orb8_integration_status')
            .select('*');

        return {
            orb: 8,
            name: 'BANKROLL_MANAGER',
            status: 'INTEGRATED',
            components: data || [],
            timestamp: new Date().toISOString()
        };
    }
}

export default {
    Orb8IntegrationEngine,
    BankrollDNAIntegration,
    XPProtectionVerifier,
    OrbActivityLogger,
    ACTIVITY_TYPES,
    SESSION_TYPES
};
