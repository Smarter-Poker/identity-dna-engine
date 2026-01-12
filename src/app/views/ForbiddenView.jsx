/**
 * 🔒 FORBIDDEN SPATIAL SCENE
 * src/app/views/ForbiddenView.jsx
 * 
 * Access Denied view for unauthorized access attempts.
 */

import React from 'react';
import { useIdentity } from '../providers/SocialOrbProvider';

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 FORBIDDEN VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ForbiddenView = ({
    feature = 'this content',
    requiredLevel = null,
    requiredCapability = null,
    onNavigateHome = null,
    onNavigateUpgrade = null
}) => {
    const identity = useIdentity();
    const currentLevel = identity?.level || 1;

    return (
        <div className="forbidden-scene">
            {/* Shield barrier effect */}
            <div className="forbidden-barrier">
                <div className="barrier-ring ring-1" />
                <div className="barrier-ring ring-2" />
                <div className="barrier-ring ring-3" />
            </div>

            <div className="forbidden-container glass-card">
                {/* Lock Icon */}
                <div className="forbidden-icon-container">
                    <div className="forbidden-icon">🔒</div>
                    <div className="shield-glow" />
                </div>

                {/* Message */}
                <h1 className="forbidden-title">Access Denied</h1>
                <p className="forbidden-message">
                    You don't have permission to access {feature}.
                </p>

                {/* Level requirement */}
                {requiredLevel && (
                    <div className="level-requirement">
                        <div className="level-bar">
                            <div
                                className="level-progress"
                                style={{ width: `${Math.min(100, (currentLevel / requiredLevel) * 100)}%` }}
                            />
                        </div>
                        <div className="level-info">
                            <span className="current-level">Level {currentLevel}</span>
                            <span className="required-level">Required: Level {requiredLevel}</span>
                        </div>
                    </div>
                )}

                {/* Capability requirement */}
                {requiredCapability && (
                    <div className="capability-badge">
                        <span className="capability-icon">⚡</span>
                        Required: {requiredCapability}
                    </div>
                )}

                {/* Actions */}
                <div className="forbidden-actions">
                    {onNavigateUpgrade && requiredLevel && currentLevel < requiredLevel && (
                        <button
                            className="upgrade-button interactive glow-shift"
                            onClick={onNavigateUpgrade}
                        >
                            ⬆️ Level Up to Unlock
                        </button>
                    )}

                    {onNavigateHome && (
                        <button
                            className="home-button interactive"
                            onClick={onNavigateHome}
                        >
                            🏠 Return Home
                        </button>
                    )}
                </div>

                {/* Helpful tip */}
                <div className="forbidden-tip">
                    💡 Complete training drills and earn XP to level up!
                </div>
            </div>

            <style>{`
        .forbidden-scene {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #0d0d20 0%, #030308 100%);
          padding: 24px;
          overflow: hidden;
        }
        
        /* Shield barrier effect */
        .forbidden-barrier {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        .barrier-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 2px solid rgba(255, 215, 0, 0.2);
          border-radius: 50%;
          animation: barrier-pulse 3s ease-out infinite;
        }
        
        .ring-1 {
          width: 200px;
          height: 200px;
          margin: -100px 0 0 -100px;
        }
        
        .ring-2 {
          width: 300px;
          height: 300px;
          margin: -150px 0 0 -150px;
          animation-delay: -1s;
          opacity: 0.7;
        }
        
        .ring-3 {
          width: 400px;
          height: 400px;
          margin: -200px 0 0 -200px;
          animation-delay: -2s;
          opacity: 0.4;
        }
        
        @keyframes barrier-pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        .forbidden-container {
          position: relative;
          width: 100%;
          max-width: 450px;
          padding: 48px;
          text-align: center;
          animation: container-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes container-appear {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .forbidden-icon-container {
          position: relative;
          display: inline-block;
          margin-bottom: 24px;
        }
        
        .forbidden-icon {
          font-size: 5rem;
          position: relative;
          z-index: 1;
          animation: lock-shake 0.5s ease-in-out;
        }
        
        @keyframes lock-shake {
          0%, 100% { transform: rotate(0deg); }
          20%, 60% { transform: rotate(-10deg); }
          40%, 80% { transform: rotate(10deg); }
        }
        
        .shield-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: shield-pulse 2s ease-in-out infinite;
        }
        
        @keyframes shield-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
        
        .forbidden-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.75rem;
          color: #FFD700;
          margin: 0 0 12px 0;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        
        .forbidden-message {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 24px 0;
        }
        
        .level-requirement {
          margin-bottom: 24px;
        }
        
        .level-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .level-progress {
          height: 100%;
          background: linear-gradient(90deg, #FFD700, #FFA500);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .level-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }
        
        .current-level {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .required-level {
          color: #FFD700;
          font-weight: 600;
        }
        
        .capability-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 20px;
          color: #FFD700;
          font-size: 0.9rem;
          margin-bottom: 24px;
        }
        
        .capability-icon {
          font-size: 1rem;
        }
        
        .forbidden-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .upgrade-button {
          padding: 14px 24px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.1));
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          color: #FFD700;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        
        .home-button {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          cursor: pointer;
        }
        
        .forbidden-tip {
          padding: 12px;
          background: rgba(0, 255, 255, 0.05);
          border: 1px solid rgba(0, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(0, 255, 255, 0.7);
          font-size: 0.85rem;
        }
      `}</style>
        </div>
    );
};

export default ForbiddenView;
