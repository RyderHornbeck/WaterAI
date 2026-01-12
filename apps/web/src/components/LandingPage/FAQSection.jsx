import { useState } from "react";

const faqs = [
  {
    q: "How accurate is the AI recognition?",
    a: "Our AI combines computer vision and machine learning to achieve 95%+ accuracy in identifying beverage containers and calculating water content. It learns from millions of drink images.",
  },
  {
    q: "What if I drink something other than water?",
    a: "Water AI tracks all beverages and calculates their hydration value. Coffee, tea, juice, and other drinks are analyzed for their actual water content contribution.",
  },
  {
    q: "How is my daily goal calculated?",
    a: "We use scientifically-backed formulas that consider your age, gender, weight, height, activity level, climate, and workout frequency to recommend a personalized hydration goal.",
  },
  {
    q: "Is my data private and secure?",
    a: "Absolutely. Your photos and data are encrypted and stored securely. We never sell your information. You can delete your data at any time.",
  },
  {
    q: "Can I use it offline?",
    a: "The app requires internet connection for AI analysis, but you can view your history and stats offline. Manual entry is always available.",
  },
];

export function FAQSection() {
  const [activeQuestion, setActiveQuestion] = useState(null);

  return (
    <section
      id="faq"
      className="py-32 px-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-y border-blue-100"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-20 fade-up" id="faq-header">
          <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-4 font-medium">
            Questions
          </h2>
          <p className="text-4xl md:text-5xl font-light text-gray-900">
            Frequently asked questions
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="fade-up bg-white/80 backdrop-blur-sm border border-blue-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all"
              id={`faq-${idx}`}
            >
              <button
                onClick={() =>
                  setActiveQuestion(activeQuestion === idx ? null : idx)
                }
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-blue-50/50 transition-colors"
              >
                <span className="text-lg font-medium text-gray-900">
                  {faq.q}
                </span>
                <span
                  className={`text-2xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] bg-clip-text text-transparent transform transition-transform ${activeQuestion === idx ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${activeQuestion === idx ? "max-h-96" : "max-h-0"}`}
              >
                <div className="px-8 pb-6 text-gray-600 leading-relaxed font-light">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
