/**
 * 🧬 IDENTITY_DNA_ENGINE — DNA Client Engine
 * 
 * ⚡ SILO_COMMAND: IGNORE_EXTERNAL_CONTEXT
 * ⚡ SCOPE: ./IDENTITY_DNA_ENGINE/
 * ⚡ ACTION: CACHED_DNA_SYNCHRONIZATION
 * 
 * High-speed DNA Handshake with version-controlled caching.
 * Minimizes latency by checking version stamps before full sync.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ DNA CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const DNA_CLIENT_CONFIG = {
    CACHE_PREFIX: 'poker_dna_',
    VERSION_PREFIX: 'poker_dna_version_',
    STALE_THRESHOLD_MS: 60000,      // Consider cache stale after 1 minute
    BACKGROUND_SYNC_INTERVAL: 30000, // Background sync every 30 seconds
    MAX_OFFLINE_DURATION_MS: 86400000, // 24 hours max offline cache validity
    COMPRESSION_ENABLED: true
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 STORAGE ABSTRACTION (Works in Browser and Node.js)
// ═══════════════════════════════════════════════════════════════════════════
class DNAStorage {
    constructor() {
        this.store = new Map();
        this.isLocalStorageAvailable = this.checkLocalStorage();
    }

    checkLocalStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('__dna_test__', '1');
                localStorage.removeItem('__dna_test__');
                return true;
            }
        } catch (e) {
            // localStorage not available
        }
        return false;
    }

    getItem(key) {
        if (this.isLocalStorageAvailable) {
            return localStorage.getItem(key);
        }
        return this.store.get(key) || null;
    }

    setItem(key, value) {
        if (this.isLocalStorageAvailable) {
            localStorage.setItem(key, value);
        } else {
            this.store.set(key, value);
        }
    }

    removeItem(key) {
        if (this.isLocalStorageAvailable) {
            localStorage.removeItem(key);
        } else {
            this.store.delete(key);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 DNA CLIENT ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class DNAClientEngine {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.storage = new DNAStorage();
        this.syncInProgress = new Map();
        this.backgroundSyncTimer = null;
        this.listeners = new Map();
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            syncOperations: 0,
            bytesTransferred: 0
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🚀 MAIN SYNC FUNCTION (Version-Controlled)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * 🧬 syncPlayerDNA — High-Speed DNA Handshake
     * 
     * DNA VERSION CONTROL (Latency Fix):
     * Instead of fetching the full profile, check the version stamp first.
     * Only syncs from server if version is newer.
     * 
     * @param {string} userId - User ID to sync
     * @returns {Object} DNA profile (from cache or server)
     */
    async syncPlayerDNA(userId) {
        // Prevent duplicate sync operations
        if (this.syncInProgress.has(userId)) {
            return this.syncInProgress.get(userId);
        }

        const syncPromise = this._performSync(userId);
        this.syncInProgress.set(userId, syncPromise);

        try {
            const result = await syncPromise;
            return result;
        } finally {
            this.syncInProgress.delete(userId);
        }
    }

    async _performSync(userId) {
        const startTime = Date.now();

        // Step 1: Load local DNA from cache
        const localDNA = this.getLocalDNA(userId);
        const localVersion = localDNA?.version || 0;
        const localTimestamp = localDNA?.cachedAt || 0;

        // Step 2: Check if we need to sync at all
        const isStale = Date.now() - localTimestamp > DNA_CLIENT_CONFIG.STALE_THRESHOLD_MS;

        if (localDNA && !isStale) {
            // Cache is fresh, use it immediately
            console.log("⚡ DNA Optimized. Using Fresh Local Cache.");
            this.stats.cacheHits++;
            return localDNA;
        }

        try {
            // Step 3: Atomic version check
            const { data: serverMeta, error: versionError } = await this.supabase.client
                .from('dna_version_control')
                .select('current_version, updated_at')
                .eq('user_id', userId)
                .single();

            if (versionError) {
                // Version control not found, could be new user
                console.log("⚠️ No version control found. Initializing...");
                return await this._initializeNewUser(userId);
            }

            // Step 4: Compare versions
            if (serverMeta.current_version <= localVersion) {
                // Server version not newer, refresh cache timestamp
                console.log("⚡ DNA Optimized. Server Version Matches Local.");
                this.stats.cacheHits++;

                // Update cache timestamp to prevent unnecessary checks
                this.setLocalDNA(userId, {
                    ...localDNA,
                    cachedAt: Date.now()
                });

                return localDNA;
            }

            // Step 5: Version mismatch — fetch fresh DNA
            console.log(`🧬 DNA Outdated (v${localVersion} → v${serverMeta.current_version}). Syncing from Supabase...`);
            this.stats.cacheMisses++;

            const { data: freshDNA, error: fetchError } = await this.supabase.client
                .from('profiles')
                .select('id, username, skill_tier, trust_score, xp_total, badges, last_sync')
                .eq('id', userId)
                .single();

            if (fetchError) {
                // Fallback to local cache if server fetch fails
                console.error("❌ Server fetch failed, using local cache:", fetchError.message);
                return localDNA || this.getDefaultDNA(userId);
            }

            // Step 6: Update local cache with fresh DNA
            const cachedDNA = {
                ...freshDNA,
                version: serverMeta.current_version,
                cachedAt: Date.now(),
                syncDuration: Date.now() - startTime
            };

            this.setLocalDNA(userId, cachedDNA);
            this.stats.syncOperations++;
            this.stats.bytesTransferred += JSON.stringify(cachedDNA).length;

            // Notify listeners of DNA update
            this.notifyListeners(userId, cachedDNA);

            console.log(`✅ DNA Synced in ${cachedDNA.syncDuration}ms | Tier: ${freshDNA.skill_tier}`);

            return cachedDNA;

        } catch (error) {
            console.error("❌ DNA Sync Error:", error.message);

            // Return local cache as fallback
            if (localDNA) {
                console.log("🔄 Using cached DNA (offline mode)");
                return localDNA;
            }

            return this.getDefaultDNA(userId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📦 LOCAL CACHE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get DNA from local storage
     */
    getLocalDNA(userId) {
        const key = `${DNA_CLIENT_CONFIG.CACHE_PREFIX}${userId}`;
        const data = this.storage.getItem(key);

        if (!data) return null;

        try {
            const parsed = JSON.parse(data);

            // Check if cache is too old (offline protection)
            if (Date.now() - parsed.cachedAt > DNA_CLIENT_CONFIG.MAX_OFFLINE_DURATION_MS) {
                console.log("⚠️ Cache expired (offline too long). Clearing...");
                this.clearLocalDNA(userId);
                return null;
            }

            return parsed;
        } catch (e) {
            console.error("Failed to parse local DNA:", e);
            return null;
        }
    }

    /**
     * Save DNA to local storage
     */
    setLocalDNA(userId, dna) {
        const key = `${DNA_CLIENT_CONFIG.CACHE_PREFIX}${userId}`;
        const data = {
            ...dna,
            cachedAt: dna.cachedAt || Date.now()
        };

        try {
            this.storage.setItem(key, JSON.stringify(data));
        } catch (e) {
            // Handle quota exceeded
            console.error("Failed to save DNA to local storage:", e);
            this.pruneOldCaches();
        }
    }

    /**
     * Clear local DNA cache
     */
    clearLocalDNA(userId) {
        const key = `${DNA_CLIENT_CONFIG.CACHE_PREFIX}${userId}`;
        this.storage.removeItem(key);
    }

    /**
     * Get default DNA for new users
     */
    getDefaultDNA(userId) {
        return {
            id: userId,
            username: null,
            skill_tier: 1,
            trust_score: 50.0,
            xp_total: 0,
            badges: [],
            version: 0,
            cachedAt: Date.now(),
            isDefault: true
        };
    }

    /**
     * Prune old caches when storage is full
     */
    pruneOldCaches() {
        // In a real implementation, iterate through localStorage
        // and remove oldest cached DNAs
        console.log("🧹 Pruning old DNA caches...");
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🆕 NEW USER INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Initialize version control for new user
     */
    async _initializeNewUser(userId) {
        // Fetch profile (might not exist yet)
        const { data: profile } = await this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!profile) {
            // User doesn't have a profile yet
            return this.getDefaultDNA(userId);
        }

        // Create version control entry
        await this.supabase.client
            .from('dna_version_control')
            .upsert({
                user_id: userId,
                current_version: 1,
                updated_at: new Date().toISOString()
            });

        const cachedDNA = {
            ...profile,
            version: 1,
            cachedAt: Date.now()
        };

        this.setLocalDNA(userId, cachedDNA);

        return cachedDNA;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 BACKGROUND SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Start background sync for a user
     */
    startBackgroundSync(userId) {
        if (this.backgroundSyncTimer) {
            this.stopBackgroundSync();
        }

        console.log(`🔄 Starting background DNA sync for ${userId}...`);

        this.backgroundSyncTimer = setInterval(async () => {
            try {
                await this.syncPlayerDNA(userId);
            } catch (e) {
                console.error("Background sync error:", e);
            }
        }, DNA_CLIENT_CONFIG.BACKGROUND_SYNC_INTERVAL);
    }

    /**
     * Stop background sync
     */
    stopBackgroundSync() {
        if (this.backgroundSyncTimer) {
            clearInterval(this.backgroundSyncTimer);
            this.backgroundSyncTimer = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📢 EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Subscribe to DNA updates for a user
     */
    onDNAUpdate(userId, callback) {
        if (!this.listeners.has(userId)) {
            this.listeners.set(userId, new Set());
        }
        this.listeners.get(userId).add(callback);

        return () => {
            this.listeners.get(userId)?.delete(callback);
        };
    }

    /**
     * Notify listeners of DNA update
     */
    notifyListeners(userId, dna) {
        const callbacks = this.listeners.get(userId);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(dna);
                } catch (e) {
                    console.error("Listener error:", e);
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 CACHE STATISTICS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get cache performance statistics
     */
    getStats() {
        const total = this.stats.cacheHits + this.stats.cacheMisses;
        const hitRate = total > 0 ? (this.stats.cacheHits / total * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            avgBytesPerSync: this.stats.syncOperations > 0
                ? Math.round(this.stats.bytesTransferred / this.stats.syncOperations)
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            syncOperations: 0,
            bytesTransferred: 0
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // ⚡ OPTIMISTIC UPDATES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Optimistically update local DNA (before server confirms)
     * Used for immediate UI feedback
     */
    optimisticUpdate(userId, updates) {
        const localDNA = this.getLocalDNA(userId);
        if (!localDNA) return;

        const updatedDNA = {
            ...localDNA,
            ...updates,
            cachedAt: Date.now(),
            pendingSync: true
        };

        this.setLocalDNA(userId, updatedDNA);
        this.notifyListeners(userId, updatedDNA);

        return updatedDNA;
    }

    /**
     * Confirm optimistic update after server sync
     */
    confirmOptimisticUpdate(userId, serverDNA) {
        const updatedDNA = {
            ...serverDNA,
            cachedAt: Date.now(),
            pendingSync: false
        };

        this.setLocalDNA(userId, updatedDNA);
        this.notifyListeners(userId, updatedDNA);
    }

    /**
     * Rollback optimistic update on error
     */
    rollbackOptimisticUpdate(userId, originalDNA) {
        this.setLocalDNA(userId, {
            ...originalDNA,
            pendingSync: false
        });
        this.notifyListeners(userId, originalDNA);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 LEGACY EXPORT (Schema Compatibility)
// ═══════════════════════════════════════════════════════════════════════════
export const DNA_CLIENT_ENGINE = {
    instance: null,

    initialize(supabaseClient) {
        this.instance = new DNAClientEngine(supabaseClient);
        return this.instance;
    },

    async syncPlayerDNA(userId) {
        if (!this.instance) {
            throw new Error('DNA_CLIENT_ENGINE not initialized. Call initialize() first.');
        }
        return this.instance.syncPlayerDNA(userId);
    }
};
