import React, { useState } from 'react';
import {
  ALL_MISSION_MODIFIERS,
  CLASS_ABILITIES,
  ENEMY_LOADOUT_PROFILES,
  OPERATIVE_CLASSES,
  WEATHER_CONFIGS,
} from '../game/rules';

interface StudioPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunQaPreset: (preset: 'cloak_storm' | 'scarcity_fog' | 'high_yield_blitz') => void;
}

export const StudioPipelineModal: React.FC<StudioPipelineModalProps> = ({
  isOpen,
  onClose,
  onRunQaPreset,
}) => {
  const [activePhase, setActivePhase] = useState<'PLANNING' | 'PREPROD' | 'PRODUCTION' | 'QA'>('PLANNING');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-pipeline-heading"
    >
      <div className="ink-panel-accent rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 text-slate-100 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-400">
              AAA Iterative Development Lifecycle · Abyssal Drop: Black Telemetry
            </p>
            <h2 id="studio-pipeline-heading" className="font-display text-2xl font-bold text-white">
              Game Design Document (GDD), Architecture & QA Verification Suite
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
          >
            Close Studio Codex [G]
          </button>
        </div>

        {/* 4-Stage Pipeline Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'PLANNING', step: '01. Planning', sub: 'Concept, Scope & Market' },
            { id: 'PREPROD', step: '02. Pre-Production', sub: 'GDD & Mechanics Blueprint' },
            { id: 'PRODUCTION', step: '03. Production', sub: 'PBR 3D Assets & Systems' },
            { id: 'QA', step: '04. QA & Testing', sub: 'Stress Presets & Optimization' },
          ].map((tab) => {
            const active = activePhase === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePhase(tab.id as typeof activePhase)}
                className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 border-cyan-400'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-display font-bold text-sm text-white">{tab.step}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{tab.sub}</div>
              </button>
            );
          })}
        </div>

        {/* STAGE 1: PLANNING */}
        {activePhase === 'PLANNING' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2">
              <h3 className="font-display font-bold text-base text-cyan-300">
                01. High-Concept & Core Pillars
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Abyssal Drop: Black Telemetry</strong> merges gritty 3D third-person
                tactical extraction with real-time competitive esports analytics. A 4-player unit
                splits into <strong>3 Ground Operatives</strong> (Micro Execution) and{' '}
                <strong>1 Sky Analyst</strong> (Macro Strategy).
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                <div>· Pillar 1: Predictive Heatmaps over static minimaps</div>
                <div>· Pillar 2: Raw Terminal Data (GB) as tactical currency</div>
                <div>· Pillar 3: Sumi-e Ink-and-Splash peripheral threat telemetry</div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2">
              <h3 className="font-display font-bold text-base text-amber-300">
                02. Competitive Market Analysis
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Addresses the gap between high-skill tactical extraction shooters (Escape from
                Tarkov, Hunt: Showdown) and strategic command roles (Natural Selection, RTS
                co-op). Players who excel at macro-calls, probability reads, and economy routing
                can carry matches from the Sky Command deck.
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono-tabular text-slate-400 space-y-1">
                <div>Target Session Length: 4–8 min high-intensity drops</div>
                <div>Replayability Multiplier: {ALL_MISSION_MODIFIERS.length} Modifiers × 4 Weathers</div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2">
              <h3 className="font-display font-bold text-base text-emerald-300">
                03. Technical Resource & Frame Budget
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Engineered for deterministic 60 FPS WebGL execution with zero garbage collection
                inside the animation tick, pooled projectile/precipitation instancing, and
                automatic CPU/GPU frame pacing.
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono-tabular text-slate-400 space-y-1">
                <div>Tone Mapping: ACES Filmic + Studio PMREM IBL</div>
                <div>Shadow Casters: 1 Tight Orthographic Frustum (1024²)</div>
                <div>Particle & Cliff Instancing: Zero-GC InstancedMesh</div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: PRE-PRODUCTION GDD */}
        {activePhase === 'PREPROD' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(OPERATIVE_CLASSES).map((op) => {
                const ability = CLASS_ABILITIES[op.id];
                return (
                  <div
                    key={op.id}
                    className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-base text-white">
                        {op.callsign} · {op.title}
                      </span>
                      <span className="text-xs font-mono-tabular text-cyan-400">
                        {op.baseHp} HP · {op.baseSpeed} m/s
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{op.roleSummary}</p>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-semibold text-amber-300">
                        [{ability.keyHint}] {ability.name} (CD {ability.cooldownSec}s)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ability.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
              <h3 className="font-display font-bold text-sm text-white mb-2">
                Multi-Agent AI Faction Archetypes & Loadout Telemetry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(ENEMY_LOADOUT_PROFILES).map(([arch, prof]) => (
                  <div key={arch} className="p-3 rounded bg-slate-900 border border-slate-800 text-xs">
                    <div className="font-display font-bold uppercase text-red-400">{arch}</div>
                    <div className="text-slate-200 font-medium mt-1">{prof.weaponName}</div>
                    <div className="text-[11px] text-cyan-400 font-mono-tabular mt-0.5">
                      Armor: {prof.armorRating}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{prof.tacticalThreat}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: PRODUCTION */}
        {activePhase === 'PRODUCTION' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2.5">
              <h3 className="font-display font-bold text-base text-white">
                Dynamic Weather & Acoustic Propagation Matrix
              </h3>
              <div className="space-y-2">
                {Object.values(WEATHER_CONFIGS).map((w) => (
                  <div
                    key={w.id}
                    className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-cyan-300">{w.name}</div>
                      <div className="text-[11px] text-slate-400">{w.tagline}</div>
                    </div>
                    <div className="text-right font-mono-tabular text-[11px] text-slate-300 shrink-0">
                      <div>Sight: {w.sightRangeMeters}m</div>
                      <div>Filter: {w.filterModeName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-2.5">
              <h3 className="font-display font-bold text-base text-white">
                Data-as-Currency Deep Map Layers & Circle Closure
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                As Operatives breach encrypted terminals on the ground, Raw Data (GB) unlocks
                three progressive intelligence layers on the Analyst's holographic command table:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-cyan-300">Layer 1 · Multi-Agent Probability Heatmap:</strong>{' '}
                  Predicts hostile movement vectors and choke-point heat based on historical squad
                  trajectories.
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-amber-300">Layer 2 · Enemy Loadout & Armor Telemetry:</strong>{' '}
                  Reveals hostile weapon classes, armor plating tiers, and remaining HP bars on
                  the holographic map.
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <strong className="text-emerald-300">Layer 3 · Next Circle Closure Prediction:</strong>{' '}
                  Projects the upcoming Abyssal Collapse Ring convergence vector toward the
                  Extraction Spire.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: QA & STRESS TESTING */}
        {activePhase === 'QA' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Launch an instant QA combat scenario preset below to stress-test extreme modifier
              combinations, weather distortion filters, and Operative skill loadouts in real time:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-mono-tabular text-red-400 uppercase">
                    QA Stress Preset 01
                  </div>
                  <h3 className="font-display font-bold text-base text-white mt-0.5">
                    Ghost Protocol in Torrential Rain
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tests Cloaked AI + Hyper-Adaptive Patrols under heavy rain acoustic masking
                    with Wraith-2 Specter active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRunQaPreset('cloak_storm')}
                  className="w-full py-2 px-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  Launch QA Preset 01
                </button>
              </div>

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-mono-tabular text-amber-400 uppercase">
                    QA Stress Preset 02
                  </div>
                  <h3 className="font-display font-bold text-base text-white mt-0.5">
                    Zero-Visibility Scarcity Siege
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tests Limited Ammo + Halved Analyst Simulation Horizon inside Abyssal Dense
                    Fog with Millimeter-Wave Filter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRunQaPreset('scarcity_fog')}
                  className="w-full py-2 px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  Launch QA Preset 02
                </button>
              </div>

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-mono-tabular text-emerald-400 uppercase">
                    QA Stress Preset 03
                  </div>
                  <h3 className="font-display font-bold text-base text-white mt-0.5">
                    High-Yield EM Squall Overdrive
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tests +50% Loot Rarity + EM Squall with 120 GB starting Data and all Deep Map
                    Layers unlocked.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRunQaPreset('high_yield_blitz')}
                  className="w-full py-2 px-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  Launch QA Preset 03
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
