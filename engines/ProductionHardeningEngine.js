/**
 * 🛡️ IDENTITY_DNA_ENGINE — Production Hardening Engine (Prompts 22-24)
 * 
 * @task_22: XP_PERMANENCE_FINAL_SHIELD
 * @task_23: HOLOGRAPHIC_RADAR_FINAL_SYNC
 * @task_24: STREAK_FIRE_ORACLE_SEAL
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ TASK 22: IMMUTABILITY VAULT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Blacklist Entry
 */
export class BlacklistEntry {
    constructor(data) {
        this.id = data.id;
        this.sourceIdentifier = data.source_identifier;
        this.sourceType = data.source_type;
        this.reason = data.reason;
        this.violationCount = data.violation_count || 1;
        this.isPermanent = data.is_permanent || false;
        this.autoUnblockAt = data.auto_unblock_at;
    }

    isActive() {
        if (this.isPermanent) return true;
        if (this.autoUnblockAt && new Date(this.autoUnblockAt) > new Date()) return true;
        return false;
    }
}

/**
 * Immutability Vault
 * Auto-blacklists any external API attempting to subtract XP
 */
export class ImmutabilityVault {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.localBlacklist = new Map();
    }

    /**
     * Check if a source is blacklisted
     */
    async isBlacklisted(sourceId) {
        // Check local cache first
        if (this.localBlacklist.has(sourceId)) {
            const entry = this.localBlacklist.get(sourceId);
            if (entry.isActive()) return true;
        }

        // Check database
        const { data, error } = await this.supabase.client
            .rpc('fn_is_source_blacklisted', { p_source_id: sourceId });

        if (error) {
            console.error('Blacklist check error:', error);
            return false;
        }

        return data;
    }

    /**
     * Validate XP change request
     * Returns { allowed, reason, blacklisted }
     */
    async validateXPChange(sourceId, oldXP, newXP) {
        // Rule 1: XP cannot decrease
        if (newXP < oldXP) {
            // Auto-blacklist the source
            await this.blacklistSource(sourceId, 'API_KEY', 'Attempted XP decrease');

            return {
                allowed: false,
                reason: 'XP_DECREASE_BLOCKED',
                blacklisted: true,
                message: `Source ${sourceId} has been auto-blacklisted for attempting XP decrease`
            };
        }

        // Rule 2: Check if source is already blacklisted
        if (await this.isBlacklisted(sourceId)) {
            return {
                allowed: false,
                reason: 'SOURCE_BLACKLISTED',
                blacklisted: true,
                message: 'This source is blacklisted and cannot modify XP'
            };
        }

        return { allowed: true, reason: null, blacklisted: false };
    }

    /**
     * Add source to blacklist
     */
    async blacklistSource(sourceId, sourceType, reason) {
        const { data, error } = await this.supabase.client
            .rpc('fn_auto_blacklist_xp_violator', {
                p_source_identifier: sourceId,
                p_source_type: sourceType,
                p_reason: reason,
                p_metadata: {}
            });

        if (error) {
            console.error('Blacklist error:', error);
            return null;
        }

        // Update local cache
        this.localBlacklist.set(sourceId, new BlacklistEntry({
            source_identifier: sourceId,
            source_type: sourceType,
            reason,
            violation_count: 1
        }));

        return data;
    }

    /**
     * Get violation log for a source
     */
    async getViolationLog(sourceId) {
        const { data, error } = await this.supabase.client
            .from('immutability_vault')
            .select('*')
            .eq('source_identifier', sourceId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Violation log error:', error);
            return [];
        }

        return data || [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡️ TASK 23: SUB-10MS RADAR EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DNA Visual Export Client
 * Optimized for sub-10ms delivery to Social Shell UI
 */
export class DNAVisualExport {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.cache = new Map();
        this.cacheExpiry = 5000; // 5 second cache
    }

    /**
     * Get visual export (sub-10ms with cache)
     */
    async getVisualExport(userId) {
        // Check cache
        const cached = this.cache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        // Fetch from optimized function
        const { data, error } = await this.supabase.client
            .rpc('dna_visual_export', { p_user_id: userId });

        if (error) {
            console.error('Visual export error:', error);
            return null;
        }

        // Update cache
        this.cache.set(userId, { data, timestamp: Date.now() });

        return data;
    }

    /**
     * Parse compact radar format
     */
    static parseRadarArray(radarArray) {
        if (!Array.isArray(radarArray) || radarArray.length !== 5) {
            return null;
        }

        return {
            accuracy: radarArray[0],
            grit: radarArray[1],
            aggression: radarArray[2],
            wealth: radarArray[3],
            luck: radarArray[4]
        };
    }

    /**
     * Expand compact export to full format
     */
    static expandExport(compact) {
        if (!compact || compact.error) return null;

        const radar = this.parseRadarArray(compact.r);

        return {
            userId: compact.u,
            username: compact.n,
            tierId: compact.t,
            flameState: compact.f,
            xpTotal: compact.xp,
            level: compact.lv,
            streak: compact.sk,
            radar,
            tierColor: compact.c,
            flameColor: compact.fc,
            version: compact.v,
            timestamp: compact.ts
        };
    }

    /**
     * Invalidate user cache
     */
    invalidateCache(userId) {
        this.cache.delete(userId);
    }

    /**
     * Refresh materialized view
     */
    async refreshCache() {
        const { error } = await this.supabase.client
            .rpc('fn_refresh_dna_radar_cache');

        if (error) {
            console.error('Cache refresh error:', error);
            return false;
        }

        // Clear local cache
        this.cache.clear();
        return true;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 TASK 24: STREAK FIRE ORACLE SEAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Flame State Configuration
 */
export const FLAME_STATES = {
    NONE: { state: 'NONE', color: null, glow: null, intensity: 0, minDays: 0 },
    BLUE_STARTER: { state: 'BLUE_STARTER', color: '#1E90FF', glow: '#00BFFF', intensity: 0.3, minDays: 3 },
    ORANGE_ROARING: { state: 'ORANGE_ROARING', color: '#FF4500', glow: '#FFA500', intensity: 0.7, minDays: 7 },
    PURPLE_INFERNO: { state: 'PURPLE_INFERNO', color: '#8B00FF', glow: '#FF1493', intensity: 1.0, minDays: 30 }
};

/**
 * Streak Fire Oracle
 * Maps flame states directly to profile for YELLOW/ORANGE silo access
 */
export class StreakFireOracle {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get flame state from streak count
     */
    static getFlameState(streakDays) {
        if (streakDays >= 30) return FLAME_STATES.PURPLE_INFERNO;
        if (streakDays >= 7) return FLAME_STATES.ORANGE_ROARING;
        if (streakDays >= 3) return FLAME_STATES.BLUE_STARTER;
        return FLAME_STATES.NONE;
    }

    /**
     * Get multiplier for streak
     */
    static getMultiplier(streakDays) {
        if (streakDays >= 7) return 2.0;
        if (streakDays >= 3) return 1.5;
        return 1.0;
    }

    /**
     * Get complete fire metadata
     */
    async getFireMetadata(userId) {
        const { data, error } = await this.supabase.client
            .rpc('get_streak_fire_metadata', { p_user_id: userId });

        if (error) {
            console.error('Fire metadata error:', error);
            return null;
        }

        return data;
    }

    /**
     * Get all flame states for batch rendering
     */
    async getAllFlameStates() {
        const { data, error } = await this.supabase.client
            .from('v_flame_states')
            .select('*');

        if (error) {
            console.error('Flame states fetch error:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Build flame payload for UI rendering
     */
    static buildFlamePayload(streakDays) {
        const flame = this.getFlameState(streakDays);
        const multiplier = this.getMultiplier(streakDays);

        // Calculate progression
        let daysToNext = null;
        let nextFlame = null;

        if (streakDays < 3) {
            daysToNext = 3 - streakDays;
            nextFlame = 'BLUE_STARTER';
        } else if (streakDays < 7) {
            daysToNext = 7 - streakDays;
            nextFlame = 'ORANGE_ROARING';
        } else if (streakDays < 30) {
            daysToNext = 30 - streakDays;
            nextFlame = 'PURPLE_INFERNO';
        }

        return {
            streak: streakDays,
            flame: {
                state: flame.state,
                color: flame.color,
                glow: flame.glow,
                intensity: flame.intensity
            },
            multiplier,
            progression: {
                daysToNext,
                nextFlame,
                atMax: daysToNext === null
            },
            siloAccess: {
                yellowMultiplier: multiplier,
                orangeVisual: flame.state,
                readOnly: true
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ PRODUCTION HARDENING ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class ProductionHardeningEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.vault = new ImmutabilityVault(supabaseClient);
        this.visualExport = new DNAVisualExport(supabaseClient);
        this.fireOracle = new StreakFireOracle(supabaseClient);
    }

    /**
     * Get production hardening status
     */
    async getStatus() {
        const { data, error } = await this.supabase.client
            .from('v_production_hardening_status')
            .select('*');

        if (error) {
            console.error('Status error:', error);
        }

        return {
            version: 'PRODUCTION_V1',
            components: data || [],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validate and process XP change
     */
    async processXPChange(sourceId, userId, oldXP, newXP) {
        // Validate through vault
        const validation = await this.vault.validateXPChange(sourceId, oldXP, newXP);

        if (!validation.allowed) {
            return {
                success: false,
                ...validation
            };
        }

        // If allowed, invalidate visual cache
        this.visualExport.invalidateCache(userId);

        return {
            success: true,
            allowed: true
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    ProductionHardeningEngine,
    ImmutabilityVault,
    BlacklistEntry,
    DNAVisualExport,
    StreakFireOracle,
    FLAME_STATES
};
