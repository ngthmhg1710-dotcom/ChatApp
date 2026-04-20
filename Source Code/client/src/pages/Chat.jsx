import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import {
  Send, Phone, Video, MoreVertical, Smile, Image, X,
  Trash2, BellOff, UserX, Flag, Search, Pin, Users,
  Reply, Forward, EyeOff, Edit3, Clock, Quote,
  Paperclip, FileText, ChevronDown, ChevronUp, File, Plus,
  Download, Copy, Share2, Check, UserPlus, Archive, 
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import confirmAsync from '../utils/confirmAsync';
import Sidebar from '../components/Sidebar';
import CallManager from '../components/CallManager';
import ChatInfoPanel from '../components/ChatInfoPanel';
import GroupInfoPanel from '../components/GroupInfoPanel';
import logo from '../assets/logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
const MAX_LENGTH = 1000;
const PIN_LIMIT = 3;
const MAX_IMAGES = 30;
const MAX_FILES = 30;

/** Trích các URL http(s) hợp lệ — dùng cho gợi ý ô soạn và linkify tin nhắn */
function extractHttpUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const re = /https?:\/\/[^\s<>"')\]}]+/gi;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    let raw = m[0].replace(/[.,;:!?。，]+$/u, '');
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        const href = u.href;
        if (!seen.has(href)) {
          seen.add(href);
          out.push(href);
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}

function linkHintLabel(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    const tail = path.length > 28 ? `${path.slice(0, 26)}…` : path;
    return `${u.hostname}${tail}`;
  } catch {
    return url.length > 56 ? `${url.slice(0, 54)}…` : url;
  }
}

/** Hiển thị chữ có URL thành thẻ <a> an toàn (chỉ http/https) */
function LinkifiedText({ text, className = '', mine = false }) {
  if (text == null || text === '') return null;
  const re = /(https?:\/\/[^\s<>"')\]}]+)/gi;
  const parts = String(text).split(re);
  const aCls = mine
    ? 'text-blue-100 underline break-all font-medium hover:text-white'
    : 'text-blue-700 underline break-all font-medium hover:text-blue-800';
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!/^https?:\/\//i.test(part)) return part;
        let href = part.replace(/[.,;:!?。，]+$/u, '');
        try {
          href = new URL(href).href;
        } catch {
          return part;
        }
        return (
          <a
            key={`${i}-${href.slice(0, 32)}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={aCls}
            onClick={e => e.stopPropagation()}
          >
            {part}
          </a>
        );
      })}
    </span>
  );
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MessageContent({ content, isOwn }) {
  return (
    <div className={`prose prose-sm max-w-none
      ${isOwn ? 'prose-invert text-white' : 'prose-neutral dark:prose-invert'}
      prose-p:my-0.5 prose-p:leading-relaxed
      prose-code:bg-black/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-black/30 prose-pre:rounded-lg prose-pre:p-3
      prose-ul:my-1 prose-ol:my-1 prose-li:my-0
      prose-strong:font-semibold
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
    `}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          img: ({ node, ...props }) => (
            <img {...props} className="max-w-full rounded-lg max-h-64 object-contain" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

  function formatDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  function ActiveCallBanner({ callType, startedAt, onRejoin }) {
    const [elapsed, setElapsed] = useState(() =>
      startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0
    );

    useEffect(() => {
      const t = setInterval(() => {
        setElapsed(startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0);
      }, 1000);
      return () => clearInterval(t);
    }, [startedAt]);

    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <div>
            <p className="text-sm font-semibold text-green-700 leading-tight">{callType === 'video' ? '📹 Đang trong video call' : '📞 Đang trong cuộc gọi'}</p>
            <p className="text-xs text-green-600 font-mono">{formatDuration(elapsed)}</p>
          </div>
          <button
            onClick={onRejoin}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 transition"
          >
            <Phone className="w-3.5 h-3.5" />
            Quay lại
          </button>
        </div>
      </div>
    );
  }

function plainTextPreview(input) {
  if (input == null) return '';
  let s = String(input);
  try {
    // Decode any HTML entities/tags by using a temporary DOM node
    const div = document.createElement('div');
    div.innerHTML = s;
    s = div.textContent || div.innerText || s;
  } catch (e) {}
  // Unlink markdown links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove code ticks and other markdown-ish punctuation
  s = s.replace(/[`*_>#~-]/g, '');
  // Collapse whitespace and remove control characters
  s = s.replace(/\s+/g, ' ').replace(/\p{C}/gu, '').trim();
  return s;
}

function AppLogo({ size = 20, className = '' }) {
  return (
    <img
      src={logo}
      alt="Chat App Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
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

const EMOJI_SHORTCODES = {
  // 😀 Cảm xúc
  smile: '😊', cuoi: '😊',
  happy: '😀', vui: '😀',
  laugh: '😂', cuoi_lon: '😂',
  lol: '🤣',
  love: '🥰', yeu: '🥰',
  kiss: '😘', hon: '😘',
  wink: '😉', nhay_mat: '😉',
  cool: '😎', ngau: '😎',
  think: '🤔', suy_nghi: '🤔',
  wow: '😮', wow_vl: '😮',
  cry: '😢', khoc: '😢',
  sad: '😔', buon: '😔',
  angry: '😡', tuc_gian: '😡',
  rage: '🤬', dien_tiet: '🤬',
  dead: '💀', chet: '💀',
  devil: '😈', quy: '😈',
  clown: '🤡', he: '🤡',
  sleep: '😴', ngu: '😴',
  sick: '🤒', om: '🤒',
  star: '🤩', sao_mat: '🤩',
  party: '🥳', tiec: '🥳',
  nerd: '🤓', tri_thuc: '🤓',
  shh: '🤫', im_lang: '🤫',

  // 👍 Cử chỉ
  ok: '👌', duoc: '👌',
  yes: '👍', dong_y: '👍',
  no: '👎', khong: '👎',
  clap: '👏', vo_tay: '👏',
  hi: '👋', chao: '👋',
  pray: '🙏', cau_nguyen: '🙏',
  muscle: '💪', manh_me: '💪',
  peace: '✌️', hoa_binh: '✌️',
  point: '☝️', chi_len: '☝️',
  fist: '✊', nam_dam: '✊',
  hug: '🤗', om_tu: '🤗',

  // ❤️ Trái tim
  heart: '❤️', tim: '❤️',
  hearts: '💕', nhieu_tim: '💕',
  broken: '💔', vo_tim: '💔',
  orange: '🧡', tim_cam: '🧡',
  yellow: '💛', tim_vang: '💛',
  green: '💚', tim_xanh_la: '💚',
  blue: '💙', tim_xanh: '💙',
  purple: '💜', tim_tim: '💜',
  black: '🖤', tim_den: '🖤',

  // 🎉 Hoạt động
  spark: '✨', long_lanh: '✨',
  cheer: '🎉', an_mung: '🎉',
  tada: '🎊',
  balloon: '🎈', bong_bong: '🎈',
  gift: '🎁', qua: '🎁',
  trophy: '🏆', cup: '🏆',
  gold: '🥇', vang: '🥇',
  medal: '🏅', huy_chuong: '🏅',
  music: '🎵', nhac: '🎵',
  note: '🎶',
  game: '🎮', choi_game: '🎮',

  // 🌍 Thiên nhiên
  sun: '☀️', mat_troi: '☀️',
  moon: '🌙', mat_trang: '🌙',
  rain: '🌧️', mua: '🌧️',
  snow: '❄️', tuyet: '❄️',
  rainbow: '🌈', cau_vong: '🌈',
  flower: '🌸', hoa: '🌸',
  rose: '🌹', hoa_hong: '🌹',
  tree: '🌳', cay: '🌳',

  // 🐶 Động vật
  dog: '🐶', cho: '🐶',
  cat: '🐱', meo: '🐱',

  // 🍔 Đồ ăn
  pizza: '🍕',
  burger: '🍔',
  cake: '🎂', banh: '🎂',
  coffee: '☕', ca_phe: '☕',
  beer: '🍺', bia: '🍺',
  wine: '🍷', ruou: '🍷',

  // ⚠️ Khác
  star2: '⭐', sao: '⭐',
  bomb: '💣', bom: '💣',
  poop: '💩', cut: '💩',
  alien: '👽', nguoi_ngoai_hanh_tinh: '👽',
  check: '✅', dung: '✅',
  cross: '❌', sai: '❌',
  warning: '⚠️', canh_bao: '⚠️',
  info: 'ℹ️', thong_tin: 'ℹ️',
  question: '❓', hoi: '❓',

  // 🔁 Điều hướng
  up: '⬆️', len: '⬆️',
  down: '⬇️', xuong: '⬇️',
  left: '⬅️', trai: '⬅️',
  right: '➡️', phai: '➡️',
  back: '🔙', quay_lai: '🔙',

  // 🔥 Khác
  new2: '🆕', moi: '🆕',
  free: '🆓', mien_phi: '🆓',
  hot: '🔥', nong: '🔥',
  cool2: '🆒',
  sos: '🆘', cuu: '🆘',
};
function normalizeEmojiKey(text) {
  return text
    .toLowerCase()
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // xoá dấu
    .replace(/\s+/g, "_"); // space -> _
}
function getEmojiSuggestions(word) {
  const stickerSuggestEnabled = localStorage.getItem('stickerSuggest') !== 'false';
  if (!stickerSuggestEnabled) return [];

  if (!word || word.length < 2) return [];

  const q = normalizeEmojiKey(word);

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
  const date = new Date(d);
  const now = new Date();
  const diffD = Math.floor((now - date) / 86400000);
  const time = formatMsgTime(d);
  if (diffD === 0) return `Hôm nay ${time}`;
  if (diffD === 1) return `Hôm qua ${time}`;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + time;
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
      <img
        src={getFileUrl(avatarUrl)}
        alt={username}
        onClick={onClick}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 select-none ${
          onClick ? 'cursor-pointer hover:opacity-80 transition' : ''
        }`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${size === 8 ? 'w-8 h-8' : size === 10 ? 'w-10 h-10' : 'w-8 h-8'} ${color} rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:opacity-80 transition' : ''
      }`}
    >
      {initials}
    </div>
  );
}

function GroupAvatar({ participants = [], currentUserId, groupAvatar }) {
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];

  if (groupAvatar) {
    return (
      <div className="relative w-10 h-10 flex-shrink-0">
        <img
          src={getFileUrl(groupAvatar)}
          alt="Group"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>
    );
  }

  const shownMembers = participants.slice(0, 2);

  if (shownMembers.length === 0) {
    return (
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (shownMembers.length === 1) {
    const p = shownMembers[0];
    const color = COLORS[(p?.username?.charCodeAt(0) || 0) % COLORS.length];
    return (
      <div className="relative w-10 h-10 flex-shrink-0">
        {p?.avatar ? (
          <img src={getFileUrl(p.avatar)} alt={p.username} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-bold text-white text-sm`}>
            {(p?.username || '?').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {shownMembers.map((p, i) => {
        const color = COLORS[(p?.username?.charCodeAt(0) || 0) % COLORS.length];
        const cls = i === 0
          ? 'absolute top-0 left-0 w-6 h-6 border-2 border-white rounded-full'
          : 'absolute bottom-0 right-0 w-6 h-6 border-2 border-white rounded-full';

        return p?.avatar ? (
          <img key={i} src={getFileUrl(p.avatar)} alt={p.username} className={`${cls} object-cover`} />
        ) : (
          <div key={i} className={`${cls} ${color} flex items-center justify-center text-[9px] font-bold text-white`}>
            {(p?.username || '?').slice(0, 2).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function ForwardModal({ msg, onClose, socket }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(new Set());
  const [sent, setSent] = useState(new Set());
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/friends`)
      .then(({ data }) => setFriends(data.data?.friends || data.data || []))
      .catch(() => toast.error('Không thể tải danh sách bạn bè'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = friends.filter((f) => f.username?.toLowerCase().includes(searchQ.toLowerCase()));

  const handleForwardTo = async (friend) => {
    if (sent.has(friend._id) || sending.has(friend._id)) return;
    if (!socket) return;
    setSending((prev) => new Set([...prev, friend._id]));

    try {
      const { data } = await axios.post(`${API_URL}/conversations`, { participantId: friend._id });
      const conv = data.data?.conversation || data.data;
      if (!conv?._id) throw new Error('No conversation');

      socket.emit('send_message', {
        conversationId: conv._id,
        content: msg.content || '',
        type: msg.type || 'text',
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
      });

      setSent((prev) => new Set([...prev, friend._id]));
      toast.success(`Đã chuyển tiếp đến ${friend.username}`);
    } catch {
      toast.error('Không thể chuyển tiếp');
    } finally {
      setSending((prev) => {
        const n = new Set(prev);
        n.delete(friend._id);
        return n;
      });
    }
  };

  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${(localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark')) ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl w-80 overflow-hidden flex flex-col max-h-[75vh]`}>
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-base">Chuyển tiếp tin nhắn</h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
                <X className={`${(localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark')) ? 'text-white' : 'text-gray-400'}`} />
            </button>
          </div>

          <div className={`${(localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark')) ? 'bg-gray-700 rounded-2xl px-3 py-2.5 mb-3 border border-gray-700 text-gray-200' : 'bg-gray-50 rounded-2xl px-3 py-2.5 mb-3 border border-gray-100'}`}>
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
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Tìm bạn bè..."
                className={`${(localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark')) ? 'w-full pl-8 pr-3 py-2 text-sm bg-gray-700 rounded-xl outline-none focus:bg-gray-700 focus:ring-0 text-white transition' : 'w-full pl-8 pr-3 py-2 text-sm bg-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition'}`}
            />
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
          ) : filtered.map((friend) => {
            const color = COLORS[(friend.username?.charCodeAt(0) || 0) % COLORS.length];
            const isSent = sent.has(friend._id);
            const isSending = sending.has(friend._id);

            return (
              <button
                key={friend._id}
                onClick={() => handleForwardTo(friend)}
                disabled={isSent}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition mb-1 ${isSent ? (localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'bg-green-900 text-white' : 'bg-green-50') : (localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}`}
              >
                {friend.avatar ? (
                  <img src={getFileUrl(friend.avatar)} alt={friend.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
                    {friend.username?.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-semibold truncate ${localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'text-white' : 'text-gray-800'}`}>{friend.username}</p>
                  <p className={`text-xs truncate ${localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'text-gray-300' : 'text-gray-400'}`}>{friend.email}</p>
                </div>

                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                  isSent ? 'bg-green-500' : isSending ? (localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'bg-gray-600' : 'bg-gray-200') : 'bg-blue-600 hover:bg-blue-700'
                }`}>
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
          })}
        </div>

        <div className={`px-5 py-3 border-t ${localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'border-gray-700' : 'border-gray-100'}`}>
          <button onClick={onClose} className={`${localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'w-full py-2.5 bg-gray-800 text-white text-sm font-semibold rounded-2xl hover:bg-gray-700 transition' : 'w-full py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-2xl hover:bg-gray-200 transition'}`}>
            {sent.size > 0 ? `Đã gửi đến ${sent.size} người · Đóng` : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ msg, onClose }) {
  const content = msg.content || '';
  const fileUrl = msg.fileUrl ? getFileUrl(msg.fileUrl) : null;
  const shareText = content || (fileUrl ? `[File: ${msg.fileName || 'file'}]` : '');
  const shareUrl = fileUrl || window.location.href;

  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error('Trình duyệt không hỗ trợ chia sẻ');
      return;
    }
    try {
      await navigator.share({
        title: 'Chia sẻ tin nhắn',
        text: shareText,
        url: shareUrl,
      });
    } catch (e) {
      if (e.name !== 'AbortError') toast.error('Không thể chia sẻ');
    }
  };

  const shareApps = [
    {
      name: 'WhatsApp',
      icon: '📱',
      color: 'bg-green-500',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-sky-500',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'bg-red-500',
      url: `mailto:?subject=Chia sẻ tin nhắn&body=${encodeURIComponent(shareText + '\n' + shareUrl)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`${(localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark')) ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white'} rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:w-80 overflow-hidden`}>
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-base">Chia sẻ</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {navigator.share && (
          <div className={`px-5 py-3 border-b ${localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'border-gray-700' : 'border-gray-100'}`}>
            <button onClick={handleNativeShare} className="w-full flex items-center gap-3 py-3 px-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition font-semibold text-sm">
              <Share2 className="w-4 h-4" />
              Chia sẻ qua hệ thống
            </button>
          </div>
        )}

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {shareApps.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className={`${(localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark')) ? 'flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-gray-700 transition' : 'flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-gray-50 transition'}`}
              >
                <div className={`w-12 h-12 ${app.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm`}>
                  {app.icon}
                </div>
                <span className="text-[10px] text-gray-500 font-medium text-center">{app.name}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => {
              navigator.clipboard.writeText(fileUrl || shareText);
              toast.success('Đã sao chép!');
            }}
            className={`${localStorage.getItem('theme')==='dark' || document.documentElement.classList.contains('dark') ? 'w-full flex items-center gap-3 py-3 px-4 bg-gray-800 text-white rounded-2xl hover:bg-gray-700 transition text-sm font-semibold' : 'w-full flex items-center gap-3 py-3 px-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition text-sm font-semibold'}`}
          >
            <Copy className="w-4 h-4" />
            Sao chép {fileUrl ? 'link' : 'nội dung'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CallMessageItem({ msg, mine, onCallback }) {
  const content = msg.content || '';
  const isVideo = content.includes('video') || content.includes('📹');

  let status = 'ended';
  if (content.includes('nhỡ')) status = 'missed';
  else if (content.includes('từ chối')) status = 'rejected';
  else if (content.includes('đã hủy')) status = 'cancelled';

  const durText = content
    .replace(/^📹\s*|^📞\s*/, '')
    .replace('Cuộc gọi video · ', '')
    .replace('Cuộc gọi thoại · ', '')
    .trim();

  const cfgMap = {
    ended: {
      iconBg: 'bg-green-100',
      titleColor: 'text-green-700',
      title: isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại',
      sub: durText ? `⏱ ${durText}` : null,
      bubbleMine: 'bg-blue-50 border-blue-200',
      bubbleOther: 'bg-green-50 border-green-200',
      showCallback: false,
      icon: isVideo ? '📹' : '📞',
    },
    missed: {
      iconBg: 'bg-red-100',
      titleColor: 'text-red-600',
      title: isVideo ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ',
      sub: 'Không có ai trả lời',
      bubbleMine: 'bg-blue-50 border-blue-200',
      bubbleOther: 'bg-red-50 border-red-200',
      showCallback: true,
      icon: '📵',
    },
    rejected: {
      iconBg: 'bg-red-100',
      titleColor: 'text-red-600',
      title: isVideo ? 'Cuộc gọi video bị từ chối' : 'Cuộc gọi thoại bị từ chối',
      sub: 'Cuộc gọi đã bị từ chối',
      bubbleMine: 'bg-blue-50 border-blue-200',
      bubbleOther: 'bg-red-50 border-red-200',
      showCallback: true,
      icon: '📵',
    },
    cancelled: {
      iconBg: 'bg-gray-100',
      titleColor: 'text-gray-600',
      title: isVideo ? 'Cuộc gọi video đã hủy' : 'Cuộc gọi thoại đã hủy',
      sub: 'Người gọi đã hủy cuộc gọi',
      bubbleMine: 'bg-blue-50 border-blue-200',
      bubbleOther: 'bg-gray-50 border-gray-200',
      showCallback: true,
      icon: '📵',
    },
  };

  const cfg = cfgMap[status];
  const bubbleCls = mine ? cfg.bubbleMine : cfg.bubbleOther;
  const callbackBtnCls = mine
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[260px]`}>
        <div className={`border rounded-2xl px-4 py-2.5 ${bubbleCls} ${mine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
              <span className="text-base">{cfg.icon}</span>
            </div>
            <div className="min-w-0">
              <p className={`chat-text font-semibold leading-tight ${cfg.titleColor}`}>{cfg.title}</p>
              {cfg.sub && <p className="chat-caption text-gray-500 mt-0.5">{cfg.sub}</p>}
            </div>
          </div>

          {cfg.showCallback && (
            <button onClick={() => onCallback(isVideo ? 'video' : 'audio')}
              className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl chat-caption font-semibold transition ${callbackBtnCls}`}>
              <Phone className="w-3.5 h-3.5" /> Gọi lại
            </button>
          )}
        </div>
        <span className="chat-caption text-gray-400 mt-0.5 px-1">{formatMsgTime(msg.createdAt)}</span>
      </div>
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
          <p className="chat-meta text-blue-500 font-semibold uppercase tracking-wide">Tin ghim · {pinnedMessages.length}/{PIN_LIMIT}</p>
          <button onClick={() => onScrollToPin(latest._id)}
            className="chat-preview text-blue-700 font-medium truncate block max-w-full text-left hover:underline">
            {latest.sender?.username}: {latest.content || '📎 File'}
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {pinnedMessages.length > 1 && (
            <button onClick={() => setShowAll((v) => !v)} className="p-1 text-blue-500 hover:bg-blue-100 rounded-lg transition">
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
              <span className="chat-meta text-blue-400 font-bold w-4">{i + 1}</span>
              <button onClick={() => onScrollToPin(pm._id)} className="flex-1 chat-preview text-gray-700 truncate text-left hover:text-blue-600">
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

function EditHistoryPopup({ history, onClose, mine }) {
  const ref = useRef(null);
  const sorted = [...history].reverse();

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute z-30 w-64 rounded-xl overflow-hidden shadow-2xl ${
        mine
          ? 'bg-blue-900/95 border border-blue-700 right-0 bottom-full mb-1'
          : 'bg-gray-800/95 border border-gray-600 left-0 bottom-full mb-1'
      }`}
    >
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <p className="font-semibold text-white text-xs flex items-center gap-1.5">
          <Edit3 className="w-3 h-3" />
          Lịch sử chỉnh sửa ({history.length})
        </p>
        <button onClick={onClose}>
          <X className="w-3.5 h-3.5 text-white/50 hover:text-white" />
        </button>
      </div>

      <div className="max-h-52 overflow-y-auto divide-y divide-white/10">
        {sorted.map((entry, i) => (
          <div key={i} className={`px-3 py-2 ${i === 0 ? 'bg-white/10' : ''}`}>
            <p className="text-[10px] text-white/40 mb-0.5 flex items-center gap-1">
              {i === 0 ? (
                <>
                  <Edit3 className="w-2.5 h-2.5" />
                  Nội dung trước khi sửa lần cuối
                </>
              ) : (
                `Phiên bản ${history.length - i}`
              )}
              {' · '}
              {formatMsgTime(entry.editedAt)}
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
      <span className="flex items-center gap-1.5 chat-caption text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
        <Pin className="w-3 h-3" />{notification.text}
        <span className="text-amber-400 chat-meta">{formatMsgTime(notification.time)}</span>
      </span>
    </div>
  );
}

function SystemChatNotification({ msg }) {
  return (
    <div id={`msg-${msg._id}`} className="flex justify-center my-2 px-1">
      <div className="inline-flex flex-col items-center gap-0.5 max-w-[min(96%,28rem)] text-center">
        <p className="text-[11px] text-gray-600 leading-relaxed px-2 text-center">{msg.content}</p>
        <span className="text-[10px] text-gray-400 tabular-nums">{formatMsgTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  mine,
  showAvatar,
  isLastInGroup,
  isRead,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onHide,
  onPin,
  replyMap,
  isPinned,
  onShare,
  isGroup,
  disableActions = false,
  user,
  onScrollToMessage,
  participants = [],
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const moreRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [morePlacement, setMorePlacement] = useState('top');
  const moreCloseTimerRef = useRef(null);
  const proximityListenerRef = useRef(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const h = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMoreMenu]);

  useEffect(() => {
    if (!showMoreMenu) return;
    // Measure available space and choose placement to avoid clipping
    const wrapper = moreRef.current;
    const menu = moreMenuRef.current;
    if (!wrapper || !menu) return;
    const rect = wrapper.getBoundingClientRect();
    const menuH = menu.offsetHeight || 200;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceAbove < menuH && spaceBelow >= menuH) setMorePlacement('bottom');
    else setMorePlacement('top');
  }, [showMoreMenu]);

  const editHistory = msg.editHistory || [];
  const isEdited = editHistory.length > 0 || msg.isEdited;
  const isFileType = msg.type === 'file';
  const isImageType = msg.type === 'image';
  const isMediaMessage = isImageType || isFileType;

  const replyMsg = msg.replyTo
    ? typeof msg.replyTo === 'object'
      ? msg.replyTo
      : replyMap[msg.replyTo]
    : null;

  const reactionsObj = msg.reactions instanceof Map
    ? Object.fromEntries(msg.reactions)
    : (msg.reactions || {});
  const hasReactions = Object.entries(reactionsObj).some(([, u]) => (u || []).length > 0);
  const myReactions = Object.entries(reactionsObj).filter(([, users]) => (users || []).some((id) => (id?._id || id)?.toString() === (user?._id?.toString()))).map(([emoji]) => emoji);

  const handleDownload = () => {
    if (!msg.fileUrl) return;
    const a = document.createElement('a');
    a.href = getFileUrl(msg.fileUrl);
    a.download = msg.fileName || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    try {
      const text = isImageType ? getFileUrl(msg.fileUrl || '') : (msg.content || '');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        toast.success(isImageType ? 'Đã sao chép link ảnh!' : 'Đã sao chép!');
      }
    } catch (err) {}
  };

  const moreItems = [
    { icon: Pin, label: isPinned ? 'Bỏ ghim' : 'Ghim', action: () => { onPin(msg); setShowMoreMenu(false); } },
    { icon: Reply, label: 'Trả lời', action: () => { onReply(msg); setShowMoreMenu(false); } },
    { icon: Forward, label: 'Chuyển tiếp', action: () => { onForward(msg); setShowMoreMenu(false); } },
    ...(!isFileType ? [{
      icon: Copy,
      label: isImageType ? 'Sao chép link' : 'Sao chép',
      action: () => { handleCopy(); setShowMoreMenu(false); },
    }] : []),
    ...(isMediaMessage && msg.fileUrl ? [{
      icon: Download,
      label: 'Tải xuống',
      action: () => { handleDownload(); setShowMoreMenu(false); },
    }] : []),
    { icon: Share2, label: 'Chia sẻ', action: () => { onShare(msg); setShowMoreMenu(false); } },
    { icon: EyeOff, label: 'Ẩn', action: () => { onHide(msg._id); setShowMoreMenu(false); } },
    ...(!isMediaMessage && mine ? [{
      icon: Edit3,
      label: 'Chỉnh sửa',
      action: () => { onEdit(msg); setShowMoreMenu(false); },
    }] : []),
    ...(mine ? [{
      icon: Trash2,
      label: 'Xóa',
      action: () => { onDelete(msg._id); setShowMoreMenu(false); },
      danger: true,
    }] : []),
  ];

  const renderContent = () => {
    if (msg.hidden) return (
      <div className="px-4 py-2 rounded-2xl chat-preview italic text-gray-400 bg-gray-50 border border-dashed border-gray-200">Tin nhắn đã bị ẩn</div>
    );
    if (msg.type === 'image' && msg.fileUrl) return (
      <div className="flex flex-col gap-1 max-w-[280px]">
        <img src={getFileUrl(msg.fileUrl)} alt="Ảnh"
          className={`w-full rounded-2xl object-cover cursor-pointer hover:opacity-90 transition ${msg.status === 'sending' ? 'opacity-70' : ''}`}
          onClick={() => window.open(getFileUrl(msg.fileUrl), '_blank')}
          onError={(e) => { e.target.style.display='none'; }} />
        {msg.content && (
          <div className={`px-3 py-2 rounded-2xl chat-text leading-relaxed break-words ${mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
            <MessageContent content={msg.content} isOwn={mine} />
          </div>
        )}
      </div>
    );
    if (msg.type === 'file' && msg.fileUrl) return (
      <a href={getFileUrl(msg.fileUrl)} target="_blank" rel="noreferrer"
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:opacity-90 transition max-w-[220px]
          ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}
          ${msg.status === 'sending' ? 'opacity-70' : ''}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${mine ? 'bg-blue-500' : 'bg-gray-100'}`}>
          <FileText className={`w-5 h-5 ${mine ? 'text-white' : 'text-blue-600'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="chat-text font-semibold truncate">{msg.fileName || 'File'}</p>
          <p className={`chat-meta ${mine ? 'text-blue-200' : 'text-gray-400'}`}>{formatFileSize(msg.fileSize)}</p>
        </div>
      </a>
    );

    return (
      <div className={`px-4 py-2.5 rounded-2xl chat-text leading-relaxed break-words
        ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}
        ${msg.status === 'sending' ? 'opacity-70' : ''}`}>
        <MessageContent content={msg.content} isOwn={mine} />
      </div>
    );
  };

  const showSenderName = isGroup && !mine && showAvatar && msg.sender?.username;

  return (
    <div
      id={`msg-${msg._id}`}
      className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'} ${isPinned ? 'bg-yellow-50/40 -mx-2 px-2 rounded-xl' : ''}`}
    >
      {!mine && (
        <div className="w-8 flex-shrink-0 self-end">
          {showAvatar ? (
            <Avatar username={msg.sender?.username || '?'} size={8} avatarUrl={msg.sender?.avatar} />
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      <div className={`flex items-end gap-1 ${mine ? 'flex-row-reverse' : 'flex-row'} max-w-[68%]`}>
        <div className={`flex flex-col min-w-0 ${mine ? 'items-end' : 'items-start'}`}>
          {showSenderName && (
            <p className="text-[11px] font-semibold text-blue-600 mb-0.5 px-1">
              {msg.sender.username}
            </p>
          )}

          {replyMsg && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onScrollToMessage?.(replyMsg._id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onScrollToMessage?.(replyMsg._id); }}
              className={`mb-1 px-3 py-1.5 rounded-xl chat-preview w-full cursor-pointer ${mine ? 'bg-blue-800/30 border-l-2 border-blue-300 text-blue-100' : 'bg-gray-200 border-l-2 border-gray-500 text-gray-700'}`}
            >
              <p className="font-bold chat-caption mb-0.5 opacity-80">{
                // Prefer populated sender username, otherwise try to resolve from participants
                (replyMsg.sender && typeof replyMsg.sender === 'object' && (replyMsg.sender.username || replyMsg.sender.name))
                || (typeof replyMsg.sender === 'string' && (participants.find(p => (p?._id || p)?.toString() === replyMsg.sender.toString())?.username))
                || (replyMsg.sender && typeof replyMsg.sender === 'string' ? replyMsg.sender : 'Người dùng')
              }</p>
              <p className="truncate opacity-70">{
                typeof replyMsg === 'object' ? (
                  (replyMsg.type === 'image' || replyMsg.type === 'file') ? '📎 File' : plainTextPreview(replyMsg.content)
                ) : '...'
              }</p>
            </div>
          )}

          {renderContent()}

{hasReactions && (
            <div className={`flex flex-wrap gap-0.5 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactionsObj).map(([emoji, users]) =>
                (users || []).length > 0 && (
                  <button key={emoji} onClick={() => onReact(msg._id, emoji)}
                    className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 chat-caption shadow-sm hover:border-blue-300 transition">
                    {emoji} <span className="text-gray-500 font-medium">{users.length}</span>
                  </button>
                )
              )}
            </div>
          )}

          {isEdited && !isMediaMessage && (
            <div className={`relative mt-0.5 ${mine ? 'self-end' : 'self-start'}`}>
              <button onClick={() => setShowHistory(v => !v)}
                className="flex items-center gap-0.5 chat-meta text-gray-400 hover:text-gray-600 transition">
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
              <span className="chat-caption text-gray-400">{formatMsgTime(msg.createdAt)}</span>
              {mine && (
                <span
                  className={`chat-caption font-medium ${
                    msg.status === 'sending' ? 'text-gray-400' : isRead ? 'text-blue-500' : 'text-gray-400'
                  }`}
                  title={msg.status === 'sending' ? 'Đang gửi' : isRead ? 'Đã xem' : 'Đã gửi (chưa đọc)'}
                >
                  {msg.status === 'sending' ? '○' : isRead ? '✓✓ Đã xem' : '✓✓'}
                </span>
              )}
            </div>
          )}
        </div>

        {!disableActions && (
        <div className="flex items-center gap-0.5 flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-base leading-none"
            >
              ❤️
            </button>

            {showReactionPicker && (
              <div
                className={`absolute ${mine ? 'right-0' : 'left-0'} bottom-full mb-1.5 flex gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-1.5 z-20`}
                style={{ minWidth: 'max-content' }}
              >
                {QUICK_REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => { onReact(msg._id, r); animateReactionBurst(msg._id, r); }}
                    className="text-xl hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => onReply(msg)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
            <Quote className="w-3.5 h-3.5 text-gray-500" />
          </button>

          <div className="relative" ref={moreRef}
            onMouseEnter={() => {
              // cancel pending close
              if (moreCloseTimerRef.current) { clearTimeout(moreCloseTimerRef.current); moreCloseTimerRef.current = null; }
              setShowMoreMenu(true);
            }}
            onMouseLeave={() => {
              // start delayed close and add proximity listener to keep open while nearby
              if (moreCloseTimerRef.current) clearTimeout(moreCloseTimerRef.current);
              moreCloseTimerRef.current = setTimeout(() => setShowMoreMenu(false), 700);
              if (proximityListenerRef.current) document.removeEventListener('mousemove', proximityListenerRef.current);
              const check = (ev) => {
                try {
                  const wrapper = moreRef.current;
                  const menu = moreMenuRef.current;
                  if (!wrapper) return;
                  const insideWrapper = wrapper.contains(ev.target);
                  const insideMenu = menu ? menu.contains(ev.target) : false;
                  if (insideWrapper || insideMenu) {
                    // pointer re-entered near menu -> cancel close
                    if (moreCloseTimerRef.current) { clearTimeout(moreCloseTimerRef.current); moreCloseTimerRef.current = null; }
                    return;
                  }
                  // proximity distance check (px)
                  const rect = menu ? menu.getBoundingClientRect() : wrapper.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  const dx = ev.clientX - cx;
                  const dy = ev.clientY - cy;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 220) {
                    if (moreCloseTimerRef.current) { clearTimeout(moreCloseTimerRef.current); moreCloseTimerRef.current = null; }
                    setShowMoreMenu(false);
                    document.removeEventListener('mousemove', proximityListenerRef.current);
                    proximityListenerRef.current = null;
                  }
                } catch (e) { /* ignore */ }
              };
              proximityListenerRef.current = check;
              document.addEventListener('mousemove', check);
            }}
          >
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition ${
                showMoreMenu ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {showMoreMenu && (
              <div
                ref={moreMenuRef}
                className={`absolute ${mine ? 'right-0' : 'left-0'} ${morePlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 py-1 overflow-hidden`}
              >
                {moreItems.map(({ icon: Icon, label, action, danger }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition hover:bg-gray-50 ${
                      danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

let _conversationRestored = false;

export default function Chat() {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [imagePreviews, setImagePreviews] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [markdownPreviewEnabled, setMarkdownPreviewEnabled] = useState(() => localStorage.getItem('markdownPreview') !== 'false');
  const [emojiTab, setEmojiTab] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [pinNotifications, setPinNotifications] = useState([]);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);
  const [emojiSuggestions, setEmojiSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
    isFriend: false,
  });
  const [friendReqStatus, setFriendReqStatus] = useState('none');
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [msgSearchResults, setMsgSearchResults] = useState([]);
  const [msgSearchIdx, setMsgSearchIdx] = useState(0);

  const [muteMap, setMuteMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_mute_map') || '{}');
    } catch {
      return {};
    }
  });

  // ── Active call tracking for sidebar indicator, prevent concurrent calls ──
  const [activeCall, setActiveCall] = useState(null);
  const handleCallStateChange = useCallback((callInfo) => {
    setActiveCall(callInfo.isActive ? callInfo : null);
  }, []);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('sidebar_visible');
    const isMobileView = window.innerWidth < 768;
    
    if (isMobileView) {
      // Trên mobile: Nếu chưa có preference (vừa login/vào lần đầu), mặc định hiện Sidebar
      return saved !== null ? saved === 'true' : true;
    }
    // Desktop luôn hiện sidebar
    return true;
  });

  useEffect(() => {
    // Tự động hiện Sidebar trên mobile nếu không có cuộc trò chuyện nào được chọn
    if (isMobile && !activeConversation && !showSidebar) {
      setShowSidebar(true);
    }

    if (isMobile) {
    localStorage.setItem('sidebar_visible', showSidebar);
  }
}, [showSidebar, isMobile, activeConversation]);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowSidebar(true);
        localStorage.setItem('sidebar_visible', 'true');
      } else {
        // Khi chuyển từ desktop sang mobile, giữ nguyên trạng thái đã lưu
        const saved = localStorage.getItem('sidebar_visible');
        if (saved !== null) {
          setShowSidebar(saved === 'true');
        }
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const suggestRef = useRef(null);
  const msgSearchTimer = useRef(null);
  const startCallRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevMessagesRef = useRef([]);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);
  const activeConvRef = useRef(null);
  const attachMenuRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPanelRef = useRef(null);
  const infoPanelShellRef = useRef(null);
  const infoPanelToggleRef = useRef(null);
  const rejoinCallRef = useRef(null);
  const restoredConversationReadRef = useRef({ conversationId: '', restoredAt: 0 });
  const lastMarkedReadRef = useRef('');

  const handleMuteChange = (convId, val) => {
    if (!convId) return;
    setMuteMap((prev) => {
      const next = { ...prev, [convId]: val };
      localStorage.setItem('chat_mute_map', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('chat-mute-map-updated', { detail: next }));
      return next;
    });
  };

  // Ngăn người dùng vô tình load lại trang khi đang trong cuộc gọi
  useEffect(() => {
    if (!activeCall?.isActive) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeCall]);

  useEffect(() => {
    if (!showInfoPanel) return;
    const onMouseDown = (e) => {
      if (infoPanelShellRef.current?.contains(e.target)) return;
      if (infoPanelToggleRef.current?.contains(e.target)) return;
      setShowInfoPanel(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showInfoPanel]);

  const inputLinkHints = useMemo(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('linkSuggest') === 'false') return [];
    return extractHttpUrls(inputMessage).slice(0, 5);
  }, [inputMessage]);

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

  const isGroupConv = (conv) => !!(conv?.isGroup || conv?.type === 'group' || conv?.type === 'community');
  // whether the active conversation is a group
  const isGroup = isGroupConv(activeConversation);
  const isSelfConversation = (conv) => {
    if (!conv || isGroupConv(conv) || !user?._id) return false;
    const participants = conv.participants || [];
    if (participants.length !== 1) return false;
    const onlyParticipant = participants[0]?._id || participants[0];
    return String(onlyParticipant) === String(user._id);
  };

  const getOtherUser = (conv) => {
    if (!conv) return null;
    if (isSelfConversation(conv)) return null;
    if (isGroupConv(conv)) {
      const currentId = user?._id ? String(user._id) : '';

      // Ưu tiên gọi admin/trưởng nhóm (nếu admin không phải mình).
      // Lưu ý: conv.admin có thể là object đã populate hoặc là ObjectId/string.
      const adminId = conv.admin
        ? (typeof conv.admin === 'object' ? conv.admin._id : conv.admin)
        : null;
      if (adminId) {
        const adminIdStr = String(adminId);
        if (adminIdStr && adminIdStr !== currentId) {
          const adminMember = (conv.participants || []).find((p) => {
            const pid = typeof p === 'object' ? (p?._id || p?.id) : p;
            return pid && String(pid) === adminIdStr;
          });
          if (adminMember) {
            if (typeof adminMember === 'object') return adminMember;
            return { _id: adminMember, username: conv.name || 'Nhóm' };
          }

          // Nếu adminId không nằm trong participants (hiếm), fallback trả adminObj nếu có.
          if (typeof conv.admin === 'object' && conv.admin?._id) return conv.admin;
        }
      }

      // Fallback: gọi một thành viên khác trong participants (đảm bảo "to" thuộc group).
      const other = (conv.participants || []).find((p) => {
        const pid = typeof p === 'object' ? (p?._id || p?.id) : p;
        return currentId && String(pid) !== currentId;
      });

      if (other) {
        if (typeof other === 'object') return other;
        return { _id: other, username: conv.name || 'Nhóm' };
      }

      return { _id: null, username: conv.name || 'Nhóm' };
    }

    const other = conv.participants?.find((p) => (typeof p === 'object' ? p._id : p) !== user?._id) || null;
    if (!other) return null;
    if (typeof other === 'object') return other;
    return { _id: other, username: 'Người dùng' };
  };

  const isPersonalConversation = isSelfConversation(activeConversation);
  const otherUser = getOtherUser(activeConversation);
  const displayUser = isPersonalConversation ? user : otherUser;

  useEffect(() => {
    if (isPersonalConversation || !otherUser?._id || isGroupConv(activeConversation)) {
      setBlockStatus({ iBlockedThem: false, theyBlockedMe: false, isFriend: !!isPersonalConversation });
      setFriendReqStatus('none');
      setPendingRequestId(null);
      return;
    }

    axios.get(`${API_URL}/friends/block-status/${otherUser._id}`)
      .then(({ data }) => {
        const s = data.data || {};
        setBlockStatus(s);
        setFriendReqStatus(s.friendReqStatus || (s.isFriend ? 'friends' : 'none'));
        setPendingRequestId(s.requestId || null);
      })
      .catch(() => {});
  }, [isPersonalConversation, otherUser?._id, activeConversation?._id]);

  useEffect(() => {
    if (_conversationRestored || !socket) return;
    const savedId = localStorage.getItem('activeConversationId');
    if (!savedId) {
      _conversationRestored = true;
      return;
    }

    _conversationRestored = true;
    axios.get(`${API_URL}/conversations`)
      .then(({ data }) => {
        const convs = data.data?.conversations || data.data || [];
        const found = convs.find((c) => c._id === savedId);
        if (found) {
          setActiveConversation(found);
          setPinnedMessages(found.pinnedMessages || []);
          restoredConversationReadRef.current = {
            conversationId: found._id,
            restoredAt: Date.now(),
          };
        }
      })
      .catch(() => {});
  }, [socket]);

  const handleStartCallReady = useCallback((fn) => {
    // Only expose call starter when the active conversation is NOT a group
    if (!isGroup) startCallRef.current = fn;
    else startCallRef.current = null;
  }, [isGroup]);

  const handleCallEnd = useCallback(({
    type = 'audio',
    duration = 0,
    status = 'ended',
    isCaller = true,
    calleeId = null,
  } = {}) => {
    const conv = activeConvRef.current;
    if (!conv || !socket || !isCaller) return;
    socket.emit('call_summary', {
      to: calleeId,
      callType: type,
      status,
      duration,
      conversationId: conv._id,
    });
  }, [socket]);

  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  const markConversationAsRead = useCallback((conversationId, sourceMessages, options = {}) => {
    const { ignoreRestoreSkip = false } = options;

    if (!socket || !conversationId || !Array.isArray(sourceMessages) || sourceMessages.length === 0) return;
    if (document.visibilityState !== 'visible') return;

    let unreadIncoming = sourceMessages.filter((msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const isMine = senderId?.toString() === user?._id?.toString();
      const readByMe = (msg.readBy || []).some(
        (id) => (id?._id || id)?.toString() === user?._id?.toString()
      );
      return !isMine && !readByMe;
    });

    const restoreState = restoredConversationReadRef.current;
    if (!ignoreRestoreSkip && restoreState.conversationId === conversationId) {
      unreadIncoming = unreadIncoming.filter(
        (msg) => new Date(msg.createdAt).getTime() > restoreState.restoredAt
      );
    }

    if (unreadIncoming.length === 0) return;

    const lastUnreadId = unreadIncoming[unreadIncoming.length - 1]._id;
    const marker = `${conversationId}:${lastUnreadId}`;

    if (lastMarkedReadRef.current === marker) return;
    lastMarkedReadRef.current = marker;

    socket.emit('message_read', {
      conversationId,
      messageId: lastUnreadId,
    });
  }, [socket, user?._id]);

  const unlockRestoredConversationRead = useCallback((conversationId, sourceMessages = messages) => {
    if (!conversationId) return;
    if (restoredConversationReadRef.current.conversationId !== conversationId) return;

    restoredConversationReadRef.current = { conversationId: '', restoredAt: 0 };
    lastMarkedReadRef.current = '';
    markConversationAsRead(conversationId, sourceMessages, { ignoreRestoreSkip: true });
  }, [messages, markConversationAsRead]);

  useEffect(() => {
    lastMarkedReadRef.current = '';
  }, [activeConversation?._id]);

  useEffect(() => {
    // load personal storage when opening personal conversation
    const fetchPersonalStorage = async () => {
      if (!isPersonalConversation) {
        setPersonalStorageItems([]);
        return;
      }
      try {
        const { data } = await axios.get(`${API_URL}/personal-storage`);
        setPersonalStorageItems(data.data || []);
      } catch (err) {
        console.error('fetch personal storage err', err);
        setPersonalStorageItems([]);
      }
    };

    fetchPersonalStorage();
    const _psHandler = () => fetchPersonalStorage();
    window.addEventListener('personal-storage-changed', _psHandler);

    if (!activeConversation) {
      window.removeEventListener('personal-storage-changed', _psHandler);
      return;
    }

    setPinnedMessages(activeConversation.pinnedMessages || []);
    setPinNotifications([]);

    const isActiveGroupMember = !!activeConversation?.participants?.some(
      (p) => String(p?._id || p) === String(user?._id)
    );
    const isReadOnlyGroupConversation = isGroupConv(activeConversation) && (
      !!activeConversation?.dissolvedAt || !isActiveGroupMember
    );

    // Khi bị kick khỏi group, chỉ hiển thị đúng 1 tin nhắn gần nhất trước thời điểm kick.
    const onlyLastBeforeKick = isGroupConv(activeConversation)
      && !activeConversation?.dissolvedAt
      && !isActiveGroupMember
      && !!activeConversation?.historyVisibleUntil;

    loadMessages(activeConversation._id, activeConversation.historyVisibleUntil || null, onlyLastBeforeKick);

    if (socket && !isReadOnlyGroupConversation) {
      socket.emit('join_conversation', { conversationId: activeConversation._id });
    }

    return () => {
      window.removeEventListener('personal-storage-changed', _psHandler);
      if (socket) socket.emit('leave_conversation', { conversationId: activeConversation._id });
    };
  }, [activeConversation, socket, user?._id]);

  useEffect(() => {
    if (!socket) return;

    const onNewMsg = ({ message, conversationId }) => {
      const activeConversation = activeConvRef.current;
      if (conversationId !== activeConversation?._id) return;

      const isRemovedFromActiveGroup = isGroupConv(activeConversation) && (
        !!activeConversation?.dissolvedAt ||
        !activeConversation?.participants?.some(
          (participant) => String(participant?._id || participant) === String(user?._id)
        )
      );
      if (isRemovedFromActiveGroup) return;

      const historyCutoff = activeConversation?.historyVisibleUntil
        ? new Date(activeConversation.historyVisibleUntil).getTime()
        : null;
      const messageCreatedAt = message?.createdAt ? new Date(message.createdAt).getTime() : null;
      if (historyCutoff && messageCreatedAt && messageCreatedAt > historyCutoff) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;

        if (message.type === 'system' && message.metadata?.callStatus) {
          const withoutOptimistic = prev.filter((m) => !m._id?.startsWith('call-opt-'));
          return [...withoutOptimistic, message];
        }

        const senderId = message.sender?._id || message.sender;
        const withoutTemp = prev.filter((m) => {
          if (!m._id?.startsWith('temp-')) return true;
          const mSender = m.sender?._id || m.sender;
          return mSender?.toString() !== senderId?.toString();
        });

        return [...withoutTemp, message];
      });
    };

    const onMsgRead = ({ conversationId, readBy }) => {
      if (conversationId !== activeConvRef.current?._id) return;

      setMessages((prev) => prev.map((m) => {
        if ((m.sender?._id || m.sender) !== user?._id) return m;
        const already = (m.readBy || []).some(
          (id) => (id?._id || id)?.toString() === readBy?.toString()
        );
        if (already) return m;
        return { ...m, readBy: [...(m.readBy || []), readBy] };
      }));
    };

    const onMsgReaction = ({ messageId, reactions }) =>
      setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions } : m));

    const onMsgEdited = ({ messageId, content, editHistory }) =>
      setMessages((prev) => prev.map((m) => (
        m._id === messageId ? { ...m, content, editHistory, isEdited: true } : m
      )));

    const onMsgDeleted = ({ messageId }) =>
      setMessages((prev) => prev.filter((m) => m._id !== messageId));

    const onTyping = ({ userId, conversationId }) => {
      if (conversationId === activeConvRef.current?._id && userId !== user?._id) {
        setTypingUsers((prev) => new Set([...prev, userId]));
      }
    };

    const onStopTyping = ({ userId }) => {
      setTypingUsers((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
    };

    const onOnline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.add(String(userId));
        // notify other components in-tab
        try { window.dispatchEvent(new CustomEvent('presence-updated', { detail: { online: Array.from(n) } })); } catch (e) {}
        return n;
      });
    };

    const onOffline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.delete(String(userId));
        try { window.dispatchEvent(new CustomEvent('presence-updated', { detail: { online: Array.from(n) } })); } catch (e) {}
        return n;
      });
    };

    const onOnlineList = (ids) => {
      const s = new Set(ids.map(String));
      try { window.dispatchEvent(new CustomEvent('presence-updated', { detail: { online: Array.from(s) } })); } catch (e) {}
      setOnlineUsers(s);
    };

    const onPinUpdated = ({ conversationId, isPinning, pinnedMessages: newPins, pinnedBy }) => {
      if (conversationId !== activeConvRef.current?._id) return;
      setPinnedMessages(newPins || []);
      setPinNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: isPinning ? `${pinnedBy} đã ghim một tin nhắn` : `${pinnedBy} đã bỏ ghim`,
          time: new Date().toISOString(),
          isPinning,
        },
      ]);
    };

    const onFriendRemoved = ({ userId }) => {
      if (
        userId === otherUser?._id ||
        activeConvRef.current?.participants?.some((p) => (p._id || p)?.toString() === userId)
      ) {
        setBlockStatus((prev) => ({ ...prev, isFriend: false }));
      }
    };

    const onBlockedByUser = ({ byUserId }) => {
      if (!otherUser?._id || String(byUserId) !== String(otherUser._id)) return;
      setBlockStatus((prev) => ({
        ...prev,
        theyBlockedMe: true,
        isFriend: false,
      }));
      setFriendReqStatus('none');
    };

    const onUnblockedByUser = ({ byUserId }) => {
      if (!otherUser?._id || String(byUserId) !== String(otherUser._id)) return;
      setBlockStatus((prev) => ({
        ...prev,
        theyBlockedMe: false,
      }));
    };

    const onIBlockedUser = ({ userId }) => {
      if (!otherUser?._id || String(userId) !== String(otherUser._id)) return;
      setBlockStatus((prev) => ({
        ...prev,
        iBlockedThem: true,
        isFriend: false,
      }));
      setFriendReqStatus('none');
    };

    const onIUnblockedUser = ({ userId }) => {
      if (!otherUser?._id || String(userId) !== String(otherUser._id)) return;
      setBlockStatus((prev) => ({
        ...prev,
        iBlockedThem: false,
      }));
    };

    const onFriendRequestReceived = ({ request }) => {
      if (!otherUser?._id) return;
      const fromId = request?.from?._id || request?.from;
      if (String(fromId) !== String(otherUser._id)) return;
      setFriendReqStatus('received');
      setPendingRequestId(request?._id || null);
    };

    const onFriendRequestSent = ({ toUserId }) => {
      if (!otherUser?._id) return;
      if (String(toUserId) !== String(otherUser._id)) return;
      setFriendReqStatus('sent');
      setPendingRequestId(null);
    };

    const onFriendRequestCancelled = ({ fromUserId }) => {
      if (!otherUser?._id) return;
      if (String(fromUserId) !== String(otherUser._id)) return;
      setFriendReqStatus('none');
      setPendingRequestId(null);
    };

    const onFriendRequestCancelledByMe = ({ toUserId }) => {
      if (!otherUser?._id) return;
      if (String(toUserId) !== String(otherUser._id)) return;
      setFriendReqStatus('none');
      setPendingRequestId(null);
    };

    const onFriendRequestAccepted = ({ byUserId, user }) => {
      const acceptedUserId = byUserId || user?._id;
      if (!otherUser?._id) return;
      if (String(acceptedUserId) !== String(otherUser._id)) return;
      setFriendReqStatus('friends');
      setPendingRequestId(null);
      setBlockStatus((prev) => ({ ...prev, isFriend: true }));
    };

    const onFriendRequestAcceptSynced = ({ userId }) => {
      if (!otherUser?._id) return;
      if (String(userId) !== String(otherUser._id)) return;
      setFriendReqStatus('friends');
      setPendingRequestId(null);
      setBlockStatus((prev) => ({ ...prev, isFriend: true }));
    };

    const onFriendRequestRejected = ({ byUserId }) => {
      if (!otherUser?._id) return;
      if (String(byUserId) !== String(otherUser._id)) return;
      setFriendReqStatus('none');
      setPendingRequestId(null);
    };

    const mergeActiveGroupConversation = (updatedConversation) => {
      if (!updatedConversation?._id) return;
      if (String(updatedConversation._id) !== String(activeConvRef.current?._id)) return;
      setActiveConversation((prev) => prev ? {
        ...prev,
        ...updatedConversation,
        participants: updatedConversation.participants || prev.participants,
        formerParticipants: updatedConversation.formerParticipants || prev.formerParticipants,
        formerParticipantMeta: updatedConversation.formerParticipantMeta || prev.formerParticipantMeta,
        admin: updatedConversation.admin ?? prev.admin,
        permissions: updatedConversation.permissions ?? prev.permissions,
        avatar: updatedConversation.avatar ?? prev.avatar,
        name: updatedConversation.name ?? prev.name,
        dissolvedAt: updatedConversation.dissolvedAt ?? prev.dissolvedAt,
        dissolvedBy: updatedConversation.dissolvedBy ?? prev.dissolvedBy,
        historyVisibleUntil: updatedConversation.historyVisibleUntil ?? prev.historyVisibleUntil,
      } : updatedConversation);
    };

    const trimMessagesToVisibleHistory = (historyVisibleUntil, onlyLast = false) => {
      if (!historyVisibleUntil) return;
      const cutoff = new Date(historyVisibleUntil).getTime();
      setMessages((prev) => {
        const filtered = prev.filter((msg) => {
          const createdAt = msg?.createdAt ? new Date(msg.createdAt).getTime() : null;
          return !createdAt || createdAt <= cutoff;
        });
        return onlyLast ? filtered.slice(-1) : filtered;
      });
    };

    const onGroupUpdated = ({ conversation }) => mergeActiveGroupConversation(conversation);
    const onMemberAdded = ({ conversation }) => mergeActiveGroupConversation(conversation);
    const onMemberRemoved = ({ conversation }) => mergeActiveGroupConversation(conversation);
    const onMemberLeft = ({ conversation }) => mergeActiveGroupConversation(conversation);
    const onRemovedFromGroup = ({ conversation }) => {
      if (conversation?._id) {
        socket.emit('leave_conversation', { conversationId: conversation._id });
      }
      mergeActiveGroupConversation(conversation);
      trimMessagesToVisibleHistory(conversation?.historyVisibleUntil, true);
    };
    const onAddedToGroup = ({ conversation }) => mergeActiveGroupConversation(conversation);
    const onGroupDissolved = ({ conversation }) => {
      if (conversation?._id) {
        socket.emit('leave_conversation', { conversationId: conversation._id });
      }
      mergeActiveGroupConversation(conversation);
    };
    const onPromotedToAdmin = ({ conversation, message }) => {
      mergeActiveGroupConversation(conversation);
      if (message && String(conversation?._id) === String(activeConvRef.current?._id)) {
        toast.success(message);
      }
    };


    socket.on('new_message', onNewMsg);
    socket.on('messages_read', onMsgRead);
    socket.on('message_reaction', onMsgReaction);
    socket.on('message_edited', onMsgEdited);
    socket.on('message_deleted', onMsgDeleted);
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStopTyping);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('online_users_list', onOnlineList);
    socket.on('pin_updated', onPinUpdated);
    socket.on('friend_removed', onFriendRemoved);
    socket.on('blocked_by_user', onBlockedByUser);
    socket.on('unblocked_by_user', onUnblockedByUser);
    socket.on('i_blocked_user', onIBlockedUser);
    socket.on('i_unblocked_user', onIUnblockedUser);
    socket.on('friend_request_received', onFriendRequestReceived);
    socket.on('friend_request_sent', onFriendRequestSent);
    socket.on('friend_request_cancelled', onFriendRequestCancelled);
    socket.on('friend_request_cancelled_by_me', onFriendRequestCancelledByMe);
    socket.on('friend_request_accepted', onFriendRequestAccepted);
    socket.on('friend_request_accept_synced', onFriendRequestAcceptSynced);
    socket.on('friend_request_rejected', onFriendRequestRejected);
    socket.on('group_updated', onGroupUpdated);
    socket.on('member_added', onMemberAdded);
    socket.on('member_removed', onMemberRemoved);
    socket.on('member_left', onMemberLeft);
    socket.on('removed_from_group', onRemovedFromGroup);
    socket.on('added_to_group', onAddedToGroup);
    socket.on('group_dissolved', onGroupDissolved);
    socket.on('promoted_to_admin', onPromotedToAdmin);



    return () => {
      socket.off('new_message', onNewMsg);
      socket.off('messages_read', onMsgRead);
      socket.off('message_reaction', onMsgReaction);
      socket.off('message_edited', onMsgEdited);
      socket.off('message_deleted', onMsgDeleted);
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('online_users_list', onOnlineList);
      socket.off('pin_updated', onPinUpdated);
      socket.off('friend_removed', onFriendRemoved);
      socket.off('blocked_by_user', onBlockedByUser);
      socket.off('unblocked_by_user', onUnblockedByUser);
      socket.off('i_blocked_user', onIBlockedUser);
      socket.off('i_unblocked_user', onIUnblockedUser);
      socket.off('friend_request_received', onFriendRequestReceived);
      socket.off('friend_request_sent', onFriendRequestSent);
      socket.off('friend_request_cancelled', onFriendRequestCancelled);
      socket.off('friend_request_cancelled_by_me', onFriendRequestCancelledByMe);
      socket.off('friend_request_accepted', onFriendRequestAccepted);
      socket.off('friend_request_accept_synced', onFriendRequestAcceptSynced);
      socket.off('friend_request_rejected', onFriendRequestRejected);
      socket.off('group_updated', onGroupUpdated);
      socket.off('member_added', onMemberAdded);
      socket.off('member_removed', onMemberRemoved);
      socket.off('member_left', onMemberLeft);
      socket.off('removed_from_group', onRemovedFromGroup);
      socket.off('added_to_group', onAddedToGroup);
      socket.off('group_dissolved', onGroupDissolved);
      socket.off('promoted_to_admin', onPromotedToAdmin);


    };
  }, [socket, user?._id, otherUser?._id]);

  useEffect(() => {
    // Only auto-scroll when new messages are appended (avoid jumping on reaction/metadata updates)
    const prev = prevMessagesRef.current || [];
    if (messages.length > prev.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!activeConversation?._id || !messages.length) return;
    markConversationAsRead(activeConversation._id, messages);
  }, [activeConversation?._id, messages, markConversationAsRead]);

    // Tự động focus vào input khi chọn conversation
  useEffect(() => {
    if (activeConversation) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeConversation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!activeConvRef.current?._id) return;
      markConversationAsRead(activeConvRef.current._id, messages);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [messages, markConversationAsRead]);

  const loadMessages = async (conversationId, historyVisibleUntil = null, onlyLastBeforeCutoff = false) => {
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`${API_URL}/messages/${conversationId}`);
      const msgs = data.data?.messages || data.data || [];
      const cutoff = historyVisibleUntil ? new Date(historyVisibleUntil).getTime() : null;
      const filtered = cutoff
        ? msgs.filter((msg) => new Date(msg.createdAt).getTime() <= cutoff)
        : msgs;
      setMessages(onlyLastBeforeCutoff ? filtered.slice(-1) : filtered);
    } catch {
      toast.error('Không thể tải tin nhắn');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowEmoji(false);

    if (blockStatus.theyBlockedMe || blockStatus.iBlockedThem) return;

    const hasImages = imagePreviews.length > 0;
    const hasFiles = filePreviews.length > 0;

    if ((!inputMessage.trim() && !hasImages && !hasFiles) || !activeConversation || !socket) return;

    unlockRestoredConversationRead(activeConversation._id, messages);

    if (hasFiles) {
      await handleSendFiles();
      return;
    }

    if (hasImages) {
      await handleSendImages();
      return;
    }

    const content = replaceEmojiShortcodes(inputMessage.trim());
    setInputMessage('');
    const currentReply = replyingTo;
    setReplyingTo(null);

    setMessages((prev) => [
      ...prev,
      {
        _id: `temp-${Date.now()}`,
        content,
        sender: user,
        createdAt: new Date().toISOString(),
        status: 'sending',
        readBy: [],
        replyTo: currentReply?._id,
      },
    ]);

    socket.emit('send_message', {
      conversationId: activeConversation._id,
      content,
      type: 'text',
      replyTo: currentReply?._id,
    });

    stopTypingSignal();
  };

  const handleImageSelect = (e) => {
    const f = Array.from(e.target.files || []);
    if (f.length) addImages(f);
    e.target.value = '';
  };

  const addImages = (newFiles) => {
    const valid = newFiles.filter((f) => f.type.startsWith('image/'));
    if (valid.length !== newFiles.length) toast.error('Chỉ chấp nhận file ảnh');
    const rem = MAX_IMAGES - imagePreviews.length;
    const add = valid.slice(0, rem);
    if (valid.length > rem) toast.error(`Tối đa ${MAX_IMAGES} ảnh`);
    setFilePreviews([]);
    setImagePreviews((prev) => [
      ...prev,
      ...add.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    ]);
  };

  const removeImage = (idx) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleFileSelect = (e) => {
    const f = Array.from(e.target.files || []);
    if (f.length) addFiles(f);
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const addFiles = (newFiles) => {
    const valid = newFiles.filter((f) => f.size <= 50 * 1024 * 1024);
    if (valid.length !== newFiles.length) toast.error('Một số file vượt 50MB đã bị bỏ');
    const rem = MAX_FILES - filePreviews.length;
    const add = valid.slice(0, rem);
    if (valid.length > rem) toast.error(`Tối đa ${MAX_FILES} file`);
    setImagePreviews([]);
    setFilePreviews((prev) => [...prev, ...add.map((f) => ({ file: f }))]);
  };

  const removeFile = (idx) => {
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSendImages = async () => {
    if (!imagePreviews.length) return;
    setUploading(true);

    const caption = inputMessage.trim();
    const replyTo = replyingTo?._id;
    const snapshots = [...imagePreviews];

    setImagePreviews([]);
    setInputMessage('');
    setReplyingTo(null);

    try {
      const attachReplyToFiles = caption === '' ? replyTo : undefined;

      for (let i = 0; i < snapshots.length; i++) {
        setUploadProgress(Math.round((i / snapshots.length) * 100));
        const formData = new FormData();
        formData.append('file', snapshots[i].file);

        const { data } = await axios.post(`${API_URL}/messages/upload`, formData);

        socket.emit('send_message', {
          conversationId: activeConversation._id,
          content: '',
          type: 'image',
          fileUrl: data.data.fileUrl,
          fileName: data.data.fileName,
          fileSize: data.data.fileSize,
          replyTo: i === 0 ? attachReplyToFiles : undefined,
        });

        URL.revokeObjectURL(snapshots[i].url);
      }

      // send caption as a separate text message after all images
      if (caption) {
        socket.emit('send_message', {
          conversationId: activeConversation._id,
          content: caption,
          type: 'text',
          replyTo: replyTo || undefined,
        });
      }
    } catch {
      toast.error('Có ảnh không thể gửi được');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSendFiles = async () => {
    if (!filePreviews.length) return;
    setUploading(true);

    const caption = inputMessage.trim();
    const replyTo = replyingTo?._id;
    const snapshots = [...filePreviews];

    setFilePreviews([]);
    setInputMessage('');
    setReplyingTo(null);

    try {
      const attachReplyToFiles = caption === '' ? replyTo : undefined;

      for (let i = 0; i < snapshots.length; i++) {
        setUploadProgress(Math.round((i / snapshots.length) * 100));
        const formData = new FormData();
        formData.append('file', snapshots[i].file);

        const { data } = await axios.post(`${API_URL}/messages/upload`, formData);

        socket.emit('send_message', {
          conversationId: activeConversation._id,
          content: '',
          type: 'file',
          fileUrl: data.data.fileUrl,
          fileName: data.data.fileName || snapshots[i].file.name,
          fileSize: data.data.fileSize || snapshots[i].file.size,
          replyTo: i === 0 ? attachReplyToFiles : undefined,
        });
      }

      // send caption as a separate text message after all files
      if (caption) {
        socket.emit('send_message', {
          conversationId: activeConversation._id,
          content: caption,
          type: 'text',
          replyTo: replyTo || undefined,
        });
      }
    } catch {
      toast.error('Không thể gửi file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const applyEmojiSuggestion = ({ emoji }) => {
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? inputMessage.length;
    const textBefore = inputMessage.slice(0, cursor);
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
function replaceEmojiShortcodes(text) {
  return text.replace(/:(.*?):/g, (_, code) => {
    const key = normalizeEmojiKey(code);
    return EMOJI_SHORTCODES[key] || `:${code}:`;
  });
}
  const handleTypingInput = (e) => {
    const val = e.target.value;
    if (val.length > MAX_LENGTH) return;

    setInputMessage(val);

    if (activeConversation?._id) {
      unlockRestoredConversationRead(activeConversation._id, messages);
    }

    const stickerEnabled = localStorage.getItem('stickerSuggest') !== 'false';
    if (stickerEnabled) {
      const cursor = e.target.selectionStart;
      const textBefore = val.slice(0, cursor);
      const match = textBefore.match(/([\p{L}\s]{2,})$/u);
      if (match) {
        setEmojiSuggestions(getEmojiSuggestions(match[1]));
        setSuggestionIndex(0);
      } else {
        setEmojiSuggestions([]);
      }
    } else {
      setEmojiSuggestions([]);
    }

    if (!socket || !activeConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { conversationId: activeConversation._id });
    }

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
    if (emojiSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((i) => (i + 1) % emojiSuggestions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((i) => (i - 1 + emojiSuggestions.length) % emojiSuggestions.length);
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

    // Xử lý Enter dựa trên cài đặt
    if (e.key === 'Enter') {
      // Nếu đang chỉnh sửa tin nhắn
      if (editingMsg) {
        if (!e.shiftKey) {
          e.preventDefault();
          submitEdit();
        }
        return;
      }

      // Chế độ Enter để gửi
      if (enterToSend) {
        if (!e.shiftKey) {
          // Enter không shift: gửi tin nhắn
          e.preventDefault();
          handleSendMessage(e);
        }
        // Shift+Enter: xuống dòng (textarea tự xử lý)
      } else {
        if (e.shiftKey || e.ctrlKey) {
          // Shift+Enter hoặc Ctrl+Enter: gửi tin nhắn
          e.preventDefault();
          handleSendMessage(e);
        }
      }
    }

    // Ctrl+F để tìm kiếm
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowMsgSearch(true);
      setTimeout(() => {
        const searchInput = document.querySelector('input[placeholder*="Tìm kiếm tin nhắn"]');
        searchInput?.focus();
      }, 100);
    }

    if (e.key === 'Escape') {
      setShowEmoji(false);
      setShowMenu(false);
      setReplyingTo(null);
      if (editingMsg) {
        setEditingMsg(null);
        setInputMessage('');
      }
      setShowAttachMenu(false);
      setShowInfoPanel(false);
      setShowMsgSearch(false);
      setMsgSearchQuery('');
    }
  };

  const insertEmoji = (emoji) => {
    const el = inputRef.current;

    if (!el) {
      const newVal = inputMessage + emoji;
      if (newVal.length <= MAX_LENGTH) setInputMessage(newVal);
      return;
    }

    const start = el.selectionStart ?? inputMessage.length;
    const end = el.selectionEnd ?? inputMessage.length;
    const newVal = inputMessage.slice(0, start) + emoji + inputMessage.slice(end);
    if (newVal.length > MAX_LENGTH) return;

    setInputMessage(newVal);

    requestAnimationFrame(() => {
      el.focus();
      const newPos = start + emoji.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const handlePin = (msg) => {
    const isPinning = !pinnedMessages.some((p) => p._id?.toString() === msg._id?.toString());
    socket?.emit('pin_message', {
      messageId: msg._id,
      conversationId: activeConversation._id,
      isPinning,
    });
  };

  const handleUnpin = (msgId) => {
    socket?.emit('pin_message', {
      messageId: msgId,
      conversationId: activeConversation._id,
      isPinning: false,
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

    socket.emit('react_message', {
      messageId,
      emoji,
      conversationId: activeConversation._id,
    });

    setMessages((prev) => prev.map((m) => {
      if (m._id !== messageId) return m;
      const raw = m.reactions instanceof Map
        ? Object.fromEntries(m.reactions)
        : { ...(m.reactions || {}) };
      const users = [...(raw[emoji] || [])];
      const myId = user?._id;
      const idx = users.findIndex((id) => (id?._id || id)?.toString() === myId?.toString());
      if (idx > -1) users.splice(idx, 1);
      else users.push(myId);
      return { ...m, reactions: { ...raw, [emoji]: users } };
    }));
  };

  // Local visual burst of emojis for repeated reaction clicks
  const animateReactionBurst = (messageId, emoji) => {
    try {
      const container = document.getElementById(`msg-${messageId}`);
      if (!container) return;
      for (let i = 0; i < 6; i++) {
        const el = document.createElement('div');
        el.textContent = emoji;
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        el.style.fontSize = `${12 + Math.random() * 12}px`;
        el.style.opacity = '0.95';
        el.style.left = `${50 + Math.random() * 40}%`;
        el.style.bottom = '8px';
        el.style.transform = `translateX(-50%)`;
        container.style.position = container.style.position || 'relative';
        container.appendChild(el);
        const dx = (Math.random() - 0.5) * 60;
        const dy = 60 + Math.random() * 80;
        el.animate([
          { transform: `translate(${dx}px, 0px) scale(1)`, opacity: 1 },
          { transform: `translate(${dx}px, -${dy}px) scale(1.4)`, opacity: 0 },
        ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.2,1)' });
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 1400);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
    setEditingMsg(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'markdownPreview') {
        setMarkdownPreviewEnabled(e.newValue !== 'false');
      }
      if (e.key === 'enterToSend') {
        setEnterToSend(e.newValue !== 'false');
      }
    };
    
    const onCustomEvent = (e) => {
      if (e.detail?.enterToSend !== undefined) {
        setEnterToSend(e.detail.enterToSend);
      }
    };
    
    window.addEventListener('storage', onStorage);
    window.addEventListener('enter-to-send-changed', onCustomEvent);
    
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('enter-to-send-changed', onCustomEvent);
    };
  }, []);

  const handleEdit = (msg) => {
    setEditingMsg(msg);
    setInputMessage(msg.content || '');
    setReplyingTo(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submitEdit = () => {
    if (!inputMessage.trim() || !editingMsg || !socket) return;

    const newContent = inputMessage.trim();

    socket.emit('edit_message', {
      messageId: editingMsg._id,
      content: newContent,
      conversationId: activeConversation._id,
    });

    setMessages((prev) => prev.map((m) => (
      m._id === editingMsg._id
        ? {
            ...m,
            content: newContent,
            isEdited: true,
            editHistory: [...(m.editHistory || []), {
              content: m.content,
              editedAt: new Date().toISOString(),
            }],
          }
        : m
    )));

    setEditingMsg(null);
    setInputMessage('');
  };

  const handleDelete = async (messageId) => {
    const ok = await confirmAsync({ title: 'Xóa tin nhắn', message: 'Bạn có chắc muốn xóa tin nhắn này?' });
    if (!ok) return;
    socket?.emit('delete_message', { messageId, conversationId: activeConversation._id });
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
    setPinnedMessages((prev) => prev.filter((p) => p._id !== messageId));
  };

  const handleForward = (msg) => setForwardMsg(msg);

  const handleHide = (msgId) => {
    setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, hidden: true } : m));
    toast('Đã ẩn tin nhắn');
  };

  const handleShare = (msg) => setShareMsg(msg);

  const handleSendFriendRequestFromChat = async (userId) => {
    try {
      await axios.post(`${API_URL}/friends/request/${userId}`);
      toast.success('Đã gửi lời mời kết bạn!');
      setFriendReqStatus('sent');
      setPendingRequestId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi lời mời');
    }
  };

  const handleCancelFriendRequestFromChat = async (userId) => {
    try {
      await axios.delete(`${API_URL}/friends/request/${userId}`);
      toast('Đã hủy lời mời');
      setFriendReqStatus('none');
      setPendingRequestId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy lời mời');
    }
  };

  const handleAcceptFriendRequestFromChat = async () => {
    try {
      let requestId = pendingRequestId;

      if (!requestId) {
        const { data } = await axios.get(`${API_URL}/friends/requests`);
        const requests = data.data || [];
        const request = requests.find((r) => {
          const fromId = r.from?._id || r.from;
          return String(fromId) === String(otherUser?._id);
        });
        requestId = request?._id || null;
      }

      if (!requestId) {
        return toast.error('Không tìm thấy lời mời để chấp nhận');
      }

      await axios.post(`${API_URL}/friends/accept/${requestId}`);
      toast.success('Đã kết bạn! 🎉');
      setFriendReqStatus('friends');
      setPendingRequestId(null);
      setBlockStatus((prev) => ({ ...prev, isFriend: true }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể chấp nhận');
    }
  };

  const handleRejectFriendRequestFromChat = async () => {
    try {
      let requestId = pendingRequestId;

      if (!requestId) {
        const { data } = await axios.get(`${API_URL}/friends/requests`);
        const requests = data.data || [];
        const request = requests.find((r) => {
          const fromId = r.from?._id || r.from;
          return String(fromId) === String(otherUser?._id);
        });
        requestId = request?._id || null;
      }

      if (!requestId) {
        return toast.error('Không tìm thấy lời mời để từ chối');
      }

      await axios.post(`${API_URL}/friends/reject/${requestId}`);
      toast('Đã từ chối lời mời');
      setFriendReqStatus('none');
      setPendingRequestId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể từ chối');
    }
  };


  useEffect(() => {
    if (!msgSearchQuery.trim()) {
      setMsgSearchResults([]);
      setMsgSearchIdx(0);
      return;
    }

    clearTimeout(msgSearchTimer.current);
    msgSearchTimer.current = setTimeout(() => {
      const kw = msgSearchQuery.toLowerCase();
      const results = messages
        .map((m, i) => ({ msg: m, idx: i }))
        .filter(({ msg }) => {
          if (msg.hidden) return false;
          if (msg.content?.toLowerCase().includes(kw)) return true;
          if (msg.fileName?.toLowerCase().includes(kw)) return true;
          return false;
        });

      setMsgSearchResults(results);
      setMsgSearchIdx(results.length > 0 ? 0 : -1);
      if (results.length > 0) scrollToSearchResult(results[0].msg._id);
    }, 150);
  }, [msgSearchQuery, messages]);

  const scrollToSearchResult = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-yellow-100');
      setTimeout(() => el.classList.remove('bg-yellow-100'), 1200);
    }
  };

  const goToNextSearchResult = () => {
    if (msgSearchResults.length === 0) return;
    const next = (msgSearchIdx + 1) % msgSearchResults.length;
    setMsgSearchIdx(next);
    scrollToSearchResult(msgSearchResults[next].msg._id);
  };

  const goToPrevSearchResult = () => {
    if (msgSearchResults.length === 0) return;
    const prev = (msgSearchIdx - 1 + msgSearchResults.length) % msgSearchResults.length;
    setMsgSearchIdx(prev);
    scrollToSearchResult(msgSearchResults[prev].msg._id);
  };

  const isMyMsg = (msg) => (msg.sender?._id || msg.sender) === user?._id;

  const isMsgRead = (msg) => (msg.readBy || []).some((id) => {
    const rid = id?._id || id;
    return rid && rid.toString() !== user?._id?.toString();
  });

  const lastReadIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (isMyMsg(messages[i]) && isMsgRead(messages[i])) return i;
    }
    return -1;
  })();

  const replyMap = {};
  messages.forEach((m) => { replyMap[m._id] = m; });
  const pinnedIds = new Set(pinnedMessages.map((p) => p._id));

  const processed = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const FIVE = 5 * 60 * 1000;

    const prevSame = prev && (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender);
    const prevClose = prev && (new Date(msg.createdAt) - new Date(prev.createdAt)) < FIVE;
    const nextSame = next && (next.sender?._id || next.sender) === (msg.sender?._id || msg.sender);
    const nextClose = next && (new Date(next.createdAt) - new Date(msg.createdAt)) < FIVE;

    return {
      ...msg,
      showTimestamp: !prev || (new Date(msg.createdAt) - new Date(prev.createdAt)) >= FIVE,
      showAvatar: !prevSame || !prevClose,
      isLastInGroup: !nextSame || !nextClose,
    };
  });

  const isOtherOnline = !isPersonalConversation && otherUser?._id
    ? onlineUsers.has(String(otherUser._id))
    : false;
  // Personal storage items (loaded from localStorage)
  const [personalStorageItems, setPersonalStorageItems] = useState([]);
  const [showStorageViewModal, setShowStorageViewModal] = useState(false);
  const [viewingStorage, setViewingStorage] = useState(null);
  const remaining = MAX_LENGTH - inputMessage.length;

  const [enterToSend, setEnterToSend] = useState(() => {
  try {
    return localStorage.getItem('enterToSend') !== 'false';
  } catch {
    return true;
  }
});

  const buildChatItems = () => {
    const items = [];
    let pinIdx = 0;

    for (let i = 0; i < processed.length; i++) {
      const msg = processed[i];
      while (
        pinIdx < pinNotifications.length &&
        new Date(pinNotifications[pinIdx].time) <= new Date(msg.createdAt)
      ) {
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
    msg.type === 'system' &&
    (
      msg.isSystemCall ||
      msg.metadata?.callStatus ||
      msg._id?.startsWith('call-opt-') ||
      /📞|📹/.test(msg.content || '')
    );

  const isCurrentUserActiveGroupMember = isGroup && activeConversation?.participants?.some(
    (p) => String(p?._id || p) === String(user?._id)
  );
  const isGroupDissolved = isGroup && !!activeConversation?.dissolvedAt;
  const isGroupReadOnly = isGroup && (isGroupDissolved || !isCurrentUserActiveGroupMember);
  const activeTypingUsers = Array.from(typingUsers)
    .map((typingUserId) =>
      activeConversation?.participants?.find(
        (participant) => String(participant?._id || participant) === String(typingUserId)
      ) || null
    )
    .filter(Boolean);
  const primaryTypingUser = activeTypingUsers[0] || null;
  const typingLabel = isGroup
    ? activeTypingUsers.length > 1
      ? `${primaryTypingUser?.username || 'Ai đó'} và ${activeTypingUsers.length - 1} người khác đang nhập...`
      : `${primaryTypingUser?.username || 'Ai đó'} đang nhập...`
    : `${displayUser?.username || 'Ai đó'} đang nhập...`;
  const canOpenInfoPanel = isGroup || (!isPersonalConversation && !!otherUser);
  const directChatTitle = isPersonalConversation
    ? 'Cá nhân'
    : blockStatus.theyBlockedMe
    ? 'Người dùng'
    : (otherUser?.username || '?');

  const renderInputArea = () => (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
      {(blockStatus.theyBlockedMe || blockStatus.iBlockedThem || isGroupReadOnly) ? (
        <div className="flex items-center justify-center py-3 text-gray-400">
          <p className="text-sm">
            {isGroupReadOnly
              ? isGroupDissolved
                ? ' Nhóm đã giải tán'
                : ' Bạn không còn là thành viên nhóm này'
              : blockStatus.theyBlockedMe
              ? ' Bạn không thể nhắn tin với người dùng này'
              : ' Bỏ chặn để tiếp tục nhắn tin'}
          </p>
        </div>
      ) : (
        <div
          ref={emojiPanelRef}
          onClick={() => activeConversation?._id && unlockRestoredConversationRead(activeConversation._id, messages)}
        >
          {emojiSuggestions.length > 0 && (
            <div ref={suggestRef} className="mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                <p className="chat-meta text-gray-400 font-semibold uppercase tracking-wide">Gợi ý emoji · Tab / Enter để chọn · Esc để đóng</p>
                <button type="button" onClick={() => setEmojiSuggestions([])} className="text-gray-300 hover:text-gray-500 transition">
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1 p-2">
                {emojiSuggestions.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyEmojiSuggestion(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl chat-text transition
                      ${i === suggestionIndex ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700'}`}>
                    <span className="text-lg leading-none">{s.emoji}</span>
                    <span className="chat-caption font-medium">:{s.key}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {inputLinkHints.length > 0 && (
            <div className="mb-2 rounded-2xl border border-blue-100 bg-blue-50/90 px-3 py-2 dark:bg-blue-950/40 dark:border-blue-900">
              <p className="chat-meta font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">🔗 Gợi ý link</p>
              <ul className="mt-1.5 space-y-1">
                {inputLinkHints.map(url => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chat-caption text-blue-700 dark:text-blue-300 hover:underline break-all block"
                    >
                      {linkHintLabel(url)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showEmoji && (
            <div className="mb-2 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
              <div className="flex overflow-x-auto border-b border-gray-100 px-1 pt-1 gap-0.5">
                {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEmojiTab(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 text-base rounded-t-lg transition ${
                      emojiTab === cat ? 'bg-blue-50 scale-110' : 'hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="p-2 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI_CATEGORIES[emojiTab].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { insertEmoji(emoji); inputRef.current?.focus(); }}
                      className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="relative flex-shrink-0" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                className={`p-2 rounded-xl transition ${
                  showAttachMenu
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                }`}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 overflow-hidden w-40">
                  <button type="button" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 chat-text text-gray-700 hover:bg-gray-50 transition">
                    <Image className="w-4 h-4 text-green-500" /> Ảnh
                  </button>
                  <button type="button" onClick={() => { attachInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 chat-text text-gray-700 hover:bg-gray-50 transition">
                    <File className="w-4 h-4 text-blue-500" /> File
                  </button>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            <input ref={attachInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={handleTypingInput}
                onKeyDown={handleKeyDown}
                maxLength={MAX_LENGTH}
                rows={1}
                placeholder={
                  replyingTo
                    ? `Trả lời ${replyingTo.sender?.username}...`
                    : imagePreviews.length
                    ? 'Thêm chú thích...'
                    : filePreviews.length
                    ? 'Gửi file...'
                    : isPersonalConversation
                    ? 'Ghi chú...'
                    : 'Nhập tin nhắn...'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 border border-transparent focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none chat-input transition resize-none"
                style={{ 
                  paddingRight: remaining <= 100 ? '3rem' : undefined,
                  minHeight: '44px',
                  maxHeight: '120px'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              {remaining <= 100 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 chat-meta font-medium ${remaining <= 20 ? 'text-red-500' : 'text-gray-400'}`}>
                  {remaining}
                </span>
              )}
              {markdownPreviewEnabled && inputMessage.trim() !== '' && (
                <div className="absolute left-0 -bottom-20 w-full bg-white border border-gray-100 rounded-xl p-3 shadow-sm prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {inputMessage}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <button
              type="button"
              ref={emojiButtonRef}
              onClick={() => setShowEmoji((v) => !v)}
              className={`p-2 rounded-xl transition flex-shrink-0 ${
                showEmoji
                  ? 'text-yellow-500 bg-yellow-50'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => { if (editingMsg) submitEdit(); else handleSendMessage(); }}
              disabled={(!inputMessage.trim() && !imagePreviews.length && !filePreviews.length) || uploading}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {(showSidebar) && (
        <div className={`${isMobile ? 'fixed inset-0 z-40 w-full h-full' : 'relative'} flex-shrink-0`}>
          <Sidebar
            onSelectConversation={(conv) => {
              if (isMobile) setShowSidebar(false);
              if (conv._id === activeConversation?._id) return;
              restoredConversationReadRef.current = { conversationId: '', restoredAt: 0 };
              lastMarkedReadRef.current = '';
              setActiveConversation(conv);
              setMessages([]);
              setShowMenu(false);
              setShowInfoPanel(false);
              setShowMsgSearch(false);
              setMsgSearchQuery('');
              setMsgSearchResults([]);
              setFriendReqStatus('none');
              setPendingRequestId(null);
              setReplyingTo(null);
              setEditingMsg(null);
              setPinnedMessages(conv.pinnedMessages || []);
              setPinNotifications([]);
              setImagePreviews([]);
              setFilePreviews([]);
              localStorage.setItem('activeConversationId', conv._id);
            }}
            activeConversationId={activeConversation?._id}
            socket={socket}
            activeCall={activeCall}
            currentUser={user}
          />
        </div>
      )}

        <div className={`flex-1 flex min-w-0 overflow-hidden ${isMobile ? 'p-0' : 'pr-3 py-3 gap-3'} ${isMobile && showSidebar ? 'hidden' : ''}`}>        <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800 ${isMobile ? '' : 'rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50'} overflow-hidden`}>
          {activeConversation ? (
            <>
              <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Nút back — chỉ hiện trên mobile */}
                  {isMobile && (
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="p-2 -ml-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {isGroup ? (
                    <GroupAvatar
                      participants={activeConversation.participants || []}
                      currentUserId={user?._id}
                      groupAvatar={activeConversation.avatar}
                    />
                  ) : (
                    <div className="relative">
                      <Avatar
                        username={directChatTitle}
                        size={10}
                        avatarUrl={blockStatus.theyBlockedMe ? null : displayUser?.avatar}
                      />
                      {!isPersonalConversation && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOtherOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                      )}
                    </div>
                  )}

                  <div>
                      <p className="chat-username text-gray-800">
                      {isGroup ? (activeConversation.name || 'Nhóm') : directChatTitle}
                    </p>

                    {isGroup ? (
                      <p className={`chat-caption ${
                        isGroupDissolved
                          ? 'text-red-400'
                          : isGroupReadOnly
                          ? 'text-amber-500'
                          : 'text-gray-400'
                      }`}>
                        {isGroupDissolved
                          ? ' Nhóm đã giải tán'
                          : isGroupReadOnly
                          ? 'Đã rời nhóm'
                          : `👥 ${activeConversation.participants?.length || 0} thành viên`}
                      </p>
                    ) : isPersonalConversation ? (
                      <p className="chat-caption text-blue-600">Lưu trữ riêng tư của bạn</p>
                    ) : blockStatus.theyBlockedMe ? (
                      <p className="chat-caption text-gray-400">Tài khoản bị hạn chế</p>
                    ) : blockStatus.iBlockedThem ? (
                      <p className="chat-caption text-red-400">🚫 Đã bị chặn</p>
                    ) : !blockStatus.isFriend ? (
                      <p className="chat-caption text-amber-500 font-medium">👤 Người lạ</p>
                    ) : (
                      <p className={`chat-preview ${isOtherOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {isOtherOnline ? '● Online' : '● Offline'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!isGroup && !isPersonalConversation && !blockStatus.theyBlockedMe && !blockStatus.iBlockedThem && !isGroupReadOnly && !isGroupDissolved && (
                    <>
                      <button
                        onClick={() => startCallRef.current?.('audio')}
                        disabled={!otherUser?._id}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40"
                      >
                        <Phone className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => startCallRef.current?.('video')}
                        disabled={!otherUser?._id}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40"
                      >
                        <Video className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setShowMsgSearch((v) => !v);
                      setMsgSearchQuery('');
                      setMsgSearchResults([]);
                    }}
                    className={`p-2 rounded-xl transition ${
                      showMsgSearch ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {canOpenInfoPanel && (
                    <button
                      ref={infoPanelToggleRef}
                      type="button"
                      onClick={() => setShowInfoPanel((v) => !v)}
                      className={`p-2 rounded-xl transition ${
                        showInfoPanel ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </header>

              {showMsgSearch && (
                <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    autoFocus
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm tin nhắn, tên file..."
                    className="flex-1 chat-input bg-gray-100 rounded-xl px-3 py-1.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />

                  {msgSearchResults.length > 0 && (
                    <div className="flex items-center gap-1.5 chat-caption text-gray-500 flex-shrink-0">
                      <span className="font-semibold text-blue-600">{msgSearchIdx + 1}</span>
                      <span>/</span>
                      <span>{msgSearchResults.length}</span>
                      <button onClick={goToPrevSearchResult} className="p-1 hover:bg-gray-100 rounded-lg transition">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={goToNextSearchResult} className="p-1 hover:bg-gray-100 rounded-lg transition">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {msgSearchQuery && msgSearchResults.length === 0 && (
                    <span className="chat-caption text-gray-400 flex-shrink-0">Không tìm thấy</span>
                  )}

                  <button
                    onClick={() => {
                      setShowMsgSearch(false);
                      setMsgSearchQuery('');
                      setMsgSearchResults([]);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <PinnedBanner
                pinnedMessages={pinnedMessages}
                onScrollToPin={handleScrollToPin}
                onUnpin={handleUnpin}
              />

              {isGroupReadOnly && (
                <div className={`border-b px-4 py-2.5 flex-shrink-0 ${
                  isGroupDissolved ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                }`}>
                  <p className={`text-sm font-medium ${
                    isGroupDissolved ? 'text-red-600' : 'text-amber-700'
                  }`}>
                    {isGroupDissolved
                      ? ' Nhóm đã giải tán.'
                      : ' Bạn không còn là thành viên của nhóm này.'}
                  </p>
                </div>
              )}

              {!isPersonalConversation && !isGroup && !blockStatus.isFriend && !blockStatus.theyBlockedMe && !blockStatus.iBlockedThem && otherUser?._id && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">👤</span>
                    <p className="chat-text text-amber-700 font-medium">
                      {friendReqStatus === 'received'
                        ? 'Người này đã gửi lời mời kết bạn cho bạn'
                        : 'Đây là người lạ. Hãy cẩn thận khi trò chuyện.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {friendReqStatus === 'none' && (
                      <button
                        onClick={() => handleSendFriendRequestFromChat(otherUser._id)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Kết bạn
                      </button>
                    )}

                    {friendReqStatus === 'sent' && (
                      <>
                        <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Đã gửi lời mời
                        </span>
                        <button
                          onClick={() => handleCancelFriendRequestFromChat(otherUser._id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Hủy lời mời"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {friendReqStatus === 'received' && (
                      <>
                        <button
                          onClick={handleAcceptFriendRequestFromChat}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Đồng ý
                        </button>
                        <button
                          onClick={handleRejectFriendRequestFromChat}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </>
                    )}

                  </div>
                </div>
              )}

              {blockStatus.iBlockedThem && !isPersonalConversation && !isGroup && (
                <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                  <p className="chat-text text-red-600 font-medium">🚫 Bạn đã chặn người dùng này</p>
                  <button onClick={async () => {
                    try {
                      await axios.delete(`${API_URL}/friends/block/${otherUser?._id}`);
                      setBlockStatus(prev => ({ ...prev, iBlockedThem: false }));
                      toast.success('Đã bỏ chặn');
                    } catch {
                      toast.error('Không thể bỏ chặn');
                    }
                  }} className="text-xs font-semibold text-red-600 hover:text-red-700 underline transition flex-shrink-0">
                    Bỏ chặn
                  </button>
                </div>
              )}

                <div
                  className="flex-1 overflow-y-auto px-4 py-4 chat-container"
                  onClick={(e) => {
                    activeConversation?._id && unlockRestoredConversationRead(activeConversation._id, messages);
                    if (!e.target.closest('button') && !e.target.closest('[role="button"]') && !e.target.closest('.more-menu')) {
                      inputRef.current?.focus();
                    }
                  }}
                >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : processed.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <AppLogo size={48} />
                      </div>
                      <p className="chat-text font-medium">Bắt đầu cuộc trò chuyện!</p>
                      <p className="chat-preview mt-1">
                        {isGroup
                          ? `Gửi tin nhắn đầu tiên trong nhóm ${activeConversation.name}`
                          : isPersonalConversation
                          ? 'Gửi tin nhắn đầu tiên'
                          : `Gửi tin nhắn đầu tiên cho ${blockStatus.theyBlockedMe ? 'người dùng' : otherUser?.username}`}
                      </p>
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
                            onCallback={(callType) => { if (!isGroup) startCallRef.current?.(callType); }}
                          />
                        );
                      }

                      if (msg.type === 'system' && !isCallMsg(msg)) {
                        return (
                          <div key={msg._id}>
                            {msg.showTimestamp && (
                              <div className="flex items-center justify-center my-4">
                                <span className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  {formatGroupTime(msg.createdAt)}
                                </span>
                              </div>
                            )}
                            <div className={msg.showAvatar ? 'mt-2' : 'mt-0.5'}>
                              <SystemChatNotification msg={msg} />
                            </div>
                          </div>
                        );
                      }

                      const mine = isMyMsg(msg);
                      const msgIdx = processed.findIndex((m) => m._id === msg._id);
                      const msgRead = mine && msgIdx === lastReadIdx;

                      return (
                        <div key={msg._id}>
                          {msg.showTimestamp && (
                            <div className="flex items-center justify-center my-4">
                              <span className="flex items-center gap-1.5 chat-caption text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                <Clock className="w-3 h-3" />{formatGroupTime(msg.createdAt)}
                              </span>
                            </div>
                          )}

                          <div className={msg.showAvatar ? 'mt-2' : 'mt-0.5'}>
                            <MessageBubble
                              msg={msg}
                              mine={mine}
                              showAvatar={msg.showAvatar}
                              isLastInGroup={msg.isLastInGroup}
                              isRead={msgRead}
                              isPinned={pinnedIds.has(msg._id)}
                              isGroup={isGroup}
                              onReact={handleReact}
                              onScrollToMessage={handleScrollToPin}
                              user={user}
                              participants={activeConversation?.participants || []}
                              onReply={handleReply}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onForward={handleForward}
                              onHide={handleHide}
                              onPin={handlePin}
                              replyMap={replyMap}
                              onShare={handleShare}
                              disableActions={isGroupReadOnly}
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
                      {isGroup ? (
                        <Avatar
                          username={primaryTypingUser?.username || '?'}
                          size={8}
                          avatarUrl={primaryTypingUser?.avatar}
                        />
                      ) : (
                        <Avatar
                          username={displayUser?.username || '?'}
                          size={8}
                          avatarUrl={blockStatus.theyBlockedMe ? null : displayUser?.avatar}
                        />
                      )}
                    </div>

                    <div>
                      <p className="mb-1 ml-1 text-xs font-medium text-gray-500">
                        {typingLabel}
                      </p>
                      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1 items-center">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeCall?.isActive && activeConversation && (
                  <ActiveCallBanner
                    callType={activeCall.callType}
                    startedAt={activeCall.startedAt}
                    onRejoin={() => rejoinCallRef.current?.()}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>

              {editingMsg && (
                <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
                  <Edit3 className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="chat-caption text-yellow-700 font-semibold mb-1">Chỉnh sửa tin nhắn</p>
                    <p className="text-sm text-yellow-800 truncate">{plainTextPreview(editingMsg.content)}</p>
                    <p className="chat-caption text-yellow-600 text-xs mt-1">Chỉnh sửa tin nhắn</p>
                  </div>
                  <button onClick={() => { setEditingMsg(null); setInputMessage(''); }} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {replyingTo && !editingMsg && (
                <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
                  <Reply className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="chat-caption text-blue-700 font-semibold">{replyingTo.sender?.username}</p>
                    <p className="chat-preview text-blue-600 truncate">{replyingTo.content || '📎 File'}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2 flex-shrink-0">
                  <div className="flex flex-wrap gap-2 mb-2 max-h-44 overflow-y-auto">
                    {imagePreviews.map((img, i) => (
                      <div key={i} className="relative group w-20 h-20 flex-shrink-0">
                        <img src={img.url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {imagePreviews.length < MAX_IMAGES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition text-gray-400 hover:text-blue-500"
                      >
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

              {filePreviews.length > 0 && (
                <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2 flex-shrink-0">
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {filePreviews.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="chat-caption font-semibold truncate">{f.file.name}</p>
                          <p className="chat-meta text-gray-400">{formatFileSize(f.file.size)}</p>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {filePreviews.length < MAX_FILES && (
                    <button onClick={() => attachInputRef.current?.click()} className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition">
                      <Plus className="w-3.5 h-3.5" />
                      Thêm file ({filePreviews.length}/{MAX_FILES})
                    </button>
                  )}

                  {uploading && uploadProgress > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">Đang gửi {uploadProgress}%</p>
                  )}
                </div>
              )}

              {renderInputArea()}
            </>
          ) : (
            (!isMobile || !showSidebar) && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 select-none">
              <div className="mb-4 flex justify-center">
                <AppLogo size={64} />
              </div>
              <p className="text-xl font-semibold text-gray-600">Chào mừng, {user?.username}!</p>
              <p className="chat-text mt-2 text-center max-w-xs">Chọn một cuộc trò chuyện bên trái hoặc thêm bạn bè mới để bắt đầu nhắn tin</p>
              <div className="mt-4 flex items-center gap-2 chat-caption">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className={isConnected ? 'text-green-600' : 'text-red-500'}>
                  {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                </span>
              </div>
              </div>
            )
          )}
        </div>

        {showStorageViewModal && viewingStorage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowStorageViewModal(false); setViewingStorage(null); }} />
            <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-lg p-4 z-10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{viewingStorage.title}</h3>
                  <p className="text-sm text-gray-500">{new Date(viewingStorage.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => { setShowStorageViewModal(false); setViewingStorage(null); }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3">
                {viewingStorage.image && <img src={viewingStorage.image} alt={viewingStorage.title} className="w-full rounded-md mb-3 object-contain" />}
                {viewingStorage.text && <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingStorage.text}</p>}
              </div>
            </div>
          </div>
        )}

        {showInfoPanel && activeConversation && canOpenInfoPanel && (
          <div
            ref={infoPanelShellRef}
            className=" w-80 flex-shrink-0 transition-all duration-300 animate-in slide-in-from-right"
          >
            <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {isGroup ? (
                <GroupInfoPanel
                  conversation={activeConversation}
                  currentUser={user}
                  onClose={() => setShowInfoPanel(false)}
                  socket={socket}
                  muteMap={muteMap}
                  onMuteChange={handleMuteChange}
                  onGroupLeft={(updatedConversation) => {
                    if (updatedConversation) {
                      setActiveConversation((prev) => prev ? { ...prev, ...updatedConversation } : updatedConversation);
                    }
                    setShowInfoPanel(false);
                  }}
                  onGroupDissolved={(updatedConversation) => {
                    if (updatedConversation) {
                      setActiveConversation((prev) => prev ? { ...prev, ...updatedConversation } : updatedConversation);
                    }
                    setShowInfoPanel(false);
                  }}
                  onConversationUpdated={(updatedConv) =>
                    setActiveConversation((prev) => prev ? { ...prev, ...updatedConv } : updatedConv)
                  }
                />
              ) : otherUser ? (
                <ChatInfoPanel
                  socket={socket}
                  otherUser={otherUser}
                  currentUser={user}
                  conversation={activeConversation}
                  onClose={() => setShowInfoPanel(false)}
                  onStartCall={(type) => startCallRef.current?.(type)}
                  onSearchMessages={() => {
                    setShowInfoPanel(false);
                    setShowMsgSearch(true);
                  }}
                  muteMap={muteMap}
                  onMuteChange={handleMuteChange}
                  onClearChat={async () => {
                    const ok = await confirmAsync({ title: 'Xóa lịch sử', message: 'Xóa toàn bộ lịch sử chat? Hành động không thể hoàn tác.' });
                    if (!ok) return;
                    // ensure pinned messages are also unpinned on the server
                    try {
                      if (Array.isArray(pinnedMessages) && socket) {
                        for (const pm of pinnedMessages) {
                          if (!pm || !pm._id) continue;
                          try { socket.emit('pin_message', { messageId: pm._id, conversationId: activeConversation._id, isPinning: false }); } catch (e) {}
                        }
                      }
                    } catch (e) {}
                    
                    try {
                      // Gửi lệnh xóa lên server để không bị hiện lại khi reload
                      await axios.delete(`${API_URL}/messages/conversation/${activeConversation._id}`);
                    } catch (error) {
                      console.error("Lỗi xóa tin nhắn:", error);
                    }

                    setMessages([]);
                    setPinnedMessages([]);
                    setPinNotifications([]);
                    toast.success('Đã xóa lịch sử chat');
                  }}
                  onFriendRemoved={() => {
                    setBlockStatus((prev) => ({ ...prev, isFriend: false }));
                    setFriendReqStatus('none');
                  }}
                  onUserBlocked={() => setBlockStatus((prev) => ({ ...prev, iBlockedThem: true, isFriend: false }))}
                  onUserUnblocked={() => setBlockStatus((prev) => ({ ...prev, iBlockedThem: false }))}
                  onSendFriendRequest={handleSendFriendRequestFromChat}
                />

              ) : null}
            </div>
          </div>
        )}
      </div>

      <CallManager
        socket={socket}
        currentUser={user}
        otherUser={otherUser}
        conversationIsGroup={isGroup}
        groupParticipants={isGroup ? (activeConversation?.participants || []) : []}
        conversationId={activeConversation?._id}
        onStartCall={handleStartCallReady}
        onCallEnd={handleCallEnd}
        onCallStateChange={handleCallStateChange}
        onRejoinReady={(fn) => { rejoinCallRef.current = fn; }}
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
