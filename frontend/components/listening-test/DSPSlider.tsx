'use client';

/**
 * DSPSlider
 *
 * Interactive slider for real-time DSP parameter control.
 * Features smooth animations, visual feedback, and educational labels.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DSPSliderProps {
  value: number;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
  showValue?: boolean;
  disabled?: boolean;
  color?: 'pink' | 'coral' | 'gradient';
}

export function DSPSlider({
  value,
  onChange,
  leftLabel,
  rightLabel,
  showValue = false,
  disabled = false,
  color = 'gradient',
}: DSPSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate percentage for display
  const percentage = value * 100;

  // Get color classes based on variant
  const getColorClasses = () => {
    switch (color) {
      case 'pink':
        return 'from-sonic-pink to-sonic-pink';
      case 'coral':
        return 'from-sonic-coral to-sonic-coral';
      case 'gradient':
      default:
        return 'from-sonic-pink to-sonic-coral';
    }
  };

  // Handle mouse/touch interaction
  const handleInteraction = useCallback(
    (clientX: number) => {
      if (disabled || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const newValue = Math.max(0, Math.min(1, x / rect.width));
      onChange(newValue);
    },
    [disabled, onChange]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      handleInteraction(e.clientX);
    },
    [handleInteraction]
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      handleInteraction(e.touches[0].clientX);
    },
    [handleInteraction]
  );

  // Global move/up handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleInteraction(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleInteraction(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleInteraction]);

  return (
    <div className={`w-full ${disabled ? 'opacity-50' : ''}`}>
      {/* Labels */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-white/60">{leftLabel}</span>
        {showValue && (
          <span className="text-sm font-mono text-sonic-pink">
            {Math.round(percentage)}%
          </span>
        )}
        <span className="text-sm text-white/60">{rightLabel}</span>
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className={`
          relative h-3 rounded-full cursor-pointer select-none
          bg-white/10 overflow-hidden
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Active fill */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getColorClasses()}`}
          style={{ width: `${percentage}%` }}
          animate={{
            width: `${percentage}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
        />

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 -ml-3"
          style={{ left: `${percentage}%` }}
          animate={{
            scale: isDragging ? 1.2 : 1,
            left: `${percentage}%`,
          }}
          transition={{
            scale: { type: 'spring', stiffness: 400, damping: 25 },
            left: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        >
          {/* Thumb circle */}
          <div
            className={`
              w-full h-full rounded-full bg-white shadow-lg
              ${isDragging ? 'shadow-sonic-pink/50' : 'shadow-black/30'}
            `}
          />

          {/* Glow when dragging */}
          {isDragging && (
            <motion.div
              className="absolute inset-0 rounded-full bg-sonic-pink/40 blur-md"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.5 }}
            />
          )}
        </motion.div>

        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -ml-px" />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between mt-2 px-1">
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className={`
              w-px h-1.5 rounded-full
              ${tick === 50 ? 'bg-white/40' : 'bg-white/20'}
            `}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version of DSPSlider for use in smaller spaces
 */
export function DSPSliderCompact({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-sm text-white/60 w-20">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="flex-1 h-2 rounded-full appearance-none bg-white/10 cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sonic-pink
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                   [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sonic-pink
                   [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
      <span className="text-sm font-mono text-white/40 w-10 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
