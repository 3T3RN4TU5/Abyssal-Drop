import React from 'react';
import {
  canAllocateSkill,
  computeEffectiveStats,
  MissionModifier,
  OPERATIVE_CLASSES,
  OperativeClassId,
  UnlockedSkillsMap,
  WeatherState,
} from '../game/rules';

interface SkillTreeModalProps {
  isOpen: boolean;
  selectedOperative: OperativeClassId;
  unlockedByClass: UnlockedSkillsMap;
  availableSkillPoints: number;
  operativeLevel: number;
  operativeXp: number;
  activeModifiers: MissionModifier[];
  weather: WeatherState;
  onSelectOperative: (id: OperativeClassId) => void;
  onAllocateSkill: (operativeId: OperativeClassId, skillId: string) => void;
  onGrantBonusSkillPoint: () => void;
  onResetSkills: () => void;
  onClose: () => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  isOpen,
  selectedOperative,
  unlockedByClass,
  availableSkillPoints,
  operativeLevel,
  operativeXp,
  activeModifiers,
  weather,
  onSelectOperative,
  onAllocateSkill,
  onGrantBonusSkillPoint,
  onResetSkills,
  onClose,
}) => {
  if (!isOpen) return null;

  const profile = OPERATIVE_CLASSES[selectedOperative];
  const unlockedIds = unlockedByClass[selectedOperative] || [];
  const computed = computeEffectiveStats(
    selectedOperative,
    unlockedByClass,
    activeModifiers,
    weather
  );

  const branches: Array<{
    key: 'MOBILITY' | 'COMBAT_HACKING' | 'ANALYST_SYNERGY';
    label: string;
  }> = [
    { key: 'MOBILITY', label: '01. Mobility & Evasion' },
    { key: 'COMBAT_HACKING', label: '02. Ballistics & Decryption' },
    { key: 'ANALYST_SYNERGY', label: '03. Analyst Uplink Synergy' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-tree-heading"
    >
      <div className="ink-panel-accent rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-400">
              Operative Neural Progression · Level {operativeLevel} ({operativeXp} XP)
            </p>
            <h2 id="skill-tree-heading" className="font-display text-2xl font-bold text-white">
              Squad Skill Trees & Specialization
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 font-mono-tabular text-sm font-semibold text-amber-300">
              Available SP: {availableSkillPoints}
            </div>
            <button
              type="button"
              onClick={onGrantBonusSkillPoint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              +1 Field SP
            </button>
            <button
              type="button"
              onClick={onResetSkills}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Close Armory [K]
            </button>
          </div>
        </div>

        {/* Operative Class Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          {(['vanguard', 'specter', 'warden'] as OperativeClassId[]).map((cid) => {
            const op = OPERATIVE_CLASSES[cid];
            const isSelected = selectedOperative === cid;
            const unlockedCount = (unlockedByClass[cid] || []).length;
            return (
              <button
                key={cid}
                type="button"
                onClick={() => onSelectOperative(cid)}
                className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-base text-white">
                    {op.callsign}
                  </span>
                  <span className="text-xs font-mono-tabular text-cyan-400">
                    {unlockedCount}/{op.skills.length} Nodes
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-300 mt-0.5">{op.title}</div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{op.roleSummary}</p>
              </button>
            );
          })}
        </div>

        {/* Live Computed Operative Stat Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800/90 mb-5 font-mono-tabular">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Max Armor HP</div>
            <div className="text-sm font-bold text-white">{computed.maxHp} HP</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Move Speed</div>
            <div className="text-sm font-bold text-white">{computed.moveSpeed} m/s</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Weapon DMG</div>
            <div className="text-sm font-bold text-amber-400">{computed.weaponDamage}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Magazine</div>
            <div className="text-sm font-bold text-white">{computed.magazineSize} rds</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Hack Speed</div>
            <div className="text-sm font-bold text-cyan-400">{computed.hackDurationSec}s</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Data Multiplier</div>
            <div className="text-sm font-bold text-emerald-400">{computed.dataYieldMultiplier}x</div>
          </div>
        </div>

        {/* 3-Branch Skill Tree Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((branch) => {
            const branchNodes = profile.skills
              .filter((s) => s.branch === branch.key)
              .sort((a, b) => a.tier - b.tier);

            return (
              <div
                key={branch.key}
                className="rounded-lg bg-slate-950/90 border border-slate-800 p-4 flex flex-col justify-between gap-3"
              >
                <h3 className="text-xs font-semibold text-slate-300 tracking-wide">
                  {branch.label}
                </h3>

                <div className="flex flex-col gap-3">
                  {branchNodes.map((node) => {
                    const isUnlocked = unlockedIds.includes(node.id);
                    const check = canAllocateSkill(
                      selectedOperative,
                      node.id,
                      unlockedByClass,
                      availableSkillPoints
                    );

                    return (
                      <div
                        key={node.id}
                        className={`rounded-lg p-3 border transition-colors ${
                          isUnlocked
                            ? 'bg-cyan-950/40 border-cyan-500/60'
                            : check.allowed
                            ? 'bg-slate-900 border-slate-700'
                            : 'bg-slate-950 border-slate-800/70 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono-tabular text-slate-400">
                            Tier {node.tier} · Cost {node.cost} SP
                          </span>
                          <span
                            className={`text-[11px] font-mono-tabular font-semibold ${
                              isUnlocked ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            {isUnlocked ? 'ACTIVE' : `${node.cost} SP`}
                          </span>
                        </div>

                        <div className="font-display font-bold text-sm text-white mt-1">
                          {node.name}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {node.description}
                        </p>

                        <div className="mt-3">
                          {isUnlocked ? (
                            <span className="inline-block text-xs font-semibold text-emerald-400">
                              Equipped on {profile.callsign}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!check.allowed}
                              onClick={() => onAllocateSkill(selectedOperative, node.id)}
                              className="w-full py-1.5 px-3 rounded bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              {check.allowed ? `Unlock ${node.name}` : check.reason}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
