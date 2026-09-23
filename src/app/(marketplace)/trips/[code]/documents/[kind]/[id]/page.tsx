import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentView } from "@/components/account/document-view";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function DocumentPage({ params }: PageProps<"/trips/[code]/documents/[kind]/[id]">) {
  const { code, kind, id } = await params;
  if (kind !== "invoice" && kind !== "receipt") notFound();
  return (
    <Suspense>
      <DocumentView code={decodeURIComponent(code)} kind={kind} id={id} />
    </Suspense>
  );
}
