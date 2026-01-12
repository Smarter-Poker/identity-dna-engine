/**
 * 🧬 ORB 01: SOCIAL — 3D DNA RADAR CHART
 * src/orbs/Social/DNA_Radar_Chart.tsx
 * 
 * A stunning 3D holographic visualization of the Identity DNA pentagon.
 * Features WebGL-style rendering with neon glow, particle effects, and pulsing animations.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
    IdentityDNAProfile,
    DNA_TRAITS_ORDERED,
    calculateCompositeScore,
    getTierForScore,
    calculateHologramParams,
    type DNATrait,
    type TierConfig,
    type HologramRenderParams
} from './IdentityDNA';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface DNA_Radar_ChartProps {
    /** DNA profile with 5 traits (0-1 normalized) */
    profile: IdentityDNAProfile;
    /** Chart size in pixels */
    size?: number;
    /** Enable pulse animation on value changes */
    pulseOnChange?: boolean;
    /** Enable 3D rotation effect */
    enable3D?: boolean;
    /** Rotation speed multiplier */
    rotationSpeed?: number;
    /** Show trait labels */
    showLabels?: boolean;
    /** Show composite score */
    showScore?: boolean;
    /** Custom class name */
    className?: string;
    /** Callback when trait is hovered */
    onTraitHover?: (trait: DNATrait | null) => void;
}

interface TooltipState {
    visible: boolean;
    trait: DNATrait | null;
    value: number;
    x: number;
    y: number;
}

interface ParticleState {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔮 3D DNA RADAR CHART COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DNA_Radar_Chart: React.FC<DNA_Radar_ChartProps> = ({
    profile,
    size = 350,
    pulseOnChange = true,
    enable3D = true,
    rotationSpeed = 1,
    showLabels = true,
    showScore = true,
    className = '',
    onTraitHover
}) => {
    // ═══════════════════════════════════════════════════════════════════════
    // 📊 STATE & REFS
    // ═══════════════════════════════════════════════════════════════════════

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const rotationAngleRef = useRef<number>(0);

    const [isPulsing, setIsPulsing] = useState(false);
    const [pulseIntensity, setPulseIntensity] = useState(0);
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        trait: null,
        value: 0,
        x: 0,
        y: 0
    });
    const [particles, setParticles] = useState<ParticleState[]>([]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🧮 COMPUTED VALUES
    // ═══════════════════════════════════════════════════════════════════════

    const center = size / 2;
    const radius = (size / 2) - 50;
    const axisCount = DNA_TRAITS_ORDERED.length;
    const angleStep = (2 * Math.PI) / axisCount;

    const compositeScore = useMemo(() => calculateCompositeScore(profile), [profile]);
    const tierConfig = useMemo(() => getTierForScore(compositeScore), [compositeScore]);
    const hologramParams = useMemo(() => calculateHologramParams(profile), [profile]);

    const traitValues = useMemo(() => [
        profile.Grit,
        profile.Accuracy,
        profile.Aggression,
        profile.Wealth,
        profile.Rep
    ], [profile]);

    // ═══════════════════════════════════════════════════════════════════════
    // 📐 GEOMETRY HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    const getAngle = useCallback((index: number): number => {
        return index * angleStep - Math.PI / 2;
    }, [angleStep]);

    const getPointPosition = useCallback((index: number, value: number): { x: number; y: number } => {
        const angle = getAngle(index);
        const r = radius * Math.max(0.05, value); // Min 5% for visibility
        return {
            x: center + r * Math.sin(angle),
            y: center - r * Math.cos(angle)
        };
    }, [center, radius, getAngle]);

    const getGridPoints = useCallback((level: number): string => {
        return DNA_TRAITS_ORDERED.map((_, i) => {
            const angle = getAngle(i);
            const x = center + radius * level * Math.sin(angle);
            const y = center - radius * level * Math.cos(angle);
            return `${x},${y}`;
        }).join(' ');
    }, [center, radius, getAngle]);

    const getDataPoints = useCallback((): string => {
        return traitValues.map((value, i) => {
            const { x, y } = getPointPosition(i, value);
            return `${x},${y}`;
        }).join(' ');
    }, [traitValues, getPointPosition]);

    const getLabelPosition = useCallback((index: number): { x: number; y: number } => {
        const angle = getAngle(index);
        return {
            x: center + (radius + 35) * Math.sin(angle),
            y: center - (radius + 35) * Math.cos(angle)
        };
    }, [center, radius, getAngle]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🎬 ANIMATION EFFECTS
    // ═══════════════════════════════════════════════════════════════════════

    // Pulse animation when values change
    useEffect(() => {
        if (!pulseOnChange) return;

        setIsPulsing(true);
        setPulseIntensity(1);

        const decayInterval = setInterval(() => {
            setPulseIntensity(prev => {
                const next = prev - 0.05;
                if (next <= 0) {
                    clearInterval(decayInterval);
                    setIsPulsing(false);
                    return 0;
                }
                return next;
            });
        }, 50);

        return () => clearInterval(decayInterval);
    }, [profile, pulseOnChange]);

    // Particle effects
    useEffect(() => {
        if (tierConfig.particleDensity === 0) return;

        const spawnParticle = () => {
            const angle = Math.random() * Math.PI * 2;
            const dist = radius * 0.6 + Math.random() * radius * 0.4;

            setParticles(prev => [...prev.slice(-20), {
                id: Date.now() + Math.random(),
                x: center + dist * Math.cos(angle),
                y: center + dist * Math.sin(angle),
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 1,
                life: 1,
                size: 2 + Math.random() * 3,
                color: tierConfig.glowColor
            }]);
        };

        const interval = setInterval(spawnParticle, 200 / tierConfig.particleDensity);
        return () => clearInterval(interval);
    }, [tierConfig, center, radius]);

    // Particle lifecycle
    useEffect(() => {
        if (particles.length === 0) return;

        const interval = setInterval(() => {
            setParticles(prev => prev
                .map(p => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    life: p.life - 0.02
                }))
                .filter(p => p.life > 0)
            );
        }, 50);

        return () => clearInterval(interval);
    }, [particles.length]);

    // 3D rotation effect
    useEffect(() => {
        if (!enable3D) return;

        const animate = () => {
            rotationAngleRef.current += 0.005 * rotationSpeed * hologramParams.rotationSpeed;
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationRef.current);
    }, [enable3D, rotationSpeed, hologramParams.rotationSpeed]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🖱️ INTERACTION HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    const handlePointHover = useCallback((trait: DNATrait, value: number, event: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        setTooltip({
            visible: true,
            trait,
            value,
            x: event.clientX - rect.left + 15,
            y: event.clientY - rect.top - 35
        });

        onTraitHover?.(trait);
    }, [onTraitHover]);

    const handlePointLeave = useCallback(() => {
        setTooltip(prev => ({ ...prev, visible: false }));
        onTraitHover?.(null);
    }, [onTraitHover]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 RENDER
    // ═══════════════════════════════════════════════════════════════════════

    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    return (
        <div
            ref={containerRef}
            className={`dna-radar-chart ${isPulsing ? 'pulsing' : ''} ${className}`}
            style={{
                '--size': `${size}px`,
                '--glow-color': tierConfig.glowColor,
                '--tier-color': tierConfig.color,
                '--pulse-intensity': pulseIntensity,
                '--glow-intensity': hologramParams.glowIntensity,
            } as React.CSSProperties}
        >
            {/* 🌟 Background Glow */}
            <div className="background-glow" />

            {/* ✨ Particles */}
            <div className="particle-layer">
                {particles.map(p => (
                    <div
                        key={p.id}
                        className="particle"
                        style={{
                            left: p.x,
                            top: p.y,
                            width: p.size,
                            height: p.size,
                            opacity: p.life,
                            backgroundColor: p.color,
                            boxShadow: `0 0 ${p.size * 2}px ${p.color}`
                        }}
                    />
                ))}
            </div>

            {/* 📊 SVG Radar */}
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="radar-svg"
                style={{ transform: enable3D ? `perspective(1000px) rotateY(${Math.sin(rotationAngleRef.current) * 5}deg)` : 'none' }}
            >
                {/* Defs for gradients and filters */}
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={tierConfig.color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={tierConfig.glowColor} stopOpacity="0.2" />
                    </linearGradient>

                    <radialGradient id="centerGlow">
                        <stop offset="0%" stopColor={tierConfig.glowColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Center glow */}
                <circle cx={center} cy={center} r={radius * 0.3} fill="url(#centerGlow)" />

                {/* Grid polygons */}
                <g className="radar-grid">
                    {gridLevels.map(level => (
                        <polygon
                            key={level}
                            points={getGridPoints(level)}
                            className="grid-polygon"
                            style={{ opacity: level * 0.25 + 0.1 }}
                        />
                    ))}

                    {/* Axis lines */}
                    {DNA_TRAITS_ORDERED.map((trait, i) => {
                        const angle = getAngle(i);
                        return (
                            <line
                                key={trait.key}
                                x1={center}
                                y1={center}
                                x2={center + radius * Math.sin(angle)}
                                y2={center - radius * Math.cos(angle)}
                                className="axis-line"
                                style={{ stroke: trait.color, opacity: 0.4 }}
                            />
                        );
                    })}
                </g>

                {/* Data polygon */}
                <polygon
                    points={getDataPoints()}
                    className="data-polygon"
                    fill="url(#dataGradient)"
                    stroke={tierConfig.color}
                    strokeWidth={2}
                    filter="url(#glow)"
                    style={{
                        filter: isPulsing ? `drop-shadow(0 0 ${15 + pulseIntensity * 25}px ${tierConfig.glowColor})` : 'url(#glow)'
                    }}
                />

                {/* Data points */}
                <g className="data-points">
                    {DNA_TRAITS_ORDERED.map((trait, i) => {
                        const value = traitValues[i];
                        const { x, y } = getPointPosition(i, value);
                        return (
                            <g key={trait.key}>
                                {/* Outer glow ring */}
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={8}
                                    fill="none"
                                    stroke={trait.color}
                                    strokeWidth={1}
                                    opacity={0.3}
                                />
                                {/* Inner point */}
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={6}
                                    fill={trait.color}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    className="data-point"
                                    style={{ filter: `drop-shadow(0 0 6px ${trait.color})` }}
                                    onMouseEnter={(e) => handlePointHover(trait, value, e)}
                                    onMouseLeave={handlePointLeave}
                                />
                            </g>
                        );
                    })}
                </g>

                {/* Labels */}
                {showLabels && (
                    <g className="axis-labels">
                        {DNA_TRAITS_ORDERED.map((trait, i) => {
                            const { x, y } = getLabelPosition(i);
                            return (
                                <text
                                    key={trait.key}
                                    x={x}
                                    y={y}
                                    className="axis-label"
                                    fill={trait.color}
                                    style={{ textShadow: `0 0 10px ${trait.color}` }}
                                >
                                    {trait.shortLabel}
                                </text>
                            );
                        })}
                    </g>
                )}
            </svg>

            {/* 📈 Composite Score */}
            {showScore && (
                <div className="composite-score">
                    <div className="score-ring" style={{ borderColor: tierConfig.color }}>
                        <span className="score-value" style={{ color: tierConfig.color }}>
                            {compositeScore}
                        </span>
                    </div>
                    <span className="score-label">DNA SCORE</span>
                    <span className="tier-badge" style={{ backgroundColor: tierConfig.color }}>
                        {tierConfig.tier.replace('_', ' ')}
                    </span>
                </div>
            )}

            {/* 💬 Tooltip */}
            {tooltip.visible && tooltip.trait && (
                <div
                    className="radar-tooltip"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    <div className="tooltip-header" style={{ color: tooltip.trait.color }}>
                        {tooltip.trait.label}
                    </div>
                    <div className="tooltip-value">
                        {(tooltip.value * 100).toFixed(1)}%
                    </div>
                    <div className="tooltip-description">
                        {tooltip.trait.description}
                    </div>
                </div>
            )}

            {/* 💎 Pulse Overlay */}
            {isPulsing && (
                <div
                    className="pulse-overlay"
                    style={{
                        background: `radial-gradient(circle, ${tierConfig.glowColor}22 0%, transparent 70%)`,
                        opacity: pulseIntensity
                    }}
                />
            )}

            {/* 🎨 Styles */}
            <style>{`
        .dna-radar-chart {
          position: relative;
          width: var(--size);
          height: var(--size);
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0d0d20 100%);
          border-radius: 20px;
          padding: 10px;
          box-shadow: 
            0 0 40px rgba(0, 191, 255, 0.15),
            0 0 80px rgba(0, 0, 0, 0.5),
            inset 0 0 60px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          overflow: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        .dna-radar-chart.pulsing {
          animation: holoPulse 0.4s ease-out;
        }
        
        @keyframes holoPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        .background-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 60%;
          height: 60%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
          opacity: calc(var(--glow-intensity) * 0.15);
          filter: blur(30px);
          pointer-events: none;
        }
        
        .particle-layer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        .particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        
        .radar-svg {
          display: block;
          width: 100%;
          height: 100%;
          transition: transform 0.1s ease-out;
        }
        
        .grid-polygon {
          fill: none;
          stroke: rgba(0, 191, 255, 0.15);
          stroke-width: 1;
        }
        
        .axis-line {
          stroke-width: 1;
          stroke-dasharray: 5 5;
        }
        
        .data-polygon {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .data-point {
          cursor: pointer;
          transition: r 0.2s ease, filter 0.2s ease;
        }
        
        .data-point:hover {
          r: 9;
        }
        
        .axis-label {
          font-size: 13px;
          font-weight: 700;
          text-anchor: middle;
          dominant-baseline: middle;
          letter-spacing: 1px;
        }
        
        .composite-score {
          position: absolute;
          bottom: 15px;
          right: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .score-ring {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 3px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          box-shadow: 0 0 15px currentColor;
        }
        
        .score-value {
          font-size: 20px;
          font-weight: 800;
          text-shadow: 0 0 10px currentColor;
        }
        
        .score-label {
          color: #666;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .tier-badge {
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          letter-spacing: 0.5px;
        }
        
        .radar-tooltip {
          position: absolute;
          background: rgba(10, 10, 30, 0.95);
          border: 1px solid var(--glow-color);
          border-radius: 10px;
          padding: 10px 14px;
          pointer-events: none;
          z-index: 100;
          min-width: 140px;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }
        
        .tooltip-header {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        
        .tooltip-value {
          color: #fff;
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 4px;
        }
        
        .tooltip-description {
          color: #888;
          font-size: 10px;
          line-height: 1.4;
        }
        
        .pulse-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 20px;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
      `}</style>
        </div>
    );
};

export default DNA_Radar_Chart;
