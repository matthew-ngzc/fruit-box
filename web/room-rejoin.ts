const prefix = 'fruit-box:rejoin:';
const maxAgeMs = 24 * 60 * 60 * 1000;

type Rejoin = { token: string; commandId: number; savedAt: number };

export function loadRejoin(roomId: string): Rejoin | undefined {
  try {
    const key = prefix + roomId;
    const value = localStorage.getItem(key);
    if (!value) return;
    const saved = JSON.parse(value) as Rejoin;
    if (typeof saved?.token === 'string' && saved.token.split(':')[0] === roomId
      && Number.isSafeInteger(saved.commandId) && saved.commandId >= 0
      && Number.isFinite(saved.savedAt) && Date.now() - saved.savedAt < maxAgeMs) return saved;
    localStorage.removeItem(key);
  } catch { /* The current tab can still use session storage. */ }
}

export function saveRejoin(roomId: string, token: string, commandId: number) {
  try {
    const key = prefix + roomId;
    if (localStorage.getItem(key) === null) {
      for (const entry of Object.keys(localStorage)) {
        if (entry.startsWith(prefix)) loadRejoin(entry.slice(prefix.length));
      }
    }
    localStorage.setItem(key, JSON.stringify({ token, commandId, savedAt: Date.now() }));
  } catch { /* The current tab can still use session storage. */ }
}

export function forgetRejoin(roomId: string, token: string) {
  try {
    if (loadRejoin(roomId)?.token === token) localStorage.removeItem(prefix + roomId);
  } catch { /* Storage may be unavailable. */ }
}
