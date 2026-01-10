/**
 * 🔥 IDENTITY_DNA_ENGINE — Streak Integrity Oracle
 * 
 * @task_06: STREAK_INTEGRITY_ORACLE
 * 
 * Manages player streaks with 24h expiration logic.
 * Broadcasts streak updates to YELLOW silo (Diamond Economy Rails).
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 STREAK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
export const STREAK_CONFIG = {
    // Expiration window (hours)
    EXPIRATION_HOURS: 24,

    // Grace period (hours after 24h before full reset)
    GRACE_PERIOD_HOURS: 0,

    // Multiplier tiers
    MULTIPLIERS: {
        TIER_1: { minDays: 1, maxDays: 2, multiplier: 1.0 },
        TIER_2: { minDays: 3, maxDays: 6, multiplier: 1.5 },
        TIER_3: { minDays: 7, maxDays: Infinity, multiplier: 2.0 }
    },

    // Streak tier names
    TIERS: {
        LEGENDARY: { minDays: 30, emoji: '🔥', name: 'LEGENDARY' },
        DEDICATED: { minDays: 14, emoji: '💪', name: 'DEDICATED' },
        COMMITTED: { minDays: 7, emoji: '⭐', name: 'COMMITTED' },
        GROWING: { minDays: 3, emoji: '🌱', name: 'GROWING' },
        STARTED: { minDays: 1, emoji: '✨', name: 'STARTED' },
        INACTIVE: { minDays: 0, emoji: '😴', name: 'INACTIVE' }
    },

    // Broadcast targets
    BROADCAST_TARGETS: ['YELLOW_DIAMOND']
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 STREAK DATA CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class StreakData {
    constructor(data = {}) {
        this.userId = data.user_id || data.userId;
        this.currentStreak = data.current_streak || data.currentStreak || 0;
        this.longestStreak = data.longest_streak || data.longestStreak || 0;
        this.lastActiveDate = data.last_active_date || data.lastActiveDate;
        this.streakStartedAt = data.streak_started_at || data.streakStartedAt;
    }

    /**
     * Get the current multiplier based on streak length
     */
    getMultiplier() {
        if (this.currentStreak >= 7) return 2.0;
        if (this.currentStreak >= 3) return 1.5;
        return 1.0;
    }

    /**
     * Get streak tier info
     */
    getTier() {
        const tiers = STREAK_CONFIG.TIERS;

        if (this.currentStreak >= tiers.LEGENDARY.minDays) return tiers.LEGENDARY;
        if (this.currentStreak >= tiers.DEDICATED.minDays) return tiers.DEDICATED;
        if (this.currentStreak >= tiers.COMMITTED.minDays) return tiers.COMMITTED;
        if (this.currentStreak >= tiers.GROWING.minDays) return tiers.GROWING;
        if (this.currentStreak >= tiers.STARTED.minDays) return tiers.STARTED;
        return tiers.INACTIVE;
    }

    /**
     * Check if streak is at risk (not active today)
     */
    isAtRisk() {
        if (!this.lastActiveDate) return true;

        const lastActive = new Date(this.lastActiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastActive.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    /**
     * Check if streak is broken (more than 24h since last activity)
     */
    isBroken() {
        if (!this.lastActiveDate) return true;

        const lastActive = new Date(this.lastActiveDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastActive.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
        return diffDays > 1;
    }

    /**
     * Get days until streak breaks
     */
    getDaysUntilExpiration() {
        if (!this.lastActiveDate) return 0;

        const lastActive = new Date(this.lastActiveDate);
        const now = new Date();
        const expirationTime = new Date(lastActive.getTime() + (STREAK_CONFIG.EXPIRATION_HOURS * 60 * 60 * 1000));

        const hoursRemaining = (expirationTime - now) / (1000 * 60 * 60);
        return Math.max(0, Math.ceil(hoursRemaining / 24));
    }

    toJSON() {
        const tier = this.getTier();
        return {
            userId: this.userId,
            currentStreak: this.currentStreak,
            longestStreak: this.longestStreak,
            lastActiveDate: this.lastActiveDate,
            multiplier: this.getMultiplier(),
            tier: tier.name,
            tierEmoji: tier.emoji,
            isAtRisk: this.isAtRisk(),
            isBroken: this.isBroken(),
            daysUntilExpiration: this.getDaysUntilExpiration()
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 STREAK INTEGRITY ORACLE
// ═══════════════════════════════════════════════════════════════════════════
export class StreakIntegrityOracle {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.broadcastQueue = [];
    }

    /**
     * Update streak count for a user
     * Logic: If (now() - last_active > 24h) → RESET, Else → INCREMENT
     */
    async updateStreakCount(userId) {
        const { data, error } = await this.supabase.client
            .rpc('fn_update_streak_count', { p_user_id: userId });

        if (error) {
            console.error('Streak update failed:', error);
            return { success: false, error: error.message };
        }

        const result = data?.[0] || data;

        // Queue broadcast if action was INCREMENT or RESET
        if (result?.broadcast_queued) {
            this.broadcastQueue.push({
                userId,
                action: result.action,
                newStreak: result.new_streak,
                multiplier: result.multiplier,
                timestamp: new Date().toISOString()
            });
        }

        return result;
    }

    /**
     * Get current streak data for a user
     */
    async getStreakData(userId) {
        const { data, error } = await this.supabase.client
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Failed to get streak:', error);
            return null;
        }

        return data ? new StreakData(data) : null;
    }

    /**
     * Get streak status with all metadata
     */
    async getStreakStatus(userId) {
        const { data, error } = await this.supabase.client
            .from('active_streak_status')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            return null;
        }

        return data;
    }

    /**
     * Check if a user's streak has expired (called by cron)
     */
    checkStreakExpiration(streakData) {
        if (!streakData || !streakData.lastActiveDate) {
            return { expired: true, action: 'RESET' };
        }

        const lastActive = new Date(streakData.lastActiveDate);
        const now = new Date();

        // Set both to midnight for day comparison
        const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffDays = Math.floor((today - lastActiveDay) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            return { expired: true, action: 'RESET', daysSinceActive: diffDays };
        }

        if (diffDays === 1) {
            return { expired: false, action: 'AT_RISK', daysSinceActive: diffDays };
        }

        return { expired: false, action: 'ACTIVE', daysSinceActive: diffDays };
    }

    /**
     * Calculate what the new streak should be
     */
    calculateNewStreak(currentStreak, lastActiveDate) {
        const now = new Date();
        const lastActive = new Date(lastActiveDate);

        // Same day check
        if (this._isSameDay(now, lastActive)) {
            return { newStreak: currentStreak, action: 'MAINTAIN' };
        }

        // Check if within 24h window
        const hoursDiff = (now - lastActive) / (1000 * 60 * 60);

        if (hoursDiff > STREAK_CONFIG.EXPIRATION_HOURS) {
            // Expired - reset
            return { newStreak: 1, action: 'RESET' };
        }

        // Within window - increment
        return { newStreak: currentStreak + 1, action: 'INCREMENT' };
    }

    _isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    /**
     * Refresh DNA snapshot using the weighted 50-drill calculation
     */
    async refreshDNASnapshot(userId) {
        const { data, error } = await this.supabase.client
            .rpc('fn_refresh_dna_snapshot', { p_user_id: userId });

        if (error) {
            console.error('DNA refresh failed:', error);
            return { success: false, error: error.message };
        }

        return data?.[0] || data;
    }

    /**
     * Process pending broadcasts to YELLOW silo
     */
    async processBroadcastQueue() {
        if (!this.supabase?.client) {
            // Return local queue for manual processing
            const queue = [...this.broadcastQueue];
            this.broadcastQueue = [];
            return { processed: queue.length, items: queue };
        }

        const { data, error } = await this.supabase.client
            .rpc('fn_process_streak_broadcasts');

        if (error) {
            console.error('Broadcast processing failed:', error);
            return { processed: 0, error: error.message };
        }

        return data?.[0] || data;
    }

    /**
     * Run daily streak check (for cron job)
     */
    async runDailyCheck() {
        const { data, error } = await this.supabase.client
            .rpc('fn_daily_streak_check');

        if (error) {
            console.error('Daily check failed:', error);
            return { success: false, error: error.message };
        }

        return data?.[0] || data;
    }

    /**
     * Get leaderboard of top streaks
     */
    async getStreakLeaderboard(limit = 50) {
        const { data, error } = await this.supabase.client
            .from('active_streak_status')
            .select('*')
            .gt('current_streak', 0)
            .order('current_streak', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Leaderboard fetch failed:', error);
            return [];
        }

        return data || [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📡 YELLOW SILO BROADCASTER
// ═══════════════════════════════════════════════════════════════════════════
export class YellowSiloBroadcaster {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.YELLOW_SILO_URL || 'http://localhost:3002';
        this.apiKey = config.apiKey || process.env.YELLOW_SILO_API_KEY;
    }

    /**
     * Broadcast streak update to Yellow (Diamond Economy) silo
     */
    async broadcastStreakUpdate(userId, streakData) {
        const payload = {
            source: 'RED_IDENTITY_DNA',
            event: 'STREAK_UPDATE',
            timestamp: new Date().toISOString(),
            data: {
                userId,
                action: streakData.action,
                oldStreak: streakData.oldStreak,
                newStreak: streakData.newStreak,
                multiplier: streakData.multiplier || this._calculateMultiplier(streakData.newStreak)
            }
        };

        try {
            // In production, this would be an HTTP request
            console.log(`📡 Broadcasting to YELLOW_DIAMOND: ${JSON.stringify(payload)}`);

            // Simulate HTTP request
            const response = {
                success: true,
                received: true,
                timestamp: new Date().toISOString()
            };

            return response;
        } catch (error) {
            console.error('Yellow silo broadcast failed:', error);
            return { success: false, error: error.message };
        }
    }

    _calculateMultiplier(streak) {
        if (streak >= 7) return 2.0;
        if (streak >= 3) return 1.5;
        return 1.0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    StreakIntegrityOracle,
    StreakData,
    YellowSiloBroadcaster,
    STREAK_CONFIG
};
