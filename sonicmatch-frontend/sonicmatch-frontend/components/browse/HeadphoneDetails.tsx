'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { HeadphoneData, SOUND_PROFILE_MAP } from '@/types/data';
import { getHeadphoneImageUrl, getHeadphoneSearchUrl } from '@/lib/headphoneImages';

interface HeadphoneDetailsProps {
  headphone: HeadphoneData | null;
  onClose: () => void;
}

export function HeadphoneDetails({ headphone, onClose }: HeadphoneDetailsProps) {
  const [imageError, setImageError] = useState(false);

  if (!headphone) return null;

  const soundProfile = SOUND_PROFILE_MAP[headphone.sound_profile] || { bass: 0.5, mids: 0.5, treble: 0.5 };

  // Use the CSV image_url if available, otherwise fall back to utility function
  const csvImageUrl = headphone.image_url && headphone.image_url.startsWith('http') ? headphone.image_url : null;
  const primaryImage = csvImageUrl || getHeadphoneImageUrl(headphone.brand, headphone.model, headphone.type);
  const searchUrl = getHeadphoneSearchUrl(headphone.brand, headphone.model);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="h-full w-full max-w-2xl bg-sonic-dark border-l border-white/10 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-sonic-dark/95 backdrop-blur-xl border-b border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">
                  {headphone.brand} {headphone.model}
                </h2>
                <p className="text-white/60">
                  {headphone.type} • {headphone.noise_cancellation === 'Yes' ? 'ANC' : 'No ANC'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Image */}
            <div className="aspect-square bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl overflow-hidden relative group">
              {!imageError ? (
                <Image
                  src={primaryImage}
                  alt={`${headphone.brand} ${headphone.model}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-48 h-48 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
                  </svg>
                </div>
              )}

              {/* View More Images overlay */}
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl
                         opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm
                              border border-white/20 text-white font-medium">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  View More Images
                </div>
              </a>
            </div>

            {/* Price & Rating */}
            <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <div>
                <p className="text-white/60 text-sm mb-1">Price</p>
                <p className="text-4xl font-bold text-white">${headphone.price}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm mb-1">User Rating</p>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-2xl font-bold text-white">{headphone.user_rating.toFixed(1)}</span>
                  <span className="text-white/40 text-sm">({headphone.user_reviews} reviews)</span>
                </div>
              </div>
            </div>

            {/* Sound Profile */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Sound Signature</h3>
              <div className="space-y-4 p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                <SoundBarLarge label="Bass" level={(soundProfile.bass || 0.5) * 5} />
                <SoundBarLarge label="Mids" level={(soundProfile.mids || 0.5) * 5} />
                <SoundBarLarge label="Treble" level={(soundProfile.treble || 0.5) * 5} />
              </div>
            </div>

            {/* Specifications */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <SpecCard label="Type" value={headphone.type} />
                <SpecCard label="Use Case" value={headphone.use_case} />
                <SpecCard label="Sound Profile" value={headphone.sound_profile} />
                <SpecCard label="Bass Level" value={headphone.bass_level} />
                <SpecCard label="Noise Cancellation" value={headphone.noise_cancellation} />
                <SpecCard label="Price" value={`$${headphone.price}`} />
              </div>
            </div>

            {/* Why This Matches */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Why We Recommend This</h3>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-sonic-pink/10 to-sonic-coral/10 border border-sonic-pink/20">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-sonic-pink flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-white/80">
                      Perfect for <span className="text-sonic-pink font-medium">{headphone.use_case}</span> listening
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-sonic-pink flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-white/80">
                      {headphone.sound_profile} sound signature matches your taste
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-sonic-pink flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="text-white/80">
                      Highly rated by {headphone.user_reviews} users ({headphone.user_rating}/5.0)
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-sonic-pink to-sonic-red text-white font-semibold text-lg hover:shadow-lg hover:shadow-sonic-pink/25 transition-all">
              Learn More
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SoundBarLarge({ label, level }: { label: string; level: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/60 text-sm font-medium">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((dot) => (
            <div
              key={dot}
              className={`w-2 h-2 rounded-full transition-colors ${
                dot <= level ? 'bg-sonic-pink' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(level / 5) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
