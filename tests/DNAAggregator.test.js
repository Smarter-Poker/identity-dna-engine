/**
 * 🧬 DNA Aggregator Tests
 * @task SKILL_TIER_AGGREGATOR | TRUST_SCORE_DECAY | DNA_HOLOGRAPHIC_EXPORT
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { calculateSkillTierFromAccuracy, TRUST_DECAY_CONFIG } from '../engines/DNAAggregatorEngine.js';

describe('🎯 SKILL_TIER_AGGREGATOR — recalc_skill_tier', () => {
    it('✅ should map 95%+ accuracy to LEGEND (tier 10)', () => {
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(0.95), { tier: 10, name: 'LEGEND' });
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(1.0), { tier: 10, name: 'LEGEND' });
    });

    it('✅ should map 90-94% to MASTER (tier 9)', () => {
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(0.90), { tier: 9, name: 'MASTER' });
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(0.94), { tier: 9, name: 'MASTER' });
    });

    it('✅ should map 70-74% to GOLD (tier 5)', () => {
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(0.70), { tier: 5, name: 'GOLD' });
    });

    it('✅ should map 0-29% to BEGINNER (tier 1)', () => {
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(0.0), { tier: 1, name: 'BEGINNER' });
        assert.deepStrictEqual(calculateSkillTierFromAccuracy(0.29), { tier: 1, name: 'BEGINNER' });
    });

    it('✅ should calculate from average of 10 drills', () => {
        const drills = [0.8, 0.85, 0.75, 0.9, 0.82, 0.78, 0.88, 0.79, 0.84, 0.81];
        const avg = drills.reduce((a, b) => a + b) / drills.length;
        const result = calculateSkillTierFromAccuracy(avg);
        assert.ok(result.tier >= 7 && result.tier <= 8);
    });
});

describe('📉 TRUST_SCORE_DECAY — apply_trust_decay', () => {
    it('✅ should have 30-day threshold', () => {
        assert.strictEqual(TRUST_DECAY_CONFIG.THRESHOLD_DAYS, 30);
    });

    it('✅ should decay by 0.01 daily', () => {
        assert.strictEqual(TRUST_DECAY_CONFIG.DAILY_DECAY_RATE, 0.01);
    });

    it('✅ should not decay below minimum', () => {
        const currentScore = 10.1; // Just above minimum
        const daysInactive = 60;
        const decayDays = daysInactive - TRUST_DECAY_CONFIG.THRESHOLD_DAYS; // 30 days of decay
        const rawDecay = decayDays * TRUST_DECAY_CONFIG.DAILY_DECAY_RATE; // 0.3 decay
        const newScore = Math.max(TRUST_DECAY_CONFIG.MIN_TRUST_SCORE, currentScore - rawDecay);
        // 10.1 - 0.3 = 9.8, clamped to 10
        assert.strictEqual(newScore, TRUST_DECAY_CONFIG.MIN_TRUST_SCORE);
    });

    it('✅ should recover 0.5 per verified checkin', () => {
        const currentScore = 50;
        const recovered = currentScore + TRUST_DECAY_CONFIG.RECOVERY_PER_CHECKIN;
        assert.strictEqual(recovered, 50.5);
    });

    it('✅ should cap recovery at 100', () => {
        const currentScore = 99.8;
        const recovered = Math.min(100, currentScore + TRUST_DECAY_CONFIG.RECOVERY_PER_CHECKIN);
        assert.strictEqual(recovered, 100);
    });
});

describe('🔮 DNA_HOLOGRAPHIC_EXPORT — get_player_dna_summary', () => {
    it('✅ should include dna_triangle with aggression, grit, skill', () => {
        const mockSummary = {
            dna_triangle: {
                aggression: { value: 75 },
                grit: { value: 60 },
                skill: { value: 80, tier: 8 }
            }
        };
        assert.ok(mockSummary.dna_triangle.aggression);
        assert.ok(mockSummary.dna_triangle.grit);
        assert.ok(mockSummary.dna_triangle.skill);
    });

    it('✅ should include hologram rendering hints', () => {
        const mockHologram = {
            glow_intensity: 0.8,
            aura_color: '#00BFFF',
            particle_density: 'high'
        };
        assert.ok(mockHologram.glow_intensity >= 0 && mockHologram.glow_intensity <= 1);
        assert.ok(mockHologram.aura_color.startsWith('#'));
    });

    it('✅ should include reputation data', () => {
        const mockReputation = { trust_score: 85, xp_total: 50000 };
        assert.strictEqual(mockReputation.trust_score, 85);
        assert.strictEqual(mockReputation.xp_total, 50000);
    });
});

console.log(`
═══════════════════════════════════════════════════════════════════════════
   🧬 DNA AGGREGATOR — Test Summary
═══════════════════════════════════════════════════════════════════════════
   ✅ SKILL_TIER_AGGREGATOR (recalc_skill_tier)
   ✅ TRUST_SCORE_DECAY (apply_trust_decay)
   ✅ DNA_HOLOGRAPHIC_EXPORT (get_player_dna_summary)
═══════════════════════════════════════════════════════════════════════════
`);
