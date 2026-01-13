'use client';

import { motion } from 'framer-motion';

export function ResultsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Loading animation */}
      <motion.div
        className="flex flex-col items-center justify-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Animated waveform */}
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-gradient-to-t from-sonic-pink to-sonic-coral rounded-full"
              animate={{
                height: ['20px', '40px', '20px'],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        
        <motion.p
          className="text-white/50 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyzing your sound preferences...
        </motion.p>
      </motion.div>

      {/* Top pick skeleton */}
      <div className="skeleton h-64 rounded-2xl" />

      {/* Other results skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}
