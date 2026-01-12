"use client";

import useUser from "@/utils/useUser";
import { useScrollDetection } from "@/hooks/useScrollDetection";
import { Navigation } from "@/components/LandingPage/Navigation";
import { Footer } from "@/components/LandingPage/Footer";
import { Check } from "lucide-react";

export default function PricingPage() {
  const { data: user } = useUser();
  const scrolled = useScrollDetection(20);

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with hydration tracking",
      features: [
        "Unlimited water tracking",
        "AI photo analysis (5/day)",
        "Manual entry tracking",
        "Daily hydration insights",
        "7-day history",
        "Basic stats & analytics",
      ],
      cta: "Get Started Free",
      href: "/onboarding",
      popular: false,
    },
    {
      name: "Premium",
      price: "$4.99",
      period: "/month",
      description: "Unlock the full power of AI-driven hydration tracking",
      features: [
        "Everything in Free",
        "Unlimited AI photo analysis",
        "Unlimited text descriptions",
        "Advanced analytics & insights",
        "Unlimited history",
        "Smart notifications",
        "Export your data",
        "Priority support",
        "3 months of clean water donated",
      ],
      cta: "Start Premium",
      href: "/onboarding",
      popular: true,
      impact: "💧 Provides clean water for a family for 3 months",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 font-inter">
      <Navigation scrolled={scrolled} user={user} />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4">
            Start free, upgrade anytime. Every premium subscription helps
            provide clean water to families in need.
          </p>
          <p className="text-sm text-gray-600">
            All plans include our core AI-powered water tracking features
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-3xl shadow-xl p-8 border-2 transition-all hover:shadow-2xl hover:-translate-y-2 ${
                  plan.popular
                    ? "border-[#0EA5E9] ring-4 ring-blue-100"
                    : "border-blue-100"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-xl text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                  {plan.impact && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                      <p className="text-sm font-semibold text-[#0EA5E9]">
                        {plan.impact}
                      </p>
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center mt-0.5">
                        <Check size={16} className="text-white" />
                      </div>
                      <span className="text-gray-700 flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.href}
                  className={`block w-full py-4 rounded-xl font-bold text-center transition-all hover:shadow-lg hover:scale-105 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Can I try Premium before subscribing?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Yes! Start with our Free plan to experience AI-powered water
                tracking with 5 photo analyses per day. Upgrade to Premium
                anytime for unlimited AI features and advanced analytics.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                How does the clean water donation work?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Every Premium subscription provides 3 months of clean water
                access to a family in need through our verified charity
                partners. We track and report the impact transparently.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Absolutely. You can cancel your Premium subscription at any time
                through the app settings. You'll continue to have Premium access
                until the end of your billing period.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We accept all major credit cards, debit cards, and Apple Pay
                through our secure payment processor. Your payment information
                is encrypted and never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
