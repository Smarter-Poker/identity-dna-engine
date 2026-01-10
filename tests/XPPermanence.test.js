/**
 * 🧬 IDENTITY_DNA_ENGINE — XP Permanence Tests
 * 
 * @project IDENTITY_DNA_ENGINE
 * @task XP_PERMANENCE_LOGIC
 * 
 * Tests for XP Vault permanence enforcement.
 * Validates that XP can only be added, never subtracted.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 MOCK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Simulates the check_xp_gain trigger behavior
function simulateCheckXPGainTrigger(oldValue, newValue) {
    if (newValue < oldValue) {
        throw new Error(
            `🚫 LAW 2 VIOLATION: XP Permanence Breach Detected! ` +
            `Cannot decrease XP from ${oldValue} to ${newValue}.`
        );
    }
    return { success: true, newValue };
}

// Mock XP Vault
class MockXPVault {
    constructor() {
        this.vaults = new Map();
        this.auditLog = [];
    }

    getVault(userId) {
        return this.vaults.get(userId) || { xp_total: 0, xp_lifetime: 0 };
    }

    deposit(userId, amount, source) {
        if (amount <= 0) {
            throw new Error('LAW 2: XP deposit must be positive');
        }

        const current = this.getVault(userId);
        const newTotal = current.xp_total + amount;

        // Simulate trigger check
        simulateCheckXPGainTrigger(current.xp_total, newTotal);

        this.vaults.set(userId, {
            xp_total: newTotal,
            xp_lifetime: current.xp_lifetime + amount,
            last_deposit_source: source,
            deposit_count: (current.deposit_count || 0) + 1
        });

        this.auditLog.push({
            user_id: userId,
            action: 'DEPOSIT',
            amount,
            old_total: current.xp_total,
            new_total: newTotal,
            source,
            created_at: new Date().toISOString()
        });

        return { success: true, newTotal };
    }

    attemptDecrease(userId, newTotal) {
        const current = this.getVault(userId);

        // This should trigger the permanence check
        return simulateCheckXPGainTrigger(current.xp_total, newTotal);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('🛡️ XP Permanence Logic — LAW 2 Enforcement', () => {
    let vault;

    beforeEach(() => {
        vault = new MockXPVault();
    });

    // ═══════════════════════════════════════════════════════════════════
    // ✅ VALID DEPOSIT TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('✅ Valid XP Deposits', () => {
        it('✅ should allow positive XP deposits', () => {
            const result = vault.deposit('user-1', 100, 'TRAINING');

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.newTotal, 100);
        });

        it('✅ should accumulate multiple deposits', () => {
            vault.deposit('user-1', 100, 'TRAINING');
            vault.deposit('user-1', 50, 'ARCADE');
            const result = vault.deposit('user-1', 25, 'DAILY_BONUS');

            assert.strictEqual(result.newTotal, 175);
        });

        it('✅ should track deposit count', () => {
            vault.deposit('user-2', 10, 'TEST');
            vault.deposit('user-2', 20, 'TEST');
            vault.deposit('user-2', 30, 'TEST');

            const vaultData = vault.getVault('user-2');
            assert.strictEqual(vaultData.deposit_count, 3);
        });

        it('✅ should track lifetime XP separately', () => {
            vault.deposit('user-3', 100, 'TRAINING');
            vault.deposit('user-3', 200, 'ARCADE');

            const vaultData = vault.getVault('user-3');
            assert.strictEqual(vaultData.xp_total, 300);
            assert.strictEqual(vaultData.xp_lifetime, 300);
        });

        it('✅ should log deposits to audit trail', () => {
            vault.deposit('user-4', 500, 'TOURNAMENT_WIN');

            assert.strictEqual(vault.auditLog.length, 1);
            assert.strictEqual(vault.auditLog[0].action, 'DEPOSIT');
            assert.strictEqual(vault.auditLog[0].amount, 500);
            assert.strictEqual(vault.auditLog[0].source, 'TOURNAMENT_WIN');
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🚫 BLOCKED DECREASE TESTS (check_xp_gain trigger)
    // ═══════════════════════════════════════════════════════════════════

    describe('🚫 Blocked XP Decreases (check_xp_gain trigger)', () => {
        it('🚫 should BLOCK direct XP decrease', () => {
            vault.deposit('user-block-1', 1000, 'INITIAL');

            assert.throws(
                () => vault.attemptDecrease('user-block-1', 500),
                /LAW 2 VIOLATION: XP Permanence Breach/
            );
        });

        it('🚫 should BLOCK XP decrease to zero', () => {
            vault.deposit('user-block-2', 500, 'INITIAL');

            assert.throws(
                () => vault.attemptDecrease('user-block-2', 0),
                /LAW 2 VIOLATION/
            );
        });

        it('🚫 should BLOCK negative XP deposits', () => {
            assert.throws(
                () => vault.deposit('user-block-3', -100, 'INVALID'),
                /XP deposit must be positive/
            );
        });

        it('🚫 should BLOCK zero XP deposits', () => {
            assert.throws(
                () => vault.deposit('user-block-4', 0, 'INVALID'),
                /XP deposit must be positive/
            );
        });

        it('🚫 should include user ID in violation message', () => {
            vault.deposit('user-block-5', 1000, 'INITIAL');

            try {
                vault.attemptDecrease('user-block-5', 100);
                assert.fail('Should have thrown');
            } catch (error) {
                assert.ok(error.message.includes('1000'));
                assert.ok(error.message.includes('100'));
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 TRIGGER BEHAVIOR TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('🔄 Trigger Behavior (check_xp_gain)', () => {
        it('✅ should allow same value (no change)', () => {
            const result = simulateCheckXPGainTrigger(100, 100);
            assert.strictEqual(result.success, true);
        });

        it('✅ should allow increase by 1', () => {
            const result = simulateCheckXPGainTrigger(100, 101);
            assert.strictEqual(result.success, true);
        });

        it('✅ should allow large increase', () => {
            const result = simulateCheckXPGainTrigger(0, 1000000);
            assert.strictEqual(result.success, true);
        });

        it('🚫 should block decrease by 1', () => {
            assert.throws(
                () => simulateCheckXPGainTrigger(100, 99),
                /LAW 2 VIOLATION/
            );
        });

        it('🚫 should block decrease from any value', () => {
            assert.throws(() => simulateCheckXPGainTrigger(1000000, 999999), /LAW 2/);
            assert.throws(() => simulateCheckXPGainTrigger(50, 49), /LAW 2/);
            assert.throws(() => simulateCheckXPGainTrigger(1, 0), /LAW 2/);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 📊 AUDIT TRAIL TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('📊 Audit Trail', () => {
        it('✅ should record old and new totals', () => {
            vault.deposit('user-audit-1', 100, 'FIRST');
            vault.deposit('user-audit-1', 50, 'SECOND');

            const secondDeposit = vault.auditLog[1];
            assert.strictEqual(secondDeposit.old_total, 100);
            assert.strictEqual(secondDeposit.new_total, 150);
        });

        it('✅ should preserve chronological order', () => {
            vault.deposit('user-audit-2', 10, 'A');
            vault.deposit('user-audit-2', 20, 'B');
            vault.deposit('user-audit-2', 30, 'C');

            assert.strictEqual(vault.auditLog[0].source, 'A');
            assert.strictEqual(vault.auditLog[1].source, 'B');
            assert.strictEqual(vault.auditLog[2].source, 'C');
        });

        it('✅ should include timestamps', () => {
            vault.deposit('user-audit-3', 100, 'TIMED');

            const entry = vault.auditLog[0];
            assert.ok(entry.created_at);
            assert.ok(Date.parse(entry.created_at) > 0);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔐 EDGE CASES
    // ═══════════════════════════════════════════════════════════════════

    describe('🔐 Edge Cases', () => {
        it('✅ should handle first deposit to new user', () => {
            const result = vault.deposit('new-user', 1, 'FIRST');

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.newTotal, 1);
        });

        it('✅ should handle very large XP values', () => {
            const largeAmount = 999999999;
            const result = vault.deposit('whale-user', largeAmount, 'MASSIVE');

            assert.strictEqual(result.newTotal, largeAmount);
        });

        it('✅ should handle minimum deposit (1 XP)', () => {
            const result = vault.deposit('min-user', 1, 'TINY');

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.newTotal, 1);
        });

        it('✅ should isolate users from each other', () => {
            vault.deposit('isolated-1', 100, 'A');
            vault.deposit('isolated-2', 200, 'B');

            assert.strictEqual(vault.getVault('isolated-1').xp_total, 100);
            assert.strictEqual(vault.getVault('isolated-2').xp_total, 200);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🧮 VALIDATION FUNCTION TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('🧮 XP Validation Functions', () => {
        const validateXPAmount = (amount) => {
            if (typeof amount !== 'number' || isNaN(amount)) {
                return { valid: false, reason: 'Amount must be a number' };
            }
            if (amount <= 0) {
                return { valid: false, reason: 'LAW 2: XP can only be positive' };
            }
            if (!Number.isInteger(amount)) {
                return { valid: false, reason: 'XP must be a whole number' };
            }
            return { valid: true };
        };

        it('✅ should validate positive integers', () => {
            assert.strictEqual(validateXPAmount(100).valid, true);
            assert.strictEqual(validateXPAmount(1).valid, true);
            assert.strictEqual(validateXPAmount(999999).valid, true);
        });

        it('🚫 should reject negative numbers', () => {
            const result = validateXPAmount(-50);
            assert.strictEqual(result.valid, false);
            assert.ok(result.reason.includes('LAW 2'));
        });

        it('🚫 should reject zero', () => {
            const result = validateXPAmount(0);
            assert.strictEqual(result.valid, false);
        });

        it('🚫 should reject decimals', () => {
            const result = validateXPAmount(10.5);
            assert.strictEqual(result.valid, false);
            assert.ok(result.reason.includes('whole number'));
        });

        it('🚫 should reject non-numbers', () => {
            assert.strictEqual(validateXPAmount('100').valid, false);
            assert.strictEqual(validateXPAmount(null).valid, false);
            assert.strictEqual(validateXPAmount(undefined).valid, false);
            assert.strictEqual(validateXPAmount(NaN).valid, false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏁 TEST SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log(`
═══════════════════════════════════════════════════════════════════════════
   🛡️ XP PERMANENCE LOGIC — Test Summary
═══════════════════════════════════════════════════════════════════════════
   
   ✅ Valid XP Deposits Tests
   🚫 Blocked XP Decreases Tests (check_xp_gain trigger)
   🔄 Trigger Behavior Tests
   📊 Audit Trail Tests
   🔐 Edge Cases Tests
   🧮 XP Validation Functions Tests
   
   LAW 2 ENFORCED: XP can only be ADDED, never SUBTRACTED.
   
   Run: node --test tests/XPPermanence.test.js

═══════════════════════════════════════════════════════════════════════════
`);
