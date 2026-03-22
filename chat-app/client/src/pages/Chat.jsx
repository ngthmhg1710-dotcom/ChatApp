import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import {
  Send, Phone, Video, MoreVertical, Smile, Image, X,
  Trash2, BellOff, UserX, Flag, Search, Pin, Users,
  Reply, Forward, EyeOff, Edit3, Clock, Quote,
  Paperclip, FileText, ChevronDown, ChevronUp, File, Plus,
  Download, Copy, Share2, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import CallManager from '../components/CallManager';
import logo from '../assets/logo.png';

const API_URL   = import.meta.env.VITE_API_URL   || 'http://localhost:5000/api';
const BASE_URL  = import.meta.env.VITE_BASE_URL  || 'http://localhost:5000';
const MAX_LENGTH = 1000;
const PIN_LIMIT  = 3;
const MAX_IMAGES = 30;
const MAX_FILES  = 30;

function AppLogo({ size = 20, className = '' }) {
  return (
    <img src={logo} alt="Chat App Logo" width={size} height={size}
      className={`object-contain ${className}`} style={{ width: size, height: size }} />
  );
}

const EMOJI_CATEGORIES = {
  '😊': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','😐','😑','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡'],
  '👋': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾','👀','👅','👄','💋'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💯','✨','🔥','💫','⭐','🌟','💢','💥','💦','💨','🌈'],
  '🎉': ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🏅','🎖️','🎭','🎨','🎬','🎤','🎧','🎵','🎶','🎹','🥁','🎸','🎲','🎯','🎳','🎮','🕹️','🎰','🧩','🔮','🎪'],
  '🐶': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🦆','🐧','🐦','🦅','🦉','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🐬','🐳','🦄'],
  '🍕': ['🍕','🍔','🍟','🌭','🌮','🌯','🥙','🥚','🍳','🍲','🥗','🍿','🍱','🍜','🍝','🍣','🍤','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🥛','☕','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍾'],
  '✈️': ['✈️','🚀','🛸','🚁','🛶','⛵','🚤','🚢','🚂','🚄','🚆','🚇','🚌','🚑','🚒','🚓','🚕','🚗','🚙','🛻','🚲','🛴','🛹','🗺️','🧭','⛽','🚨','🚦','🚧','⚓','🌍','🌎','🌏','🏔️','🏕️','🏖️'],
};
const QUICK_REACTIONS = ['❤️','👍','😂','😮','😢','😡'];
const QUICK_EMOJI_BAR = ['😀','😂','🥰','😍','😎','🤩','😭','😅','🤣','😊','😇','🥺','😏','😒','😔','😤','🤔','🙄','😬','🥳','😴','🤯','🤗','😈','💀','🎉','🔥','💯','✨','❤️','🧡','💛','💚','💙','💜','🖤','💔','👍','👎','👏','🙌','🤝','🙏','💪','✌️','🤞','👌','🤙','👋','🫶','💋','😘','🤭','🫠','🥹','😶','🫡','🤫','😌'];

// ─── Emoji shortcode map ─────────────────────────────────────────────────────
const EMOJI_SHORTCODES = {
  // Mặt
  smile: '😊', happy: '😀', laugh: '😂', lol: '🤣', love: '🥰', kiss: '😘',
  wink: '😉', cool: '😎', think: '🤔', wow: '😮', cry: '😢', sad: '😔',
  angry: '😡', fire: '🔥', rage: '🤬', dead: '💀', devil: '😈', clown: '🤡',
  sleep: '😴', sick: '🤒', star: '🤩', party: '🥳', nerd: '🤓', shh: '🤫',
  // Gesture
  ok: '👌', yes: '👍', no: '👎', clap: '👏', hi: '👋', pray: '🙏',
  muscle: '💪', peace: '✌️', point: '☝️', fist: '✊', hug: '🤗',
  // Tim
  heart: '❤️', hearts: '💕', broken: '💔', orange: '🧡', yellow: '💛',
  green: '💚', blue: '💙', purple: '💜', black: '🖤', spark: '✨',
  // Celebration
  cheer: '🎉', tada: '🎊', balloon: '🎈', gift: '🎁', trophy: '🏆',
  gold: '🥇', medal: '🏅', music: '🎵', note: '🎶', game: '🎮',
  // Nature
  sun: '☀️', moon: '🌙', rain: '🌧️', snow: '❄️', rainbow: '🌈',
  flower: '🌸', rose: '🌹', tree: '🌳', dog: '🐶', cat: '🐱',
  // Food
  pizza: '🍕', burger: '🍔', cake: '🎂', coffee: '☕', beer: '🍺',
  wine: '🍷', star2: '⭐', bomb: '💣', poop: '💩', alien: '👽',
  // Misc
  check: '✅', cross: '❌', warning: '⚠️', info: 'ℹ️', question: '❓',
  up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️', back: '🔙',
  new2: '🆕', free: '🆓', hot: '🔥', cool2: '🆒', sos: '🆘',
};

function getEmojiSuggestions(word) {
  if (!word || word.length < 2) return []; // ít nhất 2 ký tự
  const q = word.toLowerCase();
  return Object.entries(EMOJI_SHORTCODES)
    .filter(([key]) => key.startsWith(q))
    .slice(0, 8)
    .map(([key, emoji]) => ({ key, emoji }));
}

function formatMsgTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function formatGroupTime(d) {
  if (!d) return '';
  const date = new Date(d), now = new Date();
  const diffD = Math.floor((now - date) / 86400000);
  const time = formatMsgTime(d);
  if (diffD === 0) return `Hôm nay ${time}`;
  if (diffD === 1) return `Hôm qua ${time}`;
  return date.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + time;
}
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function getFileUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${BASE_URL}${fileUrl}`;
}

function Avatar({ username = '', size = 8, onClick, avatarUrl }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  if (avatarUrl) {
    return (
      <img src={getFileUrl(avatarUrl)} alt={username} onClick={onClick}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 select-none ${onClick ? 'cursor-pointer hover:opacity-80 transition' : ''}`} />
    );
  }
  return (
    <div onClick={onClick}
      className={`w-${size} h-${size} ${color} rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0 select-none ${onClick ? 'cursor-pointer hover:opacity-80 transition' : ''}`}>
      {initials}
    </div>
  );
}

// ─── Forward Modal ────────────────────────────────────────────────────────────
function ForwardModal({ msg, onClose, socket, activeConversationId }) {
  const [friends, setFriends]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(new Set());
  const [sent, setSent]           = useState(new Set());
  const [searchQ, setSearchQ]     = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/friends`)
      .then(({ data }) => setFriends(data.data?.friends || data.data || []))
      .catch(() => toast.error('Không thể tải danh sách bạn bè'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = friends.filter(f =>
    f.username?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleForwardTo = async (friend) => {
    if (sent.has(friend._id) || sending.has(friend._id)) return;
    setSending(prev => new Set([...prev, friend._id]));
    try {
      const { data } = await axios.post(`${API_URL}/conversations`, { participantId: friend._id });
      const conv = data.data?.conversation || data.data;
      if (!conv?._id) throw new Error('No conversation');
      socket.emit('send_message', {
        conversationId: conv._id,
        content:  msg.content || '',
        type:     msg.type || 'text',
        fileUrl:  msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
      });
      setSent(prev => new Set([...prev, friend._id]));
      toast.success(`Đã chuyển tiếp đến ${friend.username}`);
    } catch {
      toast.error('Không thể chuyển tiếp');
    } finally {
      setSending(prev => { const n = new Set(prev); n.delete(friend._id); return n; });
    }
  };

  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-80 overflow-hidden flex flex-col max-h-[75vh]">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-base">Chuyển tiếp tin nhắn</h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-gray-50 rounded-2xl px-3 py-2.5 mb-3 border border-gray-100">
            {msg.type === 'image' && msg.fileUrl ? (
              <div className="flex items-center gap-2">
                <img src={getFileUrl(msg.fileUrl)} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                <span className="text-xs text-gray-500 truncate">{msg.content || '🖼️ Ảnh'}</span>
              </div>
            ) : msg.type === 'file' && msg.fileUrl ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 truncate">{msg.fileName || 'File'}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-600 line-clamp-2">{msg.content}</p>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{searchQ ? 'Không tìm thấy' : 'Chưa có bạn bè'}</p>
            </div>
          ) : (
            filtered.map(friend => {
              const color    = COLORS[(friend.username?.charCodeAt(0) || 0) % COLORS.length];
              const isSent   = sent.has(friend._id);
              const isSending = sending.has(friend._id);
              return (
                <button key={friend._id}
                  onClick={() => handleForwardTo(friend)}
                  disabled={isSent}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition mb-1
                    ${isSent ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                  {friend.avatar ? (
                    <img src={getFileUrl(friend.avatar)} alt={friend.username}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
                      {friend.username?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-gray-800 truncate">{friend.username}</p>
                    <p className="text-xs text-gray-400 truncate">{friend.email}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition
                    ${isSent ? 'bg-green-500' : isSending ? 'bg-gray-200' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isSent ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isSending ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Forward className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-2xl hover:bg-gray-200 transition">
            {sent.size > 0 ? `Đã gửi đến ${sent.size} người · Đóng` : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ msg, onClose }) {
  const content  = msg.content || '';
  const fileUrl  = msg.fileUrl ? getFileUrl(msg.fileUrl) : null;
  const shareText = content || (fileUrl ? `[File: ${msg.fileName || 'file'}]` : '');
  const shareUrl  = fileUrl || window.location.href;

  const handleNativeShare = async () => {
    if (!navigator.share) { toast.error('Trình duyệt không hỗ trợ chia sẻ'); return; }
    try {
      await navigator.share({ title: 'Chia sẻ tin nhắn', text: shareText, url: shareUrl });
    } catch (e) {
      if (e.name !== 'AbortError') toast.error('Không thể chia sẻ');
    }
  };

  const shareApps = [
    { name: 'Facebook Messenger', icon: '💬', color: 'bg-blue-500', url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=your_app_id&redirect_uri=${encodeURIComponent(window.location.href)}` },
    { name: 'Zalo',               icon: '🔵', color: 'bg-blue-400', url: `https://zalo.me/share?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'WhatsApp',           icon: '📱', color: 'bg-green-500', url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
    { name: 'Telegram',           icon: '✈️', color: 'bg-sky-500',  url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { name: 'Twitter / X',        icon: '🐦', color: 'bg-gray-900', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'Email',              icon: '📧', color: 'bg-red-500',  url: `mailto:?subject=Chia sẻ tin nhắn&body=${encodeURIComponent(shareText + '\n' + shareUrl)}` },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fileUrl || shareText);
    toast.success('Đã sao chép!');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:w-80 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-base">Chia sẻ</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        {navigator.share && (
          <div className="px-5 py-3 border-b border-gray-100">
            <button onClick={handleNativeShare}
              className="w-full flex items-center gap-3 py-3 px-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition font-semibold text-sm">
              <Share2 className="w-4 h-4" />Chia sẻ qua hệ thống
            </button>
          </div>
        )}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Chia sẻ qua ứng dụng</p>
          <div className="grid grid-cols-3 gap-3">
            {shareApps.map(app => (
              <a key={app.name} href={app.url} target="_blank" rel="noreferrer" onClick={onClose}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-gray-50 transition">
                <div className={`w-12 h-12 ${app.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm`}>{app.icon}</div>
                <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">{app.name}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={handleCopyLink}
            className="w-full flex items-center gap-3 py-3 px-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition text-sm font-semibold">
            <Copy className="w-4 h-4" />Sao chép {fileUrl ? 'link' : 'nội dung'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CallMessageItem ──────────────────────────────────────────────────────────
// FIX: Replaced `config` with `cfg`, fixed variable references throughout
function CallMessageItem({ msg, mine, onCallback }) {
  const content = msg.content || '';
  const isVideo = content.includes('video') || content.includes('📹');
  let status    = 'ended';
  if      (content.includes('nhỡ'))     status = 'missed';
  else if (content.includes('từ chối')) status = 'rejected';
  else if (content.includes('đã hủy'))  status = 'cancelled';

  const durText = content
    .replace(/^📹\s*|^📞\s*/, '')
    .replace('Cuộc gọi video · ', '')
    .replace('Cuộc gọi thoại · ', '')
    .trim();

  const cfgMap = {
    ended:     { iconBg: 'bg-green-100', iconColor: 'text-green-600', titleColor: 'text-green-700', title: isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại',                       sub: durText ? `⏱ ${durText}` : null, bubbleMine: 'bg-blue-50 border-blue-200',  bubbleOther: 'bg-green-50 border-green-200', showCallback: false, icon: isVideo ? '📹' : '📞' },
    missed:    { iconBg: 'bg-red-100',   iconColor: 'text-red-500',   titleColor: 'text-red-600',   title: isVideo ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ',               sub: 'Không có ai trả lời',              bubbleMine: 'bg-blue-50 border-blue-200',  bubbleOther: 'bg-red-50 border-red-200',     showCallback: true,  icon: '📵' },
    rejected:  { iconBg: 'bg-red-100',   iconColor: 'text-red-500',   titleColor: 'text-red-600',   title: isVideo ? 'Cuộc gọi video bị từ chối' : 'Cuộc gọi thoại bị từ chối', sub: 'Cuộc gọi đã bị từ chối',          bubbleMine: 'bg-blue-50 border-blue-200',  bubbleOther: 'bg-red-50 border-red-200',     showCallback: true,  icon: '📵' },
    cancelled: { iconBg: 'bg-gray-100',  iconColor: 'text-gray-500',  titleColor: 'text-gray-600',  title: isVideo ? 'Cuộc gọi video đã hủy' : 'Cuộc gọi thoại đã hủy',         sub: 'Người gọi đã hủy cuộc gọi',       bubbleMine: 'bg-blue-50 border-blue-200',  bubbleOther: 'bg-gray-50 border-gray-200',   showCallback: true,  icon: '📵' },
  };
  const cfg = cfgMap[status];

  const bubbleCls      = mine ? cfg.bubbleMine : cfg.bubbleOther;
  const callbackBtnCls = mine ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[260px]`}>
        <div className={`border rounded-2xl px-4 py-2.5 ${bubbleCls} ${mine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
              <span className="text-base">{cfg.icon}</span>
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold leading-tight ${cfg.titleColor}`}>
                {cfg.title}
              </p>
              {cfg.sub && (
                <p className="text-[11px] text-gray-500 mt-0.5">{cfg.sub}</p>
              )}
            </div>
          </div>
          {cfg.showCallback && (
            <button onClick={() => onCallback(isVideo ? 'video' : 'audio')}
              className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition ${callbackBtnCls}`}>
              <Phone className="w-3.5 h-3.5" /> Gọi lại
            </button>
          )}
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatMsgTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Multi-image preview grid ─────────────────────────────────────────────────
function ImagePreviewGrid({ images, onRemove, onAddMore, caption, onCaptionChange, maxImages }) {
  const addRef = useRef(null);
  const canAdd = images.length < maxImages;
  return (
    <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((img, i) => (
          <div key={i} className="relative group w-20 h-20 flex-shrink-0">
            <img src={img.url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
            <button onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {canAdd && (
          <button onClick={() => addRef.current?.click()}
            className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition text-gray-400 hover:text-blue-500">
            <Plus className="w-5 h-5" />
            <span className="text-[10px]">{images.length}/{maxImages}</span>
          </button>
        )}
        <input ref={addRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { onAddMore(Array.from(e.target.files || [])); e.target.value = ''; }} />
      </div>
      <input value={caption} onChange={e => onCaptionChange(e.target.value)}
        placeholder="Thêm chú thích cho ảnh..."
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:bg-white transition"
        maxLength={500} />
      <p className="text-[10px] text-gray-400 mt-1">{images.length} ảnh · {formatFileSize(images.reduce((s, i) => s + i.file.size, 0))}</p>
    </div>
  );
}

// ─── Multi-file preview list ──────────────────────────────────────────────────
function FilePreviewList({ files, onRemove, onAddMore, maxFiles }) {
  const addRef = useRef(null);
  const canAdd = files.length < maxFiles;
  return (
    <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2">
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{f.file.name}</p>
              <p className="text-[10px] text-gray-400">{formatFileSize(f.file.size)}</p>
            </div>
            <button onClick={() => onRemove(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {canAdd && (
        <button onClick={() => addRef.current?.click()}
          className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition">
          <Plus className="w-3.5 h-3.5" /> Thêm file ({files.length}/{maxFiles})
        </button>
      )}
      <input ref={addRef} type="file" multiple className="hidden"
        onChange={(e) => { onAddMore(Array.from(e.target.files || [])); e.target.value = ''; }} />
    </div>
  );
}

function PinnedBanner({ pinnedMessages, onScrollToPin, onUnpin }) {
  const [showAll, setShowAll] = useState(false);
  if (!pinnedMessages?.length) return null;
  const latest = pinnedMessages[pinnedMessages.length - 1];
  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
      <div className="flex items-center gap-2">
        <Pin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">Tin ghim · {pinnedMessages.length}/{PIN_LIMIT}</p>
          <button onClick={() => onScrollToPin(latest._id)}
            className="text-xs text-blue-700 font-medium truncate block max-w-full text-left hover:underline">
            {latest.sender?.username}: {latest.content || '📎 File'}
          </button>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {pinnedMessages.length > 1 && (
            <button onClick={() => setShowAll(v => !v)} className="p-1 text-blue-500 hover:bg-blue-100 rounded-lg transition">
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => onUnpin(latest._id)} className="p-1 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {showAll && pinnedMessages.length > 1 && (
        <div className="mt-2 space-y-1">
          {[...pinnedMessages].reverse().map((pm, i) => (
            <div key={pm._id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-blue-100">
              <span className="text-[10px] text-blue-400 font-bold w-4">{i + 1}</span>
              <button onClick={() => onScrollToPin(pm._id)} className="flex-1 text-xs text-gray-700 truncate text-left hover:text-blue-600">
                {pm.sender?.username}: {pm.content || '📎 File'}
              </button>
              <button onClick={() => onUnpin(pm._id)} className="text-gray-400 hover:text-red-500 transition flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmojiPicker({ onSelect, onClose, triggerRef }) {
  const [activeTab, setActiveTab] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      // Không đóng nếu click vào chính nút toggle emoji
      if (triggerRef?.current?.contains(e.target)) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, triggerRef]);

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      {/* Header tabs + nút đóng */}
      <div className="flex items-center border-b border-gray-100 px-1 pt-1 gap-0.5">
        <div className="flex overflow-x-auto flex-1 gap-0.5">
          {Object.keys(EMOJI_CATEGORIES).map(cat => (
            <button key={cat}
              onMouseDown={e => e.preventDefault()} // ngăn input mất focus
              onClick={() => setActiveTab(cat)}
              className={`flex-shrink-0 px-3 py-1.5 text-base rounded-t-lg transition ${activeTab === cat ? 'bg-blue-50 scale-110' : 'hover:bg-gray-50'}`}>
              {cat}
            </button>
          ))}
        </div>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={onClose}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition mr-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_CATEGORIES[activeTab].map(emoji => (
            <button key={emoji}
              onMouseDown={e => e.preventDefault()} // giữ focus input, không đóng picker
              onClick={() => onSelect(emoji)}        // chèn emoji, KHÔNG đóng picker
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition hover:scale-125">
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatMenu({ onClose, otherUser, onClearChat }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const items = [
    { icon: Search,  label: 'Tìm kiếm tin nhắn', action: () => { toast('Đang phát triển'); onClose(); } },
    { icon: BellOff, label: 'Tắt thông báo',       action: () => { toast.success('Đã tắt'); onClose(); } },
    { icon: Users,   label: 'Xem thành viên',       action: () => { toast('Đang phát triển'); onClose(); } },
    { icon: Trash2,  label: 'Xóa lịch sử chat',    action: () => { onClearChat(); onClose(); }, danger: true },
    { icon: UserX,   label: 'Chặn người dùng',      action: () => { toast.error('Đã chặn'); onClose(); }, danger: true },
    { icon: Flag,    label: 'Báo cáo',              action: () => { toast('Đã gửi báo cáo'); onClose(); }, danger: true },
  ];
  return (
    <div ref={ref} className="absolute top-full right-0 mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden">
      {items.map(({ icon: Icon, label, action, danger }) => (
        <button key={label} onClick={action}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-gray-50 ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700'}`}>
          <Icon className="w-4 h-4 flex-shrink-0" />{label}
        </button>
      ))}
    </div>
  );
}

function ProfilePopup({ user: pu, onClose, onUnfriend }) {
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
  const color = COLORS[(pu?.username?.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 overflow-hidden" style={{ top: 80, left: 360 }}>
      <div className={`h-14 ${color} opacity-20`} />
      <div className="-mt-7 px-4 flex items-end justify-between">
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center font-bold text-white text-base ring-4 ring-white`}>
          {pu?.username?.slice(0, 2).toUpperCase()}
        </div>
        <button onClick={onClose} className="mb-1 p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="px-4 pb-4 pt-1">
        <p className="font-bold text-gray-900">{pu?.username}</p>
        <p className="text-xs text-gray-400">{pu?.email}</p>
        {pu?.bio && <p className="text-sm text-gray-600 mt-1.5">{pu.bio}</p>}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`w-2 h-2 rounded-full ${pu?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-gray-400">{pu?.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button onClick={onClose} className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">Tin nhắn</button>
          <button onClick={() => { onUnfriend(pu._id); onClose(); }}
            className="w-full py-2 bg-red-50 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2">
            <UserX className="w-4 h-4" /> Xóa bạn bè
          </button>
        </div>
      </div>
    </div>
  );
}

// FIX: Removed duplicate `const sorted` declaration
function EditHistoryPopup({ history, onClose, mine }) {
  const ref    = useRef(null);
  const sorted = [...history].reverse(); // single declaration
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref}
      className={`absolute z-30 w-64 rounded-xl overflow-hidden shadow-2xl
        ${mine ? 'bg-blue-900/95 border border-blue-700 right-0 bottom-full mb-1'
                : 'bg-gray-800/95 border border-gray-600 left-0 bottom-full mb-1'}`}>
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <p className="font-semibold text-white text-xs flex items-center gap-1.5">
          <Edit3 className="w-3 h-3" /> Lịch sử chỉnh sửa ({history.length})
        </p>
        <button onClick={onClose}><X className="w-3.5 h-3.5 text-white/50 hover:text-white" /></button>
      </div>
      <div className="max-h-52 overflow-y-auto divide-y divide-white/10">
        {sorted.map((entry, i) => (
          <div key={i} className={`px-3 py-2 ${i === 0 ? 'bg-white/10' : ''}`}>
            <p className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1">
              {i === 0 ? <><Edit3 className="w-2.5 h-2.5" /> Nội dung trước khi sửa lần cuối</> : `Phiên bản ${history.length - i}`}
              {' · '}{formatMsgTime(entry.editedAt)}
            </p>
            <p className="text-xs text-white/80 break-words leading-relaxed">{entry.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PinNotification({ notification }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
        <Pin className="w-3 h-3" />
        {notification.text}
        <span className="text-amber-400 text-[10px]">{formatMsgTime(notification.time)}</span>
      </span>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg, mine, showAvatar, isLastInGroup, isRead,
  onReact, onReply, onEdit, onDelete, onForward, onHide, onPin, replyMap, isPinned,
  onShare,
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu]             = useState(false);
  const [showHistory, setShowHistory]               = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const h = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMoreMenu]);

  const editHistory    = msg.editHistory || [];
  const isEdited       = editHistory.length > 0 || msg.isEdited;
  const isFileType     = msg.type === 'file';
  const isImageType    = msg.type === 'image';
  const isMediaMessage = isImageType || isFileType || msg.type === 'system';

  const replyMsg = msg.replyTo
    ? (typeof msg.replyTo === 'object' ? msg.replyTo : replyMap[msg.replyTo])
    : null;

  const reactionsObj = msg.reactions instanceof Map
    ? Object.fromEntries(msg.reactions)
    : (msg.reactions || {});
  const hasReactions = Object.entries(reactionsObj).some(([, u]) => (u || []).length > 0);

  const handleDownload = () => {
    if (!msg.fileUrl) return;
    const a = document.createElement('a');
    a.href     = getFileUrl(msg.fileUrl);
    a.download = msg.fileName || 'download';
    a.target   = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    if (isFileType) return;
    const text = isImageType ? getFileUrl(msg.fileUrl || '') : (msg.content || '');
    navigator.clipboard.writeText(text);
    toast.success(isImageType ? 'Đã sao chép link ảnh!' : 'Đã sao chép!');
  };

  const moreItems = [
    { icon: Pin,      label: isPinned ? 'Bỏ ghim' : 'Ghim', action: () => { onPin(msg); setShowMoreMenu(false); } },
    { icon: Reply,    label: 'Trả lời',    action: () => { onReply(msg); setShowMoreMenu(false); } },
    { icon: Forward,  label: 'Chuyển tiếp', action: () => { onForward(msg); setShowMoreMenu(false); } },
    ...(!isFileType ? [{ icon: Copy,   label: isImageType ? 'Sao chép link ảnh' : 'Sao chép', action: () => { handleCopy(); setShowMoreMenu(false); } }] : []),
    ...(isMediaMessage && msg.fileUrl ? [{ icon: Download, label: 'Tải xuống', action: () => { handleDownload(); setShowMoreMenu(false); } }] : []),
    { icon: Share2,   label: 'Chia sẻ',    action: () => { onShare(msg); setShowMoreMenu(false); } },
    { icon: EyeOff,   label: 'Ẩn',          action: () => { onHide(msg._id); setShowMoreMenu(false); } },
    ...(mine && !isMediaMessage ? [{ icon: Edit3,  label: 'Chỉnh sửa', action: () => { onEdit(msg); setShowMoreMenu(false); } }] : []),
    ...(mine                    ? [{ icon: Trash2, label: 'Xóa',       action: () => { onDelete(msg._id); setShowMoreMenu(false); }, danger: true }] : []),
  ];

  // FIX: Removed stray `} : null}` — content rendering now uses proper if/else chain
  const renderContent = () => {
    if (msg.hidden) {
      return (
        <div className="px-4 py-2 rounded-2xl text-xs italic text-gray-400 bg-gray-50 border border-dashed border-gray-200">
          Tin nhắn đã bị ẩn
        </div>
      );
    }
    if (msg.type === 'image' && msg.fileUrl) {
      return (
        <div className="flex flex-col gap-1 max-w-[280px]">
          <img src={getFileUrl(msg.fileUrl)} alt="Ảnh"
            className={`w-full rounded-2xl object-cover cursor-pointer hover:opacity-90 transition ${msg.status === 'sending' ? 'opacity-70' : ''}`}
            onClick={() => window.open(getFileUrl(msg.fileUrl), '_blank')}
            onError={(e) => { e.target.style.display='none'; }} />
          {msg.content && (
            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
              ${mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
              {msg.content}
            </div>
          )}
        </div>
      );
    }
    if (msg.type === 'file' && msg.fileUrl) {
      return (
        <a href={getFileUrl(msg.fileUrl)} target="_blank" rel="noreferrer"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:opacity-90 transition max-w-[220px]
            ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}
            ${msg.status === 'sending' ? 'opacity-70' : ''}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${mine ? 'bg-blue-500' : 'bg-gray-100'}`}>
            <FileText className={`w-5 h-5 ${mine ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{msg.fileName || 'File'}</p>
            <p className={`text-[10px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>{formatFileSize(msg.fileSize)}</p>
          </div>
          <button onClick={handleDownload}
            className={`flex-shrink-0 p-1.5 rounded-lg transition ${mine ? 'hover:bg-blue-500' : 'hover:bg-gray-100'}`}
            title="Tải xuống">
            <Download className={`w-4 h-4 ${mine ? 'text-white/80' : 'text-gray-500'}`} />
          </button>
        </a>
      );
    }
    return (
      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
        ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}
        ${msg.status === 'sending' ? 'opacity-70' : ''}`}>
        {msg.content}
      </div>
    );
  };

  return (
    <div id={`msg-${msg._id}`}
      className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} ${isPinned ? 'bg-yellow-50/40 -mx-2 px-2 rounded-xl' : ''}`}>
      {!mine && (
        <div className="w-8 flex-shrink-0 self-end">
          {showAvatar
            ? <Avatar username={msg.sender?.username || '?'} size={8} avatarUrl={msg.sender?.avatar} />
            : <div className="w-8" />}
        </div>
      )}
      <div className={`flex items-end gap-1 ${mine ? 'flex-row-reverse' : 'flex-row'} max-w-[68%]`}>
        <div className={`flex flex-col min-w-0 ${mine ? 'items-end' : 'items-start'}`}>
          {replyMsg && (
            <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs w-full
              ${mine ? 'bg-blue-800/30 border-l-2 border-blue-300 text-blue-100'
                     : 'bg-gray-200 border-l-2 border-gray-500 text-gray-700'}`}>
              <p className="font-bold text-[11px] mb-0.5 opacity-80">{replyMsg.sender?.username || replyMsg.sender}</p>
              <p className="truncate opacity-70">{typeof replyMsg === 'object' ? (replyMsg.content || '📎 File') : '...'}</p>
            </div>
          )}

          {renderContent()}

          {hasReactions && (
            <div className={`flex flex-wrap gap-0.5 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactionsObj).map(([emoji, users]) =>
                (users || []).length > 0 && (
                  <button key={emoji} onClick={() => onReact(msg._id, emoji)}
                    className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm hover:border-blue-300 transition">
                    {emoji} <span className="text-gray-500 font-medium">{users.length}</span>
                  </button>
                )
              )}
            </div>
          )}

          {isEdited && !isMediaMessage && (
            <div className={`relative mt-0.5 ${mine ? 'self-end' : 'self-start'}`}>
              <button onClick={() => setShowHistory(v => !v)}
                className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600 transition">
                <Edit3 className="w-2.5 h-2.5" /> đã sửa
              </button>
              {showHistory && editHistory.length > 0 && (
                <EditHistoryPopup history={editHistory} onClose={() => setShowHistory(false)} mine={mine} />
              )}
            </div>
          )}

          {isLastInGroup && (
            <div className={`flex items-center gap-1 mt-1 px-0.5 ${mine ? 'flex-row-reverse' : ''}`}>
              {isPinned && <Pin className="w-2.5 h-2.5 text-amber-500" />}
              <span className="text-[10px] text-gray-400">{formatMsgTime(msg.createdAt)}</span>
              {mine && (
                <span className={`text-[10px] font-medium ${isRead ? 'text-blue-500' : 'text-gray-400'}`}>
                  {msg.status === 'sending' ? '○' : isRead ? '✓✓ Đã xem' : '✓✓'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="relative">
            <button onClick={() => setShowReactionPicker(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-base leading-none">❤️</button>
            {showReactionPicker && (
              <div className={`absolute ${mine ? 'right-0' : 'left-0'} bottom-full mb-1.5 flex gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-1.5 z-20`}
                style={{ minWidth: 'max-content' }}>
                {QUICK_REACTIONS.map(r => (
                  <button key={r} onClick={() => { onReact(msg._id, r); setShowReactionPicker(false); }}
                    className="text-xl hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onReply(msg)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
            <Quote className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <div className="relative" ref={moreRef}>
            <button onClick={() => setShowMoreMenu(v => !v)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition ${showMoreMenu ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {showMoreMenu && (
              <div className={`absolute ${mine ? 'right-0' : 'left-0'} bottom-full mb-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 py-1 overflow-hidden`}>
                {moreItems.map(({ icon: Icon, label, action, danger }) => (
                  <button key={label} onClick={action}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition hover:bg-gray-50 ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700'}`}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Guard module-level: chỉ restore conversation 1 lần duy nhất trong toàn bộ
// vòng đời app — không bị reset khi component unmount/mount lại
let _conversationRestored = false;

export default function Chat() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages]             = useState([]);
  const [inputMessage, setInputMessage]     = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers]       = useState(new Set());
  const [isTyping, setIsTyping]             = useState(false);
  const [onlineUsers, setOnlineUsers]       = useState(new Set());
  const [imagePreviews, setImagePreviews]   = useState([]); // { file, url }[]
  const [filePreviews, setFilePreviews]     = useState([]); // { file }[]
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showEmoji, setShowEmoji]           = useState(false);
  const [emojiTab, setEmojiTab]             = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [showMenu, setShowMenu]             = useState(false);
  const [showProfile, setShowProfile]       = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyingTo, setReplyingTo]         = useState(null);
  const [editingMsg, setEditingMsg]         = useState(null);
  const [editInput, setEditInput]           = useState('');
  const [pinNotifications, setPinNotifications] = useState([]);
  const [imageCaption, setImageCaption]     = useState('');
  const [forwardMsg, setForwardMsg]         = useState(null);
  const [shareMsg, setShareMsg]             = useState(null);
  const [emojiSuggestions, setEmojiSuggestions] = useState([]); // [{key, emoji}]
  const [suggestionIndex, setSuggestionIndex]   = useState(0);
  const suggestRef = useRef(null);

  const startCallRef   = useRef(null);
  const fileInputRef   = useRef(null);
  const attachInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const inputRef       = useRef(null);
  const activeConvRef  = useRef(null);
  const otherUserRef   = useRef(null);
  const attachMenuRef  = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPanelRef  = useRef(null); // ref bọc cả nút + panel emoji

  // Đóng attach menu khi click ra ngoài
  useEffect(() => {
    if (!showAttachMenu) return;
    const handler = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAttachMenu]);

  // Đóng emoji panel khi click ra ngoài panel và nút toggle
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (
        emojiPanelRef.current && !emojiPanelRef.current.contains(e.target) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  // Đóng emoji panel khi click ra ngoài vùng panel + nút toggle
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  // FIX: Single declaration of getOtherUser / otherUser (removed duplicate ~line 340)
  const getOtherUser = (conv) => {
    if (!conv) return null;
    if (conv.isGroup) return { username: conv.name || 'Nhóm' };
    return conv.participants?.find(p => (typeof p === 'object' ? p._id : p) !== user?._id) || null;
  };
  const otherUser = getOtherUser(activeConversation);

  // Fix reload: khôi phục conversation đang chat từ localStorage — chỉ chạy 1 lần
  useEffect(() => {
    if (_conversationRestored || !socket) return;
    const savedId = localStorage.getItem('activeConversationId');
    if (!savedId) { _conversationRestored = true; return; }
    _conversationRestored = true;
    axios.get(`${API_URL}/conversations`)
      .then(({ data }) => {
        const convs = data.data?.conversations || data.data || [];
        const found = convs.find(c => c._id === savedId);
        if (found) {
          setActiveConversation(found);
          setPinnedMessages(found.pinnedMessages || []);
        }
      })
      .catch(() => {});
  }, [socket]);

  const handleStartCallReady = useCallback((fn) => { startCallRef.current = fn; }, []);

  // ── handleCallEnd ──────────────────────────────────────────────────────────
  // KEY FIX for duplicate bubble:
  //   - Optimistic message is added with a deterministic tempId based on
  //     callType + status + timestamp (rounded to 5s) so the deduplication
  //     filter in onNewMsg can match and remove it reliably.
  //   - Only isCaller=true creates the optimistic message (callee never adds one).
  const handleCallEnd = useCallback(({
    type     = 'audio',
    duration = 0,
    status   = 'ended',
    isCaller = true,
    calleeId = null,
  } = {}) => {
    const conv = activeConvRef.current;
    if (!conv || !socket) return;

    // Only the caller inserts the optimistic bubble
    if (!isCaller) return;

    const prefix    = type === 'video' ? '📹' : '📞';
    const typeLabel = type === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';

    let content = '';
    if (status === 'cancelled')     content = `${prefix} ${typeLabel} đã hủy`;
    else if (status === 'missed')   content = `${prefix} ${typeLabel} nhỡ`;
    else if (status === 'rejected') content = `${prefix} ${typeLabel} bị từ chối`;
    else {
      const m = Math.floor(duration / 60), s = duration % 60;
      content = `${prefix} ${typeLabel} · ${m > 0 ? `${m} phút ${s} giây` : `${s} giây`}`;
    }

    // Deterministic tempId — used to deduplicate when server echoes back
    const tempId = `call-opt-${type}-${status}-${Math.round(Date.now() / 5000)}`;

    setMessages(prev => {
      // Prevent double-adding if handleCallEnd is called twice
      if (prev.some(m => m._id === tempId)) return prev;
      return [...prev, {
        _id:      tempId,
        content,
        type:     'system',
        sender:   user,
        metadata: { callType: type, callStatus: status, duration, viewerRole: 'caller' },
        createdAt: new Date().toISOString(),
        readBy:   [],
        isSystemCall: true,
      }];
    });

    socket.emit('call_summary', {
      to:             calleeId,
      callType:       type,
      status,
      duration,
      conversationId: conv._id,
    });
  }, [socket, user]);

  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) return;
    loadMessages(activeConversation._id);
    setPinnedMessages(activeConversation.pinnedMessages || []);
    setPinNotifications([]);
    if (socket) socket.emit('join_conversation', { conversationId: activeConversation._id });
    return () => { if (socket) socket.emit('leave_conversation', { conversationId: activeConversation._id }); };
  }, [activeConversation?._id, socket]);

  useEffect(() => {
    if (!socket) return;

    const onNewMsg = ({ message, conversationId }) => {
      if (conversationId !== activeConvRef.current?._id) return;
      setMessages(prev => {
        // Remove matching optimistic call bubble before inserting real one
        const without = prev.filter(m => {
          if (
            m._id?.startsWith('call-opt-') &&
            message.type === 'system' &&
            message.metadata?.callStatus
          ) {
            const sameMeta =
              m.metadata?.callStatus === message.metadata?.callStatus &&
              m.metadata?.callType   === message.metadata?.callType &&
              m.metadata?.viewerRole === message.metadata?.viewerRole;
            const recent = Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 15000;
            return !(sameMeta && recent);
          }
          // Also strip any generic temp messages
          return !m._id?.startsWith('temp-');
        });
        if (without.some(m => m._id === message._id)) return without;
        return [...without, message];
      });
      socket.emit('message_read', { messageId: message._id, conversationId });
    };

    const onMsgRead = ({ conversationId, readBy }) => {
      if (conversationId !== activeConvRef.current?._id) return;
      setMessages(prev => prev.map(m => {
        if ((m.sender?._id || m.sender) !== user?._id) return m;
        const already = (m.readBy || []).some(id => (id?._id || id)?.toString() === readBy?.toString());
        if (already) return m;
        return { ...m, readBy: [...(m.readBy || []), readBy] };
      }));
    };

    const onMsgReaction = ({ messageId, reactions }) =>
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));

    const onMsgEdited = ({ messageId, content, editHistory }) =>
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, content, editHistory, isEdited: true } : m
      ));

    const onMsgDeleted = ({ messageId }) =>
      setMessages(prev => prev.filter(m => m._id !== messageId));

    const onTyping = ({ userId, conversationId }) => {
      if (conversationId === activeConvRef.current?._id && userId !== user?._id)
        setTypingUsers(prev => new Set([...prev, userId]));
    };
    const onStopTyping = ({ userId }) =>
      setTypingUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    const onOnline     = ({ userId }) => setOnlineUsers(prev => new Set([...prev, String(userId)]));
    const onOffline    = ({ userId }) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(String(userId)); return n; });
    const onOnlineList = (ids) => setOnlineUsers(new Set(ids.map(String)));

    // 'pin_updated' → cả 2 phía đều nhận, cập nhật PinnedBanner
    // pinnedBy dùng để hiện thông báo đúng người
    const onPinUpdated = ({ conversationId, isPinning, pinnedMessages: newPins, pinnedBy }) => {
      if (conversationId !== activeConvRef.current?._id) return;
      setPinnedMessages(newPins || []);
      setPinNotifications(prev => [...prev, {
        id: Date.now(),
        text: isPinning ? `${pinnedBy} đã ghim một tin nhắn` : `${pinnedBy} đã bỏ ghim`,
        time: new Date().toISOString(),
        isPinning,
      }]);
    };

    socket.on('new_message',      onNewMsg);
    socket.on('messages_read',    onMsgRead);
    socket.on('message_reaction', onMsgReaction);
    socket.on('message_edited',   onMsgEdited);
    socket.on('message_deleted',  onMsgDeleted);
    socket.on('user_typing',      onTyping);
    socket.on('user_stop_typing', onStopTyping);
    socket.on('user_online',      onOnline);
    socket.on('user_offline',     onOffline);
    socket.on('online_users_list',onOnlineList);
    socket.on('pin_updated',      onPinUpdated);

    return () => {
      socket.off('new_message',      onNewMsg);
      socket.off('messages_read',    onMsgRead);
      socket.off('message_reaction', onMsgReaction);
      socket.off('message_edited',   onMsgEdited);
      socket.off('message_deleted',  onMsgDeleted);
      socket.off('user_typing',      onTyping);
      socket.off('user_stop_typing', onStopTyping);
      socket.off('user_online',      onOnline);
      socket.off('user_offline',     onOffline);
      socket.off('online_users_list',onOnlineList);
      socket.off('pin_updated',      onPinUpdated);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, pinNotifications]);

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`${API_URL}/messages/${conversationId}`);
      const msgs = data.data?.messages || data.data || [];
      setMessages(msgs);
      if (msgs.length && socket)
        socket.emit('message_read', { messageId: msgs[msgs.length - 1]._id, conversationId });
    } catch { toast.error('Không thể tải tin nhắn'); }
    finally { setLoadingMessages(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setShowEmoji(false); // đóng emoji panel khi gửi
    const hasImages = imagePreviews.length > 0;
    const hasFiles  = filePreviews.length > 0;
    if ((!inputMessage.trim() && !hasImages && !hasFiles) || !activeConversation || !socket) return;
    if (hasFiles)  { await handleSendFiles();  return; }
    if (hasImages) { await handleSendImages(); return; }
    const content = inputMessage.trim();
    setInputMessage('');
    const currentReply = replyingTo;
    setReplyingTo(null);
    setMessages(prev => [...prev, {
      _id: `temp-${Date.now()}`, content, sender: user,
      createdAt: new Date().toISOString(), status: 'sending', readBy: [],
      replyTo: currentReply?._id,
    }]);
    socket.emit('send_message', { conversationId: activeConversation._id, content, type: 'text', replyTo: currentReply?._id });
    stopTypingSignal();
  };

  const handleImageSelect = (e) => { const f = Array.from(e.target.files || []); if (f.length) addImages(f); e.target.value = ''; };
  const addImages = (newFiles) => {
    const valid = newFiles.filter(f => f.type.startsWith('image/'));
    if (valid.length !== newFiles.length) toast.error('Chỉ chấp nhận file ảnh');
    const rem = MAX_IMAGES - imagePreviews.length;
    const add = valid.slice(0, rem);
    if (valid.length > rem) toast.error(`Tối đa ${MAX_IMAGES} ảnh`);
    setFilePreviews([]);
    setImagePreviews(prev => [...prev, ...add.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
  };
  const removeImage = (idx) => setImagePreviews(prev => {
    URL.revokeObjectURL(prev[idx].url);
    return prev.filter((_, i) => i !== idx);
  });

  const handleFileSelect = (e) => { const f = Array.from(e.target.files || []); if (f.length) addFiles(f); e.target.value = ''; setShowAttachMenu(false); };
  const addFiles = (newFiles) => {
    const valid = newFiles.filter(f => f.size <= 50 * 1024 * 1024);
    if (valid.length !== newFiles.length) toast.error('Một số file vượt 50MB đã bị bỏ');
    const rem = MAX_FILES - filePreviews.length;
    const add = valid.slice(0, rem);
    if (valid.length > rem) toast.error(`Tối đa ${MAX_FILES} file`);
    setImagePreviews([]);
    setFilePreviews(prev => [...prev, ...add.map(f => ({ file: f }))]);
  };
  const removeFile = (idx) => setFilePreviews(prev => prev.filter((_, i) => i !== idx));

  // Gửi nhiều ảnh tuần tự, mỗi ảnh là 1 tin nhắn riêng
  const handleSendImages = async () => {
    if (!imagePreviews.length) return;
    setUploading(true);
    const caption   = inputMessage.trim(); // dùng inputMessage làm chú thích
    const replyTo   = replyingTo?._id;
    const snapshots = [...imagePreviews];
    setImagePreviews([]);
    setInputMessage('');
    setReplyingTo(null);
    try {
      for (let i = 0; i < snapshots.length; i++) {
        setUploadProgress(Math.round((i / snapshots.length) * 100));
        const formData = new FormData();
        formData.append('file', snapshots[i].file);
        const { data } = await axios.post(`${API_URL}/messages/upload`, formData);
        const isLast = i === snapshots.length - 1;
        socket.emit('send_message', {
          conversationId: activeConversation._id,
          // chú thích gắn vào ảnh cuối cùng
          content:  isLast ? caption : '',
          type:     'image',
          fileUrl:  data.data.fileUrl,
          fileName: data.data.fileName,
          fileSize: data.data.fileSize,
          replyTo:  i === 0 ? replyTo : undefined,
        });
        URL.revokeObjectURL(snapshots[i].url);
      }
    } catch { toast.error('Có ảnh không thể gửi được'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  // Gửi nhiều file tuần tự, mỗi file là 1 tin nhắn riêng
  const handleSendFiles = async () => {
    if (!filePreviews.length) return;
    setUploading(true);
    const replyTo   = replyingTo?._id;
    const snapshots = [...filePreviews];
    setFilePreviews([]);
    setReplyingTo(null);
    try {
      for (let i = 0; i < snapshots.length; i++) {
        setUploadProgress(Math.round((i / snapshots.length) * 100));
        const formData = new FormData();
        formData.append('file', snapshots[i].file);
        const { data } = await axios.post(`${API_URL}/messages/upload`, formData);
        socket.emit('send_message', {
          conversationId: activeConversation._id,
          content:  '',
          type:     'file',
          fileUrl:  data.data.fileUrl,
          fileName: data.data.fileName || snapshots[i].file.name,
          fileSize: data.data.fileSize || snapshots[i].file.size,
          replyTo:  i === 0 ? replyTo : undefined,
        });
      }
    } catch { toast.error('Có file không thể gửi được'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleTypingInput = (e) => {
    const val = e.target.value;
    if (val.length > MAX_LENGTH) return;
    setInputMessage(val);

    // Detect từ cuối đang gõ để gợi ý emoji (kiểm tra setting)
    const stickerEnabled = localStorage.getItem('stickerSuggest') !== 'false';
    if (stickerEnabled) {
      const cursor = e.target.selectionStart;
      const textBefore = val.slice(0, cursor);
      const match = textBefore.match(/([a-zA-Z]{2,})$/);
      if (match) {
        const suggestions = getEmojiSuggestions(match[1]);
        setEmojiSuggestions(suggestions);
        setSuggestionIndex(0);
      } else {
        setEmojiSuggestions([]);
      }
    } else {
      setEmojiSuggestions([]);
    }

    if (!socket || !activeConversation) return;
    if (!isTyping) { setIsTyping(true); socket.emit('typing_start', { conversationId: activeConversation._id }); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTypingSignal, 2000);
  };

  const stopTypingSignal = () => {
    if (isTyping && socket && activeConversation) {
      setIsTyping(false);
      socket.emit('typing_stop', { conversationId: activeConversation._id });
    }
    clearTimeout(typingTimer.current);
  };

  const handleKeyDown = (e) => {
    // Navigate emoji suggestions
    if (emojiSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(i => (i + 1) % emojiSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(i => (i - 1 + emojiSuggestions.length) % emojiSuggestions.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applyEmojiSuggestion(emojiSuggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setEmojiSuggestions([]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
    if (e.key === 'Escape') { setShowEmoji(false); setShowMenu(false); setReplyingTo(null); setEditingMsg(null); setShowAttachMenu(false); }
  };

  const insertEmoji = (emoji) => {
    const el  = inputRef.current;
    if (!el) {
      // fallback nếu không có ref
      const newVal = inputMessage + emoji;
      if (newVal.length <= MAX_LENGTH) setInputMessage(newVal);
      return;
    }
    const start  = el.selectionStart ?? inputMessage.length;
    const end    = el.selectionEnd   ?? inputMessage.length;
    const newVal = inputMessage.slice(0, start) + emoji + inputMessage.slice(end);
    if (newVal.length > MAX_LENGTH) return;
    setInputMessage(newVal);
    // Khôi phục cursor sau emoji, focus lại input mà không đóng picker
    requestAnimationFrame(() => {
      el.focus();
      const newPos = start + emoji.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const applyEmojiSuggestion = ({ emoji }) => {
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? inputMessage.length;
    const textBefore = inputMessage.slice(0, cursor);
    // Thay từ cuối đang gõ bằng emoji
    const replaced = textBefore.replace(/([a-zA-Z]{2,})$/, emoji + ' ');
    const newVal = replaced + inputMessage.slice(cursor);
    if (newVal.length > MAX_LENGTH) return;
    setInputMessage(newVal);
    setEmojiSuggestions([]);
    setSuggestionIndex(0);
    requestAnimationFrame(() => {
      el?.focus();
      const newPos = replaced.length;
      el?.setSelectionRange(newPos, newPos);
    });
  };

  // handlePin: không tự cập nhật local state nữa
  // Server trả về pinnedMessages mới nhất qua 'pin_updated' → onPinUpdated sẽ set
  // Điều này tránh race condition và đảm bảo client luôn đồng bộ với DB
  const handlePin = (msg) => {
    const isPinning = !pinnedMessages.some(p => p._id?.toString() === msg._id?.toString());
    socket?.emit('pin_message', {
      messageId:      msg._id,
      conversationId: activeConversation._id,
      isPinning,
    });
  };

  const handleUnpin = (msgId) => {
    socket?.emit('pin_message', {
      messageId:      msgId,
      conversationId: activeConversation._id,
      isPinning:      false,
    });
  };

  const handleScrollToPin = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-yellow-100');
      setTimeout(() => el.classList.remove('bg-yellow-100'), 1500);
    }
  };

  const handleReact = (messageId, emoji) => {
    if (!socket || !activeConversation) return;
    socket.emit('react_message', { messageId, emoji, conversationId: activeConversation._id });
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      const raw   = m.reactions instanceof Map ? Object.fromEntries(m.reactions) : { ...(m.reactions || {}) };
      const users = [...(raw[emoji] || [])];
      const myId  = user?._id;
      const idx   = users.findIndex(id => (id?._id || id)?.toString() === myId?.toString());
      if (idx > -1) users.splice(idx, 1); else users.push(myId);
      return { ...m, reactions: { ...raw, [emoji]: users } };
    }));
  };

  const handleReply   = (msg) => { setReplyingTo(msg); setEditingMsg(null); inputRef.current?.focus(); };
  const handleEdit    = (msg) => { setEditingMsg(msg); setEditInput(msg.content); setReplyingTo(null); };
  const submitEdit    = () => {
    if (!editInput.trim() || !editingMsg || !socket) return;
    socket.emit('edit_message', { messageId: editingMsg._id, content: editInput.trim(), conversationId: activeConversation._id });
    setMessages(prev => prev.map(m =>
      m._id === editingMsg._id
        ? { ...m, content: editInput.trim(), isEdited: true,
            editHistory: [...(m.editHistory || []), { content: m.content, editedAt: new Date().toISOString() }] }
        : m
    ));
    setEditingMsg(null); setEditInput('');
  };
  const handleDelete  = (messageId) => {
    if (!window.confirm('Xóa tin nhắn này?')) return;
    socket?.emit('delete_message', { messageId, conversationId: activeConversation._id });
    setMessages(prev => prev.filter(m => m._id !== messageId));
    setPinnedMessages(prev => prev.filter(p => p._id !== messageId));
  };
  // FIX: handleForward now opens ForwardModal instead of just toast
  const handleForward = (msg) => setForwardMsg(msg);
  const handleHide    = (msgId) => { setMessages(prev => prev.map(m => m._id === msgId ? { ...m, hidden: true } : m)); toast('Đã ẩn tin nhắn'); };
  // FIX: handleShare opens ShareModal
  const handleShare   = (msg) => setShareMsg(msg);
  const handleUnfriend = async (friendId) => {
    try { await axios.delete(`${API_URL}/friends/${friendId}`); toast.success('Đã xóa bạn bè'); }
    catch { toast.error('Không thể xóa bạn bè'); }
  };

  const isMyMsg   = (msg) => (msg.sender?._id || msg.sender) === user?._id;
  const isMsgRead = (msg) => (msg.readBy || []).some(id => { const rid = id?._id || id; return rid && rid.toString() !== user?._id?.toString(); });
  const lastReadIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--)
      if (isMyMsg(messages[i]) && isMsgRead(messages[i])) return i;
    return -1;
  })();

  const replyMap = {};
  messages.forEach(m => { replyMap[m._id] = m; });
  const pinnedIds = new Set(pinnedMessages.map(p => p._id));

  const processed = messages.map((msg, i) => {
    const prev = messages[i - 1], next = messages[i + 1];
    const FIVE = 5 * 60 * 1000;
    const prevSame  = prev && (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender);
    const prevClose = prev && (new Date(msg.createdAt) - new Date(prev.createdAt)) < FIVE;
    const nextSame  = next && (next.sender?._id || next.sender) === (msg.sender?._id || msg.sender);
    const nextClose = next && (new Date(next.createdAt) - new Date(msg.createdAt)) < FIVE;
    return {
      ...msg,
      showTimestamp: !prev || (new Date(msg.createdAt) - new Date(prev.createdAt)) >= FIVE,
      showAvatar:    !prevSame || !prevClose,
      isLastInGroup: !nextSame || !nextClose,
    };
  });

  const isOtherOnline = otherUser?._id ? onlineUsers.has(String(otherUser._id)) : false;
  const remaining     = MAX_LENGTH - inputMessage.length;

  const buildChatItems = () => {
    const items = [];
    let pinIdx = 0;
    for (let i = 0; i < processed.length; i++) {
      const msg = processed[i];
      while (pinIdx < pinNotifications.length &&
             new Date(pinNotifications[pinIdx].time) <= new Date(msg.createdAt)) {
        items.push({ type: 'pin_notif', data: pinNotifications[pinIdx] });
        pinIdx++;
      }
      items.push({ type: 'message', data: msg });
    }
    while (pinIdx < pinNotifications.length) {
      items.push({ type: 'pin_notif', data: pinNotifications[pinIdx] });
      pinIdx++;
    }
    return items;
  };

  const isCallMsg = (msg) =>
    msg.type === 'system' && (
      msg.isSystemCall ||
      msg.metadata?.callStatus ||
      msg._id?.startsWith('call-opt-') ||
      /📞|📹/.test(msg.content || '')
    );

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      <Sidebar
        onSelectConversation={(conv) => {
          // Nếu click vào conversation đang active → không làm gì cả
          if (conv._id === activeConversation?._id) return;
          setActiveConversation(conv); setMessages([]);
          setShowMenu(false); setShowProfile(false);
          setReplyingTo(null); setEditingMsg(null);
          setPinnedMessages(conv.pinnedMessages || []);
          setPinNotifications([]);
          setImagePreviews([]); setFilePreviews([]);
          // Fix reload: lưu id để khôi phục sau khi reload
          localStorage.setItem('activeConversationId', conv._id);
        }}
        activeConversationId={activeConversation?._id}
        socket={socket}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar username={otherUser?.username || '?'} size={10} avatarUrl={otherUser?.avatar} onClick={() => setShowProfile(v => !v)} />
                  {showProfile && otherUser?._id && (
                    <ProfilePopup user={otherUser} onClose={() => setShowProfile(false)} onUnfriend={handleUnfriend} />
                  )}
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOtherOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{otherUser?.username}</p>
                  <p className={`text-xs ${isOtherOnline ? 'text-green-500' : 'text-gray-400'}`}>{isOtherOnline ? '● Online' : '● Offline'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startCallRef.current?.('audio')} disabled={!otherUser?._id}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40">
                  <Phone className="w-5 h-5" />
                </button>
                <button onClick={() => startCallRef.current?.('video')} disabled={!otherUser?._id}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40">
                  <Video className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button onClick={() => setShowMenu(v => !v)}
                    className={`p-2 rounded-xl transition ${showMenu ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <ChatMenu onClose={() => setShowMenu(false)} otherUser={otherUser}
                      onClearChat={() => { setMessages([]); setPinNotifications([]); toast.success('Đã xóa lịch sử chat'); }} />
                  )}
                </div>
              </div>
            </header>

            <PinnedBanner pinnedMessages={pinnedMessages} onScrollToPin={handleScrollToPin} onUnpin={handleUnpin} />

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : processed.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="mb-3 flex justify-center"><AppLogo size={48} /></div>
                    <p className="font-medium">Bắt đầu cuộc trò chuyện!</p>
                    <p className="text-sm mt-1">Gửi tin nhắn đầu tiên cho {otherUser?.username}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {buildChatItems().map((item) => {
                    if (item.type === 'pin_notif') {
                      return <PinNotification key={`pin-${item.data.id}`} notification={item.data} />;
                    }
                    const msg = item.data;

                    if (isCallMsg(msg)) {
                      return (
                        <CallMessageItem
                          key={msg._id}
                          msg={msg}
                          mine={isMyMsg(msg)}
                          onCallback={(callType) => startCallRef.current?.(callType)}
                        />
                      );
                    }

                    const mine    = isMyMsg(msg);
                    const msgIdx  = processed.findIndex(m => m._id === msg._id);
                    const msgRead = mine && msgIdx === lastReadIdx;
                    return (
                      <div key={msg._id}>
                        {msg.showTimestamp && (
                          <div className="flex items-center justify-center my-4">
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              <Clock className="w-3 h-3" />{formatGroupTime(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={msg.showAvatar ? 'mt-2' : 'mt-0.5'}>
                          <MessageBubble
                            msg={msg} mine={mine}
                            showAvatar={msg.showAvatar} isLastInGroup={msg.isLastInGroup}
                            isRead={msgRead} isPinned={pinnedIds.has(msg._id)}
                            onReact={handleReact} onReply={handleReply} onEdit={handleEdit}
                            onDelete={handleDelete} onForward={handleForward} onHide={handleHide}
                            onPin={handlePin} replyMap={replyMap}
                            onShare={handleShare}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {typingUsers.size > 0 && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="w-8 flex-shrink-0">
                    <Avatar username={otherUser?.username || '?'} size={8} avatarUrl={otherUser?.avatar} />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1 items-center">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {editingMsg && (
              <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 flex items-center gap-3">
                <Edit3 className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-yellow-700 font-semibold mb-1">Chỉnh sửa tin nhắn</p>
                  <input value={editInput} onChange={e => setEditInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') setEditingMsg(null); }}
                    className="w-full text-sm bg-white border border-yellow-300 rounded-lg px-3 py-1.5 outline-none focus:border-yellow-500"
                    autoFocus />
                </div>
                <button onClick={submitEdit}
                  className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-semibold rounded-lg hover:bg-yellow-600 transition flex-shrink-0">Lưu</button>
                <button onClick={() => setEditingMsg(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
            )}

            {replyingTo && !editingMsg && (
              <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 flex items-center gap-3">
                <Reply className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-700 font-semibold">{replyingTo.sender?.username}</p>
                  <p className="text-xs text-blue-600 truncate">{replyingTo.content || '📎 File'}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Multi-image preview */}
            {imagePreviews.length > 0 && (
              <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2">
                <div className="flex flex-wrap gap-2 mb-2 max-h-44 overflow-y-auto">
                  {imagePreviews.map((img, i) => (
                    <div key={i} className="relative group w-20 h-20 flex-shrink-0">
                      <img src={img.url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                      <button onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < MAX_IMAGES && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition text-gray-400 hover:text-blue-500">
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px]">{imagePreviews.length}/{MAX_IMAGES}</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {imagePreviews.length} ảnh · {formatFileSize(imagePreviews.reduce((s, i) => s + i.file.size, 0))}
                  {uploading && uploadProgress > 0 && ` · Đang gửi ${uploadProgress}%`}
                </p>
              </div>
            )}

            {/* Multi-file preview */}
            {filePreviews.length > 0 && (
              <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2">
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {filePreviews.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{f.file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatFileSize(f.file.size)}</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {filePreviews.length < MAX_FILES && (
                  <button onClick={() => attachInputRef.current?.click()}
                    className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition">
                    <Plus className="w-3.5 h-3.5" /> Thêm file ({filePreviews.length}/{MAX_FILES})
                  </button>
                )}
                {uploading && uploadProgress > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">Đang gửi {uploadProgress}%</p>
                )}
              </div>
            )}

            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div ref={emojiPanelRef}>
                {/* Emoji panel — grid nhiều hàng, hiện bên trên form */}
                {/* Emoji shortcode suggestions */}
                {emojiSuggestions.length > 0 && (
                  <div ref={suggestRef} className="mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Gợi ý emoji · Tab / Enter để chọn · Esc để đóng</p>
                      <button type="button" onClick={() => setEmojiSuggestions([])}
                        className="text-gray-300 hover:text-gray-500 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 p-2">
                      {emojiSuggestions.map((s, i) => (
                        <button key={s.key} type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => applyEmojiSuggestion(s)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition
                            ${i === suggestionIndex
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700'}`}>
                          <span className="text-lg leading-none">{s.emoji}</span>
                          <span className="text-xs font-medium">:{s.key}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showEmoji && (
                  <div className="mb-2 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-gray-100 px-1 pt-1 gap-0.5">
                      {Object.keys(EMOJI_CATEGORIES).map(cat => (
                        <button key={cat} type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setEmojiTab(cat)}
                          className={`flex-shrink-0 px-3 py-1.5 text-base rounded-t-lg transition ${emojiTab === cat ? 'bg-blue-50 scale-110' : 'hover:bg-gray-50'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="p-2 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-8 gap-0.5">
                        {EMOJI_CATEGORIES[emojiTab].map(emoji => (
                          <button key={emoji} type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { insertEmoji(emoji); inputRef.current?.focus(); }}
                            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition hover:scale-125">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="relative flex-shrink-0" ref={attachMenuRef}>
                    <button type="button" onClick={() => setShowAttachMenu(v => !v)}
                      className={`p-2 rounded-xl transition ${showAttachMenu ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}>
                      <Paperclip className="w-5 h-5" />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 overflow-hidden w-40">
                        <button type="button" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                          <Image className="w-4 h-4 text-green-500" /> Ảnh
                        </button>
                        <button type="button" onClick={() => { attachInputRef.current?.click(); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                          <File className="w-4 h-4 text-blue-500" /> File
                        </button>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  <input ref={attachInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                  <div className="flex-1 relative">
                    <input ref={inputRef} type="text" value={inputMessage}
                      onChange={handleTypingInput} onKeyDown={handleKeyDown} maxLength={MAX_LENGTH}
                      placeholder={
                        replyingTo           ? `Trả lời ${replyingTo.sender?.username}...` :
                        imagePreviews.length ? 'Thêm chú thích...' :
                        filePreviews.length  ? 'Chuẩn bị gửi file...' : 'Nhập tin nhắn...'
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-100 border border-transparent focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                      style={{ paddingRight: remaining <= 100 ? '3rem' : undefined }}
                    />
                    {remaining <= 100 && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium ${remaining <= 20 ? 'text-red-500' : 'text-gray-400'}`}>
                        {remaining}
                      </span>
                    )}
                  </div>
                  {/* Nút emoji bên phải input — nằm trong cùng div ref */}
                  <button type="button" ref={emojiButtonRef}
                    onClick={() => setShowEmoji(v => !v)}
                    className={`p-2 rounded-xl transition flex-shrink-0 ${showEmoji ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`}>
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="submit"
                    disabled={(!inputMessage.trim() && !imagePreviews.length && !filePreviews.length) || uploading}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                    {uploading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 select-none">
            <div className="mb-4 flex justify-center"><AppLogo size={64} /></div>
            <p className="text-xl font-semibold text-gray-600">Chào mừng, {user?.username}!</p>
            <p className="text-sm mt-2 text-center max-w-xs">Chọn một cuộc trò chuyện bên trái hoặc thêm bạn bè mới để bắt đầu nhắn tin</p>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className={isConnected ? 'text-green-600' : 'text-red-500'}>{isConnected ? 'Đã kết nối' : 'Mất kết nối'}</span>
            </div>
          </div>
        )}
      </div>

      <CallManager
        socket={socket}
        currentUser={user}
        otherUser={otherUser}
        onStartCall={handleStartCallReady}
        onCallEnd={handleCallEnd}
      />

      {forwardMsg && (
        <ForwardModal
          msg={forwardMsg}
          onClose={() => setForwardMsg(null)}
          socket={socket}
          activeConversationId={activeConversation?._id}
        />
      )}

      {shareMsg && <ShareModal msg={shareMsg} onClose={() => setShareMsg(null)} />}
    </div>
  );
}
