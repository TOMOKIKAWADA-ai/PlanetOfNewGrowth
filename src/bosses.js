// 章ごとのボスの種類。ステージ設定（src/campaign.js の STAGES）の `boss` でここの種類を選ぶ。
// ボスの体は今のところすべて母卵の卵（Egg の isMother）を使い、動きだけを種類ごとに差し替える。
// 新しいボスは docs/enemy-boss-design.md の表に沿って、ここに1種ずつ足す。

export const BOSS_TYPES = Object.freeze({
  // 第1章のボス。一定の間隔で地面を走る衝撃波を出す。鳥形態なら当たらない。
  motherEgg: Object.freeze({
    id: 'motherEgg',
    update(egg, dt) {
      egg.updateMotherShockwave(dt);
    }
  })
});

export const DEFAULT_BOSS = 'motherEgg';

// まだ作っていないボス（追い手・水門の母など）を指定した章は、母卵の動きで戦う。
export function getBossType(id) {
  return BOSS_TYPES[id] ?? BOSS_TYPES[DEFAULT_BOSS];
}

export function isBossImplemented(id) {
  return Object.hasOwn(BOSS_TYPES, id);
}
