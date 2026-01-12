export function HeroSection() {
  return (
    <section
      className="pt-40 pb-32 px-8"
      style={{ opacity: 1, transform: "none" }}
    >
      <div className="max-w-6xl mx-auto">
        <div
          className="text-center max-w-4xl mx-auto"
          style={{ opacity: 1, transform: "none" }}
        >
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            Water AI
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#0EA5E9] via-[#06B6D4] to-[#0284C7] bg-clip-text text-transparent mb-8">
            Track Water Instantly with AI
          </h2>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-light mb-12 max-w-3xl mx-auto">
            Snap a photo. Get instant hydration tracking. Stay healthy while
            helping bring clean water to families in need.
          </p>

          {/* Primary CTA - HIGHEST IMPACT IMPROVEMENT */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:-translate-y-1"
            >
              Start Tracking Free
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            <a
              href="#impact"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#0EA5E9] border-2 border-[#0EA5E9] rounded-xl font-semibold text-xl hover:bg-blue-50 transition-all hover:scale-105"
            >
              <span>See Our Impact</span>
              <span>💧</span>
            </a>
          </div>
          <p className="text-sm text-gray-600">
            Free forever. No credit card required.{" "}
            <strong className="text-[#0EA5E9]">
              3 months of clean water donated
            </strong>{" "}
            with every premium subscription.
          </p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-24 max-w-5xl mx-auto">
          <div
            className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1"
            style={{ opacity: 1, transform: "none" }}
          >
            <div className="text-5xl font-light bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent mb-2">
              90%
            </div>
            <div className="text-gray-700 text-sm uppercase tracking-wider font-medium">
              AI Accuracy
            </div>
          </div>
          <div
            className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1"
            style={{ opacity: 1, transform: "none" }}
          >
            <div className="text-5xl font-light bg-gradient-to-r from-[#06B6D4] to-[#0284C7] bg-clip-text text-transparent mb-2">
              ~5 sec
            </div>
            <div className="text-gray-700 text-sm uppercase tracking-wider font-medium">
              Average Analysis Time
            </div>
          </div>
          <div
            className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1"
            style={{ opacity: 1, transform: "none" }}
          >
            <div className="text-5xl font-light bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] bg-clip-text text-transparent mb-2">
              100%
            </div>
            <div className="text-gray-700 text-sm uppercase tracking-wider font-medium">
              Privacy Protected
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
