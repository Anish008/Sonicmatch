'use client';

/**
 * Find My Sound - Perceptual Audio Questionnaire
 *
 * A/B comparison-based sound profile discovery.
 * Users compare balanced vs modified audio to determine preferences.
 */

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  useListeningTestStore,
  selectCurrentStepType,
  selectCanProceed,
  selectCurrentABAttribute,
} from '@/stores/listeningTestStore';
import { useReferenceAudioCleanup } from '@/hooks/useReferenceAudioPlayer';
import { disposeReferenceAudioPlayer, getReferenceAudioPlayer } from '@/lib/audio/ReferenceAudioPlayer';
import { ListeningTestProgress } from '@/components/listening-test/ListeningTestProgress';
import { HeadphoneSelectStep } from '@/components/listening-test/steps/HeadphoneSelectStep';
import { ABComparisonStep } from '@/components/listening-test/steps/ABComparisonStep';
import { AttributeRankingStep } from '@/components/listening-test/steps/AttributeRankingStep';
import { ProfileResultStep } from '@/components/listening-test/steps/ProfileResultStep';
import type { AudioAttribute } from '@/types/listeningTest';

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.98,
  }),
};

const stepTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export default function FindMySoundPage() {
  const router = useRouter();
  const prevStepRef = useRef(0);

  // Store state
  const currentStep = useListeningTestStore((s) => s.currentStep);
  const totalSteps = useListeningTestStore((s) => s.totalSteps);
  const nextStep = useListeningTestStore((s) => s.nextStep);
  const prevStep = useListeningTestStore((s) => s.prevStep);
  const startSession = useListeningTestStore((s) => s.startSession);
  const testSessionId = useListeningTestStore((s) => s.testSessionId);
  const calculateFinalPreferences = useListeningTestStore((s) => s.calculateFinalPreferences);

  // Derived state
  const stepType = useListeningTestStore(selectCurrentStepType);
  const canProceed = useListeningTestStore(selectCanProceed);
  const currentAttribute = useListeningTestStore(selectCurrentABAttribute);

  // Cleanup audio on unmount
  useReferenceAudioCleanup();

  // Track step direction for animations
  const direction = currentStep > prevStepRef.current ? 1 : -1;
  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);

  // Initialize session on mount
  useEffect(() => {
    if (!testSessionId) {
      startSession();
    }
  }, [testSessionId, startSession]);

  // Calculate final preferences when reaching results step
  useEffect(() => {
    if (stepType === 'result') {
      calculateFinalPreferences();
    }
  }, [stepType, calculateFinalPreferences]);

  // Handle continue button
  const handleContinue = useCallback(() => {
    // Stop audio before transitioning
    const player = getReferenceAudioPlayer();
    player.stop();

    if (currentStep === totalSteps - 1) {
      // Last step - navigate to recommendations
      router.push('/wizard');
    } else {
      nextStep();
    }
  }, [currentStep, totalSteps, nextStep, router]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const player = getReferenceAudioPlayer();
      player.stop();
      prevStep();
    }
  }, [currentStep, prevStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          if (canProceed && currentStep < totalSteps - 1) {
            handleContinue();
          }
          break;

        case 'ArrowLeft':
          if (currentStep > 0) {
            handleBack();
          }
          break;

        case ' ':
        case 'Spacebar':
          // Toggle audio playback
          e.preventDefault();
          const player = getReferenceAudioPlayer();
          const state = player.getState();
          if (state.isPlaying) {
            player.pause();
          }
          break;

        case 'a':
        case 'A':
          // Play track A (only on A/B steps)
          if (currentAttribute) {
            e.preventDefault();
            // This will be handled by the ABComparisonStep component
            // We could dispatch a custom event here if needed
          }
          break;

        case 'b':
        case 'B':
          // Play track B (only on A/B steps)
          if (currentAttribute) {
            e.preventDefault();
            // This will be handled by the ABComparisonStep component
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canProceed, currentStep, totalSteps, handleContinue, handleBack, currentAttribute]);

  // Render current step
  const renderStep = () => {
    switch (stepType) {
      case 'headphone-select':
        return <HeadphoneSelectStep />;

      case 'ab-bass':
        return <ABComparisonStep attribute="bass" />;
      case 'ab-mids':
        return <ABComparisonStep attribute="mids" />;
      case 'ab-treble':
        return <ABComparisonStep attribute="treble" />;
      case 'ab-soundstage':
        return <ABComparisonStep attribute="soundstage" />;
      case 'ab-detail':
        return <ABComparisonStep attribute="detail" />;

      case 'refinement':
        return <AttributeRankingStep />;

      case 'result':
        return <ProfileResultStep />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-sonic-black text-white overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sonic-pink/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sonic-coral/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-8">
          <motion.h1
            className="text-3xl md:text-4xl font-display font-bold mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Find Your <span className="text-gradient-pink">Sound</span>
          </motion.h1>
          <motion.p
            className="text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Compare sounds to discover your perfect audio profile
          </motion.p>
        </header>

        {/* Progress */}
        <ListeningTestProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
        />

        {/* Step Content */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="w-full"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <footer className="flex justify-between items-center py-6">
          {/* Back Button */}
          <motion.button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl
                     text-white/70 hover:text-white
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all"
            whileHover={{ x: currentStep > 0 ? -4 : 0 }}
            whileTap={{ scale: currentStep > 0 ? 0.98 : 1 }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </motion.button>

          {/* Step indicator */}
          <div className="text-white/40 text-sm">
            Step {currentStep + 1} of {totalSteps}
          </div>

          {/* Continue Button */}
          {currentStep < totalSteps - 1 ? (
            <motion.button
              onClick={handleContinue}
              disabled={!canProceed}
              className="group flex items-center gap-2 px-8 py-3 rounded-xl
                       font-semibold
                       bg-gradient-to-r from-sonic-pink to-sonic-red
                       text-white shadow-lg shadow-sonic-pink/20
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
              whileHover={{ scale: canProceed ? 1.02 : 1 }}
              whileTap={{ scale: canProceed ? 0.98 : 1 }}
            >
              <span>Continue</span>
              <motion.svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                animate={{ x: canProceed ? [0, 4, 0] : 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </motion.svg>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => router.push('/wizard')}
              className="group flex items-center gap-2 px-8 py-3 rounded-xl
                       font-semibold
                       bg-gradient-to-r from-sonic-pink to-sonic-red
                       text-white shadow-lg shadow-sonic-pink/20
                       transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Use This Profile</span>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.button>
          )}
        </footer>
      </div>
    </div>
  );
}
