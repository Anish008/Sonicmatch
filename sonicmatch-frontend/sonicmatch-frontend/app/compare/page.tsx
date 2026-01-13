'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRecommendationsStore, selectCompareItems } from '@/stores';
import { Navigation } from '@/components/layout/Navigation';
import { HeadphoneData } from '@/types/data';
import { useHydration } from '@/hooks/useHydration';

export default function ComparePage() {
  const router = useRouter();
  const isHydrated = useHydration();
  const { compareList, removeFromCompare, clearCompare, session } = useRecommendationsStore();
  const compareItems = useRecommendationsStore(selectCompareItems);
  const [browseHeadphones, setBrowseHeadphones] = useState<HeadphoneData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch headphones from browse if we don't have session data
  useEffect(() => {
    const fetchHeadphones = async () => {
      if (compareList.length > 0 && !session) {
        try {
          const response = await fetch('/api/headphones');
          const data = await response.json();
          const selected = (data.headphones || []).filter((h: HeadphoneData) =>
            compareList.includes(h.headphone_id.toString())
          );
          setBrowseHeadphones(selected);
        } catch (error) {
          console.error('Error loading headphones:', error);
        }
      }
      setLoading(false);
    };
    fetchHeadphones();
  }, [compareList, session]);

  // Use either recommendation items or browse headphones
  const headphonesToCompare = compareItems.length > 0 ? compareItems.map(item => item.headphone) : browseHeadphones;

  const comparisonCategories = useMemo(() => [
    { key: 'price', label: 'Price', format: (hp: any) => `$${hp.price || hp.priceUsd}` },
    { key: 'type', label: 'Type', format: (hp: any) => (hp.type || hp.headphoneType || '').replace(/_/g, ' ') },
    { key: 'sound_profile', label: 'Sound Profile', format: (hp: any) => hp.sound_profile || hp.soundSignature || 'N/A' },
    { key: 'anc', label: 'ANC', format: (hp: any) => (hp.noise_cancellation === 'Yes' || hp.hasAnc) ? '✓' : '✗' },
    { key: 'use_case', label: 'Use Case', format: (hp: any) => hp.use_case || 'N/A' },
    { key: 'bass_level', label: 'Bass Level', format: (hp: any) => hp.bass_level || 'N/A' },
  ], []);

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen bg-sonic-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonic-pink"></div>
      </div>
    );
  }

  if (headphonesToCompare.length < 2) {
    return (
      <div className="min-h-screen bg-sonic-black">
        <Navigation />
        <main className="pt-32 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-6">⚖️</div>
            <h1 className="font-display text-3xl font-bold text-white mb-4">
              Nothing to Compare Yet
            </h1>
            <p className="text-white/50 mb-8">
              Add at least 2 headphones from browse or results to compare them
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/browse">
                <button className="px-6 py-3 rounded-xl bg-sonic-pink text-white font-medium">
                  Browse Headphones
                </button>
              </Link>
              <Link href="/results">
                <button className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5">
                  Back to Results
                </button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sonic-black">
      <Navigation />
      
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold text-white mb-2">
                Compare Headphones
              </h1>
              <p className="text-white/50">
                Side-by-side comparison of {headphonesToCompare.length} headphones
              </p>
            </div>
            <button
              onClick={() => {
                clearCompare();
                router.push('/browse');
              }}
              className="px-4 py-2 rounded-lg text-white/50 hover:text-white
                       border border-white/10 hover:border-white/20 transition-colors"
            >
              Clear All
            </button>
          </motion.div>

          {/* Comparison table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="overflow-x-auto"
          >
            <table className="w-full">
              {/* Header row with headphone cards */}
              <thead>
                <tr>
                  <th className="w-48 p-4" />
                  {headphonesToCompare.map((hp: any) => {
                    const hpId = hp.id || hp.headphone_id?.toString();
                    const brand = hp.brand;
                    const model = hp.model;
                    const rating = hp.user_rating || 0;

                    return (
                      <th key={hpId} className="p-4 min-w-[200px]">
                        <div className="relative p-4 rounded-xl bg-white/5 border border-white/10">
                          <button
                            onClick={() => removeFromCompare(hpId)}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10"
                          >
                            <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>

                          <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-white/10 flex items-center justify-center relative group/img">
                            <svg className="w-10 h-10 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                              <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
                            </svg>
                            {hp.image_url && (
                              <a
                                href={hp.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl
                                         opacity-0 group-hover/img:opacity-100 transition-opacity duration-200"
                                title="View images"
                              >
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-white/40 mb-1">{brand}</div>
                          <div className="font-semibold text-white">{model}</div>

                          {/* Rating */}
                          <div className="mt-3 flex items-center justify-center gap-1">
                            <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-sm text-white/60">{rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* Show scores only if comparing from recommendations */}
                {compareItems.length > 0 && (
                  <>
                    <tr className="border-t border-white/5">
                      <td className="p-4 text-white/40 font-medium">Overall Score</td>
                      {compareItems.map((item) => (
                        <td key={item.headphone.id} className="p-4 text-center">
                          <ScoreBar value={item.scores.overall} />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="p-4 text-white/40">Genre Match</td>
                      {compareItems.map((item) => (
                        <td key={item.headphone.id} className="p-4 text-center">
                          <ScoreBar value={item.scores.genreMatch} />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="p-4 text-white/40">Sound Profile</td>
                      {compareItems.map((item) => (
                        <td key={item.headphone.id} className="p-4 text-center">
                          <ScoreBar value={item.scores.soundProfile} />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="p-4 text-white/40">Use Case</td>
                      {compareItems.map((item) => (
                        <td key={item.headphone.id} className="p-4 text-center">
                          <ScoreBar value={item.scores.useCase} />
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* Specs */}
                {comparisonCategories.map((cat) => (
                  <tr key={cat.key} className="border-t border-white/5">
                    <td className="p-4 text-white/40">{cat.label}</td>
                    {headphonesToCompare.map((hp: any) => {
                      const hpId = hp.id || hp.headphone_id?.toString();
                      return (
                        <td key={hpId} className="p-4 text-center text-white">
                          {cat.format(hp)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* User Rating */}
                <tr className="border-t border-white/5">
                  <td className="p-4 text-white/40">User Rating</td>
                  {headphonesToCompare.map((hp: any) => {
                    const hpId = hp.id || hp.headphone_id?.toString();
                    const rating = hp.user_rating || 0;
                    const reviews = hp.user_reviews || 0;
                    return (
                      <td key={hpId} className="p-4 text-center text-white">
                        <div className="flex items-center justify-center gap-1">
                          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span>{rating.toFixed(1)}</span>
                          <span className="text-white/40 text-xs">({reviews})</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <span className="text-sm text-white/60 w-8">{percent}</span>
    </div>
  );
}
