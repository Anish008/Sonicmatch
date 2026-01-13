'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionTemplate } from 'framer-motion';
import Link from 'next/link';
import { AudioWaveform } from '@/components/landing/AudioWaveform';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/layout/Footer';
import { Navigation } from '@/components/layout/Navigation';

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.5, 1], [0, 2, 8]);
  const filter = useMotionTemplate`blur(${heroBlur}px)`;

  return (
    <div className="relative bg-sonic-black">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient mesh */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 45, 85, 0.15), transparent),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(255, 85, 120, 0.08), transparent),
              radial-gradient(ellipse 50% 30% at 20% 80%, rgba(180, 45, 85, 0.1), transparent)
            `,
          }}
        />
        
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(255, 45, 85, 0.2) 0%, transparent 70%)',
            left: '10%',
            top: '20%',
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(255, 120, 150, 0.12) 0%, transparent 70%)',
            right: '5%',
            bottom: '30%',
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, -50, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <Navigation />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-6"
        style={{
          opacity: heroOpacity,
          scale: heroScale,
          y: heroY,
          filter,
        }}
      >

        <div className="max-w-5xl mx-auto text-center">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full
                       bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-sonic-pink animate-pulse" />
            <span className="text-sm font-medium text-white/70 tracking-wide">
              AI-Powered Audio Matching
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-display text-6xl md:text-8xl lg:text-9xl font-bold
                       tracking-tight leading-[0.9] mb-6"
          >
            <span className="text-white">Find Your</span>
            <br />
            <span className="relative">
              <span className="bg-gradient-to-r from-sonic-pink via-sonic-red to-sonic-pink 
                             bg-clip-text text-transparent bg-[length:200%_auto]
                             animate-gradient-x">
                Perfect Sound
              </span>
              {/* Glow effect */}
              <span 
                className="absolute inset-0 bg-gradient-to-r from-sonic-pink via-sonic-red to-sonic-pink 
                           bg-clip-text text-transparent blur-2xl opacity-50 -z-10"
                aria-hidden="true"
              >
                Perfect Sound
              </span>
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-12
                       font-light leading-relaxed"
          >
            Tell us what you listen to. We&apos;ll find headphones that make your
            music come alive—matched by AI to your exact taste.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/wizard">
              <motion.button
                className="group relative px-8 py-4 rounded-2xl font-semibold text-lg
                           bg-gradient-to-r from-sonic-pink to-sonic-red
                           text-white shadow-lg shadow-sonic-pink/25
                           overflow-hidden"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent
                             via-white/20 to-transparent -translate-x-full pointer-events-none"
                  animate={{ translateX: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                <span className="relative flex items-center gap-2">
                  Start Matching!
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </motion.svg>
                </span>
              </motion.button>
            </Link>

            <motion.button
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
              className="group relative px-8 py-4 rounded-2xl font-semibold text-lg
                         text-white/80 border-2 border-white/20
                         hover:bg-white/5 hover:border-white/40
                         transition-all overflow-hidden"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {/* Animated background on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-sonic-pink/10 to-sonic-coral/10 opacity-0 pointer-events-none"
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative flex items-center gap-2">
                See How It Works
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:translate-y-1 transition-transform"
                >
                  <path d="m6 9 6 6 6-6"/>
                </motion.svg>
              </span>
            </motion.button>
          </motion.div>

          {/* Audio waveform visualization */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-16"
          >
            <AudioWaveform />
          </motion.div>
        </div>
      </motion.section>

      {/* Scrollable content sections */}
      <div className="relative z-10">
        {/* Features Section */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6">
                Sound, Personalized
              </h2>
              <p className="text-xl text-white/50 max-w-2xl mx-auto">
                Our AI analyzes your music taste across dozens of dimensions to find 
                headphones that complement exactly how you listen.
              </p>
            </motion.div>
            <FeatureGrid />
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-32 px-6 bg-gradient-to-b from-transparent via-sonic-pink/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <HowItWorks />
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <Testimonials />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="relative p-12 md:p-20 rounded-3xl overflow-hidden
                           bg-gradient-to-br from-sonic-pink/20 to-sonic-red/10
                           border border-white/10">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-sonic-pink/10 to-transparent" />
              
              <div className="relative z-10">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
                  Ready to find your sound?
                </h2>
                <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
                  Join thousands of listeners who&apos;ve discovered their perfect headphones
                  through SonicMatch.
                </p>
                <Link href="/wizard">
                  <motion.button
                    className="px-10 py-5 rounded-2xl font-semibold text-lg
                               bg-white text-sonic-black
                               shadow-xl shadow-white/10"
                    whileHover={{ scale: 1.05, boxShadow: '0 25px 50px -12px rgba(255, 255, 255, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Started — It&apos;s Free
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
