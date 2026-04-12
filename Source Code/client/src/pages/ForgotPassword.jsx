import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import { Loader2, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setSent(true);
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

        {/* Nút quay lại */}
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
              <Mail className="w-7 h-7 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quên mật khẩu?</h2>
          <p className="text-gray-400 text-sm mt-2">Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu</p>
        </div>

        {sent ? (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-lg">Email đã được gửi!</p>
              <p className="text-gray-400 text-sm mt-2">
                Kiểm tra hộp thư và làm theo hướng dẫn. Link có hiệu lực trong{' '}
                <span className="text-gray-700 font-semibold">30 phút</span>.
              </p>
            </div>
            <p className="text-gray-300 text-xs">Không thấy email? Kiểm tra mục Spam.</p>
            <Link
              to="/login"
              className="block w-full py-4 bg-[#1d75f2] hover:bg-[#1660d1] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-center active:scale-[0.98]"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="emailcuaban@gmail.com"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-[#1d75f2] hover:bg-[#1660d1] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Gửi link đặt lại mật khẩu'
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm font-medium">
                Nhớ mật khẩu rồi?{' '}
                <Link to="/login" className="text-indigo-600 font-black hover:underline transition">
                  Đăng nhập
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
