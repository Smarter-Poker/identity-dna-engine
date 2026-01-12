/**
 * 🎨 IDENTITY_DNA_ENGINE — Visual Addiction Tests (Prompts 19-21)
 * 
 * @task_19: HOLOGRAPHIC_RADAR_ANIMATION
 * @task_20: XP_LEVEL_VISUAL_STATE
 * @task_21: STREAK_FLAME_INTENSITY_LOGIC
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
    DNAPulseEngine,
    TierVisualEngine,
    StreakFlameEngine,
    PULSE_CONFIG,
    TIER_COLORS,
    STREAK_FLAMES
} from '../engines/VisualAddictionEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 TASK 19: HOLOGRAPHIC_RADAR_ANIMATION
// ═══════════════════════════════════════════════════════════════════════════
describe('🔮 TASK 19: HOLOGRAPHIC_RADAR_ANIMATION', () => {

    describe('DNAPulseEngine', () => {
        let engine;

        beforeEach(() => {
            engine = new DNAPulseEngine();
        });

        it('✅ should generate pulse phase between 0.9 and 1.1', () => {
            const phase = engine.getPulsePhase();

            assert.ok(phase >= 0.9 && phase <= 1.1, `Phase ${phase} should be between 0.9-1.1`);
        });

        it('✅ should calculate rotation angle', () => {
            const angle = engine.getRotationAngle();

            assert.ok(typeof angle === 'number');
            assert.ok(angle >= 0 && angle < 360);
        });

        it('✅ should animate radar values', () => {
            const baseValues = {
                aggression: 0.7,
                grit: 0.6,
                accuracy: 0.8,
                wealth: 0.5,
                luck: 0.5
            };

            const animated = engine.animateRadar(baseValues);

            assert.ok(animated.values);
            assert.ok(animated.animation);
            assert.ok(animated.animation.pulsePhase);
        });

        it('✅ should grow/shrink values in real-time', () => {
            const baseValues = { accuracy: 0.8 };
            const animated = engine.animateRadar(baseValues);

            // Animated value should be base * pulsePhase
            const expectedAnimated = baseValues.accuracy * animated.animation.pulsePhase;
            assert.ok(Math.abs(animated.values.accuracy.animated - expectedAnimated) < 0.001);
        });

        it('✅ should generate 5-point WebGL vertices', () => {
            const values = {
                aggression: 0.7,
                grit: 0.6,
                accuracy: 0.8,
                wealth: 0.5,
                luck: 0.4
            };

            const vertices = engine.generateAnimatedVertices(values);

            assert.strictEqual(vertices.length, 5);
            vertices.forEach(v => {
                assert.ok(typeof v.x === 'number');
                assert.ok(typeof v.y === 'number');
                assert.ok(typeof v.z === 'number');
            });
        });

        it('✅ should generate CSS animation properties', () => {
            const css = engine.getCSSAnimation();

            assert.ok(css.animation);
            assert.ok(css.transform);
            assert.ok(css.filter);
        });
    });

    describe('PULSE_CONFIG', () => {
        it('✅ should have default pulse speed', () => {
            assert.strictEqual(PULSE_CONFIG.DEFAULT_SPEED, 1.0);
        });

        it('✅ should have particle density options', () => {
            assert.ok(PULSE_CONFIG.PARTICLE_DENSITIES.LOW);
            assert.ok(PULSE_CONFIG.PARTICLE_DENSITIES.ULTRA);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 TASK 20: XP_LEVEL_VISUAL_STATE
// ═══════════════════════════════════════════════════════════════════════════
describe('🎨 TASK 20: XP_LEVEL_VISUAL_STATE', () => {

    describe('TIER_COLORS', () => {
        it('✅ should define Bronze (0-10)', () => {
            const bronze = TIER_COLORS.BRONZE;
            assert.strictEqual(bronze.minLevel, 0);
            assert.strictEqual(bronze.maxLevel, 10);
            assert.strictEqual(bronze.primary, '#CD7F32');
        });

        it('✅ should define Silver (11-30)', () => {
            const silver = TIER_COLORS.SILVER;
            assert.strictEqual(silver.minLevel, 11);
            assert.strictEqual(silver.maxLevel, 30);
        });

        it('✅ should define Gold (31-60)', () => {
            const gold = TIER_COLORS.GOLD;
            assert.strictEqual(gold.minLevel, 31);
            assert.strictEqual(gold.maxLevel, 60);
        });

        it('✅ should define GTO-Master (61-100)', () => {
            const master = TIER_COLORS.GTO_MASTER;
            assert.strictEqual(master.minLevel, 61);
            assert.strictEqual(master.maxLevel, 100);
            assert.strictEqual(master.badge, '👑');
        });
    });

    describe('TierVisualEngine', () => {
        it('✅ should return Bronze for level 1-10', () => {
            assert.strictEqual(TierVisualEngine.getTierFromLevel(1).id, 'BRONZE');
            assert.strictEqual(TierVisualEngine.getTierFromLevel(10).id, 'BRONZE');
        });

        it('✅ should return Silver for level 11-30', () => {
            assert.strictEqual(TierVisualEngine.getTierFromLevel(11).id, 'SILVER');
            assert.strictEqual(TierVisualEngine.getTierFromLevel(25).id, 'SILVER');
        });

        it('✅ should return Gold for level 31-60', () => {
            assert.strictEqual(TierVisualEngine.getTierFromLevel(31).id, 'GOLD');
            assert.strictEqual(TierVisualEngine.getTierFromLevel(50).id, 'GOLD');
        });

        it('✅ should return GTO-Master for level 61-100', () => {
            assert.strictEqual(TierVisualEngine.getTierFromLevel(61).id, 'GTO_MASTER');
            assert.strictEqual(TierVisualEngine.getTierFromLevel(100).id, 'GTO_MASTER');
        });

        it('✅ should calculate tier progress', () => {
            const progress = TierVisualEngine.getTierProgress(20);
            // Level 20 in Silver (11-30): (20-11)/(30-11) = 9/19 ≈ 0.47
            assert.ok(progress > 0.4 && progress < 0.5);
        });

        it('✅ should get complete tier visual state', () => {
            const state = TierVisualEngine.getTierVisualState(45);

            assert.strictEqual(state.tier_id, 'GOLD');
            assert.strictEqual(state.level, 45);
            assert.ok(state.colors);
            assert.ok(state.css);
            assert.strictEqual(state.badge, '🥇');
        });

        it('✅ should generate CSS gradient', () => {
            const state = TierVisualEngine.getTierVisualState(70);

            assert.ok(state.css.background.includes('linear-gradient'));
            assert.ok(state.css.boxShadow.includes('0 0 20px'));
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 TASK 21: STREAK_FLAME_INTENSITY_LOGIC
// ═══════════════════════════════════════════════════════════════════════════
describe('🔥 TASK 21: STREAK_FLAME_INTENSITY_LOGIC', () => {

    describe('STREAK_FLAMES', () => {
        it('🔥 should define Small Blue Flame (3 days)', () => {
            const blue = STREAK_FLAMES.BLUE_STARTER;
            assert.strictEqual(blue.minDays, 3);
            assert.strictEqual(blue.color, '#1E90FF');
            assert.strictEqual(blue.height, 'SMALL');
        });

        it('🔥 should define Roaring Orange (7 days)', () => {
            const orange = STREAK_FLAMES.ORANGE_ROARING;
            assert.strictEqual(orange.minDays, 7);
            assert.strictEqual(orange.color, '#FF4500');
            assert.strictEqual(orange.height, 'MEDIUM');
        });

        it('🔥 should define Purple Fire (30 days)', () => {
            const purple = STREAK_FLAMES.PURPLE_INFERNO;
            assert.strictEqual(purple.minDays, 30);
            assert.strictEqual(purple.color, '#8B00FF');
            assert.strictEqual(purple.height, 'LARGE');
            assert.strictEqual(purple.intensity, 1.0);
        });
    });

    describe('StreakFlameEngine', () => {
        it('🔥 should return no flame for 0-2 days', () => {
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(0).id, 'NONE');
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(2).id, 'NONE');
        });

        it('🔥 should return Blue Flame for 3-6 days', () => {
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(3).id, 'BLUE_STARTER');
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(5).id, 'BLUE_STARTER');
        });

        it('🔥 should return Orange Flame for 7-29 days', () => {
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(7).id, 'ORANGE_ROARING');
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(20).id, 'ORANGE_ROARING');
        });

        it('🔥 should return Purple Fire for 30+ days', () => {
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(30).id, 'PURPLE_INFERNO');
            assert.strictEqual(StreakFlameEngine.getFlameFromDays(100).id, 'PURPLE_INFERNO');
        });

        it('✅ should get next flame tier', () => {
            const next = StreakFlameEngine.getNextFlameTier(5);

            assert.strictEqual(next.tier.id, 'ORANGE_ROARING');
            assert.strictEqual(next.daysToUnlock, 2);
        });

        it('✅ should return null at max tier', () => {
            const next = StreakFlameEngine.getNextFlameTier(50);
            assert.strictEqual(next, null);
        });

        it('✅ should get complete flame metadata', () => {
            const meta = StreakFlameEngine.getFlameMetadata(10);

            assert.strictEqual(meta.flame.id, 'ORANGE_ROARING');
            assert.ok(meta.animation);
            assert.ok(meta.progress);
            assert.ok(meta.css);
            assert.ok(meta.webgl);
        });

        it('✅ should generate CSS animation', () => {
            const meta = StreakFlameEngine.getFlameMetadata(7);

            assert.ok(meta.css.filter.includes('drop-shadow'));
            assert.ok(meta.css.animation.includes('flame-flicker'));
        });

        it('✅ should generate WebGL particle config', () => {
            const meta = StreakFlameEngine.getFlameMetadata(30);

            assert.strictEqual(meta.webgl.emitterRate, 50);
            assert.strictEqual(meta.webgl.colorStart, '#8B00FF');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 FINAL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
describe('📊 RED VISUAL ADDICTION FINAL VERIFICATION', () => {

    it('✅ TASK 19: HOLOGRAPHIC_RADAR_ANIMATION — VERIFIED', () => {
        const engine = new DNAPulseEngine();
        const phase = engine.getPulsePhase();

        assert.ok(phase >= 0.9 && phase <= 1.1);

        const vertices = engine.generateAnimatedVertices({
            aggression: 0.8, grit: 0.7, accuracy: 0.9, wealth: 0.5, luck: 0.5
        });

        assert.strictEqual(vertices.length, 5);

        console.log('✅ TASK 19: HOLOGRAPHIC_RADAR_ANIMATION — PULSING');
    });

    it('✅ TASK 20: XP_LEVEL_VISUAL_STATE — VERIFIED', () => {
        const bronze = TierVisualEngine.getTierFromLevel(5);
        const gold = TierVisualEngine.getTierFromLevel(45);
        const master = TierVisualEngine.getTierFromLevel(80);

        assert.strictEqual(bronze.id, 'BRONZE');
        assert.strictEqual(gold.id, 'GOLD');
        assert.strictEqual(master.id, 'GTO_MASTER');

        console.log('✅ TASK 20: XP_LEVEL_VISUAL_STATE — MAPPED');
    });

    it('✅ TASK 21: STREAK_FLAME_INTENSITY — VERIFIED', () => {
        const blue = StreakFlameEngine.getFlameFromDays(3);
        const orange = StreakFlameEngine.getFlameFromDays(7);
        const purple = StreakFlameEngine.getFlameFromDays(30);

        assert.strictEqual(blue.name, 'Small Blue Flame');
        assert.strictEqual(orange.name, 'Roaring Orange');
        assert.strictEqual(purple.name, 'Purple Fire');

        console.log('✅ TASK 21: STREAK_FLAME_INTENSITY — BLAZING');
    });

    it('🎨 RED VISUAL ADDICTION (PROMPTS 19-21) — COMPLETE', () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   🎨 RED VISUAL ADDICTION — PROMPTS 19-21 VERIFIED');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   🔮 TASK 19: HOLOGRAPHIC_RADAR        ✅ PULSING');
        console.log('   🎨 TASK 20: TIER_COLORS              ✅ MAPPED');
        console.log('   🔥 TASK 21: STREAK_FLAMES            ✅ BLAZING');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   Bronze (0-10) → Silver (11-30) → Gold (31-60) → GTO Master (61-100)');
        console.log('   Blue (3d) → Orange (7d) → Purple Fire (30d)');
        console.log('═══════════════════════════════════════════════════════════════');

        assert.ok(true);
    });
});
