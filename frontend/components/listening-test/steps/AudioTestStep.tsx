'use client';

/**
 * AudioTestStep
 *
 * Generic audio test step component used for Bass, Mids, Treble, Soundstage, and Detail tests.
 * Plays reference audio and allows real-time DSP adjustment via slider.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useListeningTestStore } from '@/stores/listeningTestStore';
import { DSPSlider } from '@/components/listening-test/DSPSlider';
import { AudioPlayer } from '@/components/listening-test/AudioPlayer';
import type { AudioStepConfig, ListeningTestPreferences } from '@/types/listeningTest';

interface AudioTestStepProps {
  stepConfig: AudioStepConfig;
  audioEngine: {
    isInitialized: boolean;
    isLoading: boolean;
    isPlaying: boolean;
    initialize: () => Promise<void>;
    loadAudio: (url: string) => Promise<void>;
    play: () => void;
    pause: () => void;
    toggle: () => void;
    setVolume: (volume: number) => void;
    setParameter: (key: keyof ListeningTestPreferences, value: number) => void;
    getFrequencyData: () => Uint8Array;
  };
}

export function AudioTestStep({ stepConfig, audioEngine }: AudioTestStepProps) {
  const [showTip, setShowTip] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioEngineRef = useRef(audioEngine);
  const loadedFileRef = useRef<string | null>(null);

  // Keep ref updated
  audioEngineRef.current = audioEngine;

  // Store state
  const preferences = useListeningTestStore((s) => s.preferences);
  const setPreference = useListeningTestStore((s) => s.setPreference);
  const volume = useListeningTestStore((s) => s.volume);
  const setVolume = useListeningTestStore((s) => s.setVolume);
  const selectedHeadphone = useListeningTestStore((s) => s.selectedHeadphone);

  // Get current value for this step's parameter
  const currentValue = preferences[stepConfig.id as keyof typeof preferences];

  // Load audio when step mounts - only depends on audioFile
  useEffect(() => {
    // Skip if already loaded this file
    if (loadedFileRef.current === stepConfig.audioFile) {
      return;
    }

    let isCancelled = false;

    const loadStepAudio = async () => {
      const engine = audioEngineRef.current;
      try {
        if (!engine.isInitialized) {
          await engine.initialize();
        }

        if (isCancelled) return;

        await engine.loadAudio(stepConfig.audioFile);

        if (isCancelled) return;

        loadedFileRef.current = stepConfig.audioFile;
        setAudioLoaded(true);

        // Auto-play after loading
        setTimeout(() => {
          if (!isCancelled) {
            engine.play();
          }
        }, 300);
      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    };

    loadStepAudio();

    // Cleanup: stop audio when leaving step
    return () => {
      isCancelled = true;
      audioEngineRef.current.pause();
      loadedFileRef.current = null;
    };
  }, [stepConfig.audioFile]);

  // Show educational tip after a delay
  useEffect(() => {
    const timer = setTimeout(() => setShowTip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback(
    (value: number) => {
      setPreference(stepConfig.id as keyof ListeningTestPreferences, value);
      audioEngine.setParameter(stepConfig.id as keyof ListeningTestPreferences, value);
    },
    [stepConfig.id, setPreference, audioEngine]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      audioEngine.setVolume(newVolume);
    },
    [setVolume, audioEngine]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                     bg-gradient-to-br from-sonic-pink/20 to-sonic-coral/20
                     border border-sonic-pink/30 mb-4"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          <span className="text-3xl">{stepConfig.icon}</span>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {stepConfig.title}
        </motion.h2>

        <motion.p
          className="text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {stepConfig.description}
        </motion.p>
      </div>

      {/* Audio Player */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <AudioPlayer
          isPlaying={audioEngine.isPlaying}
          isLoading={audioEngine.isLoading}
          onToggle={audioEngine.toggle}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          disabled={!audioLoaded}
        />
      </motion.div>

      {/* Audio Visualizer Placeholder */}
      <motion.div
        className="h-24 rounded-xl bg-white/5 border border-white/10 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AudioVisualizer
          isPlaying={audioEngine.isPlaying}
          getFrequencyData={audioEngine.getFrequencyData}
        />
      </motion.div>

      {/* DSP Slider */}
      <motion.div
        className="card-glass p-6 rounded-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <DSPSlider
          value={currentValue}
          onChange={handleSliderChange}
          leftLabel={stepConfig.leftLabel}
          rightLabel={stepConfig.rightLabel}
          showValue
        />
      </motion.div>

      {/* Educational Tip */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: showTip ? 1 : 0,
          height: showTip ? 'auto' : 0,
        }}
        transition={{ delay: 0.2 }}
        className="overflow-hidden"
      >
        <div className="p-4 rounded-xl bg-sonic-pink/10 border border-sonic-pink/20">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-sm font-medium text-sonic-pink mb-1">
                What to listen for
              </p>
              <p className="text-sm text-white/70">{stepConfig.educationalTip}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Headphone compensation indicator */}
      {selectedHeadphone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-white/40"
        >
          Compensating for: {selectedHeadphone.fullName}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Simple audio visualizer component
 */
function AudioVisualizer({
  isPlaying,
  getFrequencyData,
}: {
  isPlaying: boolean;
  getFrequencyData: () => Uint8Array;
}) {
  const [bars, setBars] = useState<number[]>(new Array(32).fill(0));

  useEffect(() => {
    if (!isPlaying) {
      // Fade out when not playing
      setBars((prev) => prev.map((v) => v * 0.9));
      return;
    }

    let animationId: number;

    const updateBars = () => {
      const data = getFrequencyData();
      if (data.length > 0) {
        // Sample 32 bars from frequency data
        const step = Math.floor(data.length / 32);
        const newBars = Array.from({ length: 32 }, (_, i) => {
          const value = data[i * step] || 0;
          return value / 255; // Normalize to 0-1
        });
        setBars(newBars);
      }
      animationId = requestAnimationFrame(updateBars);
    };

    animationId = requestAnimationFrame(updateBars);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, getFrequencyData]);

  return (
    <div className="h-full flex items-end justify-center gap-1 px-4 py-2">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-t bg-gradient-to-t from-sonic-pink to-sonic-coral"
          animate={{
            height: `${Math.max(4, height * 80)}%`,
            opacity: isPlaying ? 0.6 + height * 0.4 : 0.2,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 20,
          }}
        />
      ))}
    </div>
  );
}
