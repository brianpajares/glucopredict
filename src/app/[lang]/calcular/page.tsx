import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calculator } from "@/components/Calculator";
import { isCountry, isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { reportPrice } from "@/lib/env";
import { paymentsReady } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getMessages(lang).nav.start };
}

export default async function CalcularPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ pais?: string }> }) {
  const { lang } = await params;
  const { pais } = await searchParams;
  const upper = pais?.toUpperCase();
  const initialCountry = isCountry(upper) ? upper : undefined;
  if (!isLocale(lang)) notFound();
  const m = getMessages(lang);
  const offer = { mode: paymentsReady().ready ? ("paid" as const) : ("free" as const), priceLabel: reportPrice().label };
  return (
    <div className="wrap">
      <Calculator lang={lang} m={m} offer={offer} initialCountry={initialCountry} />
    </div>
  );
}
