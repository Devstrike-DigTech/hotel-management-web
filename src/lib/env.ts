/**
 * Runtime identity and service URLs. The product name is not final, so it is
 * always read from the environment and never hard-coded in components.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "HotelOS";
export const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "hotelos.ng").toLowerCase();
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || `hello@${APP_DOMAIN}`;
export const ADMIN_URL = (process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001").replace(/\/$/, "");
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Base URL of the backend, without the /api/v1 prefix. */
export const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
  /\/$/,
  "",
);

export const signupUrl = (plan?: string) =>
  `${ADMIN_URL}/signup${plan ? `?plan=${encodeURIComponent(plan)}` : ""}`;
