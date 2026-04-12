/**
 * Socket Emitter Wrapper
 * Centralized socket event emission with logging
 */

import { logCallEvent } from './logger.js';

export class SocketEmitter {
  constructor(io) {
    this.io = io;
  }

  /**
   * Emit to specific user room
   */
  emitToUser(userId, event, data) {
    if (!this.io || !userId) return false;
    try {
      this.io.to(`user:${userId}`).emit(event, data);
      logCallEvent.debug('SOCKET_EMIT', `Emitted ${event} to user:${userId}`);
      return true;
    } catch (err) {
      logCallEvent.error('SOCKET_EMIT', `Failed to emit ${event} to ${userId}`, { error: err.message });
      return false;
    }
  }

  /**
   * Emit to conversation room
   */
  emitToConversation(conversationId, event, data) {
    if (!this.io || !conversationId) return false;
    try {
      this.io.to(`conversation:${conversationId}`).emit(event, data);
      logCallEvent.debug('SOCKET_EMIT', `Emitted ${event} to conversation:${conversationId}`);
      return true;
    } catch (err) {
      logCallEvent.error('SOCKET_EMIT', `Failed to emit ${event} to conversation ${conversationId}`, { error: err.message });
      return false;
    }
  }

  /**
   * Emit to specific peer
   */
  emitToPeer(fromUserId, toUserId, event, data) {
    return this.emitToUser(toUserId, event, {
      ...data,
      from: fromUserId,
    });
  }

  /**
   * Broadcast to all participants in a call
   */
  broadcastToCallParticipants(callId, participants, event, data) {
    if (!this.io || !callId || !participants) return 0;
    let count = 0;
    for (const participantId of participants) {
      if (this.emitToUser(participantId, event, data)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Emit call initiation event
   */
  emitCallUser(toUserId, payload) {
    return this.emitToUser(toUserId, 'incoming_call', payload);
  }

  /**
   * Emit call accepted
   */
  emitCallAccepted(toUserId, payload) {
    return this.emitToUser(toUserId, 'call_accepted', payload);
  }

  /**
   * Emit call rejected
   */
  emitCallRejected(toUserId, payload) {
    return this.emitToUser(toUserId, 'call_rejected', payload);
  }

  /**
   * Emit call ended
   */
  emitCallEnded(toUserId, payload) {
    return this.emitToUser(toUserId, 'call_ended', payload);
  }

  /**
   * Emit ICE candidate
   */
  emitIceCandidate(toUserId, payload) {
    return this.emitToUser(toUserId, 'ice_candidate', payload);
  }

  /**
   * Emit new peer joined
   */
  emitNewPeerJoined(toUserId, payload) {
    return this.emitToUser(toUserId, 'new_peer_joined', payload);
  }

  /**
   * Emit peer left
   */
  emitPeerLeft(toUserId, payload) {
    return this.emitToUser(toUserId, 'peer_left_call', payload);
  }

  /**
   * Emit media state change
   */
  emitMediaState(toUserId, payload) {
    return this.emitToUser(toUserId, 'media_state', payload);
  }

  /**
   * Emit speaking state
   */
  emitSpeakingState(toUserId, payload) {
    return this.emitToUser(toUserId, 'speaking_state', payload);
  }

  /**
   * Emit error
   */
  emitError(toUserId, errorCode, message) {
    return this.emitToUser(toUserId, 'error', {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit to socket instance (for ack)
   */
  emitToSocket(socket, event, data, callback) {
    if (!socket) return false;
    try {
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
      return true;
    } catch (err) {
      logCallEvent.error('SOCKET_EMIT', `Failed to emit ${event} to socket`, { error: err.message });
      return false;
    }
  }
}

/**
 * Create emitter instance
 */
export const createSocketEmitter = (io) => {
  return new SocketEmitter(io);
};

/**
 * Singleton instance
 */
let globalEmitter = null;

export const initSocketEmitter = (io) => {
  globalEmitter = createSocketEmitter(io);
  return globalEmitter;
};

export const getSocketEmitter = () => {
  if (!globalEmitter) {
    throw new Error('SocketEmitter not initialized. Call initSocketEmitter(io) first.');
  }
  return globalEmitter;
};
