// A6 強化の相乗効果。計算だけをここに置き、テストできるようにする。
// 設定は Config.synergy（src/config.js）。URL の ?synergy=0 で相乗効果なしに戻る。
//
// 相乗効果は「2 つの強化を両方持っている」と働く。持っているかどうかは、取った回数ではなく
// プレイヤーの今の数値で見る（章をまたいで引き継いだ強化や、章の強化「夜の鼓動」「芽吹く種」も数える）。

// 強化 id -> その強化を 1 回以上持っているか。
const OWNS = {
  seeds: player => player.seedCount >= 2,
  pierce: player => player.pierce >= 1,
  dive: player => player.birdDiveBonus > 0,
  pulse: player => player.pulseLevel >= 1,
  mp: player => player.maxMp > player.baseMaxMp,
  regen: player => player.humanRegenMp > player.baseHumanRegenMp
};

export function ownsUpgrade(player, upgradeId) {
  return Boolean(OWNS[upgradeId]?.(player));
}

// いま働いている相乗効果の id の一覧。
export function activeSynergies(player, synergy) {
  if (!synergy?.enabled) return [];
  return synergy.list
    .filter(entry => entry.parts.every(part => ownsUpgrade(player, part)))
    .map(entry => entry.id);
}

// 強化の選択肢に添えるヒント。state は
//   'active'    もう働いている
//   'completes' これを取るとそろう（相手はもう持っている）
//   'partner'   相手（partner）と合わせると働く。どちらもまだ、またはこれだけ持っている
export function synergyHints(upgradeId, player, synergy) {
  if (!synergy?.enabled) return [];
  const hints = [];
  for (const entry of synergy.list) {
    if (!entry.parts.includes(upgradeId)) continue;
    const partner = entry.parts.find(part => part !== upgradeId);
    const ownsThis = ownsUpgrade(player, upgradeId);
    const ownsPartner = ownsUpgrade(player, partner);
    const state = ownsThis && ownsPartner ? 'active' : ownsPartner ? 'completes' : 'partner';
    hints.push({ id: entry.id, title: entry.title, body: entry.body, partner, state });
  }
  // そろうものを先に、働いているものを最後に並べる。
  const order = { completes: 0, partner: 1, active: 2 };
  return hints.sort((a, b) => order[a.state] - order[b.state]);
}

// 貫く雨: 敵を 1 体貫くたびに弾の威力に掛ける倍率。
export function pierceDamageScale(hitsSoFar, gain) {
  return (1 + gain) ** Math.max(0, hitsSoFar);
}

// 満ちる水: MP が threshold 以上のあいだ、自動攻撃の威力に掛ける倍率。
export function fullWaterScale(mp, maxMp, cfg) {
  return maxMp > 0 && mp / maxMp >= cfg.mpRatio ? cfg.damageScale : 1;
}
