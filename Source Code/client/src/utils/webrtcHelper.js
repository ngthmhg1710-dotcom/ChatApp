/**
 * WebRTC Helper Functions
 * Centralized WebRTC operations with error handling
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Production TURN servers can be added here
    // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
  ],
};

/**
 * Create RTCPeerConnection with standard config
 */
export const createPeerConnection = () => {
  try {
    return new RTCPeerConnection(ICE_SERVERS);
  } catch (err) {
    console.error('Failed to create peer connection:', err);
    throw err;
  }
};

/**
 * Create offer with audio+video
 */
export const createOffer = async (pc) => {
  if (!pc) throw new Error('PeerConnection required');
  try {
    return await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
  } catch (err) {
    console.error('Failed to create offer:', err);
    throw err;
  }
};

/**
 * Create answer
 */
export const createAnswer = async (pc) => {
  if (!pc) throw new Error('PeerConnection required');
  try {
    return await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
  } catch (err) {
    console.error('Failed to create answer:', err);
    throw err;
  }
};

/**
 * Set local description with error handling
 */
export const setLocalDescription = async (pc, description) => {
  if (!pc || !description) throw new Error('PeerConnection and description required');
  try {
    await pc.setLocalDescription(new RTCSessionDescription(description));
  } catch (err) {
    console.error('Failed to set local description:', err);
    throw err;
  }
};

/**
 * Set remote description with error handling
 */
export const setRemoteDescription = async (pc, description) => {
  if (!pc || !description) throw new Error('PeerConnection and description required');
  try {
    const type = description.type;
    if (type === 'answer') {
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('webrtcHelper.setRemoteDescription: expected have-local-offer for answer, current=', pc.signalingState);
        throw new Error('pc not have-local-offer');
      }
    } else if (type === 'offer') {
      if (pc.signalingState !== 'stable') {
        console.warn('webrtcHelper.setRemoteDescription: expected stable for offer, current=', pc.signalingState);
        throw new Error('pc not stable');
      }
    }
    await pc.setRemoteDescription(new RTCSessionDescription(description));
  } catch (err) {
    console.error('Failed to set remote description:', err);
    throw err;
  }
};

/**
 * Add ICE candidate with safety check
 * Returns false if candidate couldn't be added, true if added
 */
export const addICECandidate = async (pc, candidate) => {
  if (!pc || !candidate) return false;
  try {
    if (pc.remoteDescription?.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      return true;
    } else {
      // Remote description not set yet, should buffer
      return false;
    }
  } catch (err) {
    if (err.name === 'InvalidStateError') {
      // Normal if remote description not set
      return false;
    }
    console.error('Failed to add ICE candidate:', err);
    return false;
  }
};

/**
 * Get user media with constraint
 */
export const getUserMedia = async (constraints) => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.error('getUserMedia failed:', err);
    throw {
      type: err.name,
      message: err.message,
      details: mapMediaError(err),
    };
  }
};

/**
 * Get screen capture
 */
export const getScreenCapture = async () => {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false,
    });
  } catch (err) {
    console.error('getDisplayMedia failed:', err);
    throw {
      type: err.name,
      message: err.message,
      details: mapScreenError(err),
    };
  }
};

/**
 * Map media error to user-friendly message
 */
const mapMediaError = (err) => {
  switch (err.name) {
    case 'NotAllowedError':
      return 'Bạn từ chối cấp quyền truy cập camera/microphone';
    case 'NotFoundError':
      return 'Không tìm thấy camera hoặc microphone';
    case 'NotReadableError':
      return 'Camera/microphone đang được sử dụng bởi ứng dụng khác';
    case 'SecurityError':
      return 'Không thể truy cập do hạn chế bảo mật (HTTPS required)';
    case 'OverconstrainedError':
      return 'Thiết bị không đáp ứng yêu cầu cấu hình';
    default:
      return err.message;
  }
};

/**
 * Map screen share error
 */
const mapScreenError = (err) => {
  switch (err.name) {
    case 'NotAllowedError':
      return 'Bạn từ chối chia sẻ màn hình';
    case 'NotFoundError':
      return 'Không tìm thấy màn hình để chia sẻ';
    default:
      return err.message;
  }
};

/**
 * Check if track is live
 */
export const isTrackLive = (track) => {
  return !!track && track.readyState === 'live';
};

/**
 * Stop all tracks in stream
 */
export const stopMediaStream = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach(track => {
    try {
      track.stop();
    } catch (err) {
      console.warn('Failed to stop track:', err);
    }
  });
};

/**
 * Close PeerConnection
 */
export const closePeerConnection = (pc) => {
  if (!pc) return;
  try {
    const senders = pc.getSenders?.() || [];
    senders.forEach(sender => {
      try {
        sender.replaceTrack(null);
      } catch (err) {
        console.warn('Failed to clear sender:', err);
      }
    });
    pc.close();
  } catch (err) {
    console.warn('Failed to close PC:', err);
  }
};

/**
 * Replace tracks in existing PC
 */
export const replaceStreamTracks = async (pc, newStream) => {
  if (!pc) return false;
  try {
    const senders = pc.getSenders() || [];
    const newTracks = newStream ? newStream.getTracks() : [];
    
    for (const sender of senders) {
      const newTrack = newTracks.find(t => t.kind === sender.track?.kind);
      if (sender.track && !newTrack) {
        // Remove this track type
        await sender.replaceTrack(null);
      } else if (newTrack && newTrack !== sender.track) {
        // Replace with new track
        await sender.replaceTrack(newTrack);
      }
    }
    
    // Add new tracks that weren't already in senders
    const existingKinds = senders.map(s => s.track?.kind).filter(Boolean);
    for (const track of newTracks) {
      if (!existingKinds.includes(track.kind)) {
        pc.addTrack(track, newStream);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Failed to replace stream:', err);
    return false;
  }
};

/**
 * Get connection stats
 */
export const getPeerConnectionStats = async (pc) => {
  if (!pc) return null;
  try {
    const stats = await pc.getStats();
    const result = {
      audio: { inbound: 0, outbound: 0 },
      video: { inbound: 0, outbound: 0 },
      connection: { state: pc.connectionState, iceState: pc.iceConnectionState },
    };
    
    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        result[report.mediaType].inbound = {
          bytesReceived: report.bytesReceived,
          packetsLost: report.packetsLost,
          jitter: report.jitter,
        };
      } else if (report.type === 'outbound-rtp') {
        result[report.mediaType].outbound = {
          bytesSent: report.bytesSent,
          framesSent: report.framesSent,
        };
      }
    });
    
    return result;
  } catch (err) {
    console.warn('Failed to get connection stats:', err);
    return null;
  }
};
