/**
 * 🧬 ORB 01: SOCIAL — BARREL EXPORT
 * src/orbs/Social/index.js
 * 
 * Unified exports for the Social Orb Identity DNA module.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 IDENTITY DNA
// ═══════════════════════════════════════════════════════════════════════════

export {
    // Constants
    DNA_TRAITS,
    DNA_TRAITS_ORDERED,
    DNA_TIER_CONFIGS,
    DNATier,

    // Functions
    calculateCompositeScore,
    normalizeValue,
    getTierForScore,
    createDefaultDNAProfile,
    validateDNAProfile,
    calculateHologramParams
} from './IdentityDNA.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ XP VAULT
// ═══════════════════════════════════════════════════════════════════════════

export {
    // Constants
    XP_VAULT_LAWS,
    XP_SOURCES,

    // Class
    XPVault,

    // Factory
    createXPVault,
    getGlobalXPVault
} from './XPVault.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 3D DNA RADAR CHART (React Component - imported separately)
// ═══════════════════════════════════════════════════════════════════════════
// Note: DNA_Radar_Chart.tsx is a React/TSX component.
// Import it directly when using in a React project:
// import { DNA_Radar_Chart } from './DNA_Radar_Chart';
