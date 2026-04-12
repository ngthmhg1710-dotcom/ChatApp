// client/src/components/Sidebar.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, UserPlus, Users, Check, X, MessageCircle,
  Camera, LogOut, ChevronRight, Shield, Palette,
  MessageSquare, Eye, EyeOff, Save, ArrowLeft,
  Phone as PhoneIcon, Hash, Star, BellOff,
  Sun, Moon, Lock, Wrench, Clock,
  Settings, Bell, User as UserIcon, UsersRound,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import GroupChatPanel from '../components/GroupChatPanel';
import logo from '../assets/logo.png';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
//hello
function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function removeAccents(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function AppLogo({ size = 32, className = '' }) {
  return (
    <img
      src={logo}
      alt="Chat App"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Avatar({ username = '', size = 'md', online, avatarUrl }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  const sz = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-xs', lg: 'w-11 h-11 text-sm' }[size];
  const dot = size === 'sm' || size === 'xs' ? 'w-2 h-2 border' : 'w-2.5 h-2.5 border-2';

  return (
    <div className="relative flex-shrink-0">
      {avatarUrl ? (
        <img
          src={getFileUrl(avatarUrl)}
          alt={username}
          className={`${sz} rounded-full object-cover`}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none`}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dot} rounded-full border-white ${
            online ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
}

function GroupAvatar({ participants = [], groupAvatar }) {
  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'];

  if (groupAvatar) {
    return (
      <img
        src={getFileUrl(groupAvatar)}
        alt="Group"
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  const shownMembers = participants.slice(0, 3);

  if (shownMembers.length === 0) {
    return (
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (shownMembers.length === 1) {
    const member = shownMembers[0];
    const color = COLORS[(member?.username?.charCodeAt(0) || 0) % COLORS.length];
    return member?.avatar ? (
      <img
        src={getFileUrl(member.avatar)}
        alt={member.username}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    ) : (
      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
        {(member?.username || '?').slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {shownMembers.slice(0, 2).map((member, index) => {
        const color = COLORS[(member?.username?.charCodeAt(0) || 0) % COLORS.length];
        const cls = index === 0
          ? 'absolute top-0 left-0 w-6 h-6 border-2 border-white rounded-full'
          : 'absolute bottom-0 right-0 w-6 h-6 border-2 border-white rounded-full';

        return member?.avatar ? (
          <img
            key={index}
            src={getFileUrl(member.avatar)}
            alt={member.username}
            className={`${cls} object-cover`}
          />
        ) : (
          <div key={index} className={`${cls} ${color} flex items-center justify-center text-[9px] font-bold text-white`}>
            {(member?.username || '?').slice(0, 2).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function Tab({ label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200
        ${active 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
    >
      {label}
      {badge > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
            ${active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function SettingsPage({ user, onClose, onUpdateUser, initialSection }) {
  const [section, setSection] = useState(initialSection || 'general');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('chatFontSize') || 'medium');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    push: true,
    sound: true,
    confirmDelete: true,
    syncMessages: true,
  });
  const [msgSettings, setMsgSettings] = useState({
    stickerSuggest: localStorage.getItem('stickerSuggest') !== 'false',
    linkSuggest: localStorage.getItem('linkSuggest') !== 'false',
    confirmDeleteChat: true,
  });
  const [callRingSound, setCallRingSound] = useState(() => localStorage.getItem('callRingSound') !== 'false');
  const [callTestMode, setCallTestMode] = useState(null); // 'mic' | 'cam' | null
  const [callTestError, setCallTestError] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  const micStreamRef = useRef(null);
  const camStreamRef = useRef(null);
  const micAudioCtxRef = useRef(null);
  const micRafRef = useRef(null);
  const camVideoRef = useRef(null);

  const fileRef = useRef(null);

  const applyTheme = (t) => {
    setTheme(t);
    localStorage.setItem('theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    toast.success(t === 'dark' ? '🌙 Chế độ tối đã bật' : '☀️ Chế độ sáng đã bật');
  };

  const applyFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('chatFontSize', size);
    const sizeMap = { small: '13px', medium: '15px', large: '17px' };
    document.documentElement.style.setProperty('--chat-font-size', sizeMap[size]);
    toast.success(size === 'small' ? '🔡 Chữ nhỏ' : size === 'large' ? '🔠 Chữ lớn' : '🔤 Chữ vừa');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(`${API_URL}/auth/profile`, { username, bio });
      onUpdateUser(data.data);
      toast.success('Đã cập nhật hồ sơ!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // IMPORTANT: Không trim mật khẩu để không làm mất khoảng trắng ở đầu/cuối.
    // Backend so sánh mật khẩu theo đúng giá trị đã hash, nên phải giữ nguyên ký tự người dùng nhập.
    const oldPassword = oldPw;
    const newPassword = newPw;
    const confirmPassword = confirmPw;

    if (!oldPassword || !newPassword || !confirmPassword) return toast.error('Vui lòng nhập đủ 3 trường mật khẩu');
    if (newPassword.length < 6) return toast.error('Mật khẩu ít nhất 6 ký tự');
    if (newPassword === oldPassword) return toast.error('Mật khẩu mới phải khác mật khẩu cũ');
    if (newPassword !== confirmPassword) return toast.error('Mật khẩu mới không khớp');

    setSaving(true);
    try {
      await axios.put(`${API_URL}/auth/change-password`, { oldPassword, newPassword });
      toast.success('Đã đổi mật khẩu!');
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sai mật khẩu cũ');
    } finally {
      setSaving(false);
    }
  };

  const stopCallTest = () => {
    setCallTestError('');
    setMicLevel(0);

    if (micRafRef.current) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micAudioCtxRef.current) {
      try { micAudioCtxRef.current.close(); } catch { /* ignore */ }
      micAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    if (camVideoRef.current) {
      try { camVideoRef.current.srcObject = null; } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    // Cleanup khi chuyển mode hoặc đóng modal test
    if (!callTestMode) return;

    const startMic = async () => {
      stopCallTest();
      setCallTestError('');
      setMicLevel(0);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        micAudioCtxRef.current = ctx;
        await ctx.resume().catch(() => {});

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!micAudioCtxRef.current) return;
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / data.length);
          // rms ~ 0..1; scale nhẹ để hiển thị rõ
          setMicLevel(Math.max(0, Math.min(1, rms * 2.2)));
          micRafRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        setCallTestError(err?.message || 'Không thể truy cập micro');
        stopCallTest();
      }
    };

    const startCam = async () => {
      stopCallTest();
      setCallTestError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        camStreamRef.current = stream;
        if (camVideoRef.current) camVideoRef.current.srcObject = stream;
      } catch (err) {
        setCallTestError(err?.message || 'Không thể truy cập camera');
        stopCallTest();
      }
    };

    if (callTestMode === 'mic') startMic();
    else if (callTestMode === 'cam') startCam();

    return () => stopCallTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callTestMode]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Chỉ chấp nhận ảnh');
    if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh tối đa 5MB');

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: up } = await axios.post(`${API_URL}/messages/upload`, formData);
      const avatarUrl = up.data.fileUrl;
      const { data } = await axios.put(`${API_URL}/auth/profile`, { avatar: avatarUrl });
      onUpdateUser(data.data);
      toast.success('Đã cập nhật ảnh đại diện!');
    } catch {
      toast.error('Không thể tải ảnh lên');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const sections = [
    { id: 'general', icon: Settings, label: 'Cài đặt chung' },
    { id: 'profile', icon: UserIcon, label: 'Tài khoản & hồ sơ' },
    { id: 'security', icon: Shield, label: 'Bảo mật' },
    { id: 'appearance', icon: Palette, label: 'Giao diện' },
    { id: 'messages', icon: MessageSquare, label: 'Tin nhắn' },
    { id: 'calls', icon: PhoneIcon, label: 'Cuộc gọi' },
    { id: 'shortcuts', icon: Hash, label: 'Phím tắt' },
  ];

  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'];
  const avatarColor = COLORS[((user?.username || '').charCodeAt(0) || 0) % COLORS.length];

  const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div
        className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600
        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
        after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
        peer-checked:after:translate-x-4"
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-gray-800 text-sm">Cài đặt</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left
                    ${section === s.id ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {section === 'general' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Cài đặt chung</h3>
              <div className="space-y-3">
                {[
                  { key: 'syncMessages', label: 'Đồng bộ tin nhắn', desc: 'Tự động tải tin nhắn khi mở app' },
                  { key: 'push', label: 'Thông báo đẩy', desc: 'Nhận thông báo khi có tin nhắn mới' },
                  { key: 'sound', label: 'Âm thanh thông báo', desc: 'Phát âm thanh khi nhận tin' },
                  { key: 'confirmDelete', label: 'Xác nhận trước khi xóa', desc: 'Hỏi xác nhận khi xóa tin nhắn' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifSettings[item.key]}
                      onChange={() =>
                        setNotifSettings((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'profile' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Tài khoản & hồ sơ</h3>
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="relative">
                  {user?.avatar && !user.avatar.includes('ui-avatars.com') ? (
                    <img
                      src={getFileUrl(user.avatar)}
                      alt={user.username}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 ${avatarColor} rounded-full flex items-center justify-center font-bold text-white text-xl ring-2 ring-blue-200`}
                    >
                      {(user?.username || '').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition shadow"
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user?.username}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên hiển thị</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Giới thiệu</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Bảo mật</h3>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPw}
                      onChange={(e) => setOldPw(e.target.value)}
                      placeholder="Mật khẩu hiện tại"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Mật khẩu mới"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Xác nhận mật khẩu mới"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none transition pr-10" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={handleChangePassword} disabled={saving || !oldPw || !newPw || !confirmPw}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {section === 'appearance' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Giao diện</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 'light', label: 'Sáng' },
                  { id: 'dark', label: 'Tối' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => applyTheme(opt.id)}
                    className={`p-4 rounded-xl border-2 transition ${
                      theme === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'small', label: 'Nhỏ' },
                  { id: 'medium', label: 'Vừa' },
                  { id: 'large', label: 'Lớn' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => applyFontSize(opt.id)}
                    className={`p-3 rounded-xl border-2 transition ${
                      fontSize === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Áp dụng ngay cho sidebar và khung chat, không cần reload.</p>
            </div>
          )}

          {section === 'messages' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Tin nhắn</h3>
              <div className="space-y-3">
                {[
                  { key: 'stickerSuggest',   label: 'Gợi ý Sticker',          desc: 'Hiện gợi ý sticker khi soạn' },
                  { key: 'linkSuggest',      label: 'Gợi ý Link',              desc: 'Hiện gợi ý khi copy link vào ô soạn' },
                  { key: 'confirmDeleteChat',label: 'Xác nhận trước khi xóa', desc: 'Hỏi xác nhận khi xóa lịch sử chat' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={msgSettings[item.key]}
                        onChange={() => {
                          const newVal = !msgSettings[item.key];
                          setMsgSettings((p) => ({ ...p, [item.key]: newVal }));
                          if (item.key === 'stickerSuggest') {
                            localStorage.setItem('stickerSuggest', String(newVal));
                          }
                          if (item.key === 'linkSuggest') {
                            localStorage.setItem('linkSuggest', String(newVal));
                            toast.success(newVal ? '🔗 Đã bật gợi ý link' : '🔕 Đã tắt gợi ý link');
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div
                        className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                        after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                        peer-checked:after:translate-x-4"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'calls' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Cài đặt cuộc gọi</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Âm thanh chuông</p>
                    <p className="text-xs text-gray-400 mt-0.5">Phát tiếng chuông khi có cuộc gọi đến hoặc đang gọi</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={callRingSound}
                      onChange={() => {
                        const v = !callRingSound;
                        setCallRingSound(v);
                        localStorage.setItem('callRingSound', String(v));
                        toast.success(v ? '🔔 Đã bật chuông cuộc gọi' : '🔕 Đã tắt chuông cuộc gọi');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                      peer-checked:after:translate-x-4" />
                  </label>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCallTestMode('mic')}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition"
                >
                  <PhoneIcon className="w-4 h-4" /> Kiểm tra micro
                </button>
                <button
                  onClick={() => setCallTestMode('cam')}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition"
                >
                  <Camera className="w-4 h-4" /> Kiểm tra camera
                </button>
              </div>

              {/* Modal test thiết bị */}
              {callTestMode && (
                <div
                  className="fixed inset-0 z-[500] bg-black/60 flex items-center justify-center p-4"
                  onMouseDown={() => setCallTestMode(null)}
                >
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">
                          {callTestMode === 'mic' ? 'Kiểm tra micro' : 'Kiểm tra camera'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {callTestMode === 'mic'
                            ? 'Nói vào micro để xem mức âm thanh'
                            : 'Cho phép trình duyệt truy cập camera để xem preview'}
                        </p>
                      </div>
                      <button
                        onClick={() => setCallTestMode(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      {callTestError && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                          {callTestError}
                        </div>
                      )}

                      {callTestMode === 'mic' ? (
                        <>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                              <PhoneIcon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">Mức âm thanh</p>
                              <p className="text-xs text-gray-500 mt-0.5">Điều chỉnh môi hoặc nói gần hơn</p>
                            </div>
                          </div>
                          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                            <div
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: `${Math.round(micLevel * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {Math.round(micLevel * 100)}%
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-full aspect-video bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                            <video
                              ref={camVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                      <button
                        onClick={() => setCallTestMode(null)}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-semibold"
                      >
                        Dừng
                      </button>
                      <button
                        onClick={() => {
                          // Restart test
                          const mode = callTestMode;
                          setCallTestMode(null);
                          setTimeout(() => setCallTestMode(mode), 50);
                        }}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold"
                      >
                        Thử lại
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'shortcuts' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Phím tắt</h3>
              <div className="space-y-2">
                {[
                  { action: 'Gửi tin nhắn', keys: ['Enter'] },
                  { action: 'Xuống dòng', keys: ['Shift', 'Enter'] },
                  { action: 'Đóng popup / Hủy', keys: ['Esc'] },
                ].map(({ action, keys }, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700">{action}</span>
                    <div className="flex gap-1">
                      {keys.map((k, j) => (
                        <kbd key={j} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-xs font-mono text-gray-600 shadow-sm">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarMenu({ user, onClose, onLogout, onOpenSettings }) {
  const ref = useRef(null);
  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'];
  const color = COLORS[((user?.username || '').charCodeAt(0) || 0) % COLORS.length];

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-14 mb-2 w-56 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
        {user?.avatar && !user.avatar.includes('ui-avatars.com') ? (
          <img
            src={getFileUrl(user.avatar)}
            alt={user.username}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0`}>
            {(user?.username || '').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
          <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={() => {
          onOpenSettings('profile');
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition"
      >
        <UserIcon className="w-4 h-4" />
        Thông tin cá nhân
      </button>
      <button
        onClick={() => {
          onOpenSettings('security');
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition"
      >
        <Shield className="w-4 h-4" />
        Đổi mật khẩu
      </button>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/30 transition"
      >
        <LogOut className="w-4 h-4" />
        Đăng xuất
      </button>
    </div>
  );
}

// ─── Icon Bar ─────────────────────────────────────────────────────────────────

function IconBar({
  activePanel,
  onPanelChange,
  user,
  logout,
  notifBadge,
  onOpenSettings,
  globalUnreadCounts,
  friendReqCount = 0,
  chatUnreadTotal = 0,
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const avatarHoverTimerRef = useRef(null);
  const avatarRef = useRef(null);
  const menuRef = useRef(null);
  const avatarZoneRef = useRef(null);

  const showAvatarMenu = isHovering || isClicking;

  const clearAvatarHoverTimer = () => {
    if (avatarHoverTimerRef.current) {
      clearTimeout(avatarHoverTimerRef.current);
      avatarHoverTimerRef.current = null;
    }
  };

  const scheduleHoverEnd = () => {
    clearAvatarHoverTimer();
    avatarHoverTimerRef.current = setTimeout(() => {
      if (!isClicking) setIsHovering(false);
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (avatarHoverTimerRef.current) {
        clearTimeout(avatarHoverTimerRef.current);
        avatarHoverTimerRef.current = null;
      }
    };
  }, []);
  // Xử lý click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target) &&
          menuRef.current && !menuRef.current.contains(event.target)) {
        setIsClicking(false);
        setIsHovering(false);
      }
    };

    if (isClicking) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isClicking]);

  // Các hàm xử lý
  const handleClick = () => {
    setIsClicking(!isClicking);
  };

  const handleMouseEnter = () => {
    clearAvatarHoverTimer();
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    scheduleHoverEnd();
  };

  const handleCloseMenu = () => {
    setIsClicking(false);
    setIsHovering(false);
  };

  const topMenu = [
    { icon: MessageCircle, label: 'Tin nhắn', panel: 'recent' },
    { icon: Users, label: 'Bạn bè', panel: 'friends' },
    { icon: UsersRound, label: 'Nhóm', panel: 'groupchat' },
    { icon: Star, label: 'Quan trọng', panel: 'starred' },
  ];

  const bellLines = [
    friendReqCount > 0 ? `${friendReqCount} lời mời kết bạn` : null,
    chatUnreadTotal > 0 ? `${chatUnreadTotal} tin nhắn mới` : null,
  ].filter(Boolean);

  return (
    <div className="h-screen w-16 bg-gradient-to-b from-[#1e1b4b] via-[#1e1b4b] to-[#1e3a8a] flex flex-col items-center py-3 justify-between flex-shrink-0 border-r border-gray-800">
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="px-2 w-full flex justify-center mb-1">
            <AppLogo size={36} />
        </div>

        {topMenu.map((item) => {
          const Icon = item.icon;
          const isActive = item.panel && activePanel === item.panel;
          const showUnread = item.panel === 'recent' && Object.values(globalUnreadCounts).reduce((a, b) => a + b, 0) > 0;

          return (
            <div key={item.label} className="group relative flex justify-center w-full px-2">
              <button onClick={() => item.panel && onPanelChange(item.panel)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 ease-out
                  ${isActive 
                  ? 'bg-gradient-to-br from-violet-400/50 via-violet-500/40 to-indigo-400/50 text-white border border-white/40 shadow-[0_10px_40px_rgba(168,85,247,0.5)] scale-120'
                  : 'text-gray-400 border-transparent hover:bg-violet-500/20 hover:border-violet-300/40 hover:shadow-[0_10px_40px_rgba(168,85,247,0.5)] hover:text-white hover:scale-110 transition-transform duration-200'}`}>
                <Icon className="w-5 h-5" />
                {showUnread && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 border-2 border-gray-900">
                    {Object.values(globalUnreadCounts).reduce((a, b) => a + b, 0) > 99 ? '99+' : Object.values(globalUnreadCounts).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
              <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg
                opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 w-full px-2">

        {/* SETTINGS */}
        <div className="group relative flex justify-center w-full">
          <button
            onClick={() => {
              onOpenSettings('general');
              onPanelChange('settings'); 
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 ease-out
              ${activePanel === 'settings'
                ? 'bg-gradient-to-br from-violet-400/50 via-violet-500/40 to-indigo-400/50 text-white border-white/40 shadow-[0_10px_40px_rgba(168,85,247,0.5)] scale-110'
                : 'text-gray-400 border-transparent hover:bg-violet-500/20 hover:border-violet-300/40 hover:shadow-[0_10px_40px_rgba(168,85,247,0.5)] hover:text-white hover:scale-110'
              }`}
          >
            <Settings className="w-5 h-5" />
          </button>

          <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg
            opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
            Cài đặt
          </span>
        </div>

        {/* NOTIFICATION */}
        <div className="group relative flex justify-center w-full">
          <button
            type="button"
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 ease-out
              ${notifBadge > 0
                ? 'bg-gradient-to-br from-violet-400/50 via-violet-500/40 to-indigo-400/50 text-white border-white/40 shadow-[0_10px_40px_rgba(168,85,247,0.5)] scale-110'
                : 'text-gray-400 border-transparent hover:bg-violet-500/20 hover:border-violet-300/40 hover:shadow-[0_10px_40px_rgba(168,85,247,0.5)] hover:text-white hover:scale-110'
              }`}
          >
            <Bell className="w-5 h-5 relative z-10" />

            {notifBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1">
                {notifBadge > 99 ? '99+' : notifBadge}
              </span>
            )}
          </button>

          {bellLines.length > 0 ? (
            <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg
              opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 min-w-[10rem] shadow-lg">
              <p className="font-semibold text-white/90 mb-1">Thông báo</p>
              <ul className="space-y-0.5 text-white/80">
                {bellLines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg
              opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
              Thông báo
            </span>
          )}
        </div>

        <div
          ref={avatarZoneRef}
          className="relative flex justify-center w-full pb-2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            ref={avatarRef}
            onClick={handleClick}
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden
              transition-all duration-300 ease-out
              hover:scale-110 hover:shadow-[0_10px_30px_rgba(168,85,247,0.4)]"
          >
            <Avatar
              username={user?.username || ''}
              size="sm"
              online={true}
              avatarUrl={user?.avatar}
            />
          </button>

          {showAvatarMenu && (
            <div
              ref={menuRef}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <AvatarMenu
                user={user}
                onClose={handleCloseMenu}
                onLogout={() => {
                  logout();
                  handleCloseMenu();
                }}
                onOpenSettings={(sec) => {
                  onOpenSettings(sec);
                  handleCloseMenu();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isGroupConv(c) {
  return !!(c?.isGroup || c?.type === 'group' || c?.type === 'community');
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ onSelectConversation, activeConversationId, socket, user, onBadgeChange, externalTab, onExternalTabConsumed, unreadCounts = {}, activePanel, activeCall }) {  const [tab, setTab]                 = useState('chats');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchHits, setMessageSearchHits] = useState([]);
  const [searchMsgLoading, setSearchMsgLoading] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [addFriendResults, setAddFriendResults] = useState([]);
  const [addFriendSearching, setAddFriendSearching] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [formerFriends, setFormerFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequestsList, setSentRequestsList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sentRequests, setSentRequests] = useState(new Set());
  const [muteMap, setMuteMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_mute_map') || '{}');
    } catch {
      return {};
    }
  });

  const searchTimer = useRef(null);
  const addFriendTimer = useRef(null);

  useEffect(() => {
    if (externalTab) {
      setTab(externalTab);
      onExternalTabConsumed?.();
    }
  }, [externalTab, onExternalTabConsumed]);

  useEffect(() => {
    fetchConversations();
    fetchFriends();
    fetchFriendRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOnlineList = (ids) => setOnlineUsers(new Set(ids.map(String)));
    const onOnline = ({ userId }) => setOnlineUsers((prev) => new Set([...prev, String(userId)]));
    const onOffline = ({ userId }) =>
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.delete(String(userId));
        return n;
      });
    const onNewMsg = ({ message, conversationId }) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c._id === conversationId);

        // User bị kick khỏi group => chỉ xem history, không được để realtime cập nhật
        // `lastMessage` (và badge) nữa.
        if (existing && isGroupConv(existing)) {
          const userIdStr = String(user?._id);
          const isActiveMember = (existing.participants || []).some(
            (p) => String(p?._id || p) === userIdStr
          );
          if (!isActiveMember) return prev;
        }

        return [...prev.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message, updatedAt: message.createdAt }
            : c
        )].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const onRemovedFromGroup = ({ conversation }) => {
      if (!conversation?._id) return;
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(conversation._id)
            ? {
                ...c,
                ...conversation,
                participants: conversation.participants || c.participants,
              }
            : c
        )
      );
    };

    const onFriendReq = ({ request }) => {
      if (request?._id) {
        setRequests((prev) => {
          if (prev.some((r) => String(r._id) === String(request._id))) return prev;
          return [request, ...prev];
        });
      } else {
        fetchFriendRequests();
      }
      toast('📩 Bạn có lời mời kết bạn mới!', { icon: '👋' });
    };

    const onFriendReqCancelled = ({ fromUserId }) => {
      setRequests((prev) =>
        prev.filter((r) => String(r.from?._id || r.from) !== String(fromUserId))
      );
    };

    const onFriendReqSent = ({ toUserId, to }) => {
      if (!toUserId) return;
      const idStr = String(toUserId);
      setSentRequests((prev) => new Set([...prev, idStr]));
      if (to?._id) {
        setSentRequestsList((prev) => {
          if (prev.some((r) => String(r.to?._id || r.to) === idStr)) return prev;
          return [...prev, { _id: `socket-${idStr}`, to }];
        });
      }
    };

    const onFriendReqCancelledByMe = ({ toUserId }) => {
      if (!toUserId) return;
      setSentRequests((prev) => {
        const n = new Set(prev);
        n.delete(String(toUserId));
        return n;
      });
      setSentRequestsList((prev) =>
        prev.filter((r) => String(r.to?._id || r.to) !== String(toUserId))
      );
    };

    const onFriendAcc = ({ byUserId, user }) => {
      const targetId = byUserId || user?._id;
      if (targetId) {
        setSentRequests((prev) => {
          const n = new Set(prev);
          n.delete(String(targetId));
          return n;
        });
        setSentRequestsList((prev) =>
          prev.filter((r) => String(r.to?._id || r.to) !== String(targetId))
        );
      }
      fetchFriends();
      fetchConversations();
      fetchFriendRequests();
      toast.success('🎉 Một người đã chấp nhận kết bạn!');
    };

    const onFriendAcceptSynced = ({ userId }) => {
      if (!userId) return;
      setRequests((prev) =>
        prev.filter((r) => String(r.from?._id || r.from) !== String(userId))
      );
      fetchFriends();
      fetchConversations();
    };

    const onFriendRejected = ({ byUserId }) => {
      if (!byUserId) return;
      setSentRequests((prev) => {
        const n = new Set(prev);
        n.delete(String(byUserId));
        return n;
      });
      setSentRequestsList((prev) =>
        prev.filter((r) => String(r.to?._id || r.to) !== String(byUserId))
      );
    };

    const onFriendRejectSynced = ({ userId }) => {
      if (!userId) return;
      setRequests((prev) =>
        prev.filter((r) => String(r.from?._id || r.from) !== String(userId))
      );
    };

    socket.on('online_users_list', onOnlineList);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('new_message', onNewMsg);
    socket.on('removed_from_group', onRemovedFromGroup);
    socket.on('friend_request_received', onFriendReq);
    socket.on('friend_request_cancelled', onFriendReqCancelled);
    socket.on('friend_request_sent', onFriendReqSent);
    socket.on('friend_request_cancelled_by_me', onFriendReqCancelledByMe);
    socket.on('friend_request_accepted', onFriendAcc);
    socket.on('friend_request_accept_synced', onFriendAcceptSynced);
    socket.on('friend_request_rejected', onFriendRejected);
    socket.on('friend_request_reject_synced', onFriendRejectSynced);

    socket.emit('get_online_users', friends.map((f) => f._id));

    return () => {
      socket.off('online_users_list', onOnlineList);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('new_message', onNewMsg);
      socket.off('removed_from_group', onRemovedFromGroup);
      socket.off('friend_request_received', onFriendReq);
      socket.off('friend_request_cancelled', onFriendReqCancelled);
      socket.off('friend_request_sent', onFriendReqSent);
      socket.off('friend_request_cancelled_by_me', onFriendReqCancelledByMe);
      socket.off('friend_request_accepted', onFriendAcc);
      socket.off('friend_request_accept_synced', onFriendAcceptSynced);
      socket.off('friend_request_rejected', onFriendRejected);
      socket.off('friend_request_reject_synced', onFriendRejectSynced);
    };
  }, [socket, friends]);

  const chatsListConversations = useMemo(() => {
    if (activePanel !== 'friends') return conversations;
    const friendIds = new Set(friends.map((f) => String(f._id)));
    return conversations.filter((c) => {
      if (isGroupConv(c)) return false;
      const other = c.participants?.find((p) => String(p._id) !== String(user?._id));
      return other && friendIds.has(String(other._id));
    });
  }, [conversations, activePanel, friends, user]);

  const chatsUnreadSum = useMemo(() => {
    return chatsListConversations.reduce((s, c) => s + (unreadCounts[c._id] || 0), 0);
  }, [chatsListConversations, unreadCounts]);

  const userSearchRows = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const kw = removeAccents(searchQuery).toLowerCase();
    const matches = (u) =>
      removeAccents(u.username || '').toLowerCase().includes(kw) ||
      removeAccents(u.email || '').toLowerCase().includes(kw);

    const friendIds = new Set(friends.map((f) => String(f._id)));
    const rows = [];

    friends.forEach((f) => {
      if (matches(f)) rows.push({ user: f, kind: 'friend' });
    });

    (formerFriends || []).forEach((f) => {
      if (friendIds.has(String(f._id))) return;
      if (matches(f)) rows.push({ user: f, kind: 'former' });
    });

    return rows;
  }, [searchQuery, friends, formerFriends]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setMessageSearchHits([]);
      setSearchMsgLoading(false);
      return;
    }

    setSearchMsgLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const scope = activePanel === 'friends' ? 'dm' : 'all';
      try {
        const { data } = await axios.get(`${API_URL}/messages/search`, {
          params: { q: searchQuery.trim(), scope },
        });
        setMessageSearchHits(data.data || []);
      } catch {
        setMessageSearchHits([]);
      } finally {
        setSearchMsgLoading(false);
      }
    }, 280);
  }, [searchQuery, activePanel]);

  useEffect(() => {
    if (!addFriendQuery.trim()) {
      setAddFriendResults([]);
      setAddFriendSearching(false);
      return;
    }

    setAddFriendSearching(true);
    clearTimeout(addFriendTimer.current);
    addFriendTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(addFriendQuery.trim())}`);
        setAddFriendResults(data.data?.users || data.data || []);
      } catch {
        setAddFriendResults([]);
      } finally {
        setAddFriendSearching(false);
      }
    }, 300);
  }, [addFriendQuery]);

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/conversations`);
      setConversations(data.data?.conversations || data.data || []);
    } catch {}
  };

  const fetchFriends = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends`);
      const list = Array.isArray(data.data) ? data.data : data.data?.friends || [];
      setFriends(list);
      setFormerFriends(data.formerFriends || []);
      if (socket && list.length) socket.emit('get_online_users', list.map((f) => f._id));
    } catch {}
  };

  const unfriend = async (userId, username) => {
    if (!window.confirm(`Xóa ${username} khỏi danh sách bạn bè?`)) return;
    try {
      await axios.delete(`${API_URL}/friends/${userId}`);
      toast.success('Đã xóa bạn bè');
      fetchFriends();
    } catch (err) {
      toast.error('Không thể xóa bạn bè');
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends/requests`);
      setRequests(data.data || []);
    } catch {}
  };

  const sendFriendRequest = async (userId, userPayload) => {
    try {
      await axios.post(`${API_URL}/friends/request/${userId}`);
      const idStr = String(userId);
      setSentRequests((prev) => new Set([...prev, idStr]));

      const userInfo = userPayload || addFriendResults.find((u) => String(u._id) === idStr);
      if (userInfo) {
        setSentRequestsList((prev) => {
          if (prev.some((r) => String(r.to?._id || r.to) === idStr)) return prev;
          return [...prev, { _id: `local-${idStr}`, to: userInfo }];
        });
      }

      toast.success('Đã gửi lời mời kết bạn!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi lời mời');
    }
  };

  const cancelFriendRequest = async (userId) => {
    try {
      await axios.delete(`${API_URL}/friends/request/${userId}`);
      setSentRequests((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
      setSentRequestsList((prev) =>
        prev.filter((r) => (r.to?._id || r.to)?.toString() !== userId)
      );
      toast('Đã hủy lời mời');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy lời mời');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post(`${API_URL}/friends/accept/${requestId}`);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      toast.success('Đã kết bạn! 🎉');
      fetchFriends();
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await axios.post(`${API_URL}/friends/reject/${requestId}`);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      toast('Đã từ chối');
    } catch {}
  };

  const openDirectChat = async (friendId) => {
    try {
      const { data } = await axios.post(`${API_URL}/conversations`, { participantId: friendId });
      const conv = data.data?.conversation || data.data;
      await fetchConversations();
      onSelectConversation?.(conv);
      setTab('chats');
    } catch {
      toast.error('Không thể mở chat');
    }
  };

  const isFriend = (uid) => friends.some((f) => String(f._id) === String(uid));

  const getOtherParticipant = (conv) => {
    if (isGroupConv(conv)) return { username: conv.name || 'Nhóm', _id: conv._id };
    return conv.participants?.find((p) => (p._id || p) !== user?._id) || {};
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if ((Date.now() - d) / 3600000 < 24) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getLastMessagePreview = (conv) => {
    const lm = conv.lastMessage;
    if (!lm) return 'Bắt đầu trò chuyện...';
    if (lm.type === 'image') return '🖼️ Ảnh';
    if (lm.type === 'file') return '📎 ' + (lm.fileName || 'File');
    return lm.content || 'Bắt đầu trò chuyện...';
  };

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-2xl overflow-hidden shadow">
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <AppLogo size={24} /><span className="chat-text font-bold text-gray-800">Chat App</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setTab(e.target.value ? 'search' : 'chats');
              }}
              placeholder="Tìm kiếm hoặc thêm bạn..."
              className="w-full pl-9 pr-8 py-2 chat-input bg-gray-100 rounded-xl border border-transparent focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMessageSearchHits([]);
                  setTab('chats');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Friend button */}
          <div className="relative group flex items-center justify-center">
            <button
              onClick={() => setShowAddFriend(true)}
              className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <div className="absolute top-full left-1/2 translate-x-1 mt-1 px-1.5 py-0.5 chat-caption text-white
              bg-gray-800 rounded opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1
              transition-all duration-150 whitespace-nowrap pointer-events-none">
              Thêm bạn
            </div>
          </div>
        </div>

        {!searchQuery && tab !== 'add-friend' && (
          <div className="flex gap-1">
            <Tab label="Tin nhắn" active={tab === 'chats'} badge={chatsUnreadSum} onClick={() => setTab('chats')} />
            <Tab label="Bạn bè" active={tab === 'friends'} onClick={() => setTab('friends')} />
            <Tab
              label="Lời mời"
              active={tab === 'requests'}
              badge={requests.length + sentRequestsList.length}
              onClick={() => setTab('requests')}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'search' && (
          <div className="p-2">
            {!searchMsgLoading && userSearchRows.length === 0 && messageSearchHits.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="chat-text">Không tìm thấy kết quả</p>
              </div>
            )}

            {userSearchRows.map(({ user: u, kind }) => {
              const uid = String(u._id);
              const incomingReq = requests.find((r) => String(r.from?._id || r.from) === uid);
              const hasSentReq = sentRequests.has(u._id) || sentRequests.has(uid);
              const isF = kind === 'friend';

              return (
                <div key={`${kind}-${uid}`} onClick={() => isF && openDirectChat(u._id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition hover:bg-gray-50">
                  <Avatar username={u.username} size="md" avatarUrl={u.avatar} online={onlineUsers.has(uid)} />
                  <div className="flex-1 min-w-0">
                    <p className="chat-text font-semibold text-gray-800 truncate">{u.username}</p>
                    <p className="chat-preview text-gray-400 truncate">{u.email}</p>
                  </div>
                  {isF ? (
                    <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : incomingReq ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); acceptRequest(incomingReq._id); }}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-green-600 text-white">
                      Chấp nhận
                    </button>
                  ) : hasSentReq ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); cancelFriendRequest(u._id); }}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                      Hủy
                    </button>
                  ) : (
                    <button type="button" onClick={(e) => { e.stopPropagation(); sendFriendRequest(u._id, u); }}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-blue-600 text-white">
                      Kết bạn
                    </button>
                  )}
                </div>
              );
            })}

            {messageSearchHits.map((hit) => {
              const conv = hit.conversation;
              const g = isGroupConv(conv);
              const other = !g && conv.participants?.find((p) => String(p._id) !== String(user?._id));
              const title = g ? conv.name || 'Nhóm' : other?.username || 'Người dùng';
              const unread = unreadCounts[conv._id] || 0;

              return (
                <div key={conv._id} onClick={() => onSelectConversation?.(conv)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                  {g ? (
                    <GroupAvatar participants={conv.participants || []} groupAvatar={conv.avatar} />
                  ) : (
                    <Avatar username={title} size="md" avatarUrl={other?.avatar}
                      online={other ? onlineUsers.has(String(other._id)) : false} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="chat-text font-semibold text-gray-800 truncate">{title}</p>
                    <p className="chat-preview text-blue-700 truncate">{hit.preview}</p>
                  </div>
                  {unread > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-blue-600 text-white chat-meta font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'chats' && (
          <div className="p-2">
            {chatsListConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="chat-text font-medium">Chưa có cuộc trò chuyện</p>
                <p className="chat-preview mt-1">Thêm bạn bè và bắt đầu chat!</p>
              </div>
            ) : chatsListConversations.map(conv => {
              const other    = getOtherParticipant(conv);
              const isActive = conv._id === activeConversationId;
              const unread = unreadCounts[conv._id] || 0;
              const isOnline = onlineUsers.has(String(other._id));
              const isMuted = muteMap[conv._id] ?? false;
              const title = isGroupConv(conv) ? conv.name || 'Nhóm' : other.username || conv.name;
              const hasActiveCall = activeCall?.conversationId === conv._id;

              return (
                <button
                  key={conv._id}
                  onClick={() => onSelectConversation?.(conv)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left
                    ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'} ${hasActiveCall ? 'bg-green-50 border border-green-100' : ''}`}
                >
                  {isGroupConv(conv) ? (
                    <GroupAvatar participants={conv.participants || []} groupAvatar={conv.avatar} />
                  ) : (
                    <Avatar username={other.username || '?'} size="md" online={isOnline} avatarUrl={other.avatar} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-sm truncate ${
                          isActive
                            ? 'font-bold text-blue-700'
                            : unread > 0
                            ? 'font-bold text-gray-900'
                            : 'font-semibold text-gray-800'
                        }`}
                      >
                        {title}
                        {hasActiveCall && <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-semibold text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Đang gọi</span>}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasActiveCall && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectConversation?.(conv);
                            }}
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-md transition"
                            title="Tham gia cuộc gọi"
                          >
                            Tham gia
                          </button>
                        )}
                        {isMuted && <BellOff className="w-3 h-3 text-gray-400" title="Đã tắt thông báo trong khung chat" />}
                        <span className={`text-[10px] ${unread > 0 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                          {formatTime(conv.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate max-w-[140px] ${unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>
                        {getLastMessagePreview(conv)}
                      </p>
                      {unread > 0 && (
                        <span
                          className={`ml-2 flex-shrink-0 min-w-[18px] h-[18px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ${
                            isMuted ? 'bg-gray-500' : 'bg-red-500'
                          }`}
                          title={isMuted ? 'Có tin mới (đang tắt thông báo trong chat)' : undefined}
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
              })}
          </div>
        )}

        {tab === 'friends' && (
          <div className="p-2">
            {friends.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="chat-text font-medium">Chưa có bạn bè</p>
              </div>
            ) : (
              <>
                {friends.filter(f => onlineUsers.has(String(f._id))).length > 0 && (
                  <p className="chat-caption font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                    Online · {friends.filter(f => onlineUsers.has(String(f._id))).length}
                  </p>
                )}
                {friends.map(friend => {
                  const isOnline = onlineUsers.has(String(friend._id));
                  return (
                    <div key={friend._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group">
                      <Avatar username={friend.username} size="md" online={isOnline} avatarUrl={friend.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="chat-text font-semibold text-gray-800 truncate">{friend.username}</p>
                        <p className={`chat-preview ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>{isOnline ? '● Online' : '● Offline'}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openDirectChat(friend._id)}
                          title="Nhắn tin"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => unfriend(friend._id, friend.username)}
                          title="Xóa bạn bè"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="p-2">
            {/* Lời mời nhận được */}
            {requests.length > 0 && (
              <>
                <p className="chat-caption font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Nhận được · {requests.length}
                </p>
                {requests.map(req => {
                  const sender = req.from || req.sender || req;
                  return (
                    <div key={req._id} className="px-3 py-3 rounded-xl hover:bg-gray-50 transition mb-1 border border-gray-100">
                      <div className="flex items-center gap-3 mb-2.5">
                        <Avatar username={sender.username || '?'} size="md" avatarUrl={sender.avatar} />
                        <div className="flex-1 min-w-0">
                          <p className="chat-text font-semibold text-gray-800 truncate">{sender.username || 'Người dùng'}</p>
                          <p className="chat-preview text-gray-400 truncate">{sender.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptRequest(req._id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 chat-caption font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                          <Check className="w-3.5 h-3.5" /> Chấp nhận
                        </button>
                        <button onClick={() => declineRequest(req._id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 chat-caption font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition">
                          <X className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Lời mời đã gửi */}
            {sentRequestsList.length > 0 && (
              <>
                <p className="chat-caption font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-2">
                  Đã gửi · {sentRequestsList.length}
                </p>
                {sentRequestsList.map(req => {
                  const receiver = req.to || {};
                  const userId   = (receiver._id || receiver)?.toString();
                  return (
                    <div key={req._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition mb-0.5 border border-gray-100">
                      <Avatar username={receiver.username || '?'} size="md" avatarUrl={receiver.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="chat-text font-semibold text-gray-800 truncate">{receiver.username || 'Người dùng'}</p>
                        <p className="chat-preview text-gray-400 truncate">{receiver.email}</p>
                      </div>
                      <button onClick={() => cancelFriendRequest(userId)}
                        title="Hủy lời mời"
                        className="flex items-center gap-1 chat-caption font-semibold px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition flex-shrink-0">
                        <X className="w-3 h-3" /> Hủy
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {requests.length === 0 && sentRequestsList.length === 0 && (
              <div className="text-center py-12 text-gray-400 px-4">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="chat-text font-medium">Không có lời mời nào</p>
              </div>
            )}
          </div>
        )}
      </div>
      {showAddFriend && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAddFriend(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Tìm người dùng</p>
              <button 
                onClick={() => {
                  setShowAddFriend(false);
                  setAddFriendQuery('');
                  setAddFriendResults([]);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={addFriendQuery}
                onChange={e => setAddFriendQuery(e.target.value)}
                placeholder="Nhập tên hoặc email..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 rounded-xl border border-transparent focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              {addFriendQuery && (
                <button
                  onClick={() => {
                    setAddFriendQuery('');
                    setAddFriendResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Loading */}
            {addFriendSearching && (
              <p className="text-[11px] text-gray-400 px-2 py-1">Đang tìm...</p>
            )}

            {/* Empty */}
            {!addFriendSearching && addFriendQuery && addFriendResults.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Không tìm thấy người dùng</p>
              </div>
            )}

            {/* Hint */}
            {!addFriendQuery && (
              <div className="text-center py-6 text-gray-300">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Nhập tên hoặc email để tìm</p>
              </div>
            )}

            {/* List */}
            <div className="max-h-64 overflow-y-auto">
              {addFriendResults.map(u => {
                const isMe = u._id === user?._id;
                const alreadyFriend = isFriend(u._id);
                const hasSent = sentRequests.has(u._id);

                return (
                  <div key={u._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                    
                    <Avatar username={u.username} size="md" avatarUrl={u.avatar} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.username}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>

                    {isMe ? null : alreadyFriend ? (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Bạn bè
                      </span>
                    ) : hasSent ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Đã gửi</span>
                        <button
                          onClick={() => cancelFriendRequest(u._id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(u._id)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        <UserPlus className="w-3 h-3" /> Kết bạn
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ onSelectConversation, activeConversationId, socket, activeCall, currentUser }) {
  const { user, logout, updateUser } = useAuthStore();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }

    const sizeMap = { small: '13px', medium: '15px', large: '17px' };
    const savedSize = localStorage.getItem('chatFontSize') || 'medium';
    document.documentElement.style.setProperty('--chat-font-size', sizeMap[savedSize]);

    return () => {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    };
  }, []);

  const [activePanel, setActivePanel] = useState(() => localStorage.getItem('sidebar_panel') || 'chat');
  const [totalBadge, setTotalBadge] = useState(0);
  const [globalUnreadCounts, setGlobalUnreadCounts] = useState({});
  const [friendReqCount, setFriendReqCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState('general');
  const [externalTab, setExternalTab] = useState(null);

  const refreshFriendReqCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends/requests`);
      setFriendReqCount((data.data || []).length);
    } catch {}
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/conversations`);
      const conversations = data.data?.conversations || data.data || [];
      const unreadMap = Object.fromEntries(
        conversations.map((conversation) => {
          const isGroupConversation =
            conversation?.isGroup === true ||
            conversation?.type === 'group' ||
            conversation?.type === 'community';
          const isCurrentMember = (conversation?.participants || []).some(
            (participant) => String(participant?._id || participant) === String(user?._id)
          );
          const isReadOnlyGroup =
            isGroupConversation && (
              !!conversation?.dissolvedAt ||
              !!conversation?.historyVisibleUntil ||
              !isCurrentMember
            );

          return [conversation._id, isReadOnlyGroup ? 0 : (conversation.unreadCount || 0)];
        })
      );
      setGlobalUnreadCounts(unreadMap);
    } catch {}
  }, [user?._id]);

  useEffect(() => {
    refreshFriendReqCount();
    refreshUnreadCounts();
  }, [refreshFriendReqCount, refreshUnreadCounts]);

  useEffect(() => {
    if (!socket) return;

    const onNew = ({ conversationId, message }) => {
      const senderId = message?.sender?._id || message?.sender;
      if (senderId?.toString() === user?._id?.toString()) return;

      if (conversationId === activeConversationId) {
        setGlobalUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
        return;
      }

      setGlobalUnreadCounts((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1,
      }));
    };

    const onMessagesRead = ({ conversationId }) => {
      if (!conversationId) return;
      if (conversationId === activeConversationId) {
        setGlobalUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
      }
    };

    const onFriendEvent = () => {
      refreshFriendReqCount();
    };

    const onGroupStateChanged = () => {
      refreshUnreadCounts();
    };

    const onConnect = () => {
      refreshUnreadCounts();
      refreshFriendReqCount();
    };

    socket.on('connect', onConnect);
    socket.on('new_message', onNew);
    socket.on('messages_read', onMessagesRead);
    socket.on('friend_request_received', onFriendEvent);
    socket.on('friend_request_accepted', onFriendEvent);
    socket.on('friend_request_accept_synced', onFriendEvent);
    socket.on('friend_request_cancelled', onFriendEvent);
    socket.on('friend_request_rejected', onFriendEvent);
    socket.on('friend_request_reject_synced', onFriendEvent);
    socket.on('removed_from_group', onGroupStateChanged);
    socket.on('group_dissolved', onGroupStateChanged);
    socket.on('member_removed', onGroupStateChanged);
    socket.on('member_left', onGroupStateChanged);
    socket.on('group_updated', onGroupStateChanged);

    return () => {
      socket.off('connect', onConnect);
      socket.off('new_message', onNew);
      socket.off('messages_read', onMessagesRead);
      socket.off('friend_request_received', onFriendEvent);
      socket.off('friend_request_accepted', onFriendEvent);
      socket.off('friend_request_accept_synced', onFriendEvent);
      socket.off('friend_request_cancelled', onFriendEvent);
      socket.off('friend_request_rejected', onFriendEvent);
      socket.off('friend_request_reject_synced', onFriendEvent);
      socket.off('removed_from_group', onGroupStateChanged);
      socket.off('group_dissolved', onGroupStateChanged);
      socket.off('member_removed', onGroupStateChanged);
      socket.off('member_left', onGroupStateChanged);
      socket.off('group_updated', onGroupStateChanged);
    };
  }, [socket, activeConversationId, refreshFriendReqCount, refreshUnreadCounts, user?._id]);

  useEffect(() => {
    if (!activeConversationId) return;
    setGlobalUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }));
  }, [activeConversationId]);

  const totalUnreadAll = useMemo(
    () => Object.values(globalUnreadCounts).reduce((a, b) => a + b, 0),
    [globalUnreadCounts]
  );

  useEffect(() => {
    setTotalBadge(totalUnreadAll + friendReqCount);
  }, [totalUnreadAll, friendReqCount]);

  const handlePanelChange = (panel) => {
    setActivePanel(panel);
    localStorage.setItem('sidebar_panel', panel);
    if (panel === 'friends' || panel === 'recent' || panel === 'chat') {
      setExternalTab('chats');
      return;
    }

    setExternalTab(null);
  };

  const handleOpenSettings = (section = 'general') => {
    setSettingsSection(section);
    setShowSettings(true);
  };

  return (
    <div className="flex h-screen flex-shrink-0 overflow-visible">
      <IconBar
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
        user={user}
        logout={logout}
        notifBadge={totalBadge}
        chatUnreadTotal={totalUnreadAll}
        friendReqCount={friendReqCount}
        onOpenSettings={handleOpenSettings}
        globalUnreadCounts={globalUnreadCounts}
      />

      {(activePanel === 'friends' || activePanel === 'recent' || activePanel === 'chat') && (
        <div className="h-screen bg-gray-100 dark:bg-gray-900 p-4">
          <div className="h-full max-w-sm mx-auto flex flex-col">
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ChatPanel
              onSelectConversation={onSelectConversation}
              activeConversationId={activeConversationId}
              socket={socket}
              user={user}
              externalTab={externalTab}
              onExternalTabConsumed={() => setExternalTab(null)}
              activePanel={activePanel === 'chat' ? 'recent' : activePanel}
              unreadCounts={globalUnreadCounts}
              activeCall={activeCall}
            />
            </div>
          </div>
        </div>
      )}

      {activePanel === 'groupchat' && (
        <div className="h-screen bg-gray-100 dark:bg-gray-900 p-4">
          <div className="h-full max-w-sm mx-auto flex flex-col">
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <GroupChatPanel
                onSelectConversation={onSelectConversation}
                activeConversationId={activeConversationId}
                socket={socket}
                user={user}
                unreadCounts={globalUnreadCounts}
              />
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsPage
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdateUser={updateUser}
          initialSection={settingsSection}
        />
      )}
    </div>
  );
}
