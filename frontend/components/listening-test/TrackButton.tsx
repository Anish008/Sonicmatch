'use client';

import { motion } from 'framer-motion';

interface TrackButtonProps {
  label: 'A' | 'B';
  isPlaying: boolean;
  isSelected: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * TrackButton Component
 *
 * Large, tappable button for A/B audio comparison.
 * Features visual feedback for playing, selected, and loading states.
 */
export function TrackButton({
  label,
  isPlaying,
  isSelected,
  isLoading = false,
  disabled = false,
  onClick,
}: TrackButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        relative flex flex-col items-center justify-center
        w-32 h-32 md:w-40 md:h-40 rounded-3xl
        transition-all duration-300
        ${
          isSelected
            ? 'bg-sonic-pink/20 ring-2 ring-sonic-pink shadow-lg shadow-sonic-pink/20'
            : isPlaying
            ? 'bg-white/10 ring-2 ring-white/40'
            : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {/* Pulsing ring animation when playing */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0 rounded-3xl ring-2 ring-sonic-pink"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Background gradient on selection */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sonic-pink/20 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Play/Pause Icon */}
        <div
          className={`
            w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center
            ${isPlaying ? 'bg-sonic-pink' : 'bg-white/20'}
            transition-colors duration-300
          `}
        >
          {isLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : isPlaying ? (
            // Pause icon
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg
              className="w-6 h-6 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>

        {/* Label */}
        <span
          className={`
            text-2xl md:text-3xl font-bold
            ${isSelected ? 'text-sonic-pink' : isPlaying ? 'text-white' : 'text-white/70'}
            transition-colors duration-300
          `}
        >
          {label}
        </span>

        {/* Tap hint */}
        {!isPlaying && !isSelected && (
          <span className="text-xs text-white/40">Tap to play</span>
        )}
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-sonic-pink flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}
