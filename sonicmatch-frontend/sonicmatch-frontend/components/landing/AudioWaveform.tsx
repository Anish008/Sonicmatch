'use client';

import { motion } from 'framer-motion';

export function AudioWaveform() {
  const bars = 40;
  
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 opacity-60">
      {Array.from({ length: bars }).map((_, i) => {
        // Create a wave pattern
        const delay = Math.sin((i / bars) * Math.PI * 2) * 0.3;
        const baseHeight = 20 + Math.sin((i / bars) * Math.PI) * 30;
        
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-sonic-pink/50 to-sonic-coral/80"
            initial={{ height: 4 }}
            animate={{
              height: [
                baseHeight * 0.3,
                baseHeight,
                baseHeight * 0.5,
                baseHeight * 0.8,
                baseHeight * 0.3,
              ],
            }}
            transition={{
              duration: 2 + Math.random() * 0.5,
              repeat: Infinity,
              delay: delay + (i * 0.02),
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}
