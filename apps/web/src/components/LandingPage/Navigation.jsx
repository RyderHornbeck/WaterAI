import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Navigation({ scrolled, user }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 ${
          scrolled
            ? "bg-white/90 backdrop-blur-sm shadow-md"
            : "bg-white shadow-sm"
        }`}
        style={{ transition: "none" }}
      >
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="https://ucarecdn.com/da3f3549-c70d-42b7-b757-fe06ec027b6a/-/format/auto/"
              alt="Water AI Logo"
              className="w-9 h-9 object-contain"
            />
            <span className="text-xl font-semibold text-gray-900">
              Water AI
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="/"
              className="text-gray-600 hover:text-[#0EA5E9] transition-all text-sm font-medium hover:scale-105"
            >
              Home
            </a>
            <a
              href="/charity"
              className="text-gray-600 hover:text-[#0EA5E9] transition-all text-sm font-medium hover:scale-105 flex items-center gap-1"
            >
              <span>Our Impact</span>
              <span className="text-xs">💧</span>
            </a>
            <a
              href="/pricing"
              className="text-gray-600 hover:text-[#0EA5E9] transition-all text-sm font-medium hover:scale-105"
            >
              Pricing
            </a>
            <a
              href="/contact"
              className="text-gray-600 hover:text-[#0EA5E9] transition-all text-sm font-medium hover:scale-105"
            >
              Contact
            </a>
            {user ? (
              <a
                href="/onboarding"
                className="px-5 py-2 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
              >
                Open App
              </a>
            ) : (
              <a
                href="/onboarding"
                className="px-5 py-2 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
              >
                Get Started
              </a>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-[#F0F9FF] hover:bg-[#E0F2FE] transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X size={24} className="text-[#0EA5E9]" />
            ) : (
              <Menu size={24} className="text-[#0EA5E9]" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img
                src="https://ucarecdn.com/da3f3549-c70d-42b7-b757-fe06ec027b6a/-/format/auto/"
                alt="Water AI Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-semibold text-gray-900">
                Water AI
              </span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-6">
            <a
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-[#F0F9FF] hover:text-[#0EA5E9] transition-colors border-l-4 border-transparent hover:border-[#0EA5E9]"
            >
              <span className="text-xl">🏠</span>
              <span className="font-medium">Home</span>
            </a>
            <a
              href="/charity"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-[#F0F9FF] hover:text-[#0EA5E9] transition-colors border-l-4 border-transparent hover:border-[#0EA5E9]"
            >
              <span className="text-xl">💧</span>
              <span className="font-medium">Our Impact</span>
            </a>
            <a
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-[#F0F9FF] hover:text-[#0EA5E9] transition-colors border-l-4 border-transparent hover:border-[#0EA5E9]"
            >
              <span className="text-xl">💎</span>
              <span className="font-medium">Pricing</span>
            </a>
            <a
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-[#F0F9FF] hover:text-[#0EA5E9] transition-colors border-l-4 border-transparent hover:border-[#0EA5E9]"
            >
              <span className="text-xl">✉️</span>
              <span className="font-medium">Contact</span>
            </a>
          </div>

          {/* Menu Footer */}
          <div className="p-6 border-t border-gray-200">
            {user ? (
              <a
                href="/onboarding"
                onClick={() => setMenuOpen(false)}
                className="block w-full px-5 py-3 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-lg text-center font-semibold hover:shadow-lg transition-all"
              >
                Open App
              </a>
            ) : (
              <a
                href="/onboarding"
                onClick={() => setMenuOpen(false)}
                className="block w-full px-5 py-3 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-lg text-center font-semibold hover:shadow-lg transition-all"
              >
                Get Started Free
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Overlay when menu is open */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
