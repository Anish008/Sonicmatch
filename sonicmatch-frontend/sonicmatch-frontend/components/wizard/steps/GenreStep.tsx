'use client';

import { motion } from 'framer-motion';
import { useWizardStore, type Genre } from '@/stores';

interface GenreData {
  id: Genre;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const GENRES: GenreData[] = [
  {
    id: 'rock',
    name: 'Rock',
    icon: '🎸',
    color: 'from-orange-500 to-red-600',
    description: 'Guitar-driven energy',
  },
  {
    id: 'electronic',
    name: 'Electronic',
    icon: '🎹',
    color: 'from-cyan-400 to-blue-600',
    description: 'Synths & beats',
  },
  {
    id: 'hip_hop',
    name: 'Hip-Hop',
    icon: '🎤',
    color: 'from-yellow-500 to-orange-600',
    description: 'Bars & bass',
  },
  {
    id: 'pop',
    name: 'Pop',
    icon: '✨',
    color: 'from-pink-400 to-purple-600',
    description: 'Catchy & polished',
  },
  {
    id: 'classical',
    name: 'Classical',
    icon: '🎻',
    color: 'from-amber-300 to-yellow-600',
    description: 'Orchestral depth',
  },
  {
    id: 'jazz',
    name: 'Jazz',
    icon: '🎷',
    color: 'from-indigo-400 to-purple-600',
    description: 'Smooth & complex',
  },
  {
    id: 'metal',
    name: 'Metal',
    icon: '🤘',
    color: 'from-gray-600 to-gray-900',
    description: 'Heavy & intense',
  },
  {
    id: 'indie',
    name: 'Indie',
    icon: '🌿',
    color: 'from-emerald-400 to-teal-600',
    description: 'Alternative vibes',
  },
  {
    id: 'rnb',
    name: 'R&B',
    icon: '💜',
    color: 'from-purple-500 to-pink-600',
    description: 'Soulful grooves',
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    icon: '🪕',
    color: 'from-amber-500 to-orange-600',
    description: 'Intimate & warm',
  },
  {
    id: 'country',
    name: 'Country',
    icon: '🤠',
    color: 'from-yellow-600 to-amber-700',
    description: 'Storytelling & twang',
  },
  {
    id: 'blues',
    name: 'Blues',
    icon: '🎺',
    color: 'from-blue-600 to-indigo-800',
    description: 'Raw emotion',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export function GenreStep() {
  const { preferences, toggleGenre } = useWizardStore();
  const selectedGenres = preferences.genres;
  
  return (
    <div className="space-y-8">
      {/* Selection hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-2 text-white/40"
      >
        <span className="text-sm">
          {selectedGenres.length === 0
            ? 'Select at least one genre'
            : `${selectedGenres.length} genre${selectedGenres.length > 1 ? 's' : ''} selected`}
        </span>
        {selectedGenres.length > 0 && selectedGenres.length < 3 && (
          <span className="text-sm text-white/30">
            (tip: selecting 2-4 gives best results)
          </span>
        )}
      </motion.div>
      
      {/* Genre grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre.id);
          
          return (
            <motion.button
              key={genre.id}
              variants={itemVariants}
              onClick={() => toggleGenre(genre.id)}
              className={`
                group relative p-5 rounded-2xl text-left
                transition-all duration-300 overflow-hidden
                ${isSelected
                  ? 'bg-white/10 ring-2 ring-sonic-pink/50'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] ring-1 ring-white/10 hover:ring-white/20'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isSelected}
            >
              {/* Background gradient on selection */}
              {isSelected && (
                <motion.div
                  layoutId={`genre-bg-${genre.id}`}
                  className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-10`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.1 }}
                  exit={{ opacity: 0 }}
                />
              )}
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {genre.icon}
                  </span>
                  
                  {/* Checkbox indicator */}
                  <motion.div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      transition-colors
                      ${isSelected
                        ? 'bg-sonic-pink border-sonic-pink'
                        : 'border-white/20 group-hover:border-white/40'
                      }
                    `}
                  >
                    {isSelected && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </motion.svg>
                    )}
                  </motion.div>
                </div>
                
                <h3 className={`
                  font-semibold text-lg mb-1 transition-colors
                  ${isSelected ? 'text-white' : 'text-white/80'}
                `}>
                  {genre.name}
                </h3>
                <p className="text-sm text-white/40">
                  {genre.description}
                </p>
              </div>
              
              {/* Hover glow effect */}
              <div 
                className={`
                  absolute inset-0 opacity-0 group-hover:opacity-100
                  transition-opacity duration-500 pointer-events-none
                  bg-gradient-to-br ${genre.color} blur-xl
                `}
                style={{ opacity: isSelected ? 0.15 : 0 }}
              />
            </motion.button>
          );
        })}
      </motion.div>
      
      {/* Quick select options */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap justify-center gap-3 pt-4"
      >
        <QuickSelectButton
          label="Bass-heavy"
          genres={['hip_hop', 'electronic', 'rnb']}
        />
        <QuickSelectButton
          label="Audiophile"
          genres={['classical', 'jazz', 'acoustic']}
        />
        <QuickSelectButton
          label="High energy"
          genres={['rock', 'metal', 'electronic']}
        />
      </motion.div>
    </div>
  );
}

function QuickSelectButton({ 
  label, 
  genres 
}: { 
  label: string; 
  genres: Genre[];
}) {
  const { preferences, toggleGenre } = useWizardStore();
  
  const handleClick = () => {
    // Clear current selection and set these genres
    const currentGenres = [...preferences.genres];
    currentGenres.forEach((g) => {
      if (!genres.includes(g)) toggleGenre(g);
    });
    genres.forEach((g) => {
      if (!preferences.genres.includes(g)) toggleGenre(g);
    });
  };
  
  const isActive = genres.every((g) => preferences.genres.includes(g));
  
  return (
    <button
      onClick={handleClick}
      className={`
        px-4 py-2 rounded-full text-sm font-medium
        transition-all duration-200
        ${isActive
          ? 'bg-sonic-pink/20 text-sonic-pink border border-sonic-pink/30'
          : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
        }
      `}
    >
      {label}
    </button>
  );
}
