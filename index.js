/**
 * 🧬 SMARTER.POKER — IDENTITY_DNA_ENGINE
 * 
 * Master Entry Point for Global Identity System
 * Color: RED | Focus: Master User Data & Trust Schema
 * Target: GLOBAL_IDENTITY (Not an Orb)
 * 
 * This is the BLUE WINDOW AUTHORITY that manages:
 * - Unified Player Profiles
 * - Cross-Orb Synchronization
 * - Trust Scoring
 * - Skill Tier Calculation
 */

import { IdentityDNAEngine } from './core/IdentityDNAEngine.js';
import { ProfileManager } from './core/ProfileManager.js';
import { SyncOrchestrator } from './core/SyncOrchestrator.js';
import { DNAClientEngine, DNA_CLIENT_ENGINE } from './core/DNAClientEngine.js';
import { MasterBusConnector } from './integrations/MasterBusConnector.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 IDENTITY DNA ENGINE LAWS
// ═══════════════════════════════════════════════════════════════════════════
export const IDENTITY_DNA_LAWS = {
    LAW_1_SINGLE_SOURCE: 'One profile per user. All Orbs read from Identity DNA.',
    LAW_2_IMMUTABLE_HISTORY: 'XP and Trust Score changes are logged, never overwritten.',
    LAW_3_REAL_TIME_SYNC: 'Profile updates within 5 seconds of any Orb event.',
    LAW_4_SOVEREIGN_PRIVACY: 'User controls data export and deletion (GDPR/CCPA compliant).',
    LAW_5_CROSS_ORB_ISOLATION: 'Orbs cannot directly modify each other\'s data — only via DNA.'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 DNA MASTER SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════
export const DNA_MASTER_SCHEMA = {
    // 📊 THE UNIFIED PROFILE (Supabase Table: profiles)
    profile: {
        id: 'uuid (pk)',           // Unique player identifier from Supabase Auth
        username: 'text',          // Display name
        xp_total: 'bigint',        // Cumulative lifetime XP from XP-Engine
        trust_score: 'float',      // 0.0 - 100.0 composite reputation
        skill_tier: 'int',         // 1-10 tier based on training performance
        badges: 'jsonb',           // Earned achievements across platform
        last_sync: 'timestamp'     // Last cross-orb sync timestamp
    },

    // 📈 SKILL TIER DEFINITIONS
    tiers: {
        1: 'BEGINNER',
        2: 'APPRENTICE',
        3: 'BRONZE',
        4: 'SILVER',
        5: 'GOLD',
        6: 'PLATINUM',
        7: 'DIAMOND',
        8: 'ELITE',
        9: 'MASTER',
        10: 'LEGEND'
    },

    // 🔗 ORB DATA SOURCES
    orbSources: {
        ORB_3_XP_ENGINE: 'xp_total',
        ORB_4_TRAINING: 'skill_tier',
        ORB_7_ARCADE: 'skill_tier',
        ORB_8_BANKROLL: 'skill_tier',
        ORB_9_DISCOVERY: 'trust_score',
        ALL_ORBS: 'badges'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════════════════════
async function bootIdentityDNAEngine() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   🧬 IDENTITY_DNA_ENGINE — BLUE WINDOW AUTHORITY');
    console.log('   Color: RED | Focus: Master User Data & Trust Schema');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
        // 1. Initialize Master Bus Connection (Pentagon Enforcer)
        const masterBus = new MasterBusConnector();
        await masterBus.connect();
        console.log('✅ Master Bus connected (PORT 4000)');

        // 2. Initialize Core Engine
        const dnaEngine = new IdentityDNAEngine();
        await dnaEngine.initialize();
        console.log('✅ Identity DNA Engine initialized');

        // 3. Start Sync Orchestrator (Real-time cross-orb sync)
        const syncOrchestrator = new SyncOrchestrator(dnaEngine);
        await syncOrchestrator.startListening();
        console.log('✅ Sync Orchestrator listening for Orb events');

        // 4. Register Event Handlers
        masterBus.on('PLAYER_ACTION', async (event) => {
            await syncOrchestrator.handleOrbEvent(event);
        });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   🧬 IDENTITY_DNA_ENGINE — ONLINE');
        console.log('   Laws Enforced: 5 | Orb Connections: 10 | Status: SOVEREIGN');
        console.log('═══════════════════════════════════════════════════════════════');

        return { dnaEngine, syncOrchestrator, masterBus };

    } catch (error) {
        console.error('❌ IDENTITY_DNA_ENGINE BOOT FAILURE:', error.message);
        process.exit(1);
    }
}

// Export all components
export { IdentityDNAEngine, ProfileManager, SyncOrchestrator, DNAClientEngine, DNA_CLIENT_ENGINE, MasterBusConnector };
export { bootIdentityDNAEngine };

// Auto-boot if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    bootIdentityDNAEngine();
}
