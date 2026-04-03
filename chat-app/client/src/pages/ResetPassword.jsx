import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import bg from '../assets/bg.png';
import logo from '../assets/logo.png';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // Điều kiện đơn giản: chỉ cần >= 6 ký tự là hợp lệ
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
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div
        className="
          w-full max-w-md
          bg-white/5
          backdrop-blur-xl
          border border-white/20
          shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
          hover:shadow-[0_10px_40px_0_rgba(31,38,135,0.6)]
          hover:border-white/60
          rounded-2xl
          p-10
          text-white
          transition-all duration-300
        "
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="logo" className="w-20 h-20 object-contain mb-4" />
          <h1 className="text-3xl font-bold">Đặt lại mật khẩu</h1>
          <p className="text-white/70 mt-1 text-sm">Nhập mật khẩu mới của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Mật khẩu mới */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mật khẩu mới"
                className="
                  w-full px-4 py-3 pr-12 rounded-xl
                  bg-transparent
                  border border-white/30
                  text-white placeholder-white/60
                  transition-all duration-300
                  focus:outline-none focus:border-white focus:bg-white/20
                  hover:border-white/60
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Điều kiện mật khẩu tối thiểu */}
            {form.password && (
              <div className="mt-2 px-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${hasMinLength ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${hasMinLength ? 100 : 35}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${hasMinLength ? 'text-green-200' : 'text-red-200'}`}>
                  {hasMinLength ? 'Đủ điều kiện (từ 6 ký tự)' : 'Mật khẩu phải có ít nhất 6 ký tự'}
                </p>
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Xác nhận mật khẩu mới"
              className={`
                w-full px-4 py-3 rounded-xl
                bg-transparent
                text-white placeholder-white/60
                transition-all duration-300
                focus:outline-none focus:border-white focus:bg-white/20
                hover:border-white/60
                border ${
                  form.confirmPassword && form.confirmPassword !== form.password
                    ? 'border-red-400/60'
                    : 'border-white/30'
                }
              `}
            />
            {form.confirmPassword && form.confirmPassword !== form.password && (
              <p className="text-xs text-red-300 mt-1 px-1">Mật khẩu không khớp</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !hasMinLength || form.password !== form.confirmPassword}
            className="w-full py-3 rounded-xl font-semibold
              bg-gradient-to-r from-blue-500 to-indigo-600
              text-white shadow-lg
              hover:scale-105 transition
              disabled:opacity-50 disabled:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý...
              </span>
            ) : (
              'Đặt lại mật khẩu'
            )}
          </button>

          <p className="text-center text-white/70 text-sm">
            <Link to="/login" className="text-white font-semibold hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
