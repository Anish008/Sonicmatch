'use client';

import { motion } from 'framer-motion';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

const STEP_ICONS = ['🎵', '🎤', '🎚️', '🎯', '💰', '⚙️'];

export function WizardProgress({ currentStep, totalSteps, progress }: WizardProgressProps) {
  // Calculate progress to align with step icons (justify-between positioning)
  const alignedProgress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="relative px-4">
      {/* Progress bar background */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral"
          initial={{ width: 0 }}
          animate={{ width: `${alignedProgress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
      
      {/* Step indicators */}
      <div className="absolute -top-3 left-0 right-0 flex justify-between px-4">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <motion.div
              key={index}
              className="relative -ml-4"
            >
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-sm font-medium transition-colors duration-300
                  ${isActive
                    ? 'bg-sonic-pink text-white shadow-lg shadow-sonic-pink/30'
                    : isComplete
                    ? 'bg-sonic-pink/80 text-white shadow-lg shadow-sonic-pink/40'
                    : 'bg-gray-700 text-white'
                  }
                `}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {isComplete ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{STEP_ICONS[index]}</span>
                )}
              </motion.div>

              {/* Glow effect for active and completed steps */}
              {(isActive || isComplete) && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-sonic-pink/30 blur-md -z-10"
                  animate={{ scale: isActive ? [1, 1.2, 1] : 1.1 }}
                  transition={{ duration: isActive ? 2 : 0.3, repeat: isActive ? Infinity : 0 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
