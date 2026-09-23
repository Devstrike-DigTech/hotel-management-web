import {
  ArrowCounterClockwise,
  CloudSlash,
  HourglassSimpleLow,
  Receipt,
  SealCheck,
  WarningCircle,
} from "@phosphor-icons/react/ssr";

export type PaymentPhase = "verifying" | "slow" | "offline" | "success" | "failed" | "expired" | "refunding";

const COPY: Record<PaymentPhase, { kicker: string; title: React.ReactNode; body: string }> = {
  verifying: {
    kicker: "Payment",
    title: (
      <>
        Confirming your <em className="accent">payment</em>
      </>
    ),
    body: "Paystack has sent you back to us. We are checking with the bank now; it usually takes a few seconds.",
  },
  slow: {
    kicker: "Still checking",
    title: (
      <>
        Almost there, <em className="accent">hold on</em>
      </>
    ),
    body: "Bank transfers and USSD can take a minute or two to arrive. Please do not pay again: this page updates by itself, and we will also send your confirmation by SMS and email.",
  },
  offline: {
    kicker: "No connection",
    title: (
      <>
        You are <em className="accent">offline</em>
      </>
    ),
    body: "Your payment is not lost. As soon as your phone is back online we will carry on checking, right here.",
  },
  success: {
    kicker: "Payment received",
    title: (
      <>
        Paid. Your room is <em className="accent">yours.</em>
      </>
    ),
    body: "Setting out your confirmation card now.",
  },
  failed: {
    kicker: "Payment not completed",
    title: (
      <>
        The payment did <em className="accent">not go through</em>
      </>
    ),
    body: "No money was taken for this booking. If your bank shows a pending debit, it will drop off by itself. You can try again while the room is still held.",
  },
  expired: {
    kicker: "Hold ended",
    title: (
      <>
        The hold ran out <em className="accent">before payment</em>
      </>
    ),
    body: "The twenty minutes passed and the room was released. Nothing was charged. The room may still be free: check again and it takes a minute.",
  },
  refunding: {
    kicker: "Refund on its way",
    title: (
      <>
        Paid, but the room <em className="accent">had gone</em>
      </>
    ),
    body: "Your payment arrived after the hold ended and someone else had booked the room. We have started a full refund to the same card or account; banks usually take 3 to 10 working days. We are sorry for the trouble.",
  },
};

/** The status medallion and words for each moment of a payment return. */
export function PaymentState({
  phase,
  reference,
  children,
}: {
  phase: PaymentPhase;
  reference?: string | null;
  children?: React.ReactNode;
}) {
  const c = COPY[phase];
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center sm:py-16" aria-live="polite" data-testid={`payment-${phase}`}>
      <Medallion phase={phase} />
      <p className={`kicker mt-8 ${phase === "success" ? "!text-palm" : phase === "failed" || phase === "refunding" ? "!text-ochre" : ""}`}>{c.kicker}</p>
      <h1 className="display-md mt-3 text-[clamp(2.2rem,5.4vw,3.6rem)]">{c.title}</h1>
      <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-ink-muted">{c.body}</p>
      {reference ? (
        <p className="num mt-6 inline-flex items-center gap-2 rounded-xs border border-line px-3 py-1.5 text-[12.5px] text-ink-muted">
          <Receipt size={14} aria-hidden /> Reference <span className="text-ink">{reference}</span>
        </p>
      ) : null}
      {children ? <div className="mt-9 w-full">{children}</div> : null}
    </section>
  );
}

function Medallion({ phase }: { phase: PaymentPhase }) {
  const busy = phase === "verifying" || phase === "slow";
  const tone =
    phase === "success" ? "text-palm" : phase === "failed" || phase === "refunding" ? "text-ochre" : phase === "offline" || phase === "expired" ? "text-ink-muted" : "text-brass";
  const Icon =
    phase === "success"
      ? SealCheck
      : phase === "failed"
        ? WarningCircle
        : phase === "expired"
          ? HourglassSimpleLow
          : phase === "offline"
            ? CloudSlash
            : phase === "refunding"
              ? ArrowCounterClockwise
              : null;
  return (
    <div className={`relative grid size-24 place-items-center ${tone}`} aria-hidden>
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full">
        <circle cx="48" cy="48" r="46" fill="none" stroke="var(--line-strong)" strokeWidth="1" />
        <circle cx="48" cy="48" r="38" fill="none" stroke="currentColor" strokeWidth="1" opacity=".35" strokeDasharray="1 5" />
        {busy ? (
          <circle
            cx="48"
            cy="48"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="60 229"
            className="origin-center animate-[spin_1.8s_linear_infinite]"
          />
        ) : (
          <circle cx="48" cy="48" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
        )}
      </svg>
      {Icon ? (
        <Icon size={38} weight="light" />
      ) : (
        <svg viewBox="0 0 20 30" className="h-9 w-auto">
          <path d="M10 1.2 18.6 8v14L10 28.8 1.4 22V8z" fill="currentColor" />
          <circle cx="10" cy="6.6" r="2" fill="var(--paper)" />
          <path d="M5.5 13.5h9M5.5 17h9M5.5 20.5h6" stroke="var(--paper)" strokeWidth="1" opacity=".55" />
        </svg>
      )}
    </div>
  );
}
