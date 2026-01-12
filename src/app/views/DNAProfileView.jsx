/**
 * 🧬 DNA PROFILE VIEW
 * src/app/views/DNAProfileView.jsx
 * 
 * Complete Identity DNA profile visualization with holographic radar chart,
 * XP progression, tier badges, and streak tracking.
 */

import React, { useMemo } from 'react';
import { useSocialOrb, useIdentity, useDNA, useEconomy } from '../providers/SocialOrbProvider';

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 DNA TRAIT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DNA_TRAITS = {
    grit: { label: 'Grit', short: 'GRT', color: '#32CD32', icon: '💪' },
    accuracy: { label: 'Accuracy', short: 'ACC', color: '#00BFFF', icon: '🎯' },
    aggression: { label: 'Aggression', short: 'AGG', color: '#FF6B35', icon: '⚔️' },
    wealth: { label: 'Wealth', short: 'WLT', color: '#FFD700', icon: '💰' },
    rep: { label: 'Reputation', short: 'REP', color: '#9400D3', icon: '⭐' }
};

const TIER_CONFIG = {
    BRONZE: { label: 'Bronze', color: '#CD7F32', icon: '🥉', glow: 'rgba(205, 127, 50, 0.3)' },
    SILVER: { label: 'Silver', color: '#C0C0C0', icon: '🥈', glow: 'rgba(192, 192, 192, 0.3)' },
    GOLD: { label: 'Gold', color: '#FFD700', icon: '🥇', glow: 'rgba(255, 215, 0, 0.3)' },
    GTO_MASTER: { label: 'GTO Master', color: '#9400D3', icon: '👑', glow: 'rgba(148, 0, 211, 0.3)' }
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 RADAR CHART COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const DNARadarChart = ({ dnaData, size = 300 }) => {
    const center = size / 2;
    const radius = (size / 2) - 40;
    const traits = Object.entries(DNA_TRAITS);

    // Calculate points for each trait
    const points = useMemo(() => {
        return traits.map(([key, config], index) => {
            const angle = (index / traits.length) * 2 * Math.PI - Math.PI / 2;
            const value = (dnaData?.[key] || 0) / 100; // Normalize to 0-1
            const x = center + radius * value * Math.cos(angle);
            const y = center + radius * value * Math.sin(angle);
            const labelX = center + (radius + 25) * Math.cos(angle);
            const labelY = center + (radius + 25) * Math.sin(angle);
            return { key, config, x, y, labelX, labelY, value, angle };
        });
    }, [dnaData, center, radius, traits]);

    // Create polygon path
    const polygonPath = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';

    // Grid levels
    const gridLevels = [0.25, 0.5, 0.75, 1];

    return (
        <div className="dna-radar-container">
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="radar-svg"
                style={{ width: size, height: size }}
            >
                {/* Background glow */}
                <defs>
                    <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(0, 255, 255, 0.1)" />
                        <stop offset="100%" stopColor="rgba(0, 255, 255, 0)" />
                    </radialGradient>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background */}
                <circle cx={center} cy={center} r={radius} fill="url(#radar-glow)" />

                {/* Grid circles */}
                {gridLevels.map((level, i) => (
                    <circle
                        key={i}
                        cx={center}
                        cy={center}
                        r={radius * level}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* Grid lines (spokes) */}
                {points.map((p, i) => (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={center + radius * Math.cos(p.angle)}
                        y2={center + radius * Math.sin(p.angle)}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="1"
                    />
                ))}

                {/* Data polygon */}
                <path
                    d={polygonPath}
                    fill="rgba(0, 255, 255, 0.15)"
                    stroke="#00FFFF"
                    strokeWidth="2"
                    filter="url(#neon-glow)"
                    className="radar-polygon"
                />

                {/* Data points */}
                {points.map((p, i) => (
                    <g key={i}>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r="6"
                            fill={p.config.color}
                            stroke="white"
                            strokeWidth="2"
                            filter="url(#neon-glow)"
                            className="radar-point"
                        />
                    </g>
                ))}

                {/* Labels */}
                {points.map((p, i) => (
                    <text
                        key={i}
                        x={p.labelX}
                        y={p.labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={p.config.color}
                        fontSize="12"
                        fontWeight="600"
                        className="radar-label"
                    >
                        {p.config.short}
                    </text>
                ))}
            </svg>

            <style>{`
        .dna-radar-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .radar-svg {
          overflow: visible;
        }

        .radar-polygon {
          animation: radar-pulse 3s ease-in-out infinite;
        }

        @keyframes radar-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        .radar-point {
          animation: point-glow 2s ease-in-out infinite;
        }

        @keyframes point-glow {
          0%, 100% { filter: url(#neon-glow) drop-shadow(0 0 3px currentColor); }
          50% { filter: url(#neon-glow) drop-shadow(0 0 8px currentColor); }
        }

        .radar-label {
          text-shadow: 0 0 10px currentColor;
        }
      `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 📈 STAT BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const StatBar = ({ trait, value, maxValue = 100 }) => {
    const config = DNA_TRAITS[trait];
    const percentage = Math.min((value / maxValue) * 100, 100);

    return (
        <div className="stat-bar-container">
            <div className="stat-bar-header">
                <span className="stat-icon">{config.icon}</span>
                <span className="stat-label">{config.label}</span>
                <span className="stat-value" style={{ color: config.color }}>{Math.round(value)}</span>
            </div>
            <div className="stat-bar-track">
                <div
                    className="stat-bar-fill"
                    style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`
                    }}
                />
            </div>

            <style>{`
        .stat-bar-container {
          margin-bottom: 16px;
        }

        .stat-bar-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .stat-icon {
          font-size: 1.1rem;
        }

        .stat-label {
          flex: 1;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .stat-value {
          font-family: 'Exo 2', sans-serif;
          font-weight: 700;
          font-size: 1rem;
        }

        .stat-bar-track {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 DNA PROFILE VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DNAProfileView = () => {
    const { state } = useSocialOrb();
    const identity = useIdentity();
    const dna = useDNA();
    const economy = useEconomy();

    const tier = TIER_CONFIG[identity?.tier] || TIER_CONFIG.BRONZE;
    const level = identity?.level || 1;
    const xp = identity?.xp || 0;
    const xpForNextLevel = (level * 1000); // Simple formula
    const xpProgress = (xp / xpForNextLevel) * 100;

    // Calculate composite DNA score
    const compositeScore = useMemo(() => {
        if (!dna) return 0;
        const values = Object.values(dna);
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }, [dna]);

    return (
        <div className="dna-profile-view">
            {/* Header */}
            <header className="profile-header">
                <h1 className="profile-title">
                    <span className="title-icon">🧬</span>
                    <span className="title-text">Identity DNA</span>
                </h1>
                <p className="profile-subtitle">
                    Your unique poker signature
                </p>
            </header>

            <div className="profile-grid">
                {/* Tier & Level Card */}
                <div className="profile-card glass-card tier-card" style={{ '--tier-glow': tier.glow }}>
                    <div className="tier-badge" style={{ background: tier.glow, borderColor: tier.color }}>
                        <span className="tier-icon">{tier.icon}</span>
                        <span className="tier-label" style={{ color: tier.color }}>{tier.label}</span>
                    </div>

                    <div className="level-display">
                        <span className="level-label">Level</span>
                        <span className="level-value">{level}</span>
                    </div>

                    <div className="xp-progress">
                        <div className="xp-bar">
                            <div className="xp-fill" style={{ width: `${xpProgress}%` }} />
                        </div>
                        <div className="xp-text">
                            <span>{xp.toLocaleString()} XP</span>
                            <span>/ {xpForNextLevel.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Radar Chart Card */}
                <div className="profile-card glass-card radar-card">
                    <h3 className="card-title">DNA Signature</h3>
                    <DNARadarChart dnaData={dna} size={280} />
                    <div className="composite-score">
                        <span className="score-label">Composite Score</span>
                        <span className="score-value">{compositeScore}</span>
                    </div>
                </div>

                {/* Detailed Stats Card */}
                <div className="profile-card glass-card stats-card">
                    <h3 className="card-title">Trait Breakdown</h3>
                    {Object.entries(DNA_TRAITS).map(([key]) => (
                        <StatBar
                            key={key}
                            trait={key}
                            value={dna?.[key] || 0}
                        />
                    ))}
                </div>

                {/* Economy Card */}
                <div className="profile-card glass-card economy-card">
                    <h3 className="card-title">Economy</h3>

                    <div className="economy-stat">
                        <div className="economy-icon">💎</div>
                        <div className="economy-info">
                            <span className="economy-label">Diamonds</span>
                            <span className="economy-value">{(economy?.diamonds || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="economy-stat">
                        <div className="economy-icon">🔥</div>
                        <div className="economy-info">
                            <span className="economy-label">Current Streak</span>
                            <span className="economy-value">{economy?.currentStreak || 0} days</span>
                        </div>
                    </div>

                    <div className="economy-stat">
                        <div className="economy-icon">✨</div>
                        <div className="economy-info">
                            <span className="economy-label">Streak Multiplier</span>
                            <span className="economy-value multiplier">{economy?.streakMultiplier || 1.0}x</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .dna-profile-view {
          padding-bottom: 40px;
        }

        .profile-header {
          text-align: center;
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

        .profile-title {
          display: flex;
          align-items: center;
          justify-content: center;
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
          background: linear-gradient(135deg, #00FFFF, #32CD32);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .profile-subtitle {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-size: 1rem;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .profile-card {
          padding: 24px;
          animation: card-rise 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }

        .profile-card:nth-child(1) { animation-delay: 0.1s; }
        .profile-card:nth-child(2) { animation-delay: 0.2s; }
        .profile-card:nth-child(3) { animation-delay: 0.3s; }
        .profile-card:nth-child(4) { animation-delay: 0.4s; }

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

        .card-title {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 20px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Tier Card */
        .tier-card {
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 30px var(--tier-glow);
        }

        .tier-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border: 2px solid;
          border-radius: 30px;
          margin-bottom: 24px;
        }

        .tier-icon {
          font-size: 1.5rem;
        }

        .tier-label {
          font-family: 'Exo 2', sans-serif;
          font-weight: 700;
          font-size: 1rem;
        }

        .level-display {
          margin-bottom: 20px;
        }

        .level-label {
          display: block;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }

        .level-value {
          font-family: 'Exo 2', sans-serif;
          font-size: 4rem;
          font-weight: 700;
          background: linear-gradient(135deg, #00FFFF, #0088FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        }

        .xp-progress {
          margin-top: 16px;
        }

        .xp-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #00FFFF, #0088FF);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .xp-text {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Radar Card */
        .radar-card {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .composite-score {
          text-align: center;
          margin-top: 16px;
        }

        .score-label {
          display: block;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }

        .score-value {
          font-family: 'Exo 2', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #00FFFF;
          text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        }

        /* Economy Card */
        .economy-stat {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .economy-icon {
          font-size: 2rem;
        }

        .economy-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .economy-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .economy-value {
          font-family: 'Exo 2', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .economy-value.multiplier {
          color: #FFD700;
        }

        @media (max-width: 600px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }

          .level-value {
            font-size: 3rem;
          }
        }
      `}</style>
        </div>
    );
};

export default DNAProfileView;
