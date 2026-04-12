import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  X, Phone, Video, Search, Bell, BellOff, UserX, Shield,
  Flag, Trash2, UserPlus, Check, Calendar, Info,
  MessageCircle, Image as ImageIcon, FileText, ChevronDown,
  ChevronUp, AlertTriangle, UserMinus,
} from 'lucide-react';

const API_URL  = import.meta.env.VITE_API_URL  || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];

function getAvatarColor(name) {
  const s = (name || '').trim();
  return s ? AVATAR_COLORS[(s.charCodeAt(0) || 0) % AVATAR_COLORS.length] : 'bg-gray-400';
}

function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function Avatar({ username = '', size = 'xl', avatarUrl }) {
  const initials = (username || '').slice(0, 2).toUpperCase() || '?';
  const color = getAvatarColor(username);
  const sz = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
  }[size] || 'w-20 h-20 text-2xl';

  return avatarUrl ? (
    <img
      src={getFileUrl(avatarUrl)}
      alt={username}
      className={`${sz} rounded-full object-cover flex-shrink-0`}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  ) : (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true, confirmLabel = 'Xác nhận' }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-72 p-5 flex flex-col gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500' : 'text-blue-500'}`} />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-800">{title}</p>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
            Hủy
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2 text-white text-sm font-semibold rounded-xl transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatInfoPanel({
  socket,
  otherUser,
  currentUser,
  conversation,
  onClose,
  onStartCall,
  onSearchMessages,
  onClearChat,
  onFriendRemoved,
  onUserBlocked,
  onUserUnblocked,
  onSendFriendRequest,
  muteMap,
  onMuteChange,
}) {
  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
    isFriend: false,
  });
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const muteNotif = muteMap ? (muteMap[conversation?._id] ?? false) : false;
  const userId = otherUser?._id;
  const [userDetails, setUserDetails] = useState(otherUser);

  // Luôn hiển thị dữ liệu mới nhất của user trong panel (đặc biệt là "Giới thiệu/bio")
  useEffect(() => {
    setUserDetails(otherUser);
  }, [otherUser]);

  useEffect(() => {
    const targetId = otherUser?._id;
    if (!targetId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/users/${targetId}`);
        const fresh = res?.data?.data || res?.data?.user || res?.data;
        if (!cancelled && fresh) setUserDetails(fresh);
      } catch {
        // silent: vẫn dùng dữ liệu prop fallback
      }
    })();
    return () => { cancelled = true; };
  }, [otherUser?._id]);

  const shownUser = userDetails || otherUser;

  const fetchBlockStatus = useCallback(async () => {
    if (!userId) return;
    setLoadingStatus(true);
    try {
      const { data } = await axios.get(`${API_URL}/friends/block-status/${userId}`);
      setBlockStatus(data.data || {});
    } catch {
      //
    } finally {
      setLoadingStatus(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBlockStatus();
  }, [fetchBlockStatus]);

  useEffect(() => {
    if (!socket || !userId) return;

    const onBlockedByUser = ({ byUserId }) => {
      if (String(byUserId) !== String(userId)) return;
      setBlockStatus((prev) => ({
        ...prev,
        theyBlockedMe: true,
        isFriend: false,
      }));
    };

    const onUnblockedByUser = ({ byUserId }) => {
      if (String(byUserId) !== String(userId)) return;
      setBlockStatus((prev) => ({
        ...prev,
        theyBlockedMe: false,
      }));
    };

    const onIBlockedUser = ({ userId: targetUserId }) => {
      if (String(targetUserId) !== String(userId)) return;
      setBlockStatus((prev) => ({
        ...prev,
        iBlockedThem: true,
        isFriend: false,
      }));
    };

    const onIUnblockedUser = ({ userId: targetUserId }) => {
      if (String(targetUserId) !== String(userId)) return;
      setBlockStatus((prev) => ({
        ...prev,
        iBlockedThem: false,
      }));
    };

    const onFriendRemovedSocket = ({ userId: changedUserId }) => {
      if (String(changedUserId) !== String(userId)) return;
      setBlockStatus((prev) => ({
        ...prev,
        isFriend: false,
      }));
    };

    socket.on('blocked_by_user', onBlockedByUser);
    socket.on('unblocked_by_user', onUnblockedByUser);
    socket.on('i_blocked_user', onIBlockedUser);
    socket.on('i_unblocked_user', onIUnblockedUser);
    socket.on('friend_removed', onFriendRemovedSocket);

    return () => {
      socket.off('blocked_by_user', onBlockedByUser);
      socket.off('unblocked_by_user', onUnblockedByUser);
      socket.off('i_blocked_user', onIBlockedUser);
      socket.off('i_unblocked_user', onIUnblockedUser);
      socket.off('friend_removed', onFriendRemovedSocket);
    };
  }, [socket, userId]);

  useEffect(() => {
    if (!showMediaSection || !conversation?._id) return;
    if (mediaFiles.length > 0) return;

    setLoadingMedia(true);
    axios.get(`${API_URL}/messages/${conversation._id}`)
      .then(({ data }) => {
        const msgs = data.data?.messages || data.data || [];
        const files = msgs
          .filter((m) => m.type === 'image' || m.type === 'file')
          .reverse()
          .slice(0, 24);
        setMediaFiles(files);
      })
      .catch(() => {})
      .finally(() => setLoadingMedia(false));
  }, [showMediaSection, conversation?._id, mediaFiles.length]);

  useEffect(() => {
    setMediaFiles([]);
    setShowMediaSection(false);
  }, [conversation?._id]);

  const isBlockedByThem = blockStatus.theyBlockedMe;
  const iBlockedThem = blockStatus.iBlockedThem;
  const isFriend = blockStatus.isFriend;

  const handleToggleMute = () => {
    const newVal = !muteNotif;
    onMuteChange?.(conversation?._id, newVal);
    toast(newVal ? '🔕 Đã tắt nhấn mạnh trong danh sách chat. Sidebar vẫn hiện số tin mới.' : '🔔 Đã bật thông báo đầy đủ trong chat');
  };

  const handleRemoveFriend = () => {
    setConfirm({
      title: 'Xóa bạn bè',
      message: `Xóa ${otherUser?.username} khỏi danh sách bạn bè? Bạn vẫn có thể nhắn tin với nhau.`,
      danger: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/friends/${userId}`);
          toast.success('Đã xóa bạn bè');
          setBlockStatus((prev) => ({ ...prev, isFriend: false }));
          onFriendRemoved?.(userId);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Không thể xóa bạn bè');
        }
        setConfirm(null);
      },
    });
  };

  const handleBlock = () => {
    setConfirm({
      title: 'Chặn người dùng',
      message: `Chặn ${otherUser?.username}? Họ sẽ không thể nhắn tin hay xem thông tin của bạn.`,
      danger: true,
      confirmLabel: 'Chặn',
      onConfirm: async () => {
        setLoadingBlock(true);
        try {
          await axios.post(`${API_URL}/friends/block/${userId}`);
          toast.success('Đã chặn người dùng');
          setBlockStatus((prev) => ({ ...prev, iBlockedThem: true, isFriend: false }));
          onUserBlocked?.(userId);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Không thể chặn');
        } finally {
          setLoadingBlock(false);
        }
        setConfirm(null);
      },
    });
  };

  const handleUnblock = async () => {
    setLoadingBlock(true);
    try {
      await axios.delete(`${API_URL}/friends/block/${userId}`);
      toast.success('Đã bỏ chặn');
      setBlockStatus((prev) => ({ ...prev, iBlockedThem: false }));
      onUserUnblocked?.(userId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể bỏ chặn');
    } finally {
      setLoadingBlock(false);
    }
  };

  const handleReport = () => toast.success('Đã gửi báo cáo. Cảm ơn bạn!');

  if (!loadingStatus && isBlockedByThem) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm">Thông tin</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <UserX className="w-10 h-10 text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-gray-700 text-base">Người dùng</p>
            <p className="text-xs text-gray-400 mt-0.5">Tài khoản bị hạn chế</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-600 font-semibold mb-1">🚫 Bạn đã bị chặn</p>
            <p className="text-xs text-red-500 leading-relaxed">
              Người dùng này đã chặn bạn. Bạn không thể xem thông tin, nhắn tin hay liên hệ với họ.
            </p>
          </div>
          <button onClick={handleReport} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition">
            <Flag className="w-3.5 h-3.5" /> Báo cáo tài khoản
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden flex-shrink-0">
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <h2 className="font-bold text-gray-800 text-sm">Thông tin người dùng</h2>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 py-6 border-b border-gray-100">
          {iBlockedThem ? (
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <UserX className="w-10 h-10 text-gray-400" />
            </div>
          ) : (
            <div className="mb-3">
              <Avatar username={shownUser?.username || '?'} size="xl" avatarUrl={shownUser?.avatar} />
            </div>
          )}

          <p className="font-bold text-gray-800 text-lg">{iBlockedThem ? 'Người dùng' : (shownUser?.username || 'Người dùng')}</p>

          {!iBlockedThem && (
            <>
              {isFriend ? (
                <p className="text-xs text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full mt-1 font-semibold">✓ Bạn bè</p>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full mt-1">
                  👤 Người lạ
                </p>
              )}
              {(shownUser?.isOnline || otherUser?.isOnline) && (
                <p className="text-xs text-green-500 mt-1">● Đang hoạt động</p>
              )}
            </>
          )}

          {iBlockedThem && (
            <div className="mt-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full">
              <p className="text-xs text-red-500 font-semibold">🚫 Đã bị chặn</p>
            </div>
          )}
        </div>

        {!iBlockedThem && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => onStartCall?.('audio')} className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-semibold text-blue-700">Gọi thoại</span>
              </button>
              <button onClick={() => onStartCall?.('video')} className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition">
                <Video className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-semibold text-blue-700">Video</span>
              </button>
              <button onClick={onSearchMessages} className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <Search className="w-5 h-5 text-gray-600" />
                <span className="text-[10px] font-semibold text-gray-600">Tìm kiếm</span>
              </button>
            </div>
          </div>
        )}

        {/* User info (chỉ hiện nếu không bị chặn) */}
        {!iBlockedThem && shownUser && (
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Thông tin</p>
            <div className="space-y-2.5">
              {shownUser.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Email</p>
                    <p className="text-sm text-gray-700 truncate">{shownUser.email}</p>
                  </div>
                </div>
              )}
              {shownUser.bio && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Giới thiệu</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{shownUser.bio}</p>
                  </div>
                </div>
              )}
              {shownUser.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Tham gia từ</p>
                    <p className="text-sm text-gray-700">{formatDate(shownUser.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!iBlockedThem && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Quan hệ</p>
            {loadingStatus ? (
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ) : isFriend ? (
              <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-700 flex-1">Bạn bè</span>
                <button onClick={handleRemoveFriend} title="Hủy kết bạn" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => onSendFriendRequest?.(userId)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-semibold">Kết bạn</span>
              </button>
            )}
          </div>
        )}

        {!iBlockedThem && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Cài đặt chat</p>
            <div className="space-y-1">
              <button onClick={handleToggleMute} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${muteNotif ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}>
                {muteNotif ? (
                  <BellOff className="w-4 h-4 text-orange-500" />
                ) : (
                  <Bell className="w-4 h-4 text-gray-500" />
                )}
                <span className={`text-sm flex-1 text-left font-medium ${muteNotif ? 'text-orange-600' : 'text-gray-700'}`}>
                  {muteNotif ? 'Bật thông báo' : 'Tắt thông báo trong khung chat'}
                </span>
                {muteNotif && (
                  <span className="text-[10px] text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full font-semibold">Đang tắt</span>
                )}
              </button>
              <p className="text-[10px] text-gray-400 px-1 leading-snug">
                Sidebar vẫn hiện số tin chưa đọc; chỉ giảm nhấn mạnh trong danh sách chat khi đang tắt.
              </p>

              <button onClick={onSearchMessages} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Tìm kiếm tin nhắn</span>
              </button>

              <button onClick={onClearChat} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 transition">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Xóa lịch sử chat</span>
              </button>
            </div>
          </div>
        )}

        {!iBlockedThem && (
          <div className="px-4 py-3 border-b border-gray-100">
            <button onClick={() => setShowMediaSection((v) => !v)} className="w-full flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wide">
              <span>Ảnh / File đã chia sẻ</span>
              {showMediaSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMediaSection && (
              <div className="mt-3">
                {loadingMedia ? (
                  <div className="grid grid-cols-3 gap-1">
                    {[1,2,3,4,5,6].map((i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Chưa có ảnh/file nào được chia sẻ</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mediaFiles.filter((m) => m.type === 'image').length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">
                          Ảnh ({mediaFiles.filter((m) => m.type === 'image').length})
                        </p>
                        <div className="grid grid-cols-3 gap-1">
                          {mediaFiles.filter((m) => m.type === 'image').slice(0, 9).map((m) => (
                            <a key={m._id} href={getFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition block">
                              <img src={getFileUrl(m.fileUrl)} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {mediaFiles.filter((m) => m.type === 'file').length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">
                          File ({mediaFiles.filter((m) => m.type === 'file').length})
                        </p>
                        <div className="space-y-1.5">
                          {mediaFiles.filter((m) => m.type === 'file').slice(0, 5).map((m) => (
                            <a key={m._id} href={getFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate text-gray-700">{m.fileName || 'File'}</p>
                                <p className="text-[10px] text-gray-400">{m.sender?.username} · {formatDate(m.createdAt)}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Khác</p>
          <div className="space-y-1">
            {iBlockedThem ? (
              <button onClick={handleUnblock} disabled={loadingBlock} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-semibold">{loadingBlock ? 'Đang xử lý...' : 'Bỏ chặn'}</span>
              </button>
            ) : (
              <button onClick={handleBlock} disabled={loadingBlock} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 transition disabled:opacity-50">
                <UserX className="w-4 h-4" />
                <span className="text-sm font-medium">{loadingBlock ? 'Đang xử lý...' : 'Chặn người dùng'}</span>
              </button>
            )}

            <button onClick={handleReport} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 transition">
              <Flag className="w-4 h-4" />
              <span className="text-sm font-medium">Báo cáo</span>
            </button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger !== false}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
