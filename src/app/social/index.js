/**
 * 📦 SOCIAL MODULE BARREL EXPORTS
 * src/app/social/index.js
 * 
 * Unified exports for the Social Orb module.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { SocialCard } from './components/SocialCard';
export { SpatialFeed } from './components/SpatialFeed';
export { EnhancedSpatialFeed } from './components/EnhancedSpatialFeed';
export { PostCreator } from './components/PostCreator';
export { LeaderboardOrb } from './components/LeaderboardOrb';
export { ChallengeCard } from './components/ChallengeCard';
export { ShareScoreCard } from './components/ShareScoreCard';
export { HeatMapBorder, GTOMasterGlow } from './components/HeatMapBorder';

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 SERVICES
// ═══════════════════════════════════════════════════════════════════════════

export { SocialService, createSocialService } from './SocialService';
export { MediaUploadService, createMediaUploadService, validateFile } from './MediaUploadService';
export { MessagingService, createMessagingService } from './MessagingService';

// ═══════════════════════════════════════════════════════════════════════════
// ✍️ POST CREATION (Enhanced with Media)
// ═══════════════════════════════════════════════════════════════════════════

export { EnhancedPostCreator } from './components/EnhancedPostCreator';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TYPES & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export {
    // Type constructors
    createAuthor,
    createPost,
    createComment,

    // Constants
    INTERACTION_TYPES,
    FEED_FILTERS,
    initialFeedState,

    // Utilities
    getRelativeTime,
    validatePostContent,
    validateCommentContent
} from './types';
