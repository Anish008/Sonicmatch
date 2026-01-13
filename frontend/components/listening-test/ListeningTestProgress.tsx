'use client';

/**
 * ListeningTestProgress
 *
 * Visual progress indicator for the listening test wizard.
 * Shows step icons with completion states and animated transitions.
 */

import { motion } from 'framer-motion';
import { STEP_INFO } from '@/types/listeningTest';

interface ListeningTestProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function ListeningTestProgress({
  currentStep,
  totalSteps,
}: ListeningTestProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      {/* Progress bar */}
      <div className="relative h-1 bg-white/10 rounded-full overflow-hidden mb-6">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-sonic-pink to-sonic-coral rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {STEP_INFO.map((step) => {
          const isComplete = step.index < currentStep;
          const isActive = step.index === currentStep;
          const isPending = step.index > currentStep;

          return (
            <div
              key={step.step}
              className="flex flex-col items-center gap-2"
            >
              {/* Step circle */}
              <motion.div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  text-lg transition-colors
                  ${isActive ? 'bg-sonic-pink/20 border-2 border-sonic-pink' : ''}
                  ${isComplete ? 'bg-sonic-pink' : ''}
                  ${isPending ? 'bg-white/5 border border-white/20' : ''}
                `}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {/* Glow effect for active step */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-sonic-pink/30 blur-md -z-10"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Icon or checkmark */}
                {isComplete ? (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span
                    className={`
                      ${isActive ? 'text-sonic-pink' : ''}
                      ${isPending ? 'text-white/40' : ''}
                    `}
                  >
                    {step.icon}
                  </span>
                )}
              </motion.div>

              {/* Step label (hidden on mobile) */}
              <span
                className={`
                  hidden md:block text-xs font-medium
                  ${isActive ? 'text-white' : ''}
                  ${isComplete ? 'text-sonic-pink' : ''}
                  ${isPending ? 'text-white/40' : ''}
                `}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
