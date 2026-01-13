'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  {
    number: '01',
    title: 'Share Your Taste',
    description: 'Tell us about the music you love—genres, artists, and how you like your audio.',
    visual: '🎵',
  },
  {
    number: '02',
    title: 'AI Analysis',
    description: 'Our engine maps your preferences to acoustic characteristics and use cases.',
    visual: '🧠',
  },
  {
    number: '03',
    title: 'Smart Matching',
    description: 'We score hundreds of headphones against your unique sound profile.',
    visual: '⚡',
  },
  {
    number: '04',
    title: 'Perfect Picks',
    description: 'Get personalized recommendations with detailed explanations of why they fit.',
    visual: '🎧',
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  return (
    <div ref={containerRef}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          How It Works
        </h2>
        <p className="text-lg text-white/50">
          From your music taste to your perfect headphones in four simple steps
        </p>
      </motion.div>

      <div className="relative">
        <div className="space-y-12 md:space-y-24">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`flex items-center gap-8 md:gap-16 ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              {/* Content */}
              <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                <span className="inline-block text-sm font-mono text-sonic-pink mb-2">
                  {step.number}
                </span>
                <h3 className="text-2xl font-display font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/50 max-w-sm">
                  {step.description}
                </p>
              </div>

              {/* Center marker */}
              <div className="hidden md:flex items-center justify-center">
                <motion.div
                  className="w-16 h-16 rounded-full bg-sonic-pink/10 border-2 border-sonic-pink
                             flex items-center justify-center text-2xl"
                  whileHover={{ scale: 1.1 }}
                >
                  {step.visual}
                </motion.div>
              </div>

              {/* Visual placeholder */}
              <div className="flex-1 hidden md:block">
                <div className={`
                  h-32 rounded-2xl bg-white/5 border border-white/10
                  flex items-center justify-center
                  ${index % 2 === 0 ? '' : ''}
                `}>
                  <span className="text-6xl opacity-50">{step.visual}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
