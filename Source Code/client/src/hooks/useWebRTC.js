// client/src/hooks/useWebRTC.js
// Hook dùng chung cho CallManager, CallRoom, DirectCallRoom
// Gom toàn bộ logic WebRTC vào một chỗ: createPC, getLocalStream, syncPC, VAD
// Khi cần fix hay thêm tính năng → chỉ sửa file này

import { useRef, useCallback, useState } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const isLive = (track) => !!track && track.readyState === 'live';

// ─── useWebRTC ────────────────────────────────────────────────────────────────
/**
 * @param {object} opts
 * @param {object|null} opts.socket          - socket.io instance
 * @param {string}      opts.myUserId        - ID của current user
 * @param {Function}    [opts.onRemoteStream] - callback(peerId, stream) khi nhận stream từ peer
 * @param {Function}    [opts.onPeerConnected]- callback(peerId) khi PC connected
 * @param {Function}    [opts.onPeerDisconnected] - callback(peerId, state) khi PC disconnected/failed
 * @param {Function}    [opts.onSpeakingChange] - callback(userId, isSpeaking, lastSpokeAt)
 * @param {string}      [opts.callId]        - callId hiện tại (dùng cho emit speaking_state)
 */
export function useWebRTC({
  socket,
  myUserId,
  onRemoteStream,
  onPeerConnected,
  onPeerDisconnected,
  onSpeakingChange,
  callId,
} = {}) {

  // ── refs ────────────────────────────────────────────────────────────────
  const pcMapRef        = useRef(new Map());   // Map<peerId, RTCPeerConnection>
  const localStreamRef  = useRef(null);        // MediaStream local (audio + video)
  const screenStreamRef = useRef(null);        // MediaStream màn hình
  const audioCtxRef     = useRef(null);
  const audioAnalysisRef= useRef(new Map());   // Map<userId, stopFn>
  const localVideoRef   = useRef(null);        // ref gắn vào <video> preview local
  const callIdRef       = useRef(callId);

  // Sync callId ref
  const setCallId = useCallback((id) => { callIdRef.current = id; }, []);

  // ── camera loading / error state (expose ra để UI dùng) ─────────────────
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError,   setCameraError]   = useState(null);

  // ── VAD ──────────────────────────────────────────────────────────────────
  const stopVAD = useCallback((userId) => {
    const pid = String(userId || '');
    const stop = audioAnalysisRef.current.get(pid);
    if (stop) { stop(); audioAnalysisRef.current.delete(pid); }
    onSpeakingChange?.(pid, false, Date.now());
  }, [onSpeakingChange]);

  const stopAllVAD = useCallback(() => {
    audioAnalysisRef.current.forEach((fn) => fn());
    audioAnalysisRef.current.clear();
  }, []);

  const startVAD = useCallback((userId, stream) => {
    const pid = String(userId || '');
    if (!pid || !stream?.getAudioTracks().some(isLive)) {
      stopVAD(pid);
      return;
    }
    stopVAD(pid);
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx     = audioCtxRef.current;
      const analyser= ctx.createAnalyser();
      analyser.fftSize = 256;
      const source  = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      const buf     = new Uint8Array(analyser.fftSize);
      let raf       = 0;
      let lastActive= 0;
      let prevSpeak = false;
      let lastPromoted = 0;
      let destroyed = false;
      const isSelf  = pid === String(myUserId);

      const tick = () => {
        if (destroyed) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const n = (buf[i] - 128) / 128;
          sum += n * n;
        }
        const rms = Math.sqrt(sum / buf.length);
        const now = Date.now();
        if (rms > 0.035) lastActive = now;
        const speaking = now - lastActive < 550;

        if (speaking !== prevSpeak) {
          prevSpeak = speaking;
          lastPromoted = now;
          onSpeakingChange?.(pid, speaking, now);
          if (isSelf && socket && callIdRef.current) {
            socket.emit('speaking_state', { callId: callIdRef.current, speaking, lastSpokeAt: now });
          }
        } else if (speaking && now - lastPromoted > 1500) {
          lastPromoted = now;
          onSpeakingChange?.(pid, true, now);
          if (isSelf && socket && callIdRef.current) {
            socket.emit('speaking_state', { callId: callIdRef.current, speaking: true, lastSpokeAt: now });
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      audioAnalysisRef.current.set(pid, () => {
        destroyed = true;
        cancelAnimationFrame(raf);
        try { source.disconnect(); } catch {}
        try { analyser.disconnect(); } catch {}
      });
    } catch {
      onSpeakingChange?.(pid, false, Date.now());
    }
  }, [myUserId, onSpeakingChange, socket, stopVAD]);

  // ── sync local preview ────────────────────────────────────────────────────
  const syncLocalPreview = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  // ── getLocalStream ────────────────────────────────────────────────────────
  /**
   * Lấy/cập nhật local media stream.
   * @param {boolean} wantVideo  - có muốn bật camera không
   * @param {string}  facing     - 'user' | 'environment' (mobile)
   * @returns {MediaStream}
   */
  const getLocalStream = useCallback(async (wantVideo = false, facing = 'user') => {
    let stream = localStreamRef.current;
    try {
      setCameraError(null);

      // Đảm bảo có audio track còn live
      if (!stream || !stream.getAudioTracks().some(isLive)) {
        stream?.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      }

      let vTrack = stream.getVideoTracks().find(isLive) || null;

      // Bật camera
      if (wantVideo && !vTrack) {
        setCameraLoading(true);
        try {
          const vs = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: facing },
            audio: false,
          });
          vTrack = vs.getVideoTracks()[0] || null;
          if (vTrack) {
            stream.addTrack(vTrack);
            vTrack.onended = () => {
              try { localStreamRef.current?.removeTrack(vTrack); } catch {}
              // Caller tự xử lý setCamOn(false) qua callback
            };
          }
        } finally {
          setCameraLoading(false);
        }
      }

      // Tắt camera
      if (!wantVideo && vTrack) {
        stream.getVideoTracks().forEach((t) => {
          t.stop();
          try { stream.removeTrack(t); } catch {}
        });
        vTrack = null;
      }

      localStreamRef.current = stream;
      syncLocalPreview();
      startVAD(myUserId, stream);
      return stream;
    } catch (err) {
      setCameraLoading(false);
      let errorMsg = 'Không thể truy cập camera';
      if (err.name === 'NotAllowedError')  errorMsg = 'Bạn từ chối cấp quyền camera';
      if (err.name === 'NotFoundError')    errorMsg = 'Không tìm thấy camera';
      if (err.name === 'NotReadableError') errorMsg = 'Camera bị ứng dụng khác sử dụng';
      setCameraError(errorMsg);
      throw err;
    }
  }, [myUserId, startVAD, syncLocalPreview]);

  // ── syncPC — replaceTrack trên một PC cụ thể ─────────────────────────────
  /**
   * Sync audio+video track từ localStream vào một PC.
   * Nếu PC chưa có sender (chưa addTrack lần nào), addTrack mới.
   * Nếu đã có sender, replaceTrack.
   *
   * @param {RTCPeerConnection} pc
   * @param {MediaStreamTrack|null} [forcedVideoTrack] - truyền vào khi screen share
   */
  const syncPC = useCallback(async (pc, forcedVideoTrack) => {
    if (!pc) return;
    const stream  = localStreamRef.current;
    const aTrack  = stream?.getAudioTracks().find(isLive) || null;
    const vTrack  = forcedVideoTrack !== undefined
      ? forcedVideoTrack
      : (screenStreamRef.current?.getVideoTracks().find(isLive)
        || stream?.getVideoTracks().find(isLive)
        || null);

    // Audio sender
    if (pc.__audioSender) {
      try { await pc.__audioSender.replaceTrack(aTrack); } catch {}
    } else if (aTrack && stream) {
      try { pc.__audioSender = pc.addTrack(aTrack, stream); } catch {}
    }

    // Video sender
    if (pc.__videoSender) {
      try { await pc.__videoSender.replaceTrack(vTrack); } catch {}
    } else if (vTrack && stream) {
      try { pc.__videoSender = pc.addTrack(vTrack, stream); } catch {}
    }
  }, []);

  // ── syncAllPCs ────────────────────────────────────────────────────────────
  const syncAllPCs = useCallback(async (forcedVideoTrack) => {
    const pcs = Array.from(pcMapRef.current.values());
    await Promise.allSettled(pcs.map((pc) => syncPC(pc, forcedVideoTrack)));
  }, [syncPC]);

  // ── createPC ──────────────────────────────────────────────────────────────
  /**
   * Tạo RTCPeerConnection mới cho targetId.
   * FIX CHÍNH: dùng addTrack() trực tiếp nếu đã có localStream,
   * thay vì addTransceiver() rỗng → tránh race condition negotiate.
   *
   * @param {string}   targetId         - userId của peer
   * @param {object}   [pcOpts]
   * @param {boolean}  [pcOpts.deafened] - remote audio muted (1-1 call)
   * @param {Function} [pcOpts.onTrack]  - override ontrack handler
   * @returns {RTCPeerConnection}
   */
  const createPC = useCallback((targetId, pcOpts = {}) => {
    const pid = String(targetId);

    // Đóng PC cũ nếu có
    const oldPc = pcMapRef.current.get(pid);
    if (oldPc) { try { oldPc.close(); } catch {} }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcMapRef.current.set(pid, pc);

    // ── FIX: addTrack ngay nếu đã có stream ──────────────────────────────
    // Đây là điểm khác biệt then chốt so với addTransceiver() rỗng.
    // addTrack() → track được đưa vào SDP ngay từ createOffer() đầu tiên
    // addTransceiver() rỗng → track vào SDP nhưng sender.track = null
    //   → replaceTrack() sau đó có thể chạy trước setRemoteDescription xong
    //   → race condition → peer không nhận được video
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          const sender = pc.addTrack(track, stream);
          if (track.kind === 'audio') pc.__audioSender = sender;
          if (track.kind === 'video') pc.__videoSender = sender;
        } catch {}
      });
    } else {
      // Chưa có stream (hiếm, thường init() đã getLocalStream() trước)
      // Dùng transceiver làm placeholder, syncPC() sẽ replaceTrack() sau
      const at = pc.addTransceiver('audio', { direction: 'sendrecv' });
      const vt = pc.addTransceiver('video', { direction: 'sendrecv' });
      pc.__audioSender = at.sender;
      pc.__videoSender = vt.sender;
    }

    // ── ICE ───────────────────────────────────────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) socket.emit('ice_candidate', { to: pid, candidate });
    };

    // ── ontrack ───────────────────────────────────────────────────────────
    if (typeof pcOpts.onTrack === 'function') {
      pc.ontrack = pcOpts.onTrack;
    } else {
      pc.ontrack = ({ streams }) => {
        const s = streams?.[0];
        if (!s) return;

        onRemoteStream?.(pid, s);
        startVAD(pid, s);

        // Lắng nghe track mới được thêm vào (peer bật cam sau)
        s.addEventListener('addtrack', () => {
          onRemoteStream?.(pid, s);
        });

        // Lắng nghe track ended (peer tắt cam)
        s.getTracks().forEach((track) => {
          track.onended = () => {
            onRemoteStream?.(pid, s);
            if (!s.getAudioTracks().some(isLive)) stopVAD(pid);
          };
        });
      };
    }

    // ── connection state ──────────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        onPeerConnected?.(pid);
      }
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        onPeerDisconnected?.(pid, state);
      }
    };

    return pc;
  }, [onPeerConnected, onPeerDisconnected, onRemoteStream, socket, startVAD, stopVAD]);

  // ── closePC ────────────────────────────────────────────────────────────────
  const closePC = useCallback((peerId) => {
    const pid = String(peerId);
    const pc  = pcMapRef.current.get(pid);
    if (pc) { try { pc.close(); } catch {} pcMapRef.current.delete(pid); }
    stopVAD(pid);
  }, [stopVAD]);

  // ── cleanup toàn bộ ───────────────────────────────────────────────────────
  const cleanupAll = useCallback(() => {
    stopAllVAD();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    pcMapRef.current.forEach((pc) => { try { pc.close(); } catch {} });
    pcMapRef.current.clear();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [stopAllVAD]);

  // ── getPC helper ─────────────────────────────────────────────────────────
  const getPC = useCallback((peerId) => pcMapRef.current.get(String(peerId)), []);

  // ── screen share helpers ──────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    const ss = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false,
    });
    screenStreamRef.current = ss;
    const track = ss.getVideoTracks()[0];
    await syncAllPCs(track);
    return { stream: ss, track };
  }, [syncAllPCs]);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    await syncAllPCs(); // restore camera track
  }, [syncAllPCs]);

  // ── expose ────────────────────────────────────────────────────────────────
  return {
    // refs (gán trực tiếp vào JSX)
    localVideoRef,
    localStreamRef,
    screenStreamRef,
    pcMapRef,

    // state
    cameraLoading,
    cameraError,

    // core methods
    createPC,
    closePC,
    getPC,
    syncPC,
    syncAllPCs,
    getLocalStream,
    cleanupAll,
    syncLocalPreview,
    setCallId,

    // VAD
    startVAD,
    stopVAD,
    stopAllVAD,

    // screen share
    startScreenShare,
    stopScreenShare,

    // utils (expose để dùng trong các file khác nếu cần)
    isLive,
  };
}
