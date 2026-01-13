'use client';

import { motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote: "Finally found headphones that make my jazz collection sing. The recommendations were spot-on for the warm, detailed sound I was looking for.",
    author: "Marcus Chen",
    role: "Music Producer",
    avatar: "MC",
  },
  {
    quote: "As a gamer who also loves electronic music, I needed something versatile. SonicMatch recommended the perfect all-rounder.",
    author: "Sarah Kim",
    role: "Professional Gamer",
    avatar: "SK",
  },
  {
    quote: "The explanations helped me understand exactly why certain headphones would work for my classical listening. No more guessing.",
    author: "David Okonkwo",
    role: "Audiophile",
    avatar: "DO",
  },
];

export function Testimonials() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          Loved by Listeners
        </h2>
        <p className="text-lg text-white/50">
          Join thousands who&apos;ve found their perfect sound
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((testimonial, index) => (
          <motion.div
            key={testimonial.author}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-2xl bg-white/[0.03] border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sonic-pink to-sonic-coral
                            flex items-center justify-center font-semibold text-white">
                {testimonial.avatar}
              </div>
              <div>
                <div className="font-medium text-white">{testimonial.author}</div>
                <div className="text-sm text-white/40">{testimonial.role}</div>
              </div>
            </div>
            <p className="text-white/70 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
