/**
 * 🏆 LEADERBOARD VIEW
 * src/app/views/LeaderboardView.jsx
 * 
 * Full-page leaderboard with rankings, stats, and competitive insights.
 */

import React, { useState, useCallback } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { LeaderboardOrb } from '../social/components/LeaderboardOrb';

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 LEADERBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════════

export const LeaderboardView = ({
    onNavigateToProfile
}) => {
    const { user } = useSupabase();
    const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

    const handleUserClick = useCallback((userId) => {
        onNavigateToProfile?.(userId);
    }, [onNavigateToProfile]);

    return (
        <div className="leaderboard-view">
            {/* Header */}
            <header className="view-header">
                <div className="header-content">
                    <h1 className="view-title">
                        <span className="title-icon">🏆</span>
                        <span className="title-text">Leaderboard</span>
                    </h1>
                    <p className="view-subtitle">
                        See who's crushing it in the community
                    </p>
                </div>
            </header>

            {/* Leaderboard Grid */}
            <div className="leaderboard-grid">
                {/* Main Leaderboard */}
                <div className="main-leaderboard">
                    <LeaderboardOrb
                        limit={25}
                        currentUserId={user?.id}
                        onUserClick={handleUserClick}
                        showTimeframeSelector={true}
                    />
                </div>

                {/* Stats Sidebar */}
                <aside className="stats-sidebar">
                    {/* Your Stats Card */}
                    <div className="stats-card glass-card">
                        <h3 className="card-title">📊 Your Stats</h3>
                        <div className="stat-row">
                            <span className="stat-label">Current Rank</span>
                            <span className="stat-value">#--</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">XP Earned (24h)</span>
                            <span className="stat-value highlight">0</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Posts Today</span>
                            <span className="stat-value">0</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Reactions Received</span>
                            <span className="stat-value">0</span>
                        </div>
                    </div>

                    {/* Milestones Card */}
                    <div className="stats-card glass-card">
                        <h3 className="card-title">🎯 Next Milestones</h3>
                        <div className="milestone-item">
                            <div className="milestone-progress">
                                <div className="progress-bar" style={{ width: '0%' }} />
                            </div>
                            <div className="milestone-info">
                                <span className="milestone-target">Top 100</span>
                                <span className="milestone-detail">Need 500 more XP</span>
                            </div>
                        </div>
                        <div className="milestone-item">
                            <div className="milestone-progress">
                                <div className="progress-bar" style={{ width: '0%' }} />
                            </div>
                            <div className="milestone-info">
                                <span className="milestone-target">Diamond Hunter 💎</span>
                                <span className="milestone-detail">Get 20 reactions on one post</span>
                            </div>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="stats-card glass-card tips-card">
                        <h3 className="card-title">💡 Pro Tips</h3>
                        <ul className="tips-list">
                            <li>Post daily to build your streak multiplier</li>
                            <li>Engage with others to earn bonus XP</li>
                            <li>Hit 20 reactions to earn Diamonds</li>
                            <li>Share training scores for extra engagement</li>
                        </ul>
                    </div>
                </aside>
            </div>

            <style>{`
        .leaderboard-view {
          padding-bottom: 40px;
        }

        .view-header {
          margin-bottom: 32px;
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

        .view-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Exo 2', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin: 0 0 8px 0;
        }

        .title-icon {
          font-size: 2.5rem;
        }

        .title-text {
          background: linear-gradient(135deg, #FFD700, #FF6B35);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .view-subtitle {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-size: 1rem;
        }

        .leaderboard-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          align-items: flex-start;
        }

        .main-leaderboard {
          overflow: hidden;
          border-radius: 16px;
        }

        .stats-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stats-card {
          padding: 20px;
          animation: card-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }

        .stats-card:nth-child(1) { animation-delay: 0.1s; }
        .stats-card:nth-child(2) { animation-delay: 0.2s; }
        .stats-card:nth-child(3) { animation-delay: 0.3s; }

        @keyframes card-slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .card-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 1rem;
          color: white;
          margin: 0 0 16px 0;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
        }

        .stat-value {
          font-family: 'Exo 2', sans-serif;
          font-weight: 600;
          color: white;
        }

        .stat-value.highlight {
          color: #00FFFF;
        }

        .milestone-item {
          margin-bottom: 16px;
        }

        .milestone-item:last-child {
          margin-bottom: 0;
        }

        .milestone-progress {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #FFD700, #FF6B35);
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .milestone-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .milestone-target {
          font-weight: 600;
          color: white;
          font-size: 0.9rem;
        }

        .milestone-detail {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.8rem;
        }

        .tips-card {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), transparent);
          border-color: rgba(255, 215, 0, 0.2);
        }

        .tips-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .tips-list li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .tips-list li::before {
          content: '→';
          color: #FFD700;
        }

        @media (max-width: 900px) {
          .leaderboard-grid {
            grid-template-columns: 1fr;
          }

          .stats-sidebar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
          }
        }
      `}</style>
        </div>
    );
};

export default LeaderboardView;
