import type { NextRequest } from "next/server";
import { signOut } from "@/lib/server/bff";

export async function POST(req: NextRequest) {
  return signOut(req);
}

export const dynamic = "force-dynamic";
