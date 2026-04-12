/**
 * Socket.IO Monitor
 * Track and monitor active calls, participants, and statistics
 */

export class CallMonitor {
  constructor() {
    this.activeCalls = new Map();
    this.startTime = Date.now();
  }

  /**
   * Register a new call
   */
  registerCall(callId, callData) {
    this.activeCalls.set(callId, {
      ...callData,
      registeredAt: Date.now(),
      stats: {
        iceCandidatesExchanged: 0,
        mediaStateUpdates: 0,
        errors: 0,
      },
    });
  }

  /**
   * Unregister a call
   */
  unregisterCall(callId) {
    return this.activeCalls.delete(callId);
  }

  /**
   * Get call info
   */
  getCall(callId) {
    return this.activeCalls.get(callId);
  }

  /**
   * Update call stats
   */
  recordIceCandidate(callId) {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.stats.iceCandidatesExchanged++;
    }
  }

  recordMediaStateUpdate(callId) {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.stats.mediaStateUpdates++;
    }
  }

  recordError(callId) {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.stats.errors++;
    }
  }

  /**
   * Get overall statistics
   */
  getStats() {
    const calls = Array.from(this.activeCalls.values());
    
    const stats = {
      uptime: Date.now() - this.startTime,
      totalActiveCalls: calls.length,
      totalParticipants: 0,
      groupCalls: 0,
      oneToOneCalls: 0,
      totalIceCandidates: 0,
      totalMediaStateUpdates: 0,
      totalErrors: 0,
      avgCallDuration: 0,
      maxConcurrentParticipants: 0,
    };

    const callDurations = [];

    calls.forEach(call => {
      stats.totalParticipants += call.participants?.size || 0;
      if (call.isGroup) {
        stats.groupCalls++;
      } else {
        stats.oneToOneCalls++;
      }

      const callStats = call.stats || {};
      stats.totalIceCandidates += callStats.iceCandidatesExchanged || 0;
      stats.totalMediaStateUpdates += callStats.mediaStateUpdates || 0;
      stats.totalErrors += callStats.errors || 0;

      const duration = Date.now() - (call.registeredAt || Date.now());
      callDurations.push(duration);

      stats.maxConcurrentParticipants = Math.max(
        stats.maxConcurrentParticipants,
        call.participants?.size || 0
      );
    });

    if (callDurations.length > 0) {
      stats.avgCallDuration = callDurations.reduce((a, b) => a + b, 0) / callDurations.length;
    }

    return stats;
  }

  /**
   * Get call by user
   */
  getCallsByUser(userId) {
    const calls = [];
    for (const [callId, call] of this.activeCalls.entries()) {
      if (call.participants?.has(userId) || call.pending?.has(userId)) {
        calls.push({ callId, ...call });
      }
    }
    return calls;
  }

  /**
   * Get health check
   */
  getHealthCheck() {
    const stats = this.getStats();
    return {
      status: stats.totalActiveCalls > 0 ? 'active' : 'idle',
      calls: {
        active: stats.totalActiveCalls,
        participants: stats.totalParticipants,
        groupCalls: stats.groupCalls,
        oneToOne: stats.oneToOneCalls,
      },
      uptime: stats.uptime,
      stats: {
        iceCandidates: stats.totalIceCandidates,
        mediaUpdates: stats.totalMediaStateUpdates,
        errors: stats.totalErrors,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear old calls (safety cleanup)
   */
  cleanup(maxCallAge = 3600000) { // 1 hour
    const now = Date.now();
    const keysToDelete = [];

    for (const [callId, call] of this.activeCalls.entries()) {
      const age = now - (call.registeredAt || now);
      if (age > maxCallAge && (!call.startedAt || (now - new Date(call.startedAt).getTime()) > maxCallAge)) {
        keysToDelete.push(callId);
      }
    }

    keysToDelete.forEach(callId => this.activeCalls.delete(callId));
    return keysToDelete.length;
  }

  /**
   * Export stats for monitoring/dashboard
   */
  export() {
    const calls = Array.from(this.activeCalls.entries()).map(([callId, call]) => ({
      callId,
      callerId: call.callerId,
      conversationId: call.conversationId,
      callType: call.callType,
      isGroup: call.isGroup,
      participants: Array.from(call.participants || []),
      pending: Array.from(call.pending || []),
      started: call.startedAt,
      registered: new Date(call.registeredAt).toISOString(),
      stats: call.stats,
    }));

    return {
      monitor: this.getHealthCheck(),
      calls,
    };
  }
}

/**
 * Singleton instance
 */
let callMonitor = null;

export const initCallMonitor = () => {
  callMonitor = new CallMonitor();
  
  // Cleanup every 30 minutes
  setInterval(() => {
    const cleaned = callMonitor.cleanup();
    if (cleaned > 0) {
      console.log(`[CallMonitor] Cleaned up ${cleaned} old calls`);
    }
  }, 30 * 60 * 1000);

  return callMonitor;
};

export const getCallMonitor = () => {
  if (!callMonitor) {
    callMonitor = initCallMonitor();
  }
  return callMonitor;
};

/**
 * Middleware to attach monitor to request
 */
export const callMonitorMiddleware = (req, res, next) => {
  req.callMonitor = getCallMonitor();
  next();
};
