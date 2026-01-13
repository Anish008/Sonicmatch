'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWizardStore, selectWizardProgress, selectCanProceed } from '@/stores';
import { Navigation } from '@/components/layout/Navigation';
import { WizardProgress } from '@/components/wizard/WizardProgress';
import { GenreStep } from '@/components/wizard/steps/GenreStep';
import { ArtistStep } from '@/components/wizard/steps/ArtistStep';
import { SoundStep } from '@/components/wizard/steps/SoundStep';
import { UseCaseStep } from '@/components/wizard/steps/UseCaseStep';
import { BudgetStep } from '@/components/wizard/steps/BudgetStep';
import { FeaturesStep } from '@/components/wizard/steps/FeaturesStep';
import { useHydration } from '@/hooks/useHydration';

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

const STEP_TITLES = [
  { title: 'Your Music', subtitle: 'What genres define your taste?' },
  { title: 'Your Artists', subtitle: 'Who do you listen to most?' },
  { title: 'Your Sound', subtitle: 'How do you like your audio?' },
  { title: 'Your Purpose', subtitle: 'How will you use these headphones?' },
  { title: 'Your Budget', subtitle: 'What\'s your investment range?' },
  { title: 'Your Features', subtitle: 'Any specific requirements?' },
];

export default function WizardPage() {
  const router = useRouter();
  const isHydrated = useHydration();
  const [direction, setDirection] = React.useState(0);
  const [prevStep, setPrevStepNum] = React.useState(0);

  const {
    currentStep,
    totalSteps,
    preferences,
    nextStep,
    prevStep: goToPrevStep,
    completeWizard,
  } = useWizardStore();

  const progress = useWizardStore(selectWizardProgress);
  const canProceed = useWizardStore(selectCanProceed);

  // Track direction for animation based on step change
  React.useEffect(() => {
    if (currentStep > prevStep) {
      setDirection(1); // Going forward
    } else if (currentStep < prevStep) {
      setDirection(-1); // Going backward
    }
    setPrevStepNum(currentStep);
  }, [currentStep, prevStep]);

  const handleContinue = useCallback(() => {
    if (currentStep === totalSteps - 1) {
      completeWizard();
      router.push('/results');
    } else {
      nextStep();
    }
  }, [currentStep, totalSteps, completeWizard, nextStep, router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && canProceed && currentStep < totalSteps - 1) {
        nextStep();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        goToPrevStep();
      } else if (e.key === 'Enter' && canProceed) {
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canProceed, currentStep, totalSteps, nextStep, goToPrevStep, handleContinue]);
  
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <GenreStep />;
      case 1:
        return <ArtistStep />;
      case 2:
        return <SoundStep />;
      case 3:
        return <UseCaseStep />;
      case 4:
        return <BudgetStep />;
      case 5:
        return <FeaturesStep />;
      default:
        return null;
    }
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-sonic-black flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sonic-black relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255, 45, 85, 0.08), transparent),
              radial-gradient(ellipse 40% 30% at 90% 50%, rgba(255, 85, 120, 0.05), transparent)
            `,
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      <Navigation minimal />
      
      <main className="relative z-10 pt-24 pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress bar */}
          <WizardProgress 
            currentStep={currentStep} 
            totalSteps={totalSteps}
            progress={progress}
          />
          
          {/* Step header */}
          <motion.div
            key={`header-${currentStep}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12 mt-8"
          >
            <motion.span
              className="inline-block text-sm font-medium text-sonic-pink mb-3 
                         tracking-widest uppercase"
            >
              Step {currentStep + 1} of {totalSteps}
            </motion.span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
              {STEP_TITLES[currentStep].title}
            </h1>
            <p className="text-lg text-white/50">
              {STEP_TITLES[currentStep].subtitle}
            </p>
          </motion.div>
          
          {/* Step content with animation */}
          <div className="relative min-h-[400px]">
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
      </main>
      
      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-t from-sonic-black via-sonic-black to-transparent pt-8 pb-6 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Back button */}
            <motion.button
              onClick={goToPrevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl
                         text-white/60 hover:text-white
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              <span className="font-medium">Back</span>
            </motion.button>
            
            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep
                      ? 'bg-sonic-pink'
                      : i < currentStep
                      ? 'bg-white/40'
                      : 'bg-white/10'
                  }`}
                  animate={{
                    scale: i === currentStep ? 1.2 : 1,
                  }}
                />
              ))}
            </div>
            
            {/* Continue button */}
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
              <span>
                {currentStep === totalSteps - 1 ? 'Find My Match' : 'Continue'}
              </span>
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    <path d="m9 18 6-6-6-6" />
                  </>
                ) : (
                  <>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </>
                )}
              </motion.svg>
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Keyboard hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 
                   hidden md:flex items-center gap-4 text-white/30 text-sm"
      >
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 rounded bg-white/10 text-xs">←</kbd>
          <kbd className="px-2 py-1 rounded bg-white/10 text-xs">→</kbd>
          to navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 rounded bg-white/10 text-xs">Enter</kbd>
          to continue
        </span>
      </motion.div>
    </div>
  );
}
