// Motor de teste: creează întrebări DOAR din textul lecțiilor (fără API, doar JavaScript).
export const nz = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[„”“"'’()\[\];:!?]/g, " ").replace(/\s+/g, " ").trim();
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const STOP = new Set("care este sunt prin pentru dintre precum această acest aceste acestea aceasta când unde cum dacă atunci având fiind poate pot trebuie între asupra după înainte numai foarte fiecare altfel însă deci astfel unui unei unor către mult multe fără sale său lor lui spre peste ceea cele celor același aceeași acelor altele alte alți doar decât cât câte câți nici sau încât deoarece aproximativ semnificativ".split(" "));
const BADT = /^(acesta|aceasta|aceștia|acestea|aceste|acest|această|ea|el|ele|care|ce|cine|ceea|aici|astfel|acolo|în|la|pe|cu|din|de|prin|dacă|atunci|când|unde|deci|așadar|dar|iar|însă|deoarece|pentru|după|înainte|dintre|între|ca|se|nu|dacă|fiind|având)(?!\p{L})/iu;
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const NUM = /\d+(?:[.,]\d+)?(?:\s?(?:°C|%|[A-Za-zμΩ]{1,4}(?:\/[A-Za-zμ]{1,3})?[²³]?)(?![\p{L}]))?/gu;
const AB = /\b(Fig|fig|ex|Ex|nr|Nr|cca|etc|pag|str|vol|Dr|dr|Prof|prof|ec|Ec)\./g;
const FR = /^(?:(.{2,40}?)\s*[:—–]\s*)?([^=:\s][^=:]{0,22}?)\s*=\s*([^=,;]{1,40}?)\s*(?:[,;(].*)?\.?$/;
const VERB = "este|sunt|reprezintă|constituie|se numește|se numesc|se definește ca|se definesc ca|numim|se notează cu|înseamnă|desemnează|denumește|este numit|este numită|sunt numite|sunt numiți|este denumit|este denumită";
const DEF = new RegExp(`^(?:(?:Un|O|Orice|Fiecare)\\s+)?(.{3,60}?)\\s+(?:${VERB})\\s+(.{15,})$`, "i");
const DEF4 = /^(.{25,220}?)\s+(?:se\s+numesc|se\s+numește|este\s+numit[ăe]?|sunt\s+numit[ăe]?|se\s+denumesc|se\s+denumește)\s+([^,.;:()]{3,50})$/i; // „<descriere> se numesc <termen>.”
const DEF2 = /^Prin\s+(.{3,50}?)\s+(?:se\s+înțelege|înțelegem|înțelegem prin)\s+(.{15,})$/i;
const DESC = "mărimea|mărimile|fenomenul|procesul|numărul|numerele|figura|expresia|relația|proprietatea|substanța|reacția|unghiul|funcția|ecuația|cantitatea|raportul|mulțimea|corpul|valoarea|punctul|dreapta|segmentul|orice|acel|acea|aceea|fiecare|un|o|cel|cea|totalitatea|știința|ramura|perioada|evenimentul|persoana|organismul|celula|țesutul|organul";
const DEF3 = new RegExp(`^(?:Se\\s+(?:numește|numesc)|Numim)\\s+(.{3,45}?)\\s+(${DESC})\\s+(.{12,})$`, "i");
const NOTTERM = /^(exemplu|exemple|atenție|reține|rețineți|observație|observații|notă|temă|problemă|exercițiu|rezolvare|răspuns|se dă|se cere|întrebare|întrebări|concluzie|concluzii|aplicație|activitate|sarcină|etapele|pașii|cum|de ce|unde|când|ce|care)$/i;
const MARK = /^(?:Defini[tț]ie|Teorem[ăa]|Axiom[ăa]|Propriet(?:ate|ăți)|Regul[ăa]|Lege(?:a)?|Rețineți|Reține|De re[tț]inut|Important)\s*[.:–—-]\s*/i;
const tidy = t => t.replace(/^(?:un|o|orice|fiecare|noțiunea de|conceptul de|termenul de)\s+/i, "").replace(/\s*\([^)]*\)\s*$/, "").replace(/[„”"]/g, "").trim();
const okTerm = t => !TASK.test(t + " ") && t.length >= 3 && t.length <= 60 && t.split(/\s+/).length <= 5 && !/[,;:()=]/.test(t) && !BADT.test(t) && !/^\d/.test(t) && /\p{L}{3}/u.test(t) && !NOTTERM.test(t) && !/\s(al|ale)\s+(apei|sticlei|aerului)\b/i.test(t);
const okDef = d => d.length >= 12 && !/^(de\s+)?(aproximativ|circa|\d)/i.test(d);

// Etichete și verbe de sarcină din manuale: ele nu sunt „fapte” din lecție, deci nu devin întrebări.
const LAB = "sugestie|sugestii|activitate|activitate în perechi|activitate în grup|experiment|experimentul|concluzie|concluzii|observă|observați|cercetează|aplică|exemplu|exemple|curiozitate|știai că|ști că|uneori|temă|tema pentru acasă|proiect|lucrare de laborator|obiectivele|materiale|mod de lucru|rezolvare|se dă|se cere|figura|tabelul|corpul [a-z]|pune|ia|folosește|alege|descrie|compară|argumentează|studiază|formulează|calculează|determină|măsoară|completează|explică|scrie|notează|construiește|analizează|identifică|enumeră|propune|prezintă|realizează|desenează|repetă|apropie|frecă|introdu|leagă|conectează|montează|așază|așează|adaugă|toarnă|încălzește|răcește|taie|plasează|ține|trage|suspendă|umple|cântărește|rezolvă|verifică|enunță|exprimă|reprezintă grafic|desfă|următoarea stare|calculați|notați|construiți|analizați|formulați|completați|determinați|măsurați|alegeți|explicați|descrieți|comparați|realizați|desenați|enumerați|identificați|prezentați|propuneți|folosiți|vă|ți-";
const TASK = new RegExp(`^(?:\\d{1,2}[.)]|[a-hA-H][.)]|•|[-–])\\s+|^(?:${LAB})(?![\\p{L}])`, "iu");
const CTX = /^(?:el|ea|ei|ele|aceasta|acesta|aceștia|acestea|astfel|deci|de aceea|dar|iar|însă|și|atunci|apoi|aici|acolo|în prealabil|cu siguranță|pentru a (?:conchide|afla|observa|verifica|înțelege|demonstra)[^,]*,)(?![\p{L}])/iu; // depind de propoziția dinainte
const YOU = /\b(?:ai|ți|ți-|te|tău|ta|tale|tine|vei|poți|puteți|ești|vă|voi|vostru)\b|-(?:ți|te|vă)\b/iu; // adresare directă către elev
export const goodSent = s => !TASK.test(s) && !/^\p{L}+(?:ați|iți|eți|âți)(?![\p{L}])/u.test(s) && !CTX.test(s) && !YOU.test(s) && /[.!]$/.test(s) && !/[?:]\s*$/.test(s) && !/\b(?:kg|g|cm|dm|mm|m|s|N|J|W|Pa|l|ml)\/(?:m|cm|dm|mm|s|l)$/.test(s.replace(/[.!]$/, "")) && s.split(/\s+/).length >= 6 && !/(?:\d[\s,.]*){5,}/.test(s) && !/\b[ρΩμ]\b[^.]*,\s*(?:kg|g)\/?/.test(s);
export function splitSentences(t) {
  t = t.replace(AB, m => m.replace(".", "§")).replace(/(\d)[.](\d)/g, "$1§$2").replace(/(\b\d+)\.(\s)/g, "$1§$2");
  return (t.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map(s => s.replace(/§/g, ".").trim().replace(/^(?:Așadar|De asemenea|În plus|Totodată|În concluzie|Prin urmare|De exemplu),\s*(\p{L})/u, (_, c) => c.toUpperCase())).filter(s => s.length >= 30 && s.length <= 300 && /\p{L}{3}/u.test(s) && !/\b(fig\.|figura|tabelul|exercițiu|problema\s+\d|vezi)\b/i.test(s) && goodSent(s));
}
/* Manualele vechi folosesc „ş/ţ” (cu sedilă); codul caută „ș/ț” (virgulă dedesubt). Unele manuale de matematică au fontul mapat greșit: „Exerci\ii [i probleme” = „Exerciții și probleme”, „]n” = „în”. */
export const normDia = t => String(t).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").replace(/(?<=[A-Za-z0-9 ])[сС](?=[A-Za-z]\b)/g, m => m === "с" ? "c" : "C").replace(/ş/g, "ș").replace(/Ş/g, "Ș").replace(/ţ/g, "ț").replace(/Ţ/g, "Ț");
export const fixFont = t => (t.match(/\p{L}\\\p{L}/gu) || []).length < 3 ? t : t.replace(/(?<=\p{L})\\(?=\p{L})/gu, "ț").replace(/(?<![\p{L}\d\]])\[i(?!\p{L})/gu, "și").replace(/(?<![\p{L}\d\]])\](?=\p{L}{1,}(?!\p{L}))/gu, m => "î").replace(/(?<![\p{L}\d])\](?=\p{L})/gu, "î");
// Unele manuale (fonturi cu majuscule speciale) dau „FIzICII”, „INtRODUCERE”: t și z mici în mijlocul cuvintelor scrise cu majuscule → le facem majuscule.
const fixCaps = t => t.replace(/[\p{L}]{2,}/gu, w => /[tz]/.test(w) && /^[\p{Lu}tz]+$/u.test(w) && (w.match(/\p{Lu}/gu) || []).length >= 2 ? w.toUpperCase() : w);
export function clean(t) { // curăță textul extras din PDF
  t = fixCaps(fixFont(normDia(t)).replace(/\r/g, "").replace(/\u00ad/g, "").replace(/-\n(?=\p{Ll})/gu, "")).replace(/^.*\.indd\s+\d+\s+\d{1,2}\.\d{2}\.\d{4}.*$/gm, "");
  const L = t.split("\n"), cnt = new Map(); // antete / subsoluri care se repetă pe fiecare pagină + numerele paginilor
  for (const l of L) { const k = l.trim(); if (k.length >= 12 && k.length < 80) cnt.set(k, (cnt.get(k) || 0) + 1); }
  t = L.filter(l => { const k = l.trim(); return !/^\d{1,3}$/.test(k) && !(cnt.get(k) >= 3 && !/[.!?:]$/.test(k)); }).join("\n");
  return t.replace(/\s+([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g, "$1").replace(/([^.!?:\n])\n(?=\p{Ll})/gu, "$1 ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---- calcul sigur (fără eval): parser recursiv; respectă prioritățile, minusul unar (2*-3, 2^-1) și puterile (2^3^2 = 2^9) ---- */
export function calc(expr, vars = {}) {
  const tk = String(expr).replace(/·|×|⋅/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, ".").match(/\d+(?:\.\d+)?|[a-zA-Z_]\w*|\*\*|[-+*/^()]/g) || [], fn = { sqrt: Math.sqrt, abs: Math.abs, sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180), ln: Math.log, log: Math.log10 };
  let i = 0; const peek = () => tk[i], eat = t => { if (tk[i] !== t) throw new Error("așteptam " + t); i++; };
  const atom = () => {
    const t = tk[i++]; if (t === undefined) throw new Error("expresie incompletă");
    if (/^\d/.test(t)) return +t; if (t === "(") { const v = sum(); eat(")"); return v; }
    if (t in fn) { eat("("); const v = sum(); eat(")"); return fn[t](v); }
    if (t === "pi") return Math.PI; if (t in vars) return vars[t]; throw new Error("var " + t);
  };
  const pow = () => { const b = atom(); if (peek() === "^" || peek() === "**") { i++; return b ** unary(); } return b; };
  const unary = () => { if (peek() === "-") { i++; return -unary(); } if (peek() === "+") { i++; return unary(); } return pow(); };
  const prod = () => { let v = unary(); while (peek() === "*" || peek() === "/") { const o = tk[i++], r = unary(); v = o === "*" ? v * r : v / r; } return v; };
  const sum = () => { let v = prod(); while (peek() === "+" || peek() === "-") { const o = tk[i++], r = prod(); v = o === "+" ? v + r : v - r; } return v; };
  const v = sum(); if (i < tk.length) throw new Error("rest: " + tk[i]); return v;
}

/* ---- probleme din manual: se extrag singure (enunț + rezolvare) și, când se poate, devin șabloane cu numere schimbate ---- */
const PSTART = /^(?:Problem[ăa]|Exerci[tț]iu(?:l)?|Exemplu(?:l)?|Aplica[tț]ie|Model\s+de\s+rezolvare)(?!\p{L})\s*(?:\d+[.)]?)?\s*[.:\-–]?\s*/iu;
const SOLM = /^(?:Rezolvare|Rezolvarea|Rezolvă|Solu[tț]ie|Solu[tț]ia)(?!\p{L})\s*[.:\-–]?\s*/iu;
const ANSM = /^R[ăa]spuns(?!\p{L})\s*[.:\-–]?\s*/iu;
const SEDA = /^Se\s+dă(?!\p{L})/iu;
const ASK = /(?<!\p{L})(Calcula[tț]i|Determina[tț]i|Afla[tț]i|Află|Calculează|Determină|Se\s+cere|Cât|Câ[tț]i|Care\s+este|Care\s+sunt|Exprima[tț]i|Scrie[tț]i)(?!\p{L})/u;
const EXPRCH = /^[\d\s.,+\-*/^()]+$/;
const toExpr = seg => {
  const s = seg.replace(/(?<=\d)\s*[A-Za-zμΩ°%Δ]+(?:[·*/][A-Za-zμ]+)*[²³]?/g, "").replace(/²/g, "^2").replace(/³/g, "^3").replace(/[·×⋅]/g, "*").replace(/÷/g, "/").replace(/(?<=[\d)])\s*:\s*(?=[\d(])/g, "/").replace(/\s+/g, " ").trim();
  return EXPRCH.test(s) && /\d/.test(s) && /[-+*/^]/.test(s.replace(/^-/, "")) ? s : null;
};
const lead = s => { const m = /^\s*[-−]?\s*(\d+(?:[.,]\d+)?)/.exec(s); if (!m) return null; const u = /^\s*([A-Za-zμΩ°%]+(?:\/[A-Za-zμ]+)?[²³]?)/.exec(s.slice(m[0].length)); return { v: parseFloat(m[1].replace(",", ".")) * (/^\s*[-−]/.test(s) ? -1 : 1), u: u ? u[1] : "" }; };
const pat = t => "(?:" + t.replace(/[.,]/, "§").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("§", "[.,]") + ")";
function autoTemplate(stmt, sol, ans) {
  if (!sol && !ans) return null;
  const fin = lead(ans || ""); const chains = (sol.match(/[^=;\n]+(?:=[^=;\n]+){2,}/g) || []).reverse();
  for (const ch of chains) {
    const parts = ch.split("=").map(x => x.trim()), res = fin || lead(parts.at(-1)); if (!res) continue;
    for (let k = parts.length - 2; k >= 1; k--) {
      const expr = toExpr(parts[k]); if (!expr) continue;
      let v; try { v = calc(expr, {}); } catch (e) { continue; } if (!isFinite(v) || Math.abs(v - res.v) > Math.max(Math.abs(res.v) * 1e-3, 1e-6)) continue;
      const toks = [...expr.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0]), uniq = [...new Set(toks)], vars = new Map();
      for (const t of uniq) {
        const val = parseFloat(t.replace(",", ".")); if (!(val > 0)) continue;
        const nS = (stmt.match(new RegExp(`(?<![\\p{L}\\d.,])${pat(t)}(?![\\p{L}\\d]|[.,]\\d)`, "gu")) || []).length, nE = toks.filter(x => x.replace(",", ".") === t.replace(",", ".")).length;
        if (nS >= 1 && (nS === 1 || nS === nE)) vars.set(t.replace(",", "."), { t, val });
      }
      if (!vars.size) continue;
      const names = new Map([...vars.keys()].map((k2, i) => [k2, "v" + (i + 1)])), rng2 = new Map();
      for (const [k2, { t, val }] of vars) {
        const dec = (t.split(/[.,]/)[1] || "").length; let lo, hi, st;
        if (dec) { st = +(10 ** -dec).toFixed(dec); lo = +(val * .5).toFixed(dec); hi = +(val * 2).toFixed(dec); if (lo <= 0) lo = st; }
        else { const tz = val >= 10 ? Math.min(3, (t.match(/0+$/) || [""])[0].length) : 0; st = 10 ** tz; lo = Math.max(st, Math.ceil(val * .5 / st) * st); hi = Math.max(lo + st, Math.floor(val * 2 / st) * st); }
        rng2.set(k2, `{${names.get(k2)}:${lo}-${hi}${st !== 1 ? ":" + st : ""}}`);
      }
      const alt = [...vars.values()].map(x => x.t).sort((a, b) => b.length - a.length).map(pat).join("|");
      const stmt2 = stmt.replace(new RegExp(`(?<![\\p{L}\\d.,])(?:${alt})(?![\\p{L}\\d]|[.,]\\d)`, "gu"), m => { const key = m.replace(",", "."); return rng2.get(key) || m; }).replace(/[|~]|=>/g, " ");
      const expr2 = expr.replace(/\d+(?:[.,]\d+)?/g, m => names.get(m.replace(",", ".")) || m);
      const sym = k >= 2 && /\p{L}/u.test(parts[k - 1]) && parts[k - 1].length <= 60 ? parts[k - 1] : "";
      const left = (parts[0].match(/[A-Za-zΑ-Ωα-ω][\w]{0,5}$/) || [""])[0], symb = sym ? (left ? left + " = " : "") + sym : "";
      return `${stmt2} => ${expr2} | ${res.u}${symb ? " ~ " + symb : ""}`;
    }
  }
  return null;
}
function extractProblems(lines, P) {
  const rest = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!(PSTART.test(l) || SEDA.test(l))) { rest.push(lines[i]); i++; continue; }
    let j = i, seenSol = false, blanks = 0, ansDone = false; const blk = [];
    while (j < lines.length && blk.length < 40) {
      const t = lines[j].trim();
      if (j > i && (PSTART.test(t) || (SEDA.test(t) && seenSol) || t.startsWith("# "))) break;
      if (!t) { blanks++; if (seenSol) { let n = j + 1; while (n < lines.length && !lines[n].trim()) n++; const nx = (lines[n] || "").trim(); if (blanks >= 2 || !nx || !/=|^R[ăa]spuns/iu.test(nx)) { j++; break; } } j++; continue; }
      blanks = 0; blk.push(t); if (SOLM.test(t) || ANSM.test(t)) seenSol = true; j++; if (ANSM.test(t) && !/^R[ăa]spuns\s*[.:\-–]?\s*$/iu.test(t)) { ansDone = true; break; }
    }
    const st = [], so = []; let ans = "", sol = false;
    for (const t of blk) { if (ANSM.test(t)) { ans = t.replace(ANSM, ""); sol = true; } else if (SOLM.test(t)) { sol = true; so.push(t.replace(SOLM, "")); } else (sol ? so : st).push(t); }
    const stmt = st.join(" ").replace(PSTART, "").replace(/\s+/g, " ").trim();
    if (stmt.length >= 25 && /\d/.test(stmt) && (sol || ASK.test(stmt))) {
      const solT = so.join(" ; ").trim();
      const tpl = sol ? autoTemplate(stmt, solT, ans) : null; if (tpl) P.probs.push(tpl);
      P.sols.push({ q: stmt, a: ((so.join("\n") + (ans ? "\nRăspuns: " + ans : "")).trim()) || "Rezolvarea se verifică de profesor." });
    } else { for (let n = i; n < j; n++) rest.push(lines[n]); }
    i = Math.max(j, i + 1); void ansDone;
  }
  return rest;
}

/* ---- exerciții numerotate de la sfârșitul lecției („3. Un pendul efectuează 30 de oscilații în 60 s. Determină perioada.”): nu au rezolvare, dar arată AI-ului ce tip de probleme se dau la lecția respectivă ---- */
const ASKV = /(?:^|[.?!]\s+|\d\.\s+)(?:Calcul|Determin|Afl|Găsi|Exprim)\p{L}*|(?<!\p{L})Să\s+se\s+(?:calcul|determin|afl|găsea)\p{L}*|(?<!\p{L})Câ[tț]\p{L}*\s|\?\s*(?:\([^)]*\)\s*)?$/iu; // cerință de calcul: „Calculează…”, „Să se afle…”, „Câte oscilații…?”
export function exercisesOf(text, max = 8) {
  const L = fixFont(normDia(text)).replace(/\r/g, "").split("\n"), out = []; let cur = null;
  const flush = () => { if (cur) { const q = cur.replace(/\s+/g, " ").replace(/^\*/, "").trim(); const nums = q.match(/\d+(?:[.,]\d+)?/g) || []; if (q.length >= 40 && q.length <= 420 && nums.length >= 2 && ASKV.test(q) && !/[\\\]\[]|\.{3,}|fig\.|figura|\s[,.;]\s|formula\s*[,.:]|\bunde\s+[a-z]\s+este\b/i.test(q) && !/^(?:Descrie|Explic|Argument|Compar|Enumer|Preciz|Formul|Dă|Indic|Alege|Selecte|Complete|Scrie|Exemplific|Numește|Ce |De ce|Cum )/i.test(q.replace(/^\d+\.\s*/, ""))) out.push(q.replace(/^\d+\.\s*/, "")); } cur = null; };
  for (const raw of L) { const l = raw.trim(); const m = /^\*?\d{1,2}\.\s+\p{Lu}/u.exec(l); if (m) { flush(); cur = l; } else if (cur && l && cur.length < 420 && !/^(?:Extindere|Evaluare|Rezumat|Capitolul|\d+\.\d+\.)/.test(l) && !/^\d{1,3}$/.test(l)) cur += " " + l; else flush(); }
  flush(); return out.slice(0, max);
}

/* ---- analiză lecție ---- */
export function parse(text, tema = "") {
  const P = { tema, sents: [], defs: [], forms: [], probs: [], sols: [] };
  const addDef = (term, def, src) => { term = tidy(term); def = def.replace(/[.!?]+$/, "").trim(); if (okTerm(term) && okDef(def)) P.defs.push({ term, def, src }); };
  text = fixFont(normDia(text));
  for (const raw of extractProblems(text.replace(/\r/g, "").split("\n"), P)) {
    let l = raw.trim().replace(/^[•▪●◦*]\s*|^[-–—]\s+(?=\p{L})/u, ""); if (!l || l.startsWith("# ") || /^(?:\d{1,2}[.)]|[a-hA-H]\))\s+\p{Lu}/u.test(l) && !/^@problema/i.test(l) && /[?:]\s*$|\b(?:calcula|determina|completa|notează|construi|analiza|formula)\p{L}*/iu.test(l)) continue;
    if (/^@problema/i.test(l)) { P.probs.push(l.replace(/^@problema\s*/i, "")); continue; }
    const f = l.length <= 90 && FR.exec(l.replace(/\.$/, ""));
    if (f && /[=]/.test(l) && !/\s(este|sunt|reprezintă)\s/i.test(l)) { const L = f[2].trim(), R = f[3].trim(); if (R.length >= 1 && /\p{L}/u.test(L) && !/^(SI|[a-z]{1,2}\s?SI)$/i.test(L) && !/\p{L}{2,}\s+\p{L}{1,3}\s+\p{L}{2,}/u.test(R) && !/(g cm|kg m)\s*$/.test(R) && !/·\s*\d+$/.test(R)) P.forms.push({ name: (f[1] || "").trim(), left: L, right: R }); continue; }
    const mk = MARK.exec(l); if (mk) l = l.slice(mk[0].length);
    const m0 = /^([A-ZĂÂÎȘȚ][^:—–]{2,50}?)\s*[:—–]\s*(.{20,})$/.exec(l);
    if (m0 && !/\b(legea|formula)\b/i.test(m0[1]) && m0[1].split(/\s+/).length <= 5 && !TASK.test(m0[1] + " ")) addDef(m0[1], m0[2], l);
    for (const s of splitSentences(l)) {
      P.sents.push(s);
      const m4 = DEF4.exec(s.replace(/[.!]+$/, "")); if (m4 && m4[1].split(/\s+/).length >= 4 && m4[2].trim().split(/\s+/).length <= 5 && !/\s(?:și|sau|iar)\s/i.test(m4[2]) && !/^(?:aceste|acestea|aceasta|acesta)\b/i.test(m4[2].trim())) { const before = m4[1].replace(/^(?:Mărimea|Fenomenul|Procesul)\s+(?:fizic[ăe]\s+)?(?:care|ce)\s+/i, m => m); addDef(m4[2].trim().replace(/^(?:un|o|unitatea|noțiunea)\s+/i, m => /^unitatea/i.test(m) ? m : ""), cap(before), s); continue; }
      const m3 = DEF3.exec(s); if (m3) { addDef(m3[1], m3[2] + " " + m3[3], s); continue; }
      const m = DEF.exec(s) || DEF2.exec(s); if (m) addDef(m[1].replace(/^(?:un|o|prin)\s+/i, ""), m[2], s);
    }
  }
  return P;
}
const X0 = () => ({ mcq: [], tf: [], blank: [], open: [] });
export function merge(list) { return list.reduce((a, p) => ({ sents: a.sents.concat(p.sents), defs: a.defs.concat(p.defs), forms: a.forms.concat(p.forms), probs: a.probs.concat(p.probs), sols: a.sols.concat(p.sols), x: Object.fromEntries(Object.keys(X0()).map(k => [k, a.x[k].concat(p.x?.[k] || [])])) }), { sents: [], defs: [], forms: [], probs: [], sols: [], x: X0() }); }
/* material pregătit de AI (opțional): definiții, întrebări, probleme și șabloane — adăugat peste ce găsește motorul local */
export function withAi(P, ai) {
  if (!ai || !ai.v) return P; const seen = new Set(P.defs.map(d => nz(d.term)));
  return { ...P, defs: P.defs.concat((ai.defs || []).filter(d => !seen.has(nz(d.term)))), sols: P.sols.concat(ai.sols || []), probs: P.probs.concat(ai.tpl || []), x: { mcq: ai.mcq || [], tf: ai.tf || [], blank: ai.blank || [], open: ai.open || [] } };
}
export function checkTemplate(p) { // un șablon e bun doar dacă produce o problemă cu rezultat numeric
  try { if (!/\{\w+:/.test(p)) return false; const g = generate({ tema: "", sents: [], defs: [], forms: [], probs: [p], sols: [] }, { n: 1, types: ["num"], seed: 7 }); return g.total === 1 && g.q[0].t === "num" && isFinite(g.k[0].v); } catch (e) { return false; }
}
function keywords(sents) {
  const f = new Map(); for (const s of sents) for (const w of new Set(s.toLowerCase().match(/\p{L}{6,}/gu) || [])) if (!STOP.has(w)) f.set(w, (f.get(w) || 0) + 1);
  let k = [...f].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 90).map(x => x[0]);
  if (k.length < 12) k = [...f].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 70).map(x => x[0]);
  return k;
}

/* ---- generare ---- */
export function generate(P, { n = 10, types = ["mcq", "tf", "blank", "num"], level = 1, hist = new Set(), avoid = new Set(), seed = (Date.now() ^ (Math.random() * 2 ** 31)) >>> 0 } = {}) {
  const R = rng(seed), pick = a => a[Math.floor(R() * a.length)], shuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const keys = keywords(P.sents), nums = [...new Set(P.sents.flatMap(s => s.match(NUM) || []).filter(x => /\d/.test(x)))];
  const target = s => { // ce ascundem dintr-o propoziție
    const d = P.defs.find(x => x.src === s); if (d && new RegExp(esc(d.term), "i").test(s) && s.indexOf(d.term) >= 0 && d.term.length >= 4 && !/\s/.test(d.term.trim().replace(/^\S+\s/, ""))) return { kind: "w", a: d.term, def: 1 };
    const w = (s.match(/\p{L}{6,}/gu) || []).filter(x => keys.includes(x.toLowerCase())).sort((a, b) => b.length - a.length)[0]; if (w) return { kind: "w", a: w };
    const nn = (s.match(NUM) || []).filter(x => /\d/.test(x) && x.length >= 2)[0]; if (nn) return { kind: "n", a: nn.trim() };
    return null;
  };
  const mutNum = a => { const m = /^(\d+(?:[.,]\d+)?)(.*)$/.exec(a); if (!m) return a; const dec = /,/.test(m[1]), v = parseFloat(m[1].replace(",", ".")), f = pick([2, .5, 1.5, 10, .1, 3, .25]), r = +(v * f).toFixed(2); let s = String(r === v ? v + 1 : r); if (dec) s = s.replace(".", ","); return s + m[2]; };
  const stem = w => nz(w).replace(/[^a-z0-9 ]/g, "").slice(0, 4), plural = w => /(?:i|e|uri|ele|ii)$/i.test(String(w).trim()); // „Atom” și „Atomul” au aceeași tulpină; „izotopii” e plural, „atomul” singular
  const distract = (t, s, cnt, sameNo = false) => { // alternative plauzibile
    const out = new Set();
    if (t.kind === "n") { for (let i = 0; i < 12 && out.size < cnt; i++) { const x = nums.length && R() < .4 ? pick(nums) : mutNum(t.a); if (x !== t.a) out.add(x); } }
    else if (t.def) { const up = t.a[0] === t.a[0].toUpperCase(), seenSt = new Set([stem(t.a)]), pool = shuf(P.defs.map(x => x.term).filter(x => nz(x) !== nz(t.a) && stem(x) !== stem(t.a) && (!sameNo || plural(x) === plural(t.a)))); for (const p of pool) { if (out.size >= cnt) break; if (seenSt.has(stem(p))) continue; seenSt.add(stem(p)); out.add(up ? cap(p) : p.charAt(0).toLowerCase() + p.slice(1)); } }
    else { let pool = keys.filter(k => nz(k) !== nz(t.a) && stem(k) !== stem(t.a) && !nz(s).includes(nz(k))); if (level > 0) pool = pool.sort((x, y) => Math.abs(x.length - t.a.length) - Math.abs(y.length - t.a.length)).slice(0, 10); pool = shuf(pool); const up = t.a[0] === t.a[0].toUpperCase(); const seenSt = new Set([stem(t.a)]); for (const p of pool) { if (out.size >= cnt) break; if (seenSt.has(stem(p))) continue; seenSt.add(stem(p)); out.add(up ? cap(p) : p); } }
    return out.size >= cnt ? [...out].slice(0, cnt) : null;
  };
  const blankOut = (s, t) => t.kind === "w" ? s.replace(new RegExp(`(?<![\\p{L}\\d])${esc(t.a)}(?![\\p{L}\\d])`, "giu"), "_____") : s.split(t.a).join("_____");
  const clip = (s, n = 130) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;
  const optsQ = (ans, wrong) => { const o = shuf([ans, ...wrong]); return { o, k: o.indexOf(ans) }; };
  const G = { mcq: [], tf: [], blank: [], num: [], match: [], open: [], prob: [] };
  P.defs.forEach((d, i) => { if (P.defs.length >= 4) { G.mcq.push({ sig: `m|d${i}|r`, f: () => { const w = shuf(P.defs.filter(x => x.term !== d.term)).slice(0, 3).map(x => cap(x.term)); const { o, k } = optsQ(cap(d.term), w); return { t: "mcq", q: `Care noțiune corespunde descrierii: „${clip(d.def, 170)}”?`, o, k, src: d.src }; } }); G.mcq.push({ sig: `m|d${i}|f`, f: () => { const w = shuf(P.defs.filter(x => x.term !== d.term)).slice(0, 3).map(x => clip(cap(x.def), 110)); const { o, k } = optsQ(clip(cap(d.def), 110), w); return { t: "mcq", q: `Ce reprezintă „${d.term}”?`, o, k, src: d.src }; } }); } });
  P.sents.forEach((s, i) => {
    const t = target(s); if (!t) return;
    G.mcq.push({ sig: `m|c${i}`, f: () => { const w = distract(t, s, 3); if (!w) return null; const { o, k } = optsQ(t.a, w); return { t: "mcq", q: `Alege varianta corectă: ${blankOut(s, t)}`, o, k, src: s }; } });
    G.blank.push({ sig: `b|${i}`, f: () => ({ t: "blank", q: `Completează: ${blankOut(s, t)}${level === 0 && t.kind === "w" ? ` (începe cu „${t.a.slice(0, 2)}…”)` : ""}`, k: [t.a, t.a.replace(/\s/g, "")], src: s }) });
    G.tf.push({ sig: `t|${i}`, f: () => {
      const T = { t: "tf", q: s, k: true, src: s }; if (R() < .5) return T;
      const nn = (s.match(NUM) || []).filter(x => /\d/.test(x) && x.length >= 2)[0];
      if (nn) { const w = distract({ kind: "n", a: nn.trim() }, s, 1); return w ? { t: "tf", q: s.replace(nn.trim(), w[0]), k: false, src: s } : T; }
      const d = P.defs.find(x => x.src === s); if (d && t.def && new RegExp("^" + esc(d.term), "i").test(s)) { const w = distract(t, s, 1, true); if (w) return { t: "tf", q: s.replace(new RegExp("^" + esc(d.term), "i"), w[0]), k: false, src: s }; }
      return T;
    } });
  });
  P.forms.forEach((fm, i) => {
    const form = `${fm.left} = ${fm.right}`;
    if (fm.name && P.forms.filter(x => x.name).length >= 3) G.mcq.push({ sig: `m|f${i}`, f: () => { const w = shuf(P.forms.filter(x => x !== fm)).slice(0, 3).map(x => `${x.left} = ${x.right}`); const { o, k } = optsQ(form, w); return { t: "mcq", q: `Care este formula pentru „${fm.name}”?`, o, k, src: form }; } });
    const vs = fm.right.match(/[A-Za-zα-ωΔ][A-Za-z0-9_]*/g); if (vs && vs.length) G.blank.push({ sig: `b|f${i}`, f: () => { const v = pick(vs); return { t: "blank", q: `Completează formula: ${fm.left} = ${fm.right.replace(new RegExp(`(?<![\\p{L}\\d])${esc(v)}(?![\\p{L}\\d])`, "u"), "_____")}`, k: [v], src: form }; } });
    if (fm.name) G.open.push({ sig: `o|f${i}`, f: () => ({ t: "open", q: `Scrie formula pentru „${fm.name}” și explică ce înseamnă fiecare literă.`, k: form, src: form }) });
  });
  /* asocieri: 4 noțiuni ↔ 4 descrieri */
  const nm = Math.min(Math.floor(new Set(P.defs.map(d => nz(d.term))).size / 4), 6);
  for (let g = 0; g < nm; g++) G.match.push({ sig: `a|${g}`, f: () => {
    const seen = new Set(), ch = []; for (const d of shuf(P.defs)) { if (seen.has(nz(d.term))) continue; seen.add(nz(d.term)); ch.push(d); if (ch.length === 4) break; } if (ch.length < 3) return null;
    const R2 = shuf(ch.map((d, i) => i)), terms = ch.map(d => cap(d.term)), right = R2.map(i => clip(cap(ch[i].def), 100));
    return { t: "match", q: `Asociază fiecare noțiune cu descrierea ei: ${terms.join(", ")}.`, L: terms, R: right, k: ch.map((d, i) => R2.indexOf(i)), src: ch.map(d => d.src).join(" | ") };
  } });
  /* răspuns scurt: definiții */
  P.defs.forEach((d, i) => G.open.push({ sig: `o|d${i}`, f: () => ({ t: "open", q: pick([`Definește noțiunea „${d.term}”.`, `Ce este „${d.term}”? Explică pe scurt.`, `Explică ce înseamnă „${d.term}”.`]), k: cap(clip(d.def, 400)), src: d.src }) }));
  /* probleme din manual, cu rezolvare */
  P.sols.forEach((s, i) => G.prob.push({ sig: `r|${i}`, f: () => ({ t: "prob", q: s.q, k: s.a, src: "Problemă din manual" }) }));
  /* probleme cu numere diferite la fiecare test (șabloane: scrise de profesor sau extrase singure din manual) */
  P.probs.forEach((p, i) => G.num.push({ sig: `n|${i}|${seed}`, sk: "p" + i, fresh: 1, f: () => {
    const m = /^(.*?)=>\s*([^|~]+?)\s*(?:\|\s*([^~]*?))?\s*(?:~\s*(.*))?$/.exec(p); if (!m) return null; const vars = {}; let txt = m[1].trim();
    txt = txt.replace(/\{(\w+):([\d.,]+)-([\d.,]+)(?::([\d.,]+))?\}/g, (_, v, a, b, st) => { a = +a.replace(",", "."); b = +b.replace(",", "."); st = st ? +st.replace(",", ".") : 1; const steps = Math.floor((b - a) / st + 1e-9), x = +(a + Math.floor(R() * (steps + 1)) * st).toFixed(4); vars[v] = x; return String(x).replace(".", ","); });
    let v; try { v = calc(m[2], vars); } catch (e) { return null; } if (!isFinite(v)) return null; v = +v.toPrecision(6);
    const shown = m[2].trim().replace(/[a-zA-Z_]\w*/g, w => w in vars ? String(vars[w]).replace(".", ",") : w), un = (m[3] || "").trim(), rs = String(+v.toFixed(2)).replace(".", ",");
    const whole = Math.abs(v - Math.round(v)) < 1e-9; return { t: "num", q: `${txt}${un && !/fără/i.test(un) ? ` (răspuns în ${un}${whole ? "" : ", rotunjit la 2 zecimale"})` : whole ? "" : " (rotunjește la 2 zecimale)"}`, k: { v }, src: `${m[4] ? "Formula: " + m[4].trim() + ". " : ""}Calcul: ${shown} = ${rs}${un && !/fără/i.test(un) ? " " + un : ""}` };
  } }));
  const X = P.x || {};
  (X.mcq || []).forEach((m, i) => G.mcq.push({ sig: `x|m${i}`, f: () => { const { o, k } = optsQ(m.o[m.k], m.o.filter((_, j) => j !== m.k)); return { t: "mcq", q: m.q, o, k, src: m.src }; } }));
  (X.tf || []).forEach((m, i) => G.tf.push({ sig: `x|t${i}`, f: () => ({ t: "tf", q: m.q, k: !!m.k, src: m.src }) }));
  (X.blank || []).forEach((m, i) => G.blank.push({ sig: `x|b${i}`, f: () => ({ t: "blank", q: "Completează: " + m.q.replace(/_{2,}/g, "_____"), k: [m.a, m.a.replace(/\s/g, "")], src: m.src }) }));
  (X.open || []).forEach((m, i) => G.open.push({ sig: `x|o${i}`, f: () => ({ t: "open", q: m.q, k: m.a, src: m.src }) }));
  const en = types.filter(t => G[t] && G[t].length); if (!en.length) return { q: [], k: [], src: [], sigs: [], used: [], total: 0 };
  const W0 = { mcq: [.45, .35, .25], tf: [.25, .2, .15], blank: [.2, .25, .3], num: [.1, .2, .3], match: [.1, .1, .1], open: [.2, .2, .2], prob: [.2, .2, .2] }, sum = en.reduce((a, t) => a + W0[t][level], 0);
  const quota = {}; let left = n; en.forEach(t => { quota[t] = Math.min(G[t].length * (t === "num" ? 3 : 1), Math.round(n * W0[t][level] / sum)); left -= quota[t]; });
  const items = [], used = new Set(), sigs = [];
  const skOf = sig => { let m; if ((m = /^m\|d(\d+)\|/.exec(sig))) return "s" + P.defs[+m[1]].src; if ((m = /^[mbt]\|f(\d+)$/.exec(sig)) || (m = /^o\|f(\d+)$/.exec(sig))) return "f" + m[1]; if ((m = /^o\|d(\d+)$/.exec(sig))) return "s" + P.defs[+m[1]].src; if ((m = /^[mbt]\|c?(\d+)$/.exec(sig))) return "s" + P.sents[+m[1]]; if ((m = /^r\|(\d+)$/.exec(sig))) return "r" + m[1]; if ((m = /^x\|([mtbo])(\d+)$/.exec(sig))) return "s" + X[{ m: "mcq", t: "tf", b: "blank", o: "open" }[m[1]]][+m[2]].src; return ""; };
  const usedSk = new Set(avoid);
  const take = (t, cnt, strict = true) => { const order = shuf(G[t]).sort((a, b) => (hist.has(a.sig) ? 1 : 0) - (hist.has(b.sig) ? 1 : 0)); let c = 0, tries = 0; const pool = t === "num" ? order.concat(order, order) : order; for (const g of pool) { if (c >= cnt) break; if (++tries > 600) break; if (!g.fresh && used.has(g.sig)) continue; const sk = g.fresh ? g.sk : skOf(g.sig); if (strict && sk && usedSk.has(sk)) continue; const q = g.f(); if (!q) continue; if (items.some(x => nz(x.q) === nz(q.q))) continue; used.add(g.sig); if (sk) usedSk.add(sk); items.push(q); sigs.push(g.fresh ? "" : g.sig); c++; } return c; };
  en.forEach(t => { left += quota[t] - take(t, quota[t]); });
  for (let r = 0; left > 0 && r < 4; r++) for (const t of shuf(en)) { if (left <= 0) break; left -= take(t, 1); }
  for (let r = 0; left > 0 && r < 6; r++) for (const t of shuf(en)) { if (left <= 0) break; left -= take(t, 1, false); }
  const idx = shuf(items.map((_, i) => i)).slice(0, n);
  return { q: idx.map(i => { const { k, src, ...rest } = items[i]; return rest; }), k: idx.map(i => items[i].k), src: idx.map(i => items[i].src), sigs: idx.map(i => sigs[i]).filter(Boolean), used: [...usedSk], total: idx.length };
}

/* ---- test „ca la examen”: structura vine din modelul ales (vezi exam.js), conținutul — din lecție ---- */
const OPENK = new Set(["open", "prob", "compose"]);
export function generateExam(P, tpl, { level = 1, hist = new Set(), noOpen = false, tema = "" } = {}) {
  const left = { ...capacity(P) }, out = { q: [], k: [], src: [], p: [], sc: [], sigs: [], total: 0, parts: tpl.parts.map(x => ({ t: x.t, d: x.d })) }, avoid = new Set(), h = new Set(hist);
  const FALL = ["mcq", "blank", "tf", "match", "open"];
  tpl.parts.forEach((part, pi) => part.it.forEach(slot => {
    let g = null;
    for (const kind of [...slot.k, ...FALL]) {
      if (noOpen && OPENK.has(kind)) continue;
      if (kind === "compose") { g = { q: { t: "open", q: `Redactează un text de 12–15 rânduri pe tema „${tema || P.tema || "lecția studiată"}”. Folosește noțiunile învățate și argumentează-ți ideile.` }, k: "Criterii: conținutul și corectitudinea informațiilor — 40%; structura și coerența textului — 30%; limba (ortografie, punctuație, vocabular) — 30%.", src: "Subiect de redactare" }; break; }
      if (!(left[kind] > 0)) continue;
      const r = generate(P, { n: 1, types: [kind], level, hist: h, avoid }); if (!r.total) { left[kind] = 0; continue; }
      left[kind]--; r.used.forEach(s => avoid.add(s)); r.sigs.forEach(s => { h.add(s); out.sigs.push(s); }); g = { q: r.q[0], k: r.k[0], src: r.src[0] }; break;
    }
    if (!g) return; out.q.push(g.q); out.k.push(g.k); out.src.push(g.src); out.p.push(slot.p); out.sc.push(pi);
  }));
  out.total = out.q.length; return out;
}

export function grade(q, k, a) {
  if (a == null || a === "" || q.t === "open" || q.t === "prob") return 0;
  if (q.t === "mcq") return +a === k ? 1 : 0;
  if (q.t === "tf") return (a === true || a === "1" || a === 1) === k ? 1 : 0;
  if (q.t === "blank") return k.some(x => nz(x) === nz(a)) ? 1 : 0;
  if (q.t === "match") { const v = String(a).split(","); return k.reduce((s, x, i) => s + (+v[i] === x ? 1 : 0), 0) / k.length; }
  const v = parseFloat(String(a).replace(",", ".")); return isFinite(v) && Math.abs(v - k.v) <= Math.max(Math.abs(k.v) * .01, .011) ? 1 : 0;
}
export const nota = (s, t) => t ? Math.max(1, Math.round(10 * s / t)) : 0;
export const correct = (q, k) => q.t === "open" || q.t === "prob" ? String(k) : q.t === "mcq" ? q.o[k] : q.t === "tf" ? (k ? "Adevărat" : "Fals") : q.t === "blank" ? k[0] : q.t === "match" ? q.L.map((_, i) => `${i + 1}→${"ABCD"[k[i]]}`).join("  ") : String(+k.v.toFixed(2)).replace(".", ",");

/* ---- optimizări: analiză memorată și „câte întrebări permite lecția” ---- */
const memo = new Map(), hash = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 ^ t.charCodeAt(i)) >>> 0; return t.length + ":" + h; };
export function parseC(text) { const k = hash(text); let P = memo.get(k); if (!P) { P = parse(text); memo.set(k, P); if (memo.size > 60) memo.delete(memo.keys().next().value); } return P; }
const capMemo = new Map();
export function capacity(P, key = "") {
  if (key && capMemo.has(key)) return capMemo.get(key);
  const c = {}; for (const t of ["mcq", "tf", "blank", "num", "match", "open", "prob"]) { const g = generate(P, { n: 120, types: [t], level: 1, seed: 1 }); c[t] = t === "num" ? (P.probs.length ? 99 : 0) : g.total; }
  if (key) capMemo.set(key, c); return c;
}
export const statOf = P => ({ s: P.sents.length, d: P.defs.length, f: P.forms.length, p: Math.max(P.probs.length, P.sols.length) });
