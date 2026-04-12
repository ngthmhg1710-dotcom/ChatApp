import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  RefreshCw,
  Clock3,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORY_LABELS = {
  spam: 'Spam / làm phiền',
  scam: 'Lừa đảo / scam',
  harassment: 'Quấy rối / xúc phạm',
  hate_speech: 'Ngôn từ thù ghét',
  impersonation: 'Giả mạo',
  violence: 'Bạo lực / đe dọa',
  nudity: 'Nội dung nhạy cảm',
  other: 'Khác',
};

const STATUS_META = {
  pending: {
    label: 'Chờ xử lý',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock3,
  },
  reviewing: {
    label: 'Đang xem',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Eye,
  },
  resolved: {
    label: 'Đã xử lý',
    badge: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Từ chối',
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
};

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReportDetailModal({ report, onClose, onUpdate }) {
  const [status, setStatus] = useState(report.status || 'pending');
  const [adminNote, setAdminNote] = useState(report.adminNote || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await axios.patch(`${API_URL}/reports/${report._id}/status`, {
        status,
        adminNote,
      });
      toast.success('Đã cập nhật báo cáo');
      onUpdate?.(data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật báo cáo');
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon = STATUS_META[report.status]?.icon || AlertTriangle;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[720px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-bold text-gray-800">Chi tiết báo cáo</p>
            <p className="text-xs text-gray-400 mt-0.5">Mã: {report._id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Người báo cáo</p>
              <p className="text-sm font-semibold text-gray-800">{report.reporter?.username || 'Không rõ'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{report.reporter?.email || ''}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Người bị báo cáo</p>
              <p className="text-sm font-semibold text-gray-800">{report.reportedUser?.username || 'Không rõ'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{report.reportedUser?.email || ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Loại báo cáo</p>
              <p className="text-sm font-semibold text-gray-800">{CATEGORY_LABELS[report.category] || report.category}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Trạng thái hiện tại</p>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${STATUS_META[report.status]?.badge || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {STATUS_META[report.status]?.label || report.status}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Ngày tạo</p>
              <p className="text-sm font-semibold text-gray-800">{formatDateTime(report.createdAt)}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Ngữ cảnh</p>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p>Cuộc trò chuyện: {report.conversation?.name || report.conversation?._id || 'Không có'}</p>
              <p>Loại chat: {report.conversation?.isGroup || report.conversation?.type === 'group' || report.conversation?.type === 'community' ? 'Nhóm' : 'Cá nhân'}</p>
              <p>Tin nhắn: {report.message?.content || report.message?.fileName || 'Không đính kèm tin nhắn cụ thể'}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Mô tả từ người dùng</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {report.description || 'Không có mô tả thêm'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Cập nhật xử lý</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái mới</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="reviewing">Đang xem</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú nội bộ</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ghi chú cho đội moderation/admin..."
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50">
            Đóng
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'moderator'].includes(user.role || 'user')) {
      navigate('/chat');
    }
  }, [user, navigate]);

  const fetchReports = async (nextPage = page) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/reports`, {
        params: {
          page: nextPage,
          limit: 20,
          status: status || undefined,
          category: category || undefined,
        },
      });

      let items = data.data || [];

      if (search.trim()) {
        const kw = search.trim().toLowerCase();
        items = items.filter((item) => {
          const text = [
            item.reporter?.username,
            item.reporter?.email,
            item.reportedUser?.username,
            item.reportedUser?.email,
            item.description,
            item.message?.content,
            item.message?.fileName,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return text.includes(kw);
        });
      }

      setReports(items);
      setPagination(data.pagination || {
        page: nextPage,
        limit: 20,
        total: items.length,
        pages: 1,
      });
      setPage(nextPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, [status, category]);

  const handleRefresh = () => {
    fetchReports(page);
  };

  const handleUpdateLocal = (updated) => {
    setReports((prev) => prev.map((item) => (
      item._id === updated._id ? { ...item, ...updated } : item
    )));
  };

  if (!user || !['admin', 'moderator'].includes(user.role || 'user')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-gray-800">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h1 className="text-xl font-bold">Quản lý báo cáo</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Xem và xử lý các báo cáo spam, scam, quấy rối và nội dung vi phạm.
                </p>
              </div>

              <button onClick={handleRefresh} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo username, email, nội dung..."
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewing">Đang xem</option>
                <option value="resolved">Đã xử lý</option>
                <option value="rejected">Từ chối</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả loại báo cáo</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Không có báo cáo nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const meta = STATUS_META[report.status] || STATUS_META.pending;
                  const StatusIcon = meta.icon;

                  return (
                    <div key={report._id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition">
                      <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${meta.badge}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {meta.label}
                            </div>

                            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                              {CATEGORY_LABELS[report.category] || report.category}
                            </div>

                            <span className="text-xs text-gray-400">{formatDateTime(report.createdAt)}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Người báo cáo</p>
                              <p className="text-sm font-semibold text-gray-800">{report.reporter?.username || 'Không rõ'}</p>
                              <p className="text-xs text-gray-500">{report.reporter?.email || ''}</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Người bị báo cáo</p>
                              <p className="text-sm font-semibold text-gray-800">{report.reportedUser?.username || 'Không rõ'}</p>
                              <p className="text-xs text-gray-500">{report.reportedUser?.email || ''}</p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Mô tả</p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {report.description || 'Không có mô tả thêm'}
                            </p>
                          </div>
                        </div>

                        <div className="xl:w-44 flex xl:flex-col gap-2">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="flex-1 xl:w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
                          >
                            Xem chi tiết
                          </button>

                          {report.handledBy && (
                            <div className="flex-1 xl:w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Người xử lý</p>
                              <p className="text-sm font-semibold text-gray-700 mt-1">{report.handledBy.username}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Tổng: <span className="font-semibold text-gray-700">{pagination.total}</span> báo cáo
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReports(page - 1)}
                disabled={page <= 1 || loading}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm text-gray-600">
                Trang <span className="font-semibold">{pagination.page}</span> / {pagination.pages || 1}
              </span>

              <button
                onClick={() => fetchReports(page + 1)}
                disabled={page >= (pagination.pages || 1) || loading}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdate={handleUpdateLocal}
        />
      )}
    </div>
  );
}
