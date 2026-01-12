export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marathon Runner",
      avatar: "👩‍🦰",
      text: "Water AI completely changed how I track hydration during training. The photo recognition is incredibly accurate, and I love that my subscription helps families get clean water.",
      rating: 5,
    },
    {
      name: "Michael Rodriguez",
      role: "Software Engineer",
      avatar: "👨‍💼",
      text: "Finally, a hydration app that doesn't feel like homework. Snap a photo and done. The AI is impressively smart.",
      rating: 5,
    },
    {
      name: "Dr. Emily Watson",
      role: "Nutritionist",
      avatar: "👩‍⚕️",
      text: "I recommend Water AI to my clients. The science-backed calculations and detailed analytics make it the best hydration tracker available.",
      rating: 5,
    },
  ];

  return (
    <section className="py-32 px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20 fade-up">
          <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-4 font-medium">
            Testimonials
          </h2>
          <p className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
            Trusted by thousands
          </p>
          <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
            Real people getting real results with Water AI
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="fade-up bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1"
            >
              {/* Star Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 mb-6 leading-relaxed italic">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-blue-100">
                <div className="text-4xl">{testimonial.avatar}</div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="fade-up bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-12 border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent mb-2">
                4.8/5
              </div>
              <div className="text-sm text-gray-600 font-medium">
                App Store Rating
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-[#06B6D4] to-[#0284C7] bg-clip-text text-transparent mb-2">
                10K+
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Active Users
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] bg-clip-text text-transparent mb-2">
                500K+
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Photos Analyzed
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent mb-2">
                98%
              </div>
              <div className="text-sm text-gray-600 font-medium">
                User Satisfaction
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
