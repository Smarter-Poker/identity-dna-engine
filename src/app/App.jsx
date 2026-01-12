/**
 * 🌌 MAIN APPLICATION ENTRY
 * src/app/App.jsx
 * 
 * Root application frame with 3D perspective, provider hierarchy,
 * and anti-gravity motion system enabled.
 */

import React, { useState, useCallback, useEffect } from 'react';

// Providers
import { SupabaseProvider } from './providers/SupabaseProvider';
import { SocialOrbProvider } from './providers/SocialOrbProvider';

// Components
import { AuthGate } from './components/AuthGate';
import { LayoutShell } from './components/LayoutShell';
import { WarpLoader } from './components/WarpLoader';
import { RewardProvider } from './components/RewardParticles';

// Views
import { LoginView } from './views/LoginView';
import { ErrorView } from './views/ErrorView';
import { ForbiddenView } from './views/ForbiddenView';
import { PlaceholderView } from './views/PlaceholderView';
import { DNAProfileView } from './views/DNAProfileView';
import { LeaderboardView } from './views/LeaderboardView';

// Facebook Social Clone Views
import FacebookLayout from './social/components/FacebookLayout';
import {
    FacebookFeedView,
    FacebookClubView,
    FacebookWatchView,
    FacebookProfileView
} from './social/components';

// Styles
import './styles/theme.css';

// ═══════════════════════════════════════════════════════════════════════════
// 🗺️ ROUTE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const ROUTES = {
    APP: '/app',
    LOGIN: '/login',
    LOADING: '/loading',
    ERROR: '/error',
    FORBIDDEN: '/forbidden',
    SOCIAL: '/app/social',
    PROFILE: '/app/profile',
    TRAINING: '/app/training',
    ARCADE: '/app/arcade',
    CLUBS: '/app/clubs',
    WATCH: '/app/watch', // Added Watch Route
    LEADERBOARD: '/app/leaderboard',
    SETTINGS: '/app/settings'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏠 HOME VIEW (Default App Content)
// ═══════════════════════════════════════════════════════════════════════════

const HomeView = () => {
    return (
        <div className="home-view">
            <header className="home-header">
                <h1 className="home-title">
                    Welcome to <span className="text-gradient-premium">Identity DNA</span>
                </h1>
                <p className="home-subtitle">
                    Your Smarter.Poker journey begins here
                </p>
            </header>

            <div className="home-grid">
                {/* Quick Stats Card */}
                <div className="stat-card glass-card interactive glow-shift">
                    <div className="stat-icon">🧬</div>
                    <div className="stat-content">
                        <div className="stat-value">Level 1</div>
                        <div className="stat-label">DNA Profile</div>
                    </div>
                </div>

                <div className="stat-card glass-card interactive glow-shift">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                        <div className="stat-value">0 XP</div>
                        <div className="stat-label">Experience</div>
                    </div>
                </div>

                <div className="stat-card glass-card interactive glow-shift">
                    <div className="stat-icon">💎</div>
                    <div className="stat-content">
                        <div className="stat-value">0</div>
                        <div className="stat-label">Diamonds</div>
                    </div>
                </div>

                <div className="stat-card glass-card interactive glow-shift">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-content">
                        <div className="stat-value">0 Days</div>
                        <div className="stat-label">Streak</div>
                    </div>
                </div>
            </div>

            <style>{`
        .home-view {
          padding: 24px 0;
        }
        
        .home-header {
          margin-bottom: 48px;
          animation: fade-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .home-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 12px 0;
        }
        
        .home-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }
        
        .home-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          animation: card-rise 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }
        
        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        
        @keyframes card-rise {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .stat-icon {
          font-size: 2.5rem;
        }
        
        .stat-content {
          flex: 1;
        }
        
        .stat-value {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }
        
        .stat-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🌌 MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const App = () => {
    const [currentRoute, setCurrentRoute] = useState(ROUTES.APP);
    const [isInitialized, setIsInitialized] = useState(false);
    const [appError, setAppError] = useState(null);

    // Handle navigation
    const navigate = useCallback((path) => {
        setCurrentRoute(path);
        // In a real app, this would update the URL
        window.history.pushState({}, '', path);
    }, []);

    // Handle auth state changes
    const handleAuthChange = useCallback((status, user) => {
        console.log('Auth status changed:', status);

        if (status === 'UNAUTHENTICATED' && currentRoute !== ROUTES.LOGIN) {
            navigate(ROUTES.LOGIN);
        } else if (status === 'AUTHENTICATED' && currentRoute === ROUTES.LOGIN) {
            navigate(ROUTES.APP);
        }
    }, [currentRoute, navigate]);

    // Initialize app
    useEffect(() => {
        // Read initial route from URL
        const path = window.location.pathname;
        if (path && Object.values(ROUTES).includes(path)) {
            setCurrentRoute(path);
        }
        setIsInitialized(true);
    }, []);

    // Render route content
    const renderRouteContent = useCallback(() => {
        // System routes (no auth required)
        if (currentRoute === ROUTES.LOGIN) {
            return (
                <LoginView
                    onSuccess={() => navigate(ROUTES.APP)}
                    onNavigateToSignup={() => console.log('Navigate to signup')}
                />
            );
        }

        if (currentRoute === ROUTES.LOADING) {
            return <WarpLoader message="Loading..." variant="warp" size="full" />;
        }

        if (currentRoute === ROUTES.ERROR) {
            return (
                <ErrorView
                    error={appError}
                    onRetry={() => {
                        setAppError(null);
                        navigate(ROUTES.APP);
                    }}
                    onNavigateHome={() => navigate(ROUTES.APP)}
                />
            );
        }

        if (currentRoute === ROUTES.FORBIDDEN) {
            return (
                <ForbiddenView
                    onNavigateHome={() => navigate(ROUTES.APP)}
                />
            );
        }

        // Protected routes (wrapped in AuthGate)
        return (
            <AuthGate
                onUnauthenticated={() => navigate(ROUTES.LOGIN)}
                requireAuth={true}
            >
                <SocialOrbProvider>
                    <RewardProvider>
                        {/* 
                           For Social Hub routes, we wrap in FacebookLayout (Persistent Shell)
                           This maintains chat state across view navigation.
                        */}
                        {[ROUTES.SOCIAL, ROUTES.CLUBS, ROUTES.WATCH, ROUTES.PROFILE].includes(currentRoute) ? (
                            <FacebookLayout onNavigate={navigate}>
                                {renderAppContent()}
                            </FacebookLayout>
                        ) : (
                            <LayoutShell currentPath={currentRoute} onNavigate={navigate}>
                                {renderAppContent()}
                            </LayoutShell>
                        )}
                    </RewardProvider>
                </SocialOrbProvider>
            </AuthGate>
        );
    }, [currentRoute, appError, navigate]);

    // Render app content based on route
    const renderAppContent = useCallback(() => {
        switch (currentRoute) {
            case ROUTES.APP:
                return <HomeView />;

            case ROUTES.SOCIAL:
                return (
                    <FacebookFeedView
                        onNavigate={navigate}
                    />
                );

            case ROUTES.PROFILE:
                return (
                    <FacebookProfileView
                        onNavigate={navigate}
                    />
                );

            case ROUTES.TRAINING:
                return (
                    <PlaceholderView
                        moduleName="Training Arena"
                        moduleIcon="🎯"
                        status="coming_soon"
                        description="Master GTO strategy with AI-powered drills and real-time feedback."
                        onNavigateBack={() => navigate(ROUTES.APP)}
                    />
                );

            case ROUTES.ARCADE:
                return (
                    <PlaceholderView
                        moduleName="Diamond Arcade"
                        moduleIcon="💎"
                        status="locked"
                        requiredLevel={5}
                        description="Stake diamonds on your GTO skills in high-stakes arcade challenges."
                        onNavigateBack={() => navigate(ROUTES.APP)}
                    />
                );

            case ROUTES.CLUBS:
                return (
                    <FacebookClubView
                        onNavigate={navigate}
                    />
                );

            case ROUTES.WATCH:
                return (
                    <FacebookWatchView
                        onNavigate={navigate}
                    />
                );

            case ROUTES.LEADERBOARD:
                return (
                    <LeaderboardView
                        onNavigateToProfile={(userId) => console.log('Navigate to profile:', userId)}
                    />
                );

            case ROUTES.SETTINGS:
                return (
                    <PlaceholderView
                        moduleName="Settings"
                        moduleIcon="⚙️"
                        status="coming_soon"
                        description="Customize your experience and manage your account settings."
                        onNavigateBack={() => navigate(ROUTES.APP)}
                    />
                );

            default:
                return <HomeView />;
        }
    }, [currentRoute, navigate]);

    // Show loading until initialized
    if (!isInitialized) {
        return <WarpLoader message="Initializing..." variant="dna" size="full" />;
    }

    return (
        <SupabaseProvider onAuthChange={handleAuthChange}>
            {renderRouteContent()}
        </SupabaseProvider>
    );
};

export default App;
