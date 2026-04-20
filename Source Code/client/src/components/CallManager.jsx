import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, RotateCcw, Clock, ChevronDown,
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];

function getAvatarColor(username) {
  const clean = (username || '').trim();
  return clean ? AVATAR_COLORS[(clean.charCodeAt(0) || 0) % AVATAR_COLORS.length] : 'bg-gray-600';
}

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function CallAvatar({ username = '', size = 'lg', avatarUrl }) {
  const clean    = (username || '').trim();
  const initials = clean.length >= 2 ? clean.slice(0, 2).toUpperCase()
    : clean.length === 1 ? clean.toUpperCase() : '?';
  const color = getAvatarColor(clean);
  const sz = { sm: 'w-12 h-12 text-lg', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-4xl' }[size];

  if (avatarUrl) {
    return (
      <img
        src={getFileUrl(avatarUrl)}
        alt={username}
        className={`${sz} rounded-full object-cover flex-shrink-0 ring-4 ring-white/20`}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0 ring-4 ring-white/20`}>
      {initials}
    </div>
  );
}

function CtrlBtn({ onClick, icon: Icon, label, variant = 'default', disabled }) {
  const variants = {
    default: 'bg-white/20 hover:bg-white/30 text-white',
    danger:  'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    muted:   'bg-gray-600 hover:bg-gray-700 text-white',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${variants[variant]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs text-white/70">{label}</span>
    </button>
  );
}

function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function RippleRings({ color = 'blue', active = true }) {
  const colorMap = {
    blue:  'border-blue-400/50',
    green: 'border-green-400/60',
  };
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`absolute rounded-full border-2 ${colorMap[color]} animate-ping`}
          style={{
            width:             `${80 + i * 55}px`,
            height:            `${80 + i * 55}px`,
            animationDelay:    `${(i - 1) * 0.35}s`,
            animationDuration: '1.6s',
          }}
        />
      ))}
    </div>
  );
}

function CountdownBar({ seconds, total }) {
  const pct = (seconds / total) * 100;
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-white/40" />
        <span className="text-white/40 text-xs">Tự đóng sau {seconds} giây</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white/30 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CallManager({ socket, currentUser, otherUser, onStartCall, onCallEnd, onRejoinReady, onCallStateChange }) {
  const [callState, setCallState]           = useState('idle');
  const [callType, setCallType]             = useState('video');
  const [incomingData, setIncomingData]     = useState(null);
  const [callDuration, setCallDuration]     = useState(0);
  const [finalDuration, setFinalDuration]   = useState(0);
  const [micOn, setMicOn]                   = useState(true);
  const [camOn, setCamOn]                   = useState(true);
  const [facingMode, setFacingMode]         = useState('user');
  const [peerCamOn, setPeerCamOn]           = useState(true);
  const [peerMicOn, setPeerMicOn]           = useState(true);
  const [peerSpeaking, setPeerSpeaking]     = useState(false);
  const [localSpeaking, setLocalSpeaking]   = useState(false);
  const [rejectedBy, setRejectedBy]         = useState(null);
  const [closeCountdown, setCloseCountdown] = useState(0);
  const [ringCountdown, setRingCountdown]   = useState(0);
  const [minimized, setMinimized] = useState(false);

  const RING_TIMEOUT = 35;

  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const [localStreamVersion, setLocalStreamVersion] = useState(0);
  const durationTimer     = useRef(null);
  const callStartedAtRef  = useRef(null);
  const closeCountdownRef = useRef(null);
  const ringTimeoutRef    = useRef(null);
  const ringCountdownRef  = useRef(null);
  const callDurationRef   = useRef(0);
  const callTypeRef       = useRef('audio');
  const callEndFiredRef   = useRef(false);
  const isCallerRef       = useRef(false);
  const callWasActiveRef  = useRef(false);

  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);

  useEffect(() => {
    if ((callState === 'outgoing' || callState === 'active') && localStreamRef.current) {
      if (localVideoRef.current && !localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [callState]);

  const startCloseCountdown = useCallback((total, onDone) => {
    clearInterval(closeCountdownRef.current);
    setCloseCountdown(total);
    let remaining = total;
    closeCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setCloseCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(closeCountdownRef.current);
        onDone();
      }
    }, 1000);
  }, []);

  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);
    clearInterval(closeCountdownRef.current);
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMicOn(true); setCamOn(true); setFacingMode('user');
    setPeerCamOn(true); setPeerMicOn(true);
    setRingCountdown(0);
  }, []);

  const resetToIdle = useCallback(() => {
    setCallState('idle');
    setIncomingData(null);
    setCallDuration(0);
    setFinalDuration(0);
    setRejectedBy(null);
    setCloseCountdown(0);
    setRingCountdown(0);
    clearInterval(closeCountdownRef.current);
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    callEndFiredRef.current  = false;
    isCallerRef.current      = false;
    callWasActiveRef.current = false;
    setMinimized(false);
  }, []);

  const startDurationTimer = useCallback(() => {
    clearInterval(durationTimer.current);
    callStartedAtRef.current = Date.now();
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const startRingTimeout = useCallback((onTimeout) => {
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    let remaining = RING_TIMEOUT;
    setRingCountdown(remaining);
    ringCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setRingCountdown(remaining);
      if (remaining <= 0) clearInterval(ringCountdownRef.current);
    }, 1000);
    ringTimeoutRef.current = setTimeout(() => {
      clearInterval(ringCountdownRef.current);
      setRingCountdown(0);
      onTimeout();
    }, RING_TIMEOUT * 1000);
  }, [RING_TIMEOUT]);

  const fireCallEnd = useCallback(({ type, duration, status }) => {
    if (callEndFiredRef.current) return;
    callEndFiredRef.current = true;
    onCallEnd?.({ type, duration, status, isCaller: isCallerRef.current, calleeId: otherUser?._id });
  }, [onCallEnd, otherUser]);

  const getLocalStream = async (type, facing = 'user') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720, facingMode: facing } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    try { setLocalStreamVersion(v => v + 1); } catch (e) { }
    return stream;
  };

  const createPC = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) socket.emit('ice_candidate', { to: targetUserId, candidate });
    };
    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        const attachRemote = () => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = streams[0];
          else setTimeout(attachRemote, 100);
        };
        attachRemote();
      }
    };
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        const dur       = callDurationRef.current;
        const type      = callTypeRef.current;
        const wasActive = callWasActiveRef.current;
        const status    = wasActive ? 'ended' : (isCallerRef.current ? 'cancelled' : 'missed');
        setFinalDuration(dur);
        cleanup();
        setCallState('ended');
        fireCallEnd({ type, duration: dur, status });
        startCloseCountdown(5, resetToIdle);
      }
    };
    return pc;
  }, [socket, cleanup, resetToIdle, startCloseCountdown, fireCallEnd]);

  const startCall = useCallback(async (type) => {
    if (!otherUser?._id || !socket) return;
    isCallerRef.current      = true;
    callEndFiredRef.current  = false;
    callWasActiveRef.current = false;
    setCallType(type);
    callTypeRef.current = type;
    setCallState('outgoing');
    try {
      await new Promise(r => setTimeout(r, 50));
      const stream = await getLocalStream(type);
      const pc = createPC(otherUser._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_user', { to: otherUser._id, offer, callType: type });
      startRingTimeout(() => {
        const targetId = otherUser._id;
        if (targetId && socket) socket.emit('end_call', { to: targetId });
        cleanup();
        setCallState('ended');
        setFinalDuration(0);
        fireCallEnd({ type, duration: 0, status: 'missed' });
        startCloseCountdown(5, resetToIdle);
      });
    } catch (err) {
      console.error('Lỗi bắt đầu call:', err);
      callEndFiredRef.current = false;
      cleanup();
      setCallState('idle');
    }
  }, [otherUser, socket, createPC, cleanup, startRingTimeout, fireCallEnd, startCloseCountdown, resetToIdle]);

  useEffect(() => {
    if (onStartCall) onStartCall(startCall);
  }, [startCall, onStartCall]);

  // expose rejoin handler so parent can un-minimize the active UI
  useEffect(() => {
    if (onRejoinReady) onRejoinReady(() => setMinimized(false));
  }, [onRejoinReady]);

  const acceptCall = async () => {
    if (!incomingData || !socket) return;
    isCallerRef.current      = false;
    callEndFiredRef.current  = false;
    callWasActiveRef.current = false;
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    setRingCountdown(0);
    setCallState('active');
    try {
      await new Promise(r => setTimeout(r, 50));
      const stream = await getLocalStream(incomingData.callType);
      const pc = createPC(incomingData.from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('accept_call', { to: incomingData.from, answer });
      callWasActiveRef.current = true;
      startDurationTimer();
    } catch (err) {
      console.error('Lỗi chấp nhận call:', err);
      callEndFiredRef.current = false;
      cleanup();
      setCallState('idle');
    }
  };

  const rejectCall = () => {
    if (!incomingData || !socket) return;
    socket.emit('reject_call', { to: incomingData.from, reason: 'User declined' });
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    setRingCountdown(0);
    setRejectedBy('me');
    cleanup();
    setCallState('rejected');
    startCloseCountdown(3, resetToIdle);
  };

  const endCall = () => {
    const dur       = callDurationRef.current;
    const type      = callTypeRef.current;
    const wasActive = callWasActiveRef.current;
    const targetId  = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('end_call', { to: targetId });
    setFinalDuration(dur);
    cleanup();
    setCallState('ended');
    const status = wasActive ? 'ended' : (isCallerRef.current ? 'cancelled' : 'missed');
    fireCallEnd({ type, duration: dur, status });
    startCloseCountdown(5, resetToIdle);
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;

    // TẮT/ BẬT track audio TRƯỚC
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });

    // Cập nhật state mic
    setMicOn(next);

    // NẾU KHÔNG CÒN localStreamRef -> thoát
    if (!localStreamRef.current) return;

    const targetId = incomingData?.from || otherUser?._id;

    if (targetId && socket) {
      // Emit toggle_audio
      try { socket.emit('toggle_audio', { to: targetId, enabled: next }); } catch (e) {}

      // QUAN TRỌNG: Luôn emit speaking_state = false khi tắt mic
      if (!next) {
        setLocalSpeaking(false);
        try {
          socket.emit('speaking_state', {
            to: targetId,
            speaking: false,
            lastSpokeAt: Date.now(),
          });
        } catch (e) {}
      }
    }
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const next = !camOn;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next; });
    setCamOn(next);
    const targetId = incomingData?.from || otherUser?._id;
    if (targetId && socket) socket.emit('toggle_video', { to: targetId, enabled: next });
  };

  // voice activity detection (VAD) - will emit speaking_state to peer
  useEffect(() => {
    if (!localStreamRef.current || !socket) return;
    let audioCtx;
    let analyser;
    let source;
    let rafId;
    let lastEmitTime = 0;
    const EMIT_COOLDOWN = 150; // ms
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source = audioCtx.createMediaStreamSource(localStreamRef.current);
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      let speaking = false;

      const check = () => {
        // Kiểm tra trực tiếp track.enabled (an toàn hơn khi mic bị stop)
        const track = localStreamRef.current?.getAudioTracks?.()[0];
        const isTrackEnabled = !!track && track.enabled === true;
        const isMicOn = isTrackEnabled && micOn;

        // Nếu mic tắt -> không cần detect
        if (!isMicOn) {
          if (speaking) {
            speaking = false;
            setLocalSpeaking(false);
            const targetId = incomingData?.from || otherUser?._id;
            if (targetId && socket && Date.now() - lastEmitTime > EMIT_COOLDOWN) {
              lastEmitTime = Date.now();
              try {
                socket.emit('speaking_state', {
                  to: targetId,
                  speaking: false,
                  lastSpokeAt: Date.now(),
                });
              } catch (e) {}
            }
          }
          rafId = requestAnimationFrame(check);
          return;
        }

        // Mic đang bật -> detect bình thường
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const isSpeaking = rms > 0.02;

        if (isSpeaking !== speaking) {
          speaking = isSpeaking;
          setLocalSpeaking(speaking);
          const targetId = incomingData?.from || otherUser?._id;
          if (targetId && socket && Date.now() - lastEmitTime > EMIT_COOLDOWN) {
            lastEmitTime = Date.now();
            try {
              socket.emit('speaking_state', {
                to: targetId,
                speaking: speaking,
                lastSpokeAt: Date.now(),
              });
            } catch (e) {}
          }
        }
        rafId = requestAnimationFrame(check);
      };

      rafId = requestAnimationFrame(check);
    } catch (err) {
      console.warn('VAD init error', err);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      try { analyser?.disconnect(); source?.disconnect(); audioCtx?.close(); } catch (e) {}
    };
  }, [localStreamVersion, socket, incomingData, otherUser, micOn]);

  const flipCamera = async () => {
    if (!localStreamRef.current || callType !== 'video') return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    
    // Lưu trạng thái video tracks hiện tại
    const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
    if (oldVideoTrack) oldVideoTrack.stop();
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false, 
        video: { facingMode: newFacing }
      });
      const newTrack = newStream.getVideoTracks()[0];
      
      // Thay track trong peer connection
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }
      
      // Kết hợp audio track cũ với video track mới
      const audioTracks = localStreamRef.current.getAudioTracks();
      const combined = new MediaStream([...audioTracks, newTrack]);
      localStreamRef.current = combined;
      
      // Cập nhật local video
      if (localVideoRef.current) localVideoRef.current.srcObject = combined;
      
      // Emit sự kiện flip camera cho peer
      const targetId = incomingData?.from || otherUser?._id;
      if (targetId && socket) {
        socket.emit('flip_camera', { to: targetId, facingMode: newFacing });
      }
    } catch (err) {
      console.error('Flip camera error:', err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = (data) => {
      if (callState !== 'idle') { socket.emit('call_busy', { to: data.from }); return; }
      setIncomingData(data);
      setCallType(data.callType);
      callTypeRef.current = data.callType;
      setCallState('incoming');
      startRingTimeout(() => { cleanup(); setCallState('idle'); });
    };

    const onCallAccepted = async ({ answer }) => {
      if (!pcRef.current) return;
      clearTimeout(ringTimeoutRef.current);
      clearInterval(ringCountdownRef.current);
      setRingCountdown(0);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      callWasActiveRef.current = true;
      setCallState('active');
      startDurationTimer();
    };

    const onCallRejected = () => {
      const dur  = callDurationRef.current;
      const type = callTypeRef.current;
      clearTimeout(ringTimeoutRef.current);
      clearInterval(ringCountdownRef.current);
      setRingCountdown(0);
      setRejectedBy('other');
      cleanup();
      setCallState('rejected');
      fireCallEnd({ type, duration: dur, status: 'rejected' });
      startCloseCountdown(3, resetToIdle);
    };

    const onCallEnded = () => {
      const dur       = callDurationRef.current;
      const type      = callTypeRef.current;
      const wasActive = callWasActiveRef.current;
      setFinalDuration(dur);
      cleanup();
      setCallState('ended');
      const status = wasActive ? 'ended' : (isCallerRef.current ? 'cancelled' : 'missed');
      fireCallEnd({ type, duration: dur, status });
      startCloseCountdown(5, resetToIdle);
    };

    const onCallBusy = () => { cleanup(); setCallState('idle'); };

    const onIceCandidate = async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    };

    socket.on('incoming_call',     onIncomingCall);
    socket.on('call_accepted',     onCallAccepted);
    socket.on('call_rejected',     onCallRejected);
    socket.on('call_ended',        onCallEnded);
    socket.on('call_busy',         onCallBusy);
    socket.on('ice_candidate',     onIceCandidate);
    socket.on('peer_flip_camera', ({ facingMode: newFacing }) => {
  // Cập nhật trạng thái facing mode của peer (nếu cần hiển thị)
  // Hoặc chỉ để đồng bộ, không cần làm gì thêm vì peer tự xử lý video của họ
      console.log('Peer flipped camera to:', newFacing);
    });
    socket.on('peer_video_toggle', ({ enabled }) => setPeerCamOn(enabled));
    socket.on('peer_audio_toggle', ({ enabled }) => {
      setPeerMicOn(enabled);
      // QUAN TRỌNG: Khi peer tắt mic, forced peerSpeaking = false
      if (!enabled) setPeerSpeaking(false);
    });
    socket.on('peer_speaking_state', ({ from, speaking }) => {
      // if event comes from our active peer, update indicator
      const peerId = incomingData?.from || otherUser?._id;
      if (!peerId) return;
      if (String(from) === String(peerId)) {
        // QUAN TRỌNG: Chỉ set peerSpeaking = true khi peerMicOn === true
        if (speaking && peerMicOn) setPeerSpeaking(true);
        else setPeerSpeaking(false);
      }
    });

    return () => {
      socket.off('incoming_call',     onIncomingCall);
      socket.off('call_accepted',     onCallAccepted);
      socket.off('call_rejected',     onCallRejected);
      socket.off('call_ended',        onCallEnded);
      socket.off('call_busy',         onCallBusy);
      socket.off('ice_candidate',     onIceCandidate);
      socket.off('peer_video_toggle');
      socket.off('peer_audio_toggle');
      socket.off('peer_speaking_state');
      socket.off('peer_flip_camera');
    };
  }, [socket, callState, cleanup, startDurationTimer, resetToIdle, startCloseCountdown, fireCallEnd, startRingTimeout]);

    useEffect(() => {
      if (!onCallStateChange) return;
      if (callState === 'active') {
        onCallStateChange({ isActive: true, callType, startedAt: callStartedAtRef.current });
      } else {
        onCallStateChange({ isActive: false });
      }
    }, [callState, callType, onCallStateChange]);

  if (callState === 'idle') return null;

  // ── Incoming ───────────────────────────────────────────────────────────────
  if (callState === 'incoming') {
    const callerName   = incomingData?.fromUser?.username || incomingData?.fromUser?.name || incomingData?.callerName || '';
    const callerAvatar = incomingData?.fromUser?.avatar;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="bg-gray-900 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl w-80 border border-white/10">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full">
            {callType === 'video'
              ? <><Video className="w-4 h-4 text-blue-400" /><span className="text-white/70 text-sm">Video call đến</span></>
              : <><Phone className="w-4 h-4 text-green-400" /><span className="text-white/70 text-sm">Cuộc gọi thoại đến</span></>}
          </div>
          <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
            <RippleRings color="green" />
            <CallAvatar username={callerName} size="xl" avatarUrl={callerAvatar} />
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-bold">{callerName || 'Người dùng'}</p>
            {incomingData?.fromUser?.email && (
              <p className="text-white/40 text-sm mt-1">{incomingData.fromUser.email}</p>
            )}
          </div>
          <div className="flex gap-1 items-end h-8">
            {[14, 22, 28, 22, 14].map((h, i) => (
              <div key={i} className="w-1.5 bg-green-400 rounded-full animate-bounce"
                style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <div className="flex gap-12 mt-2">
            <CtrlBtn icon={PhoneOff} label="Từ chối"   variant="danger"  onClick={rejectCall} />
            <CtrlBtn icon={Phone}    label="Chấp nhận" variant="success" onClick={acceptCall} />
          </div>
        </div>
      </div>
    );
  }

  // ── Outgoing ───────────────────────────────────────────────────────────────
  if (callState === 'outgoing') {
    const calleeName   = otherUser?.username || otherUser?.name || '';
    const calleeAvatar = otherUser?.avatar;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        {callType === 'video' && (
          <video ref={localVideoRef} autoPlay playsInline muted
            className={`absolute bottom-6 right-6 w-32 h-20 object-cover rounded-xl border border-white/20 z-10 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
        )}
        <div className="bg-gray-900 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl w-80 border border-white/10">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full">
            {callType === 'video'
              ? <><Video className="w-4 h-4 text-blue-400" /><span className="text-white/70 text-sm">Đang gọi video...</span></>
              : <><Phone className="w-4 h-4 text-green-400" /><span className="text-white/70 text-sm">Đang gọi thoại...</span></>}
          </div>
          <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
            <RippleRings color="blue" />
            <CallAvatar username={calleeName} size="xl" avatarUrl={calleeAvatar} />
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-bold">{calleeName || 'Người dùng'}</p>
            <p className="text-white/50 text-sm mt-1.5 animate-pulse">
              {callType === 'video' ? '📹 Đang kết nối...' : '📞 Đang đổ chuông...'}
            </p>
            {ringCountdown > 0 && ringCountdown <= RING_TIMEOUT && (
              <p className="text-white/30 text-xs mt-2">Tự động hủy sau {ringCountdown}s</p>
            )}
          </div>
          <CtrlBtn icon={PhoneOff} label="Huỷ" variant="danger" onClick={endCall} />
        </div>
      </div>
    );
  }

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (callState === 'rejected') {
    const resolvedName = incomingData?.fromUser?.username || otherUser?.username || 'Người dùng';
    const msg = rejectedBy === 'me' ? 'Bạn đã từ chối cuộc gọi' : `${resolvedName} đã từ chối`;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-3xl px-10 py-9 flex flex-col items-center gap-5 shadow-2xl w-72 border border-white/10">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <PhoneOff className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Cuộc gọi bị từ chối</p>
            <p className="text-white/50 text-sm mt-1.5">{msg}</p>
          </div>
          <CountdownBar seconds={closeCountdown} total={3} />
          <button onClick={resetToIdle}
            className="px-6 py-2 text-sm font-semibold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition">
            Đóng ngay
          </button>
        </div>
      </div>
    );
  }

  // ── Ended ──────────────────────────────────────────────────────────────────
  if (callState === 'ended') {
    const dur      = finalDuration || callDuration;
    const peerName   = incomingData?.fromUser?.username || otherUser?.username || 'Người dùng';
    const peerAvatar = incomingData?.fromUser?.avatar   || otherUser?.avatar;
    return (
      <div onClick={resetToIdle} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <div onClick={(e) => e.stopPropagation()} className="bg-gray-900 rounded-3xl px-10 py-9 flex flex-col items-center gap-5 shadow-2xl w-72 border border-white/10">
          <CallAvatar username={peerName} size="lg" avatarUrl={peerAvatar} />
          <div className="text-center">
            <p className="text-white font-bold text-lg">{peerName}</p>
            <p className="text-white/40 text-xs mt-1">{callType === 'video' ? 'Video call' : 'Cuộc gọi thoại'}</p>
          </div>
          <div className="flex items-center gap-2.5 bg-gray-800 px-6 py-3 rounded-2xl border border-white/5">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-mono font-bold text-xl">{formatDuration(dur)}</span>
          </div>
          <p className="text-white/40 text-sm">Cuộc gọi đã kết thúc</p>
          <CountdownBar seconds={closeCountdown} total={5} />
          <button onClick={resetToIdle}
            className="px-6 py-2 text-sm font-semibold text-white bg-gray-700 rounded-xl hover:bg-gray-600 transition">
            Đóng ngay
          </button>
        </div>
      </div>
    );
  }

  // If user minimized the active UI, hide it (Chat will show banner)
  if (callState === 'active' && minimized) return null;

  // ── Active ─────────────────────────────────────────────────────────────────
  const peerName   = incomingData?.fromUser?.username || otherUser?.username || 'Người dùng';
  const peerAvatar = incomingData?.fromUser?.avatar   || otherUser?.avatar;
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
        {/* Minimize button (hide call UI) */}
        <button
          onClick={() => setMinimized(true)}
          className="absolute top-4 right-4 z-30 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Thu nhỏ"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        {/* Minimize button (hide call UI) */}
        <button
          onClick={() => setMinimized(true)}
          className="absolute top-4 right-4 z-30 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Thu nhỏ"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        {callType === 'video' ? (
          <>
            <div className="relative w-full h-full">
              {/* Vòng xanh lá quanh viền màn hình khi peer nói */}
              {peerSpeaking && peerMicOn && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none rounded-none transition-all duration-200"
                  style={{ boxShadow: 'inset 0 0 0 4px rgba(74,222,128,0.75), 0 0 40px rgba(74,222,128,0.25)' }}
                />
              )}
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            {!peerCamOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <CallAvatar username={peerName} size="xl" avatarUrl={peerAvatar} />
                <p className="text-white/50 text-sm mt-4">Camera đã tắt</p>
              </div>
            )}
            {/* remote mic off icon - large crossed-mic near bottom controls */}
            {!peerMicOn && (
              <div className="absolute left-1/2 bottom-6 -translate-x-1/2 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/80 flex items-center justify-center shadow-lg">
                  <MicOff className="w-8 h-8 text-red-400" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
    {/* Vòng xanh peer đang nói */}
    <RippleRings color="green" active={peerSpeaking && peerMicOn} />
    {/* Vòng xanh nhạt hơn khi local đang nói */}
    <RippleRings color="blue"  active={!peerSpeaking && localSpeaking && micOn} />
    <div
      className={`rounded-full transition-all duration-200 ${
        (peerSpeaking && peerMicOn)
          ? 'ring-4 ring-green-400 shadow-[0_0_28px_rgba(74,222,128,0.5)]'
          : (localSpeaking && micOn)
            ? 'ring-4 ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.4)]'
            : ''
      }`}
    >
      <CallAvatar username={peerName} size="xl" avatarUrl={peerAvatar} />
    </div>
  </div>
            <p className="text-white text-2xl font-bold">{peerName}</p>
            {!peerMicOn && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <MicOff className="w-4 h-4 text-red-400" />
                <span className="text-white/60 text-xs">Đối phương đã tắt mic</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <p className="text-white font-semibold text-lg drop-shadow">{peerName}</p>
          <p className="text-green-400 text-sm font-mono mt-1 drop-shadow">{formatDuration(callDuration)}</p>
        </div>

        {callType === 'video' && (
            <div className="absolute bottom-28 right-4 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-800">
            <div className={`w-full h-full transition-all duration-200 ${
  (localSpeaking && micOn)
    ? 'ring-4 ring-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.6)]'
    : 'ring-2 ring-white/10'
}`}> 
              {camOn ? (
                <video ref={localVideoRef} autoPlay playsInline muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <VideoOff className="w-6 h-6 text-white/40" />
                </div>
              )}
            </div>
            {/* flip camera removed per request */}
          </div>
        )}
        
      </div>

    <div className="bg-gray-900/95 backdrop-blur px-8 py-6">
      <div className="flex items-center justify-center gap-8">
        <CtrlBtn icon={micOn ? Mic : MicOff} label={micOn ? 'Tắt mic' : 'Bật mic'}
          variant={micOn ? 'default' : 'danger'} onClick={toggleMic} />
        {callType === 'video' && (
          <>
            <CtrlBtn icon={camOn ? Video : VideoOff} label={camOn ? 'Tắt cam' : 'Bật cam'}
              variant={camOn ? 'default' : 'muted'} onClick={toggleCam} />
            {/* Thêm nút lật camera */}
            <CtrlBtn icon={RotateCcw} label="Lật cam" variant="default" onClick={flipCamera} />
          </>
        )}
        <CtrlBtn icon={PhoneOff} label="Kết thúc" variant="danger" onClick={endCall} />
      </div>
    </div>
    </div>
  );
}
