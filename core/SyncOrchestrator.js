/**
 * 🧬 IDENTITY_DNA_ENGINE — Sync Orchestrator
 * 
 * Real-time cross-orb synchronization engine.
 * Enforces LAW 3: Profile updates within 5 seconds of any Orb event.
 * Enforces LAW 5: Cross-Orb Isolation — only DNA can modify data.
 */

import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 SYNC CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const SYNC_CONFIG = {
    MAX_SYNC_TIME_MS: 5000,        // LAW 3: 5 second limit
    BATCH_INTERVAL_MS: 1000,       // Batch events every second
    MAX_QUEUE_SIZE: 1000,          // Maximum events in queue
    RETRY_ATTEMPTS: 3,             // Retry failed syncs
    RETRY_DELAY_MS: 500            // Delay between retries
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 ORB EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════
const ORB_EVENTS = {
    // Orb 3: XP Engine
    XP_AWARDED: 'XP_AWARDED',
    XP_STREAK_BONUS: 'XP_STREAK_BONUS',

    // Orb 4: GTO Training
    TRAINING_COMPLETED: 'TRAINING_COMPLETED',
    SKILL_IMPROVED: 'SKILL_IMPROVED',
    LEAK_DETECTED: 'LEAK_DETECTED',

    // Orb 5: The Brain
    SESSION_COMPLETED: 'SESSION_COMPLETED',
    LEVEL_UNLOCKED: 'LEVEL_UNLOCKED',

    // Orb 7: Diamond Arcade
    ARCADE_WIN: 'ARCADE_WIN',
    DIAMOND_EARNED: 'DIAMOND_EARNED',
    TIER_PROMOTION: 'TIER_PROMOTION',

    // Orb 8: Bankroll Manager
    BANKROLL_UPDATE: 'BANKROLL_UPDATE',
    DISCIPLINE_SCORE: 'DISCIPLINE_SCORE',
    STOP_LOSS_TRIGGERED: 'STOP_LOSS_TRIGGERED',

    // Orb 9: Discovery & Trust
    REVIEW_RECEIVED: 'REVIEW_RECEIVED',
    TRUST_UPDATED: 'TRUST_UPDATED',
    GEO_VERIFIED: 'GEO_VERIFIED',

    // Orb 10: Command Bridge
    BADGE_EARNED: 'BADGE_EARNED',
    ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 SYNC ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class SyncOrchestrator extends EventEmitter {
    constructor(dnaEngine) {
        super();
        this.dnaEngine = dnaEngine;
        this.eventQueue = [];
        this.isProcessing = false;
        this.batchTimer = null;
        this.stats = {
            eventsReceived: 0,
            syncsCompleted: 0,
            syncsFailed: 0,
            averageSyncTime: 0,
            law3Violations: 0
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🚀 INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Start listening for Orb events
     */
    async startListening() {
        console.log('🔄 Sync Orchestrator starting...');

        // Start batch processing timer
        this.batchTimer = setInterval(() => {
            this.processBatch();
        }, SYNC_CONFIG.BATCH_INTERVAL_MS);

        console.log('✅ Sync Orchestrator listening for Orb events');
        this.emit('started');
    }

    /**
     * Stop listening and clean up
     */
    stop() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }
        this.emit('stopped');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📥 EVENT HANDLING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Handle incoming Orb event
     * LAW 5: Only DNA can modify profile data
     */
    async handleOrbEvent(event) {
        const { type, userId, sourceOrb, payload, timestamp } = event;

        // Validate event
        if (!this.isValidEvent(event)) {
            console.warn('⚠️ Invalid event received:', event);
            return;
        }

        // Add to queue
        this.eventQueue.push({
            type,
            userId,
            sourceOrb,
            payload,
            receivedAt: Date.now(),
            originalTimestamp: timestamp || Date.now()
        });

        this.stats.eventsReceived++;

        // Check queue size limit
        if (this.eventQueue.length > SYNC_CONFIG.MAX_QUEUE_SIZE) {
            console.warn(`⚠️ Event queue overflow — dropping oldest events`);
            this.eventQueue = this.eventQueue.slice(-SYNC_CONFIG.MAX_QUEUE_SIZE);
        }

        this.emit('eventQueued', { type, userId, queueSize: this.eventQueue.length });
    }

    /**
     * Validate incoming event
     */
    isValidEvent(event) {
        return (
            event &&
            event.type &&
            event.userId &&
            event.sourceOrb &&
            Object.values(ORB_EVENTS).includes(event.type)
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // ⚡ BATCH PROCESSING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Process queued events in batch
     */
    async processBatch() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        // Get events to process
        const eventsToProcess = [...this.eventQueue];
        this.eventQueue = [];

        // Group events by user for efficient sync
        const eventsByUser = this.groupEventsByUser(eventsToProcess);

        // Process each user's events
        for (const [userId, userEvents] of Object.entries(eventsByUser)) {
            await this.syncUserEvents(userId, userEvents);
        }

        this.isProcessing = false;
    }

    /**
     * Group events by user ID for batch processing
     */
    groupEventsByUser(events) {
        return events.reduce((groups, event) => {
            const { userId } = event;
            if (!groups[userId]) {
                groups[userId] = [];
            }
            groups[userId].push(event);
            return groups;
        }, {});
    }

    /**
     * Sync all events for a single user
     * LAW 3: Must complete within 5 seconds
     */
    async syncUserEvents(userId, events) {
        const startTime = Date.now();

        try {
            // Aggregate changes from all events
            const changes = this.aggregateEventChanges(events);

            // Check if full DNA sync is needed
            const needsFullSync = this.requiresFullSync(events);

            if (needsFullSync) {
                // Full cross-orb sync
                await this.dnaEngine.updatePlayerDNA(userId);
            } else {
                // Partial sync based on event types
                await this.applyPartialSync(userId, changes);
            }

            const syncTime = Date.now() - startTime;
            this.updateSyncStats(syncTime, true);

            // LAW 3 CHECK
            if (syncTime > SYNC_CONFIG.MAX_SYNC_TIME_MS) {
                this.stats.law3Violations++;
                console.warn(`⚠️ LAW 3 VIOLATION: User ${userId} sync took ${syncTime}ms`);
            }

            this.emit('syncCompleted', { userId, syncTime, events: events.length });

        } catch (error) {
            console.error(`❌ Sync failed for user ${userId}:`, error.message);
            this.updateSyncStats(Date.now() - startTime, false);

            // Retry logic
            await this.retrySync(userId, events, 0);
        }
    }

    /**
     * Aggregate changes from multiple events
     */
    aggregateEventChanges(events) {
        const changes = {
            xpDelta: 0,
            trustDelta: 0,
            skillChange: false,
            badgesEarned: [],
            orbsAffected: new Set()
        };

        for (const event of events) {
            changes.orbsAffected.add(event.sourceOrb);

            switch (event.type) {
                case ORB_EVENTS.XP_AWARDED:
                case ORB_EVENTS.XP_STREAK_BONUS:
                    changes.xpDelta += event.payload?.amount || 0;
                    break;

                case ORB_EVENTS.SKILL_IMPROVED:
                case ORB_EVENTS.TIER_PROMOTION:
                case ORB_EVENTS.TRAINING_COMPLETED:
                    changes.skillChange = true;
                    break;

                case ORB_EVENTS.TRUST_UPDATED:
                case ORB_EVENTS.REVIEW_RECEIVED:
                    changes.trustDelta += event.payload?.delta || 0;
                    break;

                case ORB_EVENTS.BADGE_EARNED:
                case ORB_EVENTS.ACHIEVEMENT_UNLOCKED:
                    if (event.payload?.badge) {
                        changes.badgesEarned.push(event.payload.badge);
                    }
                    break;
            }
        }

        return changes;
    }

    /**
     * Check if events require full DNA sync
     */
    requiresFullSync(events) {
        const fullSyncTriggers = [
            ORB_EVENTS.TIER_PROMOTION,
            ORB_EVENTS.SKILL_IMPROVED,
            ORB_EVENTS.DISCIPLINE_SCORE
        ];

        return events.some(e => fullSyncTriggers.includes(e.type));
    }

    /**
     * Apply partial sync for simple updates
     */
    async applyPartialSync(userId, changes) {
        const updates = { last_sync: new Date().toISOString() };
        const sources = Array.from(changes.orbsAffected).join(',');

        // XP update (incremental)
        if (changes.xpDelta > 0) {
            await this.dnaEngine.profileManager.incrementXP(
                userId,
                changes.xpDelta,
                sources
            );
        }

        // Trust score update
        if (changes.trustDelta !== 0) {
            const profile = await this.dnaEngine.getProfile(userId);
            updates.trust_score = Math.max(0, Math.min(100,
                (profile?.trust_score || 50) + changes.trustDelta
            ));
        }

        // Badge updates
        if (changes.badgesEarned.length > 0) {
            const profile = await this.dnaEngine.getProfile(userId);
            const currentBadges = profile?.badges || [];
            updates.badges = [...currentBadges, ...changes.badgesEarned];
        }

        // Apply updates if any
        if (Object.keys(updates).length > 1) { // More than just last_sync
            await this.dnaEngine.profileManager.update(userId, updates, sources);
        }
    }

    /**
     * Retry failed sync with exponential backoff
     */
    async retrySync(userId, events, attempt) {
        if (attempt >= SYNC_CONFIG.RETRY_ATTEMPTS) {
            console.error(`❌ Sync permanently failed for user ${userId} after ${attempt} attempts`);
            this.emit('syncFailed', { userId, attempts: attempt });
            return;
        }

        const delay = SYNC_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`🔄 Retrying sync for ${userId} in ${delay}ms (attempt ${attempt + 1})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            await this.dnaEngine.updatePlayerDNA(userId);
            console.log(`✅ Retry successful for ${userId}`);
        } catch (error) {
            await this.retrySync(userId, events, attempt + 1);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATISTICS
    // ═══════════════════════════════════════════════════════════════════

    updateSyncStats(syncTime, success) {
        if (success) {
            this.stats.syncsCompleted++;
            // Rolling average
            this.stats.averageSyncTime =
                (this.stats.averageSyncTime * (this.stats.syncsCompleted - 1) + syncTime)
                / this.stats.syncsCompleted;
        } else {
            this.stats.syncsFailed++;
        }
    }

    getStats() {
        return {
            ...this.stats,
            queueSize: this.eventQueue.length,
            isProcessing: this.isProcessing,
            law3ComplianceRate: this.stats.syncsCompleted > 0
                ? ((this.stats.syncsCompleted - this.stats.law3Violations) / this.stats.syncsCompleted * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }
}

// Export event types for external use
export { ORB_EVENTS };
