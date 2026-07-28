'use client';

import { motion } from 'framer-motion';
import type { Citation } from '@/stores';

interface CitationsProps {
  citations: Citation[];
}

const sourceTypeDisplay: Record<Citation['sourceType'], { label: string; icon: string; color: string }> = {
  expert_review: { label: 'Expert Review', icon: '⭐', color: 'text-sonic-pink' },
  review: { label: 'User Review', icon: '👤', color: 'text-blue-400' },
  forum_post: { label: 'Forum', icon: '💬', color: 'text-green-400' },
  spec_sheet: { label: 'Spec Sheet', icon: '📄', color: 'text-yellow-400' },
};

export function Citations({ citations }: CitationsProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h4 className="text-sm font-medium text-white/60">
          Backed by {citations.length} {citations.length === 1 ? 'source' : 'sources'}
        </h4>
      </div>

      <div className="space-y-3">
        {citations.map((citation, index) => {
          const sourceInfo = sourceTypeDisplay[citation.sourceType];
          const domain = new URL(citation.sourceUrl).hostname.replace('www.', '');

          return (
            <motion.a
              key={index}
              href={citation.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="relative p-3 rounded-lg bg-white/[0.03] border border-white/5
                            hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200">
                <div className="flex items-start gap-3">
                  {/* Source type indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-lg" title={sourceInfo.label}>
                      {sourceInfo.icon}
                    </span>
                  </div>

                  {/* Citation content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 leading-relaxed mb-2">
                      &ldquo;{citation.claim}&rdquo;
                    </p>

                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span className={sourceInfo.color}>{sourceInfo.label}</span>
                      <span>•</span>
                      <span className="truncate">{domain}</span>

                      {/* External link icon */}
                      <svg
                        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover indicator */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-sonic-pink/0 via-sonic-pink/5 to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </motion.a>
          );
        })}
      </div>

      {/* Powered by RAG indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
        </svg>
        <span>AI-generated recommendations grounded in real reviews</span>
      </div>
    </div>
  );
}
