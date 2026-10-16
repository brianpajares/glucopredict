import { NextResponse, type NextRequest } from "next/server";

/** `/` → idioma preferido del navegador (es por defecto). */
export function proxy(req: NextRequest) {
  const accept = req.headers.get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  const lang = first.startsWith("pt") ? "pt" : first.startsWith("en") ? "en" : "es";
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}`;
  return NextResponse.redirect(url, 307);
}

export const config = { matcher: ["/"] };
