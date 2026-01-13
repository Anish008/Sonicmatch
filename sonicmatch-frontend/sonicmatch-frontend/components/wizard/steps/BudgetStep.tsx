'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '@/stores';

const BUDGET_TIERS = [
  { min: 0, max: 100, label: 'Budget', description: 'Great value picks' },
  { min: 100, max: 300, label: 'Mid-Range', description: 'Sweet spot for quality' },
  { min: 300, max: 600, label: 'Premium', description: 'Serious audio gear' },
  { min: 600, max: 2000, label: 'Flagship', description: 'No compromises' },
];

const PRICE_MARKS = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000];

export function BudgetStep() {
  const { preferences, setBudget } = useWizardStore();
  const { budgetMin, budgetMax } = preferences;

  const [localMin, setLocalMin] = useState(budgetMin);
  const [localMax, setLocalMax] = useState(budgetMax);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);

  // Sync local state with store on mount and when store changes
  useEffect(() => {
    setLocalMin(budgetMin);
    setLocalMax(budgetMax);
  }, [budgetMin, budgetMax]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), localMax - 50);
    setLocalMin(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), localMin + 50);
    setLocalMax(value);
  };

  const handleDragEnd = () => {
    setBudget(localMin, localMax);
    setIsDragging(null);
  };

  const minPercent = (localMin / 2000) * 100;
  const maxPercent = (localMax / 2000) * 100;

  // Calculate which slider should be on top based on positions and dragging state
  // The slider being dragged should always be on top
  // Otherwise, use the midpoint between the two values to determine priority
  const minZIndex = useMemo(() => {
    if (isDragging === 'min') return 30;
    if (isDragging === 'max') return 20;
    // When not dragging, min slider gets priority in the left region
    return 20;
  }, [isDragging]);

  const maxZIndex = useMemo(() => {
    if (isDragging === 'max') return 30;
    if (isDragging === 'min') return 20;
    // When not dragging, max slider gets priority in the right region
    return 25;
  }, [isDragging]);

  const activeTier = useMemo(() => {
    return BUDGET_TIERS.find(
      (tier) => localMin >= tier.min && localMax <= tier.max
    ) || BUDGET_TIERS.find(
      (tier) => localMin < tier.max && localMax > tier.min
    );
  }, [localMin, localMax]);

  return (
    <div className="space-y-10">
      {/* Budget display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-baseline gap-2">
          <span className="text-5xl md:text-6xl font-display font-bold text-white">
            ${localMin}
          </span>
          <span className="text-2xl text-white/30 mx-2">–</span>
          <span className="text-5xl md:text-6xl font-display font-bold text-gradient-pink">
            ${localMax}
          </span>
        </div>
        {activeTier && (
          <motion.p
            key={activeTier.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-white/50"
          >
            <span className="text-sonic-pink font-medium">{activeTier.label}</span>
            {' · '}
            {activeTier.description}
          </motion.p>
        )}
      </motion.div>

      {/* Range slider */}
      <div className="relative px-4">
        {/* Track background */}
        <div className="h-3 rounded-full bg-white/10">
          {/* Active range */}
          <motion.div
            className="absolute h-3 rounded-full bg-gradient-to-r from-sonic-pink to-sonic-coral"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
            }}
            animate={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Price marks */}
        <div className="absolute -bottom-6 left-0 right-0">
          {PRICE_MARKS.map((mark) => {
            const markPercent = (mark / 2000) * 100;
            return (
              <span
                key={mark}
                className="absolute text-xs text-white/20 tabular-nums"
                style={{
                  left: `${markPercent}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                ${mark}
              </span>
            );
          })}
        </div>

        {/* Min slider - restrict to left portion */}
        <input
          type="range"
          min="0"
          max="2000"
          step="25"
          value={localMin}
          onChange={handleMinChange}
          onMouseDown={() => setIsDragging('min')}
          onMouseUp={handleDragEnd}
          onTouchStart={() => setIsDragging('min')}
          onTouchEnd={handleDragEnd}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
          style={{
            pointerEvents: 'auto',
            zIndex: minZIndex,
            clipPath: `inset(0 ${100 - (minPercent + maxPercent) / 2}% 0 0)`
          }}
        />

        {/* Max slider - restrict to right portion */}
        <input
          type="range"
          min="0"
          max="2000"
          step="25"
          value={localMax}
          onChange={handleMaxChange}
          onMouseDown={() => setIsDragging('max')}
          onMouseUp={handleDragEnd}
          onTouchStart={() => setIsDragging('max')}
          onTouchEnd={handleDragEnd}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
          style={{
            pointerEvents: 'auto',
            zIndex: maxZIndex,
            clipPath: `inset(0 0 0 ${(minPercent + maxPercent) / 2}%)`
          }}
        />

        {/* Min thumb */}
        <motion.div
          className={`
            absolute top-1/2 w-6 h-6 -mt-3 -ml-3 rounded-full bg-white shadow-lg
            pointer-events-none z-30
            ${isDragging === 'min' ? 'ring-4 ring-sonic-pink/40' : ''}
          `}
          style={{ left: `${minPercent}%` }}
          animate={{
            scale: isDragging === 'min' ? 1.2 : 1,
            boxShadow: isDragging === 'min' 
              ? '0 0 20px rgba(255, 45, 85, 0.5)' 
              : '0 4px 10px rgba(0, 0, 0, 0.3)',
          }}
        />

        {/* Max thumb */}
        <motion.div
          className={`
            absolute top-1/2 w-6 h-6 -mt-3 -ml-3 rounded-full bg-white shadow-lg
            pointer-events-none z-30
            ${isDragging === 'max' ? 'ring-4 ring-sonic-pink/40' : ''}
          `}
          style={{ left: `${maxPercent}%` }}
          animate={{
            scale: isDragging === 'max' ? 1.2 : 1,
            boxShadow: isDragging === 'max' 
              ? '0 0 20px rgba(255, 45, 85, 0.5)' 
              : '0 4px 10px rgba(0, 0, 0, 0.3)',
          }}
        />
      </div>

      {/* Budget tier quick select */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8"
      >
        {BUDGET_TIERS.map((tier) => {
          const isActive = localMin === tier.min && localMax === tier.max;
          return (
            <button
              key={tier.label}
              onClick={() => {
                setLocalMin(tier.min);
                setLocalMax(tier.max);
                setBudget(tier.min, tier.max);
              }}
              className={`
                p-4 rounded-xl text-left transition-all duration-200
                ${isActive
                  ? 'bg-sonic-pink/20 ring-1 ring-sonic-pink/50'
                  : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10'
                }
              `}
            >
              <div className="text-sm font-medium text-white mb-1">{tier.label}</div>
              <div className="text-xs text-white/40">
                ${tier.min} – ${tier.max}
              </div>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
