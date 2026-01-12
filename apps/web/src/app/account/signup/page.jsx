"use client";

import { useState } from "react";
import useAuth from "@/utils/useAuth";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUpWithCredentials } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();

    // Prevent double-submission
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // Trim whitespace from inputs
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Input validation
      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        throw new Error("All fields are required");
      }

      // Name validation
      if (trimmedName.length < 2) {
        throw new Error("Name must be at least 2 characters");
      }

      if (trimmedName.length > 50) {
        throw new Error("Name must be less than 50 characters");
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      // Password strength validation
      if (trimmedPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (trimmedPassword.length > 128) {
        throw new Error("Password must be less than 128 characters");
      }

      // Use the platform's auth hook - this properly sets session cookies
      await signUpWithCredentials({
        email: trimmedEmail,
        password: trimmedPassword,
        name: trimmedName,
        callbackUrl: "/onboarding",
        redirect: true,
      });
    } catch (err) {
      console.error("Signup error:", err);

      // Handle specific auth errors
      const errorMessages = {
        EmailCreateAccount:
          "This email is already registered. Try signing in instead.",
        Configuration:
          "Sign-up isn't working right now. Please try again later.",
      };

      setError(errorMessages[err.message] || err.message || "Sign up failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md relative">
        <a
          href="/"
          className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </a>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">Start your hydration journey</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Your name"
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href="/account/signin"
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              Sign In
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
