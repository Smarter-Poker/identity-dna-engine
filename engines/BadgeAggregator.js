/**
 * 🧬 IDENTITY_DNA_ENGINE — Badge Aggregator
 * 
 * Collects and aggregates badges/achievements from all Orbs
 * into the unified player profile.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 BADGE CATEGORIES BY ORB
// ═══════════════════════════════════════════════════════════════════════════
export const BADGE_SOURCES = {
    ORB_3: 'XP_ENGINE',
    ORB_4: 'GTO_TRAINING',
    ORB_5: 'THE_BRAIN',
    ORB_6: 'INTEL_CORE',
    ORB_7: 'DIAMOND_ARCADE',
    ORB_8: 'BANKROLL_MANAGER',
    ORB_9: 'DISCOVERY_TRUST',
    ORB_10: 'COMMAND_BRIDGE'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎖️ BADGE RARITY TIERS
// ═══════════════════════════════════════════════════════════════════════════
export const BADGE_RARITY = {
    COMMON: { weight: 1, color: '#808080', glow: false },
    UNCOMMON: { weight: 2, color: '#32CD32', glow: false },
    RARE: { weight: 3, color: '#1E90FF', glow: true },
    EPIC: { weight: 5, color: '#9932CC', glow: true },
    LEGENDARY: { weight: 10, color: '#FFD700', glow: true },
    MYTHIC: { weight: 25, color: '#FF1493', glow: true }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏅 BADGE AGGREGATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class BadgeAggregator {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📦 AGGREGATE ALL BADGES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Aggregate badges from all Orbs for a user
     * @param {string} userId - User ID
     * @returns {Array} Array of badge objects
     */
    async aggregateAll(userId) {
        try {
            // Fetch badges from all sources in parallel
            const [
                xpBadges,
                trainingBadges,
                brainBadges,
                intelBadges,
                arcadeBadges,
                bankrollBadges,
                discoveryBadges,
                commandBadges
            ] = await Promise.all([
                this.fetchOrbBadges(userId, 'ORB_3'),
                this.fetchOrbBadges(userId, 'ORB_4'),
                this.fetchOrbBadges(userId, 'ORB_5'),
                this.fetchOrbBadges(userId, 'ORB_6'),
                this.fetchOrbBadges(userId, 'ORB_7'),
                this.fetchOrbBadges(userId, 'ORB_8'),
                this.fetchOrbBadges(userId, 'ORB_9'),
                this.fetchOrbBadges(userId, 'ORB_10')
            ]);

            // Combine all badges
            const allBadges = [
                ...xpBadges,
                ...trainingBadges,
                ...brainBadges,
                ...intelBadges,
                ...arcadeBadges,
                ...bankrollBadges,
                ...discoveryBadges,
                ...commandBadges
            ];

            // Sort by rarity (highest first), then by earned date
            return this.sortBadges(allBadges);

        } catch (error) {
            console.error(`Error aggregating badges for ${userId}:`, error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📥 FETCH BADGES BY ORB
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Fetch badges from a specific Orb
     */
    async fetchOrbBadges(userId, orbSource) {
        const { data, error } = await this.supabase.client
            .from('user_badges')
            .select('*')
            .eq('user_id', userId)
            .eq('source_orb', orbSource);

        if (error || !data) {
            return [];
        }

        return data.map(badge => ({
            id: badge.id,
            code: badge.badge_code,
            name: badge.badge_name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity || 'COMMON',
            source: orbSource,
            sourceName: BADGE_SOURCES[orbSource],
            earnedAt: badge.earned_at,
            progress: badge.progress || 100,
            metadata: badge.metadata || {}
        }));
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🏆 BADGE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Award a badge to a user
     */
    async awardBadge(userId, badge, sourceOrb) {
        const badgeData = {
            user_id: userId,
            badge_code: badge.code,
            badge_name: badge.name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity || 'COMMON',
            source_orb: sourceOrb,
            earned_at: new Date().toISOString(),
            progress: 100,
            metadata: badge.metadata || {}
        };

        // Check if badge already earned (prevent duplicates)
        const { data: existing } = await this.supabase.client
            .from('user_badges')
            .select('id')
            .eq('user_id', userId)
            .eq('badge_code', badge.code)
            .maybeSingle();

        if (existing) {
            console.log(`Badge ${badge.code} already earned by ${userId}`);
            return { awarded: false, reason: 'ALREADY_EARNED' };
        }

        const { data, error } = await this.supabase.client
            .from('user_badges')
            .insert(badgeData)
            .select()
            .single();

        if (error) {
            console.error(`Error awarding badge:`, error);
            throw error;
        }

        return { awarded: true, badge: data };
    }

    /**
     * Update badge progress (for progressive badges)
     */
    async updateBadgeProgress(userId, badgeCode, progress) {
        const { data, error } = await this.supabase.client
            .from('user_badges')
            .update({
                progress: Math.min(100, progress),
                earned_at: progress >= 100 ? new Date().toISOString() : null
            })
            .eq('user_id', userId)
            .eq('badge_code', badgeCode)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Revoke a badge (for misconduct or error correction)
     */
    async revokeBadge(userId, badgeCode, reason) {
        // Archive before deletion
        const { data: badge } = await this.supabase.client
            .from('user_badges')
            .select('*')
            .eq('user_id', userId)
            .eq('badge_code', badgeCode)
            .maybeSingle();

        if (!badge) {
            return { revoked: false, reason: 'NOT_FOUND' };
        }

        // Archive
        await this.supabase.client
            .from('badge_revocations')
            .insert({
                user_id: userId,
                badge_data: badge,
                revoked_at: new Date().toISOString(),
                revocation_reason: reason
            });

        // Delete
        await this.supabase.client
            .from('user_badges')
            .delete()
            .eq('id', badge.id);

        return { revoked: true, badge };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 BADGE ANALYTICS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get badge statistics for a user
     */
    async getBadgeStats(userId) {
        const badges = await this.aggregateAll(userId);

        const stats = {
            total: badges.length,
            byRarity: {},
            bySource: {},
            totalWeight: 0,
            recentlyEarned: [],
            rarest: null
        };

        // Initialize counters
        Object.keys(BADGE_RARITY).forEach(r => stats.byRarity[r] = 0);
        Object.keys(BADGE_SOURCES).forEach(s => stats.bySource[s] = 0);

        badges.forEach(badge => {
            stats.byRarity[badge.rarity]++;
            stats.bySource[badge.source]++;
            stats.totalWeight += BADGE_RARITY[badge.rarity]?.weight || 1;
        });

        // Recent badges (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        stats.recentlyEarned = badges.filter(b =>
            new Date(b.earnedAt) > weekAgo
        );

        // Rarest badge
        const rarityOrder = Object.keys(BADGE_RARITY);
        stats.rarest = badges.reduce((rarest, badge) => {
            if (!rarest) return badge;
            const currentIndex = rarityOrder.indexOf(badge.rarity);
            const rarestIndex = rarityOrder.indexOf(rarest.rarity);
            return currentIndex > rarestIndex ? badge : rarest;
        }, null);

        return stats;
    }

    /**
     * Get badge leaderboard
     */
    async getBadgeLeaderboard(limit = 100) {
        const { data, error } = await this.supabase.client
            .rpc('get_badge_leaderboard', { limit_count: limit });

        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔧 UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sort badges by rarity and date
     */
    sortBadges(badges) {
        const rarityOrder = Object.keys(BADGE_RARITY);

        return badges.sort((a, b) => {
            // First by rarity (descending)
            const rarityDiff = rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
            if (rarityDiff !== 0) return rarityDiff;

            // Then by date (newest first)
            return new Date(b.earnedAt) - new Date(a.earnedAt);
        });
    }

    /**
     * Get rarity info
     */
    getRarityInfo(rarity) {
        return BADGE_RARITY[rarity] || BADGE_RARITY.COMMON;
    }
}
