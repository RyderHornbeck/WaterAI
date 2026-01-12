"use client";

import useUser from "@/utils/useUser";
import { useScrollDetection } from "@/hooks/useScrollDetection";
import { Navigation } from "@/components/LandingPage/Navigation";
import { ContactSection } from "@/components/LandingPage/ContactSection";
import { Footer } from "@/components/LandingPage/Footer";
import { Mail, MessageSquare, HelpCircle } from "lucide-react";

export default function ContactPage() {
  const { data: user } = useUser();
  const scrolled = useScrollDetection(20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 font-inter">
      <Navigation scrolled={scrolled} user={user} />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Get in{" "}
            <span className="bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-12">
            Have questions, feedback, or need support? We're here to help. Reach
            out and we'll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Quick Contact Options */}
      <section className="pb-16 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 text-center hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] rounded-full flex items-center justify-center">
                <Mail className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Email Support
              </h3>
              <p className="text-gray-600 mb-4">
                Send us an email and we'll respond within 24 hours
              </p>
              <a
                href="mailto:ryder@vegaproperties.com"
                className="text-[#0EA5E9] font-semibold hover:underline"
              >
                ryder@vegaproperties.com
              </a>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 text-center hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-[#06B6D4] to-[#0284C7] rounded-full flex items-center justify-center">
                <MessageSquare className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Feedback & Suggestions
              </h3>
              <p className="text-gray-600 mb-4">
                Have ideas to improve Water AI? We'd love to hear them
              </p>
              <a
                href="mailto:ryder@vegaproperties.com"
                className="text-[#0EA5E9] font-semibold hover:underline"
              >
                ryder@vegaproperties.com
              </a>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100 text-center hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] rounded-full flex items-center justify-center">
                <HelpCircle className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Help Center
              </h3>
              <p className="text-gray-600 mb-4">
                Find answers to common questions in our documentation
              </p>
              <a
                href="#faq"
                className="text-[#0EA5E9] font-semibold hover:underline"
              >
                View FAQ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <ContactSection />

      {/* FAQ Preview */}
      <section id="faq" className="py-24 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Common Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                How does the AI photo analysis work?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Our AI uses advanced computer vision to identify beverages and
                containers in your photos, then estimates the volume based on
                visual cues. It's trained on thousands of images to provide
                accurate hydration tracking in seconds.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Is my data private and secure?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Absolutely. All your photos and data are encrypted and stored
                securely. We never share your personal information with third
                parties, and you can delete your data at any time from the app
                settings.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Can I track other beverages besides water?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Yes! Our AI recognizes various beverages including coffee, tea,
                juice, smoothies, and more. The app tracks your total hydration
                from all liquids throughout the day.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                What happens if I cancel my Premium subscription?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                If you cancel, you'll keep Premium access until the end of your
                billing period. After that, you'll automatically switch to the
                Free plan, keeping all your historical data but with the Free
                plan limits.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105"
            >
              Contact Us
              <svg
                className="w-5 h-5"
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
