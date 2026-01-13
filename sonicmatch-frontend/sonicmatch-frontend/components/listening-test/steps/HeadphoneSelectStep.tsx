'use client';

/**
 * HeadphoneSelectStep
 *
 * Step 0: User selects their current headphones for EQ compensation.
 * Provides search functionality and popular headphone presets.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useListeningTestStore } from '@/stores/listeningTestStore';
import type { HeadphoneEQProfile, SoundSignatureType } from '@/types/listeningTest';

interface HeadphoneSelectStepProps {
  onInitializeAudio?: () => Promise<void>;
}

// Popular headphones with approximate EQ profiles
const POPULAR_HEADPHONES: HeadphoneEQProfile[] = [
  {
    id: 'sony-wh1000xm5',
    brand: 'Sony',
    model: 'WH-1000XM5',
    fullName: 'Sony WH-1000XM5',
    soundSignature: 'balanced',
    frequencyResponse: { bass: 2, lowMids: 0, mids: 0, upperMids: -1, treble: -2, airiness: -1 },
    compensationEQ: { bassGain: -2, lowMidsGain: 0, midsGain: 0, upperMidsGain: 1, trebleGain: 2, airinessGain: 1 },
  },
  {
    id: 'airpods-max',
    brand: 'Apple',
    model: 'AirPods Max',
    fullName: 'Apple AirPods Max',
    soundSignature: 'balanced',
    frequencyResponse: { bass: 1, lowMids: 0, mids: 1, upperMids: 0, treble: 0, airiness: 0 },
    compensationEQ: { bassGain: -1, lowMidsGain: 0, midsGain: -1, upperMidsGain: 0, trebleGain: 0, airinessGain: 0 },
  },
  {
    id: 'sennheiser-hd600',
    brand: 'Sennheiser',
    model: 'HD 600',
    fullName: 'Sennheiser HD 600',
    soundSignature: 'neutral',
    frequencyResponse: { bass: -1, lowMids: 0, mids: 0, upperMids: 1, treble: 0, airiness: -1 },
    compensationEQ: { bassGain: 1, lowMidsGain: 0, midsGain: 0, upperMidsGain: -1, trebleGain: 0, airinessGain: 1 },
  },
  {
    id: 'beyerdynamic-dt770',
    brand: 'Beyerdynamic',
    model: 'DT 770 Pro',
    fullName: 'Beyerdynamic DT 770 Pro',
    soundSignature: 'v-shaped',
    frequencyResponse: { bass: 3, lowMids: -1, mids: -2, upperMids: 0, treble: 4, airiness: 2 },
    compensationEQ: { bassGain: -3, lowMidsGain: 1, midsGain: 2, upperMidsGain: 0, trebleGain: -4, airinessGain: -2 },
  },
  {
    id: 'audio-technica-m50x',
    brand: 'Audio-Technica',
    model: 'ATH-M50x',
    fullName: 'Audio-Technica ATH-M50x',
    soundSignature: 'v-shaped',
    frequencyResponse: { bass: 2, lowMids: 0, mids: -1, upperMids: 2, treble: 1, airiness: 0 },
    compensationEQ: { bassGain: -2, lowMidsGain: 0, midsGain: 1, upperMidsGain: -2, trebleGain: -1, airinessGain: 0 },
  },
  {
    id: 'bose-qc45',
    brand: 'Bose',
    model: 'QuietComfort 45',
    fullName: 'Bose QuietComfort 45',
    soundSignature: 'warm',
    frequencyResponse: { bass: 3, lowMids: 1, mids: 0, upperMids: -1, treble: -2, airiness: -1 },
    compensationEQ: { bassGain: -3, lowMidsGain: -1, midsGain: 0, upperMidsGain: 1, trebleGain: 2, airinessGain: 1 },
  },
];

// Generic profiles for unknown headphones
const GENERIC_PROFILES: { name: string; signature: SoundSignatureType; profile: HeadphoneEQProfile }[] = [
  {
    name: 'Neutral / Flat',
    signature: 'neutral',
    profile: {
      id: 'generic-neutral',
      brand: 'Generic',
      model: 'Neutral Profile',
      fullName: 'Neutral / Flat Headphones',
      soundSignature: 'neutral',
      frequencyResponse: { bass: 0, lowMids: 0, mids: 0, upperMids: 0, treble: 0, airiness: 0 },
      compensationEQ: { bassGain: 0, lowMidsGain: 0, midsGain: 0, upperMidsGain: 0, trebleGain: 0, airinessGain: 0 },
    },
  },
  {
    name: 'Bass-Heavy',
    signature: 'bass-heavy',
    profile: {
      id: 'generic-bass',
      brand: 'Generic',
      model: 'Bass-Heavy Profile',
      fullName: 'Bass-Heavy Headphones',
      soundSignature: 'bass-heavy',
      frequencyResponse: { bass: 4, lowMids: 1, mids: -1, upperMids: 0, treble: -1, airiness: -1 },
      compensationEQ: { bassGain: -4, lowMidsGain: -1, midsGain: 1, upperMidsGain: 0, trebleGain: 1, airinessGain: 1 },
    },
  },
  {
    name: 'Bright / Analytical',
    signature: 'bright',
    profile: {
      id: 'generic-bright',
      brand: 'Generic',
      model: 'Bright Profile',
      fullName: 'Bright / Analytical Headphones',
      soundSignature: 'bright',
      frequencyResponse: { bass: -2, lowMids: 0, mids: 0, upperMids: 2, treble: 3, airiness: 2 },
      compensationEQ: { bassGain: 2, lowMidsGain: 0, midsGain: 0, upperMidsGain: -2, trebleGain: -3, airinessGain: -2 },
    },
  },
];

export function HeadphoneSelectStep({ onInitializeAudio }: HeadphoneSelectStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenericOptions, setShowGenericOptions] = useState(false);

  const selectedHeadphone = useListeningTestStore((s) => s.selectedHeadphone);
  const setSelectedHeadphone = useListeningTestStore((s) => s.setSelectedHeadphone);

  // Filter headphones based on search
  const filteredHeadphones = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_HEADPHONES;

    const query = searchQuery.toLowerCase();
    return POPULAR_HEADPHONES.filter(
      (hp) =>
        hp.fullName.toLowerCase().includes(query) ||
        hp.brand.toLowerCase().includes(query) ||
        hp.model.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle headphone selection
  const handleSelect = async (headphone: HeadphoneEQProfile | null) => {
    setSelectedHeadphone(headphone);
    // Initialize audio when user makes a selection (optional for A/B test mode)
    if (onInitializeAudio) {
      await onInitializeAudio();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                     bg-gradient-to-br from-sonic-pink/20 to-sonic-coral/20
                     border border-sonic-pink/30 mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          <span className="text-3xl">🎧</span>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          What headphones are you using?
        </motion.h2>

        <motion.p
          className="text-white/60 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          We&apos;ll compensate for your headphones&apos; sound signature to give you accurate results.
        </motion.p>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your headphones..."
            className="w-full pl-12 pr-4 py-4 rounded-xl
                     bg-white/5 border border-white/10
                     text-white placeholder-white/40
                     focus:outline-none focus:border-sonic-pink/50
                     transition-colors"
          />
        </div>
      </motion.div>

      {/* Popular Headphones */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Popular Headphones
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredHeadphones.map((headphone, index) => (
            <motion.button
              key={headphone.id}
              onClick={() => handleSelect(headphone)}
              className={`
                p-4 rounded-xl text-left transition-all
                ${
                  selectedHeadphone?.id === headphone.id
                    ? 'bg-sonic-pink/20 border-2 border-sonic-pink'
                    : 'bg-white/5 border border-white/10 hover:border-white/30'
                }
              `}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                  🎧
                </div>
                <div>
                  <div className="font-medium">{headphone.fullName}</div>
                  <div className="text-sm text-white/50 capitalize">
                    {headphone.soundSignature}
                  </div>
                </div>
                {selectedHeadphone?.id === headphone.id && (
                  <motion.div
                    className="ml-auto"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <svg
                      className="w-6 h-6 text-sonic-pink"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* I don't see my headphones */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <button
          onClick={() => setShowGenericOptions(!showGenericOptions)}
          className="text-sonic-pink hover:text-sonic-coral transition-colors text-sm"
        >
          {showGenericOptions ? 'Hide options' : "I don't see my headphones"}
        </button>

        {showGenericOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3"
          >
            <p className="text-sm text-white/60">
              Select the profile that best matches your headphones:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GENERIC_PROFILES.map((item) => (
                <motion.button
                  key={item.profile.id}
                  onClick={() => handleSelect(item.profile)}
                  className={`
                    p-4 rounded-xl text-center transition-all
                    ${
                      selectedHeadphone?.id === item.profile.id
                        ? 'bg-sonic-pink/20 border-2 border-sonic-pink'
                        : 'bg-white/5 border border-white/10 hover:border-white/30'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="font-medium">{item.name}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Skip option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <button
          onClick={() => handleSelect(null)}
          className="text-white/40 hover:text-white/60 transition-colors text-sm"
        >
          Skip (assume neutral headphones)
        </button>
      </motion.div>
    </div>
  );
}
