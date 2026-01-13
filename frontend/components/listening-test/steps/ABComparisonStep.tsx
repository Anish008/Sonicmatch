'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ABTrackPlayer } from '../ABTrackPlayer';
import { PreferenceStrengthSelector } from '../PreferenceStrengthSelector';
import { useReferenceAudioPlayer } from '@/hooks/useReferenceAudioPlayer';
import { useListeningTestStore } from '@/stores/listeningTestStore';
import { AB_COMPARISON_CONFIGS } from '@/types/listeningTest';
import type { AudioAttribute, PreferenceStrength } from '@/types/listeningTest';

interface ABComparisonStepProps {
  attribute: AudioAttribute;
}

/**
 * ABComparisonStep Component
 *
 * Main component for an A/B comparison test step.
 * Presents two audio tracks (balanced vs modified) and captures user preference.
 */
export function ABComparisonStep({ attribute }: ABComparisonStepProps) {
  const config = AB_COMPARISON_CONFIGS[attribute];

  // Store state and actions
  const {
    testSessionId,
    abTestSession,
    initializeComparison,
    recordTrackPlay,
    recordTrackStop,
    setUserChoice,
    setPreferenceStrength,
  } = useListeningTestStore();

  // Get current comparison result
  const comparison = abTestSession.comparisons[attribute];
  const selectedTrack = comparison?.userChoice || null;
  const preferenceStrength = comparison?.preferenceStrength || null;

  // Audio player
  const {
    isPlaying,
    isLoading,
    currentTrack,
    initialize,
    preloadForStep,
    playTrack,
    stop,
    getFrequencyData,
  } = useReferenceAudioPlayer(attribute, testSessionId || '');

  // Track play start time for duration tracking
  const playStartTimeRef = useRef<number | null>(null);

  // Initialize comparison and preload audio on mount
  useEffect(() => {
    const setup = async () => {
      // Initialize audio context
      await initialize();

      // Initialize comparison in store (with randomized A/B order)
      if (testSessionId) {
        initializeComparison(attribute);
        await preloadForStep(attribute, testSessionId);
      }
    };

    setup();

    // Cleanup on unmount
    return () => {
      stop();
    };
  }, [attribute, testSessionId, initialize, initializeComparison, preloadForStep, stop]);

  // Handle track play
  const handlePlayTrack = useCallback(
    (track: 'A' | 'B') => {
      // Record stop time for previous track if any
      if (currentTrack && playStartTimeRef.current) {
        const duration = Date.now() - playStartTimeRef.current;
        recordTrackStop(currentTrack, duration);
      }

      // Play new track
      playTrack(track);
      playStartTimeRef.current = Date.now();
      recordTrackPlay(track);
    },
    [currentTrack, playTrack, recordTrackPlay, recordTrackStop]
  );

  // Handle stop
  const handleStop = useCallback(() => {
    if (currentTrack && playStartTimeRef.current) {
      const duration = Date.now() - playStartTimeRef.current;
      recordTrackStop(currentTrack, duration);
    }
    stop();
    playStartTimeRef.current = null;
  }, [currentTrack, stop, recordTrackStop]);

  // Handle track selection
  const handleSelectTrack = useCallback(
    (track: 'A' | 'B') => {
      setUserChoice(attribute, track);
    },
    [attribute, setUserChoice]
  );

  // Handle preference strength change
  const handleStrengthChange = useCallback(
    (strength: PreferenceStrength | null) => {
      setPreferenceStrength(attribute, strength);
    },
    [attribute, setPreferenceStrength]
  );

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
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-3xl">{config.icon}</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            {config.title}
          </h2>
        </div>
        <p className="text-white/50 text-sm md:text-base">
          {config.subtitle}
        </p>
      </motion.div>

      {/* Question */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl md:text-2xl font-medium text-white/80 text-center mb-8"
      >
        Which sound do you prefer?
      </motion.h3>

      {/* A/B Player */}
      <ABTrackPlayer
        isPlaying={isPlaying}
        isLoading={isLoading}
        currentTrack={currentTrack}
        selectedTrack={selectedTrack}
        onPlayTrack={handlePlayTrack}
        onSelectTrack={handleSelectTrack}
        onStop={handleStop}
        getFrequencyData={getFrequencyData}
      />

      {/* Preference Strength (appears after selection) */}
      {selectedTrack && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 w-full max-w-md"
        >
          <PreferenceStrengthSelector
            value={preferenceStrength}
            onChange={handleStrengthChange}
          />
        </motion.div>
      )}

      {/* Keyboard hints */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex gap-4 text-xs text-white/30"
      >
        <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">A</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded">B</kbd> to play</span>
        <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space</kbd> to pause</span>
      </motion.div>
    </motion.div>
  );
}
