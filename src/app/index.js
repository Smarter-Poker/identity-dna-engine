/**
 * 📦 APP BARREL EXPORTS
 * src/app/index.js
 * 
 * Unified exports for the Social Orb application framework.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🌌 MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

export { App, default } from './App';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════

export {
    SupabaseProvider,
    useSupabase,
    useSession,
    useUser,
    supabase
} from './providers/SupabaseProvider';

export {
    SocialOrbProvider,
    useSocialOrb,
    useIdentity,
    useDNA,
    useEconomy,
    useCapabilities,
    useFeatureLock
} from './providers/SocialOrbProvider';

// ═══════════════════════════════════════════════════════════════════════════
// 🧩 COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { AuthGate } from './components/AuthGate';
export { LayoutShell } from './components/LayoutShell';
export { WarpLoader } from './components/WarpLoader';
export { RewardProvider, useRewards } from './components/RewardParticles';

// ═══════════════════════════════════════════════════════════════════════════
// 📄 VIEWS
// ═══════════════════════════════════════════════════════════════════════════

export { LoginView } from './views/LoginView';
export { ErrorView } from './views/ErrorView';
export { ForbiddenView } from './views/ForbiddenView';
export { PlaceholderView } from './views/PlaceholderView';
export { SocialFeedView } from './views/SocialFeedView';
export { DNAProfileView } from './views/DNAProfileView';
export { LeaderboardView } from './views/LeaderboardView';
