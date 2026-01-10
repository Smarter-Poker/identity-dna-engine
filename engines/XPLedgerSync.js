/**
 * 🧬 IDENTITY_DNA_ENGINE — XP Ledger Sync
 * 
 * Synchronizes XP from the XP-Engine (Orb 3) to unified profiles.
 * Enforces immutable XP progression (LAW 2: XP never decreases).
 */

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ XP CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const XP_CONFIG = {
    MAX_STREAK_MULTIPLIER: 1.5,    // Maximum streak bonus
    STREAK_INCREMENT: 0.1,          // +10% per consecutive day
    DAILY_CAP: 10000,               // Maximum XP earnable per day
    SYNC_BATCH_SIZE: 100            // Records per sync batch
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 XP SOURCES
// ═══════════════════════════════════════════════════════════════════════════
export const XP_SOURCES = {
    // Training (Orb 4)
    TRAINING_CORRECT: { base: 10, multiplied: true },
    TRAINING_PERFECT: { base: 25, multiplied: true },
    LESSON_COMPLETE: { base: 50, multiplied: true },

    // Brain (Orb 5)
    SESSION_COMPLETE: { base: 100, multiplied: true },
    LEVEL_MASTERED: { base: 200, multiplied: true },

    // Arcade (Orb 7)
    ARCADE_WIN: { base: 50, multiplied: true },
    ARCADE_STREAK: { base: 20, multiplied: true },

    // Discovery (Orb 9)
    HAND_SHARED: { base: 5, multiplied: false },
    REVIEW_GIVEN: { base: 10, multiplied: false },

    // Special
    FIRST_LOGIN: { base: 100, multiplied: false },
    DAILY_BONUS: { base: 25, multiplied: true },
    ACHIEVEMENT: { base: 50, multiplied: false }
};

// ═══════════════════════════════════════════════════════════════════════════
// 📇 XP LEDGER SYNC CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class XPLedgerSync {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 GET LATEST XP
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get current total XP for a user
     * Pulls from XP ledger and calculates total
     */
    async getLatestXP(userId) {
        const { data, error } = await this.supabase.client
            .from('xp_ledger')
            .select('amount')
            .eq('user_id', userId);

        if (error) throw error;

        const total = (data || []).reduce((sum, entry) => sum + entry.amount, 0);
        return total;
    }

    /**
     * Get XP breakdown by source
     */
    async getXPBreakdown(userId) {
        const { data, error } = await this.supabase.client
            .from('xp_ledger')
            .select('source, amount, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const breakdown = {};
        (data || []).forEach(entry => {
            if (!breakdown[entry.source]) {
                breakdown[entry.source] = { total: 0, count: 0 };
            }
            breakdown[entry.source].total += entry.amount;
            breakdown[entry.source].count++;
        });

        return breakdown;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ➕ RECORD XP
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Record XP earned to the ledger
     * LAW 2: XP is appended, never modified
     */
    async recordXP(userId, source, baseAmount, metadata = {}) {
        // Validate source
        const sourceConfig = XP_SOURCES[source];
        if (!sourceConfig && baseAmount < 0) {
            throw new Error('LAW 2 VIOLATION: Cannot record negative XP');
        }

        // Get streak multiplier if applicable
        let multiplier = 1.0;
        if (sourceConfig?.multiplied) {
            multiplier = await this.getStreakMultiplier(userId);
        }

        const finalAmount = Math.floor(baseAmount * multiplier);

        // Check daily cap
        const todayXP = await this.getTodayXP(userId);
        const cappedAmount = Math.min(finalAmount, XP_CONFIG.DAILY_CAP - todayXP);

        if (cappedAmount <= 0) {
            return {
                awarded: false,
                reason: 'DAILY_CAP_REACHED',
                cap: XP_CONFIG.DAILY_CAP,
                todayTotal: todayXP
            };
        }

        // Record to ledger (immutable append)
        const { data, error } = await this.supabase.client
            .from('xp_ledger')
            .insert({
                user_id: userId,
                source,
                base_amount: baseAmount,
                multiplier,
                amount: cappedAmount,
                metadata,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            awarded: true,
            xpEntry: data,
            multiplier,
            finalAmount: cappedAmount
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔥 STREAK MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get current streak multiplier for a user
     */
    async getStreakMultiplier(userId) {
        const streak = await this.getCurrentStreak(userId);

        // Calculate multiplier: base 1.0 + (streak * 0.1), max 1.5
        const multiplier = Math.min(
            XP_CONFIG.MAX_STREAK_MULTIPLIER,
            1.0 + (streak * XP_CONFIG.STREAK_INCREMENT)
        );

        return multiplier;
    }

    /**
     * Get current login streak
     */
    async getCurrentStreak(userId) {
        const { data, error } = await this.supabase.client
            .from('user_streaks')
            .select('current_streak, last_active_date')
            .eq('user_id', userId)
            .maybeSingle();

        if (error || !data) return 0;

        // Check if streak is still valid (last activity was yesterday or today)
        const lastActive = new Date(data.last_active_date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastActiveDay = lastActive.toDateString();
        const todayStr = today.toDateString();
        const yesterdayStr = yesterday.toDateString();

        if (lastActiveDay === todayStr || lastActiveDay === yesterdayStr) {
            return data.current_streak;
        }

        // Streak broken
        return 0;
    }

    /**
     * Update streak on daily login
     */
    async updateStreak(userId) {
        const today = new Date().toISOString().split('T')[0];

        const { data: existing } = await this.supabase.client
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existing) {
            // First login
            await this.supabase.client
                .from('user_streaks')
                .insert({
                    user_id: userId,
                    current_streak: 1,
                    longest_streak: 1,
                    last_active_date: today,
                    streak_started_at: today
                });
            return { streak: 1, isNew: true };
        }

        const lastActive = existing.last_active_date;

        // Already logged in today
        if (lastActive === today) {
            return { streak: existing.current_streak, isNew: false };
        }

        // Check if yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak;
        let streakStartedAt = existing.streak_started_at;

        if (lastActive === yesterdayStr) {
            // Continue streak
            newStreak = existing.current_streak + 1;
        } else {
            // Streak broken, start new
            newStreak = 1;
            streakStartedAt = today;
        }

        const longestStreak = Math.max(existing.longest_streak, newStreak);

        await this.supabase.client
            .from('user_streaks')
            .update({
                current_streak: newStreak,
                longest_streak: longestStreak,
                last_active_date: today,
                streak_started_at: streakStartedAt
            })
            .eq('user_id', userId);

        return {
            streak: newStreak,
            longestStreak,
            isNew: newStreak === 1
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATISTICS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get XP earned today
     */
    async getTodayXP(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await this.supabase.client
            .from('xp_ledger')
            .select('amount')
            .eq('user_id', userId)
            .gte('created_at', today.toISOString());

        if (error) throw error;

        return (data || []).reduce((sum, entry) => sum + entry.amount, 0);
    }

    /**
     * Get XP earned this week
     */
    async getWeeklyXP(userId) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data, error } = await this.supabase.client
            .from('xp_ledger')
            .select('amount, created_at')
            .eq('user_id', userId)
            .gte('created_at', weekAgo.toISOString());

        if (error) throw error;

        // Group by day
        const byDay = {};
        (data || []).forEach(entry => {
            const day = entry.created_at.split('T')[0];
            byDay[day] = (byDay[day] || 0) + entry.amount;
        });

        return {
            total: (data || []).reduce((sum, e) => sum + e.amount, 0),
            byDay
        };
    }

    /**
     * Get XP leaderboard
     */
    async getLeaderboard(period = 'all', limit = 100) {
        let query = this.supabase.client
            .from('profiles')
            .select('id, username, xp_total, skill_tier')
            .order('xp_total', { ascending: false })
            .limit(limit);

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 SYNC OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sync XP totals from ledger to profiles (batch operation)
     */
    async syncAllProfiles() {
        console.log('🔄 Starting XP sync for all profiles...');

        // Get all user IDs
        const { data: users, error } = await this.supabase.client
            .from('profiles')
            .select('id');

        if (error) throw error;

        let synced = 0;
        for (const user of users || []) {
            const xpTotal = await this.getLatestXP(user.id);

            await this.supabase.client
                .from('profiles')
                .update({
                    xp_total: xpTotal,
                    last_sync: new Date().toISOString()
                })
                .eq('id', user.id);

            synced++;
            if (synced % XP_CONFIG.SYNC_BATCH_SIZE === 0) {
                console.log(`📊 Synced ${synced}/${users.length} profiles`);
            }
        }

        console.log(`✅ XP sync complete: ${synced} profiles updated`);
        return { synced };
    }
}
