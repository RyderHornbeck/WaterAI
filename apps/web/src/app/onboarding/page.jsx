"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [handSize, setHandSize] = useState("");
  const [sipSize, setSipSize] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;
  const progress = step / totalSteps;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: parseInt(goal, 10),
          handSize,
          sipSize,
        }),
      });

      if (!response.ok) throw new Error("Failed to save preferences");

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Error saving preferences:", err);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return handSize !== "";
    if (step === 2) return sipSize !== "";
    if (step === 3) return goal !== "" && parseInt(goal, 10) > 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 max-w-2xl mx-auto">
        <div className="flex-1">
          {/* Progress Indicator */}
          <div className="mb-12">
            <p className="text-sm text-gray-600 mb-2">
              Step {step} of {totalSteps}
            </p>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Hand Size */}
          {step === 1 && (
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                What's your hand size?
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                This helps us estimate your cup sizes more accurately
              </p>

              <div className="space-y-4">
                {["Small", "Medium", "Large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setHandSize(size.toLowerCase())}
                    className={`w-full p-6 rounded-2xl border-2 text-lg font-semibold transition-all ${
                      handSize === size.toLowerCase()
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-900 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Sip Size */}
          {step === 2 && (
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                How do you usually drink?
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Do you take small, medium, or large sips?
              </p>

              <div className="space-y-4">
                {[
                  { label: "Small sips", value: "small" },
                  { label: "Medium sips", value: "medium" },
                  { label: "Large gulps", value: "large" },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setSipSize(value)}
                    className={`w-full p-6 rounded-2xl border-2 text-lg font-semibold transition-all ${
                      sipSize === value
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-900 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Daily Goal */}
          {step === 3 && (
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Set your daily goal
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                How many ounces of water do you want to drink daily?
              </p>

              <div className="space-y-4">
                {["48", "64", "80", "96", "128"].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setGoal(amount)}
                    className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${
                      goal === amount
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-900 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <span className="text-lg font-semibold">{amount} oz</span>
                    <span
                      className={`text-sm ${
                        goal === amount ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {parseInt(amount) / 8} glasses
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="pt-8">
          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="w-full bg-blue-500 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : step === totalSteps
                ? "Get Started"
                : "Next"}
            {!saving && <ChevronRight size={24} />}
          </button>
        </div>
      </div>

      {/* Water Bottle Progress */}
      <div className="hidden md:flex w-80 bg-white border-l border-gray-200 items-center justify-center p-8">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-600 mb-6">Progress</p>

          {/* Bottle Container */}
          <div className="relative w-20 h-64 border-4 border-blue-500 rounded-[40px] rounded-t-lg overflow-hidden">
            {/* Water Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-blue-500 opacity-30 transition-all duration-300"
              style={{ height: `${progress * 100}%` }}
            />

            {/* Bottle Cap */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-8 h-5 bg-blue-500 rounded-t-md" />
          </div>

          <p className="text-xl font-semibold text-blue-500 mt-6">
            {Math.round(progress * 100)}%
          </p>
        </div>
      </div>
    </div>
  );
}
