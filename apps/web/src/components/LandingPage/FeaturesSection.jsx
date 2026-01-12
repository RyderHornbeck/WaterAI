const features = [
  {
    icon: "📸",
    title: "AI-Powered Recognition",
    description:
      "Simply snap a photo of your drink. Our advanced AI instantly identifies the beverage and calculates the exact water content.",
  },
  {
    icon: "💧",
    title: "Smart Hydration Tracking",
    description:
      "Get personalized daily goals based on your body metrics, activity level, and climate. Track every drop effortlessly.",
  },
  {
    icon: "📊",
    title: "Insights & Analytics",
    description:
      "Visualize your hydration patterns with beautiful charts, streaks, and weekly summaries. Understand your habits and stay consistent.",
  },
  {
    icon: "🎯",
    title: "Personalized Recommendations",
    description:
      "Receive tailored hydration goals calculated from your age, weight, activity level, and environmental factors.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 fade-up" id="features-header">
          <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-4 font-medium">
            Platform Capabilities
          </h2>
          <p className="text-4xl md:text-5xl font-light text-gray-900 max-w-3xl mx-auto">
            Enterprise-grade features for personal health
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="fade-up bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 hover:shadow-xl transition-all hover:scale-105"
              id={`feature-${idx}`}
            >
              <div className="text-5xl mb-6">{feature.icon}</div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg font-light">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
