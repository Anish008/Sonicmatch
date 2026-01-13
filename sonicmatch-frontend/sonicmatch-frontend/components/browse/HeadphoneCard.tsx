'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { HeadphoneData, SOUND_PROFILE_MAP } from '@/types/data';
import { useRecommendationsStore } from '@/stores';
import { getHeadphoneImageUrl, getHeadphoneSearchUrl } from '@/lib/headphoneImages';

interface HeadphoneCardProps {
  headphone: HeadphoneData;
  index: number;
  onClick: () => void;
}

export function HeadphoneCard({ headphone, index, onClick }: HeadphoneCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { compareList, addToCompare, removeFromCompare } = useRecommendationsStore();

  const isInCompareList = compareList.includes(headphone.headphone_id.toString());

  // Use the CSV image_url if available, otherwise fall back to utility function
  const csvImageUrl = headphone.image_url && headphone.image_url.startsWith('http') ? headphone.image_url : null;
  const primaryImage = csvImageUrl || getHeadphoneImageUrl(headphone.brand, headphone.model, headphone.type);
  const searchUrl = getHeadphoneSearchUrl(headphone.brand, headphone.model);

  // Calculate match score (mock for now - would come from AI in real app)
  const matchScore = Math.min(100, Math.round(headphone.user_rating * 20 + Math.random() * 10));

  // Get sound profile values
  const soundProfile = SOUND_PROFILE_MAP[headphone.sound_profile] || { bass: 0.5, mids: 0.5, treble: 0.5 };
  const bassLevel = (soundProfile.bass || 0.5) * 5;
  const midsLevel = (soundProfile.mids || 0.5) * 5;
  const trebleLevel = (soundProfile.treble || 0.5) * 5;

  // Generate tags based on headphone features
  const tags: string[] = [];
  if (headphone.noise_cancellation === 'Yes') tags.push('ANC');
  if (headphone.bass_level === 'High') tags.push('Bass Lovers');
  if (headphone.use_case) tags.push(headphone.use_case);
  const displayTags = tags.slice(0, 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative cursor-pointer"
    >
      <motion.div
        className="relative bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10
                   overflow-hidden transition-all duration-300"
        whileHover={{ y: -6, scale: 1.02 }}
        style={{
          boxShadow: isHovered
            ? '0 20px 40px rgba(255, 45, 85, 0.2)'
            : '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Image Section */}
        <div className="relative aspect-square bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
          {/* Headphone image */}
          <motion.div
            className="w-full h-full flex items-center justify-center relative group/img"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
          >
            {!imageError ? (
              <Image
                src={primaryImage}
                alt={`${headphone.brand} ${headphone.model}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={() => setImageError(true)}
              />
            ) : (
              <svg className="w-32 h-32 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
              </svg>
            )}

            {/* View More Images overlay */}
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0
                       group-hover/img:opacity-100 transition-opacity duration-200"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm
                            border border-white/20 text-white text-sm font-medium">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                View More Images
              </div>
            </a>
          </motion.div>

          {/* Match Score Badge */}
          <div className="absolute top-4 right-4">
            <motion.div
              className="relative w-16 h-16"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 + 0.2, type: 'spring' }}
            >
              {/* Circular progress ring */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: matchScore / 100 }}
                  transition={{ duration: 1, delay: index * 0.05 + 0.3 }}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 0,
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF2D55" />
                    <stop offset="100%" stopColor="#FF6B8A" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{matchScore}%</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Brand & Name */}
          <div>
            <h3 className="text-white font-semibold text-lg leading-tight mb-1">
              {headphone.brand} {headphone.model}
            </h3>
            <p className="text-white/40 text-sm">
              {headphone.type} • {headphone.noise_cancellation === 'Yes' ? 'ANC' : 'No ANC'}
            </p>
          </div>

          {/* Best For Tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium
                           bg-sonic-pink/10 text-sonic-pink border border-sonic-pink/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sound Signature Mini-Graph */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs font-medium mb-3">Sound Signature</p>
            <div className="space-y-2">
              <SoundBar label="Bass" level={bassLevel} />
              <SoundBar label="Mids" level={midsLevel} />
              <SoundBar label="Treble" level={trebleLevel} />
            </div>
          </div>

          {/* Price & Rating */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <p className="text-2xl font-bold text-white">${headphone.price}</p>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-white/60 text-sm font-medium">{headphone.user_rating.toFixed(1)}</span>
              <span className="text-white/30 text-xs ml-1">({headphone.user_reviews})</span>
            </div>
          </div>
        </div>

        {/* Quick Actions (Hover) */}
        <motion.div
          className="absolute top-4 left-4 flex gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle save
            }}
            className="p-2 rounded-full bg-sonic-dark/90 backdrop-blur-sm border border-white/20
                     hover:bg-sonic-pink/20 hover:border-sonic-pink/40 transition-colors group/btn"
            title="Save"
          >
            <svg className="w-4 h-4 text-white/60 group-hover/btn:text-sonic-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isInCompareList) {
                removeFromCompare(headphone.headphone_id.toString());
              } else {
                addToCompare(headphone.headphone_id.toString());
              }
            }}
            className={`p-2 rounded-full backdrop-blur-sm border transition-colors group/btn ${
              isInCompareList
                ? 'bg-sonic-pink/20 border-sonic-pink/60'
                : 'bg-sonic-dark/90 border-white/20 hover:bg-sonic-pink/20 hover:border-sonic-pink/40'
            }`}
            title={isInCompareList ? 'Remove from Compare' : 'Add to Compare'}
          >
            <svg className={`w-4 h-4 ${isInCompareList ? 'text-sonic-pink' : 'text-white/60 group-hover/btn:text-sonic-pink'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3v18M15 3v18" />
              <path d="M3 9h18M3 15h18" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function SoundBar({ label, level }: { label: string; level: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/40 text-xs w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(level / 5) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((dot) => (
          <div
            key={dot}
            className={`w-1 h-1 rounded-full transition-colors ${
              dot <= level ? 'bg-sonic-pink' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
