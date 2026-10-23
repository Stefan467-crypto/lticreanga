import { $, esc, toast, whenRole, modal, can, saveBlob, db, collection, getDocs, getDoc, doc } from "../core/core.js";
import { SUBJECTS, CLASSES, canon } from "../core/config.js";
import { KIND, OPEN_KINDS, profile, models, total, screenOk } from "../teste/exam.js?v=28";
import { merge, parseC, withAi, generate, generateExam, grade, nota, correct, capacity, scale, rangeOf, wt } from "../teste/engine.js?v=28";
import { DEMO } from "../teste/demo.js?v=28";
import { aiOn, composeTest, composeSourceBlocks, composeSlides } from "../teste/ai.js?v=28";
import { THEMES, buildPptx, slug as pslug } from "../teste/pptx.js?v=28";
import { bankFor } from "../teste/formule.js?v=28";
import { auth } from "../core/firebase.js";
import { createBuilder } from "./constructor.js?v=28";
const TY = { mcq: "Grilă", tf: "Adevărat / Fals", blank: "Completare", num: "Problemă", match: "Asociere", open: "Răspuns scurt", prob: "Problemă cu rezolvare", src: "Item pe sursă" }, LV = ["Ușor", "Mediu", "Greu"], OL = "ABCDEFGH";
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), NC = (a, b) => String(a).localeCompare(String(b), "ro", { numeric: true });
const chap = l => l.capitol || "Fără capitol";
const noEx = s => String(s).replace(/ \(exemplu\)$/, "");
/* Titlul testului: tot capitolul → numele capitolului; una sau două teme → numele lor; câteva teme dintr-un capitol → capitolul + câte teme. */
const titleOf = ls => {
  const all = L.filter(l => l.materie === S.mat && l.clasa === S.cl && chap(l) === S.kp), names = ls.map(l => noEx(l.tema)), hasCh = S.kp && S.kp !== "Fără capitol";
  if (hasCh && ls.length > 1 && ls.length >= all.length) return noEx(S.kp);
  if (ls.length <= 2) return names.join(" + ");
  return hasCh ? `${noEx(S.kp)} (${ls.length} teme)` : names.slice(0, 2).join(" + ") + ` + încă ${ls.length - 2}`;
};
let L = [], S = { mat: "", cl: "", kp: "", ids: new Set(), n: 10, lv: 1, ty: new Set(["mcq", "tf", "blank", "num"]), mode: "train", nv: 2, md: "free", build: false, gen: "test", pn: 10, pt: "bordo", pq: true, pa: true, au: "" }, V = [], vi = 0, PX = null, P = null, meta = null, busy = false, TXT = {}, capTok = 0;
/* ---------- date: textul lecției se aduce doar când e nevoie ---------- */
const docOf = async l => l.text !== undefined ? { text: l.text, ai: l.ai } : (TXT[l.id] ??= (await getDoc(doc(db, "lectii_text", l.id))).data() || { text: "" });
const texts = ls => Promise.all(ls.map(async l => ({ ...l, ...(await docOf(l)) })));
const PL = l => { const P = withAi(parseC(l.text), l.ai); return { ...P, m: l.materie, probs: P.probs.concat(bankFor(l.materie, l.text, l.tema)) }; }; // + probleme-șablon pe materie (js/teste/formule.js), potrivite după conținutul lecției
/* ---------- setări memorate pe dispozitiv ---------- */
const saveS = () => { try { localStorage.tcfg2 = JSON.stringify({ mat: S.mat, cl: S.cl, kp: S.kp, ids: [...S.ids], n: S.n, lv: S.lv, ty: [...S.ty], mode: S.mode, nv: S.nv, md: S.md, build: S.build, gen: S.gen, pn: S.pn, pt: S.pt, pq: S.pq, pa: S.pa, au: S.au }); } catch (e) { } };
const loadS = () => { try { const c = JSON.parse(localStorage.tcfg2 || "null"); if (c) Object.assign(S, c, { ids: new Set(c.ids || []), ty: new Set((c.ty || []).filter(x => x !== "prob").length ? c.ty.filter(x => x !== "prob") : ["mcq", "tf", "blank", "num"]) }); } catch (e) { } };
const hist = () => { try { return JSON.parse(localStorage.tsig || "{}"); } catch (e) { return {}; } };
const chip = (a, on, t, cls = "") => `<button type="button" ${a} aria-selected="${on}" class="${cls}">${t}</button>`, sel = () => L.filter(l => S.ids.has(l.id));
const paper = () => S.mode === "paper" && can("resurse");
/* constructorul manual: același selector (materie → clasă → capitol → teme), exercițiile le scrie profesorul */
const BLD = createBuilder({
  meta: () => ({ materie: S.mat, clasa: S.cl, tema: "", cap: S.kp }), slug, hasLesson: () => !!sel().length,
  defTitle: () => { const ls = sel(); return ls.length ? titleOf(ls) : ""; },
  suggest: async (type, have) => { const ls = await texts(sel()); P = merge(ls.map(PL)); for (let t = 0; t < 10; t++) { const ng = generate(P, { n: 1, types: [type], level: S.lv }); if (ng.total && !have.has(ng.q[0].q)) return { q: ng.q[0], k: ng.k[0] }; } return null; },
});
const mdl = () => models(S.mat, S.cl).find(m => m.id === S.md) || null;
const fmt = n => String(+n.toFixed(1)).replace(".", ",");
/* ---------- configurare: materia → clasa → capitolul → temele ---------- */
const aiReady = () => aiOn() && !!auth.currentUser;
const sel1 = (f, arr, cur, lab = x => x) => `<select data-f="${f}">${arr.map(x => `<option value="${esc(x)}"${x === cur ? " selected" : ""}>${esc(lab(x))}</option>`).join("")}</select>`;
const howHtml = px => px ? `<summary>Cum fac o prezentare? (3 pași)</summary><ol><li><b>Alege lecția:</b> materia, clasa, capitolul și temele (poți alege mai multe).</li><li><b>Setează prezentarea:</b> numărul de diapozitive, culorile și ce include.</li><li><b>Apasă „Generează prezentarea”.</b> AI face planul din textul lecției; îl poți corecta, apoi descarci fișierul .pptx (se deschide în PowerPoint, Google Slides sau LibreOffice).</li></ol>` : `<summary>Cum fac un test? (3 pași)</summary><ol><li><b>Alege lecția:</b> materia, clasa, capitolul și tema. Dacă lecția lipsește, deschide <a href="lectii">Baza de lecții</a>.</li><li><b>Setează testul:</b> alege „Antrenament” (răspunzi pe ecran) sau „Test pe hârtie” (îl tipărești). Apoi alege dificultatea.</li><li><b>Apasă „Generează testul”.</b> La test pe hârtie poți descărca PDF-ul testului și baremul.</li></ol>`;
const pptxSettings = () => `<h3 class="h2n"><span class="num">2</span> Setează prezentarea</h3>
<p class="kick">Număr de diapozitive</p><div class="tabs">${[6, 8, 10, 12, 15].map(n => chip(`data-pn="${n}"`, n === S.pn, n)).join("")}</div>
<p class="kick">Culori</p><div class="tabs seg">${Object.entries(THEMES).map(([k, t]) => chip(`data-pt="${k}"`, k === S.pt, esc(t.nume))).join("")}</div>
<p class="kick">Include</p><div class="tabs">${chip('data-pq="1"', S.pq, "Întrebări de verificare")}${chip('data-pa="1"', S.pa, "Notițe pentru profesor")}</div>
<label class="f">Autor (apare pe primul diapozitiv, opțional)<input data-f="au" value="${esc(S.au)}" maxlength="60" placeholder="ex. Prof. Maria Popescu"></label>
<p class="capi">Prezentarea se creează numai din textul lecțiilor alese. Verifică conținutul înainte de a o folosi la oră.${aiReady() ? "" : " Autentifică-te ca să folosești AI; altfel se face o variantă simplă, direct din textul lecției."}</p>
<button class="btn" id="gop" type="button" style="width:100%;margin-top:1.1rem">✦ Generează prezentarea${aiReady() ? " cu AI" : ""}</button>`;
const drawCfg = () => {
  if (!L.length) { $("#cfg").innerHTML = '<p class="tag mid">Nu sunt lecții încă. Un profesor le adaugă în <a href="lectii">Baza de lecții</a>.</p>'; return; }
  const mats = SUBJECTS.filter(s => L.some(l => l.materie === s)); if (!mats.includes(S.mat)) S.mat = mats[0];
  const inM = L.filter(l => l.materie === S.mat), cls = CLASSES.filter(c => inM.some(l => l.clasa === c)); if (!cls.includes(S.cl)) S.cl = cls[0];
  const inC = inM.filter(l => l.clasa === S.cl), chs = [...new Set(inC.map(chap))].sort(NC); if (!chs.includes(S.kp)) S.kp = chs[0];
  const ts = inC.filter(l => chap(l) === S.kp).sort((a, b) => (a.pag ?? 1e9) - (b.pag ?? 1e9) || NC(a.tema, b.tema));
  S.ids = new Set([...S.ids].filter(id => ts.some(t => t.id === id))); if (!S.ids.size && ts[0]) S.ids.add(ts[0].id);
  const th = can("resurse"), pf = profile(S.mat), ms = models(S.mat, S.cl).filter(m => m.id === "eval" || paper() || screenOk(m)); if (S.md !== "free" && !ms.some(m => m.id === S.md)) S.md = "free";
  if (!th) S.gen = "test"; const px = th && S.gen === "pptx", bld = th && !px && S.build, md = mdl(), types = pf.all.filter(k => k !== "prob" && (!OPEN_KINDS.has(k) || paper() || k === "src")), all = ts.every(t => S.ids.has(t.id));
  const mdOpts = [{ id: "free", nume: "Liber" }, ...ms.map(m => ({ id: m.id, nume: m.nume }))];
  let H = (th ? `<div class="tabs seg gm">${chip('data-gen="test"', !px, "Teste")}${chip('data-gen="pptx"', px, "Prezentări")}</div>` : "") + (th && !px ? `<div class="tabs seg" style="margin-bottom:1.1rem">${chip('data-bmode="0"', !bld, "Generator automat")}${chip('data-bmode="1"', bld, "Constructor (manual)")}</div>` : "") + `<h3><span class="num">1</span> Alege lecția</h3>
<div class="fgrid"><label class="f">Materia${sel1("m", mats, S.mat)}</label><label class="f">Clasa${sel1("c", cls, S.cl, c => "Clasa " + c)}</label></div>
<label class="f">Capitolul${sel1("k", chs, S.kp)}</label>
<div class="thead"><span class="kick">Temele din capitol</span><button type="button" class="btn o s" data-all="1">${all ? "Doar prima" : "Tot capitolul"}</button></div>
<div class="tl">${ts.map(t => `<button type="button" class="tr" data-t="${t.id}" aria-pressed="${S.ids.has(t.id)}"><i></i><span>${esc(t.tema)}</span></button>`).join("")}</div>
<h3 class="h2n"><span class="num">2</span> Setează testul</h3>${th ? `<p class="kick">Pentru cine</p><div class="tabs seg">${chip('data-mode="train"', S.mode === "train", "Antrenament")}${chip('data-mode="paper"', S.mode === "paper", "Test pe hârtie")}</div>` : ""}
<label class="f">Modelul testului<select data-f="md">${mdOpts.map(m => `<option value="${esc(m.id)}"${m.id === S.md ? " selected" : ""}>${esc(m.nume)}</option>`).join("")}</select></label>
${md ? `<p class="capi">${md.parts.length} părți · ${md.parts.reduce((a, p) => a + p.it.length, 0)} itemi · ${total(md)} puncte${paper() ? ` · ${md.minute} minute` : ""}${paper() ? "" : ". În antrenament, itemii pe sursă se exersează cu autoevaluare după barem; restul se corectează automat."}${md.ofic ? ` · structură oficială (${esc(md.ref || "ANCE")})` : " · model orientativ: structura nu e preluată dintr-un test oficial"}</p>` : `<p class="kick">Număr de întrebări</p><div class="tabs">${[5, 10, 15, 20, 30].map(n => chip(`data-n="${n}"`, n === S.n, n)).join("")}</div><div id="tyw"><p class="kick">Tipuri de întrebări</p><div class="tabs">${types.map(k => chip(`data-ty="${k}"`, S.ty.has(k), KIND[k])).join("")}</div></div>`}
<p class="kick">Dificultate</p><div class="tabs seg">${LV.map((l, i) => chip(`data-lv="${i}"`, i === S.lv, l)).join("")}</div>
${paper() ? `<p class="kick">Variante diferite</p><div class="tabs">${[1, 2, 4, 6].map(n => chip(`data-nv="${n}"`, n === S.nv, n)).join("")}</div>` : ""}<p class="capi" id="cap"></p>
<button class="btn" id="go" type="button" style="width:100%;margin-top:1.1rem">✦ Generează testul${aiReady() ? " cu AI" : ""}</button>`;
  if ($("#hist")) $("#hist").hidden = px; if ($("#how")) $("#how").innerHTML = howHtml(px);
  if (px) { $("#cfg").innerHTML = H.slice(0, H.indexOf('<h3 class="h2n">')) + pptxSettings(); return; }
  if (bld) H = H.slice(0, H.indexOf('<h3 class="h2n">')) + `<h3 class="h2n"><span class="num">2</span> Construiește testul</h3><p class="capi">Alegi tipul exercițiului, îl scrii (sau pornești de la o propunere din lecție), iar la sfârșit descarci testul și baremul în PDF.</p><div id="bld"></div>`;
  $("#cfg").innerHTML = H; if (bld) { BLD.render($("#bld")); return; }
  updCap();
};
async function updCap() { // ce tipuri permite lecția aleasă (cele indisponibile dispar)
  const tok = ++capTok, el = $("#cap"), ls = sel(); if (!el || !ls.length) return;
  try {
    const T = await texts(ls); if (tok !== capTok) return; const c = capacity(merge(T.map(PL)), [...S.ids].sort().join("+") + ":" + T.map(l => l.text.length + "/" + (l.ai?.ts || 0)).join(","));
    const ai = aiReady(), bs = [...document.querySelectorAll("#cfg [data-ty]")];
    bs.forEach(b => { b.hidden = !ai && !(c[b.dataset.ty] > 0); });
    const vis = bs.filter(b => !b.hidden).map(b => b.dataset.ty);
    if (vis.length && !vis.some(t => S.ty.has(t))) { S.ty = new Set(vis.slice(0, 3)); saveS(); }
    bs.forEach(b => b.setAttribute("aria-selected", S.ty.has(b.dataset.ty)));
    if ($("#tyw")) $("#tyw").hidden = !vis.length;
    const tot = c.mcq + c.tf + c.blank + c.match + (c.num ? 20 : 0); document.querySelectorAll("#cfg [data-n]").forEach(b => b.classList.toggle("off", !ai && +b.dataset.n > tot));
    el.textContent = !ai && !mdl() && tot < S.n ? `Din lecția aleasă se pot forma cam ${tot} întrebări.` : "";
  } catch (e) { if (tok === capTok) el.textContent = ""; }
}
$("#cfg").onchange = e => {
  const t = e.target, f = t.dataset.f; if (!f) return; const v = t.value;
  if (f === "au") { S.au = v.trim().slice(0, 60); saveS(); return; }
  if (f === "m") { S.mat = v; S.cl = S.kp = ""; S.ids = new Set(); S.md = "free"; S.ty = new Set(profile(v).def); } if (f === "c") { S.cl = v; S.kp = ""; S.ids = new Set(); } if (f === "k") { S.kp = v; S.ids = new Set(); } if (f === "md") S.md = v;
  saveS(); drawCfg();
};
$("#cfg").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (b.id === "go") return make(); if (b.id === "gop") return makePptx();
  if (d.gen) { S.gen = d.gen; PX = null; $("#out").innerHTML = ""; saveS(); return drawCfg(); }
  if (d.pn) S.pn = +d.pn; if (d.pt) S.pt = d.pt; if (d.pq) S.pq = !S.pq; if (d.pa) S.pa = !S.pa;
  if (d.m) { S.mat = d.m; S.cl = S.kp = ""; S.ids = new Set(); S.md = "free"; S.ty = new Set(profile(d.m).def); } if (d.c) { S.cl = d.c; S.kp = ""; S.ids = new Set(); } if (d.k) { S.kp = d.k; S.ids = new Set(); }
  if (d.t) { S.ids.has(d.t) ? S.ids.size > 1 && S.ids.delete(d.t) : S.ids.add(d.t); }
  if (d.all) { const ts = L.filter(l => l.materie === S.mat && l.clasa === S.cl && chap(l) === S.kp); S.ids = ts.every(t => S.ids.has(t.id)) ? new Set([ts[0].id]) : new Set(ts.map(t => t.id)); }
  if (d.bmode !== undefined) { S.build = d.bmode === "1"; $("#out").innerHTML = ""; }
  if (d.n) S.n = +d.n; if (d.lv) S.lv = +d.lv; if (d.md) S.md = d.md; if (d.mode) { S.mode = d.mode; if (d.mode !== "paper") [...S.ty].forEach(k => OPEN_KINDS.has(k) && S.ty.delete(k)); } if (d.nv) S.nv = +d.nv;
  if (d.ty) S.ty.has(d.ty) ? S.ty.size > 1 && S.ty.delete(d.ty) : S.ty.add(d.ty);
  saveS(); drawCfg();
};
/* ---------- generare ---------- */
const RANK = { mcq: 0, tf: 1, match: 2, blank: 3, num: 4, open: 5, prob: 6, src: 7 }, FALL = ["mcq", "blank", "tf", "match", "open"];
const HEAD = { mcq: ["Grile", "Alege varianta corectă."], tf: ["Adevărat sau fals", "Stabilește dacă afirmația este adevărată sau falsă."], match: ["Asocieri", "Asociază fiecare noțiune cu explicația potrivită."], blank: ["Completări", "Completează spațiile libere."], num: ["Probleme de calcul", "Rezolvă și scrie rezultatul."], open: ["Răspunsuri scurte", "Răspunde cu propriile cuvinte."], prob: ["Probleme cu rezolvare", "Scrie rezolvarea completă."], src: ["Itemi pe sursă", "Studiază sursa și realizează sarcina."] };
const GL = ["q", "k", "src", "ok", "p", "sc"]; // la test liber, itemii pe sursă ajung la sfârșit, iar cei ai aceleiași surse rămân împreună (sortarea e stabilă)
function group(g) { // exerciții de același tip, unul lângă altul (în cadrul fiecărei părți)
  const o = g.q.map((_, i) => i).sort((a, b) => ((g.sc ? g.sc[a] - g.sc[b] : 0) || (RANK[g.q[a].t] ?? 9) - (RANK[g.q[b].t] ?? 9) || a - b));
  GL.forEach(f => { if (g[f]) g[f] = o.map(i => g[f][i]); }); return g;
}
async function make() {
  if (busy) return; const l0 = sel(); if (!l0.length) return toast("Alege o temă");
  busy = true; const go = $("#go"); go.disabled = true; go.textContent = aiReady() ? "AI creează testul…" : "Se pregătește…";
  try { const ls = await texts(l0); meta = { materie: S.mat, clasa: S.cl, tema: titleOf(ls), cap: S.kp }; await makeTest(ls); } catch (e) { toast(e.message || "Eroare"); }
  busy = false; const g2 = $("#go"); if (g2) { g2.disabled = false; g2.textContent = "✦ Generează testul" + (aiReady() ? " cu AI" : ""); }
}
const typesNow = () => { const pf = profile(S.mat); let ty = [...S.ty].filter(t => pf.all.includes(t) && t !== "prob" && (paper() || !OPEN_KINDS.has(t) || t === "src")); return ty.length ? ty : pf.def; };
async function aiBuild(ls, md, avoid, h) { // AI compune întrebările; structura (tipuri, părți, punctaj) vine din model sau din setări
  const slots = [], okK = x => paper() || !OPEN_KINDS.has(x) || x === "src";
  if (md) md.parts.forEach((part, pi) => part.it.forEach(sl => { const k = sl.k.find(okK); if (k) slots.push({ k, p: sl.p, sc: pi, g: sl.g, ns: sl.ns, h: sl.h, i: slots.length }); }));
  else { const ty = typesNow(); for (let i = 0; i < S.n; i++) slots.push({ k: ty[i % ty.length], p: wt(ty[i % ty.length]), sc: 0, i }); }
  const counts = {}; slots.forEach(x => { if (!["compose", "src", "crit"].includes(x.k)) counts[x.k] = (counts[x.k] || 0) + 1; });
  const chapter = ls.length > 1 && S.kp !== "Fără capitol" ? noEx(S.kp) : "", srcSlots = slots.filter(x => x.k === "src");
  const res = Object.keys(counts).length ? await composeTest(ls, counts, { materie: S.mat, clasa: S.cl, level: S.lv, avoid, chapter }) : { mcq: [], tf: [], blank: [], match: [], open: [], num: [], prob: [] };
  const SB = srcSlots.length ? await composeSourceBlocks(ls, srcSlots, { materie: S.mat, clasa: S.cl, level: S.lv, chapter }) : new Map();
  const g = { q: [], k: [], src: [], p: [], sc: [], sigs: [], total: 0, ai: true, srcAi: 0, srcLoc: 0 }; if (md) g.parts = md.parts.map(x => ({ t: x.t, d: x.d }));
  const used = new Set(), push = (x, s) => { g.q.push(x.q); g.k.push(x.k); g.src.push(x.src); g.p.push(s.p); g.sc.push(s.sc); };
  for (const s of slots) {
    if (s.k === "src") { const it = SB.get(s.i); if (it) { it.ai ? g.srcAi++ : g.srcLoc++; push(it, s); continue; } }
    if (s.k === "crit") { push({ q: { t: "open", q: "Pentru corectitudinea tuturor secvențelor scrise se acordă puncte după criteriile din barem (ortografie, punctuație, exprimare).", g: "crit" }, k: s.h || "Ortografie, punctuație, exprimare — după criteriile din barem.", src: "Criterii de redactare" }, s); continue; }
    let it = res[s.k]?.shift(); if (it) { push(it, s); continue; }
    if (s.k === "compose") { const r = generateExam(P, { parts: [{ t: "", d: "", it: [{ k: ["compose"], p: s.p }] }] }, { level: S.lv, tema: meta.tema }); if (r.q[0]) push({ q: r.q[0], k: r.k[0], src: r.src[0] }, s); continue; }
    const r = generate(P, { n: 1, types: [s.k], level: S.lv, hist: h, avoid: used }); if (r.total) { r.used.forEach(u => used.add(u)); push({ q: r.q[0], k: r.k[0], src: r.src[0] }, s); continue; } // lipsește de la AI → generatorul local
    const alt = FALL.find(k => res[k]?.length); if (alt) push(res[alt].shift(), s);
  }
  g.total = g.q.length; return g;
}
async function makeTest(ls) {
  P = merge(ls.map(PL)); const key = [...S.ids].sort().join("+"), H = hist(), h = new Set(H[key] || []), nv = paper() ? S.nv : 1, md = mdl(); V = []; vi = 0; let aiFail = "";
  for (let i = 0; i < nv; i++) {
    let g = null;
    if (aiReady()) { try { g = await aiBuild(ls, md, V.flatMap(x => x.q.map(q => q.q)), h); if (g.total < 2) { g = null; aiFail = "AI nu a găsit destul material în lecție."; } } catch (e) { aiFail = e.message; } }
    if (!g) { const ty = typesNow(); g = md ? generateExam(P, md, { level: S.lv, hist: h, noOpen: !paper(), tema: meta.tema }) : generate(P, { n: S.n, types: ty, level: S.lv, hist: h }); g.sigs.forEach(x => h.add(x)); }
    if (!md) g.p = g.q.map(q => wt(q.t)); // test liber: exercițiile mai grele valorează mai multe puncte
    if (md) g.md = md; V.push(group(g));
  }
  H[key] = [...h].slice(-600); try { localStorage.tsig = JSON.stringify(H); } catch (e) { }
  if (aiFail) toast(aiFail + " Am folosit generatorul local.");
  if (!V[0].total) { $("#out").innerHTML = ""; return toast("Lecția nu are destulă informație pentru tipurile alese"); }
  const want = md ? md.parts.reduce((a, p) => a + p.it.length, 0) : S.n; if (V[0].total < want && !aiFail) toast(`Lecția permite doar ${V[0].total} din ${want} întrebări`);
  drawTest(); $("#out").scrollIntoView({ behavior: "smooth" });
}
/* ---------- test ---------- */
const hintOf = q => q.t === "match" ? "Scrie litera potrivită la fiecare noțiune." : "";
const srcHtml = (q, pg) => q.s?.length && q.g !== pg ? `<div class="srcbox">${q.s.map(x => `<blockquote><b>${esc(x.l)}</b><p>${esc(x.t)}</p></blockquote>`).join("")}</div>` : "";
const qHtml = (q, i, k, ev, p, N, pg) => `<li class="qs" data-i="${i}"><div class="qh"><b>${i + 1}</b><span class="pill">${TY[q.t]}</span><span class="tag pts">${p} p.</span>${ev ? `<span class="qa">${N > 1 ? `<button type="button" class="ib sm" data-up="${i}" aria-label="Mută sus" ${i ? "" : "disabled"}>↑</button><button type="button" class="ib sm" data-dn="${i}" aria-label="Mută jos" ${i < N - 1 ? "" : "disabled"}>↓</button>` : ""}<button type="button" class="ib sm" data-ed="${i}" aria-label="Editează întrebarea" title="Editează">✎</button><button type="button" class="ib sm" data-re="${i}" aria-label="Schimbă întrebarea" title="Schimbă">↻</button><button type="button" class="ib sm" data-rm="${i}" aria-label="Șterge întrebarea" title="Șterge">×</button></span>` : ""}</div>
${srcHtml(q, pg)}<p class="qt">${q.t === "tf" ? "Adevărat sau fals? " : ""}${esc(q.q)}</p>${hintOf(q) ? `<p class="tag">${hintOf(q)}</p>` : ""}${q.t === "mcq" ? `<div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" ${ev ? "disabled" : ""}><span><b>${OL[j]}</b>${esc(o)}</span></label>`).join("")}</div>` : q.t === "tf" ? `<div class="opts two"><label class="opt"><input type="radio" name="q${i}" value="1" ${ev ? "disabled" : ""}><span>Adevărat</span></label><label class="opt"><input type="radio" name="q${i}" value="0" ${ev ? "disabled" : ""}><span>Fals</span></label></div>` : q.t === "match" ? `<div class="mt2">${q.L.map((t, j) => `<label class="mrow"><span>${j + 1}. ${esc(t)}</span><select data-mi="${i}" ${ev ? "disabled" : ""}><option value="">—</option>${q.R.map((_, r) => `<option value="${r}">${OL[r]}</option>`).join("")}</select></label>`).join("")}<ul class="mr">${q.R.map((r, j) => `<li><b>${OL[j]}</b> ${esc(r)}</li>`).join("")}</ul></div>` : q.t === "open" || q.t === "prob" ? `<textarea id="a${i}" class="ans" rows="${q.t === "prob" ? 4 : 2}" ${ev ? "disabled" : ""} placeholder="Răspunsul tău"></textarea>` : `<input id="a${i}" class="ans" ${ev ? "disabled" : ""} autocomplete="off" inputmode="${q.t === "num" ? "decimal" : "text"}" placeholder="${q.t === "num" ? "Răspunsul tău (număr)" : "Răspunsul tău"}">`}
${ev ? `<p class="key">${q.t === "open" || q.t === "prob" ? "Barem" : "Răspuns corect"}: <b>${esc(correct(q, k))}</b></p>` : ""}<div class="fb" hidden></div></li>`;
function drawTest() {
  const v = V[vi], ev = paper(), T = v.q.length, pts = v.q.reduce((a, _, i) => a + (v.p?.[i] || 1), 0);
  let body = ""; v.q.forEach((q, i) => { if (v.parts && (i === 0 || v.sc[i] !== v.sc[i - 1])) { const pt = v.parts[v.sc[i]]; body += `${i ? "</ol>" : ""}<div class="part"><h3>${esc(pt.t)}</h3><p class="tag">${esc(pt.d)}</p></div><ol class="qs-list" start="${i + 1}">`; } else if (!v.parts && (i === 0 || q.t !== v.q[i - 1].t)) { const hh = HEAD[q.t] || ["Întrebări", ""]; body += `${i ? "</ol>" : ""}<div class="part sub"><h3>${hh[0]}</h3><p class="tag">${hh[1]}</p></div><ol class="qs-list" start="${i + 1}">`; } body += qHtml(q, i, v.k[i], ev, v.p?.[i] || 1, T, v.q[i - 1]?.g); });
  const scl = `<div class="scw"><h3>Scara de notare</h3><div class="scx"><table class="sct"><tbody><tr><th scope="row">Punctaj</th>${scale(pts).map(r => `<td>${rangeOf(r)}</td>`).join("")}</tr><tr><th scope="row">Nota</th>${scale(pts).map(r => `<td><b>${r.n}</b></td>`).join("")}</tr></tbody></table></div></div>`;
  $("#out").innerHTML = `<div class="card tst"><div class="th"><div><span class="pill">${esc(meta.materie)} · cl. ${esc(meta.clasa)}</span><h2>${esc(meta.tema)}</h2><p class="tag">${T} întrebări · ${pts} puncte${v.md ? ` · ${esc(v.md.nume)}` : ""} · ${v.ai ? "✦ creat cu AI din textul lecției" : "creat din textul lecției"}</p>${ev && v.srcAi ? `<p class="tag warn">Baremele itemilor pe sursă sunt propuse de AI: verifică-le înainte de folosire.</p>` : ""}${ev && (v.srcLoc || v.q.some(x => x.loc)) ? `<p class="tag warn">Unele sarcini pe sursă sunt generale (AI nu a răspuns): completează baremul sau schimbă sarcina cu ✎.</p>` : ""}${ev && v.md && v.md.ofic === false ? `<p class="tag warn">Model orientativ: structura nu e preluată dintr-un test oficial ANCE.</p>` : ""}</div></div>
${ev && V.length > 1 ? `<div class="tabs">${V.map((_, i) => chip(`data-v="${i}"`, i === vi, "Varianta " + (i + 1))).join("")}</div>` : ""}
${ev ? "" : `<div class="pbar"><span id="pt">0 / ${T} răspunsuri</span><i><u id="pf"></u></i></div>`}
${body}</ol>${scl}<div id="res"></div>
<div class="row" style="margin-top:1.2rem">${ev ? `<button class="btn" id="pdf" type="button">⬇ Descarcă testul (PDF)</button><button class="btn o" id="key" type="button">⬇ Barem (PDF)</button><button class="btn o" id="addq" type="button">＋ Întrebare</button>` : `<button class="btn" id="chk" type="button">Verifică testul</button><button class="btn o" id="pdf" type="button">⬇ Descarcă PDF</button>`}<button class="btn o" id="again" type="button">Alt test nou</button></div></div>`;
}
const val = (i, q) => { if (q.t === "mcq" || q.t === "tf") return document.querySelector(`input[name=q${i}]:checked`)?.value ?? ""; if (q.t === "match") { const s = [...document.querySelectorAll(`select[data-mi="${i}"]`)].map(x => x.value); return s.some(x => x === "") ? "" : s.join(","); } return $(`#a${i}`)?.value.trim() ?? ""; };
const upd = () => { const f = $("#pf"); if (!f) return; const v = V[0]; let n = 0; v.q.forEach((q, i) => { if (val(i, q) !== "") n++; }); $("#pt").textContent = `${n} / ${v.q.length} răspunsuri`; f.style.width = 100 * n / v.q.length + "%"; };
$("#out").oninput = $("#out").onchange = upd;
function rec(x) { let h = []; try { h = JSON.parse(localStorage.thist || "[]"); } catch (e) { } h.unshift(x); try { localStorage.thist = JSON.stringify(h.slice(0, 12)); } catch (e) { } drawHist(); }
function drawHist() {
  let h = []; try { h = JSON.parse(localStorage.thist || "[]"); } catch (e) { } const el = $("#hist"); if (!el) return;
  el.innerHTML = h.length ? `<div class="card"><h3>Rezultatele tale recente</h3><ul class="list">${h.map(x => `<li><span><b>${esc(x.t)}</b><br><span class="tag">${esc(x.m)} · ${new Date(x.d).toLocaleDateString("ro-RO")} · ${typeof x.s === "number" ? fmt(x.s) : x.s}/${x.tot}</span></span><b class="nt n${x.n >= 9 ? 3 : x.n >= 6 ? 2 : 1}">${x.n}</b></li>`).join("")}</ul><button class="btn o s" id="clh" type="button" style="margin-top:.8rem">Șterge istoricul</button></div>` : "";
}
function check() {
  const v = V[0]; let s = 0, t = 0; const bad = [];
  v.q.forEach((q, i) => {
    const w = v.p?.[i] || 1, li = document.querySelector(`.qs[data-i="${i}"]`), self = q.t === "open" || q.t === "prob";
    li.querySelectorAll("input,textarea,select").forEach(x => x.disabled = true); const f = li.querySelector(".fb"); f.hidden = false;
    if (self) { li.classList.add("self"); f.innerHTML = `Autoevaluare — compară cu baremul și acordă-ți punctele (max. ${w} p.):<pre class="barem">${esc(correct(q, v.k[i]))}</pre>`; return; } // itemii cu răspuns dezvoltat nu se notează automat
    const g = grade(q, v.k[i], val(i, q)); s += g * w; t += w; if (g < 1) bad.push(i); li.classList.add(g === 1 ? "ok" : "bad");
    f.innerHTML = `${g === 1 ? "✓ Corect" : g > 0 ? `◐ Parțial · răspuns corect: <b>${esc(correct(q, v.k[i]))}</b>` : `✗ Răspuns corect: <b>${esc(correct(q, v.k[i]))}</b>`}<small>Sursa din lecție: „${esc(v.src[i])}”</small>`;
  });
  if (!t) { $("#res").innerHTML = `<div class="score"><div><h3>Test cu autoevaluare</h3><p>Itemii pe sursă nu se notează automat. Compară fiecare răspuns cu baremul și acordă-ți punctele după criterii.</p></div></div>`; $("#chk").hidden = true; return $("#res").scrollIntoView({ behavior: "smooth", block: "center" }); }
  const p = Math.round(100 * s / t); v.wrong = bad; rec({ t: meta.tema, m: meta.materie, s, tot: t, n: nota(s, t), d: Date.now() });
  $("#res").innerHTML = `<div class="score"><div class="ring" style="--p:${p}"><b>${fmt(s)}/${t}</b></div><div><h3>Nota ${nota(s, t)}</h3><p>${p >= 85 ? "Excelent! Ești foarte bine pregătit." : p >= 60 ? "Bine! Mai repetă câteva noțiuni și încearcă un test nou." : "Mai citește lecția și încearcă din nou — fiecare test e diferit."}</p>${bad.length ? `<button class="btn s" id="redo" type="button">Repetă greșelile (${bad.length})</button>` : ""}</div></div>`;
  $("#chk").hidden = true; $("#res").scrollIntoView({ behavior: "smooth", block: "center" });
}
const SL = ["q", "k", "src", "ok"], swap = (v, a, b) => SL.forEach(x => { if (v[x]) [v[x][a], v[x][b]] = [v[x][b], v[x][a]]; });
function editQ(i) {
  const v = V[vi], q = v.q[i], k = v.k[i], t = q.t;
  const F = t === "mcq" ? `${q.o.map((o, j) => `<label>Varianta ${OL[j]}<input name="o${j}" value="${esc(o)}"></label>`).join("")}<label>Răspunsul corect<select name="k">${OL.slice(0, q.o.length).split("").map((l, j) => `<option value="${j}"${j === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>` : t === "tf" ? `<label>Răspunsul corect<select name="k"><option value="1"${k ? " selected" : ""}>Adevărat</option><option value="0"${k ? "" : " selected"}>Fals</option></select></label>` : t === "blank" ? `<label>Răspunsuri acceptate (separate prin virgulă)<input name="k" value="${esc(k.join(", "))}"></label>` : t === "num" ? `<label>Rezultatul (număr)<input name="k" inputmode="decimal" value="${k.v}"></label>` : t === "match" ? `<label>Răspunsul corect (litere în ordine, ex. B,A,D,C)<input name="k" value="${esc(k.map(x => OL[x]).join(","))}"></label>` : `<label>Răspuns-model (barem)<textarea name="k" rows="3">${esc(k)}</textarea></label>`;
  const SRCF = q.s ? q.s.map((x, j) => `<label>${esc(x.l)} (sursa grupului — se schimbă la toți itemii grupului)<textarea name="s${j}" rows="5">${esc(x.t)}</textarea></label>`).join("") : "";
  modal("Editează întrebarea", `<label>Enunț<textarea name="q" rows="3" required>${esc(q.q)}</textarea></label>${SRCF}${F}`, async f => {
    const E = f.elements, nq = { ...q, q: E.q.value.trim() };
    if (q.s) { nq.s = q.s.map((x, j) => ({ ...x, t: E["s" + j].value.trim() || x.t })); v.q.forEach((x, j) => { if (j !== i && x.s && x.g === q.g) v.q[j] = { ...x, s: nq.s }; }); }
    if (t === "mcq") { nq.o = q.o.map((_, j) => E["o" + j].value.trim()); if (nq.o.some(x => !x)) throw new Error("Completează toate variantele"); v.k[i] = +E.k.value; }
    else if (t === "tf") v.k[i] = E.k.value === "1"; else if (t === "blank") { const a = E.k.value.split(",").map(x => x.trim()).filter(Boolean); if (!a.length) throw new Error("Scrie răspunsul"); v.k[i] = a; }
    else if (t === "num") { const n = parseFloat(E.k.value.replace(",", ".")); if (!isFinite(n)) throw new Error("Rezultatul trebuie să fie un număr"); v.k[i] = { v: n }; }
    else if (t === "match") { const a = E.k.value.split(",").map(x => OL.indexOf(x.trim().toUpperCase())); if (a.length !== q.L.length || a.some(x => x < 0)) throw new Error("Scrie câte o literă pentru fiecare noțiune"); v.k[i] = a; } else v.k[i] = E.k.value.trim();
    v.q[i] = nq; if (v.ok) v.ok[i] = true; drawTest();
  });
}
$("#out").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (PX && S.gen === "pptx") return pxClick(b);
  if (b.id === "chk") return check(); if (b.id === "again") return make();
  if (b.id === "pdf" || b.id === "key") return askPdf(b.id); if (d.v) { vi = +d.v; return drawTest(); }
  if (b.id === "redo") { const v = V[0], w = v.wrong; V = [{ q: w.map(i => v.q[i]), k: w.map(i => v.k[i]), src: w.map(i => v.src[i]), total: w.length }]; vi = 0; meta = { ...meta, tema: meta.tema.replace(/ \(greșeli\)$/, "") + " (greșeli)" }; drawTest(); return $("#out").scrollIntoView({ behavior: "smooth" }); }
  const v = V[vi];
  if (d.up !== undefined) { swap(v, +d.up, +d.up - 1); return drawTest(); } if (d.dn !== undefined) { swap(v, +d.dn, +d.dn + 1); return drawTest(); }
  if (d.ed !== undefined) return editQ(+d.ed);
  if (d.rm !== undefined) { const i = +d.rm; [...SL, "p", "sc"].forEach(a => v[a]?.splice(i, 1)); return drawTest(); }
  const more = type => { let ng, t = 0; do ng = generate(P, { n: 1, types: type, level: S.lv }); while ((!ng.total || v.q.some(x => x.q === ng.q[0].q)) && t++ < 8); return ng.total ? ng : null; };
  if (d.re !== undefined) { const i = +d.re, ng = more([v.q[i].t]); if (!ng) return toast("Nu am altă întrebare de acest tip"); v.q[i] = ng.q[0]; v.k[i] = ng.k[0]; v.src[i] = ng.src[0]; return drawTest(); }
  if (b.id === "addq") { const ng = more([...(mdl() ? ["mcq", "blank", "tf", "num", "match"] : S.ty)]); if (!ng) return toast("Nu am altă întrebare"); v.q.push(ng.q[0]); v.k.push(ng.k[0]); v.src.push(ng.src[0]); v.p ??= []; v.p.push(wt(ng.q[0].t)); if (v.sc) v.sc.push(v.sc.at(-1) ?? 0); return drawTest(); }
};
$("#hist").onclick = e => { if (e.target.id === "clh") { localStorage.removeItem("thist"); drawHist(); } };
/* ---------- PDF ---------- */
const askPdf = id => modal(id === "key" ? "Descarcă baremul (PDF)" : "Descarcă testul (PDF)", `<label>Titlul<input name="t" required value="${esc((V[0].md ? V[0].md.nume + " · " : "Test · ") + meta.tema)}"></label>${id === "key" ? "" : `<div class="grid"><label>Timp de lucru (minute, 0 = nu se afișează)<input name="m" type="number" min="0" max="240" value="${V[0].md ? V[0].md.minute : 45}"></label><label>Mărimea textului<select name="s"><option value="0">Normală</option><option value="1">Mare (pentru clasele mici)</option></select></label></div>`}<p class="tag">${V.length > 1 ? `Fișierul conține toate cele ${V.length} variante, fiecare pe pagini separate.` : "Fișierul este gata de tipărit (format A4)."}</p>`, async f => {
  toast("Se creează PDF-ul…"); const E = f.elements, P2 = await import("../teste/pdf.js"), titlu = E.t.value.trim() || "Test";
  const pages = id === "key" ? P2.keyPages(meta, V, { titlu }) : P2.testPages(meta, V, { titlu, minute: +(E.m?.value) || 0, big: E.s?.value === "1" });
  P2.save(await P2.toPdf(pages), `${id === "key" ? "barem" : "test"}-${slug(meta.tema)}.pdf`); toast("PDF descărcat");
}, "Descarcă PDF");
/* ---------- prezentări (.pptx): doar profesori și administratori ---------- */
const TIPS = { obiective: "Obiective", continut: "Conținut", definitii: "Noțiuni", rezumat: "Rezumat", intrebari: "Întrebări" };
function localSlides(ls, { n, quiz }) { // varianta fără AI: noțiunile și propozițiile principale din textul lecției
  const Ps = ls.map(PL), body = [];
  Ps.forEach((P, i) => {
    const nm = noEx(ls[i].tema), sents = P.sents.filter(x => x.length >= 30 && x.length <= 200);
    if (P.defs.length) body.push({ tip: "definitii", titlu: `${nm}: noțiuni`, puncte: [], termeni: P.defs.slice(0, 4).map(d => ({ termen: d.term, definitie: d.def.slice(0, 240) })), notite: "" });
    for (let k = 0; k < Math.min(sents.length, 8); k += 4) body.push({ tip: "continut", titlu: k ? `${nm} (continuare)` : nm, puncte: sents.slice(k, k + 4), termeni: [], notite: "" });
  });
  const defs = Ps.flatMap(P => P.defs), q = quiz && defs.length ? { tip: "intrebari", titlu: "Întrebări de verificare", puncte: defs.slice(0, 5).map(d => `Ce înseamnă „${d.term}”?`), termeni: [], notite: "" } : null;
  const first = { tip: "obiective", titlu: "Ce vom învăța", puncte: ls.map(l => noEx(l.tema)).slice(0, 5), termeni: [], notite: "" };
  return { titlu: "", slides: [first, ...body.slice(0, Math.max(0, n - 2 - (q ? 1 : 0))), ...(q ? [q] : [])], ai: false };
}
async function makePptx() {
  if (busy) return; if (!can("resurse")) return toast("Prezentările pot fi create doar de profesori și administratori"); const l0 = sel(); if (!l0.length) return toast("Alege o temă");
  busy = true; const go = $("#gop"); go.disabled = true; go.textContent = aiReady() ? "AI creează prezentarea…" : "Se pregătește…";
  try {
    const ls = await texts(l0), tema = titleOf(ls), chapter = ls.length > 1 && S.kp !== "Fără capitol" ? noEx(S.kp) : ""; let deck = null, fail = "";
    if (aiReady()) { try { deck = await composeSlides(ls, { materie: S.mat, clasa: S.cl, n: S.pn, quiz: S.pq, notes: S.pa, chapter }); } catch (e) { fail = e.message; } }
    if (!deck) { deck = localSlides(ls, { n: S.pn, quiz: S.pq }); if (fail) toast(fail + " Am făcut o variantă simplă din text."); }
    if (deck.slides.length < 2) throw new Error("Lecția nu are destulă informație pentru o prezentare");
    deck.titlu = deck.titlu || tema; PX = { deck, meta: { materie: S.mat, clasa: S.cl, tema } }; drawDeck(); $("#out").scrollIntoView({ behavior: "smooth" });
  } catch (e) { toast(e.message || "Eroare"); }
  busy = false; const g2 = $("#gop"); if (g2) { g2.disabled = false; g2.textContent = "✦ Generează prezentarea" + (aiReady() ? " cu AI" : ""); }
}
function drawDeck() {
  const { deck, meta } = PX, N = deck.slides.length;
  $("#out").innerHTML = `<div class="card tst"><div class="th"><div><span class="pill">${esc(meta.materie)} · cl. ${esc(meta.clasa)}</span><h2>${esc(deck.titlu)}</h2><p class="tag">${N + 1} diapozitive · ${deck.ai ? "✦ creat cu AI din textul lecției" : "variantă simplă, din textul lecției"}</p>${deck.ai ? '<p class="tag warn">Verifică conținutul înainte de a-l folosi la oră. Poți edita (✎), muta sau șterge orice diapozitiv.</p>' : ""}</div></div>
<ol class="qs-list pxl"><li class="qs"><div class="qh"><b>1</b><span class="pill">Titlu</span></div><p class="qt">${esc(deck.titlu)}</p></li>${deck.slides.map((s, i) => `<li class="qs"><div class="qh"><b>${i + 2}</b><span class="pill">${TIPS[s.tip] || "Conținut"}</span><span class="qa">${N > 1 ? `<button type="button" class="ib sm" data-pup="${i}" aria-label="Mută sus" ${i ? "" : "disabled"}>↑</button><button type="button" class="ib sm" data-pdn="${i}" aria-label="Mută jos" ${i < N - 1 ? "" : "disabled"}>↓</button>` : ""}<button type="button" class="ib sm" data-ped="${i}" aria-label="Editează" title="Editează">✎</button><button type="button" class="ib sm" data-prm="${i}" aria-label="Șterge" title="Șterge">×</button></span></div><p class="qt">${esc(s.titlu)}</p><ul class="pxu">${s.tip === "definitii" ? s.termeni.map(t => `<li><b>${esc(t.termen)}</b> — ${esc(t.definitie)}</li>`).join("") : s.puncte.map(p => `<li>${esc(p)}</li>`).join("")}</ul>${s.notite ? `<p class="tag">Notițe: ${esc(s.notite)}</p>` : ""}</li>`).join("")}</ol>
<div class="row" style="margin-top:1.2rem"><button class="btn" id="dpx" type="button">⬇ Descarcă prezentarea (.pptx)</button><button class="btn o" id="againpx" type="button">Alta nouă</button></div></div>`;
}
function editSlide(i) {
  const s = PX.deck.slides[i], defs = s.tip === "definitii";
  modal("Editează diapozitivul", `<label>Titlul<input name="t" required value="${esc(s.titlu)}"></label><label>${defs ? "Noțiunile (câte una pe rând, în forma Termen: definiție)" : "Punctele (câte unul pe rând)"}<textarea name="p" rows="7">${esc(defs ? s.termeni.map(t => t.termen + ": " + t.definitie).join("\n") : s.puncte.join("\n"))}</textarea></label><label>Notițe pentru profesor<textarea name="n" rows="3">${esc(s.notite)}</textarea></label>`, async f => {
    const E = f.elements, lines = E.p.value.split("\n").map(x => x.trim()).filter(Boolean); if (!lines.length) throw new Error("Scrie cel puțin un rând");
    if (defs) { const t = lines.map(l => { const k = l.indexOf(":"); return k > 0 ? { termen: l.slice(0, k).trim(), definitie: l.slice(k + 1).trim() } : null; }).filter(x => x && x.termen && x.definitie).slice(0, 4); if (!t.length) throw new Error("Scrie noțiunile în forma „Termen: definiție”"); s.termeni = t; } else s.puncte = lines.slice(0, 6);
    s.titlu = E.t.value.trim() || s.titlu; s.notite = E.n.value.trim().slice(0, 500); drawDeck();
  });
}
async function pxClick(b) {
  const d = b.dataset, a = PX.deck.slides;
  if (b.id === "againpx") return makePptx();
  if (b.id === "dpx") { b.disabled = true; toast("Se creează prezentarea…"); try { saveBlob(await buildPptx(PX.deck, { ...PX.meta, theme: S.pt, autor: S.au }), `prezentare-${pslug(PX.deck.titlu)}.pptx`); toast("Prezentarea a fost descărcată"); } catch (e) { toast(e.message || "Nu am putut crea prezentarea"); } b.disabled = false; return; }
  if (d.pup !== undefined) { const i = +d.pup; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return drawDeck(); }
  if (d.pdn !== undefined) { const i = +d.pdn; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return drawDeck(); }
  if (d.ped !== undefined) return editSlide(+d.ped);
  if (d.prm !== undefined) { if (a.length <= 2) return toast("Prezentarea trebuie să aibă cel puțin două diapozitive"); a.splice(+d.prm, 1); return drawDeck(); }
}
/* ---------- pornire ---------- */
const load = async () => {
  try { L = (await getDocs(collection(db, "lectii"))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { L = []; }
  if (!L.length) L = DEMO.map(x => ({ ...x })); L = L.map(x => ({ ...x, materie: canon(x.materie) }));
  loadS(); const u = new URLSearchParams(location.search), l = u.get("l"), f = L.find(x => x.id === l);
  if (f) { S.mat = f.materie; S.cl = f.clasa; S.kp = chap(f); S.ids = new Set([f.id]); }
  else if (u.get("m") && u.get("k")) { const ts = L.filter(x => x.materie === u.get("m") && x.clasa === u.get("c") && chap(x) === u.get("k")); if (ts.length) { S.mat = u.get("m"); S.cl = u.get("c"); S.kp = u.get("k"); S.ids = new Set(ts.map(t => t.id)); } }
  drawCfg(); drawHist();
};
whenRole(() => { load(); });
