/**
 * Pure decoupled game rules, Mission Modifiers, Dynamic Weather System,
 * Operative Skill Trees, and Multi-Agent Analyst Heatmap math.
 */

export type RoleMode = 'operative' | 'analyst';
export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type OperativeClassId = 'vanguard' | 'specter' | 'warden';
export type WeatherId = 'CLEAR' | 'DENSE_FOG' | 'TORRENTIAL_RAIN' | 'EM_SQUALL';
export type EnemyArchetype = 'chaser' | 'kiter' | 'interceptor' | 'suppressor';

export interface MissionModifier {
  id: string;
  name: string;
  category: 'AI_HAZARD' | 'LOOT_ECONOMY' | 'RESOURCE_CONSTRAINT' | 'ANALYST_CONSTRAINT';
  shortDesc: string;
  operativeImpact: string;
  analystImpact: string;
  effects: {
    enemyCloaked?: boolean;
    lootMultiplier?: number;
    ammoCapacityMultiplier?: number;
    analystSimHorizonMultiplier?: number;
    enemySpeedMultiplier?: number;
    hackYieldBonus?: number;
  };
}

export const ALL_MISSION_MODIFIERS: MissionModifier[] = [
  {
    id: 'cloaked_ai',
    name: 'All Enemy AI Are Cloaked',
    category: 'AI_HAZARD',
    shortDesc: 'AI faction units deploy thermoptic stealth camouflage beyond 14m unless pinged by Analyst Recon.',
    operativeImpact: 'Hostiles shimmer at range; close within 14m or use Counter-Cloak Optics.',
    analystImpact: 'Standard optical feed masked; use Recon Pulse or Heatmap probability vectors.',
    effects: {
      enemyCloaked: true,
    },
  },
  {
    id: 'loot_rarity_50',
    name: 'Loot Rarity Increased by 50%',
    category: 'LOOT_ECONOMY',
    shortDesc: 'High-density encrypted caches boost all Terminal Data extractions and supply yields by +50%.',
    operativeImpact: 'Supply crates restore +50% more ammo and armor plating.',
    analystImpact: 'Terminal hacks yield +50% raw Data (GB) for rapid map-layer unlocks.',
    effects: {
      lootMultiplier: 1.5,
      hackYieldBonus: 15,
    },
  },
  {
    id: 'limited_ammo',
    name: 'Operatives Have Limited Ammo',
    category: 'RESOURCE_CONSTRAINT',
    shortDesc: 'Strict drop-weight limits cut magazine & reserve capacity by 45%, but high-grain rounds deal +20% damage.',
    operativeImpact: 'Max magazine reduced by 45%; conserve shots or request Analyst Supply Drops.',
    analystImpact: 'Monitor squad ammunition closely and route Operatives through supply caches.',
    effects: {
      ammoCapacityMultiplier: 0.55,
    },
  },
  {
    id: 'halved_sim_time',
    name: "Analyst's Simulation Time Is Halved",
    category: 'ANALYST_CONSTRAINT',
    shortDesc: 'Ionospheric interference halves multi-agent prediction horizon and Recon scan duration.',
    operativeImpact: 'Waypoint updates and threat pings expire twice as fast.',
    analystImpact: 'Predictive trajectory lookahead is 50% shorter; refresh scans frequently.',
    effects: {
      analystSimHorizonMultiplier: 0.5,
    },
  },
  {
    id: 'overclocked_hunters',
    name: 'Hyper-Adaptive AI Patrols',
    category: 'AI_HAZARD',
    shortDesc: 'AI interception squads move 20% faster toward historical Operative movement corridors.',
    operativeImpact: 'Hostile flankers close distance rapidly after terminal breaches.',
    analystImpact: 'Choke-point heat builds 25% faster along repeated squad paths.',
    effects: {
      enemySpeedMultiplier: 1.2,
    },
  },
];

export function rollMissionModifiers(seed = Date.now(), count = 2): MissionModifier[] {
  const pool = [...ALL_MISSION_MODIFIERS];
  const selected: MissionModifier[] = [];
  let s = Math.abs(Math.floor(seed)) || 1337;
  for (let i = 0; i < count && pool.length > 0; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const idx = s % pool.length;
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return selected;
}

export interface WeatherConfig {
  id: WeatherId;
  name: string;
  tagline: string;
  fogDensity: number;
  sightRangeMeters: number;
  audioPropagationMultiplier: number; // < 1 means footsteps are masked, audio cues shorter
  aiDetectionRadiusMultiplier: number;
  analystInterference: number; // 0 to 1 raw noise before Analyst weather filter
  filterModeName: string;
  ambientTintHex: number;
}

export const WEATHER_CONFIGS: Record<WeatherId, WeatherConfig> = {
  CLEAR: {
    id: 'CLEAR',
    name: 'Clear Obsidian Night',
    tagline: 'Unobstructed thermal & acoustic telemetry across the basin.',
    fogDensity: 0.009,
    sightRangeMeters: 75,
    audioPropagationMultiplier: 1.0,
    aiDetectionRadiusMultiplier: 1.0,
    analystInterference: 0.05,
    filterModeName: 'Standard Optical',
    ambientTintHex: 0x0b111e,
  },
  DENSE_FOG: {
    id: 'DENSE_FOG',
    name: 'Abyssal Dense Fog',
    tagline: 'Heavy vapor bank cuts Operative sight range by 45%.',
    fogDensity: 0.024,
    sightRangeMeters: 41,
    audioPropagationMultiplier: 0.9,
    aiDetectionRadiusMultiplier: 0.72,
    analystInterference: 0.55,
    filterModeName: 'Millimeter-Wave Piercer',
    ambientTintHex: 0x131c27,
  },
  TORRENTIAL_RAIN: {
    id: 'TORRENTIAL_RAIN',
    name: 'Torrential Ink-Rain',
    tagline: 'Downpour masks Operative footsteps (-35% AI acoustic detection) and dampens distant audio.',
    fogDensity: 0.015,
    sightRangeMeters: 56,
    audioPropagationMultiplier: 0.62,
    aiDetectionRadiusMultiplier: 0.65,
    analystInterference: 0.35,
    filterModeName: 'Acoustic Doppler Gate',
    ambientTintHex: 0x091322,
  },
  EM_SQUALL: {
    id: 'EM_SQUALL',
    name: 'Electromagnetic Squall',
    tagline: 'Charged squall distorts raw sensors but supercharges Terminal Data yield (+25%).',
    fogDensity: 0.018,
    sightRangeMeters: 48,
    audioPropagationMultiplier: 0.8,
    aiDetectionRadiusMultiplier: 0.85,
    analystInterference: 0.7,
    filterModeName: 'Quantum Spectral Lock',
    ambientTintHex: 0x141126,
  },
};

export const WEATHER_SEQUENCE: WeatherId[] = [
  'CLEAR',
  'TORRENTIAL_RAIN',
  'DENSE_FOG',
  'EM_SQUALL',
];

export interface WeatherState {
  current: WeatherId;
  next: WeatherId;
  timeRemainingSec: number;
  cycleDurationSec: number;
  analystFilterActive: boolean;
}

export function advanceWeatherSystem(
  state: WeatherState,
  dt: number
): WeatherState {
  const remaining = state.timeRemainingSec - dt;
  if (remaining > 0) {
    return {
      ...state,
      timeRemainingSec: remaining,
    };
  }
  const currentIdx = WEATHER_SEQUENCE.indexOf(state.next);
  const nextIdx = (currentIdx + 1) % WEATHER_SEQUENCE.length;
  return {
    current: state.next,
    next: WEATHER_SEQUENCE[nextIdx],
    timeRemainingSec: state.cycleDurationSec,
    cycleDurationSec: state.cycleDurationSec,
    analystFilterActive: state.analystFilterActive,
  };
}

export function computeEffectiveWeatherMetrics(
  weather: WeatherState,
  stealthSkillNoiseReduction = 0
) {
  const cfg = WEATHER_CONFIGS[weather.current];
  const effectiveInterference = weather.analystFilterActive
    ? cfg.analystInterference * 0.15
    : cfg.analystInterference;
  const analystClarityPct = Math.round((1 - effectiveInterference) * 100);
  const footstepMaskingPct = Math.min(
    80,
    Math.round((1 - cfg.audioPropagationMultiplier + stealthSkillNoiseReduction) * 100)
  );
  return {
    config: cfg,
    effectiveInterference,
    analystClarityPct,
    footstepMaskingPct,
    effectiveSightRangeMeters: cfg.sightRangeMeters,
    effectiveAiDetectionMultiplier: Math.max(
      0.35,
      cfg.aiDetectionRadiusMultiplier * (1 - stealthSkillNoiseReduction * 0.6)
    ),
  };
}

export interface SkillNode {
  id: string;
  operativeId: OperativeClassId;
  branch: 'MOBILITY' | 'COMBAT_HACKING' | 'ANALYST_SYNERGY';
  tier: 1 | 2;
  name: string;
  description: string;
  cost: number;
  prerequisiteId?: string;
  bonuses: {
    moveSpeedPct?: number;
    dashCooldownReductionPct?: number;
    hackSpeedPct?: number;
    dataYieldPct?: number;
    weaponDamagePct?: number;
    ammoCapacityPct?: number;
    maxHpBonus?: number;
    stealthNoiseReduction?: number;
    cloakRevealRangeBonusMeters?: number;
    analystCostReductionPct?: number;
    empTrapBonusPct?: number;
    targetTagDurationBonusSec?: number;
  };
}

export interface OperativeClassProfile {
  id: OperativeClassId;
  callsign: string;
  title: string;
  roleSummary: string;
  accentColor: string;
  baseHp: number;
  baseSpeed: number;
  baseMagazine: number;
  baseDamage: number;
  baseHackTimeSec: number;
  skills: SkillNode[];
}

export const OPERATIVE_CLASSES: Record<OperativeClassId, OperativeClassProfile> = {
  vanguard: {
    id: 'vanguard',
    callsign: 'KESTREL-1',
    title: 'Vanguard Breacher',
    roleSummary: 'Point-man assault specialist with high-velocity dash jets and armor-piercing ballistics.',
    accentColor: '#f59e0b',
    baseHp: 110,
    baseSpeed: 10.5,
    baseMagazine: 28,
    baseDamage: 26,
    baseHackTimeSec: 3.6,
    skills: [
      {
        id: 'van_mob_1',
        operativeId: 'vanguard',
        branch: 'MOBILITY',
        tier: 1,
        name: 'Hydraulic Thrusters',
        description: '+18% movement speed and smoother cornering across wet basin terrain.',
        cost: 1,
        bonuses: { moveSpeedPct: 18 },
      },
      {
        id: 'van_mob_2',
        operativeId: 'vanguard',
        branch: 'MOBILITY',
        tier: 2,
        name: 'Kinetic Afterburner',
        description: 'Reduces tactical Dash cooldown by 35% and leaves an ink-decoy wake.',
        cost: 2,
        prerequisiteId: 'van_mob_1',
        bonuses: { dashCooldownReductionPct: 35, moveSpeedPct: 8 },
      },
      {
        id: 'van_com_1',
        operativeId: 'vanguard',
        branch: 'COMBAT_HACKING',
        tier: 1,
        name: 'Tungsten Sabot Core',
        description: '+25% carbine damage against AI faction armor plating.',
        cost: 1,
        bonuses: { weaponDamagePct: 25 },
      },
      {
        id: 'van_com_2',
        operativeId: 'vanguard',
        branch: 'COMBAT_HACKING',
        tier: 2,
        name: 'Expanded Drum Rig',
        description: '+45% magazine capacity, offsetting Scarcity ammo constraints.',
        cost: 2,
        prerequisiteId: 'van_com_1',
        bonuses: { ammoCapacityPct: 45, weaponDamagePct: 10 },
      },
      {
        id: 'van_syn_1',
        operativeId: 'vanguard',
        branch: 'ANALYST_SYNERGY',
        tier: 1,
        name: 'Ballistic Tracer Link',
        description: 'Enemies hit by Kestrel-1 stay illuminated on the Analyst heatmap for +6s.',
        cost: 1,
        bonuses: { targetTagDurationBonusSec: 6, cloakRevealRangeBonusMeters: 8 },
      },
      {
        id: 'van_syn_2',
        operativeId: 'vanguard',
        branch: 'ANALYST_SYNERGY',
        tier: 2,
        name: 'Breach Telemetry Surge',
        description: '+25% terminal hacking speed and +15% Data extracted per breach.',
        cost: 2,
        prerequisiteId: 'van_syn_1',
        bonuses: { hackSpeedPct: 25, dataYieldPct: 15 },
      },
    ],
  },
  specter: {
    id: 'specter',
    callsign: 'WRAITH-2',
    title: 'Specter Cyber-Infiltrator',
    roleSummary: 'Stealth recon and rapid terminal decryption operative engineered for Data harvesting.',
    accentColor: '#06b6d4',
    baseHp: 95,
    baseSpeed: 11.4,
    baseMagazine: 24,
    baseDamage: 23,
    baseHackTimeSec: 2.6,
    skills: [
      {
        id: 'spc_mob_1',
        operativeId: 'specter',
        branch: 'MOBILITY',
        tier: 1,
        name: 'Acoustic Dampener Soles',
        description: 'Reduces footstep noise by 30% in all weather conditions and boosts speed +12%.',
        cost: 1,
        bonuses: { stealthNoiseReduction: 0.3, moveSpeedPct: 12 },
      },
      {
        id: 'spc_mob_2',
        operativeId: 'specter',
        branch: 'MOBILITY',
        tier: 2,
        name: 'Phase-Step Blink',
        description: '-40% Dash cooldown and +15m detection range against Cloaked AI.',
        cost: 2,
        prerequisiteId: 'spc_mob_1',
        bonuses: { dashCooldownReductionPct: 40, cloakRevealRangeBonusMeters: 15 },
      },
      {
        id: 'spc_com_1',
        operativeId: 'specter',
        branch: 'COMBAT_HACKING',
        tier: 1,
        name: 'Quantum Icebreaker',
        description: '+40% Terminal hacking speed across all encryption tiers.',
        cost: 1,
        bonuses: { hackSpeedPct: 40 },
      },
      {
        id: 'spc_com_2',
        operativeId: 'specter',
        branch: 'COMBAT_HACKING',
        tier: 2,
        name: 'Deep-Packet Siphon',
        description: '+35% bonus Data currency extracted from every terminal and +20% weapon damage.',
        cost: 2,
        prerequisiteId: 'spc_com_1',
        bonuses: { dataYieldPct: 35, weaponDamagePct: 20 },
      },
      {
        id: 'spc_syn_1',
        operativeId: 'specter',
        branch: 'ANALYST_SYNERGY',
        tier: 1,
        name: 'Compressed Uplink',
        description: 'Reduces the Data cost of all Analyst sky abilities by 20%.',
        cost: 1,
        bonuses: { analystCostReductionPct: 20 },
      },
      {
        id: 'spc_syn_2',
        operativeId: 'specter',
        branch: 'ANALYST_SYNERGY',
        tier: 2,
        name: 'Overclocked Relay',
        description: 'Further reduces Analyst ability cost by 15% and boosts ammo capacity +30%.',
        cost: 2,
        prerequisiteId: 'spc_syn_1',
        bonuses: { analystCostReductionPct: 15, ammoCapacityPct: 30 },
      },
    ],
  },
  warden: {
    id: 'warden',
    callsign: 'AEGIS-3',
    title: 'Warden Heavy Engineer',
    roleSummary: 'Armored anchor who fortifies extraction zones and amplifies Analyst environmental traps.',
    accentColor: '#10b981',
    baseHp: 135,
    baseSpeed: 9.8,
    baseMagazine: 34,
    baseDamage: 28,
    baseHackTimeSec: 3.2,
    skills: [
      {
        id: 'war_mob_1',
        operativeId: 'warden',
        branch: 'MOBILITY',
        tier: 1,
        name: 'Servo-Assisted Frame',
        description: '+15% movement speed and +25 Max HP ablative plating.',
        cost: 1,
        bonuses: { moveSpeedPct: 15, maxHpBonus: 25 },
      },
      {
        id: 'war_mob_2',
        operativeId: 'warden',
        branch: 'MOBILITY',
        tier: 2,
        name: 'Reactive Shield Surge',
        description: '+35 Max HP and -25% Dash cooldown when breaching choke points.',
        cost: 2,
        prerequisiteId: 'war_mob_1',
        bonuses: { maxHpBonus: 35, dashCooldownReductionPct: 25 },
      },
      {
        id: 'war_com_1',
        operativeId: 'warden',
        branch: 'COMBAT_HACKING',
        tier: 1,
        name: 'High-Capacity Feed',
        description: '+50% magazine capacity and +15% weapon damage.',
        cost: 1,
        bonuses: { ammoCapacityPct: 50, weaponDamagePct: 15 },
      },
      {
        id: 'war_com_2',
        operativeId: 'warden',
        branch: 'COMBAT_HACKING',
        tier: 2,
        name: 'Armored Field Diagnostics',
        description: '+35% terminal hacking speed and +25% weapon damage.',
        cost: 2,
        prerequisiteId: 'war_com_1',
        bonuses: { hackSpeedPct: 35, weaponDamagePct: 25 },
      },
      {
        id: 'war_syn_1',
        operativeId: 'warden',
        branch: 'ANALYST_SYNERGY',
        tier: 1,
        name: 'EMP Trap Resonator',
        description: 'Analyst EMP Traps deal +50% damage and stun AI units across a wider radius.',
        cost: 1,
        bonuses: { empTrapBonusPct: 50 },
      },
      {
        id: 'war_syn_2',
        operativeId: 'warden',
        branch: 'ANALYST_SYNERGY',
        tier: 2,
        name: 'Grid Surge Capacitor',
        description: '+25% Data yield from hacks and +12m cloaked enemy reveal radius.',
        cost: 2,
        prerequisiteId: 'war_syn_1',
        bonuses: { dataYieldPct: 25, cloakRevealRangeBonusMeters: 12 },
      },
    ],
  },
};

export type UnlockedSkillsMap = Record<OperativeClassId, string[]>;

export function canAllocateSkill(
  operativeId: OperativeClassId,
  skillId: string,
  unlockedByClass: UnlockedSkillsMap,
  availableSkillPoints: number
): { allowed: boolean; reason?: string } {
  const profile = OPERATIVE_CLASSES[operativeId];
  const node = profile.skills.find((s) => s.id === skillId);
  if (!node) return { allowed: false, reason: 'Skill not found' };

  const unlocked = unlockedByClass[operativeId] || [];
  if (unlocked.includes(skillId)) {
    return { allowed: false, reason: 'Already unlocked' };
  }
  if (node.prerequisiteId && !unlocked.includes(node.prerequisiteId)) {
    return { allowed: false, reason: 'Requires Tier 1 branch prerequisite' };
  }
  if (availableSkillPoints < node.cost) {
    return { allowed: false, reason: `Requires ${node.cost} SP` };
  }
  return { allowed: true };
}

export function allocateSkillPoint(
  operativeId: OperativeClassId,
  skillId: string,
  unlockedByClass: UnlockedSkillsMap,
  availableSkillPoints: number
): {
  unlockedByClass: UnlockedSkillsMap;
  availableSkillPoints: number;
  allocated: boolean;
} {
  const check = canAllocateSkill(
    operativeId,
    skillId,
    unlockedByClass,
    availableSkillPoints
  );
  if (!check.allowed) {
    return { unlockedByClass, availableSkillPoints, allocated: false };
  }
  const profile = OPERATIVE_CLASSES[operativeId];
  const node = profile.skills.find((s) => s.id === skillId)!;
  return {
    unlockedByClass: {
      ...unlockedByClass,
      [operativeId]: [...(unlockedByClass[operativeId] || []), skillId],
    },
    availableSkillPoints: availableSkillPoints - node.cost,
    allocated: true,
  };
}

export interface ComputedOperativeStats {
  maxHp: number;
  moveSpeed: number;
  dashCooldownSec: number;
  magazineSize: number;
  weaponDamage: number;
  hackDurationSec: number;
  dataYieldMultiplier: number;
  stealthNoiseReduction: number;
  cloakRevealDistance: number;
  analystCostMultiplier: number;
  empTrapMultiplier: number;
  analystSimHorizonMultiplier: number;
  areEnemiesCloaked: boolean;
}

export function computeEffectiveStats(
  operativeId: OperativeClassId,
  unlockedByClass: UnlockedSkillsMap,
  activeModifiers: MissionModifier[],
  weather: WeatherState
): ComputedOperativeStats {
  const profile = OPERATIVE_CLASSES[operativeId];
  const unlockedIds = unlockedByClass[operativeId] || [];
  const unlockedNodes = profile.skills.filter((s) => unlockedIds.includes(s.id));

  let moveSpeedPct = 0;
  let dashCdRedPct = 0;
  let hackSpeedPct = 0;
  let dataYieldPct = 0;
  let weaponDamagePct = 0;
  let ammoCapacityPct = 0;
  let maxHpBonus = 0;
  let stealthNoiseReduction = 0;
  let cloakRevealBonus = 0;
  let analystCostRedPct = 0;
  let empTrapBonusPct = 0;

  for (const node of unlockedNodes) {
    const b = node.bonuses;
    moveSpeedPct += b.moveSpeedPct || 0;
    dashCdRedPct += b.dashCooldownReductionPct || 0;
    hackSpeedPct += b.hackSpeedPct || 0;
    dataYieldPct += b.dataYieldPct || 0;
    weaponDamagePct += b.weaponDamagePct || 0;
    ammoCapacityPct += b.ammoCapacityPct || 0;
    maxHpBonus += b.maxHpBonus || 0;
    stealthNoiseReduction += b.stealthNoiseReduction || 0;
    cloakRevealBonus += b.cloakRevealRangeBonusMeters || 0;
    analystCostRedPct += b.analystCostReductionPct || 0;
    empTrapBonusPct += b.empTrapBonusPct || 0;
  }

  let modLootMult = 1.0;
  let modAmmoMult = 1.0;
  let modSimHorizonMult = 1.0;
  let areEnemiesCloaked = false;

  for (const mod of activeModifiers) {
    if (mod.effects.enemyCloaked) areEnemiesCloaked = true;
    if (mod.effects.lootMultiplier) modLootMult *= mod.effects.lootMultiplier;
    if (mod.effects.ammoCapacityMultiplier) {
      modAmmoMult *= mod.effects.ammoCapacityMultiplier;
    }
    if (mod.effects.analystSimHorizonMultiplier) {
      modSimHorizonMult *= mod.effects.analystSimHorizonMultiplier;
    }
  }

  // EM Squall boosts data yield by +25%
  const weatherDataBonus = weather.current === 'EM_SQUALL' ? 1.25 : 1.0;
  // Limited ammo modifier also gives high-grain +20% damage
  const limitedAmmoDamageBonus = modAmmoMult < 1 ? 1.2 : 1.0;

  const maxHp = Math.round(profile.baseHp + maxHpBonus);
  const moveSpeed = Number((profile.baseSpeed * (1 + moveSpeedPct / 100)).toFixed(2));
  const dashCooldownSec = Number(
    Math.max(0.9, 2.6 * (1 - dashCdRedPct / 100)).toFixed(2)
  );
  const magazineSize = Math.max(
    6,
    Math.round(profile.baseMagazine * (1 + ammoCapacityPct / 100) * modAmmoMult)
  );
  const weaponDamage = Math.round(
    profile.baseDamage * (1 + weaponDamagePct / 100) * limitedAmmoDamageBonus
  );
  const hackDurationSec = Number(
    Math.max(1.1, profile.baseHackTimeSec / (1 + hackSpeedPct / 100)).toFixed(2)
  );
  const dataYieldMultiplier = Number(
    ((1 + dataYieldPct / 100) * modLootMult * weatherDataBonus).toFixed(2)
  );

  return {
    maxHp,
    moveSpeed,
    dashCooldownSec,
    magazineSize,
    weaponDamage,
    hackDurationSec,
    dataYieldMultiplier,
    stealthNoiseReduction: Math.min(0.65, stealthNoiseReduction),
    cloakRevealDistance: 14 + cloakRevealBonus,
    analystCostMultiplier: Math.max(0.5, 1 - analystCostRedPct / 100),
    empTrapMultiplier: 1 + empTrapBonusPct / 100,
    analystSimHorizonMultiplier: modSimHorizonMult,
    areEnemiesCloaked,
  };
}

export interface DropZoneOption {
  id: 'alpha' | 'bravo' | 'charlie';
  name: string;
  sectorCode: string;
  coordinates: { x: number; z: number };
  lootRating: number; // 1-100
  threatProbability: number; // 1-100
  summary: string;
}

export const DROP_ZONES: DropZoneOption[] = [
  {
    id: 'alpha',
    name: 'Sunken Server Vault',
    sectorCode: 'SEC-A01',
    coordinates: { x: -24, z: 22 },
    lootRating: 92,
    threatProbability: 68,
    summary: 'High Data terminal density with multi-level obsidian cover walls.',
  },
  {
    id: 'bravo',
    name: 'Monolith Spire Perimeter',
    sectorCode: 'SEC-B04',
    coordinates: { x: 0, z: 28 },
    lootRating: 78,
    threatProbability: 42,
    summary: 'Balanced drop trajectory with clear sightlines to the Extraction Pad.',
  },
  {
    id: 'charlie',
    name: 'Hydro-Reactor Basin',
    sectorCode: 'SEC-C09',
    coordinates: { x: 24, z: 20 },
    lootRating: 86,
    threatProbability: 58,
    summary: 'Flanking approach near dual EMP capacitor traps and encrypted relays.',
  },
];

export interface HeatmapPoint {
  x: number;
  z: number;
  threatProbability: number; // 0..1
  lootDensity: number; // 0..1
}

export function computeProbabilityHeatmap(
  enemies: Array<{ x: number; z: number; vx: number; vz: number }>,
  terminals: Array<{ x: number; z: number; hacked: boolean }>,
  operativeHistory: Array<{ x: number; z: number }>,
  simHorizonSec: number,
  gridSize = 8
): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const halfSpan = 48;
  const step = (halfSpan * 2) / (gridSize - 1);

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const wx = -halfSpan + gx * step;
      const wz = -halfSpan + gz * step;

      let threat = 0.05;
      for (const e of enemies) {
        const predX = e.x + e.vx * simHorizonSec;
        const predZ = e.z + e.vz * simHorizonSec;
        const distSq = (wx - predX) * (wx - predX) + (wz - predZ) * (wz - predZ);
        threat += Math.exp(-distSq / 260) * 0.45;
      }

      // AI adapts to operative historical paths
      for (const h of operativeHistory) {
        const distSq = (wx - h.x) * (wx - h.x) + (wz - h.z) * (wz - h.z);
        threat += Math.exp(-distSq / 320) * 0.12;
      }

      let loot = 0.05;
      for (const t of terminals) {
        if (!t.hacked) {
          const distSq = (wx - t.x) * (wx - t.x) + (wz - t.z) * (wz - t.z);
          loot += Math.exp(-distSq / 280) * 0.75;
        }
      }

      points.push({
        x: wx,
        z: wz,
        threatProbability: Math.min(1, Number(threat.toFixed(3))),
        lootDensity: Math.min(1, Number(loot.toFixed(3))),
      });
    }
  }
  return points;
}

export interface CircleClosureState {
  phase: 1 | 2 | 3;
  centerX: number;
  centerZ: number;
  currentRadius: number;
  targetRadius: number;
  nextCenterX: number;
  nextCenterZ: number;
  shrinkSpeed: number;
  damagePerSecOutside: number;
}

export function createInitialCircleState(): CircleClosureState {
  return {
    phase: 1,
    centerX: 0,
    centerZ: -4,
    currentRadius: 50,
    targetRadius: 36,
    nextCenterX: 0,
    nextCenterZ: -20,
    shrinkSpeed: 0.45,
    damagePerSecOutside: 4,
  };
}

export function advanceCircleClosure(
  state: CircleClosureState,
  dt: number
): CircleClosureState {
  const nextRadius = Math.max(
    state.targetRadius,
    Number((state.currentRadius - state.shrinkSpeed * dt).toFixed(3))
  );

  if (nextRadius <= state.targetRadius && state.phase < 3) {
    const nextPhase = (state.phase + 1) as 2 | 3;
    return {
      phase: nextPhase,
      centerX: state.nextCenterX,
      centerZ: state.nextCenterZ,
      currentRadius: state.targetRadius,
      targetRadius: nextPhase === 2 ? 25 : 15,
      nextCenterX: 0,
      nextCenterZ: -34, // Final circle converges on Extraction Spire
      shrinkSpeed: nextPhase === 2 ? 0.55 : 0.65,
      damagePerSecOutside: nextPhase === 2 ? 7 : 11,
    };
  }

  return {
    ...state,
    currentRadius: nextRadius,
  };
}

export function isOutsideSafeCircle(
  x: number,
  z: number,
  circle: CircleClosureState
): boolean {
  return Math.hypot(x - circle.centerX, z - circle.centerZ) > circle.currentRadius;
}

export interface ClassAbilitySpec {
  operativeId: OperativeClassId;
  name: string;
  keyHint: string;
  cooldownSec: number;
  summary: string;
}

export const CLASS_ABILITIES: Record<OperativeClassId, ClassAbilitySpec> = {
  vanguard: {
    operativeId: 'vanguard',
    name: 'Frag Fan Barrage',
    keyHint: 'Q',
    cooldownSec: 8,
    summary: 'Fires a 5-round high-velocity tungsten fan burst in a forward arc.',
  },
  specter: {
    operativeId: 'specter',
    name: 'Thermoptic Overdrive',
    keyHint: 'Q',
    cooldownSec: 10,
    summary: 'Cloaks squad signature for 5s, sheds enemy lock-on, and boosts speed +30%.',
  },
  warden: {
    operativeId: 'warden',
    name: 'Bastion Nano-Pulse',
    keyHint: 'Q',
    cooldownSec: 11,
    summary: 'Restores +40 Armor HP immediately and emits an arc-shockwave around Aegis-3.',
  },
};

export const ENEMY_LOADOUT_PROFILES: Record<
  EnemyArchetype,
  { weaponName: string; armorRating: string; tacticalThreat: string }
> = {
  chaser: {
    weaponName: 'Twin Mantis Arc-Blades',
    armorRating: 'Light Composite',
    tacticalThreat: 'High-speed melee & close-quarters pressure',
  },
  kiter: {
    weaponName: 'Long-Rail Hypervelocity Rifle',
    armorRating: 'Medium Ballistic',
    tacticalThreat: 'Standoff precision sniper with windup laser',
  },
  interceptor: {
    weaponName: 'Vector Carbine + Thruster Rig',
    armorRating: 'Medium Reactive',
    tacticalThreat: 'Predicts and cuts off Extraction Spire corridors',
  },
  suppressor: {
    weaponName: 'Heavy Rotary Plasma Repeater',
    armorRating: 'Heavy Frontal Shield',
    tacticalThreat: 'Area-denial anchor guarding unhacked Data Terminals',
  },
};

// ============================================================================
// 8. COMPANION SQUAD AI & TACTICAL ORDER ENGINE
// ============================================================================

export type SquadOrderMode =
  | 'FOLLOW_SUPPORT'
  | 'BREACH_TERMINAL'
  | 'AGGRESSIVE_HUNT'
  | 'HOLD_POSITION';

export interface SquadOrderSpec {
  id: SquadOrderMode;
  label: string;
  shortLabel: string;
  description: string;
}

export const SQUAD_ORDERS: Record<SquadOrderMode, SquadOrderSpec> = {
  FOLLOW_SUPPORT: {
    id: 'FOLLOW_SUPPORT',
    label: 'Wedge Escort & Fire Support',
    shortLabel: 'Escort & Fire',
    description:
      'Companions hold a tactical V-wedge around the Lead Operative and automatically engage enemies within 26m.',
  },
  BREACH_TERMINAL: {
    id: 'BREACH_TERMINAL',
    label: 'Autonomous Terminal Breach',
    shortLabel: 'Auto-Breach Terminals',
    description:
      'Companions sprint to the nearest unhacked Data Terminal, decrypt it for Analyst GB currency, and defend the node.',
  },
  AGGRESSIVE_HUNT: {
    id: 'AGGRESSIVE_HUNT',
    label: 'Hunter-Killer Sweep',
    shortLabel: 'Hunt Hostiles',
    description:
      'Companions actively push toward the nearest live AI Faction unit to flank and eliminate threats.',
  },
  HOLD_POSITION: {
    id: 'HOLD_POSITION',
    label: 'Sector Overwatch Anchor',
    shortLabel: 'Hold Overwatch',
    description:
      'Companions anchor at the Analyst Waypoint (or current position) and lay down overlapping turret fire.',
  },
};

export function getCompanionClasses(leadClass: OperativeClassId): [OperativeClassId, OperativeClassId] {
  const all: OperativeClassId[] = ['vanguard', 'specter', 'warden'];
  const others = all.filter((c) => c !== leadClass);
  return [others[0], others[1]];
}

export interface CompanionDecisionInput {
  companionId: OperativeClassId;
  slotIndex: 0 | 1;
  x: number;
  z: number;
  leaderX: number;
  leaderZ: number;
  leaderYaw: number;
  orderMode: SquadOrderMode;
  waypoint: { x: number; z: number } | null;
  enemies: Array<{ id: string; x: number; z: number; hp: number }>;
  terminals: Array<{ id: string; x: number; z: number; hacked: boolean }>;
}

export interface CompanionDecisionOutput {
  targetX: number;
  targetZ: number;
  aimYaw: number;
  targetEnemyId: string | null;
  shouldFire: boolean;
  hackingTerminalId: string | null;
  actionTag: string;
}

export function computeCompanionDecision(
  input: CompanionDecisionInput
): CompanionDecisionOutput {
  const {
    slotIndex,
    x,
    z,
    leaderX,
    leaderZ,
    leaderYaw,
    orderMode,
    waypoint,
    enemies,
    terminals,
  } = input;

  // 1. Find nearest live enemy within 26m combat engagement envelope
  let nearestEnemy: { id: string; x: number; z: number; dist: number } | null = null;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (!nearestEnemy || d < nearestEnemy.dist) {
      nearestEnemy = { id: e.id, x: e.x, z: e.z, dist: d };
    }
  }

  // 2. Find nearest unhacked terminal
  let nearestTerminal: { id: string; x: number; z: number; dist: number } | null = null;
  for (const t of terminals) {
    if (t.hacked) continue;
    const d = Math.hypot(t.x - x, t.z - z);
    if (!nearestTerminal || d < nearestTerminal.dist) {
      nearestTerminal = { id: t.id, x: t.x, z: t.z, dist: d };
    }
  }

  const sideSign = slotIndex === 0 ? 1 : -1;
  let targetX = leaderX;
  let targetZ = leaderZ;
  let hackingTerminalId: string | null = null;
  let actionTag = 'WEDGE OVERWATCH';

  if (orderMode === 'BREACH_TERMINAL' && nearestTerminal) {
    // Move inside the 3.2m terminal ring to decrypt
    targetX = nearestTerminal.x + sideSign * 1.45;
    targetZ = nearestTerminal.z + 1.25;
    if (nearestTerminal.dist <= 4.1) {
      hackingTerminalId = nearestTerminal.id;
      actionTag = `DECRYPTING ${nearestTerminal.id}`;
    } else {
      actionTag = `MOVING TO ${nearestTerminal.id}`;
    }
  } else if (orderMode === 'AGGRESSIVE_HUNT' && nearestEnemy) {
    // Strafe around target enemy at 8.5m optimal rifle standoff range
    const angleToComp = Math.atan2(x - nearestEnemy.x, z - nearestEnemy.z) + sideSign * 0.45;
    targetX = nearestEnemy.x + Math.sin(angleToComp) * 8.5;
    targetZ = nearestEnemy.z + Math.cos(angleToComp) * 8.5;
    actionTag = `HUNTING ${nearestEnemy.id}`;
  } else if (orderMode === 'HOLD_POSITION') {
    if (waypoint) {
      targetX = waypoint.x + sideSign * 2.4;
      targetZ = waypoint.z;
      actionTag = 'ANCHORING WAYPOINT';
    } else {
      targetX = x;
      targetZ = z;
      actionTag = 'HOLDING SECTOR';
    }
  } else {
    // FOLLOW_SUPPORT: Flank leader in tactical V-wedge (or orbit combat target slightly)
    const offsetAngle = leaderYaw + sideSign * 2.25;
    targetX = leaderX + Math.sin(offsetAngle) * 4.2;
    targetZ = leaderZ + Math.cos(offsetAngle) * 4.2;
    if (nearestTerminal && Math.hypot(leaderX - nearestTerminal.x, leaderZ - nearestTerminal.z) <= 5.5) {
      hackingTerminalId = nearestTerminal.id;
      actionTag = `ASSIST HACK ${nearestTerminal.id}`;
    }
  }

  // Clamp within basin safe boundary
  const rad = Math.hypot(targetX, targetZ);
  if (rad > 48) {
    targetX = (targetX / rad) * 48;
    targetZ = (targetZ / rad) * 48;
  }

  // 3. Determine Aim Direction & Weapon Fire
  let aimYaw = leaderYaw;
  let shouldFire = false;
  let targetEnemyId: string | null = null;

  if (nearestEnemy && nearestEnemy.dist <= 26) {
    const dx = nearestEnemy.x - x;
    const dz = nearestEnemy.z - z;
    aimYaw = Math.atan2(-dx, -dz);
    shouldFire = true;
    targetEnemyId = nearestEnemy.id;
    if (orderMode === 'FOLLOW_SUPPORT') {
      actionTag = `SUPPRESSING ${nearestEnemy.id}`;
    }
  } else {
    const moveDx = targetX - x;
    const moveDz = targetZ - z;
    if (Math.hypot(moveDx, moveDz) > 0.6) {
      aimYaw = Math.atan2(-moveDx, -moveDz);
    }
  }

  return {
    targetX,
    targetZ,
    aimYaw,
    targetEnemyId,
    shouldFire,
    hackingTerminalId,
    actionTag,
  };
}

// ============================================================================
// 9. DYNAMIC TACTICAL KILLFEED ENGINE
// ============================================================================

export type KillfeedEventCategory =
  | 'ELIMINATION'
  | 'EXTRACTION'
  | 'TERMINAL'
  | 'TACTICAL';

export interface KillfeedEntry {
  id: number;
  actor: string;
  verb: string;
  subject: string;
  category: KillfeedEventCategory;
  createdAtSec: number;
  ttlSec: number;
}

export interface EvaluatedKillfeedEntry extends KillfeedEntry {
  opacity: number;
}

const ARCHETYPE_DISPLAY_NAME: Record<EnemyArchetype, string> = {
  chaser: 'Chaser unit',
  kiter: 'Kiter unit',
  interceptor: 'Interceptor unit',
  suppressor: 'Suppressor unit',
};

export function formatEliminationKillfeed(
  killerCallsign: string,
  archetype: EnemyArchetype,
  id: number,
  nowSec: number,
  ttlSec = 6.5
): KillfeedEntry {
  const cleanCallsign = killerCallsign.startsWith('Operative ')
    ? killerCallsign
    : `Operative ${killerCallsign}`;
  return {
    id,
    actor: cleanCallsign,
    verb: 'eliminated',
    subject: ARCHETYPE_DISPLAY_NAME[archetype],
    category: 'ELIMINATION',
    createdAtSec: nowSec,
    ttlSec,
  };
}

export function formatExtractionMilestoneKillfeed(
  milestonePct: number,
  id: number,
  nowSec: number,
  ttlSec = 6.5
): KillfeedEntry {
  return {
    id,
    actor: 'Extraction beacon',
    verb: 'at',
    subject: `${Math.round(milestonePct)}%`,
    category: 'EXTRACTION',
    createdAtSec: nowSec,
    ttlSec,
  };
}

export function formatTerminalKillfeed(
  actorCallsign: string,
  terminalLabel: string,
  dataYieldGb: number,
  id: number,
  nowSec: number,
  ttlSec = 6.5
): KillfeedEntry {
  const cleanCallsign = actorCallsign.startsWith('Operative ')
    ? actorCallsign
    : `Operative ${actorCallsign}`;
  return {
    id,
    actor: cleanCallsign,
    verb: 'decrypted',
    subject: `${terminalLabel} (+${dataYieldGb} GB)`,
    category: 'TERMINAL',
    createdAtSec: nowSec,
    ttlSec,
  };
}

export function pruneAndFadeKillfeed(
  entries: KillfeedEntry[],
  nowSec: number,
  maxVisible = 4
): Array<KillfeedEntry & { opacity: number }> {
  const active: Array<KillfeedEntry & { opacity: number }> = [];

  for (const entry of entries) {
    const age = Math.max(0, nowSec - entry.createdAtSec);
    if (age >= entry.ttlSec) continue;

    // Quick 0.2s fade-in, hold full opacity, then smooth 1.4s fade-out at end of TTL
    let opacity = 1.0;
    if (age < 0.2) {
      opacity = Math.max(0.15, age / 0.2);
    } else if (age > entry.ttlSec - 1.4) {
      opacity = Math.max(0, (entry.ttlSec - age) / 1.4);
    }
    active.push({
      ...entry,
      opacity: Number(opacity.toFixed(2)),
    });
  }

  return active.slice(-maxVisible);
}

export function getKillfeedLifecycleClasses(
  isEntered: boolean,
  opacity: number
): string {
  // Entry-level fading slide-in from the right before settling into position
  if (!isEntered) {
    return 'opacity-0 translate-x-8 translate-y-0 scale-95';
  }
  // Smooth monochrome fade-out & subtle upward drift as entry approaches TTL expiration
  if (opacity >= 0.85) {
    return 'opacity-100 translate-x-0 translate-y-0 scale-100';
  }
  if (opacity >= 0.65) {
    return 'opacity-80 translate-x-0.5 -translate-y-0.5 scale-100';
  }
  if (opacity >= 0.45) {
    return 'opacity-55 translate-x-1 -translate-y-0.5 scale-[0.99]';
  }
  if (opacity >= 0.25) {
    return 'opacity-30 translate-x-2 -translate-y-1 scale-[0.98]';
  }
  return 'opacity-10 translate-x-3 -translate-y-1.5 scale-95';
}



