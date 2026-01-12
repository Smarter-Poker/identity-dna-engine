/**
 * 🌐 SOCIAL FEED VIEW V2
 * src/app/views/SocialFeedView.jsx
 * 
 * Main Social Feed view with Enhanced Feed and Leaderboard.
 */

import React, { useState, useCallback } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { EnhancedSpatialFeed } from '../social/components/EnhancedSpatialFeed';
import { PostCreator } from '../social/components/PostCreator';
import { LeaderboardOrb } from '../social/components/LeaderboardOrb';

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 SOCIAL FEED VIEW
// ═══════════════════════════════════════════════════════════════════════════

export const SocialFeedView = ({
  onNavigateToProfile,
  onNavigateToPost,
  onNavigateToTraining
}) => {
  const { user } = useSupabase();
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  // Handle creating new post
  const handleCreatePost = useCallback(() => {
    setShowPostCreator(true);
  }, []);

  // Handle post created
  const handlePostCreated = useCallback((newPost) => {
    console.log('New post created:', newPost);
  }, []);

  // Handle author click
  const handleAuthorClick = useCallback((authorId) => {
    onNavigateToProfile?.(authorId);
  }, [onNavigateToProfile]);

  // Handle post click
  const handlePostClick = useCallback((postId, focusComment = false) => {
    onNavigateToPost?.(postId, focusComment);
  }, [onNavigateToPost]);

  // Handle training start from challenge
  const handleStartTraining = useCallback((challengeType, challengeId) => {
    onNavigateToTraining?.(challengeType, challengeId);
  }, [onNavigateToTraining]);

  return (
    <div className="social-feed-view">
      {/* Header */}
      <header className="view-header">
        <div className="header-content">
          <h1 className="view-title">
            <span className="title-icon">🌐</span>
            <span className="title-text">Social Feed</span>
          </h1>
          <p className="view-subtitle">
            Connect with the Smarter.Poker community
          </p>
        </div>

        {/* Leaderboard Toggle */}
        <button
          className={`leaderboard-toggle interactive ${showLeaderboard ? 'active' : ''}`}
          onClick={() => setShowLeaderboard(prev => !prev)}
        >
          🏆
        </button>
      </header>

      {/* Main Content */}
      <div className="view-content">
        {/* Feed Column */}
        <div className="feed-column">
          <EnhancedSpatialFeed
            onCreatePost={handleCreatePost}
            onPostClick={handlePostClick}
            onAuthorClick={handleAuthorClick}
            onStartTraining={handleStartTraining}
          />
        </div>

        {/* Leaderboard Sidebar */}
        {showLeaderboard && (
          <aside className="leaderboard-sidebar">
            <LeaderboardOrb
              limit={10}
              currentUserId={user?.id}
              onUserClick={handleAuthorClick}
            />
          </aside>
        )}
      </div>

      {/* Post Creator Modal */}
      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={handlePostCreated}
      />

      <style>{`
        .social-feed-view {
          padding-bottom: 40px;
        }

        .view-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          animation: header-fade-in 0.5s ease;
        }

        @keyframes header-fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header-content {
          text-align: left;
        }

        .view-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Exo 2', sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: white;
          margin: 0 0 4px 0;
        }

        .title-icon {
          font-size: 2rem;
        }

        .title-text {
          background: linear-gradient(135deg, #00FFFF, #FF00FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .view-subtitle {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-size: 0.95rem;
        }

        .leaderboard-toggle {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 1.3rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .leaderboard-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .leaderboard-toggle.active {
          background: rgba(255, 215, 0, 0.1);
          border-color: rgba(255, 215, 0, 0.3);
        }

        .view-content {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .feed-column {
          flex: 1;
          min-width: 0;
        }

        .leaderboard-sidebar {
          width: 320px;
          flex-shrink: 0;
          position: sticky;
          top: 80px;
          animation: sidebar-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes sidebar-slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 1024px) {
          .leaderboard-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default SocialFeedView;
