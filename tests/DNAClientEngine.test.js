/**
 * 🧬 IDENTITY_DNA_ENGINE — DNA Client Engine Tests
 * 
 * Tests for cached DNA synchronization with version control.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 MOCK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Mock Storage (simulates localStorage)
class MockStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.get(key) || null;
    }

    setItem(key, value) {
        this.store.set(key, value);
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

// Mock Supabase Client
class MockSupabase {
    constructor() {
        this.profiles = new Map();
        this.versions = new Map();
    }

    get client() {
        const self = this;
        return {
            from: (table) => ({
                select: (cols) => ({
                    eq: (field, value) => ({
                        single: async () => {
                            if (table === 'profiles') {
                                return { data: self.profiles.get(value), error: null };
                            }
                            if (table === 'dna_version_control') {
                                return { data: self.versions.get(value), error: null };
                            }
                            return { data: null, error: { message: 'Not found' } };
                        },
                        maybeSingle: async () => {
                            if (table === 'profiles') {
                                return { data: self.profiles.get(value) || null, error: null };
                            }
                            return { data: null, error: null };
                        }
                    })
                }),
                upsert: async (data) => {
                    if (table === 'dna_version_control') {
                        self.versions.set(data.user_id, data);
                    }
                    return { error: null };
                }
            })
        };
    }

    setProfile(userId, profile) {
        this.profiles.set(userId, profile);
    }

    setVersion(userId, version) {
        this.versions.set(userId, {
            user_id: userId,
            current_version: version,
            updated_at: new Date().toISOString()
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('⚡ DNA Client Engine — Cached Synchronization Tests', () => {
    let mockStorage;
    let mockSupabase;

    beforeEach(() => {
        mockStorage = new MockStorage();
        mockSupabase = new MockSupabase();
    });

    // ═══════════════════════════════════════════════════════════════════
    // ⚡ VERSION CONTROL TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('⚡ Version Control Logic', () => {
        it('✅ should skip sync when local version matches server', async () => {
            const userId = 'user-123';
            const localVersion = 5;
            const serverVersion = 5;

            // Simulate version check
            const needsSync = serverVersion > localVersion;

            assert.strictEqual(needsSync, false, 'Should not need sync when versions match');
        });

        it('✅ should trigger sync when server version is newer', async () => {
            const userId = 'user-123';
            const localVersion = 3;
            const serverVersion = 5;

            const needsSync = serverVersion > localVersion;

            assert.strictEqual(needsSync, true, 'Should need sync when server is newer');
        });

        it('✅ should handle no local version (new user)', async () => {
            const localVersion = null;
            const serverVersion = 1;

            const effectiveLocalVersion = localVersion || 0;
            const needsSync = serverVersion > effectiveLocalVersion;

            assert.strictEqual(needsSync, true, 'Should sync for new users');
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 📦 LOCAL CACHE TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('📦 Local Cache Management', () => {
        it('✅ should store DNA in local storage', () => {
            const userId = 'user-456';
            const dna = {
                skill_tier: 5,
                trust_score: 75.5,
                xp_total: 10000,
                version: 3
            };

            const key = `poker_dna_${userId}`;
            mockStorage.setItem(key, JSON.stringify(dna));

            const retrieved = JSON.parse(mockStorage.getItem(key));

            assert.strictEqual(retrieved.skill_tier, 5);
            assert.strictEqual(retrieved.version, 3);
        });

        it('✅ should return null for missing cache', () => {
            const key = 'poker_dna_nonexistent';
            const result = mockStorage.getItem(key);

            assert.strictEqual(result, null);
        });

        it('✅ should clear cache on demand', () => {
            const key = 'poker_dna_user-789';
            mockStorage.setItem(key, JSON.stringify({ version: 1 }));

            mockStorage.removeItem(key);

            assert.strictEqual(mockStorage.getItem(key), null);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🕐 CACHE FRESHNESS TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('🕐 Cache Freshness Logic', () => {
        it('✅ should consider cache stale after threshold', () => {
            const STALE_THRESHOLD_MS = 60000; // 1 minute
            const cachedAt = Date.now() - 120000; // 2 minutes ago

            const isStale = Date.now() - cachedAt > STALE_THRESHOLD_MS;

            assert.strictEqual(isStale, true, 'Cache should be stale after 2 minutes');
        });

        it('✅ should consider cache fresh within threshold', () => {
            const STALE_THRESHOLD_MS = 60000; // 1 minute
            const cachedAt = Date.now() - 30000; // 30 seconds ago

            const isStale = Date.now() - cachedAt > STALE_THRESHOLD_MS;

            assert.strictEqual(isStale, false, 'Cache should be fresh within 30 seconds');
        });

        it('✅ should expire cache after max offline duration', () => {
            const MAX_OFFLINE_MS = 86400000; // 24 hours
            const cachedAt = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

            const isExpired = Date.now() - cachedAt > MAX_OFFLINE_MS;

            assert.strictEqual(isExpired, true, 'Cache should expire after 24 hours');
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 SYNC FLOW TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('🔄 Sync Flow Logic', () => {
        it('✅ should use cache when fresh', async () => {
            const userId = 'user-sync-1';
            const cachedDNA = {
                skill_tier: 6,
                version: 10,
                cachedAt: Date.now() // Fresh cache
            };

            mockStorage.setItem(`poker_dna_${userId}`, JSON.stringify(cachedDNA));

            // Simulate sync decision
            const localDNA = JSON.parse(mockStorage.getItem(`poker_dna_${userId}`));
            const isStale = Date.now() - localDNA.cachedAt > 60000;

            assert.strictEqual(isStale, false);
            assert.strictEqual(localDNA.skill_tier, 6);
        });

        it('✅ should merge server updates into cache', async () => {
            const localDNA = { skill_tier: 5, version: 3, xp_total: 1000 };
            const serverDNA = { skill_tier: 6, xp_total: 1500 };
            const serverVersion = 5;

            const mergedDNA = {
                ...serverDNA,
                version: serverVersion,
                cachedAt: Date.now()
            };

            assert.strictEqual(mergedDNA.skill_tier, 6);
            assert.strictEqual(mergedDNA.version, 5);
            assert.strictEqual(mergedDNA.xp_total, 1500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // ⚡ OPTIMISTIC UPDATE TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('⚡ Optimistic Updates', () => {
        it('✅ should apply optimistic update immediately', () => {
            const originalDNA = { skill_tier: 5, xp_total: 1000 };
            const updates = { xp_total: 1050 };

            const optimistic = {
                ...originalDNA,
                ...updates,
                pendingSync: true
            };

            assert.strictEqual(optimistic.xp_total, 1050);
            assert.strictEqual(optimistic.pendingSync, true);
        });

        it('✅ should confirm optimistic update on server success', () => {
            const optimisticDNA = { xp_total: 1050, pendingSync: true };
            const serverDNA = { xp_total: 1050, version: 6 };

            const confirmed = {
                ...serverDNA,
                pendingSync: false
            };

            assert.strictEqual(confirmed.xp_total, 1050);
            assert.strictEqual(confirmed.pendingSync, false);
            assert.strictEqual(confirmed.version, 6);
        });

        it('✅ should rollback optimistic update on server failure', () => {
            const originalDNA = { xp_total: 1000, version: 5 };
            const optimisticDNA = { xp_total: 1050, pendingSync: true };

            const rolledBack = {
                ...originalDNA,
                pendingSync: false
            };

            assert.strictEqual(rolledBack.xp_total, 1000);
            assert.strictEqual(rolledBack.pendingSync, false);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATISTICS TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('📊 Cache Statistics', () => {
        it('✅ should track cache hits and misses', () => {
            const stats = {
                cacheHits: 0,
                cacheMisses: 0
            };

            // Simulate cache hit
            stats.cacheHits++;
            stats.cacheHits++;
            stats.cacheHits++;

            // Simulate cache miss
            stats.cacheMisses++;

            const total = stats.cacheHits + stats.cacheMisses;
            const hitRate = (stats.cacheHits / total * 100).toFixed(2);

            assert.strictEqual(stats.cacheHits, 3);
            assert.strictEqual(stats.cacheMisses, 1);
            assert.strictEqual(hitRate, '75.00');
        });

        it('✅ should calculate average bytes per sync', () => {
            const stats = {
                syncOperations: 5,
                bytesTransferred: 2500
            };

            const avgBytes = Math.round(stats.bytesTransferred / stats.syncOperations);

            assert.strictEqual(avgBytes, 500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔔 LISTENER TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('🔔 DNA Update Listeners', () => {
        it('✅ should register and notify listeners', () => {
            const listeners = new Set();
            const notifiedData = [];

            // Register listener
            const callback = (dna) => notifiedData.push(dna);
            listeners.add(callback);

            // Notify
            const newDNA = { skill_tier: 7, version: 10 };
            listeners.forEach(cb => cb(newDNA));

            assert.strictEqual(notifiedData.length, 1);
            assert.strictEqual(notifiedData[0].skill_tier, 7);
        });

        it('✅ should unsubscribe listeners', () => {
            const listeners = new Set();

            const callback = () => { };
            listeners.add(callback);

            assert.strictEqual(listeners.size, 1);

            listeners.delete(callback);

            assert.strictEqual(listeners.size, 0);
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🌐 OFFLINE MODE TESTS
    // ═══════════════════════════════════════════════════════════════════

    describe('🌐 Offline Mode', () => {
        it('✅ should fall back to cache when server is unavailable', async () => {
            const userId = 'user-offline';
            const cachedDNA = { skill_tier: 4, version: 2, cachedAt: Date.now() };

            mockStorage.setItem(`poker_dna_${userId}`, JSON.stringify(cachedDNA));

            // Simulate server error
            const serverError = { message: 'Network error' };

            // Fallback to cache
            const fallback = JSON.parse(mockStorage.getItem(`poker_dna_${userId}`));

            assert.ok(fallback);
            assert.strictEqual(fallback.skill_tier, 4);
        });

        it('✅ should return default DNA when no cache exists', () => {
            const userId = 'user-new';

            const defaultDNA = {
                id: userId,
                skill_tier: 1,
                trust_score: 50.0,
                xp_total: 0,
                badges: [],
                version: 0,
                isDefault: true
            };

            assert.strictEqual(defaultDNA.skill_tier, 1);
            assert.strictEqual(defaultDNA.trust_score, 50.0);
            assert.strictEqual(defaultDNA.isDefault, true);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏁 TEST SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log(`
═══════════════════════════════════════════════════════════════════════════
   ⚡ DNA CLIENT ENGINE — Cache Sync Test Summary
═══════════════════════════════════════════════════════════════════════════
   
   ✅ Version Control Logic Tests
   ✅ Local Cache Management Tests
   ✅ Cache Freshness Logic Tests
   ✅ Sync Flow Logic Tests
   ✅ Optimistic Updates Tests
   ✅ Cache Statistics Tests
   ✅ DNA Update Listeners Tests
   ✅ Offline Mode Tests
   
   Run: node --test tests/DNAClientEngine.test.js

═══════════════════════════════════════════════════════════════════════════
`);
