'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWizardStore, useRecommendationsStore, type HeadphoneMatch } from '@/stores';
import { Navigation } from '@/components/layout/Navigation';
import { HeadphoneCard } from '@/components/results/HeadphoneCard';
import { SoundProfileChart } from '@/components/results/SoundProfileChart';
import { ResultsSkeleton } from '@/components/results/ResultsSkeleton';
import { findHeadphoneMatches } from '@/lib/matchingAlgorithm';
import { useHydration } from '@/hooks/useHydration';

export default function ResultsPage() {
  const router = useRouter();
  const isHydrated = useHydration();
  const { preferences, isComplete } = useWizardStore();
  const { session, setSession, setLoading, compareList, addToCompare, removeFromCompare } = useRecommendationsStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Redirect if wizard not complete
  useEffect(() => {
    if (!isComplete) {
      router.push('/wizard');
    }
  }, [isComplete, router]);

  // Load real recommendations based on user preferences
  useEffect(() => {
    if (!isComplete) return;

    setLoading(true);
    const startTime = Date.now();

    // Find matching headphones using the real algorithm
    findHeadphoneMatches(preferences)
      .then((matches) => {
        const processingTime = Date.now() - startTime;
        setSession({
          id: 'session-' + Date.now(),
          status: 'complete',
          recommendations: matches,
          createdAt: new Date().toISOString(),
          processingTimeMs: processingTime,
        });
        setIsInitialLoad(false);
      })
      .catch((error) => {
        console.error('Error finding matches:', error);
        // Fallback to empty recommendations on error
        setSession({
          id: 'session-' + Date.now(),
          status: 'error',
          recommendations: [],
          createdAt: new Date().toISOString(),
        });
        setIsInitialLoad(false);
      });
  }, [isComplete, preferences, setSession, setLoading]);

  const recommendations = session?.recommendations ?? [];

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-sonic-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonic-pink"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sonic-black">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 50% 30% at 30% 20%, rgba(255, 45, 85, 0.1), transparent),
              radial-gradient(ellipse 40% 25% at 70% 80%, rgba(255, 85, 120, 0.08), transparent)
            `,
          }}
        />
      </div>

      <Navigation />

      <main className="relative z-10 pt-24 pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full
                         bg-sonic-pink/10 border border-sonic-pink/20"
            >
              <span className="w-2 h-2 rounded-full bg-sonic-pink animate-pulse" />
              <span className="text-sm font-medium text-sonic-pink">
                {isInitialLoad ? 'Analyzing your taste...' : `${recommendations.length} matches found`}
              </span>
            </motion.div>
            
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Your Perfect Matches
            </h1>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Based on your {preferences.genres.length} genres, {preferences.primaryUseCase} use case, 
              and ${preferences.budgetMin}–${preferences.budgetMax} budget
            </p>
          </motion.div>

          {/* Loading state */}
          <AnimatePresence mode="wait">
            {isInitialLoad ? (
              <motion.div
                key="skeleton"
                exit={{ opacity: 0 }}
              >
                <ResultsSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Top match highlight */}
                {recommendations[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                  >
                    <HeadphoneCard
                      match={recommendations[0]}
                      isTopPick
                      isInCompare={compareList.includes(recommendations[0].headphone.id)}
                      onCompareToggle={() => {
                        if (compareList.includes(recommendations[0].headphone.id)) {
                          removeFromCompare(recommendations[0].headphone.id);
                        } else {
                          addToCompare(recommendations[0].headphone.id);
                        }
                      }}
                    />
                  </motion.div>
                )}

                {/* Other recommendations */}
                <div className="grid md:grid-cols-2 gap-6">
                  {recommendations.slice(1).map((match, index) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * (index + 1) }}
                    >
                      <HeadphoneCard
                        match={match}
                        isInCompare={compareList.includes(match.headphone.id)}
                        onCompareToggle={() => {
                          if (compareList.includes(match.headphone.id)) {
                            removeFromCompare(match.headphone.id);
                          } else {
                            addToCompare(match.headphone.id);
                          }
                        }}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Compare floating bar */}
                <AnimatePresence>
                  {compareList.length >= 2 && (
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                    >
                      <Link href="/compare">
                        <motion.button
                          className="flex items-center gap-3 px-6 py-4 rounded-2xl
                                     bg-sonic-pink text-white font-semibold
                                     shadow-xl shadow-sonic-pink/30"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span>Compare {compareList.length} Headphones</span>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </motion.button>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center gap-4 mt-12"
                >
                  <Link href="/wizard">
                    <button className="px-6 py-3 rounded-xl text-white/60 hover:text-white
                                       border border-white/10 hover:border-white/20 transition-colors">
                      Refine Preferences
                    </button>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
