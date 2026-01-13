'use client';

/**
 * AttributeRankingStep
 *
 * Allows users to rank audio attributes by importance.
 * Rankings influence the final sound profile generation.
 */

import { useState, useCallback } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { useListeningTestStore } from '@/stores/listeningTestStore';
import { AB_COMPARISON_CONFIGS } from '@/types/listeningTest';
import type { AudioAttribute } from '@/types/listeningTest';

const AUDIO_ATTRIBUTES: AudioAttribute[] = ['bass', 'mids', 'treble', 'soundstage', 'detail'];

interface RankItemProps {
  attribute: AudioAttribute;
  rank: number;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function RankItem({ attribute, rank, onDragStart, onDragEnd }: RankItemProps) {
  const config = AB_COMPARISON_CONFIGS[attribute];
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={attribute}
      id={attribute}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="relative"
    >
      <motion.div
        className={`
          flex items-center gap-4 p-4 rounded-2xl
          bg-white/5 border border-white/10
          cursor-grab active:cursor-grabbing
          hover:bg-white/10 hover:border-white/20
          transition-colors duration-200
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onPointerDown={(e) => dragControls.start(e)}
      >
        {/* Rank badge */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full
            flex items-center justify-center
            font-bold text-sm
            ${rank === 1
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
              : rank === 2
                ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black'
                : rank === 3
                  ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                  : 'bg-white/10 text-white/60'
            }
          `}
        >
          {rank}
        </div>

        {/* Icon */}
        <div className="text-2xl">{config.icon}</div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{config.title}</h3>
          <p className="text-sm text-white/50">{config.subtitle}</p>
        </div>

        {/* Drag handle */}
        <div className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

export function AttributeRankingStep() {
  const setRefinementRankings = useListeningTestStore((s) => s.setRefinementRankings);
  const skipRefinement = useListeningTestStore((s) => s.skipRefinement);
  const nextStep = useListeningTestStore((s) => s.nextStep);

  const [rankings, setRankings] = useState<AudioAttribute[]>(AUDIO_ATTRIBUTES);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleReorder = useCallback((newOrder: AudioAttribute[]) => {
    setRankings(newOrder);
    setHasInteracted(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (hasInteracted) {
      setRefinementRankings(rankings);
    }
    nextStep();
  }, [hasInteracted, rankings, setRefinementRankings, nextStep]);

  const handleSkip = useCallback(() => {
    skipRefinement();
    nextStep();
  }, [skipRefinement, nextStep]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Rank What Matters Most
        </h2>
        <p className="text-white/50 text-sm md:text-base max-w-md">
          Drag to reorder these sound qualities by how important they are to you.
          Your #1 choice will have the biggest impact on your profile.
        </p>
      </motion.div>

      {/* Ranking list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md mb-8"
      >
        <Reorder.Group
          axis="y"
          values={rankings}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {rankings.map((attribute, index) => (
            <RankItem
              key={attribute}
              attribute={attribute}
              rank={index + 1}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            />
          ))}
        </Reorder.Group>
      </motion.div>

      {/* Interaction hint */}
      {!hasInteracted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/30 text-sm mb-6 text-center"
        >
          Drag items to reorder, or continue with the default order
        </motion.p>
      )}

      {/* Status indicator */}
      {hasInteracted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-sonic-pink text-sm mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Your ranking has been saved</span>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <button
          onClick={handleSkip}
          className="px-6 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Skip This Step
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 rounded-xl bg-sonic-pink text-white font-medium hover:bg-sonic-pink/90 transition-colors"
        >
          Generate My Profile
        </button>
      </motion.div>
    </motion.div>
  );
}
