function safeGetLocalStorage(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeParseJson(str, fallback) {
  try {
    if (str === null || str === undefined) return fallback;
    const parsed = JSON.parse(str);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getOrCreateDeviceSessionId() {
  let id = safeGetLocalStorage('deviceSessionId');
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    safeSetLocalStorage('deviceSessionId', id);
  }
  return id;
}

export function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const platform = navigator.platform || '';
  const ua = navigator.userAgent || '';
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isLinux = /Linux/i.test(ua);
  const os = isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : 'OS';
  const browser = /Chrome/i.test(ua) && !/Edg/i.test(ua)
    ? 'Chrome'
    : /Edg/i.test(ua)
      ? 'Edge'
      : /Firefox/i.test(ua)
        ? 'Firefox'
        : /Safari/i.test(ua) && !/Chrome/i.test(ua)
          ? 'Safari'
          : 'Browser';
  const shortPlatform = platform ? platform.replace(/\s+/g, ' ').trim() : os;
  return `${browser} • ${shortPlatform}`;
}

export function upsertDeviceSession({ loggedOutAt = null } = {}) {
  const deviceSessionId = getOrCreateDeviceSessionId();
  const now = new Date().toISOString();
  const label = getDeviceLabel();

  const raw = safeGetLocalStorage('deviceSessions');
  const sessions = safeParseJson(raw, []);
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const idx = safeSessions.findIndex((s) => s?.id === deviceSessionId);

  const next = {
    id: deviceSessionId,
    label,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    createdAt: idx >= 0 ? safeSessions[idx].createdAt : now,
    lastActiveAt: now,
    loggedOutAt,
  };

  if (idx >= 0) safeSessions[idx] = { ...safeSessions[idx], ...next };
  else safeSessions.push(next);

  safeSetLocalStorage('deviceSessions', JSON.stringify(safeSessions));
}