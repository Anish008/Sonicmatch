'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useReferenceAudioPlayer } from '@/hooks/useReferenceAudioPlayer';
import { useListeningTestStore } from '@/stores/listeningTestStore';
import { REFERENCE_AUDIO_PATHS, AUDIO_ATTRIBUTES } from '@/lib/audio/referenceAudioConfig';
import { AB_COMPARISON_CONFIGS } from '@/types/listeningTest';
import type { AudioAttribute } from '@/types/listeningTest';

interface TrackCardProps {
  attribute: AudioAttribute | 'balanced';
  label: string;
  icon: string;
  isPlaying: boolean;
  isLoading: boolean;
  onClick: () => void;
}

function TrackCard({ attribute, label, icon, isPlaying, isLoading, onClick }: TrackCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        relative p-4 md:p-5 rounded-2xl
        flex flex-col items-center justify-center gap-2
        transition-all duration-200
        ${
          isPlaying
            ? 'bg-sonic-pink/20 ring-2 ring-sonic-pink'
            : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Playing indicator */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(255, 45, 85, 0.4)',
              '0 0 0 8px rgba(255, 45, 85, 0)',
            ],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />
      )}

      {/* Play button */}
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isPlaying ? 'bg-sonic-pink' : 'bg-white/20'}
          transition-colors duration-200
        `}
      >
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </div>

      {/* Icon and label */}
      <div className="text-2xl">{icon}</div>
      <span
        className={`
          text-sm font-medium
          ${isPlaying ? 'text-white' : 'text-white/60'}
        `}
      >
        {label}
      </span>
    </motion.button>
  );
}

/**
 * MultiTrackRefinementStep Component
 *
 * Optional step for re-listening to all reference tracks
 * and fine-tuning preferences before final results.
 */
export function MultiTrackRefinementStep() {
  const { testSessionId, skipRefinement, nextStep } = useListeningTestStore();
  const [playingAttribute, setPlayingAttribute] = useState<AudioAttribute | 'balanced' | null>(null);

  const {
    isLoading,
    isPlaying,
    initialize,
    preloadAll,
    stop,
  } = useReferenceAudioPlayer(null, testSessionId || '');

  // Preload all tracks on mount
  useEffect(() => {
    const setup = async () => {
      await initialize();
      await preloadAll();
    };
    setup();

    return () => {
      stop();
    };
  }, [initialize, preloadAll, stop]);

  // Play a specific track
  const handlePlayTrack = useCallback(
    async (attribute: AudioAttribute | 'balanced') => {
      const { getReferenceAudioPlayer } = await import('@/lib/audio/ReferenceAudioPlayer');
      const player = getReferenceAudioPlayer();

      if (playingAttribute === attribute && isPlaying) {
        // Pause if clicking same track
        player.pause();
        setPlayingAttribute(null);
      } else {
        // Play new track
        const url = attribute === 'balanced'
          ? REFERENCE_AUDIO_PATHS.balanced
          : REFERENCE_AUDIO_PATHS[attribute];
        player.switchTo(url);
        setPlayingAttribute(attribute);
      }
    },
    [playingAttribute, isPlaying]
  );

  // Skip refinement
  const handleSkip = useCallback(() => {
    stop();
    skipRefinement();
    nextStep();
  }, [stop, skipRefinement, nextStep]);

  // Continue to results
  const handleContinue = useCallback(() => {
    stop();
    nextStep();
  }, [stop, nextStep]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Fine-tune Your Preferences
        </h2>
        <p className="text-white/50 text-sm md:text-base max-w-md">
          Re-listen to any of the sound variations before we generate your profile.
          This step is optional.
        </p>
      </motion.div>

      {/* Track grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-lg mb-8"
      >
        {/* Balanced track */}
        <TrackCard
          attribute="balanced"
          label="Balanced"
          icon="⚖️"
          isPlaying={playingAttribute === 'balanced' && isPlaying}
          isLoading={isLoading}
          onClick={() => handlePlayTrack('balanced')}
        />

        {/* Attribute tracks */}
        {AUDIO_ATTRIBUTES.map((attr) => {
          const config = AB_COMPARISON_CONFIGS[attr];
          return (
            <TrackCard
              key={attr}
              attribute={attr}
              label={config.title}
              icon={config.icon}
              isPlaying={playingAttribute === attr && isPlaying}
              isLoading={isLoading}
              onClick={() => handlePlayTrack(attr)}
            />
          );
        })}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <button
          onClick={handleSkip}
          className="px-6 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Skip This Step
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 rounded-xl bg-sonic-pink text-white font-medium hover:bg-sonic-pink/90 transition-colors"
        >
          See My Profile
        </button>
      </motion.div>
    </motion.div>
  );
}
