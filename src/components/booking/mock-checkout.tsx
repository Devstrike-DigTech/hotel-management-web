"use client";

import { Bank, CreditCard, DeviceMobile, Flask, LockSimple, X } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { PaymentStatusView } from "@/lib/booking-types";
import { call, humanError } from "@/lib/client-api";
import { formatShort } from "@/lib/dates";
import { formatNaira } from "@/lib/format";

type Method = "card" | "bank_transfer" | "ussd";
const METHODS: [Method, string, typeof CreditCard][] = [
  ["card", "Card", CreditCard],
  ["bank_transfer", "Transfer", Bank],
  ["ussd", "USSD", DeviceMobile],
];

/** Where to send the guest after the practice payment: the booking's callback, with Paystack's query. */
function back(status: PaymentStatusView) {
  const u = new URL(status.callbackUrl, window.location.origin);
  u.searchParams.set("reference", status.reference);
  u.searchParams.set("trxref", status.reference);
  return u.toString();
}

export function MockCheckout() {
  const reference = useSearchParams().get("reference");
  const [status, setStatus] = useState<PaymentStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("card");
  const [busy, setBusy] = useState<null | "success" | "failed">(null);

  useEffect(() => {
    if (!reference) return;
    call<PaymentStatusView>(`public/payments/${encodeURIComponent(reference)}/verify`)
      .then(setStatus)
      .catch((e) => setError(humanError(e, "This payment reference was not found.")));
  }, [reference]);

  async function finish(outcome: "success" | "failed") {
    if (!reference || !status) return;
    setBusy(outcome);
    try {
      const s = await call<PaymentStatusView>(`public/dev/payments/${encodeURIComponent(reference)}/confirm`, {
        method: "POST",
        body: { outcome, channel: method },
        timeoutMs: 30_000,
      });
      window.location.assign(back(s));
    } catch (e) {
      setBusy(null);
      setError(humanError(e));
    }
  }

  const b = status?.booking;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <p className="kicker mb-4 inline-flex items-center gap-2 self-center rounded-xs border border-ochre/50 px-2 py-1 !text-ochre">
        <Flask size={13} aria-hidden /> Practice checkout, no money moves
      </p>
      <div className="overflow-hidden rounded-md border border-line-strong bg-surface shadow-[var(--shadow-float)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="kicker">Paying</p>
            <p className="display-sm mt-1 truncate text-xl">{b?.hotel.name ?? "Loading"}</p>
            {b ? (
              <p className="mt-0.5 text-sm text-ink-muted">
                {b.roomType.name}, {formatShort(b.arrivalDate)} to {formatShort(b.departureDate)}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="kicker">Amount</p>
            <p className="num mt-1 text-2xl font-medium" data-testid="mock-amount">
              {status ? formatNaira(status.amountKobo) : "—"}
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="px-6 py-4 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {status && status.state !== "PENDING" && status.state !== "FAILED" ? (
          <div className="px-6 py-6 text-sm">
            <p>This payment is already {status.state.toLowerCase()}.</p>
            <a href={back(status)} className="btn btn-outline mt-4 w-full">
              Return to the booking
            </a>
          </div>
        ) : (
          <div className="px-6 py-6">
            <div className="grid grid-cols-3 gap-1 rounded-sm bg-surface-2 p-1" role="radiogroup" aria-label="Payment method">
              {METHODS.map(([m, label, Icon]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={`flex items-center justify-center gap-1.5 rounded-xs py-2 text-sm ${method === m ? "bg-surface text-ink shadow-[0_1px_0_var(--line)]" : "text-ink-muted"}`}
                >
                  <Icon size={16} aria-hidden /> {label}
                </button>
              ))}
            </div>
            <div className="num mt-5 space-y-3 text-sm">
              {method === "card" ? (
                <>
                  <div className="field flex items-center justify-between text-ink-muted">
                    <span>4084 0840 8408 4081</span>
                    <span>Test Visa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="field text-ink-muted">12 / 30</div>
                    <div className="field text-ink-muted">408</div>
                  </div>
                </>
              ) : method === "bank_transfer" ? (
                <div className="rounded-sm border border-dashed border-line-strong p-4 text-ink-muted">
                  Transfer to <span className="text-ink">Test Bank 0123456789</span>. Pretend you have, then choose below.
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-line-strong p-4 text-ink-muted">
                  Dial <span className="text-ink">*737*000*{reference?.slice(-4) ?? "0000"}#</span> on any phone. Pretend you have, then choose below.
                </div>
              )}
            </div>
            <button type="button" onClick={() => finish("success")} disabled={!status || !!busy} className="btn btn-primary mt-6 w-full" data-testid="mock-pay">
              <LockSimple size={16} aria-hidden /> {busy === "success" ? "Paying" : `Pay ${status ? formatNaira(status.amountKobo) : ""}`}
            </button>
            <button type="button" onClick={() => finish("failed")} disabled={!status || !!busy} className="btn btn-outline mt-2 w-full" data-testid="mock-decline">
              <X size={16} aria-hidden /> {busy === "failed" ? "Declining" : "Decline this payment"}
            </button>
            {status ? (
              <a href={back(status)} className="mt-4 block text-center text-sm text-ink-muted hover:text-ink">
                Cancel and go back
              </a>
            ) : null}
          </div>
        )}
        <p className="num border-t border-line px-6 py-3 text-center text-[11px] text-ink-muted">{reference}</p>
      </div>
    </div>
  );
}
