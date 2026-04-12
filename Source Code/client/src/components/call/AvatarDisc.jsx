import { useEffect, useState } from 'react';
import { getAvatarColor, getFileUrl, getParticipantAvatar, getParticipantName } from './callUtils';

export default function AvatarDisc({ member, size, className = '', textScale = 0.32 }) {
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
        src={avatarSrc}
        alt={name}
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