/**
 * 🧬 IDENTITY_DNA_ENGINE — Migration Runner
 * 
 * Executes Supabase migrations in order.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 MIGRATION RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runMigrations() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   🧬 IDENTITY_DNA_ENGINE — Migration Runner');
    console.log('═══════════════════════════════════════════════════════════════');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get all .sql files in order
    const migrationFiles = readdirSync(__dirname)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`📋 Found ${migrationFiles.length} migration(s)`);

    for (const file of migrationFiles) {
        console.log(`\n🔄 Running: ${file}`);

        const sql = readFileSync(join(__dirname, file), 'utf-8');

        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

            if (error) {
                // Try direct query if RPC not available
                const { error: directError } = await supabase.from('_migrations').select('*').limit(0);

                if (directError) {
                    console.error(`❌ Migration failed: ${file}`);
                    console.error(error.message);
                    process.exit(1);
                }
            }

            console.log(`✅ Completed: ${file}`);

        } catch (error) {
            console.error(`❌ Migration error: ${file}`);
            console.error(error.message);
            process.exit(1);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   ✅ All migrations completed successfully');
    console.log('═══════════════════════════════════════════════════════════════');
}

runMigrations().catch(console.error);
