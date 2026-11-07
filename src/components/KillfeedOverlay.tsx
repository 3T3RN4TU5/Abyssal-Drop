import React from 'react';
import { EvaluatedKillfeedEntry, KillfeedEventCategory } from '../game/rules';

interface KillfeedOverlayProps {
  entries: EvaluatedKillfeedEntry[];
}

function renderCategoryGlyph(category: KillfeedEventCategory) {
  if (category === 'ELIMINATION') {
    // Gritty monochrome skull / crosshair reticle glyph
    return (
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5 shrink-0 text-zinc-200"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line x1="8" y1="0.5" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="11.5" x2="8" y2="15.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0.5" y1="8" x2="4.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11.5" y1="8" x2="15.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (category === 'EXTRACTION') {
    // Monochrome skyhook spire chevron glyph
    return (
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5 shrink-0 text-zinc-100"
        aria-hidden="true"
      >
        <path
          d="M 8 1.5 L 14 13.5 L 10.5 13.5 L 8 8.5 L 5.5 13.5 L 2 13.5 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (category === 'TERMINAL') {
    // Monochrome data octahedron glyph
    return (
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5 shrink-0 text-zinc-300"
        aria-hidden="true"
      >
        <polygon
          points="8,1.5 14.5,8 8,14.5 1.5,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect x="6.5" y="6.5" width="3" height="3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5 shrink-0 text-zinc-400"
      aria-hidden="true"
    >
      <polygon points="2,8 8,2 14,8 8,14" fill="currentColor" />
    </svg>
  );
}

export const KillfeedOverlay: React.FC<KillfeedOverlayProps> = ({ entries }) => {
  if (entries.length === 0) return null;

  return (
    <aside
      aria-label="Tactical Combat Killfeed"
      data-testid="killfeed-overlay"
      className="flex flex-col items-end gap-1.5 pointer-events-none select-none w-full max-w-sm"
    >
      {entries.map((item) => {
        const translateY = item.opacity < 0.35 ? -4 : 0;
        return (
          <div
            key={item.id}
            style={{
              opacity: item.opacity,
              transform: `translateY(${translateY}px)`,
            }}
            className="relative overflow-hidden flex items-center gap-2.5 px-3 py-1.5 bg-[#090a0e]/95 border-l-2 border-l-zinc-100 border-y border-r border-zinc-800/90 shadow-[0_6px_18px_rgba(0,0,0,0.85)] transition-all duration-200"
          >
            {/* Gritty Sumi-e Monochrome Ink-and-Splash Background Brush Texture */}
            <svg
              viewBox="0 0 240 32"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-22 pointer-events-none"
              aria-hidden="true"
            >
              <path
                d="M 0 0 L 195 0 C 178 9, 215 16, 184 25 C 165 29, 205 32, 170 32 L 0 32 Z"
                fill="#27272a"
              />
              <circle cx="198" cy="8" r="2.2" fill="#52525b" />
              <circle cx="212" cy="19" r="1.4" fill="#3f3f46" />
              <circle cx="182" cy="26" r="1.8" fill="#52525b" />
              <circle cx="224" cy="11" r="1.1" fill="#3f3f46" />
            </svg>

            {/* Monochrome Tactical Reticle / Glyph */}
            <div className="relative z-10 flex items-center justify-center w-5 h-5 bg-zinc-900 border border-zinc-700/80">
              {renderCategoryGlyph(item.category)}
            </div>

            {/* Gritty Monochrome Event Copy */}
            <div className="relative z-10 flex items-baseline gap-1.5 text-xs font-mono-tabular tracking-tight leading-snug">
              <span className="font-semibold text-zinc-100 whitespace-nowrap">
                {item.actor}
              </span>
              <span className="text-zinc-400 lowercase whitespace-nowrap">
                {item.verb}
              </span>
              <span className="font-bold text-white bg-zinc-800/90 border border-zinc-700/80 px-1.5 py-0.5 text-[11px] whitespace-nowrap">
                {item.subject}
              </span>
            </div>
          </div>
        );
      })}
    </aside>
  );
};
