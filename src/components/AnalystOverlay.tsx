import React, { useState } from 'react';
import {
  ComputedOperativeStats,
  HeatmapPoint,
  MissionModifier,
  WEATHER_CONFIGS,
  WeatherState,
} from '../game/rules';

interface AnalystOverlayProps {
  dataCurrency: number;
  weather: WeatherState;
  effectiveStats: ComputedOperativeStats;
  activeModifiers: MissionModifier[];
  heatmapPoints: HeatmapPoint[];
  operativePos: { x: number; z: number };
  squadPositions: Array<{ callsign: string; x: number; z: number; color: string }>;
  enemies: Array<{
    id: string;
    archetype: string;
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    cloaked: boolean;
    revealedTimer: number;
  }>;
  terminals: Array<{
    id: string;
    label: string;
    x: number;
    z: number;
    hacked: boolean;
    progress: number;
  }>;
  empTraps: Array<{
    id: string;
    x: number;
    z: number;
    ready: boolean;
    cooldown: number;
  }>;
  waypoint: { x: number; z: number } | null;
  onSetWaypoint: (pt: { x: number; z: number }) => void;
  onToggleWeatherFilter: () => void;
  onTriggerReconPulse: () => void;
  onTriggerEmpTrap: () => void;
  onTriggerSupplyDrop: () => void;
  onSwitchToOperative: () => void;
}

export const AnalystOverlay: React.FC<AnalystOverlayProps> = ({
  dataCurrency,
  weather,
  effectiveStats,
  activeModifiers,
  heatmapPoints,
  operativePos,
  squadPositions,
  enemies,
  terminals,
  empTraps,
  waypoint,
  onSetWaypoint,
  onToggleWeatherFilter,
  onTriggerReconPulse,
  onTriggerEmpTrap,
  onTriggerSupplyDrop,
  onSwitchToOperative,
}) => {
  const [heatmapLayer, setHeatmapLayer] = useState<'THREAT' | 'LOOT' | 'COMBINED'>('COMBINED');

  const weatherCfg = WEATHER_CONFIGS[weather.current];
  const rawInterference = weatherCfg.analystInterference;
  const effectiveInterference = weather.analystFilterActive
    ? rawInterference * 0.15
    : rawInterference;
  const signalClarityPct = Math.round((1 - effectiveInterference) * 100);

  const reconCost = Math.round(25 * effectiveStats.analystCostMultiplier);
  const empCost = Math.round(40 * effectiveStats.analystCostMultiplier);
  const supplyCost = Math.round(50 * effectiveStats.analystCostMultiplier);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    const worldX = (normX - 0.5) * 110;
    const worldZ = (normY - 0.5) * 110;
    onSetWaypoint({
      x: Math.round(worldX),
      z: Math.round(worldZ),
    });
  };

  const toMapCoord = (wx: number, wz: number) => ({
    cx: 50 + (wx / 110) * 100,
    cy: 50 + (wz / 110) * 100,
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
      {/* Top Analyst Telemetry Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="ink-panel-accent rounded-lg px-4 py-3 pointer-events-auto max-w-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-400">
                Sky Command · Predictive Multi-Agent Feed
              </p>
              <h2 className="font-display text-lg font-bold text-white tracking-tight">
                Tactical Holographic Overwatch
              </h2>
            </div>
            <button
              type="button"
              onClick={onSwitchToOperative}
              className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              Return to Ground [Tab]
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-300 font-mono-tabular">
            <span>Sim Horizon: {(4.0 * effectiveStats.analystSimHorizonMultiplier).toFixed(1)}s</span>
            <span aria-hidden="true">·</span>
            <span>Clarity: {signalClarityPct}%</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-300 font-semibold">Data: {dataCurrency} GB</span>
          </div>
        </div>

        {/* Interactive Holographic Probability Heatmap Mini-Tabletop */}
        <div className="ink-panel rounded-lg p-3 pointer-events-auto w-80 sm:w-96 mt-12">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-semibold text-slate-100">
                Predictive Probability Matrix
              </span>
              <p className="text-[11px] text-slate-400">
                Click grid to route Operative waypoint
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              {(['COMBINED', 'THREAT', 'LOOT'] as const).map((layer) => (
                <button
                  key={layer}
                  type="button"
                  onClick={() => setHeatmapLayer(layer)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                    heatmapLayer === layer
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {layer === 'COMBINED' ? 'All' : layer === 'THREAT' ? 'Threat' : 'Loot'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full aspect-square rounded border border-cyan-500/30 bg-slate-950 overflow-hidden">
            <svg
              viewBox="0 0 100 100"
              onClick={handleMapClick}
              className="w-full h-full cursor-crosshair"
              role="img"
              aria-label="Interactive Analyst Probability Heatmap"
            >
              {/* Grid lines */}
              {[20, 40, 60, 80].map((g) => (
                <g key={g} stroke="rgba(30, 41, 59, 0.7)" strokeWidth="0.3">
                  <line x1={g} y1="0" x2={g} y2="100" />
                  <line x1="0" y1={g} x2="100" y2={g} />
                </g>
              ))}

              {/* Probability Heatmap Cells */}
              {heatmapPoints.map((pt, idx) => {
                const { cx, cy } = toMapCoord(pt.x, pt.z);
                const showThreat = heatmapLayer === 'THREAT' || heatmapLayer === 'COMBINED';
                const showLoot = heatmapLayer === 'LOOT' || heatmapLayer === 'COMBINED';
                const threatAlpha = showThreat ? pt.threatProbability * (1 - effectiveInterference * 0.6) : 0;
                const lootAlpha = showLoot ? pt.lootDensity * 0.65 : 0;

                return (
                  <g key={idx}>
                    {threatAlpha > 0.08 && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6.8}
                        fill={`rgba(239, 68, 68, ${Math.min(0.55, threatAlpha).toFixed(2)})`}
                      />
                    )}
                    {lootAlpha > 0.1 && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5.2}
                        fill={`rgba(6, 182, 212, ${Math.min(0.5, lootAlpha).toFixed(2)})`}
                      />
                    )}
                  </g>
                );
              })}

              {/* Extraction Zone North */}
              <circle
                cx={50}
                cy={50 + (-34 / 110) * 100}
                r="5.5"
                fill="rgba(16, 185, 129, 0.22)"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2 1"
              />

              {/* EMP Traps */}
              {empTraps.map((trap) => {
                const { cx, cy } = toMapCoord(trap.x, trap.z);
                return (
                  <circle
                    key={trap.id}
                    cx={cx}
                    cy={cy}
                    r="2.4"
                    fill={trap.ready ? '#a855f7' : '#475569'}
                    stroke="#f8fafc"
                    strokeWidth="0.4"
                  />
                );
              })}

              {/* Data Terminals */}
              {terminals.map((term) => {
                const { cx, cy } = toMapCoord(term.x, term.z);
                return (
                  <g key={term.id}>
                    <rect
                      x={cx - 2.2}
                      y={cy - 2.2}
                      width="4.4"
                      height="4.4"
                      fill={term.hacked ? '#10b981' : '#06b6d4'}
                      stroke="#0f172a"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}

              {/* Enemy Agents (Cloaked enemies require Recon Pulse or Weather Filter proximity) */}
              {enemies.map((e) => {
                const distToOp = Math.hypot(e.x - operativePos.x, e.z - operativePos.z);
                const visibleOnRadar =
                  !e.cloaked ||
                  e.revealedTimer > 0 ||
                  weather.analystFilterActive ||
                  distToOp <= effectiveStats.cloakRevealDistance;
                if (!visibleOnRadar) return null;
                const { cx, cy } = toMapCoord(e.x, e.z);
                return (
                  <circle
                    key={e.id}
                    cx={cx}
                    cy={cy}
                    r="2.1"
                    fill="#ef4444"
                    stroke="#fee2e2"
                    strokeWidth="0.5"
                  />
                );
              })}

              {/* Squad Mates */}
              {squadPositions.map((sq) => {
                const { cx, cy } = toMapCoord(sq.x, sq.z);
                return (
                  <circle
                    key={sq.callsign}
                    cx={cx}
                    cy={cy}
                    r="2.2"
                    fill={sq.color}
                    stroke="#0f172a"
                    strokeWidth="0.5"
                  />
                );
              })}

              {/* Player Lead Operative */}
              {(() => {
                const { cx, cy } = toMapCoord(operativePos.x, operativePos.z);
                return (
                  <g>
                    {waypoint && (
                      <line
                        x1={cx}
                        y1={cy}
                        x2={toMapCoord(waypoint.x, waypoint.z).cx}
                        y2={toMapCoord(waypoint.x, waypoint.z).cy}
                        stroke="#f59e0b"
                        strokeWidth="0.9"
                        strokeDasharray="2 1.5"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.0"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  </g>
                );
              })()}

              {/* Active Waypoint */}
              {waypoint && (() => {
                const { cx, cy } = toMapCoord(waypoint.x, waypoint.z);
                return (
                  <g>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.2"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="0.9"
                    />
                    <circle cx={cx} cy={cy} r="1.2" fill="#f59e0b" />
                  </g>
                );
              })()}
            </svg>

            {/* Weather Interference Scrim if Filter is OFF */}
            {!weather.analystFilterActive && rawInterference > 0.2 && (
              <div className="absolute bottom-1.5 left-2 right-2 bg-slate-950/90 border border-amber-500/40 rounded px-2 py-1 flex items-center justify-between text-[10px] text-amber-300">
                <span>Weather Distortion: {Math.round(rawInterference * 100)}%</span>
                <span>Engage Filter [W]</span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-300 font-mono-tabular">
            <span className="whitespace-nowrap">■ Cyan: Terminal</span>
            <span className="whitespace-nowrap">● Red: Hostile AI</span>
            <span className="whitespace-nowrap">◎ Green: Extract</span>
          </div>
        </div>
      </div>

      {/* Bottom Unified Analyst Command Dock */}
      <div className="mx-auto w-full max-w-4xl ink-panel-accent rounded-xl p-3 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Weather Penetration Tool */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleWeatherFilter}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                weather.analystFilterActive
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              [W] {weatherCfg.filterModeName}: {weather.analystFilterActive ? 'ACTIVE' : 'OFF'}
            </button>
            <div className="hidden sm:block text-xs">
              <div className="text-slate-200 font-medium">{weatherCfg.name}</div>
              <div className="text-[11px] text-slate-400">
                Modifiers: {activeModifiers.map((m) => m.name).join(' · ')}
              </div>
            </div>
          </div>

          {/* Data-as-Currency Tactical Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onTriggerReconPulse}
              disabled={dataCurrency < reconCost}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-45 border border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              [1] Recon Pulse · {reconCost} GB
            </button>
            <button
              type="button"
              onClick={onTriggerEmpTrap}
              disabled={dataCurrency < empCost}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-45 border border-purple-500/40 text-purple-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              [2] EMP Trap Surge · {empCost} GB
            </button>
            <button
              type="button"
              onClick={onTriggerSupplyDrop}
              disabled={dataCurrency < supplyCost}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-45 border border-amber-500/40 text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              [3] Supply Drop · {supplyCost} GB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
