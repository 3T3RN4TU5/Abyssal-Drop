import * as THREE from 'three';
import { EnemyArchetype, OperativeClassId } from './rules';

/**
 * AAA HDRP-Inspired Procedural PBR Texture Suite (Albedo, Tangent-Space Normal, Architectural Slate Roughness)
 * & Articulated Multi-Joint 3D Character Rigs with Procedural Locomotion, Recoil, and Class Silhouette Gear.
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

export function createBasinRoughnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(168, 168, 168)';
  ctx.fillRect(0, 0, 512, 512);

  for (let gx = 0; gx < 512; gx += 64) {
    for (let gy = 0; gy < 512; gy += 64) {
      const v = 135 + ((gx * 11 + gy * 17) % 55);
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      ctx.fillRect(gx + 2, gy + 2, 60, 60);
    }
  }

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

export function createBasinNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 900; i++) {
    const x = (i * 97) % 512;
    const y = (i * 53) % 512;
    const nx = 120 + (i % 16);
    const ny = 120 + ((i * 7) % 16);
    ctx.fillStyle = `rgb(${nx}, ${ny}, 250)`;
    ctx.fillRect(x, y, 3, 3);
  }

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

  const coreGeo = new THREE.BoxGeometry(w, h, d);
  const core = new THREE.Mesh(coreGeo, armorMat);
  core.position.y = h / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  const capGeo = new THREE.BoxGeometry(w + 0.25, 0.28, d + 0.25);
  const cap = new THREE.Mesh(capGeo, ribMat);
  cap.position.y = h + 0.05;
  cap.castShadow = true;
  group.add(cap);

  const skirtGeo = new THREE.BoxGeometry(w + 0.35, 0.35, d + 0.35);
  const skirt = new THREE.Mesh(skirtGeo, ribMat);
  skirt.position.y = 0.175;
  skirt.receiveShadow = true;
  group.add(skirt);

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
 * Multi-Joint Articulated Humanoid Exo-Suit Operative
 * Features independent hip/leg pivots, waist/torso rig, head/NVG optic pivot,
 * dual-arm weapon cradle, class-distinct gear (Vanguard Missile Pod, Specter Recon Blades, Warden Riot Shield),
 * and active Laser Aiming Sight + Muzzle Flash on both Lead and Companion Operatives.
 */
export function createOperativeMesh(classId: OperativeClassId, isSquadMate = false): THREE.Group {
  const group = new THREE.Group();

  const accentHex =
    classId === 'vanguard'
      ? 0xf59e0b
      : classId === 'specter'
      ? 0x06b6d4
      : 0x10b981;

  // 1. Contact shadow + tactical ground ring
  const shadow = new THREE.Mesh(sharedShadowGeo, sharedShadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  const footRingGeo = new THREE.RingGeometry(0.82, 0.94, 32);
  footRingGeo.rotateX(-Math.PI / 2);
  const footRingMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isSquadMate ? 0.52 : 0.78,
    depthWrite: false,
  });
  const footRing = new THREE.Mesh(footRingGeo, footRingMat);
  footRing.position.y = 0.03;
  group.add(footRing);

  // Calibrated PBR Materials
  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0x0c131f,
    roughness: 0.76,
    metalness: 0.28,
  });
  const exoPlateMat = new THREE.MeshStandardMaterial({
    color:
      classId === 'vanguard'
        ? 0x283548
        : classId === 'specter'
        ? 0x1a2639
        : 0x1e332f,
    roughness: 0.28,
    metalness: 0.86,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d66,
    roughness: 0.22,
    metalness: 0.92,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: isSquadMate ? 1.85 : 2.35,
    roughness: 0.12,
    metalness: 0.9,
  });
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.22,
    metalness: 0.94,
  });

  // ==========================================================================
  // 2. ARTICULATED LEFT & RIGHT LEG PIVOTS (Hip joint at y = 0.95)
  // ==========================================================================
  const buildLegPivot = (side: -1 | 1) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.25, 0.95, 0);

    // Upper Thigh Armor
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.14, 0.46, 12),
      exoPlateMat
    );
    thigh.position.set(0, -0.22, 0);
    thigh.castShadow = true;
    legPivot.add(thigh);

    // Articulated Knee Guard with glowing accent
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.26), trimMat);
    knee.position.set(0, -0.45, -0.05);
    legPivot.add(knee);

    // Lower Shin Greave
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.44, 12),
      undersuitMat
    );
    shin.position.set(0, -0.66, 0.02);
    shin.castShadow = true;
    legPivot.add(shin);

    // Armored Combat Boot
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.38), exoPlateMat);
    boot.position.set(0, -0.87, -0.05);
    boot.castShadow = true;
    legPivot.add(boot);

    return legPivot;
  };

  const leftLegPivot = buildLegPivot(-1);
  leftLegPivot.name = 'leftLegPivot';
  group.add(leftLegPivot);

  const rightLegPivot = buildLegPivot(1);
  rightLegPivot.name = 'rightLegPivot';
  group.add(rightLegPivot);

  // ==========================================================================
  // 3. ARTICULATED TORSO & CLASS SILHOUETTE RIG (Waist joint at y = 0.95)
  // ==========================================================================
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.95, 0);
  torsoPivot.name = 'torsoPivot';
  group.add(torsoPivot);

  // Tactical Utility Belt & Pelvis
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.48), trimMat);
  belt.position.set(0, 0.08, 0);
  torsoPivot.add(belt);

  // Armored Abdomen & Ribcage
  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.82, 0.5), undersuitMat);
  abdomen.position.set(0, 0.52, 0);
  abdomen.castShadow = true;
  torsoPivot.add(abdomen);

  // Sculpted Ballistic Chest Cuirass
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.56, 0.6), exoPlateMat);
  chestPlate.position.set(0, 0.66, -0.03);
  chestPlate.castShadow = true;
  torsoPivot.add(chestPlate);

  // Glowing Chest Emblem Core
  const chestCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    visorMat
  );
  chestCore.position.set(0, 0.66, -0.34);
  torsoPivot.add(chestCore);

  // Heavy Shoulder Pauldrons (Left & Right)
  const leftPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.56), exoPlateMat);
  leftPauldron.position.set(-0.56, 0.82, 0);
  leftPauldron.rotation.z = 0.18;
  leftPauldron.castShadow = true;
  torsoPivot.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.56), exoPlateMat);
  rightPauldron.position.set(0.56, 0.82, 0);
  rightPauldron.rotation.z = -0.18;
  rightPauldron.castShadow = true;
  torsoPivot.add(rightPauldron);

  // Dorsal Telemetry Jetpack & Glowing Spine Core
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.34), exoPlateMat);
  backpack.position.set(0, 0.58, 0.36);
  torsoPivot.add(backpack);

  const spineCore = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.12), visorMat);
  spineCore.position.set(0, 0.58, 0.52);
  torsoPivot.add(spineCore);

  // Class-Specific Silhouette Attachments
  if (classId === 'vanguard') {
    // Vanguard: Shoulder Micro-Missile Pod Launcher
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.44), trimMat);
    pod.position.set(-0.48, 1.08, 0.12);
    torsoPivot.add(pod);
    const podWarhead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.08), visorMat);
    podWarhead.position.set(-0.48, 1.08, -0.11);
    torsoPivot.add(podWarhead);
  } else if (classId === 'specter') {
    // Specter: Twin Swept Recon Telemetry Wings
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.28), visorMat);
    leftWing.position.set(-0.34, 0.88, 0.48);
    leftWing.rotation.z = 0.36;
    leftWing.rotation.x = -0.25;
    torsoPivot.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.28), visorMat);
    rightWing.position.set(0.34, 0.88, 0.48);
    rightWing.rotation.z = -0.36;
    rightWing.rotation.x = -0.25;
    torsoPivot.add(rightWing);
  } else {
    // Warden: Heavy Ballistic Blast Collar + Left-Arm Energy Riot Shield
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.24, 12), trimMat);
    collar.position.set(0, 0.96, 0);
    torsoPivot.add(collar);

    const shieldFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.78), trimMat);
    shieldFrame.position.set(-0.68, 0.48, -0.22);
    shieldFrame.rotation.y = 0.25;
    torsoPivot.add(shieldFrame);

    const shieldHolo = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.96, 0.62),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
      })
    );
    shieldHolo.position.set(-0.71, 0.48, -0.22);
    shieldHolo.rotation.y = 0.25;
    torsoPivot.add(shieldHolo);
  }

  // ==========================================================================
  // 4. HEAD & QUAD-OPTIC NVG HELMET PIVOT (Neck joint at y = 1.08 on torso)
  // ==========================================================================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.08, 0);
  headPivot.name = 'headPivot';
  torsoPivot.add(headPivot);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 14), exoPlateMat);
  helmet.castShadow = true;
  headPivot.add(helmet);

  // Chin mandible armor
  const jawline = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.38), trimMat);
  jawline.position.set(0, -0.1, -0.08);
  headPivot.add(jawline);

  // Luminous Tactical Visor Slit + Quad-Optic NVG Lenses
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.28), visorMat);
  visor.position.set(0, 0.02, -0.22);
  headPivot.add(visor);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.03, 0.62, 8),
    visorMat
  );
  antenna.position.set(0.24, 0.36, 0.16);
  headPivot.add(antenna);

  // ==========================================================================
  // 5. DUAL-ARM & WEAPON CRADLE PIVOT (Shoulder joint at y = 0.62 on torso)
  // ==========================================================================
  const weaponArmPivot = new THREE.Group();
  weaponArmPivot.position.set(0, 0.62, 0);
  weaponArmPivot.name = 'weaponArmPivot';
  torsoPivot.add(weaponArmPivot);

  // Right Firing Arm (Upper + Forearm Gauntlet)
  const rightArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.11, 0.62, 10),
    undersuitMat
  );
  rightArm.position.set(0.52, -0.14, -0.22);
  rightArm.rotation.x = Math.PI / 2.6;
  weaponArmPivot.add(rightArm);

  // Left Support Arm reaching across to rifle handguard
  const leftArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.1, 0.68, 10),
    undersuitMat
  );
  leftArm.position.set(-0.22, -0.18, -0.34);
  leftArm.rotation.x = Math.PI / 2.4;
  leftArm.rotation.z = -0.58;
  weaponArmPivot.add(leftArm);

  // Class-Specific Primary Weapon Receiver & Barrel
  const barrelLen = classId === 'specter' ? 1.42 : classId === 'warden' ? 1.25 : 1.12;
  const rifle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.22, barrelLen),
    gunMat
  );
  rifle.position.set(0.42, -0.16, -0.52);
  weaponArmPivot.add(rifle);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, barrelLen + 0.35, 8),
    trimMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.42, -0.14, -0.68);
  weaponArmPivot.add(barrel);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.24), visorMat);
  sight.position.set(0.42, -0.01, -0.45);
  weaponArmPivot.add(sight);

  // Active Laser Aiming Beam on BOTH Lead Operative and Companions!
  const laserLen = isSquadMate ? 9.5 : 12.0;
  const laserGeo = new THREE.CylinderGeometry(0.014, 0.03, laserLen, 6);
  laserGeo.rotateX(-Math.PI / 2);
  const laserMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: isSquadMate ? 0.36 : 0.46,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const laserSight = new THREE.Mesh(laserGeo, laserMat);
  laserSight.position.set(0.42, -0.14, -1.15 - laserLen / 2);
  laserSight.name = 'laserSight';
  weaponArmPivot.add(laserSight);

  // Muzzle Flash Cone
  const muzzleGeo = new THREE.ConeGeometry(0.26, 0.72, 10);
  muzzleGeo.rotateX(-Math.PI / 2);
  const muzzleMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleFlash.position.set(0.42, -0.14, -1.35);
  muzzleFlash.name = 'muzzleFlash';
  weaponArmPivot.add(muzzleFlash);

  group.userData = {
    leftLegPivot,
    rightLegPivot,
    torsoPivot,
    headPivot,
    weaponArmPivot,
    muzzleFlash,
    laserSight,
  };

  return group;
}

/**
 * Procedural Humanoid Locomotion, Breathing & Recoil Animator
 */
export function animateOperativeCharacter(
  group: THREE.Group,
  moveSpeed: number,
  muzzleTimer: number,
  timeSec: number,
  phaseOffset = 0
): void {
  const {
    leftLegPivot,
    rightLegPivot,
    torsoPivot,
    headPivot,
    weaponArmPivot,
    muzzleFlash,
  } = group.userData as {
    leftLegPivot?: THREE.Group;
    rightLegPivot?: THREE.Group;
    torsoPivot?: THREE.Group;
    headPivot?: THREE.Group;
    weaponArmPivot?: THREE.Group;
    muzzleFlash?: THREE.Mesh;
  };

  const speedNorm = Math.min(1, moveSpeed / 9.5);
  const walkCycle = timeSec * 11.5 + phaseOffset;

  if (leftLegPivot && rightLegPivot) {
    const strideAngle = Math.sin(walkCycle) * 0.62 * speedNorm;
    leftLegPivot.rotation.x = strideAngle;
    rightLegPivot.rotation.x = -strideAngle;
  }

  if (torsoPivot) {
    // Run bounce when moving + subtle breathing when stationary
    const runBounce = Math.abs(Math.sin(walkCycle)) * 0.085 * speedNorm;
    const idleBreath = Math.sin(timeSec * 2.6 + phaseOffset) * 0.022 * (1 - speedNorm);
    torsoPivot.position.y = 0.95 + runBounce + idleBreath;
    torsoPivot.rotation.x = 0.08 * speedNorm; // Forward tactical lean when sprinting
    torsoPivot.rotation.y = -Math.sin(walkCycle) * 0.09 * speedNorm;
  }

  if (headPivot) {
    headPivot.rotation.y = Math.sin(timeSec * 1.4 + phaseOffset) * 0.08 * (1 - speedNorm);
  }

  if (weaponArmPivot) {
    const recoilKick = muzzleTimer > 0 ? 0.14 : 0;
    weaponArmPivot.position.z = recoilKick;
    weaponArmPivot.rotation.x = muzzleTimer > 0 ? -0.09 : Math.sin(walkCycle * 2) * 0.03 * speedNorm;
  }

  if (muzzleFlash) {
    (muzzleFlash.material as THREE.MeshBasicMaterial).opacity =
      muzzleTimer > 0 ? 0.94 : 0.0;
    const scale = 0.85 + Math.random() * 0.35;
    muzzleFlash.scale.set(scale, scale, 1.0);
  }
}

/**
 * Multi-Joint Mechanized AI Faction Combat Unit with Articulated Walker Legs,
 * Rotating Carapace, HDR Reactor Core, and Windup Telegraph Ring.
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
    roughness: 0.58,
    metalness: 0.5,
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
    emissiveIntensity: 2.15,
    roughness: 0.12,
    metalness: 0.6,
    transparent: true,
    opacity: 1,
  });

  // 1. Articulated Bipedal Mechanized Walker Struts (Hip at y = 0.9)
  const buildWalkerLeg = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.34, 0.9, 0);

    const upperStrut = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.5, 0.26),
      metalMat
    );
    upperStrut.position.set(0, -0.22, -0.06);
    upperStrut.rotation.x = -0.25;
    upperStrut.castShadow = true;
    pivot.add(upperStrut);

    const lowerStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.54, 8),
      bodyMat
    );
    lowerStrut.position.set(0, -0.62, 0.06);
    lowerStrut.castShadow = true;
    pivot.add(lowerStrut);

    return pivot;
  };

  const leftStrutPivot = buildWalkerLeg(-1);
  group.add(leftStrutPivot);
  const rightStrutPivot = buildWalkerLeg(1);
  group.add(rightStrutPivot);

  // 2. Armored Mechanized Carapace & Reactor Core
  const hullGroup = new THREE.Group();
  hullGroup.position.set(0, 0.92, 0);
  group.add(hullGroup);

  const hullGeo =
    archetype === 'kiter'
      ? new THREE.CylinderGeometry(0.38, 0.5, 1.25, 10)
      : new THREE.BoxGeometry(0.98, 0.95, 0.82);
  const hull = new THREE.Mesh(hullGeo, metalMat);
  hull.position.y = 0.52;
  hull.castShadow = true;
  hullGroup.add(hull);

  const reactor = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), coreMat);
  reactor.position.set(0, 0.56, -0.38);
  hullGroup.add(reactor);

  // 3. Archetype Weapon & Silhouette Attachments
  if (archetype === 'chaser') {
    const blades = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 0.5), coreMat);
    blades.position.set(0, 0.5, -0.3);
    hullGroup.add(blades);
  } else if (archetype === 'kiter') {
    const railGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.9, 8);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, metalMat);
    rail.position.set(0.34, 0.68, -0.64);
    hullGroup.add(rail);
  } else if (archetype === 'interceptor') {
    const wings = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.56), metalMat);
    wings.position.set(0, 0.78, 0.22);
    hullGroup.add(wings);
  } else {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.28, 0.22), metalMat);
    shield.position.set(0, 0.34, -0.58);
    hullGroup.add(shield);
  }

  // 4. Sensor Head & Cyclops Optic
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), coreMat);
  head.position.set(0, 1.26, 0);
  hullGroup.add(head);

  // 5. Attack Windup Telegraph Ring
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

  group.userData = {
    bodyMat,
    metalMat,
    coreMat,
    telegraphMat: teleMat,
    leftStrutPivot,
    rightStrutPivot,
    hullGroup,
    head,
  };
  return group;
}

export function animateEnemyCharacter(
  group: THREE.Group,
  moveSpeed: number,
  timeSec: number,
  phaseOffset = 0
): void {
  const { leftStrutPivot, rightStrutPivot, hullGroup, head } = group.userData as {
    leftStrutPivot?: THREE.Group;
    rightStrutPivot?: THREE.Group;
    hullGroup?: THREE.Group;
    head?: THREE.Mesh;
  };
  const speedNorm = Math.min(1, moveSpeed / 6.5);
  const cycle = timeSec * 10.0 + phaseOffset;

  if (leftStrutPivot && rightStrutPivot) {
    const swing = Math.sin(cycle) * 0.55 * speedNorm;
    leftStrutPivot.rotation.x = swing;
    rightStrutPivot.rotation.x = -swing;
  }
  if (hullGroup) {
    hullGroup.position.y = 0.92 + Math.abs(Math.sin(cycle)) * 0.07 * speedNorm;
  }
  if (head) {
    head.rotation.y = Math.sin(timeSec * 3.2 + phaseOffset) * 0.45;
  }
}

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

  const baseGeo = new THREE.CylinderGeometry(1.65, 2.0, 0.38, 8);
  const base = new THREE.Mesh(baseGeo, plinthMat);
  base.position.y = 0.19;
  base.receiveShadow = true;
  group.add(base);

  const towerGeo = new THREE.BoxGeometry(1.15, 2.75, 0.95);
  const tower = new THREE.Mesh(towerGeo, frameMat);
  tower.position.set(0, 1.55, 0.25);
  tower.castShadow = true;
  group.add(tower);

  const consoleGeo = new THREE.BoxGeometry(1.3, 0.95, 0.8);
  const deck = new THREE.Mesh(consoleGeo, plinthMat);
  deck.position.set(0, 0.82, -0.45);
  group.add(deck);

  const screenGeo = new THREE.BoxGeometry(1.08, 0.12, 0.58);
  const screen = new THREE.Mesh(screenGeo, holoMat);
  screen.position.set(0, 1.35, -0.45);
  screen.rotation.x = 0.35;
  group.add(screen);

  const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
  const core = new THREE.Mesh(coreGeo, holoMat);
  core.position.set(0, 3.4, 0.25);
  core.name = 'dataCore';
  group.add(core);

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

  const padGeo = new THREE.CylinderGeometry(6.4, 7.0, 0.45, 20);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.225;
  pad.receiveShadow = true;
  group.add(pad);

  const spireGeo = new THREE.CylinderGeometry(0.48, 1.4, 15.0, 10);
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 7.5, -3.5);
  spire.castShadow = true;
  group.add(spire);

  const crossGeo = new THREE.BoxGeometry(5.5, 0.58, 0.68);
  const cross = new THREE.Mesh(crossGeo, spireMat);
  cross.position.set(0, 11.8, -3.5);
  group.add(cross);

  const crownGeo = new THREE.OctahedronGeometry(0.95, 1);
  const crown = new THREE.Mesh(crownGeo, beaconMat);
  crown.position.set(0, 15.6, -3.5);
  crown.name = 'beaconCrown';
  group.add(crown);

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
