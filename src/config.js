export const Config = {
  visuals: {
    useAssetModels: false,
    playerModel: 'tsukimiGlb',
    playerModelHeight: 2.25,
    playerModelYaw: 0,
    playerGlbAxisFix: 'zUpToYUp',
    playerMatteRoughness: 0.72,
    playerMaterialEnvIntensity: 0.28,
    playerMaterialSpecularIntensity: 0.32,
    playerMaterialReflectivity: 0.18,
    playerContactShadow: true,
    playerContactShadowOpacity: 0.32,
    playerContactShadowColor: 0x060807,
    playerUnderLightIntensity: 0.24,
    playerUnderLightRange: 8.0,
    playerUnderLightDecay: 1.25,
    playerGlowOutline: false,
    playerUseUnlitMaterial: false,
    playerUnlitColor: 0xb8b4ad,
    birdModelHeight: 3.44,
    birdModelYaw: 0,
    birdModelPitch: Math.PI * 0.5,
    droneModelHeight: 0.28,
    motherEggModelHeight: 4.2,
    usePlayerFbxAnimations: true,
    useEmbeddedPlayerAnimation: false,
    useProceduralPlayerBones: false,
    playerAnimationFade: 0.16,
    playerIdleAnimationSpeed: 1,
    playerRunAnimationSpeed: 1.08,
    playerReactAnimationSpeed: 1.25,
    playerDyingAnimationSpeed: 0.95,
    playerBurstAnimationSpeed: 1,
    playerDeathResultDelay: 0.45,
    playerDeathBlackoutSeconds: 10,
    useFloorTexture: true,
    useBackgroundObjects: true,
    usePrimitiveDecor: false,
    floorTileSize: 16,
    waterStageTileSize: 14,
    useToneMapping: true,
    useUnlitGround: false,
    useUnlitBackgroundModels: false,
    seedGlowOutline: false,
    seedEmissiveIntensity: 0,
    droneOrbitSpeed: 1.9,
    droneSpinSpeed: 2.4,
    droneFallGravity: 5.8,
    droneFallTumbleSpeed: 4.8,
    droneGroundY: 0.02,
    renderExposure: 1.18,
    ambientLightIntensity: 0.78,
    sunLightIntensity: 2.55,
    fillLightIntensity: 0.48,
    environmentLightIntensity: 0.32,
    floorTextureTint: 0xffffff,
    backgroundModelBrightness: 1.08
  },
  performance: {
    maxPixelRatio: 1,
    renderScale: 0.9,
    antialias: false,
    enableShadows: false,
    enemyLights: false,
    eggLights: false,
    decorMultiplier: 0.45,
    backgroundObjectMultiplier: 0.55,
    particleMultiplier: 0.45,
    groundSegments: 72,
    effectSegments: 24,
    useEnemyLod: true,
    enemyLodDistance: 36,
    enemyHideDistance: 76,
    enemyFarUpdateDistance: 24,
    enemyFarUpdateInterval: 0.08,
    enemyVeryFarUpdateDistance: 44,
    enemyVeryFarUpdateInterval: 0.16,
    enemyAvoidanceDistance: 34,
    enemyHpBarDistance: 20,
    useEggLod: true,
    eggLodDistance: 46,
    eggDetailDistance: 44,
    usePrimitiveXp: true,
    xpGlowDistance: 22
  },
  audio: {
    bgmVolume: 0.42,
    sfxVolume: 0.58,
    voiceVolume: 0.72,
    // Battle-start line when the stage begins and a last line after the dying scream (false = previous voice set).
    battleVoices: true,
    // Pause between the end of the dying scream and the last line.
    deathVoiceGap: 1.2,
    // Sounds added 2026-10-27 (item pickup chime, thirst mother drain). false = reuse xp_pickup / mother_charge as before.
    newSfx: true
  },
  story: {
    // 会話画面の立ち絵を動くアバター（assets/avatars/*.mavatar）にする（false で静止画のみ）。
    avatarPortraits: true,
    // 'normal': 通常の表情の台詞だけアバター、ほかの表情は描き分けた静止画。'all': すべてアバターで、表情は変形で付ける。
    avatarExpressions: 'all'
  },
  map: {
    radius: 72,
    safeRadius: 7,
    playSeconds: 240,
    motherSpawnSeconds: 180,
    eggMax: 90,
    enemyMax: 120,
    initialEggs: 4,
    initialEnemies: 2,
    initialEggCap: 10,
    initialEnemyCap: 14,
    stageBeats: [
      { at: 35, enemies: ['chaser', 'shooter'], eggs: 1, eggCap: 18, enemyCap: 25 },
      { at: 70, enemies: ['spawner', 'chaser', 'shooter'], eggs: 1, eggCap: 32, enemyCap: 42 },
      { at: 110, enemies: ['chaser', 'guardian'], eggs: 3, eggCap: 48, enemyCap: 60 },
      { at: 150, enemies: ['shooter', 'shooter', 'guardian', 'chaser'], eggs: 1, eggCap: 64, enemyCap: 78 },
      { at: 180, enemies: ['sniper', 'guardian', 'spawner', 'chaser'], eggs: 2, eggCap: 72, enemyCap: 88 },
      { at: 195, enemies: ['sniper', 'shooter', 'guardian', 'chaser'], eggs: 1, eggCap: 78, enemyCap: 96 },
      { at: 210, enemies: ['sniper', 'sniper', 'shooter', 'guardian', 'chaser', 'chaser'], eggs: 2, eggCap: 84, enemyCap: 108 },
      { at: 225, enemies: ['sniper', 'sniper', 'shooter', 'guardian', 'spawner', 'chaser', 'chaser'], eggs: 1, eggCap: 90, enemyCap: 120 }
    ],
    spawnCapPauseSeconds: 40,
    spawnCapResumeBudget: 1,
    hatchAcceleration: 0.85,
    hatchRateMultiplier: 1.8,
    hatchLateCurve: 1.35,
    hatchPressureEggs: 36,
    hatchDestroyReliefEggs: 30,
    hatchDestroyMaxSlow: 0.24,
    hatchDestroyReliefFade: 0.7,
    hatchMinAccelerationScale: 0.25,
    hatchLateMinAccelerationScale: 0.65,
    buildingCollisionMinHeight: 2.2,
    buildingCollisionRadiusScale: 0.42,
    buildingCollisionMinRadius: 1.1,
    buildingCollisionMaxRadius: 3.4,
    buildingHp: 34,
    buildingCollapseSeconds: 0.72
  },
  player: {
    // 全キャラ共通の被ダメージ倍率。1 で調整前（2026-10-21 以前）と同じ。
    damageTakenScale: 0.9,
    maxHp: 120,
    maxMp: 100,
    humanSpeed: 6.72,
    birdSpeed: 14.78,
    birdTurnRate: Math.PI * 0.82,
    birdBoundaryTurnRate: Math.PI * 1.2,
    humanRegenMp: 6,
    birdMpCost: 14,
    fishSpeed: 8.4,
    fishMpCost: 9,
    fishEggRange: 3.2,
    fishBiteCooldown: 0.34,
    radius: 0.72,
    invincibleAfterBird: 1.2,
    phaseAfterBird: 1.2,
    attackLockAfterBird: 0.25,
    modelYaw: Math.PI * 0.5,
    humanHeight: 0,
    birdHeight: 8.5,
    birdFloatSpeed: 11,
    autoInterval: 0.75,
    autoDamage: 10,
    autoRange: 12,
    autoProjectileSpeed: 18,
    specialEggRange: 6,
    specialInterval: 0.42,
    specialDamage: 2.2,
    specialProjectileSpeed: 23,
    burstMax: 100,
    burstEnemyDamage: 100,
    burstEggDamage: 50,
    burstMotherDamageCap: 28,
    burstRange: 12,
    burstInvincible: 1,
    burstCooldown: 8,
    burstGainEnemy: 6,
    burstGainEgg: 14,
    burstGainSpawner: 24,
    tsukimiBeamLength: 120,
    tsukimiBeamWidth: 4.2,
    tsukimiBeamDuration: 2,
    tsukimiBeamTickInterval: 0.12,
    tsukimiBeamEnemyDamage: 16,
    tsukimiBeamEggDamage: 9,
    tsukimiBeamMotherDamage: 3.2,
    kiichigoSlashCount: 3,
    kiichigoSlashInterval: 0.16,
    kiichigoSlashRange: 13,
    kiichigoSlashArc: Math.PI * 0.42,
    kiichigoSlashEnemyDamage: 46,
    kiichigoSlashEggDamage: 24,
    kiichigoSlashMotherDamage: 13,
    birdEggDetectRange: 4.5,
    birdMotherDetectRange: 5.4,
    birdDiveCooldown: 0.72,
    birdDiveWarn: 0.55,
    birdDiveDuration: 0.28,
    birdDiveReturn: 0.26,
    birdDiveDamage: 90,
    birdMotherDiveDamage: 34,
    feedHpRatio: 0.035,
    feedMpRatio: 0.1
  },
  characters: {
    tsukimi: {},
    akame: {
      maxHp: 170,
      maxMp: 90,
      humanSpeed: 5.71,
      birdSpeed: 13.55,
      autoDamage: 12,
      damageTakenMultiplier: 0.78,
      radius: 0.82
    },
    kiichigo: {
      maxHp: 88,
      maxMp: 112,
      humanSpeed: 8.29,
      birdSpeed: 16.13,
      autoInterval: 0.62,
      specialInterval: 0.34,
      damageTakenMultiplier: 1.08,
      radius: 0.62
    }
  },
  camera: {    human: {
      height: 3.2,
      distance: 10.5,
      fov: 48,
      pitch: 0.38
    },
    bird: {
      height: 34,
      distance: 12,
      fov: 58,
      pitch: 1.22
    },
    fish: { height: 1.1, distance: 5.2, fov: 43, pitch: 0.22 },
    transitionSeconds: 0.6
  },
  // On clearing a chapter, carry one upgrade taken that chapter and one of three chapter rewards into the
  // following chapters (src/campaign.js keeps the choices). enabled: false hides the picker and ignores saved choices.
  carryOver: {
    enabled: true
  },
  // Morning hatch forecast (src/forecast.js): after the pre-sortie dialogue, one card with the chapter's new species
  // and boss before the battle starts. enabled: false goes straight from the dialogue to the battle.
  // Off since 2026-10-27 (user: not needed for now). true brings the card back.
  forecast: {
    enabled: false
  },
  // Per-boss tuning (src/bosses.js). Chapter 5's thirst mother tethers nearby eggs and heals by the eggs still alive
  // when the drain ends; breaking them first (bird dive on land, fish bite in water) denies the heal. Set the stage's boss to 'motherEgg' to remove it.
  boss: {
    thirstMother: {
      firstDelay: 7,
      interval: 12,
      retryDelay: 2.5,
      drainSeconds: 3.4,
      range: 22,
      count: 4,
      healRatioPerEgg: 0.035
    },
    // Chapter 2's pursuer walks after the player and stops every layInterval seconds to lay an egg behind it.
    // Only while laying is its shell open (openDamageScale); otherwise hits do closedDamageScale. Touching it hurts
    // unless the player is in bird form. Set chapter 2's boss to 'motherEgg' to remove it.
    pursuer: {
      speed: 2.5,
      stopDistance: 1.6,
      bodyRadius: 2.2,
      mapMargin: 6,
      firstLayDelay: 5,
      layInterval: 6.5,
      layDuration: 2.8,
      openDamageScale: 1.8,
      closedDamageScale: 0.3,
      contactRadius: 3.1,
      contactDamage: 20,
      contactCooldown: 1.1
    }
  },
  egg: {
    hp: 38,
    motherHp: 300,
    motherShockwaveFirstDelay: 4.5,
    motherShockwaveInterval: 10,
    motherShockwaveWarning: 1.6,
    motherShockwaveDuration: 0.95,
    motherShockwaveRange: 24,
    motherShockwaveDamage: 68,
    // Warning cues for dodging by bird form: an outline at the exact range and a ring closing in until impact.
    motherShockwaveTimingRing: true,
    matureSeconds: 8,
    hatchMin: 9.5,
    hatchMax: 14,
    reproduceSeconds: 14,
    childMinDistance: 4,
    childMaxDistance: 10,
    spacing: 3.1,
    xp: 8,
    healOnBreakRatio: 0.05,
    // Mimic eggs (chapter 5+, a late-game type): look like normal eggs but pulse faster. Eating one in bird form bursts it and
    // roots the player briefly; shooting it in human form is safe. enabled: false removes them.
    mimic: {
      enabled: true,
      fromChapter: 5,
      chance: 0.14,
      stunSeconds: 1.5,
      stunMarker: true, // 硬直中、頭上に紫の結晶を回す（false で足元の輪だけ）
      normalPulseHz: 0.8,
      mimicPulseHz: 2.1,
      normalPulseScale: 0.03,
      mimicPulseScale: 0.06
    }
  },
  enemy: {
    // GLB に idle / walk / attack / hit / die を持つ敵の共通設定。種類ごとの値があればそちらを優先する
    animation: {
      fade: 0.15,
      walkThreshold: 0.35,
      walkTimeScaleMin: 0.6,
      walkTimeScaleMax: 1.8,
      corpseLingerSeconds: 0.6,
      corpseSinkSeconds: 0.5,
      corpseSinkDepth: 0.7
    },
    chaser: { hp: 28, speed: 3.32, damage: 12, xp: 5, walkAnimationSpeed: 2.2 },
    shooter: {
      hp: 24,
      speed: 2.46,
      damage: 7,
      xp: 7,
      range: 13,
      fireInterval: 2.1,
      bulletSpeed: 10,
      fireWindup: 0.2,
      animationFade: 0.08,
      walkAnimationSpeed: 2.0
    },
    sniper: {
      hp: 24,
      speed: 2.46,
      damage: 10,
      xp: 9,
      animationFade: 0.08,
      walkAnimationSpeed: 2.0,
      range: 21,
      fireInterval: 3.6,
      warningSeconds: 1.15,
      beamSeconds: 0.8,
      warningTurnRate: 4.5,
      beamTurnRate: 2.4,
      groundTrackingLagSeconds: 0.45,
      hitInterval: 0.42,
      humanHitRadius: 0.85,
      birdHitRadius: 1.8,
      maxAliveBeforeRush: 2,
      maxAliveDuringRush: 6
    },
    guardian: { hp: 72, speed: 2.14, damage: 15, xp: 10, walkAnimationSpeed: 1.8, corpseSinkDepth: 0.9 },
    spawner: {
      hp: 48,
      speed: 8.77,
      damage: 5,
      xp: 13,
      walkAnimationSpeed: 5.5,
      corpseSinkDepth: 1.1,
      lifeSeconds: 58,
      layMin: 5,
      layMax: 8.3,
      fleeRange: 10,
      nearEggLimit: 3,
      eggCheckRange: 11,
      destinationSeconds: 4.8
    },
    dragonflyLarva: { hp: 18, speed: 1.82, damage: 3, xp: 4, matureSeconds: 28 },
    tadpole: { hp: 15, speed: 1.5, damage: 2, xp: 4, matureSeconds: 32 },
    dragonfly: { hp: 46, speed: 7.27, damage: 15, birdDamageMultiplier: 2.2, xp: 10 },
    frog: { hp: 92, speed: 1.55, damage: 34, jumpInterval: 3.2, jumpRange: 7.5, xp: 13 }
  },
  xp: {
    firstLevel: 18,
    growth: 1.22,
    rewardMultiplier: 1.4,
    openingMagnetRange: 12,
    openingMagnetSeconds: 25,
    magnetRange: 2.7,
    pickupRange: 0.9,
    orbSpeed: 9
  },
  pickups: {
    // Generated meshes for dropped items (Hunyuan3D, 2026-10-26; see docs/dev-cycle/asset-ledger.md and PICKUP_MODELS in
    // src/main.js). Types without a model keep the primitive shape (magnet read as a blob from the game camera, speed has none yet). enabled: false brings back all primitives.
    models: {
      enabled: true,
      size: 0.72
    },
    spawnOffsetRadius: 1.35,
    pickupRange: 0.95,
    baseMagnetRange: 5.2,
    baseMagnetSpeed: 10.5,
    magnetItemRange: 52,
    magnetItemSpeed: 34,
    magnetItemDuration: 7.5,
    hpHealRatio: 0.28,
    mpRestoreRatio: 0.38,
    burstValue: 20,
    shieldMaxCharges: 2,
    speedBoostDuration: 6,
    speedBoostMultiplier: 1.32,
    dropChance: {
      enemy: 0.13,
      spawner: 0.22,
      egg: 0.28
    },
    dropWeights: {
      enemy: [
        { type: 'mp', weight: 15 },
        { type: 'burst', weight: 22 },
        { type: 'speed', weight: 6 },
        { type: 'shield', weight: 2 },
        { type: 'magnet', weight: 2 }
      ],
      spawner: [
        { type: 'mp', weight: 13 },
        { type: 'burst', weight: 26 },
        { type: 'speed', weight: 7 },
        { type: 'shield', weight: 3 },
        { type: 'magnet', weight: 3 }
      ],
      egg: [
        { type: 'mp', weight: 17 },
        { type: 'burst', weight: 16 },
        { type: 'speed', weight: 5 },
        { type: 'shield', weight: 2 },
        { type: 'magnet', weight: 2 }
      ]
    }
  },
  skill: {
    pulseInterval: 5.6,
    pulseRange: 7.5,
    pulseDamage: 18
  },
  assets: {
    player: '/models/Tsuyukusa_003rig.glb',
    seed: '/models/seed_001_ritpo.glb',
    egg: '/kenney/graveyard/pumpkin-tall.glb',
    motherEgg: '/kenney/graveyard/pumpkin-tall-carved.glb',
    zombie: '/kenney/graveyard/character-zombie.glb',
    ghost: '/kenney/graveyard/character-ghost.glb',
    skeleton: '/kenney/graveyard/character-skeleton.glb',
    vampire: '/kenney/graveyard/character-vampire.glb',
    trees: [
      '/kenney/nature/tree_pineTallA.glb',
      '/kenney/nature/tree_pineTallB.glb',
      '/kenney/nature/tree_oak.glb',
      '/kenney/nature/tree_default.glb'
    ],
    rocks: [
      '/kenney/nature/rock_smallA.glb',
      '/kenney/nature/rock_smallB.glb',
      '/kenney/nature/rock_largeA.glb'
    ],
    grass: [
      '/kenney/nature/grass.glb',
      '/kenney/nature/grass_large.glb',
      '/kenney/nature/plant_bush.glb'
    ]
  }
};

export const UpgradePool = [
  {
    id: 'damage',
    title: '攻撃力',
    body: '自動攻撃の威力＋3。卵を狙う弾も強くなる。',
    apply(game) {
      game.player.autoDamage += 3;
      game.player.specialDamage += 0.35;
    }
  },
  {
    id: 'speed',
    title: '攻撃速度',
    body: '自動攻撃の間隔が約12％短くなる。',
    apply(game) {
      game.player.autoInterval = Math.max(0.32, game.player.autoInterval * 0.88);
      game.player.specialInterval = Math.max(0.22, game.player.specialInterval * 0.92);
    }
  },
  {
    id: 'seeds',
    title: '発射弾数',
    body: '周りに浮く種が１つ増え、同時に撃つ弾が増える。',
    apply(game) {
      game.player.seedCount = Math.min(6, game.player.seedCount + 1);
      game.player.syncSeeds();
    }
  },
  {
    id: 'pierce',
    title: '貫通',
    body: '自動で撃つ弾が、さらに１体の敵を貫く。',
    apply(game) {
      game.player.pierce += 1;
    }
  },
  {
    id: 'move',
    title: '移動速度',
    body: '人間形態と鳥形態の移動が速くなる。',
    apply(game) {
      game.player.humanSpeed += 0.55;
      game.player.birdSpeed += 0.8;
    }
  },
  {
    id: 'hp',
    title: '最大HP',
    body: '最大HP＋20。今のHPも20回復する。',
    apply(game) {
      game.player.maxHp += 20;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 20);
    }
  },
  {
    id: 'mp',
    title: '最大MP',
    body: '最大MP＋18。鳥形態で長く飛べる。',
    apply(game) {
      game.player.maxMp += 18;
      game.player.mp = Math.min(game.player.maxMp, game.player.mp + 18);
    }
  },
  {
    id: 'regen',
    title: 'MP回復',
    body: '人間形態でのMP回復量が毎秒＋1.7。',
    apply(game) {
      game.player.humanRegenMp += 1.7;
    }
  },
  {
    id: 'birdCost',
    title: '鳥MP消費軽減',
    body: '鳥形態のMP消費が毎秒1.5少なくなる。',
    apply(game) {
      game.player.birdMpCost = Math.max(6, game.player.birdMpCost - 1.5);
    }
  },
  {
    id: 'dive',
    title: '急降下強化',
    body: '鳥形態の急降下で、卵に与えるダメージが上がる。',
    apply(game) {
      game.player.birdDiveBonus += 18;
      game.player.birdMotherDiveBonus += 8;
    }
  },
  {
    id: 'pulse',
    title: '範囲パルス',
    body: '一定間隔で周囲を自動攻撃。取得済みなら威力と範囲が上がる。',
    apply(game) {
      game.player.pulseLevel += 1;
      game.player.pulseDamage += 8;
      game.player.pulseRange += 0.6;
    }
  },
  {
    id: 'pickupMagnet',
    title: '引き寄せ力',
    body: '経験値やアイテムを、遠くから素早く引き寄せる。',
    apply(game) {
      game.player.pickupMagnetRange += 1.8;
      game.player.pickupMagnetSpeed += 2.6;
    }
  }
];

const UPGRADE_BY_ID = Object.fromEntries(UpgradePool.map(upgrade => [upgrade.id, upgrade]));
export const getUpgrade = id => UPGRADE_BY_ID[id] ?? null;

// Three carry-over rewards per chapter (chapters 1-5; the final chapter ends the campaign).
export const ChapterRewards = {
  1: [
    { id: 'pumpGuard', title: 'ポンプの守り', body: '防護膜2枚を張った状態で出撃する。', apply(game) { game.player.shieldCharges += 2; } },
    { id: 'waterLine', title: '給水の列', body: '最大HP＋40。', apply(game) { game.player.maxHp += 40; game.player.hp += 40; } },
    { id: 'patrolSteps', title: '見回りの足', body: '人間形態の移動速度＋10％。', apply(game) { game.player.humanSpeed *= 1.1; } }
  ],
  2: [
    { id: 'shirayuriRecord', title: 'シラユリの記録', body: 'バーストゲージが半分たまった状態で出撃する。', apply(game) { game.player.addBurst(Config.player.burstMax * 0.5); } },
    { id: 'leftProcedure', title: '残された手順', body: 'バーストの再使用時間－25％。', apply(game) { game.player.burstCooldownScale *= 0.75; } },
    { id: 'sharpSeeds', title: '研いだ種', body: '自動攻撃の威力＋15％。', apply(game) { game.player.autoDamage *= 1.15; } }
  ],
  3: [
    { id: 'deepBreath', title: '水底の息', body: '鳥形態・魚形態のMP消費－20％。', apply(game) { game.player.formMpCostScale *= 0.8; } },
    { id: 'longBreath', title: '深い呼吸', body: '最大MP＋30。', apply(game) { game.player.maxMp += 30; game.player.mp += 30; } },
    { id: 'breakSurface', title: '水面を割る', body: '急降下のダメージ＋30％。', apply(game) { game.player.diveDamageScale *= 1.3; } }
  ],
  4: [
    { id: 'rootOath', title: '根の誓い', body: '鳥形態で卵を食べたときの回復が2倍になる。', apply(game) { game.player.eggHealScale *= 2; } },
    { id: 'nightPulse', title: '夜の鼓動', body: '範囲パルスLv1を持って出撃する。', apply(game) { getUpgrade('pulse').apply(game); } },
    { id: 'buddingSeed', title: '芽吹く種', body: '周りに浮く種が1つ増え、同時に撃つ弾が増える。', apply(game) { getUpgrade('seeds').apply(game); } }
  ],
  5: [
    { id: 'carriedWater', title: '運ばれた水', body: '母卵へのダメージ＋20％。', apply(game) { game.player.motherDamageScale *= 1.2; } },
    { id: 'firmSteps', title: '踏みしめる足', body: '母卵の衝撃波のダメージ－30％。', apply(game) { game.player.shockwaveDamageScale *= 0.7; } },
    { id: 'seeingEye', title: '見分ける目', body: '擬態卵を食べたときに動けない時間が半分になる。', apply(game) { game.player.mimicStunScale *= 0.5; } }
  ]
};

export const getChapterReward = (chapter, id) => ChapterRewards[chapter]?.find(reward => reward.id === id) ?? null;
