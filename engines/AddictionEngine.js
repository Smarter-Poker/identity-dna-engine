/**
 * ⚡️ IDENTITY_DNA_ENGINE — Addiction Engine (Prompts 7-9)
 * 
 * @task_07: HOLOGRAPHIC_RADAR_CHART_MAPPING
 * @task_08: XP_LEVEL_UP_TRIGGER_EVENTS
 * @task_09: PROFILE_SOVEREIGNTY_SEAL
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 LEVEL THRESHOLDS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
export const LEVEL_THRESHOLDS = [
    { level: 1, xp: 0, tier: 'Rookie', badge: 'First Steps', rarity: 'COMMON' },
    { level: 5, xp: 1000, tier: 'Apprentice', badge: 'Apprentice Badge', rarity: 'COMMON' },
    { level: 10, xp: 5000, tier: 'Student', badge: 'Dedicated Student', rarity: 'UNCOMMON' },
    { level: 15, xp: 15000, tier: 'Practitioner', badge: 'Practitioner Seal', rarity: 'UNCOMMON' },
    { level: 20, xp: 30000, tier: 'Skilled', badge: 'Skilled Player', rarity: 'RARE' },
    { level: 25, xp: 50000, tier: 'Expert', badge: 'Expert Badge', rarity: 'RARE' },
    { level: 30, xp: 80000, tier: 'Master', badge: 'Master Badge', rarity: 'EPIC' },
    { level: 40, xp: 150000, tier: 'Grandmaster', badge: 'Grandmaster Seal', rarity: 'EPIC' },
    { level: 50, xp: 300000, tier: 'Legend', badge: 'Legend Status', rarity: 'LEGENDARY' },
    { level: 75, xp: 750000, tier: 'Mythic', badge: 'Mythic Champion', rarity: 'MYTHIC' },
    { level: 100, xp: 2000000, tier: 'Immortal', badge: 'Immortal God', rarity: 'MYTHIC' }
];

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VERIFICATION LEVELS
// ═══════════════════════════════════════════════════════════════════════════
export const VERIFICATION_LEVELS = {
    NONE: { order: 0, name: 'None', access: ['LOW_STAKES'] },
    EMAIL: { order: 1, name: 'Email Verified', access: ['LOW_STAKES', 'MID_STAKES'] },
    PHONE: { order: 2, name: 'Phone Verified', access: ['LOW_STAKES', 'MID_STAKES'] },
    ID_BASIC: { order: 3, name: 'ID Basic', access: ['LOW_STAKES', 'MID_STAKES'] },
    ID_FULL: { order: 4, name: 'ID Full', access: ['LOW_STAKES', 'MID_STAKES'] },
    VERIFIED_PRO: { order: 5, name: 'Verified Pro', access: ['LOW_STAKES', 'MID_STAKES', 'HIGH_STAKES', 'ELITE', 'INVITATIONAL'] }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎰 ARENA REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════
export const ARENA_REQUIREMENTS = {
    LOW_STAKES: { minVerification: 'NONE', minTier: 1, minXP: 0 },
    MID_STAKES: { minVerification: 'EMAIL', minTier: 3, minXP: 5000 },
    HIGH_STAKES: { minVerification: 'VERIFIED_PRO', minTier: 7, minXP: 100000, requiredBadges: ['Verified Pro DNA'] },
    ELITE: { minVerification: 'VERIFIED_PRO', minTier: 9, minXP: 500000, requiredBadges: ['Verified Pro DNA', 'Legend Status'] },
    INVITATIONAL: { minVerification: 'VERIFIED_PRO', minTier: 10, minXP: 1000000, requiredBadges: ['Mythic Champion'] }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 TASK 07: DNA VISUAL STREAM
// ═══════════════════════════════════════════════════════════════════════════
export class DNAVisualStream {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get 5-point radar chart data for 3D visualizer
     */
    async getRadarData(userId) {
        const { data, error } = await this.supabase.client
            .rpc('dna_visual_stream', { p_user_id: userId });

        if (error) {
            console.error('DNA visual stream error:', error);
            return null;
        }

        return data;
    }

    /**
     * Generate client-side radar chart from raw data
     */
    generateRadarChart(grit, skill, aggression, wealth, tiltResistance) {
        const points = [
            { axis: 'skill', value: skill, color: '#00BFFF', angle: 90 },
            { axis: 'grit', value: grit, color: '#32CD32', angle: 18 },
            { axis: 'aggression', value: aggression, color: '#FF4500', angle: -54 },
            { axis: 'wealth', value: wealth, color: '#9400D3', angle: -126 },
            { axis: 'tilt_resistance', value: tiltResistance, color: '#FFD700', angle: -198 }
        ];

        // Calculate 3D vertices
        const vertices = points.map((p, i) => {
            const angleRad = (p.angle * Math.PI) / 180;
            const normalized = p.value / 100;
            return {
                x: Math.cos(angleRad) * normalized,
                y: Math.sin(angleRad) * normalized,
                z: normalized * 0.3,
                ...p
            };
        });

        // Calculate composite score
        const composite = (skill * 0.25) + (grit * 0.20) + (aggression * 0.20) + (wealth * 0.15) + (tiltResistance * 0.20);

        return {
            points,
            vertices,
            compositeScore: Math.round(composite * 100) / 100
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 TASK 08: LEVEL UP ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class LevelUpEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.eventListeners = new Map();
    }

    /**
     * Calculate level from XP
     */
    calculateLevel(xp) {
        let level = 1;
        for (const threshold of LEVEL_THRESHOLDS) {
            if (xp >= threshold.xp) {
                level = threshold.level;
            } else {
                break;
            }
        }
        return level;
    }

    /**
     * Get threshold info for a level
     */
    getThresholdInfo(level) {
        return LEVEL_THRESHOLDS.find(t => t.level === level) || LEVEL_THRESHOLDS[0];
    }

    /**
     * Check if XP change triggers level up
     */
    checkLevelUp(oldXP, newXP) {
        const oldLevel = this.calculateLevel(oldXP);
        const newLevel = this.calculateLevel(newXP);

        if (newLevel > oldLevel) {
            const badgesEarned = LEVEL_THRESHOLDS
                .filter(t => t.level > oldLevel && t.level <= newLevel)
                .map(t => ({
                    badge: t.badge,
                    rarity: t.rarity,
                    level: t.level,
                    tier: t.tier
                }));

            return {
                leveledUp: true,
                oldLevel,
                newLevel,
                badgesEarned,
                notification: {
                    type: 'LEVEL_UP',
                    title: `🎉 Level ${newLevel} Achieved!`,
                    message: `You reached Level ${newLevel} and earned ${badgesEarned.length} badge(s)!`,
                    badges: badgesEarned
                }
            };
        }

        return { leveledUp: false, oldLevel, newLevel };
    }

    /**
     * Trigger level up via DB function
     */
    async triggerLevelUp(userId, oldXP, newXP) {
        const { data, error } = await this.supabase.client
            .rpc('fn_on_level_up', {
                p_user_id: userId,
                p_old_xp: oldXP,
                p_new_xp: newXP
            });

        if (error) {
            console.error('Level up trigger error:', error);
            return null;
        }

        const result = data?.[0] || data;

        // Emit event if leveled up
        if (result?.leveled_up) {
            this.emit('levelUp', result);
        }

        return result;
    }

    /**
     * Get XP needed for next level
     */
    getXPToNextLevel(currentXP) {
        const currentLevel = this.calculateLevel(currentXP);
        const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level > currentLevel);

        if (!nextThreshold) {
            return { atMax: true, xpNeeded: 0 };
        }

        return {
            atMax: false,
            nextLevel: nextThreshold.level,
            xpNeeded: nextThreshold.xp - currentXP,
            progress: (currentXP - this.getThresholdInfo(currentLevel).xp) /
                (nextThreshold.xp - this.getThresholdInfo(currentLevel).xp)
        };
    }

    /**
     * Event handling
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 TASK 09: IDENTITY VERIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class IdentityVerificationEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Check user verification status
     */
    async checkVerification(userId) {
        const { data, error } = await this.supabase.client
            .rpc('identity_verification_rpc', {
                p_user_id: userId,
                p_action: 'CHECK'
            });

        if (error) {
            console.error('Verification check error:', error);
            return null;
        }

        return data;
    }

    /**
     * Verify arena access
     * Law: User cannot enter High Stakes without Verified Pro DNA badge
     */
    async verifyArenaAccess(userId, arenaId) {
        const { data, error } = await this.supabase.client
            .rpc('identity_verification_rpc', {
                p_user_id: userId,
                p_arena_id: arenaId,
                p_action: 'VERIFY_ARENA'
            });

        if (error) {
            console.error('Arena verification error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    /**
     * Check if user can access specific arena type
     */
    canAccessArenaType(verificationLevel, skillTier, xp, arenaType) {
        const requirements = ARENA_REQUIREMENTS[arenaType];

        if (!requirements) {
            return { allowed: false, reason: 'Unknown arena type' };
        }

        const userVerificationOrder = VERIFICATION_LEVELS[verificationLevel]?.order || 0;
        const requiredVerificationOrder = VERIFICATION_LEVELS[requirements.minVerification]?.order || 0;

        // Check verification level
        if (userVerificationOrder < requiredVerificationOrder) {
            return {
                allowed: false,
                reason: `Requires ${requirements.minVerification} verification`,
                law: arenaType === 'HIGH_STAKES' ?
                    '🔐 SOVEREIGNTY LAW: Verified Pro DNA badge required for High Stakes Arena' : null
            };
        }

        // Check skill tier
        if (skillTier < requirements.minTier) {
            return {
                allowed: false,
                reason: `Requires Skill Tier ${requirements.minTier}`
            };
        }

        // Check XP
        if (xp < requirements.minXP) {
            return {
                allowed: false,
                reason: `Requires ${requirements.minXP} XP`
            };
        }

        return { allowed: true };
    }

    /**
     * Request verification upgrade
     */
    async requestUpgrade(userId) {
        const { data, error } = await this.supabase.client
            .rpc('identity_verification_rpc', {
                p_user_id: userId,
                p_action: 'UPGRADE'
            });

        if (error) {
            console.error('Upgrade request error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    /**
     * Get all accessible arenas for user
     */
    async getAccessibleArenas(userId) {
        const { data, error } = await this.supabase.client
            .from('user_arena_access')
            .select('*')
            .eq('user_id', userId)
            .eq('has_access', true);

        if (error) {
            console.error('Arena access fetch error:', error);
            return [];
        }

        return data || [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏅 BADGE MINTING ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class BadgeMintingEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get pending badges for user
     */
    async getPendingBadges(userId) {
        const { data, error } = await this.supabase.client
            .from('badge_mint_queue')
            .select('*')
            .eq('user_id', userId)
            .eq('mint_status', 'PENDING')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Pending badges fetch error:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Claim a minted badge
     */
    async claimBadge(badgeId) {
        const { data, error } = await this.supabase.client
            .from('badge_mint_queue')
            .update({
                mint_status: 'CLAIMED',
                claimed_at: new Date().toISOString()
            })
            .eq('id', badgeId)
            .eq('mint_status', 'MINTED')
            .select()
            .single();

        if (error) {
            console.error('Badge claim error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, badge: data };
    }

    /**
     * Get badge rarity color
     */
    getRarityColor(rarity) {
        const colors = {
            COMMON: '#9E9E9E',
            UNCOMMON: '#4CAF50',
            RARE: '#2196F3',
            EPIC: '#9C27B0',
            LEGENDARY: '#FF9800',
            MYTHIC: '#FF5722'
        };
        return colors[rarity] || colors.COMMON;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡️ ADDICTION ENGINE (Combined Export)
// ═══════════════════════════════════════════════════════════════════════════
export class AddictionEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.visualStream = new DNAVisualStream(supabaseClient);
        this.levelUp = new LevelUpEngine(supabaseClient);
        this.verification = new IdentityVerificationEngine(supabaseClient);
        this.badges = new BadgeMintingEngine(supabaseClient);
    }

    /**
     * Get complete addiction payload for user
     */
    async getAddictionPayload(userId) {
        const [radar, pendingBadges, verification] = await Promise.all([
            this.visualStream.getRadarData(userId),
            this.badges.getPendingBadges(userId),
            this.verification.checkVerification(userId)
        ]);

        return {
            userId,
            timestamp: new Date().toISOString(),
            radar,
            pendingBadges,
            verification,
            level: this.levelUp.calculateLevel(verification?.xp_total || 0),
            nextLevel: this.levelUp.getXPToNextLevel(verification?.xp_total || 0)
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    AddictionEngine,
    DNAVisualStream,
    LevelUpEngine,
    IdentityVerificationEngine,
    BadgeMintingEngine,
    LEVEL_THRESHOLDS,
    VERIFICATION_LEVELS,
    ARENA_REQUIREMENTS
};
