// A5 敵の出現の緩急（波と小休止）。計算だけをここに置き、テストできるようにする。
// 設定は Config.pacing（src/config.js）。URL の ?pacing=0 で元の出方に戻る。
//
// 波 = stageBeats（元からある大きな波）と ripples（谷を埋める小さな波）の時刻。
// 波の直後 surgeSeconds は卵が早く孵り（押し寄せる）、続く lullSeconds は遅く孵る（小休止）。
// ボスが出たあと（untilSeconds 以降）は何もしない。

// 波の時刻を早い順に並べる。main は元からある波（予告を出す）、それ以外は小さな波。
export function buildWaveTimes(stageBeats, pacing) {
  const until = pacing.untilSeconds;
  const waves = [
    ...stageBeats.map(beat => ({ at: beat.at, main: true })),
    ...pacing.ripples.map(ripple => ({ at: ripple.at, main: false }))
  ];
  return waves.filter(wave => wave.at < until).sort((a, b) => a.at - b.at);
}

// いまの時刻がどの段階か。phase は 'surge'（波の直後）・'lull'（小休止）・'calm'（普通）。
// hatchScale は卵の孵る速さに掛ける倍率。
export function pacingPhase(elapsed, waveTimes, pacing) {
  const calm = { phase: 'calm', hatchScale: 1 };
  if (!pacing || elapsed >= pacing.untilSeconds) return calm;
  let latest = null;
  for (const wave of waveTimes) {
    if (wave.at > elapsed) break;
    latest = wave;
  }
  if (!latest) return calm;
  const since = elapsed - latest.at;
  if (since < pacing.surgeSeconds) return { phase: 'surge', hatchScale: pacing.surgeHatchScale };
  if (since < pacing.surgeSeconds + pacing.lullSeconds) return { phase: 'lull', hatchScale: pacing.lullHatchScale };
  return calm;
}

// 0〜until 秒の孵る速さの倍率の平均。1 に近ければ、緩急をつけても全体の量は変わらない。
export function averageHatchScale(waveTimes, pacing, step = 0.25) {
  let sum = 0;
  let count = 0;
  for (let t = 0; t < pacing.untilSeconds; t += step) {
    sum += pacingPhase(t, waveTimes, pacing).hatchScale;
    count++;
  }
  return count ? sum / count : 1;
}
