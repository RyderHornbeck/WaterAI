import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [hasNetwork, setHasNetwork] = useState(true);

  useEffect(() => {
    let interval;

    const checkNetwork = async () => {
      try {
        // Try to fetch from our own API health check endpoint with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("/api/health-check", {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setHasNetwork(response.ok);
      } catch (error) {
        // Network request failed - no internet
        setHasNetwork(false);
      }
    };

    // Check immediately
    checkNetwork();

    // Check every 10 seconds
    interval = setInterval(checkNetwork, 10000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return {
    hasNetwork,
  };
}
