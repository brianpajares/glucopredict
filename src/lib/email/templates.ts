import { fmt, type Locale } from "@/lib/i18n/config";

export interface Mail {
  subject: string;
  html: string;
  text: string;
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const BRAND = "#0F766E";

function shell(locale: Locale, inner: string, footer: string): string {
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F7F9FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #D1D5DB;border-radius:14px">
<tr><td style="padding:22px 28px 6px"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:${BRAND};color:#fff;border-radius:7px;font-weight:700">G</span>
<span style="font-weight:800;font-size:17px;vertical-align:middle;margin-left:8px">GlucoPredict</span></td></tr>
<tr><td style="padding:8px 28px 24px;font-size:15px;line-height:1.6">${inner}</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#4B5563">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:22px 0"><a href="${esc(url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${esc(label)}</a></p>
<p style="font-size:12px;color:#4B5563;margin:0 0 6px;word-break:break-all">${esc(url)}</p>`;
}

const DISCLAIMER: Record<Locale, string> = {
  es: "GlucoPredict es una herramienta educativa de cribado. No diagnostica diabetes ni sustituye una evaluación médica.",
  en: "GlucoPredict is an educational screening tool. It does not diagnose diabetes or replace a medical evaluation.",
  pt: "O GlucoPredict é uma ferramenta educacional de triagem. Não diagnostica diabetes nem substitui uma avaliação médica.",
};

const T = {
  es: {
    preview_subject: "Tu vista previa de GlucoPredict está lista",
    preview_h: "Gracias por confiar en GlucoPredict",
    preview_p1: "Preparamos tu análisis personalizado. Adjuntamos una vista previa en PDF: tu score y la estructura de tu informe completo, con el detalle bloqueado.",
    preview_p2: "Tu informe completo tiene más de 10 páginas: desglose de los 8 componentes, escenarios de la regla, contexto de tu país, plan educativo de 12 semanas, hoja de seguimiento y un resumen para llevar a tu consulta.",
    preview_mission: "Tu aporte permite que nuestro equipo de desarrolladores siga creando herramientas que ayudan a personas de todo el mundo a entender mejor su salud.",
    preview_cta: "Desbloquear mi informe completo · {price}",
    preview_expires: "El enlace es privado y caduca en {days} días. Si no ves el correo, revisa spam o promociones.",
    report_subject: "Tu informe completo de GlucoPredict",
    report_h: "Tu informe está listo",
    report_p1: "Gracias por tu compra. Adjuntamos tu informe completo en PDF. Guárdalo y llévalo a tu consulta.",
    report_p2: "Recuerda: es una herramienta educativa de cribado. Un score no es un diagnóstico; solo una prueba clínica interpretada por un profesional puede confirmar o descartar una condición.",
    report_p3: "Puedes volver a descargar tu informe desde el enlace de desbloqueo que te enviamos antes.",
    free_subject: "Tu informe de GlucoPredict",
    free_p1: "Gracias por probar GlucoPredict. Adjuntamos tu informe completo en PDF.",
  },
  en: {
    preview_subject: "Your GlucoPredict preview is ready",
    preview_h: "Thank you for trusting GlucoPredict",
    preview_p1: "We prepared your personalized analysis. A PDF preview is attached: your score and the structure of your full report, with the details locked.",
    preview_p2: "Your full report has more than 10 pages: a breakdown of all 8 components, rule scenarios, your country context, a 12-week educational plan, a tracking sheet and a summary to bring to your appointment.",
    preview_mission: "Your support lets our development team keep building tools that help people around the world better understand their health.",
    preview_cta: "Unlock my full report · {price}",
    preview_expires: "The link is private and expires in {days} days. If you cannot see this email, check spam or promotions.",
    report_subject: "Your complete GlucoPredict report",
    report_h: "Your report is ready",
    report_p1: "Thank you for your purchase. Your full report is attached as a PDF. Keep it and bring it to your appointment.",
    report_p2: "Remember: this is an educational screening tool. A score is not a diagnosis; only a clinical test interpreted by a professional can confirm or rule out a condition.",
    report_p3: "You can download your report again from the unlock link we sent earlier.",
    free_subject: "Your GlucoPredict report",
    free_p1: "Thank you for trying GlucoPredict. Your full report is attached as a PDF.",
  },
  pt: {
    preview_subject: "Sua prévia do GlucoPredict está pronta",
    preview_h: "Obrigado por confiar no GlucoPredict",
    preview_p1: "Preparamos sua análise personalizada. Anexamos uma prévia em PDF: seu score e a estrutura do seu relatório completo, com o detalhamento bloqueado.",
    preview_p2: "Seu relatório completo tem mais de 10 páginas: detalhamento dos 8 componentes, cenários da regra, contexto do seu país, plano educativo de 12 semanas, planilha de acompanhamento e um resumo para levar à sua consulta.",
    preview_mission: "Sua contribuição permite que nossa equipe de desenvolvedores continue criando ferramentas que ajudam pessoas do mundo todo a entender melhor sua saúde.",
    preview_cta: "Desbloquear meu relatório completo · {price}",
    preview_expires: "O link é privado e expira em {days} dias. Se não encontrar o email, verifique spam ou promoções.",
    report_subject: "Seu relatório completo do GlucoPredict",
    report_h: "Seu relatório está pronto",
    report_p1: "Obrigado pela sua compra. Anexamos seu relatório completo em PDF. Guarde-o e leve-o à sua consulta.",
    report_p2: "Lembre-se: é uma ferramenta educacional de triagem. Um score não é um diagnóstico; somente um exame clínico interpretado por um profissional pode confirmar ou descartar uma condição.",
    report_p3: "Você pode baixar seu relatório novamente pelo link de desbloqueio que enviamos antes.",
    free_subject: "Seu relatório do GlucoPredict",
    free_p1: "Obrigado por experimentar o GlucoPredict. Anexamos seu relatório completo em PDF.",
  },
} as const;

export function previewEmail(locale: Locale, a: { unlockUrl: string; priceLabel: string; days: number }): Mail {
  const t = T[locale];
  const cta = fmt(t.preview_cta, { price: a.priceLabel });
  const expires = fmt(t.preview_expires, { days: a.days });
  const inner = `<h1 style="font-size:21px;line-height:1.3;margin:12px 0">${esc(t.preview_h)}</h1><p>${esc(t.preview_p1)}</p><p>${esc(t.preview_p2)}</p><p style="color:#4B5563">${esc(t.preview_mission)}</p>${button(a.unlockUrl, cta)}<p style="font-size:13px;color:#4B5563">${esc(expires)}</p>`;
  return {
    subject: t.preview_subject,
    html: shell(locale, inner, DISCLAIMER[locale]),
    text: `${t.preview_h}\n\n${t.preview_p1}\n\n${t.preview_p2}\n\n${t.preview_mission}\n\n${cta}: ${a.unlockUrl}\n\n${expires}\n\n${DISCLAIMER[locale]}`,
  };
}

export function reportEmail(locale: Locale, kind: "paid" | "free"): Mail {
  const t = T[locale];
  const p1 = kind === "paid" ? t.report_p1 : t.free_p1;
  const inner = `<h1 style="font-size:21px;line-height:1.3;margin:12px 0">${esc(t.report_h)}</h1><p>${esc(p1)}</p><p>${esc(t.report_p2)}</p>${kind === "paid" ? `<p style="color:#4B5563">${esc(t.report_p3)}</p>` : ""}`;
  return {
    subject: kind === "paid" ? t.report_subject : t.free_subject,
    html: shell(locale, inner, DISCLAIMER[locale]),
    text: `${t.report_h}\n\n${p1}\n\n${t.report_p2}\n\n${DISCLAIMER[locale]}`,
  };
}

/** Correos al dueño: en español (idioma operativo). */
export function ownerLeadEmail(a: { id: string; locale: Locale; country: string; mode: "preview" | "free"; withCopy: boolean }): Mail {
  const lines = [
    `Solicitud de informe ${a.id}`,
    `Idioma: ${a.locale} · Perfil de país: ${a.country}`,
    `Modo: ${a.mode === "preview" ? "vista previa + desbloqueo de pago" : "informe gratuito (validación)"}`,
    a.withCopy
      ? "El usuario autorizó una copia: se adjunta el PDF completo."
      : "Sin consentimiento de copia: no se incluyen datos de salud ni PDF.",
  ];
  const inner = `<h1 style="font-size:19px;margin:12px 0">${esc(lines[0])}</h1>${lines.slice(1).map((l) => `<p style="margin:6px 0">${esc(l)}</p>`).join("")}`;
  return { subject: `[GlucoPredict] Solicitud de informe ${a.id}`, html: shell("es", inner, "Aviso operativo de GlucoPredict."), text: lines.join("\n") };
}

export function ownerSaleEmail(a: { id: string; priceLabel: string; delivery: string; env: "sandbox" | "live"; captureId: string; withCopy: boolean }): Mail {
  const tag = a.env === "sandbox" ? " | SANDBOX" : "";
  const subject = `GlucoPredict | VENTA CONFIRMADA ${a.priceLabel} | ${a.id} | ${a.delivery}${tag}`;
  const lines = [
    `Venta confirmada: ${a.priceLabel}`,
    `Compra: ${a.id}`,
    `Captura PayPal: ${a.captureId}`,
    `Entrega: ${a.delivery}`,
    `Entorno: ${a.env}`,
    a.withCopy ? "Se adjunta el PDF completo (el usuario autorizó la copia)." : "Sin copia del informe (sin consentimiento).",
  ];
  const inner = `<h1 style="font-size:19px;margin:12px 0">${esc(lines[0])}</h1>${lines.slice(1).map((l) => `<p style="margin:6px 0">${esc(l)}</p>`).join("")}`;
  return { subject, html: shell("es", inner, "Aviso operativo de GlucoPredict."), text: lines.join("\n") };
}
