'use client';

/**
 * ProfileResultStep
 *
 * Final step: Displays the sound profile based on A/B comparison results.
 * Shows a visual breakdown, characteristics, and recommended genres.
 */

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useListeningTestStore } from '@/stores/listeningTestStore';

export function ProfileResultStep() {
  const preferences = useListeningTestStore((s) => s.preferences);
  const analysisResult = useListeningTestStore((s) => s.analysisResult);
  const completeSession = useListeningTestStore((s) => s.completeSession);

  // Mark session as complete
  useEffect(() => {
    completeSession();
  }, [completeSession]);

  // Calculate radar chart points
  const radarPoints = useMemo(() => {
    const center = 100;
    const maxRadius = 80;
    const values = [
      preferences.bass,
      preferences.mids,
      preferences.treble,
      preferences.soundstage,
      preferences.detail,
    ];

    return values.map((value, i) => {
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const radius = value * maxRadius;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    });
  }, [preferences]);

  const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Use analysisResult if available, otherwise show default
  const profileName = analysisResult?.profileName || 'Sound Profile';
  const description = analysisResult?.profileDescription || 'Your personalized sound preference';
  const characteristics = analysisResult?.characteristics || [];
  const genres = analysisResult?.recommendedGenres || [];
  const signature = analysisResult?.soundSignature || 'Balanced';
  const confidenceScore = analysisResult?.confidenceScore || 0;

  return (
    <div className="space-y-8">
      {/* Header with animated reveal */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full
                     bg-gradient-to-br from-sonic-pink to-sonic-coral mb-6"
        >
          <span className="text-4xl">🎵</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm text-sonic-pink uppercase tracking-wider mb-2">
            Your Sound Profile
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gradient-pink">
            {profileName}
          </h2>
        </motion.div>

        <motion.p
          className="text-white/70 mt-4 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {description}
        </motion.p>

        {/* Confidence indicator */}
        {confidenceScore > 0 && (
          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="text-xs text-white/40">Confidence:</span>
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-sonic-pink rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${confidenceScore * 100}%` }}
                transition={{ delay: 0.8, duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-white/40">{Math.round(confidenceScore * 100)}%</span>
          </motion.div>
        )}
      </div>

      {/* Radar Chart */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Background circles */}
            {[0.25, 0.5, 0.75, 1].map((level) => (
              <circle
                key={level}
                cx="100"
                cy="100"
                r={level * 80}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            ))}

            {/* Axis lines */}
            {[0, 72, 144, 216, 288].map((angle) => {
              const rad = (angle - 90) * (Math.PI / 180);
              return (
                <line
                  key={angle}
                  x1="100"
                  y1="100"
                  x2={100 + 80 * Math.cos(rad)}
                  y2={100 + 80 * Math.sin(rad)}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Data area */}
            <motion.path
              d={radarPath}
              fill="url(#radarGradient)"
              stroke="url(#radarStroke)"
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              style={{ transformOrigin: '100px 100px' }}
            />

            {/* Data points */}
            {radarPoints.map((point, i) => (
              <motion.circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#FF2D55"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              />
            ))}

            {/* Gradient definitions */}
            <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 45, 85, 0.3)" />
                <stop offset="100%" stopColor="rgba(255, 107, 138, 0.3)" />
              </linearGradient>
              <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF2D55" />
                <stop offset="100%" stopColor="#FF6B8A" />
              </linearGradient>
            </defs>
          </svg>

          {/* Labels */}
          {['Bass', 'Mids', 'Treble', 'Stage', 'Detail'].map((label, i) => {
            const angle = (i * 72 - 90) * (Math.PI / 180);
            const labelRadius = 100;
            const x = 100 + labelRadius * Math.cos(angle);
            const y = 100 + labelRadius * Math.sin(angle);

            return (
              <motion.div
                key={label}
                className="absolute text-xs text-white/60 font-medium"
                style={{
                  left: `${(x / 200) * 100}%`,
                  top: `${(y / 200) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.1 }}
              >
                {label}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Characteristics */}
      {(characteristics.length > 0 || signature) && (
        <motion.div
          className="flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          {characteristics.map((char, index) => (
            <span
              key={index}
              className="px-3 py-1.5 rounded-full text-sm
                       bg-sonic-pink/20 text-sonic-pink border border-sonic-pink/30"
            >
              {char}
            </span>
          ))}
          <span
            className="px-3 py-1.5 rounded-full text-sm
                     bg-white/10 text-white/70 border border-white/20"
          >
            {signature}
          </span>
        </motion.div>
      )}

      {/* Recommended Genres */}
      {genres.length > 0 && (
        <motion.div
          className="card-glass p-6 rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
            Recommended Genres
          </h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <span
                key={genre}
                className="px-4 py-2 rounded-lg bg-white/5 text-white/80"
              >
                {genre}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Preference Values */}
      <motion.div
        className="card-glass p-6 rounded-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
          Your Preferences
        </h3>
        <div className="space-y-3">
          {Object.entries(preferences).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="text-sm text-white/60 w-24 capitalize">{key}</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${value * 100}%` }}
                  transition={{ delay: 1.3, duration: 0.5 }}
                />
              </div>
              <span className="text-sm font-mono text-white/40 w-12 text-right">
                {Math.round(value * 100)}%
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Detailed Explanation */}
      {analysisResult?.detailedExplanation && (
        <motion.div
          className="card-glass p-6 rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
            What This Means
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">
            {analysisResult.detailedExplanation}
          </p>
        </motion.div>
      )}
    </div>
  );
}
