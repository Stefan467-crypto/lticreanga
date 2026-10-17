// Citește o pagină de manual în ORDINEA DE CITIRE (coloane, casete, tabele pe rânduri).
// pdf.js dă textul în ordinea din fișier, nu în ordinea de pe pagină: definițiile apăreau după folosire,
// casetele „Reține!” se amestecau cu textul, tabelele pierdeau antetul. Aici paginii i se aplică o tăiere recursivă (XY-cut):
// spații albe orizontale → blocuri una sub alta; spații albe verticale → coloane de la stânga la dreapta.
const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "−": "⁻" };
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 10; };

function lineText(its, H) { // its = elemente de pe aceeași linie, vor fi ordonate pe x
  its.sort((a, b) => a.x0 - b.x0); let s = "", xe = null;
  const base = med(its.map(i => i.h)), by = med(its.filter(i => i.h >= base * 0.85).map(i => i.y0));
  for (const it of its) {
    const t = it.s, small = it.h < base * 0.85, raised = it.y0 > by + base * 0.2;
    const sup = small && raised && /^[\d−-]{1,3}$/.test(t.trim());
    if (xe !== null && it.x0 - xe > base * 0.1 && !/\s$/.test(s) && !/^\s/.test(t) && !sup) s += " ";
    s += sup ? [...t.trim()].map(c => SUP[c] || c).join("") : t; xe = it.x1;
  }
  return s.replace(/[ \t]+/g, " ").trim();
}
function leaf(bs, H) { // un bloc fără spații de tăiat → rânduri (de sus în jos), fiecare rând de la stânga la dreapta
  const a = bs.slice().sort((p, q) => q.y1 - p.y1 || p.x0 - q.x0), lines = [];
  for (const b of a) {
    const L = lines.find(l => Math.abs(b.y0 - l.y) <= 0.6 * Math.max(b.h, l.h));
    if (L) { L.its.push(b); L.h = Math.max(L.h, b.h); } else lines.push({ y: b.y0, h: b.h, its: [b] });
  }
  return lines.map(l => lineText(l.its, H)).filter(Boolean).join("\n");
}
function cut(bs, H, out, depth = 0) {
  if (!bs.length) return;
  if (bs.length === 1 || depth > 14) { out.push(leaf(bs, H)); return; }
  const gy = 0.5 * H, gx = 1.1 * H;
  // 1) tăiere orizontală (blocuri una sub alta)
  const byY = bs.slice().sort((a, b) => b.y1 - a.y1), gY = []; let lo = byY[0].y0, cur = [byY[0]];
  for (const b of byY.slice(1)) { if (b.y1 < lo - gy) { gY.push(cur); cur = []; lo = b.y0; } else lo = Math.min(lo, b.y0); cur.push(b); }
  gY.push(cur);
  if (gY.length > 1) { for (const g of gY) cut(g, H, out, depth + 1); return; }
  // 2) o singură linie de text: nu o rupem în celule
  const top = Math.max(...bs.map(b => b.y1)), bot = Math.min(...bs.map(b => b.y0));
  if (top - bot <= 1.7 * H) { out.push(leaf(bs, H)); return; }
  // 3) tăiere verticală (coloane)
  const byX = bs.slice().sort((a, b) => a.x0 - b.x0), gX = []; let hi = byX[0].x1; cur = [byX[0]];
  for (const b of byX.slice(1)) { if (b.x0 > hi + gx) { gX.push(cur); cur = []; hi = b.x1; } else hi = Math.max(hi, b.x1); cur.push(b); }
  gX.push(cur);
  if (gX.length > 1) { for (const g of gX) cut(g, H, out, depth + 1); return; }
  out.push(leaf(bs, H));
}
/* items = page.getTextContent().items → text în ordinea de citire; blocurile sunt separate prin rând liber */
export function readPage(items, rows = false) { // rows = true: rânduri întregi pe toată lățimea (pentru cuprins: pagina rămâne pe același rând cu titlul)
  const bs = items.filter(it => it.str && it.str.trim()).map(it => {
    const h = Math.abs(it.transform[3]) || Math.abs(it.height) || 10, x = it.transform[4], y = it.transform[5];
    return { s: it.str, x0: x, x1: x + (it.width || h * 0.5 * it.str.length), y0: y, y1: y + h, h };
  });
  if (!bs.length) return "";
  const H = med(bs.map(b => b.h)), out = [];
  if (rows) return leaf(bs, H);
  cut(bs, H, out);
  return out.filter(Boolean).join("\n");
}
