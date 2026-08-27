import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FaCode, FaEnvelope, FaLock, FaGoogle } from "react-icons/fa";

import { loginUser, firebaseLogin } from "../../API/auth.api";

import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

import { auth } from "../../firebase";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // INPUT CHANGE
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // =========================
  // EMAIL LOGIN
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await loginUser({
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);

        localStorage.setItem("user", JSON.stringify(response.data.user));

        navigate("/");
      }
    } catch (error) {
      console.error("Email Login Error:", error);

      setError(error.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GOOGLE LOGIN
  // =========================
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      const firebaseToken = await result.user.getIdToken();

      const response = await firebaseLogin(firebaseToken);

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);

        localStorage.setItem("user", JSON.stringify(response.data.user));

        navigate("/");
      }
    } catch (error) {
      console.error("Google Login Error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Google login failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <FaCode className="text-cyan-400 text-2xl" />
          </div>

          <h1 className="text-2xl font-bold text-white mt-4">Welcome Back</h1>

          <p className="text-slate-400 text-sm mt-1">
            Sign in to continue to CodeSync
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            <FaGoogle className="text-red-400" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-slate-800" />

            <span className="text-xs text-slate-500">OR</span>

            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Email</label>

              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Signup */}
          <p className="text-center text-sm text-slate-400 mt-5">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Create Account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          CodeSync • Real-Time Collaborative Coding
        </p>
      </div>
    </div>
  );
}

export default Login;
