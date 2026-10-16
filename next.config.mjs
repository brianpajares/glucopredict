import { fileURLToPath } from "node:url";

const isProd = process.env.NODE_ENV === "production";
const onVercel = process.env.VERCEL === "1";
const indexing = process.env.ALLOW_INDEXING === "true";

// CSP con los dominios de PayPal (lección PivotWorth #16). `unsafe-inline` es necesario para los scripts
// de hidratación de Next; el resto es lista cerrada. upgrade-insecure-requests solo en Vercel:
// en localhost rompe WebKit (lección #17).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.paypal.com https://*.paypal.com https://www.paypalobjects.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.paypalobjects.com https://*.paypal.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
  "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paypal.com",
  "object-src 'none'",
  ...(onVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // same-origin rompería el popup de PayPal
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com" "https://www.sandbox.paypal.com")' },
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
  ...(indexing ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  async headers() {
    return [
      { source: "/:path*", headers: baseHeaders },
      // Rutas personales: privadas, sin referrer, sin caché y fuera de buscadores
      {
        source: "/:lang/unlock/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      { source: "/api/purchase/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
