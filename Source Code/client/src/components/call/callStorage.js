import { ACTIVE_CALL_SESSION_KEY } from './callUtils';

export function readPersistedCallSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_CALL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writePersistedCallSession(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ACTIVE_CALL_SESSION_KEY, JSON.stringify(payload));
  } catch {}
}

export function clearPersistedCallSession() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ACTIVE_CALL_SESSION_KEY);
  } catch {}
}