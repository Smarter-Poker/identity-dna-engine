/**
 * 🧬 IDENTITY_DNA_ENGINE — Profile Manager
 * 
 * CRUD operations for unified player profiles.
 * Enforces LAW 1 (Single Source) and LAW 2 (Immutable History).
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📊 PROFILE MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class ProfileManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.tableName = 'profiles';
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📝 CREATE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Create a new player profile
     * LAW 1: Ensures single profile per user
     */
    async create(profileData) {
        const { id, username, xp_total, trust_score, skill_tier, badges, last_sync } = profileData;

        // Check for existing profile (LAW 1: Single Source)
        const existing = await this.getById(id);
        if (existing) {
            throw new Error(`Profile already exists for user: ${id} — LAW 1 VIOLATION PREVENTED`);
        }

        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .insert({
                id,
                username,
                xp_total: xp_total || 0,
                trust_score: trust_score || 50.0,
                skill_tier: skill_tier || 1,
                badges: badges || [],
                last_sync: last_sync || new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Log creation in history (LAW 2)
        await this.logHistory(id, 'CREATED', null, data, 'IDENTITY_DNA_ENGINE');

        return data;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📖 READ
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get profile by user ID
     */
    async getById(userId) {
        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    /**
     * Get profile by username (for search)
     */
    async getByUsername(username) {
        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .select('*')
            .ilike('username', `%${username}%`)
            .limit(20);

        if (error) throw error;
        return data;
    }

    /**
     * Get profiles by skill tier (for matchmaking)
     */
    async getBySkillTier(tier) {
        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .select('*')
            .eq('skill_tier', tier)
            .order('trust_score', { ascending: false })
            .limit(100);

        if (error) throw error;
        return data;
    }

    /**
     * Get leaderboard (top players by XP)
     */
    async getLeaderboard(limit = 100) {
        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .select('id, username, xp_total, skill_tier, trust_score')
            .order('xp_total', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✏️ UPDATE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Update profile fields
     * LAW 2: All changes are logged in immutable history
     */
    async update(userId, updates, sourceOrb = 'UNKNOWN') {
        // Get current state for history
        const currentProfile = await this.getById(userId);
        if (!currentProfile) {
            throw new Error(`Profile not found: ${userId}`);
        }

        // Add sync timestamp
        updates.last_sync = new Date().toISOString();

        // Perform update
        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        // Log each changed field in history (LAW 2)
        for (const [field, newValue] of Object.entries(updates)) {
            if (field === 'last_sync') continue; // Don't log sync timestamp

            const oldValue = currentProfile[field];
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                await this.logHistory(userId, field, oldValue, newValue, sourceOrb);
            }
        }

        return data;
    }

    /**
     * Increment XP (immutable — never decreases)
     * LAW 2: XP changes are always logged
     */
    async incrementXP(userId, xpAmount, sourceOrb = 'XP_ENGINE') {
        if (xpAmount < 0) {
            throw new Error('XP cannot decrease — LAW 2: Immutable History');
        }

        const currentProfile = await this.getById(userId);
        if (!currentProfile) {
            throw new Error(`Profile not found: ${userId}`);
        }

        const newXP = (currentProfile.xp_total || 0) + xpAmount;

        const { data, error } = await this.supabase.client
            .from(this.tableName)
            .update({
                xp_total: newXP,
                last_sync: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        // Log XP change (LAW 2)
        await this.logHistory(userId, 'xp_total', currentProfile.xp_total, newXP, sourceOrb);

        return data;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🗑️ DELETE (LAW 4: Sovereign Privacy)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Delete player profile and all associated data
     * LAW 4: User has sovereign control over their data
     */
    async delete(userId) {
        // Archive profile before deletion (for legal compliance)
        const profile = await this.getById(userId);
        if (!profile) {
            throw new Error(`Profile not found: ${userId}`);
        }

        await this.archiveProfile(userId, profile);

        // Delete from main table
        const { error } = await this.supabase.client
            .from(this.tableName)
            .delete()
            .eq('id', userId);

        if (error) throw error;

        // Log deletion in audit trail
        await this.logHistory(userId, 'DELETED', profile, null, 'USER_REQUEST');

        return { deleted: true, userId, timestamp: new Date().toISOString() };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📜 HISTORY & ARCHIVAL (LAW 2)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Log profile change to immutable history
     */
    async logHistory(userId, field, oldValue, newValue, sourceOrb) {
        const { error } = await this.supabase.client
            .from('profile_history')
            .insert({
                user_id: userId,
                field_changed: field,
                old_value: JSON.stringify(oldValue),
                new_value: JSON.stringify(newValue),
                source_orb: sourceOrb,
                changed_at: new Date().toISOString()
            });

        if (error) {
            console.error('Failed to log history:', error);
            // Don't throw — history logging shouldn't block operations
        }
    }

    /**
     * Archive profile before deletion (GDPR compliance)
     */
    async archiveProfile(userId, profile) {
        const { error } = await this.supabase.client
            .from('profile_archive')
            .insert({
                user_id: userId,
                profile_data: profile,
                archived_at: new Date().toISOString(),
                retention_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days
            });

        if (error) {
            console.error('Failed to archive profile:', error);
        }
    }

    /**
     * Get full profile history
     */
    async getHistory(userId, limit = 100) {
        const { data, error } = await this.supabase.client
            .from('profile_history')
            .select('*')
            .eq('user_id', userId)
            .order('changed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
}
