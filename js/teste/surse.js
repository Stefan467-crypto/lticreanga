// Itemi pe SURSĂ (Istorie, Geografie, Educația pentru societate, Limba română, limbi străine…).
// Principiu de siguranță: SURSELE le alege site-ul, ca fragmente copiate din lecție (nu din memoria AI-ului), deci nu pot fi citate inventate.
// AI-ul scrie doar sarcinile și baremul; ce nu trece de verificare e înlocuit cu o sarcină locală. Modulul nu depinde de browser (se poate testa în Node).
const norm = s =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[„”“"'’()\[\];:!?…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export const nrmS = norm;

/* ---- stiluri de sursă pe materie: eticheta și natura materialului ---- */
export const STYLE = {
  Istoria: { kind: "sursa", lab: "Sursa", ask: "sursă istorică" },
  Geografie: { kind: "sursa", lab: "Sursa", ask: "sursă geografică (text, date)" },
  "Educația pentru societate": { kind: "sursa", lab: "Sursa", ask: "sursă / studiu de caz civic" },
  "Educația ecologică": { kind: "sursa", lab: "Sursa", ask: "sursă / studiu de caz ecologic" },
  "Dezvoltarea personală": { kind: "sursa", lab: "Situația", ask: "situație / studiu de caz" },
  "Limba română": { kind: "text", lab: "Textul", ask: "text la prima vedere" },
  "Literatura universală": { kind: "text", lab: "Textul", ask: "fragment literar" },
  "Limba engleză": { kind: "text", lab: "Text", ask: "reading text (write everything in English)" },
  "Limba franceză": { kind: "text", lab: "Texte", ask: "texte de lecture (tout en français)" },
};
export const styleOf = m => STYLE[m] || { kind: "sursa", lab: "Sursa", ask: "sursă" };
export const hasSrc = m => !!STYLE[m];

/* ---- alegerea fragmentelor-sursă din textul lecțiilor ---- */
const TASKLINE =
  /^(?:\d{1,2}[.)]|[a-hA-H][.)]|•|[-–])\s+|^(?:Activitate|Exerci[tț]ii?|Temă|Aplica[tț]ie|Sugestie|Experiment|Observă|Cercetează|Compară|Discută|Rezolvă|Completează|Scrie|Răspunde|Formulează|Explică|Argumentează|Calculează|Determină)(?![\p{L}])/iu;
const IMP =
    /(?:^|[.!?»”]\s+)(?:Identifică|Explică|Compară|Argumentează|Descrie|Numește|Selectează|Prezintă|Formulează|Scrie|Completează|Analizează|Caracterizează|Enumeră|Determină|Demonstrează|Exprimă|Alcătuiește|Elaborează|Realizează|Examinează|Studiază|Citește|Observă|Răspunde|Rezolvă|Calculează|Utilizează|Comentează|Justifică|Apreciază|Dedu|Propune|Stabilește|Menționează|Indică|Precizează|Discutați|Reflectați|Căutați|Comparați|Explicați|Identificați|Argumentați|Prezentați|Realizați|Utilizați|Formulați|Scrieți|Completați|Analizați|Determinați|Enumerați|Selectați|Demonstrați|Descrieți|Numiți|Alcătuiți|Elaborați|Răspundeți|Rezolvați|Calculați)(?![\p{L}])/u,
  CAPS = /(?<![\p{L}])\p{Lu}{4,}(?:\s+\p{Lu}{4,})+(?![\p{L}])/u; // cerințe din manual și titluri de casete („PORTRET ISTORIC”) nu pot fi surse
const DEP =
  /^(?:A fost|Au fost|Era|Erau|S-a|S-au|Și|Dar|Iar|El|Ea|Ei|Ele|Acesta|Aceasta|Aceștia|Acestea|Astfel|Deci|Apoi|Atunci|Totuși|Însă|De asemenea|Tot)(?![\p{L}])/u; // o sursă nu poate începe cu o propoziție care depinde de cea dinainte
const VERB =
  /(?<![\p{L}])(?:a|au|este|sunt|fost|era|erau|s-a|s-au|se|avea|aveau|poate|pot|fi|fiind|având|devenit|devine|nu|să|va|vor|ar|fi-)(?![\p{L}-])/iu; // fiecare propoziție dintr-o sursă trebuie să aibă un verb (nu legende de imagini / enumerări)
const SENT = /[^.!?]+(?:[.!?]+["”»]?|$)/g;
const splitS = p =>
  (
    p
      .replace(/\b(Fig|fig|nr|Nr|cca|etc|pag|str|vol|Dr|dr|Prof|prof|ex|Ex|sec|Sec|î\.e\.n|e\.n|d\.Hr|î\.Hr)\./g, m =>
        m.replace(/\./g, "§")
      )
      .match(SENT) || []
  )
    .map(s => s.replace(/§/g, ".").trim())
    .filter(s => s.length >= 25);
function candidates(text, tema, li, kmax = 4, lmax = 780) {
  const out = [],
    paras = [];
  let cur = "";
  const flush = () => {
    if (cur.length >= 90) paras.push(cur.trim());
    cur = "";
  };
  for (const raw of String(text).split("\n")) {
    // rândurile din PDF se lipesc într-un paragraf; titlurile scurte, sarcinile și rândurile goale îl închid
    const l = raw.trim();
    if (!l || l.startsWith("# ") || TASKLINE.test(l) || (l.length < 55 && !/[.!?"”]$/.test(l))) {
      flush();
      continue;
    }
    cur += (cur ? " " : "") + l;
  }
  flush();
  paras.forEach((p, pi) => {
    const S = splitS(p);
    if (S.length < 2) return;
    for (let a = 0; a < S.length; a++)
      for (let k = 2; k <= kmax && a + k <= S.length; k++) {
        const w = S.slice(a, a + k).join(" "),
          len = w.length;
        if (len < 180 || len > lmax) continue;
        if (
          DEP.test(S[a]) ||
          !S.slice(a, a + k).every(x => VERB.test(x)) ||
          /\?/.test(w) ||
          IMP.test(w) ||
          CAPS.test(w) ||
          /\b(?:fig\.|figura|tabelul|exercițiu|vezi pagina|activitate)\b/i.test(w)
        )
          continue;
        const years = new Set(w.match(/\b(?:1\d{3}|20\d{2})\b/g) || []).size,
          quotes = (w.match(/[„«]/g) || []).length,
          caps = (w.match(/(?<![.!?]\s)(?<!^)\b\p{Lu}\p{Ll}{3,}/gu) || []).length,
          you = /\b(?:ai|ți|vei|poți|vă|voi)\b/i.test(w);
        const sc =
          2 * Math.min(3, years) +
          3 * Math.min(1, quotes) +
          Math.min(4, caps) * 0.5 +
          (len > 280 ? 1 : 0) -
          (you ? 4 : 0);
        out.push({ text: w, tema, li, pi, a, k, sc });
      }
  });
  return out;
}
// n surse din lecțiile date (câte una per lecție, pe rând, apoi altele); fără suprapuneri; ordinea finală = ordinea din manual
export function pickSources(lessons, n, { long = false } = {}) {
  const per = lessons.map((l, li) =>
      candidates(l.text || "", l.tema || "", li, long ? 9 : 4, long ? 1500 : 780).sort((x, y) =>
        long ? y.text.length - x.text.length || y.sc - x.sc : y.sc - x.sc || x.a - y.a
      )
    ),
    chosen = [];
  const clash = c =>
    chosen.some(x => x.li === c.li && x.pi === c.pi && !(c.a >= x.a + x.k || x.a >= c.a + c.k)) ||
    chosen.some(x => norm(x.text).slice(0, 60) === norm(c.text).slice(0, 60));
  let guard = 0;
  while (chosen.length < n && guard++ < 400) {
    let added = false;
    for (let li = 0; li < per.length && chosen.length < n; li++) {
      const i = per[li].findIndex(c => !clash(c) && (!long || c.text.length >= 400 || per[li].length < 3));
      if (i < 0) continue;
      chosen.push(per[li].splice(i, 1)[0]);
      added = true;
    }
    if (!added) break;
  }
  return chosen.sort((a, b) => a.li - b.li || a.pi - b.pi || a.a - b.a).map(c => ({ text: c.text, tema: c.tema }));
}

/* ---- planul unui test pe surse, din modelul de examen: grupuri de itemi care folosesc aceleași surse ---- */
// slot = { k:["src"], p, g:"cheie", ns: nr. surse (la primul item al grupului), h:"indicație" }
export function planOf(slots) {
  // slots = [{k, p, sc, g?, ns?, h?, i}] doar cele cu k === "src"
  const G = new Map();
  for (const s of slots) {
    const g = s.g || "own" + s.i;
    if (!G.has(g)) G.set(g, { g, ns: 0, items: [] });
    const x = G.get(g);
    x.ns = Math.max(x.ns, s.ns ?? 1);
    /* ns: 0 = grup fără surse (eseu, articol) */ x.items.push({ i: s.i, p: s.p, h: s.h || "" });
  }
  return [...G.values()];
}

/* ---- ce cere AI-ul și cum se verifică ---- */
const BAD =
  /(?<!\p{L})(?:manual(?:ul|ului)?|lecți(?:a|ei|e)|pagin(?:a|ii)|figur(?:a|ii)|fig\.|exerci[tț]i(?:ul|ului)|activitatea)(?!\p{L})/iu;
const letter = i => "ABCDEFGH"[i] || String(i + 1);
export function labelOf(style, i, n) {
  return n === 1 && style.kind === "text" ? style.lab : `${style.lab} ${letter(i)}`;
}

export function validateGroup(plan, srcs, ai) {
  // ai = { itemi:[{enunt, barem}] } pentru grupul plan → [{ q, k }] sau null
  const it = Array.isArray(ai?.itemi) ? ai.itemi : [];
  if (it.length < plan.items.length) return null;
  const out = [];
  for (let n = 0; n < plan.items.length; n++) {
    const q = String(it[n]?.enunt ?? "")
        .trim()
        .slice(0, 700),
      k = String(it[n]?.barem ?? "")
        .trim()
        .slice(0, 1400);
    if (q.length < 20 || k.length < 15 || BAD.test(q)) return null;
    out.push({ q, k });
  }
  return out;
}

// sarcini de rezervă (fără AI): corecte ca formă, dar generale; baremul indică ce se verifică
const LOCAL = {
  sursa: [
    [
      "Identifică în sursă două informații despre {tema}.",
      "Se acceptă două informații corecte extrase din sursă. Câte 1 punct pentru fiecare informație identificată; restul punctajului pentru formulare clară.",
    ],
    [
      "Explică, în baza sursei, ideea principală referitoare la {tema}. Argumentează răspunsul.",
      "Ideea principală este formulată corect (cu trimitere la sursă), apoi argumentată cu o informație din sursă sau din lecție.",
    ],
    [
      "Formulează o concluzie referitoare la {tema}, în baza sursei. Argumentează răspunsul.",
      "Concluzie corectă și logic sprijinită pe sursă (partea 1); argument relevant (partea 2); limbaj adecvat (partea 3).",
    ],
    [
      "Determină o cauză și o consecință a faptului prezentat în sursă.",
      "Cauză corectă și consecință corectă, fiecare justificată pe scurt cu sursa sau cu lecția.",
    ],
    [
      "Apreciază importanța faptului prezentat în sursă. Formulează două argumente.",
      "Aprecierea este clară; fiecare argument este corect și susținut cu un fapt din sursă sau din lecție.",
    ],
  ],
  text: [
    [
      "Răspunde, în enunțuri complete, la două întrebări despre conținutul textului (cine, ce, unde).",
      "Câte un punct pentru fiecare răspuns corect, în enunț complet.",
    ],
    ["Rezumă, în 3–4 rânduri, conținutul textului.", "Idei esențiale corecte, ordine logică, exprimare personală."],
    [
      "Explică sensul unui cuvânt sau al unei expresii din text, folosind contextul.",
      "Sens corect, justificat prin context.",
    ],
    [
      "Exprimă-ți opinia despre ideea principală a textului. Formulează două argumente.",
      "Opinie clară; două argumente relevante; exprimare corectă.",
    ],
  ],
};
export function localItems(plan, style, tema) {
  const L = LOCAL[style.kind] || LOCAL.sursa;
  return plan.items.map((_, n) => {
    const [q, k] = L[n % L.length];
    return { q: q.replace("{tema}", tema ? `„${tema}”` : "tema studiată"), k };
  });
}

// Asamblează un item din test: sursele grupului se atașează fiecărui item (afișarea le arată o singură dată la grup)
export const attach = (style, srcs, g) =>
  srcs.map((s, i) => ({ l: labelOf(style, i, srcs.length), t: s.text })).map(x => ({ ...x, g }));

const usable = h => !!h && !/…|Baremul|\(scară/.test(h);
const ESSAY = [
  "Utilizează sursele și cunoștințele obținute anterior pentru a redacta, într-un text coerent, un eseu la tema {tema}. Formulează cel puțin trei argumente, cu trimitere la surse.",
  "Eseul este evaluat după criteriile: argumente relevante și corecte (cel puțin trei); relații de cauză-efect; folosirea surselor; plasarea în timp și spațiu; structura (introducere, cuprins, concluzie); limbaj adecvat. Punctajul se împarte proporțional pe criterii.",
];
// sarcină de rezervă (fără AI): indicația din model dacă e o sarcină gata formulată; eseu pentru itemii mari; altfel una generală
export function localTask(style, i, tema, slot = {}) {
  const T = tema ? `„${String(tema).replace(/ \(exemplu\)$/, "")}”` : "tema studiată",
    fill = x => x.replace("{tema}", T);
  if (slot.p >= 10 && style.kind === "sursa") {
    const bar = /Baremul[^:]*:\s*(.+)$/.exec(slot.h || "");
    return [fill(ESSAY[0]), bar ? "Criterii și punctaj: " + bar[1] : ESSAY[1]];
  }
  if (usable(slot.h))
    return [
      slot.h,
      `Răspuns corect, argumentat cu trimitere la ${style.kind === "text" ? "text" : "sursă"}; exprimare corectă. Punctaj maxim: ${slot.p} p. Baremul detaliat se completează de profesor (fără AI nu se poate scrie un răspuns-model).`,
    ];
  const L = LOCAL[style.kind] || LOCAL.sursa,
    [q, k] = L[i % L.length];
  return [fill(q), k];
}

// Împarte sursele alese pe grupuri: într-un grup nu se repetă aceeași sursă; între grupuri se reiau doar dacă lecția are prea puține fragmente.
// groups = [{ g, n }] → Map(g → [{ l, t, tema }])
export function assignSources(pool, groups, style) {
  const out = new Map();
  let pp = 0;
  for (const { g, n } of groups) {
    if (!n) {
      out.set(g, []);
      continue;
    }
    const used = new Set(),
      arr = [];
    for (let j = 0; j < n && pool.length; j++) {
      let s = null;
      for (let t = 0; t < pool.length; t++) {
        const c = pool[(pp + t) % pool.length];
        if (!used.has(c.text)) {
          s = c;
          pp += t + 1;
          break;
        }
      }
      if (!s) break;
      used.add(s.text);
      arr.push({ t: s.text, tema: s.tema });
    }
    out.set(
      g,
      arr.map((x, i) => ({ ...x, l: labelOf(style, i, arr.length) }))
    );
  }
  return out;
}
