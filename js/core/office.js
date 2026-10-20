// Citește tabelele din fișiere .xlsx, .docx și .csv, direct în browser, fără biblioteci și fără încărcarea fișierului nicăieri.
// Rezultat: o listă de tabele; fiecare tabel = matrice de texte (celulele îmbinate sunt completate în toate pozițiile lor).
// Formatele vechi (.xls, .ods) se citesc cu SheetJS, încărcat doar atunci când e nevoie.

/* ---------- arhiva ZIP (xlsx și docx sunt arhive ZIP cu fișiere XML) ---------- */
async function inflate(d) { const s = new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw")); return new Uint8Array(await new Response(s).arrayBuffer()); }
export function unzip(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let e = -1; for (let i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("Fișierul nu este un document Office valid (.xlsx / .docx)");
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = new Map(), td = new TextDecoder();
  for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = td.decode(u.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    out.set(name, async () => { const s = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), data = u.subarray(s, s + csize); return method === 0 ? data : inflate(data); });
  }
  return out;
}
const textOf = async (z, name) => { const f = z.get(name); return f ? new TextDecoder().decode(await f()) : ""; };
const xml = s => new DOMParser().parseFromString(s, "application/xml");
const kids = (el, n) => [...el.children].filter(c => c.localName === n);
const all = (el, n) => [...el.getElementsByTagNameNS("*", n)];
const clean = s => String(s ?? "").replace(/\s+/g, " ").trim();

/* text cu părți în indice (subscript): „6A” + indice „M” → „6A (M)”, ca în orarul tipărit */
function runsText(runs, textTag) {
  let out = "", sub = "";
  const flush = () => { if (sub.trim()) out += " (" + sub.trim() + ")"; sub = ""; };
  for (const r of runs) {
    const t = all(r, textTag).map(x => x.textContent).join(""), isSub = all(r, "vertAlign").some(v => (v.getAttribute("w:val") || v.getAttribute("val")) === "subscript");
    if (isSub) sub += t; else { flush(); out += t; }
  }
  flush(); return clean(out);
}

/* ---------- .xlsx ---------- */
const colNo = ref => { const m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m) return null; let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [+m[2] - 1, c - 1]; };
export async function readXlsx(z) {
  const rels = {}, wb = xml(await textOf(z, "xl/workbook.xml")), rl = xml(await textOf(z, "xl/_rels/workbook.xml.rels"));
  all(rl, "Relationship").forEach(r => rels[r.getAttribute("Id")] = r.getAttribute("Target"));
  const sst = all(xml(await textOf(z, "xl/sharedStrings.xml") || "<x/>"), "si").map(si => runsText(all(si, "r").length ? all(si, "r") : [si], "t"));
  const sheets = [];
  for (const sh of all(wb, "sheet")) {
    const rid = sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || sh.getAttribute("r:id"); let path = rels[rid] || ""; if (!path) continue;
    path = path.startsWith("/") ? path.slice(1) : "xl/" + path; const d = xml(await textOf(z, path)), g = [];
    for (const c of all(d, "c")) {
      const pos = colNo(c.getAttribute("r") || ""); if (!pos) continue; const t = c.getAttribute("t"), v = kids(c, "v")[0]?.textContent ?? "";
      const val = t === "s" ? sst[+v] ?? "" : t === "inlineStr" ? all(c, "t").map(x => x.textContent).join("") : v;
      (g[pos[0]] ??= [])[pos[1]] = clean(val);
    }
    for (const m of all(d, "mergeCell")) { const [a, b] = (m.getAttribute("ref") || "").split(":"), s = colNo(a), e = b ? colNo(b) : s; if (!s || !e) continue; const v = g[s[0]]?.[s[1]] ?? ""; for (let r = s[0]; r <= e[0]; r++) for (let c = s[1]; c <= e[1]; c++) (g[r] ??= [])[c] = v; }
    sheets.push(norm(g));
  }
  return sheets.filter(g => g.length);
}

/* ---------- .docx ---------- */
export async function readDocx(z) {
  const d = xml(await textOf(z, "word/document.xml")), tables = [];
  for (const tb of all(d, "tbl")) {
    let a = tb.parentNode, nested = false; while (a) { if (a.localName === "tc") nested = true; a = a.parentNode; }
    if (nested) continue; // tabele în tabele: se citesc doar cele principale
    const g = [];
    kids(tb, "tr").forEach((tr, r) => {
      let c = 0; g[r] ??= [];
      for (const tc of kids(tr, "tc")) {
        while (g[r][c] !== undefined) c++;
        const pr = kids(tc, "tcPr")[0], span = +(pr && kids(pr, "gridSpan")[0]?.getAttribute("w:val")) || 1, vm = pr && kids(pr, "vMerge")[0], cont = vm && (vm.getAttribute("w:val") || "continue") !== "restart";
        const txt = cont ? (g[r - 1]?.[c] ?? "") : kids(tc, "p").map(p => runsText(all(p, "r"), "t")).filter(Boolean).join(" ");
        for (let k = 0; k < span; k++) g[r][c + k] = txt; c += span;
      }
    });
    tables.push(norm(g));
  }
  return tables.filter(g => g.length);
}

/* ---------- .csv / .tsv ---------- */
export function readCsv(text) {
  const first = text.split(/\r?\n/, 1)[0], sep = [";", "\t", ","].map(s => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0], g = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); g.push(row); row = []; cur = ""; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); g.push(row); } return [norm(g)];
}

/* ---------- .xls / .ods (formate vechi): SheetJS, încărcat la nevoie ---------- */
async function readLegacy(buf) {
  if (!window.XLSX) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = ok; s.onerror = () => no(new Error("Nu pot citi acest format. Salvează fișierul ca .xlsx (Fișier → Salvează ca) și încearcă din nou.")); document.head.append(s); });
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames.map(n => {
    const ws = wb.Sheets[n], g = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).map(r => r.map(clean));
    for (const m of ws["!merges"] || []) { const v = g[m.s.r]?.[m.s.c] ?? ""; for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) (g[r] ??= [])[c] = v; }
    return norm(g);
  }).filter(g => g.length);
}

/* matrice dreptunghiulară, fără rânduri/coloane goale la margini */
function norm(g) {
  const R = Array.from(g, r => Array.from(r || [], x => clean(x))), w = Math.max(0, ...R.map(r => r.length));
  R.forEach(r => { while (r.length < w) r.push(""); });
  while (R.length && R.at(-1).every(x => !x)) R.pop();
  return R;
}

/* ---------- intrarea principală ---------- */
export async function readTables(file) {
  const ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1]?.toLowerCase() || "", buf = await file.arrayBuffer();
  if (ext === "csv" || ext === "tsv" || ext === "txt") return readCsv(new TextDecoder().decode(buf));
  if (ext === "doc") throw new Error("Formatul .doc (vechi) nu poate fi citit. Deschide fișierul în Word și salvează-l ca .docx.");
  if (ext === "xls" || ext === "ods" || ext === "xlsb") return readLegacy(buf);
  const z = unzip(buf);
  if (z.has("word/document.xml")) return readDocx(z);
  if (z.has("xl/workbook.xml")) return readXlsx(z);
  throw new Error("Tipul fișierului nu este recunoscut. Folosește .xlsx sau .docx.");
}
