import { useState, useEffect } from "react";

export function useSubscriptionCounter(targetCount = 1247, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const steps = 60;
    const increment = targetCount / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        setCount(targetCount);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [targetCount, duration]);

  return count;
}
