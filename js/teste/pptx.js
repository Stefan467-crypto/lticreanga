// Construiește fișierul .pptx din planul făcut de AI (ai.js → composeSlides). Biblioteca pptxgenjs (js/lib) se încarcă doar când se descarcă prezentarea.
export const THEMES = {
  bordo: { nume: "Bordo (al școlii)", pr: "8A1C2B", dk: "5E1220", bg: "FAF8F3", card: "FFFFFF", tx: "2B1B1E", mu: "7A6A6D", ac: "C9A66B", bd: "E8DDD3", on: "FFFFFF", tbg: "8A1C2B" },
  albastru: { nume: "Albastru", pr: "1F4E8C", dk: "12305A", bg: "F4F8FC", card: "FFFFFF", tx: "15233A", mu: "5E6B7D", ac: "F2A93B", bd: "D5E1EF", on: "FFFFFF", tbg: "1F4E8C" },
  verde: { nume: "Verde", pr: "2E7D4F", dk: "1B4D2F", bg: "F4FAF6", card: "FFFFFF", tx: "14281B", mu: "5D6F63", ac: "E0A526", bd: "D3E6DA", on: "FFFFFF", tbg: "2E7D4F" },
  noapte: { nume: "Întunecat", pr: "E08DA0", dk: "1E1B22", bg: "1E1B22", card: "2B2730", tx: "F3EDE8", mu: "B7ADB1", ac: "E3B76B", bd: "3D3744", on: "1E1B22", tbg: "2B1220" },
};
const W = 13.333, H = 7.5, X0 = 0.8, CW = W - 2 * X0, Y0 = 1.95, YH = 4.85, GAP = 0.16, SERIF = "Georgia", SANS = "Calibri";
const ICON = { obiective: "✓", intrebari: "?", rezumat: "★", continut: "" };
export const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "prezentare";

export async function loadLib() {
  if (!window.PptxGenJS) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = new URL("../lib/pptxgen.bundle.js?v=28", import.meta.url).href; s.onload = ok; s.onerror = () => no(new Error("Nu am putut încărca modulul pentru prezentări. Verifică internetul și încearcă din nou.")); document.head.append(s); });
  return window.PptxGenJS;
}
const shadow = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 6, offset: 2, angle: 90 });

/** Creează prezentarea (obiect PptxGenJS). deck = { titlu, slides:[{tip,titlu,puncte,termeni,notite}] }; o = { materie, clasa, tema, theme, autor } */
export function makeDeck(Pptx, deck, o) {
  const T = THEMES[o.theme] || THEMES.bordo, pptx = new Pptx(); pptx.layout = "LAYOUT_WIDE"; pptx.title = deck.titlu; pptx.author = o.autor || "LT „Ion Creangă” Cahul"; pptx.company = "LT „Ion Creangă” Cahul";
  const foot = `${o.materie} · clasa a ${o.clasa}-a`, dark = o.theme === "noapte";

  /* diapozitivul de titlu */
  const s0 = pptx.addSlide(); s0.background = { color: T.tbg };
  s0.addShape("ellipse", { x: 8.6, y: -2.0, w: 8, h: 8, fill: { color: "FFFFFF", transparency: 92 }, line: { color: "FFFFFF", transparency: 100 } });
  s0.addShape("ellipse", { x: 10.7, y: 4.3, w: 4.6, h: 4.6, fill: { color: T.ac, transparency: 70 }, line: { color: T.ac, transparency: 100 } });
  s0.addShape("rect", { x: 0, y: 0, w: 0.28, h: H, fill: { color: T.ac }, line: { color: T.ac, transparency: 100 } });
  s0.addText(deck.titlu, { x: X0 + 0.2, y: 1.7, w: 9.2, h: 2.6, fontFace: SERIF, fontSize: deck.titlu.length > 46 ? 38 : 46, bold: true, color: "FFFFFF", valign: "bottom", fit: "shrink", margin: 0 });
  s0.addShape("rect", { x: X0 + 0.2, y: 4.55, w: 1.5, h: 0.08, fill: { color: T.ac }, line: { color: T.ac, transparency: 100 } });
  s0.addText([{ text: o.materie, options: { bold: true, breakLine: true } }, { text: `Clasa a ${o.clasa}-a${o.tema && o.tema !== deck.titlu ? " · " + o.tema : ""}`, options: {} }], { x: X0 + 0.2, y: 4.8, w: 9.2, h: 1.1, fontFace: SANS, fontSize: 22, color: "FFFFFF", valign: "top", margin: 0, fit: "shrink" });
  if (o.autor) s0.addText(o.autor, { x: X0 + 0.2, y: 5.95, w: 9, h: 0.4, fontFace: SANS, fontSize: 16, italic: true, color: "FFFFFF", margin: 0 });
  s0.addText("LICEUL TEORETIC „ION CREANGĂ” · CAHUL", { x: X0 + 0.2, y: 6.75, w: 9, h: 0.35, fontFace: SANS, fontSize: 12, color: "FFFFFF", charSpacing: 3, margin: 0 });

  /* diapozitivele de conținut */
  for (const sl of deck.slides) {
    const s = pptx.addSlide(); s.background = { color: T.bg };
    s.addShape("rect", { x: 0, y: 0, w: 0.28, h: H, fill: { color: T.pr }, line: { color: T.pr, transparency: 100 } });
    s.addText(sl.titlu, { x: X0, y: 0.4, w: CW, h: 1.05, fontFace: SERIF, fontSize: sl.titlu.length > 52 ? 26 : sl.titlu.length > 38 ? 30 : 34, bold: true, color: dark ? T.tx : T.pr, valign: "middle", fit: "shrink", margin: 0 });
    s.addShape("rect", { x: X0, y: 1.55, w: 1.3, h: 0.07, fill: { color: T.ac }, line: { color: T.ac, transparency: 100 } });
    s.addText(foot, { x: X0, y: 7.0, w: 8, h: 0.3, fontFace: SANS, fontSize: 11, color: T.mu, margin: 0 });
    s.slideNumber = { x: W - 1.3, y: 7.0, w: 0.6, h: 0.3, fontFace: SANS, fontSize: 11, color: T.mu, align: "right" };
    if (sl.tip === "definitii") defs(pptx, s, sl, T); else cards(s, sl, T);
    if (sl.notite) s.addNotes(sl.notite);
  }
  return pptx;
}

function cards(s, sl, T) {
  const n = sl.puncte.length, long = Math.max(...sl.puncte.map(p => p.length)), gap = GAP;
  let fs = n <= 3 ? 24 : n === 4 ? 22 : n === 5 ? 20 : 18; if (long > 120) fs -= 2; if (long > 170) fs -= 2;
  const h = Math.min(1.15, (YH - gap * (n - 1)) / n), icon = ICON[sl.tip] || "";
  sl.puncte.forEach((p, i) => {
    const y = Y0 + i * (h + gap);
    s.addShape("roundRect", { x: X0, y, w: CW, h, rectRadius: 0.12, fill: { color: T.card }, line: { color: T.bd, width: 1 }, shadow: shadow() });
    const d = Math.min(0.62, h - 0.24);
    s.addShape("ellipse", { x: X0 + 0.22, y: y + (h - d) / 2, w: d, h: d, fill: { color: sl.tip === "intrebari" ? T.ac : T.pr }, line: { color: T.pr, transparency: 100 } });
    s.addText(icon || String(i + 1), { x: X0 + 0.22, y: y + (h - d) / 2, w: d, h: d, align: "center", valign: "middle", fontFace: SANS, fontSize: Math.round(d * 30), bold: true, color: sl.tip === "intrebari" ? "2B1B1E" : T.on, margin: 0 });
    s.addText(p, { x: X0 + 1.1, y, w: CW - 1.35, h, fontFace: SANS, fontSize: fs, color: T.tx, valign: "middle", fit: "shrink", margin: 0 });
  });
}

function defs(pptx, s, sl, T) {
  const n = sl.termeni.length, cols = n === 1 ? 1 : 2, rows = Math.ceil(n / cols), gap = 0.25, w = (CW - gap * (cols - 1)) / cols, h = Math.min(2.4, (YH - gap * (rows - 1)) / rows), long = Math.max(...sl.termeni.map(t => t.definitie.length));
  const fs = (n <= 2 ? 22 : 20) - (long > 150 ? 2 : 0) - (long > 220 ? 2 : 0);
  sl.termeni.forEach((t, i) => {
    const x = X0 + (i % cols) * (w + gap), y = Y0 + Math.floor(i / cols) * (h + gap);
    s.addShape("roundRect", { x, y, w, h, rectRadius: 0.1, fill: { color: T.card }, line: { color: T.bd, width: 1 }, shadow: shadow() });
    s.addShape("rect", { x: x + 0.3, y, w: 1.0, h: 0.09, fill: { color: T.ac }, line: { color: T.ac, transparency: 100 } });
    s.addText([{ text: t.termen, options: { fontFace: SERIF, bold: true, fontSize: fs + 4, color: T.pr, breakLine: true, paraSpaceAfter: 6 } }, { text: t.definitie, options: { fontFace: SANS, fontSize: fs, color: T.tx } }],
      { x: x + 0.3, y: y + 0.2, w: w - 0.6, h: h - 0.35, valign: "top", fit: "shrink", margin: 0 });
  });
}

export async function buildPptx(deck, o) {
  const Pptx = await loadLib(), pptx = makeDeck(Pptx, deck, o);
  const b = await pptx.write({ outputType: "blob" }); // pptxgenjs dă tipul „application/zip”, iar telefoanele salvează atunci .zip: punem tipul corect de PowerPoint
  return new Blob([b], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}
