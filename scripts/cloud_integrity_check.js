/**
 * 🛰️ CLOUD_INTEGRITY_CHECK: MASTER_BUS_VERIFICATION
 * Verifies connection and schema status across all silos
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

async function runIntegrityCheck() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   🛰️ CLOUD INTEGRITY CHECK — MASTER BUS VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const report = {
        connection: 'DISCONNECTED',
        silos: {
            RED: { status: 'UNKNOWN', triggers: [], tables: [] },
            YELLOW: { status: 'UNKNOWN', triggers: [] },
            GREEN: { status: 'UNKNOWN', functions: [] },
            ORANGE: { status: 'UNKNOWN', views: [] }
        }
    };

    // 1. CHECK CONFIGURATION
    console.log('📡 1. CONFIGURATION CHECK');
    console.log('─────────────────────────────────────────────────────────────────');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.log('   ❌ SUPABASE_URL or SUPABASE_KEY not configured');
        console.log('   ℹ️  Set these in .env file:');
        console.log('      SUPABASE_URL=https://your-project.supabase.co');
        console.log('      SUPABASE_ANON_KEY=your-anon-key');
        report.connection = 'NOT_CONFIGURED';
        printReport(report);
        return report;
    }

    console.log(`   ✅ SUPABASE_URL: ${SUPABASE_URL.substring(0, 30)}...`);
    console.log(`   ✅ SUPABASE_KEY: ${SUPABASE_KEY.substring(0, 20)}...`);
    console.log('');

    // Initialize client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. PING SUPABASE
    console.log('📡 2. PING SUPABASE');
    console.log('─────────────────────────────────────────────────────────────────');

    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);

        if (error && error.code !== 'PGRST116') {
            console.log(`   ⚠️  Connection test: ${error.message}`);
            // Try a simpler query
            const { error: error2 } = await supabase.rpc('version');
            if (error2) {
                console.log(`   ❌ DISCONNECTED: ${error2.message}`);
                report.connection = 'DISCONNECTED';
            } else {
                console.log('   ✅ CONNECTED (via RPC)');
                report.connection = 'CONNECTED';
            }
        } else {
            console.log('   ✅ CONNECTED');
            report.connection = 'CONNECTED';
        }
    } catch (e) {
        console.log(`   ❌ CONNECTION ERROR: ${e.message}`);
        report.connection = 'ERROR';
    }
    console.log('');

    if (report.connection !== 'CONNECTED') {
        printReport(report);
        return report;
    }

    // 3. SCHEMA INVENTORY
    console.log('📊 3. SCHEMA INVENTORY (public tables)');
    console.log('─────────────────────────────────────────────────────────────────');

    try {
        const { data: tables, error } = await supabase.rpc('get_tables_list');

        if (error) {
            // Fallback: try direct query approach
            const { data: profilesCheck } = await supabase.from('profiles').select('id').limit(1);
            const { data: xpVaultCheck } = await supabase.from('xp_vault').select('id').limit(1);

            const foundTables = [];
            if (profilesCheck !== null) foundTables.push('profiles');
            if (xpVaultCheck !== null) foundTables.push('xp_vault');

            console.log(`   Found tables (partial): ${foundTables.join(', ') || 'None detected'}`);
            report.silos.RED.tables = foundTables;
        } else {
            console.log(`   Found ${tables?.length || 0} tables`);
            if (tables) {
                tables.forEach(t => console.log(`      - ${t.table_name}`));
                report.silos.RED.tables = tables.map(t => t.table_name);
            }
        }
    } catch (e) {
        console.log(`   ⚠️  Could not list tables: ${e.message}`);
    }
    console.log('');

    // 4. TRIGGER AUDIT
    console.log('🔐 4. TRIGGER AUDIT');
    console.log('─────────────────────────────────────────────────────────────────');

    const triggersToCheck = [
        { name: 'trig_prevent_xp_loss', silo: 'RED', table: 'profiles' },
        { name: 'trig_block_xp_decrease', silo: 'RED', table: 'profiles' },
        { name: 'trig_sovereign_no_loss_profiles', silo: 'RED', table: 'profiles' },
        { name: 'trig_execute_marketplace_burn', silo: 'YELLOW', table: 'transactions' },
        { name: 'trig_sync_flame_on_streak', silo: 'RED', table: 'user_streaks' }
    ];

    try {
        const { data: triggers, error } = await supabase.rpc('get_triggers_list');

        if (error) {
            console.log('   ⚠️  Could not query triggers directly');
            console.log('   ℹ️  Triggers are defined in migrations but need DB query to verify');

            // Mark as pending verification
            report.silos.RED.status = 'NEEDS_MIGRATION';
            report.silos.YELLOW.status = 'NEEDS_MIGRATION';
        } else if (triggers) {
            triggersToCheck.forEach(t => {
                const found = triggers.some(tr => tr.trigger_name === t.name);
                console.log(`   ${found ? '✅' : '❌'} ${t.name} (${t.silo})`);
                if (found) {
                    report.silos[t.silo].triggers.push(t.name);
                }
            });
        }
    } catch (e) {
        console.log(`   ⚠️  Trigger audit error: ${e.message}`);
    }
    console.log('');

    // 5. FUNCTION CHECK
    console.log('⚙️  5. FUNCTION CHECK');
    console.log('─────────────────────────────────────────────────────────────────');

    const functionsToCheck = [
        { name: 'fn_validate_level_unlock', silo: 'GREEN' },
        { name: 'fn_calculate_level', silo: 'RED' },
        { name: 'dna_visual_export', silo: 'RED' },
        { name: 'streak_oracle_service', silo: 'RED' },
        { name: 'rpc_accept_xp_grant', silo: 'RED' }
    ];

    for (const fn of functionsToCheck) {
        try {
            // Try calling with null to see if function exists
            const { error } = await supabase.rpc(fn.name, {});
            if (error && error.code === '42883') {
                console.log(`   ❌ ${fn.name} (${fn.silo}) - NOT FOUND`);
            } else {
                console.log(`   ✅ ${fn.name} (${fn.silo})`);
                report.silos[fn.silo].functions = report.silos[fn.silo].functions || [];
                report.silos[fn.silo].functions.push(fn.name);
            }
        } catch (e) {
            console.log(`   ⚠️  ${fn.name}: ${e.message}`);
        }
    }
    console.log('');

    // 6. MATERIALIZED VIEW CHECK
    console.log('🔍 6. MATERIALIZED VIEW CHECK');
    console.log('─────────────────────────────────────────────────────────────────');

    try {
        const { data, error } = await supabase.from('global_search_index').select('*').limit(1);

        if (error && error.code === 'PGRST116') {
            console.log('   ✅ global_search_index EXISTS (empty)');
            report.silos.ORANGE.views.push('global_search_index');
            report.silos.ORANGE.status = 'ACTIVE';
        } else if (error) {
            console.log(`   ❌ global_search_index: ${error.message}`);
        } else {
            console.log('   ✅ global_search_index EXISTS (has data)');
            report.silos.ORANGE.views.push('global_search_index');
            report.silos.ORANGE.status = 'ACTIVE';
        }
    } catch (e) {
        console.log(`   ⚠️  View check error: ${e.message}`);
    }
    console.log('');

    // Calculate silo statuses
    report.silos.RED.status = report.silos.RED.tables.length > 0 ? 'ACTIVE' : 'NEEDS_MIGRATION';
    report.silos.YELLOW.status = report.silos.YELLOW.triggers.length > 0 ? 'ACTIVE' : 'NEEDS_MIGRATION';
    report.silos.GREEN.status = (report.silos.GREEN.functions?.length || 0) > 0 ? 'ACTIVE' : 'NEEDS_MIGRATION';

    printReport(report);
    return report;
}

function printReport(report) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   📊 CLOUD INTEGRITY REPORT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   🌐 CONNECTION: ${report.connection === 'CONNECTED' ? '✅ CONNECTED' : '❌ ' + report.connection}`);
    console.log('');
    console.log('   SILO STATUS:');
    console.log(`   ├─ 🔴 RED (Identity DNA)     : ${formatStatus(report.silos.RED.status)}`);
    console.log(`   ├─ 🟡 YELLOW (Diamond)       : ${formatStatus(report.silos.YELLOW.status)}`);
    console.log(`   ├─ 🟢 GREEN (Content)        : ${formatStatus(report.silos.GREEN.status)}`);
    console.log(`   └─ 🟠 ORANGE (Search)        : ${formatStatus(report.silos.ORANGE.status)}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');

    if (report.connection !== 'CONNECTED') {
        console.log('');
        console.log('   ⚠️  To connect, ensure .env has:');
        console.log('      SUPABASE_URL=https://xxxxx.supabase.co');
        console.log('      SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        console.log('');
        console.log('   Then run migrations:');
        console.log('      node schemas/supabase_migrations/run.js');
    }
}

function formatStatus(status) {
    switch (status) {
        case 'ACTIVE': return '✅ ACTIVE';
        case 'CONNECTED': return '✅ CONNECTED';
        case 'NEEDS_MIGRATION': return '🔶 NEEDS_MIGRATION';
        default: return '❓ ' + status;
    }
}

// Run check
runIntegrityCheck().catch(console.error);
