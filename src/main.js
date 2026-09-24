import './styles.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CameraRig } from './camera-rig.js';
import { getCharacterPortrait } from './character-portraits.js';
import { StoryPlayer } from './story.js';
import { PROLOGUE, createBriefing, createAftermath } from './story-data.js';
import { Config } from './config.js';
import { Egg, Enemy, ExperienceOrb, Player, Projectile } from './entities.js';
import { InputState } from './input.js';
import { clamp, horizontalDistanceSq, normalizeXZ, randomPointInCircle, randRange, TAU } from './math.js';
import { ObjectPool } from './object-pool.js';
import { SpatialGrid } from './spatial-grid.js';
import { TouchControls } from './touch-controls.js';
import { getTutorialGuide, Hud, pickUpgradeChoices } from './ui.js';

const FLOOR_TEXTURE_URL = new URL('../assets/floor/flr_001.png', import.meta.url).href;
const PLAYER_PROJECTILE_FRAME_URLS = [
  new URL('../assets/projectiles/player-bullet/frame_0000.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0001.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0002.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0003.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0004.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0005.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0006.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0007.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0008.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0009.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0010.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0011.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0012.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0013.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0014.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0015.png', import.meta.url).href,
  new URL('../assets/projectiles/player-bullet/frame_0016.png', import.meta.url).href
];
const ENEMY_PROJECTILE_FRAME_URLS = [
  new URL('../assets/projectiles/enemy-bullet/frame_0000.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0001.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0002.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0003.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0004.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0005.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0006.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0007.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0008.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0009.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0010.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0011.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0012.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0013.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0014.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0015.png', import.meta.url).href,
  new URL('../assets/projectiles/enemy-bullet/frame_0016.png', import.meta.url).href
];
const BURST_EFFECT_FRAME_URLS = [
  new URL('../assets/effects/burst/frame_0000.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0001.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0002.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0003.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0004.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0005.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0006.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0007.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0008.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0009.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0010.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0011.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0012.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0013.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0014.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0015.png', import.meta.url).href,
  new URL('../assets/effects/burst/frame_0016.png', import.meta.url).href
];
const BURST_EFFECT_ASPECT = 904 / 512;
const PULSE_LIGHT_RING_TEXTURE_URL = new URL('../assets/effects/pulse-light-ring.png', import.meta.url).href;
const ENEMY_DISSOLVE_DUST_TEXTURE_URL = new URL('../assets/effects/enemy-dissolve-dust.png', import.meta.url).href;
const BURST_SUPER_PULSE_TEXTURE_URL = new URL('../assets/effects/burst-super-pulse.png', import.meta.url).href;
const MOTHER_SHOCKWAVE_TEXTURE_URL = new URL('../assets/effects/mother-shockwave.png', import.meta.url).href;
const TSUKIMI_BEAM_TEXTURE_URL = new URL('../assets/effects/tsukimi-sustained-beam.png', import.meta.url).href;
const KIICHIGO_SLASH_TEXTURE_URL = new URL('../assets/effects/kiichigo-alternating-slash.png', import.meta.url).href;
const PLAYER_BURST_COLOR = 0xffdf70;
const BGM_URL = new URL('../assets/audio/bgm.mp3', import.meta.url).href;
const SFX_URLS = {
  birdFeed: new URL('../assets/audio/sfx/bird_feed.wav', import.meta.url).href,
  burstFire: new URL('../assets/audio/sfx/burst_fire.wav', import.meta.url).href,
  burstPre: new URL('../assets/audio/sfx/burst_pre.wav', import.meta.url).href,
  burstSpread: new URL('../assets/audio/sfx/burst_spread.wav', import.meta.url).href,
  buttonCancel: new URL('../assets/audio/sfx/button_cancel.wav', import.meta.url).href,
  buttonConfirm: new URL('../assets/audio/sfx/button_confirm.wav', import.meta.url).href,
  eggBreak: new URL('../assets/audio/sfx/egg_break.wav', import.meta.url).href,
  enemyDie: new URL('../assets/audio/sfx/enemy_die.wav', import.meta.url).href,
  levelUp: new URL('../assets/audio/sfx/level_up.wav', import.meta.url).href,
  motherCharge: new URL('../assets/audio/sfx/mother_charge.wav', import.meta.url).href,
  motherRelease: new URL('../assets/audio/sfx/mother_release.wav', import.meta.url).href,
  motherImpact: new URL('../assets/audio/sfx/mother_impact.wav', import.meta.url).href,
  tsukimiBurst: new URL('../assets/audio/sfx/tsukimi_burst.wav', import.meta.url).href,
  kiichigoBurst: new URL('../assets/audio/sfx/kiichigo_burst.wav', import.meta.url).href,
  playerHit: new URL('../assets/audio/sfx/player_hit.wav', import.meta.url).href,
  playerShot: new URL('../assets/audio/sfx/player_shot.wav', import.meta.url).href,
  projectileHit: new URL('../assets/audio/sfx/projectile_hit.wav', import.meta.url).href,
  transformBird: new URL('../assets/audio/sfx/transform_bird.wav', import.meta.url).href,
  transformHuman: new URL('../assets/audio/sfx/transform_human.wav', import.meta.url).href,
  xpPickup: new URL('../assets/audio/sfx/xp_pickup.wav', import.meta.url).href
};
const VOICE_URLS = {
  tsukimi: {
    hit: [
      new URL('../assets/audio/voice/tsukimi/hit_01.mp3', import.meta.url).href,
      new URL('../assets/audio/voice/tsukimi/hit_02.mp3', import.meta.url).href
    ],
    dying: [new URL('../assets/audio/voice/tsukimi/dying.mp3', import.meta.url).href],
    burst: [new URL('../assets/audio/voice/tsukimi/burst_01.mp3', import.meta.url).href],
  },
  akame: {
    hit: [
      new URL('../assets/audio/voice/akame/hit_01.mp3', import.meta.url).href,
      new URL('../assets/audio/voice/akame/hit_02.mp3', import.meta.url).href
    ],
    dying: [new URL('../assets/audio/voice/akame/dying.mp3', import.meta.url).href],
    burst: [new URL('../assets/audio/voice/akame/burst_01.mp3', import.meta.url).href]
  },
  kiichigo: {
    hit: [
      new URL('../assets/audio/voice/kiichigo/hit_01.mp3', import.meta.url).href,
      new URL('../assets/audio/voice/kiichigo/hit_02.mp3', import.meta.url).href
    ],
    dying: [new URL('../assets/audio/voice/kiichigo/dying.mp3', import.meta.url).href],
    burst: [new URL('../assets/audio/voice/kiichigo/burst_01.mp3', import.meta.url).href]
  }
};
const BGM_ACTIVE_STATES = new Set(['loading', 'tutorial', 'playing', 'levelup', 'dying']);
const GAMEPLAY_MODELS = {
  darkseedEgg: {
    url: new URL('../assets/eggs/darkseed.glb', import.meta.url).href,
    height: 1.45,
    centerXZ: true
  },
  motherEgg: {
    url: new URL('../assets/mother/motheregg_rtp.glb', import.meta.url).href,
    height: Config.visuals.motherEggModelHeight,
    centerXZ: true
  },
  drone: {
    url: new URL('../assets/drones/drone3dmodel.glb', import.meta.url).href,
    height: Config.visuals.droneModelHeight,
    centerXZ: true
  },
  xpCrystal: {
    url: new URL('../assets/xp/blue_crystal.glb', import.meta.url).href,
    height: 0.72,
    centerXZ: true
  },
  chaserEnemy: {
    url: new URL('../assets/enemies/ene_001.glb', import.meta.url).href,
    height: 1.78,
    centerXZ: true,
    forceOpaque: true
  },
  shooterEnemy: {
    url: new URL('../assets/enemies/bombarding_001_rigged.glb', import.meta.url).href,
    height: 1.6,
    centerXZ: true,
    forceOpaque: true
  },
  spawnerEnemy: {
    url: new URL('../assets/enemies/Spawning_001.glb', import.meta.url).href,
    height: 1.62,
    centerXZ: true,
    forceOpaque: true
  },
  guardianEnemy: {
    url: new URL('../assets/enemies/defense_001.glb', import.meta.url).href,
    height: 2.0,
    centerXZ: true,
    forceOpaque: true
  }
};
const BACKGROUND_OBJECTS = [
  { url: new URL('../assets/background/obj_001_rtp.glb', import.meta.url).href, height: 3.0, count: 1, minRadius: 28 },
  { url: new URL('../assets/background/obj_002_rtp.glb', import.meta.url).href, height: 3.2, count: 1, minRadius: 30 },
  { url: new URL('../assets/background/obj_003_rtp.glb', import.meta.url).href, height: 3.2, count: 1, minRadius: 30 },
  { url: new URL('../assets/background/obj_004_rtp.glb', import.meta.url).href, height: 2.8, count: 1, minRadius: 26 },
  { url: new URL('../assets/background/obj_006_rtp.glb', import.meta.url).href, height: 1.15, count: 14, minRadius: 12 },
  { url: new URL('../assets/background/obj_007_rtp.glb', import.meta.url).href, height: 1.25, count: 16, minRadius: 12 },
  { url: new URL('../assets/background/obj_008_rtp.glb', import.meta.url).href, height: 2.2, count: 2, minRadius: 24 }
];
const WATER_STAGE_LAND_PATCHES = [
  { x: 0, z: 0, radius: 25, scaleX: 1.2, scaleZ: 0.8, rotation: 0.18, seed: 0.4 },
  { x: -36, z: -12, radius: 18, scaleX: 1.0, scaleZ: 0.72, rotation: -0.65, seed: 1.7 },
  { x: 31, z: 28, radius: 17, scaleX: 0.95, scaleZ: 0.75, rotation: 0.58, seed: 2.9 },
  { x: 34, z: -31, radius: 14, scaleX: 1.15, scaleZ: 0.75, rotation: -0.28, seed: 4.2 },
  { x: -25, z: 37, radius: 12, scaleX: 1.0, scaleZ: 0.8, rotation: 0.92, seed: 5.5 }
];
const CHARACTER_OPTIONS = {
  tsukimi: { playerModel: 'tsukimiGlb' },
  akame: { playerModel: 'akameGlb' },
  kiichigo: { playerModel: 'kiichigoGlb' }
};
const appInput = new InputState(window);
let activeGame = null;
let selectedStageId = 1;
let menuCursorButton = null;

function setMenuCursor(button) {
  if (menuCursorButton === button) return;
  menuCursorButton?.classList.remove('menu-cursor');
  menuCursorButton = button;
  menuCursorButton?.classList.add('menu-cursor');
}

function getMenuButtons(container) {
  return container
    ? [...container.querySelectorAll('button:not([disabled])')].filter(button => button.getClientRects().length && !button.closest('[inert]'))
    : [];
}

function moveMenuFocus(container, direction, linearFallback = false) {
  const buttons = getMenuButtons(container);
  if (buttons.length === 0) return;
  const current = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
  if (current !== document.activeElement) {
    current.focus();
    return;
  }

  const origin = current.getBoundingClientRect();
  const originX = origin.left + origin.width * 0.5;
  const originY = origin.top + origin.height * 0.5;
  const vertical = direction === 'up' || direction === 'down';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  let best = null;
  let bestScore = Infinity;
  for (const button of buttons) {
    if (button === current) continue;
    const rect = button.getBoundingClientRect();
    const dx = rect.left + rect.width * 0.5 - originX;
    const dy = rect.top + rect.height * 0.5 - originY;
    const primary = vertical ? dy : dx;
    if (primary * sign <= 0) continue;
    const cross = vertical ? dx : dy;
    const score = Math.abs(primary) + Math.abs(cross) * 2;
    if (score < bestScore) {
      best = button;
      bestScore = score;
    }
  }
  if (best) best.focus();
  else if (linearFallback && buttons.length > 1) {
    const currentIndex = buttons.indexOf(current);
    buttons[(currentIndex + sign + buttons.length) % buttons.length].focus();
  }
}

function handleGamepadMenu(input, container, onCancel = null, linearFallback = false) {
  if (!container || !input.hasGamepad) {
    setMenuCursor(null);
    return;
  }
  for (const direction of ['up', 'down', 'left', 'right']) {
    if (input.menuDirectionPressed(direction)) {
      moveMenuFocus(container, direction, linearFallback);
      break;
    }
  }
  const buttons = getMenuButtons(container);
  const focused = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
  if (focused && focused !== document.activeElement) focused.focus();
  setMenuCursor(focused ?? null);
  if (input.actionPressed('confirm')) {
    const button = focused;
    input.consumeAction('confirm');
    button?.focus();
    button?.click();
    setMenuCursor(buttons.includes(document.activeElement) ? document.activeElement : null);
  } else if (input.actionPressed('cancel')) {
    input.consumeAction('cancel');
    onCancel?.();
  }
}

class Game {
  constructor(characterId = 'tsukimi', stageId = 1) {
    this.characterId = characterId;
    this.stageId = stageId;
    this.isWaterStage = stageId === 2;
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: Config.performance.antialias,
      powerPreference: 'high-performance'
    });
    const renderScale = window.matchMedia?.('(any-pointer: coarse)').matches
      ? Math.min(Config.performance.renderScale, 0.75)
      : Config.performance.renderScale;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Config.performance.maxPixelRatio) * renderScale);
    this.renderer.shadowMap.enabled = Config.performance.enableShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = Config.visuals.useToneMapping ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = Config.visuals.renderExposure;
    this.scene = new THREE.Scene();
    const worldColor = this.isWaterStage ? 0x173a43 : 0x15201d;
    this.scene.background = new THREE.Color(worldColor);
    this.scene.fog = new THREE.FogExp2(worldColor, this.isWaterStage ? 0.017 : 0.012);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 600);
    this.assets = null;
    this.input = appInput;
    this.touchControls = new TouchControls(this.input, document.getElementById('touchControls'));
    this.clock = new THREE.Clock();
    this.hud = new Hud(this);
    this.state = 'loading';
    this.outcome = null;
    this.elapsed = 0;
    this.deathTimer = 0;
    this.deathElapsed = 0;
    this.deathWorldActive = false;
    this.deathBlackoutStarted = false;
    this.devVisible = false;
    this.hint = '';
    this.hintTimer = 0;
    this.shake = 0;
    this.spawnPauseTimer = 0;
    this.eggSpawnPauseTimer = 0;
    this.enemySpawnPauseTimer = 0;
    this.eggOverCapSpawnBudget = 0;
    this.enemyOverCapSpawnBudget = 0;
    this.eggsDestroyed = 0;
    this.eggs = [];
    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.effects = [];
    this.backgroundObjects = [];
    this.buildingObstacles = [];
    this.modelTemplates = new Map();
    this.motherEgg = null;
    this.motherSpawned = false;
    this.nextStageBeat = 0;
    this.enemyGrid = new SpatialGrid(5.5);
    this.scratchEnemies = [];
    this.scratchNeighbors = [];
    this.scratchEggs = [];
    this.scratchBuildings = [];
    this.audioContext = null;
    this.bgm = this.createBgm();
    this.sfx = this.createSfxPlayers();
    this.voices = this.createVoicePlayers();
    this.sfxLastPlayed = new Map();
    this.activeSfx = new Set();
    this.bgmPlayPending = false;
    this.bgmAwaitingGesture = false;
    this.bgmUnlockInstalled = false;
    this.bgmUnlockHandler = () => {
      this.bgmAwaitingGesture = false;
      this.removeBgmUnlockListeners();
      this.updateBgmState();
    };
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.playerProjectileMaterial = new THREE.MeshStandardMaterial({
      color: 0xa9f4ff,
      emissive: 0x2c8ca8,
      emissiveIntensity: 0.9,
      roughness: 0.22
    });
    this.specialProjectileMaterial = new THREE.MeshStandardMaterial({
      color: 0xf9ff9b,
      emissive: 0xd5ff54,
      emissiveIntensity: 1.2,
      roughness: 0.18
    });
    this.enemyProjectileMaterial = new THREE.MeshStandardMaterial({
      color: 0xff70b6,
      emissive: 0x8f1e61,
      emissiveIntensity: 0.8,
      roughness: 0.24
    });
    this.playerProjectileTextures = this.loadProjectileTextures(PLAYER_PROJECTILE_FRAME_URLS);
    this.enemyProjectileTextures = this.loadProjectileTextures(ENEMY_PROJECTILE_FRAME_URLS);
    this.burstEffectTextures = this.loadProjectileTextures(BURST_EFFECT_FRAME_URLS);
    this.pulseEffectTexture = this.loadProjectileTextures([PULSE_LIGHT_RING_TEXTURE_URL])[0];
    this.enemyDissolveDustTexture = this.loadProjectileTextures([ENEMY_DISSOLVE_DUST_TEXTURE_URL])[0];
    this.burstSuperPulseTexture = this.loadProjectileTextures([BURST_SUPER_PULSE_TEXTURE_URL])[0];
    this.motherShockwaveTexture = this.loadProjectileTextures([MOTHER_SHOCKWAVE_TEXTURE_URL])[0];
    this.tsukimiBeamTexture = this.loadProjectileTextures([TSUKIMI_BEAM_TEXTURE_URL])[0];
    this.kiichigoSlashTexture = this.loadProjectileTextures([KIICHIGO_SLASH_TEXTURE_URL])[0];
    this.projectilePool = new ObjectPool(() => {
      const projectile = new Projectile(this, this.playerProjectileMaterial);
      this.scene.add(projectile.object);
      return projectile;
    });
    this.xpPool = new ObjectPool(() => {
      const orb = new ExperienceOrb(this);
      this.scene.add(orb.object);
      return orb;
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.updateBgmState();
    this.start();
  }

  async start() {
    this.setupLighting();
    if (Config.visuals.useAssetModels) {
      const { AssetStore } = await import('./assets.js');
      this.assets = new AssetStore();
      this.hud.showMessage('Loading assets...', 999);
      await this.assets.loadAll((ratio) => {
        this.hud.showMessage(`Loading ${Math.floor(ratio * 100)}%`, 999);
      });
    }
    await this.loadGameplayModels();
    this.createEnvironment();
    this.player = new Player(this);
    this.scene.add(this.player.group);
    await this.player.loadVisuals();
    this.cameraRig = new CameraRig(this.camera, this.player);
    this.spawnInitialEggs();
    this.spawnInitialEnemies();
    this.state = 'playing';
    this.touchControls.setEnabled(true);
    this.clock.start();
    this.cameraRig.update(0, 0);
    this.hud.showMessage(this.stageId === 1 ? '第1章 守る順番\n増殖を抑え、母卵を破壊せよ' : 'Start', 3);
    this.updateBgmState();
    requestAnimationFrame(() => this.frame());
  }

  setupLighting() {
    this.setupEnvironmentLighting();
    const ambient = new THREE.HemisphereLight(0xcfe0ff, 0x26342b, Config.visuals.ambientLightIntensity);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff0cf, Config.visuals.sunLightIntensity);
    sun.position.set(-28, 34, 24);
    sun.castShadow = Config.performance.enableShadows;
    if (Config.performance.enableShadows) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 120;
      sun.shadow.camera.left = -80;
      sun.shadow.camera.right = 80;
      sun.shadow.camera.top = 80;
      sun.shadow.camera.bottom = -80;
    }
    if (Config.visuals.sunLightIntensity > 0) this.scene.add(sun);
    if (Config.visuals.fillLightIntensity > 0) {
      const fill = new THREE.DirectionalLight(0xaec8ff, Config.visuals.fillLightIntensity);
      fill.position.set(30, 22, -34);
      fill.castShadow = false;
      this.scene.add(fill);
    }
  }

  setupEnvironmentLighting() {
    if (Config.visuals.environmentLightIntensity <= 0) return;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environmentScene = new RoomEnvironment();
    const environmentTexture = pmrem.fromScene(environmentScene).texture;
    this.scene.environment = environmentTexture;
    this.scene.environmentIntensity = Config.visuals.environmentLightIntensity;
    environmentScene.dispose?.();
    pmrem.dispose();
  }

  loadProjectileTextures(frameUrls) {
    const loader = new THREE.TextureLoader();
    return frameUrls.map((url) => {
      const texture = loader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;
      return texture;
    });
  }

  createEnvironment() {
    const groundGeometry = new THREE.CircleGeometry(Config.map.radius, Config.performance.groundSegments);
    this.applyPlanarTileUv(groundGeometry, Config.visuals.floorTileSize);
    const ground = new THREE.Mesh(
      groundGeometry,
      this.createGroundMaterial()
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    if (this.isWaterStage) {
      this.createWaterStageEnvironment(ground);
    }

    const boundary = new THREE.Mesh(
      new THREE.RingGeometry(Config.map.radius - 0.55, Config.map.radius + 0.25, Config.performance.groundSegments),
      new THREE.MeshBasicMaterial({ color: 0x83a97c, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    boundary.rotation.x = -Math.PI / 2;
    boundary.position.y = 0.035;
    this.scene.add(boundary);

    if (this.isWaterStage) {
      this.createWaterStageDecor();
    } else if (Config.visuals.useAssetModels) {
      this.createInstancedDecor(['grass0', 'grass1', 'grass2'], 780, 0.55, 1.6, false);
      this.createInstancedDecor(['rock0', 'rock1', 'rock2'], 120, 0.65, 1.8, false);
      this.createInstancedDecor(['tree0', 'tree1', 'tree2', 'tree3'], 96, 0.95, 1.8, true);
    } else if (Config.visuals.usePrimitiveDecor) {
      this.createPrimitiveDecor();
    }
    if (Config.visuals.useBackgroundObjects && !this.isWaterStage) this.loadBackgroundObjects();
  }

  createWaterStageEnvironment(ground) {
    ground.material.dispose();
    ground.material = new THREE.MeshStandardMaterial({ color: 0x1d5963, roughness: 0.92 });

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(Config.map.radius, Config.performance.groundSegments),
      new THREE.MeshPhysicalMaterial({
        color: 0x4fc2d2,
        transparent: true,
        opacity: 0.48,
        roughness: 0.22,
        metalness: 0.05,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    water.name = 'WaterStageSurface';
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.045;
    water.renderOrder = 0;
    this.scene.add(water);

    const shoreMaterial = new THREE.MeshStandardMaterial({ color: 0xb2a874, roughness: 0.98 });
    const landMaterial = new THREE.MeshStandardMaterial({ color: 0x557649, roughness: 0.96 });
    for (const patch of WATER_STAGE_LAND_PATCHES) {
      const island = new THREE.Group();
      island.name = 'WaterStageIsland';
      island.position.set(patch.x, 0, patch.z);
      island.rotation.y = patch.rotation;

      const shore = new THREE.Mesh(
        this.createIrregularDiscGeometry(patch.radius * 1.04, patch.seed),
        shoreMaterial
      );
      shore.rotation.x = -Math.PI / 2;
      shore.position.y = 0.07;
      shore.scale.set(patch.scaleX, patch.scaleZ, 1);

      const land = new THREE.Mesh(
        this.createIrregularDiscGeometry(patch.radius * 0.93, patch.seed + 0.45),
        landMaterial
      );
      land.rotation.x = -Math.PI / 2;
      land.position.y = 0.085;
      land.scale.set(patch.scaleX, patch.scaleZ, 1);
      land.receiveShadow = true;
      island.add(shore, land);
      this.scene.add(island);
    }
  }

  createIrregularDiscGeometry(radius, seed) {
    const geometry = new THREE.CircleGeometry(radius, 48);
    const positions = geometry.getAttribute('position');
    for (let i = 1; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const angle = Math.atan2(y, x);
      const edgeScale = 1
        + Math.sin(angle * 3 + seed) * 0.055
        + Math.sin(angle * 7 - seed * 1.3) * 0.025;
      positions.setXY(i, x * edgeScale, y * edgeScale);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }

  isWaterStageLand(position, margin = 1) {
    if (!this.isWaterStage) return true;
    return WATER_STAGE_LAND_PATCHES.some((patch) => {
      const dx = position.x - patch.x;
      const dz = position.z - patch.z;
      const cosine = Math.cos(patch.rotation);
      const sine = Math.sin(patch.rotation);
      const localX = dx * cosine + dz * sine;
      const localZ = -dx * sine + dz * cosine;
      const radiusX = patch.radius * patch.scaleX * margin;
      const radiusZ = patch.radius * patch.scaleZ * margin;
      return (localX * localX) / (radiusX * radiusX) + (localZ * localZ) / (radiusZ * radiusZ) <= 1;
    });
  }

  isWaterPosition(position) {
    return this.isWaterStage && !this.isWaterStageLand(position, 0.96);
  }

  randomWaterStageLandPoint(inset = 0.82) {
    const totalArea = WATER_STAGE_LAND_PATCHES.reduce(
      (sum, patch) => sum + patch.radius * patch.radius * patch.scaleX * patch.scaleZ,
      0
    );
    let selection = Math.random() * totalArea;
    let patch = WATER_STAGE_LAND_PATCHES[0];
    for (const candidate of WATER_STAGE_LAND_PATCHES) {
      selection -= candidate.radius * candidate.radius * candidate.scaleX * candidate.scaleZ;
      if (selection <= 0) {
        patch = candidate;
        break;
      }
    }
    const angle = Math.random() * TAU;
    const distance = Math.sqrt(Math.random()) * patch.radius * inset;
    const localX = Math.cos(angle) * distance * patch.scaleX;
    const localZ = Math.sin(angle) * distance * patch.scaleZ;
    const cosine = Math.cos(patch.rotation);
    const sine = Math.sin(patch.rotation);
    return new THREE.Vector3(
      patch.x + localX * cosine - localZ * sine,
      0,
      patch.z + localX * sine + localZ * cosine
    );
  }

  createWaterStageDecor() {
    const reedGeometry = new THREE.ConeGeometry(0.11, 1, 4);
    const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x55a779, roughness: 0.92 });
    const reeds = new THREE.InstancedMesh(reedGeometry, reedMaterial, 90);
    reeds.name = 'WaterStageReeds';
    const grassGeometry = new THREE.ConeGeometry(0.09, 0.52, 3);
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x78a85b, roughness: 0.96 });
    const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 110);
    grass.name = 'WaterStageGrass';
    const rockGeometry = new THREE.DodecahedronGeometry(0.45, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x718078, roughness: 0.96 });
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 30);
    rocks.name = 'WaterStageRocks';
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < reeds.count; i++) {
      let point = randomPointInCircle(Config.map.radius - 4, 8);
      for (let attempt = 0; attempt < 12 && !this.isWaterPosition(point); attempt++) {
        point = randomPointInCircle(Config.map.radius - 4, 8);
      }
      point.y = 0.46;
      quaternion.setFromEuler(new THREE.Euler(0, Math.random() * TAU, 0));
      const height = randRange(0.8, 2.1);
      scale.set(randRange(0.7, 1.25), height, randRange(0.7, 1.25));
      matrix.compose(point, quaternion, scale);
      reeds.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < grass.count; i++) {
      const point = this.randomWaterStageLandPoint(0.82);
      point.y = 0.34;
      quaternion.setFromEuler(new THREE.Euler(0, Math.random() * TAU, 0));
      const size = randRange(0.7, 1.45);
      scale.set(size, size, size);
      matrix.compose(point, quaternion, scale);
      grass.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < rocks.count; i++) {
      const point = this.randomWaterStageLandPoint(0.78);
      point.y = 0.34;
      quaternion.setFromEuler(new THREE.Euler(randRange(-0.18, 0.18), Math.random() * TAU, randRange(-0.18, 0.18)));
      const size = randRange(0.5, 1.35);
      scale.set(size * randRange(0.8, 1.25), size * randRange(0.55, 0.9), size);
      matrix.compose(point, quaternion, scale);
      rocks.setMatrixAt(i, matrix);
    }
    reeds.instanceMatrix.needsUpdate = true;
    grass.instanceMatrix.needsUpdate = true;
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(reeds, grass, rocks);
  }

  applyPlanarTileUv(geometry, tileSize) {
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      uv.setXY(i, (x + Config.map.radius) / tileSize, (y + Config.map.radius) / tileSize);
    }
    uv.needsUpdate = true;
  }

  createGroundMaterial() {
    if (!Config.visuals.useFloorTexture) {
      return Config.visuals.useUnlitGround
        ? new THREE.MeshBasicMaterial({ color: 0x304531 })
        : new THREE.MeshStandardMaterial({ color: 0x304531, roughness: 0.95, metalness: 0.0 });
    }
    const texture = new THREE.TextureLoader().load(FLOOR_TEXTURE_URL);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    return Config.visuals.useUnlitGround
      ? new THREE.MeshBasicMaterial({
        map: texture,
        color: Config.visuals.floorTextureTint
      })
      : new THREE.MeshStandardMaterial({
        map: texture,
        color: Config.visuals.floorTextureTint,
        roughness: 0.92,
        metalness: 0.0
      });
  }

  createInstancedDecor(keys, totalCount, minScale, maxScale, outerOnly) {
    const perKey = Math.ceil(totalCount / keys.length);
    for (const key of keys) {
      const sample = this.assets.cloneFirstMesh(key);
      if (!sample) continue;
      const material = sample.material?.clone?.() ?? new THREE.MeshStandardMaterial({ color: 0x7da36d });
      const instanced = new THREE.InstancedMesh(sample.geometry, material, perKey);
      instanced.name = `Instanced_${key}`;
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      for (let i = 0; i < perKey; i++) {
        const position = outerOnly
          ? randomPointInCircle(Config.map.radius - 3, Config.map.radius * 0.52)
          : randomPointInCircle(Config.map.radius - 4, Config.map.safeRadius + 2);
        quaternion.setFromEuler(new THREE.Euler(0, Math.random() * TAU, 0));
        const size = randRange(minScale, maxScale);
        scale.set(size, size, size);
        matrix.compose(position, quaternion, scale);
        instanced.setMatrixAt(i, matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      this.scene.add(instanced);
    }
  }

  createPrimitiveDecor() {
    const multiplier = Config.performance.decorMultiplier;
    this.createPrimitiveInstancedDecor(
      'PrimitiveGrass',
      new THREE.ConeGeometry(0.12, 0.65, 3),
      new THREE.MeshStandardMaterial({ color: 0x4f8a54, roughness: 0.9 }),
      Math.round(780 * multiplier),
      0.65,
      1.45,
      false
    );
    this.createPrimitiveInstancedDecor(
      'PrimitiveRocks',
      new THREE.DodecahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0x6f7970, roughness: 0.95 }),
      Math.round(120 * multiplier),
      0.55,
      1.35,
      false
    );
    this.createPrimitiveInstancedDecor(
      'PrimitiveTrees',
      new THREE.ConeGeometry(0.85, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x315f39, roughness: 0.86 }),
      Math.round(96 * multiplier),
      0.85,
      1.55,
      true
    );
  }

  createPrimitiveInstancedDecor(name, geometry, material, count, minScale, maxScale, outerOnly) {
    const instanced = new THREE.InstancedMesh(geometry, material, count);
    instanced.name = name;
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const position = outerOnly
        ? randomPointInCircle(Config.map.radius - 3, Config.map.radius * 0.52)
        : randomPointInCircle(Config.map.radius - 4, Config.map.safeRadius + 2);
      position.y = name === 'PrimitiveGrass' ? 0.32 : name === 'PrimitiveTrees' ? 1.3 : 0.38;
      quaternion.setFromEuler(new THREE.Euler(0, Math.random() * TAU, 0));
      const size = randRange(minScale, maxScale);
      scale.set(size, size, size);
      matrix.compose(position, quaternion, scale);
      instanced.setMatrixAt(i, matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    this.scene.add(instanced);
  }

  async loadGameplayModels() {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const entries = Object.entries(GAMEPLAY_MODELS)
        .filter(([key]) => !(key === 'xpCrystal' && Config.performance.usePrimitiveXp));
      await Promise.all(entries.map(async ([key, entry]) => {
        try {
          const gltf = await loader.loadAsync(entry.url);
          const template = gltf.scene;
          template.name = `${key}Template`;
          this.prepareGameplayModel(template, entry, true);
          this.fitObjectHeight(template, entry.height, entry.centerXZ);
          this.modelTemplates.set(key, {
            template,
            animations: gltf.animations ?? []
          });
        } catch (error) {
          console.warn(`Failed to load gameplay model: ${key}`, error);
        }
      }));
    } catch (error) {
      console.warn('Failed to initialize gameplay model loader.', error);
    }
  }

  cloneGameplayModel(key) {
    const source = this.modelTemplates.get(key);
    const template = source?.template ?? source;
    if (!template) return null;
    const object = template.userData.hasSkinnedMesh ? cloneSkeleton(template) : template.clone(true);
    if (source?.animations?.length) object.animations = source.animations;
    this.prepareGameplayModel(object, GAMEPLAY_MODELS[key], false);
    return object;
  }

  prepareGameplayModel(object, entry = {}, cloneMaterials = false) {
    let hasSkinnedMesh = false;
    object.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        if (child.isSkinnedMesh) hasSkinnedMesh = true;
        child.castShadow = Config.performance.enableShadows;
        child.receiveShadow = true;
        child.visible = true;
        if (!child.material) return;
        if (cloneMaterials) {
          child.material = Array.isArray(child.material)
            ? child.material.map((material) => material.clone())
            : child.material.clone();
        }
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          this.prepareGameplayMaterial(material, entry);
        }
      }
    });
    object.userData.hasSkinnedMesh = object.userData.hasSkinnedMesh || hasSkinnedMesh;
  }

  prepareGameplayMaterial(material, entry = {}) {
    if (!material) return;
    if (entry.forceOpaque) {
      material.transparent = false;
      material.opacity = 1;
      material.alphaTest = 0;
      material.alphaMap = null;
      material.depthWrite = true;
      material.depthTest = true;
      material.side = THREE.DoubleSide;
      material.blending = THREE.NormalBlending;
    }
    material.needsUpdate = true;
  }

  async loadBackgroundObjects() {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      await Promise.all(BACKGROUND_OBJECTS.map(async (entry, assetIndex) => {
        const gltf = await loader.loadAsync(entry.url);
          const baseCount = entry.count ?? 1;
          const count = baseCount <= 1
            ? baseCount
            : Math.max(1, Math.round(baseCount * Config.performance.backgroundObjectMultiplier));
        for (let copyIndex = 0; copyIndex < count; copyIndex++) {
          const object = gltf.scene.clone(true);
          object.name = `BackgroundObject${assetIndex + 1}_${copyIndex + 1}`;
          object.traverse((child) => {
            if (child.isMesh || child.isSkinnedMesh) {
              child.castShadow = Config.performance.enableShadows;
              child.receiveShadow = true;
              if (child.material) {
                child.material = Array.isArray(child.material)
                  ? child.material.map((material) => material.clone())
                  : child.material.clone();
                if (Config.visuals.useUnlitBackgroundModels) {
                  child.material = Array.isArray(child.material)
                    ? child.material.map((material) => this.createUnlitModelMaterial(material, Config.visuals.backgroundModelBrightness))
                    : this.createUnlitModelMaterial(child.material, Config.visuals.backgroundModelBrightness);
                }
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                const brightness = Config.visuals.useUnlitBackgroundModels ? 1 : Config.visuals.backgroundModelBrightness;
                for (const material of materials) {
                  this.applyMaterialBrightness(material, brightness);
                }
              }
            }
          });
          this.fitObjectHeight(object, entry.height);
          const placementIndex = this.backgroundObjects.length;
          const angle = placementIndex * 2.399963 + assetIndex * 0.41;
          const distance = randRange(entry.minRadius ?? Config.map.radius * 0.42, Config.map.radius - 8);
          object.position.x = Math.sin(angle) * distance;
          object.position.z = Math.cos(angle) * distance;
          object.rotation.y = randRange(0, TAU);
          this.scene.add(object);
          this.backgroundObjects.push(object);
          this.registerBuildingObstacle(object, entry);
        }
      }));
    } catch (error) {
      console.warn('Failed to load one or more background GLB objects.', error);
    }
  }

  createUnlitModelMaterial(source, brightness = 1) {
    const color = source?.color?.clone?.() ?? new THREE.Color(0xffffff);
    color.multiplyScalar(brightness);
    const material = new THREE.MeshBasicMaterial({
      map: source?.map ?? null,
      color,
      side: THREE.DoubleSide,
      transparent: false,
      alphaMap: source?.alphaMap ?? null,
      alphaTest: (source?.transparent || source?.alphaMap) ? 0.35 : 0,
      depthWrite: true
    });
    material.name = source?.name ? `${source.name}_Unlit` : 'Background_Unlit';
    if (material.map) {
      material.map.colorSpace = THREE.SRGBColorSpace;
      material.map.needsUpdate = true;
    }
    material.needsUpdate = true;
    return material;
  }

  applyMaterialBrightness(material, brightness = 1) {
    if (!material || brightness >= 0.999) return;
    if (material.color) material.color.multiplyScalar(brightness);
    if (material.emissive) material.emissive.multiplyScalar(brightness);
    if ('emissiveIntensity' in material) material.emissiveIntensity *= brightness;
    if ('envMapIntensity' in material) material.envMapIntensity *= brightness;
    material.needsUpdate = true;
  }

  registerBuildingObstacle(object, entry) {
    if ((entry.height ?? 0) < Config.map.buildingCollisionMinHeight) return null;
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = clamp(
      Math.max(size.x, size.z) * Config.map.buildingCollisionRadiusScale,
      Config.map.buildingCollisionMinRadius,
      Config.map.buildingCollisionMaxRadius
    );
    const obstacle = {
      object,
      position: new THREE.Vector3(center.x, 0, center.z),
      radius,
      height: size.y,
      hp: Math.round(Config.map.buildingHp * clamp(size.y / Config.map.buildingCollisionMinHeight, 0.85, 1.45)),
      dead: false
    };
    obstacle.maxHp = obstacle.hp;
    object.userData.buildingObstacle = obstacle;
    this.buildingObstacles.push(obstacle);
    return obstacle;
  }

  findBuildingsInRadius(position, radius, out = this.scratchBuildings) {
    out.length = 0;
    for (const building of this.buildingObstacles) {
      if (building.dead) continue;
      const hitRadius = radius + building.radius;
      if (horizontalDistanceSq(position, building.position) <= hitRadius * hitRadius) out.push(building);
    }
    return out;
  }

  findBuildingHit(position, radius, y = 0) {
    for (const building of this.buildingObstacles) {
      if (building.dead || y > building.height + radius + 0.8) continue;
      const hitRadius = radius + building.radius;
      if (horizontalDistanceSq(position, building.position) <= hitRadius * hitRadius) return building;
    }
    return null;
  }

  isBlockedByBuilding(position, radius) {
    return Boolean(this.findBuildingHit(position, radius, 0));
  }

  resolveBuildingCollision(position, radius) {
    let blocked = null;
    for (const building of this.buildingObstacles) {
      if (building.dead) continue;
      const minDistance = radius + building.radius;
      const dx = position.x - building.position.x;
      const dz = position.z - building.position.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= minDistance * minDistance) continue;
      blocked = building;
      if (distanceSq <= 0.0001) {
        position.x += minDistance;
        continue;
      }
      const distance = Math.sqrt(distanceSq);
      const push = (minDistance - distance) / distance;
      position.x += dx * push;
      position.z += dz * push;
    }
    return blocked;
  }

  damageBuilding(building, amount, origin = null) {
    if (!building || building.dead) return false;
    building.hp -= amount;
    this.spawnHitSpark(building.position, 0xe4d2a2);
    if (building.hp > 0) return false;
    this.collapseBuilding(building, origin);
    return true;
  }

  collapseBuilding(building, origin = null) {
    if (building.dead) return;
    building.dead = true;
    const object = building.object;
    const startY = object.position.y;
    const startScale = object.scale.clone();
    const startRotation = object.rotation.clone();
    const impact = origin ?? this.player?.position ?? building.position;
    const angle = Math.atan2(building.position.z - impact.z, building.position.x - impact.x);
    const duration = Config.map.buildingCollapseSeconds;
    this.shake = Math.max(this.shake, 0.28);
    this.playSfx('projectileHit', { volume: 0.62, cooldown: 0.035 });
    this.spawnParticleBurst(building.position, 58, 0xc9b796, building.radius * 1.35, 0.75);
    this.spawnRingEffect(building.position, building.radius * 1.55, 0xd6c29b, 0.48, 0.5);
    this.effects.push({
      object,
      life: duration,
      duration,
      dispose: false,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const eased = t * t * (3 - 2 * t);
        object.position.y = startY - building.height * 0.22 * eased;
        object.rotation.x = startRotation.x + Math.sin(angle) * 0.55 * eased;
        object.rotation.z = startRotation.z - Math.cos(angle) * 0.55 * eased;
        object.scale.set(
          startScale.x * (1 - eased * 0.12),
          startScale.y * (1 - eased * 0.58),
          startScale.z * (1 - eased * 0.12)
        );
      }
    });
  }

  fitObjectHeight(object, targetHeight, centerXZ = false) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0.0001) {
      object.scale.multiplyScalar(targetHeight / size.y);
      object.updateMatrixWorld(true);
      const fittedBox = new THREE.Box3().setFromObject(object);
      if (centerXZ) {
        const center = fittedBox.getCenter(new THREE.Vector3());
        object.position.x -= center.x;
        object.position.z -= center.z;
      }
      object.position.y -= fittedBox.min.y;
    }
  }

  spawnInitialEggs() {
    for (let i = 0; i < Config.map.initialEggs; i++) {
      const point = i < 2
        ? this.findEggSpawnPosition(this.player.position, 12, 19)
        : randomPointInCircle(Config.map.radius * 0.52, 14);
      if (!point) continue;
      this.spawnEgg(point);
    }
  }

  spawnInitialEnemies() {
    for (let i = 0; i < Config.map.initialEnemies; i++) {
      const point = this.findEnemySpawnPosition(14, 19);
      if (point) this.spawnEnemy('chaser', point);
    }
  }

  updateStageBeats() {
    const beats = Config.map.stageBeats;
    while (this.nextStageBeat < beats.length && this.elapsed >= beats[this.nextStageBeat].at) {
      const beat = beats[this.nextStageBeat++];
      for (let i = 0; i < beat.eggs; i++) {
        const point = this.findEggSpawnPosition(this.player.position, 13, 25);
        if (point) this.spawnEgg(point);
      }
      for (const type of beat.enemies) {
        const point = this.findEnemySpawnPosition(14, 24);
        if (point) this.spawnEnemy(type, point);
      }
    }
  }

  findEnemySpawnPosition(minDistance, maxDistance) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * TAU;
      const distance = randRange(minDistance, maxDistance);
      const point = new THREE.Vector3(
        this.player.position.x + Math.sin(angle) * distance,
        0,
        this.player.position.z + Math.cos(angle) * distance
      );
      if (Math.hypot(point.x, point.z) > Config.map.radius - 5) continue;
      if (!this.isBlockedByBuilding(point, 1.5)) return point;
    }
    return null;
  }

  frame() {
    const dt = Math.min(0.033, this.clock.getDelta());
    this.update(dt);
    this.render();
    requestAnimationFrame(() => this.frame());
  }

  update(dt) {
    this.input.beginFrame();
    this.handleGlobalInput();
    this.touchControls.setEnabled(this.state === 'playing');
    this.updateBgmState();
    if (this.state === 'playing') {
      this.elapsed += dt;
      this.hintTimer = Math.max(0, this.hintTimer - dt);
      if (this.hintTimer <= 0) this.hint = '';
      this.shake = Math.max(0, this.shake - dt * 1.7);
      this.updateSpawnPause(dt);
      if (!this.motherSpawned && this.elapsed >= Config.map.motherSpawnSeconds) this.spawnMotherEgg();
      this.updateStageBeats();
      this.enemyGrid.rebuild(this.enemies);
      this.player.update(dt, this.input);
      for (const egg of this.eggs) egg.update(dt);
      if (this.motherEgg) this.motherEgg.update(dt);
      for (const enemy of this.enemies) enemy.update(dt);
      this.enemyGrid.rebuild(this.enemies);
      for (const projectile of this.projectiles) projectile.update(dt);
      for (const orb of this.xpOrbs) orb.update(dt);
      this.updateEffects(dt);
      this.cleanupLists();
      this.ensureEggsExist();
      if (this.elapsed >= Config.map.playSeconds && (!this.motherEgg || !this.motherEgg.dead)) {
        this.finish(false, '4分以内に母卵を破壊できませんでした');
      }
    }
    if (this.state === 'dying') {
      this.deathTimer = Math.max(0, this.deathTimer - dt);
      if (!this.deathBlackoutStarted) {
        this.updateDeathWorld(dt);
        this.player.updateDeath(dt);
      }
      this.updateDeathBlackout(dt);
      if (this.deathTimer <= 0) {
        this.finish(false, 'HP reached 0');
        this.input.endFrame();
        return;
      }
    }
    if (this.state === 'result' && this.deathWorldActive) {
      this.updateDeathBlackout(dt);
      if (!this.deathBlackoutStarted) {
        this.updateDeathWorld(dt);
        this.player.updateDeath(dt);
      }
    }
    this.updateCamera(dt);
    if (this.hud && this.player) this.hud.update(dt);
    this.touchControls.setEnabled(this.state === 'playing');
    this.input.endFrame();
  }

  updateCamera(dt) {
    if (!this.cameraRig) return;
    if (this.state === 'playing' || (this.state === 'dying' && !this.deathBlackoutStarted)) {
      this.cameraRig.update(dt, this.shake);
    }
  }

  settleCamera() {
    this.shake = 0;
    this.cameraRig?.update(0, 0);
  }

  updateDeathBlackout(dt) {
    if (!this.deathWorldActive || !this.player?.dead) return;
    this.deathElapsed += dt;
    if (this.deathBlackoutStarted) return;
    if (this.deathElapsed < Config.visuals.playerDeathBlackoutSeconds) return;
    this.deathBlackoutStarted = true;
    this.hud.showDeathBlackout(true);
    this.settleCamera();
  }

  updateDeathWorld(dt) {
    this.elapsed += dt;
    this.hintTimer = Math.max(0, this.hintTimer - dt);
    if (this.hintTimer <= 0) this.hint = '';
    this.shake = Math.max(0, this.shake - dt * 1.7);
    this.updateSpawnPause(dt);
    if (!this.motherSpawned && this.elapsed >= Config.map.motherSpawnSeconds) this.spawnMotherEgg();
    this.enemyGrid.rebuild(this.enemies);
    for (const egg of this.eggs) egg.update(dt);
    if (this.motherEgg) this.motherEgg.update(dt);
    for (const enemy of this.enemies) enemy.update(dt);
    this.enemyGrid.rebuild(this.enemies);
    for (const orb of this.xpOrbs) orb.update(dt);
    this.updateEffects(dt);
    this.cleanupLists();
  }

  resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  handleGlobalInput() {
    if (!this.input.hasGamepad || this.state === 'playing' || this.state === 'loading') setMenuCursor(null);
    if (this.state === 'story') {
      handleStoryGamepad(this.input);
      return;
    }
    if (this.state === 'levelup') {
      handleGamepadMenu(this.input, this.hud.levelUp, null, true);
      return;
    }
    if (this.state === 'result') {
      handleGamepadMenu(this.input, this.hud.result);
      return;
    }
    if (this.state === 'paused' && this.input.actionPressed('restart')) {
      window.location.reload();
      return;
    }
    if (this.state === 'paused') handleGamepadMenu(this.input, this.hud.pause);
    if (this.input.pressed('F3')) this.devVisible = !this.devVisible;
    if (this.state === 'tutorial') {
      handleGamepadMenu(this.input, this.hud.tutorial.overlay, () => this.hud.skipTutorial());
      if (this.input.pressed('Escape')) this.hud.skipTutorial();
      return;
    }
    if (this.input.actionPressed('pause') || (this.state === 'paused' && this.input.actionPressed('cancel'))) {
      this.playSfx('buttonCancel', { volume: 0.75 });
      if (this.state === 'playing') {
        this.state = 'paused';
        this.settleCamera();
      } else if (this.state === 'paused') {
        this.state = 'playing';
      }
    }
  }

  updateSpawnPause(dt) {
    this.spawnPauseTimer = Math.max(0, this.spawnPauseTimer - dt);
    this.eggSpawnPauseTimer = Math.max(0, this.eggSpawnPauseTimer - dt);
    this.enemySpawnPauseTimer = Math.max(0, this.enemySpawnPauseTimer - dt);
    this.eggsDestroyed = Math.max(0, this.eggsDestroyed - Config.map.hatchDestroyReliefFade * dt);
  }

  canSpawnEgg() {
    if (this.eggSpawnPauseTimer > 0) return false;
    const phaseCap = this.nextStageBeat > 0
      ? Config.map.stageBeats[this.nextStageBeat - 1].eggCap
      : Config.map.initialEggCap;
    if (this.eggs.length < Math.min(Config.map.eggMax, phaseCap)) return true;
    if (this.eggs.length < Config.map.eggMax) return false;
    this.eggSpawnPauseTimer = Config.map.spawnCapPauseSeconds;
    this.spawnPauseTimer = Math.max(this.spawnPauseTimer, this.eggSpawnPauseTimer);
    return false;
  }

  canSpawnEnemy() {
    if (this.enemySpawnPauseTimer > 0) return false;
    const phaseCap = this.nextStageBeat > 0
      ? Config.map.stageBeats[this.nextStageBeat - 1].enemyCap
      : Config.map.initialEnemyCap;
    if (this.enemies.length < Math.min(Config.map.enemyMax, phaseCap)) return true;
    if (this.enemies.length < Config.map.enemyMax) return false;
    this.enemySpawnPauseTimer = Config.map.spawnCapPauseSeconds;
    this.spawnPauseTimer = Math.max(this.spawnPauseTimer, this.enemySpawnPauseTimer);
    return false;
  }

  spawnEgg(position, isMother = false) {
    if (!isMother && !this.canSpawnEgg()) return null;
    const egg = new Egg(this, position, isMother);
    this.scene.add(egg.object);
    if (isMother) this.motherEgg = egg;
    else this.eggs.push(egg);
    return egg;
  }

  spawnMotherEgg() {
    if (this.motherSpawned) return;
    this.motherSpawned = true;
    let best = null;
    let bestDistance = -Infinity;
    for (let i = 0; i < 20; i++) {
      const point = randomPointInCircle(Config.map.radius - 8, Config.map.radius * 0.58);
      if (this.isBlockedByBuilding(point, 3)) continue;
      const distance = horizontalDistanceSq(point, this.player.position);
      if (distance > bestDistance) { best = point; bestDistance = distance; }
    }
    const position = best ?? randomPointInCircle(Config.map.radius - 8, Config.map.radius * 0.58);
    this.spawnEgg(position, true);
    this.spawnBurstEffect(position, 7, 0xff8b52);
    this.showMessage('\u30dc\u30b9\u51fa\u73fe');
  }

  spawnEnemyFromEgg(egg) {
    if (!this.canSpawnEnemy()) return null;
    if (egg.aquatic) return this.spawnEnemy(Math.random() < 0.5 ? 'dragonflyLarva' : 'tadpole', egg.position, egg);
    const roll = Math.random();
    let type = 'chaser';
    if (this.elapsed >= 180) {
      const sniperChance = this.elapsed >= 210 ? 0.16 : 0.09;
      type = roll < sniperChance ? 'sniper' : roll < 0.38 ? 'shooter' : roll < 0.52 ? 'spawner' : roll < 0.65 ? 'guardian' : 'chaser';
    } else if (this.elapsed >= 150) {
      type = roll < 0.32 ? 'shooter' : roll < 0.48 ? 'spawner' : roll < 0.62 ? 'guardian' : 'chaser';
    } else if (this.elapsed >= 70) {
      type = roll < 0.18 ? 'spawner' : roll < 0.38 ? 'shooter' : roll < 0.48 ? 'guardian' : 'chaser';
    } else if (this.elapsed >= 35 && roll < 0.22) {
      type = 'shooter';
    }
    return this.spawnEnemy(type, egg.position, egg);
  }

  spawnEnemy(type, position, homeEgg = null) {
    if (!this.canSpawnEnemy()) return null;
    if (type === 'sniper') {
      const maxSnipers = this.elapsed >= 210
        ? Config.enemy.sniper.maxAliveDuringRush
        : Config.enemy.sniper.maxAliveBeforeRush;
      let aliveSnipers = 0;
      for (const enemy of this.enemies) if (!enemy.dead && enemy.type === 'sniper') aliveSnipers++;
      if (aliveSnipers >= maxSnipers) type = 'shooter';
    }
    const offset = randomPointInCircle(2.1, 0.7).add(position);
    const enemy = new Enemy(this, type, offset, homeEgg);
    this.scene.add(enemy.object);
    this.enemies.push(enemy);
    this.spawnDust(offset, this.isWaterPosition(offset) ? 0x70d9e8 : type === 'spawner' ? 0xffe36a : 0x82ffaa);
    return enemy;
  }

  ensureEggsExist() {
    if (this.eggs.length > 0 || this.motherEgg && !this.motherEgg.dead) return;
    const position = this.findEggSpawnPosition(this.player.position, 16, 28) ?? randomPointInCircle(Config.map.radius - 9, 18);
    const egg = this.spawnEgg(position);
    if (egg) this.spawnEnemy(egg.aquatic ? 'tadpole' : 'spawner', position, egg);
  }

  pickLowEggDensityPoint(from) {
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 10; i++) {
      const point = randomPointInCircle(Config.map.radius - 5, Config.map.safeRadius + 6);
      if (this.isBlockedByBuilding(point, 1.4)) continue;
      const score = horizontalDistanceSq(point, from) * 0.01 - this.countEggsNear(point, 18) * 24;
      if (score > bestScore) { best = point; bestScore = score; }
    }
    return best ?? randomPointInCircle(Config.map.radius - 6, Config.map.safeRadius + 5);
  }

  countEggsNear(position, radius) {
    const radiusSq = radius * radius;
    let count = 0;
    for (const egg of this.eggs) if (!egg.dead && horizontalDistanceSq(position, egg.position) <= radiusSq) count++;
    return count;
  }

  findEggSpawnPosition(origin, minDistance, maxDistance) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * TAU;
      const distance = randRange(minDistance, maxDistance);
      const point = new THREE.Vector3(origin.x + Math.sin(angle) * distance, 0, origin.z + Math.cos(angle) * distance);
      if (Math.hypot(point.x, point.z) > Config.map.radius - 5) continue;
      if (this.isBlockedByBuilding(point, 1.5) || this.countEggsNear(point, Config.egg.spacing) > 0) continue;
      return point;
    }
    return null;
  }

  spawnChildEgg(parentPosition) {
    if (!this.canSpawnEgg()) return null;
    const position = this.findEggSpawnPosition(parentPosition, Config.egg.childMinDistance, Config.egg.childMaxDistance);
    return position ? this.spawnEgg(position) : null;
  }

  getHatchRateScale() {
    const progress = clamp(this.elapsed / Config.map.playSeconds, 0, 1);
    const pressure = Math.max(0, this.eggs.length - Config.map.hatchPressureEggs);
    const pressureAcceleration = pressure * Config.map.hatchAcceleration / Math.max(1, Config.map.eggMax - Config.map.hatchPressureEggs);
    const timeAcceleration = Math.pow(progress, Config.map.hatchLateCurve) * Config.map.hatchAcceleration;
    const relief = clamp(this.eggsDestroyed / Config.map.hatchDestroyReliefEggs, 0, 1) * Config.map.hatchDestroyMaxSlow;
    const minimumScale = Config.map.hatchMinAccelerationScale
      + (Config.map.hatchLateMinAccelerationScale - Config.map.hatchMinAccelerationScale) * progress;
    return Config.map.hatchRateMultiplier * Math.max(minimumScale, 1 + timeAcceleration + pressureAcceleration - relief);
  }

  findEggsInRadius(position, radius, includeMother = false) {
    this.scratchEggs.length = 0;
    const radiusSq = radius * radius;
    for (const egg of this.eggs) if (!egg.dead && horizontalDistanceSq(position, egg.position) <= radiusSq) this.scratchEggs.push(egg);
    if (includeMother && this.motherEgg && !this.motherEgg.dead && horizontalDistanceSq(position, this.motherEgg.position) <= radiusSq) this.scratchEggs.push(this.motherEgg);
    return this.scratchEggs;
  }

  onEggDestroyed(egg, source) {
    this.scene.remove(egg.object);
    if (egg.isMother) {
      this.playSfx('eggBreak', { volume: 0.9 });
      this.spawnBurstEffect(egg.position, 9, 0xffd56b);
      this.finish(true, 'Mother egg destroyed');
      return;
    }
    this.eggsDestroyed += 1;
    this.playSfx('eggBreak', { volume: 0.68, cooldown: 0.05 });
    this.spawnXp(egg.position, Config.egg.xp);
    this.spawnRandomPickup(egg.position, 'egg');
    this.player.addBurst(Config.player.burstGainEgg);
    if (source === 'birdDive') this.player.hp = clamp(this.player.hp + this.player.maxHp * Config.egg.healOnBreakRatio, 0, this.player.maxHp);
  }

  spawnProjectile(origin, target, spec) {
    const projectile = this.projectilePool.acquire();
    projectile.setMaterial(spec.kind === 'eggSpecial' ? this.specialProjectileMaterial : this.playerProjectileMaterial);
    projectile.reset(origin, target, {
      ...spec,
      life: spec.life ?? 2.5,
      spriteFrames: this.playerProjectileTextures,
      spriteFrameRate: 24,
      spriteSize: spec.kind === 'eggSpecial' ? 1.35 : 1.05,
      spriteOpacity: 0.96,
      spriteTrailCount: 3
    });
    this.projectiles.push(projectile);
  }

  spawnEnemyProjectile(origin, target, stats) {
    const projectile = this.projectilePool.acquire();
    projectile.setMaterial(this.enemyProjectileMaterial);
    const start = origin.clone();
    start.y = 1.2;
    const aim = target.clone();
    aim.y = this.player.visualHeight + 1.0;
    const birdThreat = this.elapsed >= 150 && this.player.form === 'bird';
    projectile.reset(start, aim, {
      kind: 'enemy',
      damage: stats.damage * (birdThreat ? 1.35 : 1),
      speed: birdThreat ? 16 : stats.bulletSpeed,
      radius: 0.2,
      life: 2.8,
      spriteFrames: this.enemyProjectileTextures,
      spriteFrameRate: 24,
      spriteSize: 1.15,
      spriteOpacity: 0.95
    });
    this.projectiles.push(projectile);
  }

  releaseProjectile(projectile) {
    this.projectilePool.release(projectile);
  }

  clearProjectiles() {
    for (const projectile of this.projectiles) {
      this.releaseProjectile(projectile);
    }
    this.projectiles.length = 0;
  }

  spawnXp(position, value) {
    this.spawnPickup(position, 'xp', Math.round(value * Config.xp.rewardMultiplier));
  }

  spawnPickup(position, type, value = null) {
    const orb = this.xpPool.acquire();
    const offset = randomPointInCircle(Config.pickups.spawnOffsetRadius, 0);
    offset.add(position);
    orb.reset(offset, value, type);
    this.xpOrbs.push(orb);
  }

  spawnRandomPickup(position, source = 'enemy') {
    const chance = Config.pickups.dropChance[source] ?? Config.pickups.dropChance.enemy ?? 0;
    if (Math.random() > chance) return;
    const table = Config.pickups.dropWeights[source] ?? Config.pickups.dropWeights.enemy;
    if (!table?.length) return;
    const total = table.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of table) {
      roll -= entry.weight;
      if (roll > 0) continue;
      this.spawnPickup(position, entry.type);
      return;
    }
  }

  releaseXp(orb) {
    this.xpPool.release(orb);
  }

  cleanupLists() {
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      if (this.eggs[i].dead) this.eggs.splice(i, 1);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead) {
        this.scene.remove(this.enemies[i].object);
        this.enemies.splice(i, 1);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].active) this.projectiles.splice(i, 1);
    }
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      if (!this.xpOrbs[i].active) this.xpOrbs.splice(i, 1);
    }
  }

  spawnPulseSpriteEffect(position, range) {
    const texture = this.pulseEffectTexture;
    if (!texture?.image) return false;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xd8fbff,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.16, position.z);
    mesh.renderOrder = 4;
    this.scene.add(mesh);

    this.effects.push({
      object: mesh,
      life: 0.58,
      duration: 0.58,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const expand = t * (2 - t);
        const fade = t > 0.68 ? Math.max(0, 1 - (t - 0.68) / 0.32) : 1;
        mesh.scale.setScalar(Math.max(0.01, range * (0.12 + expand * 0.88)));
        material.opacity = 0.46 * (1 - t * 0.22) * fade;
      }
    });
    this.spawnParticleBurst(position, 22, 0xcffff9, range * 0.42, 0.48, 0.34);
    return true;
  }

  spawnPulseEffect(position, range) {
    if (this.spawnPulseSpriteEffect(position, range)) return;
    const segments = Math.max(32, Config.performance.effectSegments * 2);
    const group = new THREE.Group();
    group.name = 'PulseRangeEffect';
    group.position.set(position.x, 0.14, position.z);
    group.rotation.x = -Math.PI / 2;
    group.renderOrder = 4;

    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x62fff0,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0xe7fffb,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const guideMaterial = new THREE.MeshBasicMaterial({
      color: 0x8dfff3,
      transparent: true,
      opacity: 0.29,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, segments), fillMaterial);
    const outer = new THREE.Mesh(new THREE.RingGeometry(0.91, 1.0, segments), outerMaterial);
    const guide = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.63, segments), guideMaterial);
    const core = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, segments), coreMaterial);
    group.add(fill, outer, guide, core);
    this.scene.add(group);

    this.effects.push({
      object: group,
      life: 0.62,
      duration: 0.62,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const expand = 1 - (1 - t) ** 3;
        const fade = t > 0.72 ? Math.max(0, 1 - (t - 0.72) / 0.28) : 1;
        group.scale.setScalar(range * (0.18 + expand * 0.82));
        fillMaterial.opacity = 0.11 * (1 - t * 0.65) * fade;
        outerMaterial.opacity = 0.62 * (1 - t * 0.18) * fade;
        guideMaterial.opacity = 0.29 * Math.max(0, 1 - Math.abs(t - 0.45) / 0.45) * fade;
        coreMaterial.opacity = 0.34 * (1 - t) * fade;
      }
    });
    this.spawnParticleBurst(position, 54, 0xcffff9, range * 0.48, 0.56, 0.58);
  }

  spawnBurstSpriteEffect(position, range) {
    const textures = this.burstEffectTextures;
    if (!textures?.length) return;

    const material = new THREE.SpriteMaterial({
      map: textures[0],
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    const targetHeight = range * 1.45;
    const targetWidth = targetHeight * BURST_EFFECT_ASPECT;
    sprite.position.set(position.x, Math.max(1.8, targetHeight * 0.18), position.z);
    sprite.scale.set(targetWidth, targetHeight, 1);
    sprite.renderOrder = 8;
    this.scene.add(sprite);

    this.effects.push({
      object: sprite,
      life: 0.56,
      duration: 0.56,
      frame: 0,
      update(effect, dt) {
        effect.life -= dt;
        const t = Math.min(1, 1 - effect.life / effect.duration);
        const frame = Math.min(textures.length - 1, Math.floor(t * textures.length));
        if (frame !== effect.frame) {
          effect.frame = frame;
          material.map = textures[frame];
          material.needsUpdate = true;
        }
        const fadeIn = Math.min(1, t / 0.08);
        const fadeOut = t > 0.78 ? Math.max(0, 1 - (t - 0.78) / 0.22) : 1;
        const grow = 1 + t * 0.08;
        material.opacity = 0.9 * fadeIn * fadeOut;
        sprite.scale.set(targetWidth * grow, targetHeight * grow, 1);
      }
    });
  }

  spawnBurstSuperPulseEffect(position, range) {
    const texture = this.burstSuperPulseTexture;
    if (!texture?.image) return false;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.22, position.z);
    mesh.renderOrder = 7;
    this.scene.add(mesh);

    this.effects.push({
      object: mesh,
      life: 0.72,
      duration: 0.72,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const expand = 1 - (1 - t) ** 4;
        const fade = t > 0.64 ? Math.max(0, 1 - (t - 0.64) / 0.36) : 1;
        mesh.scale.setScalar(Math.max(0.01, range * (0.1 + expand * 1.03)));
        material.opacity = 0.78 * (1 - t * 0.18) * fade;
        mesh.rotation.z += dt * 0.34;
      }
    });
    return true;
  }

  spawnBurstEffect(position, range, color = PLAYER_BURST_COLOR) {
    const isPlayerBurst = color === PLAYER_BURST_COLOR;
    const usedSuperPulse = isPlayerBurst && this.spawnBurstSuperPulseEffect(position, range);
    if (!usedSuperPulse) {
      if (isPlayerBurst) this.spawnBurstSpriteEffect(position, range);
      this.spawnRingEffect(position, range, color, 0.82, 0.72);
      this.spawnRingEffect(position, range * 0.55, 0xffffff, 0.58, 0.48);
      this.spawnParticleBurst(position, 96, color, range * 0.75, 0.65);
    } else {
      this.spawnParticleBurst(position, 54, color, range * 0.64, 0.64, 0.72);
    }
    const lightIntensity = usedSuperPulse ? 10 : 8;
    const lightDuration = usedSuperPulse ? 0.65 : 0.55;
    const light = new THREE.PointLight(color, lightIntensity, range * 2.1);
    light.position.set(position.x, 3.2, position.z);
    this.scene.add(light);
    this.effects.push({
      object: light,
      life: lightDuration,
      duration: lightDuration,
      update(effect, dt) {
        effect.life -= dt;
        light.intensity = lightIntensity * Math.max(0, effect.life / effect.duration);
      }
    });
  }

  startTsukimiBurstBeam(player, length, width, duration) {
    const texture = this.tsukimiBeamTexture;
    if (!texture?.image) return;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const group = new THREE.Group();
    group.name = 'TsukimiSustainedBeam';
    const visualWidth = Math.max(0.72, width * 0.26);
    const geometry = new THREE.PlaneGeometry(visualWidth, length);
    const emitters = player.seeds.length > 0 ? player.seeds : [player.group];
    const beams = emitters.map((emitter) => {
      const beamGroup = new THREE.Group();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = length * 0.5;
      mesh.renderOrder = 8;
      beamGroup.add(mesh);
      group.add(beamGroup);
      return {
        emitter,
        group: beamGroup,
        mesh,
        origin: new THREE.Vector3()
      };
    });
    this.scene.add(group);
    this.effects.push({
      object: group,
      life: duration,
      duration,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const pulse = 0.92 + Math.sin(t * Math.PI * 15) * 0.08;
        for (const beam of beams) {
          beam.emitter.getWorldPosition(beam.origin);
          beam.group.position.copy(beam.origin);
          beam.group.rotation.y = player.faceAngle;
          beam.mesh.scale.x = pulse;
        }
        const fadeIn = Math.min(1, t / 0.08);
        const fadeOut = effect.life < 0.18 ? Math.max(0, effect.life / 0.18) : 1;
        material.opacity = (0.82 + Math.sin(t * Math.PI * 22) * 0.12) * fadeIn * fadeOut;
      }
    });
    for (const beam of beams) {
      beam.emitter.getWorldPosition(beam.origin);
      this.spawnParticleBurst(beam.origin, 12, 0xb8f6ff, 0.7, 0.32, 0.72);
    }
  }
  spawnKiichigoSlashEffect(position, angle, range, index, onMove) {
    const texture = this.kiichigoSlashTexture;
    if (!texture?.image) return;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    const origin = position.clone();
    const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const side = new THREE.Vector3(direction.z, 0, -direction.x);
    const lane = index - (Config.player.kiichigoSlashCount - 1) * 0.5;
    const size = 3.8;
    mesh.position.set(origin.x, 0.36, origin.z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -angle;
    mesh.scale.setScalar(size);
    mesh.renderOrder = 8;
    this.scene.add(mesh);
    this.effects.push({
      object: mesh,
      life: 1.45,
      duration: 1.45,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const outward = Math.sin(t * Math.PI) * range;
        const backward = Math.max(0, (t - 0.58) / 0.42) ** 1.35 * range * 0.46;
        const lateral = Math.sin(t * Math.PI) * lane * 3.1 + Math.sin(t * Math.PI * 2) * (lane === 0 ? 2.2 : lane * 1.1);
        mesh.position.x = origin.x + direction.x * (outward - backward) + side.x * lateral;
        mesh.position.z = origin.z + direction.z * (outward - backward) + side.z * lateral;
        mesh.rotation.z += dt * (index % 2 === 0 ? 12.5 : -12.5);
        const fadeIn = Math.min(1, t / 0.06);
        const fadeOut = Math.min(1, effect.life / 0.2);
        material.opacity = 0.96 * fadeIn * fadeOut;
        const pulse = 0.92 + Math.sin(t * Math.PI * 8) * 0.08;
        mesh.scale.setScalar(size * pulse);
        onMove?.(mesh.position, 2.15);
      }
    });
    this.spawnParticleBurst(position, 18, 0xff6db2, 1.8, 0.38, 0.8);
  }
  spawnMotherShockwaveWarning(position, range, duration) {
    const texture = this.motherShockwaveTexture;
    if (!texture?.image) return;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xff3038,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.18, position.z);
    mesh.scale.setScalar(range * 0.88);
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    this.effects.push({
      object: mesh,
      life: duration,
      duration,
      update(effect, dt) {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const pulse = 0.5 + Math.sin(t * Math.PI * 10) * 0.5;
        mesh.scale.setScalar(range * (0.82 + t * 0.06));
        material.opacity = (0.08 + pulse * 0.18) * Math.min(1, effect.life * 5);
      }
    });
  }

  spawnMotherShockwave(position, range, damage, duration) {
    const texture = this.motherShockwaveTexture;
    if (!texture?.image) return;
    const primaryMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xff4a50,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const echoMaterial = primaryMaterial.clone();
    echoMaterial.color.setHex(0xff101c);
    echoMaterial.opacity = 0.68;
    const primary = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), primaryMaterial);
    const echo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), echoMaterial);
    primary.scale.setScalar(0.1);
    echo.scale.setScalar(0.1);
    const group = new THREE.Group();
    group.name = 'MotherDoubleShockwave';
    group.position.set(position.x, 0.24, position.z);
    group.rotation.x = -Math.PI / 2;
    group.renderOrder = 7;
    group.add(primary, echo);
    this.scene.add(group);
    const player = this.player;
    let resolved = false;
    this.effects.push({
      object: group,
      life: duration,
      duration,
      update: (effect, dt) => {
        effect.life -= dt;
        const t = clamp(1 - effect.life / effect.duration, 0, 1);
        const radius = range * (1 - (1 - t) ** 2);
        const echoT = clamp((t - 0.12) / 0.88, 0, 1);
        const echoRadius = range * (1 - (1 - echoT) ** 2);
        primary.scale.setScalar(Math.max(0.1, radius));
        echo.scale.setScalar(Math.max(0.1, echoRadius));
        const fade = Math.max(0, 1 - Math.max(0, t - 0.72) / 0.28);
        primaryMaterial.opacity = 0.95 * fade;
        echoMaterial.opacity = 0.68 * Math.min(1, echoT * 5) * fade;
        if (resolved || !player || player.dead) return;
        const distance = Math.sqrt(horizontalDistanceSq(position, player.position));
        if (radius < distance) return;
        resolved = true;
        this.playSfx('motherImpact', { volume: 0.94, cooldown: 0.4 });
        if (player.form === 'bird') {
          this.spawnRingEffect(player.position, 3.2, 0xffd5d8, 0.72, 0.34);
          this.showMessage('\u9ce5\u5f62\u614b\uff1a\u885d\u6483\u6ce2\u7121\u52b9', 1.1);
          return;
        }
        player.takeDamage(damage, { ignoreInvincibility: true });
        this.shake = Math.max(this.shake, 0.68);
      }
    });
    this.spawnRingEffect(position, 6.5, 0xff2835, 0.92, 0.48);
    this.spawnRingEffect(position, 4.2, 0xffffff, 0.68, 0.32);
    this.spawnParticleBurst(position, 82, 0xff2534, 6.2, 0.68, 0.82);
  }
  spawnDiveWarning(position) {
    if (Math.floor(this.elapsed * 24) % 3 !== 0) return;
    this.spawnRingEffect(position, 1.9, 0xfff078, 0.32, 0.16);
  }

  spawnDiveImpact(position) {
    this.spawnRingEffect(position, 4.2, 0xfff3a0, 0.7, 0.28);
    this.spawnParticleBurst(position, 38, 0xfff3a0, 2.4, 0.34);
  }

  spawnHitSpark(position, color) {
    this.spawnParticleBurst(position, 12, color, 0.9, 0.18);
  }

  spawnEnemyDissolveEffect(position, type) {
    const texture = this.enemyDissolveDustTexture;
    const player = this.player;
    const showSprite = !player || horizontalDistanceSq(position, player.position) <= Config.performance.enemyLodDistance ** 2;
    if (showSprite && texture?.image) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false
      });
      const sprite = new THREE.Sprite(material);
      const size = type === 'spawner' ? 3.1 : type === 'guardian' ? 2.8 : 2.25;
      sprite.position.set(position.x, 0.85, position.z);
      sprite.scale.setScalar(size * 0.72);
      material.rotation = Math.random() * TAU;
      sprite.renderOrder = 6;
      this.scene.add(sprite);
      this.effects.push({
        object: sprite,
        life: 0.46,
        duration: 0.46,
        update(effect, dt) {
          effect.life -= dt;
          const t = clamp(1 - effect.life / effect.duration, 0, 1);
          sprite.scale.setScalar(size * (0.72 + t * 0.88));
          sprite.position.y = 0.85 + t * 0.42;
          material.opacity = 0.76 * (1 - t) ** 1.5;
        }
      });
    }
    this.spawnParticleBurst(position, type === 'spawner' ? 14 : 10, type === 'spawner' ? 0xffd6b3 : 0x93c5bb, 1.25, 0.38, 0.5);
  }

  spawnDust(position, color) {
    this.spawnParticleBurst(position, 18, color, 1.3, 0.34);
  }

  spawnRingEffect(position, radius, color, opacity, duration) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.32, Config.performance.effectSegments),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.position.set(position.x, 0.12, position.z);
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
    this.effects.push({
      object: mesh,
      life: duration,
      duration,
      update(effect, dt) {
        effect.life -= dt;
        const t = 1 - effect.life / effect.duration;
        mesh.scale.setScalar(Math.max(0.01, radius * t));
        mesh.material.opacity = Math.max(0, opacity * (1 - t));
      }
    });
  }

  spawnParticleBurst(position, count, color, radius, duration, opacity = 0.82) {
    count = Math.max(1, Math.round(count * Config.performance.particleMultiplier));
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = randRange(0.2, 1.4);
      positions[i * 3 + 2] = position.z;
      const angle = Math.random() * TAU;
      velocities.push(new THREE.Vector3(Math.sin(angle) * randRange(0.5, radius), randRange(0.8, 3.5), Math.cos(angle) * randRange(0.5, radius)));
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 0.12, transparent: true, opacity, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.effects.push({
      object: points,
      life: duration,
      duration,
      update(effect, dt) {
        effect.life -= dt;
        const attr = geometry.getAttribute('position');
        for (let i = 0; i < count; i++) {
          attr.array[i * 3] += velocities[i].x * dt;
          attr.array[i * 3 + 1] += velocities[i].y * dt;
          attr.array[i * 3 + 2] += velocities[i].z * dt;
          velocities[i].y -= 5 * dt;
        }
        attr.needsUpdate = true;
        material.opacity = Math.max(0, opacity * effect.life / effect.duration);
      }
    });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.update(effect, dt);
      if (effect.life <= 0) {
        this.scene.remove(effect.object);
        if (effect.dispose !== false) this.disposeEffectObject(effect.object);
        this.effects.splice(i, 1);
      }
    }
  }

  disposeEffectObject(object) {
    const geometries = new Set();
    const materials = new Set();
    if (object.traverse) {
      object.traverse((child) => {
        if (child.geometry) geometries.add(child.geometry);
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of childMaterials) {
          if (material) materials.add(material);
        }
      });
    } else {
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of objectMaterials) {
        if (material) materials.add(material);
      }
    }
    for (const geometry of geometries) geometry.dispose?.();
    for (const material of materials) material.dispose?.();
  }

  showLevelUp() {
    if (this.state !== 'playing') return;
    this.state = 'levelup';
    this.settleCamera();
    this.playSfx('levelUp', { volume: 0.85 });
    this.hud.showLevelUp(pickUpgradeChoices(), (upgrade) => {
      this.playSfx('buttonConfirm', { volume: 0.75 });
      upgrade.apply(this);
      this.state = 'playing';
      this.showMessage(upgrade.title);
    });
  }

  showMessage(text, seconds = 1.25) {
    this.hud.showMessage(text, seconds);
  }

  startPlayerDeath(duration) {
    if (this.outcome) return;
    this.state = 'dying';
    this.deathWorldActive = true;
    this.deathElapsed = 0;
    this.deathBlackoutStarted = false;
    this.deathTimer = Math.max(0.45, duration);
    this.hint = '';
    this.hintTimer = 0;
    this.hud.showDeathBlackout(false);
    this.clearProjectiles();
  }

  finish(victory, body) {
    if (this.outcome || (victory && this.player?.dead)) return;
    this.outcome = {
      victory,
      body: victory && this.stageId === 1
        ? 'ポンプは動いている。六人全員が避難所へ。\n東の温室は失われたが、ハスノ区の水は守られた。'
        : body
    };
    this.state = 'result';
    this.hud.hideLevelUp();
    this.deathWorldActive = !victory && this.player?.dead === true;
    if (!this.deathWorldActive) this.hud.showDeathBlackout(false);
    this.settleCamera();
    if (victory && this.stageId === 1) this.replayAftermath();
    else this.hud.showResult(victory, this.outcome.body);
  }

  replayAftermath() {
    if (!this.outcome?.victory || storyPlayer.active) return;
    const scene = createAftermath(this.characterId, this.stageId);
    if (!scene) return;
    this.state = 'story';
    this.hud.result.classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    storyPlayer.show(scene, () => {
      this.state = 'result';
      document.getElementById('hud').classList.remove('hidden');
      this.hud.showResult(this.outcome.victory, this.outcome.body);
    });
  }

  createBgm() {
    const audio = new Audio(BGM_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = Config.audio.bgmVolume;
    return audio;
  }

  createSfxPlayers() {
    const sfx = {};
    for (const [name, url] of Object.entries(SFX_URLS)) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = Config.audio.sfxVolume;
      sfx[name] = audio;
    }
    return sfx;
  }

  createVoicePlayers() {
    const voices = {};
    for (const [characterId, groups] of Object.entries(VOICE_URLS)) {
      voices[characterId] = {};
      for (const [eventName, urls] of Object.entries(groups)) {
        voices[characterId][eventName] = urls.map((url) => {
          const audio = new Audio(url);
          audio.preload = 'auto';
          audio.volume = Config.audio.voiceVolume;
          return audio;
        });
      }
    }
    return voices;
  }

  playSfx(name, options = {}) {
    const base = this.sfx?.[name];
    if (!base) return;
    const cooldown = options.cooldown ?? 0;
    const lastPlayed = this.sfxLastPlayed.get(name) ?? -Infinity;
    if (cooldown > 0 && this.elapsed - lastPlayed < cooldown) return;
    this.sfxLastPlayed.set(name, this.elapsed);
    try {
      const audio = base.paused ? base : base.cloneNode(true);
      if (audio !== base) {
        this.activeSfx.add(audio);
        audio.addEventListener('ended', () => this.activeSfx.delete(audio), { once: true });
      }
      audio.volume = clamp(Config.audio.sfxVolume * (options.volume ?? 1), 0, 1);
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (audio !== base) this.activeSfx.delete(audio);
        });
      }
    } catch {
      // SFX playback can be blocked before the first user gesture.
    }
  }

  playVoice(eventName, options = {}) {
    const list = this.voices?.[this.characterId]?.[eventName];
    if (!list?.length) return;
    const cooldownKey = `voice:${this.characterId}:${eventName}`;
    const cooldown = options.cooldown ?? 0;
    const lastPlayed = this.sfxLastPlayed.get(cooldownKey) ?? -Infinity;
    if (cooldown > 0 && this.elapsed - lastPlayed < cooldown) return;
    this.sfxLastPlayed.set(cooldownKey, this.elapsed);
    const base = list[Math.floor(Math.random() * list.length)];
    try {
      const audio = base.paused ? base : base.cloneNode(true);
      if (audio !== base) {
        this.activeSfx.add(audio);
        audio.addEventListener('ended', () => this.activeSfx.delete(audio), { once: true });
      }
      audio.volume = clamp(Config.audio.voiceVolume * (options.volume ?? 1), 0, 1);
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (audio !== base) this.activeSfx.delete(audio);
        });
      }
    } catch {
      // Voice playback can be blocked before the first user gesture.
    }
  }

  updateBgmState() {
    if (!this.bgm) return;
    if (BGM_ACTIVE_STATES.has(this.state)) {
      this.tryPlayBgm();
    } else {
      this.pauseBgm();
    }
  }

  tryPlayBgm() {
    if (!this.bgm || !this.bgm.paused || this.bgmPlayPending || this.bgmAwaitingGesture) return;
    try {
      this.bgmPlayPending = true;
      this.bgm.volume = Config.audio.bgmVolume;
      const playPromise = this.bgm.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            this.bgmPlayPending = false;
            this.removeBgmUnlockListeners();
          })
          .catch(() => {
            this.bgmPlayPending = false;
            if (BGM_ACTIVE_STATES.has(this.state)) {
              this.bgmAwaitingGesture = true;
              this.installBgmUnlockListeners();
            }
          });
      } else {
        this.bgmPlayPending = false;
      }
    } catch {
      this.bgmPlayPending = false;
      if (BGM_ACTIVE_STATES.has(this.state)) {
        this.bgmAwaitingGesture = true;
        this.installBgmUnlockListeners();
      }
    }
  }

  pauseBgm() {
    if (!this.bgm) return;
    if (!this.bgm.paused) this.bgm.pause();
    this.bgmAwaitingGesture = false;
    this.removeBgmUnlockListeners();
  }

  installBgmUnlockListeners() {
    if (this.bgmUnlockInstalled) return;
    this.bgmUnlockInstalled = true;
    window.addEventListener('pointerdown', this.bgmUnlockHandler, { once: true });
    window.addEventListener('keydown', this.bgmUnlockHandler, { once: true });
  }

  removeBgmUnlockListeners() {
    if (!this.bgmUnlockInstalled) return;
    this.bgmUnlockInstalled = false;
    window.removeEventListener('pointerdown', this.bgmUnlockHandler);
    window.removeEventListener('keydown', this.bgmUnlockHandler);
  }

  playBurstSound() {
    this.playSfx('burstFire', { volume: 0.9 });
    this.playSfx('burstSpread', { volume: 0.85 });
  }
}

const storyPlayer = new StoryPlayer();

function handleStoryGamepad(input) {
  if (storyPlayer.logOpen) {
    handleGamepadMenu(input, storyPlayer.query('.story-log'), () => storyPlayer.toggleLog());
  } else {
    handleGamepadMenu(input, storyPlayer.root);
  }
}

function startGameWithCharacter(characterId) {
  if (activeGame) return;
  const option = CHARACTER_OPTIONS[characterId] ?? CHARACTER_OPTIONS.tsukimi;
  Config.visuals.playerModel = option.playerModel;
  document.getElementById('characterSelect')?.classList.add('hidden');
  document.getElementById('hud')?.classList.remove('hidden');
  activeGame = new Game(characterId, selectedStageId);
}

function setupCharacterSelect() {
  const characterSelect = document.getElementById('characterSelect');
  const debugStageSelect = document.getElementById('debugStageSelect');
  const stageButtons = [...document.querySelectorAll('[data-stage-id]')];
  const buttons = [...document.querySelectorAll('[data-character]')];
  const confirmButton = document.getElementById('characterConfirm');
  const selectionSummary = document.getElementById('characterSelectionSummary');
  let selectedCharacterId = 'tsukimi';
  buttons.forEach((button) => {
    const portrait = button.querySelector('.character-art');
    if (portrait) portrait.src = getCharacterPortrait(button.dataset.character, 'normal');
  });
  if (!characterSelect || buttons.length === 0) {
    startGameWithCharacter('tsukimi');
    return;
  }

  const selectCharacter = (characterId) => {
    const selected = buttons.find(button => button.dataset.character === characterId);
    if (!selected) return;
    selectedCharacterId = characterId;
    for (const button of buttons) {
      const active = button === selected;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    }
    const name = selected.querySelector('.character-name')?.textContent ?? '';
    const role = selected.querySelector('.character-role')?.textContent ?? '';
    selectionSummary.textContent = `${name}を選択中。${role}。`;
    confirmButton.textContent = `${name}で出撃`;
  };

  const updateDebugStageSelection = () => {
    stageButtons.forEach((button) => {
      const selected = Number(button.dataset.stageId) === selectedStageId;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  };
  const setDebugStageSelectOpen = (open) => {
    if (!debugStageSelect) return;
    debugStageSelect.classList.toggle('hidden', !open);
    debugStageSelect.setAttribute('aria-hidden', String(!open));
    if (open) {
      updateDebugStageSelection();
      stageButtons.find((button) => Number(button.dataset.stageId) === selectedStageId)?.focus();
    } else {
      characterSelect.querySelector(`[data-character="${selectedCharacterId}"]`)?.focus();
    }
  };

  window.addEventListener('keydown', (event) => {
    const characterSelectActive = !characterSelect.classList.contains('hidden');
    const tutorialActive = !document.getElementById('tutorial')?.classList.contains('hidden');
    if (!characterSelectActive || tutorialActive) return;
    if (event.code === 'F3') {
      event.preventDefault();
      setDebugStageSelectOpen(debugStageSelect?.classList.contains('hidden'));
    } else if (event.code === 'Escape' && !debugStageSelect?.classList.contains('hidden')) {
      event.preventDefault();
      setDebugStageSelectOpen(false);
    }
  });

  stageButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedStageId = Number(button.dataset.stageId) || 1;
      const confirm = new Audio(SFX_URLS.buttonConfirm);
      confirm.volume = Config.audio.sfxVolume * 0.75;
      confirm.play()?.catch?.(() => {});
      setDebugStageSelectOpen(false);
    });
  });

  buttons.forEach((button) => {
    button.addEventListener('focus', () => selectCharacter(button.dataset.character));
    button.addEventListener('click', () => {
      selectCharacter(button.dataset.character);
      confirmButton.focus();
    });
  });
  confirmButton.addEventListener('click', () => {
    if (activeGame || storyPlayer.active) return;
    const confirm = new Audio(SFX_URLS.buttonConfirm);
    confirm.volume = Config.audio.sfxVolume * 0.75;
    confirm.play()?.catch?.(() => {});
    buttons.forEach(button => { button.disabled = true; });
    confirmButton.disabled = true;
    characterSelect.classList.add('hidden');
    storyPlayer.show(createBriefing(selectedCharacterId, selectedStageId), () => {
      startGameWithCharacter(selectedCharacterId);
    });
  });
  document.getElementById('tutorialButton')?.addEventListener('click', () => {
    getTutorialGuide().show(() => {
      characterSelect.querySelector(`[data-character="${selectedCharacterId}"]`)?.focus();
    });
  });
}

function setupTitleScreen() {
  const titleScreen = document.getElementById('titleScreen');
  const characterSelect = document.getElementById('characterSelect');
  const startButton = document.getElementById('titleStartButton');
  if (!titleScreen || !characterSelect || !startButton) return;
  startButton.addEventListener('click', () => {
    selectedStageId = 1;
    const confirm = new Audio(SFX_URLS.buttonConfirm);
    confirm.volume = Config.audio.sfxVolume * 0.75;
    confirm.play()?.catch?.(() => {});
    titleScreen.classList.add('hidden');
    storyPlayer.show(PROLOGUE, () => {
      characterSelect.classList.remove('hidden');
      characterSelect.querySelector('[data-character="tsukimi"]')?.focus({ preventScroll: true });
    });
  });
  startButton.focus();
}

setupCharacterSelect();
setupTitleScreen();

function updatePreGamepadMenus() {
  if (activeGame) return;
  appInput.beginFrame();
  const titleScreen = document.getElementById('titleScreen');
  const characterSelect = document.getElementById('characterSelect');
  const debugStageSelect = document.getElementById('debugStageSelect');
  const tutorial = document.getElementById('tutorial');
  if (storyPlayer.active) {
    handleStoryGamepad(appInput);
  } else if (tutorial && !tutorial.classList.contains('hidden')) {
    handleGamepadMenu(appInput, tutorial, () => getTutorialGuide().finish());
  } else if (debugStageSelect && !debugStageSelect.classList.contains('hidden')) {
    handleGamepadMenu(appInput, debugStageSelect, () => {
      debugStageSelect.classList.add('hidden');
      debugStageSelect.setAttribute('aria-hidden', 'true');
      characterSelect?.querySelector('.character-card.selected')?.focus();
    });
  } else if (characterSelect && !characterSelect.classList.contains('hidden')) {
    handleGamepadMenu(appInput, characterSelect);
  } else if (titleScreen && !titleScreen.classList.contains('hidden')) {
    handleGamepadMenu(appInput, titleScreen);
  }
  appInput.endFrame();
  if (!activeGame) requestAnimationFrame(updatePreGamepadMenus);
}

requestAnimationFrame(updatePreGamepadMenus);
