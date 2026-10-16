import { PDFDocument, PDFFont, PDFName, PDFPage, PDFString, StandardFonts, degrees, rgb, type RGB } from "pdf-lib";
import { fmt } from "@/lib/i18n/config";
import type { Block, ReportDocument } from "./model";
import type { ReportCopy } from "./copy.types";

/**
 * Renderer PDF (pdf-lib, fuentes estándar). Dos modos:
 *  - full: informe completo.
 *  - preview: "borroso" REAL — los valores y párrafos bloqueados NUNCA se escriben en el archivo;
 *    se dibujan barras grises de ancho pseudo-aleatorio (en PDF el texto tapado sigue siendo extraíble).
 */
export interface RenderOptions {
  mode: "full" | "preview";
  preview?: { unlockUrl: string; priceLabel: string };
}

const A4: [number, number] = [595.28, 841.89];
const M = { left: 48, right: 48, top: 56, bottom: 64 };
const CONTENT_W = A4[0] - M.left - M.right;

const C = {
  text: rgb(0.067, 0.094, 0.153),
  muted: rgb(0.294, 0.333, 0.388),
  primary: rgb(0.059, 0.463, 0.431),
  primaryDark: rgb(0.067, 0.369, 0.349),
  border: rgb(0.82, 0.835, 0.859),
  subtle: rgb(0.953, 0.957, 0.965),
  white: rgb(1, 1, 1),
  info: { bg: rgb(0.906, 0.961, 0.953), fg: rgb(0.075, 0.306, 0.29) },
  warn: { bg: rgb(0.996, 0.953, 0.78), fg: rgb(0.471, 0.208, 0.059) },
  ok: { bg: rgb(0.82, 0.98, 0.898), fg: rgb(0.024, 0.373, 0.275) },
} as const;
const BAND_COLORS: RGB[] = [rgb(0.8, 0.922, 0.902), rgb(0.6, 0.839, 0.808), rgb(0.4, 0.757, 0.714), rgb(0.18, 0.612, 0.565), rgb(0.059, 0.463, 0.431)];

const REPLACEMENTS: [RegExp, string][] = [
  [/≥/g, ">="],
  [/≤/g, "<="],
  [/→/g, "->"],
  [/≈/g, "~"],
  [/[−‑‒]/g, "-"],
  [/[   ]/g, " "],
  [/[▸►]/g, "-"],
  [/✓/g, "v"],
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Layout {
  pdf!: PDFDocument;
  regular!: PDFFont;
  bold!: PDFFont;
  italic!: PDFFont;
  page!: PDFPage;
  y = 0;
  private charset = new Set<number>();
  private rnd: () => number;
  private contPages = 0;
  private curTitle = "";

  constructor(
    private readonly doc: ReportDocument,
    private readonly copy: ReportCopy,
    private readonly opts: RenderOptions,
  ) {
    this.rnd = mulberry32(doc.meta.score * 7919 + doc.pages.length);
  }

  get preview(): boolean {
    return this.opts.mode === "preview";
  }

  async init(): Promise<void> {
    this.pdf = await PDFDocument.create();
    this.regular = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.bold = await this.pdf.embedFont(StandardFonts.HelveticaBold);
    this.italic = await this.pdf.embedFont(StandardFonts.HelveticaOblique);
    this.charset = new Set(this.regular.getCharacterSet());
    this.pdf.setTitle(`${this.copy.app} · ${this.doc.title}${this.preview ? ` · ${this.copy.preview.header}` : ""}`);
    this.pdf.setAuthor("GlucoPredict");
    this.pdf.setSubject(this.copy.footer_note);
    this.pdf.setProducer("GlucoPredict");
    this.pdf.setCreator("GlucoPredict");
    this.pdf.catalog.set(PDFName.of("Lang"), PDFString.of(this.doc.locale));
  }

  clean(text: string): string {
    let s = text;
    for (const [re, to] of REPLACEMENTS) s = s.replace(re, to);
    let out = "";
    for (const ch of s) out += ch === "\n" || this.charset.has(ch.codePointAt(0) ?? 0) ? ch : "?";
    return out;
  }

  wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
    const lines: string[] = [];
    for (const para of this.clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let w = word;
        // palabras más anchas que la línea (URLs): se parten por caracteres
        while (font.widthOfTextAtSize(w, size) > maxW) {
          let cut = w.length;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) cut--;
          if (line) {
            lines.push(line);
            line = "";
          }
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
        else {
          if (line) lines.push(line);
          line = w;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  // ---------- páginas ----------
  newPage(title: string, cont = false): void {
    this.page = this.pdf.addPage(A4);
    const [W, H] = A4;
    this.curTitle = title;
    // cabecera
    this.page.drawRectangle({ x: M.left, y: H - 44, width: 18, height: 18, color: C.primary });
    this.page.drawText("G", { x: M.left + 5.2, y: H - 39.5, size: 11, font: this.bold, color: C.white });
    this.page.drawText("GlucoPredict", { x: M.left + 25, y: H - 38.5, size: 11, font: this.bold, color: C.text });
    const right = this.preview ? this.copy.preview.header.toUpperCase() : this.doc.meta.modelLine;
    const rt = this.clean(right);
    this.page.drawText(rt, { x: W - M.right - this.regular.widthOfTextAtSize(rt, 8.5), y: H - 38, size: 8.5, font: this.regular, color: C.muted });
    this.page.drawLine({ start: { x: M.left, y: H - 52 }, end: { x: W - M.right, y: H - 52 }, thickness: 0.6, color: C.border });
    // título
    const t = this.clean(cont ? `${title} · cont.` : title);
    const lines = this.wrap(t, this.bold, 19, CONTENT_W);
    let y = H - 84;
    for (const l of lines) {
      this.page.drawText(l, { x: M.left, y, size: 19, font: this.bold, color: C.text });
      y -= 24;
    }
    this.y = y - 6;
    if (this.preview) this.drawWatermark();
  }

  ensure(h: number): void {
    if (this.y - h < M.bottom) {
      this.contPages += 1;
      this.newPage(this.curTitle, true);
    }
  }

  drawWatermark(): void {
    const [W, H] = A4;
    const text = this.clean(this.copy.preview.watermark);
    const size = 64;
    const w = this.bold.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: W / 2 - (w / 2) * Math.cos(Math.PI / 6),
      y: H / 2 - (w / 2) * Math.sin(Math.PI / 6),
      size,
      font: this.bold,
      color: rgb(0.059, 0.463, 0.431),
      opacity: 0.07,
      rotate: degrees(30),
    });
  }

  // ---------- primitivas de borroso ----------
  smudge(x: number, y: number, w: number, h = 7): void {
    if (w <= 0) return;
    this.page.drawRectangle({ x: x - 1.5, y: y - 1.5, width: w + 3, height: h + 3, color: rgb(0.86, 0.88, 0.9), opacity: 0.25 });
    this.page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.8, 0.83, 0.87), opacity: 0.6 });
    this.page.drawRectangle({ x: x + 2, y: y + h * 0.25, width: Math.max(0, w - 4), height: h * 0.5, color: rgb(0.72, 0.77, 0.82), opacity: 0.35 });
  }

  smudgeLines(x: number, topY: number, maxW: number, count: number, size: number): void {
    const lh = size * 1.42;
    for (let i = 0; i < count; i++) {
      const last = i === count - 1 && count > 1;
      const w = maxW * (last ? 0.25 + this.rnd() * 0.4 : 0.7 + this.rnd() * 0.3);
      this.smudge(x, topY - (i + 1) * lh + size * 0.15, w, size * 0.68);
    }
  }

  link(rect: [number, number, number, number], url: string): void {
    const ctx = this.pdf.context;
    const annot = ctx.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: rect,
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    const ref = ctx.register(annot);
    const existing = this.page.node.Annots();
    if (existing) existing.push(ref);
    else this.page.node.set(PDFName.of("Annots"), ctx.obj([ref]));
  }

  // ---------- bloques ----------
  private visible(free?: boolean): boolean {
    return !this.preview || !!free;
  }

  drawText(lines: string[], x: number, font: PDFFont, size: number, color: RGB, lh = size * 1.42): void {
    for (const l of lines) {
      this.page.drawText(l, { x, y: this.y - size, size, font, color });
      this.y -= lh;
    }
  }

  paragraph(text: string, opts: { free?: boolean; muted?: boolean; small?: boolean; x?: number; w?: number } = {}): void {
    const size = opts.small ? 8.8 : 10.2;
    const x = opts.x ?? M.left;
    const w = opts.w ?? CONTENT_W;
    const font = opts.muted ? this.italic : this.regular;
    const lines = this.wrap(text, font, size, w);
    const lh = size * 1.42;
    this.ensure(Math.min(lines.length, 3) * lh + 6);
    if (this.visible(opts.free)) {
      for (const l of lines) {
        this.ensure(lh);
        this.page.drawText(l, { x, y: this.y - size, size, font, color: opts.muted ? C.muted : C.text });
        this.y -= lh;
      }
    } else {
      this.smudgeLines(x, this.y, w, lines.length, size);
      this.y -= lines.length * lh;
    }
    this.y -= 5;
  }

  heading(text: string): void {
    this.ensure(46);
    this.y -= 6;
    const lines = this.wrap(text, this.bold, 12.5, CONTENT_W);
    for (const l of lines) {
      this.page.drawText(l, { x: M.left, y: this.y - 12.5, size: 12.5, font: this.bold, color: C.primaryDark });
      this.y -= 17;
    }
    this.y -= 3;
  }

  bullets(items: string[], free?: boolean, boxes = false): void {
    const size = 10.2;
    const lh = size * 1.42;
    const indent = 16;
    for (const item of items) {
      const lines = this.wrap(item, this.regular, size, CONTENT_W - indent);
      this.ensure(Math.min(lines.length, 2) * lh + 4);
      if (boxes) {
        this.page.drawRectangle({ x: M.left + 1, y: this.y - size + 0.5, width: 8, height: 8, borderColor: C.primary, borderWidth: 1 });
      } else {
        this.page.drawRectangle({ x: M.left + 3, y: this.y - size + 3.2, width: 3.6, height: 3.6, color: C.primary });
      }
      if (this.visible(free)) {
        for (const l of lines) {
          this.ensure(lh);
          this.page.drawText(l, { x: M.left + indent, y: this.y - size, size, font: this.regular, color: C.text });
          this.y -= lh;
        }
      } else {
        this.smudgeLines(M.left + indent, this.y, CONTENT_W - indent, lines.length, size);
        this.y -= lines.length * lh;
      }
      this.y -= 3.5;
    }
    this.y -= 3;
  }

  callout(tone: "info" | "warn" | "ok", text: string, free?: boolean): void {
    const size = 9.8;
    const lh = size * 1.42;
    const pad = 10;
    const lines = this.wrap(text, this.regular, size, CONTENT_W - pad * 2 - 4);
    const h = lines.length * lh + pad * 2;
    this.ensure(h + 6);
    const col = C[tone];
    this.page.drawRectangle({ x: M.left, y: this.y - h, width: CONTENT_W, height: h, color: col.bg });
    this.page.drawRectangle({ x: M.left, y: this.y - h, width: 3, height: h, color: col.fg });
    const topY = this.y - pad;
    if (this.visible(free)) {
      lines.forEach((l, i) => this.page.drawText(l, { x: M.left + pad + 4, y: topY - size - i * lh + 1, size, font: this.regular, color: col.fg }));
    } else {
      this.smudgeLines(M.left + pad + 4, topY, CONTENT_W - pad * 2 - 4, lines.length, size);
    }
    this.y -= h + 8;
  }

  kv(rows: [string, string][], free?: boolean): void {
    const size = 10;
    const labelW = CONTENT_W * 0.5;
    const valueW = CONTENT_W - labelW - 8;
    for (const [label, value] of rows) {
      const ll = this.wrap(label, this.regular, size, labelW - 8);
      const vl = this.wrap(value, this.bold, size, valueW);
      const n = Math.max(ll.length, vl.length);
      const h = n * size * 1.4 + 8;
      this.ensure(h);
      this.page.drawLine({ start: { x: M.left, y: this.y - h }, end: { x: M.left + CONTENT_W, y: this.y - h }, thickness: 0.4, color: C.border });
      ll.forEach((l, i) => this.page.drawText(l, { x: M.left, y: this.y - 4 - size - i * size * 1.4, size, font: this.regular, color: C.muted }));
      if (this.visible(free)) {
        vl.forEach((l, i) => this.page.drawText(l, { x: M.left + labelW + 8, y: this.y - 4 - size - i * size * 1.4, size, font: this.bold, color: C.text }));
      } else {
        this.smudge(M.left + labelW + 8, this.y - 4 - size + 1, valueW * (0.35 + this.rnd() * 0.45), size * 0.7);
      }
      this.y -= h;
    }
    this.y -= 8;
  }

  table(b: Extract<Block, { t: "table" }>): void {
    const size = 9.2;
    const lh = size * 1.38;
    const padX = 5;
    const padY = 5;
    const widths = b.widths.map((w) => w * CONTENT_W);
    const hasHead = b.head.some((h) => h.length > 0);
    const drawRow = (cells: string[], isHead: boolean, rowIndex: number) => {
      const wrapped = cells.map((cell, i) => this.wrap(cell, isHead ? this.bold : this.regular, size, widths[i] - padX * 2));
      const lines = Math.max(1, ...wrapped.map((w) => w.length));
      const h = Math.max(lines * lh + padY * 2, isHead ? 0 : (b.minRowH ?? 0));
      this.ensure(h);
      const hl = !isHead && b.highlightRow === rowIndex;
      if (isHead) this.page.drawRectangle({ x: M.left, y: this.y - h, width: CONTENT_W, height: h, color: C.subtle });
      if (hl) this.page.drawRectangle({ x: M.left, y: this.y - h, width: CONTENT_W, height: h, color: C.info.bg });
      this.page.drawLine({ start: { x: M.left, y: this.y - h }, end: { x: M.left + CONTENT_W, y: this.y - h }, thickness: 0.4, color: C.border });
      let x = M.left;
      wrapped.forEach((cellLines, i) => {
        const locked = this.preview && !isHead && !(i === 0 && b.lockFirstCol !== false);
        if (locked) {
          this.smudgeLines(x + padX, this.y - padY, widths[i] - padX * 2, Math.min(cellLines.length, 3), size);
        } else {
          cellLines.forEach((l, li) =>
            this.page.drawText(l, { x: x + padX, y: this.y - padY - size - li * lh + 1, size, font: isHead || (i === 0 && !isHead && b.head[0] !== "") ? this.bold : this.regular, color: C.text }),
          );
        }
        x += widths[i];
      });
      if (b.grid) {
        let gx = M.left;
        for (let i = 0; i <= widths.length; i++) {
          this.page.drawLine({ start: { x: gx, y: this.y }, end: { x: gx, y: this.y - h }, thickness: 0.4, color: C.border });
          gx += widths[i] ?? 0;
        }
      }
      this.y -= h;
    };
    if (hasHead) drawRow(b.head, true, -1);
    b.rows.forEach((row, ri) => drawRow(row, false, ri));
    this.y -= 10;
  }

  bars(rows: { label: string; value: number; max: number }[]): void {
    const size = 9.6;
    const labelW = 190;
    const valueW = 34;
    const trackW = CONTENT_W - labelW - valueW - 10;
    for (const r of rows) {
      this.ensure(22);
      const label = this.wrap(r.label, this.regular, size, labelW - 6)[0];
      this.page.drawText(label, { x: M.left, y: this.y - 13, size, font: this.regular, color: C.text });
      const tx = M.left + labelW;
      this.page.drawRectangle({ x: tx, y: this.y - 14, width: trackW, height: 9, color: C.subtle, borderColor: C.border, borderWidth: 0.4 });
      if (this.preview) {
        this.smudge(tx, this.y - 14, trackW * (0.2 + this.rnd() * 0.6), 9);
        this.smudge(tx + trackW + 8, this.y - 14, 22, 9);
      } else {
        if (r.value > 0) this.page.drawRectangle({ x: tx, y: this.y - 14, width: (trackW * r.value) / r.max, height: 9, color: C.primary });
        const v = `${r.value}/${r.max}`;
        this.page.drawText(v, { x: tx + trackW + 8, y: this.y - 13, size, font: this.bold, color: C.text });
      }
      this.y -= 22;
    }
    this.y -= 6;
  }

  scorebar(score: number): void {
    this.ensure(70);
    const x0 = M.left + 4;
    const w = CONTENT_W - 8;
    const barY = this.y - 34;
    const edges = [0, 7, 12, 15, 21, 27].map((e) => e / 27);
    for (let i = 0; i < 5; i++) {
      this.page.drawRectangle({ x: x0 + w * edges[i], y: barY, width: w * (edges[i + 1] - edges[i]), height: 16, color: BAND_COLORS[i] });
    }
    for (const t of [0, 7, 12, 15, 21, 26]) {
      const tx = x0 + (w * t) / 27;
      this.page.drawText(String(t), { x: tx - 2, y: barY - 11, size: 8, font: this.regular, color: C.muted });
    }
    const mx = x0 + (w * (score + 0.5)) / 27;
    this.page.drawRectangle({ x: mx - 1.5, y: barY - 5, width: 3, height: 26, color: C.text });
    this.page.drawCircle({ x: mx, y: barY + 24, size: 5, color: C.text });
    this.page.drawText(String(score), { x: mx - this.bold.widthOfTextAtSize(String(score), 10) / 2, y: barY + 33, size: 10, font: this.bold, color: C.text });
    this.y -= 70;
  }

  kpis(items: { label: string; value: string; locked?: boolean }[], free?: boolean): void {
    const gap = 8;
    const w = (CONTENT_W - gap * (items.length - 1)) / items.length;
    const h = 62;
    this.ensure(h + 8);
    items.forEach((it, i) => {
      const x = M.left + i * (w + gap);
      this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, color: C.subtle, borderColor: C.border, borderWidth: 0.6 });
      const label = this.wrap(it.label, this.regular, 8.2, w - 14)[0];
      this.page.drawText(label, { x: x + 8, y: this.y - 16, size: 8.2, font: this.regular, color: C.muted });
      if (this.visible(free) && !(this.preview && it.locked)) {
        const size = i === 0 ? 24 : 12.5;
        const vl = this.wrap(it.value, this.bold, size, w - 14);
        vl.slice(0, 2).forEach((l, li) => this.page.drawText(l, { x: x + 8, y: this.y - 42 - li * 14 + (i === 0 ? 0 : 6), size, font: this.bold, color: i === 0 ? C.primary : C.text }));
      } else {
        this.smudge(x + 8, this.y - 44, w * 0.5, 12);
      }
    });
    this.y -= h + 10;
  }

  qa(items: { q: string; a: string }[]): void {
    for (const it of items) {
      this.ensure(44);
      const ql = this.wrap(it.q, this.bold, 10.2, CONTENT_W);
      this.drawText(ql, M.left, this.bold, 10.2, C.text);
      this.paragraph(it.a, { small: false });
    }
  }

  linkLine(label: string, url: string): void {
    const size = 9.6;
    const lines = this.wrap(`${label} - ${url}`, this.regular, size, CONTENT_W);
    this.ensure(lines.length * size * 1.42 + 6);
    const top = this.y;
    this.drawText(lines, M.left, this.regular, size, C.primary);
    this.link([M.left, this.y, M.left + CONTENT_W, top], url);
    this.y -= 4;
  }

  block(b: Block): void {
    switch (b.t) {
      case "h2":
        return this.heading(b.text);
      case "p":
        return this.paragraph(b.text, { free: b.free, muted: b.muted, small: b.small });
      case "bullets":
        return this.bullets(b.items, b.free);
      case "kv":
        return this.kv(b.rows, b.free);
      case "table":
        return this.table(b);
      case "bars":
        return this.bars(b.rows);
      case "scorebar":
        return this.scorebar(b.score);
      case "kpis":
        return this.kpis(b.items, b.free);
      case "callout":
        return this.callout(b.tone, b.text, b.free);
      case "checklist":
        return this.bullets(b.items, false, true);
      case "qa":
        return this.qa(b.items);
      case "link":
        return this.linkLine(b.label, b.url);
      case "spacer":
        this.y -= b.h;
        return;
      case "keep":
        return this.ensure(b.h);
    }
  }

  // ---------- vista previa: tarjeta de desbloqueo ----------
  unlockCard(): void {
    const p = this.opts.preview;
    if (!p) return;
    const c = this.copy.preview;
    const body = this.wrap(c.card_body, this.regular, 9.6, CONTENT_W - 36);
    const h = 40 + body.length * 13.6 + 52;
    this.ensure(h + 8);
    const top = this.y;
    this.page.drawRectangle({ x: M.left, y: top - h, width: CONTENT_W, height: h, color: C.white, borderColor: C.primary, borderWidth: 1.4 });
    this.page.drawText(this.clean(c.card_title), { x: M.left + 18, y: top - 26, size: 13, font: this.bold, color: C.primaryDark });
    body.forEach((l, i) => this.page.drawText(l, { x: M.left + 18, y: top - 44 - i * 13.6, size: 9.6, font: this.regular, color: C.text }));
    const label = this.clean(fmt(c.button, { price: p.priceLabel }));
    const bw = Math.min(CONTENT_W - 36, this.bold.widthOfTextAtSize(label, 10.5) + 40);
    const by = top - h + 14;
    this.page.drawRectangle({ x: M.left + 18, y: by, width: bw, height: 28, color: C.primary });
    this.page.drawText(label, { x: M.left + 38, y: by + 9.5, size: 10.5, font: this.bold, color: C.white });
    this.link([M.left + 18, by, M.left + 18 + bw, by + 28], p.unlockUrl);
    this.y -= h + 10;
  }

  lockedTag(): void {
    const text = this.clean(this.copy.preview.locked_tag);
    const size = 8;
    const w = this.bold.widthOfTextAtSize(text, size) + 14;
    this.page.drawRectangle({ x: A4[0] - M.right - w, y: A4[1] - 86, width: w, height: 16, color: C.subtle, borderColor: C.border, borderWidth: 0.5 });
    this.page.drawText(text, { x: A4[0] - M.right - w + 7, y: A4[1] - 81, size, font: this.bold, color: C.muted });
  }

  // ---------- pie ----------
  footers(): void {
    const pages = this.pdf.getPages();
    const n = pages.length;
    pages.forEach((page, i) => {
      this.page = page;
      const left = this.clean(
        this.preview
          ? `${this.copy.app} · ${this.doc.meta.verification} · ${this.copy.preview.footer}`
          : `${this.copy.app} · ${this.doc.meta.verification} · ${this.doc.meta.modelLine} · ${this.doc.meta.generated}`,
      );
      const right = this.clean(fmt(this.copy.page_of, { i: i + 1, n }));
      page.drawLine({ start: { x: M.left, y: 48 }, end: { x: A4[0] - M.right, y: 48 }, thickness: 0.5, color: C.border });
      page.drawText(left, { x: M.left, y: 36, size: 7.8, font: this.regular, color: C.muted });
      page.drawText(right, { x: A4[0] - M.right - this.regular.widthOfTextAtSize(right, 7.8), y: 36, size: 7.8, font: this.regular, color: C.muted });
      page.drawText(this.clean(this.copy.footer_note), { x: M.left, y: 25, size: 7.8, font: this.italic, color: C.muted });
      if (this.preview && this.opts.preview) {
        const label = this.clean(fmt(this.copy.preview.button, { price: this.opts.preview.priceLabel }));
        const w = this.bold.widthOfTextAtSize(label, 7.8);
        const x = A4[0] - M.right - w;
        page.drawText(label, { x, y: 25, size: 7.8, font: this.bold, color: C.primary });
        this.link([x, 22, x + w, 34], this.opts.preview.unlockUrl);
      }
    });
  }
}

export async function renderReportPdf(doc: ReportDocument, copy: ReportCopy, opts: RenderOptions): Promise<Uint8Array> {
  const L = new Layout(doc, copy, opts);
  await L.init();
  doc.pages.forEach((p, idx) => {
    L.newPage(p.title);
    if (L.preview && idx > 0) L.lockedTag();
    for (const b of p.blocks) L.block(b);
    if (L.preview && (idx === 0 || idx === doc.pages.length - 1)) L.unlockCard();
  });
  L.footers();
  return L.pdf.save();
}

/** Caracteres que la fuente estándar (WinAnsi) no puede escribir tras las sustituciones: deben ser cero (tests). */
export async function unsupportedChars(texts: string[]): Promise<string[]> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const set = new Set(font.getCharacterSet());
  const bad = new Set<string>();
  for (const t of texts) {
    let s = t;
    for (const [re, to] of REPLACEMENTS) s = s.replace(re, to);
    for (const ch of s) if (ch !== "\n" && !set.has(ch.codePointAt(0) ?? 0)) bad.add(ch);
  }
  return [...bad];
}
