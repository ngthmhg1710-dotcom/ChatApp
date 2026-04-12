import { useEffect, useRef } from 'react';
import { MicOff, Monitor, Video, VideoOff } from 'lucide-react';
import AvatarDisc from './AvatarDisc';
import { getParticipantName } from './callUtils';

export default function ParticipantTile({
  member,
  isSelf,
  stream,
  micOn = true,
  camOn = true,
  isScreenSharing = false,
  isSpeaking = false,
  isLeaving = false,
  remoteMuted = false,
  tileClassName = '',
  cameraLoading = false,
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
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isSelf && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <AvatarDisc
            member={member}
            size={avatarSize}
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