/**
 * 🧬 IDENTITY_DNA_ENGINE — DNA Aggregator Engine
 * 
 * @task SKILL_TIER_AGGREGATOR - recalc_skill_tier
 * @task TRUST_SCORE_DECAY - apply_trust_decay
 * @task DNA_HOLOGRAPHIC_EXPORT - get_player_dna_summary
 */

export const SKILL_TIER_MAP = {
    1: { name: 'BEGINNER', minAccuracy: 0 },
    2: { name: 'APPRENTICE', minAccuracy: 30 },
    3: { name: 'BRONZE', minAccuracy: 50 },
    4: { name: 'SILVER', minAccuracy: 60 },
    5: { name: 'GOLD', minAccuracy: 70 },
    6: { name: 'PLATINUM', minAccuracy: 75 },
    7: { name: 'DIAMOND', minAccuracy: 80 },
    8: { name: 'ELITE', minAccuracy: 85 },
    9: { name: 'MASTER', minAccuracy: 90 },
    10: { name: 'LEGEND', minAccuracy: 95 }
};

export const TRUST_DECAY_CONFIG = {
    THRESHOLD_DAYS: 30,
    DAILY_DECAY_RATE: 0.01,
    MIN_TRUST_SCORE: 10.0,
    RECOVERY_PER_CHECKIN: 0.5
};

export class DNAAggregatorEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // TASK 1: recalc_skill_tier - Fetch last 10 drills, (Avg_Accuracy * 100)
    async recalcSkillTier(userId) {
        const { data, error } = await this.supabase.client
            .rpc('recalc_skill_tier', { p_user_id: userId });

        if (!error && data) {
            const r = data[0] || data;
            return { success: r.success, newTier: r.new_tier, avgAccuracy: r.avg_accuracy };
        }

        // Fallback: client-side
        const { data: drills } = await this.supabase.client
            .from('drill_performance')
            .select('accuracy')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(10);

        if (!drills?.length) return { success: false, newTier: 1, avgAccuracy: 0 };

        const avg = drills.reduce((s, d) => s + d.accuracy, 0) / drills.length;
        const tier = this.accuracyToTier(avg * 100);

        await this.supabase.client
            .from('profiles')
            .update({ skill_tier: tier, last_sync: new Date().toISOString() })
            .eq('id', userId);

        return { success: true, newTier: tier, avgAccuracy: avg };
    }

    accuracyToTier(score) {
        if (score >= 95) return 10;
        if (score >= 90) return 9;
        if (score >= 85) return 8;
        if (score >= 80) return 7;
        if (score >= 75) return 6;
        if (score >= 70) return 5;
        if (score >= 60) return 4;
        if (score >= 50) return 3;
        if (score >= 30) return 2;
        return 1;
    }

    // TASK 2: apply_trust_decay - If last_active > 30 days, reduce by 0.01 daily
    async applyTrustDecay() {
        const { data, error } = await this.supabase.client.rpc('apply_trust_decay');
        if (!error && data) {
            const r = data[0] || data;
            return { usersAffected: r.users_affected, totalDecay: r.total_decay_applied };
        }
        return { usersAffected: 0, totalDecay: 0 };
    }

    async recoverTrustFromCheckin(userId) {
        const { data } = await this.supabase.client
            .from('profiles')
            .select('trust_score')
            .eq('id', userId)
            .single();

        if (!data) return { success: false };

        const newScore = Math.min(100, data.trust_score + TRUST_DECAY_CONFIG.RECOVERY_PER_CHECKIN);

        await this.supabase.client
            .from('profiles')
            .update({ trust_score: newScore, last_sync: new Date().toISOString() })
            .eq('id', userId);

        return { success: true, newTrustScore: newScore };
    }

    // TASK 3: get_player_dna_summary - Combine Aggression, Grit, Skill for 3D hologram
    async getPlayerDNASummary(userId) {
        const { data, error } = await this.supabase.client
            .rpc('get_player_dna_summary', { p_user_id: userId });

        if (!error && data) return data;

        // Fallback
        const { data: profile } = await this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) return { error: 'User not found' };

        const { data: traits } = await this.supabase.client
            .from('player_traits')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        return {
            user_id: userId,
            username: profile.username,
            dna_triangle: {
                aggression: { value: traits?.aggression_score || 50 },
                grit: { value: traits?.grit_score || 50 },
                skill: { value: profile.skill_tier * 10, tier: profile.skill_tier }
            },
            reputation: { trust_score: profile.trust_score, xp_total: profile.xp_total },
            hologram: {
                glow_intensity: profile.skill_tier / 10,
                aura_color: profile.skill_tier >= 9 ? '#FF1493' : profile.skill_tier >= 7 ? '#00BFFF' : '#FFD700'
            }
        };
    }
}

export function calculateSkillTierFromAccuracy(avgAccuracy) {
    const score = avgAccuracy * 100;
    if (score >= 95) return { tier: 10, name: 'LEGEND' };
    if (score >= 90) return { tier: 9, name: 'MASTER' };
    if (score >= 85) return { tier: 8, name: 'ELITE' };
    if (score >= 80) return { tier: 7, name: 'DIAMOND' };
    if (score >= 75) return { tier: 6, name: 'PLATINUM' };
    if (score >= 70) return { tier: 5, name: 'GOLD' };
    if (score >= 60) return { tier: 4, name: 'SILVER' };
    if (score >= 50) return { tier: 3, name: 'BRONZE' };
    if (score >= 30) return { tier: 2, name: 'APPRENTICE' };
    return { tier: 1, name: 'BEGINNER' };
}
