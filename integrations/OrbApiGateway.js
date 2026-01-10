/**
 * 🧬 IDENTITY_DNA_ENGINE — Orb API Gateway
 * 
 * REST/Event bridge to fetch data from all Orbs.
 * Implements the Orb4.getStats(), Orb8.getStats() functions from schema.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 ORB ENDPOINTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const ORB_ENDPOINTS = {
    ORB_3: {
        name: 'XP_ENGINE',
        baseUrl: process.env.ORB_3_URL || 'http://localhost:3003',
        endpoints: {
            stats: '/api/xp/stats',
            ledger: '/api/xp/ledger'
        }
    },
    ORB_4: {
        name: 'GTO_TRAINING',
        baseUrl: process.env.ORB_4_URL || 'http://localhost:3004',
        endpoints: {
            stats: '/api/training/stats',
            sessions: '/api/training/sessions',
            leaks: '/api/training/leaks'
        }
    },
    ORB_5: {
        name: 'THE_BRAIN',
        baseUrl: process.env.ORB_5_URL || 'http://localhost:3005',
        endpoints: {
            stats: '/api/brain/stats',
            progress: '/api/brain/progress'
        }
    },
    ORB_6: {
        name: 'INTEL_CORE',
        baseUrl: process.env.ORB_6_URL || 'http://localhost:3006',
        endpoints: {
            insights: '/api/intel/insights'
        }
    },
    ORB_7: {
        name: 'DIAMOND_ARCADE',
        baseUrl: process.env.ORB_7_URL || 'http://localhost:3007',
        endpoints: {
            stats: '/api/arcade/stats',
            history: '/api/arcade/history',
            diamonds: '/api/arcade/diamonds'
        }
    },
    ORB_8: {
        name: 'BANKROLL_MANAGER',
        baseUrl: process.env.ORB_8_URL || 'http://localhost:3008',
        endpoints: {
            stats: '/api/bankroll/stats',
            discipline: '/api/bankroll/discipline',
            roi: '/api/bankroll/roi'
        }
    },
    ORB_9: {
        name: 'DISCOVERY_TRUST',
        baseUrl: process.env.ORB_9_URL || 'http://localhost:3009',
        endpoints: {
            trust: '/api/discovery/trust',
            reviews: '/api/discovery/reviews'
        }
    },
    ORB_10: {
        name: 'COMMAND_BRIDGE',
        baseUrl: process.env.ORB_10_URL || 'http://localhost:3010',
        endpoints: {
            badges: '/api/command/badges',
            governance: '/api/command/governance'
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 ORB API GATEWAY CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class OrbApiGateway {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 60000; // 1 minute cache
        this.initialized = false;
    }

    async initialize() {
        console.log('🌐 Initializing Orb API Gateway...');
        this.initialized = true;
        console.log('✅ Orb API Gateway initialized');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 ORB-SPECIFIC STAT GETTERS (From Schema)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get stats from Orb 4 (GTO Training)
     * Implements Orb4.getStats(userId) from schema
     */
    async getOrb4Stats(userId) {
        return this.fetchWithCache('ORB_4', 'stats', userId, async () => {
            const response = await this.fetch('ORB_4', 'stats', { userId });

            return {
                accuracy: response.accuracy || 0,
                evLossAvg: response.evLossAvg || 10,
                gtoCompliance: response.gtoCompliance || 0,
                sessionsCompleted: response.sessionsCompleted || 0,
                leakReduction: response.leakReduction || 0,
                lastSession: response.lastSession,
                totalDecisions: response.totalDecisions || 0
            };
        });
    }

    /**
     * Get stats from Orb 7 (Diamond Arcade)
     */
    async getOrb7Stats(userId) {
        return this.fetchWithCache('ORB_7', 'stats', userId, async () => {
            const response = await this.fetch('ORB_7', 'stats', { userId });

            return {
                winRate: response.winRate || 0,
                streakMax: response.streakMax || 0,
                tieredWins: response.tieredWins || 0,
                clutchPerformance: response.clutchPerformance || 0,
                consistency: response.consistency || 50,
                diamondsEarned: response.diamondsEarned || 0,
                gamesPlayed: response.gamesPlayed || 0
            };
        });
    }

    /**
     * Get stats from Orb 8 (Bankroll Manager)
     * Implements Orb8.getStats(userId) from schema
     */
    async getOrb8Stats(userId) {
        return this.fetchWithCache('ORB_8', 'stats', userId, async () => {
            const response = await this.fetch('ORB_8', 'stats', { userId });

            return {
                roi: response.roi || 0,
                disciplineScore: response.disciplineScore || 50,
                recoveryRate: response.recoveryRate || 0,
                riskManagement: response.riskManagement || 50,
                stopLossAdherence: response.stopLossAdherence || 0,
                totalBankroll: response.totalBankroll || 0
            };
        });
    }

    /**
     * Get stats from Orb 9 (Discovery & Trust)
     */
    async getOrb9Stats(userId) {
        return this.fetchWithCache('ORB_9', 'trust', userId, async () => {
            const response = await this.fetch('ORB_9', 'trust', { userId });

            return {
                trustScore: response.trustScore || 50,
                positiveReviews: response.positiveReviews || 0,
                negativeReviews: response.negativeReviews || 0,
                geoVerified: response.geoVerified || false,
                lastActivity: response.lastActivity
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔧 HTTP UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Fetch from an Orb endpoint
     */
    async fetch(orbId, endpoint, params = {}) {
        const orb = ORB_ENDPOINTS[orbId];
        if (!orb) {
            throw new Error(`Unknown Orb: ${orbId}`);
        }

        const endpointPath = orb.endpoints[endpoint];
        if (!endpointPath) {
            throw new Error(`Unknown endpoint: ${endpoint} for ${orbId}`);
        }

        const url = new URL(endpointPath, orb.baseUrl);

        // Add query params
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.append(key, value);
            }
        });

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Source': 'IDENTITY_DNA_ENGINE'
                },
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Error fetching from ${orbId}/${endpoint}:`, error.message);

            // Return default/fallback data
            return this.getFallbackData(orbId, endpoint);
        }
    }

    /**
     * Fetch with caching
     */
    async fetchWithCache(orbId, endpoint, userId, fetcher) {
        const cacheKey = `${orbId}:${endpoint}:${userId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }

        const data = await fetcher();

        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Get fallback data when Orb is unavailable
     */
    getFallbackData(orbId, endpoint) {
        // Return neutral/default values
        const fallbacks = {
            'ORB_4:stats': {
                accuracy: 0,
                evLossAvg: 10,
                gtoCompliance: 0,
                sessionsCompleted: 0,
                leakReduction: 0
            },
            'ORB_7:stats': {
                winRate: 0,
                streakMax: 0,
                tieredWins: 0,
                clutchPerformance: 0,
                consistency: 50
            },
            'ORB_8:stats': {
                roi: 0,
                disciplineScore: 50,
                recoveryRate: 0,
                riskManagement: 50
            },
            'ORB_9:trust': {
                trustScore: 50,
                positiveReviews: 0,
                negativeReviews: 0,
                geoVerified: false
            }
        };

        return fallbacks[`${orbId}:${endpoint}`] || {};
    }

    /**
     * Clear cache
     */
    clearCache(userId = null) {
        if (userId) {
            // Clear cache for specific user
            for (const key of this.cache.keys()) {
                if (key.endsWith(`:${userId}`)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATUS
    // ═══════════════════════════════════════════════════════════════════

    async ping() {
        // Try to reach at least one Orb
        try {
            await this.fetch('ORB_4', 'stats', { userId: 'health-check' });
            return true;
        } catch {
            return false;
        }
    }

    getStatus() {
        return {
            initialized: this.initialized,
            cacheSize: this.cache.size,
            orbCount: Object.keys(ORB_ENDPOINTS).length
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 LEGACY NAMESPACE EXPORTS (For Schema Compatibility)
// ═══════════════════════════════════════════════════════════════════════════

// Create singleton instance
const gateway = new OrbApiGateway();

export const Orb4 = {
    getStats: (userId) => gateway.getOrb4Stats(userId)
};

export const Orb7 = {
    getStats: (userId) => gateway.getOrb7Stats(userId)
};

export const Orb8 = {
    getStats: (userId) => gateway.getOrb8Stats(userId)
};

export const Orb9 = {
    getStats: (userId) => gateway.getOrb9Stats(userId)
};
