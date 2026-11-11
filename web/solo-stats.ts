const prefix = 'fruit-box:solo-stats:';
type AttemptStats = { activeMs: number; score?: number };
const currentTab = new Map<string, AttemptStats>();

export function recordSoloStats(attemptId: string, activeMs: number, score?: number) {
  const key = prefix + attemptId;
  const record = { activeMs: Math.floor(activeMs), score };
  currentTab.set(key, record);
  try { localStorage.setItem(key, JSON.stringify(record)); }
  catch { /* Keep this tab's session stats if browser storage is unavailable. */ }
}

export function soloStats() {
  const attempts = new Map(currentTab);
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(prefix) || attempts.has(key)) continue;
      const value = localStorage.getItem(key);
      if (!value) continue;
      try {
        const record = JSON.parse(value) as AttemptStats;
        if (record && Number.isFinite(record.activeMs) && record.activeMs >= 0 && record.activeMs <= 120000) {
          attempts.set(key, record);
        }
      } catch { /* Skip an unreadable record. */ }
    }
  } catch { /* Storage can be blocked in embedded browsers. */ }
  let activeMs = 0;
  let best = 0;
  for (const attempt of attempts.values()) {
    activeMs += attempt.activeMs;
    const score = attempt.score;
    if (typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 170) {
      best = Math.max(best, score);
    }
  }
  const seconds = Math.floor(activeMs / 1000);
  return { best, time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` };
}
