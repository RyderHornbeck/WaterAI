import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const metadata = {
  title: "Water AI - Smart Hydration Tracking",
  description:
    "AI-powered hydration intelligence. Track your water intake effortlessly with advanced machine learning technology.",
  openGraph: {
    title: "Water AI - Smart Hydration Tracking",
    description:
      "AI-powered hydration intelligence. Track your water intake effortlessly with advanced machine learning technology.",
    url: "https://www.waterai-smarthydration.com",
    siteName: "Water AI",
    images: [
      {
        url: "https://ucarecdn.com/da3f3549-c70d-42b7-b757-fe06ec027b6a/-/format/auto/",
        width: 1200,
        height: 630,
        alt: "Water AI Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Water AI - Smart Hydration Tracking",
    description:
      "AI-powered hydration intelligence. Track your water intake effortlessly.",
    images: [
      "https://ucarecdn.com/da3f3549-c70d-42b7-b757-fe06ec027b6a/-/format/auto/",
    ],
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
