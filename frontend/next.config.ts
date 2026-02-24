import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent disk cache in development to avoid
      // "Array buffer allocation failed" on low-memory machines.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
