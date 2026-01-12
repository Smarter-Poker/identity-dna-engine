/**
 * 🧬 ORB 01: SOCIAL — IDENTITY DNA
 * src/orbs/Social/IdentityDNA.js
 * 
 * The immutable DNA object defining the 5 core player identity traits.
 * These traits form the holographic pentagon radar visualization.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 THE FIVE PILLARS OF IDENTITY DNA
// ═══════════════════════════════════════════════════════════════════════════

export const DNA_TRAITS = Object.freeze({
    Grit: Object.freeze({
        key: 'Grit',
        label: 'Grit',
        shortLabel: 'GRT',
        color: '#32CD32',      // Lime Green - Persistence
        weight: 0.20,
        min: 0,
        max: 1,
        description: 'Persistence and resilience derived from streaks and consistency'
    }),

    Accuracy: Object.freeze({
        key: 'Accuracy',
        label: 'Accuracy',
        shortLabel: 'ACC',
        color: '#00BFFF',      // Deep Sky Blue - Precision
        weight: 0.30,
        min: 0,
        max: 1,
        description: 'GTO compliance and decision accuracy from training drills'
    }),

    Aggression: Object.freeze({
        key: 'Aggression',
        label: 'Aggression',
        shortLabel: 'AGG',
        color: '#FF4500',      // Orange Red - Intensity
        weight: 0.15,
        min: 0,
        max: 1,
        description: 'Playstyle intensity and betting frequency patterns'
    }),

    Wealth: Object.freeze({
        key: 'Wealth',
        label: 'Wealth',
        shortLabel: 'WLT',
        color: '#FFD700',      // Gold - Economic Status
        weight: 0.20,
        min: 0,
        max: 1,
        description: 'Economic health, bankroll management, and virtual currency status'
    }),

    Rep: Object.freeze({
        key: 'Rep',
        label: 'Reputation',
        shortLabel: 'REP',
        color: '#FF1493',      // Deep Pink - Social Standing
        weight: 0.15,
        min: 0,
        max: 1,
        description: 'Social reputation, trust score, and community standing'
    })
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 DNA TIER CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const DNATier = Object.freeze({
    BEGINNER: 'BEGINNER',
    BRONZE: 'BRONZE',
    SILVER: 'SILVER',
    GOLD: 'GOLD',
    PLATINUM: 'PLATINUM',
    DIAMOND: 'DIAMOND',
    GTO_MASTER: 'GTO_MASTER',
    LEGEND: 'LEGEND'
});

export const DNA_TIER_CONFIGS = Object.freeze([
    Object.freeze({ tier: DNATier.BEGINNER, minScore: 0, maxScore: 10, color: '#808080', glowColor: '#A0A0A0', effect: 'none', particleDensity: 0 }),
    Object.freeze({ tier: DNATier.BRONZE, minScore: 11, maxScore: 25, color: '#CD7F32', glowColor: '#DAA520', effect: 'static', particleDensity: 0.1 }),
    Object.freeze({ tier: DNATier.SILVER, minScore: 26, maxScore: 40, color: '#C0C0C0', glowColor: '#E8E8E8', effect: 'sparkle', particleDensity: 0.2 }),
    Object.freeze({ tier: DNATier.GOLD, minScore: 41, maxScore: 55, color: '#FFD700', glowColor: '#FFF8DC', effect: 'shimmer', particleDensity: 0.4 }),
    Object.freeze({ tier: DNATier.PLATINUM, minScore: 56, maxScore: 70, color: '#E5E4E2', glowColor: '#FFFFFF', effect: 'pulse', particleDensity: 0.6 }),
    Object.freeze({ tier: DNATier.DIAMOND, minScore: 71, maxScore: 85, color: '#B9F2FF', glowColor: '#00FFFF', effect: 'crystallize', particleDensity: 0.8 }),
    Object.freeze({ tier: DNATier.GTO_MASTER, minScore: 86, maxScore: 95, color: '#4B0082', glowColor: '#9400D3', effect: 'flame_rotate', particleDensity: 0.9 }),
    Object.freeze({ tier: DNATier.LEGEND, minScore: 96, maxScore: 100, color: '#FF00FF', glowColor: '#FF69B4', effect: 'supernova', particleDensity: 1.0 })
]);

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORT DNA TRAITS AS ORDERED ARRAY (for radar chart)
// ═══════════════════════════════════════════════════════════════════════════

export const DNA_TRAITS_ORDERED = Object.freeze([
    DNA_TRAITS.Grit,
    DNA_TRAITS.Accuracy,
    DNA_TRAITS.Aggression,
    DNA_TRAITS.Wealth,
    DNA_TRAITS.Rep
]);

// ═══════════════════════════════════════════════════════════════════════════
// 🧮 DNA CALCULATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate composite DNA score from individual traits
 * Formula: (Acc*0.30 + Grit*0.20 + Agg*0.15 + Wealth*0.20 + Rep*0.15)
 * @param {Object} profile - DNA profile with Grit, Accuracy, Aggression, Wealth, Rep values (0-1)
 * @returns {number} Composite score (0-100)
 */
export function calculateCompositeScore(profile) {
    const score =
        profile.Accuracy * DNA_TRAITS.Accuracy.weight +
        profile.Grit * DNA_TRAITS.Grit.weight +
        profile.Aggression * DNA_TRAITS.Aggression.weight +
        profile.Wealth * DNA_TRAITS.Wealth.weight +
        profile.Rep * DNA_TRAITS.Rep.weight;

    return Math.round(score * 100);
}

/**
 * Normalize a raw value to the 0-1 DNA scale
 * @param {number} value - Raw value to normalize
 * @param {number} min - Minimum of the original scale (default 0)
 * @param {number} max - Maximum of the original scale (default 100)
 * @returns {number} Normalized value (0-1)
 */
export function normalizeValue(value, min = 0, max = 100) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Get tier configuration for a given composite score
 * @param {number} compositeScore - Score from 0-100
 * @returns {Object} Tier configuration object
 */
export function getTierForScore(compositeScore) {
    const tier = DNA_TIER_CONFIGS.find(
        t => compositeScore >= t.minScore && compositeScore <= t.maxScore
    );
    return tier || DNA_TIER_CONFIGS[0];
}

/**
 * Create a default DNA profile (new player)
 * @returns {Object} Frozen default profile
 */
export function createDefaultDNAProfile() {
    return Object.freeze({
        Grit: 0.1,
        Accuracy: 0.0,
        Aggression: 0.5,
        Wealth: 0.2,
        Rep: 0.0
    });
}

/**
 * Validate a DNA profile (all values must be 0-1)
 * @param {Object} profile - Partial or full DNA profile
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateDNAProfile(profile) {
    const errors = [];
    const keys = ['Grit', 'Accuracy', 'Aggression', 'Wealth', 'Rep'];

    for (const key of keys) {
        const value = profile[key];
        if (value === undefined) {
            errors.push(`Missing trait: ${key}`);
        } else if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`${key} must be a number`);
        } else if (value < 0 || value > 1) {
            errors.push(`${key} must be between 0 and 1 (got ${value})`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Calculate holographic rendering parameters from DNA profile
 * @param {Object} profile - DNA profile
 * @returns {Object} Hologram render parameters
 */
export function calculateHologramParams(profile) {
    const compositeScore = calculateCompositeScore(profile);
    const tier = getTierForScore(compositeScore);

    return {
        glowIntensity: compositeScore / 100,
        auraColor: tier.glowColor,
        particleDensity: tier.particleDensity,
        rotationSpeed: profile.Aggression * 2,  // More aggressive = faster rotation
        pulsePhase: 0.9 + (profile.Grit * 0.2)  // Oscillate based on grit
    };
}

export default {
    DNA_TRAITS,
    DNA_TRAITS_ORDERED,
    DNA_TIER_CONFIGS,
    DNATier,
    calculateCompositeScore,
    normalizeValue,
    getTierForScore,
    createDefaultDNAProfile,
    validateDNAProfile,
    calculateHologramParams
};
