/**
 * Call Configuration
 * Centralize timeout, constraint, and server settings
 */

export const CALL_CONFIG = {
  // Timeouts
  RING_TIMEOUT: 35000,              // Auto-cancel call if not answered (ms)
  GRACE_PERIOD: 15000,              // Grace period before removing disconnected user (ms)
  ICE_TIMEOUT: 10000,               // Max time to wait for ICE connection (ms)
  RECONNECT_TIMEOUT: 30000,         // Reconnection attempt timeout (ms)

  // Media constraints
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },

  VIDEO_CONSTRAINTS: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user', // 'user' or 'environment'
  },

  SCREEN_CONSTRAINTS: {
    video: {
      cursor: 'always',
    },
    audio: false,
  },

  // ICE servers
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add production TURN server here
    // {
    //   urls: process.env.VITE_TURN_URL,
    //   username: process.env.VITE_TURN_USERNAME,
    //   credential: process.env.VITE_TURN_PASSWORD,
    // }
  ],

  // Codec preferences
  CODEC_PREF: {
    audio: ['opus'],
    video: ['vp9', 'vp8', 'h264'],
  },

  // VAD (Voice Activity Detection) settings
  VAD: {
    THRESHOLD: 0.035, // RMS threshold for speaking
    SILENCE_DURATION: 550, // ms of silence before muted
  },

  // Group call settings

  // Call status
  CALL_STATES: {
    IDLE: 'idle',
    RINGING: 'ringing',
    CONNECTING: 'connecting',
    ACTIVE: 'active',
    ENDED: 'ended',
  },

  // NOTE: group call settings removed — app now uses 1-1 calls only
};

// Environment-based overrides
if (import.meta.env.DEV) {
  CALL_CONFIG.RING_TIMEOUT = 15000; // Short timeout in dev
}

export default CALL_CONFIG;
