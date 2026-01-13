'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterBarProps {
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  selectedUseCases: string[];
  setSelectedUseCases: (useCases: string[]) => void;
  selectedSoundProfiles: string[];
  setSelectedSoundProfiles: (profiles: string[]) => void;
  sortBy: 'match' | 'price' | 'rating' | 'popular';
  setSortBy: (sort: 'match' | 'price' | 'rating' | 'popular') => void;
  resultCount: number;
}

const TYPES = ['Over-ear', 'On-ear', 'In-ear', 'Earbuds'];
const USE_CASES = ['Casual', 'Studio', 'Workout', 'Gaming'];
const SOUND_PROFILES = ['Balanced', 'Flat', 'Bass-heavy'];

export function FilterBar({
  priceRange,
  setPriceRange,
  selectedTypes,
  setSelectedTypes,
  selectedUseCases,
  setSelectedUseCases,
  selectedSoundProfiles,
  setSelectedSoundProfiles,
  sortBy,
  setSortBy,
  resultCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleType = (type: string) => {
    setSelectedTypes(
      selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type]
    );
  };

  const toggleUseCase = (useCase: string) => {
    setSelectedUseCases(
      selectedUseCases.includes(useCase)
        ? selectedUseCases.filter((u) => u !== useCase)
        : [...selectedUseCases, useCase]
    );
  };

  const toggleSoundProfile = (profile: string) => {
    setSelectedSoundProfiles(
      selectedSoundProfiles.includes(profile)
        ? selectedSoundProfiles.filter((p) => p !== profile)
        : [...selectedSoundProfiles, profile]
    );
  };

  const clearAllFilters = () => {
    setPriceRange([0, 2000]);
    setSelectedTypes([]);
    setSelectedUseCases([]);
    setSelectedSoundProfiles([]);
  };

  const activeFilterCount =
    selectedTypes.length + selectedUseCases.length + selectedSoundProfiles.length;

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Results & Filters Toggle */}
        <div className="flex items-center gap-4">
          <p className="text-white/60 text-sm">
            <span className="font-semibold text-white">{resultCount}</span> results
          </p>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10
                     hover:bg-white/10 hover:border-white/20 transition-colors"
          >
            <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            <span className="text-white/80 text-sm font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-sonic-pink text-white text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sonic-pink text-sm hover:text-sonic-red transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">Sort by:</span>
          <div className="flex gap-2">
            {[
              { value: 'match', label: 'Best Match' },
              { value: 'price', label: 'Price' },
              { value: 'rating', label: 'Rating' },
              { value: 'popular', label: 'Popular' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sortBy === option.value
                    ? 'bg-sonic-pink text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
              {/* Price Range */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-3 block">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Type Filters */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-3 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((type) => (
                    <FilterChip
                      key={type}
                      label={type}
                      active={selectedTypes.includes(type)}
                      onClick={() => toggleType(type)}
                    />
                  ))}
                </div>
              </div>

              {/* Use Case Filters */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-3 block">Use Case</label>
                <div className="flex flex-wrap gap-2">
                  {USE_CASES.map((useCase) => (
                    <FilterChip
                      key={useCase}
                      label={useCase}
                      active={selectedUseCases.includes(useCase)}
                      onClick={() => toggleUseCase(useCase)}
                    />
                  ))}
                </div>
              </div>

              {/* Sound Profile Filters */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-3 block">Sound Signature</label>
                <div className="flex flex-wrap gap-2">
                  {SOUND_PROFILES.map((profile) => (
                    <FilterChip
                      key={profile}
                      label={profile}
                      active={selectedSoundProfiles.includes(profile)}
                      onClick={() => toggleSoundProfile(profile)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-sonic-pink/20 text-sonic-pink border-2 border-sonic-pink/50'
          : 'bg-white/5 text-white/60 border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
}
