/**
 * 🧬 IDENTITY_DNA_ENGINE — Skill Tier Engine
 * 
 * AI-driven skill tier calculation from Training (Orb 4), 
 * Arcade (Orb 7), and Bankroll (Orb 8) performance.
 * 
 * Implements the AI.calculateTier() function from the schema.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SKILL TIER DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
export const SKILL_TIERS = {
    1: { name: 'BEGINNER', minScore: 0, color: '#808080', icon: '🌱' },
    2: { name: 'APPRENTICE', minScore: 100, color: '#8B4513', icon: '📘' },
    3: { name: 'BRONZE', minScore: 250, color: '#CD7F32', icon: '🥉' },
    4: { name: 'SILVER', minScore: 500, color: '#C0C0C0', icon: '🥈' },
    5: { name: 'GOLD', minScore: 800, color: '#FFD700', icon: '🥇' },
    6: { name: 'PLATINUM', minScore: 1200, color: '#E5E4E2', icon: '💎' },
    7: { name: 'DIAMOND', minScore: 1700, color: '#00BFFF', icon: '💠' },
    8: { name: 'ELITE', minScore: 2300, color: '#FF4500', icon: '🔥' },
    9: { name: 'MASTER', minScore: 3000, color: '#9400D3', icon: '👑' },
    10: { name: 'LEGEND', minScore: 4000, color: '#FF1493', icon: '🌟' }
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 STAT WEIGHTS FOR TIER CALCULATION
// ═══════════════════════════════════════════════════════════════════════════
const TIER_WEIGHTS = {
    // From Training (Orb 4) - 40% weight
    training: {
        weight: 0.40,
        metrics: {
            accuracy: 0.30,          // Overall decision accuracy
            evLossAvg: 0.25,         // Average EV loss (lower = better)
            gtoCompliance: 0.20,     // GTO adherence rate
            sessionsCompleted: 0.15, // Training volume
            leakReduction: 0.10      // Improvement in leak areas
        }
    },

    // From Arcade (Orb 7) - 35% weight
    arcade: {
        weight: 0.35,
        metrics: {
            winRate: 0.30,           // Diamond Arcade win rate
            streakMax: 0.20,         // Longest winning streak
            tieredWins: 0.25,        // Performance in skill-tiered games
            clutchPerformance: 0.15, // Performance under pressure
            consistency: 0.10        // Variance in performance
        }
    },

    // From Bankroll (Orb 8) - 25% weight
    bankroll: {
        weight: 0.25,
        metrics: {
            roi: 0.35,               // Return on investment
            disciplineScore: 0.30,   // Stop-loss adherence, bankroll management
            recoveryRate: 0.20,      // Recovery from downswings
            riskManagement: 0.15     // Appropriate stake selection
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 SKILL TIER ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class SkillTierEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.tierHistory = new Map(); // Cache recent calculations
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 MAIN TIER CALCULATION (AI.calculateTier)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Calculate skill tier based on cross-orb performance data
     * This implements the AI.calculateTier() function from the schema
     * 
     * @param {Object} stats - Stats from multiple orbs
     * @param {Object} stats.training - Stats from Orb 4
     * @param {Object} stats.arcade - Stats from Orb 7
     * @param {Object} stats.bankroll - Stats from Orb 8
     * @returns {number} Skill tier (1-10)
     */
    async calculateTier(stats) {
        const { training, arcade, bankroll } = stats;

        // Calculate component scores
        const trainingScore = this.calculateTrainingScore(training);
        const arcadeScore = this.calculateArcadeScore(arcade);
        const bankrollScore = this.calculateBankrollScore(bankroll);

        // Apply weights
        const weightedScore =
            (trainingScore * TIER_WEIGHTS.training.weight) +
            (arcadeScore * TIER_WEIGHTS.arcade.weight) +
            (bankrollScore * TIER_WEIGHTS.bankroll.weight);

        // Normalize to 0-4000 scale
        const normalizedScore = Math.min(4000, Math.max(0, weightedScore * 40));

        // Determine tier from score
        const tier = this.scoreToTier(normalizedScore);

        // Apply stability check (prevents rapid tier oscillation)
        const stabilizedTier = await this.applyStabilization(tier, stats);

        return stabilizedTier;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 COMPONENT SCORE CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Calculate score from Training (Orb 4) stats
     */
    calculateTrainingScore(training) {
        if (!training) return 0;

        const weights = TIER_WEIGHTS.training.metrics;
        let score = 0;

        // Accuracy (0-100%) → 0-100 points
        if (training.accuracy !== undefined) {
            score += (training.accuracy / 100) * 100 * weights.accuracy;
        }

        // EV Loss (lower is better: 0bb = 100 points, 10+bb = 0 points)
        if (training.evLossAvg !== undefined) {
            const evScore = Math.max(0, 100 - (training.evLossAvg * 10));
            score += evScore * weights.evLossAvg;
        }

        // GTO Compliance (0-100%)
        if (training.gtoCompliance !== undefined) {
            score += (training.gtoCompliance / 100) * 100 * weights.gtoCompliance;
        }

        // Sessions Completed (diminishing returns after 100)
        if (training.sessionsCompleted !== undefined) {
            const sessionScore = Math.min(100, training.sessionsCompleted);
            score += sessionScore * weights.sessionsCompleted;
        }

        // Leak Reduction (improvement %)
        if (training.leakReduction !== undefined) {
            score += Math.min(100, training.leakReduction) * weights.leakReduction;
        }

        return score;
    }

    /**
     * Calculate score from Arcade (Orb 7) stats
     */
    calculateArcadeScore(arcade) {
        if (!arcade) return 0;

        const weights = TIER_WEIGHTS.arcade.metrics;
        let score = 0;

        // Win Rate (0-100%)
        if (arcade.winRate !== undefined) {
            score += (arcade.winRate / 100) * 100 * weights.winRate;
        }

        // Max Streak (capped at 50 for 100 points)
        if (arcade.streakMax !== undefined) {
            const streakScore = Math.min(100, arcade.streakMax * 2);
            score += streakScore * weights.streakMax;
        }

        // Tiered Wins (performance in skill-matched games)
        if (arcade.tieredWins !== undefined) {
            const tieredScore = Math.min(100, arcade.tieredWins / 10);
            score += tieredScore * weights.tieredWins;
        }

        // Clutch Performance (high-pressure decisions)
        if (arcade.clutchPerformance !== undefined) {
            score += (arcade.clutchPerformance / 100) * 100 * weights.clutchPerformance;
        }

        // Consistency (lower variance = higher score)
        if (arcade.consistency !== undefined) {
            score += (arcade.consistency / 100) * 100 * weights.consistency;
        }

        return score;
    }

    /**
     * Calculate score from Bankroll (Orb 8) stats
     */
    calculateBankrollScore(bankroll) {
        if (!bankroll) return 0;

        const weights = TIER_WEIGHTS.bankroll.metrics;
        let score = 0;

        // ROI (capped at 100% for full points)
        if (bankroll.roi !== undefined) {
            const roiScore = Math.min(100, Math.max(0, bankroll.roi));
            score += roiScore * weights.roi;
        }

        // Discipline Score (0-100)
        if (bankroll.disciplineScore !== undefined) {
            score += (bankroll.disciplineScore / 100) * 100 * weights.disciplineScore;
        }

        // Recovery Rate (ability to recover from downswings)
        if (bankroll.recoveryRate !== undefined) {
            score += (bankroll.recoveryRate / 100) * 100 * weights.recoveryRate;
        }

        // Risk Management (appropriate stake selection)
        if (bankroll.riskManagement !== undefined) {
            score += (bankroll.riskManagement / 100) * 100 * weights.riskManagement;
        }

        return score;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 TIER DETERMINATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Convert weighted score to tier
     */
    scoreToTier(score) {
        for (let tier = 10; tier >= 1; tier--) {
            if (score >= SKILL_TIERS[tier].minScore) {
                return tier;
            }
        }
        return 1;
    }

    /**
     * Get tier info by tier number
     */
    getTierInfo(tier) {
        return SKILL_TIERS[tier] || SKILL_TIERS[1];
    }

    /**
     * Get tier name from tier number
     */
    getTierName(tier) {
        return SKILL_TIERS[tier]?.name || 'UNKNOWN';
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔒 TIER STABILIZATION (Prevent Oscillation)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Apply tier stabilization to prevent rapid tier changes
     * Requires consistent performance for promotion/demotion
     */
    async applyStabilization(newTier, stats) {
        const userId = stats.userId;
        if (!userId) return newTier;

        // Get current profile
        const profile = await this.getCurrentProfile(userId);
        if (!profile) return newTier;

        const currentTier = profile.skill_tier || 1;
        const tierDiff = newTier - currentTier;

        // No change needed
        if (tierDiff === 0) return currentTier;

        // Check stabilization history
        const history = this.tierHistory.get(userId) || [];
        history.push({ tier: newTier, timestamp: Date.now() });

        // Keep only last 5 calculations
        const recentHistory = history.slice(-5);
        this.tierHistory.set(userId, recentHistory);

        // Require 3 consistent calculations for tier change
        const consistentCount = recentHistory.filter(h => {
            return tierDiff > 0
                ? h.tier >= newTier  // For promotion
                : h.tier <= newTier; // For demotion
        }).length;

        if (consistentCount >= 3) {
            return newTier; // Tier change confirmed
        }

        return currentTier; // Stay at current tier
    }

    /**
     * Get current profile (for stabilization check)
     */
    async getCurrentProfile(userId) {
        try {
            const { data } = await this.supabase.client
                .from('profiles')
                .select('skill_tier')
                .eq('id', userId)
                .maybeSingle();
            return data;
        } catch {
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📈 TIER PROGRESS TRACKING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Calculate progress to next tier
     */
    calculateProgressToNextTier(currentTier, stats) {
        if (currentTier >= 10) {
            return { progress: 100, pointsNeeded: 0, nextTier: null };
        }

        const currentMinScore = SKILL_TIERS[currentTier].minScore;
        const nextMinScore = SKILL_TIERS[currentTier + 1].minScore;

        // Calculate current weighted score
        const trainingScore = this.calculateTrainingScore(stats.training);
        const arcadeScore = this.calculateArcadeScore(stats.arcade);
        const bankrollScore = this.calculateBankrollScore(stats.bankroll);

        const weightedScore =
            (trainingScore * TIER_WEIGHTS.training.weight) +
            (arcadeScore * TIER_WEIGHTS.arcade.weight) +
            (bankrollScore * TIER_WEIGHTS.bankroll.weight);

        const normalizedScore = Math.min(4000, Math.max(0, weightedScore * 40));

        const range = nextMinScore - currentMinScore;
        const progress = Math.min(100, Math.max(0,
            ((normalizedScore - currentMinScore) / range) * 100
        ));

        return {
            progress: Math.round(progress),
            currentScore: Math.round(normalizedScore),
            pointsNeeded: Math.max(0, nextMinScore - normalizedScore),
            nextTier: SKILL_TIERS[currentTier + 1]
        };
    }
}

// Export the AI namespace for schema compatibility
export const AI = {
    calculateTier: async (stats) => {
        const engine = new SkillTierEngine(null);
        return engine.calculateTier(stats);
    }
};
