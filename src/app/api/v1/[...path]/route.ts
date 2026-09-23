import type { NextRequest } from "next/server";
import { forward } from "@/lib/server/bff";

/**
 * Same-origin passthrough to the backend for the browser.
 *
 * - Works on every host this app serves (marketplace, hotel subdomains, custom domains) without
 *   the backend having to list each origin for CORS.
 * - Keeps the guest's tokens in httpOnly cookies: the browser never sees a JWT, and the handler
 *   adds the bearer header, refreshes once on 401, and rotates the cookies.
 * - Only public and guest routes are forwarded; staff and platform routes are refused.
 */
type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, { params }: Ctx) {
  const { path } = await params;
  return forward(req, path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;

export const dynamic = "force-dynamic";
