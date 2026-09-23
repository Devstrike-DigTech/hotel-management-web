import type { Metadata } from "next";
import { Plus } from "@phosphor-icons/react/ssr";
import { CompareTable } from "@/components/pricing/compare-table";
import { PricingTiers } from "@/components/pricing/pricing-tiers";
import { api, settle } from "@/lib/api";
import { ADMIN_URL, APP_NAME, SUPPORT_EMAIL } from "@/lib/env";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pricing",
  description: `${APP_NAME} plans for Nigerian hotels, in naira: Starter, Growth, Pro and Enterprise. Pay monthly or yearly with Paystack.`,
  alternates: { canonical: "/pricing" },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I pay?",
    a: "Through Paystack, by card or bank transfer, monthly or yearly. Every payment gets a proper invoice with your business name on it, and you can download past invoices from Billing at any time.",
  },
  {
    q: "Is VAT included in these prices?",
    a: "No. Prices are shown before Value Added Tax, and VAT at 7.5% is added to each invoice as a separate line so your accountant can claim it.",
  },
  {
    q: "What happens when my 14-day trial ends?",
    a: "Your account turns read-only until you choose a plan: you can still see everything, but you cannot record new stays. Nothing is deleted, and your booking page stays online while you decide.",
  },
  {
    q: "And if a payment is late?",
    a: "You get a three-day grace period, then the account is marked past due. Seven days after that it becomes read-only, and only after a further thirty days is it suspended. We will have emailed and messaged you well before then.",
  },
  {
    q: "What if the internet or the power goes?",
    a: "The front desk keeps working offline. Check-ins, payments and room changes are saved on the device and sync when the connection returns, with every change kept in the audit trail.",
  },
  {
    q: "Where is our data, and who can see it?",
    a: "Each hotel's records are kept separate at the database level, so one hotel can never read another's. We process guest data in line with the Nigeria Data Protection Act 2023, and Enterprise customers can have a dedicated database.",
  },
  {
    q: "When do you charge commission?",
    a: "Only on bookings that come to you through the marketplace. Walk-ins, phone bookings and guests on your own booking site carry no commission from us.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade at any time and the new features switch on straight away. If you outgrow a limit, such as rooms or staff logins, we will tell you before anything stops working.",
  },
];

export default async function PricingPage() {
  const [plansRes, featuresRes] = await Promise.all([settle(api.plans()), settle(api.features())]);
  const plans = (plansRes.data ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
  const features = featuresRes.data ?? [];

  return (
    <>
      <section className="container-page pt-12 text-center sm:pt-16">
        <p className="kicker fade-up">Pricing, in naira</p>
        <h1 className="display mx-auto mt-6 max-w-5xl text-[clamp(2.8rem,7vw,6.4rem)]">
          <span className="reveal-line">
            <span style={{ "--d": "60ms" } as React.CSSProperties}>Priced by the room,</span>
          </span>
          <span className="reveal-line">
            <span style={{ "--d": "180ms" } as React.CSSProperties}>
              <em className="accent">paid for by the first leak</em>
            </span>
          </span>
          <span className="reveal-line">
            <span style={{ "--d": "300ms" } as React.CSSProperties}>it catches.</span>
          </span>
        </h1>
        <p className="fade-up mx-auto mt-7 max-w-xl text-[1.075rem] leading-relaxed text-ink-muted [--d:450ms]">
          Every plan starts with a 14-day trial of Growth. Pay monthly or yearly with Paystack, and change plans whenever your
          hotel does.
        </p>
      </section>

      <section aria-label="Plans" className="container-page mt-14">
        {plans.length ? (
          <PricingTiers plans={plans} features={features} adminUrl={ADMIN_URL} supportEmail={SUPPORT_EMAIL} appName={APP_NAME} />
        ) : (
          <p role="alert" className="rounded-sm border border-line-strong p-8 text-center text-ink-muted">
            Plans could not be loaded just now. Please refresh, or write to{" "}
            <a className="link-static text-ink" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        )}
      </section>

      {plans.length && features.length ? (
        <section aria-labelledby="compare-title" className="container-page mt-24 lg:mt-32">
          <span aria-hidden className="adire-rule mb-14 text-line-strong" />
          <div className="grid gap-6 lg:grid-cols-12">
            <p className="kicker lg:col-span-4">Side by side</p>
            <h2 id="compare-title" className="display-md text-[clamp(2.2rem,4.4vw,3.6rem)] lg:col-span-8">
              Every feature, <em className="accent">every plan.</em>
            </h2>
          </div>
          <div className="mt-10">
            <CompareTable plans={plans} features={features} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="faq-title" className="container-page mt-24 lg:mt-32">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="kicker">Questions</p>
            <h2 id="faq-title" className="display-md mt-4 text-[clamp(2.2rem,4vw,3.2rem)]">
              Asked at <em className="accent">every front desk.</em>
            </h2>
            <p className="mt-5 max-w-sm leading-relaxed text-ink-muted">
              Something else? Write to{" "}
              <a className="link-static text-ink" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>{" "}
              and a person will reply.
            </p>
          </div>
          <div className="border-t border-ink lg:col-span-8">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-left text-[1.1rem] hover:text-laterite">
                  <span className="display-sm">{f.q}</span>
                  <Plus size={18} aria-hidden className="shrink-0 transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
