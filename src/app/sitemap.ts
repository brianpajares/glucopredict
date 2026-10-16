import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { LOCALES } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.ALLOW_INDEXING !== "true") return [];
  const base = appUrl();
  const paths = ["", "/calcular", "/como-funciona", "/legal/privacidad", "/legal/terminos", "/legal/aviso-medico"];
  return LOCALES.flatMap((l) =>
    paths.map((p) => ({
      url: `${base}/${l}${p}`,
      changeFrequency: "monthly" as const,
      alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x, `${base}/${x}${p}`])) },
    })),
  );
}
