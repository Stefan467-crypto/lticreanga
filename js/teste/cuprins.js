// Citește cuprinsul unui manual (din semnele de carte sau din paginile tipărite) → [{ t: tema, p: pagina de start, e: pagina de final, ch: capitol }].
// Înțelege ierarhia: capitol → temă („4.3. Titlu”) → subpuncte („a. …”, care NU sunt teme separate) și lasă deoparte
// ce nu e temă de studiu (teste, rezumate, lucrări de laborator, anexe, răspunsuri). Folosit de „Baza de lecții”.
export const nrm = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/* ---- ce NU e temă de studiu (se testează pe titlu, fără numerotare în față) ---- */
const NOT = /^(?:prefa[tț]|cuv[aâ]nt|dragi |cuprins|bibliografi|anex|indice|r[aă]spunsuri|rezolv[aă]ri|glosar|dic[tț]ionar|abrevieri|simboluri|norme de|coperta|cum utiliz|cum folosim|conținuturi|continuturi|nivelul sarcinilor|activit[aă][tț]i de [iî]nv[aă][tț]are|introducere [iî]n studierea|cuvânt|criterii de succes|evaluare|rezumat|extindere|tabelul|tabelele|conceptele de baz|recapitulare|exerci[tț]ii [sș]i probleme|probleme recapitulative|test\b|teste\b|autoevaluare|or[aă] de sintez|sintez[aă]|lucrare[a]? de laborator|lucrare[a]? practic|experien[tț]a de laborator|proiect\b|blank page|tipar|informa[tț]ii utile|itinerar|repere|modele de test|variante de|recomand[aă]ri|lista|table of contents|contents|index|algebr[ăa]$|geometrie$|aritmetic[ăa]$|trigonometrie$\b|answers|appendix|grammar reference|vocabulary list|unit review|revision)/i;
const NUMPFX = /^(?:\d{1,2}(?:\.\d{1,2}){0,2}\.?|§\s*\d{1,2}\.?|[IVXL]{1,5}\.|lec[tț]ia\s+\d+\.?|le[cç]on\s+\d+\.?|lesson\s+\d+\.?)\s*(?:\*|\(e\))*\s*/i;
export const isNotLesson = t => { const s = t.replace(/\s+/g, " ").trim(), core = s.replace(NUMPFX, ""); if (/^(?:\d|§)/.test(s) && nrm(core).startsWith("recapitulare si completari")) return false; /* în manualele de matematică „§ 1. Recapitulare și completări” e o lecție */ return NOT.test(core) || NOT.test(s) || core.length < 4 || /^[A-Z]_[A-Z0-9]|^F_N|\.indd|\.pdf$|coperta|tipar|blank page|\batelier\b(?!\s+de\s+(?:discu|scriere|lectur))|[eé]valuation|\bbilan\b/i.test(s); };

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
const pageOf = l => { let m = /^(.*?\S)\s*…\s*(\d{1,3})\b.*$/.exec(l); if (m) return { t: m[1], p: +m[2] }; m = /^(.*\p{L}.*?)\s+(\d{1,3})$/u.exec(l); if (m && !/^\d+\.\d*$/.test(m[2]) && !/(?:^|\s)(?:[-–—]|până|la|din|din anul|în anul|anul|secolul|sec\.|veacul)$/i.test(m[1].trim())) return { t: m[1], p: +m[2] }; return null; }; // titlul poate conține ani („…1848-1849 12”); nu tăiem dacă înainte de număr stă „anul/secolul/–” (atunci numărul face parte din titlu)
const strip = t => t.replace(/\bC\s*U\s*P\s*R\s*I\s*N\s*S\b/gi, " ").replace(/[•▪●]+/g, " ").replace(/\s+(?:[a-f]|[ivx]{1,3})\.\s*(?:\(e\)|\*)?\s+\p{Lu}.*$/u, "").replace(/\(e\)/g, " ").replace(/\s*\*\s*/g, " ").replace(/\s+/g, " ").replace(/^[\s.:;–—-]+|[\s.:;–—-]+$/g, "").trim();

/* text de cuprins → [{ t, p, ch, skip? }] (p = pagina tipărită) */
export function parseToc(text) {
  const grid = gridToc(text); if (grid) return mark(grid);
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
export const fixGlue = t => String(t).replace(/(\p{Ll}{5})(și|în|prin|pentru)(?=[\s.,;:]|$)/gu, "$1 $2"); // „mondialși” → „mondial și”, „militareîn” → „militare în” (spațiul pierdut la rupere de rând în semnele de carte)
function mark(items) { items.forEach(x => { x.t = fixGlue(fixTitle(x.t)); if (x.ch) x.ch = fixGlue(fixTitle(x.ch)); x.skip = isNotLesson(x.t); }); return items; }

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

/* ---- verificare la import: textul temei începe la titlul ei și se oprește la titlul temei următoare ----
   (o pagină poate conține sfârșitul unei teme și începutul alteia; fără tăiere, textele se amestecă și AI-ul întreabă din lecția greșită) */
const headOf = l => nrm(String(l).replace(NUMPFX, ""));
export const titleKey = t => headOf(t).slice(0, 22);
export function trimToTheme(text, title, next) {
  const lines = String(text).split("\n"), k = titleKey(title), nk = next ? titleKey(next) : "";
  let a = k.length >= 6 ? lines.findIndex(l => headOf(l).startsWith(k)) : -1; const found = a >= 0; if (a < 0) a = 0;
  let b = lines.length; if (nk.length >= 6) { const j = lines.findIndex((l, i) => i > a && headOf(l).startsWith(nk)); if (j >= 0) b = j; }
  return { text: lines.slice(a, b).join("\n"), found, cutNext: b < lines.length };
}

/* ---- cuprins pe coloane („Lesson 1 TITLU … 6 G Grammar · V Vocabulary · S Speaking”), ca la manualele de engleză ----
   Titlurile lecțiilor sunt într-o coloană, paginile în alta (rândurile „6 G …”, „48 V …”): le împerechem în ordine; dacă numerele nu se potrivesc, renunțăm (nu ghicim). */
function gridToc(text) {
  const L = String(text).replace(/\r/g, "").split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const heads = [], pages = []; let u = 0, cur = null;
  for (const l of L) {
    let m = /^UNIT\s*Lesson\s*(\d)(\d)\s*(.*)$/i.exec(l) || /^Lesson\s+(\d{1,2})\s+(.+)$/i.exec(l) && [null, "", ...(/^Lesson\s+(\d{1,2})\s+(.+)$/i.exec(l).slice(1))];
    if (m && /^UNIT/i.test(l)) { u = +m[1]; cur = { u, n: +m[2], t: m[3] || "" }; heads.push(cur); continue; }
    m = /^Lesson\s+(\d{1,2})\s+(.+)$/i.exec(l); if (m) { cur = { u, n: +m[1], t: m[2] }; heads.push(cur); continue; }
    const pg = /^(\d{1,3})\s+[GV]\s/.exec(l); if (pg) { pages.push(+pg[1]); cur = null; continue; }
    if (cur && /^[A-Z0-9][A-Z0-9 ,.'’!?&:-]{3,}$/.test(l) && !/^(?:G|V|S|CONTENTS|UNIT|EXTENDED|PROGRESS)\b/.test(l)) cur.t += " " + l; else if (!/^(?:Extended|Progress)/i.test(l)) cur = null;
  }
  if (heads.length < 6 || heads.length !== pages.length) return null;
  const nice = t => { t = t.replace(/\s+/g, " ").trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
  return heads.map((h, i) => ({ t: `Lesson ${h.n}. ${nice(h.t)}`, p: pages[i], ch: h.u ? `Unit ${h.u}` : "" }));
}

/* ---- decalajul dintre pagina tipărită și pagina din PDF (poate fi și negativ: PDF-ul are mai puține pagini decât numerotarea tipărită) ---- */
export async function findOffsetWith(txtOf, numPages, items, t1, t2) { // txtOf(pg) → text normalizat al paginii
  const ok = items.filter(it => nrm(it.t).length >= 8), S = ok.length > 8 ? Array.from({ length: 8 }, (_, i) => ok[Math.round(i * (ok.length - 1) / 7)]) : ok; if (!S.length) return 0;
  let best = 0, top = 0;
  for (const off of [...Array(46).keys(), ...Array.from({ length: 12 }, (_, i) => -(i + 1))]) { // întâi 0…45, apoi −1…−12
    let sc = 0; for (const it of S) { const pg = it.p + off; if (pg < 1 || pg > numPages || (pg >= t1 && pg <= t2)) continue; if ((await txtOf(pg)).includes(nrm(it.t).slice(0, 26))) sc++; }
    if (sc > top) { top = sc; best = off; } if (top === S.length) break;
  }
  return top ? best : 0;
}

/* ---- verificarea fiecărei teme: titlul trebuie să apară la pagina indicată; altfel căutăm la ±3 (întâi cu decalajul deja găsit la tema dinainte) ---- */
export const titleOn = (title, pageNrm) => { const k = titleKey(title); if (k.length < 6 || pageNrm.includes(k)) return true; const W = headOf(title).split(" ").filter(w => w.length >= 4); return W.length >= 2 && W.filter(w => pageNrm.includes(w)).length / W.length >= 0.75; }; // a doua cale: fonturi cu diacritice stricate în titlu (cuvintele din text rămân corecte)
export async function verifyShifts(items, txtOf, N, { trust = false } = {}) { // trust = paginile vin din semnele de carte ale PDF-ului (exacte): nu le mutăm și nu dăm alarme (unele fonturi strică diacriticele din titlu)
  const warn = []; if (trust) return warn; let cur = 0;
  for (const x of items) {
    const k = titleKey(x.t); if (k.length < 6) continue; const p0 = x.p, e0 = x.e; let hit = null;
    const at = async d => { const pg = p0 + d; return pg >= 1 && pg <= N ? await txtOf(pg) : null; };
    for (const d of [...new Set([cur, 0])]) { const t = await at(d); if (t && t.includes(k)) { hit = d; break; } } // întâi pagina indicată (cu decalajul curent), exact
    if (hit === null) for (const d of [1, -1, 2, -2, 3, -3]) { const t = await at(d); if (t && t.includes(k)) { hit = d; break; } } // apoi vecinele
    if (hit === null) for (const d of [...new Set([cur, 0])]) { const t = await at(d); if (t && titleOn(x.t, t)) { hit = d; break; } } // în fine, potrivire pe cuvinte (titlu cu diacritice stricate)
    if (hit === null) { warn.push({ t: x.t, p: p0, kind: "nf" }); continue; }
    if (hit !== 0) { x.p = p0 + hit; x.e = Math.max(x.p, e0 + hit); warn.push({ t: x.t, p: x.p, kind: "moved", d: hit }); }
    cur = hit;
  }
  items.forEach((x, i) => { const nx = items[i + 1]; if (nx && nx.p > x.p) x.e = Math.max(x.p, Math.min(x.e, nx.p - 1)); });
  return warn;
}
