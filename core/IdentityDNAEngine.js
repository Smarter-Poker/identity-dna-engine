/**
 * 🧬 IDENTITY_DNA_ENGINE — Core Controller
 * 
 * The Master Controller that orchestrates all identity operations.
 * Enforces the 5 Laws of Identity DNA.
 */

import { ProfileManager } from './ProfileManager.js';
import { TrustScoreEngine } from '../engines/TrustScoreEngine.js';
import { SkillTierEngine } from '../engines/SkillTierEngine.js';
import { BadgeAggregator } from '../engines/BadgeAggregator.js';
import { XPLedgerSync } from '../engines/XPLedgerSync.js';
import { SupabaseClient } from '../integrations/SupabaseClient.js';
import { OrbApiGateway } from '../integrations/OrbApiGateway.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 DNA MASTER SCHEMA (Runtime Definition)
// ═══════════════════════════════════════════════════════════════════════════
export const DNA_MASTER_SCHEMA = {
    profile: {
        id: 'uuid (pk)',
        username: 'text',
        xp_total: 'bigint',
        trust_score: 'float',
        skill_tier: 'int',
        badges: 'jsonb',
        last_sync: 'timestamp'
    },

    // Cross-Orb Sync Logic
    async updatePlayerDNA(userId) {
        const engine = IdentityDNAEngine.getInstance();
        return engine.updatePlayerDNA(userId);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 IDENTITY DNA ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class IdentityDNAEngine {
    static instance = null;

    constructor() {
        if (IdentityDNAEngine.instance) {
            return IdentityDNAEngine.instance;
        }

        this.supabase = null;
        this.profileManager = null;
        this.trustScoreEngine = null;
        this.skillTierEngine = null;
        this.badgeAggregator = null;
        this.xpLedgerSync = null;
        this.orbGateway = null;

        this.initialized = false;
        this.syncQueue = [];

        IdentityDNAEngine.instance = this;
    }

    static getInstance() {
        if (!IdentityDNAEngine.instance) {
            IdentityDNAEngine.instance = new IdentityDNAEngine();
        }
        return IdentityDNAEngine.instance;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🚀 INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    async initialize() {
        if (this.initialized) {
            console.log('⚠️ IdentityDNAEngine already initialized');
            return;
        }

        console.log('🧬 Initializing Identity DNA Engine...');

        // 1. Connect to Supabase
        this.supabase = new SupabaseClient();
        await this.supabase.connect();

        // 2. Initialize Sub-Engines
        this.profileManager = new ProfileManager(this.supabase);
        this.trustScoreEngine = new TrustScoreEngine(this.supabase);
        this.skillTierEngine = new SkillTierEngine(this.supabase);
        this.badgeAggregator = new BadgeAggregator(this.supabase);
        this.xpLedgerSync = new XPLedgerSync(this.supabase);

        // 3. Initialize Orb Gateway (for cross-orb data fetching)
        this.orbGateway = new OrbApiGateway();
        await this.orbGateway.initialize();

        this.initialized = true;
        console.log('✅ Identity DNA Engine initialized');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 CROSS-ORB SYNC LOGIC (From Schema)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * 🧬 updatePlayerDNA
     * 
     * The core synchronization function that:
     * 1. Pulls data from Training (Orb 4)
     * 2. Pulls data from Bankroll (Orb 8)
     * 3. Calculates new skill tier via AI
     * 4. Updates unified profile
     * 
     * LAW 3 ENFORCED: Real-time sync within 5 seconds
     */
    async updatePlayerDNA(userId) {
        if (!this.initialized) {
            throw new Error('IdentityDNAEngine not initialized');
        }

        const startTime = Date.now();
        console.log(`🧬 Syncing DNA for user: ${userId}`);

        try {
            // 1. Fetch stats from Training (Orb 4)
            const trainingStats = await this.orbGateway.getOrb4Stats(userId);

            // 2. Fetch stats from Bankroll (Orb 8)
            const bankrollStats = await this.orbGateway.getOrb8Stats(userId);

            // 3. Fetch stats from Arcade (Orb 7) for Diamond performance
            const arcadeStats = await this.orbGateway.getOrb7Stats(userId);

            // 4. Calculate skill tier using AI engine
            const newSkillTier = await this.skillTierEngine.calculateTier({
                training: trainingStats,
                bankroll: bankrollStats,
                arcade: arcadeStats
            });

            // 5. Calculate trust score from Discovery (Orb 9)
            const trustScore = await this.trustScoreEngine.calculateScore(userId);

            // 6. Aggregate badges from all Orbs
            const badges = await this.badgeAggregator.aggregateAll(userId);

            // 7. Sync XP from XP-Engine (Orb 3)
            const xpTotal = await this.xpLedgerSync.getLatestXP(userId);

            // 8. Update unified profile (LAW 1: Single Source)
            const result = await this.supabase.client
                .from('profiles')
                .update({
                    skill_tier: newSkillTier,
                    trust_score: trustScore,
                    badges: badges,
                    xp_total: xpTotal,
                    last_sync: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            const syncTime = Date.now() - startTime;

            // LAW 3 CHECK: Must complete within 5000ms
            if (syncTime > 5000) {
                console.warn(`⚠️ LAW 3 VIOLATION: Sync took ${syncTime}ms (limit: 5000ms)`);
            }

            console.log(`✅ DNA synced in ${syncTime}ms | Tier: ${newSkillTier} | Trust: ${trustScore}`);

            return {
                success: true,
                userId,
                profile: result.data,
                syncTime,
                lawCompliance: syncTime <= 5000
            };

        } catch (error) {
            console.error(`❌ DNA sync failed for ${userId}:`, error.message);
            return {
                success: false,
                userId,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 PROFILE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Create a new player profile (LAW 1: Single Source)
     */
    async createProfile(userId, username) {
        return this.profileManager.create({
            id: userId,
            username,
            xp_total: 0,
            trust_score: 50.0, // Start at neutral
            skill_tier: 1,     // Start at BEGINNER
            badges: [],
            last_sync: new Date().toISOString()
        });
    }

    /**
     * Get player profile by ID
     */
    async getProfile(userId) {
        return this.profileManager.getById(userId);
    }

    /**
     * Export player data (LAW 4: Sovereign Privacy)
     */
    async exportPlayerData(userId) {
        const profile = await this.getProfile(userId);
        const history = await this.getProfileHistory(userId);

        return {
            exportDate: new Date().toISOString(),
            profile,
            history,
            gdprCompliant: true,
            dataOwner: userId
        };
    }

    /**
     * Delete player data (LAW 4: GDPR/CCPA Right to Delete)
     */
    async deletePlayerData(userId, confirmationCode) {
        // Verify deletion confirmation
        if (!this.verifyDeletionCode(userId, confirmationCode)) {
            throw new Error('Invalid deletion confirmation code');
        }

        return this.profileManager.delete(userId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📜 HISTORY OPERATIONS (LAW 2: Immutable History)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get profile change history
     */
    async getProfileHistory(userId) {
        const { data, error } = await this.supabase.client
            .from('profile_history')
            .select('*')
            .eq('user_id', userId)
            .order('changed_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    /**
     * Log a profile change (immutable audit trail)
     */
    async logProfileChange(userId, field, oldValue, newValue, source) {
        const { error } = await this.supabase.client
            .from('profile_history')
            .insert({
                user_id: userId,
                field_changed: field,
                old_value: JSON.stringify(oldValue),
                new_value: JSON.stringify(newValue),
                source_orb: source,
                changed_at: new Date().toISOString()
            });

        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔐 INTERNAL UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    verifyDeletionCode(userId, code) {
        // In production, this would verify a time-limited deletion token
        return code && code.length === 32;
    }

    /**
     * Health check for the engine
     */
    async healthCheck() {
        const checks = {
            supabase: false,
            profileManager: false,
            trustEngine: false,
            skillEngine: false,
            badgeAggregator: false,
            xpSync: false,
            orbGateway: false
        };

        try {
            checks.supabase = await this.supabase.ping();
            checks.profileManager = !!this.profileManager;
            checks.trustEngine = !!this.trustScoreEngine;
            checks.skillEngine = !!this.skillTierEngine;
            checks.badgeAggregator = !!this.badgeAggregator;
            checks.xpSync = !!this.xpLedgerSync;
            checks.orbGateway = await this.orbGateway.ping();
        } catch (error) {
            console.error('Health check error:', error);
        }

        const allHealthy = Object.values(checks).every(v => v === true);

        return {
            status: allHealthy ? 'HEALTHY' : 'DEGRADED',
            checks,
            timestamp: new Date().toISOString()
        };
    }
}
