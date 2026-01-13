'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SoundProfileChartProps {
  profile: {
    bass: number;
    mids: number;
    treble: number;
    soundstage: number;
    detail: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const categories = [
  { key: 'bass', label: 'Bass', angle: -90 },
  { key: 'mids', label: 'Mids', angle: -18 },
  { key: 'treble', label: 'Treble', angle: 54 },
  { key: 'soundstage', label: 'Stage', angle: 126 },
  { key: 'detail', label: 'Detail', angle: 198 },
] as const;

export function SoundProfileChart({ 
  profile, 
  size = 'md',
  showLabels = true 
}: SoundProfileChartProps) {
  const dimensions = {
    sm: { width: 120, height: 120, padding: 20 },
    md: { width: 200, height: 200, padding: 30 },
    lg: { width: 300, height: 300, padding: 40 },
  };

  const { width, height, padding } = dimensions[size];
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = (Math.min(width, height) - padding * 2) / 2;

  const points = useMemo(() => {
    return categories.map((cat) => {
      const value = profile[cat.key as keyof typeof profile] || 0;
      const angleRad = (cat.angle * Math.PI) / 180;
      const x = centerX + radius * value * Math.cos(angleRad);
      const y = centerY + radius * value * Math.sin(angleRad);
      return { x, y, value, ...cat };
    });
  }, [profile, centerX, centerY, radius]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Background grid circles */}
      {gridLevels.map((level) => (
        <circle
          key={level}
          cx={centerX}
          cy={centerY}
          r={radius * level}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {categories.map((cat) => {
        const angleRad = (cat.angle * Math.PI) / 180;
        const x2 = centerX + radius * Math.cos(angleRad);
        const y2 = centerY + radius * Math.sin(angleRad);
        return (
          <line
            key={cat.key}
            x1={centerX}
            y1={centerY}
            x2={x2}
            y2={y2}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        );
      })}

      {/* Filled area */}
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 45, 85, 0.4)" />
          <stop offset="100%" stopColor="rgba(255, 107, 138, 0.2)" />
        </linearGradient>
      </defs>
      
      <motion.path
        d={pathD}
        fill="url(#radarGradient)"
        stroke="#FF2D55"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Data points */}
      {points.map((point) => (
        <motion.circle
          key={point.key}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#FF2D55"
          stroke="white"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        />
      ))}

      {/* Labels */}
      {showLabels && points.map((point) => {
        const angleRad = (point.angle * Math.PI) / 180;
        const labelRadius = radius + 20;
        const labelX = centerX + labelRadius * Math.cos(angleRad);
        const labelY = centerY + labelRadius * Math.sin(angleRad);
        
        return (
          <text
            key={point.key}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-white/50"
          >
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}
