import type { NextConfig } from "next";

/**
 * Development only: hotel custom domains pointed at this machine (hosts file or a browser host rule)
 * must be allowed to load dev assets. Comma-separated hostnames; defaults to the seeded
 * white-label demo (Harmattan Hotels & Suites).
 */
const devOrigins = (process.env.ALLOWED_DEV_ORIGINS || "harmattanhotels.com,**.harmattanhotels.com")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
    qualities: [60, 75, 85],
  },
  poweredByHeader: false,
};

export default nextConfig;
