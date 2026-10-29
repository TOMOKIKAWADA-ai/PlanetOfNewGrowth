// 足跡（E8）: プレイヤーの通った道を記録し、足跡の敵が数秒遅れでなぞる。
// 鳥形態のあいだは道が途切れる（gap）。途切れた所に来た足跡は道を見失う。

export class PlayerTrail {
  constructor(maxSeconds, sampleInterval) {
    this.maxSeconds = maxSeconds;
    this.sampleInterval = sampleInterval;
    this.samples = [];
    this.lastRecordAt = -Infinity;
  }

  // grounded=false のサンプルは道の切れ目として残す。
  record(time, x, z, grounded) {
    if (time - this.lastRecordAt < this.sampleInterval) return false;
    this.lastRecordAt = time;
    this.samples.push({ time, x, z, grounded });
    const oldest = time - this.maxSeconds;
    let drop = 0;
    while (drop < this.samples.length - 1 && this.samples[drop].time < oldest) drop++;
    if (drop > 0) this.samples.splice(0, drop);
    return true;
  }

  get oldestTime() {
    return this.samples.length ? this.samples[0].time : Infinity;
  }

  // time の地点。途切れている区間か、記録の外なら null。
  sampleAt(time, out = {}) {
    const samples = this.samples;
    if (!samples.length || time < samples[0].time) return null;
    const last = samples[samples.length - 1];
    if (time >= last.time) {
      if (!last.grounded) return null;
      out.x = last.x;
      out.z = last.z;
      return out;
    }
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].time <= time) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    if (!a.grounded || !b.grounded) return null;
    const t = (time - a.time) / Math.max(1e-6, b.time - a.time);
    out.x = a.x + (b.x - a.x) * t;
    out.z = a.z + (b.z - a.z) * t;
    return out;
  }

  // latestTime より古い地面のサンプルのうち、(x, z) から radius 以内で一番近いものの時刻。
  nearestTime(x, z, latestTime, radius) {
    let best = null;
    let bestSq = radius * radius;
    for (const sample of this.samples) {
      if (sample.time > latestTime) break;
      if (!sample.grounded) continue;
      const dx = sample.x - x;
      const dz = sample.z - z;
      const sq = dx * dx + dz * dz;
      if (sq <= bestSq) {
        bestSq = sq;
        best = sample.time;
      }
    }
    return best;
  }
}

// 足跡1体の追跡の状態を1歩進める。cursor は道の上のどの時刻をなぞっているか。
// 戻り値の target は向かう地点（見失っているときは null）。
// 孵ったばかりの足跡（state.fresh）はどこからでも一番近い道へ向かう。道を見失ったあとは joinRadius 以内の道しか拾わない。
export function advanceFootprint(state, trail, now, dt, cfg, position) {
  const lagTarget = now - cfg.delaySeconds;
  if (state.cursor === null) {
    state.rejoinTimer -= dt;
    if (state.rejoinTimer > 0) return null;
    state.rejoinTimer = cfg.rejoinInterval;
    state.cursor = trail.nearestTime(position.x, position.z, lagTarget, state.fresh ? Infinity : cfg.joinRadius);
    if (state.cursor === null) return null;
    state.fresh = false;
  }
  state.cursor = Math.max(state.cursor, trail.oldestTime);
  // 道の上の地点にまだ着いていなければ、その地点で待つ（なぞり始めない）。
  const current = trail.sampleAt(state.cursor, state.target ?? (state.target = {}));
  if (current) {
    const dx = current.x - position.x;
    const dz = current.z - position.z;
    if (dx * dx + dz * dz > cfg.reachDistance * cfg.reachDistance) return current;
  }
  // 遅れが決まった秒数より大きいうちは少し早くなぞり、追いついたら同じ速さで歩く。
  const rate = state.cursor < lagTarget - 0.05 ? cfg.catchUpRate : 1;
  state.cursor = Math.min(lagTarget, state.cursor + dt * rate);
  const target = trail.sampleAt(state.cursor, state.target);
  if (!target) {
    state.cursor = null;
    state.rejoinTimer = cfg.rejoinInterval;
    state.lostCount = (state.lostCount ?? 0) + 1;
    return null;
  }
  return target;
}
