'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  minimal?: boolean;
}

export function Navigation({ minimal = false }: NavigationProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        className={`
          fixed top-0 left-0 right-0 z-50 px-6 py-4
          transition-all duration-300
          ${isScrolled ? 'bg-sonic-black/80 backdrop-blur-xl border-b border-white/5' : ''}
        `}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-sonic-pink to-sonic-coral
                        flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
              </svg>
            </motion.div>
            <span className="font-display text-xl font-bold text-white">
              Sonic<span className="text-sonic-pink">Match</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {!minimal && (
            <div className="hidden md:flex items-center gap-8">
              <NavLink href="/browse" active={pathname === '/browse'}>
                Browse All
              </NavLink>
              <NavLink href="/compare" active={pathname === '/compare'}>
                Compare
              </NavLink>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-4">
            {!minimal && (
              <Link href="/find-my-sound"><motion.div
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-sonic-pink text-white font-medium text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Find My Sound
              </motion.div></Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div 
              className="absolute inset-0 bg-sonic-black/95 backdrop-blur-xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-sonic-dark/95 
                        border-l border-white/10 p-6 pt-20"
            >
              <div className="space-y-4">
                <MobileNavLink href="/browse" onClick={() => setIsMobileMenuOpen(false)}>
                  Browse All
                </MobileNavLink>
                <MobileNavLink href="/compare" onClick={() => setIsMobileMenuOpen(false)}>
                  Compare
                </MobileNavLink>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`
        relative text-sm font-medium transition-colors
        ${active ? 'text-white' : 'text-white/50 hover:text-white'}
      `}
    >
      {children}
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-sonic-pink rounded-full"
        />
      )}
    </Link>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block py-3 text-lg font-medium text-white/70 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
