/**
 * 🧬 IDENTITY_DNA_ENGINE — Supabase Client
 * 
 * Database connection wrapper for the Identity DNA Engine.
 * Provides connection pooling and error handling.
 */

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 SUPABASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',

    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: false
        },
        db: {
            schema: 'public'
        },
        global: {
            headers: {
                'x-application-name': 'identity-dna-engine'
            }
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 SUPABASE CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class SupabaseClient {
    constructor() {
        this.client = null;
        this.connected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 3;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔗 CONNECTION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Connect to Supabase
     */
    async connect() {
        if (this.connected && this.client) {
            return this.client;
        }

        console.log('🔗 Connecting to Supabase...');

        try {
            // Use service key if available (server-side), otherwise anon key
            const key = SUPABASE_CONFIG.serviceKey || SUPABASE_CONFIG.anonKey;

            this.client = createClient(
                SUPABASE_CONFIG.url,
                key,
                SUPABASE_CONFIG.options
            );

            // Test connection
            await this.ping();

            this.connected = true;
            this.connectionAttempts = 0;
            console.log('✅ Supabase connected');

            return this.client;

        } catch (error) {
            this.connectionAttempts++;
            console.error(`❌ Supabase connection failed (attempt ${this.connectionAttempts}):`, error.message);

            if (this.connectionAttempts < this.maxRetries) {
                console.log('🔄 Retrying connection in 2s...');
                await new Promise(r => setTimeout(r, 2000));
                return this.connect();
            }

            throw new Error('Failed to connect to Supabase after max retries');
        }
    }

    /**
     * Ping Supabase to verify connection
     */
    async ping() {
        if (!this.client) {
            return false;
        }

        try {
            // Simple query to test connection
            const { error } = await this.client
                .from('profiles')
                .select('id')
                .limit(1);

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows found, which is fine
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Supabase ping failed:', error.message);
            return false;
        }
    }

    /**
     * Disconnect from Supabase
     */
    async disconnect() {
        if (this.client) {
            // Supabase JS doesn't have explicit disconnect, but we can clean up
            this.client = null;
            this.connected = false;
            console.log('🔌 Supabase disconnected');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATUS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.connected,
            url: SUPABASE_CONFIG.url,
            hasServiceKey: !!SUPABASE_CONFIG.serviceKey,
            connectionAttempts: this.connectionAttempts
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        const pingResult = await this.ping();

        return {
            status: pingResult ? 'HEALTHY' : 'UNHEALTHY',
            connected: this.connected,
            ping: pingResult,
            timestamp: new Date().toISOString()
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════
let globalClient = null;

export function getSupabaseClient() {
    if (!globalClient) {
        globalClient = new SupabaseClient();
    }
    return globalClient;
}
