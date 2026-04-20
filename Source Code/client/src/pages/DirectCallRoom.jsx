// client/src/pages/DirectCallRoom.jsx
// Cuộc gọi 1–1 — layout kiểu Zalo/Messenger (fullscreen remote + PiP local)
// route: /call/:callId?conv=...&type=...&group=0

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Monitor, MonitorOff, Headphones, EarOff,
  RotateCcw, Maximize2, Minimize2, Clock, WifiOff, ChevronDown,
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/authStore';

// ─── constants ────────────────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const AVATAR_COLORS = [
  'bg-violet-600','bg-blue-600','bg-emerald-600',
  'bg-pink-600','bg-amber-600','bg-cyan-600','bg-rose-600',
];

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

// ─── utils ───────────────────────────────────────────────────────────────────
const getColor  = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const getPid    = (p) => String(p?._id || p?.id || p?.userId || '');
const getName   = (p) => p?.username || p?.name || p?.email || 'Người dùng';
const getAvatar = (p) => p?.avatar || p?.photoURL || '';
const isLive    = (t) => !!t && t.readyState === 'live';

const fileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

const elapsedSec = (startedAt) => {
  if (!startedAt) return 0;
  const ms = new Date(startedAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.floor((Date.now() - ms) / 1000)) : 0;
};

const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ member, size = 80, className = '', ring = false, speaking = false }) {
  const [failed, setFailed] = useState(false);
  const name  = getName(member);
  const color = getColor(name);
  const src   = !failed ? fileUrl(getAvatar(member)) : '';

  useEffect(() => setFailed(false), [member?.avatar, member?.username]);

  const ringClass = ring
    ? speaking
      ? 'ring-4 ring-green-400 shadow-[0_0_28px_rgba(74,222,128,0.6)]'
      : 'ring-4 ring-white/20'
    : '';

  if (src) {
    return (
      <img src={src} alt={name} onError={() => setFailed(true)}
        className={`rounded-full object-cover transition-all duration-300 ${ringClass} ${className}`}
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className={`${ringClass} ${className}`} style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full bg-pink-400 flex items-center justify-center text-white transition-all duration-300">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-yellow-300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM12 14c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────
function Btn({ onClick, icon: Icon, label, active = true, danger = false, disabled = false, pulse = false }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} disabled={disabled} title={label}
        className={`relative w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl transition-all duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
          ${danger
            ? 'bg-red-500/90 hover:bg-red-400 active:scale-95 text-white'
            : active
              ? 'bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-sm'
              : 'bg-red-500/80 hover:bg-red-400 active:scale-95 text-white'
          }`}
      >
        <Icon className="w-5 h-5" />
        {pulse && <span className="absolute inset-0 rounded-full ring-2 ring-green-400 animate-pulse pointer-events-none" />}
      </button>
      <span className="text-[10px] text-white/60 font-medium text-center leading-tight max-w-[64px]">{label}</span>
    </div>
  );
}

// ─── IncomingCallOverlay — khi callee vào phòng lần đầu chưa answer ──────────
function IncomingCallOverlay({ callerInfo, callType, onAccept, onReject }) {
  const callerName = getName(callerInfo);
  const color = getColor(callerName);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between py-20"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

      {/* Caller info */}
      <div className="flex flex-col items-center gap-5 mt-8">
        <p className="text-white/50 text-sm font-medium tracking-wide">
          {callType === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
        </p>

        {/* Pulse rings */}
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          {[1, 2, 3].map(i => (
            <span key={i} className="absolute rounded-full bg-white/5 animate-ping"
              style={{ width: 80 + i * 28, height: 80 + i * 28, animationDelay: `${i * 0.6}s`, animationDuration: '3s' }} />
          ))}
          {callerInfo?.avatar ? (
            <img src={fileUrl(callerInfo.avatar)} alt={callerName}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-white/30 z-10" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-pink-400 flex items-center justify-center ring-4 ring-white/30 z-10">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-yellow-300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM12 14c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" />
              </svg>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-white text-3xl font-bold">{callerName}</p>
          <div className="flex gap-1 items-end h-5 mt-3 justify-center">
            {[4, 7, 10, 7, 4].map((h, i) => (
              <div key={i} className="w-1 bg-green-400/70 rounded-full animate-bounce"
                style={{ height: h, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Accept / Reject */}
      <div className="flex items-end justify-around w-full px-16 pb-4">
        {/* Reject */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={onReject}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all">
            <PhoneOff className="w-9 h-9" />
          </button>
          <span className="text-white/60 text-sm font-medium">Từ chối</span>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={onAccept}
            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all animate-bounce">
            <Phone className="w-9 h-9" />
          </button>
          <span className="text-white/60 text-sm font-medium">Chấp nhận</span>
        </div>
      </div>
    </div>
  );
}

// ─── OutgoingCallScreen — caller đang chờ ────────────────────────────────────
function OutgoingCallScreen({ peerInfo, callType, onCancel, localVideoRef }) {
  const peerName = getName(peerInfo);
  const color = getColor(peerName);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between py-20"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

      {/* Local cam preview (video call) */}
      {callType === 'video' && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover opacity-30 scale-x-[-1]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col items-center gap-5 mt-8">
        <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
          Đang gọi{dots}
        </p>

        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          {[1, 2, 3].map(i => (
            <span key={i} className="absolute rounded-full bg-white/5 animate-ping"
              style={{ width: 80 + i * 28, height: 80 + i * 28, animationDelay: `${i * 0.6}s`, animationDuration: '3s' }} />
          ))}
          {peerInfo?.avatar ? (
            <img src={fileUrl(peerInfo.avatar)} alt={peerName}
              className="w-28 h-28 rounded-full object-cover ring-4 ring-white/30 z-10" />
          ) : (
            <div className={`w-28 h-28 ${color} rounded-full flex items-center justify-center text-4xl font-bold text-white ring-4 ring-white/30 z-10`}>
              {peerName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <p className="text-white text-3xl font-bold">{peerName}</p>
        <p className="text-white/40 text-sm">Tự động hủy sau 35 giây</p>
      </div>

      {/* Cancel */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-4">
        <button onClick={onCancel}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all">
          <PhoneOff className="w-9 h-9" />
        </button>
        <span className="text-white/60 text-sm font-medium">Huỷ</span>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DirectCallRoom() {
  const { callId }            = useParams();
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();
  const { socket }            = useSocket();
  const { user: currentUser } = useAuthStore();

  const conversationId = searchParams.get('conv');
  const callType       = searchParams.get('type') || 'audio';
  // Group route param ignored — DirectCallRoom supports 1-1 only
  const isGroupRoute   = false;
  const returnUrl      = searchParams.get('return') || '/chat';

  const myUserId = getPid(currentUser);

  // Group calls removed — no redirect needed

  // ── state ─────────────────────────────────────────────────────────────────
  const [status,       setStatus]       = useState('connecting');
  const [duration,     setDuration]     = useState(0);
  const [micOn,        setMicOn]        = useState(true);
  const [camOn,        setCamOn]        = useState(callType === 'video');
  const [deafened,     setDeafened]     = useState(false);
  const [screenShare,  setScreenShare]  = useState(false);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [endReason,    setEndReason]    = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [remoteCamOn,  setRemoteCamOn]  = useState(false);
  const [remoteMicOn,  setRemoteMicOn]  = useState(true);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [peer,         setPeer]         = useState(null); // { id, username, avatar }

  // Pending offer: callee chưa answer
  const [pendingOffer, setPendingOffer] = useState(null);
  // Caller waiting: chờ callee accept (hiện OutgoingCallScreen)
  const [callerWaiting, setCallerWaiting] = useState(false);
  const [callerPeerInfo, setCallerPeerInfo] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError,   setCameraError]   = useState(null);

  // ── refs ──────────────────────────────────────────────────────────────────
  const localStreamRef  = useRef(null);
  const screenStreamRef = useRef(null);
  const pcRef           = useRef(null);
  const durationRef     = useRef(null);
  const localVideoRef   = useRef(null);
  const remoteVideoRef  = useRef(null);
  const remoteAudioRef  = useRef(null);
  const screenVideoRef  = useRef(null);
  const audioCtxRef     = useRef(null);
  const vadRef          = useRef(null);
  const startedAtRef    = useRef(null);
  const callTypeRef     = useRef(callType);
  const durationCountRef = useRef(0);
  const facingRef       = useRef('user');
  const callEndedRef    = useRef(false);
  const statusRef       = useRef(status);
  const controlsTimerRef = useRef(null);
  const remotePeerIdRef = useRef(null);

  useEffect(() => { statusRef.current = status; }, [status]);

  // ── Auto-hide controls khi video đang active ──────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(controlsTimerRef.current);
    if (statusRef.current === 'active') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, []);

  useEffect(() => {
    if (status === 'active') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    } else {
      setControlsVisible(true);
    }
    return () => clearTimeout(controlsTimerRef.current);
  }, [status]);

  // ── VAD (phát hiện giọng nói remote) ─────────────────────────────────────
  const startRemoteVAD = useCallback((stream) => {
    if (vadRef.current) { vadRef.current(); vadRef.current = null; }
    if (!stream?.getAudioTracks().some(isLive)) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      let raf = 0;
      let lastActive = 0;
      let prev = false;
      let destroyed = false;

      const tick = () => {
        if (destroyed) return;
        an.getByteTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) { const n = (buf[i] - 128) / 128; rms += n * n; }
        rms = Math.sqrt(rms / buf.length);
        const now = Date.now();
        if (rms > 0.035) lastActive = now;
        const speaking = now - lastActive < 600;
        if (speaking !== prev) { prev = speaking; setRemoteSpeaking(speaking); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      vadRef.current = () => {
        destroyed = true;
        cancelAnimationFrame(raf);
        try { src.disconnect(); } catch {}
        setRemoteSpeaking(false);
      };
    } catch {}
  }, []);

  // ── attach remote stream → video/audio elements ───────────────────────────
  const attachRemoteStream = useCallback((stream) => {
    if (!stream) return;
    // Audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch(() => {});
    }
    // Video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
    const hasVideo = stream.getVideoTracks().some(isLive);
    setRemoteCamOn(hasVideo);
    startRemoteVAD(stream);
  }, [startRemoteVAD]);

  // ── sync local preview ────────────────────────────────────────────────────
  const syncLocalPreview = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, []);

  // ── local media ───────────────────────────────────────────────────────────
  const getLocalStream = useCallback(async (wantVideo = false, facing = 'user') => {
    let stream = localStreamRef.current;
    try {
      setCameraError(null);
      if (!stream || !stream.getAudioTracks().some(isLive)) {
        stream?.getTracks().forEach(t => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      }
      let vTrack = stream.getVideoTracks().find(isLive) || null;
      if (wantVideo && !vTrack) {
        setCameraLoading(true);
        try {
          const vs = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: facing }, audio: false,
          });
          vTrack = vs.getVideoTracks()[0] || null;
          if (vTrack) {
            stream.addTrack(vTrack);
            vTrack.onended = () => {
              try { localStreamRef.current?.removeTrack(vTrack); } catch {}
              setCamOn(false);
              syncPC(null, 'video');
            };
          }
        } finally {
          setCameraLoading(false);
        }
      }
      if (!wantVideo && vTrack) {
        stream.getVideoTracks().forEach(t => { t.stop(); try { stream.removeTrack(t); } catch {}; });
        vTrack = null;
      }
      localStreamRef.current = stream;
      syncLocalPreview();
      setCamOn(Boolean(vTrack));
      return stream;
    } catch (err) {
      console.error('getLocalStream error:', err);
      setCameraLoading(false);
      let errorMsg = 'Không thể truy cập camera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Bạn từ chối cấp quyền camera';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Không tìm thấy camera';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera bị ứng dụng khác sử dụng';
      }
      setCameraError(errorMsg);
      setCamOn(false);
      throw err;
    }
  }, [syncLocalPreview]);

  // ── sync PC tracks ────────────────────────────────────────────────────────
  const syncPC = useCallback(async (forcedVideoTrack, kind) => {
    const pc = pcRef.current;
    if (!pc) return;
    const stream = localStreamRef.current;
    if (kind === 'video' || kind === undefined) {
      const vTrack = forcedVideoTrack !== undefined
        ? forcedVideoTrack
        : (screenStreamRef.current?.getVideoTracks().find(isLive) || stream?.getVideoTracks().find(isLive) || null);
      await pc.__videoSender?.replaceTrack(vTrack || null);
    }
    if (kind === 'audio' || kind === undefined) {
      const aTrack = stream?.getAudioTracks().find(isLive) || null;
      await pc.__audioSender?.replaceTrack(aTrack);
    }
  }, []);

  // ── create PeerConnection ─────────────────────────────────────────────────
  const createPC = useCallback((targetId) => {
    if (pcRef.current) { try { pcRef.current.close(); } catch {} }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const at = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const vt = pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.__audioSender = at.sender;
    pc.__videoSender = vt.sender;
    pcRef.current = pc;
    remotePeerIdRef.current = targetId;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) socket.emit('ice_candidate', { to: targetId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      const s = streams?.[0];
      if (!s) return;
      attachRemoteStream(s);
      setStatus('active');
      // sync deafen state
      if (remoteAudioRef.current) remoteAudioRef.current.muted = false;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setReconnecting(false);
        setStatus('active');
      }
      if (['disconnected', 'failed'].includes(pc.connectionState)) {
        setReconnecting(true);
      }
    };

    return pc;
  }, [socket, attachRemoteStream]);

  // ── end / leave ───────────────────────────────────────────────────────────
  const doEndCall = useCallback((reason = 'left', opts = {}) => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    clearInterval(durationRef.current);
    clearTimeout(controlsTimerRef.current);
    if (vadRef.current) { vadRef.current(); vadRef.current = null; }

    const skipNotify = Boolean(opts.skipNotify);
    if (socket && callId && !skipNotify) {
      const peerId = remotePeerIdRef.current;
      if (peerId) {
        socket.emit('end_call', { to: peerId, callId, conversationId });
      } else {
        socket.emit('leave_call', { callId, conversationId });
      }
    }
    if (socket && callId && durationCountRef.current > 0) {
      socket.emit('call_summary', {
        callType: callTypeRef.current || 'audio',
        status: 'ended',
        duration: durationCountRef.current,
        conversationId,
      });
    }

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }

    setEndReason(reason);
    setStatus('ended');
  }, [callId, conversationId, socket]);

  // ── navigate back after ended ─────────────────────────────────────────────
  useEffect(() => {
    if (status === 'ended') {
      const t = setTimeout(() => navigate(returnUrl, { replace: true }), 4000);
      return () => clearTimeout(t);
    }
  }, [status, navigate, returnUrl]);

  // ── duration timer ────────────────────────────────────────────────────────
  const startTimer = useCallback((from = null) => {
    clearInterval(durationRef.current);
    const base = from ? elapsedSec(from) : 0;
    setDuration(base);
    durationCountRef.current = base;
    durationRef.current = setInterval(() => {
      durationCountRef.current += 1;
      setDuration(d => d + 1);
    }, 1000);
  }, []);

  // ── INIT on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !callId || !conversationId || !myUserId) return;

    const init = async () => {
      try { await getLocalStream(callType === 'video'); } catch {}

      // ── Check sessionStorage: callee nhận offer ──
      let storedPending = null;
      try {
        const raw = sessionStorage.getItem('lumi:pendingOffer');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.callId === callId && Date.now() - parsed.timestamp < 40_000) {
            storedPending = parsed;
          }
          sessionStorage.removeItem('lumi:pendingOffer');
        }
      } catch {}

      // Ignore stored pending group offers — only 1-1 calls supported

      if (storedPending) {
        // CALLEE: có offer chờ
        if (storedPending.skipIncomingUi) {
          // Callee đã accept từ CallManager → auto-answer
          setStatus('connecting');
          try {
            const pc = createPC(storedPending.from);
            const stream = localStreamRef.current || await getLocalStream((storedPending.callType || callType) === 'video');
            await pc.__audioSender.replaceTrack(stream.getAudioTracks().find(isLive) || null);
            await pc.__videoSender.replaceTrack(stream.getVideoTracks().find(isLive) || null);
            if (pc.signalingState !== 'stable') {
              console.warn('Auto-answer: pc not stable, aborting auto-answer for', storedPending.from);
              throw new Error('pc not stable');
            }
            await pc.setRemoteDescription(new RTCSessionDescription(storedPending.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('accept_call', {
              to: storedPending.from,
              answer,
              callId,
              conversationId: storedPending.conversationId || conversationId,
            });
            setPeer({
              id: storedPending.from,
              username: storedPending.fromUser?.username,
              avatar: storedPending.fromUser?.avatar,
            });
            remotePeerIdRef.current = storedPending.from;
            startTimer(null);
            setStatus('active');
          } catch (err) {
            console.error('Auto-answer error:', err);
            doEndCall('error');
          }
        } else {
          // Callee chưa trả lời → hiện UI Accept/Reject
          setPendingOffer(storedPending);
          setStatus('waiting_accept');
        }
        return;
      }

      // ── CALLER: không có offer trong storage → check active call ──
      // Lưu peer info từ sessionStorage nếu có (CallManager lưu khi navigate)
      try {
        const rawCallerInfo = sessionStorage.getItem('lumi:callerPeerInfo');
        if (rawCallerInfo) {
          const info = JSON.parse(rawCallerInfo);
          if (info.callId === callId) {
            setCallerPeerInfo(info.peerInfo);
            setCallerWaiting(true);
            setStatus('outgoing');
          }
          sessionStorage.removeItem('lumi:callerPeerInfo');
        }
      } catch {}

      socket.emit('check_active_call', { conversationId });
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callId, conversationId, myUserId, isGroupRoute]);

  // ── Accept pending offer (callee bấm Chấp nhận) ──────────────────────────
  const handleAcceptPending = useCallback(async () => {
    if (!pendingOffer || !socket) return;
    const offer = pendingOffer;
    setPendingOffer(null);
    setStatus('connecting');
    try {
      const stream = localStreamRef.current || await getLocalStream((offer.callType || callType) === 'video');
      const pc = createPC(offer.from);
      await pc.__audioSender.replaceTrack(stream.getAudioTracks().find(isLive) || null);
      await pc.__videoSender.replaceTrack(stream.getVideoTracks().find(isLive) || null);
      if (pc.signalingState !== 'stable') {
        console.warn('handleAcceptPending: pc not stable, skipping setRemoteDescription');
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('accept_call', {
        to: offer.from,
        answer,
        callId,
        conversationId: offer.conversationId || conversationId,
      });
      setPeer({ id: offer.from, username: offer.fromUser?.username, avatar: offer.fromUser?.avatar });
      remotePeerIdRef.current = offer.from;
      startTimer(null);
      setStatus('active');
    } catch (err) {
      console.error('Accept error:', err);
      doEndCall('error');
    }
  }, [callId, callType, conversationId, createPC, doEndCall, getLocalStream, pendingOffer, socket, startTimer]);

  // ── Reject pending offer ──────────────────────────────────────────────────
  const handleRejectPending = useCallback(() => {
    if (!pendingOffer || !socket) return;
    socket.emit('reject_call', { to: pendingOffer.from, reason: 'User declined', callId, conversationId });
    setPendingOffer(null);
    navigate(returnUrl, { replace: true });
  }, [callId, conversationId, navigate, pendingOffer, returnUrl, socket]);

  // ── socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onActiveCallExists = async ({ callId: cid, callType: ct, participants, startedAt, wasParticipant }) => {
      if (cid !== callId) return;
      if (ct) callTypeRef.current = ct;
      if (startedAt) startedAtRef.current = startedAt;
      const knownIds = Array.isArray(participants) ? participants.map(String) : [];
      const wasIn = typeof wasParticipant === 'boolean' ? wasParticipant : knownIds.includes(String(myUserId));
      if (wasIn) {
        socket.emit('rejoin_call', { callId, conversationId });
      } else {
        socket.emit('join_existing_call', { callId, conversationId });
      }
    };

    const onNoActiveCall = ({ conversationId: cid }) => {
      if (cid !== conversationId) return;
      if (statusRef.current === 'outgoing') return; // caller đang chờ, đừng end
      if (pendingOffer) return;
      setEndReason('not_found');
      setStatus('ended');
    };

    const onCallPeers = async ({ callId: cid, peers: peerIds, callType: ct, startedAt }) => {
      if (cid !== callId) return;
      if (ct) callTypeRef.current = ct;
      if (startedAt) startedAtRef.current = startedAt;

      // Filter bỏ self
      const remotePeers = (peerIds || []).filter(id => String(id) !== String(myUserId));
      setStatus('active');
      setReconnecting(false);
      setCallerWaiting(false);

      if (!localStreamRef.current) await getLocalStream(ct === 'video');

      for (const pid of remotePeers) {
        if (!pid) continue;
        const pc = createPC(pid);
        const stream = localStreamRef.current;
        if (stream) {
          await pc.__audioSender.replaceTrack(stream.getAudioTracks().find(isLive) || null);
          await pc.__videoSender.replaceTrack(stream.getVideoTracks().find(isLive) || null);
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call_user', { to: pid, offer, callType: ct, callId, conversationId, isGroup: false });
      }
      startTimer(startedAt);
    };

    // Caller: nhận được call_accepted → caller vào room thực sự ở đây
    const onCallAccepted = async ({ from, answer, callId: cid, startedAt }) => {
      if (cid !== callId) return;

      // Nếu caller đang ở trạng thái outgoing (chờ callee accept)
      if (statusRef.current === 'outgoing') {
        setCallerWaiting(false);
        setStatus('connecting');

        // Lấy PC đã tạo sẵn từ startCall (qua CallManager → DirectCallRoom)
        // Nếu chưa có PC (trường hợp navigate sang đây sau khi callee accept), tạo mới và gửi offer
        let pc = pcRef.current;
        if (!pc) {
          // Trường hợp caller navigate sang DirectCallRoom sau khi callee accept
          // Cần tạo PC và gửi offer lại
          if (!localStreamRef.current) await getLocalStream(callTypeRef.current === 'video');
          pc = createPC(from);
          const stream = localStreamRef.current;
          await pc.__audioSender.replaceTrack(stream?.getAudioTracks().find(isLive) || null);
          await pc.__videoSender.replaceTrack(stream?.getVideoTracks().find(isLive) || null);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call_user', { to: from, offer, callType: callTypeRef.current, callId, conversationId, isGroup: false });
          remotePeerIdRef.current = from;
          if (startedAt) startedAtRef.current = startedAt;
          startTimer(startedAt);
          return;
        }

        // Nếu đã có PC rồi → set remote description với answer
        try {
          if (pc.signalingState !== 'have-local-offer') {
            console.warn('onCallAccepted (DirectCallRoom): pc not in have-local-offer, skipping setRemoteDescription', pc.signalingState);
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          remotePeerIdRef.current = from;
          if (startedAt) startedAtRef.current = startedAt;
          startTimer(startedAt);
        } catch (e) { console.error('caller setRemoteDescription error:', e); }
        return;
      }

      // Active state: renegotiate
      if (pcRef.current) {
        try {
          if (!pcRef.current) return;
          if (pcRef.current.signalingState !== 'have-local-offer') {
            console.warn('onCallAccepted (DirectCallRoom active): pcRef not in have-local-offer, skipping');
            return;
          }
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch {}
      }
    };

    const onIncomingCall = async (data) => {
      if (data.callId !== callId) return;
      // Reoffer trong khi đang active (renegotiate)
      if (data.isReoffer || statusRef.current === 'active') {
        let pc = pcRef.current;
        if (!pc) {
          if (!localStreamRef.current) await getLocalStream((data.callType || callTypeRef.current) === 'video');
          pc = createPC(data.from);
          const stream = localStreamRef.current;
          await pc.__audioSender.replaceTrack(stream?.getAudioTracks().find(isLive) || null);
          await pc.__videoSender.replaceTrack(stream?.getVideoTracks().find(isLive) || null);
        }
        try {
          if (pc.signalingState !== 'stable') {
            console.warn('onIncomingCall reoffer: pc not stable, skipping reoffer from', data.from);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('accept_call', { to: data.from, answer, callId, conversationId });
          }
        } catch (e) { console.error('incoming reoffer:', e); }
        setStatus('active');
        startTimer(startedAtRef.current);
      }
    };

    const onPeerLeft = ({ from, callId: cid }) => {
      if (cid !== callId) return;
      doEndCall('ended', { skipNotify: true });
    };

    const onCallEnded = ({ callId: cid }) => {
      if (cid && cid !== callId) return;
      doEndCall('ended', { skipNotify: true });
    };

    const onNotFound = ({ callId: cid }) => {
      if (cid && cid !== callId) return;
      setEndReason('not_found');
      setStatus('ended');
    };

    const onIce = async ({ from, candidate }) => {
      if (!pcRef.current || !candidate) return;
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };
    // Tìm onVideoToggle:
    const onVideoToggle = ({ from, enabled }) => {
      if (String(from) !== String(remotePeerIdRef.current)) return;
      setRemoteCamOn(Boolean(enabled));
      
      // Trigger re-attach video element nếu peer bật cam
      if (enabled && remoteVideoRef.current) {
        const stream = remoteVideoRef.current.srcObject;
        if (stream) {
          // Re-attach để đảm bảo video element hiển thị track mới
          remoteVideoRef.current.srcObject = null;
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.play().catch(() => {});
            }
          }, 100);
        }
      }
    };

    const onAudioToggle = ({ from, enabled }) => {
      if (String(from) !== String(remotePeerIdRef.current)) return;
      setRemoteMicOn(Boolean(enabled));
      if (!enabled) setRemoteSpeaking(false);
    };

    const onSpeaking = ({ from, speaking: s, callId: cid }) => {
      if (cid && cid !== callId) return;
      if (String(from) !== String(remotePeerIdRef.current)) return;
      setRemoteSpeaking(Boolean(s));
    };

    const onPeerReconnecting = ({ from, callId: cid }) => {
      if (cid !== callId) return;
      setReconnecting(true);
    };

    socket.on('active_call_exists', onActiveCallExists);
    socket.on('no_active_call', onNoActiveCall);
    socket.on('call_peers', onCallPeers);
    socket.on('call_join_approved', onCallPeers);
    socket.on('incoming_call', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('peer_left_call', onPeerLeft);
    socket.on('active_call_ended', onCallEnded);
    socket.on('call_ended', onCallEnded);
    socket.on('call_not_found', onNotFound);
    socket.on('call_not_started', onNotFound);
    socket.on('ice_candidate', onIce);
    socket.on('peer_video_toggle', onVideoToggle);
    socket.on('peer_audio_toggle', onAudioToggle);
    socket.on('peer_speaking_state', onSpeaking);
    socket.on('peer_reconnecting', onPeerReconnecting);

    return () => {
      socket.off('active_call_exists', onActiveCallExists);
      socket.off('no_active_call', onNoActiveCall);
      socket.off('call_peers', onCallPeers);
      socket.off('call_join_approved', onCallPeers);
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('peer_left_call', onPeerLeft);
      socket.off('active_call_ended', onCallEnded);
      socket.off('call_ended', onCallEnded);
      socket.off('call_not_found', onNotFound);
      socket.off('call_not_started', onNotFound);
      socket.off('ice_candidate', onIce);
      socket.off('peer_video_toggle', onVideoToggle);
      socket.off('peer_audio_toggle', onAudioToggle);
      socket.off('peer_speaking_state', onSpeaking);
      socket.off('peer_reconnecting', onPeerReconnecting);
    };
  }, [socket, callId, conversationId, myUserId, createPC, getLocalStream, startTimer, doEndCall, pendingOffer]);

  // ── socket reconnect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      if (statusRef.current === 'active') {
        setReconnecting(true);
        socket.emit('rejoin_call', { callId, conversationId });
      }
    };
    socket.on('reconnect', onReconnect);
    return () => socket.off('reconnect', onReconnect);
  }, [socket, callId, conversationId]);

  // ── deafen sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = deafened;
  }, [deafened]);

  // ── controls ──────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
    if (!next) socket?.emit('speaking_state', { callId, speaking: false, lastSpokeAt: Date.now() });
    if (remotePeerIdRef.current) socket?.emit('toggle_audio', { to: remotePeerIdRef.current, enabled: next, callId });
  };

  const toggleCam = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    if (camOn) {
      stream.getVideoTracks().forEach(t => { t.stop(); try { stream.removeTrack(t); } catch {}; });
      await syncPC(null, 'video');
      syncLocalPreview();
      setCamOn(false);
      if (remotePeerIdRef.current) socket?.emit('toggle_video', { to: remotePeerIdRef.current, enabled: false, callId });
    } else {
      try {
        setCameraError(null);
        await getLocalStream(true, facingRef.current);
        await syncPC(undefined, 'video');
        if (remotePeerIdRef.current) socket?.emit('toggle_video', { to: remotePeerIdRef.current, enabled: true, callId });
      } catch (err) {
        console.error('Lỗi bật camera:', err);
        // getLocalStream đã set error message
      }
    }
  };

  const toggleDeafen = () => {
    const next = !deafened;
    setDeafened(next);
    if (next && micOn) {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
      setMicOn(false);
      if (remotePeerIdRef.current) socket?.emit('toggle_audio', { to: remotePeerIdRef.current, enabled: false, callId });
    }
    if (remotePeerIdRef.current) socket?.emit('toggle_deafen', { to: remotePeerIdRef.current, deafened: next, callId });
  };

  const toggleScreenShare = async () => {
    if (screenShare) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenShare(false);
      await syncPC(undefined, 'video');
      if (remotePeerIdRef.current) socket?.emit('screen_share_stopped', { to: remotePeerIdRef.current, conversationId, callId });
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
        screenStreamRef.current = ss;
        const track = ss.getVideoTracks()[0];
        await syncPC(track, 'video');
        if (screenVideoRef.current) screenVideoRef.current.srcObject = ss;
        track.onended = async () => {
          setScreenShare(false);
          screenStreamRef.current = null;
          await syncPC(undefined, 'video');
          if (remotePeerIdRef.current) socket?.emit('screen_share_stopped', { to: remotePeerIdRef.current, conversationId, callId });
        };
        setScreenShare(true);
        if (remotePeerIdRef.current) socket?.emit('screen_share_started', { to: remotePeerIdRef.current, conversationId, callId });
      } catch {}
    }
  };

  const flipCamera = async () => {
    if (!camOn || !localStreamRef.current) return;
    const newFacing = facingRef.current === 'user' ? 'environment' : 'user';
    facingRef.current = newFacing;
    localStreamRef.current.getVideoTracks().forEach(t => { t.stop(); try { localStreamRef.current.removeTrack(t); } catch {}; });
    await getLocalStream(true, newFacing);
    await syncPC(undefined, 'video');
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  // Callee chưa answer
  if (status === 'waiting_accept' && pendingOffer) {
    return (
      <div className="fixed inset-0 bg-[#13141f] z-50">
        <IncomingCallOverlay
          callerInfo={pendingOffer.fromUser}
          callType={pendingOffer.callType || callType}
          onAccept={handleAcceptPending}
          onReject={handleRejectPending}
        />
      </div>
    );
  }

  // Caller đang chờ callee accept (OutgoingCallScreen kiểu Zalo)
  if (status === 'outgoing' && callerWaiting) {
    return (
      <div className="fixed inset-0 bg-[#13141f] z-50">
        <OutgoingCallScreen
          peerInfo={callerPeerInfo}
          callType={callType}
          onCancel={() => doEndCall('cancelled')}
          localVideoRef={localVideoRef}
        />
        <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
      </div>
    );
  }

  // Ended
  if (status === 'ended') {
    const msgs = {
      ended: 'Cuộc gọi đã kết thúc',
      not_found: 'Cuộc gọi không tồn tại',
      left: 'Bạn đã rời cuộc gọi',
      cancelled: 'Cuộc gọi đã bị huỷ',
      error: 'Có lỗi xảy ra',
    };
    return (
      <div className="fixed inset-0 bg-[#13141f] flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <PhoneOff className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white font-bold text-xl">{msgs[endReason] || msgs.ended}</p>
          <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-2xl">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-mono font-bold text-xl">{fmt(durationCountRef.current)}</span>
          </div>
          <p className="text-white/40 text-sm">Đang chuyển về trang chat...</p>
          <button onClick={() => navigate(returnUrl, { replace: true })}
            className="px-6 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition">
            Về ngay
          </button>
        </div>
      </div>
    );
  }

  // Connecting
  if (status === 'connecting') {
    return (
      <div className="fixed inset-0 bg-[#13141f] flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-400/30 border-t-blue-400 animate-spin" />
          <p className="text-white font-bold text-xl">Đang kết nối...</p>
          <button onClick={() => doEndCall('cancelled')}
            className="mt-4 px-6 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-400 rounded-xl transition">
            Huỷ
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE CALL — layout kiểu Zalo/Messenger ──────────────────────────────
  const peerInfo = peer || {};
  const peerName = getName(peerInfo);
  const isVideoCall = callType === 'video';
  // [BUG FIX] Kiểm tra stream tracks thực tế thay vì state, để tránh delay khi remoteCamOn update
  const remoteHasVideo = remoteCamOn || (remoteVideoRef.current?.srcObject?.getVideoTracks?.().some(isLive) ?? false);
  const showRemoteVideo = remoteHasVideo;
  const showScreenShare = screenShare;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col select-none ${fullscreen ? '' : ''}`}
      style={{ background: showRemoteVideo || showScreenShare ? '#000' : 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
      onPointerMove={showControls}
      onPointerDown={showControls}
    >
      {/* Hidden audio cho remote */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={deafened} className="hidden" />

      {/* ── FULLSCREEN REMOTE ── */}
      {showRemoteVideo ? (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        /* Audio call hoặc remote tắt cam → hiện avatar lớn giữa màn */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 opacity-40"
            style={{ background: `radial-gradient(ellipse at center, ${getColor(peerName).replace('bg-', '')} 0%, transparent 70%)` }} />

          <Avatar
            member={peerInfo}
            size={120}
            ring
            speaking={remoteSpeaking}
            className="z-10"
          />
          <div className="z-10 text-center">
            <p className="text-white text-2xl font-bold">{peerName}</p>
            {!remoteMicOn && (
              <div className="flex items-center gap-2 justify-center mt-2 bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full">
                <MicOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300 text-xs">Đã tắt mic</span>
              </div>
            )}
            {remoteSpeaking && remoteMicOn && (
              <div className="flex gap-1 items-end h-5 mt-3 justify-center">
                {[5, 9, 13, 9, 5].map((h, i) => (
                  <div key={i} className="w-1.5 bg-green-400 rounded-full animate-bounce"
                    style={{ height: h, animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay gradient phía trên + dưới để đọc text dễ hơn */}
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
      <div className={`absolute inset-x-0 bottom-0 pointer-events-none transition-all duration-300 ${controlsVisible ? 'h-48' : 'h-0'}`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }} />

      {/* ── TOP BAR ── */}
      <div className={`relative z-10 flex items-center justify-between px-4 pt-safe pt-4 pb-3 transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="flex items-center gap-3">
          {/* Down arrow → thu nhỏ / về chat */}
          <button onClick={() => navigate(returnUrl)}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition">
            <ChevronDown className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{peerName}</p>
            <div className="flex items-center gap-1.5">
              {reconnecting ? (
                <span className="text-orange-400 text-xs flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" /> Đang kết nối lại...
                </span>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-mono text-xs font-bold">{fmt(duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button onClick={() => setFullscreen(v => !v)}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition">
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ── LOCAL PiP (góc phải dưới) ── */}
      {(camOn || screenShare) && (
        <div className={`absolute bottom-36 right-4 z-20 transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20
          ${controlsVisible ? 'opacity-100' : 'opacity-70'}
          ${isVideoCall ? 'w-28 h-40' : 'w-24 h-32'}`}
          style={{ background: '#1a1b27' }}>
          <video ref={localVideoRef} autoPlay playsInline muted
            className={`w-full h-full object-cover ${facingRef.current === 'user' && !screenShare ? 'scale-x-[-1]' : ''}`} />
          {cameraLoading && camOn && !screenShare && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                <span className="text-blue-300 text-[10px] font-medium whitespace-nowrap">Đang bật cam</span>
              </div>
            </div>
          )}
          {camOn && (
            <button onClick={flipCamera}
              className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition">
              <RotateCcw className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      )}

      {/* ── CONTROL BAR (bottom) ── */}
      <div className={`absolute inset-x-0 bottom-0 z-20 pb-8 pt-4 px-6 transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {/* Status hint */}
        <div className="flex items-center justify-center gap-3 mb-4 text-xs h-4">
          {deafened && <span className="flex items-center gap-1 text-orange-400"><EarOff className="w-3 h-3" />Tắt nghe</span>}
          {!micOn && !deafened && <span className="flex items-center gap-1 text-red-400"><MicOff className="w-3 h-3" />Mic tắt</span>}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-6">
          <Btn
            icon={micOn ? Mic : MicOff}
            label={micOn ? 'Tắt mic' : 'Bật mic'}
            active={micOn}
            onClick={toggleMic}
          />
          <Btn
            icon={deafened ? EarOff : Headphones}
            label={deafened ? 'Bỏ tắt nghe' : 'Tắt nghe'}
            active={!deafened}
            onClick={toggleDeafen}
          />
          {isVideoCall && (
            <Btn
              icon={camOn ? Video : VideoOff}
              label={camOn ? 'Tắt cam' : 'Bật cam'}
              active={camOn}
              onClick={toggleCam}
            />
          )}
          {/* End call — nút lớn hơn màu đỏ */}
          <div className="flex flex-col items-center gap-1.5">
            <button onClick={() => doEndCall('left')}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all">
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-[10px] text-white/60 font-medium">Kết thúc</span>
          </div>
        </div>
      </div>
    </div>
  );
}
