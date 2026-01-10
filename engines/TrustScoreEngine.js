/**
 * 🧬 IDENTITY_DNA_ENGINE — Trust Score Engine
 * 
 * Calculates composite trust/reputation score from 
 * Discovery (Orb 9) social interactions and geo-verified reviews.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 TRUST SCORE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const TRUST_CONFIG = {
    BASE_SCORE: 50.0,           // Starting trust score
    MIN_SCORE: 0.0,
    MAX_SCORE: 100.0,
    DECAY_RATE: 0.01,           // Daily decay if inactive
    DECAY_THRESHOLD_DAYS: 30    // Days before decay starts
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TRUST FACTOR WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════
const TRUST_WEIGHTS = {
    // Positive factors
    POSITIVE_REVIEW: 2.0,           // +2 per positive review
    GEO_VERIFIED: 5.0,              // +5 for geo-verification
    PROFILE_COMPLETE: 3.0,          // +3 for complete profile
    LONG_TENURE: 0.5,               // +0.5 per month on platform
    CONSISTENT_ACTIVITY: 1.0,       // +1 per active month
    TOURNAMENT_COMPLETED: 0.5,      // +0.5 per completed tourney
    HAND_SHARED: 0.1,               // +0.1 per hand shared
    HELPFUL_REVIEW: 1.0,            // +1 per "helpful" upvote received

    // Negative factors
    NEGATIVE_REVIEW: -3.0,          // -3 per negative review
    REPORTED: -5.0,                 // -5 per substantiated report
    INACTIVE_PENALTY: -0.1,         // -0.1 per day inactive (after threshold)
    DISPUTED_TRANSACTION: -2.0,     // -2 per disputed transaction
    NO_SHOW: -4.0,                  // -4 per tournament no-show
    SPAM_FLAG: -10.0                // -10 for spam behavior
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏛️ TRUST TIERS
// ═══════════════════════════════════════════════════════════════════════════
export const TRUST_TIERS = {
    UNTRUSTED: { min: 0, max: 20, color: '#FF0000', label: 'Untrusted' },
    CAUTIONED: { min: 20, max: 40, color: '#FF8C00', label: 'Cautioned' },
    NEUTRAL: { min: 40, max: 60, color: '#FFD700', label: 'Neutral' },
    TRUSTED: { min: 60, max: 80, color: '#32CD32', label: 'Trusted' },
    HIGHLY_TRUSTED: { min: 80, max: 100, color: '#00FF00', label: 'Highly Trusted' }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 TRUST SCORE ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class TrustScoreEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 MAIN TRUST CALCULATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Calculate composite trust score for a user
     * Pulls data from Orb 9 (Discovery & Trust) and aggregates factors
     * 
     * @param {string} userId - User ID to calculate trust for
     * @returns {number} Trust score (0.0 - 100.0)
     */
    async calculateScore(userId) {
        try {
            // Fetch trust factors from database
            const factors = await this.fetchTrustFactors(userId);

            // Calculate base score
            let score = TRUST_CONFIG.BASE_SCORE;

            // Apply positive factors
            score += (factors.positiveReviews || 0) * TRUST_WEIGHTS.POSITIVE_REVIEW;
            score += (factors.geoVerified ? TRUST_WEIGHTS.GEO_VERIFIED : 0);
            score += (factors.profileComplete ? TRUST_WEIGHTS.PROFILE_COMPLETE : 0);
            score += (factors.tenureMonths || 0) * TRUST_WEIGHTS.LONG_TENURE;
            score += (factors.activeMonths || 0) * TRUST_WEIGHTS.CONSISTENT_ACTIVITY;
            score += (factors.tournamentsCompleted || 0) * TRUST_WEIGHTS.TOURNAMENT_COMPLETED;
            score += (factors.handsShared || 0) * TRUST_WEIGHTS.HAND_SHARED;
            score += (factors.helpfulUpvotes || 0) * TRUST_WEIGHTS.HELPFUL_REVIEW;

            // Apply negative factors
            score += (factors.negativeReviews || 0) * TRUST_WEIGHTS.NEGATIVE_REVIEW;
            score += (factors.reports || 0) * TRUST_WEIGHTS.REPORTED;
            score += (factors.disputedTransactions || 0) * TRUST_WEIGHTS.DISPUTED_TRANSACTION;
            score += (factors.noShows || 0) * TRUST_WEIGHTS.NO_SHOW;
            score += (factors.spamFlags || 0) * TRUST_WEIGHTS.SPAM_FLAG;

            // Apply inactivity decay
            score = this.applyInactivityDecay(score, factors.daysSinceLastActivity);

            // Bound score to valid range
            score = Math.max(TRUST_CONFIG.MIN_SCORE,
                Math.min(TRUST_CONFIG.MAX_SCORE, score));

            return Math.round(score * 100) / 100; // 2 decimal precision

        } catch (error) {
            console.error(`Error calculating trust score for ${userId}:`, error);
            return TRUST_CONFIG.BASE_SCORE;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 DATA FETCHING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Fetch trust factors from Orb 9 data
     */
    async fetchTrustFactors(userId) {
        // Fetch from multiple tables in parallel
        const [reviews, activity, verification, reports] = await Promise.all([
            this.fetchReviews(userId),
            this.fetchActivity(userId),
            this.fetchVerification(userId),
            this.fetchReports(userId)
        ]);

        return {
            // Reviews
            positiveReviews: reviews.positive,
            negativeReviews: reviews.negative,
            helpfulUpvotes: reviews.helpfulUpvotes,

            // Activity
            tenureMonths: activity.tenureMonths,
            activeMonths: activity.activeMonths,
            daysSinceLastActivity: activity.daysSinceLastActivity,
            tournamentsCompleted: activity.tournamentsCompleted,
            handsShared: activity.handsShared,

            // Verification
            geoVerified: verification.geoVerified,
            profileComplete: verification.profileComplete,

            // Reports & Issues
            reports: reports.substantiated,
            disputedTransactions: reports.disputes,
            noShows: reports.noShows,
            spamFlags: reports.spam
        };
    }

    async fetchReviews(userId) {
        const { data, error } = await this.supabase.client
            .from('user_reviews')
            .select('rating, helpful_count')
            .eq('target_user_id', userId);

        if (error || !data) {
            return { positive: 0, negative: 0, helpfulUpvotes: 0 };
        }

        return {
            positive: data.filter(r => r.rating >= 4).length,
            negative: data.filter(r => r.rating <= 2).length,
            helpfulUpvotes: data.reduce((sum, r) => sum + (r.helpful_count || 0), 0)
        };
    }

    async fetchActivity(userId) {
        const { data: profile } = await this.supabase.client
            .from('profiles')
            .select('created_at, last_sync')
            .eq('id', userId)
            .maybeSingle();

        const { data: activity } = await this.supabase.client
            .from('user_activity')
            .select('activity_date, activity_type')
            .eq('user_id', userId);

        if (!profile) {
            return {
                tenureMonths: 0,
                activeMonths: 0,
                daysSinceLastActivity: 999,
                tournamentsCompleted: 0,
                handsShared: 0
            };
        }

        const createdAt = new Date(profile.created_at);
        const tenureMonths = Math.floor(
            (Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );

        const lastSync = new Date(profile.last_sync || profile.created_at);
        const daysSinceLastActivity = Math.floor(
            (Date.now() - lastSync.getTime()) / (24 * 60 * 60 * 1000)
        );

        const uniqueMonths = new Set();
        const tournamentsCompleted = [];
        const handsShared = [];

        (activity || []).forEach(a => {
            const month = a.activity_date?.substring(0, 7);
            if (month) uniqueMonths.add(month);
            if (a.activity_type === 'TOURNAMENT_COMPLETE') tournamentsCompleted.push(a);
            if (a.activity_type === 'HAND_SHARED') handsShared.push(a);
        });

        return {
            tenureMonths,
            activeMonths: uniqueMonths.size,
            daysSinceLastActivity,
            tournamentsCompleted: tournamentsCompleted.length,
            handsShared: handsShared.length
        };
    }

    async fetchVerification(userId) {
        const { data } = await this.supabase.client
            .from('user_verification')
            .select('geo_verified, profile_complete')
            .eq('user_id', userId)
            .maybeSingle();

        return {
            geoVerified: data?.geo_verified || false,
            profileComplete: data?.profile_complete || false
        };
    }

    async fetchReports(userId) {
        const { data } = await this.supabase.client
            .from('user_reports')
            .select('report_type, substantiated')
            .eq('reported_user_id', userId)
            .eq('substantiated', true);

        const reports = data || [];

        return {
            substantiated: reports.filter(r => r.report_type === 'GENERAL').length,
            disputes: reports.filter(r => r.report_type === 'DISPUTE').length,
            noShows: reports.filter(r => r.report_type === 'NO_SHOW').length,
            spam: reports.filter(r => r.report_type === 'SPAM').length
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📉 DECAY & ADJUSTMENTS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Apply inactivity decay to trust score
     */
    applyInactivityDecay(score, daysSinceLastActivity) {
        if (daysSinceLastActivity <= TRUST_CONFIG.DECAY_THRESHOLD_DAYS) {
            return score;
        }

        const decayDays = daysSinceLastActivity - TRUST_CONFIG.DECAY_THRESHOLD_DAYS;
        const decay = decayDays * TRUST_WEIGHTS.INACTIVE_PENALTY;

        return score + decay; // decay is negative
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🏷️ TIER UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get trust tier from score
     */
    getTrustTier(score) {
        if (score >= TRUST_TIERS.HIGHLY_TRUSTED.min) return 'HIGHLY_TRUSTED';
        if (score >= TRUST_TIERS.TRUSTED.min) return 'TRUSTED';
        if (score >= TRUST_TIERS.NEUTRAL.min) return 'NEUTRAL';
        if (score >= TRUST_TIERS.CAUTIONED.min) return 'CAUTIONED';
        return 'UNTRUSTED';
    }

    /**
     * Get trust tier info
     */
    getTrustTierInfo(score) {
        const tierName = this.getTrustTier(score);
        return {
            tier: tierName,
            ...TRUST_TIERS[tierName],
            score
        };
    }

    /**
     * Check if user meets minimum trust requirement
     */
    meetsTrustRequirement(score, requiredTier) {
        const currentTierIndex = Object.keys(TRUST_TIERS).indexOf(this.getTrustTier(score));
        const requiredTierIndex = Object.keys(TRUST_TIERS).indexOf(requiredTier);
        return currentTierIndex >= requiredTierIndex;
    }
}
