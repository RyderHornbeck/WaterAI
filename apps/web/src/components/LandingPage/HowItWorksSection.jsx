const steps = [
  {
    number: "01",
    title: "Take a Photo",
    description:
      "Snap a picture of your water bottle, glass, or any beverage container.",
  },
  {
    number: "02",
    title: "AI Analysis",
    description:
      "Our AI identifies the drink type and calculates the precise water content.",
  },
  {
    number: "03",
    title: "Instant Tracking",
    description:
      "Your hydration is logged automatically. View your progress in real-time.",
  },
  {
    number: "04",
    title: "Stay Consistent",
    description:
      "Build streaks, hit your goals, and develop lasting healthy habits.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-32 px-8 bg-gradient-to-br from-cyan-50 via-blue-50 to-white border-y border-blue-100"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 fade-up" id="how-header">
          <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-4 font-medium">
            Process
          </h2>
          <p className="text-4xl md:text-5xl font-light text-gray-900 max-w-3xl mx-auto">
            Four steps to intelligent hydration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="fade-up bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              id={`step-${idx}`}
            >
              <div className="mb-6">
                <div className="text-6xl font-light bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] bg-clip-text text-transparent">
                  {step.number}
                </div>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 font-light leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
