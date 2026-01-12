/**
 * 🏗️ SPATIAL LAYOUT SHELL
 * src/app/components/LayoutShell.jsx
 * 
 * Persistent Layout Shell with Navigation Rail and Content Viewport.
 * 3D-perspective-ready with hardware acceleration for depth and parallax.
 */

import React, { useState, useCallback } from 'react';
import { useSocialOrb } from '../providers/SocialOrbProvider';

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 NAVIGATION ITEMS
// ═══════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
    {
        id: 'home',
        label: 'Home',
        icon: '🏠',
        path: '/app',
        requiredLevel: 0
    },
    {
        id: 'social',
        label: 'Social Feed',
        icon: '🌐',
        path: '/app/social',
        requiredLevel: 1
    },
    {
        id: 'profile',
        label: 'DNA Profile',
        icon: '🧬',
        path: '/app/profile',
        requiredLevel: 1
    },
    {
        id: 'training',
        label: 'Training',
        icon: '🎯',
        path: '/app/training',
        requiredLevel: 1
    },
    {
        id: 'arcade',
        label: 'Arcade',
        icon: '💎',
        path: '/app/arcade',
        requiredLevel: 5
    },
    {
        id: 'clubs',
        label: 'Clubs',
        icon: '🎴',
        path: '/app/clubs',
        requiredLevel: 5
    },
    {
        id: 'leaderboard',
        label: 'Leaderboard',
        icon: '🏆',
        path: '/app/leaderboard',
        requiredLevel: 3
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        path: '/app/settings',
        requiredLevel: 0
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 NAVIGATION RAIL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const NavigationRail = ({
    expanded,
    onToggle,
    currentPath,
    onNavigate,
    userLevel = 1
}) => {
    return (
        <nav className={`nav-rail ${expanded ? 'expanded' : ''}`}>
            {/* Logo/Toggle */}
            <div className="nav-rail-header">
                <button
                    className="nav-toggle interactive glow-shift"
                    onClick={onToggle}
                    aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
                >
                    <span className="nav-logo">🧬</span>
                    {expanded && <span className="nav-brand">IDENTITY</span>}
                </button>
            </div>

            {/* Navigation Items */}
            <div className="nav-rail-items">
                {NAV_ITEMS.map(item => {
                    const isLocked = userLevel < item.requiredLevel;
                    const isActive = currentPath === item.path;

                    return (
                        <button
                            key={item.id}
                            className={`nav-item interactive glow-shift ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && onNavigate(item.path)}
                            disabled={isLocked}
                            title={isLocked ? `Unlock at Level ${item.requiredLevel}` : item.label}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {expanded && (
                                <span className="nav-item-label">
                                    {item.label}
                                    {isLocked && <span className="lock-badge">🔒 Lv.{item.requiredLevel}</span>}
                                </span>
                            )}
                            {isActive && <div className="nav-item-indicator" />}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="nav-rail-footer">
                <div className="nav-user-summary">
                    <span className="nav-user-level">Lv.{userLevel}</span>
                </div>
            </div>

            <style>{`
        .nav-rail {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--nav-rail-width, 72px);
          background: rgba(10, 10, 26, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          padding: 16px 8px;
          z-index: 100;
          transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }
        
        .nav-rail.expanded {
          width: var(--nav-rail-expanded, 240px);
        }
        
        .nav-rail-header {
          margin-bottom: 24px;
        }
        
        .nav-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .nav-logo {
          font-size: 1.5rem;
        }
        
        .nav-brand {
          font-family: 'Exo 2', sans-serif;
          font-weight: 700;
          letter-spacing: 2px;
          background: linear-gradient(135deg, #00FFFF, #FF00FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .nav-rail-items {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }
        
        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-size: 0.9rem;
          text-align: left;
          white-space: nowrap;
        }
        
        .nav-item:hover:not(.locked) {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
        
        .nav-item.active {
          background: rgba(0, 255, 255, 0.1);
          border-color: rgba(0, 255, 255, 0.3);
          color: #00FFFF;
        }
        
        .nav-item.locked {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .nav-item-icon {
          font-size: 1.25rem;
          min-width: 28px;
          text-align: center;
        }
        
        .nav-item-label {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .lock-badge {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .nav-item-indicator {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: #00FFFF;
          border-radius: 2px;
          box-shadow: 0 0 10px #00FFFF;
        }
        
        .nav-rail-footer {
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .nav-user-summary {
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          text-align: center;
        }
        
        .nav-user-level {
          font-family: 'Exo 2', sans-serif;
          font-weight: 700;
          color: #FFD700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
        
        @media (max-width: 768px) {
          .nav-rail {
            bottom: 0;
            top: auto;
            left: 0;
            right: 0;
            width: 100% !important;
            height: 72px;
            flex-direction: row;
            padding: 8px 16px;
            border-right: none;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }
          
          .nav-rail-header,
          .nav-rail-footer {
            display: none;
          }
          
          .nav-rail-items {
            flex-direction: row;
            justify-content: space-around;
            overflow-x: auto;
            gap: 0;
          }
          
          .nav-item {
            flex-direction: column;
            padding: 8px;
            gap: 4px;
          }
          
          .nav-item-label {
            font-size: 0.65rem;
          }
        }
      `}</style>
        </nav>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 📄 CONTENT VIEWPORT
// ═══════════════════════════════════════════════════════════════════════════

const ContentViewport = ({ children, navExpanded }) => {
    return (
        <main
            className={`content-viewport ${navExpanded ? 'nav-expanded' : ''}`}
            style={{
                '--nav-offset': navExpanded ? 'var(--nav-rail-expanded)' : 'var(--nav-rail-width)'
            }}
        >
            <div className="content-inner preserve-3d">
                {children}
            </div>

            <style>{`
        .content-viewport {
          position: relative;
          min-height: 100vh;
          margin-left: var(--nav-offset, var(--nav-rail-width));
          padding: 24px;
          transition: margin-left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          perspective: 1200px;
        }
        
        .content-inner {
          max-width: var(--content-max-width, 1400px);
          margin: 0 auto;
          transform-style: preserve-3d;
        }
        
        @media (max-width: 768px) {
          .content-viewport {
            margin-left: 0;
            margin-bottom: 72px;
            padding: 16px;
          }
        }
      `}</style>
        </main>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ LAYOUT SHELL
// ═══════════════════════════════════════════════════════════════════════════

export const LayoutShell = ({
    children,
    currentPath = '/app',
    onNavigate = () => { }
}) => {
    const [navExpanded, setNavExpanded] = useState(false);
    const { state } = useSocialOrb();
    const userLevel = state?.identity?.level || 1;

    const handleToggleNav = useCallback(() => {
        setNavExpanded(prev => !prev);
    }, []);

    return (
        <div id="spatial-root" className="layout-shell">
            <NavigationRail
                expanded={navExpanded}
                onToggle={handleToggleNav}
                currentPath={currentPath}
                onNavigate={onNavigate}
                userLevel={userLevel}
            />

            <ContentViewport navExpanded={navExpanded}>
                {children}
            </ContentViewport>

            <style>{`
        .layout-shell {
          min-height: 100vh;
        }
      `}</style>
        </div>
    );
};

export default LayoutShell;
