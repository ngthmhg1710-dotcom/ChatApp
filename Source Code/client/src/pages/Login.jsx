import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
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
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = formData.email.trim();
    const password = formData.password;

    if (!email) return toast.error('Vui lòng nhập email');
    if (password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự');

    // Chú ý: Đảm bảo authStore nhận đúng object {email, password}
    const success = await login({ email, password });
    if (success) navigate("/chat");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans bg-white">
      
      {/* BÊN TRÁI: WELCOME LUMI */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-violet-500/30 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 blur-[130px] rounded-full"></div>

        <div className="z-10 flex items-center gap-3">
           <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
             <img src={logo} alt="logo" className="w-8 h-8 object-contain brightness-0 invert" />
           </div>
           <span className="text-white font-bold text-2xl tracking-tight">Lumi</span>
        </div>

        <div className="z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-400/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium mb-6">
            <Sparkles size={14} />
            <span>Hệ thống chat app kết nối cộng đồng</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-8">
            Chào mừng đến với <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-200">Lumi.</span>
          </h1>
          <p className="text-indigo-100/70 text-xl leading-relaxed">
            Trang web giúp kết nối mọi người, sẻ chia khoảnh khắc và làm việc hiệu quả hơn trong không gian bảo mật, hiện đại.
          </p>
        </div>

        <div className="z-10 text-indigo-300/40 text-sm">
          © 2026 Lumi Chat App.
        </div>
      </div>

      {/* BÊN PHẢI: FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-20 bg-gray-50/50">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight text-center md:text-left">Đăng nhập</h2>
            <p className="text-gray-500 text-lg text-center md:text-left">Vui lòng nhập thông tin tài khoản Lumi.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Địa chỉ Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="emailcuaban@gmail.com"
                  className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-black font-medium placeholder:text-gray-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-gray-700">Mật khẩu</label>
                <Link to="/forgot-password" intrinsic="true" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold transition">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full pl-11 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-black font-medium placeholder:text-gray-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {/* NÚT ĐĂNG NHẬP: DÀI, BO VUÔNG, MÀU XANH PHẲNG */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg font-bold bg-[#1d70f1] text-white text-lg shadow-md hover:bg-[#1964d8] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-600 font-medium">
              Bạn là thành viên mới?{" "}
              <Link to="/register" intrinsic="true" className="text-indigo-600 font-black hover:underline transition">
                Tạo tài khoản Lumi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}