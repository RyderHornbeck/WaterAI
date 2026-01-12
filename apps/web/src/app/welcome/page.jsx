"use client";

import { useEffect, useState } from "react";

export default function WelcomePage() {
  const [signInUrl, setSignInUrl] = useState("/account/signin");

  useEffect(() => {
    // Read callbackUrl from URL parameters on client side
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");

    if (callbackUrl) {
      setSignInUrl(
        `/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Water Drop Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Ready to transform your hydration?
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-600 mb-12">
          Let's Begin your water tracking journey with Water ai
        </p>

        {/* Buttons */}
        <div className="space-y-4">
          <a
            href="/onboarding"
            className="block w-full bg-blue-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-600 transition-colors"
          >
            Let's go! 💧
          </a>

          <a
            href={signInUrl}
            className="block w-full bg-white text-gray-700 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-blue-300 transition-colors"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
