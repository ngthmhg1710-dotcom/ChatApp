import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email đã được xác thực! Bạn có thể đăng nhập.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) navigate("/chat");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Khung kính mờ */}
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
          <div className="mb-4">
            <img
              src={logo}
              alt="logo"
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold">Chào mừng trở lại</h1>
          <p className="text-white/80 mt-1">Đăng nhập để kết nối với bạn bè</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email"
              className="
                w-full px-4 py-3 rounded-xl
                bg-transparent
                border border-white/30
                text-white
                placeholder-white/60
                transition-all duration-300
                focus:outline-none
                focus:border-white
                focus:bg-white/20
                hover:border-white/60
              "
            />
          </div>

          {/* Mật khẩu */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Mật khẩu"
                className="
                  w-full px-4 py-3 pr-12 rounded-xl
                  bg-transparent
                  border border-white/30
                  text-white
                  placeholder-white/60
                  transition-all duration-300
                  focus:outline-none
                  focus:border-white
                  focus:bg-white/20
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
            {/* Quên mật khẩu */}
            <div className="text-right mt-2">
              <Link
                to="/forgot-password"
                className="text-white/70 text-sm hover:text-white hover:underline transition"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>

          {/* Nút đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold
              bg-gradient-to-r from-blue-500 to-indigo-600
              text-white
              shadow-lg
              hover:scale-105
              transition
              disabled:opacity-50"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        {/* Đăng ký */}
        <p className="mt-4 text-center text-white/80">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-white font-semibold hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
