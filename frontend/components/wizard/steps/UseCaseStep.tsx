'use client';

import { motion } from 'framer-motion';
import { useWizardStore, type UseCase } from '@/stores';

const USE_CASES = [
  {
    id: 'casual' as UseCase,
    name: 'Everyday Listening',
    description: 'Music at home, commuting, relaxing',
    emoji: '🎧',
    details: ['Comfort priority', 'Versatile sound', 'Good value'],
  },
  {
    id: 'travel' as UseCase,
    name: 'Travel & Commute',
    description: 'Planes, trains, and daily transit',
    emoji: '✈️',
    details: ['Noise cancellation', 'Portable design', 'Long battery'],
  },
  {
    id: 'gaming' as UseCase,
    name: 'Gaming',
    description: 'Immersive gameplay and competitive edge',
    emoji: '🎮',
    details: ['Wide soundstage', 'Precise imaging', 'Low latency'],
  },
  {
    id: 'studio' as UseCase,
    name: 'Music Production',
    description: 'Mixing, mastering, critical listening',
    emoji: '🎚️',
    details: ['Flat response', 'High accuracy', 'Revealing detail'],
  },
  {
    id: 'audiophile' as UseCase,
    name: 'Audiophile',
    description: 'Pure listening enjoyment, no compromise',
    emoji: '🎼',
    details: ['Premium drivers', 'Natural timbre', 'Holographic staging'],
  },
  {
    id: 'workout' as UseCase,
    name: 'Workout & Sports',
    description: 'Active lifestyle and exercise',
    emoji: '🏃',
    details: ['Secure fit', 'Sweat resistant', 'Motivating bass'],
  },
  {
    id: 'office' as UseCase,
    name: 'Office & Calls',
    description: 'Focus work and video meetings',
    emoji: '💼',
    details: ['Clear microphone', 'Comfort for hours', 'Professional look'],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function UseCaseStep() {
  const { preferences, updatePreferences, toggleUseCase } = useWizardStore();
  const { primaryUseCase, secondaryUseCases } = preferences;

  const handlePrimarySelect = (useCase: UseCase) => {
    updatePreferences({ primaryUseCase: useCase });
  };

  return (
    <div className="space-y-8">
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-white/50"
      >
        Select your primary use, then optionally add secondary uses
      </motion.p>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {USE_CASES.map((useCase) => {
          const isPrimary = primaryUseCase === useCase.id;
          const isSecondary = secondaryUseCases.includes(useCase.id);
          const isSelected = isPrimary || isSecondary;

          return (
            <motion.button
              key={useCase.id}
              variants={itemVariants}
              onClick={() => isPrimary ? null : isSecondary ? toggleUseCase(useCase.id) : handlePrimarySelect(useCase.id)}
              className={`
                group relative p-6 rounded-2xl text-left transition-all duration-300
                ${isPrimary
                  ? 'bg-sonic-pink/20 ring-2 ring-sonic-pink'
                  : isSecondary
                  ? 'bg-white/10 ring-1 ring-white/30'
                  : 'bg-white/[0.03] ring-1 ring-white/10 hover:bg-white/[0.06] hover:ring-white/20'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{useCase.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{useCase.name}</h3>
                    {isPrimary && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-sonic-pink/30 text-sonic-pink rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50 mb-3">{useCase.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {useCase.details.map((detail) => (
                      <span
                        key={detail}
                        className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/40"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {!isPrimary && isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUseCase(useCase.id);
                  }}
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10"
                >
                  <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {primaryUseCase && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-white/40"
        >
          Click other cards to add secondary uses (optional)
        </motion.p>
      )}
    </div>
  );
}
