// A4 撃破と取得のフィードバック。数値の計算だけをここに置き、テストできるようにする。
// 設定は Config.feedbackFx（src/config.js）。URL の ?feedbackFx=0 で全部消えて元に戻る。

// 経験値オーブが吸い寄せられている時間から、吸い込みの速さの倍率を出す（だんだん速くなる）。
export function xpPullSpeedScale(pullSeconds, pull) {
  if (!pull) return 1;
  return 1 + Math.min(pull.maxBoost, Math.max(0, pullSeconds) * pull.accel);
}

// プレイヤーに近づくほどオーブを小さくする（吸い込まれて見える）。距離 shrinkFrom 以上は 1。
export function xpOrbScale(distance, pull) {
  if (!pull || !(pull.shrinkFrom > 0)) return 1;
  const t = Math.min(1, Math.max(0, distance / pull.shrinkFrom));
  return pull.minScale + (1 - pull.minScale) * t;
}

// 1フレームで進む距離。残りの距離を超えて行き過ぎない。
export function xpPullStep(distance, speed, dt) {
  return Math.min(distance, Math.max(0, speed * dt));
}

// 経験値バーの状態。ratio は 0〜1、near はレベルアップ直前（予告を出す）。
export function xpBarState(xp, nextXp, nearRatio) {
  const ratio = nextXp > 0 ? Math.min(1, Math.max(0, xp / nextXp)) : 0;
  return { ratio, near: ratio >= nearRatio, remain: Math.max(0, Math.ceil(nextXp - xp)) };
}

// 破片の大きさ（寿命の終わりに縮んで消える）。t は 0〜1。
export function shardScale(t, fadeFrom) {
  if (t <= fadeFrom) return 1;
  return Math.max(0, 1 - (t - fadeFrom) / (1 - fadeFrom));
}
