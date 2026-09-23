import type { Metadata } from "next";
import { Mailbox } from "@/components/dev/mailbox";

export const metadata: Metadata = { title: "Dev mailbox" };

export default function DevMailboxPage() {
  return <Mailbox />;
}
