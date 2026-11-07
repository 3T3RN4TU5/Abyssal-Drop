import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MISSION_MODIFIERS,
  rollMissionModifiers,
  advanceWeatherSystem,
  computeEffectiveWeatherMetrics,
  canAllocateSkill,
  allocateSkillPoint,
  computeEffectiveStats,
  computeProbabilityHeatmap,
  createInitialCircleState,
  advanceCircleClosure,
  isOutsideSafeCircle,
  computeCompanionDecision,
  getCompanionClasses,
  formatEliminationKillfeed,
  formatExtractionMilestoneKillfeed,
  pruneAndFadeKillfeed,
  getKillfeedLifecycleClasses,
  UnlockedSkillsMap,
  WeatherState,
} from './rules';

test('rollMissionModifiers returns distinct modifiers deterministically for a seed', () => {
  const mods1 = rollMissionModifiers(42, 2);
  const mods2 = rollMissionModifiers(42, 2);
  assert.equal(mods1.length, 2);
  assert.notEqual(mods1[0].id, mods1[1].id);
  assert.deepEqual(mods1, mods2);
});

test('advanceWeatherSystem decrements timer and transitions through sequence', () => {
  const initial: WeatherState = {
    current: 'CLEAR',
    next: 'TORRENTIAL_RAIN',
    timeRemainingSec: 10,
    cycleDurationSec: 35,
    analystFilterActive: false,
  };

  const stepped = advanceWeatherSystem(initial, 4);
  assert.equal(stepped.current, 'CLEAR');
  assert.equal(stepped.timeRemainingSec, 6);

  const transitioned = advanceWeatherSystem(stepped, 7);
  assert.equal(transitioned.current, 'TORRENTIAL_RAIN');
  assert.equal(transitioned.next, 'DENSE_FOG');
  assert.equal(transitioned.timeRemainingSec, 35);
});

test('computeEffectiveWeatherMetrics applies Analyst weather penetration filter and footstep masking', () => {
  const rainState: WeatherState = {
    current: 'TORRENTIAL_RAIN',
    next: 'DENSE_FOG',
    timeRemainingSec: 20,
    cycleDurationSec: 35,
    analystFilterActive: false,
  };
  const unfiltered = computeEffectiveWeatherMetrics(rainState, 0);
  const filtered = computeEffectiveWeatherMetrics(
    { ...rainState, analystFilterActive: true },
    0.3
  );

  assert.ok(filtered.analystClarityPct > unfiltered.analystClarityPct);
  assert.ok(filtered.footstepMaskingPct > unfiltered.footstepMaskingPct);
  assert.ok(filtered.effectiveAiDetectionMultiplier < unfiltered.effectiveAiDetectionMultiplier);
});

test('Operative Skill Tree enforces prerequisites and deducts Skill Points', () => {
  const initialUnlocked: UnlockedSkillsMap = {
    vanguard: [],
    specter: [],
    warden: [],
  };

  // Tier 2 skill should be blocked before Tier 1 prerequisite
  const tier2Check = canAllocateSkill('vanguard', 'van_mob_2', initialUnlocked, 3);
  assert.equal(tier2Check.allowed, false);

  // Allocate Tier 1 skill (cost 1)
  const step1 = allocateSkillPoint('vanguard', 'van_mob_1', initialUnlocked, 3);
  assert.equal(step1.allocated, true);
  assert.equal(step1.availableSkillPoints, 2);
  assert.ok(step1.unlockedByClass.vanguard.includes('van_mob_1'));

  // Now Tier 2 skill (cost 2) is allowed
  const step2 = allocateSkillPoint(
    'vanguard',
    'van_mob_2',
    step1.unlockedByClass,
    step1.availableSkillPoints
  );
  assert.equal(step2.allocated, true);
  assert.equal(step2.availableSkillPoints, 0);
  assert.ok(step2.unlockedByClass.vanguard.includes('van_mob_2'));
});

test('computeEffectiveStats combines Operative skills, Mission Modifiers, and Weather bonuses', () => {
  const unlocked: UnlockedSkillsMap = {
    vanguard: ['van_mob_1', 'van_com_1'],
    specter: ['spc_com_1', 'spc_com_2'],
    warden: [],
  };
  const cloakedMod = ALL_MISSION_MODIFIERS.find((m) => m.id === 'cloaked_ai')!;
  const limitedAmmoMod = ALL_MISSION_MODIFIERS.find((m) => m.id === 'limited_ammo')!;
  const weather: WeatherState = {
    current: 'EM_SQUALL',
    next: 'CLEAR',
    timeRemainingSec: 15,
    cycleDurationSec: 35,
    analystFilterActive: true,
  };

  const stats = computeEffectiveStats(
    'specter',
    unlocked,
    [cloakedMod, limitedAmmoMod],
    weather
  );

  assert.equal(stats.areEnemiesCloaked, true);
  assert.ok(stats.hackDurationSec < 2.6); // Quantum Icebreaker speeds up hacking
  assert.ok(stats.dataYieldMultiplier > 1.5); // Deep-Packet Siphon + EM Squall
  assert.ok(stats.magazineSize < 24); // Limited ammo modifier reduces magazine size
});

test('computeProbabilityHeatmap generates grid cells with threat and loot probability in [0, 1]', () => {
  const cells = computeProbabilityHeatmap(
    [{ x: 10, z: -10, vx: 2, vz: 1 }],
    [{ x: -20, z: 15, hacked: false }],
    [{ x: 0, z: 0 }],
    4,
    6
  );
  assert.equal(cells.length, 36);
  for (const cell of cells) {
    assert.ok(cell.threatProbability >= 0 && cell.threatProbability <= 1);
    assert.ok(cell.lootDensity >= 0 && cell.lootDensity <= 1);
  }
});

test('advanceCircleClosure shrinks safe zone and transitions phases toward Extraction Spire', () => {
  const c0 = createInitialCircleState();
  assert.equal(c0.phase, 1);
  assert.equal(isOutsideSafeCircle(0, -4, c0), false);
  assert.equal(isOutsideSafeCircle(48, 48, c0), true);

  // Advance enough seconds to reach targetRadius (50 -> 36 at 0.45/s = 32s)
  const c1 = advanceCircleClosure(c0, 35);
  assert.equal(c1.phase, 2);
  assert.equal(c1.currentRadius, 36);
  assert.equal(c1.targetRadius, 25);
});

test('computeCompanionDecision engages nearby hostiles and executes BREACH_TERMINAL orders', () => {
  const compClasses = getCompanionClasses('vanguard');
  assert.deepEqual(compClasses, ['specter', 'warden']);

  // 1. Follow & Support: should fire at nearby enemy within 26m
  const escortDecision = computeCompanionDecision({
    companionId: 'specter',
    slotIndex: 0,
    x: 0,
    z: 20,
    leaderX: 0,
    leaderZ: 24,
    leaderYaw: 0,
    orderMode: 'FOLLOW_SUPPORT',
    waypoint: null,
    enemies: [{ id: 'E1', x: 0, z: 6, hp: 80 }],
    terminals: [{ id: 'T1', x: -24, z: 14, hacked: false }],
  });
  assert.equal(escortDecision.shouldFire, true);
  assert.equal(escortDecision.targetEnemyId, 'E1');

  // 2. Breach Terminal: when close to an unhacked terminal, companion actively decrypts it
  const breachDecision = computeCompanionDecision({
    companionId: 'warden',
    slotIndex: 1,
    x: -23,
    z: 14,
    leaderX: 0,
    leaderZ: 24,
    leaderYaw: 0,
    orderMode: 'BREACH_TERMINAL',
    waypoint: null,
    enemies: [],
    terminals: [{ id: 'T1', x: -24, z: 14, hacked: false }],
  });
  assert.equal(breachDecision.hackingTerminalId, 'T1');
  assert.equal(breachDecision.actionTag, 'DECRYPTING T1');
});

test('Killfeed engine formats combat eliminations, extraction milestones, and fades expired entries', () => {
  const elim = formatEliminationKillfeed('WRAITH-2', 'interceptor', 1, 10.0, 6.0);
  assert.equal(
    `${elim.actor} ${elim.verb} ${elim.subject}`,
    'Operative WRAITH-2 eliminated Interceptor unit'
  );

  const ext = formatExtractionMilestoneKillfeed(50, 2, 12.0, 6.0);
  assert.equal(
    `${ext.actor} ${ext.verb} ${ext.subject}`,
    'Extraction beacon at 50%'
  );

  // At t=13.0, both entries are active; at t=17.5, elim (created at 10.0, ttl 6.0) is pruned
  const activeAt13 = pruneAndFadeKillfeed([elim, ext], 13.0, 4);
  assert.equal(activeAt13.length, 2);
  assert.equal(activeAt13[0].opacity, 1);

  const activeAt175 = pruneAndFadeKillfeed([elim, ext], 17.5, 4);
  assert.equal(activeAt175.length, 1);
  assert.equal(activeAt175[0].id, 2);
  assert.ok(activeAt175[0].opacity < 1 && activeAt175[0].opacity > 0);

  // Entry-level slide-in and fade-out Tailwind utility classes
  assert.equal(
    getKillfeedLifecycleClasses(false, 1.0),
    'opacity-0 translate-x-8 translate-y-0 scale-95'
  );
  assert.equal(
    getKillfeedLifecycleClasses(true, 1.0),
    'opacity-100 translate-x-0 translate-y-0 scale-100'
  );
  assert.ok(getKillfeedLifecycleClasses(true, 0.3).includes('opacity-30'));
});



