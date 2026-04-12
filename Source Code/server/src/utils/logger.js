/**
 * Call Event Logger
 * Centralized logging for call events and debugging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LOG_LEVEL = process.env.LOG_LEVEL === 'debug' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, category, message, data) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}] [${category}]`;
  
  if (data) {
    return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`;
  }
  return `${prefix} ${message}`;
};

export const logCallEvent = {
  debug: (category, message, data) => {
    if (LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`${colors.cyan}${formatMessage('DEBUG', category, message, data)}${colors.reset}`);
    }
  },

  info: (category, message, data) => {
    if (LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`${colors.blue}${formatMessage('INFO', category, message, data)}${colors.reset}`);
    }
  },

  warn: (category, message, data) => {
    if (LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`${colors.yellow}${formatMessage('WARN', category, message, data)}${colors.reset}`);
    }
  },

  error: (category, message, data) => {
    if (LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`${colors.red}${formatMessage('ERROR', category, message, data)}${colors.reset}`);
    }
  },
};

// ─── Call-specific loggers ──────────────────────────────────────────────────

export const logCallInit = (data) => {
  logCallEvent.info('CALL_INIT', 'Call initiated', {
    callId: data.callId,
    from: data.from,
    to: data.to,
    callType: data.callType,
    isGroup: data.isGroup,
    timestamp: getTimestamp(),
  });
};

export const logCallAccepted = (data) => {
  logCallEvent.info('CALL_ACCEPT', 'Call accepted', {
    callId: data.callId,
    from: data.from,
    to: data.to,
    timestamp: getTimestamp(),
  });
};

export const logCallRejected = (data) => {
  logCallEvent.info('CALL_REJECT', 'Call rejected', {
    callId: data.callId,
    from: data.from,
    to: data.to,
    reason: data.reason,
    timestamp: getTimestamp(),
  });
};

export const logCallEnded = (data) => {
  logCallEvent.info('CALL_END', 'Call ended', {
    callId: data.callId,
    conversationId: data.conversationId,
    participants: data.participants,
    duration: data.duration,
    reason: data.reason,
    timestamp: getTimestamp(),
  });
};

export const logPeerJoined = (data) => {
  logCallEvent.info('PEER_JOIN', 'Peer joined call', {
    callId: data.callId,
    peerId: data.peerId,
    totalPeers: data.totalPeers,
    timestamp: getTimestamp(),
  });
};

export const logPeerLeft = (data) => {
  logCallEvent.info('PEER_LEFT', 'Peer left call', {
    callId: data.callId,
    peerId: data.peerId,
    remainingPeers: data.remainingPeers,
    reason: data.reason,
    timestamp: getTimestamp(),
  });
};

export const logICECandidate = (data) => {
  logCallEvent.debug('ICE_CANDIDATE', 'ICE candidate exchange', {
    callId: data.callId,
    from: data.from,
    to: data.to,
    candidateType: data.candidateType,
    timestamp: getTimestamp(),
  });
};

export const logMediaState = (data) => {
  logCallEvent.debug('MEDIA_STATE', 'Media state changed', {
    callId: data.callId,
    userId: data.userId,
    micOn: data.micOn,
    camOn: data.camOn,
    screenSharing: data.screenSharing,
    timestamp: getTimestamp(),
  });
};

export const logSpeakingState = (data) => {
  logCallEvent.debug('SPEAKING_STATE', 'Speaking state changed', {
    callId: data.callId,
    userId: data.userId,
    speaking: data.speaking,
    timestamp: getTimestamp(),
  });
};

export const logError = (data) => {
  logCallEvent.error('CALL_ERROR', 'Call error occurred', {
    callId: data.callId,
    userId: data.userId,
    errorType: data.errorType,
    message: data.message,
    stack: data.stack,
    timestamp: getTimestamp(),
  });
};

export const logConnectionTimeout = (data) => {
  logCallEvent.warn('CONNECTION_TIMEOUT', 'Connection timeout', {
    callId: data.callId,
    userId: data.userId,
    timeout: data.timeout,
    timestamp: getTimestamp(),
  });
};

export const logStats = (data) => {
  logCallEvent.info('STATS', 'Call statistics', {
    activeCalls: data.activeCalls,
    totalParticipants: data.totalParticipants,
    groupCalls: data.groupCalls,
    oneToCalls: data.oneToCalls,
    avgParticipantsPerCall: (data.totalParticipants / data.activeCalls).toFixed(2),
    timestamp: getTimestamp(),
  });
};
