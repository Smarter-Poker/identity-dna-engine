/**
 * 🎨 IDENTITY_DNA_ENGINE — Visual Addiction Engine (Prompts 19-21)
 * 
 * @task_19: HOLOGRAPHIC_RADAR_ANIMATION
 * @task_20: XP_LEVEL_VISUAL_STATE
 * @task_21: STREAK_FLAME_INTENSITY_LOGIC
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 TASK 19: HOLOGRAPHIC RADAR ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DNA Pulse Animation Configuration
 */
export const PULSE_CONFIG = {
    DEFAULT_SPEED: 1.0,
    GLOW_INTENSITY: 0.7,
    ROTATION_ENABLED: true,
    ROTATION_SPEED: 0.5,
    PARTICLE_DENSITIES: {
        LOW: 5,
        MEDIUM: 15,
        HIGH: 30,
        ULTRA: 50
    }
};

/**
 * DNA Pulse Engine
 * Creates dynamic 5-point radar that grows/shrinks in real-time
 */
export class DNAPulseEngine {
    constructor(config = {}) {
        this.pulseSpeed = config.pulseSpeed || PULSE_CONFIG.DEFAULT_SPEED;
        this.glowIntensity = config.glowIntensity || PULSE_CONFIG.GLOW_INTENSITY;
        this.rotationSpeed = config.rotationSpeed || PULSE_CONFIG.ROTATION_SPEED;
        this.startTime = Date.now();
    }

    /**
     * Calculate current pulse phase (oscillates between 0.9 and 1.1)
     */
    getPulsePhase(timestamp = Date.now()) {
        const elapsed = (timestamp - this.startTime) / 1000;
        return Math.sin(elapsed * this.pulseSpeed) * 0.1 + 1.0;
    }

    /**
     * Calculate rotation angle in degrees
     */
    getRotationAngle(timestamp = Date.now()) {
        const elapsed = (timestamp - this.startTime) / 1000;
        return (elapsed * this.rotationSpeed * 57.2958) % 360;
    }

    /**
     * Apply pulse animation to radar values
     */
    animateRadar(baseValues, timestamp = Date.now()) {
        const pulsePhase = this.getPulsePhase(timestamp);
        const rotationAngle = this.getRotationAngle(timestamp);

        const animated = {};
        for (const [key, value] of Object.entries(baseValues)) {
            animated[key] = {
                base: value,
                animated: value * pulsePhase,
                scale: pulsePhase
            };
        }

        return {
            values: animated,
            animation: {
                pulsePhase,
                rotationAngle,
                glowIntensity: this.glowIntensity,
                timestamp
            }
        };
    }

    /**
     * Generate WebGL vertices with animation
     */
    generateAnimatedVertices(values, timestamp = Date.now()) {
        const pulsePhase = this.getPulsePhase(timestamp);
        const axes = ['aggression', 'grit', 'accuracy', 'wealth', 'luck'];
        const angles = [90, 18, -54, -126, -198];

        return axes.map((axis, i) => {
            const value = (values[axis] || 0.5) * pulsePhase;
            const angleRad = (angles[i] * Math.PI) / 180;

            return {
                axis,
                x: Math.cos(angleRad) * value,
                y: Math.sin(angleRad) * value,
                z: value * 0.1,
                value,
                angle: angles[i]
            };
        });
    }

    /**
     * Generate CSS animation properties
     */
    getCSSAnimation() {
        return {
            animation: `pulse ${1 / this.pulseSpeed}s ease-in-out infinite`,
            transform: `rotate(${this.getRotationAngle()}deg)`,
            filter: `drop-shadow(0 0 ${this.glowIntensity * 20}px currentColor)`
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 TASK 20: XP LEVEL VISUAL STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tier Color Configuration
 * Bronze (0-10), Silver (11-30), Gold (31-60), GTO-Master (61-100)
 */
export const TIER_COLORS = {
    BRONZE: {
        id: 'BRONZE',
        name: 'Bronze',
        minLevel: 0,
        maxLevel: 10,
        primary: '#CD7F32',
        secondary: '#8B4513',
        glow: '#DAA520',
        badge: '🥉',
        particle: 'NONE',
        aura: 'STATIC'
    },
    SILVER: {
        id: 'SILVER',
        name: 'Silver',
        minLevel: 11,
        maxLevel: 30,
        primary: '#C0C0C0',
        secondary: '#A9A9A9',
        glow: '#E8E8E8',
        badge: '🥈',
        particle: 'SPARKLE',
        aura: 'PULSE'
    },
    GOLD: {
        id: 'GOLD',
        name: 'Gold',
        minLevel: 31,
        maxLevel: 60,
        primary: '#FFD700',
        secondary: '#FFA500',
        glow: '#FFFACD',
        badge: '🥇',
        particle: 'SHIMMER',
        aura: 'PULSE'
    },
    GTO_MASTER: {
        id: 'GTO_MASTER',
        name: 'GTO Master',
        minLevel: 61,
        maxLevel: 100,
        primary: '#4B0082',
        secondary: '#8A2BE2',
        glow: '#FF1493',
        badge: '👑',
        particle: 'FLAME',
        aura: 'ROTATE'
    }
};

/**
 * Tier Visual Engine
 */
export class TierVisualEngine {

    /**
     * Get tier from level
     */
    static getTierFromLevel(level) {
        if (level >= 61) return TIER_COLORS.GTO_MASTER;
        if (level >= 31) return TIER_COLORS.GOLD;
        if (level >= 11) return TIER_COLORS.SILVER;
        return TIER_COLORS.BRONZE;
    }

    /**
     * Calculate progress within tier
     */
    static getTierProgress(level) {
        const tier = this.getTierFromLevel(level);
        const range = tier.maxLevel - tier.minLevel;
        const progress = (level - tier.minLevel) / range;
        return Math.max(0, Math.min(1, progress));
    }

    /**
     * Get complete tier visual state
     */
    static getTierVisualState(level) {
        const tier = this.getTierFromLevel(level);
        const progress = this.getTierProgress(level);

        return {
            tier_id: tier.id,
            tier_name: tier.name,
            level,
            level_range: { min: tier.minLevel, max: tier.maxLevel },
            progress_in_tier: progress,
            colors: {
                primary: tier.primary,
                secondary: tier.secondary,
                glow: tier.glow
            },
            badge: tier.badge,
            effects: {
                particle: tier.particle,
                aura: tier.aura
            },
            css: this.generateCSS(tier)
        };
    }

    /**
     * Generate CSS properties
     */
    static generateCSS(tier) {
        return {
            background: `linear-gradient(135deg, ${tier.primary} 0%, ${tier.secondary} 100%)`,
            border: `2px solid ${tier.glow}`,
            boxShadow: `0 0 20px ${tier.glow}`,
            textColor: tier.id === 'BRONZE' || tier.id === 'GTO_MASTER' ? '#FFFFFF' : '#000000'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 TASK 21: STREAK FLAME INTENSITY LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Streak Flame Configuration
 * 3 days = Small Blue, 7 days = Roaring Orange, 30 days = Purple Fire
 */
export const STREAK_FLAMES = {
    NONE: {
        id: 'NONE',
        name: 'No Flame',
        minDays: 0,
        maxDays: 2,
        color: 'transparent',
        glow: 'transparent',
        intensity: 0,
        height: 'NONE',
        animationSpeed: 0,
        particleCount: 0
    },
    BLUE_STARTER: {
        id: 'BLUE_STARTER',
        name: 'Small Blue Flame',
        minDays: 3,
        maxDays: 6,
        color: '#1E90FF',
        glow: '#00BFFF',
        intensity: 0.3,
        height: 'SMALL',
        animationSpeed: 1.0,
        particleCount: 10
    },
    ORANGE_ROARING: {
        id: 'ORANGE_ROARING',
        name: 'Roaring Orange',
        minDays: 7,
        maxDays: 29,
        color: '#FF4500',
        glow: '#FFA500',
        intensity: 0.7,
        height: 'MEDIUM',
        animationSpeed: 1.5,
        particleCount: 25
    },
    PURPLE_INFERNO: {
        id: 'PURPLE_INFERNO',
        name: 'Purple Fire',
        minDays: 30,
        maxDays: 999,
        color: '#8B00FF',
        glow: '#FF1493',
        intensity: 1.0,
        height: 'LARGE',
        animationSpeed: 2.0,
        particleCount: 50
    }
};

/**
 * Streak Flame Engine
 */
export class StreakFlameEngine {

    /**
     * Get flame from streak days
     */
    static getFlameFromDays(days) {
        if (days >= 30) return STREAK_FLAMES.PURPLE_INFERNO;
        if (days >= 7) return STREAK_FLAMES.ORANGE_ROARING;
        if (days >= 3) return STREAK_FLAMES.BLUE_STARTER;
        return STREAK_FLAMES.NONE;
    }

    /**
     * Get next flame tier
     */
    static getNextFlameTier(days) {
        if (days < 3) return { tier: STREAK_FLAMES.BLUE_STARTER, daysToUnlock: 3 - days };
        if (days < 7) return { tier: STREAK_FLAMES.ORANGE_ROARING, daysToUnlock: 7 - days };
        if (days < 30) return { tier: STREAK_FLAMES.PURPLE_INFERNO, daysToUnlock: 30 - days };
        return null; // At max
    }

    /**
     * Get complete flame metadata
     */
    static getFlameMetadata(days) {
        const flame = this.getFlameFromDays(days);
        const nextTier = this.getNextFlameTier(days);

        // Calculate progress within tier
        const range = flame.maxDays - flame.minDays;
        const progressInTier = range > 0 ? (days - flame.minDays) / range : 1;

        return {
            streak_days: days,
            flame: {
                id: flame.id,
                name: flame.name,
                color: flame.color,
                glow: flame.glow,
                intensity: flame.intensity,
                height: flame.height
            },
            animation: {
                speed: flame.animationSpeed,
                particleCount: flame.particleCount
            },
            progress: {
                in_tier: Math.min(1, progressInTier),
                days_in_tier: days - flame.minDays,
                days_to_next: nextTier?.daysToUnlock || null,
                next_tier: nextTier?.tier.name || null
            },
            css: this.generateCSS(flame),
            webgl: this.generateWebGLConfig(flame)
        };
    }

    /**
     * Generate CSS properties
     */
    static generateCSS(flame) {
        if (flame.id === 'NONE') {
            return { opacity: 0 };
        }

        return {
            filter: `drop-shadow(0 0 ${flame.intensity * 20}px ${flame.glow})`,
            animation: `flame-flicker ${1.0 / flame.animationSpeed}s ease-in-out infinite`,
            opacity: flame.intensity
        };
    }

    /**
     * Generate WebGL particle config
     */
    static generateWebGLConfig(flame) {
        return {
            emitterRate: flame.particleCount,
            colorStart: flame.color,
            colorEnd: flame.glow,
            velocity: flame.animationSpeed * 2,
            lifetime: 1.0 / (flame.animationSpeed || 1)
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL ADDICTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class VisualAddictionEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.pulseEngine = new DNAPulseEngine();
    }

    /**
     * Get complete visual state for user
     */
    async getCompleteVisualState(userId) {
        const { data, error } = await this.supabase.client
            .rpc('get_complete_visual_state', { p_user_id: userId });

        if (error) {
            console.error('Visual state error:', error);
            return null;
        }

        return data;
    }

    /**
     * Generate client-side visual state (no DB required)
     */
    generateLocalVisualState(userData) {
        const timestamp = Date.now();

        // DNA Pulse
        const radarAnimation = this.pulseEngine.animateRadar({
            aggression: userData.aggression || 0.5,
            grit: userData.grit || 0.5,
            accuracy: userData.accuracy || 0.5,
            wealth: userData.wealth || 0.5,
            luck: userData.luck || 0.5
        }, timestamp);

        // Tier Visual
        const tierVisual = TierVisualEngine.getTierVisualState(userData.level || 1);

        // Streak Flame
        const streakFlame = StreakFlameEngine.getFlameMetadata(userData.streakDays || 0);

        return {
            timestamp,
            dna_pulse: radarAnimation,
            tier_visual: tierVisual,
            streak_flame: streakFlame
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    VisualAddictionEngine,
    DNAPulseEngine,
    TierVisualEngine,
    StreakFlameEngine,
    PULSE_CONFIG,
    TIER_COLORS,
    STREAK_FLAMES
};
