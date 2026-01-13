'use client';

import { motion } from 'framer-motion';

const FEATURES = [
  {
    title: 'Genre Analysis',
    description: 'We analyze your music taste across genres to understand what frequencies and characteristics matter most to you.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    color: 'from-pink-500 to-rose-600',
  },
  {
    title: 'Sound Profiling',
    description: 'Our AI maps your preferences to specific sound signatures—bass response, soundstage, detail retrieval, and more.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12h2m4 0h12M6 8v8m4-12v16m4-14v12m4-8v4" strokeLinecap="round" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-600',
  },
  {
    title: 'Use Case Matching',
    description: 'Gaming, travel, studio work, or casual listening—we factor in how and where you listen.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" strokeLinecap="round" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'from-cyan-500 to-blue-600',
  },
  {
    title: 'Expert Explanations',
    description: 'Every recommendation comes with a detailed explanation of why it matches your unique preferences.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4m0-4h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'from-amber-500 to-orange-600',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function FeatureGrid() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      className="grid md:grid-cols-2 gap-6"
    >
      {FEATURES.map((feature, index) => (
        <motion.div
          key={feature.title}
          variants={itemVariants}
          className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/10
                     hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500"
        >
          {/* Gradient glow on hover */}
          <div 
            className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
                       transition-opacity duration-500 bg-gradient-to-br ${feature.color} blur-xl -z-10`}
            style={{ transform: 'scale(0.9)', opacity: 0.15 }}
          />
          
          {/* Icon */}
          <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-6`}>
            <div className="text-white">
              {feature.icon}
            </div>
          </div>
          
          {/* Content */}
          <h3 className="text-xl font-display font-semibold text-white mb-3">
            {feature.title}
          </h3>
          <p className="text-white/50 leading-relaxed">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
