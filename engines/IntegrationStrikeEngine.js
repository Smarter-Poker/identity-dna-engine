/**
 * ⚡️ IDENTITY_DNA_ENGINE — Integration Strike Engine (Prompts 16-18)
 * 
 * @task_16: XP_MINTING_AUTHORITY_PROTOCOL
 * @task_17: HOLOGRAPHIC_CHART_DATA_STREAM
 * @task_18: STREAK_TIMESTAMP_ORACLE
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 TASK 16: XP MINTING AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 85% Mastery Gate Constants
 */
export const MASTERY_GATE = {
    THRESHOLD: 0.85,
    ACCURACY_WEIGHT: 0.6,
    GTO_WEIGHT: 0.4
};

/**
 * XP Minting Authority
 * Validates 85% gate before allowing XP grants
 */
export class XPMintingAuthority {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Calculate gate score from accuracy and GTO compliance
     */
    calculateGateScore(accuracy, gtoCompliance) {
        if (accuracy == null && gtoCompliance == null) return 0;
        if (gtoCompliance == null) return accuracy;
        if (accuracy == null) return gtoCompliance;

        return (accuracy * MASTERY_GATE.ACCURACY_WEIGHT) +
            (gtoCompliance * MASTERY_GATE.GTO_WEIGHT);
    }

    /**
     * Check if score passes 85% mastery gate
     */
    passesGate(score) {
        return score >= MASTERY_GATE.THRESHOLD;
    }

    /**
     * Request XP grant with gate verification
     */
    async requestXPGrant(userId, amount, options = {}) {
        const {
            sourceSilo = 'GREEN_CONTENT',
            accuracyScore = null,
            gtoCompliance = null,
            drillId = null,
            bypassGate = false,
            metadata = {}
        } = options;

        // Pre-check gate locally
        const gateScore = this.calculateGateScore(accuracyScore, gtoCompliance);
        const wouldPass = this.passesGate(gateScore) || bypassGate;

        // Call RPC
        const { data, error } = await this.supabase.client
            .rpc('rpc_accept_xp_grant', {
                p_user_id: userId,
                p_amount: amount,
                p_source_silo: sourceSilo,
                p_accuracy_score: accuracyScore,
                p_gto_compliance: gtoCompliance,
                p_drill_id: drillId,
                p_bypass_gate: bypassGate,
                p_metadata: metadata
            });

        if (error) {
            console.error('XP grant error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    /**
     * Get grant history for user
     */
    async getGrantHistory(userId, limit = 50) {
        const { data, error } = await this.supabase.client
            .from('xp_grant_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Grant history error:', error);
            return [];
        }

        return data || [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TASK 17: HOLOGRAPHIC CHART DATA STREAM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Radar Chart Configuration
 */
export const RADAR_AXES = {
    AGGRESSION: { label: 'Aggression', color: '#FF4500', weight: 0.20 },
    GRIT: { label: 'Grit', color: '#32CD32', weight: 0.20 },
    ACCURACY: { label: 'Accuracy', color: '#00BFFF', weight: 0.30 },
    WEALTH: { label: 'Wealth', color: '#FFD700', weight: 0.20 },
    LUCK: { label: 'Luck', color: '#9400D3', weight: 0.10 }
};

/**
 * Holographic Chart Data Stream
 * Aggregates data from GREEN (Accuracy) and YELLOW (Wealth)
 */
export class HolographicChartStream {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get performance metrics for 5-point radar
     */
    async getPerformanceMetrics(userId) {
        const { data, error } = await this.supabase.client
            .rpc('get_performance_metrics', { p_user_id: userId });

        if (error) {
            console.error('Performance metrics error:', error);
            return null;
        }

        return data;
    }

    /**
     * Build local radar chart from raw data
     */
    buildRadarChart(data) {
        const { aggression, grit, accuracy, wealth, luck } = data;

        // Calculate composite score
        const composite =
            (aggression * RADAR_AXES.AGGRESSION.weight) +
            (grit * RADAR_AXES.GRIT.weight) +
            (accuracy * RADAR_AXES.ACCURACY.weight) +
            (wealth * RADAR_AXES.WEALTH.weight) +
            (luck * RADAR_AXES.LUCK.weight);

        // Build vertices (pentagon)
        const vertices = [
            { axis: 'aggression', angle: 90, value: aggression },
            { axis: 'grit', angle: 18, value: grit },
            { axis: 'accuracy', angle: -54, value: accuracy },
            { axis: 'wealth', angle: -126, value: wealth },
            { axis: 'luck', angle: -198, value: luck }
        ].map(v => ({
            ...v,
            x: Math.cos((v.angle * Math.PI) / 180) * v.value,
            y: Math.sin((v.angle * Math.PI) / 180) * v.value
        }));

        return {
            radar_chart: {
                aggression: { value: aggression, ...RADAR_AXES.AGGRESSION },
                grit: { value: grit, ...RADAR_AXES.GRIT },
                accuracy: { value: accuracy, ...RADAR_AXES.ACCURACY },
                wealth: { value: wealth, ...RADAR_AXES.WEALTH },
                luck: { value: luck, ...RADAR_AXES.LUCK }
            },
            composite_score: Math.round(composite * 10000) / 10000,
            vertices
        };
    }

    /**
     * Generate SVG path for radar chart
     */
    generateSVGPath(vertices, scale = 100) {
        const points = vertices.map(v =>
            `${(v.x * scale + scale).toFixed(2)},${(scale - v.y * scale).toFixed(2)}`
        );
        return `M ${points.join(' L ')} Z`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⏰ TASK 18: STREAK TIMESTAMP ORACLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Streak Multiplier Tiers
 */
export const STREAK_MULTIPLIERS = {
    NONE: { minDays: 0, multiplier: 1.0, tier: 'NONE' },
    STANDARD: { minDays: 1, multiplier: 1.0, tier: 'STANDARD' },
    FIRE_1_5X: { minDays: 3, multiplier: 1.5, tier: 'FIRE_1_5X' },
    FIRE_2X: { minDays: 7, multiplier: 2.0, tier: 'FIRE_2X' }
};

/**
 * Streak Timestamp Oracle
 * 24-hour window enforcement and YELLOW multiplier signaling
 */
export class StreakTimestampOracle {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get multiplier tier from streak count
     */
    getMultiplierTier(streakCount) {
        if (streakCount >= 7) return STREAK_MULTIPLIERS.FIRE_2X;
        if (streakCount >= 3) return STREAK_MULTIPLIERS.FIRE_1_5X;
        if (streakCount >= 1) return STREAK_MULTIPLIERS.STANDARD;
        return STREAK_MULTIPLIERS.NONE;
    }

    /**
     * Calculate hours remaining in 24h window
     */
    getHoursRemaining(lastActiveDate) {
        const lastActive = new Date(lastActiveDate);
        const expiry = new Date(lastActive.getTime() + (24 * 60 * 60 * 1000));
        const now = new Date();

        const hoursRemaining = (expiry - now) / (1000 * 60 * 60);
        return Math.max(0, hoursRemaining);
    }

    /**
     * Check if streak is within 24h window
     */
    isStreakActive(lastActiveDate) {
        return this.getHoursRemaining(lastActiveDate) > 0;
    }

    /**
     * Call streak oracle service
     */
    async checkOracle(userId, action = 'CHECK') {
        const { data, error } = await this.supabase.client
            .rpc('streak_oracle_service', {
                p_user_id: userId,
                p_action: action
            });

        if (error) {
            console.error('Streak oracle error:', error);
            return { success: false, error: error.message };
        }

        return data;
    }

    /**
     * Signal YELLOW silo for multiplier application
     */
    async signalMultiplier(userId) {
        return await this.checkOracle(userId, 'SIGNAL');
    }

    /**
     * Build multiplier signal payload for YELLOW
     */
    buildSignalPayload(userId, streakData) {
        const tier = this.getMultiplierTier(streakData.currentStreak);
        const hoursRemaining = this.getHoursRemaining(streakData.lastActiveDate);

        return {
            source: 'RED_STREAK_ORACLE',
            target: 'YELLOW_DIAMOND',
            signal_type: 'STREAK_MULTIPLIER',
            timestamp: new Date().toISOString(),
            data: {
                userId,
                multiplier: tier.multiplier,
                multiplierTier: tier.tier,
                streakCount: streakData.currentStreak,
                hoursRemaining: Math.round(hoursRemaining * 100) / 100,
                validUntil: new Date(Date.now() + (hoursRemaining * 60 * 60 * 1000)).toISOString()
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡️ INTEGRATION STRIKE ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class IntegrationStrikeEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.xpAuthority = new XPMintingAuthority(supabaseClient);
        this.chartStream = new HolographicChartStream(supabaseClient);
        this.streakOracle = new StreakTimestampOracle(supabaseClient);
    }

    /**
     * Process drill completion with full integration
     * - Verify 85% gate
     * - Grant XP if passed
     * - Update holographic data
     * - Signal multiplier to YELLOW
     */
    async processDrillCompletion(userId, drillResult) {
        const results = {
            xpGrant: null,
            radarData: null,
            multiplierSignal: null
        };

        // 1. XP Grant with 85% gate
        results.xpGrant = await this.xpAuthority.requestXPGrant(
            userId,
            drillResult.xpAmount || 100,
            {
                sourceSilo: 'GREEN_CONTENT',
                accuracyScore: drillResult.accuracy,
                gtoCompliance: drillResult.gtoCompliance,
                drillId: drillResult.drillId
            }
        );

        // 2. Refresh holographic data
        results.radarData = await this.chartStream.getPerformanceMetrics(userId);

        // 3. Check and signal streak multiplier
        results.multiplierSignal = await this.streakOracle.checkOracle(userId, 'SIGNAL');

        return results;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    IntegrationStrikeEngine,
    XPMintingAuthority,
    HolographicChartStream,
    StreakTimestampOracle,
    MASTERY_GATE,
    RADAR_AXES,
    STREAK_MULTIPLIERS
};
