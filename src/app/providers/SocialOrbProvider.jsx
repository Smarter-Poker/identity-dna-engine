/**
 * 🧬 SOCIAL ORB SESSION PROVIDER
 * src/app/providers/SocialOrbProvider.jsx
 * 
 * Global state contract for Identity DNA, XP, Diamonds, and Social Access.
 * Broadcasts capability flags for feature unlocking across the tree.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { useSupabase } from './SupabaseProvider';
import { createSocialService } from '../social/SocialService';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 GLOBAL STATE CONTRACT
// ═══════════════════════════════════════════════════════════════════════════

const initialState = {
    // Identity DNA
    identity: {
        level: 1,
        xp: 0,
        xpLifetime: 0,
        tier: 'BRONZE',
        skillTier: 1
    },

    // DNA Radar Metrics
    dna: {
        grit: 0.5,
        accuracy: 0.5,
        aggression: 0.5,
        wealth: 0.5,
        rep: 0.5
    },

    // Currency
    economy: {
        diamonds: 0,
        diamondsLifetime: 0,
        streakMultiplier: 1.0,
        currentStreak: 0
    },

    // Access/Capability Flags
    capabilities: {
        hasSocialAccess: false,
        hasArcadeAccess: false,
        hasTrainingAccess: false,
        hasBankrollAccess: false,
        hasMarketplaceAccess: false,
        isVerified: false,
        isProVerified: false
    },

    // Feature Locks
    featureLocks: {
        socialFeed: { locked: true, requiredLevel: 1 },
        clubs: { locked: true, requiredLevel: 5 },
        messaging: { locked: true, requiredLevel: 10 },
        tournaments: { locked: true, requiredLevel: 15 },
        leaderboards: { locked: true, requiredLevel: 3 },
        profileCustomization: { locked: true, requiredLevel: 2 }
    },

    // Sync status
    syncStatus: 'IDLE', // 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR'
    lastSyncAt: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 STATE REDUCER
// ═══════════════════════════════════════════════════════════════════════════

const ActionTypes = {
    SET_PROFILE: 'SET_PROFILE',
    UPDATE_IDENTITY: 'UPDATE_IDENTITY',
    UPDATE_DNA: 'UPDATE_DNA',
    UPDATE_ECONOMY: 'UPDATE_ECONOMY',
    UPDATE_CAPABILITIES: 'UPDATE_CAPABILITIES',
    UPDATE_FEATURE_LOCKS: 'UPDATE_FEATURE_LOCKS',
    SET_SYNC_STATUS: 'SET_SYNC_STATUS',
    RESET_STATE: 'RESET_STATE'
};

function socialOrbReducer(state, action) {
    switch (action.type) {
        case ActionTypes.SET_PROFILE:
            return {
                ...state,
                identity: action.payload.identity || state.identity,
                dna: action.payload.dna || state.dna,
                economy: action.payload.economy || state.economy,
                capabilities: action.payload.capabilities || state.capabilities,
                featureLocks: calculateFeatureLocks(action.payload.identity?.level || 1),
                syncStatus: 'SYNCED',
                lastSyncAt: new Date().toISOString()
            };

        case ActionTypes.UPDATE_IDENTITY:
            return {
                ...state,
                identity: { ...state.identity, ...action.payload },
                featureLocks: calculateFeatureLocks(action.payload.level || state.identity.level)
            };

        case ActionTypes.UPDATE_DNA:
            return {
                ...state,
                dna: { ...state.dna, ...action.payload }
            };

        case ActionTypes.UPDATE_ECONOMY:
            return {
                ...state,
                economy: { ...state.economy, ...action.payload }
            };

        case ActionTypes.UPDATE_CAPABILITIES:
            return {
                ...state,
                capabilities: { ...state.capabilities, ...action.payload }
            };

        case ActionTypes.UPDATE_FEATURE_LOCKS:
            return {
                ...state,
                featureLocks: { ...state.featureLocks, ...action.payload }
            };

        case ActionTypes.SET_SYNC_STATUS:
            return {
                ...state,
                syncStatus: action.payload
            };

        case ActionTypes.RESET_STATE:
            return initialState;

        default:
            return state;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔓 FEATURE LOCK CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

function calculateFeatureLocks(level) {
    return {
        socialFeed: { locked: level < 1, requiredLevel: 1 },
        clubs: { locked: level < 5, requiredLevel: 5 },
        messaging: { locked: level < 10, requiredLevel: 10 },
        tournaments: { locked: level < 15, requiredLevel: 15 },
        leaderboards: { locked: level < 3, requiredLevel: 3 },
        profileCustomization: { locked: level < 2, requiredLevel: 2 }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const SocialOrbContext = createContext(null);

export const useSocialOrb = () => {
    const context = useContext(SocialOrbContext);
    if (!context) {
        throw new Error('useSocialOrb must be used within a SocialOrbProvider');
    }
    return context;
};

// Convenience hooks
export const useIdentity = () => {
    const { state } = useSocialOrb();
    return state.identity;
};

export const useDNA = () => {
    const { state } = useSocialOrb();
    return state.dna;
};

export const useEconomy = () => {
    const { state } = useSocialOrb();
    return state.economy;
};

export const useCapabilities = () => {
    const { state } = useSocialOrb();
    return state.capabilities;
};

export const useFeatureLock = (featureKey) => {
    const { state } = useSocialOrb();
    return state.featureLocks[featureKey] || { locked: true, requiredLevel: 999 };
};

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ SOCIAL ORB PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export const SocialOrbProvider = ({ children }) => {
    const [state, dispatch] = useReducer(socialOrbReducer, initialState);
    const { profile, isAuthenticated, supabase } = useSupabase();

    // Instantiate SocialService
    const socialService = useMemo(() => {
        if (!supabase) return null;
        return createSocialService(supabase);
    }, [supabase]);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔄 SYNC PROFILE FROM SUPABASE
    // ─────────────────────────────────────────────────────────────────────────
    const syncProfile = useCallback(async () => {
        if (!profile) return;

        dispatch({ type: ActionTypes.SET_SYNC_STATUS, payload: 'SYNCING' });

        try {
            dispatch({
                type: ActionTypes.SET_PROFILE,
                payload: {
                    identity: {
                        level: profile.current_level || 1,
                        xp: profile.xp_total || 0,
                        xpLifetime: profile.xp_lifetime || 0,
                        tier: profile.tier_id || 'BRONZE',
                        skillTier: profile.skill_tier || 1
                    },
                    dna: {
                        grit: profile.grit || 0.5,
                        accuracy: profile.accuracy || 0.5,
                        aggression: profile.aggression || 0.5,
                        wealth: profile.wealth || 0.5,
                        rep: profile.social_reputation || 0.5
                    },
                    economy: {
                        diamonds: profile.diamond_balance || 0,
                        diamondsLifetime: profile.diamond_lifetime || 0,
                        streakMultiplier: profile.streak_multiplier || 1.0,
                        currentStreak: profile.current_streak || 0
                    },
                    capabilities: {
                        hasSocialAccess: profile.current_level >= 1,
                        hasArcadeAccess: profile.current_level >= 5,
                        hasTrainingAccess: true,
                        hasBankrollAccess: profile.current_level >= 3,
                        hasMarketplaceAccess: profile.current_level >= 10,
                        isVerified: profile.is_verified || false,
                        isProVerified: profile.is_pro_verified || false
                    }
                }
            });
        } catch (error) {
            console.error('Profile sync error:', error);
            dispatch({ type: ActionTypes.SET_SYNC_STATUS, payload: 'ERROR' });
        }
    }, [profile]);

    // Sync when profile changes
    useEffect(() => {
        if (profile) {
            syncProfile();
        }
    }, [profile, syncProfile]);

    // Reset state on logout
    useEffect(() => {
        if (!isAuthenticated) {
            dispatch({ type: ActionTypes.RESET_STATE });
        }
    }, [isAuthenticated]);

    // ─────────────────────────────────────────────────────────────────────────
    // 🎯 ACTIONS
    // ─────────────────────────────────────────────────────────────────────────
    const actions = useMemo(() => ({
        updateIdentity: (data) => dispatch({ type: ActionTypes.UPDATE_IDENTITY, payload: data }),
        updateDNA: (data) => dispatch({ type: ActionTypes.UPDATE_DNA, payload: data }),
        updateEconomy: (data) => dispatch({ type: ActionTypes.UPDATE_ECONOMY, payload: data }),
        updateCapabilities: (data) => dispatch({ type: ActionTypes.UPDATE_CAPABILITIES, payload: data }),
        syncProfile,
        resetState: () => dispatch({ type: ActionTypes.RESET_STATE })
    }), [syncProfile]);

    // ─────────────────────────────────────────────────────────────────────────
    // 📦 CONTEXT VALUE
    // ─────────────────────────────────────────────────────────────────────────
    const contextValue = useMemo(() => ({
        state,
        socialService, // Exposed Service
        ...actions
    }), [state, actions, socialService]);

    return (
        <SocialOrbContext.Provider value={contextValue}>
            {children}
        </SocialOrbContext.Provider>
    );
};

export default SocialOrbProvider;
