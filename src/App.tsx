import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ALL_MISSION_MODIFIERS,
  advanceCircleClosure,
  allocateSkillPoint,
  advanceWeatherSystem,
  CircleClosureState,
  CLASS_ABILITIES,
  computeCompanionDecision,
  computeEffectiveStats,
  computeEffectiveWeatherMetrics,
  computeProbabilityHeatmap,
  createInitialCircleState,
  DROP_ZONES,
  DropZoneOption,
  EnemyArchetype,
  EvaluatedKillfeedEntry,
  formatEliminationKillfeed,
  formatExtractionMilestoneKillfeed,
  formatTerminalKillfeed,
  GamePhase,
  getCompanionClasses,
  HeatmapPoint,
  isOutsideSafeCircle,
  KillfeedEntry,
  MissionModifier,
  OPERATIVE_CLASSES,
  OperativeClassId,
  pruneAndFadeKillfeed,
  RoleMode,
  rollMissionModifiers,
  SQUAD_ORDERS,
  SquadOrderMode,
  UnlockedSkillsMap,
  WEATHER_CONFIGS,
  WeatherState,
} from './game/rules';
import {
  animateEnemyCharacter,
  animateOperativeCharacter,
  createAtmosphericSkyDome,
  createBasinGridTexture,
  createBasinNormalTexture,
  createBasinRoughnessTexture,
  createBumpTexture,
  createDataTerminalMesh,
  createEnemyAgentMesh,
  createExtractionSpireMesh,
  createOperativeMesh,
  createTacticalBunkerMesh,
} from './game/sceneBuilder';
import { sound } from './game/sound';
import { InkSplatEvent, InkThreatOverlay } from './components/InkThreatOverlay';
import { AnalystOverlay } from './components/AnalystOverlay';
import { SkillTreeModal } from './components/SkillTreeModal';
import { StudioPipelineModal } from './components/StudioPipelineModal';
import { KillfeedOverlay } from './components/KillfeedOverlay';

const HdrpInkGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uChromatic: { value: 0.0016 },
    uVignette: { value: 0.38 },
    uContrast: { value: 1.09 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uChromatic;
    uniform float uVignette;
    uniform float uContrast;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      vec2 offset = centered * uChromatic * (dist * 1.8);

      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      // Filmic micro-contrast S-curve
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      // Sumi-e dark ink peripheral vignette
      float vig = smoothstep(0.82, 0.28, dist * (1.0 + uVignette));
      col *= mix(0.52, 1.0, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

interface EnemyRuntime {
  id: string;
  archetype: EnemyArchetype;
  mesh: THREE.Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackCooldown: number;
  windupTimer: number;
  koTimer: number; // > 0 when toppling in KO transition
  cloaked: boolean;
  revealedTimer: number;
  hitFlashTimer: number;
}

interface TerminalRuntime {
  id: string;
  label: string;
  mesh: THREE.Group;
  x: number;
  z: number;
  hacked: boolean;
  progress: number; // 0..1
}

interface EmpTrapRuntime {
  id: string;
  mesh: THREE.Mesh;
  x: number;
  z: number;
  ready: boolean;
  cooldown: number;
}

interface BulletRuntime {
  active: boolean;
  fromEnemy: boolean;
  shooterCallsign: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
}

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gamePhase, setGamePhase] = useState<GamePhase>(
    initialAutostart ? 'playing' : 'title'
  );
  const [roleMode, setRoleMode] = useState<RoleMode>('operative');
  const [selectedDropZone, setSelectedDropZone] = useState<DropZoneOption>(DROP_ZONES[1]);
  const [activeModifiers, setActiveModifiers] = useState<MissionModifier[]>(() =>
    rollMissionModifiers(20261106, 2)
  );
  const [weather, setWeather] = useState<WeatherState>({
    current: 'CLEAR',
    next: 'TORRENTIAL_RAIN',
    timeRemainingSec: 28,
    cycleDurationSec: 28,
    analystFilterActive: false,
  });

  // Operative Squad & Skill Tree State
  const [activeOperative, setActiveOperative] = useState<OperativeClassId>('vanguard');
  const [unlockedSkills, setUnlockedSkills] = useState<UnlockedSkillsMap>({
    vanguard: ['van_mob_1'],
    specter: ['spc_com_1'],
    warden: ['war_syn_1'],
  });
  const [skillPoints, setSkillPoints] = useState<number>(3);
  const [operativeLevel, setOperativeLevel] = useState<number>(2);
  const [operativeXp, setOperativeXp] = useState<number>(140);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState<boolean>(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState<boolean>(false);
  const [hdrpMode, setHdrpMode] = useState<boolean>(true);
  const [squadOrder, setSquadOrder] = useState<SquadOrderMode>('FOLLOW_SUPPORT');
  const [companionTelemetry, setCompanionTelemetry] = useState<
    Array<{ callsign: string; actionTag: string; color: string }>
  >([
    { callsign: 'WRAITH-2', actionTag: 'WEDGE OVERWATCH', color: '#06b6d4' },
    { callsign: 'AEGIS-3', actionTag: 'WEDGE OVERWATCH', color: '#10b981' },
  ]);
  const [circleState, setCircleState] = useState<CircleClosureState>(() =>
    createInitialCircleState()
  );

  // Live HUD State (throttled updates from 60Hz loop)
  const [hp, setHp] = useState<number>(110);
  const [maxHp, setMaxHp] = useState<number>(110);
  const [ammo, setAmmo] = useState<number>(28);
  const [maxAmmo, setMaxAmmo] = useState<number>(28);
  const [reloadingTimer, setReloadingTimer] = useState<number>(0);
  const [dashCooldown, setDashCooldown] = useState<number>(0);
  const [abilityCooldown, setAbilityCooldown] = useState<number>(0);
  const [dataCurrency, setDataCurrency] = useState<number>(45);
  const [terminalsHacked, setTerminalsHacked] = useState<number>(0);
  const [totalTerminals] = useState<number>(4);
  const [nearTerminalLabel, setNearTerminalLabel] = useState<string | null>(null);
  const [nearTerminalProgress, setNearTerminalProgress] = useState<number>(0);
  const [extractionReady, setExtractionReady] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<'victory' | 'defeat' | null>(null);
  const [runStats, setRunStats] = useState({
    clearTimeSec: 0,
    kills: 0,
    dataExtracted: 45,
    terminalsBreached: 0,
  });
  const [muted, setMuted] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>(
    'Match Modifiers & Drop Telemetry Synced'
  );
  const [inkSplats, setInkSplats] = useState<InkSplatEvent[]>([]);
  const [killfeedEntries, setKillfeedEntries] = useState<EvaluatedKillfeedEntry[]>(() =>
    pruneAndFadeKillfeed(
      [
        formatEliminationKillfeed('WRAITH-2', 'interceptor', 1, 0, 10.0),
        formatExtractionMilestoneKillfeed(50, 2, 0, 10.0),
      ],
      0.25
    )
  );
  const [waypoint, setWaypoint] = useState<{ x: number; z: number } | null>({
    x: -22,
    z: 10,
  });

  // Analyst Overlay snapshot state
  const [analystSnapshot, setAnalystSnapshot] = useState<{
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
    heatmap: HeatmapPoint[];
  }>({
    operativePos: { x: 0, z: 28 },
    squadPositions: [],
    enemies: [],
    terminals: [],
    empTraps: [],
    heatmap: [],
  });

  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Sync gamePhase to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gamePhase;
  }, [gamePhase]);

  const effectiveStats = computeEffectiveStats(
    activeOperative,
    unlockedSkills,
    activeModifiers,
    weather
  );
  const effectiveWeather = computeEffectiveWeatherMetrics(
    weather,
    effectiveStats.stealthNoiseReduction
  );

  // Mutable ref bridge for the 60Hz Three.js loop
  const simRef = useRef({
    gamePhase,
    roleMode,
    activeOperative,
    effectiveStats,
    effectiveWeather,
    weather,
    activeModifiers,
    isSkillTreeOpen,
    isStudioModalOpen,
    hdrpMode,
    squadOrder,
    circle: createInitialCircleState(),
    waypoint,
    dataCurrency,
    skillPoints,
    operativeXp,
    operativeLevel,
    player: {
      x: DROP_ZONES[1].coordinates.x,
      z: DROP_ZONES[1].coordinates.z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: 110,
      maxHp: 110,
      ammo: 28,
      maxAmmo: 28,
      reloadTimer: 0,
      dashCooldown: 0,
      dashActiveTimer: 0,
      abilityCooldown: 0,
      stealthOverdriveTimer: 0,
      shootCooldown: 0,
      hitstopTimer: 0,
      cameraTrauma: 0,
      muzzleTimer: 0,
    },
    squadMates: [
      {
        id: 'specter' as OperativeClassId,
        callsign: 'WRAITH-2',
        x: -4,
        z: 30,
        yaw: 0,
        speed: 0,
        shootCooldown: 0.4,
        muzzleTimer: 0,
        supportCooldown: 6.0,
        actionTag: 'WEDGE OVERWATCH',
        color: '#06b6d4',
      },
      {
        id: 'warden' as OperativeClassId,
        callsign: 'AEGIS-3',
        x: 4,
        z: 30,
        yaw: 0,
        speed: 0,
        shootCooldown: 0.65,
        muzzleTimer: 0,
        supportCooldown: 8.0,
        actionTag: 'WEDGE OVERWATCH',
        color: '#10b981',
      },
    ],
    operativeHistory: [{ x: 0, z: 28 }],
    kills: 0,
    matchTimeSec: 0,
    extractionProgress: 0,
    lastExtractionMilestone: 0,
    splatCounter: 1,
    splats: [] as InkSplatEvent[],
    killfeedCounter: 3,
    killfeed: [
      formatEliminationKillfeed('WRAITH-2', 'interceptor', 1, 0, 18.0),
      formatExtractionMilestoneKillfeed(50, 2, 0, 20.0),
    ] as KillfeedEntry[],
    resetRequested: false,
    reconPulseRequested: false,
    empTrapRequested: false,
    supplyDropRequested: false,
    classAbilityRequested: false,
    switchOperativeMeshRequested: false,
  });

  useEffect(() => {
    simRef.current.gamePhase = gamePhase;
    simRef.current.roleMode = roleMode;
    simRef.current.activeOperative = activeOperative;
    simRef.current.effectiveStats = effectiveStats;
    simRef.current.effectiveWeather = effectiveWeather;
    simRef.current.weather = weather;
    simRef.current.activeModifiers = activeModifiers;
    simRef.current.isSkillTreeOpen = isSkillTreeOpen;
    simRef.current.isStudioModalOpen = isStudioModalOpen;
    simRef.current.hdrpMode = hdrpMode;
    simRef.current.squadOrder = squadOrder;
    simRef.current.waypoint = waypoint;
    simRef.current.dataCurrency = dataCurrency;
    simRef.current.skillPoints = skillPoints;
    simRef.current.operativeXp = operativeXp;
    simRef.current.operativeLevel = operativeLevel;
  }, [
    gamePhase,
    roleMode,
    activeOperative,
    effectiveStats,
    effectiveWeather,
    weather,
    activeModifiers,
    isSkillTreeOpen,
    isStudioModalOpen,
    hdrpMode,
    squadOrder,
    waypoint,
    dataCurrency,
    skillPoints,
    operativeXp,
    operativeLevel,
  ]);

  const awardXpAndCheckLevel = useCallback((xpGain: number, reason: string) => {
    setOperativeXp((prevXp) => {
      const nextXp = prevXp + xpGain;
      const newLevel = 1 + Math.floor(nextXp / 100);
      if (newLevel > simRef.current.operativeLevel) {
        setOperativeLevel(newLevel);
        setSkillPoints((sp) => sp + 1);
        setStatusBanner(`Level Up! +1 Skill Point earned (${reason}) — Press [K] for Skill Tree`);
        sound.playSkillUnlock();
      }
      return nextXp;
    });
  }, []);

  const handleStartMatch = useCallback(
    (dropZone = selectedDropZone) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const stats = computeEffectiveStats(
        activeOperative,
        unlockedSkills,
        activeModifiers,
        weather
      );
      simRef.current.player.x = dropZone.coordinates.x;
      simRef.current.player.z = dropZone.coordinates.z;
      simRef.current.player.hp = stats.maxHp;
      simRef.current.player.maxHp = stats.maxHp;
      simRef.current.player.ammo = stats.magazineSize;
      simRef.current.player.maxAmmo = stats.magazineSize;
      simRef.current.player.reloadTimer = 0;
      simRef.current.player.dashCooldown = 0;
      simRef.current.kills = 0;
      simRef.current.matchTimeSec = 0;
      simRef.current.extractionProgress = 0;
      simRef.current.resetRequested = true;

      setHp(stats.maxHp);
      setMaxHp(stats.maxHp);
      setAmmo(stats.magazineSize);
      setMaxAmmo(stats.magazineSize);
      setDataCurrency(45);
      setTerminalsHacked(0);
      setExtractionReady(false);
      setExtractionProgress(0);
      setMatchResult(null);
      setGamePhase('playing');
      document.body.dataset.state = 'playing';
      setStatusBanner(
        `Dropped at ${dropZone.name} · Modifiers: ${activeModifiers
          .map((m) => m.name)
          .join(' & ')}`
      );
      sound.playDash();
    },
    [selectedDropZone, activeOperative, unlockedSkills, activeModifiers, weather]
  );

  const handleRerollModifiers = () => {
    const nextMods = rollMissionModifiers(Date.now() + Math.random() * 10000, 2);
    setActiveModifiers(nextMods);
    setStatusBanner(
      `Mission Modifiers Rerolled: ${nextMods.map((m) => m.name).join(' · ')}`
    );
    sound.playAnalystPulse();
  };

  const handleToggleWeatherFilter = useCallback(() => {
    setWeather((prev) => {
      const nextActive = !prev.analystFilterActive;
      setStatusBanner(
        nextActive
          ? `${WEATHER_CONFIGS[prev.current].filterModeName} Engaged — Weather Distortion Pierced`
          : 'Analyst Weather Filter Standby'
      );
      sound.playAnalystPulse();
      return { ...prev, analystFilterActive: nextActive };
    });
  }, []);

  const handleCycleWeatherNow = useCallback(() => {
    setWeather((prev) => {
      const transitioned = advanceWeatherSystem({ ...prev, timeRemainingSec: 0 }, 1);
      setStatusBanner(
        `Weather Shift: ${WEATHER_CONFIGS[transitioned.current].name} — ${
          WEATHER_CONFIGS[transitioned.current].tagline
        }`
      );
      sound.playWeatherShift();
      return transitioned;
    });
  }, []);

  const handleTriggerReconPulse = useCallback(() => {
    const cost = Math.round(25 * effectiveStats.analystCostMultiplier);
    if (simRef.current.dataCurrency < cost) return;
    setDataCurrency((d) => d - cost);
    simRef.current.reconPulseRequested = true;
    setStatusBanner('Analyst Recon Pulse Deployed — All Cloaked Hostiles Revealed!');
    sound.playAnalystPulse();
  }, [effectiveStats.analystCostMultiplier]);

  const handleTriggerEmpTrap = useCallback(() => {
    const cost = Math.round(40 * effectiveStats.analystCostMultiplier);
    if (simRef.current.dataCurrency < cost) return;
    setDataCurrency((d) => d - cost);
    simRef.current.empTrapRequested = true;
    setStatusBanner('Analyst EMP Capacitor Detonated — Hostiles Stunned & Damaged!');
    sound.playHit(true);
  }, [effectiveStats.analystCostMultiplier]);

  const handleTriggerSupplyDrop = useCallback(() => {
    const cost = Math.round(50 * effectiveStats.analystCostMultiplier);
    if (simRef.current.dataCurrency < cost) return;
    setDataCurrency((d) => d - cost);
    simRef.current.supplyDropRequested = true;
    setStatusBanner('Analyst Supply Drop Landed — Squad Armor & Ammunition Restored!');
    sound.playHackComplete();
  }, [effectiveStats.analystCostMultiplier]);

  const handleAllocateSkill = (opId: OperativeClassId, skillId: string) => {
    const res = allocateSkillPoint(opId, skillId, unlockedSkills, skillPoints);
    if (res.allocated) {
      setUnlockedSkills(res.unlockedByClass);
      setSkillPoints(res.availableSkillPoints);
      sound.playSkillUnlock();
      const newStats = computeEffectiveStats(
        opId,
        res.unlockedByClass,
        activeModifiers,
        weather
      );
      if (opId === activeOperative) {
        simRef.current.player.maxHp = newStats.maxHp;
        simRef.current.player.hp = Math.min(
          newStats.maxHp,
          simRef.current.player.hp + 20
        );
        simRef.current.player.maxAmmo = newStats.magazineSize;
        simRef.current.player.ammo = newStats.magazineSize;
        setMaxHp(newStats.maxHp);
        setHp(simRef.current.player.hp);
        setMaxAmmo(newStats.magazineSize);
        setAmmo(newStats.magazineSize);
      }
    }
  };

  const handleSwitchOperativeClass = (nextClass: OperativeClassId) => {
    setActiveOperative(nextClass);
    const compIds = getCompanionClasses(nextClass);
    simRef.current.squadMates.forEach((sq, idx) => {
      const cid = compIds[idx];
      const prof = OPERATIVE_CLASSES[cid];
      sq.id = cid;
      sq.callsign = prof.callsign;
      sq.color = prof.accentColor;
    });
    const newStats = computeEffectiveStats(
      nextClass,
      unlockedSkills,
      activeModifiers,
      weather
    );
    simRef.current.player.maxHp = newStats.maxHp;
    simRef.current.player.hp = newStats.maxHp;
    simRef.current.player.maxAmmo = newStats.magazineSize;
    simRef.current.player.ammo = newStats.magazineSize;
    simRef.current.switchOperativeMeshRequested = true;
    setMaxHp(newStats.maxHp);
    setHp(newStats.maxHp);
    setMaxAmmo(newStats.magazineSize);
    setAmmo(newStats.magazineSize);
    setStatusBanner(
      `Switched Lead Ground Operative to ${OPERATIVE_CLASSES[nextClass].callsign} (${OPERATIVE_CLASSES[nextClass].title})`
    );
    sound.playDash();
  };

  const handleCycleSquadOrder = useCallback((forcedMode?: SquadOrderMode) => {
    const orderList: SquadOrderMode[] = [
      'FOLLOW_SUPPORT',
      'BREACH_TERMINAL',
      'AGGRESSIVE_HUNT',
      'HOLD_POSITION',
    ];
    setSquadOrder((prev) => {
      const next =
        forcedMode ?? orderList[(orderList.indexOf(prev) + 1) % orderList.length];
      setStatusBanner(
        `Squad Order Issued [C]: ${SQUAD_ORDERS[next].label} — ${SQUAD_ORDERS[next].description}`
      );
      const s = simRef.current;
      s.killfeed.push({
        id: s.killfeedCounter++,
        actor: 'Squad command',
        verb: 'issued',
        subject: SQUAD_ORDERS[next].label,
        category: 'TACTICAL',
        createdAtSec: s.matchTimeSec,
        ttlSec: 7.5,
      });
      sound.playAnalystPulse();
      return next;
    });
  }, []);

  // Main Three.js WebGL initialization (mounted once)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09101d);
    const sceneFog = new THREE.FogExp2(0x09101d, 0.011);
    scene.fog = sceneFog;

    // Studio IBL Environment Map for metallic PBR materials
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.2,
      220
    );
    camera.position.set(0, 14, 42);

    // 3-Point Warm/Cool Lighting Rig + Dynamic Local Point Lights
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.95);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    keyLight.position.set(28, 46, 24);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 55;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 130;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.15);
    rimLight.position.set(-32, 24, -36);
    scene.add(rimLight);

    // Local Point Lights for Specular Wet Puddle Reflections
    const spireLight = new THREE.PointLight(0x10b981, 5.0, 32, 1.4);
    spireLight.position.set(0, 7.5, -34);
    scene.add(spireLight);

    const centralTermLight = new THREE.PointLight(0x06b6d4, 3.8, 24, 1.5);
    centralTermLight.position.set(0, 4.2, -6);
    scene.add(centralTermLight);

    const muzzlePointLight = new THREE.PointLight(0xf59e0b, 0, 15, 1.6);
    muzzlePointLight.position.set(0, 1.6, 28);
    scene.add(muzzlePointLight);

    // Atmospheric HDRP Sky Dome
    const skyDome = createAtmosphericSkyDome();
    scene.add(skyDome);

    // Ground Basin Floor with PBR Albedo, Specular Wet Puddle Roughness & Tangent-Space Normal Map
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const gridTex = createBasinGridTexture(maxAniso);
    const roughTex = createBasinRoughnessTexture();
    const normalTex = createBasinNormalTexture();
    const bumpTex = createBumpTexture();
    const groundGeo = new THREE.PlaneGeometry(220, 220);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gridTex,
      roughnessMap: roughTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.55, 0.55),
      bumpMap: bumpTex,
      bumpScale: 0.12,
      roughness: 0.78,
      metalness: 0.32,
      envMapIntensity: 1.35,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // Natural Outdoor Perimeter Cliffs & Obsidian Outcrops (InstancedMesh > 20 instances)
    const cliffCount = 48;
    const cliffGeo = new THREE.DodecahedronGeometry(4.5, 1);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.28,
    });
    const cliffInstanced = new THREE.InstancedMesh(cliffGeo, cliffMat, cliffCount);
    const dummy = new THREE.Object3D();
    const tintColor = new THREE.Color();
    for (let i = 0; i < cliffCount; i++) {
      const angle = (i / cliffCount) * Math.PI * 2;
      const radius = 56 + (i % 3) * 4.5;
      dummy.position.set(
        Math.cos(angle) * radius,
        2.2 + (i % 4) * 1.1,
        Math.sin(angle) * radius
      );
      dummy.rotation.set((i * 0.7) % 3, (i * 1.3) % 3, 0);
      const scale = 0.85 + (i % 5) * 0.18;
      dummy.scale.set(scale * 1.2, scale * 1.6, scale);
      dummy.updateMatrix();
      cliffInstanced.setMatrixAt(i, dummy.matrix);
      tintColor.setHSL(0.58, 0.25, 0.1 + (i % 4) * 0.03);
      cliffInstanced.setColorAt(i, tintColor);
    }
    cliffInstanced.instanceMatrix.needsUpdate = true;
    if (cliffInstanced.instanceColor) cliffInstanced.instanceColor.needsUpdate = true;
    cliffInstanced.computeBoundingSphere();
    scene.add(cliffInstanced);

    // Composite Armored Tactical Barricades across the basin
    const coverObstacles: Array<{ x: number; z: number; rx: number; rz: number }> = [
      { x: -14, z: 12, rx: 3.2, rz: 1.4 },
      { x: 14, z: 12, rx: 3.2, rz: 1.4 },
      { x: 0, z: 4, rx: 4.0, rz: 1.5 },
      { x: -20, z: -8, rx: 2.5, rz: 2.5 },
      { x: 20, z: -8, rx: 2.5, rz: 2.5 },
      { x: -10, z: -20, rx: 3.4, rz: 1.3 },
      { x: 10, z: -20, rx: 3.4, rz: 1.3 },
    ];

    coverObstacles.forEach((cov) => {
      const covGroup = createTacticalBunkerMesh(cov.rx * 2, 2.35, cov.rz * 2);
      covGroup.position.set(cov.x, 0, cov.z);
      scene.add(covGroup);
    });

    // Northern Extraction Skyhook Spire (Tall Silhouette Vista Landmark at 0, -34)
    const extractionSpire = createExtractionSpireMesh();
    extractionSpire.position.set(0, 0, -34);
    scene.add(extractionSpire);

    // Unity HDRP-Inspired Post-Processing Pipeline (EffectComposer + Selective UnrealBloomPass + Noir Ink Shader + OutputPass)
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomScale = isSoftwareGl ? 0.5 : 1.0;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        Math.max(1, Math.floor(window.innerWidth * bloomScale)),
        Math.max(1, Math.floor(window.innerHeight * bloomScale))
      ),
      0.46, // strength
      0.32, // radius
      0.78  // threshold: only high-emissive visors, cores, laser sights & beacons bloom
    );
    composer.addPass(bloomPass);

    const inkGradePass = new ShaderPass(HdrpInkGradeShader);
    composer.addPass(inkGradePass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 4 Encrypted Data Terminals
    const terminalCoords = [
      { id: 'T1', label: 'Vault Relay Alpha', x: -24, z: 14 },
      { id: 'T2', label: 'Central Conduit Bravo', x: 0, z: -6 },
      { id: 'T3', label: 'Hydro Node Charlie', x: 24, z: 12 },
      { id: 'T4', label: 'North Breach Delta', x: -16, z: -24 },
    ];
    const terminals: TerminalRuntime[] = terminalCoords.map((tc) => {
      const mesh = createDataTerminalMesh();
      mesh.position.set(tc.x, 0, tc.z);
      scene.add(mesh);
      return {
        id: tc.id,
        label: tc.label,
        mesh,
        x: tc.x,
        z: tc.z,
        hacked: false,
        progress: 0,
      };
    });

    // 3 Analyst-Triggerable EMP Capacitor Traps
    const trapCoords = [
      { id: 'EMP-1', x: -12, z: 2 },
      { id: 'EMP-2', x: 12, z: 2 },
      { id: 'EMP-3', x: 0, z: -18 },
    ];
    const empTrapGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.5, 12);
    const empTraps: EmpTrapRuntime[] = trapCoords.map((tc) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xa855f7,
        emissiveIntensity: 1.3,
        roughness: 0.25,
        metalness: 0.8,
      });
      const mesh = new THREE.Mesh(empTrapGeo, mat);
      mesh.position.set(tc.x, 0.25, tc.z);
      scene.add(mesh);
      return {
        id: tc.id,
        mesh,
        x: tc.x,
        z: tc.z,
        ready: true,
        cooldown: 0,
      };
    });

    // Waypoint Beacon Ring in 3D World
    const wpGroup = new THREE.Group();
    const wpRing = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.65, 28),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    wpRing.rotateX(-Math.PI / 2);
    wpRing.position.y = 0.06;
    wpGroup.add(wpRing);

    const wpPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 9, 8),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.3,
      })
    );
    wpPillar.position.y = 4.5;
    wpGroup.add(wpPillar);
    scene.add(wpGroup);

    // 3D Abyssal Circle Closure Perimeter Ring
    const stormRingGeo = new THREE.RingGeometry(0.985, 1.0, 64);
    stormRingGeo.rotateX(-Math.PI / 2);
    const stormRingMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const stormRingMesh = new THREE.Mesh(stormRingGeo, stormRingMat);
    stormRingMesh.position.set(0, 0.08, -4);
    stormRingMesh.scale.setScalar(50);
    scene.add(stormRingMesh);

    // Lead Player Operative Mesh + 2 AI Squad Mates
    let playerMesh = createOperativeMesh(simRef.current.activeOperative, false);
    playerMesh.position.set(simRef.current.player.x, 0, simRef.current.player.z);
    scene.add(playerMesh);

    const squadMeshes = simRef.current.squadMates.map((sq) => {
      const m = createOperativeMesh(sq.id, true);
      m.position.set(sq.x, 0, sq.z);
      scene.add(m);
      return m;
    });

    // Multi-Agent Enemy AI Faction Units (4 distinct archetypes)
    const enemyConfigs: Array<{
      id: string;
      archetype: EnemyArchetype;
      x: number;
      z: number;
      hp: number;
      speed: number;
    }> = [
      { id: 'E1', archetype: 'chaser', x: -26, z: 2, hp: 80, speed: 6.4 },
      { id: 'E2', archetype: 'kiter', x: 22, z: -2, hp: 70, speed: 5.2 },
      { id: 'E3', archetype: 'interceptor', x: -8, z: -14, hp: 90, speed: 6.8 },
      { id: 'E4', archetype: 'suppressor', x: 12, z: -22, hp: 125, speed: 4.4 },
      { id: 'E5', archetype: 'chaser', x: 26, z: 22, hp: 80, speed: 6.4 },
      { id: 'E6', archetype: 'interceptor', x: -20, z: -28, hp: 90, speed: 6.8 },
    ];

    const enemies: EnemyRuntime[] = enemyConfigs.map((ec) => {
      const mesh = createEnemyAgentMesh(ec.archetype);
      mesh.position.set(ec.x, 0, ec.z);
      scene.add(mesh);
      return {
        id: ec.id,
        archetype: ec.archetype,
        mesh,
        x: ec.x,
        z: ec.z,
        vx: 0,
        vz: 0,
        hp: ec.hp,
        maxHp: ec.hp,
        speed: ec.speed,
        attackCooldown: 1.5 + Math.random() * 1.5,
        windupTimer: 0,
        koTimer: 0,
        cloaked: simRef.current.effectiveStats.areEnemiesCloaked,
        revealedTimer: 0,
        hitFlashTimer: 0,
      };
    });

    // Zero-GC Pooled Bullet InstancedMesh
    const maxBullets = 40;
    const bulletGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const bulletInstanced = new THREE.InstancedMesh(bulletGeo, bulletMat, maxBullets);
    bulletInstanced.frustumCulled = false;
    scene.add(bulletInstanced);
    const bullets: BulletRuntime[] = Array.from({ length: maxBullets }, () => ({
      active: false,
      fromEnemy: false,
      shooterCallsign: 'KESTREL-1',
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vz: 0,
      damage: 20,
      life: 0,
    }));

    // Zero-GC Weather Rain/Squall Particle Pool (InstancedMesh)
    const rainCount = 120;
    const rainGeo = new THREE.BoxGeometry(0.05, 1.6, 0.05);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.45,
    });
    const rainInstanced = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
    rainInstanced.frustumCulled = false;
    scene.add(rainInstanced);
    const rainDrops = Array.from({ length: rainCount }, (_, i) => ({
      x: ((i * 37) % 90) - 45,
      y: (i * 13) % 35,
      z: ((i * 59) % 90) - 45,
    }));

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Unified Input Listeners
    const keysPressed = new Set<string>();
    let mouseWorldX = 0;
    let mouseWorldZ = 0;
    let mouseDown = false;
    const raycaster = new THREE.Raycaster();
    const mouseNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPt = new THREE.Vector3();

    const updateMouseWorld = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNdc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, intersectPt)) {
        mouseWorldX = intersectPt.x;
        mouseWorldZ = intersectPt.z;
      }
    };

    const spawnBullet = (
      x: number,
      z: number,
      dirX: number,
      dirZ: number,
      fromEnemy: boolean,
      damage: number,
      shooterCallsign = 'KESTREL-1'
    ) => {
      const slot = bullets.find((b) => !b.active);
      if (!slot) return;
      const spd = fromEnemy ? 24 : 38;
      slot.active = true;
      slot.fromEnemy = fromEnemy;
      slot.shooterCallsign = shooterCallsign;
      slot.x = x;
      slot.y = 1.3;
      slot.z = z;
      slot.vx = dirX * spd;
      slot.vz = dirZ * spd;
      slot.damage = damage;
      slot.life = 1.6;
    };

    const pushKillfeed = (entry: KillfeedEntry) => {
      simRef.current.killfeed.push(entry);
      if (simRef.current.killfeed.length > 12) {
        simRef.current.killfeed.shift();
      }
    };

    const pushInkSplat = (
      sourceX: number,
      sourceZ: number,
      intensity: number,
      type: 'gunfire' | 'footstep' | 'breach'
    ) => {
      const p = simRef.current.player;
      const dx = sourceX - p.x;
      const dz = sourceZ - p.z;
      const angleRad = Math.atan2(dx, -dz);
      simRef.current.splats.push({
        id: simRef.current.splatCounter++,
        angleRad,
        intensity,
        type,
        ageSec: 0,
        maxAgeSec: type === 'gunfire' ? 1.35 : 1.0,
      });
      if (simRef.current.splats.length > 10) {
        simRef.current.splats.shift();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);

      if (e.code === 'KeyK') {
        e.preventDefault();
        setIsSkillTreeOpen((prev) => !prev);
        return;
      }

      if (e.code === 'KeyG') {
        e.preventDefault();
        setIsStudioModalOpen((prev) => !prev);
        return;
      }

      if (e.code === 'KeyH') {
        e.preventDefault();
        setHdrpMode((prev) => !prev);
        return;
      }

      if (simRef.current.gamePhase === 'title') {
        if (
          (e.code === 'Enter' || e.code === 'Space') &&
          !simRef.current.isSkillTreeOpen &&
          !simRef.current.isStudioModalOpen
        ) {
          e.preventDefault();
          handleStartMatch();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (simRef.current.isStudioModalOpen) {
          setIsStudioModalOpen(false);
          return;
        }
        if (simRef.current.isSkillTreeOpen) {
          setIsSkillTreeOpen(false);
          return;
        }
        setGamePhase((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (
        simRef.current.gamePhase !== 'playing' ||
        simRef.current.isSkillTreeOpen ||
        simRef.current.isStudioModalOpen
      )
        return;

      if (e.code === 'Tab') {
        e.preventDefault();
        setRoleMode((prev) => (prev === 'operative' ? 'analyst' : 'operative'));
        sound.playAnalystPulse();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        handleCycleSquadOrder();
      } else if (e.code === 'KeyQ' && simRef.current.roleMode === 'operative') {
        simRef.current.classAbilityRequested = true;
      } else if (e.code === 'KeyW' && simRef.current.roleMode === 'analyst') {
        handleToggleWeatherFilter();
      } else if (e.code === 'Digit1' && simRef.current.roleMode === 'analyst') {
        handleTriggerReconPulse();
      } else if (e.code === 'Digit2' && simRef.current.roleMode === 'analyst') {
        handleTriggerEmpTrap();
      } else if (e.code === 'Digit3' && simRef.current.roleMode === 'analyst') {
        handleTriggerSupplyDrop();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        const p = simRef.current.player;
        if (p.dashCooldown <= 0) {
          p.dashCooldown = simRef.current.effectiveStats.dashCooldownSec;
          p.dashActiveTimer = 0.22;
          sound.playDash();
        }
      } else if (e.code === 'KeyR') {
        const p = simRef.current.player;
        if (p.ammo < p.maxAmmo && p.reloadTimer <= 0) {
          p.reloadTimer = 1.25;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      updateMouseWorld(e.clientX, e.clientY);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      updateMouseWorld(e.clientX, e.clientY);
      mouseDown = true;
    };

    const onMouseUp = () => {
      mouseDown = false;
    };

    const onBlur = () => {
      keysPressed.clear();
      mouseDown = false;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);

    // Pre-allocated vectors outside the loop
    const camTargetPos = new THREE.Vector3();
    const camLookTarget = new THREE.Vector3();
    const currentLook = new THREE.Vector3(0, 1.5, 0);
    const bulletDummy = new THREE.Object3D();
    const rainDummy = new THREE.Object3D();

    let frameId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let historySampleAccum = 0;
    let weatherSyncAccum = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const s = simRef.current;
      const p = s.player;

      // Handle match reset request
      if (s.resetRequested) {
        s.resetRequested = false;
        terminals.forEach((t, idx) => {
          t.hacked = false;
          t.progress = 0;
          t.x = terminalCoords[idx].x;
          t.z = terminalCoords[idx].z;
          const { holoMat, ringMat } = t.mesh.userData;
          holoMat.color.setHex(0x06b6d4);
          holoMat.emissive.setHex(0x06b6d4);
          ringMat.color.setHex(0x06b6d4);
        });
        enemies.forEach((e, idx) => {
          const cfg = enemyConfigs[idx];
          e.x = cfg.x;
          e.z = cfg.z;
          e.hp = cfg.hp;
          e.maxHp = cfg.hp;
          e.koTimer = 0;
          e.windupTimer = 0;
          e.revealedTimer = 0;
          e.cloaked = s.effectiveStats.areEnemiesCloaked;
          e.mesh.visible = true;
          e.mesh.rotation.set(0, 0, 0);
          e.mesh.position.set(e.x, 0, e.z);
        });
        empTraps.forEach((tr) => {
          tr.ready = true;
          tr.cooldown = 0;
        });
        s.splats = [];
        s.lastExtractionMilestone = 0;
        s.killfeed = [
          formatEliminationKillfeed(
            'WRAITH-2',
            'interceptor',
            s.killfeedCounter++,
            s.matchTimeSec,
            16.0
          ),
          formatExtractionMilestoneKillfeed(
            50,
            s.killfeedCounter++,
            s.matchTimeSec,
            18.0
          ),
        ];
      }

      // Handle Operative Class Mesh Swap (swaps Lead + rebuilds Companion Class Rigs)
      if (s.switchOperativeMeshRequested) {
        s.switchOperativeMeshRequested = false;
        scene.remove(playerMesh);
        playerMesh = createOperativeMesh(s.activeOperative, false);
        playerMesh.position.set(p.x, 0, p.z);
        scene.add(playerMesh);

        squadMeshes.forEach((oldMesh, idx) => {
          scene.remove(oldMesh);
          const nextCompMesh = createOperativeMesh(s.squadMates[idx].id, true);
          nextCompMesh.position.set(s.squadMates[idx].x, 0, s.squadMates[idx].z);
          scene.add(nextCompMesh);
          squadMeshes[idx] = nextCompMesh;
        });
      }

      // Dynamic Weather Fog & Atmosphere interpolation
      const targetFogDensity = s.effectiveWeather.config.fogDensity;
      sceneFog.density = THREE.MathUtils.damp(sceneFog.density, targetFogDensity, 2.5, dt);
      const targetBg = new THREE.Color(s.effectiveWeather.config.ambientTintHex);
      (scene.background as THREE.Color).lerp(targetBg, 1 - Math.exp(-2.5 * dt));
      sceneFog.color.copy(scene.background as THREE.Color);

      // Animate Weather Rain/Squall Particles
      const showPrecip =
        s.weather.current === 'TORRENTIAL_RAIN' || s.weather.current === 'EM_SQUALL';
      rainInstanced.visible = showPrecip;
      if (showPrecip) {
        rainMat.color.setHex(s.weather.current === 'EM_SQUALL' ? 0xc084fc : 0x7dd3fc);
        for (let i = 0; i < rainCount; i++) {
          const drop = rainDrops[i];
          drop.y -= dt * 28;
          if (drop.y < 0) {
            drop.y = 32;
            drop.x = p.x + (((i * 37) % 70) - 35);
            drop.z = p.z + (((i * 59) % 70) - 35);
          }
          rainDummy.position.set(drop.x, drop.y, drop.z);
          rainDummy.updateMatrix();
          rainInstanced.setMatrixAt(i, rainDummy.matrix);
        }
        rainInstanced.instanceMatrix.needsUpdate = true;
      }

      // Waypoint 3D Marker
      if (s.waypoint) {
        wpGroup.visible = true;
        wpGroup.position.set(s.waypoint.x, 0, s.waypoint.z);
        wpRing.rotation.z += dt * 1.5;
      } else {
        wpGroup.visible = false;
      }

      // Rotate Extraction Beacon Crown & Terminal Cores
      const crown = extractionSpire.getObjectByName('beaconCrown');
      if (crown) crown.rotation.y += dt * 1.8;
      terminals.forEach((t) => {
        const core = t.mesh.userData.core as THREE.Mesh;
        if (core) {
          core.rotation.y += dt * (t.hacked ? 0.6 : 2.2);
          core.position.y = 3.4 + Math.sin(now * 0.003) * 0.14;
        }
      });

      // Title Screen Camera Tour + Idle Character Breathing
      if (s.gamePhase === 'title') {
        const angle = now * 0.00025;
        camera.position.set(Math.sin(angle) * 44, 20, Math.cos(angle) * 44);
        camera.lookAt(0, 2, -6);
        animateOperativeCharacter(playerMesh, 0, 0, now * 0.001, 0);
        squadMeshes.forEach((sm, idx) =>
          animateOperativeCharacter(sm, 0, 0, now * 0.001, idx * 1.7)
        );
        enemies.forEach((e, idx) =>
          animateEnemyCharacter(e.mesh, 2.0, now * 0.001, idx * 1.1)
        );
      } else if (
        s.gamePhase === 'playing' &&
        !s.isSkillTreeOpen &&
        !s.isStudioModalOpen
      ) {
        s.matchTimeSec += dt;

        // Advance Abyssal Circle Closure
        s.circle = advanceCircleClosure(s.circle, dt);
        stormRingMesh.position.set(s.circle.centerX, 0.08, s.circle.centerZ);
        stormRingMesh.scale.setScalar(s.circle.currentRadius);
        if (isOutsideSafeCircle(p.x, p.z, s.circle)) {
          p.hp = Math.max(1, p.hp - s.circle.damagePerSecOutside * dt * 0.25);
        }

        // Advance Dynamic Weather Timer every second
        weatherSyncAccum += dt;
        if (weatherSyncAccum >= 1.0) {
          const stepSec = weatherSyncAccum;
          weatherSyncAccum = 0;
          setWeather((prev) => {
            const nextW = advanceWeatherSystem(prev, stepSec);
            if (nextW.current !== prev.current) {
              setStatusBanner(
                `Dynamic Weather Shift: ${WEATHER_CONFIGS[nextW.current].name} — ${
                  WEATHER_CONFIGS[nextW.current].tagline
                }`
              );
              sound.playWeatherShift();
            }
            return nextW;
          });
        }

        // Handle Operative [Q] Class Ability
        p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
        p.stealthOverdriveTimer = Math.max(0, p.stealthOverdriveTimer - dt);
        if (s.classAbilityRequested && p.abilityCooldown <= 0) {
          s.classAbilityRequested = false;
          const spec = CLASS_ABILITIES[s.activeOperative];
          const leadCallsign = OPERATIVE_CLASSES[s.activeOperative].callsign;
          p.abilityCooldown = spec.cooldownSec;
          if (s.activeOperative === 'vanguard') {
            for (let k = -2; k <= 2; k++) {
              const ang = p.yaw + k * 0.14;
              spawnBullet(
                p.x - Math.sin(ang) * 1.1,
                p.z - Math.cos(ang) * 1.1,
                -Math.sin(ang),
                -Math.cos(ang),
                false,
                Math.round(s.effectiveStats.weaponDamage * 1.35),
                leadCallsign
              );
            }
            sound.playShoot(0.8);
            setStatusBanner('KESTREL-1 Activated Frag Fan Barrage [Q]!');
          } else if (s.activeOperative === 'specter') {
            p.stealthOverdriveTimer = 5.0;
            sound.playDash();
            setStatusBanner('WRAITH-2 Activated Thermoptic Overdrive [Q] (5s Stealth & Speed)!');
          } else {
            p.hp = Math.min(p.maxHp, p.hp + 40);
            enemies.forEach((e) => {
              if (e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 11) {
                e.hp -= 35;
                e.hitFlashTimer = 0.2;
                if (e.hp <= 0 && e.koTimer <= 0) {
                  e.koTimer = 0.45;
                  s.kills++;
                  pushKillfeed(
                    formatEliminationKillfeed(
                      leadCallsign,
                      e.archetype,
                      s.killfeedCounter++,
                      s.matchTimeSec
                    )
                  );
                }
              }
            });
            sound.playHackComplete();
            setStatusBanner('AEGIS-3 Activated Bastion Nano-Pulse [Q] (+40 HP & Arc Shockwave)!');
          }
        } else {
          s.classAbilityRequested = false;
        }

        // Handle Analyst Sky Command Triggers
        if (s.reconPulseRequested) {
          s.reconPulseRequested = false;
          enemies.forEach((e) => {
            e.revealedTimer = 10.0 * s.effectiveStats.analystSimHorizonMultiplier;
          });
        }

        if (s.empTrapRequested) {
          s.empTrapRequested = false;
          const trapDmg = Math.round(55 * s.effectiveStats.empTrapMultiplier);
          const trapRadius = 16 * s.effectiveStats.empTrapMultiplier;
          enemies.forEach((e) => {
            if (e.hp <= 0) return;
            for (const tr of empTraps) {
              if (Math.hypot(e.x - tr.x, e.z - tr.z) <= trapRadius) {
                e.hp -= trapDmg;
                e.hitFlashTimer = 0.25;
                e.revealedTimer = 8.0;
                if (e.hp <= 0 && e.koTimer <= 0) {
                  e.koTimer = 0.45;
                  s.kills++;
                  pushKillfeed(
                    formatEliminationKillfeed(
                      'ANALYST EMP',
                      e.archetype,
                      s.killfeedCounter++,
                      s.matchTimeSec
                    )
                  );
                  awardXpAndCheckLevel(45, 'EMP Elimination');
                }
              }
            }
          });
        }

        if (s.supplyDropRequested) {
          s.supplyDropRequested = false;
          p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.55));
          p.ammo = p.maxAmmo;
          p.reloadTimer = 0;
        }

        // Hitstop & Camera Trauma decay
        if (p.hitstopTimer > 0) {
          p.hitstopTimer = Math.max(0, p.hitstopTimer - dt);
        }
        p.cameraTrauma = Math.max(0, p.cameraTrauma - dt * 1.8);
        const simDt = p.hitstopTimer > 0 ? dt * 0.15 : dt;

        // Operative Movement (WASD / Arrow Keys)
        let moveX = 0;
        let moveZ = 0;
        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveZ -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveZ += 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;

        const len = Math.hypot(moveX, moveZ);
        if (len > 0) {
          moveX /= len;
          moveZ /= len;
        }

        p.dashCooldown = Math.max(0, p.dashCooldown - simDt);
        p.dashActiveTimer = Math.max(0, p.dashActiveTimer - simDt);
        const speedMult = p.dashActiveTimer > 0 ? 2.35 : 1.0;
        const speed = s.effectiveStats.moveSpeed * speedMult;

        let nextX = p.x + moveX * speed * simDt;
        let nextZ = p.z + moveZ * speed * simDt;

        // Clamp within basin perimeter & collide with basalt cover walls
        const distFromCenter = Math.hypot(nextX, nextZ);
        if (distFromCenter > 49) {
          nextX = (nextX / distFromCenter) * 49;
          nextZ = (nextZ / distFromCenter) * 49;
        }
        for (const cov of coverObstacles) {
          if (
            Math.abs(nextX - cov.x) < cov.rx + 0.75 &&
            Math.abs(nextZ - cov.z) < cov.rz + 0.75
          ) {
            if (Math.abs(p.x - cov.x) >= cov.rx + 0.7) nextX = p.x;
            if (Math.abs(p.z - cov.z) >= cov.rz + 0.7) nextZ = p.z;
          }
        }

        const prevPx = p.x;
        const prevPz = p.z;
        p.x = nextX;
        p.z = nextZ;
        const playerActualSpeed = Math.hypot(p.x - prevPx, p.z - prevPz) / Math.max(0.001, simDt);
        playerMesh.position.set(p.x, 0, p.z);

        // Aim towards mouse world cursor (or movement direction)
        const aimDx = mouseWorldX - p.x;
        const aimDz = mouseWorldZ - p.z;
        if (Math.hypot(aimDx, aimDz) > 0.5) {
          p.yaw = Math.atan2(-aimDx, -aimDz);
        } else if (len > 0) {
          p.yaw = Math.atan2(-moveX, -moveZ);
        }
        playerMesh.rotation.y = p.yaw;

        // ====================================================================
        // AUTONOMOUS COMPANION SQUAD AI (Combat Targeting, Firing, Terminal Breaching & Support Pulses)
        // ====================================================================
        const enemyInputs = enemies.map((e) => ({
          id: e.id,
          x: e.x,
          z: e.z,
          hp: e.hp,
        }));
        const termInputs = terminals.map((t) => ({
          id: t.id,
          x: t.x,
          z: t.z,
          hacked: t.hacked,
        }));

        s.squadMates.forEach((sq, idx) => {
          const decision = computeCompanionDecision({
            companionId: sq.id,
            slotIndex: (idx as 0 | 1),
            x: sq.x,
            z: sq.z,
            leaderX: p.x,
            leaderZ: p.z,
            leaderYaw: p.yaw,
            orderMode: s.squadOrder,
            waypoint: s.waypoint,
            enemies: enemyInputs,
            terminals: termInputs,
          });

          sq.actionTag = decision.actionTag;
          const prevSqX = sq.x;
          const prevSqZ = sq.z;

          // Move companion smoothly toward target coordinates (faster when sprinting to terminals/enemies)
          const compMoveSpeed =
            s.squadOrder === 'BREACH_TERMINAL' || s.squadOrder === 'AGGRESSIVE_HUNT'
              ? 8.8
              : 7.4;
          const dxSq = decision.targetX - sq.x;
          const dzSq = decision.targetZ - sq.z;
          const distToTarget = Math.hypot(dxSq, dzSq);
          if (distToTarget > 0.25) {
            const step = Math.min(distToTarget, compMoveSpeed * simDt);
            let nextSqX = sq.x + (dxSq / distToTarget) * step;
            let nextSqZ = sq.z + (dzSq / distToTarget) * step;
            for (const cov of coverObstacles) {
              if (
                Math.abs(nextSqX - cov.x) < cov.rx + 0.65 &&
                Math.abs(nextSqZ - cov.z) < cov.rz + 0.65
              ) {
                if (Math.abs(sq.x - cov.x) >= cov.rx + 0.6) nextSqX = sq.x;
                if (Math.abs(sq.z - cov.z) >= cov.rz + 0.6) nextSqZ = sq.z;
              }
            }
            sq.x = nextSqX;
            sq.z = nextSqZ;
          }

          sq.speed = Math.hypot(sq.x - prevSqX, sq.z - prevSqZ) / Math.max(0.001, simDt);
          sq.yaw = decision.aimYaw;
          squadMeshes[idx].position.set(sq.x, 0, sq.z);
          squadMeshes[idx].rotation.y = sq.yaw;

          // Companion Autonomous Weapon Fire
          sq.shootCooldown = Math.max(0, sq.shootCooldown - simDt);
          sq.muzzleTimer = Math.max(0, sq.muzzleTimer - dt);
          if (decision.shouldFire && sq.shootCooldown <= 0) {
            sq.shootCooldown = sq.id === 'warden' ? 0.34 : sq.id === 'specter' ? 0.58 : 0.42;
            sq.muzzleTimer = 0.07;
            const fireDirX = -Math.sin(sq.yaw);
            const fireDirZ = -Math.cos(sq.yaw);
            const compDmg = sq.id === 'specter' ? 22 : sq.id === 'warden' ? 16 : 18;
            spawnBullet(
              sq.x + fireDirX * 1.1,
              sq.z + fireDirZ * 1.1,
              fireDirX,
              fireDirZ,
              false,
              compDmg,
              sq.callsign
            );
          }

          // Companion Autonomous Terminal Decryption
          if (decision.hackingTerminalId) {
            const compTerm = terminals.find(
              (t) => t.id === decision.hackingTerminalId && !t.hacked
            );
            if (compTerm) {
              compTerm.progress = Math.min(1, compTerm.progress + (simDt * 0.65) / 2.8);
              if (compTerm.progress >= 1 && !compTerm.hacked) {
                compTerm.hacked = true;
                const { holoMat, ringMat } = compTerm.mesh.userData;
                holoMat.color.setHex(0x10b981);
                holoMat.emissive.setHex(0x10b981);
                ringMat.color.setHex(0x10b981);

                const totalDataEarned = Math.round(35 * s.effectiveStats.dataYieldMultiplier);
                setDataCurrency((d) => d + totalDataEarned);
                setRunStats((rs) => ({
                  ...rs,
                  dataExtracted: rs.dataExtracted + totalDataEarned,
                  terminalsBreached: rs.terminalsBreached + 1,
                }));
                const hackedNow = terminals.filter((t) => t.hacked).length;
                setTerminalsHacked(hackedNow);
                pushKillfeed(
                  formatTerminalKillfeed(
                    sq.callsign,
                    compTerm.label,
                    totalDataEarned,
                    s.killfeedCounter++,
                    s.matchTimeSec
                  )
                );
                if (hackedNow === 1) {
                  pushKillfeed(
                    formatExtractionMilestoneKillfeed(50, s.killfeedCounter++, s.matchTimeSec)
                  );
                } else if (hackedNow >= 2) {
                  setExtractionReady(true);
                  pushKillfeed(
                    formatExtractionMilestoneKillfeed(100, s.killfeedCounter++, s.matchTimeSec)
                  );
                }
                sound.playHackComplete();
                awardXpAndCheckLevel(65, `${sq.callsign} Breached ${compTerm.label}`);
                setStatusBanner(
                  `${sq.callsign} Decrypted ${compTerm.label}! +${totalDataEarned} GB Uploaded`
                );
              }
            }
          }

          // Companion Autonomous Class Support Pulse (every ~9s)
          sq.supportCooldown = Math.max(0, sq.supportCooldown - simDt);
          if (sq.supportCooldown <= 0) {
            sq.supportCooldown = 9.0 + idx * 2.5;
            if (sq.id === 'specter') {
              // WRAITH-2: Thermoptic Recon Ping decloaks nearby enemies
              enemies.forEach((e) => {
                if (e.hp > 0 && Math.hypot(e.x - sq.x, e.z - sq.z) <= 24) {
                  e.revealedTimer = Math.max(e.revealedTimer, 6.0);
                }
              });
            } else if (sq.id === 'warden') {
              // AEGIS-3: Nano-Field restores +8 HP to Lead Operative if damaged
              if (p.hp > 0 && p.hp < p.maxHp) {
                p.hp = Math.min(p.maxHp, p.hp + 8);
              }
            }
          }

          // Animate Companion Character Limbs, Breathing & Weapon Recoil
          animateOperativeCharacter(
            squadMeshes[idx],
            sq.speed,
            sq.muzzleTimer,
            now * 0.001,
            (idx + 1) * 1.9
          );
        });

        // Record Operative historical movement for AI Faction route-cutting
        historySampleAccum += simDt;
        if (historySampleAccum >= 2.0) {
          historySampleAccum = 0;
          s.operativeHistory.push({ x: Math.round(p.x), z: Math.round(p.z) });
          if (s.operativeHistory.length > 10) s.operativeHistory.shift();
        }

        // Reload & Shooting
        if (p.reloadTimer > 0) {
          p.reloadTimer -= simDt;
          if (p.reloadTimer <= 0) {
            p.reloadTimer = 0;
            p.ammo = p.maxAmmo;
          }
        }

        p.shootCooldown = Math.max(0, p.shootCooldown - simDt);
        p.muzzleTimer = Math.max(0, p.muzzleTimer - dt);
        animateOperativeCharacter(
          playerMesh,
          playerActualSpeed,
          p.muzzleTimer,
          now * 0.001,
          0
        );
        muzzlePointLight.position.set(
          p.x - Math.sin(p.yaw) * 1.15,
          1.45,
          p.z - Math.cos(p.yaw) * 1.15
        );
        muzzlePointLight.intensity = p.muzzleTimer > 0 ? 6.5 : 0;

        const wantsFire =
          (mouseDown || keysPressed.has('Space') || keysPressed.has('KeyF')) &&
          s.roleMode === 'operative';
        if (wantsFire && p.shootCooldown <= 0 && p.reloadTimer <= 0) {
          if (p.ammo > 0) {
            p.ammo--;
            p.shootCooldown = 0.16;
            p.muzzleTimer = 0.06;
            const dirX = -Math.sin(p.yaw);
            const dirZ = -Math.cos(p.yaw);
            spawnBullet(
              p.x + dirX * 1.1,
              p.z + dirZ * 1.1,
              dirX,
              dirZ,
              false,
              s.effectiveStats.weaponDamage,
              OPERATIVE_CLASSES[s.activeOperative].callsign
            );
            sound.playShoot();
            if (p.ammo === 0) {
              p.reloadTimer = 1.25;
            }
          } else {
            p.reloadTimer = 1.25;
          }
        }

        // Terminal Hacking (Hold E or auto-hack when standing inside terminal ring)
        let activeNearTerm: TerminalRuntime | null = null;
        for (const term of terminals) {
          if (term.hacked) continue;
          const dist = Math.hypot(p.x - term.x, p.z - term.z);
          if (dist <= 4.2) {
            activeNearTerm = term;
            if (keysPressed.has('KeyE') || dist <= 3.5) {
              const prevProg = term.progress;
              term.progress = Math.min(
                1,
                term.progress + simDt / s.effectiveStats.hackDurationSec
              );
              if (Math.floor(term.progress * 5) > Math.floor(prevProg * 5)) {
                sound.playHackTick(term.progress);
              }
              if (term.progress >= 1 && !term.hacked) {
                term.hacked = true;
                const { holoMat, ringMat } = term.mesh.userData;
                holoMat.color.setHex(0x10b981);
                holoMat.emissive.setHex(0x10b981);
                ringMat.color.setHex(0x10b981);

                const baseYield = 35;
                const bonusYield = s.activeModifiers.reduce(
                  (acc, m) => acc + (m.effects.hackYieldBonus || 0),
                  0
                );
                const totalDataEarned = Math.round(
                  (baseYield + bonusYield) * s.effectiveStats.dataYieldMultiplier
                );
                setDataCurrency((d) => d + totalDataEarned);
                setRunStats((rs) => ({
                  ...rs,
                  dataExtracted: rs.dataExtracted + totalDataEarned,
                  terminalsBreached: rs.terminalsBreached + 1,
                }));
                const hackedNow = terminals.filter((t) => t.hacked).length;
                setTerminalsHacked(hackedNow);
                pushKillfeed(
                  formatTerminalKillfeed(
                    OPERATIVE_CLASSES[s.activeOperative].callsign,
                    term.label,
                    totalDataEarned,
                    s.killfeedCounter++,
                    s.matchTimeSec
                  )
                );
                if (hackedNow === 1) {
                  pushKillfeed(
                    formatExtractionMilestoneKillfeed(50, s.killfeedCounter++, s.matchTimeSec)
                  );
                } else if (hackedNow >= 2) {
                  setExtractionReady(true);
                  pushKillfeed(
                    formatExtractionMilestoneKillfeed(100, s.killfeedCounter++, s.matchTimeSec)
                  );
                }
                pushInkSplat(term.x, term.z, 0.9, 'breach');
                sound.playHackComplete();
                awardXpAndCheckLevel(65, `Breached ${term.label}`);
                setStatusBanner(
                  `${term.label} Decrypted! +${totalDataEarned} GB Raw Data Uploaded to Analyst`
                );
              }
            }
            break;
          }
        }

        // Update Enemy Multi-Agent AI Faction (4 distinct movement & attack policies)
        const modEnemySpeed = s.activeModifiers.reduce(
          (acc, m) => acc * (m.effects.enemySpeedMultiplier || 1),
          1
        );
        const aiDetectMult = s.effectiveWeather.effectiveAiDetectionMultiplier;
        let activeCrowdAttackers = 0;

        for (const e of enemies) {
          if (e.hp <= 0) {
            if (e.koTimer > 0) {
              e.koTimer -= simDt;
              e.mesh.rotation.x = (0.45 - e.koTimer) * 3.2;
              if (e.koTimer <= 0) {
                e.mesh.visible = false;
              }
            }
            continue;
          }

          e.revealedTimer = Math.max(0, e.revealedTimer - simDt);
          e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);

          const distToPlayer = Math.hypot(p.x - e.x, p.z - e.z);
          const { bodyMat, metalMat, coreMat, telegraphMat } = e.mesh.userData;

          // Thermoptic Cloak Shimmer Logic
          const isCloakedNow =
            s.effectiveStats.areEnemiesCloaked &&
            e.revealedTimer <= 0 &&
            distToPlayer > s.effectiveStats.cloakRevealDistance;
          e.cloaked = isCloakedNow;
          const targetOpacity = isCloakedNow ? 0.16 : 1.0;
          bodyMat.opacity = targetOpacity;
          metalMat.opacity = targetOpacity;
          coreMat.opacity = isCloakedNow ? 0.28 : 1.0;
          if (e.hitFlashTimer > 0) {
            coreMat.emissive.setHex(0xffffff);
          } else {
            coreMat.emissive.setHex(
              e.archetype === 'chaser'
                ? 0xef4444
                : e.archetype === 'kiter'
                ? 0xa855f7
                : e.archetype === 'interceptor'
                ? 0xf97316
                : 0xe11d48
            );
          }

          // Distinct Archetype Movement Policy
          let targetX = p.x;
          let targetZ = p.z;
          if (e.archetype === 'interceptor') {
            // Cuts off Operative route toward the northern Extraction Spire (0, -34)
            targetX = p.x * 0.55;
            targetZ = (p.z + -34) * 0.5;
          } else if (e.archetype === 'kiter') {
            // Maintains 18m standoff distance
            if (distToPlayer < 15) {
              targetX = e.x + (e.x - p.x);
              targetZ = e.z + (e.z - p.z);
            } else if (distToPlayer < 22) {
              targetX = e.x + (p.z - e.z) * 0.4;
              targetZ = e.z - (p.x - e.x) * 0.4;
            }
          } else if (e.archetype === 'suppressor') {
            // Anchors between Operative and nearest unhacked terminal
            const unhacked = terminals.find((t) => !t.hacked);
            if (unhacked && distToPlayer > 18) {
              targetX = (p.x + unhacked.x) * 0.5;
              targetZ = (p.z + unhacked.z) * 0.5;
            }
          }

          const detectRange = 36 * aiDetectMult;
          if (distToPlayer <= detectRange || e.revealedTimer > 0) {
            const dx = targetX - e.x;
            const dz = targetZ - e.z;
            const dLen = Math.hypot(dx, dz) || 1;
            const spd = e.speed * modEnemySpeed;
            e.vx = (dx / dLen) * spd;
            e.vz = (dz / dLen) * spd;
          } else {
            // Patrol orbit
            const patrolAngle = now * 0.0006 + Number(e.id.slice(1));
            e.vx = Math.cos(patrolAngle) * 2.5;
            e.vz = Math.sin(patrolAngle) * 2.5;
          }

          e.x = THREE.MathUtils.clamp(e.x + e.vx * simDt, -48, 48);
          e.z = THREE.MathUtils.clamp(e.z + e.vz * simDt, -48, 48);
          e.mesh.position.set(e.x, 0, e.z);
          e.mesh.rotation.y = Math.atan2(p.x - e.x, p.z - e.z);
          animateEnemyCharacter(
            e.mesh,
            Math.hypot(e.vx, e.vz),
            now * 0.001,
            Number(e.id.slice(1)) * 1.3
          );

          // Acoustic Footstep Ink Splatters (modulated by Weather audio propagation)
          const audioRange = 26 * s.effectiveWeather.config.audioPropagationMultiplier;
          if (distToPlayer < audioRange && Math.random() < simDt * 1.1) {
            pushInkSplat(
              e.x,
              e.z,
              Math.max(0.25, 1 - distToPlayer / audioRange) *
                s.effectiveWeather.config.audioPropagationMultiplier,
              'footstep'
            );
          }

          // Attack Windup Telegraph & Crowd Token Pool (max 3 concurrent attackers)
          if (distToPlayer < 26 && activeCrowdAttackers < 3) {
            activeCrowdAttackers++;
            e.attackCooldown -= simDt;
            if (e.attackCooldown <= 0 && e.windupTimer <= 0) {
              e.windupTimer = 0.55; // Visible 0.55s telegraph before firing
            }
          }

          if (e.windupTimer > 0) {
            e.windupTimer -= simDt;
            telegraphMat.opacity = 0.75;
            if (e.windupTimer <= 0) {
              telegraphMat.opacity = 0.0;
              e.attackCooldown = e.archetype === 'suppressor' ? 1.8 : 2.5;
              const aimX = p.x - e.x;
              const aimZ = p.z - e.z;
              const aimLen = Math.hypot(aimX, aimZ) || 1;
              spawnBullet(
                e.x,
                e.z,
                aimX / aimLen,
                aimZ / aimLen,
                true,
                e.archetype === 'kiter' ? 16 : 11
              );
              pushInkSplat(e.x, e.z, 0.95, 'gunfire');
            }
          } else {
            telegraphMat.opacity = 0.0;
          }
        }

        // Update Pooled Bullets
        for (let i = 0; i < maxBullets; i++) {
          const b = bullets[i];
          if (!b.active) {
            bulletDummy.position.set(0, -100, 0);
            bulletDummy.scale.setScalar(0.001);
            bulletDummy.updateMatrix();
            bulletInstanced.setMatrixAt(i, bulletDummy.matrix);
            continue;
          }

          b.life -= simDt;
          b.x += b.vx * simDt;
          b.z += b.vz * simDt;
          if (b.life <= 0) {
            b.active = false;
            continue;
          }

          if (b.fromEnemy) {
            if (Math.hypot(b.x - p.x, b.z - p.z) < 0.95 && p.dashActiveTimer <= 0) {
              b.active = false;
              p.hp = Math.max(0, p.hp - b.damage);
              p.cameraTrauma = Math.min(1, p.cameraTrauma + 0.45);
              pushInkSplat(b.x - b.vx * 0.2, b.z - b.vz * 0.2, 1.0, 'gunfire');
              sound.playHit(true);
              if (p.hp <= 0) {
                setHp(0);
                setMatchResult('defeat');
                setRunStats((rs) => ({
                  ...rs,
                  clearTimeSec: Math.round(s.matchTimeSec),
                  kills: s.kills,
                }));
                setGamePhase('gameover');
              }
            }
          } else {
            for (const e of enemies) {
              if (e.hp <= 0) continue;
              if (Math.hypot(b.x - e.x, b.z - e.z) < 1.15) {
                b.active = false;
                e.hp -= b.damage;
                e.hitFlashTimer = 0.08;
                e.revealedTimer = 6.0;
                p.hitstopTimer = 0.04;
                sound.playHit(e.hp <= 0);
                if (e.hp <= 0 && e.koTimer <= 0) {
                  e.koTimer = 0.45;
                  s.kills++;
                  pushKillfeed(
                    formatEliminationKillfeed(
                      b.shooterCallsign || OPERATIVE_CLASSES[s.activeOperative].callsign,
                      e.archetype,
                      s.killfeedCounter++,
                      s.matchTimeSec
                    )
                  );
                  setDataCurrency((d) => d + 15);
                  awardXpAndCheckLevel(40, `Eliminated ${e.archetype.toUpperCase()}`);
                }
                break;
              }
            }
          }

          bulletDummy.position.set(b.x, b.y, b.z);
          bulletDummy.scale.setScalar(b.fromEnemy ? 1.15 : 0.95);
          bulletDummy.updateMatrix();
          bulletInstanced.setMatrixAt(i, bulletDummy.matrix);
        }
        bulletInstanced.instanceMatrix.needsUpdate = true;

        // Check Extraction Helipad Completion (at 0, -34)
        const hackedCount = terminals.filter((t) => t.hacked).length;
        const distToExtract = Math.hypot(p.x - 0, p.z - -34);
        if ((hackedCount >= 2 || s.dataCurrency >= 90) && distToExtract < 6.2) {
          s.extractionProgress = Math.min(1, s.extractionProgress + simDt / 3.0);
          const pctNow = Math.floor(s.extractionProgress * 100);
          for (const mile of [25, 50, 75, 100]) {
            if (pctNow >= mile && s.lastExtractionMilestone < mile) {
              s.lastExtractionMilestone = mile;
              pushKillfeed(
                formatExtractionMilestoneKillfeed(
                  mile,
                  s.killfeedCounter++,
                  s.matchTimeSec
                )
              );
            }
          }
          if (s.extractionProgress >= 1) {
            sound.playHackComplete();
            setMatchResult('victory');
            setRunStats((rs) => ({
              ...rs,
              clearTimeSec: Math.round(s.matchTimeSec),
              kills: s.kills,
            }));
            awardXpAndCheckLevel(120, 'Successful Abyssal Extraction');
            setGamePhase('gameover');
          }
        } else {
          s.extractionProgress = Math.max(0, s.extractionProgress - simDt * 0.5);
        }

        // Age ink splatters
        s.splats.forEach((sp) => {
          sp.ageSec += dt;
        });
        s.splats = s.splats.filter((sp) => sp.ageSec < sp.maxAgeSec);

        // Smooth Exponential Camera Damping for Operative vs Analyst Role
        const shakeX =
          (Math.random() - 0.5) * p.cameraTrauma * p.cameraTrauma * 1.2;
        const shakeY =
          (Math.random() - 0.5) * p.cameraTrauma * p.cameraTrauma * 1.2;

        if (s.roleMode === 'analyst') {
          camTargetPos.set(p.x * 0.35, 68, p.z * 0.35 + 18);
          camLookTarget.set(p.x * 0.25, 0, p.z * 0.25 - 4);
        } else {
          camTargetPos.set(p.x + shakeX, 13.5 + shakeY, p.z + 15.5);
          camLookTarget.set(p.x, 1.4, p.z - 2.5);
        }

        const dampFactor = 1 - Math.exp(-7.5 * dt);
        camera.position.lerp(camTargetPos, dampFactor);
        currentLook.lerp(camLookTarget, dampFactor);
        camera.lookAt(currentLook);

        // Throttle React HUD updates to ~8Hz
        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.12) {
          hudSyncAccum = 0;
          setHp(Math.round(p.hp));
          setAmmo(p.ammo);
          setReloadingTimer(Number(p.reloadTimer.toFixed(1)));
          setDashCooldown(Number(p.dashCooldown.toFixed(1)));
          setAbilityCooldown(Number(p.abilityCooldown.toFixed(1)));
          setCircleState({ ...s.circle });
          setNearTerminalLabel(activeNearTerm ? activeNearTerm.label : null);
          setNearTerminalProgress(
            activeNearTerm ? Math.round(activeNearTerm.progress * 100) : 0
          );
          setExtractionProgress(Math.round(s.extractionProgress * 100));
          setInkSplats([...s.splats]);
          setKillfeedEntries(pruneAndFadeKillfeed(s.killfeed, s.matchTimeSec, 4));
          setCompanionTelemetry(
            s.squadMates.map((sq) => ({
              callsign: sq.callsign,
              actionTag: sq.actionTag,
              color: sq.color,
            }))
          );

          if (s.roleMode === 'analyst') {
            const simHorizon = 4.0 * s.effectiveStats.analystSimHorizonMultiplier;
            const aliveEnemies = enemies.filter((e) => e.hp > 0);
            const heatmap = computeProbabilityHeatmap(
              aliveEnemies.map((e) => ({ x: e.x, z: e.z, vx: e.vx, vz: e.vz })),
              terminals.map((t) => ({ x: t.x, z: t.z, hacked: t.hacked })),
              s.operativeHistory,
              simHorizon,
              7
            );
            setAnalystSnapshot({
              operativePos: { x: p.x, z: p.z },
              squadPositions: s.squadMates.map((sq) => ({
                callsign: sq.callsign,
                x: sq.x,
                z: sq.z,
                color: sq.color,
              })),
              enemies: aliveEnemies.map((e) => ({
                id: e.id,
                archetype: e.archetype,
                x: e.x,
                z: e.z,
                hp: e.hp,
                maxHp: e.maxHp,
                cloaked: e.cloaked,
                revealedTimer: e.revealedTimer,
              })),
              terminals: terminals.map((t) => ({
                id: t.id,
                label: t.label,
                x: t.x,
                z: t.z,
                hacked: t.hacked,
                progress: t.progress,
              })),
              empTraps: empTraps.map((tr) => ({
                id: tr.id,
                x: tr.x,
                z: tr.z,
                ready: tr.ready,
                cooldown: tr.cooldown,
              })),
              heatmap,
            });
          }
        }
      }

      if (s.hdrpMode) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  const currentProfile = OPERATIVE_CLASSES[activeOperative];
  const weatherConfig = WEATHER_CONFIGS[weather.current];

  return (
    <main className="relative w-full h-full overflow-hidden select-none">
      {/* Dedicated Isolated WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        data-testid="webgl-viewport"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* Gritty Ink-and-Splash Threat Indicator Ring */}
      {gamePhase === 'playing' && (
        <InkThreatOverlay
          splats={inkSplats}
          lowHpRatio={hp / Math.max(1, maxHp)}
          weatherId={weather.current}
        />
      )}

      {/* TITLE SCREEN STAGE */}
      {gamePhase === 'title' && (
        <section
          aria-label="Abyssal Drop Title Screen"
          className="fixed inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-r from-slate-950/92 via-slate-950/75 to-transparent overflow-y-auto"
        >
          <div className="max-w-2xl flex flex-col gap-5 my-auto">
            {/* Custom Inline SVG Title Lockup with Ink-and-Splash Motif */}
            <div className="flex items-center gap-4">
              <svg
                viewBox="0 0 84 84"
                className="w-16 h-16 shrink-0"
                aria-hidden="true"
              >
                <polygon
                  points="42,4 78,24 78,60 42,80 6,60 6,24"
                  fill="#0b111e"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
                <path
                  d="M 42 14 L 62 56 L 49 56 L 42 38 L 35 56 L 22 56 Z"
                  fill="#f8fafc"
                />
                <circle cx="42" cy="64" r="5" fill="#f59e0b" />
              </svg>
              <div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
                  ABYSSAL DROP
                </h1>
                <p className="text-sm text-cyan-300 font-medium mt-0.5">
                  Asymmetrical 3D Tactical Extraction & Sky Analyst Command
                </p>
              </div>
            </div>

            {/* Randomized Mission Modifiers Briefing Box */}
            <div className="ink-panel-accent rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div>
                  <span className="text-xs font-mono-tabular uppercase tracking-wider text-amber-400 font-semibold">
                    Active Match Modifiers (Analyst & Ground Brief)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRerollModifiers}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Reroll Modifiers
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeModifiers.map((mod) => (
                  <div
                    key={mod.id}
                    className="rounded-lg bg-slate-950/90 border border-slate-800 p-3"
                  >
                    <div className="font-display font-bold text-sm text-white">
                      {mod.name}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{mod.shortDesc}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-0.5">
                      <div>
                        <strong className="text-amber-300">Operatives:</strong>{' '}
                        {mod.operativeImpact}
                      </div>
                      <div>
                        <strong className="text-cyan-300">Analyst:</strong>{' '}
                        {mod.analystImpact}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyst Dynamic Drop Trajectory Plotter */}
            <div className="ink-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">
                  Plot Drop Zone Trajectory & Select Lead Operative
                </span>
                <span className="text-xs font-mono-tabular text-cyan-400">
                  Forecast: {weatherConfig.name}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {DROP_ZONES.map((dz) => {
                  const isSelected = selectedDropZone.id === dz.id;
                  return (
                    <button
                      key={dz.id}
                      type="button"
                      onClick={() => setSelectedDropZone(dz)}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-400'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-white">
                          {dz.name}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-cyan-400 whitespace-nowrap shrink-0">
                          {dz.sectorCode}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono-tabular text-slate-300">
                        <span>Loot {dz.lootRating}%</span>
                        <span aria-hidden="true">·</span>
                        <span>Threat {dz.threatProbability}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Primary CTA & Skill Tree Button (<= 3 actions) */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => handleStartMatch(selectedDropZone)}
                  className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-base tracking-wide transition-colors cursor-pointer whitespace-nowrap"
                >
                  Deploy Squad to {selectedDropZone.name}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSkillTreeOpen(true)}
                  className="px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Operative Skill Trees ({skillPoints} SP)
                </button>
                <button
                  type="button"
                  onClick={() => setIsStudioModalOpen(true)}
                  className="px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Studio GDD & QA [G]
                </button>
              </div>
            </div>
          </div>

          {/* Flat Borderless Control Hint Line */}
          <div className="text-xs text-slate-400 font-mono-tabular pt-3">
            WASD Move · Mouse Aim & Fire · Q Class Ability · Shift Dash · E Hack Terminal · Tab Switch Role · K Skill Tree · G Studio GDD
          </div>
        </section>
      )}

      {/* ACTIVE GAMEPLAY HUD (Operative & Shared Perimeter) */}
      {gamePhase === 'playing' && (
        <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
          {/* Top Row: Left Squad/Modifier/Weather Cluster + Right Utility Controls */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left Cluster: Vitality Pips, Data Currency, Weather & Active Modifiers (Operative View) */}
            {roleMode === 'operative' ? (
              <div className="ink-panel rounded-xl p-3.5 pointer-events-auto max-w-md space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono-tabular uppercase text-slate-400">
                    {currentProfile.callsign} · {currentProfile.title}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-white font-mono-tabular hud-stroke">
                      {hp}
                    </span>
                    <span className="text-xs font-mono-tabular text-slate-400">
                      / {maxHp} HP
                    </span>
                  </div>
                </div>

                {/* Data as Currency Counter */}
                <div className="text-right">
                  <div className="text-[10px] font-mono-tabular uppercase text-cyan-400">
                    Raw Data Currency
                  </div>
                  <div className="font-display text-xl font-bold text-cyan-300 font-mono-tabular">
                    {dataCurrency} GB
                  </div>
                </div>
              </div>

              {/* Discrete Vitality Pips */}
              <div className="flex items-center gap-1" aria-label="Operative Health Bar">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const threshold = ((idx + 1) / 10) * maxHp;
                  const full = hp >= threshold;
                  const partial = !full && hp > (idx / 10) * maxHp;
                  return (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-sm transition-colors ${
                        full
                          ? 'bg-emerald-400'
                          : partial
                          ? 'bg-amber-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Dynamic Weather & Modifier Telemetry */}
              <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1 font-mono-tabular">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-cyan-300 font-semibold">
                    Weather: {weatherConfig.name} ({Math.ceil(weather.timeRemainingSec)}s)
                  </span>
                  <button
                    type="button"
                    onClick={handleCycleWeatherNow}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Cycle Weather
                  </button>
                </div>
                <div className="text-slate-400">
                  Sight: {effectiveWeather.effectiveSightRangeMeters}m · Footstep Mask:{' '}
                  {effectiveWeather.footstepMaskingPct}% · Terminals: {terminalsHacked}/
                  {totalTerminals}
                </div>
                <div className="text-amber-300/90 truncate">
                  Modifiers: {activeModifiers.map((m) => m.name).join(' · ')}
                </div>
              </div>
              </div>
            ) : (
              <div />
            )}

            {/* Top-Right Cluster: Utility Buttons + Dynamic Gritty Monochrome Killfeed */}
            <div className="flex flex-col items-end gap-2.5">
              <div className="flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode((prev) => (prev === 'operative' ? 'analyst' : 'operative'));
                    sound.playAnalystPulse();
                  }}
                  className="px-3.5 py-2 rounded-lg ink-panel-accent text-xs font-semibold text-cyan-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  [Tab] {roleMode === 'operative' ? 'Switch to Sky Analyst' : 'Switch to 3D Operative'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSkillTreeOpen(true)}
                  className="px-3.5 py-2 rounded-lg ink-panel text-xs font-semibold text-amber-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  [K] Skill Tree ({skillPoints} SP)
                </button>

                <button
                  type="button"
                  onClick={() => setHdrpMode((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    hdrpMode
                      ? 'ink-panel-accent text-emerald-300'
                      : 'ink-panel text-slate-400 hover:text-white'
                  }`}
                >
                  HDRP {hdrpMode ? 'ULTRA [H]' : 'RAW [H]'}
                </button>

                <button
                  type="button"
                  aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    sound.muted = !muted;
                    setMuted(!muted);
                  }}
                  className="px-3 py-2 rounded-lg ink-panel text-xs font-mono-tabular text-slate-200 hover:text-white cursor-pointer"
                >
                  {muted ? 'Unmute [M]' : 'Mute [M]'}
                </button>

                <button
                  type="button"
                  aria-label="Pause Game"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setGamePhase('paused');
                  }}
                  className="px-3 py-2 rounded-lg ink-panel text-xs font-mono-tabular text-slate-200 hover:text-white cursor-pointer"
                >
                  Pause [P]
                </button>
              </div>

              {roleMode === 'operative' && (
                <KillfeedOverlay entries={killfeedEntries} />
              )}
            </div>
          </div>

          {/* Center Contextual Interaction Prompts (Terminal Hack / Extraction Progress) */}
          <div className="mx-auto flex flex-col items-center gap-2">
            {nearTerminalLabel && (
              <div className="ink-panel-accent rounded-lg px-4 py-2 text-center">
                <div className="text-xs font-semibold text-cyan-300">
                  Decrypting {nearTerminalLabel} ({nearTerminalProgress}%)
                </div>
                <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-cyan-400 transition-all"
                    style={{ width: `${nearTerminalProgress}%` }}
                  />
                </div>
              </div>
            )}

            {extractionReady && (
              <div className="ink-panel rounded-lg px-4 py-1.5 border border-emerald-500/50 text-xs font-semibold text-emerald-300">
                Extraction Beacon Active North (0, -34){' '}
                {extractionProgress > 0 ? `· Extracting ${extractionProgress}%` : ''}
              </div>
            )}
          </div>

          {/* Bottom Row (Operative Mode): Squad Switcher & Weapon/Ability Telemetry */}
          {roleMode === 'operative' && (
            <div className="flex items-end justify-between gap-3">
              {/* Squad Operative Switcher & Tactical Companion Orders ([C]) */}
              <div className="ink-panel rounded-xl p-2.5 pointer-events-auto flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-[10px] font-mono-tabular uppercase text-slate-400">
                    Orders [C]:
                  </span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        'FOLLOW_SUPPORT',
                        'BREACH_TERMINAL',
                        'AGGRESSIVE_HUNT',
                        'HOLD_POSITION',
                      ] as SquadOrderMode[]
                    ).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleCycleSquadOrder(mode)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          squadOrder === mode
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {SQUAD_ORDERS[mode].shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['vanguard', 'specter', 'warden'] as OperativeClassId[]).map((cid) => {
                      const op = OPERATIVE_CLASSES[cid];
                      const isCurr = activeOperative === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => handleSwitchOperativeClass(cid)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            isCurr
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-900 text-slate-300 hover:text-white'
                          }`}
                        >
                          {op.callsign}
                        </button>
                      );
                    })}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-tabular pl-2 border-l border-slate-800">
                    {companionTelemetry.map((ct) => (
                      <span key={ct.callsign} className="text-slate-300 whitespace-nowrap">
                        <strong style={{ color: ct.color }}>{ct.callsign}:</strong>{' '}
                        {ct.actionTag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="hidden xl:block max-w-xs truncate text-xs font-mono-tabular text-slate-300 bg-slate-950/85 border border-slate-800 px-3 py-2 rounded-lg">
                {statusBanner}
              </div>

              {/* Weapon & Dash Telemetry Cluster */}
              <div className="ink-panel rounded-xl p-3.5 pointer-events-auto flex items-center gap-5 shrink-0">
                <div>
                  <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
                    Pulse Carbine · DMG {effectiveStats.weaponDamage}
                  </div>
                  <div className="flex items-baseline gap-1.5 font-mono-tabular">
                    <span className="font-display text-2xl font-bold text-white">
                      {reloadingTimer > 0 ? 'RELOAD' : ammo}
                    </span>
                    <span className="text-xs text-slate-400">/ {maxAmmo}</span>
                  </div>
                </div>

                <div className="border-l border-slate-800 pl-4">
                  <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
                    [Q] {CLASS_ABILITIES[activeOperative].name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      simRef.current.classAbilityRequested = true;
                    }}
                    className="font-display text-sm font-bold text-cyan-300 font-mono-tabular cursor-pointer"
                  >
                    {abilityCooldown > 0 ? `${abilityCooldown.toFixed(1)}s` : 'READY [Q]'}
                  </button>
                </div>

                <div className="border-l border-slate-800 pl-4">
                  <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
                    Kinetic Dash [Shift]
                  </div>
                  <div className="font-display text-sm font-bold text-amber-300 font-mono-tabular">
                    {dashCooldown > 0 ? `${dashCooldown.toFixed(1)}s` : 'READY'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANALYST SKY COMMAND HOLOGRAPHIC OVERLAY */}
      {gamePhase === 'playing' && roleMode === 'analyst' && (
        <AnalystOverlay
          dataCurrency={dataCurrency}
          weather={weather}
          effectiveStats={effectiveStats}
          activeModifiers={activeModifiers}
          heatmapPoints={analystSnapshot.heatmap}
          circleState={circleState}
          operativePos={analystSnapshot.operativePos}
          squadPositions={analystSnapshot.squadPositions}
          enemies={analystSnapshot.enemies}
          terminals={analystSnapshot.terminals}
          empTraps={analystSnapshot.empTraps}
          waypoint={waypoint}
          onSetWaypoint={(pt) => {
            setWaypoint(pt);
            setStatusBanner(`Analyst Routed Squad Waypoint to (${pt.x}m, ${pt.z}m)`);
          }}
          onToggleWeatherFilter={handleToggleWeatherFilter}
          onTriggerReconPulse={handleTriggerReconPulse}
          onTriggerEmpTrap={handleTriggerEmpTrap}
          onTriggerSupplyDrop={handleTriggerSupplyDrop}
          onSwitchToOperative={() => setRoleMode('operative')}
        />
      )}

      {/* STUDIO GDD & QA PIPELINE CODEX MODAL */}
      <StudioPipelineModal
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        onRunQaPreset={(preset) => {
          setIsStudioModalOpen(false);
          if (preset === 'cloak_storm') {
            setActiveModifiers([
              ALL_MISSION_MODIFIERS.find((m) => m.id === 'cloaked_ai')!,
              ALL_MISSION_MODIFIERS.find((m) => m.id === 'overclocked_hunters')!,
            ]);
            setWeather({
              current: 'TORRENTIAL_RAIN',
              next: 'DENSE_FOG',
              timeRemainingSec: 32,
              cycleDurationSec: 32,
              analystFilterActive: true,
            });
            handleSwitchOperativeClass('specter');
          } else if (preset === 'scarcity_fog') {
            setActiveModifiers([
              ALL_MISSION_MODIFIERS.find((m) => m.id === 'limited_ammo')!,
              ALL_MISSION_MODIFIERS.find((m) => m.id === 'halved_sim_time')!,
            ]);
            setWeather({
              current: 'DENSE_FOG',
              next: 'EM_SQUALL',
              timeRemainingSec: 32,
              cycleDurationSec: 32,
              analystFilterActive: true,
            });
            handleSwitchOperativeClass('vanguard');
          } else {
            setActiveModifiers([
              ALL_MISSION_MODIFIERS.find((m) => m.id === 'loot_rarity_50')!,
              ALL_MISSION_MODIFIERS.find((m) => m.id === 'cloaked_ai')!,
            ]);
            setWeather({
              current: 'EM_SQUALL',
              next: 'CLEAR',
              timeRemainingSec: 32,
              cycleDurationSec: 32,
              analystFilterActive: true,
            });
            setDataCurrency(120);
            handleSwitchOperativeClass('warden');
          }
          handleStartMatch(selectedDropZone);
        }}
      />

      {/* OPERATIVE SKILL TREE MODAL */}
      <SkillTreeModal
        isOpen={isSkillTreeOpen}
        selectedOperative={activeOperative}
        unlockedByClass={unlockedSkills}
        availableSkillPoints={skillPoints}
        operativeLevel={operativeLevel}
        operativeXp={operativeXp}
        activeModifiers={activeModifiers}
        weather={weather}
        onSelectOperative={handleSwitchOperativeClass}
        onAllocateSkill={handleAllocateSkill}
        onGrantBonusSkillPoint={() => {
          setSkillPoints((sp) => sp + 1);
          sound.playSkillUnlock();
        }}
        onResetSkills={() => {
          setUnlockedSkills({ vanguard: [], specter: [], warden: [] });
          setSkillPoints(6);
        }}
        onClose={() => setIsSkillTreeOpen(false)}
      />

      {/* PAUSE MODAL */}
      {gamePhase === 'paused' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
        >
          <div className="ink-panel-accent rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-white">
              Tactical Link Paused
            </h2>
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono-tabular text-center">
              <div>
                <div className="text-[10px] text-slate-400">Terminals</div>
                <div className="text-sm font-bold text-cyan-400">
                  {terminalsHacked}/{totalTerminals}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Raw Data</div>
                <div className="text-sm font-bold text-white">{dataCurrency} GB</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Skill Points</div>
                <div className="text-sm font-bold text-amber-300">{skillPoints} SP</div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setGamePhase('playing')}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                Resume Operation
              </button>
              <button
                type="button"
                onClick={() => setIsSkillTreeOpen(true)}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm cursor-pointer"
              >
                Open Operative Skill Trees ({skillPoints} SP)
              </button>
              <button
                type="button"
                onClick={() => handleStartMatch(selectedDropZone)}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 cursor-pointer"
              >
                Restart Drop
              </button>
              <button
                type="button"
                onClick={() => setGamePhase('title')}
                className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-400 font-semibold text-sm cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT OUTCOME MODAL */}
      {gamePhase === 'gameover' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
        >
          <div className="ink-panel-accent rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-400">
              {matchResult === 'victory' ? 'Extraction Complete' : 'Squad Signal Lost'}
            </div>
            <h2 id="gameover-modal-title" className="font-display text-2xl font-bold text-white">
              {matchResult === 'victory'
                ? 'Abyssal Data Extraction Successful'
                : 'Operative Squad Neutralized'}
            </h2>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono-tabular text-center">
              <div>
                <div className="text-[10px] text-slate-400">Clear Time</div>
                <div className="text-sm font-bold text-white">{runStats.clearTimeSec}s</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Data Uploaded</div>
                <div className="text-sm font-bold text-cyan-400">{runStats.dataExtracted} GB</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">AI Eliminated</div>
                <div className="text-sm font-bold text-amber-300">{runStats.kills}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={() => handleStartMatch(selectedDropZone)}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                {matchResult === 'victory' ? 'Deploy Next Drop' : 'Try Again'}
              </button>
              <button
                type="button"
                onClick={() => setIsSkillTreeOpen(true)}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm cursor-pointer"
              >
                Upgrade Operative Skill Trees ({skillPoints} SP)
              </button>
              <button
                type="button"
                onClick={() => setGamePhase('title')}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm cursor-pointer"
              >
                Return to Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
