/**
 * 🔮 IDENTITY_DNA_ENGINE — Holographic Chart Engine
 * 
 * @task_03: HOLOGRAPHIC_CHART_ENGINE
 * 
 * Manages the 5-point holographic radar chart for DNA visualization.
 * Tracks performance history and generates 3D vertex data.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📊 RADAR CHART CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
export const RADAR_CHART_CONFIG = {
    // 5 Primary Axes
    axes: [
        { key: 'skill', label: 'Skill', color: '#00BFFF', angle: 90 },      // Top
        { key: 'grit', label: 'Grit', color: '#32CD32', angle: 18 },        // Top-Right
        { key: 'accuracy', label: 'Accuracy', color: '#FFD700', angle: -54 }, // Bottom-Right
        { key: 'wealth', label: 'Wealth', color: '#9400D3', angle: -126 },  // Bottom-Left
        { key: 'aggression', label: 'Aggression', color: '#FF4500', angle: -198 } // Top-Left
    ],

    // Scale settings
    minValue: 0,
    maxValue: 100,

    // Visual settings
    hologramGlowColors: {
        LEGEND: '#FF1493',
        MASTER: '#FF1493',
        ELITE: '#00BFFF',
        DIAMOND: '#00BFFF',
        PLATINUM: '#FFD700',
        GOLD: '#FFD700',
        DEFAULT: '#808080'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 5-POINT RADAR CHART DATA STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════
export class RadarChartPoint {
    constructor(key, value, delta = 0, label = '', color = '#808080') {
        this.key = key;
        this.value = Math.max(0, Math.min(100, value)); // Clamp 0-100
        this.delta = delta;
        this.label = label;
        this.color = color;
        this.normalized = this.value / 100;
    }

    toJSON() {
        return {
            key: this.key,
            value: this.value,
            delta: this.delta,
            label: this.label,
            color: this.color,
            normalized: this.normalized
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 HOLOGRAPHIC RADAR CHART
// ═══════════════════════════════════════════════════════════════════════════
export class HolographicRadarChart {
    constructor(dnaData = {}) {
        this.points = this._initializePoints(dnaData);
        this.compositeScore = this._calculateComposite();
        this.vertices = this._calculateVertices();
    }

    _initializePoints(data) {
        return RADAR_CHART_CONFIG.axes.map(axis => {
            const value = data[axis.key] ?? data[`${axis.key}_score`] ?? 50;
            const delta = data[`${axis.key}_delta`] ?? 0;
            return new RadarChartPoint(axis.key, value, delta, axis.label, axis.color);
        });
    }

    _calculateComposite() {
        const weights = { skill: 0.25, grit: 0.20, aggression: 0.15, accuracy: 0.25, wealth: 0.15 };
        let total = 0;

        for (const point of this.points) {
            total += point.value * (weights[point.key] || 0.20);
        }

        return Math.round(total * 100) / 100;
    }

    _calculateVertices() {
        const vertices = [];
        const angleStep = (2 * Math.PI) / 5;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const angle = (i * angleStep) - (Math.PI / 2); // Start from top
            const radius = point.normalized;

            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: point.normalized * 0.3, // Slight Z for 3D effect
                value: point.value,
                key: point.key
            });
        }

        return vertices;
    }

    getPoint(key) {
        return this.points.find(p => p.key === key);
    }

    updatePoint(key, newValue, newDelta = null) {
        const point = this.getPoint(key);
        if (point) {
            point.value = Math.max(0, Math.min(100, newValue));
            point.normalized = point.value / 100;
            if (newDelta !== null) point.delta = newDelta;

            this.compositeScore = this._calculateComposite();
            this.vertices = this._calculateVertices();
        }
        return this;
    }

    toJSON() {
        return {
            points: this.points.map(p => p.toJSON()),
            compositeScore: this.compositeScore,
            vertices: this.vertices
        };
    }

    /**
     * Generate SVG path for 2D radar chart
     */
    getSVGPath(centerX = 100, centerY = 100, scale = 80) {
        const pathPoints = this.vertices.map(v => ({
            x: centerX + v.x * scale,
            y: centerY - v.y * scale // Invert Y for SVG
        }));

        const path = pathPoints.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';

        return path;
    }

    /**
     * Generate WebGL vertex buffer for 3D rendering
     */
    getWebGLVertices() {
        const floatArray = [];

        // Center vertex
        floatArray.push(0, 0, 0);

        // Outer vertices
        for (const v of this.vertices) {
            floatArray.push(v.x, v.y, v.z);
        }

        // Close the shape
        floatArray.push(this.vertices[0].x, this.vertices[0].y, this.vertices[0].z);

        return new Float32Array(floatArray);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📈 PERFORMANCE HISTORY TRACKER
// ═══════════════════════════════════════════════════════════════════════════
export class PerformanceHistoryTracker {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Record a performance snapshot
     */
    async recordSnapshot(userId, periodType = 'DAILY') {
        const { data, error } = await this.supabase.client
            .rpc('record_performance_snapshot', {
                p_user_id: userId,
                p_period_type: periodType
            });

        if (error) {
            console.error('Failed to record snapshot:', error);
            return { success: false, error: error.message };
        }

        return data?.[0] || data;
    }

    /**
     * Get performance history for time-series chart
     */
    async getHistory(userId, periodType = 'DAILY', limit = 30) {
        const { data, error } = await this.supabase.client
            .from('performance_history')
            .select('*')
            .eq('user_id', userId)
            .eq('period_type', periodType)
            .order('recorded_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to get history:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get radar chart data from database
     */
    async getRadarChartData(userId) {
        const { data, error } = await this.supabase.client
            .rpc('get_radar_chart_data', { p_user_id: userId });

        if (error) {
            console.error('Failed to get radar chart:', error);
            return null;
        }

        return data;
    }

    /**
     * Get holographic radar chart view data
     */
    async getHolographicData(userId) {
        const { data, error } = await this.supabase.client
            .from('holographic_radar_chart')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Failed to get holographic data:', error);
            return null;
        }

        return data;
    }

    /**
     * Calculate trend from history
     */
    async calculateTrend(userId, metric, periodType = 'DAILY', limit = 7) {
        const history = await this.getHistory(userId, periodType, limit);

        if (history.length < 2) {
            return { trend: 'neutral', change: 0, samples: history.length };
        }

        const metricKey = `${metric}_score`;
        const values = history.map(h => h[metricKey] || 50).reverse();

        // Simple linear regression
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        return {
            trend: slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'neutral',
            change: Math.round(slope * 100) / 100,
            samples: n,
            first: values[0],
            last: values[values.length - 1]
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 DNA ATTRIBUTES MANAGER
// ═══════════════════════════════════════════════════════════════════════════
export class DNAAttributesManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get DNA attributes for a user
     */
    async getDNAAttributes(userId) {
        const { data, error } = await this.supabase.client
            .from('dna_attributes')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Failed to get DNA:', error);
            return null;
        }

        return data;
    }

    /**
     * Calculate DNA from drill performance
     */
    async calculateDNA(userId) {
        const { data, error } = await this.supabase.client
            .rpc('calculate_dna_from_drills', { p_user_id: userId });

        if (error) {
            console.error('Failed to calculate DNA:', error);
            return { success: false, error: error.message };
        }

        return data?.[0] || data;
    }

    /**
     * Build radar chart from DNA attributes
     */
    async buildRadarChart(userId) {
        const dna = await this.getDNAAttributes(userId);

        if (!dna) {
            return new HolographicRadarChart(); // Return default chart
        }

        return new HolographicRadarChart({
            skill: dna.accuracy, // Map accuracy to skill
            grit: dna.grit,
            aggression: dna.aggression,
            accuracy: dna.accuracy,
            wealth: dna.wealth
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 HOLOGRAPHIC CHART ENGINE (Main Export)
// ═══════════════════════════════════════════════════════════════════════════
export class HolographicChartEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.historyTracker = new PerformanceHistoryTracker(supabaseClient);
        this.dnaManager = new DNAAttributesManager(supabaseClient);
    }

    /**
     * Get complete holographic data for a user
     */
    async getHolographicProfile(userId) {
        const [dna, history, holographic] = await Promise.all([
            this.dnaManager.getDNAAttributes(userId),
            this.historyTracker.getHistory(userId, 'DAILY', 7),
            this.historyTracker.getHolographicData(userId)
        ]);

        const chart = dna ? new HolographicRadarChart({
            skill: dna.accuracy,
            grit: dna.grit,
            aggression: dna.aggression,
            accuracy: dna.accuracy,
            wealth: dna.wealth
        }) : new HolographicRadarChart();

        return {
            userId,
            dna,
            radarChart: chart.toJSON(),
            svgPath: chart.getSVGPath(),
            history: history.map(h => ({
                date: h.period_start,
                composite: h.composite_score,
                skill: h.skill_score,
                grit: h.grit_score
            })),
            holographic
        };
    }

    /**
     * Record daily performance and recalculate DNA
     */
    async dailyUpdate(userId) {
        // Calculate DNA from recent drills
        await this.dnaManager.calculateDNA(userId);

        // Record performance snapshot
        const snapshot = await this.historyTracker.recordSnapshot(userId, 'DAILY');

        return {
            success: true,
            snapshot,
            message: 'Daily holographic data updated'
        };
    }

    /**
     * Get trends for all 5 axes
     */
    async getAllTrends(userId) {
        const axes = ['skill', 'grit', 'aggression', 'accuracy', 'wealth'];
        const trends = {};

        for (const axis of axes) {
            trends[axis] = await this.historyTracker.calculateTrend(userId, axis);
        }

        return trends;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export default {
    HolographicChartEngine,
    HolographicRadarChart,
    RadarChartPoint,
    PerformanceHistoryTracker,
    DNAAttributesManager,
    RADAR_CHART_CONFIG
};
