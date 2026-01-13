'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrackButton } from './TrackButton';

interface ABTrackPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  currentTrack: 'A' | 'B' | null;
  selectedTrack: 'A' | 'B' | null;
  onPlayTrack: (track: 'A' | 'B') => void;
  onSelectTrack: (track: 'A' | 'B') => void;
  onStop: () => void;
  getFrequencyData: () => Uint8Array;
}

/**
 * ABTrackPlayer Component
 *
 * Two-track A/B comparison player with visualization.
 * Manages playback and selection state for A/B comparison.
 */
export function ABTrackPlayer({
  isPlaying,
  isLoading,
  currentTrack,
  selectedTrack,
  onPlayTrack,
  onSelectTrack,
  onStop,
  getFrequencyData,
}: ABTrackPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Audio visualization
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frequencyData = getFrequencyData();
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!isPlaying || frequencyData.length === 0) {
      // Draw idle state - flat line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw frequency bars
    const barCount = 32;
    const barWidth = width / barCount - 2;
    const barGap = 2;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * frequencyData.length);
      const value = frequencyData[dataIndex] / 255;
      const barHeight = value * height * 0.8;

      const x = i * (barWidth + barGap);
      const y = (height - barHeight) / 2;

      // Gradient color based on position
      const hue = 340 + (i / barCount) * 30; // Pink to coral gradient
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 + value * 0.5})`;

      // Draw rounded bar
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(drawVisualization);
  }, [isPlaying, getFrequencyData]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawVisualization);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawVisualization]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const handleTrackClick = (track: 'A' | 'B') => {
    if (currentTrack === track && isPlaying) {
      // If clicking the currently playing track, pause it
      onStop();
    } else {
      // Play the clicked track
      onPlayTrack(track);
    }
  };

  const handleTrackSelect = (track: 'A' | 'B') => {
    // First play the track if not already playing
    if (currentTrack !== track || !isPlaying) {
      onPlayTrack(track);
    }

    // Then select it (after a short delay to let user hear it)
    setTimeout(() => {
      onSelectTrack(track);
    }, 100);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Track buttons */}
      <div className="flex items-center gap-6 md:gap-10">
        <TrackButton
          label="A"
          isPlaying={currentTrack === 'A' && isPlaying}
          isSelected={selectedTrack === 'A'}
          isLoading={isLoading}
          onClick={() => handleTrackClick('A')}
        />

        {/* VS divider */}
        <div className="flex flex-col items-center">
          <span className="text-white/30 text-sm font-medium">vs</span>
        </div>

        <TrackButton
          label="B"
          isPlaying={currentTrack === 'B' && isPlaying}
          isSelected={selectedTrack === 'B'}
          isLoading={isLoading}
          onClick={() => handleTrackClick('B')}
        />
      </div>

      {/* Audio visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm h-16 md:h-20"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-xl bg-white/5"
          style={{ width: '100%', height: '100%' }}
        />
      </motion.div>

      {/* Selection buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-4"
      >
        <button
          onClick={() => handleTrackSelect('A')}
          className={`
            px-6 py-2.5 rounded-xl font-medium text-sm
            transition-all duration-200
            ${
              selectedTrack === 'A'
                ? 'bg-sonic-pink text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }
          `}
        >
          I prefer A
        </button>
        <button
          onClick={() => handleTrackSelect('B')}
          className={`
            px-6 py-2.5 rounded-xl font-medium text-sm
            transition-all duration-200
            ${
              selectedTrack === 'B'
                ? 'bg-sonic-pink text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }
          `}
        >
          I prefer B
        </button>
      </motion.div>

      {/* Hint text */}
      {!selectedTrack && (
        <p className="text-xs text-white/40 text-center">
          Listen to both tracks, then choose your favorite
        </p>
      )}
    </div>
  );
}
