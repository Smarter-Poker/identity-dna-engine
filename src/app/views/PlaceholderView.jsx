/**
 * 🚧 MODULE PLACEHOLDER VIEW
 * src/app/views/PlaceholderView.jsx
 * 
 * "Under Construction" / "Module Locked" spatial views for upcoming features.
 */

import React from 'react';
import { useIdentity } from '../providers/SocialOrbProvider';

// ═══════════════════════════════════════════════════════════════════════════
// 🚧 PLACEHOLDER VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PlaceholderView = ({
    moduleName = 'Module',
    moduleIcon = '🚀',
    status = 'coming_soon', // 'coming_soon' | 'locked' | 'maintenance'
    requiredLevel = null,
    estimatedDate = null,
    description = null,
    onNotifyMe = null,
    onNavigateBack = null
}) => {
    const identity = useIdentity();
    const currentLevel = identity?.level || 1;

    const statusConfig = {
        coming_soon: {
            title: 'Coming Soon',
            subtitle: 'This module is under development',
            icon: '🚧',
            color: '#00BFFF',
            bgGlow: 'rgba(0, 191, 255, 0.1)'
        },
        locked: {
            title: 'Module Locked',
            subtitle: `Unlock at Level ${requiredLevel}`,
            icon: '🔒',
            color: '#FFD700',
            bgGlow: 'rgba(255, 215, 0, 0.1)'
        },
        maintenance: {
            title: 'Under Maintenance',
            subtitle: 'We\'re making improvements',
            icon: '🔧',
            color: '#FF6B35',
            bgGlow: 'rgba(255, 107, 53, 0.1)'
        }
    };

    const config = statusConfig[status] || statusConfig.coming_soon;

    return (
        <div className="placeholder-scene">
            {/* Floating particles */}
            <div className="particle-field">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="floating-particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    />
                ))}
            </div>

            <div className="placeholder-container glass-card">
                {/* Module Icon */}
                <div className="module-icon-container">
                    <div className="module-icon">{moduleIcon}</div>
                    <div className="status-badge" style={{ background: config.bgGlow, borderColor: config.color }}>
                        {config.icon} {config.title}
                    </div>
                </div>

                {/* Module Info */}
                <h1 className="module-name">{moduleName}</h1>
                <p className="module-status" style={{ color: config.color }}>{config.subtitle}</p>

                {description && (
                    <p className="module-description">{description}</p>
                )}

                {/* Progress for locked modules */}
                {status === 'locked' && requiredLevel && (
                    <div className="level-progress-container">
                        <div className="level-progress-bar">
                            <div
                                className="level-progress-fill"
                                style={{
                                    width: `${Math.min(100, (currentLevel / requiredLevel) * 100)}%`,
                                    background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`
                                }}
                            />
                        </div>
                        <div className="level-progress-text">
                            Level {currentLevel} / {requiredLevel}
                        </div>
                    </div>
                )}

                {/* Estimated date */}
                {estimatedDate && status === 'coming_soon' && (
                    <div className="estimated-date">
                        📅 Estimated: {estimatedDate}
                    </div>
                )}

                {/* Construction animation */}
                <div className="construction-visual">
                    <div className="gear gear-1">⚙️</div>
                    <div className="gear gear-2">⚙️</div>
                    <div className="blueprint-grid">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="grid-cell" />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="placeholder-actions">
                    {onNotifyMe && status === 'coming_soon' && (
                        <button
                            className="notify-button interactive glow-shift"
                            onClick={onNotifyMe}
                        >
                            🔔 Notify Me
                        </button>
                    )}

                    {onNavigateBack && (
                        <button
                            className="back-button interactive"
                            onClick={onNavigateBack}
                        >
                            ← Go Back
                        </button>
                    )}
                </div>
            </div>

            <style>{`
        .placeholder-scene {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        
        /* Floating particles */
        .particle-field {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }
        
        .floating-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(0, 191, 255, 0.3);
          border-radius: 50%;
          animation: float-up 5s ease-in-out infinite;
        }
        
        @keyframes float-up {
          0% { 
            transform: translateY(100vh) scale(0); 
            opacity: 0;
          }
          10% { 
            opacity: 1; 
          }
          90% { 
            opacity: 1; 
          }
          100% { 
            transform: translateY(-100px) scale(1); 
            opacity: 0;
          }
        }
        
        .placeholder-container {
          position: relative;
          width: 100%;
          max-width: 500px;
          padding: 48px;
          text-align: center;
          animation: container-float 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes container-float {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .module-icon-container {
          position: relative;
          margin-bottom: 24px;
        }
        
        .module-icon {
          font-size: 5rem;
          animation: icon-float 3s ease-in-out infinite;
        }
        
        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border: 1px solid;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-top: 12px;
        }
        
        .module-name {
          font-family: 'Exo 2', sans-serif;
          font-size: 2rem;
          color: white;
          margin: 0 0 8px 0;
        }
        
        .module-status {
          font-size: 1rem;
          margin: 0 0 16px 0;
        }
        
        .module-description {
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 24px 0;
          line-height: 1.6;
        }
        
        .level-progress-container {
          margin-bottom: 24px;
        }
        
        .level-progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .level-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .level-progress-text {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .estimated-date {
          display: inline-block;
          padding: 8px 16px;
          background: rgba(0, 191, 255, 0.1);
          border-radius: 8px;
          color: rgba(0, 191, 255, 0.8);
          font-size: 0.9rem;
          margin-bottom: 24px;
        }
        
        /* Construction animation */
        .construction-visual {
          position: relative;
          height: 100px;
          margin: 24px 0;
        }
        
        .gear {
          position: absolute;
          font-size: 2rem;
          animation: spin 4s linear infinite;
        }
        
        .gear-1 {
          left: 30%;
          top: 20%;
        }
        
        .gear-2 {
          right: 30%;
          bottom: 20%;
          animation-direction: reverse;
          animation-duration: 3s;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .blueprint-grid {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          opacity: 0.3;
        }
        
        .grid-cell {
          width: 20px;
          height: 20px;
          border: 1px solid rgba(0, 191, 255, 0.5);
          animation: cell-blink 2s ease-in-out infinite;
        }
        
        .grid-cell:nth-child(odd) {
          animation-delay: 0.5s;
        }
        
        @keyframes cell-blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        .placeholder-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .notify-button {
          padding: 14px 24px;
          background: linear-gradient(135deg, rgba(0, 191, 255, 0.2), rgba(0, 191, 255, 0.1));
          border: 1px solid rgba(0, 191, 255, 0.3);
          border-radius: 12px;
          color: #00BFFF;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        
        .back-button {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          cursor: pointer;
        }
      `}</style>
        </div>
    );
};

export default PlaceholderView;
