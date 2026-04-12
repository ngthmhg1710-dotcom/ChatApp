// client/src/components/CallManager.jsx
// Phiên gọi (1-1 vs nhóm + conversationId) lấy từ TÍN HIỆU / callSessionRef — không dùng màn chat đang mở,
// tránh lỗi giống Zalo/Messenger: đang xem nhóm nhưng gọi 1-1 tới, hoặc ngược lại.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Clock,
  Monitor, MonitorOff, Headphones, EarOff, Users,
  RotateCcw, Maximize2, Minimize2, UserPlus,
} from 'lucide-react';

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

function getAvatarColor(username) {
  const clean = (username || '').trim();
  return clean ? AVATAR_COLORS[(clean.charCodeAt(0) || 0) % AVATAR_COLORS.length] : 'bg-gray-600';
}

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
const ACTIVE_CALL_SESSION_KEY = 'chat-app:active-call';
const PENDING_CALL_OFFER_KEY = 'lumi:pendingOffer';

function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function getParticipantId(participant) {
  return String(participant?._id || participant?.id || participant?.userId || '');
}

function getParticipantName(participant) {
  return participant?.username || participant?.name || participant?.email || 'Nguoi dung';
}

function getParticipantAvatar(participant) {
  return participant?.avatar || participant?.photoURL || participant?.profilePicture || '';
}

function createParticipantState(status = 'pending') {
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

function readPersistedCallSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_CALL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writePersistedCallSession(payload) {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(ACTIVE_CALL_SESSION_KEY, JSON.stringify(payload)); } catch {}
}

function clearPersistedCallSession() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(ACTIVE_CALL_SESSION_KEY); } catch {}
}

function isTrackLive(track) {
  return !!track && track.readyState === 'live';
}

function getElapsedSeconds(startedAt) {
  if (!startedAt) return 0;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function callRingtoneEnabled() {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('callRingSound') !== 'false';
}

function scheduleDualToneBeep(ctx, startTime, duration = 0.32, volume = 0.12) {
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o1.connect(g); o2.connect(g); g.connect(ctx.destination);
  o1.frequency.value = 440; o2.frequency.value = 480;
  o1.type = 'sine'; o2.type = 'sine';
  const t1 = startTime + duration;
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  g.gain.linearRampToValueAtTime(0, t1);
  o1.start(startTime); o2.start(startTime);
  o1.stop(t1 + 0.02); o2.stop(t1 + 0.02);
}

// ── Avatar tròn ───────────────────────────────────────────────────────────────
function AvatarDisc({ member, size, className = '', textScale = 0.32 }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = getParticipantName(member);
  const color = getAvatarColor(name);
  const initials = name.slice(0, 2).toUpperCase();
  const avatarSrc = !imageFailed ? getFileUrl(getParticipantAvatar(member)) : '';

  useEffect(() => {
    setImageFailed(false);
  }, [member?.avatar, member?.photoURL, member?.profilePicture, member?.username, member?.name]);

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc} alt={name}
        onError={() => setImageFailed(true)}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`${color} flex items-center justify-center font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * textScale }}
    >
      {initials}
    </div>
  );
}

function ParticipantAvatar({ member, size = 28, speaking = false }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative rounded-full flex items-center justify-center transition-all duration-300 ${
          speaking ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'ring-2 ring-white/20'
        }`}
        style={{ width: size, height: size }}
      >
        <AvatarDisc member={member} size={size} className="w-full h-full rounded-full object-cover" />
        {speaking && (
          <span className="absolute inset-0 rounded-full ring-2 ring-green-400 animate-ping opacity-50 pointer-events-none" />
        )}
      </div>
      <span className="text-white/70 text-xs font-medium text-center max-w-[80px] truncate">
        {getParticipantName(member)}
      </span>
    </div>
  );
}

// ── Participant Tile ───────────────────────────────────────────────────────────
function ParticipantTile({
  member, isSelf, stream, micOn = true, camOn = true,
  isScreenSharing = false, isSpeaking = false, isLeaving = false,
  remoteMuted = false, tileClassName = '', cameraLoading = false,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const avatarSize = 80;

  useEffect(() => {
    if (videoRef.current && stream && (camOn || isScreenSharing)) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, camOn, isScreenSharing]);

  useEffect(() => {
    if (!audioRef.current || !stream || isSelf) return;
    audioRef.current.srcObject = stream;
    audioRef.current.muted = remoteMuted;
    audioRef.current.play().catch(() => {});
  }, [stream, isSelf, remoteMuted]);

  const showVideo = (camOn || isScreenSharing) && stream;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#1e2030] flex items-center justify-center transition-all duration-500 ${
        isLeaving ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
      } ${isSpeaking ? 'ring-2 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)]' : 'ring-1 ring-white/5'} ${tileClassName}`}
      style={{ minHeight: 140 }}
    >
      {!isSelf && <audio ref={audioRef} autoPlay playsInline className="hidden" />}
      {showVideo ? (
        <video
          ref={videoRef} autoPlay playsInline muted
          className={`w-full h-full object-cover ${isSelf && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <AvatarDisc
            member={member} size={avatarSize}
            className={`rounded-full object-cover ring-4 ring-white/10 transition-all duration-300 ${isSpeaking ? 'ring-green-400 shadow-[0_0_24px_rgba(74,222,128,0.5)]' : ''}`}
          />
          {cameraLoading && isSelf && (
            <div className="flex items-center gap-2 bg-blue-500/40 px-3 py-1.5 rounded-full animate-pulse">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
              <span className="text-blue-200 text-xs font-medium">Đang bật camera...</span>
            </div>
          )}
          {camOn && isSelf && !cameraLoading && !showVideo && (
            <div className="flex items-center gap-1.5 bg-amber-500/40 px-3 py-1 rounded-full">
              <Video className="w-3 h-3 text-amber-300" />
              <span className="text-amber-200 text-xs">Khởi động camera...</span>
            </div>
          )}
          {!micOn && !cameraLoading && (
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full">
              <MicOff className="w-3 h-3 text-red-400" />
              <span className="text-white/60 text-xs">Đã tắt mic</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex gap-1 items-end h-5">
              {[4, 8, 12, 8, 4].map((h, i) => (
                <div key={i} className="w-1 bg-green-400 rounded-full animate-bounce" style={{ height: h, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-white text-xs font-semibold truncate">
          {getParticipantName(member)}{isSelf ? ' (Bạn)' : ''}
        </span>
        <div className="flex items-center gap-1">
          {isScreenSharing && <Monitor className="w-3.5 h-3.5 text-green-400" />}
          {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
          {!camOn && !isScreenSharing && <VideoOff className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>
      {isSpeaking && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-green-400 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}

// ── Control Button ─────────────────────────────────────────────────────────────
function CtrlBtn({ onClick, icon: Icon, label, active = true, danger = false, disabled = false, badge, pulse = false }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick} disabled={disabled} title={label}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-lg
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

// ── Incoming Call UI ───────────────────────────────────────────────────────────
function IncomingCallScreen({ incomingData, callType, isGroupCall, allMemberTiles, onAccept, onReject, audioCtxRef }) {
  const callerName = incomingData?.fromUser?.username || incomingData?.callerName || 'Người dùng';
  const callerAvatar = incomingData?.fromUser?.avatar;
  const color = getAvatarColor(callerName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(24px)' }}
      onPointerDown={() => audioCtxRef.current?.resume?.().catch(() => {})}
    >
      <div className="flex flex-col items-center gap-6 w-80">
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          {[1, 2, 3].map(i => (
            <span key={i} className="absolute rounded-full border border-white/20 animate-ping"
              style={{ width: 80 + i * 30, height: 80 + i * 30, animationDelay: `${i * 0.5}s`, animationDuration: '2.5s' }} />
          ))}
          {callerAvatar ? (
            <img src={getFileUrl(callerAvatar)} alt={callerName} className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20 z-10" />
          ) : (
            <div className={`w-24 h-24 ${color} rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 ring-white/20 z-10`}>
              {callerName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">
            {callType === 'video' ? '📹 Video call đến' : '📞 Cuộc gọi đến'}
          </p>
          <p className="text-white text-2xl font-bold">{callerName}</p>
          {isGroupCall && <p className="text-white/40 text-sm mt-1">Cuộc gọi nhóm · {allMemberTiles.length} người</p>}
        </div>

        <div className="flex gap-1 items-end h-8">
          {[10, 18, 26, 18, 10].map((h, i) => (
            <div key={i} className="w-1.5 bg-green-400/80 rounded-full animate-bounce" style={{ height: h, animationDelay: `${i * 0.12}s` }} />
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

// ── Outgoing Call UI ───────────────────────────────────────────────────────────
function OutgoingCallScreen({ otherUser, callType, ringCountdown, isGroupCall, allMemberTiles, memberStatus, onCancel, localVideoRef, audioCtxRef }) {
  const calleeName = isGroupCall ? 'Cuộc gọi nhóm' : (otherUser?.username || 'Người dùng');
  const color = getAvatarColor(otherUser?.username || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(24px)' }}
      onPointerDown={() => audioCtxRef.current?.resume?.().catch(() => {})}
    >
      {callType === 'video' && !isGroupCall && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className="absolute bottom-6 right-6 w-36 h-24 object-cover rounded-2xl border border-white/20 z-10 scale-x-[-1]" />
      )}

      <div className="flex flex-col items-center gap-6 w-80">
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          {[1, 2, 3].map(i => (
            <span key={i} className="absolute rounded-full border border-blue-400/20 animate-ping"
              style={{ width: 80 + i * 30, height: 80 + i * 30, animationDelay: `${i * 0.5}s`, animationDuration: '2.5s' }} />
          ))}
          {!isGroupCall && otherUser?.avatar ? (
            <img src={getFileUrl(otherUser.avatar)} alt={calleeName} className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-400/20 z-10" />
          ) : isGroupCall ? (
            <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-4xl z-10 ring-4 ring-blue-400/20">
              👥
            </div>
          ) : (
            <div className={`w-24 h-24 ${color} rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 ring-blue-400/20 z-10`}>
              {(otherUser?.username || 'ND').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">
            {callType === 'video' ? 'Đang gọi video...' : 'ĐANG ĐỔ CHUÔNG...'}
          </p>
          <p className="text-white text-2xl font-bold">{isGroupCall ? 'Cuộc gọi nhóm' : (otherUser?.username || 'Người dùng')}</p>
          {ringCountdown > 0 && !isGroupCall && (
            <p className="text-white/30 text-xs mt-2">Tự động hủy sau {ringCountdown}s</p>
          )}
        </div>

        {/* Group: hiện avatar các thành viên + trạng thái */}
        {isGroupCall && allMemberTiles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-[260px]">
            {allMemberTiles.slice(0, 8).map((m) => {
              const status = memberStatus?.[m.id]?.status || 'pending';
              const dotColor = status === 'joined' ? 'bg-green-400' : status === 'rejected' ? 'bg-red-400' : 'bg-gray-500';
              const mColor = getAvatarColor(m.username);
              return (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    {m.avatar ? (
                      <img src={getFileUrl(m.avatar)} alt={m.username} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className={`w-9 h-9 ${mColor} rounded-full flex items-center justify-center text-xs font-bold text-white`}>
                        {m.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${dotColor}`} />
                  </div>
                  <span className="text-[9px] text-white/40 truncate max-w-[36px]">{m.username}</span>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={onCancel}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all mt-2">
          <PhoneOff className="w-7 h-7" />
        </button>
        <span className="text-white/40 text-xs -mt-3">Huỷ</span>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function CallManager({ 
  socket, currentUser, otherUser, onStartCall, onCallEnd, onCallStateChange,
  groupParticipants, conversationId, conversationIsGroup 
}) {
  const navigate = useNavigate();

  // Chỉ coi là gọi nhóm khi đang mở đúng hội thoại nhóm (giống Discord voice room theo channel)
  const callParticipants = Array.isArray(groupParticipants)
    ? groupParticipants.filter(p => getParticipantId(p))
    : [];
  const isGroupCall = !!conversationIsGroup && callParticipants.length > 0;

  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [incomingData, setIncomingData] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [rejectedBy, setRejectedBy] = useState(null);
  const [closeCountdown, setCloseCountdown] = useState(0);
  const [ringCountdown, setRingCountdown] = useState(0);
  const [memberStatus, setMemberStatus] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [leavingUsers, setLeavingUsers] = useState(new Set());
  const [activeCallInfo, setActiveCallInfo] = useState(null);
  /** Bắt buộc đồng bộ UI với phiên WebRTC (incoming/outgoing/active), không phụ thuộc sidebar đang mở */
  const [sessionIsGroup, setSessionIsGroup] = useState(false);

  const RING_TIMEOUT = 35;

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const pcMapRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const durationTimer = useRef(null);
  const closeCountdownRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const ringCountdownRef = useRef(null);
  const callDurationRef = useRef(0);
  const callTypeRef = useRef('audio');
  const callEndFiredRef = useRef(false);
  const isCallerRef = useRef(false);
  const callWasActiveRef = useRef(false);
  const callIdRef = useRef(null);
  const callTargetsRef = useRef([]);
  const ringIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const facingModeRef = useRef('user');
  const memberStatusRef = useRef({});
  const audioAnalysisRef = useRef(new Map());
  const speakingStateRef = useRef({ speaking: false, lastSentAt: 0 });
  const rejoinAttemptedRef = useRef(false);
  const persistedCallRef = useRef(readPersistedCallSession());
  // FIX: lưu info người gọi tới để không bị mất khi incomingData thay đổi
  const callerInfoRef = useRef(null);
  /** { isGroup, conversationId } — nguồn sự thật cho mọi emit/handler trong phiên gọi */
  const callSessionRef = useRef({ isGroup: false, conversationId: null });
  const peerDisconnectHangupTimersRef = useRef(new Map());
  const PEER_DISCONNECT_GRACE_MS = 15_000;

  const beginCallSession = useCallback((isGroup, convId) => {
    callSessionRef.current = {
      isGroup: !!isGroup,
      conversationId: convId != null && convId !== '' ? String(convId) : null,
    };
    setSessionIsGroup(!!isGroup);
  }, []);

  const myUserId = getParticipantId(currentUser);
  const primaryPeerId = incomingData?.from || getParticipantId(otherUser);

  // ── Navigate tới CallRoom (chỉ dùng cho GROUP call) ──────────────────────
  const goToCallRoom = useCallback((nextCallId, nextCallType, nextConversationId) => {
    if (!nextCallId || !nextConversationId) return;
    const params = new URLSearchParams({
      conv: String(nextConversationId),
      type: nextCallType || 'audio',
      group: '1',
      return: '/chat',
    });
    navigate(`/call/${nextCallId}?${params.toString()}`);
  }, [navigate]);

  const allMemberTiles = (() => {
    const currentId = myUserId;
    const map = new Map();
    (callParticipants || []).forEach((p) => {
      const pid = getParticipantId(p);
      if (!pid) return;
      map.set(pid, { id: pid, username: getParticipantName(p), avatar: getParticipantAvatar(p) });
    });
    if (currentId && !map.has(currentId)) {
      map.set(currentId, { id: currentId, username: getParticipantName(currentUser), avatar: getParticipantAvatar(currentUser) });
    }
    return Array.from(map.values());
  })();

  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);
  useEffect(() => { memberStatusRef.current = memberStatus; }, [memberStatus]);

  // Notify parent about active call state for sidebar indicator + join button
  useEffect(() => {
    if (typeof onCallStateChange === 'function') {
      onCallStateChange({
        isActive: callState === 'active',
        callState,
        callType,
        peerId: primaryPeerId,
        conversationId,
      });
    }
  }, [callState, callType, primaryPeerId, conversationId, onCallStateChange]);

  const updateMemberState = useCallback((participantId, patch, fallbackStatus = 'joined') => {
    const pid = String(participantId || '');
    if (!pid) return;
    setMemberStatus((prev) => {
      const current = prev[pid] || createParticipantState(fallbackStatus);
      const nextValue = { ...current, ...patch };
      const changed = Object.keys(nextValue).some((key) => current[key] !== nextValue[key]);
      if (!changed) return prev;
      return { ...prev, [pid]: nextValue };
    });
  }, []);

  const syncParticipantsFromCall = useCallback((participantIds = [], nextCallState = callState) => {
    if (!callSessionRef.current.isGroup) return;
    const activeIds = new Set((participantIds || []).map((id) => String(id)));
    if (myUserId) activeIds.add(myUserId);
    setMemberStatus((prev) => {
      const next = { ...prev };
      for (const member of allMemberTiles) {
        const pid = String(member.id);
        const current = next[pid] || createParticipantState(
          nextCallState === 'incoming' || nextCallState === 'outgoing' ? 'pending' : 'joined'
        );
        if (activeIds.has(pid)) {
          next[pid] = { ...current, status: current.status === 'reconnecting' ? 'reconnecting' : 'joined' };
          continue;
        }
        if (current.status === 'rejected') { next[pid] = current; continue; }
        if (['joined', 'reconnecting', 'left'].includes(current.status)) {
          next[pid] = { ...current, status: 'left', speaking: false };
          continue;
        }
        next[pid] = current;
      }
      return next;
    });
  }, [allMemberTiles, myUserId, callState]);

  const emitSpeakingState = useCallback((speaking, lastSpokeAt = Date.now(), force = false) => {
    if (!socket || !callIdRef.current || !myUserId) return;
    const nextSpeaking = Boolean(speaking);
    const current = speakingStateRef.current;
    const shouldEmit = force
      || current.speaking !== nextSpeaking
      || (nextSpeaking && (lastSpokeAt - current.lastSentAt) > 1200);
    if (!shouldEmit) return;
    speakingStateRef.current = { speaking: nextSpeaking, lastSentAt: lastSpokeAt };
    socket.emit('speaking_state', { callId: callIdRef.current, speaking: nextSpeaking, lastSpokeAt });
  }, [myUserId, socket]);

  const stopSpeakingMonitor = useCallback((participantId) => {
    const pid = String(participantId || '');
    const cleanupMonitor = audioAnalysisRef.current.get(pid);
    if (cleanupMonitor) { cleanupMonitor(); audioAnalysisRef.current.delete(pid); }
    if (pid && String(pid) === String(myUserId)) emitSpeakingState(false, Date.now(), true);
    updateMemberState(pid, { speaking: false });
  }, [emitSpeakingState, myUserId, updateMemberState]);

  const stopAllSpeakingMonitors = useCallback(() => {
    audioAnalysisRef.current.forEach((fn) => fn());
    audioAnalysisRef.current.clear();
  }, []);

  const startSpeakingMonitor = useCallback((participantId, stream) => {
    const pid = String(participantId || '');
    if (!pid || !stream || !stream.getAudioTracks().some(isTrackLive)) {
      stopSpeakingMonitor(pid);
      return;
    }
    stopSpeakingMonitor(pid);
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      const data = new Uint8Array(analyser.fftSize);
      let rafId = 0;
      let lastActiveAt = 0;
      let lastSpeakingState = false;
      let lastPromotedAt = 0;
      let destroyed = false;
      const isLocalParticipant = String(pid) === String(myUserId);
      source.connect(analyser);

      const tick = () => {
        if (destroyed) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (rms > 0.035) lastActiveAt = now;
        const speaking = now - lastActiveAt < 550;
        if (speaking !== lastSpeakingState) {
          lastSpeakingState = speaking;
          if (speaking) {
            lastPromotedAt = now;
            updateMemberState(pid, { speaking: true, lastSpokeAt: now }, 'joined');
            if (isLocalParticipant) emitSpeakingState(true, now, true);
          } else {
            updateMemberState(pid, { speaking: false }, 'joined');
            if (isLocalParticipant) emitSpeakingState(false, now, true);
          }
        } else if (speaking && now - lastPromotedAt > 1500) {
          lastPromotedAt = now;
          updateMemberState(pid, { lastSpokeAt: now }, 'joined');
          if (isLocalParticipant) emitSpeakingState(true, now);
        }
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);

      audioAnalysisRef.current.set(pid, () => {
        destroyed = true;
        window.cancelAnimationFrame(rafId);
        try { source.disconnect(); } catch {}
        try { analyser.disconnect(); } catch {}
      });
    } catch {
      updateMemberState(pid, { speaking: false });
    }
  }, [emitSpeakingState, myUserId, stopSpeakingMonitor, updateMemberState]);

  // Check active call sau reload
  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('check_active_call', { conversationId });
  }, [socket, conversationId]);

  useEffect(() => {
    if (!conversationId || !callIdRef.current || !['incoming', 'outgoing', 'active'].includes(callState)) {
      clearPersistedCallSession();
      persistedCallRef.current = null;
      return;
    }
    const conv = callSessionRef.current.conversationId || conversationId;
    const payload = {
      callId: callIdRef.current,
      conversationId: conv,
      callType,
      callState,
      camOn,
      micOn,
      screenSharing,
      isGroupCall: callSessionRef.current.isGroup,
      userId: myUserId,
    };
    writePersistedCallSession(payload);
    persistedCallRef.current = payload;
  }, [callState, callType, camOn, conversationId, micOn, myUserId, screenSharing]);

  // ── Ringtone ──────────────────────────────────────────────────────────────
  // FIX: 1-1 call active → attach remote stream vào audio/video elements
  useEffect(() => {
    if (sessionIsGroup || !primaryPeerId || callState !== 'active') return;
    const stream = remoteStreams[primaryPeerId];
    if (!stream) return;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.muted = deafened;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [deafened, sessionIsGroup, primaryPeerId, remoteStreams, callState]);

  const stopRingtone = useCallback(() => {
    if (ringIntervalRef.current) { clearInterval(ringIntervalRef.current); ringIntervalRef.current = null; }
  }, []);

  const playIncomingRingtone = useCallback(async () => {
    stopRingtone();
    if (!callRingtoneEnabled()) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const cycle = () => {
        const base = ctx.currentTime + 0.08;
        scheduleDualToneBeep(ctx, base, 0.32, 0.13);
        scheduleDualToneBeep(ctx, base + 0.52, 0.32, 0.13);
      };
      cycle();
      ringIntervalRef.current = setInterval(cycle, 3000);
    } catch {}
  }, [stopRingtone]);

  const playOutgoingRingtone = useCallback(async () => {
    stopRingtone();
    if (!callRingtoneEnabled()) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const beep = () => {
        const t0 = ctx.currentTime + 0.06;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 425; o.type = 'sine';
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.07, t0 + 0.04);
        g.gain.linearRampToValueAtTime(0, t0 + 0.2);
        o.start(t0); o.stop(t0 + 0.22);
      };
      beep();
      ringIntervalRef.current = setInterval(beep, 2100);
    } catch {}
  }, [stopRingtone]);

  useEffect(() => {
    if (callState === 'incoming') playIncomingRingtone();
    else if (callState === 'outgoing') playOutgoingRingtone();
    else stopRingtone();
  }, [callState, playIncomingRingtone, playOutgoingRingtone, stopRingtone]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopRingtone();
    peerDisconnectHangupTimersRef.current.forEach((t) => clearTimeout(t));
    peerDisconnectHangupTimersRef.current.clear();
    clearInterval(durationTimer.current);
    clearInterval(closeCountdownRef.current);
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    stopAllSpeakingMonitors();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    pcMapRef.current.forEach((pc) => { try { pc?.close(); } catch {} });
    pcMapRef.current.clear();
    pcRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setMicOn(true);
    setCamOn(false);
    setDeafened(false);
    setScreenSharing(false);
    setFacingMode('user');
    setRingCountdown(0);
    setMemberStatus({});
    setRemoteStreams({});
    setLeavingUsers(new Set());
    setActiveCallInfo(null);
    speakingStateRef.current = { speaking: false, lastSentAt: 0 };
  }, [stopAllSpeakingMonitors, stopRingtone]);

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
    callEndFiredRef.current = false;
    isCallerRef.current = false;
    callWasActiveRef.current = false;
    callIdRef.current = null;
    callTargetsRef.current = [];
    rejoinAttemptedRef.current = false;
    clearPersistedCallSession();
    persistedCallRef.current = null;
    speakingStateRef.current = { speaking: false, lastSentAt: 0 };
    // FIX: dọn caller info khi reset
    callerInfoRef.current = null;
    callSessionRef.current = { isGroup: false, conversationId: null };
    setSessionIsGroup(false);
  }, []);

  const startCloseCountdown = useCallback((total, onDone) => {
    clearInterval(closeCountdownRef.current);
    setCloseCountdown(total);
    let remaining = total;
    closeCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setCloseCountdown(remaining);
      if (remaining <= 0) { clearInterval(closeCountdownRef.current); onDone(); }
    }, 1000);
  }, []);

  const startDurationTimer = useCallback(() => {
    clearInterval(durationTimer.current);
    durationTimer.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
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
  }, []);

  const fireCallEnd = useCallback(({ type, duration, status }) => {
    if (callEndFiredRef.current) return;
    callEndFiredRef.current = true;
    onCallEnd?.({ type, duration, status, isCaller: isCallerRef.current, calleeId: isCallerRef.current ? null : otherUser?._id });
  }, [onCallEnd, otherUser]);

  const syncLocalPreview = useCallback(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
    }
  }, []);

  useEffect(() => {
    if (callState === 'active' && camOn) syncLocalPreview();
  }, [callState, camOn, syncLocalPreview]);

  const renegotiateOneToOne = useCallback(async () => {
    if (callSessionRef.current.isGroup) return;
    if (callStateRef.current !== 'active') return;
    const peerId = [...pcMapRef.current.keys()][0];
    if (!peerId || !socket || !callIdRef.current) return;
    const pc = pcMapRef.current.get(peerId);
    if (!pc || pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer({ iceRestart: false });
      await pc.setLocalDescription(offer);
      const convId = callSessionRef.current.conversationId || conversationId;
      socket.emit('call_user', {
        to: peerId,
        offer,
        callType: callTypeRef.current,
        callId: callIdRef.current,
        conversationId: convId,
        isGroup: false,
      });
    } catch (e) {
      console.warn('renegotiateOneToOne', e);
    }
  }, [socket, conversationId]);

  const syncPeerConnectionTracks = useCallback(async (pc, stream = localStreamRef.current, forcedVideoTrack) => {
    if (!pc) return;
    const outboundStream = stream || localStreamRef.current;
    const audioTrack = outboundStream?.getAudioTracks().find(isTrackLive) || null;
    const outboundVideoTrack = forcedVideoTrack !== undefined
      ? forcedVideoTrack
      : (screenStreamRef.current?.getVideoTracks().find(isTrackLive)
        || outboundStream?.getVideoTracks().find(isTrackLive)
        || null);
    const audioSender = pc.__audioSender || (pc.__audioSender = null);
    const videoSender = pc.__videoSender || (pc.__videoSender = null);
    const audioPromise = (audioSender || (audioTrack ? 'new' : null))
      ? (audioSender
        ? audioSender.replaceTrack(audioTrack)
        : pc.addTrack(audioTrack, outboundStream))
      : Promise.resolve();
    const videoPromise = (videoSender || (outboundVideoTrack ? 'new' : null))
      ? (videoSender
        ? videoSender.replaceTrack(outboundVideoTrack)
        : (outboundVideoTrack && pc.addTrack(outboundVideoTrack, outboundStream)))
      : Promise.resolve();
    const [as, vs] = await Promise.allSettled([audioPromise, videoPromise]);
    if (as.status === 'fulfilled' && as.value?.isLocal === false) pc.__audioSender = as.value;
    if (vs.status === 'fulfilled' && vs.value?.isLocal === false) pc.__videoSender = vs.value;
  }, []);

  // ── Sync all peer connections ──────────────────────────────────────────────
  const syncAllPeerConnections = useCallback(async (forcedVideoTrack) => {
    const pcs = Array.from((pcMapRef.current || new Map()).values());
    await Promise.allSettled(pcs.map(pc => syncPeerConnectionTracks(pc, localStreamRef.current, forcedVideoTrack)));
  }, [syncPeerConnectionTracks]);

  const getLocalStream = useCallback(async (type, facing = 'user', enableCam = null) => {
    const wantCam = enableCam !== null ? enableCam : (type === 'video');
    let stream = localStreamRef.current;
    const hasAudio = stream?.getAudioTracks().some(isTrackLive);
    
    try {
      setCameraError(null);
      if (!stream || !hasAudio) {
        stream?.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      }
      
      let videoTrack = stream.getVideoTracks().find(isTrackLive) || null;
      if (wantCam && !videoTrack) {
        setCameraLoading(true);
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: facing }, audio: false,
          });
          videoTrack = videoStream.getVideoTracks()[0] || null;
          if (videoTrack) {
            stream.addTrack(videoTrack);
            videoTrack.onended = () => {
              try { localStreamRef.current?.removeTrack(videoTrack); } catch {}
              setCamOn(false);
              syncLocalPreview();
            };
          }
        } finally {
          setCameraLoading(false);
        }
      }
      if (!wantCam && videoTrack) {
        stream.getVideoTracks().forEach((t) => { t.stop(); try { stream.removeTrack(t); } catch {}; });
        videoTrack = null;
      }
      localStreamRef.current = stream;
      syncLocalPreview();
      setCamOn(Boolean(videoTrack));
      startSpeakingMonitor(myUserId, stream);
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
  }, [myUserId, startSpeakingMonitor, syncLocalPreview]);

  // ── createPC ──────────────────────────────────────────────────────────────
  const createPC = useCallback((targetUserId) => {
    const pid = String(targetUserId);
    const oldPc = pcMapRef.current.get(pid);
    if (oldPc) { try { oldPc.close(); } catch {} }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.__audioSender = audioTransceiver.sender;
    pc.__videoSender = videoTransceiver.sender;
    pcMapRef.current.set(pid, pc);
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) socket.emit('ice_candidate', { to: pid, candidate });
    };

    pc.ontrack = ({ streams }) => {
      const stream = streams?.[0];
      if (!stream) return;

      const attachRemote11 = () => {
        if (callSessionRef.current.isGroup) return;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.muted = deafened;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      };

      const refreshRemoteVideoState = () => {
        updateMemberState(pid, {
          status: 'joined',
          camOn: stream.getVideoTracks().some(isTrackLive),
          micOn: stream.getAudioTracks().some(isTrackLive) ? true : memberStatusRef.current?.[pid]?.micOn ?? true,
        }, 'joined');
        attachRemote11();
        setRemoteStreams((prev) => ({ ...prev, [pid]: stream }));
      };

      setRemoteStreams((prev) => ({ ...prev, [pid]: stream }));
      refreshRemoteVideoState();
      startSpeakingMonitor(pid, stream);
      attachRemote11();

      stream.addEventListener('addtrack', refreshRemoteVideoState);

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          updateMemberState(pid, {
            camOn: stream.getVideoTracks().some(isTrackLive),
            micOn: stream.getAudioTracks().some(isTrackLive) ? (memberStatusRef.current?.[pid]?.micOn ?? true) : false,
          }, 'joined');
          attachRemote11();
          if (!stream.getAudioTracks().some(isTrackLive)) stopSpeakingMonitor(pid);
        };
      });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      const key = String(pid);

      const clearDisconnectHangupTimer = () => {
        const t = peerDisconnectHangupTimersRef.current.get(key);
        if (t) {
          clearTimeout(t);
          peerDisconnectHangupTimersRef.current.delete(key);
        }
      };

      if (state === 'connected') {
        clearDisconnectHangupTimer();
        updateMemberState(pid, { status: 'joined' }, 'joined');
      }

      if (callSessionRef.current.isGroup) return;

      const finishPcHangup = () => {
        clearDisconnectHangupTimer();
        const dur = callDurationRef.current;
        const type = callTypeRef.current;
        const wasActive = callWasActiveRef.current;
        const status = wasActive ? 'ended' : (isCallerRef.current ? 'cancelled' : 'missed');
        setFinalDuration(dur);
        cleanup();
        setCallState('ended');
        fireCallEnd({ type, duration: dur, status });
        startCloseCountdown(5, resetToIdle);
      };

      if (state === 'failed' || state === 'closed') {
        finishPcHangup();
        return;
      }

      if (state === 'disconnected') {
        clearDisconnectHangupTimer();
        const timer = setTimeout(() => {
          peerDisconnectHangupTimersRef.current.delete(key);
          const stillPc = pcMapRef.current.get(key);
          if (stillPc !== pc) return;
          const s = pc.connectionState;
          if (s === 'connected' || s === 'connecting') return;
          finishPcHangup();
        }, PEER_DISCONNECT_GRACE_MS);
        peerDisconnectHangupTimersRef.current.set(key, timer);
      }
    };

    return pc;
  }, [cleanup, deafened, fireCallEnd, resetToIdle, socket, startCloseCountdown, startSpeakingMonitor, stopSpeakingMonitor, updateMemberState]);

  // ── Start Call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async (type) => {
    if (!socket) return;
    const meId = myUserId;
    const targets = isGroupCall
      ? callParticipants.map((p) => getParticipantId(p)).filter((id) => id && String(id) !== String(meId))
      : (getParticipantId(otherUser) ? [getParticipantId(otherUser)] : []);
    if (!targets.length) return;

    beginCallSession(isGroupCall, conversationId);

    isCallerRef.current = true;
    callEndFiredRef.current = false;
    callWasActiveRef.current = false;
    callTargetsRef.current = targets;
    callIdRef.current = `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCallType(type);
    callTypeRef.current = type;

    if (callRingtoneEnabled()) {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        await audioCtxRef.current.resume();
      } catch {}
    }

    setCallState('outgoing');

    if (isGroupCall) {
      const init = {};
      for (const targetId of targets) init[String(targetId)] = createParticipantState('pending');
      if (meId) init[String(meId)] = createParticipantState('joined');
      setMemberStatus(init);
    } else {
      setMemberStatus({});
    }

    try {
      await new Promise(r => setTimeout(r, 50));
      const stream = await getLocalStream(type);

      for (const targetId of targets) {
        const pc = createPC(targetId);
        await syncPeerConnectionTracks(pc, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call_user', {
          to: targetId,
          offer,
          callType: type,
          callId: callIdRef.current,
          conversationId,
          isGroup: isGroupCall,
          groupTargets: isGroupCall ? targets : undefined,
        });
      }

      // 1-1: đặt ring timeout
      if (!isGroupCall) {
        startRingTimeout(() => {
          const targetId = targets[0];
          const convId = callSessionRef.current.conversationId || conversationId;
          if (targetId && socket) socket.emit('end_call', { to: targetId, callId: callIdRef.current, conversationId: convId });
          cleanup();
          setCallState('ended');
          setFinalDuration(0);
          fireCallEnd({ type, duration: 0, status: 'missed' });
          startCloseCountdown(5, resetToIdle);
        });
      }
      // Group: KHÔNG ring timeout, chờ người accept
    } catch (err) {
      console.error('Lỗi bắt đầu call:', err);
      callEndFiredRef.current = false;
      cleanup();
      setCallState('idle');
    }
  }, [myUserId, otherUser, socket, createPC, cleanup, startRingTimeout, fireCallEnd, startCloseCountdown, resetToIdle, callParticipants, isGroupCall, conversationId, getLocalStream, syncPeerConnectionTracks, beginCallSession]);

  useEffect(() => { if (onStartCall) onStartCall(startCall); }, [startCall, onStartCall]);

  // ── Accept inline (1-1) ───────────────────────────────────────────────────
  const acceptCall = async () => {
    if (!incomingData || !socket) return;
    isCallerRef.current = false;
    callEndFiredRef.current = false;
    callWasActiveRef.current = false;
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    setRingCountdown(0);
    stopRingtone();
    try {
      await new Promise(r => setTimeout(r, 50));
      const preferredCam = incomingData.callType === 'video';
      const stream = await getLocalStream(incomingData.callType, facingModeRef.current, preferredCam);
      const pc = createPC(incomingData.from);
      await syncPeerConnectionTracks(pc, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const convId = incomingData.conversationId || callSessionRef.current.conversationId || conversationId;
      socket.emit('accept_call', { to: incomingData.from, answer, callId: incomingData.callId, conversationId: convId });
      callWasActiveRef.current = true;
      setCallState('active');
      startDurationTimer();
    } catch (err) {
      console.error('Lỗi chấp nhận call:', err);
      callEndFiredRef.current = false;
      cleanup();
      setCallState('idle');
    }
  };

  // ── Accept navigate (Group) ───────────────────────────────────────────────
  const acceptCallInRoom = useCallback(() => {
    if (!incomingData || !socket) return;
    isCallerRef.current = false;
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    setRingCountdown(0);
    stopRingtone();

    try {
      window.sessionStorage.setItem(PENDING_CALL_OFFER_KEY, JSON.stringify({
        from: incomingData.from,
        fromUser: incomingData.fromUser,
        offer: incomingData.offer,
        callId: incomingData.callId,
        callType: incomingData.callType,
        conversationId: incomingData.conversationId || conversationId,
        isGroup: !!incomingData.isGroup,
        timestamp: Date.now(),
      }));
    } catch {}

    setCallState('idle');
    setIncomingData(null);
    goToCallRoom(incomingData.callId, incomingData.callType, incomingData.conversationId || conversationId);
  }, [conversationId, goToCallRoom, incomingData, socket, stopRingtone]);

  const rejectCall = () => {
    if (!incomingData || !socket) return;
    const convId = incomingData.conversationId || callSessionRef.current.conversationId || conversationId;
    socket.emit('reject_call', { to: incomingData.from, reason: 'User declined', callId: incomingData.callId, conversationId: convId });
    clearTimeout(ringTimeoutRef.current);
    clearInterval(ringCountdownRef.current);
    setRingCountdown(0);
    setRejectedBy('me');
    if (callSessionRef.current.isGroup && myUserId) updateMemberState(myUserId, { status: 'rejected' }, 'rejected');
    cleanup();
    setCallState('rejected');
    startCloseCountdown(3, resetToIdle);
  };

  const endCall = () => {
    const dur = callDurationRef.current;
    const type = callTypeRef.current;
    const wasActive = callWasActiveRef.current;
    const callerMode = isCallerRef.current;
    const callId = callIdRef.current || incomingData?.callId;

    emitSpeakingState(false, Date.now(), true);

    const convId = callSessionRef.current.conversationId || conversationId;
    if (callSessionRef.current.isGroup) {
      if (socket && callId) socket.emit('leave_call', { callId, conversationId: convId });
    } else {
      const targets = callerMode
        ? [getParticipantId(otherUser)].filter(Boolean)
        : [incomingData?.from].filter(Boolean);
      if (targets.length && socket) {
        for (const to of targets) socket.emit('end_call', { to, callId, conversationId: convId });
      }
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    setFinalDuration(dur);
    cleanup();
    setCallState('ended');
    const status = wasActive ? 'ended' : (isCallerRef.current ? 'cancelled' : 'missed');
    fireCallEnd({ type, duration: dur, status });
    startCloseCountdown(5, resetToIdle);
  };

  // ── Controls ──────────────────────────────────────────────────────────────
  const getTargets = () => {
    const callerMode = isCallerRef.current;
    return callerMode
      ? (callSessionRef.current.isGroup ? callTargetsRef.current : [getParticipantId(otherUser)].filter(Boolean))
      : [incomingData?.from].filter(Boolean);
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
    if (myUserId) updateMemberState(myUserId, next ? { micOn: true } : { micOn: false, speaking: false }, 'joined');
    if (!next) emitSpeakingState(false, Date.now(), true);
    if (socket) getTargets().forEach(to => socket.emit('toggle_audio', { to, enabled: next, callId: callIdRef.current }));
  };

  const toggleCam = async () => {
    if (!localStreamRef.current) return;
    const stream = localStreamRef.current;
    if (camOn) {
      stream.getVideoTracks().forEach((track) => { track.stop(); try { stream.removeTrack(track); } catch {}; });
      await syncAllPeerConnections(null);
      syncLocalPreview();
      setCamOn(false);
      if (socket) getTargets().forEach(to => socket.emit('toggle_video', { to, enabled: false, callId: callIdRef.current }));
    } else {
      try {
        setCameraError(null);
        await getLocalStream(callTypeRef.current, facingModeRef.current, true);
        await syncAllPeerConnections();
        await renegotiateOneToOne();
        if (socket) getTargets().forEach(to => socket.emit('toggle_video', { to, enabled: true, callId: callIdRef.current }));
      } catch (err) {
        console.error('Lỗi bật camera:', err);
        // Không reset lại vì getLocalStream đã set error message
        // Chỉ log để debug
      }
    }
  };

  const toggleDeafen = () => {
    const next = !deafened;
    setDeafened(next);
    if (myUserId) updateMemberState(myUserId, { deafened: next }, 'joined');
    if (next && micOn) {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
      setMicOn(false);
      if (myUserId) updateMemberState(myUserId, { micOn: false, speaking: false }, 'joined');
      emitSpeakingState(false, Date.now(), true);
      if (socket) getTargets().forEach(to => socket.emit('toggle_audio', { to, enabled: false, callId: callIdRef.current }));
    }
    if (remoteAudioRef.current) remoteAudioRef.current.muted = next;
    if (socket) getTargets().forEach(to => socket.emit('toggle_deafen', { to, deafened: next, callId: callIdRef.current }));
  };

  const toggleScreenShare = async () => {
    const convForSig = () => callSessionRef.current.conversationId || conversationId;
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      await syncAllPeerConnections();
      await renegotiateOneToOne();
      if (socket) getTargets().forEach(to => socket.emit('screen_share_stopped', { to, conversationId: convForSig(), callId: callIdRef.current }));
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        await syncAllPeerConnections(screenTrack);
        await renegotiateOneToOne();
        if (screenVideoRef.current) screenVideoRef.current.srcObject = screenStream;
        screenTrack.onended = async () => {
          setScreenSharing(false);
          screenStreamRef.current = null;
          await syncAllPeerConnections();
          await renegotiateOneToOne();
          if (socket) getTargets().forEach(to => socket.emit('screen_share_stopped', { to, conversationId: convForSig(), callId: callIdRef.current }));
        };
        setScreenSharing(true);
        if (socket) getTargets().forEach(to => socket.emit('screen_share_started', { to, conversationId: convForSig(), callId: callIdRef.current }));
      } catch (err) {
        if (err.name !== 'NotAllowedError') console.error('Screen share error:', err);
      }
    }
  };

  const flipCamera = async () => {
    if (!localStreamRef.current || !camOn) return;
    const newFacing = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    facingModeRef.current = newFacing;
    try {
      const oldTracks = localStreamRef.current.getVideoTracks();
      oldTracks.forEach((t) => { t.stop(); try { localStreamRef.current.removeTrack(t); } catch {}; });
      await getLocalStream(callTypeRef.current, newFacing, true);
      await syncAllPeerConnections();
      await renegotiateOneToOne();
    } catch (err) { console.error('Flip camera error:', err); }
  };

  // ── Socket Events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onActiveCallExists = (data) => {
      if (!data) return;
      if (conversationId && data.conversationId != null && String(data.conversationId) !== String(conversationId)) return;
      setActiveCallInfo(data);
    };

    const onActiveCallUpdate = (data) => {
      if (!data) return;
      if (conversationId && data.conversationId != null && String(data.conversationId) !== String(conversationId)) return;
      setActiveCallInfo(data);
    };

    const onActiveCallEnded = (data = {}) => {
      setActiveCallInfo(null);
      if (callIdRef.current && data.callId && String(data.callId) === String(callIdRef.current) && callStateRef.current === 'active') {
        const dur = callDurationRef.current;
        cleanup();
        setFinalDuration(dur);
        setCallState('ended');
        fireCallEnd({ type: callTypeRef.current, duration: dur, status: 'ended' });
        startCloseCountdown(5, resetToIdle);
      }
    };

    const onPeerReconnecting = ({ from }) => {
      updateMemberState(from, { status: 'reconnecting' }, 'reconnecting');
    };

    const onCallPeers = async (data) => {
      const { callId: cid, peers = [], callType: ct, conversationId: cId, isGroup: ig } = data || {};
      callIdRef.current = cid || callIdRef.current;
      if (cId) beginCallSession(ig !== false, cId);
      setCallType(ct);
      callTypeRef.current = ct;
      setCallState('active');
      callWasActiveRef.current = true;
      syncParticipantsFromCall([myUserId, ...peers], 'active');
      try {
        const preferredCam = persistedCallRef.current?.camOn ?? (ct === 'video');
        await getLocalStream(ct, facingModeRef.current, preferredCam);
        startDurationTimer();
      } catch {}
    };

    const onPeerLeftCall = ({ from }) => {
      setLeavingUsers(prev => new Set([...prev, from]));
      updateMemberState(from, { status: 'left', speaking: false }, 'left');
      stopSpeakingMonitor(from);
      setRemoteStreams(prev => { const next = { ...prev }; delete next[from]; return next; });
      const pc = pcMapRef.current.get(from);
      if (pc) { try { pc.close(); } catch {} pcMapRef.current.delete(from); }
      setTimeout(() => {
        setLeavingUsers(prev => { const next = new Set(prev); next.delete(from); return next; });
      }, 600);

      // 1-1: peer rời → kết thúc
      if (!callSessionRef.current.isGroup) {
        const dur = callDurationRef.current;
        const type = callTypeRef.current;
        const wasActive = callWasActiveRef.current;
        setFinalDuration(dur);
        cleanup();
        setCallState('ended');
        fireCallEnd({ type, duration: dur, status: wasActive ? 'ended' : 'missed' });
        startCloseCountdown(5, resetToIdle);
      }
    };

    const onNewPeerJoined = async ({ from, fromUser, callId: cid }) => {
      if (!localStreamRef.current) return;
      const pc = createPC(from);
      await syncPeerConnectionTracks(pc, localStreamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const convId = callSessionRef.current.conversationId || conversationId;
      socket.emit('call_user', { to: from, offer, callType: callTypeRef.current, callId: cid, conversationId: convId, isGroup: true });
      updateMemberState(from, { status: 'joined' }, 'joined');
    };

    const onPeerRejoined = async ({ from, callId: cid }) => {
      if (!localStreamRef.current) return;
      updateMemberState(from, { status: 'joined' }, 'joined');
      const pc = createPC(from);
      await syncPeerConnectionTracks(pc, localStreamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const convId = callSessionRef.current.conversationId || conversationId;
      socket.emit('call_user', { to: from, offer, callType: callTypeRef.current, callId: cid, conversationId: convId, isGroup: true });
    };

    /** Chỉ dùng khi đã active + cùng callId: peer gửi offer renegotiate (bật cam / màn hình) — KHÔNG tạo PC mới */
    const handleIncomingRenegoOffer = async (data) => {
      const from = String(data?.from || '');
      if (!from) return;
      const pc = pcMapRef.current.get(from);
      if (!pc) {
        console.warn('Renego: không có PeerConnection cho', from);
        return;
      }
      callIdRef.current = data?.callId || callIdRef.current;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const convAns = data.conversationId || callSessionRef.current.conversationId || conversationId;
        socket.emit('accept_call', { to: data.from, answer, callId: data.callId, conversationId: convAns });
      } catch (err) {
        console.error('handleIncomingRenegoOffer', err);
      }
    };

    const onIncomingCall = async (data) => {
      const sameActiveCall = callIdRef.current && String(callIdRef.current) === String(data?.callId);
      const st = callStateRef.current;

      if (st !== 'idle') {
        if (sameActiveCall && st === 'active' && !data?.isGroup) {
          try { await handleIncomingRenegoOffer(data); } catch (err) { console.error('renego offer error:', err); }
          return;
        }
        socket.emit('call_busy', { to: data.from });
        return;
      }

      // FIX: lưu fromUser ngay khi nhận call, trước khi bất kỳ state nào thay đổi
      callerInfoRef.current = data.fromUser || null;
      beginCallSession(!!data.isGroup, data.conversationId || conversationId);

      setIncomingData(data);
      setCallType(data.callType);
      callTypeRef.current = data.callType;
      callIdRef.current = data?.callId || null;
      setCallState('incoming');

      if (data.isGroup) {
        // Group incoming: khởi tạo memberStatus pending
        const init = {};
        if (data?.from) init[String(data.from)] = createParticipantState('joined');
        if (myUserId) init[String(myUserId)] = createParticipantState('pending');
        setMemberStatus(init);
      } else {
        setMemberStatus({});
      }

      startRingTimeout(() => { cleanup(); setCallState('idle'); });
    };

    const applyServerStartedAt = (startedAt) => {
      if (!startedAt) return;
      const elapsed = getElapsedSeconds(startedAt);
      setCallDuration(elapsed);
      callDurationRef.current = elapsed;
    };

    const onCallTimeAnchor = ({ callId: cid, startedAt }) => {
      if (!cid || !callIdRef.current || String(cid) !== String(callIdRef.current)) return;
      if (callStateRef.current !== 'active') return;
      applyServerStartedAt(startedAt);
      clearInterval(durationTimer.current);
      durationTimer.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    };

    const onCallAccepted = async ({ answer, from, callId: cid, startedAt }) => {
      const expected = callIdRef.current;
      if (expected && cid && String(cid) !== String(expected)) return;

      // FIX: Group call → navigate sang CallRoom khi có người accept
      if (callSessionRef.current.isGroup && callStateRef.current === 'outgoing') {
        clearTimeout(ringTimeoutRef.current);
        clearInterval(ringCountdownRef.current);
        setRingCountdown(0);
        stopRingtone();
        // Lưu offer state để CallRoom có thể rejoin
        const nextCallId = cid || callIdRef.current;
        const convNav = callSessionRef.current.conversationId || conversationId;
        cleanup();
        goToCallRoom(nextCallId, callTypeRef.current, convNav);
        return;
      }

      // FIX: 1-1 call → xử lý WebRTC inline, KHÔNG navigate
      if (!callSessionRef.current.isGroup && callStateRef.current === 'outgoing') {
        clearTimeout(ringTimeoutRef.current);
        clearInterval(ringCountdownRef.current);
        setRingCountdown(0);
        stopRingtone();
        const pc = from ? pcMapRef.current.get(from) : pcRef.current;
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('setRemoteDescription error:', err);
          return;
        }
        callWasActiveRef.current = true;
        if (from) updateMemberState(from, { status: 'joined' }, 'joined');
        applyServerStartedAt(startedAt);
        setCallState('active');
        startDurationTimer();
        return;
      }

      // Active state (re-negotiate)
      const pc = from ? pcMapRef.current.get(from) : pcRef.current;
      if (!pc) return;
      try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch {}
    };

    const onCallRejected = ({ from, reason, callId: cid }) => {
      const expected = callIdRef.current;
      if (expected && cid && String(cid) !== String(expected)) return;

      // Group: chỉ update member status, không kết thúc
      if (callSessionRef.current.isGroup && isCallerRef.current) {
        updateMemberState(from, { status: 'rejected' }, 'rejected');
        return;
      }

      // 1-1: kết thúc
      const dur = callDurationRef.current;
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

    const onCallEnded = ({ callId: cid } = {}) => {
      const expected = callIdRef.current;
      if (expected && cid && String(cid) !== String(expected)) return;
      const dur = callDurationRef.current;
      const type = callTypeRef.current;
      const wasActive = callWasActiveRef.current;
      setFinalDuration(dur);
      cleanup();
      setCallState('ended');
      const status = wasActive ? 'ended' : (isCallerRef.current ? 'cancelled' : 'missed');
      fireCallEnd({ type, duration: dur, status });
      startCloseCountdown(5, resetToIdle);
    };

    const onCallBusy = ({ callId: cid } = {}) => {
      const expected = callIdRef.current;
      if (expected && cid && String(cid) !== String(expected)) return;
      if (callSessionRef.current.isGroup && isCallerRef.current) return;
      cleanup();
      setCallState('idle');
    };

    const onIceCandidate = async ({ candidate, from }) => {
      if (!candidate) return;
      const pc = from ? pcMapRef.current.get(from) : pcRef.current;
      if (!pc) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };

    const onGroupCallParticipantUpdate = ({ callId: cid, participantId, status } = {}) => {
      const expected = callIdRef.current;
      if (expected && cid && String(cid) !== String(expected)) return;
      if (!participantId) return;
      updateMemberState(participantId, { status: status || 'pending' }, status || 'pending');
    };

    socket.on('active_call_exists', onActiveCallExists);
    socket.on('active_call_update', onActiveCallUpdate);
    socket.on('active_call_ended', onActiveCallEnded);
    socket.on('peer_reconnecting', onPeerReconnecting);
    socket.on('call_peers', onCallPeers);
    socket.on('call_join_approved', onCallPeers);
    socket.on('peer_left_call', onPeerLeftCall);
    socket.on('new_peer_joined', onNewPeerJoined);
    socket.on('peer_rejoined', onPeerRejoined);
    socket.on('incoming_call', onIncomingCall);
    socket.on('call_accepted', onCallAccepted);
    socket.on('call_time_anchor', onCallTimeAnchor);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);
    socket.on('call_busy', onCallBusy);
    socket.on('ice_candidate', onIceCandidate);
    socket.on('group_call_participant_update', onGroupCallParticipantUpdate);

    const onPeerVideoToggle = ({ from, enabled }) => updateMemberState(from, { camOn: enabled }, 'joined');
    const onPeerAudioToggle = ({ from, enabled }) => updateMemberState(from, enabled ? { micOn: true } : { micOn: false, speaking: false }, 'joined');
    const onPeerDeafenToggle = ({ from, deafened: d }) => updateMemberState(from, { deafened: d }, 'joined');
    const onPeerScreenShareStarted = ({ from }) => updateMemberState(from, { screenSharing: true }, 'joined');
    const onPeerScreenShareStopped = ({ from }) => updateMemberState(from, { screenSharing: false }, 'joined');
    const onPeerSpeakingState = ({ from, speaking, lastSpokeAt, callId: cid }) => {
      const expected = callIdRef.current;
      if (expected && cid && String(cid) !== String(expected)) return;
      updateMemberState(from, speaking ? { speaking: true, lastSpokeAt: lastSpokeAt || Date.now() } : { speaking: false }, 'joined');
    };

    socket.on('peer_video_toggle', onPeerVideoToggle);
    socket.on('peer_audio_toggle', onPeerAudioToggle);
    socket.on('peer_deafen_toggle', onPeerDeafenToggle);
    socket.on('peer_screen_share_started', onPeerScreenShareStarted);
    socket.on('peer_screen_share_stopped', onPeerScreenShareStopped);
    socket.on('peer_speaking_state', onPeerSpeakingState);

    return () => {
      socket.off('active_call_exists', onActiveCallExists);
      socket.off('active_call_update', onActiveCallUpdate);
      socket.off('active_call_ended', onActiveCallEnded);
      socket.off('peer_reconnecting', onPeerReconnecting);
      socket.off('call_peers', onCallPeers);
      socket.off('call_join_approved', onCallPeers);
      socket.off('peer_left_call', onPeerLeftCall);
      socket.off('new_peer_joined', onNewPeerJoined);
      socket.off('peer_rejoined', onPeerRejoined);
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_time_anchor', onCallTimeAnchor);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
      socket.off('call_busy', onCallBusy);
      socket.off('ice_candidate', onIceCandidate);
      socket.off('group_call_participant_update', onGroupCallParticipantUpdate);
      socket.off('peer_video_toggle', onPeerVideoToggle);
      socket.off('peer_audio_toggle', onPeerAudioToggle);
      socket.off('peer_deafen_toggle', onPeerDeafenToggle);
      socket.off('peer_screen_share_started', onPeerScreenShareStarted);
      socket.off('peer_screen_share_stopped', onPeerScreenShareStopped);
      socket.off('peer_speaking_state', onPeerSpeakingState);
    };
  }, [socket, callState, cleanup, startDurationTimer, resetToIdle, startCloseCountdown, fireCallEnd, startRingTimeout, callParticipants, currentUser, createPC, conversationId, getLocalStream, myUserId, syncParticipantsFromCall, syncPeerConnectionTracks, updateMemberState, stopSpeakingMonitor, goToCallRoom, stopRingtone, beginCallSession]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (callState === 'idle') {
    if (activeCallInfo && activeCallInfo.conversationId === conversationId) {
      return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e2030] border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl">
          <div className={`w-2 h-2 rounded-full animate-pulse ${activeCallInfo.callType === 'video' ? 'bg-green-400' : 'bg-blue-400'}`} />
          <div>
            <p className="text-white text-sm font-semibold">
              {activeCallInfo.callType === 'video' ? '📹' : '📞'} Cuộc gọi đang diễn ra
            </p>
            <p className="text-white/50 text-xs">{activeCallInfo.participants?.length || 1} người đang tham gia</p>
          </div>
          {activeCallInfo.isGroup && (
            <button
              type="button"
              onClick={() => {
                if (activeCallInfo.callId) {
                  goToCallRoom(activeCallInfo.callId, activeCallInfo.callType, activeCallInfo.conversationId);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-xl transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Tham gia
            </button>
          )}
        </div>
      );
    }
    return null;
  }

  if (callState === 'incoming') {
    // FIX: 1-1 → acceptCall inline; Group → acceptCallInRoom navigate
    const handleAccept = incomingData?.isGroup ? acceptCallInRoom : acceptCall;
    const tilesForIncoming = incomingData?.isGroup && incomingData?.from
      ? (() => {
          const fromId = String(incomingData.from);
          if (allMemberTiles.some((m) => String(m.id) === fromId)) return allMemberTiles;
          return [
            {
              id: fromId,
              username: incomingData.fromUser?.username || 'Người gọi',
              avatar: incomingData.fromUser?.avatar,
            },
            ...allMemberTiles,
          ];
        })()
      : allMemberTiles;
    return (
      <IncomingCallScreen
        incomingData={incomingData}
        callType={callType}
        isGroupCall={Boolean(incomingData?.isGroup)}
        allMemberTiles={tilesForIncoming}
        onAccept={handleAccept}
        onReject={rejectCall}
        audioCtxRef={audioCtxRef}
      />
    );
  }

  if (callState === 'outgoing') {
    return (
      <OutgoingCallScreen
        otherUser={otherUser}
        callType={callType}
        ringCountdown={ringCountdown}
        isGroupCall={sessionIsGroup}
        allMemberTiles={allMemberTiles}
        memberStatus={memberStatus}
        onCancel={endCall}
        localVideoRef={localVideoRef}
        audioCtxRef={audioCtxRef}
      />
    );
  }

  if (callState === 'rejected') {
    // FIX: dùng callerInfoRef thay vì fallback sang otherUser
    const resolvedName = isCallerRef.current
      ? (otherUser?.username || 'Người dùng')
      : (callerInfoRef.current?.username || incomingData?.fromUser?.username || 'Người dùng');
    const msg = rejectedBy === 'me' ? 'Bạn đã từ chối cuộc gọi' : `${resolvedName} đã từ chối`;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(24px)' }}>
        <div className="flex flex-col items-center gap-5 w-72 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <PhoneOff className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Cuộc gọi bị từ chối</p>
            <p className="text-white/50 text-sm mt-1">{msg}</p>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/30 rounded-full transition-all duration-1000" style={{ width: `${(closeCountdown / 3) * 100}%` }} />
          </div>
          <p className="text-white/30 text-xs">Tự đóng sau {closeCountdown}s</p>
          <button onClick={resetToIdle} className="px-6 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition">
            Đóng ngay
          </button>
        </div>
      </div>
    );
  }

  if (callState === 'ended') {
    const dur = finalDuration || callDuration;
    // FIX: dùng callerInfoRef khi là callee, otherUser khi là caller
    const peerName = isCallerRef.current
      ? getParticipantName(otherUser)
      : getParticipantName(callerInfoRef.current || incomingData?.fromUser);
    const peerAvatar = isCallerRef.current
      ? getParticipantAvatar(otherUser)
      : getParticipantAvatar(callerInfoRef.current || incomingData?.fromUser);
    const color = getAvatarColor(peerName);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(24px)' }}>
        <div className="flex flex-col items-center gap-5 w-72 text-center">
          {peerAvatar ? (
            <img src={getFileUrl(peerAvatar)} alt={peerName} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className={`w-20 h-20 ${color} rounded-full flex items-center justify-center text-2xl font-bold text-white`}>
              {peerName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg">{peerName}</p>
            <p className="text-white/40 text-xs">{callType === 'video' ? 'Video call' : 'Cuộc gọi thoại'}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-2xl">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-mono font-bold text-xl">{formatDuration(dur)}</span>
          </div>
          <p className="text-white/40 text-sm">Cuộc gọi đã kết thúc</p>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/30 rounded-full transition-all duration-1000" style={{ width: `${(closeCountdown / 5) * 100}%` }} />
          </div>
          <button onClick={resetToIdle} className="px-6 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition">
            Đóng ngay
          </button>
        </div>
      </div>
    );
  }

  // ── Active Call (1-1 inline) ───────────────────────────────────────────────
  const peerId = String(primaryPeerId || '');
  // FIX: dùng callerInfoRef khi là callee, otherUser khi là caller
  const peerName = isCallerRef.current
    ? getParticipantName(otherUser)
    : getParticipantName(callerInfoRef.current || incomingData?.fromUser);
  const peerAvatar = isCallerRef.current
    ? getParticipantAvatar(otherUser)
    : getParticipantAvatar(callerInfoRef.current || incomingData?.fromUser);
  const peerState = memberStatus?.[peerId] || createParticipantState('joined');

  // Group active → grid (thường chỉ khi không navigate được / tái nhập từ persist)
  const activeTiles = sessionIsGroup
    ? allMemberTiles
      .map((member) => {
        const pid = String(member.id);
        const isSelf = pid === myUserId;
        const state = isSelf
          ? { ...(memberStatus?.[pid] || createParticipantState('joined')), micOn, camOn, deafened, screenSharing, speaking: memberStatus?.[pid]?.speaking || false }
          : { ...(memberStatus?.[pid] || createParticipantState('joined')) };
        return { member, pid, isSelf, state };
      })
      .filter(({ isSelf, state }) => (state.status === 'joined' || state.status === 'reconnecting' || isSelf) && state.status !== 'left')
    : [];

  const now = Date.now();
  const sortedGroupTiles = [...activeTiles].sort((left, right) => {
    const score = ({ isSelf, state }) =>
      (state.camOn || state.screenSharing ? 1000000 : 0)
      + (state.screenSharing ? 150000 : 0)
      + (state.speaking ? 90000 : 0)
      + (state.lastSpokeAt ? Math.max(0, 60000 - (now - state.lastSpokeAt)) : 0)
      + (isSelf ? 200 : 0);
    return score(right) - score(left);
  });

  const visibleGroupTiles = sortedGroupTiles.slice(0, 6);
  const gridTemplateColumns = visibleGroupTiles.length <= 1
    ? 'minmax(0, 1fr)'
    : visibleGroupTiles.length <= 4 ? 'repeat(2, minmax(0, 1fr))'
    : 'repeat(3, minmax(0, 1fr))';

  const getGroupTileWrapperClass = (index, count) => {
    if (count === 1) return 'min-h-[min(68vh,640px)]';
    if (count === 2) return 'min-h-[min(58vh,540px)]';
    if (count === 3 && index === 2) return 'col-span-2 flex justify-center min-h-[min(38vh,360px)]';
    if (count === 3) return 'min-h-[min(38vh,360px)]';
    if (count === 4) return 'min-h-[min(34vh,320px)]';
    return 'min-h-[min(30vh,280px)]';
  };

  return (
    <div className="fixed z-50 inset-0 bg-[#13141f] flex flex-col">
      {/* Audio element cho 1-1 */}
      {!sessionIsGroup && <audio ref={remoteAudioRef} autoPlay playsInline muted={deafened} />}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0d0e18]/90 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${callType === 'video' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${callType === 'video' ? 'bg-green-400' : 'bg-blue-400'}`} />
            <span className={`text-xs font-semibold ${callType === 'video' ? 'text-green-400' : 'text-blue-400'}`}>
              {callType === 'video' ? 'VIDEO' : 'VOICE'}
            </span>
          </div>
          <span className="text-white/70 text-sm font-medium">
            {sessionIsGroup ? `Nhóm · ${sortedGroupTiles.length} người` : peerName}
          </span>
          <span className="text-green-400 font-mono text-sm font-bold">{formatDuration(callDuration)}</span>
        </div>
        <button onClick={() => setIsFullscreen(v => !v)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 relative overflow-hidden">
        {screenSharing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10 p-4">
            <video ref={screenVideoRef} autoPlay playsInline muted className="max-w-full max-h-full rounded-xl object-contain" />
            <div className="absolute top-4 left-4 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Monitor className="w-3 h-3" /> Đang chia sẻ màn hình
            </div>
          </div>
        )}

        {/* Group call grid */}
        {sessionIsGroup && !screenSharing && (
          <div className="w-full h-full p-3 overflow-auto">
            <div className="mx-auto grid gap-3 h-full content-center" style={{ gridTemplateColumns }}>
              {visibleGroupTiles.map(({ member, pid, isSelf, state }, index) => {
                const stream = isSelf ? localStreamRef.current : remoteStreams[pid];
                const isLeaving = leavingUsers.has(pid);
                const isReconnecting = state.status === 'reconnecting';
                const wrapClass = visibleGroupTiles.length === 3 && index === 2 ? 'col-span-2 flex justify-center' : '';
                const innerStyle = visibleGroupTiles.length === 3 && index === 2 ? { width: 'min(100%, calc(50% - 0.5rem))' } : undefined;
                return (
                  <div key={pid} className={`relative transition-all duration-300 ${getGroupTileWrapperClass(index, visibleGroupTiles.length)} ${wrapClass}`}>
                    <div className="h-full" style={innerStyle}>
                      <ParticipantTile
                        member={member} isSelf={isSelf} stream={stream}
                        micOn={state.micOn !== false} camOn={Boolean(state.camOn)}
                        isScreenSharing={state.screenSharing} isSpeaking={state.speaking}
                        isLeaving={isLeaving} remoteMuted={deafened} tileClassName="h-full"
                        cameraLoading={isSelf && cameraLoading}
                      />
                    </div>
                    {isReconnecting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                        <span className="text-white/70 text-xs animate-pulse">Đang kết nối lại...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 1-1 call inline */}
        {!sessionIsGroup && !screenSharing && (
          <div className="w-full h-full flex items-center justify-center relative">
            {callType === 'video' && (peerState.camOn || remoteVideoRef.current?.srcObject?.getVideoTracks?.().some(isTrackLive)) ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-6">
                <ParticipantAvatar
                  member={{ username: peerName, avatar: peerAvatar }}
                  size={128}
                  speaking={peerState.speaking}
                />
                <p className="text-white text-2xl font-bold">{peerName}</p>
                <div className="flex gap-3">
                  {peerState.micOn === false && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full">
                      <MicOff className="w-4 h-4 text-red-400" />
                      <span className="text-red-300 text-xs font-medium">Đã tắt mic</span>
                    </div>
                  )}
                </div>
                <div className={`flex gap-1 items-end h-8 ${peerState.speaking ? 'opacity-100' : 'opacity-40'}`}>
                  {[8, 14, 20, 14, 8].map((h, i) => (
                    <div key={i} className="w-1.5 bg-green-400 rounded-full animate-bounce" style={{ height: h, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Local PiP khi camera bật */}
            {camOn && (
              <div className="absolute bottom-4 right-4 w-40 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-[#1a1b27] z-10 group">
                <video ref={localVideoRef} autoPlay playsInline muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                <button onClick={flipCamera}
                  className="absolute bottom-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div className="bg-[#0d0e18]/95 border-t border-white/5 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-center gap-1 mb-3 text-xs text-white/30 h-4">
          {deafened && <span className="flex items-center gap-1 text-orange-400"><EarOff className="w-3 h-3" />Đang tắt nghe</span>}
          {!micOn && !deafened && <span className="flex items-center gap-1 text-red-400"><MicOff className="w-3 h-3" />Mic đang tắt</span>}
          {camOn && <span className="flex items-center gap-1 text-blue-400"><Video className="w-3 h-3" />Camera đang bật</span>}
        </div>
        <div className="flex items-center justify-center gap-4">
          <CtrlBtn icon={micOn ? Mic : MicOff} label={micOn ? 'Tắt mic' : 'Bật mic'} active={micOn} onClick={toggleMic} />
          <CtrlBtn icon={deafened ? EarOff : Headphones} label={deafened ? 'Bỏ tắt nghe' : 'Tắt nghe'} active={!deafened} onClick={toggleDeafen} />
          <CtrlBtn icon={camOn ? Video : VideoOff} label={camOn ? 'Tắt cam' : 'Bật cam'} active={camOn} onClick={toggleCam} />
          {sessionIsGroup && (
            <CtrlBtn icon={Users} label={`${sortedGroupTiles.length} người`} active={true} disabled badge={sortedGroupTiles.length > 1 ? sortedGroupTiles.length : undefined} />
          )}
          <CtrlBtn icon={PhoneOff} label={sessionIsGroup ? 'Rời' : 'Kết thúc'} danger onClick={endCall} />
        </div>
      </div>
    </div>
  );
}