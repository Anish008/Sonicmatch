'use client';

import { motion } from 'framer-motion';
import type { PreferenceStrength } from '@/types/listeningTest';

interface PreferenceStrengthSelectorProps {
  value: PreferenceStrength | null;
  onChange: (strength: PreferenceStrength | null) => void;
  disabled?: boolean;
}

const STRENGTH_OPTIONS: {
  value: PreferenceStrength;
  label: string;
  description: string;
}[] = [
  {
    value: 'slight',
    label: 'Slight',
    description: 'Barely noticeable',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Clear preference',
  },
  {
    value: 'strong',
    label: 'Strong',
    description: 'Very obvious',
  },
];

/**
 * PreferenceStrengthSelector Component
 *
 * Three-option pill selector for indicating how strongly
 * the user prefers one track over another.
 */
export function PreferenceStrengthSelector({
  value,
  onChange,
  disabled = false,
}: PreferenceStrengthSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <p className="text-sm text-white/50 text-center mb-3">
        How strong is your preference? <span className="text-white/30">(optional)</span>
      </p>

      <div className="flex justify-center gap-2 md:gap-3">
        {STRENGTH_OPTIONS.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => onChange(value === option.value ? null : option.value)}
            disabled={disabled}
            className={`
              px-4 py-2 md:px-5 md:py-2.5 rounded-full
              text-sm font-medium
              transition-all duration-200
              ${
                value === option.value
                  ? 'bg-sonic-pink text-white shadow-md shadow-sonic-pink/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
          >
            {option.label}
          </motion.button>
        ))}
      </div>

      {/* Selected description */}
      {value && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-white/40 text-center mt-2"
        >
          {STRENGTH_OPTIONS.find((o) => o.value === value)?.description}
        </motion.p>
      )}
    </motion.div>
  );
}
