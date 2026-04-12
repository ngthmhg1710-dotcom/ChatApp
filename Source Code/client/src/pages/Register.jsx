import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Vui lòng nhập tên người dùng');
      return;
    }
    if (!formData.gender) {
      toast.error('Vui lòng chọn giới tính');
      return;
    }
    const { confirmPassword, ...registerData } = formData;
    const success = await register(registerData);
    if (success) {
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      navigate('/login');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] font-sans relative">
      
      {/* Brand Logo Lumi ở góc trên trái */}
      <div className="absolute top-10 left-10 z-10 flex items-center gap-3">
        <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
          <img src={logo} alt="logo" className="w-8 h-8 object-contain brightness-0 invert" />
        </div>
        <span className="text-white font-bold text-2xl tracking-tight">Lumi</span>
      </div>

      {/* Card Đăng ký trắng căn giữa */}
      <div className="relative z-10 w-full max-w-[460px] bg-white rounded-[35px] p-10 md:p-14 shadow-2xl mx-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Tạo tài khoản</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tên tài khoản */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Tên người dùng</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Nhập tên người dùng"
              className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="emailcuaban@gmail.com"
              className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Mật khẩu */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Giới tính */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Giới tính</label>
            <div className="flex gap-3">
              {[
                { value: 'male', label: 'Nam' },
                { value: 'female', label: 'Nữ' },
                { value: 'other', label: 'Khác' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border cursor-pointer transition-all text-sm font-semibold select-none
                    ${formData.gender === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400'
                    }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={formData.gender === opt.value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Nút Đăng ký */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-[#1d75f2] hover:bg-[#1660d1] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Đăng ký ngay"
            )}
          </button>
        </form>

        {/* Link chuyển sang Đăng nhập */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 text-sm font-medium">
            Đã có tài khoản??{" "}
            <Link to="/login" className="text-indigo-600 font-black hover:underline transition">
               Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
