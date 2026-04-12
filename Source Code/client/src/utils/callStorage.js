/**
 * Call Session Storage Manager
 * Persist game-critical call state (callId, conversationId, cam/mic) across reload
 * Uses sessionStorage (browser session scoped, cleared on tab close)
 */

const CALL_SESSION_KEY = 'lumi:callSession';

export const saveCallSession = (data) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CALL_SESSION_KEY, JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }));
  } catch (err) {
    console.warn('Failed to save call session:', err);
  }
};

export const loadCallSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CALL_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Invalidate after 1 hour (safety)
    if (Date.now() - data.savedAt > 3600000) {
      clearCallSession();
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Failed to load call session:', err);
    return null;
  }
};

export const clearCallSession = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CALL_SESSION_KEY);
  } catch (err) {
    console.warn('Failed to clear call session:', err);
  }
};

/**
 * Get ongoing call session if exists
 * @returns {Object|null} { callId, conversationId, isGroup, callType, micOn, camOn, screenShare }
 */
export const getActiveCallSession = () => {
  const session = loadCallSession();
  if (!session || !session.callId || !session.conversationId) return null;
  return {
    callId: session.callId,
    conversationId: session.conversationId,
    isGroup: session.isGroup ?? false,
    callType: session.callType ?? 'audio',
    micOn: session.micOn ?? true,
    camOn: session.camOn ?? false,
    screenShare: session.screenShare ?? false,
  };
};
