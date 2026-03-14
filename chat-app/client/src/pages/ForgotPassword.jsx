import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import bg from "../assets/bg.png";
import logo from "../assets/logo.png";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      setLoading(true);

    await api.post("/api/auth/forgot-password", { email });
      toast.success("Reset password email sent! Check your inbox.");

      setEmail("");

    } catch (error) {

      toast.error(error.response?.data?.message || "Something went wrong");

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
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-white/70 mt-1">Enter your email to reset password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/30 text-white placeholder-white/60 focus:border-white focus:bg-white/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

        </form>

        <p className="mt-6 text-center text-white/80">
          Remember password?{" "}
          <Link to="/login" className="font-semibold hover:underline">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}