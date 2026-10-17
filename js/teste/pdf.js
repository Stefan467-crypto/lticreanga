// Creează PDF-uri direct în browser (fără biblioteci): paginile se desenează pe canvas și se împachetează într-un PDF.
import { correct, nota, scale, rangeOf } from "./engine.js";
const W = 1654, H = 2339, M = 130, FS = 33, FF = 'Georgia, "Times New Roman", serif', OL = "ABCD", SCHOOL = "Liceul Teoretic „Ion Creangă” Cahul";
class Doc {
  constructor(foot, fs = FS) { this.foot = foot; this.fs = fs; this.pages = []; this.np(); }
  np() { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); this.c = c; this.x = x; this.y = M; this.pages.push(c); }
  f(sz, w = 400, it = false) { this.x.font = `${it ? "italic " : ""}${w} ${sz}px ${FF}`; }
  wrap(t, sz, w, maxW, it) { this.f(sz, w, it); const out = []; for (const par of String(t).split("\n")) { let line = ""; for (const word of par.split(/\s+/)) { const tt = line ? line + " " + word : word; if (line && this.x.measureText(tt).width > maxW) { out.push(line); line = word; } else line = tt; } out.push(line); } return out; }
  need(h) { if (this.y + h > H - M - 50) this.np(); }
  gap(h) { this.y += h; }
  draw(lines, x0, sz, w, it, color, lh, align) { this.f(sz, w, it); this.x.fillStyle = color; for (const l of lines) { const tw = this.x.measureText(l).width; this.x.fillText(l, align === "center" ? (W - tw) / 2 : x0, this.y + sz * lh * .74); this.y += sz * lh; } }
  text(t, { sz = this.fs, w = 400, it = false, ind = 0, lh = 1.4, align = "left", color = "#111", after = 0, keep = 0 } = {}) { const L = this.wrap(t, sz, w, W - 2 * M - ind, it); this.need(L.length * sz * lh + keep); this.draw(L, M + ind, sz, w, it, color, lh, align); this.y += after; }
  rule(th = 3, color = "#111") { this.x.fillStyle = color; this.x.fillRect(M, this.y, W - 2 * M, th); this.y += th; }
  line(x, w, th = 2) { this.x.fillStyle = "#444"; this.x.fillRect(x, this.y, w, th); }
  scaleTable(T) { // Scara de notare: coloana din stânga = titlurile (Punctaj, Nota), apoi câte o coloană pentru fiecare notă de la 1 la 10
    const sc = scale(T), tw = W - 2 * M, c0 = 230, cw = (tw - c0) / 10, rh = 76; this.need(rh * 2 + 120);
    this.text("Scara de notare", { sz: 36, w: 700, color: "#8a1c2b", after: 14, keep: rh * 2 + 60 });
    const x = this.x, y0 = this.y;
    for (const [r, lab] of ["Punctaj", "Nota"].entries()) {
      const y = y0 + r * rh;
      x.fillStyle = "#f1ede4"; x.fillRect(M, y, c0, rh); if (r === 1) { x.fillStyle = "#faf8f3"; x.fillRect(M + c0, y, tw - c0, rh); }
      x.fillStyle = "#111"; this.f(31, 700); x.fillText(lab, M + 22, y + rh / 2 + 11);
      sc.forEach((g, i) => { const t = r ? String(g.n) : rangeOf(g), cx = M + c0 + i * cw; this.f(r ? 34 : 29, r ? 700 : 500); x.fillStyle = r ? "#8a1c2b" : "#111"; x.fillText(t, cx + (cw - x.measureText(t).width) / 2, y + rh / 2 + 11); });
    }
    x.fillStyle = "#444"; for (let r = 0; r <= 2; r++) x.fillRect(M, y0 + r * rh - 1, tw, 3);
    x.fillRect(M - 1, y0 - 1, 3, rh * 2 + 3); x.fillRect(M + tw - 1, y0 - 1, 3, rh * 2 + 3); x.fillRect(M + c0 - 1, y0, 3, rh * 2);
    for (let i = 1; i < 10; i++) { x.fillStyle = "#bbb"; x.fillRect(M + c0 + i * cw - 1, y0, 2, rh * 2); }
    this.y = y0 + rh * 2 + 24; this.text(`Punctaj total: ${T} ${T === 1 ? "punct" : "puncte"}. Nota se obține din punctajul acumulat, conform tabelului.`, { sz: 24, it: true, color: "#555" });
  }
  finish() { const n = this.pages.length; this.pages.forEach((c, i) => { const x = c.getContext("2d"); x.font = `400 24px ${FF}`; x.fillStyle = "#666"; const t = `${this.foot} · pagina ${i + 1} din ${n}`; x.fillText(t, (W - x.measureText(t).width) / 2, H - 70); }); return this.pages; }
}
const hint = q => q.t === "mcq" ? "Încercuiește litera răspunsului corect." : q.t === "tf" ? "Încercuiește A (adevărat) sau F (fals)." : q.t === "blank" ? "Completează spațiul liber." : q.t === "match" ? "Scrie litera potrivită lângă fiecare noțiune." : q.t === "num" || q.t === "prob" ? "Scrie rezolvarea și răspunsul." : "Răspunde în scris.";
const rowsOf = (q, p) => q.t === "prob" ? (p >= 8 ? 9 : p >= 5 ? 7 : 5) : q.t === "num" ? (p >= 8 ? 8 : p >= 5 ? 6 : 4) : q.t === "open" ? (p >= 10 ? 9 : p >= 5 ? 5 : 3) : 0;
function question(d, i, q, p) {
  const ind = 72, mw = W - 2 * M - ind, text = q.q;
  const tl = d.wrap(text, d.fs, 400, mw - 150), lh = 1.4;
  let h = tl.length * d.fs * lh + 36 + 20;
  if (q.t === "mcq") h += q.o.reduce((a, o) => a + d.wrap(o, d.fs, 400, mw - 70).length * d.fs * lh, 0) + 10;
  else if (q.t === "match") h += q.L.length * 70 + q.R.reduce((a, o) => a + d.wrap(o, d.fs, 400, mw - 70).length * d.fs * lh, 0) + 30;
  else if (q.t === "tf") h += 70; else if (q.t === "blank") h += 80; else h += rowsOf(q, p) * 62 + 40;
  d.need(Math.min(h, 700));
  const y0 = d.y; d.f(d.fs, 700); d.x.fillStyle = "#111"; d.x.fillText(i + 1 + ".", M, y0 + d.fs * lh * .74);
  const pl = `${p} p.`; d.f(d.fs - 2, 700); d.x.fillStyle = "#8a1c2b"; d.x.fillText(pl, W - M - d.x.measureText(pl).width, y0 + d.fs * lh * .74); // punctajul maxim al exercițiului, în dreapta
  d.draw(tl, M + ind, d.fs, 400, false, "#111", lh, "left");
  d.text(hint(q), { sz: 25, it: true, ind, color: "#555", after: 10, lh: 1.3 });
  if (q.t === "mcq") q.o.forEach((o, j) => { const ol = d.wrap(o, d.fs, 400, mw - 70, false); d.need(ol.length * d.fs * lh); const yy = d.y; d.f(d.fs, 700); d.x.fillStyle = "#111"; d.x.fillText(OL[j] + ")", M + ind, yy + d.fs * lh * .74); d.draw(ol, M + ind + 70, d.fs, 400, false, "#111", lh, "left"); });
  else if (q.t === "match") { q.L.forEach((t, j) => { const tl2 = d.wrap(`${j + 1}. ${t}`, d.fs, 400, mw - 220); d.need(tl2.length * d.fs * lh + 10); const yy = d.y; d.draw(tl2, M + ind, d.fs, 400, false, "#111", lh, "left"); d.line(M + ind + mw - 190, 150); d.y = Math.max(d.y, yy + 62); d.y += 6; }); d.y += 8; q.R.forEach((o, j) => { const ol = d.wrap(o, d.fs, 400, mw - 70, false); d.need(ol.length * d.fs * lh); const yy = d.y; d.f(d.fs, 700); d.x.fillStyle = "#111"; d.x.fillText(OL[j] + ")", M + ind, yy + d.fs * lh * .74); d.draw(ol, M + ind + 70, d.fs, 400, false, "#111", lh, "left"); }); }
  else if (q.t === "tf") { d.need(70); d.f(d.fs, 700); d.x.fillStyle = "#111"; d.x.fillText("A  (adevărat)", M + ind, d.y + 44); d.x.fillText("F  (fals)", M + ind + 420, d.y + 44); d.y += 70; }
  else if (q.t === "blank") { d.need(70); d.y += 44; d.line(M + ind, 900); d.y += 26; }
  else { const n = rowsOf(q, p); d.need(n * 62 + 60); for (let r = 0; r < n; r++) { d.y += 62; d.line(M + ind, W - 2 * M - ind); } if (q.t === "num" || q.t === "prob") { d.y += 60; d.f(d.fs, 700); d.x.fillStyle = "#111"; d.x.fillText("Răspuns:", M + ind, d.y - 8); d.line(M + ind + 190, 460); } d.y += 14; }
  d.y += 34;
}
const pts = v => v.q.reduce((a, _, i) => a + (v.p?.[i] || 1), 0);
export function testPages(meta, V, { titlu, minute, big }) {
  const d = new Doc(`${SCHOOL} · ${meta.materie}`, big ? 39 : FS);
  V.forEach((v, vi) => {
    if (vi) d.np();
    d.text(SCHOOL.toUpperCase(), { sz: 26, w: 700, color: "#8a1c2b", align: "center", after: 6 }); d.text(titlu, { sz: 52, w: 700, align: "center", lh: 1.2, after: 8 });
    d.text(`${meta.materie} · clasa ${meta.clasa}${V.length > 1 ? " · Varianta " + (vi + 1) : ""}`, { sz: 30, it: true, align: "center", color: "#444", after: 24 });
    d.text("Numele și prenumele: ______________________________   Clasa: ________   Data: ____________", { sz: 29, after: 6 });
    d.text(`${minute ? "Timp de lucru: " + minute + " minute. " : ""}Punctaj total: ${pts(v)} ${pts(v) === 1 ? "punct" : "puncte"}. Nota: ______`, { sz: 29, after: 14 });
    d.rule(); d.gap(34);
    v.q.forEach((q, i) => { if (v.parts && (i === 0 || v.sc[i] !== v.sc[i - 1])) { const pt = v.parts[v.sc[i]], sp = v.q.reduce((a, _, j) => a + (v.sc[j] === v.sc[i] ? (v.p?.[j] || 1) : 0), 0); d.need(170); d.gap(10); d.text(`${pt.t} (${sp} ${sp === 1 ? "punct" : "puncte"})`, { sz: 38, w: 700, color: "#8a1c2b", after: 4, keep: 120 }); d.text(pt.d, { sz: 27, it: true, color: "#555", after: 22 }); } question(d, i, q, v.p?.[i] || 1); });
    d.gap(14); d.scaleTable(pts(v));
  });
  return d.finish();
}
export function keyPages(meta, V, { titlu }) {
  const d = new Doc(`${SCHOOL} · barem`);
  V.forEach((v, vi) => {
    if (vi) d.np(); const T = pts(v);
    d.text(`BAREM · ${titlu}${V.length > 1 ? " · Varianta " + (vi + 1) : ""}`, { sz: 44, w: 700, lh: 1.2, after: 6 }); d.text(`${meta.materie} · clasa ${meta.clasa} · ${meta.tema}`, { sz: 28, it: true, color: "#444", after: 14 }); d.rule(); d.gap(24);
    v.q.forEach((q, i) => { if (v.parts && (i === 0 || v.sc[i] !== v.sc[i - 1])) { d.need(140); d.gap(8); d.text(v.parts[v.sc[i]].t, { sz: 34, w: 700, color: "#8a1c2b", after: 14, keep: 100 }); } const lng = q.t === "open" || q.t === "prob", a = q.t === "mcq" ? `${OL[v.k[i]]}) ${q.o[v.k[i]]}` : correct(q, v.k[i]), p = v.p?.[i] || 1; if (lng) { d.text(`${i + 1}.  ${q.q}   [${p} p]`, { sz: 29, w: 600, after: 6, keep: 60 }); d.text(a, { sz: 27, ind: 56, after: 12, lh: 1.35 }); } else d.text(`${i + 1}.  ${a}   [${p} p]`, { sz: 31, w: 600, ind: 0, after: v.src?.[i] && !lng ? 0 : 10, keep: 40 }); if (v.src?.[i] && !lng) d.text(`Sursa: „${v.src[i]}”`, { sz: 24, it: true, color: "#666", ind: 56, after: 12, lh: 1.3 }); });
    d.gap(20); d.scaleTable(T);
  });
  return d.finish();
}
export async function toPdf(canvases) {
  const enc = new TextEncoder(), parts = [], offs = []; let pos = 0;
  const push = b => { const u = typeof b === "string" ? enc.encode(b) : b; parts.push(u); pos += u.length; };
  const imgs = []; for (const c of canvases) { const b = await new Promise(r => c.toBlob(r, "image/jpeg", .86)); imgs.push(new Uint8Array(await b.arrayBuffer())); }
  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const obj = (id, body) => { offs[id] = pos; push(`${id} 0 obj\n${body}\nendobj\n`); }, n = canvases.length;
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>"); obj(2, `<< /Type /Pages /Kids [${canvases.map((_, i) => `${3 + 3 * i} 0 R`).join(" ")}] /Count ${n} >>`);
  canvases.forEach((c, i) => {
    const p = 3 + 3 * i, cs = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    obj(p + 1, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    offs[p + 2] = pos; push(`${p + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgs[i].length} >>\nstream\n`); push(imgs[i]); push("\nendstream\nendobj\n");
  });
  const total = 3 + 3 * n, xo = pos; let xr = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) xr += String(offs[i]).padStart(10, "0") + " 00000 n \n";
  push(xr + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`);
  canvases.forEach(c => { c.width = c.height = 0; });
  return new Blob(parts, { type: "application/pdf" });
}
export const save = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4000); };
