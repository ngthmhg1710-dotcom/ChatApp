import AvatarDisc from './AvatarDisc';
import { getParticipantName } from './callUtils';

export default function ParticipantAvatar({ member, size = 28, speaking = false }) {
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