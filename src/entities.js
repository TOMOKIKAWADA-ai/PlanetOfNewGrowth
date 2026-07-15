import * as THREE from 'three';
import {
  TAU,
  angleToXZ,
  clamp,
  clampToCircle,
  horizontalDistanceSq,
  normalizeXZ,
  randRange,
  randomPointInCircle,
  signedAngleDifference,
  smooth01
} from './math.js';
import { Config } from './config.js';

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
    useFbxAnimations: true,
    useEmbeddedAnimation: false
  }
};
const forward = new THREE.Vector3();
const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const poseEuler = new THREE.Euler();
const poseQuat = new THREE.Quaternion();
const ENEMY_LOD_SPECS = {
  chaser: { color: 0x180c0d, radius: 0.46, height: 1.28, segments: 5 },
  shooter: { color: 0x180c0d, radius: 0.42, height: 1.12, segments: 5 },
  guardian: { color: 0x180c0d, radius: 0.58, height: 1.55, segments: 6 },
  spawner: { color: 0x180c0d, radius: 0.38, height: 1.0, segments: 5 }
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
const EGG_LOD_GEOMETRY = new THREE.DodecahedronGeometry(0.7, 0);
const EGG_LOD_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x180c0d });
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
    this.shieldCharges = 0;
    this.level = 1;
    this.xp = 0;
    this.nextXp = Config.xp.firstLevel;
    this.autoTimer = 0;
    this.specialTimer = 0;
    this.meleeTimer = 0;
    this.meleeWindup = 0;
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
    if (this.underLight) this.group.add(this.underLight);
    this.group.add(this.seedOrbit);
    this.syncSeeds();
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
      this.form = 'bird';
      this.game.cameraRig.startTransition('bird');
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
    if (input.pressed('KeyQ')) this.toggleForm();
    this.autoTimer = Math.max(0, this.autoTimer - dt);
    this.specialTimer = Math.max(0, this.specialTimer - dt);
    this.meleeTimer = Math.max(0, this.meleeTimer - dt);
    this.meleeWindup = Math.max(0, this.meleeWindup - dt);
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.phaseTimer = Math.max(0, this.phaseTimer - dt);
    this.attackLockTimer = Math.max(0, this.attackLockTimer - dt);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    this.diveCooldown = Math.max(0, this.diveCooldown - dt);
    this.burstCooldownTimer = Math.max(0, this.burstCooldownTimer - dt);
    this.updateBurstSequence(dt);
    this.pickupMagnetTimer = Math.max(0, this.pickupMagnetTimer - dt);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);

    this.updateMovement(dt, input);
    this.updateFormResources(dt);
    this.updateDive(dt);
    this.updateCombat(dt, input);
    this.updateSeeds(dt);
    this.updateVisualPose(dt);
    this.updateContactShadow();
  }

  updateMovement(dt, input) {
    let x = 0;
    let z = 0;
    if (input.down('KeyA') || input.down('ArrowLeft')) x -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) x += 1;
    if (input.down('KeyW') || input.down('ArrowUp')) z -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) z += 1;
    normalizeXZ(tempVec, x, z);
    const hasMovementInput = Math.abs(tempVec.x) + Math.abs(tempVec.z) > 0.001;
    const boost = this.speedBoostTimer > 0 ? Config.pickups.speedBoostMultiplier : 1;
    const speed = (this.form === 'bird' ? this.birdSpeed : this.humanSpeed) * boost;
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
      this.position.x += tempVec.x * speed * dt;
      this.position.z += tempVec.z * speed * dt;
      clampToCircle(this.position, Config.map.radius - 2);
      this.game.resolveBuildingCollision(this.position, this.radius);
      clampToCircle(this.position, Config.map.radius - 2);
      if (hasMovementInput) {
        this.moveAngle = Math.atan2(tempVec.x, tempVec.z);
        if (this.attackLockTimer <= 0) this.faceAngle = this.moveAngle;
      }
    }

    const targetHeight = this.form === 'bird' ? Config.player.birdHeight : Config.player.humanHeight;
    if (this.diveState === 'ready') {
      this.visualHeight += (targetHeight - this.visualHeight) * Math.min(1, dt * Config.player.birdFloatSpeed);
    }
    this.group.position.y = this.visualHeight;
  }

  updateFormResources(dt) {
    if (this.form === 'human') {
      this.mp = clamp(this.mp + this.humanRegenMp * dt, 0, this.maxMp);
    } else {
      this.mp = clamp(this.mp - this.birdMpCost * dt, 0, this.maxMp);
      if (this.mp <= 0) this.returnToHuman(true);
    }
  }

  updateCombat(dt, input) {
    if (this.form === 'human') {
      if (input.pressed('KeyE')) this.tryBurst();
      this.tryAutoShoot();
      this.trySpecialEggShot();
      this.updatePulse(dt);
    } else if (this.burst >= Config.player.burstMax) {
      this.game.hint = 'バーストは今使えません';
    }
  }

  tryAutoShoot() {
    if (this.attackLockTimer > 0 || this.autoTimer > 0 || this.meleeWindup > 0) return;
    const target = this.findNearestEnemy(Config.player.autoRange);
    if (!target) return;
    this.fireFromSeeds(target.position, {
      kind: 'player',
      damage: this.autoDamage,
      speed: Config.player.autoProjectileSpeed,
      radius: 0.35,
      pierce: this.pierce
    });
    this.autoTimer = this.autoInterval;
  }

  trySpecialEggShot() {
    if (this.attackLockTimer > 0 || this.specialTimer > 0 || this.meleeWindup > 0) return;
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

  tryMelee() {
    if (this.meleeTimer > 0 || this.attackLockTimer > 0) return;
    this.meleeTimer = Config.player.meleeCooldown;
    this.meleeWindup = Config.player.meleeWindup;
    this.game.spawnMeleeArc(this.position, this.faceAngle, Config.player.meleeRange);
    window.setTimeout(() => {
      if (this.game.state !== 'playing' || this.form !== 'human') return;
      this.resolveMelee();
    }, Config.player.meleeWindup * 1000);
  }

  resolveMelee() {
    const range = Config.player.meleeRange;
    const eggs = this.game.findEggsInRadius(this.position, range);
    const enemies = this.game.enemyGrid.query(this.position, range, this.game.scratchEnemies);
    for (const egg of eggs) {
      if (this.isInFrontArc(egg.position, Config.player.meleeArc)) {
        egg.takeDamage(Config.player.meleeEggDamage, 'melee');
      }
    }
    for (const enemy of enemies) {
      if (this.isInFrontArc(enemy.position, Config.player.meleeArc)) {
        enemy.takeDamage(Config.player.meleeEnemyDamage, this.position);
      }
    }
    for (const building of this.game.findBuildingsInRadius(this.position, range)) {
      if (this.isInFrontArc(building.position, Config.player.meleeArc)) {
        this.game.damageBuilding(building, Config.player.meleeEnemyDamage, this.position);
      }
    }
  }

  isInFrontArc(position, arc) {
    const angle = angleToXZ(this.position, position);
    return Math.abs(signedAngleDifference(angle, this.faceAngle)) <= arc * 0.5;
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
    this.burstCooldownTimer = Config.player.burstCooldown;
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
    const eggs = this.game.motherEgg && !this.game.motherEgg.dead
      ? [...this.game.eggs, this.game.motherEgg]
      : this.game.eggs;
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
    this.game.spawnPulseEffect(this.position, this.pulseRange);
    const enemies = this.game.enemyGrid.query(this.position, this.pulseRange, this.game.scratchEnemies);
    for (const enemy of enemies) enemy.takeDamage(this.pulseDamage, this.position);
    for (const egg of this.game.findEggsInRadius(this.position, this.pulseRange)) {
      egg.takeDamage(Math.max(5, this.pulseDamage * 0.45), 'pulse');
    }
    for (const building of this.game.findBuildingsInRadius(this.position, this.pulseRange)) {
      this.game.damageBuilding(building, this.pulseDamage, this.position);
    }
  }

  updateDive(dt) {
    if (this.form !== 'bird') return;
    if (this.diveState === 'ready') {
      if (this.diveCooldown > 0) return;
      const target = this.findNearestEgg(Config.player.birdEggDetectRange, false);
      const motherTarget = this.game.motherEgg && !this.game.motherEgg.dead
        ? this.findMotherForDive()
        : null;
      this.startDive(motherTarget ?? target);
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
    } else {
      this.diveTarget.takeDamage(Math.max(this.birdDiveDamage, this.diveTarget.hp + 10), 'birdDive');
      this.hp = clamp(this.hp + this.maxHp * Config.player.feedHpRatio, 0, this.maxHp);
      this.mp = clamp(this.mp + this.maxMp * Config.player.feedMpRatio, 0, this.maxMp);
    }
    this.game.spawnDiveImpact(this.position);
    this.game.shake = Math.max(this.game.shake, 0.3);
  }

  findMotherForDive() {
    if (!this.game.motherEgg || this.game.motherEgg.dead) return null;
    const distanceSq = horizontalDistanceSq(this.position, this.game.motherEgg.position);
    return distanceSq <= Config.player.birdMotherDetectRange ** 2 ? this.game.motherEgg : null;
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
    const eggs = includeMother && this.game.motherEgg && !this.game.motherEgg.dead
      ? [...this.game.eggs, this.game.motherEgg]
      : this.game.eggs;
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
    amount *= this.damageTakenMultiplier;
    this.hp = Math.max(0, this.hp - amount);
    this.game.playSfx('playerHit', { volume: 0.82, cooldown: 0.12 });
    this.damageFlashTimer = 0.16;
    this.invincibleTimer = Math.max(this.invincibleTimer, 0.18);
    this.game.shake = Math.max(this.game.shake, 0.18);
    if (this.hp <= 0) {
      this.startDeath();
      return;
    }
    this.game.playVoice('hit', { volume: 0.86, cooldown: 0.55 });
    this.playOneShotAnimation('react');
    if (this.hp <= 0) this.game.finish(false, 'HPが尽きました');
  }

  startDeath() {
    if (this.dead) return;
    this.dead = true;
    this.game.playVoice('dying', { volume: 0.92, cooldown: 10 });
    this.form = 'human';
    this.diveState = 'ready';
    if (this.diveTarget) this.diveTarget.claimed = false;
    this.diveTarget = null;
    this.invincibleTimer = 0;
    this.damageFlashTimer = 0;
    this.visualHeight = Config.player.humanHeight;
    this.group.position.y = this.visualHeight;
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
    const radius = 1.05 + this.seeds.length * 0.08;
    const base = this.game.elapsed * 1.9;
    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];
      const angle = base + i * TAU / this.seeds.length;
      seed.position.set(
        Math.sin(angle) * radius,
        1.45 + Math.sin(base * 1.7 + i) * 0.12,
        Math.cos(angle) * radius
      );
      seed.userData.aimHold = Math.max(0, (seed.userData.aimHold ?? 0) - dt);
      if (seed.userData.aimHold > 0) {
        seed.rotation.y = (seed.userData.aimWorldAngle ?? 0) - this.faceAngle;
      } else {
        seed.rotation.y += dt * 1.6;
      }
    }
  }

  updateVisualPose(dt) {
    const moving = this.game.input.movementActive();
    const bird = this.form === 'bird';
    this.oneShotAnimationTimer = Math.max(0, this.oneShotAnimationTimer - dt);
    this.updatePlayerAnimationState(moving);
    if (this.modelMixer) this.modelMixer.update(dt);
    this.group.visible = true;
    this.group.rotation.y = this.faceAngle;
    if (this.fallback) this.fallback.visible = !this.model && (!bird || !this.birdModel);
    if (this.birdModel) {
      this.birdModel.visible = bird;
      this.birdModel.rotation.x = Config.visuals.birdModelPitch;
      this.birdModel.rotation.y = Config.visuals.birdModelYaw;
      this.birdModel.position.y = this.birdModelBaseY + Math.sin(this.game.elapsed * 5) * 0.08;
    }
    if (this.model) {
      this.model.visible = !bird || !this.birdModel;
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
    return Config.player.birdDiveDamage + this.birdDiveBonus + (this.level - 1) * 0.7;
  }

  get birdMotherDiveDamage() {
    return Config.player.birdMotherDiveDamage + this.birdMotherDiveBonus + (this.level - 1) * 0.35;
  }
}

export class Egg {
  constructor(game, position, isMother = false) {
    this.game = game;
    this.isMother = isMother;
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
    this.shockwaveState = 'idle';
    this.shockwaveTimer = isMother ? Config.egg.motherShockwaveFirstDelay : 0;
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
    this.model.rotation.y += dt * (this.isMother ? 0.18 : 0.35);
    if (showDetails) {
      this.ring.rotation.z += dt * (this.isMother ? 0.18 : 0.32);
      this.spore.rotation.y -= dt * 0.22;
    }
    if (this.isMother) {
      this.hitPulse = Math.max(0, this.hitPulse - dt * 1.7);
      this.model.scale.copy(this.baseModelScale).multiplyScalar(1 + this.hitPulse);
      this.updateMotherShockwave(dt);
    }
    if (this.isMother) return;
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
    this.game.hud.showBossWarning(Config.egg.motherShockwaveWarning);
    this.game.spawnMotherShockwaveWarning(
      this.position,
      Config.egg.motherShockwaveRange,
      Config.egg.motherShockwaveWarning
    );
    this.game.playSfx('motherCharge', { volume: 0.92, cooldown: 0.4 });
  }
  takeDamage(amount, source) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.isMother) {
      this.hitPulse = Math.max(this.hitPulse, clamp(amount / this.maxHp * 0.32, 0.004, 0.025));
    } else {
      const squash = clamp(amount / this.maxHp, 0.03, 0.18);
      this.model.scale.multiplyScalar(1 + squash);
    }
    this.game.spawnHitSpark(this.position, this.isMother ? 0xffbf61 : 0xd8ff7a);
    if (this.hp <= 0) {
      this.dead = true;
      this.claimed = false;
      this.game.onEggDestroyed(this, source);
    }
  }

}

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
    this.pendingShotTimer = 0;
    this.pendingShotTarget = new THREE.Vector3();
    this.buildingImpactTimer = 0;
    this.knock = new THREE.Vector3();
    this.destination = randomPointInCircle(Config.map.radius - 5, Config.map.safeRadius);
    this.destinationTimer = 0;
    this.layTimer = randRange(Config.enemy.spawner.layMin, Config.enemy.spawner.layMax);
    this.lifeTimer = type === 'spawner' ? Config.enemy.spawner.lifeSeconds : Infinity;
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
    this.initializeModelAnimations();
    this.hpBar = this.createHpBar();
    this.object.add(this.hpBar);
  }

  get stats() {
    if (this.type === 'shooter') return Config.enemy.shooter;
    if (this.type === 'guardian') return Config.enemy.guardian;
    if (this.type === 'spawner') return Config.enemy.spawner;
    return Config.enemy.chaser;
  }

  createModel(type) {
    const gameplayModelKeys = {
      chaser: 'chaserEnemy',
      shooter: 'shooterEnemy',
      guardian: 'guardianEnemy',
      spawner: 'spawnerEnemy'
    };
    const gameplayModel = this.game.cloneGameplayModel(gameplayModelKeys[type]);
    if (gameplayModel) {
      gameplayModel.userData.baseY = gameplayModel.position.y;
      if (type === 'spawner' && Config.performance.enemyLights) {
        const light = new THREE.PointLight(0xffe56c, 1.2, 5);
        light.position.y = 1.8;
        gameplayModel.add(light);
      }
      return this.createLodModel(gameplayModel, type);
    }
    const key = type === 'shooter' ? 'ghost' : type === 'guardian' ? 'skeleton' : type === 'spawner' ? 'vampire' : 'zombie';
    const model = Config.visuals.useAssetModels ? this.game.assets.cloneModel(key) : null;
    if (model) {
      model.scale.setScalar(type === 'guardian' ? 1.15 : type === 'spawner' ? 0.82 : type === 'chaser' ? 1.0 : 0.9);
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
    group.position.y = this.type === 'guardian' ? 2.25 : 1.85;
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

  getModelAnimationRoot() {
    if (this.model?.isLOD) return this.model.levels[0]?.object ?? null;
    return this.model;
  }

  initializeModelAnimations() {
    if (this.type !== 'shooter') return;
    const root = this.getModelAnimationRoot();
    const clips = root?.animations ?? [];
    const idleClip = clips.find((clip) => clip.name.toLowerCase() === 'anim2');
    const shootClip = clips.find((clip) => clip.name.toLowerCase() === 'anim1');
    if (!root || !idleClip || !shootClip) return;

    this.modelMixer = new THREE.AnimationMixer(root);
    this.modelActions.idle = this.modelMixer.clipAction(idleClip);
    this.modelActions.idle.setLoop(THREE.LoopRepeat, Infinity);
    this.modelActions.shoot = this.modelMixer.clipAction(shootClip);
    this.modelActions.shoot.setLoop(THREE.LoopOnce, 1);
    this.modelActions.shoot.clampWhenFinished = false;
    this.playModelAnimation('idle', 0);
  }

  playModelAnimation(name, fade = Config.enemy.shooter.animationFade) {
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
    if (this.modelAnimationTimer === 0) this.playModelAnimation('idle');
  }

  beginShooterAttack(target) {
    this.pendingShotTarget.copy(target);
    const shootAction = this.modelActions.shoot;
    if (!shootAction) {
      this.game.spawnEnemyProjectile(this.position, this.pendingShotTarget, Config.enemy.shooter);
      return;
    }
    this.playModelAnimation('shoot');
    this.modelAnimationTimer = shootAction.getClip().duration;
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
    this.fireTimer -= dt;
    this.lifeTimer -= dt;
    if (this.lifeTimer <= 0) {
      this.die(false);
      this.game.spawnDust(this.position, 0xffd86d);
      return;
    }
    if (this.game.player.dead) this.updateDeathApproach(dt);
    else if (this.type === 'spawner') this.updateSpawner(dt);
    else if (this.type === 'shooter') this.updateShooter(dt);
    else if (this.type === 'guardian') this.updateGuardian(dt);
    else this.moveToward(this.game.player.position, dt, this.speed);
    this.distanceSqToPlayer = horizontalDistanceSq(this.position, this.game.player.position);
    if (this.distanceSqToPlayer <= Config.performance.enemyAvoidanceDistance ** 2) this.applyAvoidance(dt);
    if (this.knock.lengthSq() > 0.001) {
      this.position.x += this.knock.x * dt;
      this.position.z += this.knock.z * dt;
      this.knock.multiplyScalar(Math.pow(0.05, dt));
    }
    const blockedBuilding = this.game.resolveBuildingCollision(this.position, this.collisionRadius);
    if (blockedBuilding && this.buildingImpactTimer <= 0) {
      this.buildingImpactTimer = 0.85;
      this.game.damageBuilding(blockedBuilding, Math.max(3, this.stats.damage * 0.25), this.position);
    }
    clampToCircle(this.position, Config.map.radius - 1.2);
    this.distanceSqToPlayer = horizontalDistanceSq(this.position, this.game.player.position);
    this.model.rotation.y = angleToXZ(this.position, this.game.player.position) + (this.type === 'spawner' ? Math.PI : 0);
    this.model.position.y = (this.model.userData.baseY ?? 0) + Math.abs(Math.sin(this.game.elapsed * (this.type === 'spawner' ? 12 : 7))) * 0.06;
    this.updateContactDamage();
    this.updateHpBar();
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
      const creepScale = this.type === 'spawner' ? 0.22 : this.type === 'shooter' ? 0.45 : 0.55;
      this.moveToward(this.game.player.position, dt, Math.max(0.85, this.speed * creepScale));
      return;
    }
    const angle = this.game.elapsed * 0.9 + this.position.x * 0.3 + this.position.z * 0.2;
    this.position.x += Math.sin(angle) * dt * 0.16;
    this.position.z += Math.cos(angle) * dt * 0.16;
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
    if (egg) this.game.spawnDust(position, 0xdfff85);
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
    if (player.form === 'bird' || player.phaseTimer > 0) return;
    if (this.distanceSqToPlayer > 1.55) return;
    if (this.attackTimer > 0) return;
    this.attackTimer = 0.75;
    player.takeDamage(this.stats.damage);
  }

  updateHpBar() {
    this.hpBar.visible = this.hp < this.maxHp && this.distanceSqToPlayer <= Config.performance.enemyHpBarDistance ** 2;
    if (!this.hpBar.visible) return;
    const fg = this.hpBar.getObjectByName('fg');
    if (fg) fg.scale.x = clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.lookAt(this.game.camera.position);
  }

  takeDamage(amount, origin = null, strongKnock = false, burstReward = true) {
    if (this.dead) return;
    this.hp -= amount;
    this.game.spawnHitSpark(this.position, this.type === 'spawner' ? 0xffe36c : 0xffffff);
    if (origin) {
      normalizeXZ(tempVec2, this.position.x - origin.x, this.position.z - origin.z);
      this.knock.x += tempVec2.x * (strongKnock ? 14 : 4);
      this.knock.z += tempVec2.z * (strongKnock ? 14 : 4);
    }
    if (this.hp <= 0) this.die(true, burstReward);
  }

  die(reward, burstReward = reward) {
    if (this.dead) return;
    this.dead = true;
    this.object.visible = false;
    if (reward) {
      this.game.playSfx('enemyDie', { volume: 0.72, cooldown: 0.035 });
      if (burstReward) this.game.player.addBurst(this.type === 'spawner' ? Config.player.burstGainSpawner : Config.player.burstGainEnemy);
      this.game.spawnXp(this.position, this.stats.xp);
      this.game.spawnRandomPickup(this.position, this.type === 'spawner' ? 'spawner' : 'enemy');
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
    this.active = true;
    this.dead = false;
    this.object.visible = true;
  }

  update(dt) {
    if (!this.active || this.game.player.dead) return;
    const player = this.game.player;
    const distanceSq = horizontalDistanceSq(this.position, player.position);
    const showGlow = distanceSq <= Config.performance.xpGlowDistance ** 2;
    const magnetRange = player.getPickupMagnetRange();
    this.object.rotation.y += dt * (this.type === 'speed' ? 7 : 4);
    this.model.rotation.x = Math.sin(this.game.elapsed * 5 + this.position.x) * 0.08;
    if (this.type === 'magnet') this.model.rotation.x += Math.PI * 0.5;
    this.glow.visible = showGlow;
    if (showGlow) this.glow.material.opacity = 0.13 + Math.sin(this.game.elapsed * 7 + this.position.x) * 0.035;
    this.object.position.y = 0.45 + Math.sin(this.game.elapsed * 6 + this.position.x) * 0.08;
    if (distanceSq < magnetRange ** 2 && distanceSq > 0.0001) {
      normalizeXZ(tempVec, player.position.x - this.position.x, player.position.z - this.position.z);
      const pullSpeed = player.getPickupMagnetSpeed() * (this.type === 'xp' ? 1 : 1.08);
      this.position.x += tempVec.x * pullSpeed * dt;
      this.position.z += tempVec.z * pullSpeed * dt;
    }
    if (distanceSq < Config.pickups.pickupRange ** 2) {
      this.collect(player);
    }
  }

  collect(player) {
    const spec = PICKUP_SPECS[this.type] ?? PICKUP_SPECS.xp;
    this.game.playSfx('xpPickup', { volume: this.type === 'xp' ? 0.45 : 0.62, cooldown: this.type === 'xp' ? 0.025 : 0.075 });
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
