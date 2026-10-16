import { $, esc, toast, whenRole, modal, can, db, collection, getDocs, getDoc, doc } from "../core/core.js";
import { SUBJECTS, CLASSES, canon } from "../core/config.js";
import { KIND, OPEN_KINDS, profile, models, total } from "../teste/exam.js";
import { merge, parseC, withAi, generate, generateExam, grade, nota, correct, capacity } from "../teste/engine.js";
import { DEMO } from "../teste/demo.js";
import { aiOn, composeTest } from "../teste/ai.js";
import { auth } from "../core/firebase.js";
const TY = { mcq: "Grilă", tf: "Adevărat / Fals", blank: "Completare", num: "Problemă", match: "Asociere", open: "Răspuns scurt", prob: "Problemă cu rezolvare" }, LV = ["Ușor", "Mediu", "Greu"], OL = "ABCD";
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
let L = [], S = { mat: "", cl: "", kp: "", ids: new Set(), n: 10, lv: 1, ty: new Set(["mcq", "tf", "blank", "num"]), mode: "train", nv: 2, md: "free" }, V = [], vi = 0, P = null, meta = null, busy = false, TXT = {}, capTok = 0;
/* ---------- date: textul lecției se aduce doar când e nevoie ---------- */
const docOf = async l => l.text !== undefined ? { text: l.text, ai: l.ai } : (TXT[l.id] ??= (await getDoc(doc(db, "lectii_text", l.id))).data() || { text: "" });
const texts = ls => Promise.all(ls.map(async l => ({ ...l, ...(await docOf(l)) })));
const PL = l => withAi(parseC(l.text), l.ai);
/* ---------- setări memorate pe dispozitiv ---------- */
const saveS = () => { try { localStorage.tcfg2 = JSON.stringify({ mat: S.mat, cl: S.cl, kp: S.kp, ids: [...S.ids], n: S.n, lv: S.lv, ty: [...S.ty], mode: S.mode, nv: S.nv, md: S.md }); } catch (e) { } };
const loadS = () => { try { const c = JSON.parse(localStorage.tcfg2 || "null"); if (c) Object.assign(S, c, { ids: new Set(c.ids || []), ty: new Set((c.ty || []).filter(x => x !== "prob").length ? c.ty.filter(x => x !== "prob") : ["mcq", "tf", "blank", "num"]) }); } catch (e) { } };
const hist = () => { try { return JSON.parse(localStorage.tsig || "{}"); } catch (e) { return {}; } };
const chip = (a, on, t, cls = "") => `<button type="button" ${a} aria-selected="${on}" class="${cls}">${t}</button>`, sel = () => L.filter(l => S.ids.has(l.id));
const paper = () => S.mode === "paper" && can("resurse");
const mdl = () => models(S.mat, S.cl).find(m => m.id === S.md) || null;
const fmt = n => String(+n.toFixed(1)).replace(".", ",");
/* ---------- configurare: materia → clasa → capitolul → temele ---------- */
const aiReady = () => aiOn() && !!auth.currentUser;
const sel1 = (f, arr, cur, lab = x => x) => `<select data-f="${f}">${arr.map(x => `<option value="${esc(x)}"${x === cur ? " selected" : ""}>${esc(lab(x))}</option>`).join("")}</select>`;
const drawCfg = () => {
  if (!L.length) { $("#cfg").innerHTML = '<p class="tag mid">Nu sunt lecții încă. Un profesor le adaugă în <a href="lectii">Baza de lecții</a>.</p>'; return; }
  const mats = SUBJECTS.filter(s => L.some(l => l.materie === s)); if (!mats.includes(S.mat)) S.mat = mats[0];
  const inM = L.filter(l => l.materie === S.mat), cls = CLASSES.filter(c => inM.some(l => l.clasa === c)); if (!cls.includes(S.cl)) S.cl = cls[0];
  const inC = inM.filter(l => l.clasa === S.cl), chs = [...new Set(inC.map(chap))].sort(NC); if (!chs.includes(S.kp)) S.kp = chs[0];
  const ts = inC.filter(l => chap(l) === S.kp).sort((a, b) => (a.pag ?? 1e9) - (b.pag ?? 1e9) || NC(a.tema, b.tema));
  S.ids = new Set([...S.ids].filter(id => ts.some(t => t.id === id))); if (!S.ids.size && ts[0]) S.ids.add(ts[0].id);
  const th = can("resurse"), pf = profile(S.mat), ms = models(S.mat, S.cl); if (S.md !== "free" && !ms.some(m => m.id === S.md)) S.md = "free";
  const md = mdl(), types = pf.all.filter(k => k !== "prob" && (!OPEN_KINDS.has(k) || paper())), all = ts.every(t => S.ids.has(t.id));
  const mdOpts = [{ id: "free", nume: "Liber" }, ...ms.map(m => ({ id: m.id, nume: m.nume }))];
  $("#cfg").innerHTML = `<h3><span class="num">1</span> Alege lecția</h3>
<div class="fgrid"><label class="f">Materia${sel1("m", mats, S.mat)}</label><label class="f">Clasa${sel1("c", cls, S.cl, c => "Clasa " + c)}</label></div>
<label class="f">Capitolul${sel1("k", chs, S.kp)}</label>
<div class="thead"><span class="kick">Temele din capitol</span><button type="button" class="btn o s" data-all="1">${all ? "Doar prima" : "Tot capitolul"}</button></div>
<div class="tl">${ts.map(t => `<button type="button" class="tr" data-t="${t.id}" aria-pressed="${S.ids.has(t.id)}"><i></i><span>${esc(t.tema)}</span></button>`).join("")}</div>
<h3 class="h2n"><span class="num">2</span> Setează testul</h3>${th ? `<p class="kick">Pentru cine</p><div class="tabs seg">${chip('data-mode="train"', S.mode === "train", "Antrenament")}${chip('data-mode="paper"', S.mode === "paper", "Test pe hârtie")}</div>` : ""}
<label class="f">Modelul testului<select data-f="md">${mdOpts.map(m => `<option value="${esc(m.id)}"${m.id === S.md ? " selected" : ""}>${esc(m.nume)}</option>`).join("")}</select></label>
${md ? `<p class="capi">${md.parts.length} părți · ${md.parts.reduce((a, p) => a + p.it.length, 0)} itemi · ${total(md)} puncte${paper() ? ` · ${md.minute} minute` : ""}${paper() ? "" : ". În antrenament apar doar itemii care se corectează automat."}</p>` : `<p class="kick">Număr de întrebări</p><div class="tabs">${[5, 10, 15, 20, 30].map(n => chip(`data-n="${n}"`, n === S.n, n)).join("")}</div><div id="tyw"><p class="kick">Tipuri de întrebări</p><div class="tabs">${types.map(k => chip(`data-ty="${k}"`, S.ty.has(k), KIND[k])).join("")}</div></div>`}
<p class="kick">Dificultate</p><div class="tabs seg">${LV.map((l, i) => chip(`data-lv="${i}"`, i === S.lv, l)).join("")}</div>
${paper() ? `<p class="kick">Variante diferite</p><div class="tabs">${[1, 2, 4, 6].map(n => chip(`data-nv="${n}"`, n === S.nv, n)).join("")}</div>` : ""}<p class="capi" id="cap"></p>
<button class="btn" id="go" type="button" style="width:100%;margin-top:1.1rem">✦ Generează testul${aiReady() ? " cu AI" : ""}</button>`;
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
  if (f === "m") { S.mat = v; S.cl = S.kp = ""; S.ids = new Set(); S.md = "free"; S.ty = new Set(profile(v).def); } if (f === "c") { S.cl = v; S.kp = ""; S.ids = new Set(); } if (f === "k") { S.kp = v; S.ids = new Set(); } if (f === "md") S.md = v;
  saveS(); drawCfg();
};
$("#cfg").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (b.id === "go") return make();
  if (d.m) { S.mat = d.m; S.cl = S.kp = ""; S.ids = new Set(); S.md = "free"; S.ty = new Set(profile(d.m).def); } if (d.c) { S.cl = d.c; S.kp = ""; S.ids = new Set(); } if (d.k) { S.kp = d.k; S.ids = new Set(); }
  if (d.t) { S.ids.has(d.t) ? S.ids.size > 1 && S.ids.delete(d.t) : S.ids.add(d.t); }
  if (d.all) { const ts = L.filter(l => l.materie === S.mat && l.clasa === S.cl && chap(l) === S.kp); S.ids = ts.every(t => S.ids.has(t.id)) ? new Set([ts[0].id]) : new Set(ts.map(t => t.id)); }
  if (d.n) S.n = +d.n; if (d.lv) S.lv = +d.lv; if (d.md) S.md = d.md; if (d.mode) { S.mode = d.mode; if (d.mode !== "paper") [...S.ty].forEach(k => OPEN_KINDS.has(k) && S.ty.delete(k)); } if (d.nv) S.nv = +d.nv;
  if (d.ty) S.ty.has(d.ty) ? S.ty.size > 1 && S.ty.delete(d.ty) : S.ty.add(d.ty);
  saveS(); drawCfg();
};
/* ---------- generare ---------- */
const RANK = { mcq: 0, tf: 1, match: 2, blank: 3, num: 4, open: 5, prob: 6 }, FALL = ["mcq", "blank", "tf", "match", "open"];
const HEAD = { mcq: ["Grile", "Alege varianta corectă."], tf: ["Adevărat sau fals", "Stabilește dacă afirmația este adevărată sau falsă."], match: ["Asocieri", "Asociază fiecare noțiune cu explicația potrivită."], blank: ["Completări", "Completează spațiile libere."], num: ["Probleme de calcul", "Rezolvă și scrie rezultatul."], open: ["Răspunsuri scurte", "Răspunde cu propriile cuvinte."], prob: ["Probleme cu rezolvare", "Scrie rezolvarea completă."] };
const GL = ["q", "k", "src", "ok", "p", "sc"];
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
const typesNow = () => { const pf = profile(S.mat); let ty = [...S.ty].filter(t => pf.all.includes(t) && t !== "prob" && (paper() || !OPEN_KINDS.has(t))); return ty.length ? ty : pf.def; };
async function aiBuild(ls, md, avoid, h) { // AI compune întrebările; structura (tipuri, părți, punctaj) vine din model sau din setări
  const slots = [];
  if (md) md.parts.forEach((part, pi) => part.it.forEach(sl => { const k = sl.k.find(x => paper() || !OPEN_KINDS.has(x)); if (k) slots.push({ k, p: sl.p, sc: pi }); }));
  else { const ty = typesNow(); for (let i = 0; i < S.n; i++) slots.push({ k: ty[i % ty.length], p: 1, sc: 0 }); }
  const counts = {}; slots.forEach(x => { if (x.k !== "compose") counts[x.k] = (counts[x.k] || 0) + 1; });
  const res = await composeTest(ls, counts, { materie: S.mat, clasa: S.cl, level: S.lv, avoid, chapter: ls.length > 1 && S.kp !== "Fără capitol" ? noEx(S.kp) : "" });
  const g = { q: [], k: [], src: [], p: [], sc: [], sigs: [], total: 0, ai: true }; if (md) g.parts = md.parts.map(x => ({ t: x.t, d: x.d }));
  const used = new Set(), push = (x, s) => { g.q.push(x.q); g.k.push(x.k); g.src.push(x.src); g.p.push(s.p); g.sc.push(s.sc); };
  for (const s of slots) {
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
const qHtml = (q, i, k, ev, p, N) => `<li class="qs" data-i="${i}"><div class="qh"><b>${i + 1}</b><span class="pill">${TY[q.t]}</span>${p > 1 ? `<span class="tag">${p} p</span>` : ""}${ev ? `<span class="qa">${N > 1 ? `<button type="button" class="ib sm" data-up="${i}" aria-label="Mută sus" ${i ? "" : "disabled"}>↑</button><button type="button" class="ib sm" data-dn="${i}" aria-label="Mută jos" ${i < N - 1 ? "" : "disabled"}>↓</button>` : ""}<button type="button" class="ib sm" data-ed="${i}" aria-label="Editează întrebarea" title="Editează">✎</button><button type="button" class="ib sm" data-re="${i}" aria-label="Schimbă întrebarea" title="Schimbă">↻</button><button type="button" class="ib sm" data-rm="${i}" aria-label="Șterge întrebarea" title="Șterge">×</button></span>` : ""}</div>
<p class="qt">${q.t === "tf" ? "Adevărat sau fals? " : ""}${esc(q.q)}</p>${hintOf(q) ? `<p class="tag">${hintOf(q)}</p>` : ""}${q.t === "mcq" ? `<div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" ${ev ? "disabled" : ""}><span><b>${OL[j]}</b>${esc(o)}</span></label>`).join("")}</div>` : q.t === "tf" ? `<div class="opts two"><label class="opt"><input type="radio" name="q${i}" value="1" ${ev ? "disabled" : ""}><span>Adevărat</span></label><label class="opt"><input type="radio" name="q${i}" value="0" ${ev ? "disabled" : ""}><span>Fals</span></label></div>` : q.t === "match" ? `<div class="mt2">${q.L.map((t, j) => `<label class="mrow"><span>${j + 1}. ${esc(t)}</span><select data-mi="${i}" ${ev ? "disabled" : ""}><option value="">—</option>${q.R.map((_, r) => `<option value="${r}">${OL[r]}</option>`).join("")}</select></label>`).join("")}<ul class="mr">${q.R.map((r, j) => `<li><b>${OL[j]}</b> ${esc(r)}</li>`).join("")}</ul></div>` : q.t === "open" || q.t === "prob" ? `<textarea id="a${i}" class="ans" rows="${q.t === "prob" ? 4 : 2}" ${ev ? "disabled" : ""} placeholder="Răspunsul tău"></textarea>` : `<input id="a${i}" class="ans" ${ev ? "disabled" : ""} autocomplete="off" inputmode="${q.t === "num" ? "decimal" : "text"}" placeholder="${q.t === "num" ? "Răspunsul tău (număr)" : "Răspunsul tău"}">`}
${ev ? `<p class="key">${q.t === "open" || q.t === "prob" ? "Barem" : "Răspuns corect"}: <b>${esc(correct(q, k))}</b></p>` : ""}<div class="fb" hidden></div></li>`;
function drawTest() {
  const v = V[vi], ev = paper(), T = v.q.length, pts = v.q.reduce((a, _, i) => a + (v.p?.[i] || 1), 0);
  let body = ""; v.q.forEach((q, i) => { if (v.parts && (i === 0 || v.sc[i] !== v.sc[i - 1])) { const pt = v.parts[v.sc[i]]; body += `${i ? "</ol>" : ""}<div class="part"><h3>${esc(pt.t)}</h3><p class="tag">${esc(pt.d)}</p></div><ol class="qs-list" start="${i + 1}">`; } else if (!v.parts && (i === 0 || q.t !== v.q[i - 1].t)) { const hh = HEAD[q.t] || ["Întrebări", ""]; body += `${i ? "</ol>" : ""}<div class="part sub"><h3>${hh[0]}</h3><p class="tag">${hh[1]}</p></div><ol class="qs-list" start="${i + 1}">`; } body += qHtml(q, i, v.k[i], ev, v.p?.[i] || 1, T); });
  $("#out").innerHTML = `<div class="card tst"><div class="th"><div><span class="pill">${esc(meta.materie)} · cl. ${esc(meta.clasa)}</span><h2>${esc(meta.tema)}</h2><p class="tag">${T} întrebări${v.md ? ` · ${pts} puncte · ${esc(v.md.nume)}` : ""} · ${v.ai ? "✦ creat cu AI din textul lecției" : "creat din textul lecției"}</p></div></div>
${ev && V.length > 1 ? `<div class="tabs">${V.map((_, i) => chip(`data-v="${i}"`, i === vi, "Varianta " + (i + 1))).join("")}</div>` : ""}
${ev ? "" : `<div class="pbar"><span id="pt">0 / ${T} răspunsuri</span><i><u id="pf"></u></i></div>`}
${body}</ol><div id="res"></div>
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
    const w = v.p?.[i] || 1, li = document.querySelector(`.qs[data-i="${i}"]`), g = grade(q, v.k[i], val(i, q)); s += g * w; t += w; if (g < 1) bad.push(i); li.classList.add(g === 1 ? "ok" : "bad");
    li.querySelectorAll("input,textarea,select").forEach(x => x.disabled = true); const f = li.querySelector(".fb"); f.hidden = false;
    f.innerHTML = `${g === 1 ? "✓ Corect" : g > 0 ? `◐ Parțial · răspuns corect: <b>${esc(correct(q, v.k[i]))}</b>` : `✗ Răspuns corect: <b>${esc(correct(q, v.k[i]))}</b>`}<small>Sursa din lecție: „${esc(v.src[i])}”</small>`;
  });
  const p = Math.round(100 * s / t); v.wrong = bad; rec({ t: meta.tema, m: meta.materie, s, tot: t, n: nota(s, t), d: Date.now() });
  $("#res").innerHTML = `<div class="score"><div class="ring" style="--p:${p}"><b>${fmt(s)}/${t}</b></div><div><h3>Nota ${nota(s, t)}</h3><p>${p >= 85 ? "Excelent! Ești foarte bine pregătit." : p >= 60 ? "Bine! Mai repetă câteva noțiuni și încearcă un test nou." : "Mai citește lecția și încearcă din nou — fiecare test e diferit."}</p>${bad.length ? `<button class="btn s" id="redo" type="button">Repetă greșelile (${bad.length})</button>` : ""}</div></div>`;
  $("#chk").hidden = true; $("#res").scrollIntoView({ behavior: "smooth", block: "center" });
}
const SL = ["q", "k", "src", "ok"], swap = (v, a, b) => SL.forEach(x => { if (v[x]) [v[x][a], v[x][b]] = [v[x][b], v[x][a]]; });
function editQ(i) {
  const v = V[vi], q = v.q[i], k = v.k[i], t = q.t;
  const F = t === "mcq" ? `${q.o.map((o, j) => `<label>Varianta ${OL[j]}<input name="o${j}" value="${esc(o)}"></label>`).join("")}<label>Răspunsul corect<select name="k">${OL.split("").map((l, j) => `<option value="${j}"${j === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>` : t === "tf" ? `<label>Răspunsul corect<select name="k"><option value="1"${k ? " selected" : ""}>Adevărat</option><option value="0"${k ? "" : " selected"}>Fals</option></select></label>` : t === "blank" ? `<label>Răspunsuri acceptate (separate prin virgulă)<input name="k" value="${esc(k.join(", "))}"></label>` : t === "num" ? `<label>Rezultatul (număr)<input name="k" inputmode="decimal" value="${k.v}"></label>` : t === "match" ? `<label>Răspunsul corect (litere în ordine, ex. B,A,D,C)<input name="k" value="${esc(k.map(x => OL[x]).join(","))}"></label>` : `<label>Răspuns-model (barem)<textarea name="k" rows="3">${esc(k)}</textarea></label>`;
  modal("Editează întrebarea", `<label>Enunț<textarea name="q" rows="3" required>${esc(q.q)}</textarea></label>${F}`, async f => {
    const E = f.elements, nq = { ...q, q: E.q.value.trim() };
    if (t === "mcq") { nq.o = [0, 1, 2, 3].map(j => E["o" + j].value.trim()); if (nq.o.some(x => !x)) throw new Error("Completează toate variantele"); v.k[i] = +E.k.value; }
    else if (t === "tf") v.k[i] = E.k.value === "1"; else if (t === "blank") { const a = E.k.value.split(",").map(x => x.trim()).filter(Boolean); if (!a.length) throw new Error("Scrie răspunsul"); v.k[i] = a; }
    else if (t === "num") { const n = parseFloat(E.k.value.replace(",", ".")); if (!isFinite(n)) throw new Error("Rezultatul trebuie să fie un număr"); v.k[i] = { v: n }; }
    else if (t === "match") { const a = E.k.value.split(",").map(x => OL.indexOf(x.trim().toUpperCase())); if (a.length !== q.L.length || a.some(x => x < 0)) throw new Error("Scrie câte o literă pentru fiecare noțiune"); v.k[i] = a; } else v.k[i] = E.k.value.trim();
    v.q[i] = nq; if (v.ok) v.ok[i] = true; drawTest();
  });
}
$("#out").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (b.id === "chk") return check(); if (b.id === "again") return make();
  if (b.id === "pdf" || b.id === "key") return askPdf(b.id); if (d.v) { vi = +d.v; return drawTest(); }
  if (b.id === "redo") { const v = V[0], w = v.wrong; V = [{ q: w.map(i => v.q[i]), k: w.map(i => v.k[i]), src: w.map(i => v.src[i]), total: w.length }]; vi = 0; meta = { ...meta, tema: meta.tema.replace(/ \(greșeli\)$/, "") + " (greșeli)" }; drawTest(); return $("#out").scrollIntoView({ behavior: "smooth" }); }
  const v = V[vi];
  if (d.up !== undefined) { swap(v, +d.up, +d.up - 1); return drawTest(); } if (d.dn !== undefined) { swap(v, +d.dn, +d.dn + 1); return drawTest(); }
  if (d.ed !== undefined) return editQ(+d.ed);
  if (d.rm !== undefined) { const i = +d.rm; [...SL, "p", "sc"].forEach(a => v[a]?.splice(i, 1)); return drawTest(); }
  const more = type => { let ng, t = 0; do ng = generate(P, { n: 1, types: type, level: S.lv }); while ((!ng.total || v.q.some(x => x.q === ng.q[0].q)) && t++ < 8); return ng.total ? ng : null; };
  if (d.re !== undefined) { const i = +d.re, ng = more([v.q[i].t]); if (!ng) return toast("Nu am altă întrebare de acest tip"); v.q[i] = ng.q[0]; v.k[i] = ng.k[0]; v.src[i] = ng.src[0]; return drawTest(); }
  if (b.id === "addq") { const ng = more([...(mdl() ? ["mcq", "blank", "tf", "num", "match"] : S.ty)]); if (!ng) return toast("Nu am altă întrebare"); v.q.push(ng.q[0]); v.k.push(ng.k[0]); v.src.push(ng.src[0]); v.p ??= []; v.p.push(1); if (v.sc) v.sc.push(v.sc.at(-1) ?? 0); return drawTest(); }
};
$("#hist").onclick = e => { if (e.target.id === "clh") { localStorage.removeItem("thist"); drawHist(); } };
/* ---------- PDF ---------- */
const askPdf = id => modal(id === "key" ? "Descarcă baremul (PDF)" : "Descarcă testul (PDF)", `<label>Titlul<input name="t" required value="${esc((V[0].md ? V[0].md.nume + " · " : "Test · ") + meta.tema)}"></label>${id === "key" ? "" : `<div class="grid"><label>Timp de lucru (minute, 0 = nu se afișează)<input name="m" type="number" min="0" max="240" value="${V[0].md ? V[0].md.minute : 45}"></label><label>Mărimea textului<select name="s"><option value="0">Normală</option><option value="1">Mare (pentru clasele mici)</option></select></label></div>`}<p class="tag">${V.length > 1 ? `Fișierul conține toate cele ${V.length} variante, fiecare pe pagini separate.` : "Fișierul este gata de tipărit (format A4)."}</p>`, async f => {
  toast("Se creează PDF-ul…"); const E = f.elements, P2 = await import("../teste/pdf.js"), titlu = E.t.value.trim() || "Test";
  const pages = id === "key" ? P2.keyPages(meta, V, { titlu }) : P2.testPages(meta, V, { titlu, minute: +(E.m?.value) || 0, big: E.s?.value === "1" });
  P2.save(await P2.toPdf(pages), `${id === "key" ? "barem" : "test"}-${slug(meta.tema)}.pdf`); toast("PDF descărcat");
}, "Descarcă PDF");
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
