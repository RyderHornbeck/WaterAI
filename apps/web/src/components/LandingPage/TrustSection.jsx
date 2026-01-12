export function TrustSection() {
  return (
    <section className="py-32 px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20 fade-up" id="trust-header">
          <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-4 font-medium">
            Foundation
          </h2>
          <p className="text-4xl md:text-5xl font-light text-gray-900">
            Built on trust and science
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="fade-up text-center bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100 hover:shadow-xl transition-all hover:scale-105">
            <div className="text-5xl mb-6">🔒</div>
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              Privacy First
            </h3>
            <p className="text-gray-600 font-light leading-relaxed">
              Your data is encrypted and never sold. Full control over your
              information.
            </p>
          </div>
          <div className="fade-up-delay-1 text-center bg-gradient-to-br from-cyan-50 to-white rounded-2xl p-8 border border-blue-100 hover:shadow-xl transition-all hover:scale-105">
            <div className="text-5xl mb-6">🔬</div>
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              Science-Backed
            </h3>
            <p className="text-gray-600 font-light leading-relaxed">
              Hydration formulas based on peer-reviewed research and medical
              guidelines.
            </p>
          </div>
          <div className="fade-up-delay-2 text-center bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100 hover:shadow-xl transition-all hover:scale-105">
            <div className="text-5xl mb-6">🤖</div>
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              AI-Powered
            </h3>
            <p className="text-gray-600 font-light leading-relaxed">
              Advanced machine learning trained on millions of beverage images.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
