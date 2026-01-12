/**
 * ⚠️ ERROR SPATIAL SCENE
 * src/app/views/ErrorView.jsx
 * 
 * Reactive error scene with soft-reload capability.
 * Maintains Supabase session connection during recovery.
 */

import React, { useState, useCallback } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ERROR VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ErrorView = ({
    error = null,
    errorCode = null,
    title = 'System Error',
    message = 'Something went wrong. Please try again.',
    onRetry = null,
    onNavigateHome = null,
    showHomeButton = true
}) => {
    const { isAuthenticated, refreshSession } = useSupabase();
    const [isRetrying, setIsRetrying] = useState(false);

    const handleSoftRetry = useCallback(async () => {
        setIsRetrying(true);

        try {
            // Refresh session to maintain connection
            if (isAuthenticated) {
                await refreshSession();
            }

            // Call custom retry handler or reload
            if (onRetry) {
                await onRetry();
            } else {
                // Soft reload - reloads the current route without full page refresh
                window.location.reload();
            }
        } catch (err) {
            console.error('Retry failed:', err);
        } finally {
            setIsRetrying(false);
        }
    }, [isAuthenticated, refreshSession, onRetry]);

    return (
        <div className="error-scene">
            {/* Glitch effect background */}
            <div className="error-backdrop">
                <div className="glitch-line line-1" />
                <div className="glitch-line line-2" />
                <div className="glitch-line line-3" />
            </div>

            <div className="error-container glass-card">
                {/* Error Icon */}
                <div className="error-icon-container">
                    <div className="error-icon">⚠️</div>
                    <div className="error-pulse" />
                </div>

                {/* Error Details */}
                <h1 className="error-title">{title}</h1>

                {errorCode && (
                    <div className="error-code">Error {errorCode}</div>
                )}

                <p className="error-message">{message}</p>

                {error && (
                    <details className="error-details">
                        <summary>Technical Details</summary>
                        <pre>{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</pre>
                    </details>
                )}

                {/* Action Buttons */}
                <div className="error-actions">
                    <button
                        className="retry-button interactive glow-shift"
                        onClick={handleSoftRetry}
                        disabled={isRetrying}
                    >
                        {isRetrying ? (
                            <span className="button-spinner">⟳</span>
                        ) : (
                            '↻ Try Again'
                        )}
                    </button>

                    {showHomeButton && onNavigateHome && (
                        <button
                            className="home-button interactive"
                            onClick={onNavigateHome}
                        >
                            🏠 Return Home
                        </button>
                    )}
                </div>

                {/* Session indicator */}
                <div className="session-indicator">
                    <span className={`indicator-dot ${isAuthenticated ? 'connected' : 'disconnected'}`} />
                    {isAuthenticated ? 'Session Active' : 'Session Disconnected'}
                </div>
            </div>

            <style>{`
        .error-scene {
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
        
        /* Glitch effect */
        .error-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        .glitch-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255, 68, 68, 0.5), transparent);
          animation: glitch-scan 3s linear infinite;
        }
        
        .line-1 { animation-delay: 0s; }
        .line-2 { animation-delay: 1s; opacity: 0.5; }
        .line-3 { animation-delay: 2s; opacity: 0.3; }
        
        @keyframes glitch-scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        
        .error-container {
          position: relative;
          width: 100%;
          max-width: 480px;
          padding: 48px;
          text-align: center;
          animation: shake-entry 0.5s ease-out;
        }
        
        @keyframes shake-entry {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .error-icon-container {
          position: relative;
          display: inline-block;
          margin-bottom: 24px;
        }
        
        .error-icon {
          font-size: 5rem;
          position: relative;
          z-index: 1;
          animation: icon-shake 0.5s ease-in-out infinite;
        }
        
        @keyframes icon-shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        
        .error-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(255, 68, 68, 0.1);
          animation: error-pulse 2s ease-out infinite;
        }
        
        @keyframes error-pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        
        .error-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.75rem;
          color: #FF4444;
          margin: 0 0 8px 0;
          text-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
        }
        
        .error-code {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 20px;
          color: #FF6B6B;
          font-family: monospace;
          font-size: 0.8rem;
          margin-bottom: 16px;
        }
        
        .error-message {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 24px 0;
          line-height: 1.6;
        }
        
        .error-details {
          text-align: left;
          margin-bottom: 24px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }
        
        .error-details summary {
          cursor: pointer;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          margin-bottom: 8px;
        }
        
        .error-details pre {
          font-size: 0.75rem;
          color: rgba(255, 68, 68, 0.8);
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        
        .error-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .retry-button {
          padding: 14px 24px;
          background: linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.1));
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 12px;
          color: #FF6B6B;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        
        .retry-button:disabled {
          opacity: 0.6;
        }
        
        .button-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
        
        .session-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .indicator-dot.connected {
          background: #32CD32;
          box-shadow: 0 0 10px rgba(50, 205, 50, 0.5);
        }
        
        .indicator-dot.disconnected {
          background: #FF4444;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
        }
      `}</style>
        </div>
    );
};

export default ErrorView;
