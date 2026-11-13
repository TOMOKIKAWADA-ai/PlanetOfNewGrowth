// A7: the numbers shown on the result screen (kills, eggs broken, time in battle, best kill streak, level).
// Pure functions so the counting can be tested without the game.

export function createRunStats() {
  return { kills: 0, eggs: 0, streak: 0, bestStreak: 0, lastKillAt: -Infinity, endedAt: null };
}

// A kill continues the streak when it lands within `window` seconds of the previous one.
export function recordKill(stats, at, window) {
  stats.kills += 1;
  stats.streak = at - stats.lastKillAt <= window ? stats.streak + 1 : 1;
  stats.lastKillAt = at;
  if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
  return stats.streak;
}

export function recordEggBreak(stats) {
  stats.eggs += 1;
}

export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Rows for the result screen: [{ label, value }].
export function resultRows(stats, { elapsed, level, victory }) {
  return [
    { label: victory ? '戦った時間' : '持ちこたえた時間', value: formatClock(elapsed) },
    { label: '倒した敵', value: String(stats.kills) },
    { label: '壊した卵', value: String(stats.eggs) },
    { label: '最大連続撃破', value: String(stats.bestStreak) },
    { label: 'レベル', value: `Lv ${level}` }
  ];
}
