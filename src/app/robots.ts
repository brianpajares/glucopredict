import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Mientras `ALLOW_INDEXING` no sea "true" (gates legales/IP pendientes) todo queda fuera de buscadores. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/unlock/"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
