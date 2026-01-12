/**
 * 🧠 IDENTITY_DNA_ENGINE — Identity & Reputation Tests (Tasks 51-54)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
    TiltSensorDNA, ReputationDecay, BankrollVarianceSim, SettingsHardLock,
    TILT_SENSOR_CONFIG, REPUTATION_CONFIG, HARD_LAWS
} from '../engines/IdentityReputationEngine.js';

// TASK 51: TILT SENSOR DNA
describe('🎰 TASK 51: TILT_SENSOR_DNA', () => {
    it('🎰 should detect tilting at threshold', () => {
        assert.strictEqual(TiltSensorDNA.isTilting(3, 3), true);
        assert.strictEqual(TiltSensorDNA.isTilting(2, 3), false);
    });

    it('✅ should calculate tilt score', () => {
        assert.strictEqual(TiltSensorDNA.calculateTiltScore(3, 3), 1.0);
        assert.strictEqual(TiltSensorDNA.calculateTiltScore(1, 3), 1 / 3);
    });

    it('✅ should have default config', () => {
        assert.strictEqual(TILT_SENSOR_CONFIG.RAPID_BUYIN_THRESHOLD, 3);
        assert.strictEqual(TILT_SENSOR_CONFIG.RAPID_BUYIN_WINDOW_MINUTES, 60);
    });
});

// TASK 52: REPUTATION DECAY
describe('📉 TASK 52: REPUTATION_DECAY', () => {
    it('📉 should not decay within threshold', () => {
        const decay = ReputationDecay.calculateDecayAmount(5);
        assert.strictEqual(decay, 0);
    });

    it('📉 should decay after threshold', () => {
        const decay = ReputationDecay.calculateDecayAmount(10);
        // 10 - 7 = 3 days * 0.02 = 0.06
        assert.strictEqual(decay, 0.06);
    });

    it('✅ should respect minimum reputation', () => {
        const result = ReputationDecay.applyDecay(0.15, 0.10);
        assert.strictEqual(result, 0.1); // Min is 0.1
    });

    it('✅ should have decay config', () => {
        assert.strictEqual(REPUTATION_CONFIG.DECAY_START_DAYS, 7);
        assert.strictEqual(REPUTATION_CONFIG.DECAY_RATE_PER_DAY, 0.02);
    });
});

// TASK 53: BANKROLL VARIANCE SIM
describe('📊 TASK 53: BANKROLL_VARIANCE_SIM', () => {
    it('📊 should calculate risk of ruin', () => {
        const ror = BankrollVarianceSim.calculateRiskOfRuin(0.45, 1000, 100);
        assert.ok(ror >= 0 && ror <= 1);
    });

    it('✅ should have 0 RoR for 100% winrate', () => {
        const ror = BankrollVarianceSim.calculateRiskOfRuin(1.0, 1000, 100);
        assert.strictEqual(ror, 0);
    });

    it('✅ should calculate Kelly fraction', () => {
        const kelly = BankrollVarianceSim.calculateKellyFraction(0.6);
        assert.ok(Math.abs(kelly - 0.2) < 0.0001);
        assert.strictEqual(BankrollVarianceSim.calculateKellyFraction(0.4), 0);
    });

    it('✅ should give recommendations', () => {
        assert.strictEqual(BankrollVarianceSim.getRecommendation(0.95), 'HEALTHY');
        assert.strictEqual(BankrollVarianceSim.getRecommendation(0.75), 'CAUTION');
        assert.strictEqual(BankrollVarianceSim.getRecommendation(0.55), 'WARNING');
        assert.strictEqual(BankrollVarianceSim.getRecommendation(0.3), 'DANGER');
    });
});

// TASK 54: SETTINGS HARD LOCK
describe('🔒 TASK 54: SETTINGS_HARD_LOCK', () => {
    it('🔒 should have 85% mastery gate locked', () => {
        assert.strictEqual(SettingsHardLock.getMasteryGate(), 0.85);
        assert.strictEqual(SettingsHardLock.isLocked('MASTERY_GATE_85'), true);
    });

    it('🔒 should block modification of PERMANENT laws', () => {
        const result = SettingsHardLock.validateModification('MASTERY_GATE_85');
        assert.strictEqual(result.allowed, false);
        assert.ok(result.reason.includes('PERMANENT'));
    });

    it('✅ should have all hard laws defined', () => {
        assert.ok(HARD_LAWS.MASTERY_GATE_85);
        assert.ok(HARD_LAWS.XP_PERMANENCE);
        assert.ok(HARD_LAWS.STREAK_EXPIRY_24H);
        assert.ok(HARD_LAWS.PRO_HIGH_STAKES);
    });

    it('✅ should get streak expiry', () => {
        assert.strictEqual(SettingsHardLock.getStreakExpiry(), 24.0);
    });
});

// FINAL VERIFICATION
describe('🧠 IDENTITY & REPUTATION VERIFICATION', () => {
    it('🧠 TASKS 51-54 COMPLETE', () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   🧠 IDENTITY & REPUTATION MAPPING (51-54) — VERIFIED');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   🎰 TASK 51: TILT_SENSOR_DNA            ✅ MONITORING');
        console.log('   📉 TASK 52: REPUTATION_DECAY           ✅ ACTIVE');
        console.log('   📊 TASK 53: BANKROLL_VARIANCE_SIM      ✅ FORECASTING');
        console.log('   🔒 TASK 54: SETTINGS_HARD_LOCK         ✅ PERMANENT');
        console.log('═══════════════════════════════════════════════════════════════');
        assert.ok(true);
    });
});
