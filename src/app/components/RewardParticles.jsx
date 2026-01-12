/**
 * ✨ XP & DIAMOND REWARD PARTICLES
 * src/app/components/RewardParticles.jsx
 * 
 * Floating "+XP" and "+Diamond" particle animations for social actions.
 * Anti-Gravity UI feedback system.
 */

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 REWARD CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const RewardContext = createContext(null);

export const useRewards = () => {
    const context = useContext(RewardContext);
    if (!context) {
        throw new Error('useRewards must be used within RewardProvider');
    }
    return context;
};

// ═══════════════════════════════════════════════════════════════════════════
// ✨ SINGLE PARTICLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const RewardParticle = ({ id, type, value, x, y, onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.(id);
        }, 2000);

        return () => clearTimeout(timer);
    }, [id, onComplete]);

    if (!isVisible) return null;

    const config = {
        xp: {
            icon: '⚡',
            color: '#00FFFF',
            prefix: '+',
            suffix: ' XP',
            glow: 'rgba(0, 255, 255, 0.5)'
        },
        diamond: {
            icon: '💎',
            color: '#9400D3',
            prefix: '+',
            suffix: '',
            glow: 'rgba(148, 0, 211, 0.5)'
        },
        streak: {
            icon: '🔥',
            color: '#FF6B35',
            prefix: '',
            suffix: 'x',
            glow: 'rgba(255, 107, 53, 0.5)'
        },
        level: {
            icon: '🎉',
            color: '#FFD700',
            prefix: 'Level ',
            suffix: '!',
            glow: 'rgba(255, 215, 0, 0.5)'
        }
    };

    const c = config[type] || config.xp;

    return (
        <div
            className="reward-particle"
            style={{
                '--start-x': `${x}px`,
                '--start-y': `${y}px`,
                '--color': c.color,
                '--glow': c.glow
            }}
        >
            <span className="particle-icon">{c.icon}</span>
            <span className="particle-value">
                {c.prefix}{value}{c.suffix}
            </span>

            <style>{`
        .reward-particle {
          position: fixed;
          left: var(--start-x);
          top: var(--start-y);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid var(--color);
          border-radius: 20px;
          color: var(--color);
          font-family: 'Exo 2', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10000;
          box-shadow: 0 0 20px var(--glow);
          animation: particle-float 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes particle-float {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          10% {
            opacity: 1;
            transform: translateY(-10px) scale(1.1);
          }
          30% {
            transform: translateY(-30px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.8);
          }
        }

        .particle-icon {
          font-size: 1.2rem;
        }

        .particle-value {
          text-shadow: 0 0 10px var(--glow);
        }
      `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎊 BURST EFFECT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const BurstEffect = ({ id, x, y, color, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete?.(id);
        }, 1000);

        return () => clearTimeout(timer);
    }, [id, onComplete]);

    const particles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i / 12) * 360,
        distance: 40 + Math.random() * 30,
        size: 4 + Math.random() * 4
    }));

    return (
        <div
            className="burst-container"
            style={{ left: x, top: y }}
        >
            {particles.map(p => (
                <div
                    key={p.id}
                    className="burst-particle"
                    style={{
                        '--angle': `${p.angle}deg`,
                        '--distance': `${p.distance}px`,
                        '--size': `${p.size}px`,
                        '--color': color
                    }}
                />
            ))}

            <style>{`
        .burst-container {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
        }

        .burst-particle {
          position: absolute;
          width: var(--size);
          height: var(--size);
          background: var(--color);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--color);
          animation: burst-fly 0.8s ease-out forwards;
        }

        @keyframes burst-fly {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: 
              translate(
                calc(cos(var(--angle)) * var(--distance)),
                calc(sin(var(--angle)) * var(--distance))
              ) 
              scale(0);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎁 REWARD PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export const RewardProvider = ({ children }) => {
    const [particles, setParticles] = useState([]);
    const [bursts, setBursts] = useState([]);
    const [idCounter, setIdCounter] = useState(0);

    // Spawn XP particle
    const spawnXP = useCallback((value, x, y) => {
        const id = `xp-${idCounter}`;
        setIdCounter(prev => prev + 1);
        setParticles(prev => [...prev, { id, type: 'xp', value, x, y }]);

        // Add burst
        setBursts(prev => [...prev, { id: `burst-${id}`, x, y, color: '#00FFFF' }]);
    }, [idCounter]);

    // Spawn Diamond particle
    const spawnDiamond = useCallback((value, x, y) => {
        const id = `diamond-${idCounter}`;
        setIdCounter(prev => prev + 1);
        setParticles(prev => [...prev, { id, type: 'diamond', value, x, y }]);

        // Add larger burst for diamonds
        setBursts(prev => [...prev, { id: `burst-${id}`, x, y, color: '#9400D3' }]);
    }, [idCounter]);

    // Spawn Streak multiplier particle
    const spawnStreak = useCallback((multiplier, x, y) => {
        const id = `streak-${idCounter}`;
        setIdCounter(prev => prev + 1);
        setParticles(prev => [...prev, { id, type: 'streak', value: multiplier, x, y }]);
    }, [idCounter]);

    // Spawn Level up particle
    const spawnLevelUp = useCallback((level, x, y) => {
        const id = `level-${idCounter}`;
        setIdCounter(prev => prev + 1);
        setParticles(prev => [...prev, { id, type: 'level', value: level, x, y }]);

        // Multiple bursts for level up
        setBursts(prev => [
            ...prev,
            { id: `burst-1-${id}`, x, y, color: '#FFD700' },
            { id: `burst-2-${id}`, x: x - 20, y: y - 20, color: '#FF6B35' },
            { id: `burst-3-${id}`, x: x + 20, y: y - 20, color: '#00FFFF' }
        ]);
    }, [idCounter]);

    // Combined spawn from center of element
    const spawnFromElement = useCallback((element, type, value) => {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        switch (type) {
            case 'xp':
                spawnXP(value, x, y);
                break;
            case 'diamond':
                spawnDiamond(value, x, y);
                break;
            case 'streak':
                spawnStreak(value, x, y);
                break;
            case 'level':
                spawnLevelUp(value, x, y);
                break;
        }
    }, [spawnXP, spawnDiamond, spawnStreak, spawnLevelUp]);

    // Remove completed particles
    const removeParticle = useCallback((id) => {
        setParticles(prev => prev.filter(p => p.id !== id));
    }, []);

    const removeBurst = useCallback((id) => {
        setBursts(prev => prev.filter(b => b.id !== id));
    }, []);

    const value = {
        spawnXP,
        spawnDiamond,
        spawnStreak,
        spawnLevelUp,
        spawnFromElement
    };

    return (
        <RewardContext.Provider value={value}>
            {children}

            {/* Render particles */}
            {particles.map(p => (
                <RewardParticle
                    key={p.id}
                    id={p.id}
                    type={p.type}
                    value={p.value}
                    x={p.x}
                    y={p.y}
                    onComplete={removeParticle}
                />
            ))}

            {/* Render bursts */}
            {bursts.map(b => (
                <BurstEffect
                    key={b.id}
                    id={b.id}
                    x={b.x}
                    y={b.y}
                    color={b.color}
                    onComplete={removeBurst}
                />
            ))}
        </RewardContext.Provider>
    );
};

export default RewardProvider;
