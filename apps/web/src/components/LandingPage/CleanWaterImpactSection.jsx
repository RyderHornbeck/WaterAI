export function CleanWaterImpactSection({ subscriptionCount }) {
  return (
    <section
      id="impact"
      className="py-32 px-8 bg-white relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#0EA5E9] rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#06B6D4] rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20 fade-up">
          <h2 className="text-sm uppercase tracking-wider text-[#0284C7] mb-6 font-medium">
            Our Clean Water Impact
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
            Clean Water Is Life — <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] bg-clip-text text-transparent">
              Millions Still Don't Have It
            </span>
          </h3>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
            While you track your hydration, we're working to bring clean water
            to communities worldwide. Every subscription makes a real
            difference.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 fade-up">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100 shadow-lg">
            <div className="text-6xl font-bold text-red-600 mb-4">2.2B</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              People Without Safe Water
            </h4>
            <p className="text-gray-600 font-light leading-relaxed">
              Around <strong>2.1–2.2 billion people</strong> lack access to
              safely managed drinking water worldwide — about{" "}
              <strong>1 in 4 people</strong> globally.
            </p>
            <div className="mt-4 pt-4 border-t border-red-200">
              <p className="text-xs text-gray-500 italic">
                Source: UNICEF / WHO
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8 border border-orange-100 shadow-lg">
            <div className="text-6xl font-bold text-orange-600 mb-4">700M</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Lack Basic Access
            </h4>
            <p className="text-gray-600 font-light leading-relaxed">
              Roughly <strong>700 million people</strong> lack even basic access
              to clean water sources, forcing them to use unsafe water daily.
            </p>
            <div className="mt-4 pt-4 border-t border-orange-200">
              <p className="text-xs text-gray-500 italic">
                Source: World Vision
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-8 border border-yellow-100 shadow-lg">
            <div className="text-6xl font-bold text-amber-600 mb-4">2hrs</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Daily Water Collection
            </h4>
            <p className="text-gray-600 font-light leading-relaxed">
              Many must walk <strong>long distances daily</strong> to collect
              water, limiting education and work opportunities — especially for
              women and girls.
            </p>
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <p className="text-xs text-gray-500 italic">
                Source: charity: water
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-12 mb-20 border border-blue-100 fade-up">
          <h3 className="text-3xl font-semibold text-gray-900 mb-8 text-center">
            Why Clean Water Changes Everything
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">💊</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Better Health
              </h4>
              <p className="text-gray-600 font-light text-sm leading-relaxed">
                Prevents waterborne diseases like cholera, dysentery, and
                typhoid
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">📚</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                More Education
              </h4>
              <p className="text-gray-600 font-light text-sm leading-relaxed">
                Girls can attend school instead of spending hours collecting
                water
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💼</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Economic Growth
              </h4>
              <p className="text-gray-600 font-light text-sm leading-relaxed">
                Adults can work instead of walking miles for water daily
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Stronger Communities
              </h4>
              <p className="text-gray-600 font-light text-sm leading-relaxed">
                Healthier families and improved quality of life for all
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] rounded-3xl p-12 mb-16 text-white shadow-2xl fade-up">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-6xl mb-6">💧</div>
            <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
              Our Commitment to You — And the World
            </h3>
            <p className="text-xl md:text-2xl font-light leading-relaxed mb-8 opacity-95">
              With every active subscription, we donate the equivalent of{" "}
              <strong className="font-bold">3 months of clean water</strong> to
              families who need it most.
            </p>
            <p className="text-lg opacity-90 font-light">
              You track your hydration. We help bring clean water to those
              without it. Together, we're making a global impact — one
              subscription at a time.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-12 border-2 border-blue-200 shadow-xl fade-up">
          <h3 className="text-2xl font-semibold text-gray-900 mb-10 text-center">
            Real-Time Impact Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-[#0284C7] mb-3 font-medium">
                Active Subscriptions
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] bg-clip-text text-transparent mb-2">
                {subscriptionCount.toLocaleString()}
              </div>
              <div className="text-gray-500 text-sm">and growing</div>
            </div>
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-[#0284C7] mb-3 font-medium">
                Months of Water Donated
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-[#06B6D4] to-[#0EA5E9] bg-clip-text text-transparent mb-2">
                {(subscriptionCount * 3).toLocaleString()}
              </div>
              <div className="text-gray-500 text-sm">since launch</div>
            </div>
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-[#0284C7] mb-3 font-medium">
                People Helped
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-[#0284C7] to-[#06B6D4] bg-clip-text text-transparent mb-2">
                {Math.floor(
                  ((subscriptionCount * 3) / 12) * 5,
                ).toLocaleString()}
              </div>
              <div className="text-gray-500 text-sm">
                estimated lives impacted
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Progress to Next Milestone
              </span>
              <span className="text-sm font-semibold text-[#0EA5E9]">
                {Math.floor((subscriptionCount % 500) / 5)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.floor((subscriptionCount % 500) / 5)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Next goal: {Math.ceil(subscriptionCount / 500) * 500}{" "}
              subscriptions = {Math.ceil(subscriptionCount / 500) * 500 * 3}{" "}
              months of clean water
            </p>
          </div>
        </div>

        <div className="text-center mt-16 fade-up">
          <h3 className="text-3xl font-semibold text-gray-900 mb-6">
            Join Us in Bringing Clean Water to Everyone
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto font-light">
            Track your hydration with cutting-edge AI technology while making a
            real difference in the lives of families without access to clean
            water.
          </p>
          <a
            href="/onboarding"
            className="inline-block px-10 py-4 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all hover:scale-105 hover:-translate-y-1"
          >
            Start Making an Impact Today
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Every subscription = 3 months of clean water donated
          </p>
        </div>
      </div>
    </section>
  );
}
