import type { Metadata } from "next";
import { Preview } from "@/components/dev/preview";

export const metadata: Metadata = { title: "Component preview" };

export default async function PreviewPage({ searchParams }: PageProps<"/dev/preview">) {
  const sp = await searchParams;
  return <Preview only={typeof sp.only === "string" ? sp.only : undefined} />;
}
