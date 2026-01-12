import { useEffect } from "react";

export function useLandingPageAnimations() {
  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    });

    document
      .querySelectorAll(".fade-up, .fade-up-delay-1, .fade-up-delay-2")
      .forEach((el) => {
        observer.observe(el);
      });

    return () => observer.disconnect();
  }, []);
}
