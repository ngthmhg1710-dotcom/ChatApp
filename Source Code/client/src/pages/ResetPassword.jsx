import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import logo from '../assets/logo.png';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const hasMinLength = form.password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.password || !form.confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/auth/reset-password/${token}`, {
        password: form.password,
      });
      toast.success('Đặt lại mật khẩu thành công!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Link không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] font-sans relative">

      {/* Brand Logo */}
      <div className="absolute top-10 left-10 z-10 flex items-center gap-3">
        <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
          <img src={logo} alt="logo" className="w-8 h-8 object-contain brightness-0 invert" />
        </div>
        <span className="text-white font-bold text-2xl tracking-tight">Lumi</span>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[460px] bg-white rounded-[35px] p-10 md:p-14 shadow-2xl mx-4">

        {/* Back link */}
        <Link
          to="/login"
          className="flex items-center gap-1 text-gray-400 hover:text-indigo-600 text-sm font-medium transition mb-6 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại
        </Link>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <KeyRound className="w-7 h-7 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Đặt lại mật khẩu</h2>
          <p className="text-gray-400 text-sm mt-2">Nhập mật khẩu mới của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Mật khẩu mới */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength bar */}
            {form.password && (
              <div className="mt-2 px-1">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${hasMinLength ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${hasMinLength ? 100 : 35}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${hasMinLength ? 'text-green-500' : 'text-red-400'}`}>
                  {hasMinLength ? 'Đủ điều kiện (từ 6 ký tự)' : 'Mật khẩu phải có ít nhất 6 ký tự'}
                </p>
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-5 py-3.5 bg-white border rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 ${
                  form.confirmPassword && form.confirmPassword !== form.password
                    ? 'border-red-300'
                    : 'border-gray-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.confirmPassword && form.confirmPassword !== form.password && (
              <p className="text-xs text-red-400 mt-1 px-1">Mật khẩu không khớp</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !hasMinLength || form.password !== form.confirmPassword}
            className="w-full py-4 mt-2 bg-[#1d75f2] hover:bg-[#1660d1] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Đặt lại mật khẩu'
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm font-medium">
              Nhớ mật khẩu rồi?{' '}
              <Link to="/login" className="text-indigo-600 font-black hover:underline transition">
                Đăng nhập
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
