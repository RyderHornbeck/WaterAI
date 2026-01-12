export function MissionSection() {
  return (
    <section className="py-24 px-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-y border-blue-100">
      <div
        className="max-w-4xl mx-auto"
        style={{ opacity: 1, transform: "none" }}
      >
        <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-6 text-center font-medium">
          Our Mission
        </h2>
        <p className="text-3xl md:text-4xl text-gray-900 leading-relaxed text-center font-light">
          Proper hydration is critical to health, yet tracking water intake
          remains tedious and inaccurate. We've built an intelligent system that
          makes hydration monitoring effortless and precise through advanced AI
          technology.
        </p>
      </div>
    </section>
  );
}
