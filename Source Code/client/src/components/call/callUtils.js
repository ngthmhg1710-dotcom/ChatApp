// Placeholder analysis artifact for planned CallManager refactor.
// Created only to satisfy tool workflow; parent agent may replace/remove.

export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const ACTIVE_CALL_SESSION_KEY = 'chat-app:active-call';
export const PENDING_CALL_OFFER_KEY = 'lumi:pendingOffer';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-pink-600', 'bg-amber-600', 'bg-cyan-600', 'bg-rose-600',
];

export function getAvatarColor(username) {
  const clean = (username || '').trim();
  return clean ? AVATAR_COLORS[(clean.charCodeAt(0) || 0) % AVATAR_COLORS.length] : 'bg-gray-600';
}

export function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export function getParticipantId(participant) {
  return String(participant?._id || participant?.id || participant?.userId || '');
}

export function getParticipantName(participant) {
  return participant?.username || participant?.name || participant?.email || 'Nguoi dung';
}

export function getParticipantAvatar(participant) {
  return participant?.avatar || participant?.photoURL || participant?.profilePicture || '';
}

export function createParticipantState(status = 'pending') {
  return {
    status,
    micOn: true,
    camOn: false,
    deafened: false,
    screenSharing: false,
    speaking: false,
    lastSpokeAt: 0,
  };
}

export function isTrackLive(track) {
  return !!track && track.readyState === 'live';
}

export function getElapsedSeconds(startedAt) {
  if (!startedAt) return 0;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

export function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}