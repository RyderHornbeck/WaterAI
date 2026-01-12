"use client";

import useUser from "@/utils/useUser";
import { useScrollDetection } from "@/hooks/useScrollDetection";
import { useSubscriptionCounter } from "@/hooks/useSubscriptionCounter";
import { Navigation } from "@/components/LandingPage/Navigation";
import { MissionSection } from "@/components/LandingPage/MissionSection";
import { CleanWaterImpactSection } from "@/components/LandingPage/CleanWaterImpactSection";
import { Footer } from "@/components/LandingPage/Footer";

export default function CharityPage() {
  const { data: user } = useUser();
  const scrolled = useScrollDetection(20);
  const subscriptionCount = useSubscriptionCounter(1247, 2000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 font-inter">
      <Navigation scrolled={scrolled} user={user} />

      {/* Hero Section for Charity Page */}
      <section className="pt-40 pb-20 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Our Impact on{" "}
            <span className="bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent">
              Clean Water Access
            </span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-12">
            Every premium subscription helps bring clean water to families in
            need. Together, we're making a real difference.
          </p>
        </div>
      </section>

      <MissionSection />
      <CleanWaterImpactSection subscriptionCount={subscriptionCount} />

      {/* Additional Impact Stats */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            How Your Subscription Makes a Difference
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] rounded-full flex items-center justify-center">
                <span className="text-4xl">💧</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                3 Months of Clean Water
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Every premium subscription provides 3 months of clean water
                access to a family in need through our partner organizations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#06B6D4] to-[#0284C7] rounded-full flex items-center justify-center">
                <span className="text-4xl">🌍</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Global Reach
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We partner with verified charities working in communities across
                Africa, Asia, and Latin America where clean water access is most
                critical.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] rounded-full flex items-center justify-center">
                <span className="text-4xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                100% Transparency
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We track and report every donation. You can see exactly how many
                months of clean water your subscription has provided.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              Subscribe & Make an Impact
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
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
