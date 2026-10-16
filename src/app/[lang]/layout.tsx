import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { appUrl } from "@/lib/env";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const m = getMessages(lang);
  const base = appUrl();
  return {
    metadataBase: new URL(base),
    title: { default: m.landing.meta_title, template: `%s · ${m.brand}` },
    description: m.landing.meta_desc,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}`])) },
    openGraph: { title: m.landing.meta_title, description: m.landing.meta_desc, type: "website", siteName: m.brand },
    robots: process.env.ALLOW_INDEXING === "true" ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LangLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const m = getMessages(lang);
  return (
    <html lang={lang}>
      <body>
        <a className="skip" href="#main">
          {m.common.skip}
        </a>
        <SiteHeader lang={lang} />
        <main id="main" tabIndex={-1} style={{ outline: "none" }}>
          {children}
        </main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
