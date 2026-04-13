import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Headphones, EarOff, Users,
  RotateCcw, Maximize2, Minimize2, Clock, WifiOff,
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

// ─── KEY lưu trạng thái call qua reload ──────────────────────────────────────
// [BUG3 FIX] Dùng sessionStorage để persist cam/screen state qua reload
const CALL_STATE_KEY = 'lumi:callState';

function saveCallState(callId, state) {
  try {
    sessionStorage.setItem(CALL_STATE_KEY, JSON.stringify({ callId, ...state, savedAt: Date.now() }));
  } catch {}
}

function loadCallState(callId) {
  try {
    const raw = sessionStorage.getItem(CALL_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Chỉ restore nếu cùng callId và còn mới (< 30s)
    if (parsed.callId !== callId) return null;
    if (Date.now() - parsed.savedAt > 30_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearCallState() {
  try { sessionStorage.removeItem(CALL_STATE_KEY); } catch {}
}

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
function Avatar({ member, size = 80, className = '' }) {
  const [failed, setFailed] = useState(false);
  const name  = getName(member);
  const color = getColor(name);
  const src   = !failed ? fileUrl(getAvatar(member)) : '';

  useEffect(() => setFailed(false), [member?.avatar, member?.username]);

  if (src) {
    return (
      <img src={src} alt={name} onError={() => setFailed(true)}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className={`${color} rounded-full flex items-center justify-center font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Participant tile ─────────────────────────────────────────────────────────
// [BUG2 FIX] Thêm camOn vào dependency của useEffect gán srcObject
//            để video element được cập nhật ngay khi bật/tắt cam
function Tile({ member, isSelf, stream, micOn, camOn, speaking, leaving, screenSharing, deafenRemote, className = '', cameraLoading = false }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // [BUG2 FIX] Gán srcObject khi stream HOẶC camOn thay đổi
  useEffect(() => {
    if (!videoRef.current || !stream) {
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    const attach = () => {
      const hasVideo = stream.getVideoTracks().some(isLive);
      if ((camOn || screenSharing) && hasVideo) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch(() => {});
      } else if (!isSelf) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
      } else {
        videoRef.current.srcObject = null;
      }
    };

    attach();

    // Lắng nghe khi stream có track mới (peer bật camera)
    try {
      stream.addEventListener('addtrack', attach);
    } catch (e) {
      try { stream.onaddtrack = attach; } catch (err) {}
    }

    return () => {
      try { stream.removeEventListener('addtrack', attach); } catch (e) {
        try { if (stream.onaddtrack === attach) stream.onaddtrack = null; } catch (err) {}
      }
    };
  }, [stream, camOn, screenSharing, isSelf]);

  useEffect(() => {
    if (!audioRef.current || !stream || isSelf) return;
    audioRef.current.srcObject = stream;
    audioRef.current.muted = !!deafenRemote;
    audioRef.current.play().catch(() => {});
  }, [stream, isSelf, deafenRemote]);

  const showVideo = (camOn || screenSharing) && stream && stream.getVideoTracks().some(isLive);

  return (
    <div className={`relative rounded-xl overflow-hidden bg-[#1e2030] flex items-center justify-center
      transition-all duration-400
      ${leaving ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}
      ${speaking ? 'ring-2 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)]' : 'ring-1 ring-white/5'}
      ${className}`}
      style={{ minHeight: 140 }}
    >
      {!isSelf && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

      {/* [BUG2 FIX] Video luôn render trong DOM, ẩn/hiện qua CSS để tránh mất srcObject */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isSelf && !screenSharing ? 'scale-x-[-1]' : ''} ${showVideo ? 'block' : 'hidden'}`}
      />

      {!showVideo && (
        <div className="flex flex-col items-center gap-3">
          <div className={`ring-4 rounded-full transition-all duration-300 ${speaking ? 'ring-green-400 shadow-[0_0_24px_rgba(74,222,128,0.5)]' : 'ring-white/10'}`}>
            <Avatar member={member} size={80} />
          </div>
          {cameraLoading && isSelf && (
            <div className="flex items-center gap-2 bg-blue-500/40 px-3 py-1.5 rounded-full animate-pulse">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
              <span className="text-blue-200 text-xs font-medium">Đang bật camera...</span>
            </div>
          )}
          {camOn && isSelf && !cameraLoading && !showVideo && (
            <div className="flex items-center gap-1.5 bg-amber-500/40 px-3 py-1 rounded-full">
              <span className="text-amber-200 text-xs">Khởi động camera...</span>
            </div>
          )}
          {!micOn && !cameraLoading && (
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full">
              <MicOff className="w-3 h-3 text-red-400" />
              <span className="text-white/60 text-xs">Đã tắt mic</span>
            </div>
          )}
          {speaking && (
            <div className="flex gap-1 items-end h-5">
              {[4,8,12,8,4].map((h, i) => (
                <div key={i} className="w-1 bg-green-400 rounded-full animate-bounce"
                  style={{ height: h, animationDelay: `${i*0.12}s` }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-white text-xs font-semibold truncate">
          {getName(member)}{isSelf ? ' (Bạn)' : ''}
        </span>
        <div className="flex items-center gap-1">
          {screenSharing && <Monitor className="w-3.5 h-3.5 text-green-400" />}
          {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
          {!camOn && !screenSharing && <VideoOff className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>
      {speaking && <div className="absolute inset-0 rounded-xl ring-2 ring-green-400 pointer-events-none animate-pulse" />}
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────
function Btn({ onClick, icon: Icon, label, active = true, danger = false, disabled = false, badge, pulse = false }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} disabled={disabled} title={label}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
          ${danger
            ? 'bg-red-500 hover:bg-red-400 active:scale-95 text-white'
            : active
              ? 'bg-[#3a3d52] hover:bg-[#4a4d62] active:scale-95 text-white'
              : 'bg-[#f23f42] hover:bg-[#da373c] active:scale-95 text-white'
          }`}
      >
        <Icon className="w-5 h-5" />
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {badge}
          </span>
        )}
        {pulse && <span className="absolute inset-0 rounded-2xl ring-2 ring-green-400 animate-pulse pointer-events-none" />}
      </button>
      <span className="text-[10px] text-white/50 font-medium text-center leading-tight max-w-[60px]">{label}</span>
    </div>
  );
}

// ─── IncomingCallOverlay — hiện khi callee vào phòng lần đầu chưa answer ─────
function IncomingCallOverlay({ callerInfo, callType, onAccept, onReject }) {
  const callerName = getName(callerInfo);
  const color = getColor(callerName);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(24px)' }}>
      <div className="flex flex-col items-center gap-6 w-80">
        {/* Pulse rings */}
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          {[1,2,3].map(i => (
            <span key={i} className="absolute rounded-full border border-white/20 animate-ping"
              style={{ width: 80 + i*30, height: 80 + i*30, animationDelay: `${i*0.5}s`, animationDuration: '2.5s' }} />
          ))}
          {callerInfo?.avatar ? (
            <img src={fileUrl(callerInfo.avatar)} alt={callerName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20 z-10" />
          ) : (
            <div className={`w-24 h-24 ${color} rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 ring-white/20 z-10`}>
              {callerName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">
            {callType === 'video' ? '📹 Cuộc gọi nhóm video đến' : '📞 Cuộc gọi nhóm đến'}
          </p>
          <p className="text-white text-2xl font-bold">{callerName}</p>
          <p className="text-white/40 text-sm mt-1">đang mời bạn vào cuộc gọi nhóm</p>
        </div>

        <div className="flex gap-1 items-end h-8">
          {[10,18,26,18,10].map((h, i) => (
            <div key={i} className="w-1.5 bg-green-400/80 rounded-full animate-bounce"
              style={{ height: h, animationDelay: `${i*0.12}s` }} />
          ))}
        </div>

        <div className="flex gap-16 mt-2">
          <div className="flex flex-col items-center gap-2">
            <button onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all">
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-white/50 text-xs">Từ chối</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all">
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-white/50 text-xs">Chấp nhận</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CallRoom() {
  const { callId }           = useParams();
  const [searchParams]       = useSearchParams();
  const navigate             = useNavigate();
  const { socket }           = useSocket();
  const { user: currentUser }= useAuthStore();

  const conversationId = searchParams.get('conv');
  const callType       = searchParams.get('type') || 'audio';
  const isGroup        = searchParams.get('group') === '1';
  const returnUrl      = searchParams.get('return') || '/chat';

  const myUserId = getPid(currentUser);

  // FIX: Nếu không phải group call → redirect
  useEffect(() => {
    if (!isGroup) navigate(returnUrl, { replace: true });
  }, [isGroup, navigate, returnUrl]);

  // ── state ─────────────────────────────────────────────────────────────────
  const [status,        setStatus]        = useState('connecting');
  const [duration,      setDuration]      = useState(0);
  const [micOn,         setMicOn]         = useState(true);
  // [BUG3 FIX] Đọc trạng thái cam từ sessionStorage nếu có (reload giữ nguyên)
  const [camOn,         setCamOn]         = useState(() => {
    const saved = loadCallState(callId);
    if (saved?.camOn !== undefined) return saved.camOn;
    return callType === 'video';
  });
  const [deafened,      setDeafened]      = useState(false);
  // [BUG3 FIX] Đọc trạng thái screenShare từ sessionStorage nếu có
  const [screenShare,   setScreenShare]   = useState(() => {
    const saved = loadCallState(callId);
    return saved?.screenShare ?? false;
  });
  const [fullscreen,    setFullscreen]    = useState(false);
  const [leavingPeers,  setLeavingPeers]  = useState(new Set());
  const [remoteStreams,  setRemoteStreams] = useState({});
  const [peerStates,    setPeerStates]    = useState({});
  const [peers,         setPeers]         = useState([]);
  const [reconnecting,  setReconnecting]  = useState(false);
  const [endReason,     setEndReason]     = useState('');

  // Pending offer: callee chưa answer, hiện UI Accept/Reject
  const [pendingOffer,  setPendingOffer]  = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError,   setCameraError]   = useState(null);

  // ── refs ──────────────────────────────────────────────────────────────────
  const localStreamRef   = useRef(null);
  const screenStreamRef  = useRef(null);
  const pcMapRef         = useRef(new Map());
  const durationRef      = useRef(null);
  const localVideoRef    = useRef(null);
  const screenVideoRef   = useRef(null);
  const audioAnalysisRef = useRef(new Map());
  const audioCtxRef      = useRef(null);
  const startedAtRef     = useRef(null);
  const callTypeRef      = useRef(callType);
  const durationCountRef = useRef(0);
  const facingRef        = useRef('user');
  const callEndedRef     = useRef(false);
  const statusRef        = useRef(status);
  // [BUG3 FIX] Ref để track trạng thái hiện tại cho saveCallState
  const camOnRef         = useRef(camOn);
  const screenShareRef   = useRef(screenShare);

  useEffect(() => { statusRef.current = status; }, [status]);

  // [BUG3 FIX] Sync refs và lưu state vào sessionStorage mỗi khi camOn/screenShare thay đổi
  useEffect(() => {
    camOnRef.current = camOn;
    if (statusRef.current === 'active') {
      saveCallState(callId, { camOn, screenShare: screenShareRef.current });
    }
  }, [camOn, callId]);

  useEffect(() => {
    screenShareRef.current = screenShare;
    if (statusRef.current === 'active') {
      saveCallState(callId, { camOn: camOnRef.current, screenShare });
    }
  }, [screenShare, callId]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const updatePeerState = useCallback((userId, patch) => {
    setPeerStates(prev => {
      const cur = prev[userId] || { micOn: true, camOn: false, speaking: false, screenSharing: false };
      return { ...prev, [userId]: { ...cur, ...patch } };
    });
  }, []);

  const syncLocalPreview = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      // [BUG2 FIX] Chỉ gán lại nếu khác, và gọi play() để đảm bảo hiển thị
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  // ── VAD ───────────────────────────────────────────────────────────────────
  const stopVAD = useCallback((userId) => {
    const stop = audioAnalysisRef.current.get(userId);
    if (stop) { stop(); audioAnalysisRef.current.delete(userId); }
    updatePeerState(userId, { speaking: false });
  }, [updatePeerState]);

  const startVAD = useCallback((userId, stream) => {
    stopVAD(userId);
    if (!stream?.getAudioTracks().some(isLive)) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx   = audioCtxRef.current;
      const an    = ctx.createAnalyser();
      an.fftSize  = 256;
      const src   = ctx.createMediaStreamSource(stream);
      src.connect(an);
      const buf   = new Uint8Array(an.fftSize);
      let raf     = 0;
      let lastActive = 0;
      let prevSpeaking = false;
      let destroyed = false;
      const isSelf = userId === myUserId;

      const tick = () => {
        if (destroyed) return;
        an.getByteTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) {
          const n = (buf[i] - 128) / 128;
          rms += n * n;
        }
        rms = Math.sqrt(rms / buf.length);
        const now = Date.now();
        if (rms > 0.035) lastActive = now;
        const speaking = now - lastActive < 550;
        if (speaking !== prevSpeaking) {
          prevSpeaking = speaking;
          updatePeerState(userId, { speaking });
          if (isSelf && socket && callId) {
            socket.emit('speaking_state', { callId, speaking, lastSpokeAt: now });
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      audioAnalysisRef.current.set(userId, () => {
        destroyed = true;
        cancelAnimationFrame(raf);
        try { src.disconnect(); } catch {}
        try { an.disconnect(); } catch {}
      });
    } catch {}
  }, [callId, myUserId, socket, stopVAD, updatePeerState]);

  // ── local media ───────────────────────────────────────────────────────────
  const syncAllPCs = useCallback(async (forcedVideoTrack) => {
    const stream = localStreamRef.current;
    const aTrack = stream?.getAudioTracks().find(isLive) || null;
    const vTrack = forcedVideoTrack !== undefined
      ? forcedVideoTrack
      : (screenStreamRef.current?.getVideoTracks().find(isLive) || stream?.getVideoTracks().find(isLive) || null);
    const jobs = [];
    pcMapRef.current.forEach(pc => {
      jobs.push(Promise.allSettled([
        pc.__audioSender?.replaceTrack(aTrack),
        pc.__videoSender?.replaceTrack(vTrack),
      ]));
    });
    await Promise.allSettled(jobs);
  }, []);

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
              syncAllPCs(null);
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
      startVAD(myUserId, stream);
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
  }, [myUserId, startVAD, syncAllPCs, syncLocalPreview]);

  const syncPC = useCallback(async (pc, forcedVideoTrack) => {
    if (!pc) return;
    const stream = localStreamRef.current;
    const aTrack = stream?.getAudioTracks().find(isLive) || null;
    const vTrack = forcedVideoTrack !== undefined
      ? forcedVideoTrack
      : (screenStreamRef.current?.getVideoTracks().find(isLive) || stream?.getVideoTracks().find(isLive) || null);
    await Promise.allSettled([
      pc.__audioSender?.replaceTrack(aTrack),
      pc.__videoSender?.replaceTrack(vTrack),
    ]);
  }, []);

  // ── RTCPeerConnection ─────────────────────────────────────────────────────
  const createPC = useCallback((targetId) => {
    const old = pcMapRef.current.get(targetId);
    if (old) { try { old.close(); } catch {} }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const at = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const vt = pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.__audioSender = at.sender;
    pc.__videoSender = vt.sender;
    pcMapRef.current.set(targetId, pc);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) socket.emit('ice_candidate', { to: targetId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      const s = streams?.[0];
      if (!s) return;
      setRemoteStreams(prev => ({ ...prev, [targetId]: s }));
      updatePeerState(targetId, {
        camOn: s.getVideoTracks().some(isLive),
        micOn: s.getAudioTracks().some(isLive) ? true : undefined,
      });
      startVAD(targetId, s);
      setStatus('active');
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        updatePeerState(targetId, { reconnecting: false });
        setStatus('active');
      }
      if (['disconnected', 'failed'].includes(pc.connectionState)) {
        updatePeerState(targetId, { reconnecting: true });
      }
    };

    return pc;
  }, [socket, startVAD, updatePeerState]);

  // ── end / leave ───────────────────────────────────────────────────────────
  const doEndCall = useCallback((reason = 'left') => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    clearInterval(durationRef.current);
    // [BUG3 FIX] Xoá saved state khi kết thúc cuộc gọi
    clearCallState();

    if (socket && callId) {
      socket.emit('leave_call', { callId, conversationId });
      if (durationCountRef.current > 0) {
        socket.emit('call_summary', {
          callType: callTypeRef.current || 'audio',
          status: reason === 'ended' ? 'ended' : 'ended',
          duration: durationCountRef.current,
          conversationId,
        });
      }
    }

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    pcMapRef.current.forEach(pc => { try { pc.close(); } catch {}; });
    pcMapRef.current.clear();
    audioAnalysisRef.current.forEach(fn => fn());
    audioAnalysisRef.current.clear();

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

  // ── init on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !callId || !conversationId || !myUserId || !isGroup) return;

    const init = async () => {
      // [BUG3 FIX] Đọc trạng thái đã lưu từ reload
      const savedState = loadCallState(callId);
      const wantCam = savedState?.camOn ?? (callType === 'video');
      const wantScreen = savedState?.screenShare ?? false;

      // Lấy media sẵn — restore cam nếu trước đó đang bật
      try { await getLocalStream(wantCam); } catch {}

      // [BUG3 FIX] Restore screen share nếu đang bật trước reload
      // Note: getDisplayMedia cần user gesture, nên chỉ restore cam thôi.
      // Screen share sẽ bị tắt sau reload nhưng state được reset đúng.
      if (wantScreen && screenStreamRef.current === null) {
        // Screen stream bị mất sau reload (không thể restore tự động)
        // Reset state về false để đồng bộ
        setScreenShare(false);
        saveCallState(callId, { camOn: wantCam, screenShare: false });
      }

      // Kiểm tra pending offer (callee đến từ IncomingCallScreen → acceptCallInRoom)
      let pendingOffer = null;
      try {
        const raw = sessionStorage.getItem('lumi:pendingOffer');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.callId === callId && Date.now() - parsed.timestamp < 30_000) {
            pendingOffer = parsed;
          }
        }
      } catch {}

      if (pendingOffer?.isGroup === false) {
        try {
          sessionStorage.setItem('lumi:pendingOffer', JSON.stringify(pendingOffer));
        } catch {}
        const p = new URLSearchParams({
          conv: String(pendingOffer.conversationId || conversationId),
          type: pendingOffer.callType || callType,
          group: '0',
          return: returnUrl,
        });
        navigate(`/call/${callId}?${p.toString()}`, { replace: true });
        return;
      }

      if (pendingOffer) {
        try {
          sessionStorage.removeItem('lumi:pendingOffer');
        } catch {}
        setPendingOffer(pendingOffer);
        setStatus('waiting_accept');
        return;
      }

      // Caller hoặc rejoin: check server
      socket.emit('check_active_call', { conversationId });
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callId, conversationId, myUserId, navigate, returnUrl, callType]);

  // ── Accept pending offer (callee bấm Chấp nhận) ──────────────────────────
  const handleAcceptPending = useCallback(async () => {
    if (!pendingOffer || !socket) return;
    const offer = pendingOffer;
    setPendingOffer(null);
    setStatus('connecting');

    try {
      if (!localStreamRef.current) await getLocalStream((offer.callType || callType) === 'video');
      const pc = createPC(offer.from);
      await syncPC(pc);
      await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('accept_call', {
        to: offer.from,
        answer,
        callId,
        conversationId: offer.conversationId || conversationId,
      });
      setPeers([{ id: offer.from, username: offer.fromUser?.username, avatar: offer.fromUser?.avatar }]);
      startTimer(null);
      setStatus('active');
    } catch (err) {
      console.error('Accept group call error:', err);
      doEndCall('error');
    }
  }, [callId, callType, conversationId, createPC, doEndCall, getLocalStream, pendingOffer, socket, startTimer, syncPC]);

  // ── Reject pending offer (callee bấm Từ chối) ────────────────────────────
  const handleRejectPending = useCallback(() => {
    if (!pendingOffer || !socket) return;
    socket.emit('reject_call', {
      to: pendingOffer.from,
      reason: 'User declined',
      callId,
      conversationId,
    });
    setPendingOffer(null);
    navigate(returnUrl, { replace: true });
  }, [callId, conversationId, navigate, pendingOffer, returnUrl, socket]);

  // ── socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onActiveCallExists = async ({ callId: cid, callType: ct, participants, startedAt: sa, wasParticipant }) => {
      if (cid !== callId) return;
      if (ct) callTypeRef.current = ct;
      if (sa) { startedAtRef.current = sa; }
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
      if (pendingOffer) return;
      setEndReason('not_found');
      setStatus('ended');
    };

    // [BUG1 FIX] onCallPeers: fetch thông tin user thật từ server thay vì hardcode 'Thành viên'
    // Server nên trả về peers dưới dạng object { id, username, avatar } trong call_peers event.
    // Nếu server chỉ trả về array of userId strings, ta emit thêm 'get_call_participants' để lấy info.
    const onCallPeers = async ({ callId: cid, peers: peerIds, peerInfos, callType: ct, startedAt: sa }) => {
      if (cid !== callId) return;
      if (ct) callTypeRef.current = ct;
      if (sa) startedAtRef.current = sa;
      setStatus('active');
      setReconnecting(false);

      // [BUG1 FIX] peerInfos là map { userId: { username, avatar } } nếu server gửi kèm.
      // Nếu không có peerInfos, emit socket để request thông tin người dùng.
      const infoMap = peerInfos || {};

      setPeers((prev) => {
        const byId = new Map(prev.map((p) => [String(p.id), p]));
        for (const rawId of peerIds || []) {
          const pid = String(rawId || '');
          if (!pid || pid === String(myUserId)) continue;
          if (!byId.has(pid)) {
            // [BUG1 FIX] Dùng thông tin từ infoMap nếu có, fallback về 'Thành viên' chỉ khi không có
            const info = infoMap[pid] || {};
            byId.set(pid, {
              id: pid,
              username: info.username || info.name || null, // null → sẽ fetch sau
              avatar: info.avatar || undefined,
            });
          }
        }
        return [...byId.values()].filter((p) => String(p.id) !== String(myUserId));
      });

      // [BUG1 FIX] Emit để server trả về thông tin user nếu thiếu
      if (peerIds?.length && !peerInfos) {
        socket.emit('get_participants_info', {
          callId,
          userIds: peerIds.filter(id => String(id) !== String(myUserId)),
        });
      }

      if (!localStreamRef.current) await getLocalStream(ct === 'video');

      for (const pid of (peerIds || [])) {
        if (!pid || String(pid) === String(myUserId)) continue;
        const pc = createPC(pid);
        await syncPC(pc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call_user', { to: pid, offer, callType: ct, callId, conversationId, isGroup: true });
      }

      startTimer(sa);
    };

    // [BUG1 FIX] Nhận thông tin participants từ server khi emit 'get_participants_info'
    const onParticipantsInfo = ({ callId: cid, users }) => {
      if (cid !== callId || !Array.isArray(users)) return;
      setPeers(prev => prev.map(peer => {
        const info = users.find(u => String(u._id || u.id) === String(peer.id));
        if (!info) return peer;
        return {
          ...peer,
          username: info.username || info.name || peer.username,
          avatar: info.avatar || peer.avatar,
        };
      }));
    };

    // Re-offer từ peer trong phòng (auto-answer)
    const onIncomingCall = async (data) => {
      if (data.callId !== callId) return;

      if (data.isReoffer || statusRef.current === 'active') {
        if (!localStreamRef.current) await getLocalStream((data.callType || callTypeRef.current) === 'video');
        let pc = pcMapRef.current.get(data.from);
        if (!pc) {
          pc = createPC(data.from);
          await syncPC(pc);
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('accept_call', { to: data.from, answer, callId, conversationId });
        } catch (e) {
          console.error('incoming_call reanswer:', e);
        }
        setPeers((prev) =>
          prev.some((p) => String(p.id) === String(data.from))
            ? prev
            : [...prev, {
                id: data.from,
                // [BUG1 FIX] Dùng fromUser info nếu có
                username: data.fromUser?.username || data.fromUser?.name || null,
                avatar: data.fromUser?.avatar,
              }],
        );
        setStatus('active');
        startTimer(startedAtRef.current);
      }
    };

    const onCallAccepted = async ({ from, answer, callId: cid }) => {
      if (cid !== callId) return;
      const pc = pcMapRef.current.get(from);
      if (!pc) return;
      try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch {}
      updatePeerState(from, { status: 'joined' });
      setStatus('active');
      startTimer(startedAtRef.current);
    };

    const onNewPeerJoined = async ({ from, fromUser, callId: cid }) => {
      if (cid !== callId) return;
      if (!localStreamRef.current) return;
      setPeers(prev => {
        if (prev.find(p => p.id === from)) return prev;
        return [...prev, {
          id: from,
          // [BUG1 FIX] Dùng fromUser info đầy đủ
          username: fromUser?.username || fromUser?.name || null,
          avatar: fromUser?.avatar,
        }];
      });
      updatePeerState(from, { status: 'joined' });
      const pc = createPC(from);
      await syncPC(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_user', { to: from, offer, callType: callTypeRef.current, callId, conversationId, isGroup: true });
    };

    const onPeerRejoined = async ({ from, fromUser, callId: cid }) => {
      if (cid !== callId) return;
      updatePeerState(from, { reconnecting: false });
      // [BUG1 FIX] Update thông tin user khi rejoin nếu có
      if (fromUser) {
        setPeers(prev => prev.map(p =>
          String(p.id) === String(from)
            ? { ...p, username: fromUser.username || fromUser.name || p.username, avatar: fromUser.avatar || p.avatar }
            : p
        ));
      }
      if (!localStreamRef.current) return;
      const pc = createPC(from);
      await syncPC(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_user', { to: from, offer, callType: callTypeRef.current, callId, conversationId, isGroup: true });
    };

    const onPeerReconnecting = ({ from, callId: cid }) => {
      if (cid !== callId) return;
      updatePeerState(from, { reconnecting: true });
    };

    const onPeerLeft = ({ from, callId: cid }) => {
      if (cid !== callId) return;
      setLeavingPeers(prev => new Set([...prev, from]));
      stopVAD(from);
      updatePeerState(from, { status: 'left', speaking: false });
      setRemoteStreams(prev => { const n = { ...prev }; delete n[from]; return n; });
      const pc = pcMapRef.current.get(from);
      if (pc) { try { pc.close(); } catch {}; pcMapRef.current.delete(from); }
      setTimeout(() => {
        setLeavingPeers(prev => { const n = new Set(prev); n.delete(from); return n; });
        setPeers(prev => prev.filter(p => p.id !== from));
      }, 600);
    };

    const onCallEnded = ({ callId: cid }) => {
      if (cid && cid !== callId) return;
      doEndCall('ended');
    };

    const onNotFound = ({ callId: cid }) => {
      if (cid && cid !== callId) return;
      setEndReason('not_found');
      setStatus('ended');
    };

    const onIce = async ({ from, candidate }) => {
      const pc = pcMapRef.current.get(from);
      if (!pc || !candidate) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };

    const onVideoToggle = ({ from, enabled }) => {
      updatePeerState(from, { camOn: enabled });
      if (enabled) {
        // Force shallow update of remoteStreams after a short delay so Tile re-attaches
        setTimeout(() => {
          setRemoteStreams(prev => ({ ...prev }));
        }, 300);
      }
    };
    const onAudioToggle = ({ from, enabled }) => updatePeerState(from, enabled ? { micOn: true } : { micOn: false, speaking: false });
    const onDeafToggle  = ({ from, deafened: d }) => updatePeerState(from, { deafened: d });
    const onSSStart = ({ from }) => updatePeerState(from, { screenSharing: true });
    const onSSStop  = ({ from }) => updatePeerState(from, { screenSharing: false });
    const onSpeaking = ({ from, speaking: s, callId: cid }) => {
      if (cid && cid !== callId) return;
      updatePeerState(from, { speaking: s, ...(s ? { lastSpokeAt: Date.now() } : {}) });
    };

    socket.on('active_call_exists', onActiveCallExists);
    socket.on('no_active_call', onNoActiveCall);
    socket.on('call_peers', onCallPeers);
    socket.on('call_join_approved', onCallPeers);
    socket.on('participants_info', onParticipantsInfo); // [BUG1 FIX] event mới
    socket.on('incoming_call', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('new_peer_joined', onNewPeerJoined);
    socket.on('peer_rejoined', onPeerRejoined);
    socket.on('peer_reconnecting', onPeerReconnecting);
    socket.on('peer_left_call', onPeerLeft);
    socket.on('active_call_ended', onCallEnded);
    socket.on('call_ended', onCallEnded);
    socket.on('call_not_found', onNotFound);
    socket.on('call_not_started', onNotFound);
    socket.on('ice_candidate', onIce);
    socket.on('peer_video_toggle', onVideoToggle);
    socket.on('peer_audio_toggle', onAudioToggle);
    socket.on('peer_deafen_toggle', onDeafToggle);
    socket.on('peer_screen_share_started', onSSStart);
    socket.on('peer_screen_share_stopped', onSSStop);
    socket.on('peer_speaking_state', onSpeaking);

    return () => {
      socket.off('active_call_exists', onActiveCallExists);
      socket.off('no_active_call', onNoActiveCall);
      socket.off('call_peers', onCallPeers);
      socket.off('call_join_approved', onCallPeers);
      socket.off('participants_info', onParticipantsInfo); // [BUG1 FIX]
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('new_peer_joined', onNewPeerJoined);
      socket.off('peer_rejoined', onPeerRejoined);
      socket.off('peer_reconnecting', onPeerReconnecting);
      socket.off('peer_left_call', onPeerLeft);
      socket.off('active_call_ended', onCallEnded);
      socket.off('call_ended', onCallEnded);
      socket.off('call_not_found', onNotFound);
      socket.off('call_not_started', onNotFound);
      socket.off('ice_candidate', onIce);
      socket.off('peer_video_toggle', onVideoToggle);
      socket.off('peer_audio_toggle', onAudioToggle);
      socket.off('peer_deafen_toggle', onDeafToggle);
      socket.off('peer_screen_share_started', onSSStart);
      socket.off('peer_screen_share_stopped', onSSStop);
      socket.off('peer_speaking_state', onSpeaking);
    };
  }, [socket, callId, conversationId, myUserId, createPC, syncPC, getLocalStream, startTimer, doEndCall, stopVAD, updatePeerState, pendingOffer]);

  // ── socket reconnect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      if (status === 'active') {
        setReconnecting(true);
        socket.emit('rejoin_call', { callId, conversationId });
      }
    };
    socket.on('reconnect', onReconnect);
    return () => socket.off('reconnect', onReconnect);
  }, [socket, callId, conversationId, status]);

  // ── controls ──────────────────────────────────────────────────────────────
  const allPeerIds = () => peers.map(p => p.id).filter(Boolean);

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
    if (!next) socket?.emit('speaking_state', { callId, speaking: false, lastSpokeAt: Date.now() });
    allPeerIds().forEach(to => socket?.emit('toggle_audio', { to, enabled: next, callId }));
  };

  const toggleCam = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    if (camOn) {
      stream.getVideoTracks().forEach(t => { t.stop(); try { stream.removeTrack(t); } catch {}; });
      await syncAllPCs(null);
      syncLocalPreview();
      setCamOn(false);
      allPeerIds().forEach(to => socket?.emit('toggle_video', { to, enabled: false, callId }));
    } else {
      try {
        setCameraError(null);
        await getLocalStream(true, facingRef.current);
        await syncAllPCs();
        allPeerIds().forEach(to => socket?.emit('toggle_video', { to, enabled: true, callId }));
      } catch (err) {
        console.error('Lỗi bật camera:', err);
        // getLocalStream đã set error message, không cần reset
      }
    }
  };

  const toggleDeafen = () => {
    const next = !deafened;
    setDeafened(next);
    if (next && micOn) {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
      setMicOn(false);
      allPeerIds().forEach(to => socket?.emit('toggle_audio', { to, enabled: false, callId }));
    }
    allPeerIds().forEach(to => socket?.emit('toggle_deafen', { to, deafened: next, callId }));
  };

  const toggleScreenShare = async () => {
    if (screenShare) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenShare(false);
      await syncAllPCs();
      allPeerIds().forEach(to => socket?.emit('screen_share_stopped', { to, conversationId, callId }));
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
        screenStreamRef.current = ss;
        const track = ss.getVideoTracks()[0];
        await syncAllPCs(track);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = ss;
        track.onended = async () => {
          setScreenShare(false);
          screenStreamRef.current = null;
          await syncAllPCs();
          allPeerIds().forEach(to => socket?.emit('screen_share_stopped', { to, conversationId, callId }));
        };
        setScreenShare(true);
        allPeerIds().forEach(to => socket?.emit('screen_share_started', { to, conversationId, callId }));
      } catch {}
    }
  };

  const flipCamera = async () => {
    if (!camOn || !localStreamRef.current) return;
    const newFacing = facingRef.current === 'user' ? 'environment' : 'user';
    facingRef.current = newFacing;
    localStreamRef.current.getVideoTracks().forEach(t => { t.stop(); try { localStreamRef.current.removeTrack(t); } catch {}; });
    await getLocalStream(true, newFacing);
    await syncAllPCs();
  };

  // ── render ────────────────────────────────────────────────────────────────

  // Pending offer: hiện Accept/Reject
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

  // Ended
  if (status === 'ended') {
    const msgs = {
      ended: 'Cuộc gọi đã kết thúc',
      not_found: 'Cuộc gọi không tồn tại',
      left: 'Bạn đã rời cuộc gọi',
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
          <p className="text-white font-bold text-xl">Đang kết nối cuộc gọi nhóm...</p>
          <p className="text-white/40 text-sm">Mã: {callId?.slice(-8)}</p>
          <button onClick={() => doEndCall('cancelled')}
            className="mt-4 px-6 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-400 rounded-xl transition">
            Huỷ
          </button>
        </div>
      </div>
    );
  }

 // ── Active call layout ────────────────────────────────────────────────────
  const selfTile = { member: currentUser, id: myUserId, isSelf: true };
  const remoteTiles = peers.map(p => ({ member: p, id: p.id, isSelf: false }));
  const allTiles = [selfTile, ...remoteTiles].filter(t => {
    const st = peerStates[t.id];
    return t.isSelf || st?.status !== 'left';
  });

  const now = Date.now();
  const sortedTiles = [...allTiles].sort((a, b) => {
    const score = (t) => {
      const st = t.isSelf
        ? { camOn, speaking: peerStates[myUserId]?.speaking, lastSpokeAt: peerStates[myUserId]?.lastSpokeAt }
        : (peerStates[t.id] || {});
      return (st.speaking ? 100000 : 0)
        + (st.camOn ? 10000 : 0)
        + (st.lastSpokeAt ? Math.max(0, 60000 - (now - st.lastSpokeAt)) : 0)
        + (t.isSelf ? 100 : 0);
    };
    return score(b) - score(a);
  });

  const cols = sortedTiles.length <= 1 ? 1 : sortedTiles.length <= 4 ? 2 : 3;
  const gridCols = `repeat(${cols}, minmax(0, 1fr))`;
  const maxW = cols <= 1 ? 720 : cols <= 2 ? 1080 : 1400;

  const getTileHeight = (count) => {
    if (count === 1) return 'min-h-[min(72vh,680px)]';
    if (count <= 4) return 'min-h-[min(44vh,420px)]';
    return 'min-h-[min(32vh,300px)]';
  };

  return (
    <div className="fixed inset-0 bg-[#13141f] flex flex-col z-50">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0d0e18]/90 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${callType === 'video' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${callType === 'video' ? 'bg-green-400' : 'bg-blue-400'}`} />
            <span className={`text-xs font-semibold ${callType === 'video' ? 'text-green-400' : 'text-blue-400'}`}>
              {callType === 'video' ? 'VIDEO' : 'VOICE'}
            </span>
          </div>
          <span className="text-white/70 text-sm font-medium">
            Nhóm · {allTiles.length} người
          </span>
          <span className="text-green-400 font-mono text-sm font-bold">{fmt(duration)}</span>
        </div>
        <div className="flex items-center gap-2">
          {reconnecting && (
            <span className="text-xs text-orange-400 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Đang kết nối lại...
            </span>
          )}
          <button onClick={() => setFullscreen(v => !v)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 relative overflow-hidden">

        {/* Tiles grid */}
        <div className="w-full h-full p-3 overflow-auto">
          <div
            className="mx-auto grid gap-3 h-full content-center"
            style={{ gridTemplateColumns: gridCols, maxWidth: maxW }}
          >
            {sortedTiles.map((tile, idx) => {
              const pid = tile.id;
              const isSelf = tile.isSelf;
              const stream = isSelf ? localStreamRef.current : remoteStreams[pid];
              const ps = isSelf
                ? { micOn, camOn, speaking: peerStates[myUserId]?.speaking, screenSharing: false }
                : (peerStates[pid] || {});
              // Với remote peer: ưu tiên check stream thực tế thay vì chỉ tin vào state
              const actualCamOn = isSelf
                ? camOn
                : (ps.camOn || (remoteStreams[pid]?.getVideoTracks().some(isLive) ?? false));
              const leaving = leavingPeers.has(pid);
              const isRecon = ps.reconnecting;
              const isOdd = sortedTiles.length % 2 !== 0;
              const isLast = idx === sortedTiles.length - 1;
              const wrapClass = (cols === 2 && isOdd && isLast) ? 'col-span-2 flex justify-center' : '';
              const innerStyle = (cols === 2 && isOdd && isLast) ? { width: 'min(100%, calc(50% - 0.375rem))' } : undefined;

              return (
                <div key={pid} className={`relative ${getTileHeight(sortedTiles.length)} ${wrapClass}`}>
                  <div className="h-full" style={innerStyle}>
                    <Tile
                      member={tile.member}
                      isSelf={isSelf}
                      stream={stream}
                      micOn={ps.micOn !== false}
                      camOn={actualCamOn}
                      speaking={Boolean(ps.speaking)}
                      leaving={leaving}
                      screenSharing={false}
                      deafenRemote={deafened}
                      className="h-full"
                      cameraLoading={isSelf && cameraLoading}
                    />
                  </div>
                  {isRecon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <span className="text-white/70 text-xs animate-pulse flex items-center gap-1.5">
                        <WifiOff className="w-3 h-3" /> Đang kết nối lại...
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Local PiP - chỉ hiện khi cam bật */}
        <div className={`absolute bottom-4 right-4 w-40 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-10 group transition-all duration-300 ${camOn ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <button
            onClick={flipCamera}
            className="absolute bottom-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-[#0d0e18]/95 border-t border-white/5 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-center gap-1 mb-3 text-xs h-4">
          {deafened && (
            <span className="flex items-center gap-1 text-orange-400">
              <EarOff className="w-3 h-3" /> Tắt nghe
            </span>
          )}
          {!micOn && !deafened && (
            <span className="flex items-center gap-1 text-red-400">
              <MicOff className="w-3 h-3" /> Mic tắt
            </span>
          )}
          {camOn && (
            <span className="flex items-center gap-1 text-blue-400">
              <Video className="w-3 h-3" /> Camera bật
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <Btn icon={micOn ? Mic : MicOff} label={micOn ? 'Tắt mic' : 'Bật mic'} active={micOn} onClick={toggleMic} />
          <Btn icon={deafened ? EarOff : Headphones} label={deafened ? 'Bỏ tắt nghe' : 'Tắt nghe'} active={!deafened} onClick={toggleDeafen} />
          <Btn icon={camOn ? Video : VideoOff} label={camOn ? 'Tắt cam' : 'Bật cam'} active={camOn} onClick={toggleCam} />
          <Btn
            icon={Users}
            label={`${allTiles.length} người`}
            active
            disabled
            badge={allTiles.length > 1 ? allTiles.length : undefined}
          />
          <Btn icon={PhoneOff} label="Rời" danger onClick={() => doEndCall('left')} />
        </div>
      </div>
    </div>
  );
}