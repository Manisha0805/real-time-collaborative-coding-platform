import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FaCode,
  FaUser,
  FaEnvelope,
  FaLock,
  FaGoogle,
} from "react-icons/fa";

import {
  signupUser,
  firebaseLogin,
} from "../../API/auth.api";

import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

import { auth } from "../../firebase";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
  // EMAIL SIGNUP
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      name,
      email,
      password,
      confirmPassword,
    } = formData;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (cleanName.length < 2) {
      setError(
        "Name must be at least 2 characters long."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("SIGNUP DATA:", {
        name: cleanName,
        email: cleanEmail,
        password,
      });

      const response = await signupUser({
        name: cleanName,
        email: cleanEmail,
        password,
      });

      console.log(
        "SIGNUP RESPONSE:",
        response.data
      );

      if (response.data.success) {
        localStorage.setItem(
          "token",
          response.data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );

        navigate("/");
      }
    } catch (error) {
      console.error(
        "Signup Error:",
        error
      );

      console.error(
        "Backend Response:",
        error.response?.data
      );

      setError(
        error.response?.data?.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GOOGLE SIGNUP
  // =========================
  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError("");

      const provider =
        new GoogleAuthProvider();

      const result =
        await signInWithPopup(
          auth,
          provider
        );

      console.log(
        "Google User:",
        result.user
      );

      // Get Firebase ID Token
      const firebaseToken =
        await result.user.getIdToken();

      // Send Firebase token to backend
      const response =
        await firebaseLogin(
          firebaseToken
        );

      console.log(
        "Firebase Signup Response:",
        response.data
      );

      if (response.data.success) {
        localStorage.setItem(
          "token",
          response.data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            response.data.user
          )
        );

        navigate("/");
      }
    } catch (error) {
      console.error(
        "Google Signup Error:",
        error
      );

      console.error(
        "Backend Response:",
        error.response?.data
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Google signup failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-5">

          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <FaCode className="text-cyan-400 text-2xl" />
          </div>

          <h1 className="text-2xl font-bold text-white mt-3">
            Create Account
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Join CodeSync today
          </p>

        </div>

        {/* Card */}
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
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            <FaGoogle className="text-red-400" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">

            <div className="h-px flex-1 bg-slate-800" />

            <span className="text-xs text-slate-500">
              OR
            </span>

            <div className="h-px flex-1 bg-slate-800" />

          </div>

          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div className="mb-3">

              <label className="block text-sm text-slate-300 mb-1">
                Name
              </label>

              <div className="relative">

                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  autoComplete="name"
                  maxLength={100}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500"
                />

              </div>

            </div>

            {/* Email */}
            <div className="mb-3">

              <label className="block text-sm text-slate-300 mb-1">
                Email
              </label>

              <div className="relative">

                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500"
                />

              </div>

            </div>

            {/* Password */}
            <div className="mb-3">

              <label className="block text-sm text-slate-300 mb-1">
                Password
              </label>

              <div className="relative">

                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500"
                />

              </div>

            </div>

            {/* Confirm Password */}
            <div className="mb-4">

              <label className="block text-sm text-slate-300 mb-1">
                Confirm Password
              </label>

              <div className="relative">

                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />

                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500"
                />

              </div>

            </div>

            {/* Signup */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Account"}
            </button>

          </form>

          {/* Login */}
          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account?{" "}

            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Sign In
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default Signup;