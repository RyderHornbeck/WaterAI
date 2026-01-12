export function ContactSection() {
  return (
    <section id="contact" className="py-32 px-8 bg-white">
      <div className="max-w-4xl mx-auto text-center fade-up">
        <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-6 font-medium">
          Contact
        </h2>
        <p className="text-4xl md:text-5xl font-light text-gray-900 mb-8">
          Get in touch
        </p>
        <p className="text-xl text-gray-600 mb-10 font-light">
          Questions, feedback, or support inquiries
        </p>
        <a
          href="mailto:ryder@vegaproperties.com"
          className="inline-block px-8 py-4 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-lg font-medium text-lg hover:shadow-lg transition-all hover:scale-105"
        >
          ryder@vegaproperties.com
        </a>
      </div>
    </section>
  );
}
