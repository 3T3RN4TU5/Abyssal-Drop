import * as THREE from 'three';
import { EnemyArchetype, OperativeClassId } from './rules';

/**
 * AAA HDRP-Inspired Procedural PBR Texture Suite (Albedo, Tangent-Space Normal, Architectural Slate Roughness)
 * & Multi-Part Articulated 3D Meshes with Volumetric Cones and Laser Optics.
 */

export function createBasinGridTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep volcanic obsidian slate base
  ctx.fillStyle = '#090d15';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle architectural tile variation per 128x128 slab
  for (let gx = 0; gx < 1024; gx += 128) {
    for (let gy = 0; gy < 1024; gy += 128) {
      const shade = ((gx * 7 + gy * 13) % 5) * 2;
      ctx.fillStyle = `rgb(${10 + shade}, ${15 + shade}, ${24 + shade})`;
      ctx.fillRect(gx + 2, gy + 2, 124, 124);

      // Fine diagonal brushed carbon micro-streaks
      ctx.strokeStyle = 'rgba(20, 30, 46, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx + 12, gy + 12);
      ctx.lineTo(gx + 116, gy + 116);
      ctx.stroke();
    }
  }

  // Heavy architectural concrete slab seams
  ctx.strokeStyle = 'rgba(2, 6, 12, 0.92)';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Tactical sub-grid + telemetry conduit lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 64; i < 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Corner fiducial crosses
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
  ctx.lineWidth = 2;
  for (let x = 128; x < 1024; x += 256) {
    for (let y = 128; y < 1024; y += 256) {
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Architectural Slab Roughness Map: Smooth variation across concrete tiles and metallic conduit seams
 */
export function createBasinRoughnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Satin-matte volcanic slate base
  ctx.fillStyle = 'rgb(168, 168, 168)';
  ctx.fillRect(0, 0, 512, 512);

  // Per-tile specular variation (some slabs slightly damper/smoother than others)
  for (let gx = 0; gx < 512; gx += 64) {
    for (let gy = 0; gy < 512; gy += 64) {
      const v = 135 + ((gx * 11 + gy * 17) % 55);
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      ctx.fillRect(gx + 2, gy + 2, 60, 60);
    }
  }

  // Smooth metallic conduit seams
  ctx.strokeStyle = 'rgb(85, 85, 85)';
  ctx.lineWidth = 3;
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

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

/**
 * Tangent-Space Normal Map (#8080FF neutral base with beveled slab grooves & micro-grain)
 */
export function createBasinNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Flat tangent normal (0.5, 0.5, 1.0)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);

  // Fine stone micro-grain
  for (let i = 0; i < 900; i++) {
    const x = (i * 97) % 512;
    const y = (i * 53) % 512;
    const nx = 120 + (i % 16);
    const ny = 120 + ((i * 7) % 16);
    ctx.fillStyle = `rgb(${nx}, ${ny}, 250)`;
    ctx.fillRect(x, y, 3, 3);
  }

  // Beveled slab seam normals
  for (let i = 0; i <= 512; i += 64) {
    ctx.fillStyle = 'rgb(100, 128, 240)';
    ctx.fillRect(i, 0, 2, 512);
    ctx.fillStyle = 'rgb(156, 128, 240)';
    ctx.fillRect(i + 2, 0, 2, 512);

    ctx.fillStyle = 'rgb(128, 100, 240)';
    ctx.fillRect(0, i, 512, 2);
    ctx.fillStyle = 'rgb(128, 156, 240)';
    ctx.fillRect(0, i + 2, 512, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
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
    const v = 112 + (i % 32);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 4, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

/**
 * Atmospheric HDRP Sky Dome with storm nebula horizon, orbital telemetry grid, and drop-pod streaks
 */
export function createAtmosphericSkyDome(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#020409');
  grad.addColorStop(0.45, '#07101e');
  grad.addColorStop(0.72, '#0c1b2e');
  grad.addColorStop(0.88, '#0f293a');
  grad.addColorStop(1, '#05080f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Distant atmospheric aurora / storm scattering clouds
  for (let i = 0; i < 55; i++) {
    const x = (i * 193) % 1024;
    const y = 210 + ((i * 47) % 180);
    const r = 45 + (i % 70);
    const cloudGrad = ctx.createRadialGradient(x, y, 2, x, y, r);
    cloudGrad.addColorStop(
      0,
      i % 3 === 0 ? 'rgba(6, 182, 212, 0.12)' : 'rgba(56, 189, 248, 0.07)'
    );
    cloudGrad.addColorStop(1, 'rgba(5, 8, 15, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // High-altitude orbital satellites / stars
  for (let i = 0; i < 180; i++) {
    const x = (i * 311) % 1024;
    const y = (i * 97) % 240;
    ctx.fillStyle = i % 9 === 0 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(226, 232, 240, 0.45)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const skyGeo = new THREE.SphereGeometry(175, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  return new THREE.Mesh(skyGeo, skyMat);
}

/**
 * Armored Tactical Cover Bunker (Multi-part composite barricade with hazard ribs & neon corner beacons)
 */
export function createTacticalBunkerMesh(w: number, h: number, d: number): THREE.Group {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x161f2e,
    roughness: 0.55,
    metalness: 0.62,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x263346,
    roughness: 0.3,
    metalness: 0.85,
  });
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.25,
    roughness: 0.2,
    metalness: 0.8,
  });

  // Main reinforced ferro-concrete core
  const coreGeo = new THREE.BoxGeometry(w, h, d);
  const core = new THREE.Mesh(coreGeo, armorMat);
  core.position.y = h / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  // Top beveled armor cap
  const capGeo = new THREE.BoxGeometry(w + 0.25, 0.28, d + 0.25);
  const cap = new THREE.Mesh(capGeo, ribMat);
  cap.position.y = h + 0.05;
  cap.castShadow = true;
  group.add(cap);

  // Base anchor skirt
  const skirtGeo = new THREE.BoxGeometry(w + 0.35, 0.35, d + 0.35);
  const skirt = new THREE.Mesh(skirtGeo, ribMat);
  skirt.position.y = 0.175;
  skirt.receiveShadow = true;
  group.add(skirt);

  // Glowing tactical telemetry strip along upper edge
  const ledGeo = new THREE.BoxGeometry(w * 0.85, 0.08, d + 0.3);
  const led = new THREE.Mesh(ledGeo, stripMat);
  led.position.y = h - 0.32;
  group.add(led);

  return group;
}

const sharedShadowGeo = new THREE.CircleGeometry(1.25, 24);
sharedShadowGeo.rotateX(-Math.PI / 2);
const sharedShadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
});

/**
 * 12-part articulated Exo-Suit Operative with Quad-Optic NVG Visor, Cyber Spine,
 * Pulse Carbine, Volumetric Laser Sight Beam, and Muzzle Flash
 */
export function createOperativeMesh(classId: OperativeClassId, isSquadMate = false): THREE.Group {
  const group = new THREE.Group();

  const accentHex =
    classId === 'vanguard'
      ? 0xf59e0b
      : classId === 'specter'
      ? 0x06b6d4
      : 0x10b981;

  // 1. Soft contact shadow + tactical ground ring
  const shadow = new THREE.Mesh(sharedShadowGeo, sharedShadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  const footRingGeo = new THREE.RingGeometry(0.78, 0.88, 28);
  footRingGeo.rotateX(-Math.PI / 2);
  const footRingMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isSquadMate ? 0.35 : 0.65,
    depthWrite: false,
  });
  const footRing = new THREE.Mesh(footRingGeo, footRingMat);
  footRing.position.y = 0.03;
  group.add(footRing);

  // High-contrast PBR Materials
  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0x0b111a,
    roughness: 0.78,
    metalness: 0.25,
  });
  const exoPlateMat = new THREE.MeshStandardMaterial({
    color: isSquadMate ? 0x1e293b : 0x263449,
    roughness: 0.26,
    metalness: 0.88,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: isSquadMate ? 1.5 : 2.1,
    roughness: 0.12,
    metalness: 0.9,
  });
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.22,
    metalness: 0.92,
  });

  // 2 & 3. Articulated Exo-Greaves & Boots
  const legGeo = new THREE.CylinderGeometry(0.17, 0.21, 0.9, 12);
  const leftLeg = new THREE.Mesh(legGeo, undersuitMat);
  leftLeg.position.set(-0.23, 0.45, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, undersuitMat);
  rightLeg.position.set(0.23, 0.45, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Knee armor guards
  const kneeGeo = new THREE.BoxGeometry(0.22, 0.24, 0.28);
  const leftKnee = new THREE.Mesh(kneeGeo, exoPlateMat);
  leftKnee.position.set(-0.23, 0.52, -0.06);
  group.add(leftKnee);
  const rightKnee = new THREE.Mesh(kneeGeo, exoPlateMat);
  rightKnee.position.set(0.23, 0.52, -0.06);
  group.add(rightKnee);

  // 4. Primary Silhouette: Armored Thoracic Rig
  const torsoGeo = new THREE.BoxGeometry(0.86, 0.98, 0.54);
  const torso = new THREE.Mesh(torsoGeo, undersuitMat);
  torso.position.set(0, 1.28, 0);
  torso.castShadow = true;
  group.add(torso);

  // 5. Angled Ballistic Chest Plate + Heavy Shoulder Pauldrons
  const chestPlateGeo = new THREE.BoxGeometry(0.92, 0.55, 0.62);
  const chestPlate = new THREE.Mesh(chestPlateGeo, exoPlateMat);
  chestPlate.position.set(0, 1.44, -0.03);
  chestPlate.castShadow = true;
  group.add(chestPlate);

  const pauldronGeo = new THREE.BoxGeometry(1.22, 0.28, 0.58);
  const pauldrons = new THREE.Mesh(pauldronGeo, exoPlateMat);
  pauldrons.position.set(0, 1.66, 0);
  pauldrons.castShadow = true;
  group.add(pauldrons);

  // 6. Dorsal Telemetry Thruster Pack + Illuminated Spine Core
  const packGeo = new THREE.BoxGeometry(0.6, 0.72, 0.36);
  const backpack = new THREE.Mesh(packGeo, exoPlateMat);
  backpack.position.set(0, 1.34, 0.38);
  group.add(backpack);

  const spineCoreGeo = new THREE.BoxGeometry(0.14, 0.54, 0.12);
  const spineCore = new THREE.Mesh(spineCoreGeo, visorMat);
  spineCore.position.set(0, 1.34, 0.55);
  group.add(spineCore);

  const antennaGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.75, 8);
  const antenna = new THREE.Mesh(antennaGeo, visorMat);
  antenna.position.set(0.24, 1.98, 0.42);
  group.add(antenna);

  // 7. Ballistic Helmet Dome
  const headGeo = new THREE.SphereGeometry(0.34, 16, 14);
  const head = new THREE.Mesh(headGeo, exoPlateMat);
  head.position.set(0, 2.06, 0);
  head.castShadow = true;
  group.add(head);

  // 8. Luminous Tactical Visor + Quad-Optic NVG Bar
  const visorGeo = new THREE.BoxGeometry(0.52, 0.15, 0.3);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 2.06, -0.22);
  group.add(visor);

  // 9. Heavy Pulse Carbine Rifle + Holo-Sight
  const rifleGeo = new THREE.BoxGeometry(0.15, 0.2, 1.08);
  const rifle = new THREE.Mesh(rifleGeo, gunMat);
  rifle.position.set(0.48, 1.3, -0.44);
  group.add(rifle);

  const sightGeo = new THREE.BoxGeometry(0.1, 0.1, 0.22);
  const sight = new THREE.Mesh(sightGeo, visorMat);
  sight.position.set(0.48, 1.44, -0.45);
  group.add(sight);

  // 10. Volumetric Laser Aiming Beam
  if (!isSquadMate) {
    const laserGeo = new THREE.CylinderGeometry(0.012, 0.028, 11.5, 6);
    laserGeo.rotateX(-Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const laserSight = new THREE.Mesh(laserGeo, laserMat);
    laserSight.position.set(0.48, 1.3, -6.75);
    laserSight.name = 'laserSight';
    group.add(laserSight);
  }

  // 11. Muzzle Flash Cone
  const muzzleGeo = new THREE.ConeGeometry(0.24, 0.65, 10);
  muzzleGeo.rotateX(-Math.PI / 2);
  const muzzleMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleFlash.position.set(0.48, 1.3, -1.12);
  muzzleFlash.name = 'muzzleFlash';
  group.add(muzzleFlash);

  return group;
}

/**
 * 9-part Mechanized AI Faction Combat Unit with HDR Emissive Core, Armor Plating,
 * Windup Telegraph Ring, and Thermoptic Cloak Shimmer Support.
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
    color: 0x14171f,
    roughness: 0.62,
    metalness: 0.45,
    transparent: true,
    opacity: 1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x262b38,
    roughness: 0.22,
    metalness: 0.92,
    transparent: true,
    opacity: 1,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 2.1,
    roughness: 0.12,
    metalness: 0.6,
    transparent: true,
    opacity: 1,
  });

  // 1. Reverse-jointed walker chassis / heavy treads
  const legGeo =
    archetype === 'suppressor'
      ? new THREE.CylinderGeometry(0.62, 0.78, 0.95, 12)
      : new THREE.ConeGeometry(0.56, 1.05, 8);
  const base = new THREE.Mesh(legGeo, bodyMat);
  base.position.y = 0.52;
  base.castShadow = true;
  group.add(base);

  // 2. Armored Mechanized Carapace
  const hullGeo =
    archetype === 'kiter'
      ? new THREE.CylinderGeometry(0.36, 0.48, 1.4, 10)
      : new THREE.BoxGeometry(0.94, 1.0, 0.78);
  const hull = new THREE.Mesh(hullGeo, metalMat);
  hull.position.y = 1.38;
  hull.castShadow = true;
  group.add(hull);

  // 3. Glowing Chest Reactor Core
  const reactorGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const reactor = new THREE.Mesh(reactorGeo, coreMat);
  reactor.position.set(0, 1.42, -0.36);
  group.add(reactor);

  // 4. Archetype Weapon & Silhouette Attachments
  if (archetype === 'chaser') {
    const bladeGeo = new THREE.BoxGeometry(1.6, 0.12, 0.48);
    const blades = new THREE.Mesh(bladeGeo, coreMat);
    blades.position.set(0, 1.38, -0.28);
    group.add(blades);
  } else if (archetype === 'kiter') {
    const railGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.85, 8);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, metalMat);
    rail.position.set(0.32, 1.58, -0.62);
    group.add(rail);
  } else if (archetype === 'interceptor') {
    const wingGeo = new THREE.BoxGeometry(1.85, 0.16, 0.54);
    const wings = new THREE.Mesh(wingGeo, metalMat);
    wings.position.set(0, 1.68, 0.22);
    group.add(wings);
  } else {
    const shieldGeo = new THREE.BoxGeometry(1.48, 1.32, 0.22);
    const shield = new THREE.Mesh(shieldGeo, metalMat);
    shield.position.set(0, 1.18, -0.56);
    group.add(shield);
  }

  // 5. Sensor Head & Cyclops Optic
  const headGeo = new THREE.OctahedronGeometry(0.36, 1);
  const head = new THREE.Mesh(headGeo, coreMat);
  head.position.set(0, 2.14, 0);
  group.add(head);

  // 6. Attack Windup Telegraph Ring
  const teleGeo = new THREE.RingGeometry(1.0, 1.32, 28);
  teleGeo.rotateX(-Math.PI / 2);
  const teleMat = new THREE.MeshBasicMaterial({
    color: accent,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
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
 * Encrypted Data Terminal Monolith with Volumetric Hologram Cone & Floating Core
 */
export function createDataTerminalMesh(): THREE.Group {
  const group = new THREE.Group();

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.45,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.22,
    metalness: 0.9,
  });
  const holoMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.75,
    roughness: 0.12,
    metalness: 0.7,
  });

  // 1. Octagonal Plinth Base
  const baseGeo = new THREE.CylinderGeometry(1.65, 2.0, 0.38, 8);
  const base = new THREE.Mesh(baseGeo, plinthMat);
  base.position.y = 0.19;
  base.receiveShadow = true;
  group.add(base);

  // 2. Server Tower Pillar
  const towerGeo = new THREE.BoxGeometry(1.15, 2.75, 0.95);
  const tower = new THREE.Mesh(towerGeo, frameMat);
  tower.position.set(0, 1.55, 0.25);
  tower.castShadow = true;
  group.add(tower);

  // 3. Angled Console Deck
  const consoleGeo = new THREE.BoxGeometry(1.3, 0.95, 0.8);
  const deck = new THREE.Mesh(consoleGeo, plinthMat);
  deck.position.set(0, 0.82, -0.45);
  group.add(deck);

  // 4. Glowing Holographic Screen
  const screenGeo = new THREE.BoxGeometry(1.08, 0.12, 0.58);
  const screen = new THREE.Mesh(screenGeo, holoMat);
  screen.position.set(0, 1.35, -0.45);
  screen.rotation.x = 0.35;
  group.add(screen);

  // 5. Floating Rotating Data Core Octahedron
  const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
  const core = new THREE.Mesh(coreGeo, holoMat);
  core.position.set(0, 3.4, 0.25);
  core.name = 'dataCore';
  group.add(core);

  // 6. Volumetric Orbital Light Shaft
  const beamGeo = new THREE.ConeGeometry(1.4, 9.5, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.065,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 4.8, 0.25);
  group.add(beam);

  // 7. Ground Hack Radius Ring
  const ringGeo = new THREE.RingGeometry(3.6, 3.9, 40);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
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
 * Northern Extraction Skyhook Spire with Volumetric Emerald God-Ray Beacon
 */
export function createExtractionSpireMesh(): THREE.Group {
  const group = new THREE.Group();

  const padMat = new THREE.MeshStandardMaterial({
    color: 0x172130,
    roughness: 0.45,
    metalness: 0.65,
  });
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
    metalness: 0.92,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 2.2,
    roughness: 0.1,
    metalness: 0.6,
  });

  // 1. Helipad Deck
  const padGeo = new THREE.CylinderGeometry(6.4, 7.0, 0.45, 20);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.225;
  pad.receiveShadow = true;
  group.add(pad);

  // 2. Central Skyhook Spire
  const spireGeo = new THREE.CylinderGeometry(0.48, 1.4, 15.0, 10);
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 7.5, -3.5);
  spire.castShadow = true;
  group.add(spire);

  // 3. Cross-arm Dish Array
  const crossGeo = new THREE.BoxGeometry(5.5, 0.58, 0.68);
  const cross = new THREE.Mesh(crossGeo, spireMat);
  cross.position.set(0, 11.8, -3.5);
  group.add(cross);

  // 4. Extraction Beacon Crown
  const crownGeo = new THREE.OctahedronGeometry(0.95, 1);
  const crown = new THREE.Mesh(crownGeo, beaconMat);
  crown.position.set(0, 15.6, -3.5);
  crown.name = 'beaconCrown';
  group.add(crown);

  // 5. Volumetric Skyhook Atmospheric Light Pillar
  const pillarGeo = new THREE.CylinderGeometry(0.35, 3.2, 32, 20, 1, true);
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(0, 16, -3.5);
  group.add(pillar);

  // 6. Extraction Perimeter Ring
  const ringGeo = new THREE.RingGeometry(5.4, 5.85, 44);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.47;
  group.add(ring);

  return group;
}
