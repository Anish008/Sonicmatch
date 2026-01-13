/**
 * useAudioEngine Hook
 *
 * React hook for managing AudioEngine lifecycle and state.
 * Provides a clean interface for components to control audio playback and DSP.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioEngine, getAudioEngine, disposeAudioEngine } from '@/lib/audio/AudioEngine';
import type { DSPParameters, CompensationEQ } from '@/types/listeningTest';

interface UseAudioEngineState {
  isInitialized: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  error: string | null;
  currentAudioFile: string | null;
  duration: number;
}

interface UseAudioEngineControls {
  initialize: () => Promise<void>;
  loadAudio: (url: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  setParameters: (params: Partial<DSPParameters>) => void;
  setParameter: (key: keyof DSPParameters, value: number) => void;
  setHeadphoneCompensation: (compensation: CompensationEQ | null) => void;
  getFrequencyData: () => Uint8Array;
  getTimeDomainData: () => Uint8Array;
}

interface UseAudioEngineReturn extends UseAudioEngineState, UseAudioEngineControls {
  engine: AudioEngine | null;
}

export function useAudioEngine(): UseAudioEngineReturn {
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<UseAudioEngineState>({
    isInitialized: false,
    isLoading: false,
    isPlaying: false,
    isPaused: false,
    error: null,
    currentAudioFile: null,
    duration: 0,
  });

  // Get or create engine instance
  useEffect(() => {
    engineRef.current = getAudioEngine();

    // Set up event listeners
    const engine = engineRef.current;

    const handleStateChange = (data: unknown) => {
      const stateData = data as Record<string, unknown>;
      setState((prev) => ({
        ...prev,
        isInitialized: stateData.initialized as boolean ?? prev.isInitialized,
        isPlaying: stateData.playing as boolean ?? prev.isPlaying,
        isPaused: stateData.paused as boolean ?? prev.isPaused,
        isLoading: stateData.loading as boolean ?? prev.isLoading,
      }));
    };

    const handleError = (error: unknown) => {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Audio error occurred',
      }));
    };

    const handleLoad = (data: unknown) => {
      const loadData = data as { duration: number };
      setState((prev) => ({
        ...prev,
        duration: loadData.duration,
      }));
    };

    engine.on('statechange', handleStateChange);
    engine.on('error', handleError);
    engine.on('load', handleLoad);

    return () => {
      engine.off('statechange', handleStateChange);
      engine.off('error', handleError);
      engine.off('load', handleLoad);
    };
  }, []);

  // Initialize audio context (must be called after user gesture)
  const initialize = useCallback(async () => {
    if (!engineRef.current) return;

    try {
      setState((prev) => ({ ...prev, error: null }));
      await engineRef.current.initialize();
      setState((prev) => ({ ...prev, isInitialized: true }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize audio',
      }));
      throw error;
    }
  }, []);

  // Load an audio file
  const loadAudio = useCallback(async (url: string) => {
    if (!engineRef.current) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      await engineRef.current.loadAudio(url);
      setState((prev) => ({ ...prev, isLoading: false, currentAudioFile: url }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio',
      }));
      throw error;
    }
  }, []);

  // Playback controls
  const play = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    engineRef.current?.toggle();
  }, []);

  // Volume control
  const setVolume = useCallback((volume: number) => {
    engineRef.current?.setVolume(volume);
  }, []);

  // DSP controls
  const setParameters = useCallback((params: Partial<DSPParameters>) => {
    engineRef.current?.setParameters(params);
  }, []);

  const setParameter = useCallback((key: keyof DSPParameters, value: number) => {
    engineRef.current?.setParameter(key, value);
  }, []);

  const setHeadphoneCompensation = useCallback((compensation: CompensationEQ | null) => {
    engineRef.current?.setHeadphoneCompensation(compensation);
  }, []);

  // Visualization data
  const getFrequencyData = useCallback(() => {
    return engineRef.current?.getFrequencyData() || new Uint8Array(0);
  }, []);

  const getTimeDomainData = useCallback(() => {
    return engineRef.current?.getTimeDomainData() || new Uint8Array(0);
  }, []);

  return {
    engine: engineRef.current,
    ...state,
    initialize,
    loadAudio,
    play,
    pause,
    stop,
    toggle,
    setVolume,
    setParameters,
    setParameter,
    setHeadphoneCompensation,
    getFrequencyData,
    getTimeDomainData,
  };
}

/**
 * Hook for audio visualization animation frame
 */
export function useAudioVisualization(
  getFrequencyData: () => Uint8Array,
  isPlaying: boolean
): Uint8Array {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateVisualization = () => {
      const data = getFrequencyData();
      setFrequencyData(new Uint8Array(data));
      animationRef.current = requestAnimationFrame(updateVisualization);
    };

    animationRef.current = requestAnimationFrame(updateVisualization);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, getFrequencyData]);

  return frequencyData;
}

/**
 * Cleanup hook for disposing audio engine on unmount
 */
export function useAudioEngineCleanup(): void {
  useEffect(() => {
    return () => {
      disposeAudioEngine();
    };
  }, []);
}
