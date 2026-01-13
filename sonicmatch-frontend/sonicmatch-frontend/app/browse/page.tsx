'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeadphoneData } from '@/types/data';
import { Navigation } from '@/components/layout/Navigation';
import { FilterBar } from '@/components/browse/FilterBar';
import { HeadphoneCard } from '@/components/browse/HeadphoneCard';
import { HeadphoneDetails } from '@/components/browse/HeadphoneDetails';
import { CompareBar } from '@/components/browse/CompareBar';
import { useHydration } from '@/hooks/useHydration';

export default function BrowsePage() {
  const isHydrated = useHydration();
  const [headphones, setHeadphones] = useState<HeadphoneData[]>([]);
  const [filteredHeadphones, setFilteredHeadphones] = useState<HeadphoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHeadphone, setSelectedHeadphone] = useState<HeadphoneData | null>(null);

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [selectedSoundProfiles, setSelectedSoundProfiles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'rating' | 'popular'>('match');

  useEffect(() => {
    const loadHeadphones = async () => {
      try {
        const response = await fetch('/api/headphones');
        const data = await response.json();
        setHeadphones(data.headphones || []);
        setFilteredHeadphones(data.headphones || []);
      } catch (error) {
        console.error('Error loading headphones:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHeadphones();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...headphones];

    // Price filter
    filtered = filtered.filter(h => h.price >= priceRange[0] && h.price <= priceRange[1]);

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(h => selectedTypes.includes(h.type));
    }

    // Use case filter
    if (selectedUseCases.length > 0) {
      filtered = filtered.filter(h => selectedUseCases.includes(h.use_case));
    }

    // Sound profile filter
    if (selectedSoundProfiles.length > 0) {
      filtered = filtered.filter(h => selectedSoundProfiles.includes(h.sound_profile));
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.user_rating - a.user_rating;
        case 'popular':
          return b.user_reviews - a.user_reviews;
        case 'match':
        default:
          return b.user_rating - a.user_rating; // Default to rating for now
      }
    });

    setFilteredHeadphones(filtered);
  }, [headphones, priceRange, selectedTypes, selectedUseCases, selectedSoundProfiles, sortBy]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-sonic-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonic-pink"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sonic-black">
      <Navigation />

      {/* Hero Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-4">
              Browse All <span className="text-gradient-pink">Headphones</span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Explore our entire collection of {headphones.length} headphones
            </p>
          </motion.div>

          {/* Filter Bar */}
          <FilterBar
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
            selectedUseCases={selectedUseCases}
            setSelectedUseCases={setSelectedUseCases}
            selectedSoundProfiles={selectedSoundProfiles}
            setSelectedSoundProfiles={setSelectedSoundProfiles}
            sortBy={sortBy}
            setSortBy={setSortBy}
            resultCount={filteredHeadphones.length}
          />
        </div>
      </section>

      {/* Headphone Grid */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonic-pink"></div>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredHeadphones.map((headphone, index) => (
                  <HeadphoneCard
                    key={headphone.headphone_id}
                    headphone={headphone}
                    index={index}
                    onClick={() => setSelectedHeadphone(headphone)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!loading && filteredHeadphones.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-2xl text-white/40">No headphones found matching your filters</p>
              <button
                onClick={() => {
                  setPriceRange([0, 2000]);
                  setSelectedTypes([]);
                  setSelectedUseCases([]);
                  setSelectedSoundProfiles([]);
                }}
                className="mt-6 px-6 py-3 rounded-xl bg-sonic-pink text-white font-medium hover:bg-sonic-red transition-colors"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Details Drawer */}
      <HeadphoneDetails
        headphone={selectedHeadphone}
        onClose={() => setSelectedHeadphone(null)}
      />

      {/* Compare Bar */}
      <CompareBar headphones={headphones} />
    </div>
  );
}
