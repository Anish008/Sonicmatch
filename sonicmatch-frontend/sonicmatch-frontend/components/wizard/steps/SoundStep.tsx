'use client';

import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useWizardStore } from '@/stores';
import { useListeningTestStore } from '@/stores/listeningTestStore';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
  color?: string;
  description?: string;
  tooltip?: string;
}

function InfoTooltip({ text }: { text: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block z-50">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-help"
      >
        <svg
          className="w-4 h-4 text-white/40 hover:text-sonic-pink transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-[100] w-64 p-3 rounded-lg
                     bg-sonic-dark border border-white/20 shadow-xl pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(100% + 8px)',
          }}
        >
          <p className="text-xs text-white/80 leading-relaxed">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-sonic-dark border-r border-b border-white/20 rotate-45"></div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SoundSlider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
  color = 'sonic-pink',
  description,
  tooltip,
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const percentage = value * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white/80">
            {label}
          </label>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <span className="text-sm text-white/40 tabular-nums">
          {Math.round(percentage)}%
        </span>
      </div>
      
      {description && (
        <p className="text-xs text-white/30">{description}</p>
      )}

      <div className="relative">
        {/* Track background */}
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          {/* Fill */}
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sonic-pink to-sonic-coral"
            style={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Native range input (invisible but functional) */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label}
        />

        {/* Custom thumb */}
        <motion.div
          className={`
            absolute top-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full bg-white shadow-lg
            pointer-events-none
            ${isDragging ? 'ring-4 ring-sonic-pink/40' : ''}
          `}
          style={{ left: `${percentage}%` }}
          animate={{
            scale: isDragging ? 1.2 : 1,
            boxShadow: isDragging
              ? '0 0 20px rgba(255, 45, 85, 0.5)'
              : '0 4px 10px rgba(0, 0, 0, 0.3)',
          }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/30">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function SpiderChart() {
  const { preferences } = useWizardStore();
  const { bass, mids, treble, soundstage, detail } = preferences.soundPreferences;

  // Pentagon points for spider chart (5 axes for 5 attributes)
  const attributes = [
    { name: 'Bass', value: bass, angle: -90 },
    { name: 'Mids', value: mids, angle: -18 },
    { name: 'Treble', value: treble, angle: 54 },
    { name: 'Detail', value: detail, angle: 126 },
    { name: 'Soundstage', value: soundstage, angle: 198 },
  ];

  const centerX = 50;
  const centerY = 50;
  const maxRadius = 35;
  const levels = 5;

  // Calculate point position on spider chart
  const getPoint = (angle: number, value: number) => {
    const radian = (angle * Math.PI) / 180;
    const radius = value * maxRadius;
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian),
    };
  };

  // Generate path for data polygon
  const dataPoints = attributes.map(attr => getPoint(attr.angle, attr.value));
  const dataPath = `M ${dataPoints.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;

  // Generate background level circles
  const levelCircles = Array.from({ length: levels }, (_, i) => {
    const levelValue = (i + 1) / levels;
    const points = attributes.map(attr => getPoint(attr.angle, levelValue));
    return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
  });

  return (
    <div className="relative bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-sm font-medium text-white/60 mb-4">
        Your Sound Profile
      </h3>

      <div className="relative aspect-square max-w-md mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="spiderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 45, 85, 0.4)" />
              <stop offset="100%" stopColor="rgba(255, 107, 138, 0.4)" />
            </linearGradient>
          </defs>

          {/* Background level polygons */}
          {levelCircles.map((path, i) => (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          ))}

          {/* Axis lines */}
          {attributes.map((attr, i) => {
            const endPoint = getPoint(attr.angle, 1);
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Data polygon fill */}
          <motion.path
            d={dataPath}
            fill="url(#spiderGradient)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ transformOrigin: '50% 50%' }}
          />

          {/* Data polygon outline */}
          <motion.path
            d={dataPath}
            fill="none"
            stroke="#FF2D55"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Data points */}
          {dataPoints.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="2"
              fill="#FF2D55"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
            />
          ))}

          {/* Attribute labels */}
          {attributes.map((attr, i) => {
            const labelPoint = getPoint(attr.angle, 1.15);
            return (
              <text
                key={i}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[6px] fill-white/60 font-medium"
              >
                {attr.name}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function GeneratedProfileBanner() {
  const listeningTestPrefs = useListeningTestStore((s) => s.preferences);
  const analysisResult = useListeningTestStore((s) => s.analysisResult);
  const testCompletedAt = useListeningTestStore((s) => s.testCompletedAt);
  const { setSoundPreference } = useWizardStore();
  const [isApplied, setIsApplied] = useState(false);

  // Check if user has completed the listening test
  const hasGeneratedProfile = testCompletedAt && analysisResult;

  if (!hasGeneratedProfile) {
    return null;
  }

  const applyProfile = () => {
    // Apply listening test preferences to wizard
    Object.entries(listeningTestPrefs).forEach(([key, value]) => {
      setSoundPreference(key as keyof typeof listeningTestPrefs, value);
    });
    setIsApplied(true);
  };

  const profileName = analysisResult?.profileName || 'Your Sound Profile';
  const signature = analysisResult?.soundSignature || 'Custom';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-sonic-pink/10 to-sonic-coral/10
                 border border-sonic-pink/20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sonic-pink to-sonic-coral
                          flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-sonic-pink uppercase tracking-wider mb-1">
              Generated Sound Profile
            </p>
            <h3 className="font-semibold text-white text-lg">{profileName}</h3>
            <p className="text-white/50 text-sm">
              {signature} signature from your listening test
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini preview of profile values */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
            {Object.entries(listeningTestPrefs).map(([key, value]) => (
              <div key={key} className="flex flex-col items-center">
                <span className="text-[10px] text-white/40 uppercase">{key.slice(0, 3)}</span>
                <span className="text-xs text-white/70 font-mono">{Math.round(value * 100)}%</span>
              </div>
            ))}
          </div>

          <motion.button
            onClick={applyProfile}
            disabled={isApplied}
            className={`
              px-5 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-200
              ${isApplied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                : 'bg-sonic-pink text-white hover:bg-sonic-pink/90 shadow-lg shadow-sonic-pink/20'
              }
            `}
            whileHover={!isApplied ? { scale: 1.02 } : {}}
            whileTap={!isApplied ? { scale: 0.98 } : {}}
          >
            {isApplied ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Applied
              </span>
            ) : (
              'Apply My Profile'
            )}
          </motion.button>
        </div>
      </div>

      {/* Detailed breakdown (expandable on mobile) */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 pt-4 border-t border-white/10 sm:hidden"
      >
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(listeningTestPrefs).map(([key, value]) => (
            <div key={key} className="flex flex-col items-center">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-gradient-to-r from-sonic-pink to-sonic-coral rounded-full"
                  style={{ width: `${value * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-white/40 uppercase">{key}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SoundStep() {
  const { preferences, setSoundPreference } = useWizardStore();
  const { bass, mids, treble, soundstage, detail } = preferences.soundPreferences;

  return (
    <div className="space-y-8">
      {/* Generated profile banner - shows if user completed listening test */}
      <GeneratedProfileBanner />

      {/* Main EQ sliders */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="card-glass p-6 overflow-visible rounded-xl">
          <SoundSlider
            label="Bass"
            value={bass}
            onChange={(v) => setSoundPreference('bass', v)}
            leftLabel="Light"
            rightLabel="Heavy"
            description="Low frequency presence"
          />
        </div>

        <div className="card-glass p-6 overflow-visible rounded-xl">
          <SoundSlider
            label="Mids"
            value={mids}
            onChange={(v) => setSoundPreference('mids', v)}
            leftLabel="Recessed"
            rightLabel="Forward"
            description="Vocal and instrument clarity"
          />
        </div>

        <div className="card-glass p-6 overflow-visible rounded-xl">
          <SoundSlider
            label="Treble"
            value={treble}
            onChange={(v) => setSoundPreference('treble', v)}
            leftLabel="Smooth"
            rightLabel="Bright"
            description="High frequency sparkle"
          />
        </div>
      </div>

      {/* Spider chart visualizer */}
      <SpiderChart />

      {/* Advanced preferences */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-glass p-6 overflow-visible rounded-xl">
          <SoundSlider
            label="Soundstage"
            value={soundstage}
            onChange={(v) => setSoundPreference('soundstage', v)}
            leftLabel="Intimate"
            rightLabel="Expansive"
            description="How wide and spacious the sound feels"
            tooltip="Soundstage is the perception of space in audio. An intimate soundstage feels like music is close to you (like a small room), while an expansive soundstage feels wide and open (like a concert hall). Close your eyes and imagine where instruments are positioned - that's soundstage!"
          />
        </div>

        <div className="card-glass p-6 overflow-visible rounded-xl">
          <SoundSlider
            label="Detail"
            value={detail}
            onChange={(v) => setSoundPreference('detail', v)}
            leftLabel="Musical"
            rightLabel="Analytical"
            description="Smoothness vs. micro-detail retrieval"
            tooltip="Detail refers to how much fine information you hear. Musical (low detail) sounds smooth and pleasant but may blur subtle nuances. Analytical (high detail) reveals every breath, string pluck, and texture - great for critical listening but can be fatiguing. Think: relaxing vs. dissecting the music."
          />
        </div>
      </div>
      
      {/* Preset suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-3"
      >
        <PresetButton
          label="Balanced"
          preset={{ bass: 0.5, mids: 0.5, treble: 0.5, soundstage: 0.5, detail: 0.5 }}
        />
        <PresetButton
          label="Bass Boost"
          preset={{ bass: 0.8, mids: 0.45, treble: 0.5, soundstage: 0.4, detail: 0.4 }}
        />
        <PresetButton
          label="V-Shape"
          preset={{ bass: 0.75, mids: 0.4, treble: 0.75, soundstage: 0.6, detail: 0.55 }}
        />
        <PresetButton
          label="Audiophile"
          preset={{ bass: 0.45, mids: 0.6, treble: 0.55, soundstage: 0.8, detail: 0.85 }}
        />
        <PresetButton
          label="Warm"
          preset={{ bass: 0.65, mids: 0.55, treble: 0.4, soundstage: 0.5, detail: 0.4 }}
        />
      </motion.div>
    </div>
  );
}

function PresetButton({
  label,
  preset,
}: {
  label: string;
  preset: {
    bass: number;
    mids: number;
    treble: number;
    soundstage: number;
    detail: number;
  };
}) {
  const { setSoundPreference, preferences } = useWizardStore();
  
  const applyPreset = () => {
    Object.entries(preset).forEach(([key, value]) => {
      setSoundPreference(key as keyof typeof preset, value);
    });
  };
  
  // Check if current settings match this preset (within tolerance)
  const isActive = Object.entries(preset).every(([key, value]) => {
    const current = preferences.soundPreferences[key as keyof typeof preset];
    return Math.abs(current - value) < 0.1;
  });
  
  return (
    <button
      onClick={applyPreset}
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
