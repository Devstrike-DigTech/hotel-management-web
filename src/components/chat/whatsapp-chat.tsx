import { ArrowUpRight, WhatsappLogo } from "@phosphor-icons/react/ssr";
import { formatPhone, toE164Digits } from "@/lib/format";

/**
 * "Chat with the hotel on WhatsApp", for hotels that answer guests there (the Pro tier's
 * whatsapp_messaging). A plain wa.me link: it opens the WhatsApp app on a phone and WhatsApp Web on
 * a computer, with a first message ready to send. With a booking, the message carries its code,
 * so the hotel's inbox links the conversation to the reservation.
 */

export function whatsappChatUrl(number: string, text: string) {
  return `https://wa.me/${toE164Digits(number)}?text=${encodeURIComponent(text)}`;
}

export function chatMessage(hotelName: string, code?: string | null) {
  return code ? `Hello ${hotelName}, this is about my booking ${code}.` : `Hello ${hotelName}, I have a question about a stay.`;
}

interface Props {
  number: string;
  hotelName: string;
  code?: string | null;
  /** panel: a small card (hotel page, trip); row: a line in a list; stub: a cell of the confirmation card's stub. */
  variant?: "panel" | "row";
  className?: string;
}

export function WhatsAppChat({ number, hotelName, code, variant = "panel", className = "" }: Props) {
  const href = whatsappChatUrl(number, chatMessage(hotelName, code));
  if (variant === "row")
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 px-5 py-3 hover:bg-surface-2 ${className}`} data-testid="whatsapp-chat">
        <WhatsappLogo size={18} weight="light" className="text-palm" aria-hidden />
        <span className="min-w-0 flex-1">
          Chat with the hotel on WhatsApp
          {code ? <span className="block text-xs text-ink-muted">Opens with your code, <span className="num">{code}</span>, ready to send</span> : null}
        </span>
        <ArrowUpRight size={13} className="text-ink-muted" aria-hidden />
      </a>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-start gap-4 rounded-md border border-palm/40 bg-palm/[0.05] p-4 transition-colors hover:border-palm hover:bg-palm/[0.08] ${className}`}
      data-testid="whatsapp-chat"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-palm/50 text-palm">
        <WhatsappLogo size={21} weight="light" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 font-medium">
          Chat with the hotel on WhatsApp
          <ArrowUpRight size={14} className="shrink-0 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-palm" aria-hidden />
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
          {code ? (
            <>
              The front desk of {hotelName} answers here. Your code, <span className="num text-ink">{code}</span>, is in the first message.
            </>
          ) : (
            <>The front desk answers here: rooms, airport pick-up, a late arrival.</>
          )}
        </span>
        <span className="num mt-1.5 block text-xs text-ink-muted">{formatPhone(number)}</span>
      </span>
    </a>
  );
}
