'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getReferenceAudioPlayer,
  disposeReferenceAudioPlayer,
  ReferenceAudioPlayer,
} from '@/lib/audio/ReferenceAudioPlayer';
import { getABTrackPaths, REFERENCE_AUDIO_PATHS } from '@/lib/audio/referenceAudioConfig';
import type { AudioAttribute } from '@/types/listeningTest';

interface ReferenceAudioPlayerState {
  isInitialized: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  currentTrack: 'A' | 'B' | null;
  error: string | null;
}

interface UseReferenceAudioPlayerReturn extends ReferenceAudioPlayerState {
  initialize: () => Promise<void>;
  preloadForStep: (attribute: AudioAttribute, sessionId: string) => Promise<void>;
  preloadAll: () => Promise<void>;
  playTrack: (track: 'A' | 'B') => void;
  stop: () => void;
  toggle: (track: 'A' | 'B') => void;
  getFrequencyData: () => Uint8Array;
  dispose: () => void;
  getCurrentTrackPaths: () => { trackA: string; trackB: string; balancedIsTrackA: boolean } | null;
}

/**
 * React hook for the Reference Audio Player
 *
 * Manages audio playback for A/B comparison tests.
 * Handles initialization, preloading, and playback state.
 */
export function useReferenceAudioPlayer(
  attribute: AudioAttribute | null,
  sessionId: string
): UseReferenceAudioPlayerReturn {
  const playerRef = useRef<ReferenceAudioPlayer | null>(null);
  const trackPathsRef = useRef<{
    trackA: string;
    trackB: string;
    balancedIsTrackA: boolean;
  } | null>(null);

  const [state, setState] = useState<ReferenceAudioPlayerState>({
    isInitialized: false,
    isLoading: false,
    isPlaying: false,
    currentTrack: null,
    error: null,
  });

  // Get or create player instance
  useEffect(() => {
    playerRef.current = getReferenceAudioPlayer();

    // Set up event listeners
    const player = playerRef.current;

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleStop = () => {
      setState((prev) => ({ ...prev, isPlaying: false, currentTrack: null }));
    };

    const handleError = ({ error }: { url: string; error: string }) => {
      setState((prev) => ({ ...prev, error }));
    };

    player.on('play', handlePlay);
    player.on('pause', handlePause);
    player.on('stop', handleStop);
    player.on('error', handleError);

    return () => {
      player.off('play', handlePlay);
      player.off('pause', handlePause);
      player.off('stop', handleStop);
      player.off('error', handleError);
    };
  }, []);

  // Update track paths when attribute or session changes
  useEffect(() => {
    if (attribute && sessionId) {
      trackPathsRef.current = getABTrackPaths(sessionId, attribute);
    } else {
      trackPathsRef.current = null;
    }
  }, [attribute, sessionId]);

  /**
   * Initialize the audio context
   */
  const initialize = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      await player.initialize();
      setState((prev) => ({ ...prev, isInitialized: true, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to initialize audio: ${error}`,
      }));
    }
  }, []);

  /**
   * Preload audio for a specific step
   */
  const preloadForStep = useCallback(
    async (attr: AudioAttribute, sessId: string) => {
      const player = playerRef.current;
      if (!player) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Ensure initialized
        if (!state.isInitialized) {
          await initialize();
        }

        // Get track paths for this step
        const paths = getABTrackPaths(sessId, attr);
        trackPathsRef.current = paths;

        // Preload both tracks
        await player.preloadAll([paths.trackA, paths.trackB]);

        setState((prev) => ({ ...prev, isLoading: false, error: null }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `Failed to load audio: ${error}`,
        }));
      }
    },
    [state.isInitialized, initialize]
  );

  /**
   * Preload all reference tracks
   */
  const preloadAll = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (!state.isInitialized) {
        await initialize();
      }

      const allPaths = Object.values(REFERENCE_AUDIO_PATHS);
      await player.preloadAll(allPaths);

      setState((prev) => ({ ...prev, isLoading: false, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Failed to load audio: ${error}`,
      }));
    }
  }, [state.isInitialized, initialize]);

  /**
   * Play a specific track (A or B)
   */
  const playTrack = useCallback((track: 'A' | 'B') => {
    const player = playerRef.current;
    const paths = trackPathsRef.current;

    if (!player || !paths) {
      console.error('Player not ready or paths not set');
      return;
    }

    const url = track === 'A' ? paths.trackA : paths.trackB;
    player.switchTo(url);
    setState((prev) => ({ ...prev, currentTrack: track, isPlaying: true }));
  }, []);

  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      player.stop();
      setState((prev) => ({ ...prev, currentTrack: null, isPlaying: false }));
    }
  }, []);

  /**
   * Toggle playback for a track
   */
  const toggle = useCallback(
    (track: 'A' | 'B') => {
      if (state.currentTrack === track && state.isPlaying) {
        const player = playerRef.current;
        if (player) {
          player.pause();
          setState((prev) => ({ ...prev, isPlaying: false }));
        }
      } else {
        playTrack(track);
      }
    },
    [state.currentTrack, state.isPlaying, playTrack]
  );

  /**
   * Get frequency data for visualization
   */
  const getFrequencyData = useCallback(() => {
    const player = playerRef.current;
    return player ? player.getFrequencyData() : new Uint8Array(0);
  }, []);

  /**
   * Get current track paths
   */
  const getCurrentTrackPaths = useCallback(() => {
    return trackPathsRef.current;
  }, []);

  /**
   * Dispose the audio player
   */
  const dispose = useCallback(() => {
    disposeReferenceAudioPlayer();
    playerRef.current = null;
    setState({
      isInitialized: false,
      isLoading: false,
      isPlaying: false,
      currentTrack: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    initialize,
    preloadForStep,
    preloadAll,
    playTrack,
    stop,
    toggle,
    getFrequencyData,
    dispose,
    getCurrentTrackPaths,
  };
}

/**
 * Hook to clean up audio player on unmount
 */
export function useReferenceAudioCleanup(): void {
  useEffect(() => {
    return () => {
      disposeReferenceAudioPlayer();
    };
  }, []);
}
