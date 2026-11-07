import React, { useEffect, useState } from 'react';
import {
  EvaluatedKillfeedEntry,
  getKillfeedLifecycleClasses,
  KillfeedEventCategory,
} from '../game/rules';

interface KillfeedOverlayProps {
  entries: EvaluatedKillfeedEntry[];
}

function renderCategoryGlyph(category: KillfeedEventCategory) {
  if (category === 'ELIMINATION') {
    // Gritty monochrome crosshair reticle glyph
    return (
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5 shrink-0 text-zinc-100"
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
        className="w-3.5 h-3.5 shrink-0 text-zinc-200"
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
      className="w-3.5 h-3.5 shrink-0 text-zinc-300"
      aria-hidden="true"
    >
      <polygon points="2,8 8,2 14,8 8,14" fill="currentColor" />
    </svg>
  );
}

const KillfeedEntryRow: React.FC<{ item: EvaluatedKillfeedEntry }> = ({ item }) => {
  const [isEntered, setIsEntered] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(true);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setIsEntered(true);
      });
    });
    const flashTimer = window.setTimeout(() => {
      setIsFlashActive(false);
    }, 360);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(flashTimer);
    };
  }, []);

  const stageClasses = getKillfeedLifecycleClasses(isEntered, item.opacity);
  const borderAccentClasses = isFlashActive
    ? 'border-l-white border-zinc-600/90 shadow-[0_0_18px_rgba(244,244,245,0.22)]'
    : 'border-l-zinc-100 border-zinc-800/90 shadow-[0_6px_18px_rgba(0,0,0,0.85)]';

  return (
    <div
      data-testid="killfeed-entry"
      data-entered={isEntered ? 'true' : 'false'}
      className={`relative overflow-hidden flex items-center gap-2.5 px-3 py-1.5 bg-[#090a0e]/95 border-l-2 border-y border-r transform-gpu transition-all duration-300 ease-out ${stageClasses} ${borderAccentClasses}`}
    >
      {/* Entry-Level Monochrome Telemetry Sweep Highlight */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-100/25 via-zinc-300/10 to-transparent transform-gpu transition-all duration-500 ease-out ${
          !isEntered
            ? '-translate-x-full opacity-100'
            : isFlashActive
              ? 'translate-x-28 opacity-75'
              : 'translate-x-80 opacity-0'
        }`}
      />

      {/* Gritty Sumi-e Monochrome Ink-and-Splash Background Brush Texture */}
      <svg
        viewBox="0 0 240 32"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
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

      {/* Monochrome Tactical Reticle / Glyph with Entry Scale Pulse */}
      <div
        className={`relative z-10 flex items-center justify-center w-5 h-5 border transform-gpu transition-all duration-300 ease-out ${
          isFlashActive
            ? 'scale-110 bg-zinc-800 border-zinc-300'
            : 'scale-100 bg-zinc-900 border-zinc-700/80'
        }`}
      >
        {renderCategoryGlyph(item.category)}
      </div>

      {/* Gritty Monochrome Event Copy with Staggered Slide-In */}
      <div
        className={`relative z-10 flex items-baseline gap-1.5 text-xs font-mono-tabular tracking-tight leading-snug transform-gpu transition-all duration-300 delay-75 ease-out ${
          !isEntered ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
        }`}
      >
        <span className="font-semibold text-zinc-100 whitespace-nowrap">
          {item.actor}
        </span>
        <span className="text-zinc-400 lowercase whitespace-nowrap">
          {item.verb}
        </span>
        <span
          className={`font-bold text-white border px-1.5 py-0.5 text-[11px] whitespace-nowrap transition-colors duration-300 ${
            isFlashActive
              ? 'bg-zinc-700/95 border-zinc-400'
              : 'bg-zinc-800/90 border-zinc-700/80'
          }`}
        >
          {item.subject}
        </span>
      </div>
    </div>
  );
};

export const KillfeedOverlay: React.FC<KillfeedOverlayProps> = ({ entries }) => {
  if (entries.length === 0) return null;

  return (
    <aside
      aria-label="Tactical Combat Killfeed"
      data-testid="killfeed-overlay"
      className="flex flex-col items-end gap-1.5 pointer-events-none select-none w-full max-w-sm"
    >
      {entries.map((item) => (
        <KillfeedEntryRow key={item.id} item={item} />
      ))}
    </aside>
  );
};
