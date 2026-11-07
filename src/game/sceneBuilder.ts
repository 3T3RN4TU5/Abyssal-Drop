import * as THREE from 'three';
import { EnemyArchetype, OperativeClassId } from './rules';

/**
 * Procedural textures & multi-part composite 3D models (3-12 parts per subject)
 * built with calibrated PBR roughness/metalness contrast and bottom-center grounding.
 */

export function createBasinGridTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark obsidian wet basalt base
  ctx.fillStyle = '#0c1118';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle rock micro-grain & ink splatter texture
  for (let i = 0; i < 360; i++) {
    const x = (i * 73) % 512;
    const y = (i * 139) % 512;
    const r = 2 + (i % 7);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(20, 29, 42, 0.45)' : 'rgba(5, 8, 12, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tactical sector grid lines
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.65)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Fine sub-grid crosshairs
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, 504, 504);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 500; i++) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    const v = 100 + (i % 60);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 6, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  return tex;
}

const sharedShadowGeo = new THREE.CircleGeometry(1.15, 20);
sharedShadowGeo.rotateX(-Math.PI / 2);
const sharedShadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});

/**
 * 9-part composite Operative 3D character mesh with grounded bottom-center pivot (y = 0)
 */
export function createOperativeMesh(classId: OperativeClassId, isSquadMate = false): THREE.Group {
  const group = new THREE.Group();

  const accentHex =
    classId === 'vanguard'
      ? 0xf59e0b
      : classId === 'specter'
      ? 0x06b6d4
      : 0x10b981;

  // 1. Contact shadow disc
  const shadow = new THREE.Mesh(sharedShadowGeo, sharedShadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  // Materials with varied roughness (>= 0.25 difference between parts)
  const hullMat = new THREE.MeshStandardMaterial({
    color: isSquadMate ? 0x1e293b : 0x0f172a,
    roughness: 0.72,
    metalness: 0.28,
  });
  const armorTrimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.82,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: isSquadMate ? 1.1 : 1.7,
    roughness: 0.15,
    metalness: 0.9,
  });
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.35,
    metalness: 0.88,
  });

  // 2 & 3. Left and Right Tactical Boots/Legs
  const legGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.85, 10);
  const leftLeg = new THREE.Mesh(legGeo, hullMat);
  leftLeg.position.set(-0.22, 0.425, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, hullMat);
  rightLeg.position.set(0.22, 0.425, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // 4. Primary Silhouette: Armored Chest Rig
  const torsoGeo = new THREE.BoxGeometry(0.82, 0.96, 0.52);
  const torso = new THREE.Mesh(torsoGeo, hullMat);
  torso.position.set(0, 1.25, 0);
  torso.castShadow = true;
  group.add(torso);

  // 5. Secondary Read: Chest Plate Bevel & Shoulder Pauldrons
  const plateGeo = new THREE.BoxGeometry(0.96, 0.38, 0.6);
  const pauldrons = new THREE.Mesh(plateGeo, armorTrimMat);
  pauldrons.position.set(0, 1.52, 0);
  pauldrons.castShadow = true;
  group.add(pauldrons);

  // 6. Backpack Data-Link Unit + Antenna
  const packGeo = new THREE.BoxGeometry(0.56, 0.68, 0.34);
  const backpack = new THREE.Mesh(packGeo, armorTrimMat);
  backpack.position.set(0, 1.3, 0.38);
  group.add(backpack);

  const antennaGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.65, 8);
  const antenna = new THREE.Mesh(antennaGeo, visorMat);
  antenna.position.set(0.2, 1.9, 0.42);
  group.add(antenna);

  // 7. Helmet Dome
  const headGeo = new THREE.SphereGeometry(0.32, 14, 12);
  const head = new THREE.Mesh(headGeo, armorTrimMat);
  head.position.set(0, 2.02, 0);
  head.castShadow = true;
  group.add(head);

  // 8. Accent Detail: Luminous Tactical Visor Slit
  const visorGeo = new THREE.BoxGeometry(0.48, 0.14, 0.28);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 2.04, -0.2);
  group.add(visor);

  // 9. Pulse Carbine Rifle + Muzzle Flash Node
  const rifleGeo = new THREE.BoxGeometry(0.14, 0.18, 0.95);
  const rifle = new THREE.Mesh(rifleGeo, gunMat);
  rifle.position.set(0.46, 1.28, -0.38);
  group.add(rifle);

  const muzzleGeo = new THREE.ConeGeometry(0.18, 0.45, 8);
  muzzleGeo.rotateX(-Math.PI / 2);
  const muzzleMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0,
  });
  const muzzleFlash = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleFlash.position.set(0.46, 1.28, -0.98);
  muzzleFlash.name = 'muzzleFlash';
  group.add(muzzleFlash);

  return group;
}

/**
 * 7-part composite Enemy AI Faction Agent with distinct silhouette per archetype,
 * windup telegraph ring, and thermoptic cloak shimmer support.
 */
export function createEnemyAgentMesh(archetype: EnemyArchetype): THREE.Group {
  const group = new THREE.Group();

  const colorMap: Record<EnemyArchetype, number> = {
    chaser: 0xef4444,      // Crimson Stalker
    kiter: 0xa855f7,       // Violet Rail-Sniper
    interceptor: 0xf97316, // Amber Flanker Drone-Walker
    suppressor: 0xe11d48,  // Heavy Armored Suppressor
  };
  const accent = colorMap[archetype];

  const shadow = new THREE.Mesh(sharedShadowGeo, sharedShadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.68,
    metalness: 0.35,
    transparent: true,
    opacity: 1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.25,
    metalness: 0.88,
    transparent: true,
    opacity: 1,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.8,
    roughness: 0.15,
    metalness: 0.5,
    transparent: true,
    opacity: 1,
  });

  // 1. Base chassis / legs
  const legGeo =
    archetype === 'suppressor'
      ? new THREE.CylinderGeometry(0.55, 0.7, 0.9, 10)
      : new THREE.ConeGeometry(0.52, 1.0, 8);
  const base = new THREE.Mesh(legGeo, bodyMat);
  base.position.y = 0.5;
  base.castShadow = true;
  group.add(base);

  // 2. Primary Hull
  const hullGeo =
    archetype === 'kiter'
      ? new THREE.CylinderGeometry(0.32, 0.45, 1.35, 8)
      : new THREE.BoxGeometry(0.88, 0.95, 0.72);
  const hull = new THREE.Mesh(hullGeo, metalMat);
  hull.position.y = 1.35;
  hull.castShadow = true;
  group.add(hull);

  // 3. Archetype Secondary Silhouette Read
  if (archetype === 'chaser') {
    const bladeGeo = new THREE.BoxGeometry(1.45, 0.12, 0.45);
    const blades = new THREE.Mesh(bladeGeo, coreMat);
    blades.position.set(0, 1.35, -0.25);
    group.add(blades);
  } else if (archetype === 'kiter') {
    const railGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.65, 8);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, metalMat);
    rail.position.set(0.28, 1.55, -0.55);
    group.add(rail);
  } else if (archetype === 'interceptor') {
    const wingGeo = new THREE.BoxGeometry(1.65, 0.18, 0.5);
    const wings = new THREE.Mesh(wingGeo, metalMat);
    wings.position.set(0, 1.65, 0.2);
    group.add(wings);
  } else {
    const shieldGeo = new THREE.BoxGeometry(1.35, 1.25, 0.18);
    const shield = new THREE.Mesh(shieldGeo, metalMat);
    shield.position.set(0, 1.15, -0.52);
    group.add(shield);
  }

  // 4. Sensor Head & Core Eye
  const headGeo = new THREE.OctahedronGeometry(0.34, 1);
  const head = new THREE.Mesh(headGeo, coreMat);
  head.position.set(0, 2.08, 0);
  group.add(head);

  // 5. Attack Windup Telegraph Ring (visible before heavy shots)
  const teleGeo = new THREE.RingGeometry(0.95, 1.22, 24);
  teleGeo.rotateX(-Math.PI / 2);
  const teleMat = new THREE.MeshBasicMaterial({
    color: accent,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(teleGeo, teleMat);
  telegraphRing.position.y = 0.05;
  telegraphRing.name = 'telegraphRing';
  group.add(telegraphRing);

  group.userData = { bodyMat, metalMat, coreMat, telegraphMat: teleMat };
  return group;
}

/**
 * 7-part Encrypted Data Terminal Monolith for Data-as-Currency hacking
 */
export function createDataTerminalMesh(): THREE.Group {
  const group = new THREE.Group();

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.75,
    metalness: 0.3,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.28,
    metalness: 0.85,
  });
  const holoMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.6,
    roughness: 0.15,
    metalness: 0.6,
  });

  // 1. Octagonal Plinth Base
  const baseGeo = new THREE.CylinderGeometry(1.6, 1.9, 0.35, 8);
  const base = new THREE.Mesh(baseGeo, plinthMat);
  base.position.y = 0.175;
  base.receiveShadow = true;
  group.add(base);

  // 2. Server Tower Pillar
  const towerGeo = new THREE.BoxGeometry(1.1, 2.6, 0.9);
  const tower = new THREE.Mesh(towerGeo, frameMat);
  tower.position.set(0, 1.5, 0.25);
  tower.castShadow = true;
  group.add(tower);

  // 3. Angled Console Deck
  const consoleGeo = new THREE.BoxGeometry(1.25, 0.9, 0.75);
  const deck = new THREE.Mesh(consoleGeo, plinthMat);
  deck.position.set(0, 0.8, -0.45);
  group.add(deck);

  // 4. Glowing Holographic Screen
  const screenGeo = new THREE.BoxGeometry(1.05, 0.12, 0.55);
  const screen = new THREE.Mesh(screenGeo, holoMat);
  screen.position.set(0, 1.32, -0.45);
  screen.rotation.x = 0.35;
  group.add(screen);

  // 5. Floating Rotating Data Core Octahedron
  const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
  const core = new THREE.Mesh(coreGeo, holoMat);
  core.position.set(0, 3.35, 0.25);
  core.name = 'dataCore';
  group.add(core);

  // 6. Ground Hack Radius Ring
  const ringGeo = new THREE.RingGeometry(3.6, 3.85, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.04;
  ring.name = 'hackRing';
  group.add(ring);

  group.userData = { holoMat, ringMat, core };
  return group;
}

/**
 * Tall silhouette Extraction Spire landmark in the northern sector
 */
export function createExtractionSpireMesh(): THREE.Group {
  const group = new THREE.Group();

  const padMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.4,
  });
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.25,
    metalness: 0.88,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 2.0,
    roughness: 0.15,
    metalness: 0.5,
  });

  // 1. Helipad Deck
  const padGeo = new THREE.CylinderGeometry(6.2, 6.8, 0.45, 16);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.225;
  pad.receiveShadow = true;
  group.add(pad);

  // 2. Central Skyhook Spire (Tall Vista Silhouette Landmark)
  const spireGeo = new THREE.CylinderGeometry(0.45, 1.35, 14.5, 8);
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 7.25, -3.5);
  spire.castShadow = true;
  group.add(spire);

  // 3. Cross-arm Dish Array
  const crossGeo = new THREE.BoxGeometry(5.2, 0.55, 0.65);
  const cross = new THREE.Mesh(crossGeo, spireMat);
  cross.position.set(0, 11.5, -3.5);
  group.add(cross);

  // 4. Extraction Beacon Crown
  const crownGeo = new THREE.OctahedronGeometry(0.95, 1);
  const crown = new THREE.Mesh(crownGeo, beaconMat);
  crown.position.set(0, 15.2, -3.5);
  crown.name = 'beaconCrown';
  group.add(crown);

  // 5. Extraction Perimeter Ring
  const ringGeo = new THREE.RingGeometry(5.4, 5.8, 40);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.47;
  group.add(ring);

  return group;
}
