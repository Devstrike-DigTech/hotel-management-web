import { CheckCircle, CloudArrowUp, Warning, WifiSlash } from "@phosphor-icons/react/ssr";
import { KeyFob } from "../ui/wordmark";

/**
 * Product vignettes, drawn in HTML. They are illustrations with made-up numbers,
 * and are labelled as such wherever they appear.
 */

/** The nightly owner digest, as it lands on the owner's phone. */
export function OwnerDigest({ appName, className = "" }: { appName: string; className?: string }) {
  const rows: [string, string][] = [
    ["Rooms sold", "18 of 24"],
    ["Occupancy", "75%"],
    ["Day-use stays", "4"],
    ["Card", "₦412,500"],
    ["Transfer", "₦586,000"],
    ["Cash", "₦246,500"],
  ];
  return (
    <div className={`relative mx-auto w-full max-w-[22rem] ${className}`}>
      {/* phone */}
      <div className="rounded-[2.2rem] border border-line-strong bg-ink p-2.5 shadow-[var(--shadow-float)]">
        <div className="overflow-hidden rounded-[1.75rem] bg-[#e9e2d4] dark:bg-[#1f1c17]">
          <div className="flex items-center gap-3 bg-[#2f5a43] px-4 pb-3 pt-6 text-[#f4efe6]">
            <span className="grid size-8 place-items-center rounded-full bg-[#f4efe6]/15">
              <KeyFob className="h-4 w-auto text-[#f4efe6]" />
            </span>
            <span>
              <span className="block text-sm font-medium leading-tight">{appName} Digest</span>
              <span className="block text-[11px] opacity-75">The Palmwine House</span>
            </span>
          </div>
          <div className="space-y-2 p-3 pb-5">
            <p className="num mx-auto w-fit rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] text-ink-muted dark:bg-white/10">
              TUESDAY 23:00
            </p>
            <div className="relative ml-1 mr-6 rounded-lg rounded-tl-none bg-surface p-3.5 text-[13px] leading-snug text-ink shadow-sm">
              <p className="font-medium">Good night, Mrs Adeyemi. Today at the Palmwine House:</p>
              <dl className="num mt-3 space-y-1 text-[12px]">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-medium">
                  <dt>Total taken</dt>
                  <dd>₦1,245,000</dd>
                </div>
              </dl>
              <div className="mt-3 rounded-sm border-l-2 border-laterite bg-laterite/8 px-2.5 py-2 text-[12px]">
                <p className="font-medium text-laterite">2 things to look at</p>
                <ul className="mt-1 space-y-1 text-ink/85">
                  <li>Room 204 was made up at 06:10 with no guest on the register.</li>
                  <li>30% discount on Room 112 by Tunde, not approved.</li>
                </ul>
              </div>
              <p className="num mt-2 text-right text-[10px] text-ink-muted">23:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type KeyState = "vacant" | "occupied" | "dirty" | "reserved" | "ooo" | "flag";
const KEYS: [string, KeyState][] = [
  ["101", "occupied"], ["102", "vacant"], ["103", "occupied"], ["104", "dirty"], ["105", "occupied"], ["106", "vacant"],
  ["201", "occupied"], ["202", "reserved"], ["203", "occupied"], ["204", "flag"], ["205", "vacant"], ["206", "occupied"],
  ["301", "ooo"], ["302", "occupied"], ["303", "vacant"], ["304", "occupied"], ["305", "dirty"], ["306", "occupied"],
];
const TONE: Record<KeyState, string> = {
  vacant: "var(--palm)",
  occupied: "var(--adire)",
  dirty: "var(--ochre)",
  reserved: "var(--brass)",
  ooo: "var(--danger)",
  flag: "var(--laterite)",
};

/**
 * The key rack, reimagined as Revenue Guard sees it: a key on its hook means the room
 * should be empty. A missing key with no guest on the register is a flag.
 */
export function KeyRack({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <div className="relative rounded-md border border-line bg-[#15130f] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <p className="kicker !text-[#efe8dc]/60">Key board, Tuesday 06:14</p>
          <p className="num flex items-center gap-1.5 text-[11px] text-[#e0714b]">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#e0714b] opacity-60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-[#e0714b]" />
            </span>
            1 flag
          </p>
        </div>
        <ol className="grid grid-cols-6 gap-x-2 gap-y-5 sm:gap-x-3">
          {KEYS.map(([room, state]) => {
            const keyOnHook = state === "vacant" || state === "dirty" || state === "ooo";
            return (
              <li key={room} className="relative flex flex-col items-center">
                <span className="num rounded-xs border border-[#efe8dc]/15 px-1 text-[10px] text-[#efe8dc]/70">{room}</span>
                <span aria-hidden className="mt-1 h-2 w-px bg-[#efe8dc]/40" />
                <span aria-hidden className="size-1.5 rounded-full bg-[#efe8dc]/50" />
                <span className="mt-0.5 flex h-9 items-start justify-center">
                  {keyOnHook ? (
                    <KeyFob className="h-8 w-auto text-[#d6a94a]" />
                  ) : (
                    <span className="mt-1 h-7 w-[1.1rem] rounded-sm border border-dashed border-[#efe8dc]/25" />
                  )}
                </span>
                <span
                  aria-hidden
                  className={`mt-1 h-1 w-6 rounded-full ${state === "flag" ? "animate-pulse motion-reduce:animate-none" : ""}`}
                  style={{ background: TONE[state] }}
                />
                <span className="sr-only">
                  Room {room}: {state === "flag" ? "flagged" : state}
                </span>
                {state === "flag" ? (
                  <span aria-hidden className="absolute -inset-x-1 -inset-y-1.5 rounded-sm ring-1 ring-[#e0714b]" />
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex items-start gap-3 rounded-sm border border-[#e0714b]/40 bg-[#e0714b]/10 p-3.5 text-[13px] text-[#efe8dc]">
          <Warning size={18} className="mt-0.5 shrink-0 text-[#e0714b]" aria-hidden />
          <p>
            <span className="font-medium">Room 204.</span>{" "}
            <span className="text-[#efe8dc]/75">
              Key out overnight, room made up at 06:10, nobody on the register. Flagged for the owner.
            </span>
          </p>
        </div>
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-ink-muted">
        {(
          [
            ["Vacant, clean", "vacant"],
            ["Occupied", "occupied"],
            ["Dirty", "dirty"],
            ["Reserved", "reserved"],
            ["Out of order", "ooo"],
          ] as [string, KeyState][]
        ).map(([label, s]) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full" style={{ background: TONE[s] }} />
            {label}
          </span>
        ))}
        <span className="basis-full italic">Illustration. Room numbers and times are examples.</span>
      </figcaption>
    </figure>
  );
}

/** The offline queue: what the front desk shows when the network drops. */
export function OfflineTicker() {
  const items = [
    ["21:42", "Check-in, Room 108", "Mr Okafor, 2 nights"],
    ["21:47", "Payment, Room 108", "₦130,000 transfer"],
    ["21:55", "Status, Room 305", "Dirty to clean"],
  ];
  return (
    <div className="rounded-sm border border-line bg-paper text-[12.5px]">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-ochre">
          <WifiSlash size={16} aria-hidden /> <span className="font-medium">Working offline</span>
        </span>
        <span className="num text-ink-muted">3 changes saved</span>
      </div>
      <ul className="divide-y divide-line">
        {items.map(([t, a, b]) => (
          <li key={t} className="grid grid-cols-[3rem_1fr] gap-2 px-3.5 py-2">
            <span className="num text-ink-muted">{t}</span>
            <span>
              {a} <span className="text-ink-muted">&middot; {b}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 text-palm">
        <CloudArrowUp size={16} aria-hidden />
        <span>Syncs the moment the light and the network come back.</span>
      </div>
    </div>
  );
}

/** A day on one room: hourly and overnight stays on a single timeline. */
export function DayTimeline() {
  const blocks = [
    { from: 0, to: 11, label: "Overnight", tone: "var(--adire)" },
    { from: 11, to: 13, label: "Clean", tone: "var(--ochre)" },
    { from: 13, to: 16, label: "3 hrs", tone: "var(--brass)" },
    { from: 16, to: 17, label: "", tone: "var(--ochre)" },
    { from: 17, to: 24, label: "Overnight", tone: "var(--adire)" },
  ];
  return (
    <div>
      <div className="relative flex h-10 overflow-hidden rounded-sm border border-line">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="flex items-center justify-center border-r border-paper/60 text-[10.5px] font-medium text-paper last:border-r-0"
            style={{ width: `${((b.to - b.from) / 24) * 100}%`, background: b.tone }}
          >
            {b.label}
          </div>
        ))}
      </div>
      <div className="num mt-1.5 flex justify-between text-[10px] text-ink-muted">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12.5px] text-palm">
        <CheckCircle size={16} aria-hidden /> Room 112 sold three times in one day, all on the register.
      </p>
    </div>
  );
}
