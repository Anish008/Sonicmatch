'use client';

import { motion } from 'framer-motion';
import { useWizardStore, type HeadphoneType } from '@/stores';

const FORM_FACTORS: { id: HeadphoneType; name: string; description: string; icon: string }[] = [
  { id: 'over_ear', name: 'Over-Ear', description: 'Full-size cups around ears', icon: '🎧' },
  { id: 'on_ear', name: 'On-Ear', description: 'Compact cups on ears', icon: '🎤' },
  { id: 'in_ear', name: 'In-Ear (IEMs)', description: 'Insert into ear canal', icon: '🔌' },
  { id: 'earbuds', name: 'Earbuds (TWS)', description: 'True wireless earbuds', icon: '🎵' },
];

export function FeaturesStep() {
  const { preferences, updatePreferences } = useWizardStore();
  const { preferredType, openBackAcceptable, wirelessRequired, ancRequired, additionalNotes } = preferences;

  return (
    <div className="space-y-10">
      {/* Form factor */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white/80 text-center">Form Factor Preference</h3>
        <p className="text-sm text-white/40 text-center">Optional – leave unselected for all types</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FORM_FACTORS.map((type) => {
            const isSelected = preferredType === type.id;
            return (
              <motion.button
                key={type.id}
                onClick={() => updatePreferences({ 
                  preferredType: isSelected ? null : type.id 
                })}
                className={`
                  p-4 rounded-xl text-center transition-all
                  ${isSelected
                    ? 'bg-sonic-pink/20 ring-2 ring-sonic-pink'
                    : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl block mb-2">{type.icon}</span>
                <span className="font-medium text-white text-sm">{type.name}</span>
                <span className="block text-xs text-white/40 mt-1">{type.description}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Feature toggles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white/80 text-center">Features & Requirements</h3>
        
        <div className="max-w-md mx-auto space-y-3">
          <ToggleOption
            label="Wireless Required"
            description="Must be Bluetooth/wireless"
            checked={wirelessRequired}
            onChange={(v) => updatePreferences({ wirelessRequired: v })}
          />
          
          <ToggleOption
            label="Active Noise Cancellation"
            description="ANC is a must-have"
            checked={ancRequired}
            onChange={(v) => updatePreferences({ ancRequired: v })}
          />
          
          <ToggleOption
            label="Open-Back Acceptable"
            description="Allow open-back headphones"
            checked={openBackAcceptable}
            onChange={(v) => updatePreferences({ openBackAcceptable: v })}
            invertColors
          />
        </div>
      </div>

      {/* Additional notes */}
      <div className="max-w-xl mx-auto space-y-3">
        <h3 className="text-lg font-medium text-white/80 text-center">Anything Else?</h3>
        <p className="text-sm text-white/40 text-center">Share specific needs or preferences</p>
        
        <textarea
          value={additionalNotes}
          onChange={(e) => updatePreferences({ additionalNotes: e.target.value })}
          placeholder="e.g., 'I have a small head', 'Need replaceable cables', 'Glasses-friendly'"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                     text-white placeholder:text-white/30 resize-none
                     focus:border-sonic-pink/50 focus:bg-white/8 transition-all outline-none"
        />
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
  invertColors = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  invertColors?: boolean;
}) {
  const activeColor = invertColors ? (checked ? 'bg-sonic-pink' : 'bg-white/20') : (checked ? 'bg-sonic-pink' : 'bg-white/20');
  
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        w-full flex items-center justify-between p-4 rounded-xl
        transition-all duration-200
        ${checked ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5'}
      `}
    >
      <div className="text-left">
        <div className="font-medium text-white">{label}</div>
        <div className="text-sm text-white/40">{description}</div>
      </div>
      
      <div className={`
        relative w-12 h-7 rounded-full transition-colors duration-200
        ${checked ? 'bg-sonic-pink' : 'bg-white/20'}
      `}>
        <motion.div
          className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
