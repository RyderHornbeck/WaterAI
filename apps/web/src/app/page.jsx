"use client";

import useUser from "@/utils/useUser";
import { useScrollDetection } from "@/hooks/useScrollDetection";
import { Navigation } from "@/components/LandingPage/Navigation";
import { HeroSection } from "@/components/LandingPage/HeroSection";
import { HowItWorksSection } from "@/components/LandingPage/HowItWorksSection";
import { WaterBenefitsSection } from "@/components/LandingPage/WaterBenefitsSection";
import { Footer } from "@/components/LandingPage/Footer";

export default function LandingPage() {
  const { data: user } = useUser();
  const scrolled = useScrollDetection(20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 font-inter">
      <Navigation scrolled={scrolled} user={user} />
      <HeroSection />
      <HowItWorksSection />
      <WaterBenefitsSection />
      <Footer />
    </div>
  );
}
