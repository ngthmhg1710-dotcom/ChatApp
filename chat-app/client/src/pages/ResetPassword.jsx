import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";
import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function ResetPassword() {

  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {

      setLoading(true);

        await api.post(`/api/auth/reset-password/${token}`, {
    password
    });

      toast.success("Password reset successful!");

      navigate("/login");

    } catch (error) {

      toast.error(error.response?.data?.message || "Reset failed");

    } finally {

      setLoading(false);

    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-10 text-white">

        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="logo" className="w-32 h-32 object-contain mb-4"/>
          <h1 className="text-3xl font-bold">Reset Password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <input
            type="password"
            placeholder="New Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/30 text-white placeholder-white/60 focus:border-white focus:bg-white/20"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/30 text-white placeholder-white/60 focus:border-white focus:bg-white/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 transition"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

        </form>

      </div>
    </div>
  );
}