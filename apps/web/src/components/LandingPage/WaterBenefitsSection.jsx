export function WaterBenefitsSection() {
  const benefits = [
    {
      number: "1️⃣",
      title: "Water literally fuels your brain",
      description:
        "Just 1–2% dehydration has been shown to impair attention, memory, and reaction time—meaning your brain can perform worse before you even feel thirsty.",
    },
    {
      number: "2️⃣",
      title: "Dehydration quietly drains your energy",
      description:
        "Losing only 2% of body water can reduce physical performance by 10–20% and significantly increase fatigue, making everyday tasks feel harder than they should.",
    },
    {
      number: "3️⃣",
      title: "Water helps control hunger without willpower",
      description:
        "Drinking about 500 mL (17 oz) of water before meals can reduce calorie intake by up to 13%, and studies show many people confuse thirst with hunger.",
    },
    {
      number: "4️⃣",
      title: "Your organs depend on water to survive long-term",
      description:
        "Proper hydration can lower the risk of kidney stones by up to 50%, while chronic dehydration is linked to increased risk of kidney and cardiovascular disease.",
    },
    {
      number: "5️⃣",
      title: "Drinking enough water improves how you feel every single day",
      description:
        "Even mild dehydration increases headaches, irritability, and tiredness, while studies show improved mood and alertness when people increase daily water intake.",
    },
  ];

  return (
    <section className="py-24 px-8 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Does tracking water really matter?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The science is clear: proper hydration transforms your physical and
            mental performance.
          </p>
        </div>

        <div className="space-y-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-blue-100"
              style={{ opacity: 1, transform: "none" }}
            >
              <div className="flex gap-6">
                <div className="text-4xl flex-shrink-0">{benefit.number}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Start Tracking Your Hydration
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
  );
}
