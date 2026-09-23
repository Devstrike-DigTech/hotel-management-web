"use client";

import { ArrowLeft, Printer } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { call, humanError } from "@/lib/client-api";
import { formatLong } from "@/lib/dates";
import { formatNaira, formatPhone } from "@/lib/format";
import { formatLagosDateTime, lagosDate } from "@/lib/time";

interface Header {
  name: string;
  address: string;
  area: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  appName: string;
}
interface Invoice {
  number: string;
  kind: "PROFORMA" | "FINAL";
  issuedAt: string;
  hotel: Header;
  guest: { fullName: string; phone: string | null; email: string | null; company: string | null } | null;
  reservation: { code: string; roomTypeName: string; arrivalAt: string; departureAt: string; nights: number | null } | null;
  lines: { date: string; description: string; amountKobo: number }[];
  taxes: { code: string; label: string; rateBps: number; inclusive: boolean; amountKobo: number }[];
  payments: { date: string; method: string; reference: string | null; amountKobo: number }[];
  refunds: { date: string; method: string; amountKobo: number }[];
  totals: { subtotalKobo: number; taxKobo: number; serviceChargeKobo: number; totalKobo: number; paidKobo: number; balanceKobo: number };
}
interface ReceiptDoc {
  number: string;
  issuedAt: string;
  hotel: Header;
  guestName: string | null;
  reservationCode: string | null;
  method: string;
  reference: string | null;
  amountKobo: number;
  amountInWords: string;
  voided: boolean;
}
type Doc = { type: "INVOICE"; document: Invoice } | { type: "RECEIPT"; document: ReceiptDoc };

const METHOD: Record<string, string> = { CARD_ONLINE: "Card, online", CASH: "Cash", TRANSFER: "Bank transfer", POS: "POS", COMPLIMENTARY: "Complimentary", CITY_LEDGER: "City ledger" };

/** An invoice or receipt set as a printable page; the print button gives a PDF on most phones. */
export function DocumentView({ code, kind, id }: { code: string; kind: "invoice" | "receipt"; id: string }) {
  const token = useSearchParams().get("t") ?? "";
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<Doc>(`public/trips/${encodeURIComponent(code)}/documents/${kind}/${encodeURIComponent(id)}`, { query: { t: token } })
      .then(setDoc)
      .catch((e) => setError(humanError(e, "This document could not be loaded.")));
  }, [code, kind, id, token]);

  const back = `/trips/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`;
  return (
    <div className="container-page max-w-3xl pb-10 pt-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={back} className="kicker inline-flex items-center gap-1.5 hover:text-ink">
          <ArrowLeft size={12} aria-hidden /> Booking {code}
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-outline !min-h-10 text-sm" disabled={!doc}>
          <Printer size={16} aria-hidden /> Print or save as PDF
        </button>
      </div>
      {error ? <p className="py-16 text-center text-ink-muted">{error}</p> : null}
      {!doc && !error ? <div className="skeleton h-[40rem] rounded-md" /> : null}
      {doc ? (
        <article className="rounded-md border border-line-strong bg-surface p-6 sm:p-10 print:border-0 print:p-0">
          <DocHeader hotel={doc.document.hotel} title={doc.type === "RECEIPT" ? "Receipt" : doc.document.kind === "PROFORMA" ? "Pro-forma invoice" : "Invoice"} number={doc.document.number} issuedAt={doc.document.issuedAt} />
          {doc.type === "INVOICE" ? <InvoiceBody d={doc.document} /> : <ReceiptBody d={doc.document} />}
          <p className="mt-10 border-t border-line pt-4 text-xs text-ink-muted">
            Issued by {doc.document.hotel.name} through {doc.document.hotel.appName}. Amounts in Nigerian naira.
          </p>
        </article>
      ) : null}
    </div>
  );
}

function DocHeader({ hotel, title, number, issuedAt }: { hotel: Header; title: string; number: string; issuedAt: string }) {
  return (
    <header className="flex flex-col gap-6 border-b border-ink pb-6 sm:flex-row sm:justify-between">
      <div>
        <p className="display-sm text-2xl">{hotel.name}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {hotel.address}
          <br />
          {hotel.area}, {hotel.city}, {hotel.state}
          <br />
          <span className="num">{formatPhone(hotel.phone)}</span> &middot; {hotel.email}
        </p>
      </div>
      <div className="sm:text-right">
        <p className="kicker">{title}</p>
        <p className="num mt-1 text-xl font-medium tracking-wider">{number}</p>
        <p className="num mt-1 text-sm text-ink-muted">{formatLagosDateTime(issuedAt)}</p>
      </div>
    </header>
  );
}

function InvoiceBody({ d }: { d: Invoice }) {
  return (
    <>
      <div className="grid gap-6 py-6 text-sm sm:grid-cols-2">
        {d.guest ? (
          <div>
            <p className="kicker !text-[10px]">Billed to</p>
            <p className="mt-1 font-medium">{d.guest.fullName}</p>
            {d.guest.company ? <p className="text-ink-muted">{d.guest.company}</p> : null}
            {d.guest.email ? <p className="text-ink-muted">{d.guest.email}</p> : null}
          </div>
        ) : null}
        {d.reservation ? (
          <div className="sm:text-right">
            <p className="kicker !text-[10px]">Stay</p>
            <p className="mt-1">
              {d.reservation.roomTypeName}, <span className="num">{d.reservation.code}</span>
            </p>
            <p className="num text-ink-muted">
              {formatLong(lagosDate(d.reservation.arrivalAt))} to {formatLong(lagosDate(d.reservation.departureAt))}
            </p>
          </div>
        ) : null}
      </div>
      <table className="num w-full text-sm">
        <thead>
          <tr className="border-y border-line text-left">
            <th className="kicker py-2 font-medium">Date</th>
            <th className="kicker py-2 font-medium">Description</th>
            <th className="kicker py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {d.lines.map((l, i) => (
            <tr key={i}>
              <td className="py-2.5 pr-3 text-ink-muted">{l.date.slice(5).replace("-", "/")}</td>
              <td className="py-2.5 pr-3 font-sans">{l.description}</td>
              <td className="py-2.5 text-right">{formatNaira(l.amountKobo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="num ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
        <Row k="Subtotal" v={formatNaira(d.totals.subtotalKobo)} />
        {d.taxes.map((t) => (
          <Row key={t.code} k={`${t.label} ${t.rateBps / 100}%${t.inclusive ? " (incl.)" : ""}`} v={formatNaira(t.amountKobo)} muted />
        ))}
        <div className="flex justify-between border-t border-ink pt-2 text-base font-medium">
          <dt className="font-sans">Total</dt>
          <dd>{formatNaira(d.totals.totalKobo)}</dd>
        </div>
        {d.payments.map((p, i) => (
          <Row key={i} k={`Paid, ${METHOD[p.method] ?? p.method}`} v={`-${formatNaira(p.amountKobo)}`} muted />
        ))}
        {d.refunds.map((p, i) => (
          <Row key={`r${i}`} k="Refunded" v={formatNaira(p.amountKobo)} muted />
        ))}
        <div className="flex justify-between border-t border-line pt-2 font-medium">
          <dt className="font-sans">Balance</dt>
          <dd>{formatNaira(d.totals.balanceKobo)}</dd>
        </div>
      </dl>
    </>
  );
}

function ReceiptBody({ d }: { d: ReceiptDoc }) {
  return (
    <div className="py-8">
      {d.voided ? <p className="kicker mb-4 !text-danger">Voided</p> : null}
      <p className="text-sm text-ink-muted">Received from</p>
      <p className="display-sm mt-1 text-2xl">{d.guestName ?? "Guest"}</p>
      <p className="num mt-8 text-[2.6rem] font-medium leading-none">{formatNaira(d.amountKobo)}</p>
      <p className="mt-2 font-display italic text-ink-muted">{d.amountInWords}</p>
      <dl className="num mt-8 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="kicker !text-[10px]">Method</dt>
          <dd className="mt-1 font-sans">{METHOD[d.method] ?? d.method}</dd>
        </div>
        <div>
          <dt className="kicker !text-[10px]">Booking</dt>
          <dd className="mt-1">{d.reservationCode ?? "—"}</dd>
        </div>
        <div>
          <dt className="kicker !text-[10px]">Reference</dt>
          <dd className="mt-1 break-all">{d.reference ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-ink-muted" : ""}`}>
      <dt className="font-sans">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
