import type { BookingDisplayStatus } from "@/lib/booking-types";

const MAP: Record<BookingDisplayStatus, [string, string]> = {
  AWAITING_PAYMENT: ["Awaiting payment", "!text-brass border-brass/50"],
  CONFIRMED: ["Confirmed", "!text-palm border-palm/45"],
  CHECKED_IN: ["Checked in", "!text-adire border-adire/45"],
  COMPLETED: ["Completed", "!text-ink-muted border-line-strong"],
  CANCELLED: ["Cancelled", "!text-danger border-danger/40"],
  NO_SHOW: ["No-show", "!text-danger border-danger/40"],
  EXPIRED: ["Hold ended", "!text-ink-muted border-line-strong"],
};

/** A small pill for a booking's state; the only pills in the design are status chips. */
export function StatusChip({ status }: { status: BookingDisplayStatus }) {
  const [label, tone] = MAP[status] ?? [status, "!text-ink-muted border-line-strong"];
  return (
    <span className={`kicker inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 !text-[10px] ${tone}`} data-testid="status-chip">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
