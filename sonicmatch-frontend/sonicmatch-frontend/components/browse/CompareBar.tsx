'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useRecommendationsStore } from '@/stores';
import { HeadphoneData } from '@/types/data';

interface CompareBarProps {
  headphones: HeadphoneData[];
}

export function CompareBar({ headphones }: CompareBarProps) {
  const router = useRouter();
  const { compareList, removeFromCompare, clearCompare } = useRecommendationsStore();

  const selectedHeadphones = headphones.filter(h =>
    compareList.includes(h.headphone_id.toString())
  );

  if (selectedHeadphones.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-4xl w-full px-6"
      >
        <div className="bg-sonic-dark/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sonic-pink/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-sonic-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3v18M15 3v18" />
                  <path d="M3 9h18M3 15h18" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Compare Headphones
                </h3>
                <p className="text-white/50 text-sm">
                  {selectedHeadphones.length} of 4 selected
                </p>
              </div>
            </div>

            <button
              onClick={clearCompare}
              className="text-white/40 hover:text-white/70 text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Selected Headphones */}
            <div className="flex-1 flex gap-3 overflow-x-auto">
              {selectedHeadphones.map((headphone) => (
                <motion.div
                  key={headphone.headphone_id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex-shrink-0 relative group"
                >
                  <div className="w-24 h-24 bg-white/5 rounded-xl border border-white/10 p-3 flex flex-col items-center justify-center">
                    <svg className="w-10 h-10 text-white/20 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
                    </svg>
                    <span className="text-white/60 text-xs text-center line-clamp-2">
                      {headphone.brand}
                    </span>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFromCompare(headphone.headphone_id.toString())}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-sonic-dark border border-white/20 rounded-full
                             flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                             hover:bg-sonic-pink hover:border-sonic-pink"
                  >
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 4 - selectedHeadphones.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex-shrink-0 w-24 h-24 bg-white/5 rounded-xl border border-dashed border-white/20 flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Compare Button */}
            <motion.button
              onClick={() => router.push('/compare')}
              disabled={selectedHeadphones.length < 2}
              whileHover={{ scale: selectedHeadphones.length >= 2 ? 1.05 : 1 }}
              whileTap={{ scale: selectedHeadphones.length >= 2 ? 0.95 : 1 }}
              className={`px-8 py-4 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedHeadphones.length >= 2
                  ? 'bg-gradient-to-r from-sonic-pink to-sonic-red text-white shadow-lg shadow-sonic-pink/30 hover:shadow-sonic-pink/50'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              Compare Now
              {selectedHeadphones.length >= 2 && (
                <svg className="w-5 h-5 inline-block ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
