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

/**
 * Photos hotels upload (room galleries, the Brand Studio) are served by the API under
 * /api/v1/public/site-assets/. Its public address is read at build time.
 */
function apiAssetPattern(): { protocol: "http" | "https"; hostname: string; port?: string; pathname: string } | null {
  const raw = process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";
  try {
    const u = new URL(raw);
    return { protocol: u.protocol === "https:" ? "https" : "http", hostname: u.hostname, ...(u.port ? { port: u.port } : {}), pathname: "/api/v1/public/site-assets/**" };
  } catch {
    return null;
  }
}
const apiAssets = apiAssetPattern();

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      ...(apiAssets ? [apiAssets] : []),
    ],
    qualities: [60, 75, 85],
  },
  poweredByHeader: false,
  // Self-contained server for the Docker image (.next/standalone); Vercel ignores it.
  output: "standalone",
};

export default nextConfig;
