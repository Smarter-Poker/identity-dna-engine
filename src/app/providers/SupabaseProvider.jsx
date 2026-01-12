/**
 * 🔐 SUPABASE AUTH-GATE & SESSION PROVIDER
 * src/app/providers/SupabaseProvider.jsx
 * 
 * Binds the shell to Supabase source of truth with high-fidelity state handling.
 * Implements automatic token refresh and session integrity.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 SUPABASE CLIENT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create singleton client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 SESSION CONTEXT TYPES & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} SessionState
 * @property {boolean} isLoading - Auth check in progress
 * @property {boolean} isAuthenticated - User has valid session
 * @property {Object|null} user - Supabase user object
 * @property {Object|null} session - Full session with tokens
 * @property {Object|null} profile - User DNA profile
 * @property {string} authStatus - 'SYNCING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR'
 */

const defaultSessionState = {
    isLoading: true,
    isAuthenticated: false,
    user: null,
    session: null,
    profile: null,
    authStatus: 'SYNCING',
    error: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 SESSION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const SupabaseContext = createContext({
    ...defaultSessionState,
    supabase: null,
    signIn: async () => { },
    signUp: async () => { },
    signOut: async () => { },
    refreshSession: async () => { },
    fetchProfile: async () => { }
});

// Custom hook for consuming the context
export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (!context) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};

// Convenience hooks
export const useSession = () => {
    const { session, isAuthenticated, isLoading } = useSupabase();
    return { session, isAuthenticated, isLoading };
};

export const useUser = () => {
    const { user, profile } = useSupabase();
    return { user, profile };
};

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ SUPABASE PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const SupabaseProvider = ({ children, onAuthChange }) => {
    const [state, setState] = useState(defaultSessionState);

    // ─────────────────────────────────────────────────────────────────────────
    // 📊 FETCH USER DNA PROFILE
    // ─────────────────────────────────────────────────────────────────────────
    const fetchProfile = useCallback(async (userId) => {
        if (!userId) return null;

        try {
            const { data, error } = await supabase
                .from('user_dna_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Profile fetch error:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Profile fetch exception:', err);
            return null;
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔄 SESSION STATE UPDATER
    // ─────────────────────────────────────────────────────────────────────────
    const updateSessionState = useCallback(async (session) => {
        if (session?.user) {
            const profile = await fetchProfile(session.user.id);

            setState({
                isLoading: false,
                isAuthenticated: true,
                user: session.user,
                session: session,
                profile: profile,
                authStatus: 'AUTHENTICATED',
                error: null
            });

            onAuthChange?.('AUTHENTICATED', session.user);
        } else {
            setState({
                isLoading: false,
                isAuthenticated: false,
                user: null,
                session: null,
                profile: null,
                authStatus: 'UNAUTHENTICATED',
                error: null
            });

            onAuthChange?.('UNAUTHENTICATED', null);
        }
    }, [fetchProfile, onAuthChange]);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔐 AUTH METHODS
    // ─────────────────────────────────────────────────────────────────────────
    const signIn = useCallback(async (email, password) => {
        setState(prev => ({ ...prev, isLoading: true, authStatus: 'SYNCING' }));

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            await updateSessionState(data.session);
            return { success: true, data };
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                authStatus: 'ERROR',
                error: error.message
            }));
            return { success: false, error };
        }
    }, [updateSessionState]);

    const signUp = useCallback(async (email, password, metadata = {}) => {
        setState(prev => ({ ...prev, isLoading: true, authStatus: 'SYNCING' }));

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: metadata }
            });

            if (error) throw error;

            // Note: User may need to confirm email before session is valid
            if (data.session) {
                await updateSessionState(data.session);
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    authStatus: 'UNAUTHENTICATED'
                }));
            }

            return { success: true, data };
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                authStatus: 'ERROR',
                error: error.message
            }));
            return { success: false, error };
        }
    }, [updateSessionState]);

    const signOut = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, authStatus: 'SYNCING' }));

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // 🛡️ SECURITY: Immediate state purge on logout
            setState({
                isLoading: false,
                isAuthenticated: false,
                user: null,
                session: null,
                profile: null,
                authStatus: 'UNAUTHENTICATED',
                error: null
            });

            onAuthChange?.('SIGNED_OUT', null);
            return { success: true };
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                authStatus: 'ERROR',
                error: error.message
            }));
            return { success: false, error };
        }
    }, [onAuthChange]);

    const refreshSession = useCallback(async () => {
        try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;

            if (data.session) {
                await updateSessionState(data.session);
            }

            return { success: true, session: data.session };
        } catch (error) {
            console.error('Session refresh error:', error);
            return { success: false, error };
        }
    }, [updateSessionState]);

    // ─────────────────────────────────────────────────────────────────────────
    // 🎯 INITIAL AUTH CHECK & LISTENER
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;

        // Initial session check
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Initial auth check error:', error);
                    if (isMounted) {
                        setState(prev => ({
                            ...prev,
                            isLoading: false,
                            authStatus: 'ERROR',
                            error: error.message
                        }));
                    }
                    return;
                }

                if (isMounted) {
                    await updateSessionState(session);
                }
            } catch (err) {
                console.error('Auth initialization exception:', err);
                if (isMounted) {
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        authStatus: 'ERROR',
                        error: err.message
                    }));
                }
            }
        };

        initializeAuth();

        // 🔐 Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);

                if (!isMounted) return;

                switch (event) {
                    case 'SIGNED_IN':
                    case 'TOKEN_REFRESHED':
                        await updateSessionState(session);
                        break;

                    case 'SIGNED_OUT':
                        // 🛡️ SECURITY: Immediate state purge
                        setState({
                            isLoading: false,
                            isAuthenticated: false,
                            user: null,
                            session: null,
                            profile: null,
                            authStatus: 'UNAUTHENTICATED',
                            error: null
                        });
                        break;

                    case 'USER_UPDATED':
                        if (session) {
                            await updateSessionState(session);
                        }
                        break;

                    default:
                        break;
                }
            }
        );

        return () => {
            isMounted = false;
            subscription?.unsubscribe();
        };
    }, [updateSessionState]);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔄 AUTO TOKEN REFRESH (every 10 minutes)
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!state.isAuthenticated) return;

        const refreshInterval = setInterval(() => {
            refreshSession();
        }, 10 * 60 * 1000); // 10 minutes

        return () => clearInterval(refreshInterval);
    }, [state.isAuthenticated, refreshSession]);

    // ─────────────────────────────────────────────────────────────────────────
    // 📦 CONTEXT VALUE
    // ─────────────────────────────────────────────────────────────────────────
    const contextValue = useMemo(() => ({
        ...state,
        supabase,
        signIn,
        signUp,
        signOut,
        refreshSession,
        fetchProfile
    }), [state, signIn, signUp, signOut, refreshSession, fetchProfile]);

    return (
        <SupabaseContext.Provider value={contextValue}>
            {children}
        </SupabaseContext.Provider>
    );
};

export default SupabaseProvider;
export { supabase };
