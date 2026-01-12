/**
 * 🚀 LOGIN SPATIAL SCENE
 * src/app/views/LoginView.jsx
 * 
 * Entry point for unauthenticated users with 3D spatial aesthetics.
 */

import React, { useState, useCallback } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 LOGIN VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const LoginView = ({ onSuccess, onNavigateToSignup }) => {
    const { signIn, isLoading, error } = useSupabase();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!email || !password) {
            setLocalError('Please enter both email and password');
            return;
        }

        const result = await signIn(email, password);

        if (result.success) {
            onSuccess?.();
        } else {
            setLocalError(result.error?.message || 'Sign in failed');
        }
    }, [email, password, signIn, onSuccess]);

    return (
        <div className="login-scene">
            {/* Animated background */}
            <div className="login-backdrop">
                <div className="backdrop-orb orb-1" />
                <div className="backdrop-orb orb-2" />
                <div className="backdrop-orb orb-3" />
            </div>

            <div className="login-container glass-card">
                {/* Logo/Brand */}
                <div className="login-header">
                    <div className="login-logo">🧬</div>
                    <h1 className="login-title">IDENTITY DNA</h1>
                    <p className="login-subtitle">Enter the Smarter.Poker Universe</p>
                </div>

                {/* Form */}
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="form-input neon-focus"
                            autoComplete="email"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="form-input neon-focus"
                            autoComplete="current-password"
                            disabled={isLoading}
                        />
                    </div>

                    {(localError || error) && (
                        <div className="form-error">
                            ⚠️ {localError || error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button interactive glow-shift"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="button-loading">
                                <span className="loading-dot" />
                                <span className="loading-dot" />
                                <span className="loading-dot" />
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Footer links */}
                <div className="login-footer">
                    <button
                        className="link-button"
                        onClick={onNavigateToSignup}
                    >
                        Create Account
                    </button>
                    <span className="divider">•</span>
                    <button className="link-button">
                        Forgot Password?
                    </button>
                </div>
            </div>

            <style>{`
        .login-scene {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at 30% 20%, rgba(75, 0, 130, 0.15) 0%, transparent 50%),
                      radial-gradient(ellipse at 70% 80%, rgba(0, 191, 255, 0.1) 0%, transparent 40%),
                      linear-gradient(180deg, #030308 0%, #0a0a1a 100%);
          padding: 24px;
          overflow: hidden;
        }
        
        /* Animated backdrop orbs */
        .login-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }
        
        .backdrop-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: orb-float 20s ease-in-out infinite;
        }
        
        .orb-1 {
          width: 400px;
          height: 400px;
          background: rgba(0, 255, 255, 0.1);
          top: -100px;
          left: -100px;
        }
        
        .orb-2 {
          width: 300px;
          height: 300px;
          background: rgba(255, 0, 255, 0.08);
          bottom: -50px;
          right: -50px;
          animation-delay: -7s;
        }
        
        .orb-3 {
          width: 200px;
          height: 200px;
          background: rgba(255, 215, 0, 0.06);
          top: 50%;
          right: 20%;
          animation-delay: -14s;
        }
        
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 10px) scale(1.05); }
        }
        
        .login-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          padding: 48px 40px;
          animation: container-rise 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes container-rise {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .login-logo {
          font-size: 4rem;
          margin-bottom: 16px;
          animation: logo-pulse 3s ease-in-out infinite;
        }
        
        @keyframes logo-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(0, 255, 255, 0.5)); }
        }
        
        .login-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: 3px;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #00FFFF, #FF00FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .login-subtitle {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-size: 0.9rem;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-field label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }
        
        .form-input {
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        
        .form-input:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .form-input:focus {
          outline: none;
          border-color: rgba(0, 255, 255, 0.5);
          box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.1);
        }
        
        .form-error {
          padding: 12px;
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 8px;
          color: #FF6B6B;
          font-size: 0.875rem;
          text-align: center;
        }
        
        .login-button {
          padding: 16px;
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 191, 255, 0.1));
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 12px;
          color: #00FFFF;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .button-loading {
          display: flex;
          gap: 6px;
          justify-content: center;
        }
        
        .loading-dot {
          width: 8px;
          height: 8px;
          background: #00FFFF;
          border-radius: 50%;
          animation: loading-bounce 1.4s ease-in-out infinite both;
        }
        
        .loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes loading-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        .login-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .link-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .link-button:hover {
          color: #00FFFF;
        }
        
        .divider {
          color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
};

export default LoginView;
