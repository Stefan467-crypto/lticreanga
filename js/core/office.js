// Citește tabelele din fișiere .xlsx, .docx, .doc (Word vechi) și .csv, direct în browser, fără biblioteci și fără încărcarea fișierului nicăieri.
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

/* ---------- .doc (Word 97–2003, binar) ---------- */
export function readDoc(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength), NO = 0xfffffffa;
  if (u.length < 512 || dv.getUint32(0, true) !== 0xe011cfd0) throw new Error("Fișierul .doc nu este valid");
  /* container OLE: sectoare, FAT, director */
  const ss = 1 << dv.getUint16(30, true), mss = 1 << dv.getUint16(32, true), cutoff = dv.getUint32(56, true);
  const sec = i => u.subarray(512 + i * ss, 512 + (i + 1) * ss), fatSecs = [];
  for (let i = 0; i < 109; i++) { const s = dv.getUint32(76 + i * 4, true); if (s < NO) fatSecs.push(s); }
  for (let d = dv.getUint32(68, true), k = 0; k < dv.getUint32(72, true) && d < NO; k++) { const b = sec(d), v = new DataView(b.buffer, b.byteOffset, b.byteLength); for (let i = 0; i < ss / 4 - 1; i++) { const s = v.getUint32(i * 4, true); if (s < NO) fatSecs.push(s); } d = v.getUint32(ss - 4, true); }
  const u32 = a => { const v = new DataView(a.buffer, a.byteOffset, a.byteLength), o = []; for (let i = 0; i + 4 <= a.length; i += 4) o.push(v.getUint32(i, true)); return o; };
  const fat = fatSecs.flatMap(s => u32(sec(s)));
  const chain = (s, tab, get, size) => { const parts = [], seen = new Set(); while (s < NO && !seen.has(s)) { seen.add(s); parts.push(get(s)); s = tab[s]; } const r = new Uint8Array(parts.length * size); parts.forEach((b, i) => r.set(b, i * size)); return r; };
  const big = s => chain(s, fat, sec, ss), dir = big(dv.getUint32(48, true)), ents = [];
  for (let i = 0; i + 128 <= dir.length; i += 128) { const d = new DataView(dir.buffer, dir.byteOffset + i, 128), nl = d.getUint16(64, true); let name = ""; for (let k = 0; k < Math.max(0, nl / 2 - 1); k++) name += String.fromCharCode(d.getUint16(k * 2, true)); ents.push({ name, start: d.getUint32(116, true), size: d.getUint32(120, true) }); }
  const root = ents[0]; let mini = null, miniFat = null;
  const stream = name => {
    const e = ents.find(x => x.name === name); if (!e) return null;
    if (e.size >= cutoff) return big(e.start).subarray(0, e.size);
    mini ??= big(root.start); miniFat ??= u32(big(dv.getUint32(60, true)));
    return chain(e.start, miniFat, i => mini.subarray(i * mss, (i + 1) * mss), mss).subarray(0, e.size);
  };
  const W = stream("WordDocument"); if (!W) throw new Error("Fișierul nu este un document Word");
  const wv = new DataView(W.buffer, W.byteOffset, W.byteLength);
  if (wv.getUint16(0, true) !== 0xa5ec) throw new Error("Fișierul nu este un document Word");
  const flags = wv.getUint16(10, true); if (flags & 0x100) throw new Error("Documentul este protejat cu parolă");
  const T = stream(flags & 0x200 ? "1Table" : "0Table"); if (!T) throw new Error("Documentul Word este deteriorat");
  const tv = new DataView(T.buffer, T.byteOffset, T.byteLength);
  const csw = wv.getUint16(32, true), cslw = wv.getUint16(34 + csw * 2, true), base = 36 + csw * 2 + cslw * 4 + 2; // începutul FibRgFcLcb97
  const pair = i => [wv.getUint32(base + i * 8, true), wv.getUint32(base + i * 8 + 4, true)];
  const ccpText = wv.getUint32(0x4c, true), [fcClx, lcbClx] = pair(33), [fcBte, lcbBte] = pair(13);
  /* textul: tabela de piese (CLX) */
  let p = fcClx; while (tv.getUint8(p) === 1) p += 3 + tv.getUint16(p + 1, true);
  if (tv.getUint8(p) !== 2) throw new Error("Structura documentului Word nu este recunoscută");
  const lcb = tv.getUint32(p + 1, true), n = (lcb - 4) / 12, cps = [], pcs = []; p += 5;
  for (let i = 0; i <= n; i++) cps.push(tv.getUint32(p + i * 4, true));
  for (let i = 0; i < n; i++) { const fc = tv.getUint32(p + (n + 1) * 4 + i * 8 + 2, true), comp = !!(fc & 0x40000000); pcs.push({ cp: cps[i], end: Math.min(cps[i + 1], ccpText), comp, fc: comp ? (fc & 0x3fffffff) / 2 : fc }); }
  const text = []; const cpToFc = cp => { const q = pcs.find(x => cp >= x.cp && cp < x.end); return q ? q.fc + (cp - q.cp) * (q.comp ? 1 : 2) : -1; };
  const dec1252 = new TextDecoder("windows-1252");
  for (const q of pcs) { if (q.end <= q.cp) continue; const len = q.end - q.cp; text.push(q.comp ? dec1252.decode(W.subarray(q.fc, q.fc + len)) : new TextDecoder("utf-16le").decode(W.subarray(q.fc, q.fc + len * 2))); }
  const txt = text.join("");
  /* proprietățile paragrafelor (PAPX): ce e în tabel, unde se termină rândul, cum sunt împărțite celulele */
  const fcToCp = fc => { const q = pcs.find(x => fc >= x.fc && fc < x.fc + (x.end - x.cp) * (x.comp ? 1 : 2)); return q ? q.cp + (fc - q.fc) / (q.comp ? 1 : 2) : -1; };
  const DATA = stream("Data");
  const readSprms = (content, r) => { // content = istd (2 octeți) + lista de modificări (sprm)
    const cv = new DataView(content.buffer, content.byteOffset, content.byteLength); let q = 2;
    while (q + 2 <= content.length) {
      const op = cv.getUint16(q, true), spra = op >> 13; q += 2; let sz;
      if (spra === 0 || spra === 1) sz = 1; else if (spra === 2 || spra === 4 || spra === 5) sz = 2; else if (spra === 3) sz = 4; else if (spra === 7) sz = 3; else sz = op === 0xd608 ? cv.getUint16(q, true) + 1 : content[q] + 1;
      if (op === 0x2416) r.inTable = !!content[q]; else if (op === 0x2417) { r.ttp = !!content[q]; r.inTable = true; }
      else if (op === 0x6646 && DATA) { const fc = cv.getUint32(q, true), n = fc + 2 <= DATA.length ? DATA[fc] | (DATA[fc + 1] << 8) : 0; if (n > 2) readSprms(DATA.subarray(fc + 2, fc + 2 + n), r); } // PAPX prea mare: se află în fluxul „Data”
      else if (op === 0xd608 && !r.def) { const m = content[q + 2], xs = []; for (let c = 0; c <= m; c++) xs.push(cv.getInt16(q + 3 + c * 2, true)); const tcs = []; for (let c = 0; c < m; c++) { const b = q + 3 + (m + 1) * 2 + c * 20; tcs.push(b + 2 <= q + sz ? cv.getUint16(b, true) : 0); } r.def = { xs, tcs }; }
      q += sz;
    }
  };
  const runs = []; // { cpA, cpB, inTable, ttp, def }
  const nB = (lcbBte - 4) / 8;
  for (let i = 0; i < nB; i++) {
    const page = tv.getUint32(fcBte + (nB + 1) * 4 + i * 4, true) & 0x3fffff, o = page * 512, fv = new DataView(W.buffer, W.byteOffset + o, 512), crun = fv.getUint8(511);
    for (let k = 0; k < crun; k++) {
      const fcA = fv.getUint32(k * 4, true), fcB = fv.getUint32((k + 1) * 4, true), bo = fv.getUint8((crun + 1) * 4 + k * 13) * 2; if (!bo) continue;
      let cb = fv.getUint8(bo), s = bo + 1, len; if (cb) len = cb * 2 - 1; else { len = fv.getUint8(s) * 2; s++; }
      const r = { cpA: fcToCp(fcA), cpB: fcToCp(fcB), inTable: false, ttp: false, def: null };
      readSprms(new Uint8Array(W.buffer, W.byteOffset + o + s, Math.max(0, len)), r);
      if (r.def) r.ttp = r.inTable = true; // definiția tabelului apare doar la semnul de sfârșit de rând
      if (r.cpA >= 0) runs.push(r);
    }
  }
  runs.sort((a, b) => a.cpA - b.cpA);
  /* tabelele: textul se împarte în celule (semnul 0x07) și rânduri (semnul de sfârșit de rând din PAPX) */
  const clean = t => t.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  let ri = 0; const runAt = cp => { while (ri > 0 && runs[ri].cpA > cp) ri--; while (ri < runs.length - 1 && runs[ri].cpB <= cp) ri++; return runs[ri] && runs[ri].cpA <= cp && cp < runs[ri].cpB ? runs[ri] : null; };
  const tables = []; let rows = [], cells = [], cur = "";
  const flush = () => { if (rows.length) tables.push(rows); rows = []; };
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (ch === "\u0007") {
      const r = runAt(i);
      if (r && r.ttp) { rows.push({ cells, def: r.def }); cells = []; cur = ""; }
      else if (r && r.inTable) { cells.push(clean(cur)); cur = ""; }
      else { flush(); cur = ""; }
    } else if (ch === "\r") { const r = runAt(i); if (r && r.inTable) cur += " "; else { flush(); cur = ""; } }
    else if (ch === "\u0013") { /* început de câmp: ignorăm codul câmpului */ cur += ""; }
    else cur += ch;
  }
  flush();
  return tables.flatMap(trs => bands(trs).map(buildGrid));
}

/* un tabel Word poate conține „benzi” cu coloane diferite (ex. pagina 1: nume + Luni, Marți; pagina 2: Miercuri–Vineri).
   Rândurile consecutive cu aceleași limite de celule formează un bloc; un bloc cu mai puține celule, urmat de unul mai fin, e antetul lui. */
function bands(trs) {
  const near = (a, b, t) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= t), sub = (a, b, t) => a.every(v => b.some(w => Math.abs(v - w) <= t));
  const blocks = []; for (const r of trs) { const xs = r.def ? r.def.xs : [], l = blocks.at(-1); if (l && near(l.xs, xs, 40)) l.rows.push(r); else blocks.push({ xs, rows: [r] }); }
  const out = []; for (let i = 0; i < blocks.length;) { const rows = [...blocks[i].rows]; let j = i; while (j + 1 < blocks.length && blocks[j].xs.length < blocks[j + 1].xs.length && sub(blocks[j].xs, blocks[j + 1].xs, 120)) { j++; rows.push(...blocks[j].rows); } out.push(rows); i = j + 1; }
  return out;
}

/* rândurile cu limitele celulelor (în twips) → matrice dreptunghiulară; celulele lățite acoperă mai multe coloane, ca în readDocx */
function buildGrid(trs) {
  const xs = trs.flatMap(r => r.def ? r.def.xs : []).sort((a, b) => a - b), cl = [];
  for (const v of xs) { if (cl.length && v - cl.at(-1).hi < 120) { cl.at(-1).hi = v; cl.at(-1).n++; cl.at(-1).sum += v; } else cl.push({ lo: v, hi: v, n: 1, sum: v }); }
  const col = v => { let best = 0, bd = Infinity; cl.forEach((c, i) => { const d = Math.abs(v - c.sum / c.n); if (d < bd) { bd = d; best = i; } }); return best; };
  const g = [];
  trs.forEach((tr, r) => {
    g[r] = Array(Math.max(1, cl.length - 1)).fill(undefined);
    if (!tr.def) { tr.cells.forEach((t, i) => g[r][i] = t); return; }
    const n = Math.min(tr.cells.length, tr.def.xs.length - 1);
    for (let k = 0; k < n; k++) {
      const a = col(tr.def.xs[k]), b = Math.max(a + 1, col(tr.def.xs[k + 1])), f = tr.def.tcs[k] || 0, cont = (f & 0x20) && !(f & 0x40), hm = f & 3;
      let t = tr.cells[k]; if (cont) t = g[r - 1]?.[a] ?? t; if (hm === 2 && k) t = g[r][a - 1] ?? t; // îmbinări pe verticală / orizontală
      for (let c = a; c < b; c++) g[r][c] = t;
    }
  });
  return g.map(r => r.map(x => x ?? ""));
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
  if (ext === "doc") { try { return readDoc(buf).map(norm).filter(g => g.length); } catch (e) { throw new Error(`Fișierul .doc nu a putut fi citit (${e.message}). Deschide-l în Word și salvează-l ca .docx sau .xlsx.`); } }
  if (ext === "xls" || ext === "ods" || ext === "xlsb") return readLegacy(buf);
  const z = unzip(buf);
  if (z.has("word/document.xml")) return readDocx(z);
  if (z.has("xl/workbook.xml")) return readXlsx(z);
  throw new Error("Tipul fișierului nu este recunoscut. Folosește .xlsx sau .docx.");
}
