'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeadphoneMatch } from '@/stores';
import { getHeadphoneImageUrl, getHeadphoneSearchUrl } from '@/lib/headphoneImages';

interface HeadphoneCardProps {
  match: HeadphoneMatch;
  isTopPick?: boolean;
  isInCompare?: boolean;
  onCompareToggle?: () => void;
}

export function HeadphoneCard({ match, isTopPick = false, isInCompare = false, onCompareToggle }: HeadphoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const { headphone, scores, explanation, matchHighlights, personalizedPros, personalizedCons } = match;

  const overallScore = Math.round(scores.overall * 100);

  // Map headphoneType to display type
  const typeMap: Record<string, string> = {
    'over_ear': 'over-ear',
    'on_ear': 'on-ear',
    'in_ear': 'in-ear',
    'earbuds': 'earbuds',
  };
  const displayType = typeMap[headphone.headphoneType] || 'over-ear';

  // Use imageUrl from headphone data if available, otherwise fall back to utility
  const primaryImage = (headphone.imageUrl && headphone.imageUrl.startsWith('http'))
    ? headphone.imageUrl
    : getHeadphoneImageUrl(headphone.brand, headphone.model, displayType);
  const searchUrl = getHeadphoneSearchUrl(headphone.brand, headphone.model);

  return (
    <motion.div
      layout
      className={`
        relative overflow-hidden rounded-2xl
        ${isTopPick 
          ? 'bg-gradient-to-br from-sonic-pink/10 to-transparent ring-2 ring-sonic-pink/30' 
          : 'bg-white/[0.03] ring-1 ring-white/10 hover:ring-white/20'
        }
        transition-all duration-300
      `}
    >
      {/* Top pick badge */}
      {isTopPick && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-sonic-pink text-white text-sm font-semibold">
            <span>🏆</span>
            <span>Top Match</span>
          </div>
        </div>
      )}

      <div className={`p-6 ${isTopPick ? 'pt-16' : ''}`}>
        <div className="flex gap-6">
          {/* Product image */}
          <div
            className={`
              flex-shrink-0 rounded-xl overflow-hidden bg-white/5 relative group/img
              ${isTopPick ? 'w-40 h-40' : 'w-28 h-28'}
            `}
            onMouseEnter={() => setIsImageHovered(true)}
            onMouseLeave={() => setIsImageHovered(false)}
          >
            {!imageError ? (
              <Image
                src={primaryImage}
                alt={`${headphone.brand} ${headphone.model}`}
                fill
                className="object-cover transition-transform duration-300 group-hover/img:scale-105"
                sizes={isTopPick ? '160px' : '112px'}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🎧
              </div>
            )}

            {/* View More Images overlay */}
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-200 ${isImageHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm
                            border border-white/20 text-white text-xs font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                More
              </div>
            </a>
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/40 mb-1">{headphone.brand}</p>
                <h3 className={`font-display font-bold text-white ${isTopPick ? 'text-2xl' : 'text-xl'}`}>
                  {headphone.model}
                </h3>
              </div>
              
              {/* Match score */}
              <div className="text-right">
                <div className={`
                  inline-flex items-center justify-center rounded-full
                  ${isTopPick ? 'w-16 h-16' : 'w-14 h-14'}
                  bg-gradient-to-br from-sonic-pink to-sonic-coral
                `}>
                  <span className={`font-bold text-white ${isTopPick ? 'text-xl' : 'text-lg'}`}>
                    {overallScore}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-1">match</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/60">
                ${headphone.priceUsd}
              </span>
              <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/60">
                {headphone.headphoneType.replace('_', '-')}
              </span>
              {headphone.isWireless && (
                <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/60">
                  Wireless
                </span>
              )}
              {headphone.hasAnc && (
                <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/60">
                  ANC
                </span>
              )}
              <span className="px-2 py-1 text-xs rounded-full bg-sonic-pink/20 text-sonic-pink">
                {headphone.soundSignature}
              </span>
            </div>

            {/* Match highlights */}
            {isTopPick && matchHighlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {matchHighlights.map((highlight) => (
                  <span key={highlight} className="flex items-center gap-1 text-sm text-white/70">
                    <svg className="w-4 h-4 text-sonic-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-5 gap-2 mt-6">
          {[
            { label: 'Genre', value: scores.genreMatch },
            { label: 'Sound', value: scores.soundProfile },
            { label: 'Use Case', value: scores.useCase },
            { label: 'Budget', value: scores.budget },
            { label: 'Features', value: scores.featureMatch },
          ].map((score) => (
            <div key={score.label} className="text-center">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                <motion.div
                  className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral"
                  initial={{ width: 0 }}
                  animate={{ width: `${score.value * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <span className="text-[10px] text-white/30">{score.label}</span>
            </div>
          ))}
        </div>

        {/* Expandable section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-6 border-t border-white/10">
                {/* Explanation */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white/60 mb-2">Why This Matches You</h4>
                  <p className="text-sm text-white/80 leading-relaxed">{explanation}</p>
                </div>

                {/* Personalized pros/cons */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-sonic-success mb-2">For You</h4>
                    <ul className="space-y-2">
                      {personalizedPros.map((pro) => (
                        <li key={pro} className="flex items-start gap-2 text-sm text-white/70">
                          <svg className="w-4 h-4 text-sonic-success flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-sonic-warning mb-2">Consider</h4>
                    <ul className="space-y-2">
                      {personalizedCons.map((con) => (
                        <li key={con} className="flex items-start gap-2 text-sm text-white/70">
                          <svg className="w-4 h-4 text-sonic-warning flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <span>{isExpanded ? 'Less details' : 'More details'}</span>
            <motion.svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              animate={{ rotate: isExpanded ? 180 : 0 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onCompareToggle}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all
                ${isInCompare
                  ? 'bg-sonic-pink/20 text-sonic-pink border border-sonic-pink/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }
              `}
            >
              {isInCompare ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>In Compare</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Compare</span>
                </>
              )}
            </button>

            <button className="px-4 py-2 rounded-lg text-sm font-medium
                             bg-white text-sonic-black hover:bg-white/90 transition-colors">
              View Details
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
