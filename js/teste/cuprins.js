// Citește cuprinsul unui manual (din semnele de carte sau din paginile tipărite) → [{ t: tema, p: pagina de start, e: pagina de final, ch: capitol }].
// Înțelege ierarhia: capitol → temă („4.3. Titlu”) → subpuncte („a. …”, care NU sunt teme separate) și lasă deoparte
// ce nu e temă de studiu (teste, rezumate, lucrări de laborator, anexe, răspunsuri). Folosit de „Baza de lecții”.
export const nrm = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/* ---- ce NU e temă de studiu (se testează pe titlu, fără numerotare în față) ---- */
const NOT = /^(?:prefa[tț]|cuv[aâ]nt|dragi |cuprins|bibliografi|anex|indice|r[aă]spunsuri|rezolv[aă]ri|glosar|dic[tț]ionar|abrevieri|simboluri|norme de|coperta|cum utiliz|cum folosim|conținuturi|continuturi|cuvânt|criterii de succes|evaluare|rezumat|extindere|tabelul|tabelele|conceptele de baz|recapitulare|exerci[tț]ii [sș]i probleme|probleme recapitulative|test\b|teste\b|autoevaluare|or[aă] de sintez|sintez[aă]|lucrare[a]? de laborator|lucrare[a]? practic|experien[tț]a de laborator|proiect\b|blank page|tipar|informa[tț]ii utile|itinerar|repere|modele de test|variante de|recomand[aă]ri|lista|table of contents|contents|index|algebr[ăa]$|geometrie$|aritmetic[ăa]$|trigonometrie$\b|answers|appendix|grammar reference|vocabulary list|unit review|revision)/i;
const NUMPFX = /^(?:\d{1,2}(?:\.\d{1,2}){0,2}\.?|§\s*\d{1,2}\.?|[IVXL]{1,5}\.|lec[tț]ia\s+\d+\.?|le[cç]on\s+\d+\.?|lesson\s+\d+\.?)\s*(?:\*|\(e\))*\s*/i;
export const isNotLesson = t => { const s = t.replace(/\s+/g, " ").trim(), core = s.replace(NUMPFX, ""); return NOT.test(core) || NOT.test(s) || core.length < 4 || /^[A-Z]_[A-Z0-9]|^F_N|\.indd|\.pdf$|coperta|tipar|blank page|\batelier\b(?!\s+de\s+(?:discu|scriere|lectur))|[eé]valuation|\bbilan\b/i.test(s); };

/* ---- titluri cu litere amestecate („OsCIlațII șI unde meCanICe”) ---- */
export const fixTitle = t => {
  t = String(t).replace(/\s+/g, " ").trim();
  if (!/\p{Ll}\p{Lu}/u.test(t.replace(/\b[A-ZĂÂÎȘȚ]{2,}\b/gu, ""))) return t.replace(/([.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  const m = /^((?:capitolul|unitatea|modulul|partea)\s+[\dIVXLC]+\.?\s*)?(.*)$/iu.exec(t), rest = (m[2] || "").toLowerCase().replace(/^\p{Ll}/u, c => c.toUpperCase()).replace(/([.!?]\s+)(\p{Ll})/gu, (x, a, b) => a + b.toUpperCase());
  return ((m[1] || "").replace(/^(\p{L}+)(\s+)([\dIVXLCivxlc]+)/u, (x, w, sp, n) => w[0].toUpperCase() + w.slice(1).toLowerCase() + sp + n.toUpperCase()) + rest).trim();
};

/* ---- recunoașterea rândurilor ---- */
const CHW = "capitolul|capitol|unitatea(?:\\s+de\\s+[iî]nv[aă][tț]are)?|unitate|modulul|modul|partea|unit|unit[eé]|chapter|chapitre|tema\\s+mare";
const CHRE = new RegExp(`^(?:${CHW})\\s*(?:(?:a\\s+)?[\\dIVXLC]+(?:-a)?\\b|[:.]|$)`, "iu"), CLASSRE = /^clasa\s+a\s+[IVX]+-a\b/i, ROMRE = /^(?:[IVXL]{2,5}\.?|[IVXL]\.|I)\s+\p{Lu}|^[IVXL]{1,5}\.\s*\p{Lu}/u;
const LESRE = /^(?:\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\.?|§\s*\d{1,2}\.?|lec[tț]ia\s+\d+\.?|le[cç]on\s+\d+\.?|lesson\s+\d+\.?|\d{1,2}\.(?=\s*\p{L}))\s*(?:\*|\(e\))*/iu;
const SUBRE = /^(?:[a-z]|[ivx]{1,3})\.\s*(?:\*|\(e\))*\s+\S|^[•▪●◦]\s|^[a-z]\.(?:\*|\(e\))+\s/;
const SECT = new Set(["literatura", "limba si comunicare", "conexiuni"]); // etichete de secțiune din cuprinsul manualelor de română: nu sunt teme
const isSect = t => SECT.has(nrm(t));
const AUTH = /(?:^|\s)de\s+\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*){0,3}\s*$/u; // „Baltagul de Mihai Sadoveanu”: opera + autorul, rând fără pagină sub titlul temei
const LEAD = /(?:\s*[.·…_]\s*){3,}/g;
const pageOf = l => { let m = /^(.*?\S)\s*…\s*(\d{1,3})\b.*$/.exec(l); if (m) return { t: m[1], p: +m[2] }; m = /^(.*\p{L}[^\d]*?)\s+(\d{1,3})$/u.exec(l); if (m && !/^\d+\.\d*$/.test(m[2])) return { t: m[1], p: +m[2] }; return null; };
const strip = t => t.replace(/\bC\s*U\s*P\s*R\s*I\s*N\s*S\b/gi, " ").replace(/[•▪●]+/g, " ").replace(/\s+(?:[a-f]|[ivx]{1,3})\.\s*(?:\(e\)|\*)?\s+\p{Lu}.*$/u, "").replace(/\(e\)/g, " ").replace(/\s*\*\s*/g, " ").replace(/\s+/g, " ").replace(/^[\s.:;–—-]+|[\s.:;–—-]+$/g, "").trim();

/* text de cuprins → [{ t, p, ch, skip? }] (p = pagina tipărită) */
export function parseToc(text) {
  const lines = text.replace(/\r/g, "").split("\n").map(l => l.replace(/\t/g, " ").replace(LEAD, " … ").replace(/\s+/g, " ").trim()).filter(Boolean)
    .flatMap(l => l.replace(/(\p{L}[^\d]*?)\s+(\d{1,2}\.\d{1,2}\.?\s*\p{Lu})/u, "$1\n$2").split("\n"))
    .map(l => /^(?:le[cç]on|unit[eé])\b/i.test(l) ? l.replace(/\s+[CGV]\s+\p{Lu}.*$/u, "") : l)
    .map(l => { const m = /^(.*?\p{L}.*?)\s(\d{1,3})\s+(\p{Lu}[^\d]*\d?[^\d]*)$/u.exec(l); return m && !/…/.test(l) && !/\d{1,3}$/.test(m[3].trim()) ? m[1] + " … " + m[2] : l; }); // două coloane pe un rând: păstrăm prima
  // rândurile rupte: o linie care începe cu literă mică continuă linia de dinainte, dacă aceea n-are încă pagina („…Scrisoarea” + „de motivație. Cererea … 64”)
  const L = []; for (const l of lines) { const pv = L[L.length - 1]; if (pv !== undefined && /^\p{Ll}/u.test(l) && !SUBRE.test(l) && pv[0] !== "\u0001" && !pageOf(pv)) L[L.length - 1] = pv + " " + l; else L.push(l); }
  // manuale de română: sub titlul temei urmează opera și autorul („Baltagul de Mihai Sadoveanu”), fără pagină — nu sunt teme și nu se lipesc de titlul următor
  const descMode = L.filter(l => !pageOf(l) && l.length <= 90 && AUTH.test(l)).length >= 3;
  const out = []; let ch = "", pend = null, buf = "", fresh = false; // fresh = rândul de dinainte a fost o temă (cu pagină)
  const push = (t, p) => { t = strip(t); if (t.length >= 3 && p > 0) { out.push({ t, p, ch }); fresh = true; } };
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (/^(?:cuprins|con[tț]inut|sommaire|contenus|contents|table of contents|pag(?:ina)?\.?)$/i.test(l) || /^\(e\)$/.test(l) || /^C\s*U\s*P\s*R\s*I\s*N\s*S$/i.test(l)) continue;
    if (/^(?:VV|SS|GG|WW|RR)\s/.test(l)) continue; // coloane de vocabular / abilități din manualele de engleză
    if (l[0] === "\u0001") { ch = strip(l.slice(1)); pend = null; buf = ""; fresh = false; continue; }
    if (/^\d{1,3}$/.test(l)) { if (pend && !pend.p) { push(pend.t, +l); pend = null; } continue; } // pagina rămasă singură pe un rând
    if (isSect(l)) { pend = null; buf = ""; fresh = false; continue; } // „Literatură”, „Limbă și comunicare”, „Conexiuni”: ce a rămas fără pagină până aici era opera/autorul
    const pg = pageOf(l), title = pg ? pg.t : l.replace(/\s*…\s*$/, "");
    if (CHRE.test(title) || CLASSRE.test(title) || (ROMRE.test(title) && !LESRE.test(title))) {
      let h = title.replace(/\s*….*$/, ""), nx = L[i + 1];
      if (!pg && /[.:,]$/.test(h) && nx && !pageOf(nx) && nx.split(" ").length <= 3 && /^\p{Lu}/u.test(nx) && !isSect(nx) && !CHRE.test(nx)) { h += " " + nx; i++; } // „Unitatea a V-a. Frumusețea dragostei.” + „Prietenia”
      ch = strip(h); if (/^(?:unit[eé]?|unitate|unitatea|capitolul)$/i.test(ch)) ch = ""; pend = null; buf = ""; fresh = false; continue;
    }
    if (SUBRE.test(title) && !LESRE.test(title)) { if (pend && !pend.p && pg) { push(pend.t, pg.p); pend = null; } buf = ""; continue; } // subpunct: nu e temă; dă pagina temei fără pagină
    if (LESRE.test(title)) {
      if (pend && !pend.p) { const a = /^(\d+)\.\s/.exec(pend.t), b = /^(\d+)\.\d/.exec(title); if (a && b && a[1] === b[1]) ch = strip(pend.t.replace(/^\d+\.\s*/, "")); pend = null; } // „1. CELULA…” urmat de „1.1” = capitol; altfel temă fără pagină: o ignorăm
      if (pg) { push(title, pg.p); pend = null; } else pend = { t: title, p: 0 };
      buf = ""; continue;
    }
    if (pend && !pend.p) { if (pg) { push(pend.t + " " + title, pg.p); pend = null; } else pend.t += " " + title; continue; } // titlu pe mai multe rânduri
    if (descMode && !buf) {
      const nx = L[i + 1];
      if (!pg && (AUTH.test(title) || (fresh && nx && pageOf(nx) && /^\p{Lu}/u.test(nx) && title.split(" ").length <= 6 && !/[.:;,!?]$/.test(title)))) continue; // opera/autorul (ex. „Miorița”, „Romeo + Julieta. Scenariu”)
      if (pg && fresh && AUTH.test(pg.t) && out.length && out[out.length - 1].p === pg.p) continue; // „miercuri, 10 iulie de Gabriel Liiceanu … 138”: același loc cu tema de dinainte
    }
    if (pg) { push((buf ? buf + " " : "") + title, pg.p); buf = ""; } else { buf = buf ? buf + " " + title : title; fresh = false; }
  }
  /* „1. CELULA…” fără subnumere = capitol, dacă există „1.1”, „1.2”… */
  const subs = new Set(out.map(x => /^(\d+)\.\d+/.exec(x.t)?.[1]).filter(Boolean));
  return mark(out.filter(x => !(/^(\d+)\.\s+\S/.test(x.t) && !/^\d+\.\d/.test(x.t) && subs.has(/^(\d+)/.exec(x.t)[1]))));
}
function mark(items) { items.forEach(x => { x.t = fixTitle(x.t); if (x.ch) x.ch = fixTitle(x.ch); x.skip = isNotLesson(x.t); }); return items; }

/* semnele de carte → același format; titlurile-gunoi sau lipsa ierarhiei se tratează ca la cuprinsul tipărit */
export async function outlineItems(pdf) {
  const out = await pdf.getOutline(); if (!out || !out.length) return [];
  const rows = [];
  const walk = async (arr, d, parentIsCh) => { for (const it of arr) {
    const t = (it.title || "").replace(/\s+/g, " ").trim(); let pg = 0;
    try { let dest = it.dest; if (typeof dest === "string") dest = await pdf.getDestination(dest); if (Array.isArray(dest)) pg = (await pdf.getPageIndex(dest[0])) + 1; } catch (e) { }
    const kids = it.items && it.items.length;
    rows.push({ t, p: pg, d, kids: !!kids }); if (kids && d < 4) await walk(it.items, d + 1);
  } };
  await walk(out, 0);
  const hasTree = rows.some(r => r.kids && r.d === 0) && rows.some(r => r.d > 0);
  // text sintetic, parcurs de același analizor: capitol (fără pagină) + teme cu pagină
  const lines = []; let cur = "";
  for (const r of rows) {
    if (hasTree && r.d === 0 && r.kids) { if (!isNotLesson(r.t)) lines.push("\u0001" + r.t); else lines.push("\u0001"); continue; }
    if (hasTree && r.d >= 2 && !/^\d/.test(r.t)) continue; // niveluri adânci (subpuncte)
    if (r.p) lines.push(`${r.t} … ${r.p}`);
  }
  const items = parseToc(lines.join("\n")); items.sort((a, b) => a.p - b.p);
  return items;
}

/* calitatea unei liste: destule teme reale, cu titluri care arată a titluri */
export const goodToc = items => { const avg = items.filter(x => !x.skip).reduce((a, x) => a + x.t.length, 0) / (items.filter(x => !x.skip).length || 1); if (avg > 90) return false; const L = items.filter(x => !x.skip); return L.length >= 3 && L.filter(x => (x.t.match(/\p{L}{3,}/gu) || []).length >= 1).length >= L.length * 0.8; };

/* elimină duplicatele, păstrează ordinea crescătoare a paginilor, calculează sfârșitul fiecărei teme și scoate ce nu e temă */
export function finish(items, last, span = 12) {
  const seen = new Set(), keep = []; let lastP = 0;
  for (const x of items) { const k = nrm(x.t); if (!k || seen.has(k) || x.p < lastP - 1) continue; seen.add(k); keep.push(x); lastP = Math.max(lastP, x.p); }
  return keep.map((x, i) => ({ ...x, e: Math.max(x.p, Math.min(x.p + span, (keep[i + 1]?.p ?? last + 1) - 1)) })).filter(x => !x.skip).map(({ skip, ...x }) => x);
}

/* caută singur paginile „Cuprins” (începutul sau sfârșitul manualului) */
export async function findTocPages(pdf, pagesText) {
  const N = pdf.numPages, order = [...Array(Math.min(40, N)).keys()].map(i => i + 1).concat(Array.from({ length: Math.min(20, N) }, (_, i) => N - i).reverse().filter(i => i > 40));
  for (const i of order) {
    const tx = await pagesText(pdf, i, i), dense = tx.split("\n").filter(l => /\p{L}.*[\s.·…]\d{1,3}$/u.test(l.trim())).length;
    if (!/cuprins|con[tț]inut|sommaire|contenus|contents/i.test(nrm(tx)) && dense < 8) continue;
    if (parseToc(tx).filter(x => !x.skip).length < 3) continue;
    let e = i; while (e < Math.min(i + 10, N)) { const nx = await pagesText(pdf, e + 1, e + 1); if (parseToc(nx).length >= 2 || nx.split("\n").filter(l => /\p{L}.*[\s.·…]\d{1,3}$/u.test(l.trim())).length >= 5) e++; else break; } return [i, e];
  }
  return null;
}
