/**
 * 🚀 HIGH-FIDELITY WARP LOADING INTERFACE
 * src/app/components/WarpLoader.jsx
 * 
 * Interactive "Warp" loading sequence for auth-checks and data fetches.
 * Features 3D parallax starfield and pulsing DNA helix animation.
 */

import React, { useEffect, useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 🌟 WARP LOADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const WarpLoader = ({
    message = 'Syncing Identity...',
    subMessage = 'Establishing secure connection',
    variant = 'warp', // 'warp' | 'pulse' | 'dna'
    size = 'full' // 'full' | 'inline' | 'compact'
}) => {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState(0);

    // Animate progress
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => (p + 1) % 100);
        }, 50);

        const phaseInterval = setInterval(() => {
            setPhase(p => (p + 1) % 4);
        }, 800);

        return () => {
            clearInterval(interval);
            clearInterval(phaseInterval);
        };
    }, []);

    // Generate random stars
    const stars = useMemo(() => {
        return Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 2,
            speed: Math.random() * 2 + 1
        }));
    }, []);

    const containerClass = size === 'full' ? 'warp-loader-full' :
        size === 'inline' ? 'warp-loader-inline' :
            'warp-loader-compact';

    return (
        <div className={`warp-loader ${containerClass}`}>
            {/* Starfield */}
            <div className="warp-starfield">
                {stars.map(star => (
                    <div
                        key={star.id}
                        className="warp-star"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: star.size,
                            height: star.size,
                            animationDelay: `${star.delay}s`,
                            animationDuration: `${star.speed}s`
                        }}
                    />
                ))}
            </div>

            {/* Warp tunnel effect */}
            <div className="warp-tunnel">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="warp-ring"
                        style={{ animationDelay: `${i * 0.2}s` }}
                    />
                ))}
            </div>

            {/* DNA Helix (for DNA variant) */}
            {variant === 'dna' && (
                <div className="dna-helix">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="dna-strand"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        >
                            <div className="dna-node left" />
                            <div className="dna-connector" />
                            <div className="dna-node right" />
                        </div>
                    ))}
                </div>
            )}

            {/* Central orb */}
            <div className="warp-orb">
                <div className="warp-orb-core" />
                <div className="warp-orb-ring ring-1" />
                <div className="warp-orb-ring ring-2" />
                <div className="warp-orb-ring ring-3" />
            </div>

            {/* Messages */}
            <div className="warp-messages">
                <h2 className="warp-title">{message}</h2>
                <p className="warp-subtitle">{subMessage}</p>

                {/* Progress indicator */}
                <div className="warp-progress-container">
                    <div
                        className="warp-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Phase dots */}
                <div className="warp-phase-dots">
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`phase-dot ${phase === i ? 'active' : ''}`}
                        />
                    ))}
                </div>
            </div>

            <style>{`
        .warp-loader {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #0d0d20 0%, #030308 100%);
          overflow: hidden;
        }
        
        .warp-loader-full {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
        }
        
        .warp-loader-inline {
          min-height: 400px;
          border-radius: 16px;
        }
        
        .warp-loader-compact {
          min-height: 200px;
          border-radius: 12px;
        }
        
        /* Starfield */
        .warp-starfield {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }
        
        .warp-star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: star-warp 2s linear infinite;
        }
        
        @keyframes star-warp {
          0% {
            transform: translateZ(0) scale(1);
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateZ(200px) scale(0);
            opacity: 0;
          }
        }
        
        /* Warp tunnel */
        .warp-tunnel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .warp-ring {
          position: absolute;
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 50%;
          animation: ring-expand 2s ease-out infinite;
        }
        
        @keyframes ring-expand {
          0% {
            width: 50px;
            height: 50px;
            opacity: 1;
            border-width: 2px;
          }
          100% {
            width: 400px;
            height: 400px;
            opacity: 0;
            border-width: 1px;
          }
        }
        
        /* DNA Helix */
        .dna-helix {
          position: absolute;
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: dna-rotate 4s linear infinite;
        }
        
        @keyframes dna-rotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        
        .dna-strand {
          display: flex;
          align-items: center;
          animation: strand-wave 1s ease-in-out infinite alternate;
        }
        
        @keyframes strand-wave {
          0% { transform: translateX(-10px); }
          100% { transform: translateX(10px); }
        }
        
        .dna-node {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--neon-cyan, #00FFFF);
          box-shadow: 0 0 10px var(--neon-cyan, #00FFFF);
        }
        
        .dna-node.right {
          background: var(--neon-magenta, #FF00FF);
          box-shadow: 0 0 10px var(--neon-magenta, #FF00FF);
        }
        
        .dna-connector {
          width: 40px;
          height: 2px;
          background: linear-gradient(90deg, var(--neon-cyan, #00FFFF), var(--neon-magenta, #FF00FF));
          opacity: 0.5;
        }
        
        /* Central orb */
        .warp-orb {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 40px;
        }
        
        .warp-orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: radial-gradient(circle, #00FFFF, #0066FF);
          border-radius: 50%;
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.8),
            0 0 40px rgba(0, 255, 255, 0.5),
            0 0 60px rgba(0, 255, 255, 0.3);
          animation: core-pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes core-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        
        .warp-orb-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 2px solid rgba(0, 255, 255, 0.5);
          border-radius: 50%;
          animation: orbit 3s linear infinite;
        }
        
        .ring-1 {
          width: 50px;
          height: 50px;
          margin: -25px 0 0 -25px;
        }
        
        .ring-2 {
          width: 65px;
          height: 65px;
          margin: -32.5px 0 0 -32.5px;
          animation-duration: 4s;
          animation-direction: reverse;
          border-color: rgba(255, 0, 255, 0.4);
        }
        
        .ring-3 {
          width: 80px;
          height: 80px;
          margin: -40px 0 0 -40px;
          animation-duration: 5s;
          border-color: rgba(255, 215, 0, 0.3);
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Messages */
        .warp-messages {
          position: relative;
          z-index: 10;
          text-align: center;
        }
        
        .warp-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 8px 0;
          text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        }
        
        .warp-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 24px 0;
        }
        
        .warp-progress-container {
          width: 200px;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto 16px;
        }
        
        .warp-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #00FFFF, #FF00FF);
          border-radius: 2px;
          transition: width 0.05s linear;
        }
        
        .warp-phase-dots {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        
        .phase-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        
        .phase-dot.active {
          background: #00FFFF;
          box-shadow: 0 0 10px #00FFFF;
          transform: scale(1.2);
        }
      `}</style>
        </div>
    );
};

export default WarpLoader;
