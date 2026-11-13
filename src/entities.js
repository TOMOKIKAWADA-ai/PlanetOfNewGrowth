import * as THREE from 'three';
import { xpOrbScale, xpPullSpeedScale, xpPullStep } from './reward-feedback.js';
import {
  TAU,
  angleToXZ,
  clamp,
  clampToCircle,
  horizontalDistanceSq,
  horizontalPointSegmentDistanceSq,
  normalizeXZ,
  randRange,
  randomPointInCircle,
  signedAngleDifference,
  smooth01
} from './math.js';
import { Config } from './config.js';
import { getBossType, shadowFormOf, shadowMirrorStep, shadowVulnerable } from './bosses.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { advanceFootprint } from './footprints.js';
import { fullWaterScale } from './synergies.js';

// 狙えるボスの体（群れの母は倒れていない姉妹だけ）。ゲーム全体なしのテストでは motherEgg だけを見る。
function bossTargets(game) {
  if (game.getBossTargets) return game.getBossTargets();
  return game.motherEgg && !game.motherEgg.dead ? [game.motherEgg] : [];
}

const CONTACT_SHADOW_TEXTURE_SIZE = 96;
let contactShadowTexture = null;

function getContactShadowTexture() {
  if (contactShadowTexture) return contactShadowTexture;

  const canvas = document.createElement('canvas');
  canvas.width = CONTACT_SHADOW_TEXTURE_SIZE;
  canvas.height = CONTACT_SHADOW_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const center = CONTACT_SHADOW_TEXTURE_SIZE * 0.5;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.46, 'rgba(255, 255, 255, 0.72)');
  gradient.addColorStop(0.76, 'rgba(255, 255, 255, 0.18)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONTACT_SHADOW_TEXTURE_SIZE, CONTACT_SHADOW_TEXTURE_SIZE);

  contactShadowTexture = new THREE.CanvasTexture(canvas);
  contactShadowTexture.colorSpace = THREE.SRGBColorSpace;
  contactShadowTexture.generateMipmaps = false;
  contactShadowTexture.minFilter = THREE.LinearFilter;
  contactShadowTexture.magFilter = THREE.LinearFilter;
  return contactShadowTexture;
}

const TSUKIMI_GLB_URL = new URL('../assets/player/tsukimi_v2_mix3.glb', import.meta.url).href;
const TSUKIMI_FBX_URL = new URL('../assets/player/tsukimi_mix.fbx', import.meta.url).href;
const AKAME_FBX_URL = new URL('../assets/player/akame_001_rtp.fbx', import.meta.url).href;
const AKAME_GLB_URL = new URL('../assets/player/akame_002_rtp.glb', import.meta.url).href;
const KIICHIGO_GLB_URL = new URL('../assets/player/kiichigo_BLD.glb', import.meta.url).href;
const PLAYER_IDLE_FBX_URL = new URL('../assets/player/Idle_mix.fbx', import.meta.url).href;
const PLAYER_RUN_FBX_URL = new URL('../assets/player/Run_mix.fbx', import.meta.url).href;
const PLAYER_REACT_FBX_URL = new URL('../assets/player/React.fbx', import.meta.url).href;
const PLAYER_DYING_FBX_URL = new URL('../assets/player/Dying.fbx', import.meta.url).href;
const AKAME_IDLE_FBX_URL = new URL('../assets/player/akame_idle.fbx', import.meta.url).href;
const AKAME_RUN_FBX_URL = new URL('../assets/player/akame_run.fbx', import.meta.url).href;
const AKAME_REACT_FBX_URL = new URL('../assets/player/akame_react.fbx', import.meta.url).href;
const AKAME_DYING_FBX_URL = new URL('../assets/player/akame_dying.fbx', import.meta.url).href;
const KIICHIGO_RUN_FBX_URL = new URL('../assets/player/kiichigo_run.fbx', import.meta.url).href;
const KIICHIGO_REACT_FBX_URL = new URL('../assets/player/kiichigo_react.fbx', import.meta.url).href;
const KIICHIGO_DYING_FBX_URL = new URL('../assets/player/kiichigo_dying.fbx', import.meta.url).href;
const KIICHIGO_BURST_VRMA_URL = new URL('../assets/player/kiichigo_spinning_kick.vrma', import.meta.url).href;
const TSUKIMI_BIRD_GLB_URL = new URL('../assets/player/tsukimi_bird.glb', import.meta.url).href;
const DEFAULT_FBX_ANIMATIONS = {
  idle: PLAYER_IDLE_FBX_URL,
  run: PLAYER_RUN_FBX_URL,
  react: PLAYER_REACT_FBX_URL,
  dying: PLAYER_DYING_FBX_URL
};
const AKAME_FBX_ANIMATIONS = {
  idle: AKAME_IDLE_FBX_URL,
  run: AKAME_RUN_FBX_URL,
  react: AKAME_REACT_FBX_URL,
  dying: AKAME_DYING_FBX_URL
};
const KIICHIGO_FBX_ANIMATIONS = {
  idle: AKAME_IDLE_FBX_URL,
  run: AKAME_RUN_FBX_URL,
  react: KIICHIGO_REACT_FBX_URL,
  dying: KIICHIGO_DYING_FBX_URL
};
const VRMA_TO_MIXAMO_BONES = {
  J_hips: 'mixamorigHips',
  J_spine: 'mixamorigSpine',
  J_chest: 'mixamorigSpine1',
  J_upperChest: 'mixamorigSpine2',
  J_neck: 'mixamorigNeck',
  J_head: 'mixamorigHead',
  J_leftShoulder: 'mixamorigLeftShoulder',
  J_leftUpperArm: 'mixamorigLeftArm',
  J_leftLowerArm: 'mixamorigLeftForeArm',
  J_leftHand: 'mixamorigLeftHand',
  J_rightShoulder: 'mixamorigRightShoulder',
  J_rightUpperArm: 'mixamorigRightArm',
  J_rightLowerArm: 'mixamorigRightForeArm',
  J_rightHand: 'mixamorigRightHand',
  J_leftUpperLeg: 'mixamorigLeftUpLeg',
  J_leftLowerLeg: 'mixamorigLeftLeg',
  J_leftFoot: 'mixamorigLeftFoot',
  J_rightUpperLeg: 'mixamorigRightUpLeg',
  J_rightLowerLeg: 'mixamorigRightLeg',
  J_rightFoot: 'mixamorigRightFoot',
  J_leftIndexProximal: 'mixamorigLeftHandIndex1',
  J_leftIndexIntermediate: 'mixamorigLeftHandIndex2',
  J_leftIndexDistal: 'mixamorigLeftHandIndex3',
  J_leftMiddleProximal: 'mixamorigLeftHandMiddle1',
  J_leftMiddleIntermediate: 'mixamorigLeftHandMiddle2',
  J_leftMiddleDistal: 'mixamorigLeftHandMiddle3',
  J_leftRingProximal: 'mixamorigLeftHandRing1',
  J_leftRingIntermediate: 'mixamorigLeftHandRing2',
  J_leftRingDistal: 'mixamorigLeftHandRing3',
  J_leftLittleProximal: 'mixamorigLeftHandPinky1',
  J_leftLittleIntermediate: 'mixamorigLeftHandPinky2',
  J_leftLittleDistal: 'mixamorigLeftHandPinky3',
  J_rightIndexProximal: 'mixamorigRightHandIndex1',
  J_rightIndexIntermediate: 'mixamorigRightHandIndex2',
  J_rightIndexDistal: 'mixamorigRightHandIndex3',
  J_rightMiddleProximal: 'mixamorigRightHandMiddle1',
  J_rightMiddleIntermediate: 'mixamorigRightHandMiddle2',
  J_rightMiddleDistal: 'mixamorigRightHandMiddle3',
  J_rightRingProximal: 'mixamorigRightHandRing1',
  J_rightRingIntermediate: 'mixamorigRightHandRing2',
  J_rightRingDistal: 'mixamorigRightHandRing3',
  J_rightLittleProximal: 'mixamorigRightHandPinky1',
  J_rightLittleIntermediate: 'mixamorigRightHandPinky2',
  J_rightLittleDistal: 'mixamorigRightHandPinky3'
};
const VRMA_STABLE_HEAD_BONES = new Set(['J_neck', 'J_head']);
const PLAYER_VISUALS = {
  tsukimiFbx: { type: 'fbx', url: TSUKIMI_FBX_URL, name: 'TsukimiPlayerFbx' },
  tsukimiGlb: { type: 'gltf', url: TSUKIMI_GLB_URL, name: 'TsukimiPlayer', axisFix: 'zUpToYUp' },
  akameFbx: { type: 'fbx', url: AKAME_FBX_URL, name: 'AkamePlayerFbx', fbxAnimations: AKAME_FBX_ANIMATIONS },
  akameGlb: {
    type: 'gltf',
    url: AKAME_GLB_URL,
    name: 'AkamePlayerGlb',
    axisFix: 'zUpToYUp',
    fbxAnimations: AKAME_FBX_ANIMATIONS,
    useFbxAnimations: true,
    useEmbeddedAnimation: false
  },
  kiichigoGlb: {
    type: 'gltf',
    url: KIICHIGO_GLB_URL,
    name: 'KiichigoPlayerGlb',
    axisFix: 'zUpToYUp',
    fbxAnimations: KIICHIGO_FBX_ANIMATIONS,
    burstVrmaUrl: KIICHIGO_BURST_VRMA_URL,
    useFbxAnimations: true,
    useEmbeddedAnimation: false
  }
};
const forward = new THREE.Vector3();
const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const poseEuler = new THREE.Euler();
const poseQuat = new THREE.Quaternion();
const SNIPER_VISUAL_SCALE = 1.12;
const SNIPER_COLOR = 0xff1515;
const FOOTPRINT_COLOR = 0xbcd8f2;
const CRIER_COLOR = 0x6a3f86;
const CRIER_GLOW = 0xe7a6ff;
const HAND_COLOR = 0xb9a48f;
const HAND_GLOW = 0xff6a3d;
const HAND_ARM_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
const HAND_ARM_UP = new THREE.Vector3(0, 1, 0);
const HAND_ARM_HEIGHT = 1.05;
const ROOTSUCKER_COLOR = 0x6b4a2b;
const ROOTSUCKER_GLOW = 0xd99a4e;
const SPLITSHELL_COLOR = 0xd8ccb0;
const SPLITSHELL_GLOW = 0xfff0b8;
const SWARMBIRD_COLOR = 0x3d4a66;
const SWARMBIRD_GLOW = 0x9fdcff;
const SWARMBIRD_ALERT = 0xff5a4a;
// Tripo で作った体（main.js の GAMEPLAY_MODELS、Config.visuals.tripoEnemyModels）。
// 色は絵のまま残し、各種の光（膨らむ・腕を伸ばす・根を張る）は自発光の色と強さで出す。
const TRIPO_ENEMY_MODELS = Object.freeze({
  footprint: { key: 'footprintTripo', glow: 0x4f86c4, glowIntensity: 0.3 },
  // 鳴き・割れ殻は黒い体なので、普段の光を弱くして絵の色（黒に赤い筋・花）を残す（2026-11-12）。鳴きは膨らむときだけ紫に光る。
  crier: { key: 'crierTripo', glow: CRIER_GLOW, glowIntensity: 0.04 },
  swarmbird: { key: 'swarmbirdTripo', glow: SWARMBIRD_ALERT, glowIntensity: 0 },
  splitshell: { key: 'splitshellTripo', glow: SPLITSHELL_GLOW, glowIntensity: 0.02 },
  hand: { key: 'handTripo', glow: HAND_GLOW, glowIntensity: 0.08 },
  rootsucker: { key: 'rootsuckerTripo', glow: ROOTSUCKER_GLOW, glowIntensity: 0.1 }
});
const SWARMBIRD_BODY_GEOMETRY = new THREE.ConeGeometry(0.2, 0.72, 5).rotateX(Math.PI / 2);
const SWARMBIRD_WING_GEOMETRY = new THREE.BoxGeometry(0.62, 0.035, 0.3).translate(0.31, 0, 0);
const SWARMBIRD_EYE_GEOMETRY = new THREE.SphereGeometry(0.075, 6, 4);
const DRY_CIRCLE_GEOMETRY = new THREE.CircleGeometry(1, 48);
const DRY_EDGE_GEOMETRY = new THREE.RingGeometry(0.95, 1, 48);
const DRY_CIRCLE_OPACITY = 0.42;
const DRY_EDGE_OPACITY = 0.7;
const ENEMY_LOD_SPECS = {
  chaser: { color: 0x180c0d, radius: 0.46, height: 1.28, segments: 5 },
  shooter: { color: 0x180c0d, radius: 0.42, height: 1.12, segments: 5 },
  sniper: { color: SNIPER_COLOR, radius: 0.42 * SNIPER_VISUAL_SCALE, height: 1.12 * SNIPER_VISUAL_SCALE, segments: 5 },
  guardian: { color: 0x180c0d, radius: 0.58, height: 1.55, segments: 6 },
  spawner: { color: 0x180c0d, radius: 0.38, height: 1.0, segments: 5 },
  dragonflyLarva: { color: 0x376d61, radius: 0.34, height: 0.55, segments: 7 },
  tadpole: { color: 0x263f54, radius: 0.3, height: 0.48, segments: 10 },
  dragonfly: { color: 0x9bcf67, radius: 0.48, height: 0.72, segments: 6 },
  frog: { color: 0x577d38, radius: 0.72, height: 1.15, segments: 8 },
  footprint: { color: FOOTPRINT_COLOR, radius: 0.44, height: 1.22, segments: 5 },
  crier: { color: CRIER_COLOR, radius: 0.5, height: 1.0, segments: 7 },
  hand: { color: HAND_COLOR, radius: 0.46, height: 1.3, segments: 5 },
  rootsucker: { color: ROOTSUCKER_COLOR, radius: 0.6, height: 1.2, segments: 6 },
  splitshell: { color: SPLITSHELL_COLOR, radius: 0.48, height: 1.24, segments: 6 },
  swarmbird: { color: SWARMBIRD_COLOR, radius: 0.32, height: 0.4, segments: 5 }
};
const ENEMY_LOD_GEOMETRIES = Object.fromEntries(
  Object.entries(ENEMY_LOD_SPECS).map(([type, spec]) => [
    type,
    new THREE.ConeGeometry(spec.radius, spec.height, spec.segments)
  ])
);
const ENEMY_LOD_MATERIALS = Object.fromEntries(
  Object.entries(ENEMY_LOD_SPECS).map(([type, spec]) => [
    type,
    new THREE.MeshBasicMaterial({ color: spec.color })
  ])
);
const SNIPER_BEAM_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
const SNIPER_BEAM_MATERIALS = {
  warning: new THREE.MeshBasicMaterial({ color: 0xffb45a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  glow: new THREE.MeshBasicMaterial({ color: 0xff4866, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  core: new THREE.MeshBasicMaterial({ color: 0xfff2db, transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
};
const SNIPER_MARKER_GEOMETRY = new THREE.TorusGeometry(0.42, 0.07, 6, 16);
const SNIPER_MARKER_MATERIAL = new THREE.MeshBasicMaterial({ color: SNIPER_COLOR, toneMapped: false });
const SNIPER_BEAM_UP = new THREE.Vector3(0, 1, 0);
const EGG_LOD_GEOMETRY = new THREE.DodecahedronGeometry(0.7, 0);
const EGG_LOD_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x180c0d });
// Primitive shapes; Config.pickups.models swaps some of them for generated meshes at load (installPickupModel).
const PICKUP_GEOMETRIES = {
  xp: new THREE.OctahedronGeometry(0.23, 0),
  hp: new THREE.IcosahedronGeometry(0.28, 0),
  mp: new THREE.SphereGeometry(0.25, 12, 8),
  burst: new THREE.TetrahedronGeometry(0.34, 0),
  magnet: new THREE.TorusGeometry(0.22, 0.065, 8, 14),
  shield: new THREE.CylinderGeometry(0.27, 0.2, 0.32, 5),
  speed: new THREE.ConeGeometry(0.26, 0.48, 3)
};
const PICKUP_SPECS = {
  xp: { color: 0x69d2ff, glow: 0x45cfff, label: '' },
  hp: { color: 0xff5f6f, glow: 0xff8f9a, label: 'HP回復' },
  mp: { color: 0x63a8ff, glow: 0x7de7ff, label: 'MP回復' },
  burst: { color: 0xffce55, glow: 0xfff078, label: 'Burst欠片' },
  magnet: { color: 0xb988ff, glow: 0xd8bcff, label: '吸引石' },
  shield: { color: 0xbafdf2, glow: 0xffffff, label: '防護膜' },
  speed: { color: 0xdfff74, glow: 0xffff9e, label: '加速' }
};
const PICKUP_MATERIALS = Object.fromEntries(
  Object.entries(PICKUP_SPECS).map(([type, spec]) => [
    type,
    new THREE.MeshBasicMaterial({ color: spec.color, toneMapped: false })
  ])
);

const INSTALLED_PICKUP_MODELS = new Set();

// A generated pickup mesh has real shape, so it gets a lit material (an unlit one would flatten it to a silhouette).
// The geometry arrives normalized to a longest side of 1 (scripts/assets/blender/prep-pickups.py).
export function installPickupModel(type, geometry, size) {
  const spec = PICKUP_SPECS[type];
  if (!spec) return;
  geometry.scale(size, size, size);
  PICKUP_GEOMETRIES[type] = geometry;
  INSTALLED_PICKUP_MODELS.add(type);
  PICKUP_MATERIALS[type] = new THREE.MeshStandardMaterial({
    color: spec.color, emissive: spec.color, emissiveIntensity: 0.16, roughness: 0.4, metalness: 0.05
  });
}

function createLodObject(name, highDetail, lowDetail, lowDistance, hideDistance = 0) {
  const lod = new THREE.LOD();
  lod.name = name;
  lod.addLevel(highDetail, 0);
  lod.addLevel(lowDetail, lowDistance);
  if (hideDistance > lowDistance) {
    const hidden = new THREE.Group();
    hidden.name = `${name}_Hidden`;
    lod.addLevel(hidden, hideDistance);
  }
  return lod;
}

function createEnemyLowModel(type) {
  const spec = ENEMY_LOD_SPECS[type] ?? ENEMY_LOD_SPECS.chaser;
  const mesh = new THREE.Mesh(ENEMY_LOD_GEOMETRIES[type] ?? ENEMY_LOD_GEOMETRIES.chaser, ENEMY_LOD_MATERIALS[type] ?? ENEMY_LOD_MATERIALS.chaser);
  mesh.name = `Enemy_${type}_LowLOD`;
  mesh.position.y = spec.height * 0.5;
  mesh.userData.baseY = mesh.position.y;
  return mesh;
}

function createEggLowModel() {
  const mesh = new THREE.Mesh(EGG_LOD_GEOMETRY, EGG_LOD_MATERIAL);
  mesh.name = 'EggLowLOD';
  mesh.position.y = 0.55;
  mesh.scale.set(1, 1.1, 1);
  return mesh;
}

export class Player {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'Player';
    this.group.position.set(0, 0, 0);
    this.position = this.group.position;
    this.form = 'human';
    this.faceAngle = 0;
    this.moveAngle = 0;
    this.visualHeight = Config.player.humanHeight;
    this.heightVelocity = 0;
    const profile = Config.characters[game.characterId] ?? Config.characters.tsukimi;
    this.maxHp = profile.maxHp ?? Config.player.maxHp;
    this.hp = this.maxHp;
    this.dead = false;
    this.maxMp = profile.maxMp ?? Config.player.maxMp;
    this.mp = this.maxMp;
    this.humanSpeed = profile.humanSpeed ?? Config.player.humanSpeed;
    this.birdSpeed = profile.birdSpeed ?? Config.player.birdSpeed;
    this.damageTakenMultiplier = profile.damageTakenMultiplier ?? 1;
    this.radius = profile.radius ?? Config.player.radius;
    this.humanRegenMp = Config.player.humanRegenMp;
    // A6: 相乗効果が「最大MP・MP回復を上げたか」を見るための元の値。
    this.baseMaxMp = this.maxMp;
    this.baseHumanRegenMp = this.humanRegenMp;
    this.birdMpCost = Config.player.birdMpCost;
    this.autoInterval = profile.autoInterval ?? Config.player.autoInterval;
    this.autoDamage = profile.autoDamage ?? Config.player.autoDamage;
    this.specialInterval = profile.specialInterval ?? Config.player.specialInterval;
    this.specialDamage = Config.player.specialDamage;
    this.pierce = 0;
    this.seedCount = 1;
    this.pulseLevel = 0;
    this.pulseTimer = Config.skill.pulseInterval;
    this.pulseRange = Config.skill.pulseRange;
    this.pulseDamage = Config.skill.pulseDamage;
    this.birdDiveBonus = 0;
    this.birdMotherDiveBonus = 0;
    this.burst = 0;
    this.burstCooldownTimer = 0;
    this.burstSlashCount = 0;
    this.burstSlashTimer = 0;
    this.burstBeamTimer = 0;
    this.burstBeamDamageTimer = 0;
    this.pickupMagnetRange = Config.pickups.baseMagnetRange;
    this.pickupMagnetSpeed = Config.pickups.baseMagnetSpeed;
    this.pickupMagnetTimer = 0;
    this.speedBoostTimer = 0;
    this.stunTimer = 0;
    // 手（E11）に掴まれているあいだ: 掴んでいる敵と残り時間。
    this.grabbedBy = null;
    this.grabTimer = 0;
    // Multipliers set by carry-over chapter rewards (Config.carryOver).
    this.burstCooldownScale = 1;
    this.formMpCostScale = 1;
    this.diveDamageScale = 1;
    this.eggHealScale = 1;
    this.motherDamageScale = 1;
    this.shockwaveDamageScale = 1;
    this.mimicStunScale = 1;
    this.shieldCharges = 0;
    this.level = 1;
    this.xp = 0;
    this.nextXp = Config.xp.firstLevel;
    this.autoTimer = 0;
    this.specialTimer = 0;
    this.invincibleTimer = 0;
    this.phaseTimer = 0;
    this.attackLockTimer = 0;
    this.damageFlashTimer = 0;
    this.diveCooldown = 0;
    this.diveState = 'ready';
    this.diveTimer = 0;
    this.diveTarget = null;
    this.diveStart = new THREE.Vector3();
    this.diveEnd = new THREE.Vector3();
    this.seedOrbit = new THREE.Group();
    this.seeds = [];
    this.model = null;
    this.birdModel = null;
    this.fishModel = this.createFishModel();
    this.birdModelBaseY = 0;
    this.modelSkinnedMesh = null;
    this.modelBaseY = 0;
    this.modelMixer = null;
    this.modelActions = {};
    this.modelActionConfigs = {};
    this.activeModelAction = '';
    this.oneShotAnimationTimer = 0;
    this.usesExternalAnimation = false;
    this.modelClock = 0;
    this.armBones = [];
    this.legBones = [];
    this.bones = {};
    this.boneNames = new Set();
    this.boneAliases = new Map();
    this.baseBoneQuaternions = new Map();
    this.contactShadow = this.createContactShadow();
    this.fallback = this.createFallbackBody();
    this.applyPlayerMaterialFinish(this.fallback);
    this.underLight = this.createUnderLight();
    if (this.contactShadow) this.game.scene.add(this.contactShadow);
    this.group.add(this.fallback);
    this.group.add(this.fishModel);
    if (this.underLight) this.group.add(this.underLight);
    this.group.add(this.seedOrbit);
    this.syncSeeds();
  }

  createFishModel() {
    const group = new THREE.Group();
    group.name = 'FishForm';
    const material = new THREE.MeshStandardMaterial({ color: 0x54c7d9, roughness: 0.48 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 12), material);
    body.scale.set(1.45, 0.72, 0.72);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.9, 3), material);
    tail.rotation.z = Math.PI * 0.5;
    tail.position.x = -1.05;
    group.add(body, tail);
    group.rotation.y = -Math.PI * 0.5;
    group.position.y = 0.5;
    group.visible = false;
    return group;
  }

  async loadVisuals() {
    const playerVisual = PLAYER_VISUALS[Config.visuals.playerModel];
    if (playerVisual) {
      const loaded = playerVisual.type === 'fbx'
        ? await this.loadFbxVisual(playerVisual.url, playerVisual.name, playerVisual)
        : await this.loadGltfVisual(playerVisual.url, playerVisual.name, playerVisual);
      await this.loadBirdVisual();
      this.syncSeeds();
      if (loaded) return;
    }
    if (!Config.visuals.useAssetModels) {
      await this.loadBirdVisual();
      this.syncSeeds();
      return;
    }
    const model = this.game.assets.cloneModel('player');
      if (model) {
      model.name = 'Tsuyukusa';
      model.scale.setScalar(1.18);
      model.rotation.y = Config.player.modelYaw;
      model.traverse((child) => {
        if (child.isBone) {
          this.registerModelBone(child);
        }
        if (child.isSkinnedMesh && !this.modelSkinnedMesh) this.modelSkinnedMesh = child;
      });
      this.applyPlayerMaterialFinish(model);
      this.addPlayerGlowOutline(model);
      this.fallback.visible = false;
      this.model = model;
      this.group.add(model);
      this.modelMixer = new THREE.AnimationMixer(model);
      const loadedExternalAnimations = await this.loadExternalPlayerAnimations();
      if (!loadedExternalAnimations) {
        const animations = this.game.assets.getAnimations('player');
        if (animations.length > 0) {
          this.modelMixer.clipAction(animations[0]).play();
        }
      }
    }
    await this.loadBirdVisual();
    this.syncSeeds();
  }

  async loadBirdVisual() {
    if (this.birdModel) return true;
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(TSUKIMI_BIRD_GLB_URL);
      const model = gltf.scene;
      model.name = 'TsukimiBird';
      model.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();
          }
        }
      });
      this.applyPlayerMaterialFinish(model);
      this.fitLoadedModel(model, Config.visuals.birdModelHeight);
      model.rotation.y = Config.visuals.birdModelYaw;
      model.rotation.x = Config.visuals.birdModelPitch;
      this.birdModelBaseY = model.position.y;
      model.visible = false;
      this.birdModel = model;
      this.group.add(model);
      return true;
    } catch (error) {
      console.warn('Failed to load bird GLB. Bird form will reuse the player model.', error);
      return false;
    }
  }

  async loadFbxVisual(url, name, options = {}) {
    try {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
      const loader = new FBXLoader();
      const model = await loader.loadAsync(url);
      model.name = name;
      model.traverse((child) => {
        if (child.isBone) {
          this.registerModelBone(child);
        }
        if (child.isMesh || child.isSkinnedMesh) {
          if (child.isSkinnedMesh && !this.modelSkinnedMesh) this.modelSkinnedMesh = child;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();
          }
        }
      });
      this.applyPlayerMaterialFinish(model);
      this.fitLoadedModel(model, Config.visuals.playerModelHeight);
      this.addPlayerGlowOutline(model);
      model.rotation.y = Config.visuals.playerModelYaw;
      this.modelBaseY = model.position.y;
      this.fallback.visible = false;
      this.model = model;
      this.group.add(model);
      this.modelMixer = new THREE.AnimationMixer(model);
      const loadedAnimations = options.useFbxAnimations === false
        ? false
        : await this.loadMatchingFbxAnimations(options);
      const useEmbeddedAnimation = options.useEmbeddedAnimation ?? Config.visuals.useEmbeddedPlayerAnimation;
      if (!loadedAnimations && useEmbeddedAnimation && model.animations?.length > 0) {
        this.modelMixer.clipAction(model.animations[0]).play();
      }
      return true;
    } catch (error) {
      console.warn('Failed to load player FBX. Falling back to primitive player.', error);
      return false;
    }
  }

  async loadGltfVisual(url, name, options = {}) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      const sourceModel = gltf.scene;
      const model = this.createCorrectedGltfPlayerModel(
        sourceModel,
        name,
        options.axisFix ?? Config.visuals.playerGlbAxisFix
      );
      sourceModel.traverse((child) => {
        if (child.isBone) {
          this.registerModelBone(child);
        }
        if (child.isMesh || child.isSkinnedMesh) {
          if (child.isSkinnedMesh && !this.modelSkinnedMesh) this.modelSkinnedMesh = child;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();
          }
        }
      });
      this.applyPlayerMaterialFinish(model);
      this.fitLoadedModel(model, Config.visuals.playerModelHeight);
      this.addPlayerGlowOutline(model);
      model.rotation.y = Config.visuals.playerModelYaw;
      this.modelBaseY = model.position.y;
      this.fallback.visible = false;
      this.model = model;
      this.group.add(model);
      this.modelMixer = new THREE.AnimationMixer(model);
      const loadedAnimations = options.useFbxAnimations === false
        ? false
        : await this.loadMatchingFbxAnimations(options);
      const useEmbeddedAnimation = options.useEmbeddedAnimation ?? Config.visuals.useEmbeddedPlayerAnimation;
      if (!loadedAnimations && useEmbeddedAnimation && gltf.animations && gltf.animations.length > 0) {
        this.modelMixer.clipAction(gltf.animations[0]).play();
      }
      return true;
    } catch (error) {
      console.warn('Failed to load player GLB. Falling back to primitive player.', error);
      return false;
    }
  }

  createCorrectedGltfPlayerModel(sourceModel, name, axisFix) {
    const model = new THREE.Group();
    model.name = name;
    sourceModel.name = `${name}_Source`;
    if (axisFix === 'zUpToYUp') {
      sourceModel.rotation.x -= Math.PI * 0.5;
    }
    model.add(sourceModel);
    return model;
  }

  fitLoadedModel(model, targetHeight) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0.0001) {
      model.scale.multiplyScalar(targetHeight / size.y);
      model.updateMatrixWorld(true);
      const fittedBox = new THREE.Box3().setFromObject(model);
      const center = fittedBox.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.y -= fittedBox.min.y;
      model.position.z -= center.z;
    }
  }

  registerModelBone(bone) {
    this.boneNames.add(bone.name);
    this.boneAliases.set(bone.name, bone.name);
    this.boneAliases.set(bone.name.replace(/:/g, ''), bone.name);
    this.bones[bone.name] = bone;
    this.baseBoneQuaternions.set(bone.name, bone.quaternion.clone());
    const lower = bone.name.toLowerCase();
    if (lower.includes('arm') || lower.includes('shoulder') || lower.includes('hand')) this.armBones.push(bone);
    if (lower.includes('leg') || lower.includes('thigh') || lower.includes('foot')) this.legBones.push(bone);
  }

  async loadMatchingFbxAnimations(options = {}) {
    if (!Config.visuals.usePlayerFbxAnimations || !this.model || !this.modelMixer) return false;
    try {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
      const loader = new FBXLoader();
      const animationUrls = options.fbxAnimations ?? DEFAULT_FBX_ANIMATIONS;
      const sources = [
        { key: 'idle', url: animationUrls.idle, speed: Config.visuals.playerIdleAnimationSpeed },
        { key: 'run', url: animationUrls.run, speed: Config.visuals.playerRunAnimationSpeed },
        { key: 'react', url: animationUrls.react, speed: Config.visuals.playerReactAnimationSpeed, oneShot: true },
        { key: 'dying', url: animationUrls.dying, speed: Config.visuals.playerDyingAnimationSpeed, oneShot: true, clampWhenFinished: true }
      ].filter((source) => source.url);
      for (const source of sources) {
        const fbx = await loader.loadAsync(source.url);
        const clip = fbx.animations?.[0];
        if (!clip) continue;
        const sameRigClip = this.createSameRigClip(clip, source.key);
        if (sameRigClip.tracks.length === 0) continue;
        const action = this.modelMixer.clipAction(sameRigClip);
        action.setLoop(source.oneShot ? THREE.LoopOnce : THREE.LoopRepeat, source.oneShot ? 1 : Infinity);
        action.enabled = !source.oneShot;
        action.clampWhenFinished = source.clampWhenFinished ?? false;
        action.setEffectiveTimeScale(source.speed);
        action.setEffectiveWeight(source.key === 'idle' ? 1 : 0);
        if (!source.oneShot) action.play();
        this.modelActions[source.key] = action;
        this.modelActionConfigs[source.key] = source;
      }
      if (options.burstVrmaUrl) await this.loadVrmaAnimation('burst', options.burstVrmaUrl);
      if (!this.modelActions.idle && !this.modelActions.run) return false;
      this.activeModelAction = this.modelActions.idle ? 'idle' : Object.keys(this.modelActions)[0];
      for (const [key, action] of Object.entries(this.modelActions)) {
        action.setEffectiveWeight(key === this.activeModelAction ? 1 : 0);
      }
      this.usesExternalAnimation = true;
      return true;
    } catch (error) {
      console.warn('Failed to load matching player FBX animations.', error);
      return false;
    }
  }

  createSameRigClip(clip, name) {
    const tracks = [];
    for (const track of clip.tracks) {
      const separator = track.name.lastIndexOf('.');
      if (separator < 0) continue;
      const boneName = track.name.slice(0, separator);
      const property = track.name.slice(separator + 1);
      const targetBoneName = this.boneAliases.get(boneName);
      if (!targetBoneName) continue;
      if (property !== 'quaternion') continue;
      const clonedTrack = track.clone();
      clonedTrack.name = `${targetBoneName}.${property}`;
      tracks.push(clonedTrack);
    }
    return new THREE.AnimationClip(name, clip.duration, tracks);
  }

  async loadVrmaAnimation(name, url) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      const sourceClip = gltf.animations?.[0];
      if (!sourceClip) return false;
      const clip = this.createVrmaRetargetedClip(sourceClip, name);
      if (clip.tracks.length === 0) return false;
      const source = {
        key: name,
        speed: Config.visuals.playerBurstAnimationSpeed,
        oneShot: true
      };
      const action = this.modelMixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.enabled = false;
      action.setEffectiveTimeScale(source.speed);
      action.setEffectiveWeight(0);
      this.modelActions[name] = action;
      this.modelActionConfigs[name] = source;
      return true;
    } catch (error) {
      console.warn('Failed to load Kiichigo burst VRMA.', error);
      return false;
    }
  }

  createVrmaRetargetedClip(clip, name) {
    const tracks = [];
    const sourceQuaternion = new THREE.Quaternion();
    const targetQuaternion = new THREE.Quaternion();
    for (const track of clip.tracks) {
      const separator = track.name.lastIndexOf('.');
      if (separator < 0) continue;
      const sourceBoneName = track.name.slice(0, separator);
      const property = track.name.slice(separator + 1);
      const targetBoneName = VRMA_TO_MIXAMO_BONES[sourceBoneName];
      const baseQuaternion = this.baseBoneQuaternions.get(targetBoneName);
      if (!targetBoneName || !baseQuaternion || property !== 'quaternion') continue;

      const values = new Float32Array(track.values.length);
      for (let offset = 0; offset < track.values.length; offset += 4) {
        targetQuaternion.copy(baseQuaternion);
        if (!VRMA_STABLE_HEAD_BONES.has(sourceBoneName)) {
          sourceQuaternion.fromArray(track.values, offset);
          targetQuaternion.multiply(sourceQuaternion).normalize();
        }
        targetQuaternion.toArray(values, offset);
      }
      const retargetedTrack = track.clone();
      retargetedTrack.name = `${targetBoneName}.quaternion`;
      retargetedTrack.values = values;
      tracks.push(retargetedTrack);
    }
    return new THREE.AnimationClip(name, clip.duration, tracks);
  }

  async loadExternalPlayerAnimations() {
    if (!Config.visuals.usePlayerFbxAnimations) return false;
    if (!this.model || !this.modelMixer || !this.modelSkinnedMesh) return false;
    try {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
      const { retargetClip } = await import('three/examples/jsm/utils/SkeletonUtils.js');
      const loader = new FBXLoader();
      const sources = [
        { key: 'idle', url: PLAYER_IDLE_FBX_URL, speed: Config.visuals.playerIdleAnimationSpeed },
        { key: 'run', url: PLAYER_RUN_FBX_URL, speed: Config.visuals.playerRunAnimationSpeed },
        { key: 'react', url: PLAYER_REACT_FBX_URL, speed: Config.visuals.playerReactAnimationSpeed, oneShot: true },
        { key: 'dying', url: PLAYER_DYING_FBX_URL, speed: Config.visuals.playerDyingAnimationSpeed, oneShot: true, clampWhenFinished: true }
      ];
      for (const source of sources) {
        const fbx = await loader.loadAsync(source.url);
        const clip = fbx.animations?.[0];
        if (!clip) continue;
        const retargetedClip = this.retargetPlayerClip(fbx, clip, source.key, retargetClip);
        if (retargetedClip.tracks.length === 0) continue;
        const action = this.modelMixer.clipAction(retargetedClip, this.modelSkinnedMesh);
        action.setLoop(source.oneShot ? THREE.LoopOnce : THREE.LoopRepeat, source.oneShot ? 1 : Infinity);
        action.clampWhenFinished = source.clampWhenFinished ?? false;
        action.enabled = !source.oneShot;
        action.setEffectiveTimeScale(source.speed);
        action.setEffectiveWeight(source.key === 'idle' ? 1 : 0);
        if (!source.oneShot) action.play();
        this.modelActions[source.key] = action;
        this.modelActionConfigs[source.key] = source;
      }
      if (!this.modelActions.idle && !this.modelActions.run) return false;
      this.activeModelAction = this.modelActions.idle ? 'idle' : Object.keys(this.modelActions)[0];
      for (const [key, action] of Object.entries(this.modelActions)) {
        action.setEffectiveWeight(key === this.activeModelAction ? 1 : 0);
      }
      this.usesExternalAnimation = true;
      return true;
    } catch (error) {
      console.warn('Failed to load external player FBX animations.', error);
      return false;
    }
  }

  retargetPlayerClip(sourceObject, clip, name, retargetClip) {
    const sourceSkinnedMesh = this.findSkinnedMesh(sourceObject);
    if (!sourceSkinnedMesh || !this.modelSkinnedMesh) {
      return new THREE.AnimationClip(name, 0, []);
    }
    sourceObject.updateMatrixWorld(true);
    this.model.updateMatrixWorld(true);
    const retargetedClip = retargetClip(this.modelSkinnedMesh, sourceSkinnedMesh, clip, {
      names: this.getRetargetBoneNames(),
      hip: 'mixamorigHips',
      hipInfluence: new THREE.Vector3(0, 0, 0),
      preserveBonePositions: true,
      preserveBoneMatrix: true,
      useFirstFramePosition: true,
      fps: name === 'idle' ? 20 : 30
    });
    retargetedClip.name = name;
    this.modelSkinnedMesh.skeleton.pose();
    return retargetedClip;
  }

  findSkinnedMesh(object) {
    let result = null;
    object.traverse((child) => {
      if (!result && child.isSkinnedMesh) result = child;
    });
    return result;
  }

  getRetargetBoneNames() {
    return {
      Hip: 'mixamorigHips',
      Waist: 'mixamorigSpine',
      Spine01: 'mixamorigSpine1',
      Spine02: 'mixamorigSpine2',
      NeckTwist01: 'mixamorigNeck',
      Head: 'mixamorigHead',
      L_Clavicle: 'mixamorigLeftShoulder',
      L_Upperarm: 'mixamorigLeftArm',
      L_Forearm: 'mixamorigLeftForeArm',
      L_Hand: 'mixamorigLeftHand',
      L_Thigh: 'mixamorigLeftUpLeg',
      L_Calf: 'mixamorigLeftLeg',
      L_Foot: 'mixamorigLeftFoot',
      L_ToeBase: 'mixamorigLeftToeBase',
      R_Clavicle: 'mixamorigRightShoulder',
      R_Upperarm: 'mixamorigRightArm',
      R_Forearm: 'mixamorigRightForeArm',
      R_Hand: 'mixamorigRightHand',
      R_Thigh: 'mixamorigRightUpLeg',
      R_Calf: 'mixamorigRightLeg',
      R_Foot: 'mixamorigRightFoot',
      R_ToeBase: 'mixamorigRightToeBase'
    };
  }

  updatePlayerAnimationState(moving) {
    if (!this.usesExternalAnimation) return;
    if (this.dead || this.oneShotAnimationTimer > 0) return;
    const requested = moving && this.form === 'human' ? 'run' : 'idle';
    const nextName = this.modelActions[requested] ? requested : this.activeModelAction;
    if (!nextName) return;
    if (nextName !== this.activeModelAction) {
      const next = this.modelActions[nextName];
      next.reset();
      next.enabled = true;
      next.play();
      this.activeModelAction = nextName;
    }
    for (const [key, action] of Object.entries(this.modelActions)) {
      action.enabled = true;
      action.paused = false;
      action.setEffectiveWeight(key === this.activeModelAction ? 1 : 0);
    }
  }

  playOneShotAnimation(name) {
    const action = this.modelActions[name];
    if (!this.usesExternalAnimation || !action) return 0;
    for (const [key, other] of Object.entries(this.modelActions)) {
      other.enabled = key === name;
      other.paused = false;
      other.setEffectiveWeight(key === name ? 1 : 0);
    }
    action.reset();
    action.enabled = true;
    action.paused = false;
    action.setEffectiveWeight(1);
    action.play();
    this.activeModelAction = name;
    const speed = this.modelActionConfigs[name]?.speed ?? 1;
    const duration = action.getClip().duration / Math.max(0.001, speed);
    this.oneShotAnimationTimer = Math.max(0.05, duration);
    return this.oneShotAnimationTimer;
  }

  resetProceduralPlayerPose() {
    this.resetProceduralBone('Hip');
    this.resetProceduralBone('Pelvis');
    this.resetProceduralBone('Waist');
    this.resetProceduralBone('Spine01');
    this.resetProceduralBone('Spine02');
    this.resetProceduralBone('NeckTwist01');
    this.resetProceduralBone('L_Clavicle');
    this.resetProceduralBone('R_Clavicle');
    this.resetProceduralBone('L_Upperarm');
    this.resetProceduralBone('R_Upperarm');
    this.resetProceduralBone('L_Forearm');
    this.resetProceduralBone('R_Forearm');
    this.resetProceduralBone('L_Hand');
    this.resetProceduralBone('R_Hand');
    this.resetProceduralBone('L_Thigh');
    this.resetProceduralBone('R_Thigh');
    this.resetProceduralBone('L_Calf');
    this.resetProceduralBone('R_Calf');
    this.resetProceduralBone('L_Foot');
    this.resetProceduralBone('R_Foot');
  }

  applyProceduralPlayerPose(run, bird) {
    const time = this.game.elapsed;
    const breath = Math.sin(time * 2.2) * 0.035;
    const stridePhase = time * 12.2;
    const stride = Math.sin(stridePhase);
    const counterStride = -stride;
    const stepBounce = Math.abs(Math.sin(stridePhase));

    this.resetProceduralPlayerPose();

    if (bird) {
      this.setProceduralBonePose('Spine01', -0.08, 0, 0);
      this.setProceduralBonePose('Spine02', -0.12, 0, 0);
      this.setProceduralBonePose('L_Upperarm', -0.9, 0, -0.45);
      this.setProceduralBonePose('R_Upperarm', -0.9, 0, 0.45);
      this.setProceduralBonePose('L_Forearm', -0.42, 0, -0.18);
      this.setProceduralBonePose('R_Forearm', -0.42, 0, 0.18);
      return;
    }

    if (run) {
      this.setProceduralBonePose('Waist', -0.12, 0, stride * 0.025);
      this.setProceduralBonePose('Spine01', -0.18, 0, stride * 0.02);
      this.setProceduralBonePose('Spine02', -0.12, 0, counterStride * 0.014);
      this.setProceduralBonePose('L_Upperarm', -0.82, 0.04, -0.14);
      this.setProceduralBonePose('R_Upperarm', -0.82, -0.04, 0.14);
      this.setProceduralBonePose('L_Forearm', -0.34, 0, -0.08);
      this.setProceduralBonePose('R_Forearm', -0.34, 0, 0.08);
      this.setProceduralBonePose('L_Thigh', stride * 0.34 - 0.04, 0, 0.03);
      this.setProceduralBonePose('R_Thigh', counterStride * 0.34 - 0.04, 0, -0.03);
      this.setProceduralBonePose('L_Calf', Math.max(0, -stride) * 0.34 + stepBounce * 0.025, 0, 0);
      this.setProceduralBonePose('R_Calf', Math.max(0, -counterStride) * 0.34 + stepBounce * 0.025, 0, 0);
      return;
    }

    this.setProceduralBonePose('Waist', breath, 0, 0);
    this.setProceduralBonePose('Spine01', 0.04 + breath, 0, 0);
    this.setProceduralBonePose('Spine02', -0.02 + breath * 0.45, 0, 0);
    this.setProceduralBonePose('L_Upperarm', -0.08, 0, -0.08);
    this.setProceduralBonePose('R_Upperarm', -0.08, 0, 0.08);
    this.setProceduralBonePose('L_Forearm', -0.04, 0, -0.03);
    this.setProceduralBonePose('R_Forearm', -0.04, 0, 0.03);
  }

  resetProceduralBone(name) {
    const bone = this.bones[name];
    const base = this.baseBoneQuaternions.get(name);
    if (bone && base) bone.quaternion.copy(base);
  }

  setProceduralBonePose(name, x, y, z) {
    const bone = this.bones[name];
    const base = this.baseBoneQuaternions.get(name);
    if (!bone || !base) return;
    poseEuler.set(x, y, z, 'XYZ');
    poseQuat.setFromEuler(poseEuler);
    bone.quaternion.copy(base).multiply(poseQuat);
  }

  createFallbackBody() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.52, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x85d8ff, roughness: 0.58 })
    );
    body.position.y = 0.95;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({ color: 0xf5cfb1, roughness: 0.62 })
    );
    head.position.y = 1.92;
    head.castShadow = true;
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.28, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    nose.position.set(0, 1.92, -0.33);
    nose.rotation.x = Math.PI * 0.5;
    nose.castShadow = true;
    group.add(body, head, nose);
    return group;
  }

  createUnderLight() {
    if (Config.visuals.playerUnderLightIntensity <= 0) return null;
    const light = new THREE.PointLight(
      0xbfd7ff,
      Config.visuals.playerUnderLightIntensity,
      Config.visuals.playerUnderLightRange,
      Config.visuals.playerUnderLightDecay
    );
    light.name = 'PlayerUnderLight';
    light.position.set(-1.3, 0.18, 1.55);
    light.castShadow = false;
    return light;
  }

  createContactShadow() {
    if (!Config.visuals.playerContactShadow) return null;
    const material = new THREE.MeshBasicMaterial({
      color: Config.visuals.playerContactShadowColor,
      map: getContactShadowTexture(),
      transparent: true,
      opacity: Config.visuals.playerContactShadowOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      material
    );
    shadow.name = 'PlayerContactShadow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.035;
    shadow.renderOrder = 1;
    return shadow;
  }

  updateContactShadow() {
    if (!this.contactShadow) return;
    const birdLift = clamp(
      this.visualHeight / Math.max(0.001, Config.player.birdHeight),
      0,
      1
    );
    const baseScale = this.form === 'bird' ? 1.12 + birdLift * 0.45 : 1.12;
    const opacityScale = this.dead ? 0.48 : this.form === 'bird' ? 0.48 + (1 - birdLift) * 0.22 : 1;
    this.contactShadow.position.set(this.position.x, 0.035, this.position.z);
    this.contactShadow.scale.set(baseScale, baseScale * 0.58, 1);
    this.contactShadow.material.opacity = Config.visuals.playerContactShadowOpacity * opacityScale;
    this.contactShadow.visible = this.group.visible;
  }

  applyPlayerMaterialFinish(object) {
    object.traverse((child) => {
      if (!(child.isMesh || child.isSkinnedMesh) || !child.material) return;
      if (Config.visuals.playerUseUnlitMaterial) {
        child.material = Array.isArray(child.material)
          ? child.material.map((material) => this.createPlayerUnlitMaterial(material))
          : this.createPlayerUnlitMaterial(child.material);
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        this.applyMatteFinish(material);
      }
    });
  }

  addPlayerGlowOutline(object) {
    if (!Config.visuals.playerGlowOutline) return;
    this.addGlowOutline(object, {
      color: 0xb9f4ff,
      opacity: 0.16,
      scale: 1.035,
      namePrefix: 'Player'
    });
  }

  createPlayerUnlitMaterial(source) {
    const color = new THREE.Color(Config.visuals.playerUnlitColor);
    const material = new THREE.MeshBasicMaterial({
      map: null,
      color,
      side: THREE.DoubleSide,
      transparent: false,
      alphaTest: 0,
      depthWrite: true
    });
    material.name = source?.name ? `${source.name}_PlayerUnlit` : 'PlayerUnlit';
    material.needsUpdate = true;
    return material;
  }

  applyMatteFinish(material) {
    if (!material) return;
    material.transparent = false;
    material.opacity = 1;
    material.alphaTest = 0;
    material.alphaMap = null;
    material.depthWrite = true;
    material.blending = THREE.NormalBlending;
    if ('roughness' in material) material.roughness = Config.visuals.playerMatteRoughness;
    if ('roughnessMap' in material) material.roughnessMap = null;
    if ('metalness' in material) material.metalness = 0;
    if ('metalnessMap' in material) material.metalnessMap = null;
    if ('envMapIntensity' in material) material.envMapIntensity = Config.visuals.playerMaterialEnvIntensity;
    if ('clearcoat' in material) material.clearcoat = 0;
    if ('clearcoatMap' in material) material.clearcoatMap = null;
    if ('clearcoatRoughness' in material) material.clearcoatRoughness = 1;
    if ('sheen' in material) material.sheen = 0;
    if ('iridescence' in material) material.iridescence = 0;
    if ('reflectivity' in material) material.reflectivity = Config.visuals.playerMaterialReflectivity;
    if ('shininess' in material) material.shininess = 0;
    if ('specularIntensity' in material) material.specularIntensity = Config.visuals.playerMaterialSpecularIntensity;
    if ('specularMap' in material) material.specularMap = null;
    if (material.specular?.isColor) material.specular.set(0x252525);
    if (material.specularColor?.isColor) material.specularColor.set(0x303030);
    material.needsUpdate = true;
  }

  syncSeeds() {
    while (this.seeds.length < this.seedCount) {
      const drone = this.game.cloneGameplayModel('drone');
      const seed = drone
        ? this.createDroneVisual(drone)
        : (Config.visuals.useAssetModels ? this.game.assets?.cloneModel('seed') : null)
        ?? this.createFallbackSeed();
      seed.name = `Seed${this.seeds.length + 1}`;
      if (!drone) seed.scale.setScalar(0.42);
      seed.userData.aimHold = 0;
      seed.userData.aimWorldAngle = 0;
      seed.userData.spinAngle = this.game.elapsed * Config.visuals.droneSpinSpeed;
      seed.userData.fallVelocity = 0;
      seed.userData.fallDriftX = 0;
      seed.userData.fallDriftZ = 0;
      this.seedOrbit.add(seed);
      this.seeds.push(seed);
    }
    while (this.seeds.length > this.seedCount) {
      const seed = this.seeds.pop();
      seed.removeFromParent();
    }
  }

  addGlowOutline(object, {
    color = 0x9ff7ff,
    opacity = 0.2,
    scale = 1.06,
    namePrefix = 'Model'
  } = {}) {
    const meshes = [];
    object.traverse((child) => {
      if (child.userData?.isGlowOutline) return;
      if ((child.isMesh || child.isSkinnedMesh) && child.geometry) meshes.push(child);
    });

    for (const mesh of meshes) {
      if (!mesh.parent) continue;
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const outline = mesh.isSkinnedMesh
        ? new THREE.SkinnedMesh(mesh.geometry, material)
        : new THREE.Mesh(mesh.geometry, material);
      outline.name = `${namePrefix}_${mesh.name || 'Part'}_GlowOutline`;
      outline.userData.isGlowOutline = true;
      outline.castShadow = false;
      outline.receiveShadow = false;
      outline.frustumCulled = mesh.frustumCulled;
      outline.position.copy(mesh.position);
      outline.quaternion.copy(mesh.quaternion);
      outline.scale.copy(mesh.scale).multiplyScalar(scale);
      outline.renderOrder = (mesh.renderOrder ?? 0) - 1;
      if (mesh.isSkinnedMesh) {
        outline.bind(mesh.skeleton, mesh.bindMatrix);
      }
      mesh.parent.add(outline);
    }
  }

  createDroneVisual(model) {
    model.name = 'DroneVisual';
    this.applySeedMaterialFinish(model);
    if (Config.visuals.seedGlowOutline) {
      this.addGlowOutline(model, {
        color: 0x9ff7ff,
        opacity: 0.22,
        scale: 1.08,
        namePrefix: 'Drone'
      });
    }
    return model;
  }

  applySeedMaterialFinish(object) {
    object.traverse((child) => {
      if (!(child.isMesh || child.isSkinnedMesh) || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if ('emissiveIntensity' in material) material.emissiveIntensity = Config.visuals.seedEmissiveIntensity;
        if (material.emissive?.isColor) material.emissive.set(0x000000);
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.needsUpdate = true;
      }
    });
  }

  createFallbackSeed() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xc7d4b6 })
    );
  }

  toggleForm() {
    if (this.game.state !== 'playing') return;
    if (this.form === 'human') {
      if (this.mp <= 5) {
        this.game.showMessage('MP不足');
        return;
      }
      this.form = this.game.isWaterPosition(this.position) ? 'fish' : 'bird';
      this.game.cameraRig.startTransition(this.form);
      this.game.playSfx('transformBird', { volume: 0.85 });
    } else {
      this.returnToHuman(true);
    }
  }

  returnToHuman(withProtection) {
    if (this.form === 'human') return;
    this.form = 'human';
    this.diveState = 'ready';
    if (this.diveTarget) this.diveTarget.claimed = false;
    this.diveTarget = null;
    this.game.cameraRig.startTransition('human');
    if (withProtection) {
      this.invincibleTimer = Math.max(this.invincibleTimer, Config.player.invincibleAfterBird);
      this.phaseTimer = Math.max(this.phaseTimer, Config.player.phaseAfterBird);
      this.attackLockTimer = Math.max(this.attackLockTimer, Config.player.attackLockAfterBird);
    }
    this.game.playSfx('transformHuman', { volume: 0.82 });
  }

  update(dt, input) {
    if (input.actionPressed('transform') && !(this.stunTimer > 0)) this.toggleForm();
    this.autoTimer = Math.max(0, this.autoTimer - dt);
    this.specialTimer = Math.max(0, this.specialTimer - dt);
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.phaseTimer = Math.max(0, this.phaseTimer - dt);
    this.attackLockTimer = Math.max(0, this.attackLockTimer - dt);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    this.diveCooldown = Math.max(0, this.diveCooldown - dt);
    this.burstCooldownTimer = Math.max(0, this.burstCooldownTimer - dt);
    this.updateBurstSequence(dt);
    this.pickupMagnetTimer = Math.max(0, this.pickupMagnetTimer - dt);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.updateGrab(dt);

    if (this.stunTimer <= 0) this.updateMovement(dt, input);
    this.updateFormResources(dt);
    this.updateDive(dt);
    this.updateCombat(dt, input);
    this.updateSeeds(dt);
    this.updateVisualPose(dt);
    this.updateContactShadow();
  }

  updateMovement(dt, input) {
    const x = input.movementX();
    const z = input.movementZ();
    const movementStrength = Math.min(1, Math.hypot(x, z));
    normalizeXZ(tempVec, x, z);
    const hasMovementInput = movementStrength > 0.001;
    const boost = this.speedBoostTimer > 0 ? Config.pickups.speedBoostMultiplier : 1;
    const grabSlow = this.grabbedBy ? Config.enemy.hand.grabSlow : 1;
    const speed = (this.form === 'bird' ? this.birdSpeed : this.form === 'fish' ? Config.player.fishSpeed : this.humanSpeed) * boost * grabSlow;
    const diveLocked = this.form === 'bird' && (this.diveState === 'warning' || this.diveState === 'dive');

    if (this.form === 'bird') {
      if (hasMovementInput) {
        const targetAngle = Math.atan2(tempVec.x, tempVec.z);
        const maxTurn = Config.player.birdTurnRate * dt;
        this.faceAngle += clamp(signedAngleDifference(targetAngle, this.faceAngle), -maxTurn, maxTurn);
      }
      this.moveAngle = this.faceAngle;

      if (!diveLocked) {
        tempVec2.set(Math.sin(this.faceAngle), 0, Math.cos(this.faceAngle));
        this.position.x += tempVec2.x * speed * dt;
        this.position.z += tempVec2.z * speed * dt;
      }

      const beforeClampX = this.position.x;
      const beforeClampZ = this.position.z;
      clampToCircle(this.position, Config.map.radius - 2);
      const clampedAtBoundary = Math.abs(this.position.x - beforeClampX) + Math.abs(this.position.z - beforeClampZ) > 0.0001;
      if (clampedAtBoundary && !diveLocked) {
        const inwardAngle = Math.atan2(-this.position.x, -this.position.z);
        const maxBoundaryTurn = Config.player.birdBoundaryTurnRate * dt;
        this.faceAngle += clamp(signedAngleDifference(inwardAngle, this.faceAngle), -maxBoundaryTurn, maxBoundaryTurn);
        this.moveAngle = this.faceAngle;
      }
    } else {
      this.position.x += tempVec.x * speed * movementStrength * dt;
      this.position.z += tempVec.z * speed * movementStrength * dt;
      clampToCircle(this.position, Config.map.radius - 2);
      if (!this.game.isWaterStage) this.game.resolveBuildingCollision(this.position, this.radius);
      clampToCircle(this.position, Config.map.radius - 2);
      if (hasMovementInput) {
        this.moveAngle = Math.atan2(tempVec.x, tempVec.z);
        if (this.attackLockTimer <= 0) this.faceAngle = this.moveAngle;
      }
    }

    if (this.form === 'fish' && !this.game.isWaterPosition(this.position)) {
      this.returnToHuman(false);
    }

    const targetHeight = this.form === 'bird' ? Config.player.birdHeight : this.form === 'fish' ? 0.35 : Config.player.humanHeight;
    if (this.diveState === 'ready') {
      this.visualHeight += (targetHeight - this.visualHeight) * Math.min(1, dt * Config.player.birdFloatSpeed);
    }
    this.group.position.y = this.visualHeight;
  }

  updateFormResources(dt) {
    if (this.form === 'human') {
      // 吸水根の乾いた円の中では回復しない（Config.enemy.rootsucker.dryRegenScale 倍）
      this.onDryGround = this.game.isOnDryGround?.(this.position) ?? false;
      const regenScale = this.onDryGround ? Config.enemy.rootsucker.dryRegenScale : 1;
      this.mp = clamp(this.mp + this.humanRegenMp * regenScale * dt, 0, this.maxMp);
    } else {
      this.onDryGround = false;
      const formCost = (this.form === 'fish' ? Config.player.fishMpCost : this.birdMpCost) * this.formMpCostScale;
      this.mp = clamp(this.mp - formCost * dt, 0, this.maxMp);
      if (this.mp <= 0) this.returnToHuman(true);
    }
  }

  updateCombat(dt, input) {
    if (this.form === 'human') {
      if (input.actionPressed('burst')) this.tryBurst();
      this.tryAutoShoot();
      this.trySpecialEggShot();
      this.updatePulse(dt);
    } else if (this.form === 'fish') {
      this.tryFishBite();
    } else if (this.burst >= Config.player.burstMax) {
      this.game.hint = 'バーストは今使えません';
    }
  }

  tryFishBite() {
    if (this.specialTimer > 0) return;
    if (this.tryFishBiteBoss()) return;
    const target = this.findNearestEgg(Config.player.fishEggRange, false);
    if (!target || !target.aquatic) return;
    this.faceAngle = angleToXZ(this.position, target.position);
    target.takeDamage(target.hp + 1, 'fishBite');
    this.specialTimer = Config.player.fishBiteCooldown;
    this.game.spawnDiveImpact(target.position);
  }

  // The floodgate mother (src/bosses.js) only counts bites while it is submerged; its body is larger, so the reach is too.
  tryFishBiteBoss() {
    const mother = this.game.motherEgg;
    if (!mother || mother.dead || !mother.bossType?.fishBite) return false;
    const cfg = Config.boss.floodgateMother;
    const reach = Config.player.fishEggRange + cfg.biteReach;
    if (horizontalDistanceSq(this.position, mother.position) > reach * reach) return false;
    if (!mother.bossType.fishBite(mother)) return false;
    this.faceAngle = angleToXZ(this.position, mother.position);
    this.specialTimer = cfg.biteCooldown;
    this.game.spawnDiveImpact(mother.position);
    return true;
  }

  tryAutoShoot() {
    if (this.attackLockTimer > 0 || this.autoTimer > 0) return;
    const target = this.findNearestEnemy(Config.player.autoRange);
    if (!target) return;
    this.fireFromSeeds(target.position, {
      kind: 'player',
      // A6 満ちる水: MP が多いあいだ威力が上がる。
      damage: this.autoDamage * (this.game.hasSynergy('fullWater') ? fullWaterScale(this.mp, this.maxMp, Config.synergy.fullWater) : 1),
      speed: Config.player.autoProjectileSpeed,
      radius: 0.35,
      pierce: this.pierce,
      // A6 貫く雨: 敵を貫くたびに威力が上がる。
      pierceGain: this.game.hasSynergy('piercingRain') ? Config.synergy.piercingRain.gain : 0
    });
    this.autoTimer = this.autoInterval;
  }

  trySpecialEggShot() {
    if (this.attackLockTimer > 0 || this.specialTimer > 0) return;
    const target = this.findNearestEgg(Config.player.specialEggRange, true);
    if (!target) return;
    this.fireFromSeeds(target.position, {
      kind: 'eggSpecial',
      damage: this.specialDamage,
      speed: Config.player.specialProjectileSpeed,
      radius: 0.33,
      pierce: 0
    });
    this.specialTimer = this.specialInterval;
  }

  fireFromSeeds(targetPosition, spec) {
    const count = Math.max(1, this.seeds.length);
    const shotAngle = angleToXZ(this.position, targetPosition);
    for (let i = 0; i < count; i++) {
      const seed = this.seeds[i];
      const origin = new THREE.Vector3();
      seed.getWorldPosition(origin);
      const spread = (i - (count - 1) * 0.5) * 0.05;
      const aim = targetPosition.clone();
      aim.x += Math.sin(shotAngle + Math.PI * 0.5) * spread;
      aim.z += Math.cos(shotAngle + Math.PI * 0.5) * spread;
      aim.y = spec.kind === 'eggSpecial' ? 0.75 : 1.1;
      seed.userData.aimWorldAngle = angleToXZ(origin, aim);
      seed.userData.aimHold = 0.35;
      this.game.spawnProjectile(origin, aim, spec);
    }
    if (spec.kind === 'player') this.game.playSfx('playerShot', { volume: 0.48, cooldown: 0.055 });
  }

  tryBurst() {
    if (this.burstCooldownTimer > 0) {
      this.game.showMessage(`\u30d0\u30fc\u30b9\u30c8\u518d\u4f7f\u7528\u307e\u3067 ${Math.ceil(this.burstCooldownTimer)}\u79d2`);
      return;
    }
    if (this.burst < Config.player.burstMax) {
      this.game.showMessage('\u30d0\u30fc\u30b9\u30c8\u30b2\u30fc\u30b8\u4e0d\u8db3');
      return;
    }
    this.game.playSfx('burstPre', { volume: 0.8 });
    this.burst = 0;
    this.burstCooldownTimer = Config.player.burstCooldown * this.burstCooldownScale;
    this.invincibleTimer = Math.max(this.invincibleTimer, Config.player.burstInvincible);
    if (this.game.characterId === 'tsukimi') this.performTsukimiBurst();
    else if (this.game.characterId === 'kiichigo') this.startKiichigoBurst();
    else this.performAkameBurst();
  }

  performAkameBurst() {
    const range = Config.player.burstRange + 1;
    this.game.spawnBurstEffect(this.position, range);
    const enemies = this.game.enemyGrid.query(this.position, range, this.game.scratchEnemies);
    for (const enemy of enemies) enemy.takeDamage(Config.player.burstEnemyDamage + 15, this.position, true, false);
    for (const egg of this.game.findEggsInRadius(this.position, range, true)) {
      const damage = egg.isMother ? Config.player.burstMotherDamageCap : Config.player.burstEggDamage;
      egg.takeDamage(damage, 'burst');
    }
    for (const building of this.game.findBuildingsInRadius(this.position, range)) {
      this.game.damageBuilding(building, Config.player.burstEnemyDamage + 15, this.position);
    }
    this.game.shake = Math.max(this.game.shake, 0.62);
    this.game.playBurstSound();
    this.game.playVoice('burst', { volume: 0.92, cooldown: 2.2 });
  }

  performTsukimiBurst() {
    this.burstBeamTimer = Config.player.tsukimiBeamDuration;
    this.burstBeamDamageTimer = 0;
    this.game.startTsukimiBurstBeam(
      this,
      Config.player.tsukimiBeamLength,
      Config.player.tsukimiBeamWidth,
      Config.player.tsukimiBeamDuration
    );
    this.game.shake = Math.max(this.game.shake, 0.42);
    this.game.playSfx('tsukimiBurst', { volume: 0.94, cooldown: 2.2 });
    this.game.playVoice('burst', { volume: 0.92, cooldown: 2.2 });
  }

  performTsukimiBeamTick() {
    const length = Config.player.tsukimiBeamLength;
    const width = Config.player.tsukimiBeamWidth;
    for (const enemy of this.game.enemies) {
      if (!enemy.dead && this.isInForwardStrip(enemy.position, this.faceAngle, length, width)) {
        enemy.takeDamage(Config.player.tsukimiBeamEnemyDamage, this.position, false, false);
      }
    }
    const eggs = [...this.game.eggs, ...bossTargets(this.game)];
    for (const egg of eggs) {
      if (egg.dead || !this.isInForwardStrip(egg.position, this.faceAngle, length, width)) continue;
      egg.takeDamage(egg.isMother ? Config.player.tsukimiBeamMotherDamage : Config.player.tsukimiBeamEggDamage, 'burst');
    }
    for (const building of this.game.buildingObstacles) {
      if (!building.dead && this.isInForwardStrip(building.position, this.faceAngle, length, width)) {
        this.game.damageBuilding(building, Config.player.tsukimiBeamEnemyDamage, this.position);
      }
    }
  }

  startKiichigoBurst() {
    this.burstSlashCount = Config.player.kiichigoSlashCount;
    this.burstSlashTimer = 0;
    this.burstBeamTimer = 0;
    this.burstBeamDamageTimer = 0;
    this.playOneShotAnimation('burst');
    this.game.playSfx('kiichigoBurst', { volume: 0.94, cooldown: 4.2 });
    this.game.playVoice('burst', { volume: 0.92, cooldown: 4.2 });
  }

  updateBurstSequence(dt) {
    if (this.dead) return;
    if (this.burstBeamTimer > 0) {
      this.burstBeamTimer = Math.max(0, this.burstBeamTimer - dt);
      this.burstBeamDamageTimer -= dt;
      while (this.burstBeamTimer > 0 && this.burstBeamDamageTimer <= 0) {
        this.performTsukimiBeamTick();
        this.burstBeamDamageTimer += Config.player.tsukimiBeamTickInterval;
      }
    }
    if (this.burstSlashCount <= 0) return;
    this.burstSlashTimer -= dt;
    while (this.burstSlashCount > 0 && this.burstSlashTimer <= 0) {
      const index = Config.player.kiichigoSlashCount - this.burstSlashCount;
      this.performKiichigoSlash(index);
      this.burstSlashCount -= 1;
      this.burstSlashTimer += Config.player.kiichigoSlashInterval;
    }
  }

  performKiichigoSlash(index) {
    const slashAngle = this.faceAngle;
    const range = Config.player.kiichigoSlashRange;
    const hitEnemies = new Set();
    const hitEggs = new Set();
    const hitBuildings = new Set();
    this.game.spawnKiichigoSlashEffect(this.position, slashAngle, range, index, (position, hitRadius) => {
      for (const enemy of this.game.enemyGrid.query(position, hitRadius, this.game.scratchEnemies)) {
        if (enemy.dead || hitEnemies.has(enemy)) continue;
        hitEnemies.add(enemy);
        enemy.takeDamage(Config.player.kiichigoSlashEnemyDamage, position, true, false);
      }
      for (const egg of this.game.findEggsInRadius(position, hitRadius, true)) {
        if (egg.dead || hitEggs.has(egg)) continue;
        hitEggs.add(egg);
        egg.takeDamage(egg.isMother ? Config.player.kiichigoSlashMotherDamage : Config.player.kiichigoSlashEggDamage, 'burst');
      }
      for (const building of this.game.findBuildingsInRadius(position, hitRadius)) {
        if (building.dead || hitBuildings.has(building)) continue;
        hitBuildings.add(building);
        this.game.damageBuilding(building, Config.player.kiichigoSlashEnemyDamage, position);
      }
    });
    this.game.shake = Math.max(this.game.shake, 0.28);
    this.game.playSfx('burstSpread', { volume: 0.62, cooldown: 0.06 });
  }

  isInForwardStrip(position, angle, length, width) {
    const dx = position.x - this.position.x;
    const dz = position.z - this.position.z;
    const forward = dx * Math.sin(angle) + dz * Math.cos(angle);
    const lateral = Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle));
    return forward >= -1.2 && forward <= length && lateral <= width * 0.5;
  }

  isInSlashArc(position, angle, range, arc) {
    if (horizontalDistanceSq(this.position, position) > range * range) return false;
    return Math.abs(signedAngleDifference(angleToXZ(this.position, position), angle)) <= arc * 0.5;
  }

  updatePulse(dt) {
    if (this.pulseLevel <= 0) return;
    this.pulseTimer -= dt;
    if (this.pulseTimer > 0) return;
    this.pulseTimer = Math.max(2.2, Config.skill.pulseInterval - this.pulseLevel * 0.35);
    this.firePulse();
  }

  // 範囲パルスを 1 回出す。A6 落ちる鼓動（急降下の着地）からも呼ぶ。
  firePulse(damageScale = 1, rangeScale = 1) {
    const range = this.pulseRange * rangeScale;
    const damage = this.pulseDamage * damageScale;
    this.game.spawnPulseEffect(this.position, range);
    const enemies = this.game.enemyGrid.query(this.position, range, this.game.scratchEnemies);
    for (const enemy of enemies) enemy.takeDamage(damage, this.position);
    for (const egg of this.game.findEggsInRadius(this.position, range)) {
      egg.takeDamage(Math.max(5, damage * 0.45), 'pulse');
    }
    for (const building of this.game.findBuildingsInRadius(this.position, range)) {
      this.game.damageBuilding(building, damage, this.position);
    }
  }

  updateDive(dt) {
    if (this.form !== 'bird') return;
    if (this.diveState === 'ready') {
      if (this.diveCooldown > 0 || this.stunTimer > 0) return;
      const target = this.findNearestEgg(Config.player.birdEggDetectRange, false);
      const motherTarget = this.findMotherForDive();
      this.startDive(this.findShadowForDive() ?? motherTarget ?? this.findCrierForDive() ?? target);
    } else if (this.diveState === 'warning') {
      this.diveTimer -= dt;
      if (!this.diveTarget || this.diveTarget.dead) {
        this.cancelDive();
        return;
      }
      this.position.x += (this.diveTarget.position.x - this.position.x) * Math.min(1, dt * 5);
      this.position.z += (this.diveTarget.position.z - this.position.z) * Math.min(1, dt * 5);
      this.game.spawnDiveWarning(this.diveTarget.position);
      if (this.diveTimer <= 0) {
        this.diveState = 'dive';
        this.diveTimer = Config.player.birdDiveDuration;
        this.diveStart.copy(this.position);
        this.diveStart.y = this.visualHeight;
        this.diveEnd.copy(this.diveTarget.position);
        this.diveEnd.y = 0.75;
      }
    } else if (this.diveState === 'dive') {
      this.diveTimer -= dt;
      const t = 1 - clamp(this.diveTimer / Config.player.birdDiveDuration, 0, 1);
      this.position.x = lerpValue(this.diveStart.x, this.diveEnd.x, smooth01(t));
      this.position.z = lerpValue(this.diveStart.z, this.diveEnd.z, smooth01(t));
      this.visualHeight = lerpValue(this.diveStart.y, this.diveEnd.y, smooth01(t));
      if (this.diveTimer <= 0) {
        this.resolveDiveHit();
        this.diveState = 'return';
        this.diveTimer = Config.player.birdDiveReturn;
      }
    } else if (this.diveState === 'return') {
      this.diveTimer -= dt;
      const t = 1 - clamp(this.diveTimer / Config.player.birdDiveReturn, 0, 1);
      this.visualHeight = lerpValue(0.75, Config.player.birdHeight, smooth01(t));
      if (this.diveTimer <= 0) {
        this.diveState = 'ready';
        this.diveCooldown = Config.player.birdDiveCooldown;
        if (this.diveTarget) this.diveTarget.claimed = false;
        this.diveTarget = null;
      }
    }
  }

  startDive(target) {
    if (!target || target.dead || target.claimed) return;
    target.claimed = true;
    this.diveTarget = target;
    this.diveState = 'warning';
    this.diveTimer = Config.player.birdDiveWarn;
  }

  cancelDive() {
    if (this.diveTarget) this.diveTarget.claimed = false;
    this.diveTarget = null;
    this.diveState = 'ready';
    this.diveCooldown = Config.player.birdDiveCooldown;
  }

  resolveDiveHit() {
    if (!this.diveTarget || this.diveTarget.dead) return;
    if (this.diveTarget.isMother) {
      this.diveTarget.takeDamage(this.birdMotherDiveDamage, 'birdDive');
    } else if (this.diveTarget.type === 'shadow') {
      this.diveTarget.takeDamage(this.birdDiveDamage * Config.enemy.shadow.diveDamageScale, this.position, true);
    } else if (this.diveTarget.type === 'crier') {
      this.diveTarget.takeDamage(this.diveTarget.hp + 10, this.position, true);
      if (this.game.crierStats) this.game.crierStats.diveKills += 1;
    } else if (this.diveTarget.isMimic) {
      this.diveTarget.takeDamage(this.diveTarget.hp + 10, 'mimicBurst');
      this.stun(Config.egg.mimic.stunSeconds * this.mimicStunScale);
    } else {
      this.diveTarget.takeDamage(Math.max(this.birdDiveDamage, this.diveTarget.hp + 10), 'birdDive');
      this.hp = clamp(this.hp + this.maxHp * Config.player.feedHpRatio * this.eggHealScale, 0, this.maxHp);
      this.mp = clamp(this.mp + this.maxMp * Config.player.feedMpRatio, 0, this.maxMp);
    }
    this.game.spawnDiveImpact(this.position);
    this.game.shake = Math.max(this.game.shake, 0.3);
    if (this.game.hasSynergy('fallingPulse')) {
      const cfg = Config.synergy.fallingPulse;
      this.firePulse(cfg.damageScale, cfg.rangeScale);
      if (this.game.synergyStats) this.game.synergyStats.divePulses += 1;
    }
  }

  // 手（E11）に掴まれる。人間形態のときだけ。変身すれば振りほどける（updateGrab）。
  grab(hand, seconds) {
    if (this.dead || this.form !== 'human' || this.grabbedBy) return false;
    this.grabbedBy = hand;
    this.grabTimer = seconds;
    this.takeDamage(Config.enemy.hand.grabDamage);
    this.game.onPlayerGrabbed?.(hand);
    return true;
  }

  updateGrab(dt) {
    if (!this.grabbedBy) return;
    this.grabTimer -= dt;
    let reason = null;
    if (this.form !== 'human') reason = 'shaken';
    else if (this.dead || this.grabbedBy.dead) reason = 'freed';
    else if (this.grabTimer <= 0) reason = 'timeout';
    else if (horizontalDistanceSq(this.position, this.grabbedBy.position) > (Config.enemy.hand.reach * 1.6) ** 2) reason = 'freed';
    if (reason) this.releaseGrab(reason);
  }

  releaseGrab(reason) {
    const hand = this.grabbedBy;
    if (!hand) return;
    this.grabbedBy = null;
    this.grabTimer = 0;
    this.game.onPlayerReleased?.(hand, reason);
  }

  stun(seconds) {
    this.stunTimer = Math.max(this.stunTimer, seconds);
    this.game.onPlayerStunned(this.position, seconds);
  }

  findMotherForDive() {
    let best = null;
    let bestDistance = Config.player.birdMotherDetectRange ** 2;
    for (const mother of bossTargets(this.game)) {
      const distanceSq = horizontalDistanceSq(this.position, mother.position);
      if (distanceSq <= bestDistance) { best = mother; bestDistance = distanceSq; }
    }
    return best;
  }

  // 影法師（E16）が地面を走っている（こちらは鳥）あいだは、急降下で一番に狙う。
  findShadowForDive() {
    const shadow = this.game.lotusShadow;
    if (!shadow || shadow.dead || shadow.claimed) return null;
    if (!shadowVulnerable(shadow.shadow.mirror.form, this.form)) return null;
    const range = Config.enemy.shadow.diveDetectRange;
    return horizontalDistanceSq(this.position, shadow.position) <= range * range ? shadow : null;
  }

  // 鳴き（E10）は急降下で一撃。近くの卵より先に狙う。
  findCrierForDive() {
    if (!Config.enemy.crier.birdDiveTarget || !this.game.criersActive) return null;
    const range = Config.player.birdEggDetectRange;
    let best = null;
    let bestDistance = range * range;
    for (const enemy of this.game.enemies) {
      if (enemy.dead || enemy.type !== 'crier' || enemy.claimed) continue;
      const distanceSq = horizontalDistanceSq(this.position, enemy.position);
      if (distanceSq <= bestDistance) { best = enemy; bestDistance = distanceSq; }
    }
    return best;
  }

  findNearestEnemy(radius) {
    const candidates = this.game.enemyGrid.query(this.position, radius, this.game.scratchEnemies);
    let best = null;
    let bestDistance = Infinity;
    for (const enemy of candidates) {
      const distance = horizontalDistanceSq(this.position, enemy.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    return best;
  }

  findNearestEgg(radius, includeMother) {
    let best = null;
    let bestDistance = Infinity;
    const eggs = includeMother ? [...this.game.eggs, ...bossTargets(this.game)] : this.game.eggs;
    for (const egg of eggs) {
      if (egg.dead || egg.claimed) continue;
      if (egg.isMother && !includeMother) continue;
      const distance = horizontalDistanceSq(this.position, egg.position);
      if (distance <= radius * radius && distance < bestDistance) {
        bestDistance = distance;
        best = egg;
      }
    }
    return best;
  }

  takeDamage(amount, { ignoreInvincibility = false } = {}) {
    if (this.dead || this.game.state !== 'playing') return;
    if (!ignoreInvincibility && this.invincibleTimer > 0) return;
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.invincibleTimer = Math.max(this.invincibleTimer, 0.32);
      this.damageFlashTimer = 0.1;
      this.game.spawnRingEffect(this.position, 2.2, 0xbafdf2, 0.44, 0.34);
      this.game.playSfx('projectileHit', { volume: 0.42, cooldown: 0.08 });
      this.game.showMessage(this.shieldCharges > 0 ? `防護膜 ${this.shieldCharges}` : '防護膜');
      return;
    }
    amount *= this.damageTakenMultiplier * (Config.player.damageTakenScale ?? 1);
    const hpBefore = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    this.game.playSfx('playerHit', { volume: 0.82, cooldown: 0.12 });
    this.damageFlashTimer = 0.16;
    this.invincibleTimer = Math.max(this.invincibleTimer, 0.18);
    this.game.onPlayerHurt?.();
    if (this.hp <= 0) {
      this.startDeath();
      return;
    }
    if (!this.game.tryLowHpVoice?.(hpBefore / this.maxHp, this.hp / this.maxHp)) this.game.playVoice('hit', { volume: 0.86, cooldown: 0.55 });
    this.playOneShotAnimation('react');
    if (this.hp <= 0) this.game.finish(false, 'HPが尽きました');
  }

  startDeath() {
    if (this.dead) return;
    this.dead = true;
    this.game.playDeathVoices();
    this.form = 'human';
    this.diveState = 'ready';
    if (this.diveTarget) this.diveTarget.claimed = false;
    this.diveTarget = null;
    this.invincibleTimer = 0;
    this.damageFlashTimer = 0;
    this.visualHeight = Config.player.humanHeight;
    this.group.position.y = this.visualHeight;
    this.startDroneFall();
    this.game.cameraRig?.startTransition('human');
    const duration = this.playOneShotAnimation('dying');
    this.game.startPlayerDeath(duration + Config.visuals.playerDeathResultDelay);
  }

  updateDeath(dt) {
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    this.updateSeeds(dt);
    this.updateVisualPose(dt);
    this.updateContactShadow();
  }

  addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.nextXp) {
      this.xp -= this.nextXp;
      this.level += 1;
      this.nextXp = Math.floor(this.nextXp * Config.xp.growth + 6);
      this.game.showLevelUp();
      break;
    }
  }

  addBurst(amount) {
    if (this.burstCooldownTimer > 0) return;
    this.burst = clamp(this.burst + amount, 0, Config.player.burstMax);
  }

  getPickupMagnetRange() {
    return this.pickupMagnetTimer > 0
      ? Math.max(this.pickupMagnetRange, Config.pickups.magnetItemRange)
      : this.pickupMagnetRange;
  }

  getPickupMagnetSpeed() {
    return this.pickupMagnetTimer > 0
      ? Math.max(this.pickupMagnetSpeed, Config.pickups.magnetItemSpeed)
      : this.pickupMagnetSpeed;
  }

  updateSeeds(dt) {
    if (this.dead) {
      this.updateFallingDrones(dt);
      return;
    }
    const radius = 1.05 + this.seeds.length * 0.08;
    const base = this.game.elapsed * Config.visuals.droneOrbitSpeed;
    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];
      const worldAngle = base + i * TAU / this.seeds.length;
      const angle = worldAngle - this.faceAngle;
      seed.position.set(
        Math.sin(angle) * radius,
        1.45 + Math.sin(base * 1.7 + i) * 0.12,
        Math.cos(angle) * radius
      );
      seed.userData.spinAngle = (seed.userData.spinAngle + dt * Config.visuals.droneSpinSpeed) % TAU;
      seed.rotation.y = seed.userData.spinAngle - this.faceAngle;
    }
  }

  startDroneFall() {
    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];
      const angle = this.game.elapsed * 2.73 + i * TAU / Math.max(1, this.seeds.length);
      seed.userData.fallVelocity = 0;
      seed.userData.fallDriftX = Math.sin(angle) * 0.34;
      seed.userData.fallDriftZ = Math.cos(angle) * 0.34;
      seed.userData.tumbleDirection = i % 2 === 0 ? 1 : -1;
    }
  }

  updateFallingDrones(dt) {
    for (const seed of this.seeds) {
      if (seed.position.y <= Config.visuals.droneGroundY) {
        seed.position.y = Config.visuals.droneGroundY;
        continue;
      }
      seed.userData.fallVelocity += Config.visuals.droneFallGravity * dt;
      seed.position.y = Math.max(
        Config.visuals.droneGroundY,
        seed.position.y - seed.userData.fallVelocity * dt
      );
      seed.position.x += seed.userData.fallDriftX * dt;
      seed.position.z += seed.userData.fallDriftZ * dt;
      const tumble = Config.visuals.droneFallTumbleSpeed * (seed.userData.tumbleDirection ?? 1) * dt;
      seed.rotation.x += tumble;
      seed.rotation.z += tumble * 0.72;
      seed.rotation.y += Config.visuals.droneSpinSpeed * dt;
    }
  }

  updateVisualPose(dt) {
    const moving = this.game.input.movementActive();
    const bird = this.form === 'bird';
    const fish = this.form === 'fish';
    this.oneShotAnimationTimer = Math.max(0, this.oneShotAnimationTimer - dt);
    this.updatePlayerAnimationState(moving);
    if (this.modelMixer) this.modelMixer.update(dt);
    this.group.visible = true;
    this.group.rotation.y = this.faceAngle;
    if (this.fallback) this.fallback.visible = !fish && !this.model && (!bird || !this.birdModel);
    if (this.fishModel) {
      this.fishModel.visible = fish;
      this.fishModel.rotation.z = Math.sin(this.game.elapsed * 8) * 0.08;
    }
    if (this.birdModel) {
      this.birdModel.visible = bird;
      this.birdModel.rotation.x = Config.visuals.birdModelPitch;
      this.birdModel.rotation.y = Config.visuals.birdModelYaw;
      this.birdModel.position.y = this.birdModelBaseY + Math.sin(this.game.elapsed * 5) * 0.08;
    }
    if (this.model) {
      this.model.visible = !fish && (!bird || !this.birdModel);
      this.model.rotation.y = PLAYER_VISUALS[Config.visuals.playerModel]
        ? Config.visuals.playerModelYaw
        : Config.player.modelYaw;
      const run = moving && this.form === 'human';
      const useHumanBirdPose = bird && !this.birdModel;
      const runBounce = run ? Math.abs(Math.sin(this.game.elapsed * 12.2)) * 0.045 : 0;
      this.model.position.y = this.modelBaseY + (useHumanBirdPose ? -0.2 + Math.sin(this.game.elapsed * 5) * 0.1 : runBounce);
      this.model.rotation.x = useHumanBirdPose ? -0.34 : run ? -0.16 : 0;
      if (!this.usesExternalAnimation) {
        if (Config.visuals.useProceduralPlayerBones) {
          this.applyProceduralPlayerPose(run, useHumanBirdPose);
        } else {
          this.resetProceduralPlayerPose();
        }
      }
    }
  }

  get birdDiveDamage() {
    return (Config.player.birdDiveDamage + this.birdDiveBonus + (this.level - 1) * 0.7) * this.diveDamageScale;
  }

  get birdMotherDiveDamage() {
    return (Config.player.birdMotherDiveDamage + this.birdMotherDiveBonus + (this.level - 1) * 0.35) * this.diveDamageScale;
  }
}

export class Egg {
  constructor(game, position, isMother = false) {
    this.game = game;
    this.isMother = isMother;
    this.aquatic = game.isWaterPosition(position) && !isMother;
    this.object = new THREE.Group();
    this.object.name = isMother ? 'MotherEgg' : 'Egg';
    this.position = this.object.position;
    this.position.copy(position);
    this.position.y = 0;
    this.maxHp = isMother ? Config.egg.motherHp : Config.egg.hp;
    this.hp = this.maxHp;
    this.age = 0;
    this.dead = false;
    this.claimed = false;
    this.mature = isMother;
    this.hatchTimer = randRange(Config.egg.hatchMin, Config.egg.hatchMax);
    this.reproduceTimer = Config.egg.reproduceSeconds;
    this.hitPulse = 0;
    this.isMimic = false;
    this.pulsePhase = Math.random() * TAU;
    this.shockwaveState = 'idle';
    this.shockwaveTimer = isMother ? Config.egg.motherShockwaveFirstDelay : 0;
    this.bossType = isMother ? getBossType(game.stage?.boss) : null;
    const gameplayMotherEgg = isMother ? game.cloneGameplayModel('motherEgg') : null;
    const sourceModel = !isMother
      ? game.cloneGameplayModel('darkseedEgg') ?? this.createFallback()
      : gameplayMotherEgg ?? (Config.visuals.useAssetModels ? game.assets.cloneModel('motherEgg') : null) ?? this.createFallback();
    if (!gameplayMotherEgg) sourceModel.scale.setScalar(isMother ? 2.25 : 1.05);
    this.model = Config.performance.useEggLod && !isMother
      ? createLodObject('EggLOD', sourceModel, createEggLowModel(), Config.performance.eggLodDistance)
      : sourceModel;
    this.baseModelScale = this.model.scale.clone();
    this.object.add(this.model);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(isMother ? 2.4 : 1.08, isMother ? 3.05 : 1.45, Config.performance.effectSegments),
      new THREE.MeshBasicMaterial({
        color: isMother ? 0xff9d4a : 0xff4fa3,
        transparent: true,
        opacity: isMother ? 0.34 : 0.32,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.025;
    this.object.add(this.ring);
    this.spore = this.createSpores(
      Math.max(4, Math.round((isMother ? 42 : 18) * Config.performance.particleMultiplier)),
      isMother ? 0xffc06b : 0xc7ff87
    );
    this.object.add(this.spore);
  }

  // 卵ではなく生き物の体を持つボス（白蓮の核と花弁、Tripo の体）。回らずにプレイヤーを向き、idle を流し続ける。
  // 置き換えたら true。体が読めていなければ元の卵のまま false。
  useCreatureModel(model) {
    if (!model) return false;
    this.object.remove(this.model);
    this.model = model;
    this.object.add(model);
    this.baseModelScale = model.scale.clone();
    this.creatureModel = true;
    const clips = model.animations ?? [];
    if (!clips.length) return true;
    this.creatureMixer = new THREE.AnimationMixer(model);
    this.creatureActions = {};
    for (const clip of clips) {
      const action = this.creatureMixer.clipAction(clip);
      const loops = clip.name === 'idle' || clip.name === 'walk';
      action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
      this.creatureActions[clip.name] = action;
    }
    const idle = this.creatureActions.idle;
    if (idle) {
      idle.play();
      idle.time = Math.random() * idle.getClip().duration;
    }
    // 一回きりの動き（attack など）が終わったら idle に戻す
    this.creatureMixer.addEventListener('finished', () => {
      const back = this.creatureActions.idle;
      if (!back || back.isRunning()) return;
      back.reset().play();
      this.creatureOneShot?.crossFadeTo(back, 0.25, false);
      this.creatureOneShot = null;
    });
    return true;
  }

  playCreatureOneShot(name) {
    const action = this.creatureActions?.[name];
    if (!action || this.creatureOneShot === action) return;
    const idle = this.creatureActions.idle;
    action.reset().play();
    if (idle?.isRunning()) idle.crossFadeTo(action, 0.15, false);
    this.creatureOneShot = action;
  }

  createFallback() {
    return new THREE.Mesh(
      new THREE.DodecahedronGeometry(this.isMother ? 1.6 : 0.75, 1),
      new THREE.MeshStandardMaterial({
        color: this.isMother ? 0xbd4731 : 0x9bbf3b,
        emissive: this.isMother ? 0x5a160a : 0x264c0f,
        emissiveIntensity: 0.25,
        roughness: 0.72
      })
    );
  }

  createSpores(count, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const radius = randRange(0.25, this.isMother ? 2.1 : 1.05);
      positions[i * 3] = Math.sin(angle) * radius;
      positions[i * 3 + 1] = randRange(0.45, this.isMother ? 3.8 : 1.8);
      positions[i * 3 + 2] = Math.cos(angle) * radius;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color,
        size: this.isMother ? 0.14 : 0.08,
        transparent: true,
        opacity: 0.58,
        depthWrite: false
      })
    );
  }

  update(dt) {
    if (this.dead) return;
    this.age += dt;
    const distanceSq = horizontalDistanceSq(this.position, this.game.player.position);
    const showDetails = this.isMother || distanceSq <= Config.performance.eggDetailDistance ** 2;
    this.ring.visible = showDetails;
    this.spore.visible = showDetails;
    if (this.creatureModel) {
      this.creatureMixer?.update(dt);
      this.model.rotation.y = angleToXZ(this.position, this.game.player.position);
    } else {
      this.model.rotation.y += dt * (this.isMother ? 0.18 : 0.35);
    }
    if (showDetails) {
      this.ring.rotation.z += dt * (this.isMother ? 0.18 : 0.32);
      this.spore.rotation.y -= dt * 0.22;
    }
    if (this.isMother) {
      this.hitPulse = Math.max(0, this.hitPulse - dt * 1.7);
      this.model.scale.copy(this.baseModelScale).multiplyScalar(1 + this.hitPulse);
      this.bossType.update(this, dt);
      if (this.pursuit) this.updatePursuerShell(dt);
      if (this.swarm) this.updateSwarmBody();
      if (this.floodgate) this.updateFloodgateBody(dt);
      if (this.lotus) this.updateLotusBody(dt);
    }
    if (this.isMother) return;
    this.updatePulse(dt);
    this.mature = this.age >= Config.egg.matureSeconds;
    if (!this.mature) return;
    const hatchScale = this.game.getHatchRateScale();
    this.hatchTimer -= dt * hatchScale;
    this.reproduceTimer -= dt;
    if (this.hatchTimer <= 0) {
      this.game.spawnEnemyFromEgg(this);
      this.hatchTimer = randRange(Config.egg.hatchMin, Config.egg.hatchMax);
    }
    if (this.reproduceTimer <= 0) {
      this.game.spawnChildEgg(this.position);
      this.reproduceTimer = Config.egg.reproduceSeconds;
    }
  }

  // From the mimic chapters on, every egg breathes; a mimic breathes faster. That rhythm is the only tell.
  updatePulse(dt) {
    if (!this.game.mimicEggsActive) return;
    const mimic = Config.egg.mimic;
    this.pulsePhase += dt * TAU * (this.isMimic ? mimic.mimicPulseHz : mimic.normalPulseHz);
    const amount = this.isMimic ? mimic.mimicPulseScale : mimic.normalPulseScale;
    this.object.scale.setScalar(1 + Math.sin(this.pulsePhase) * amount);
    if (this.isMimic && !this.game.mimicHintShown && this.mature
      && horizontalDistanceSq(this.position, this.game.player.position) <= Config.performance.eggDetailDistance ** 2) {
      this.game.showMimicHint();
    }
  }

  // Pursuer (src/bosses.js): waddle while walking; while laying, the ground ring glows gold to show the open shell.
  updatePursuerShell(dt) {
    const open = this.pursuit.state === 'laying';
    this.shellGlow = clamp((this.shellGlow ?? 0) + (open ? dt * 5 : -dt * 3), 0, 1);
    const glow = this.shellGlow * (0.75 + Math.sin(this.age * 9) * 0.25);
    this.ring.material.color.setHex(this.shellGlow > 0.05 ? 0xffe066 : 0xff9d4a);
    this.ring.material.opacity = 0.34 + glow * 0.56;
    this.ring.scale.setScalar(1 + glow * 0.28);
    this.model.rotation.z = open ? 0 : Math.sin(this.pursuit.walk * 7) * 0.07;
  }

  // Floodgate mother (src/bosses.js): sunk low with a blue ring while submerged; risen, gold and reeling while stunned.
  updateFloodgateBody(dt) {
    const surfaced = this.floodgate.state === 'surfaced';
    this.surfaceLift = clamp((this.surfaceLift ?? 0) + (surfaced ? dt * 2.4 : -dt * 1.2), 0, 1);
    this.surfaceBaseY ??= this.model.position.y;
    this.model.position.y = this.surfaceBaseY - 2.6 * (1 - this.surfaceLift);
    const biteGlow = this.floodgate.bites / Config.boss.floodgateMother.bitesToSurface;
    this.ring.material.color.setHex(surfaced ? 0xffe066 : 0x5fd0ff);
    this.ring.material.opacity = surfaced ? 0.5 + Math.sin(this.age * 9) * 0.2 : 0.3 + biteGlow * 0.4;
    this.ring.scale.setScalar(surfaced ? 1.15 : 1 + biteGlow * 0.25 + Math.sin(this.age * 2.2) * 0.04);
    this.model.rotation.z = surfaced ? Math.sin(this.age * 5) * 0.12 : 0;
  }

  // 白蓮の核（src/bosses.js）: 花弁は白い輪でゆっくり揺れ、産む直前に輪が明るくなる。
  // 核は閉じているあいだ小さく白い輪、開くと大きくなって金色の輪が脈打ち、吸い込みの間は輪が縮む。
  updateLotusBody(dt) {
    const lotus = this.lotus;
    if (this.lotusRole === 'petal') {
      const ready = clamp(1 - this.lotusSpawnTimer / 2, 0, 1);
      this.ring.material.color.setHex(0xfff2f6);
      this.ring.material.opacity = 0.3 + ready * 0.5;
      // 産んだ直後（タイマーが巻き戻った）に体を振る。卵の体は代わりにゆっくり傾いて揺れる
      if (this.creatureModel && this.lotusSpawnTimer > (this.lastLotusSpawnTimer ?? Infinity)) this.playCreatureOneShot('attack');
      this.lastLotusSpawnTimer = this.lotusSpawnTimer;
      if (!this.creatureModel) this.model.rotation.z = Math.sin(this.age * 1.6 + this.position.x) * 0.1;
      return;
    }
    // 核は衝撃波と吸い込みの予告に入ったとき攻撃の動きをする
    if (this.creatureModel && lotus.attack !== this.lastLotusAttack && lotus.attack?.endsWith('Warning')) this.playCreatureOneShot('attack');
    this.lastLotusAttack = lotus.attack;
    const open = lotus.state === 'open';
    this.lotusBloom = clamp((this.lotusBloom ?? 0) + (open ? dt * 1.5 : -dt), 0, 1);
    this.model.scale.multiplyScalar(0.8 + this.lotusBloom * 0.3);
    const inhaling = lotus.attack === 'inhale' || lotus.attack === 'inhaleWarning';
    this.ring.material.color.setHex(!open ? 0xd8d2e6 : inhaling ? 0xfff2f6 : 0xffe066);
    this.ring.material.opacity = !open ? 0.22 : 0.45 + Math.sin(this.age * (inhaling ? 14 : 6)) * 0.2;
    this.ring.scale.setScalar(!open ? 0.9 : inhaling ? 1.25 - (this.age * 2 % 1) * 0.5 : 1.1);
  }

  // 群れの母（src/bosses.js）: 倒れている姉妹は縮んで輪が消え、起き上がりが近い（3 秒前から）と点滅する。
  updateSwarmBody() {
    if (!this.swarmDown) return;
    const blink = this.swarmDownTimer < 3 && Math.sin(this.swarmDownTimer * 14) > 0;
    this.model.scale.multiplyScalar(blink ? 0.7 : 0.5);
    this.ring.visible = blink;
    this.spore.visible = false;
  }

  updateMotherShockwave(dt) {
    if (this.game.state !== 'playing') return;
    this.shockwaveTimer -= dt;
    if (this.shockwaveTimer > 0) return;
    if (this.shockwaveState === 'warning') {
      this.shockwaveState = 'idle';
      this.shockwaveTimer = Config.egg.motherShockwaveInterval;
      this.game.spawnMotherShockwave(
        this.position,
        Config.egg.motherShockwaveRange,
        Config.egg.motherShockwaveDamage,
        Config.egg.motherShockwaveDuration
      );
      this.game.playSfx('motherRelease', { volume: 0.94, cooldown: 0.4 });
      return;
    }
    this.shockwaveState = 'warning';
    this.shockwaveTimer = Config.egg.motherShockwaveWarning;
    this.game.hud.showBossWarning(Config.egg.motherShockwaveWarning, this.game.player?.form);
    this.game.spawnMotherShockwaveWarning(
      this.position,
      Config.egg.motherShockwaveRange,
      Config.egg.motherShockwaveWarning
    );
    this.game.playSfx('motherCharge', { volume: 0.92, cooldown: 0.4 });
  }
  takeDamage(amount, source) {
    if (this.aquatic && source !== 'fishBite') {
      this.game.showMessage('\u6c34\u4e2d\u306e\u5375\u306f\u9b5a\u5f62\u614b\u3067\u99c6\u9664\u3067\u304d\u307e\u3059', 1.2);
      return;
    }
    if (this.dead || this.swarmDown) return;
    if (this.isMother) amount *= this.game.player?.motherDamageScale ?? 1;
    const bossScale = this.isMother ? this.bossType.damageScale?.(this) ?? 1 : 1;
    amount *= bossScale;
    this.hp -= amount;
    if (this.isMother) {
      this.hitPulse = Math.max(this.hitPulse, clamp(amount / this.maxHp * 0.32, 0.004, 0.025));
    } else {
      const squash = clamp(amount / this.maxHp, 0.03, 0.18);
      this.model.scale.multiplyScalar(1 + squash);
    }
    this.game.spawnHitSpark(this.position, bossScale < 1 ? 0x9aa3a8 : this.isMother ? 0xffbf61 : 0xd8ff7a);
    if (this.isMother && bossScale === 0) this.game.onBossImmuneHit?.(this);
    if (this.hp <= 0) {
      this.claimed = false;
      if (this.isMother && this.bossType.onLethal?.(this, source)) return;
      this.dead = true;
      this.game.onEggDestroyed(this, source);
    }
  }

}

// 影法師の足元の輪と体のほのかな光。紫は「同じ形態（攻撃が通らない）」、金は「逆の形態（攻撃が通る）」。
const SHADOW_GLOW = 0x5a2a8a;
const SHADOW_OPEN_GLOW = 0xffc94a;

export class Enemy {
  constructor(game, type, position, homeEgg = null) {
    this.game = game;
    this.type = type;
    this.object = new THREE.Group();
    this.object.name = `Enemy_${type}`;
    this.position = this.object.position;
    this.position.copy(position);
    this.position.y = 0;
    this.homeEgg = homeEgg;
    this.dead = false;
    this.attackTimer = 0;
    this.fireTimer = randRange(0.4, 1.2);
    if (type === 'sniper') this.fireTimer = randRange(1.2, 2);
    this.pendingShotTimer = 0;
    this.pendingShotTarget = new THREE.Vector3();
    this.beamState = 'idle';
    this.beamTimer = 0;
    this.beamHitTimer = 0;
    this.beamAim = 0;
    this.beamTrackedTarget = new THREE.Vector3();
    this.beamEnd = new THREE.Vector3();
    this.beamDirection = new THREE.Vector3();
    this.buildingImpactTimer = 0;
    this.knock = new THREE.Vector3();
    this.destination = randomPointInCircle(Config.map.radius - 5, Config.map.safeRadius);
    this.destinationTimer = 0;
    this.layTimer = randRange(Config.enemy.spawner.layMin, Config.enemy.spawner.layMax);
    this.lifeTimer = type === 'spawner' ? Config.enemy.spawner.lifeSeconds : Infinity;
    this.matureTimer = (type === 'dragonflyLarva' || type === 'tadpole') ? this.stats.matureSeconds : Infinity;
    this.jumpTimer = type === 'frog' ? randRange(1.2, Config.enemy.frog.jumpInterval) : 0;
    this.jumpPhase = 0;
    this.updateAccumulator = 0;
    this.distanceSqToPlayer = Infinity;
    this.collisionRadius = (ENEMY_LOD_SPECS[type]?.radius ?? 0.48) + 0.16;
    const stats = this.stats;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.model = this.createModel(type);
    this.object.add(this.model);
    this.modelMixer = null;
    this.modelActions = {};
    this.activeModelAction = null;
    this.modelAnimationTimer = 0;
    this.modelBaseAnimation = 'idle';
    this.lastAnimationPosition = this.position.clone();
    this.initializeModelAnimations();
    this.hpBar = this.createHpBar();
    this.object.add(this.hpBar);
    if (type === 'sniper') this.createSniperBeam();
    if (type === 'footprint') this.footprint = { cursor: null, rejoinTimer: 0, target: null, lostCount: 0, tracking: false, fresh: true };
    if (type === 'crier') this.crier = { timer: Config.enemy.crier.cryInterval * randRange(0.45, 0.8), swelling: false, baseScale: this.model.scale.clone() };
    if (type === 'hand') this.createHandArm();
    if (type === 'rootsucker') this.createDryCircle();
    if (type === 'shadow') this.initShadow();
    if (type === 'swarmbird') this.swarm = { flock: null, slot: 0, mode: 'orbit', notice: 0, height: Config.enemy.swarmbird.orbitHeight, angle: 0, phase: Math.random() * TAU };
    // 割れ殻の半分（makeSplitHalf）はもう割れず、割れた直後はバースト技を受けない
    this.splitHalf = false;
    this.burstImmuneTimer = 0;
  }

  get stats() {
    if (Config.enemy[this.type]) return Config.enemy[this.type];
    if (this.type === 'shooter') return Config.enemy.shooter;
    if (this.type === 'guardian') return Config.enemy.guardian;
    if (this.type === 'spawner') return Config.enemy.spawner;
    return Config.enemy.chaser;
  }

  createModel(type) {
    if (['dragonflyLarva', 'tadpole', 'dragonfly', 'frog'].includes(type)) return createEnemyLowModel(type);
    const tripo = TRIPO_ENEMY_MODELS[type];
    const tripoModel = tripo && this.game.tripoEnemyModelsEnabled ? this.game.cloneGameplayModel(tripo.key) : null;
    if (tripoModel) return this.prepareTripoModel(tripoModel, type, tripo);
    if (type === 'swarmbird') return this.createSwarmbirdModel();
    if (type === 'shadow') return this.createShadowModel();
    const gameplayModelKeys = {
      chaser: 'chaserEnemy',
      shooter: 'shooterEnemy',
      sniper: 'shooterEnemy',
      footprint: 'chaserEnemy',
      crier: 'spawnerEnemy',
      hand: 'chaserEnemy',
      rootsucker: 'guardianEnemy',
      splitshell: 'chaserEnemy',
      guardian: 'guardianEnemy',
      spawner: 'spawnerEnemy'
    };
    const gameplayModel = this.game.cloneGameplayModel(gameplayModelKeys[type]);
    if (gameplayModel) {
      gameplayModel.userData.baseY = gameplayModel.position.y;
      if (type === 'sniper') this.styleSniperModel(gameplayModel);
      if (type === 'footprint') this.styleFootprintModel(gameplayModel);
      if (type === 'crier') this.styleCrierModel(gameplayModel);
      if (type === 'hand') this.styleHandModel(gameplayModel);
      if (type === 'rootsucker') this.styleRootsuckerModel(gameplayModel);
      if (type === 'splitshell') this.styleSplitshellModel(gameplayModel);
      if (type === 'spawner' && Config.performance.enemyLights) {
        const light = new THREE.PointLight(0xffe56c, 1.2, 5);
        light.position.y = 1.8;
        gameplayModel.add(light);
      }
      return this.createLodModel(gameplayModel, type);
    }
    const key = type === 'shooter' || type === 'sniper' ? 'ghost' : type === 'guardian' || type === 'rootsucker' ? 'skeleton' : type === 'spawner' || type === 'crier' ? 'vampire' : 'zombie';
    const model = Config.visuals.useAssetModels ? this.game.assets.cloneModel(key) : null;
    if (model) {
      model.scale.setScalar(type === 'guardian' ? 1.15 : type === 'spawner' ? 0.82 : type === 'chaser' ? 1.0 : 0.9);
      if (type === 'sniper') this.styleSniperModel(model);
      if (type === 'footprint') this.styleFootprintModel(model);
      if (type === 'crier') this.styleCrierModel(model);
      if (type === 'hand') this.styleHandModel(model);
      if (type === 'rootsucker') this.styleRootsuckerModel(model);
      if (type === 'splitshell') this.styleSplitshellModel(model);
      model.rotation.y = Math.PI;
      if (Config.performance.enemyLights) {
        const light = new THREE.PointLight(type === 'spawner' ? 0xffe56c : 0x6cffaa, type === 'spawner' ? 1.4 : 0.45, 5);
        light.position.y = 1.8;
        model.add(light);
      }
      return this.createLodModel(model, type);
    }
    return createEnemyLowModel(type);
  }

  // Tripo の体: テクスチャを残したまま材質を敵ごとに複製し、各種の update が光らせる材質の一覧に入れる。
  prepareTripoModel(model, type, tripo) {
    this.tripoModel = true;
    model.userData.baseY = model.position.y;
    const materials = [];
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const tint = (source) => {
        const material = source.clone();
        if (material.emissive?.isColor) material.emissive.setHex(tripo.glow);
        if ('emissiveIntensity' in material) material.emissiveIntensity = tripo.glowIntensity;
        // 足跡は追い手の写しなので、絵の色のまま少し透ける（見失うとさらに薄くなる: updateFootprint）
        if (type === 'footprint') {
          material.transparent = true;
          material.opacity = 0.82;
        }
        material.needsUpdate = true;
        materials.push(material);
        return material;
      };
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
    });
    if (type === 'footprint') this.footprintMaterials = materials;
    if (type === 'crier') this.crierMaterials = materials;
    if (type === 'hand') this.handMaterials = materials;
    if (type === 'rootsucker') this.rootsuckerMaterials = materials;
    if (type === 'swarmbird') {
      // 群れ鳥は空を飛び、襲うときに大きくなる（updateSwarmbird）。気づいたら体が赤く光る（仮の体の赤い目の代わり）
      model.userData.alertMaterials = materials;
      model.userData.swarmBaseScale = model.scale.x;
      model.position.y = Config.enemy.swarmbird.orbitHeight;
      model.userData.baseY = model.position.y;
      return model;
    }
    return this.createLodModel(model, type);
  }

  styleSniperModel(model) {
    model.scale.multiplyScalar(SNIPER_VISUAL_SCALE);
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const recolor = (source) => {
        const material = source.clone();
        if (material.color?.isColor) material.color.setHex(SNIPER_COLOR);
        if ('map' in material) material.map = null;
        if ('vertexColors' in material) material.vertexColors = false;
        if (material.emissive?.isColor) material.emissive.setHex(0x500000);
        if ('emissiveMap' in material) material.emissiveMap = null;
        if ('emissiveIntensity' in material) material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.35);
        material.needsUpdate = true;
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(recolor)
        : recolor(child.material);
    });
  }

  // 足跡は追い手の写しのような、青白く透けた体にする。見失うと更に薄くなる（updateFootprint）。
  styleFootprintModel(model) {
    this.footprintMaterials = [];
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const recolor = (source) => {
        const material = source.clone();
        if (material.color?.isColor) material.color.setHex(FOOTPRINT_COLOR);
        if ('map' in material) material.map = null;
        if ('vertexColors' in material) material.vertexColors = false;
        if (material.emissive?.isColor) material.emissive.setHex(0x4f86c4);
        if ('emissiveMap' in material) material.emissiveMap = null;
        if ('emissiveIntensity' in material) material.emissiveIntensity = 0.9;
        material.transparent = true;
        material.opacity = 0.82;
        material.needsUpdate = true;
        this.footprintMaterials.push(material);
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(recolor)
        : recolor(child.material);
    });
  }

  // 鳴きは産卵獣の亜種なので同じ体を、くすんだ紫に塗る。膨らむあいだ光が強くなる（updateCrier）。
  styleCrierModel(model) {
    this.crierMaterials = [];
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const recolor = (source) => {
        const material = source.clone();
        if (material.color?.isColor) material.color.setHex(CRIER_COLOR);
        if ('map' in material) material.map = null;
        if ('vertexColors' in material) material.vertexColors = false;
        if (material.emissive?.isColor) material.emissive.setHex(CRIER_GLOW);
        if ('emissiveMap' in material) material.emissiveMap = null;
        if ('emissiveIntensity' in material) material.emissiveIntensity = 0.2;
        material.needsUpdate = true;
        this.crierMaterials.push(material);
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(recolor)
        : recolor(child.material);
    });
  }

  // 手は追い手と同じ人型の体を、灰色がかった肌色に塗る。腕を伸ばすあいだ赤く光る（updateHand）。
  styleHandModel(model) {
    this.handMaterials = [];
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const recolor = (source) => {
        const material = source.clone();
        if (material.color?.isColor) material.color.setHex(HAND_COLOR);
        if ('map' in material) material.map = null;
        if ('vertexColors' in material) material.vertexColors = false;
        if (material.emissive?.isColor) material.emissive.setHex(HAND_GLOW);
        if ('emissiveMap' in material) material.emissiveMap = null;
        if ('emissiveIntensity' in material) material.emissiveIntensity = 0.08;
        material.needsUpdate = true;
        this.handMaterials.push(material);
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(recolor)
        : recolor(child.material);
    });
  }

  // 吸水根は大きな体（守り手）を、土色に塗って低く構える。根を張るあいだ光が強くなる（updateRootsucker）。
  styleRootsuckerModel(model) {
    this.rootsuckerMaterials = [];
    model.scale.multiplyScalar(0.92);
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const recolor = (source) => {
        const material = source.clone();
        if (material.color?.isColor) material.color.setHex(ROOTSUCKER_COLOR);
        if ('map' in material) material.map = null;
        if ('vertexColors' in material) material.vertexColors = false;
        if (material.emissive?.isColor) material.emissive.setHex(ROOTSUCKER_GLOW);
        if ('emissiveMap' in material) material.emissiveMap = null;
        if ('emissiveIntensity' in material) material.emissiveIntensity = 0.1;
        material.needsUpdate = true;
        this.rootsuckerMaterials.push(material);
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(recolor)
        : recolor(child.material);
    });
  }

  // 割れ殻は追いかけ役の体を、白っぽい殻の色に塗る。縁がうっすら光る。
  styleSplitshellModel(model) {
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const recolor = (source) => {
        const material = source.clone();
        if (material.color?.isColor) material.color.setHex(SPLITSHELL_COLOR);
        if ('map' in material) material.map = null;
        if ('vertexColors' in material) material.vertexColors = false;
        if (material.emissive?.isColor) material.emissive.setHex(SPLITSHELL_GLOW);
        if ('emissiveMap' in material) material.emissiveMap = null;
        if ('emissiveIntensity' in material) material.emissiveIntensity = 0.16;
        material.needsUpdate = true;
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(recolor)
        : recolor(child.material);
    });
  }

  // 群れ鳥の体。細い円錐の胴、左右の羽（羽ばたく）、光る目。目は鳥形態に気づくと赤くなる。
  createSwarmbirdModel() {
    const model = new THREE.Group();
    model.name = 'Enemy_swarmbird';
    const body = new THREE.Mesh(SWARMBIRD_BODY_GEOMETRY, new THREE.MeshStandardMaterial({ color: SWARMBIRD_COLOR, emissive: SWARMBIRD_GLOW, emissiveIntensity: 0.12, roughness: 0.7 }));
    model.add(body);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: SWARMBIRD_COLOR, emissive: SWARMBIRD_GLOW, emissiveIntensity: 0.22, roughness: 0.8 });
    const wings = [-1, 1].map((side) => {
      const wing = new THREE.Mesh(SWARMBIRD_WING_GEOMETRY, wingMaterial);
      wing.scale.x = side;
      wing.position.set(side * 0.08, 0.02, 0.02);
      model.add(wing);
      return wing;
    });
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: SWARMBIRD_GLOW, toneMapped: false });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(SWARMBIRD_EYE_GEOMETRY, eyeMaterial);
      eye.position.set(side * 0.09, 0.07, 0.24);
      model.add(eye);
    }
    model.scale.setScalar(1.6);
    model.position.y = Config.enemy.swarmbird.orbitHeight;
    model.userData.baseY = model.position.y;
    model.userData.wings = wings;
    model.userData.eyeMaterial = eyeMaterial;
    return model;
  }

  // 群れ鳥。人間形態の間は群れごとプレイヤーの周りを遠巻きに回る。鳥形態になると少し遅れて気づき、
  // 鳥の高さまで上がって追いかける。高さが近いときだけ当たる（updateContactDamage）。
  updateSwarmbird(dt) {
    const cfg = Config.enemy.swarmbird;
    const player = this.game.player;
    const swarm = this.swarm;
    if (player.form === 'bird') swarm.notice = Math.min(cfg.noticeSeconds, swarm.notice + dt);
    else swarm.notice = 0;
    const hunting = player.form === 'bird' && swarm.notice >= cfg.noticeSeconds;
    if (hunting && swarm.mode !== 'hunt') this.game.onSwarmbirdHunt?.(this);
    swarm.mode = hunting ? 'hunt' : 'orbit';
    let targetHeight = cfg.orbitHeight;
    if (hunting) {
      targetHeight = Math.max(cfg.orbitHeight, player.visualHeight ?? cfg.orbitHeight);
      // 追いついたら重ならないよう、羽ごとにずらしてプレイヤーのすぐ周りを回る（当たる距離の内側）
      const swirl = this.game.elapsed * 3.2 + swarm.slot * (TAU / 4) + swarm.phase * 0.2;
      tempVec2.set(player.position.x + Math.sin(swirl) * 1.1, 0, player.position.z + Math.cos(swirl) * 1.1);
      const distSq = horizontalDistanceSq(this.position, tempVec2);
      if (distSq > 0.0025) this.moveToward(tempVec2, dt, Math.min(cfg.diveSpeed, Math.sqrt(distSq) / dt));
    } else {
      // 群れの角度（flock.angle）は main.js が毎フレーム進める。羽ごとに少しずらして固まって回る。
      const base = swarm.flock ? swarm.flock.angle : (swarm.angle += cfg.orbitTurnSpeed * dt);
      const angle = base + (swarm.slot - 1.5) * 0.32;
      const radius = cfg.orbitRadius + Math.sin(this.game.elapsed * 1.3 + swarm.phase) * 0.8;
      tempVec2.set(player.position.x + Math.sin(angle) * radius, 0, player.position.z + Math.cos(angle) * radius);
      const distSq = horizontalDistanceSq(this.position, tempVec2);
      if (distSq > 0.04) this.moveToward(tempVec2, dt, Math.min(this.speed * (distSq > 9 ? 1.6 : 1), Math.sqrt(distSq) / dt));
    }
    const step = cfg.climbSpeed * dt;
    swarm.height += clamp(targetHeight - swarm.height, -step, step);
    const flap = Math.sin(this.game.elapsed * (hunting ? 26 : 16) + swarm.phase) * 0.7;
    const wings = this.model.userData.wings;
    if (wings) { wings[0].rotation.z = -flap; wings[1].rotation.z = flap; }
    const eye = this.model.userData.eyeMaterial;
    if (eye) eye.color.setHex(swarm.notice > 0 ? SWARMBIRD_ALERT : SWARMBIRD_GLOW);
    for (const material of this.model.userData.alertMaterials ?? []) {
      if ('emissiveIntensity' in material) material.emissiveIntensity = swarm.notice > 0 ? 0.55 : 0;
    }
    this.model.userData.baseY = swarm.height;
    // Tripo の体は羽ばたきのモーション（walk）を持つので、高さはここで直接合わせる
    if (this.tripoModel) this.model.position.y = swarm.height;
    // 鳥形態のカメラは高く引くので、襲っている間は体を大きくして見えるようにする（仮の体は 1.6 → 2.6）
    const base = this.model.userData.swarmBaseScale ?? 1.6;
    const target = base * (hunting ? 2.6 / 1.6 : 1);
    const scale = this.model.scale.x + (target - this.model.scale.x) * Math.min(1, dt * 4);
    this.model.scale.setScalar(scale);
  }

  // ---- 影法師（E16） ----
  // 選んだキャラの人間形態と鳥形態の体を写し、黒く塗る。足元の輪は、攻撃が通るときだけ金色になる。
  createShadowModel() {
    const player = this.game.player;
    const root = new THREE.Group();
    root.name = 'Enemy_shadow';
    const material = new THREE.MeshStandardMaterial({ color: 0x07060a, emissive: SHADOW_GLOW, emissiveIntensity: 0.4, roughness: 0.92, metalness: 0 });
    const paint = (object) => {
      object.traverse((child) => {
        if (!child.isMesh && !child.isSkinnedMesh) return;
        child.material = material;
        child.castShadow = Config.performance.enableShadows;
        child.receiveShadow = false;
      });
      object.visible = true;
      return object;
    };
    const humanSource = player?.model ?? player?.fallback;
    const human = humanSource ? paint(cloneSkeleton(humanSource)) : paint(new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8)));
    if (!humanSource) human.position.y = 0.9;
    root.add(human);
    let bird = null;
    if (player?.birdModel) {
      bird = paint(cloneSkeleton(player.birdModel));
      bird.rotation.x = Config.visuals.birdModelPitch;
      bird.rotation.y = Config.visuals.birdModelYaw;
      bird.visible = false;
      root.add(bird);
    }
    let mixer = null;
    const runClip = player?.modelActions?.run?.getClip?.() ?? player?.modelActions?.idle?.getClip?.();
    if (runClip && player?.model) {
      try {
        mixer = new THREE.AnimationMixer(human);
        mixer.clipAction(runClip).play();
      } catch {
        mixer = null;
      }
    }
    root.userData.baseY = 0;
    root.userData.shadow = { human, bird, material, mixer, humanTiltX: human.rotation.x };
    return root;
  }

  initShadow() {
    const form = shadowFormOf(this.game.player?.form ?? 'human');
    this.shadow = { mirror: { form, pending: null, timer: 0 }, height: form === 'bird' ? Config.player.birdHeight : 0, deflectTimer: 0, changed: 0 };
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.15, 40),
      new THREE.MeshBasicMaterial({ color: SHADOW_GLOW, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    this.object.add(ring);
    this.shadow.ring = ring;
  }

  shadowCanBeHit() {
    const player = this.game.player;
    if (shadowVulnerable(this.shadow.mirror.form, player.form)) return true;
    // 同じ形態のときは弾かれる（灰色の火花と、ときどき一言）
    this.game.spawnHitSpark(this.position, 0x8a8f99);
    if (this.shadow.deflectTimer <= 0) {
      this.shadow.deflectTimer = 4;
      this.game.onShadowDeflect?.(this);
    }
    return false;
  }

  // こちらの形態を mirrorDelay 秒遅れで写す。人間の間は地面を走って追い、鳥の間は鳥の高さを飛んで追う。
  updateShadow(dt) {
    const cfg = Config.enemy.shadow;
    const player = this.game.player;
    const shadow = this.shadow;
    shadow.deflectTimer = Math.max(0, shadow.deflectTimer - dt);
    if (shadowMirrorStep(shadow.mirror, player.form, dt, cfg.mirrorDelay)) {
      shadow.changed += 1;
      this.game.onShadowMirror?.(this, shadow.mirror.form);
    }
    const bird = shadow.mirror.form === 'bird';
    const targetHeight = bird ? Config.player.birdHeight : 0;
    const step = cfg.climbSpeed * dt;
    shadow.height += clamp(targetHeight - shadow.height, -step, step);
    this.moveToward(player.position, dt, bird ? cfg.birdSpeed : this.speed);
    const view = this.model.userData.shadow;
    const vulnerable = shadowVulnerable(shadow.mirror.form, player.form);
    view.mixer?.update(dt);
    if (view.bird) {
      view.bird.visible = bird;
      view.human.visible = !bird;
    } else {
      view.human.rotation.x = bird ? -0.34 : view.humanTiltX;
    }
    view.material.emissive.setHex(vulnerable ? SHADOW_OPEN_GLOW : SHADOW_GLOW);
    // 鳥形態のカメラは高く引いて暗くなるので、飛んでいる間は体を大きく・明るくして見えるようにする
    view.material.emissiveIntensity = (vulnerable ? 0.55 + Math.sin(this.game.elapsed * 14) * 0.2 : 0.4) + (bird ? 0.5 : 0);
    const scale = this.model.scale.x + ((bird ? 1.7 : 1) - this.model.scale.x) * Math.min(1, dt * 4);
    this.model.scale.setScalar(scale);
    shadow.ring.material.color.setHex(vulnerable ? SHADOW_OPEN_GLOW : SHADOW_GLOW);
    shadow.ring.scale.setScalar(vulnerable ? 1.35 : 1);
    this.model.userData.baseY = shadow.height;
  }

  // 同じ形態のときだけ当たる。鳥どうしは高さが近いときだけ。
  updateShadowContact(player) {
    const cfg = Config.enemy.shadow;
    if (shadowVulnerable(this.shadow.mirror.form, player.form)) return;
    if (player.form === 'fish') return;
    if (player.form === 'bird' && Math.abs(this.shadow.height - (player.visualHeight ?? 0)) > 2.2) return;
    if (this.distanceSqToPlayer > 1.9) return;
    if (this.attackTimer > 0) return;
    this.attackTimer = cfg.contactCooldown;
    const hpBefore = player.hp;
    player.takeDamage(this.stats.damage);
    this.game.onShadowHit?.(this, hpBefore - player.hp);
  }

  updateShadowHpBar() {
    this.hpBar.visible = true;
    this.hpBar.position.y = this.shadow.height + 2.3;
    const fg = this.hpBar.getObjectByName('fg');
    if (fg) fg.scale.x = clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.lookAt(this.game.camera.position);
  }

  // バースト技で割れた割れ殻の片方。小さく、HP と経験値が halfScale 倍で、もう割れない。
  makeSplitHalf() {
    const cfg = Config.enemy.splitshell;
    this.splitHalf = true;
    this.maxHp = this.stats.hp * cfg.halfScale;
    this.hp = this.maxHp;
    this.burstImmuneTimer = cfg.halfBurstImmuneSeconds;
    this.model.scale.multiplyScalar(0.72);
    this.collisionRadius *= 0.78;
  }

  // 乾いた円。地面に貼る薄い土色の円と、縁の明るい輪。根を張ると現れて広がる。
  createDryCircle() {
    this.root = { timer: Config.enemy.rootsucker.rootSeconds, rooted: false, age: 0, radius: 0 };
    this.dryCircle = new THREE.Group();
    this.dryCircle.name = 'DryCircle';
    this.dryCircle.position.y = 0.05;
    this.dryCircle.rotation.x = -Math.PI / 2;
    this.dryFillMaterial = new THREE.MeshBasicMaterial({ color: 0xa0773f, transparent: true, opacity: 0, depthWrite: false });
    this.dryEdgeMaterial = new THREE.MeshBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const fill = new THREE.Mesh(DRY_CIRCLE_GEOMETRY, this.dryFillMaterial);
    const edge = new THREE.Mesh(DRY_EDGE_GEOMETRY, this.dryEdgeMaterial);
    fill.renderOrder = 1;
    edge.renderOrder = 2;
    this.dryCircle.add(fill, edge);
    this.dryCircle.scale.setScalar(0.01);
    this.dryCircle.visible = false;
    this.object.add(this.dryCircle);
  }

  // 乾いた円の今の半径。根を張る前と倒れたあとは 0。
  get dryRadius() {
    return this.root?.rooted && !this.dead ? this.root.radius : 0;
  }

  coversDryGround(position) {
    const radius = this.dryRadius;
    return radius > 0 && horizontalDistanceSq(this.position, position) <= radius * radius;
  }

  // 伸ばす腕。予兆のあいだは細く半透明、掴んでいるあいだは太くプレイヤーまで届く。
  createHandArm() {
    this.hand = { state: 'approach', timer: 0, cooldown: Config.enemy.hand.firstCooldown, aim: new THREE.Vector3() };
    this.armMaterial = new THREE.MeshBasicMaterial({ color: HAND_GLOW, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
    this.arm = new THREE.Mesh(HAND_ARM_GEOMETRY, this.armMaterial);
    this.arm.name = 'HandArm';
    this.arm.position.y = HAND_ARM_HEIGHT;
    this.arm.visible = false;
    this.arm.frustumCulled = false;
    this.arm.renderOrder = 7;
    this.object.add(this.arm);
  }

  createLodModel(highDetail, type) {
    if (!Config.performance.useEnemyLod) return highDetail;
    return createLodObject(
      `Enemy_${type}_LOD`,
      highDetail,
      createEnemyLowModel(type),
      Config.performance.enemyLodDistance,
      Config.performance.enemyHideDistance
    );
  }

  createHpBar() {
    const group = new THREE.Group();
    const tripoHeight = this.tripoModel ? this.game.gameplayModelHeight(TRIPO_ENEMY_MODELS[this.type].key) : 0;
    group.position.y = this.type === 'guardian' ? 2.25 : Math.max(1.85, tripoHeight + 0.3);
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x161616, transparent: true, opacity: 0.72, depthWrite: false })
    );
    const fg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xff5d61, transparent: true, opacity: 0.9, depthWrite: false })
    );
    fg.position.z = 0.01;
    fg.name = 'fg';
    group.add(bg, fg);
    group.visible = false;
    return group;
  }

  createSniperBeam() {
    const marker = new THREE.Mesh(SNIPER_MARKER_GEOMETRY, SNIPER_MARKER_MATERIAL);
    marker.name = 'SniperMarker';
    marker.position.y = 2.15;
    marker.rotation.x = Math.PI * 0.5;
    this.object.add(marker);
    this.beam = new THREE.Group();
    this.beam.name = 'SniperTrackingBeam';
    this.beam.position.y = 1.4;
    this.beam.visible = false;
    const makeBeam = (name, material, radius) => {
      const mesh = new THREE.Mesh(SNIPER_BEAM_GEOMETRY, material);
      mesh.name = name;
      mesh.userData.radius = radius;
      mesh.renderOrder = 8;
      mesh.frustumCulled = false;
      this.beam.add(mesh);
      return mesh;
    };
    this.beamWarning = makeBeam('SniperWarning', SNIPER_BEAM_MATERIALS.warning, 0.055);
    this.beamGlow = makeBeam('SniperBeamGlow', SNIPER_BEAM_MATERIALS.glow, 0.45);
    this.beamCore = makeBeam('SniperBeamCore', SNIPER_BEAM_MATERIALS.core, 0.11);
    this.object.add(this.beam);
  }

  getModelAnimationRoot() {
    if (this.model?.isLOD) return this.model.levels[0]?.object ?? null;
    return this.model;
  }

  initializeModelAnimations() {
    const root = this.getModelAnimationRoot();
    const clips = root?.animations ?? [];
    const findClip = (name) => clips.find((clip) => clip.name.toLowerCase() === name);
    const idleClip = findClip('idle');
    const walkClip = findClip('walk');
    if (!root || !idleClip || !walkClip) return;

    this.modelMixer = new THREE.AnimationMixer(root);
    const clipSet = { idle: idleClip, walk: walkClip, attack: findClip('attack'), hit: findClip('hit'), die: findClip('die') };
    for (const [name, clip] of Object.entries(clipSet)) {
      if (!clip) continue;
      const action = this.modelMixer.clipAction(clip);
      const loops = name === 'idle' || name === 'walk';
      action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
      action.clampWhenFinished = name === 'die';
      this.modelActions[name] = action;
    }
    this.modelBaseAnimation = 'walk';
    this.playModelAnimation('walk', 0);
    // 群れの足並みがそろわないように開始位置をずらす
    this.modelActions.walk.time = Math.random() * walkClip.duration;
  }

  getAnimationSetting(key) {
    return this.stats[key] ?? Config.enemy.animation[key];
  }

  get modelAnimationFade() {
    return this.stats.animationFade ?? Config.enemy.animation.fade;
  }

  playModelAnimation(name, fade = this.modelAnimationFade) {
    const next = this.modelActions[name];
    if (!next || this.activeModelAction === next) return;
    const previous = this.activeModelAction;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    if (previous) previous.crossFadeTo(next, fade, false);
    this.activeModelAction = next;
  }

  updateModelAnimation(dt) {
    const root = this.getModelAnimationRoot();
    if (this.modelMixer && root?.visible) this.modelMixer.update(dt);
    if (this.modelAnimationTimer <= 0) return;
    this.modelAnimationTimer = Math.max(0, this.modelAnimationTimer - dt);
    if (this.modelAnimationTimer === 0) this.playModelAnimation(this.modelBaseAnimation);
  }

  playModelOneShot(name) {
    const action = this.modelActions[name];
    if (!action) return false;
    if (this.activeModelAction === action) this.activeModelAction = null;
    this.playModelAnimation(name);
    this.modelAnimationTimer = action.getClip().duration;
    return true;
  }

  updateLocomotionAnimation(dt) {
    const walk = this.modelActions.walk;
    if (!walk) return;
    const speed = Math.sqrt(horizontalDistanceSq(this.position, this.lastAnimationPosition)) / dt;
    this.lastAnimationPosition.copy(this.position);
    this.modelBaseAnimation = speed > this.getAnimationSetting('walkThreshold') ? 'walk' : 'idle';
    walk.timeScale = clamp(
      speed / (this.stats.walkAnimationSpeed ?? this.speed),
      this.getAnimationSetting('walkTimeScaleMin'),
      this.getAnimationSetting('walkTimeScaleMax')
    );
    if (this.modelAnimationTimer === 0) this.playModelAnimation(this.modelBaseAnimation);
  }

  spawnDeathCorpse() {
    const dieAction = this.modelActions.die;
    const root = this.getModelAnimationRoot();
    if (!dieAction || !root?.visible) return false;
    const corpse = new THREE.Group();
    corpse.name = `EnemyCorpse_${this.type}`;
    corpse.position.copy(this.position);
    corpse.add(this.model);
    this.game.scene.add(corpse);
    if (this.beam) this.beam.visible = false;
    this.playModelAnimation('die', 0.06);
    const mixer = this.modelMixer;
    const model = this.model;
    const baseY = model.userData.baseY ?? 0;
    const sinkSeconds = this.getAnimationSetting('corpseSinkSeconds');
    const sinkDepth = this.getAnimationSetting('corpseSinkDepth');
    const duration = dieAction.getClip().duration + this.getAnimationSetting('corpseLingerSeconds') + sinkSeconds;
    // 敵モデルはジオメトリとマテリアルをテンプレートと共有しているので破棄しない
    this.game.effects.push({
      object: corpse,
      life: duration,
      duration,
      dispose: false,
      update(effect, dt) {
        effect.life -= dt;
        mixer.update(dt);
        if (effect.life < sinkSeconds) {
          const t = clamp(1 - effect.life / sinkSeconds, 0, 1);
          model.position.y = baseY - t * t * sinkDepth;
        }
      }
    });
    return true;
  }

  beginShooterAttack(target) {
    this.pendingShotTarget.copy(target);
    if (!this.playModelOneShot('attack')) {
      this.game.spawnEnemyProjectile(this.position, this.pendingShotTarget, Config.enemy.shooter);
      return;
    }
    this.pendingShotTimer = Config.enemy.shooter.fireWindup;
  }

  update(dt) {
    if (this.dead) return;
    const throttledDt = this.getThrottledDt(dt);
    if (throttledDt <= 0) return;
    dt = throttledDt;
    this.updateModelAnimation(dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.buildingImpactTimer = Math.max(0, this.buildingImpactTimer - dt);
    this.burstImmuneTimer = Math.max(0, this.burstImmuneTimer - dt);
    this.fireTimer -= dt;
    this.lifeTimer -= dt;
    this.matureTimer -= dt;
    if (this.matureTimer <= 0) {
      const adultType = this.type === 'dragonflyLarva' ? 'dragonfly' : 'frog';
      this.game.spawnEnemy(adultType, this.position, this.homeEgg);
      this.die(false);
      this.game.spawnBurstEffect(this.position, 2.4, adultType === 'dragonfly' ? 0x9ee9ff : 0x9bd15b);
      return;
    }
    if (this.lifeTimer <= 0) {
      this.die(false);
      this.game.spawnDust(this.position, 0xffd86d);
      return;
    }
    if (this.game.player.dead) {
      if (this.beam) this.beam.visible = false;
      if (this.arm) this.arm.visible = false;
      this.beamState = 'idle';
      this.updateDeathApproach(dt);
    }
    else if (this.type === 'frog') this.updateFrog(dt);
    else if (this.type === 'dragonfly') this.moveToward(this.game.player.position, dt, this.speed);
    else if (this.type === 'dragonflyLarva' || this.type === 'tadpole') this.updateAquaticLarva(dt);
    else if (this.type === 'spawner') this.updateSpawner(dt);
    else if (this.type === 'sniper') this.updateSniper(dt);
    else if (this.type === 'shooter') this.updateShooter(dt);
    else if (this.type === 'guardian') this.updateGuardian(dt);
    else if (this.type === 'footprint') this.updateFootprint(dt);
    else if (this.type === 'crier') this.updateCrier(dt);
    else if (this.type === 'hand') this.updateHand(dt);
    else if (this.type === 'rootsucker') this.updateRootsucker(dt);
    else if (this.type === 'swarmbird') this.updateSwarmbird(dt);
    else if (this.type === 'shadow') this.updateShadow(dt);
    else this.moveToward(this.game.player.position, dt, this.speed);
    this.distanceSqToPlayer = horizontalDistanceSq(this.position, this.game.player.position);
    // 根を張った吸水根は押されても動かない（乾いた円がずれないように）
    if (this.root?.rooted) this.knock.set(0, 0, 0);
    else if (this.distanceSqToPlayer <= Config.performance.enemyAvoidanceDistance ** 2) this.applyAvoidance(dt);
    if (this.knock.lengthSq() > 0.001) {
      this.position.x += this.knock.x * dt;
      this.position.z += this.knock.z * dt;
      this.knock.multiplyScalar(Math.pow(0.05, dt));
    }
    // 群れ鳥は空を飛ぶので建物に当たらない
    const flying = this.type === 'swarmbird' || (this.type === 'shadow' && this.shadow.height > 2);
    const blockedBuilding = flying ? null : this.game.resolveBuildingCollision(this.position, this.collisionRadius);
    if (blockedBuilding && this.buildingImpactTimer <= 0) {
      this.buildingImpactTimer = 0.85;
      this.game.damageBuilding(blockedBuilding, Math.max(3, this.stats.damage * 0.25), this.position);
    }
    clampToCircle(this.position, Config.map.radius - 1.2);
    this.distanceSqToPlayer = horizontalDistanceSq(this.position, this.game.player.position);
    // 産卵獣の体（と、それを使う仮の鳴き）は後ろ向きに作られている
    const backwards = this.type === 'spawner' || (this.type === 'crier' && !this.tripoModel);
    this.model.rotation.y = angleToXZ(this.position, this.game.player.position) + (backwards ? Math.PI : 0);
    if (this.modelActions.walk) this.updateLocomotionAnimation(dt);
    else this.model.position.y = (this.model.userData.baseY ?? 0) + Math.abs(Math.sin(this.game.elapsed * (this.type === 'spawner' ? 12 : 7))) * 0.06;
    this.updateContactDamage();
    this.updateHpBar();
    if (this.type === 'shadow') this.updateShadowHpBar();
  }

  getThrottledDt(dt) {
    if (!Config.performance.useEnemyLod || this.game.player.dead) {
      this.updateAccumulator = 0;
      return dt;
    }
    const distanceSq = horizontalDistanceSq(this.position, this.game.player.position);
    let interval = 0;
    if (distanceSq > Config.performance.enemyVeryFarUpdateDistance ** 2) {
      interval = Config.performance.enemyVeryFarUpdateInterval;
    } else if (distanceSq > Config.performance.enemyFarUpdateDistance ** 2) {
      interval = Config.performance.enemyFarUpdateInterval;
    }
    if (interval <= 0) {
      this.updateAccumulator = 0;
      return dt;
    }
    this.updateAccumulator += dt;
    if (this.updateAccumulator < interval) return 0;
    const accumulated = Math.min(0.25, this.updateAccumulator);
    this.updateAccumulator = 0;
    return accumulated;
  }

  updateDeathApproach(dt) {
    const distanceSq = horizontalDistanceSq(this.position, this.game.player.position);
    if (distanceSq > 1.15 ** 2) {
      const creepScale = this.type === 'spawner' ? 0.22 : this.type === 'shooter' || this.type === 'sniper' ? 0.45 : 0.55;
      this.moveToward(this.game.player.position, dt, Math.max(0.85, this.speed * creepScale));
      return;
    }
    const angle = this.game.elapsed * 0.9 + this.position.x * 0.3 + this.position.z * 0.2;
    this.position.x += Math.sin(angle) * dt * 0.16;
    this.position.z += Math.cos(angle) * dt * 0.16;
  }

  // 道の上の、数秒前にプレイヤーがいた地点へ向かう。道が途切れていれば見失い、ゆっくり寄りながら道を探す。
  updateFootprint(dt) {
    const cfg = Config.enemy.footprint;
    const trail = this.game.playerTrail;
    const target = trail ? advanceFootprint(this.footprint, trail, this.game.elapsed, dt, cfg, this.position) : null;
    const tracking = !!target;
    if (tracking) {
      const dx = target.x - this.position.x;
      const dz = target.z - this.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1e-4) this.moveToward(target, dt, Math.min(this.speed, distance / Math.max(dt, 1e-4)));
    } else {
      this.moveToward(this.game.player.position, dt, cfg.lostSpeed);
    }
    if (tracking !== this.footprint.tracking) {
      this.footprint.tracking = tracking;
      if (!tracking && this.game.footprintStats) this.game.footprintStats.lost += 1;
      for (const material of this.footprintMaterials ?? []) material.opacity = tracking ? 0.82 : 0.4;
    }
  }

  // 動かない。cryInterval ごとに膨らみ（予兆）、膨らみきると鳴いて周りの卵の孵化を早める。
  updateCrier(dt) {
    const cfg = Config.enemy.crier;
    const crier = this.crier;
    crier.timer -= dt;
    if (!crier.swelling && crier.timer <= cfg.swellSeconds) {
      crier.swelling = true;
      this.game.onCrierSwell?.(this);
    }
    const swell = crier.swelling ? clamp(1 - crier.timer / cfg.swellSeconds, 0, 1) : 0;
    this.model.scale.copy(crier.baseScale).multiplyScalar(1 + swell * swell * cfg.swellScale);
    for (const material of this.crierMaterials ?? []) {
      if ('emissiveIntensity' in material) material.emissiveIntensity = (this.tripoModel ? TRIPO_ENEMY_MODELS.crier.glowIntensity : 0.2) + swell * 1.3;
    }
    if (crier.timer > 0) return;
    crier.timer = cfg.cryInterval;
    crier.swelling = false;
    this.model.scale.copy(crier.baseScale);
    this.game.onCrierCry?.(this);
  }

  // 近づいて腕を伸ばし（予兆）、伸ばしきったときに届けば掴む。掴んでいるあいだは動かない。
  // プレイヤーが変身するか、時間切れか、プレイヤーが離れすぎると離す（離す処理は Player.updateGrab）。
  updateRootsucker(dt) {
    const cfg = Config.enemy.rootsucker;
    const root = this.root;
    let glow = 0.1;
    if (!root.rooted) {
      root.timer -= dt;
      glow = 0.1 + clamp(1 - root.timer / cfg.rootSeconds, 0, 1) * 0.8;
      if (root.timer <= 0) {
        root.rooted = true;
        root.age = 0;
        this.dryCircle.visible = true;
        this.game.onRootsuckerRooted?.(this);
      }
    }
    if (root.rooted) {
      root.age += dt;
      const grow = clamp(root.age / cfg.growSeconds, 0, 1);
      root.radius = cfg.dryRadiusStart + (cfg.dryRadiusMax - cfg.dryRadiusStart) * grow;
      // 根を張ってすぐは小さく現れてから所定の半径へ。広がっているあいだは縁が脈打つ。
      const appear = clamp(root.age / 0.6, 0, 1);
      this.dryCircle.scale.setScalar(Math.max(0.01, root.radius * (0.6 + appear * 0.4)));
      this.dryFillMaterial.opacity = DRY_CIRCLE_OPACITY * appear;
      const pulse = grow < 1 ? 0.75 + Math.sin(this.game.elapsed * 3.2) * 0.25 : 0.7;
      this.dryEdgeMaterial.opacity = DRY_EDGE_OPACITY * appear * pulse;
      glow = 0.35;
    }
    for (const material of this.rootsuckerMaterials ?? []) {
      if ('emissiveIntensity' in material) material.emissiveIntensity = glow;
    }
  }

  updateHand(dt) {
    const cfg = Config.enemy.hand;
    const hand = this.hand;
    const player = this.game.player;
    const distance = Math.sqrt(horizontalDistanceSq(this.position, player.position));
    hand.cooldown = Math.max(0, hand.cooldown - dt);
    let glow = 0.08;
    if (hand.state === 'approach') {
      if (distance > 1.3) this.moveToward(player.position, dt, this.speed);
      if (hand.cooldown <= 0 && distance <= cfg.reach && player.form === 'human' && !player.grabbedBy) {
        hand.state = 'windup';
        hand.timer = cfg.windupSeconds;
        this.game.onHandWindup?.(this);
      }
    } else if (hand.state === 'windup') {
      hand.timer -= dt;
      const t = clamp(1 - hand.timer / cfg.windupSeconds, 0, 1);
      glow = 0.08 + t * 1.2;
      hand.aim.copy(player.position);
      if (hand.timer <= 0) {
        const canGrab = distance <= cfg.reach + 0.4 && player.form === 'human' && !player.dead && !player.grabbedBy && !(player.phaseTimer > 0);
        if (canGrab) {
          hand.state = 'hold';
          player.grab?.(this, cfg.holdSeconds);
        } else {
          hand.state = 'approach';
          hand.cooldown = cfg.cooldown * 0.5;
          this.game.onHandMiss?.(this);
        }
      }
      this.updateHandArm(t, false);
    } else if (hand.state === 'hold') {
      glow = 0.9;
      hand.aim.copy(player.position);
      if (player.grabbedBy !== this) {
        hand.state = 'approach';
        hand.cooldown = cfg.cooldown;
      }
    }
    if (hand.state === 'hold') this.updateHandArm(1, true);
    else if (hand.state === 'approach' && this.arm) this.arm.visible = false;
    for (const material of this.handMaterials ?? []) {
      if ('emissiveIntensity' in material) material.emissiveIntensity = glow;
    }
  }

  // extend: 0〜1 の伸び具合。予兆では届く距離（reach）まで、掴んでいればプレイヤーまで。
  updateHandArm(extend, holding) {
    if (!this.arm) return;
    const cfg = Config.enemy.hand;
    const dx = this.hand.aim.x - this.position.x;
    const dz = this.hand.aim.z - this.position.z;
    const distance = Math.max(0.01, Math.hypot(dx, dz));
    const length = holding ? distance : Math.min(distance, cfg.reach) * extend;
    if (length < 0.05) {
      this.arm.visible = false;
      return;
    }
    tempVec2.set(dx / distance, 0, dz / distance);
    this.arm.quaternion.setFromUnitVectors(HAND_ARM_UP, tempVec2);
    this.arm.position.set(tempVec2.x * length * 0.5, HAND_ARM_HEIGHT, tempVec2.z * length * 0.5);
    const radius = holding ? 0.16 : 0.07;
    this.arm.scale.set(radius, length, radius);
    this.armMaterial.opacity = holding ? 0.92 : 0.35 + extend * 0.4;
    this.arm.visible = true;
  }

  updateAquaticLarva(dt) {
    if (this.stream?.timer > 0) {
      // A line sent by the floodgate mother: swims straight until its time is up or it reaches land.
      this.stream.timer -= dt;
      const next = { x: this.position.x + this.stream.x * this.stream.speed * dt, z: this.position.z + this.stream.z * this.stream.speed * dt };
      if (this.game.isWaterPosition(next)) {
        this.position.x = next.x;
        this.position.z = next.z;
      } else this.stream.timer = 0;
      return;
    }
    const distance = Math.sqrt(horizontalDistanceSq(this.position, this.game.player.position));
    if (distance < 3.2) this.moveAway(this.game.player.position, dt, this.speed);
    else {
      this.position.x += Math.sin(this.game.elapsed * 0.8 + this.position.z) * dt * this.speed * 0.35;
      this.position.z += Math.cos(this.game.elapsed * 0.7 + this.position.x) * dt * this.speed * 0.35;
    }
  }

  updateFrog(dt) {
    const player = this.game.player;
    const distance = Math.sqrt(horizontalDistanceSq(this.position, player.position));
    this.jumpTimer -= dt;
    if (this.jumpPhase > 0) {
      this.jumpPhase = Math.max(0, this.jumpPhase - dt);
      const t = 1 - this.jumpPhase / 0.75;
      this.model.position.y = (this.model.userData.baseY ?? 0) + Math.sin(t * Math.PI) * 3.4;
      this.moveToward(player.position, dt, this.speed * 4.2);
      if (this.jumpPhase === 0 && distance < 2.4) player.takeDamage(Config.enemy.frog.damage);
      return;
    }
    if (distance <= Config.enemy.frog.jumpRange && this.jumpTimer <= 0) {
      this.jumpTimer = Config.enemy.frog.jumpInterval;
      this.jumpPhase = 0.75;
    } else this.moveToward(player.position, dt, this.speed);
  }

  updateShooter(dt) {
    const player = this.game.player;
    const distance = Math.sqrt(horizontalDistanceSq(this.position, player.position));
    const desired = Config.enemy.shooter.range * 0.72;
    if (distance < desired) this.moveAway(player.position, dt, this.speed);
    else if (distance > Config.enemy.shooter.range) this.moveToward(player.position, dt, this.speed);
    if (this.pendingShotTimer > 0) {
      this.pendingShotTimer = Math.max(0, this.pendingShotTimer - dt);
      if (this.pendingShotTimer === 0) {
        this.game.spawnEnemyProjectile(this.position, this.pendingShotTarget, Config.enemy.shooter);
      }
    }
    if (this.pendingShotTimer === 0 && distance <= Config.enemy.shooter.range + 2 && this.fireTimer <= 0) {
      this.fireTimer = Config.enemy.shooter.fireInterval;
      this.beginShooterAttack(player.position);
    }
  }

  updateSniper(dt) {
    const stats = Config.enemy.sniper;
    const player = this.game.player;
    const distance = Math.sqrt(horizontalDistanceSq(this.position, player.position));
    if (distance < stats.range * 0.55) this.moveAway(player.position, dt, this.speed);
    else if (distance > stats.range * 0.9) this.moveToward(player.position, dt, this.speed);

    if (this.beamState === 'idle' && distance <= stats.range && this.fireTimer <= 0) {
      this.beamState = 'warning';
      this.beamTimer = stats.warningSeconds;
      this.beamAim = angleToXZ(this.position, player.position);
      this.beamTrackedTarget.copy(player.position);
      this.fireTimer = stats.fireInterval;
    }
    if (this.beamState === 'idle') return;

    if (player.form === 'bird') {
      this.beamTrackedTarget.copy(player.position);
    } else {
      const follow = 1 - Math.exp(-dt / stats.groundTrackingLagSeconds);
      this.beamTrackedTarget.lerp(player.position, follow);
    }
    const desiredAngle = angleToXZ(this.position, this.beamTrackedTarget);
    const turnRate = this.beamState === 'warning' ? stats.warningTurnRate : stats.beamTurnRate;
    this.beamAim += clamp(signedAngleDifference(desiredAngle, this.beamAim), -turnRate * dt, turnRate * dt);
    this.beamTimer -= dt;
    if (this.beamState === 'warning' && this.beamTimer <= 0) {
      this.beamState = 'firing';
      this.beamTimer = stats.beamSeconds;
      this.beamHitTimer = 0;
      this.playModelOneShot('attack');
    } else if (this.beamState === 'firing' && this.beamTimer <= 0) {
      this.beamState = 'idle';
      this.beam.visible = false;
      return;
    }

    this.updateSniperBeamVisual(Math.min(distance, stats.range), player.visualHeight);
    if (this.beamState !== 'firing') return;
    this.beamHitTimer = Math.max(0, this.beamHitTimer - dt);
    const hitRadius = player.form === 'bird' ? stats.birdHitRadius : stats.humanHitRadius;
    if (this.beamHitTimer === 0 && horizontalPointSegmentDistanceSq(player.position, this.position, this.beamEnd) <= hitRadius ** 2) {
      player.takeDamage(stats.damage);
      this.beamHitTimer = stats.hitInterval;
    }
  }

  updateSniperBeamVisual(horizontalLength, playerHeight) {
    const dx = Math.sin(this.beamAim) * horizontalLength;
    const dz = Math.cos(this.beamAim) * horizontalLength;
    this.beamEnd.set(this.position.x + dx, 0, this.position.z + dz);
    this.beamDirection.set(dx, playerHeight + 1 - this.beam.position.y, dz);
    const length = Math.max(0.01, this.beamDirection.length());
    this.beam.quaternion.setFromUnitVectors(SNIPER_BEAM_UP, this.beamDirection.normalize());
    this.beam.visible = true;
    this.beamWarning.visible = this.beamState === 'warning';
    this.beamGlow.visible = this.beamCore.visible = this.beamState === 'firing';
    for (const mesh of [this.beamWarning, this.beamGlow, this.beamCore]) {
      mesh.position.y = length * 0.5;
      mesh.scale.set(mesh.userData.radius, length, mesh.userData.radius);
    }
  }

  updateGuardian(dt) {
    const playerDistance = Math.sqrt(horizontalDistanceSq(this.position, this.game.player.position));
    if (playerDistance < 9) {
      this.moveToward(this.game.player.position, dt, this.speed * 1.1);
      return;
    }
    if (this.homeEgg && !this.homeEgg.dead) {
      const homeDistance = Math.sqrt(horizontalDistanceSq(this.position, this.homeEgg.position));
      if (homeDistance > 4) this.moveToward(this.homeEgg.position, dt, this.speed);
      else {
        this.position.x += Math.sin(this.game.elapsed + this.position.z) * dt * 0.6;
        this.position.z += Math.cos(this.game.elapsed + this.position.x) * dt * 0.6;
      }
    } else {
      this.moveToward(this.game.player.position, dt, this.speed);
    }
  }

  updateSpawner(dt) {
    const playerDistance = Math.sqrt(horizontalDistanceSq(this.position, this.game.player.position));
    if (playerDistance < Config.enemy.spawner.fleeRange) {
      this.moveAway(this.game.player.position, dt, this.speed * 1.25);
    } else {
      this.destinationTimer -= dt;
      if (this.destinationTimer <= 0 || horizontalDistanceSq(this.position, this.destination) < 8) {
        this.destination.copy(this.game.pickLowEggDensityPoint(this.position));
        this.destinationTimer = Config.enemy.spawner.destinationSeconds;
      }
      this.moveToward(this.destination, dt, this.speed);
    }
    this.layTimer -= dt;
    if (this.layTimer <= 0) {
      this.layTimer = randRange(Config.enemy.spawner.layMin, Config.enemy.spawner.layMax);
      this.tryLayEgg();
    }
  }

  tryLayEgg() {
    const nearby = this.game.countEggsNear(this.position, Config.enemy.spawner.eggCheckRange);
    if (nearby >= Config.enemy.spawner.nearEggLimit) {
      this.destinationTimer = 0;
      return;
    }
    const position = this.game.findEggSpawnPosition(this.position, 4.5, 12);
    if (!position) {
      this.destinationTimer = 0;
      return;
    }
    const egg = this.game.spawnEgg(position);
    if (!egg) return;
    this.game.spawnDust(position, 0xdfff85);
    this.playModelOneShot('attack');
  }

  moveToward(target, dt, speed) {
    normalizeXZ(tempVec, target.x - this.position.x, target.z - this.position.z);
    this.position.x += tempVec.x * speed * dt;
    this.position.z += tempVec.z * speed * dt;
  }

  moveAway(target, dt, speed) {
    normalizeXZ(tempVec, this.position.x - target.x, this.position.z - target.z);
    this.position.x += tempVec.x * speed * dt;
    this.position.z += tempVec.z * speed * dt;
  }

  applyAvoidance(dt) {
    const neighbors = this.game.enemyGrid.query(this.position, 2.2, this.game.scratchNeighbors);
    let pushX = 0;
    let pushZ = 0;
    for (const other of neighbors) {
      if (other === this || other.dead) continue;
      const dx = this.position.x - other.position.x;
      const dz = this.position.z - other.position.z;
      const dSq = dx * dx + dz * dz;
      if (dSq > 0.0001 && dSq < 3.1) {
        const strength = (3.1 - dSq) / 3.1;
        pushX += dx * strength;
        pushZ += dz * strength;
      }
    }
    this.position.x += pushX * dt * 0.65;
    this.position.z += pushZ * dt * 0.65;
  }

  updateContactDamage() {
    const player = this.game.player;
    if (player.phaseTimer > 0) return;
    if (this.type === 'shadow') {
      this.updateShadowContact(player);
      return;
    }
    // 群れ鳥は鳥形態のときだけ、高さが近づいてから当たる（人間形態には当たらない）
    if (this.type === 'swarmbird') {
      if (player.form !== 'bird' || this.swarm.mode !== 'hunt') return;
      if (Math.abs(this.swarm.height - (player.visualHeight ?? 0)) > 2.2) return;
    } else if (player.form === 'bird' && this.type !== 'dragonfly') return;
    if (this.distanceSqToPlayer > 1.55) return;
    if (this.attackTimer > 0) return;
    this.attackTimer = this.type === 'swarmbird' ? Config.enemy.swarmbird.contactCooldown : 0.75;
    const multiplier = this.type === 'dragonfly' && player.form === 'bird' ? Config.enemy.dragonfly.birdDamageMultiplier : 1;
    const hpBefore = player.hp;
    player.takeDamage((this.stream?.timer > 0 ? this.stream.damage : this.stats.damage) * multiplier);
    if (this.type === 'swarmbird') this.game.onSwarmbirdHit?.(hpBefore - player.hp);
    if (this.type === 'footprint' && this.game.footprintStats) this.game.footprintStats.hits += 1;
    if (this.type === 'chaser' || this.type === 'guardian') this.playModelOneShot('attack');
  }

  updateHpBar() {
    this.hpBar.visible = this.hp < this.maxHp && this.distanceSqToPlayer <= Config.performance.enemyHpBarDistance ** 2;
    if (!this.hpBar.visible) return;
    const fg = this.hpBar.getObjectByName('fg');
    if (fg) fg.scale.x = clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.lookAt(this.game.camera.position);
  }

  // バースト技（アカメの爆発・ツキミのビーム・キイチゴの斬撃）は burstReward: false で呼ぶ
  takeDamage(amount, origin = null, strongKnock = false, burstReward = true) {
    if (this.dead) return;
    if (!burstReward && this.burstImmuneTimer > 0) return;
    if (this.type === 'shadow' && !this.shadowCanBeHit()) return;
    this.hp -= amount;
    this.game.spawnHitSpark(this.position, this.type === 'spawner' ? 0xffe36c : 0xffffff);
    if (origin) {
      normalizeXZ(tempVec2, this.position.x - origin.x, this.position.z - origin.z);
      this.knock.x += tempVec2.x * (strongKnock ? 14 : 4);
      this.knock.z += tempVec2.z * (strongKnock ? 14 : 4);
    }
    if (this.hp <= 0) this.die(true, burstReward);
    else if (this.activeModelAction !== this.modelActions.hit) this.playModelOneShot('hit');
  }

  die(reward, burstReward = reward) {
    if (this.dead) return;
    this.dead = true;
    this.object.visible = false;
    if (reward) this.spawnDeathCorpse();
    if (reward) {
      this.game.playSfx('enemyDie', { volume: 0.72, cooldown: 0.035 });
      this.game.feelHit?.(this.type === 'spawner' || this.type === 'shadow' ? 'bigKill' : 'enemyKill');
      this.game.onEnemyKilled?.(this);
      if (burstReward) this.game.player.addBurst(this.type === 'spawner' ? Config.player.burstGainSpawner : Config.player.burstGainEnemy);
      this.game.spawnXp(this.position, this.stats.xp * (this.splitHalf ? Config.enemy.splitshell.halfScale : 1));
      this.game.spawnRandomPickup(this.position, this.type === 'spawner' ? 'spawner' : 'enemy');
      if (this.type === 'splitshell' && !burstReward && !this.splitHalf) this.game.onSplitshellBurst?.(this);
      if (this.type === 'shadow') this.game.onShadowDown?.(this);
      this.game.spawnEnemyDissolveEffect(this.position, this.type);
    }
  }
}

export class Projectile {
  constructor(game, material, radius = 0.16) {
    this.game = game;
    this.object = new THREE.Group();
    this.object.name = 'Projectile';
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 14, 10),
      material
    );
    this.spriteMaterial = new THREE.SpriteMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.sprite = new THREE.Sprite(this.spriteMaterial);
    this.sprite.visible = false;
    this.sprite.renderOrder = 3;
    this.trailSprites = [];
    this.trailHistory = [];
    for (let i = 0; i < 6; i++) {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const trail = new THREE.Sprite(material);
      trail.visible = false;
      trail.renderOrder = 2;
      this.trailSprites.push(trail);
      this.trailHistory.push(new THREE.Vector3());
      this.object.add(trail);
    }
    this.object.add(this.mesh, this.sprite);
    this.object.visible = false;
    this.position = this.object.position;
    this.velocity = new THREE.Vector3();
    this.previousPosition = new THREE.Vector3();
    this.active = false;
    this.dead = true;
    this.life = 0;
    this.kind = 'player';
    this.damage = 0;
    this.radius = radius;
    this.pierce = 0;
    this.hitSet = new Set();
    this.spriteFrames = [];
    this.spriteFrameRate = 24;
    this.spriteFrame = -1;
    this.spriteTime = 0;
    this.spriteSize = radius * 5.5;
    this.spriteRotationSpeed = 1.5;
    this.trailCount = 0;
    this.trailSamples = 0;
    this.trailSampleTimer = 0;
    this.trailSampleInterval = 0.03;
    this.trailOpacity = 0.35;
    this.trailScaleStep = 0.1;
  }

  setMaterial(material) {
    this.mesh.material = material;
  }

  reset(origin, target, spec) {
    this.position.copy(origin);
    this.velocity.copy(target).sub(origin);
    if (this.velocity.lengthSq() < 0.001) this.velocity.set(0, 0, 1);
    this.velocity.normalize().multiplyScalar(spec.speed);
    this.life = spec.life ?? 2.1;
    this.kind = spec.kind;
    this.damage = spec.damage;
    this.radius = spec.radius ?? this.radius;
    this.pierce = spec.pierce ?? 0;
    this.pierceGain = spec.pierceGain ?? 0;
    this.hitSet.clear();
    this.spriteFrames = spec.spriteFrames ?? [];
    this.spriteFrameRate = spec.spriteFrameRate ?? 24;
    this.spriteTime = spec.spriteStartTime ?? 0;
    this.spriteFrame = -1;
    this.spriteRotationSpeed = spec.spriteRotationSpeed ?? 1.5;
    this.object.scale.setScalar(1);
    this.mesh.scale.setScalar(this.radius / 0.16);
    const useSprite = this.spriteFrames.length > 0;
    this.mesh.visible = !useSprite;
    this.sprite.visible = useSprite;
    this.configureTrail(useSprite, spec);
    if (useSprite) {
      this.spriteSize = spec.spriteSize ?? this.radius * 5.5;
      this.sprite.scale.set(this.spriteSize, this.spriteSize, 1);
      this.spriteMaterial.opacity = spec.spriteOpacity ?? 1;
      this.spriteMaterial.rotation = spec.spriteRotation ?? Math.random() * TAU;
      this.updateSpriteFrame(this.spriteTime);
    }
    this.object.visible = true;
    this.active = true;
    this.dead = false;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    this.previousPosition.copy(this.position);
    this.position.addScaledVector(this.velocity, dt);
    this.mesh.rotation.y += dt * 12;
    if (this.sprite.visible) {
      this.spriteTime += dt;
      this.spriteMaterial.rotation += dt * this.spriteRotationSpeed;
      this.sampleTrail(dt);
      this.updateSpriteFrame(this.spriteTime);
      this.updateTrailSprites();
    }
    if (this.life <= 0 || Math.hypot(this.position.x, this.position.z) > Config.map.radius + 8) {
      this.game.releaseProjectile(this);
      return;
    }
    const building = this.game.findBuildingHit(this.position, this.radius, this.position.y);
    if (building) {
      this.game.playSfx('projectileHit', { volume: 0.42, cooldown: 0.035 });
      this.game.damageBuilding(building, this.damage, this.previousPosition);
      this.game.releaseProjectile(this);
      return;
    }
    if (this.kind === 'enemy') this.checkPlayerHit();
    else if (this.kind === 'eggSpecial') this.checkEggHit();
    else this.checkEnemyHit();
  }

  configureTrail(useSprite, spec) {
    this.trailCount = useSprite ? Math.min(spec.spriteTrailCount ?? 0, this.trailSprites.length) : 0;
    this.trailSamples = 0;
    this.trailSampleTimer = 0;
    this.trailSampleInterval = spec.spriteTrailInterval ?? 0.03;
    this.trailOpacity = spec.spriteTrailOpacity ?? 0.35;
    this.trailScaleStep = spec.spriteTrailScaleStep ?? 0.1;
    for (let i = 0; i < this.trailSprites.length; i++) {
      this.trailSprites[i].visible = false;
      this.trailHistory[i].copy(this.position);
    }
  }

  sampleTrail(dt) {
    if (this.trailCount <= 0) return;
    this.trailSampleTimer += dt;
    if (this.trailSampleTimer < this.trailSampleInterval) return;
    this.trailSampleTimer %= this.trailSampleInterval;
    for (let i = this.trailCount - 1; i > 0; i--) {
      this.trailHistory[i].copy(this.trailHistory[i - 1]);
    }
    this.trailHistory[0].copy(this.previousPosition);
    this.trailSamples = Math.min(this.trailSamples + 1, this.trailCount);
  }

  updateTrailSprites() {
    for (let i = 0; i < this.trailSprites.length; i++) {
      const trail = this.trailSprites[i];
      if (i >= this.trailSamples || i >= this.trailCount) {
        trail.visible = false;
        continue;
      }
      const fade = 1 - i / (this.trailCount + 1);
      const scale = Math.max(0.25, 1 - (i + 1) * this.trailScaleStep);
      trail.position.copy(this.trailHistory[i]).sub(this.position);
      trail.scale.set(this.spriteSize * scale, this.spriteSize * scale, 1);
      trail.material.opacity = this.trailOpacity * fade;
      trail.material.rotation = this.spriteMaterial.rotation - (i + 1) * 0.12;
      trail.visible = true;
    }
  }

  updateSpriteFrame(time) {
    if (this.spriteFrames.length === 0) return;
    const frame = Math.floor(time * this.spriteFrameRate) % this.spriteFrames.length;
    if (frame === this.spriteFrame) return;
    this.spriteFrame = frame;
    const texture = this.spriteFrames[frame];
    this.spriteMaterial.map = texture;
    this.spriteMaterial.needsUpdate = true;
    for (let i = 0; i < this.trailSprites.length; i++) {
      const material = this.trailSprites[i].material;
      material.map = texture;
      material.needsUpdate = true;
    }
  }

  checkPlayerHit() {
    const player = this.game.player;
    if (player.invincibleTimer > 0) return;
    const hitRadius = this.radius + 0.55;
    const dx = this.position.x - player.position.x;
    const dz = this.position.z - player.position.z;
    const playerHitY = player.visualHeight + 1.1;
    const reachesPlayerFromBelow = playerHitY >= this.position.y - hitRadius;
    if (dx * dx + dz * dz <= hitRadius * hitRadius && reachesPlayerFromBelow) {
      player.takeDamage(this.damage);
      this.game.releaseProjectile(this);
    }
  }

  checkEnemyHit() {
    const enemies = this.game.enemyGrid.query(this.position, this.radius + 0.85, this.game.scratchEnemies);
    for (const enemy of enemies) {
      if (this.hitSet.has(enemy)) continue;
      this.game.playSfx('projectileHit', { volume: 0.42, cooldown: 0.035 });
      enemy.takeDamage(this.damage, this.position);
      this.hitSet.add(enemy);
      if (this.hitSet.size > this.pierce) {
        this.game.releaseProjectile(this);
        return;
      }
      // A6 貫く雨: 貫いた先の敵ほど強く当たる。
      if (this.pierceGain > 0) this.damage *= 1 + this.pierceGain;
    }
  }

  checkEggHit() {
    const eggs = this.game.findEggsInRadius(this.position, this.radius + 0.9, true);
    let best = null;
    let bestDistance = Infinity;
    for (const egg of eggs) {
      const distance = horizontalDistanceSq(this.position, egg.position);
      if (distance < bestDistance) {
        best = egg;
        bestDistance = distance;
      }
    }
    if (best) {
      this.game.playSfx('projectileHit', { volume: 0.42, cooldown: 0.035 });
      best.takeDamage(this.damage, 'special');
      this.game.releaseProjectile(this);
    }
  }
}

export class ExperienceOrb {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Group();
    this.object.name = 'PickupOrb';
    this.model = this.createModel();
    this.object.add(this.model);
    this.glow = this.createGlow();
    this.object.add(this.glow);
    this.object.visible = false;
    this.position = this.object.position;
    this.type = 'xp';
    this.value = 1;
    this.active = false;
    this.dead = true;
  }

  createModel() {
    return new THREE.Mesh(
      PICKUP_GEOMETRIES.xp,
      PICKUP_MATERIALS.xp
    );
  }

  createGlow() {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 10),
      new THREE.MeshBasicMaterial({
        color: 0x45cfff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    glow.name = 'ExperienceCrystalGlow';
    glow.scale.set(1.0, 1.25, 1.0);
    return glow;
  }

  reset(position, value, type = 'xp') {
    this.type = PICKUP_SPECS[type] ? type : 'xp';
    const spec = PICKUP_SPECS[this.type];
    this.object.name = this.type === 'xp' ? 'ExperienceCrystal' : `Pickup_${this.type}`;
    this.position.copy(position);
    this.position.y = 0.45;
    this.value = value ?? 0;
    this.model.geometry = PICKUP_GEOMETRIES[this.type] ?? PICKUP_GEOMETRIES.xp;
    this.model.material = PICKUP_MATERIALS[this.type] ?? PICKUP_MATERIALS.xp;
    this.model.scale.setScalar(this.type === 'burst' ? 1.12 : 1);
    this.model.rotation.set(0, 0, 0);
    this.glow.material.color.setHex(spec.glow);
    this.glow.material.opacity = this.type === 'xp' ? 0.18 : 0.22;
    this.glow.scale.setScalar(this.type === 'magnet' ? 1.35 : 1);
    this.glow.scale.y *= 1.25;
    this.pullSeconds = 0;
    this.object.scale.setScalar(1);
    this.active = true;
    this.dead = false;
    this.object.visible = true;
  }

  update(dt) {
    if (!this.active || this.game.player.dead) return;
    const feedback = this.game.feedbackFxEnabled ? Config.feedbackFx.xpPull : null;
    const player = this.game.player;
    const distanceSq = horizontalDistanceSq(this.position, player.position);
    const showGlow = distanceSq <= Config.performance.xpGlowDistance ** 2;
    const magnetRange = this.type === 'xp' && this.game.elapsed < Config.xp.openingMagnetSeconds
      ? Math.max(player.getPickupMagnetRange(), Config.xp.openingMagnetRange)
      : player.getPickupMagnetRange();
    this.object.rotation.y += dt * (this.type === 'speed' ? 7 : 4);
    this.model.rotation.x = Math.sin(this.game.elapsed * 5 + this.position.x) * 0.08;
    if (this.type === 'magnet') this.model.rotation.x += Math.PI * 0.5;
    // The generated speed seed points up; laid on its side it reads as a spinning dart from the game camera.
    if (this.type === 'speed' && INSTALLED_PICKUP_MODELS.has('speed')) this.model.rotation.z = Math.PI * 0.5;
    this.glow.visible = showGlow;
    if (showGlow) this.glow.material.opacity = 0.13 + Math.sin(this.game.elapsed * 7 + this.position.x) * 0.035;
    this.object.position.y = 0.45 + Math.sin(this.game.elapsed * 6 + this.position.x) * 0.08;
    if (distanceSq < magnetRange ** 2 && distanceSq > 0.0001) {
      normalizeXZ(tempVec, player.position.x - this.position.x, player.position.z - this.position.z);
      let pullSpeed = player.getPickupMagnetSpeed() * (this.type === 'xp' ? 1 : 1.08);
      if (feedback) {
        // A4: the longer an orb is pulled, the faster it flies in, and it shrinks as it reaches the player.
        this.pullSeconds += dt;
        pullSpeed *= xpPullSpeedScale(this.pullSeconds, feedback);
        const step = xpPullStep(Math.sqrt(distanceSq), pullSpeed, dt);
        this.position.x += tempVec.x * step;
        this.position.z += tempVec.z * step;
      } else {
        this.position.x += tempVec.x * pullSpeed * dt;
        this.position.z += tempVec.z * pullSpeed * dt;
      }
    } else {
      this.pullSeconds = 0;
    }
    if (feedback) {
      const s = xpOrbScale(Math.sqrt(horizontalDistanceSq(this.position, player.position)), feedback);
      this.object.scale.setScalar(s);
    } else if (this.object.scale.x !== 1) {
      this.object.scale.setScalar(1);
    }
    if (distanceSq < Config.pickups.pickupRange ** 2) {
      this.collect(player);
    }
  }

  collect(player) {
    const spec = PICKUP_SPECS[this.type] ?? PICKUP_SPECS.xp;
    if (this.type !== 'xp' && Config.audio.newSfx) this.game.playSfx('itemPickup', { volume: 0.7, cooldown: 0.075 });
    else this.game.playSfx('xpPickup', { volume: this.type === 'xp' ? 0.45 : 0.62, cooldown: this.type === 'xp' ? 0.025 : 0.075 });
    if (this.type !== 'xp') {
      this.game.spawnRingEffect(this.position, this.type === 'magnet' ? 2.4 : 1.55, spec.color, 0.34, 0.32);
      if (spec.label) this.game.showMessage(spec.label, 0.8);
    }
    if (this.type === 'xp') {
      player.addXp(this.value);
    } else if (this.type === 'hp') {
      const heal = this.value > 0 ? this.value : player.maxHp * Config.pickups.hpHealRatio;
      player.hp = clamp(player.hp + heal, 0, player.maxHp);
    } else if (this.type === 'mp') {
      const restore = this.value > 0 ? this.value : player.maxMp * Config.pickups.mpRestoreRatio;
      player.mp = clamp(player.mp + restore, 0, player.maxMp);
    } else if (this.type === 'burst') {
      player.addBurst(this.value > 0 ? this.value : Config.pickups.burstValue);
    } else if (this.type === 'magnet') {
      player.pickupMagnetTimer = Math.max(player.pickupMagnetTimer, Config.pickups.magnetItemDuration);
    } else if (this.type === 'shield') {
      player.shieldCharges = Math.min(Config.pickups.shieldMaxCharges, player.shieldCharges + 1);
    } else if (this.type === 'speed') {
      player.speedBoostTimer = Math.max(player.speedBoostTimer, Config.pickups.speedBoostDuration);
    }
    this.game.releaseXp(this);
  }
}

function lerpValue(a, b, t) {
  return a + (b - a) * t;
}
