/**
 * 🔐 AUTH GATE COMPONENT
 * src/app/components/AuthGate.jsx
 * 
 * Top-level session listener that acts as a hard-stop for the application.
 * Force-redirects to /login if no session exists.
 */

import React from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import WarpLoader from './WarpLoader';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 AUTH GATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const AuthGate = ({
    children,
    fallback = null,
    onUnauthenticated = null,
    loadingMessage = 'Syncing Identity...',
    requireAuth = true
}) => {
    const { isLoading, isAuthenticated, authStatus, error } = useSupabase();

    // ─────────────────────────────────────────────────────────────────────────
    // 🔄 LOADING STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (isLoading || authStatus === 'SYNCING') {
        return (
            <WarpLoader
                message={loadingMessage}
                subMessage="Establishing secure connection"
                variant="dna"
                size="full"
            />
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ❌ ERROR STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (authStatus === 'ERROR') {
        return (
            <div className="auth-error-container">
                <div className="auth-error glass-card">
                    <div className="error-icon">⚠️</div>
                    <h2>Connection Error</h2>
                    <p>{error || 'Unable to establish secure connection'}</p>
                    <button
                        className="retry-button interactive glow-shift"
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </button>
                </div>

                <style>{`
          .auth-error-container {
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
          }
          
          .auth-error {
            max-width: 400px;
            padding: 40px;
            text-align: center;
          }
          
          .error-icon {
            font-size: 4rem;
            margin-bottom: 16px;
          }
          
          .auth-error h2 {
            font-family: 'Exo 2', sans-serif;
            color: #FF4444;
            margin: 0 0 12px 0;
          }
          
          .auth-error p {
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 24px 0;
          }
          
          .retry-button {
            padding: 12px 32px;
            background: linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.1));
            border: 1px solid rgba(255, 68, 68, 0.3);
            border-radius: 12px;
            color: #FF4444;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 🚫 UNAUTHENTICATED STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (requireAuth && !isAuthenticated) {
        // If custom handler provided, call it
        if (onUnauthenticated) {
            onUnauthenticated();
            return (
                <WarpLoader
                    message="Redirecting..."
                    subMessage="Please sign in to continue"
                    variant="warp"
                    size="full"
                />
            );
        }

        // If fallback provided, render it
        if (fallback) {
            return fallback;
        }

        // Default: show login prompt
        return (
            <div className="auth-required-container">
                <div className="auth-required glass-card">
                    <div className="auth-icon">🔐</div>
                    <h2>Authentication Required</h2>
                    <p>Please sign in to access the Identity DNA Engine</p>
                    <div className="auth-actions">
                        <a href="/login" className="login-button interactive glow-shift">
                            Sign In
                        </a>
                        <a href="/signup" className="signup-link">
                            Create Account
                        </a>
                    </div>
                </div>

                <style>{`
          .auth-required-container {
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
          }
          
          .auth-required {
            max-width: 400px;
            padding: 48px;
            text-align: center;
          }
          
          .auth-icon {
            font-size: 4rem;
            margin-bottom: 16px;
            animation: float-gentle 3s ease-in-out infinite;
          }
          
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .auth-required h2 {
            font-family: 'Exo 2', sans-serif;
            color: white;
            margin: 0 0 12px 0;
          }
          
          .auth-required p {
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 32px 0;
          }
          
          .auth-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .login-button {
            display: block;
            padding: 14px 32px;
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 191, 255, 0.1));
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 12px;
            color: #00FFFF;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
          }
          
          .login-button:hover {
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 191, 255, 0.2));
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
          }
          
          .signup-link {
            color: rgba(255, 255, 255, 0.5);
            text-decoration: none;
            font-size: 0.9rem;
          }
          
          .signup-link:hover {
            color: white;
          }
        `}</style>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ✅ AUTHENTICATED - RENDER CHILDREN
    // ─────────────────────────────────────────────────────────────────────────
    return children;
};

export default AuthGate;
