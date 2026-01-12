"use client";

import { useEffect } from "react";
import useAuth from "@/utils/useAuth";

export default function LogoutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    const logout = async () => {
      try {
        await signOut({
          callbackUrl: "/account/logout",
          redirect: false,
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    };
    logout();
  }, [signOut]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Water AI</h1>
          <p className="text-gray-600 text-lg">
            Track your hydration with AI-powered insights
          </p>
        </div>

        <div className="space-y-4 mt-8">
          <a
            href="/account/signin"
            className="block w-full bg-blue-500 text-white py-4 rounded-xl font-semibold text-center hover:bg-blue-600 transition-colors text-lg"
          >
            Login
          </a>

          <a
            href="/account/signup"
            className="block w-full bg-white text-blue-500 py-4 rounded-xl font-semibold text-center border-2 border-blue-500 hover:bg-blue-50 transition-colors text-lg"
          >
            Create an Account
          </a>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Stay hydrated, stay healthy
        </p>
      </div>
    </div>
  );
}
