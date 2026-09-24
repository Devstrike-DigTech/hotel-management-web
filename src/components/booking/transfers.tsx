import { AirplaneLanding, Boat, Bus, CarProfile, MapPin, Phone, Train, WarningCircle } from "@phosphor-icons/react";
import type { BookingTransfer } from "@/lib/booking-types";
import { lagosParts } from "@/lib/booking-form";
import { formatShort, formatWeekday } from "@/lib/dates";
import { formatNaira, formatPhone, toE164Digits } from "@/lib/format";

const ICON = { AIRPORT: AirplaneLanding, MOTOR_PARK: Bus, TRAIN_STATION: Train, JETTY: Boat, OTHER: MapPin } as const;

const STATUS: Record<BookingTransfer["status"], { label: string; tone: string }> = {
  REQUESTED: { label: "Requested", tone: "text-ochre border-ochre/40" },
  CONFIRMED: { label: "Confirmed", tone: "text-palm border-palm/40" },
  DRIVER_ASSIGNED: { label: "Driver assigned", tone: "text-palm border-palm/40" },
  EN_ROUTE: { label: "Driver on the way", tone: "text-adire border-adire/40" },
  PICKED_UP: { label: "Picked up", tone: "text-adire border-adire/40" },
  COMPLETED: { label: "Done", tone: "text-ink-muted border-line-strong" },
  NO_SHOW: { label: "Missed", tone: "text-danger border-danger/40" },
  CANCELLED: { label: "Cancelled", tone: "text-ink-muted border-line-strong" },
};

/**
 * Pickups and drop-offs on the confirmation card and the trip page: where, when, what for, and the
 * driver's name, number and plate once the hotel assigns one.
 */
export function TransferList({ transfers, compact = false }: { transfers: BookingTransfer[]; compact?: boolean }) {
  if (!transfers.length) return null;
  return (
    <ul className="space-y-3" data-testid="transfer-list">
      {transfers.map((t) => {
        const Icon = ICON[t.kind] ?? MapPin;
        const { date, time } = lagosParts(t.scheduledAt);
        const st = STATUS[t.status] ?? STATUS.REQUESTED;
        return (
          <li key={t.id} className={`rounded-sm border border-line bg-paper ${compact ? "p-3" : "p-4"} ${t.status === "CANCELLED" ? "opacity-60" : ""}`} data-testid="transfer" data-status={t.status}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 items-start gap-3">
                <Icon size={22} weight="light" className="mt-0.5 shrink-0 text-laterite" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium leading-snug">
                    {t.direction === "ARRIVAL" ? "Pickup from" : "Drop-off at"} {t.pickupPointName}
                  </p>
                  <p className="num mt-0.5 text-[12.5px] text-ink-muted">
                    {date ? `${formatWeekday(date)} ${formatShort(date)}, ${time}` : ""} · {t.vehicleName} · {t.passengers} {t.passengers === 1 ? "passenger" : "passengers"}
                  </p>
                  {t.detailsSummary ? <p className="mt-0.5 text-[13px]">{t.detailsSummary}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`kicker rounded-full border px-2 py-0.5 !text-[10px] ${st.tone}`}>{st.label}</span>
                <span className="num text-sm">{formatNaira(t.totalKobo)}</span>
              </div>
            </div>
            {t.driver ? (
              <div className="mt-3 grid gap-2 rounded-xs bg-surface-2 px-3 py-2.5 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5" data-testid="transfer-driver">
                <p>
                  <span className="text-ink-muted">Your driver </span>
                  <span className="font-medium">{t.driver.name}</span>
                </p>
                <a href={`tel:+${toE164Digits(t.driver.phone)}`} className="num inline-flex items-center gap-1.5 hover:text-laterite">
                  <Phone size={15} aria-hidden /> {formatPhone(t.driver.phone)}
                </a>
                <p className="num inline-flex items-center gap-1.5">
                  <CarProfile size={16} aria-hidden className="text-ink-muted" />
                  <span className="rounded-xs border border-ink/60 px-1.5 py-px text-[12.5px] tracking-[0.08em]">{t.driver.vehiclePlate}</span>
                  {t.driver.vehicleDescription ? <span className="text-[12.5px] text-ink-muted">{t.driver.vehicleDescription}</span> : null}
                </p>
              </div>
            ) : t.status === "REQUESTED" || t.status === "CONFIRMED" ? (
              <p className="mt-2 text-[12.5px] text-ink-muted">The driver&rsquo;s name, number and plate come to you by SMS or WhatsApp once the hotel assigns one.</p>
            ) : null}
            {t.delayNote ? (
              <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-ochre">
                <WarningCircle size={14} className="mt-0.5 shrink-0" aria-hidden /> {t.delayNote}
              </p>
            ) : null}
            {t.notesForGuest && !compact ? <p className="mt-2 text-[12.5px] italic text-ink-muted">{t.notesForGuest}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
