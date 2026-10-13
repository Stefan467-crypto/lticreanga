import { $, esc, toast, whenRole, modal, can, user, db, collection, getDocs, getDoc, addDoc, deleteDoc, doc } from "./core.js";
import { SUBJECTS, CLASSES, AI } from "./config.js";
import { merge, parseC, generate, grade, nota, correct, capacity } from "./engine.js";
import { DEMO } from "./demo.js";
const TY = { mcq: "Grilă", tf: "Adevărat / Fals", blank: "Completare", num: "Problemă", open: "Deschisă" }, LV = ["Ușor", "Mediu", "Greu"], OL = "ABCD";
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let L = [], S = { mat: "", cl: "", ids: new Set(), n: 10, lv: 1, ty: new Set(["mcq", "tf", "blank", "num"]), mode: "train", nv: 2, gen: "local", extra: "" }, V = [], vi = 0, P = null, meta = null, busy = false, TXT = {}, capTok = 0;
/* ---------- date: textul lecției se aduce doar când e nevoie ---------- */
const textOf = async l => l.text ?? (TXT[l.id] ??= (await getDoc(doc(db, "lectii_text", l.id))).data()?.text ?? "");
const texts = ls => Promise.all(ls.map(async l => ({ ...l, text: await textOf(l) })));
/* ---------- setări memorate pe dispozitiv ---------- */
const saveS = () => { try { localStorage.tcfg = JSON.stringify({ mat: S.mat, cl: S.cl, ids: [...S.ids], n: S.n, lv: S.lv, ty: [...S.ty], mode: S.mode, nv: S.nv, gen: S.gen }); } catch (e) { } };
const loadS = () => { try { const c = JSON.parse(localStorage.tcfg || "null"); if (c) Object.assign(S, c, { ids: new Set(c.ids || []), ty: new Set(c.ty && c.ty.length ? c.ty : ["mcq", "tf", "blank", "num"]) }); } catch (e) { } };
const hist = () => { try { return JSON.parse(localStorage.tsig || "{}"); } catch (e) { return {}; } };
const chip = (a, on, t, cls = "") => `<button type="button" ${a} aria-selected="${on}" class="${cls}">${t}</button>`, sel = () => L.filter(l => S.ids.has(l.id));
const paper = () => S.mode === "paper" && can("resurse"), useAI = () => paper() && AI && S.gen === "ai";
/* ---------- configurare ---------- */
const drawCfg = () => {
  if (!L.length) { $("#cfg").innerHTML = '<p class="tag mid">Nu sunt lecții încă. Un profesor le adaugă în <a href="lectii">Baza de lecții</a>.</p>'; return; }
  const mats = [...new Set(L.map(l => l.materie))].sort((a, b) => idx(a) - idx(b)); if (!mats.includes(S.mat)) S.mat = mats[0];
  const cls = [...new Set(L.filter(l => l.materie === S.mat).map(l => l.clasa))].sort((a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b)); if (!cls.includes(S.cl)) S.cl = cls[0];
  const ts = L.filter(l => l.materie === S.mat && l.clasa === S.cl); S.ids = new Set([...S.ids].filter(id => ts.some(t => t.id === id))); if (!S.ids.size && ts[0]) S.ids.add(ts[0].id);
  const th = can("resurse"), ai = useAI(), types = Object.entries(TY).filter(([k]) => k !== "open" || ai);
  $("#cfg").innerHTML = `<h3><span class="num">1</span> Alege lecția</h3><p class="kick">Materia</p><div class="tabs">${mats.map(m => chip(`data-m="${esc(m)}"`, m === S.mat, esc(m))).join("")}</div><p class="kick">Clasa</p><div class="tabs">${cls.map(c => chip(`data-c="${c}"`, c === S.cl, c)).join("")}</div><p class="kick">Tema (poți alege mai multe)</p><div class="tabs">${ts.map(t => chip(`data-t="${t.id}"`, S.ids.has(t.id), esc(t.tema))).join("")}</div>
<h3 style="margin-top:1.6rem"><span class="num">2</span> Setează testul</h3><p class="kick">Număr de întrebări</p><div class="tabs">${[5, 10, 15, 20, 30].map(n => chip(`data-n="${n}"`, n === S.n, n)).join("")}</div><p class="kick">Dificultate</p><div class="tabs">${LV.map((l, i) => chip(`data-lv="${i}"`, i === S.lv, l)).join("")}</div><p class="kick">Tipuri de întrebări</p><div class="tabs">${types.map(([k, v]) => chip(`data-ty="${k}"`, S.ty.has(k), v)).join("")}</div><p class="capi" id="cap"></p>
${th ? `<p class="kick">Pentru cine</p><div class="tabs seg">${chip('data-mode="train"', S.mode === "train", "Antrenament (elevi)")}${chip('data-mode="paper"', S.mode === "paper", "Test pe hârtie (profesor)")}</div>` : ""}
${paper() ? `<p class="kick">Variante diferite (pentru a nu copia)</p><div class="tabs">${[1, 2, 4, 6].map(n => chip(`data-nv="${n}"`, n === S.nv, n)).join("")}</div>${AI ? `<p class="kick">Cine scrie întrebările</p><div class="tabs seg">${chip('data-gen="local"', S.gen === "local", "Generator local")}${chip('data-gen="ai"', S.gen === "ai", "✦ Claude AI")}</div>${S.gen === "ai" ? '<label style="margin-top:.8rem">Cerințe suplimentare (opțional)<textarea id="ex" rows="2" placeholder="ex. mai multe probleme practice, formulări simple…"></textarea></label>' : ""}` : ""}` : ""}
<button class="btn" id="go" type="button" style="width:100%;margin-top:1rem">✦ Generează testul</button>`;
  if ($("#ex")) $("#ex").value = S.extra; updCap();
};
async function updCap() { // câte întrebări permite lecția aleasă
  const tok = ++capTok, el = $("#cap"), ls = sel(); if (!el || !ls.length) return; el.textContent = "Se analizează lecția…";
  try {
    const T = await texts(ls); if (tok !== capTok) return; const c = capacity(merge(T.map(l => parseC(l.text))), [...S.ids].sort().join("+") + ":" + T.map(l => l.text.length).join(","));
    el.innerHTML = `Din temele alese se pot forma: <b>${c.mcq}</b> grilă · <b>${c.tf}</b> adevărat/fals · <b>${c.blank}</b> completări · probleme ${c.num ? "<b>✓</b> (numere noi la fiecare test)" : "—"}`;
    document.querySelectorAll("#cfg [data-ty]").forEach(b => b.classList.toggle("off", b.dataset.ty !== "open" && !(c[b.dataset.ty] > 0)));
    const tot = c.mcq + c.tf + c.blank + (c.num ? 20 : 0); document.querySelectorAll("#cfg [data-n]").forEach(b => b.classList.toggle("off", +b.dataset.n > tot));
  } catch (e) { if (tok === capTok) el.textContent = ""; }
}
$("#cfg").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (b.id === "go") return make();
  if (d.m) { S.mat = d.m; S.cl = ""; S.ids = new Set(); } if (d.c) { S.cl = d.c; S.ids = new Set(); } if (d.t) { S.ids.has(d.t) ? S.ids.size > 1 && S.ids.delete(d.t) : S.ids.add(d.t); }
  if (d.n) S.n = +d.n; if (d.lv) S.lv = +d.lv; if (d.mode) { S.mode = d.mode; if (d.mode !== "paper") S.ty.delete("open"); } if (d.nv) S.nv = +d.nv; if (d.gen) { S.gen = d.gen; if (d.gen === "ai") S.ty.add("open"); else S.ty.delete("open"); }
  if (d.ty) S.ty.has(d.ty) ? S.ty.size > 1 && S.ty.delete(d.ty) : S.ty.add(d.ty);
  S.extra = $("#ex")?.value || S.extra; saveS(); drawCfg();
};
/* ---------- generare ---------- */
async function make() {
  if (busy) return; const l0 = sel(); if (!l0.length) return toast("Alege o temă");
  busy = true; const go = $("#go"); go.disabled = true; go.textContent = "Se pregătește…";
  try {
    const ls = await texts(l0); S.extra = $("#ex")?.value || S.extra; meta = { materie: S.mat, clasa: S.cl, tema: ls.map(l => l.tema.replace(/ \(exemplu\)$/, "")).join(" + ") };
    if (useAI()) await makeAI(ls); else makeLocal(ls);
  } catch (e) { toast(e.message || "Eroare"); }
  busy = false; const g2 = $("#go"); if (g2) { g2.disabled = false; g2.textContent = "✦ Generează testul"; }
}
function makeLocal(ls) {
  P = merge(ls.map(l => parseC(l.text))); const key = [...S.ids].sort().join("+"), H = hist(), h = new Set(H[key] || []), nv = paper() ? S.nv : 1; V = []; vi = 0;
  for (let i = 0; i < nv; i++) { const g = generate(P, { n: S.n, types: [...S.ty].filter(t => t !== "open"), level: S.lv, hist: h }); g.sigs.forEach(s => h.add(s)); V.push(g); }
  H[key] = [...h].slice(-600); try { localStorage.tsig = JSON.stringify(H); } catch (e) { }
  if (!V[0].total) { $("#out").innerHTML = ""; return toast("Lecția nu are destulă informație pentru tipurile alese"); }
  if (V[0].total < S.n) toast(`Lecția permite doar ${V[0].total} întrebări de tipurile alese`);
  drawTest(); $("#out").scrollIntoView({ behavior: "smooth" });
}
/* ---------- Claude AI (prin funcția Firebase, opțional) ---------- */
async function makeAI(ls) {
  $("#out").innerHTML = '<div class="card mid"><div class="spin"></div><p>Claude citește lecția din manual și scrie testul. Durează de la 20 de secunde până la câteva minute.</p></div>'; $("#out").scrollIntoView({ behavior: "smooth" });
  const text = ls.map(l => `## ${l.tema}\n${l.text}`).join("\n\n").slice(0, 60000);
  const ref = await addDoc(collection(db, "cereri_ai"), { uid: user.uid, materie: S.mat, clasa: S.cl, tema: meta.tema, text, n: S.n, lv: S.lv, types: [...S.ty], nv: S.nv, extra: S.extra.slice(0, 400), status: "nou", ts: Date.now() });
  let d = null; for (let t = 0; t < 110; t++) { await new Promise(r => setTimeout(r, 2500)); d = (await getDoc(doc(db, "cereri_ai", ref.id))).data(); if (d && d.status !== "nou" && d.status !== "lucru") break; }
  try { await deleteDoc(doc(db, "cereri_ai", ref.id)); } catch (e) { }
  if (!d || d.status !== "gata") { $("#out").innerHTML = ""; throw new Error(d?.eroare || "Funcția Claude AI nu a răspuns. Verifică dacă este pusă online (vezi README)."); }
  const R = JSON.parse(d.rezultat); V = R.variante.map(v => ({ ai: 1, q: v.map(x => ({ t: x.t, q: x.q, ...(x.o ? { o: x.o } : {}) })), k: v.map(x => x.t === "num" ? { v: x.k } : x.k), src: v.map(x => x.src || ""), p: v.map(x => x.p || 1), ok: v.map(x => x.ok !== false), total: v.length })); vi = 0; P = null;
  if (!V[0]?.total) { $("#out").innerHTML = ""; throw new Error("Claude nu a putut forma întrebări din textul acesta."); } drawTest();
}
/* ---------- test ---------- */
const qHtml = (q, i, k, ev, re, warn, N) => `<li class="qs" data-i="${i}"><div class="qh"><b>${i + 1}</b><span class="pill">${TY[q.t]}</span>${ev ? `<span class="qa">${N > 1 ? `<button type="button" class="ib sm" data-up="${i}" aria-label="Mută sus" ${i ? "" : "disabled"}>↑</button><button type="button" class="ib sm" data-dn="${i}" aria-label="Mută jos" ${i < N - 1 ? "" : "disabled"}>↓</button>` : ""}<button type="button" class="ib sm" data-ed="${i}" aria-label="Editează întrebarea" title="Editează">✎</button>${re ? `<button type="button" class="ib sm" data-re="${i}" aria-label="Schimbă întrebarea" title="Schimbă">↻</button>` : ""}<button type="button" class="ib sm" data-rm="${i}" aria-label="Șterge întrebarea" title="Șterge">×</button></span>` : ""}</div>
<p class="qt">${q.t === "tf" ? "Adevărat sau fals? " : ""}${esc(q.q)}</p>${q.t === "mcq" ? `<div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" ${ev ? "disabled" : ""}><span><b>${OL[j]}</b>${esc(o)}</span></label>`).join("")}</div>` : q.t === "tf" ? `<div class="opts two"><label class="opt"><input type="radio" name="q${i}" value="1" ${ev ? "disabled" : ""}><span>Adevărat</span></label><label class="opt"><input type="radio" name="q${i}" value="0" ${ev ? "disabled" : ""}><span>Fals</span></label></div>` : q.t === "open" ? `<textarea id="a${i}" class="ans" rows="2" ${ev ? "disabled" : ""} placeholder="Răspunsul tău"></textarea>` : `<input id="a${i}" class="ans" ${ev ? "disabled" : ""} autocomplete="off" inputmode="${q.t === "num" ? "decimal" : "text"}" placeholder="${q.t === "num" ? "Răspunsul tău (număr)" : "Răspunsul tău"}">`}
${ev ? `<p class="key">Răspuns corect: <b>${esc(correct(q, k))}</b></p>${warn === false ? '<p class="warn">⚠ Citatul-sursă nu a fost găsit în textul lecției — verifică întrebarea.</p>' : ""}` : ""}<div class="fb" hidden></div></li>`;
function drawTest() {
  const v = V[vi], ev = paper(), T = v.q.length;
  $("#out").innerHTML = `<div class="card tst"><div class="th"><div><span class="pill">${esc(meta.materie)} · cl. ${esc(meta.clasa)}</span><h2>${esc(meta.tema)}</h2><p class="tag">${T} întrebări · ${v.ai ? "scris de Claude AI din textul lecției" : "unic, creat doar din textul lecției"}</p></div></div>
${ev && V.length > 1 ? `<div class="tabs">${V.map((_, i) => chip(`data-v="${i}"`, i === vi, "Varianta " + (i + 1))).join("")}</div>` : ""}
${ev ? "" : `<div class="pbar"><span id="pt">0 / ${T} răspunsuri</span><i><u id="pf"></u></i></div>`}
<ol class="qs-list">${v.q.map((q, i) => qHtml(q, i, v.k[i], ev, !v.ai, v.ok?.[i], T)).join("")}</ol><div id="res"></div>
<div class="row" style="margin-top:1.2rem">${ev ? `<button class="btn" id="pdf" type="button">⬇ Descarcă testul (PDF)</button><button class="btn o" id="key" type="button">⬇ Barem (PDF)</button>${v.ai ? "" : '<button class="btn o" id="addq" type="button">＋ Întrebare</button>'}` : `<button class="btn" id="chk" type="button">Verifică testul</button><button class="btn o" id="pdf" type="button">⬇ Descarcă PDF</button>`}<button class="btn o" id="again" type="button">Alt test nou</button></div></div>`;
}
const val = (i, q) => q.t === "mcq" || q.t === "tf" ? document.querySelector(`input[name=q${i}]:checked`)?.value ?? "" : $(`#a${i}`)?.value.trim() ?? "";
const upd = () => { const f = $("#pf"); if (!f) return; const v = V[0]; let n = 0; v.q.forEach((q, i) => { if (val(i, q) !== "") n++; }); $("#pt").textContent = `${n} / ${v.q.length} răspunsuri`; f.style.width = 100 * n / v.q.length + "%"; };
$("#out").oninput = $("#out").onchange = upd;
function rec(x) { let h = []; try { h = JSON.parse(localStorage.thist || "[]"); } catch (e) { } h.unshift(x); try { localStorage.thist = JSON.stringify(h.slice(0, 12)); } catch (e) { } drawHist(); }
function drawHist() {
  let h = []; try { h = JSON.parse(localStorage.thist || "[]"); } catch (e) { } const el = $("#hist"); if (!el) return;
  el.innerHTML = h.length ? `<div class="card"><h3>Rezultatele tale recente</h3><ul class="list">${h.map(x => `<li><span><b>${esc(x.t)}</b><br><span class="tag">${esc(x.m)} · ${new Date(x.d).toLocaleDateString("ro-RO")} · ${x.s}/${x.tot}</span></span><b class="nt n${x.n >= 9 ? 3 : x.n >= 6 ? 2 : 1}">${x.n}</b></li>`).join("")}</ul><button class="btn o s" id="clh" type="button" style="margin-top:.8rem">Șterge istoricul</button></div>` : "";
}
function check() {
  const v = V[0]; let s = 0; const bad = [];
  v.q.forEach((q, i) => {
    const li = document.querySelector(`.qs[data-i="${i}"]`), ok = grade(q, v.k[i], val(i, q)); s += ok; if (!ok) bad.push(i); li.classList.add(ok ? "ok" : "bad");
    li.querySelectorAll("input,textarea").forEach(x => x.disabled = true); const f = li.querySelector(".fb"); f.hidden = false;
    f.innerHTML = `${ok ? "✓ Corect" : `✗ Răspuns corect: <b>${esc(correct(q, v.k[i]))}</b>`}<small>Sursa din lecție: „${esc(v.src[i])}”</small>`;
  });
  const t = v.q.length, p = Math.round(100 * s / t); v.wrong = bad; rec({ t: meta.tema, m: meta.materie, s, tot: t, n: nota(s, t), d: Date.now() });
  $("#res").innerHTML = `<div class="score"><div class="ring" style="--p:${p}"><b>${s}/${t}</b></div><div><h3>Nota ${nota(s, t)}</h3><p>${p >= 85 ? "Excelent! Ești foarte bine pregătit." : p >= 60 ? "Bine! Mai repetă câteva noțiuni și încearcă un test nou." : "Mai citește lecția și încearcă din nou — fiecare test e diferit."}</p>${bad.length ? `<button class="btn s" id="redo" type="button">Repetă greșelile (${bad.length})</button>` : ""}</div></div>`;
  $("#chk").hidden = true; $("#res").scrollIntoView({ behavior: "smooth", block: "center" });
}
const swap = (v, a, b) => ["q", "k", "src", "p", "ok"].forEach(x => { if (v[x]) [v[x][a], v[x][b]] = [v[x][b], v[x][a]]; });
function editQ(i) {
  const v = V[vi], q = v.q[i], k = v.k[i], t = q.t;
  const F = t === "mcq" ? `${q.o.map((o, j) => `<label>Varianta ${OL[j]}<input name="o${j}" value="${esc(o)}"></label>`).join("")}<label>Răspunsul corect<select name="k">${OL.split("").map((l, j) => `<option value="${j}"${j === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>` : t === "tf" ? `<label>Răspunsul corect<select name="k"><option value="1"${k ? " selected" : ""}>Adevărat</option><option value="0"${k ? "" : " selected"}>Fals</option></select></label>` : t === "blank" ? `<label>Răspunsuri acceptate (separate prin virgulă)<input name="k" value="${esc(k.join(", "))}"></label>` : t === "num" ? `<label>Rezultatul (număr)<input name="k" inputmode="decimal" value="${k.v}"></label>` : `<label>Răspuns-model (barem)<textarea name="k" rows="3">${esc(k)}</textarea></label>`;
  modal("Editează întrebarea", `<label>Enunț<textarea name="q" rows="3" required>${esc(q.q)}</textarea></label>${F}`, async f => {
    const E = f.elements, nq = { ...q, q: E.q.value.trim() };
    if (t === "mcq") { nq.o = [0, 1, 2, 3].map(j => E["o" + j].value.trim()); if (nq.o.some(x => !x)) throw new Error("Completează toate variantele"); v.k[i] = +E.k.value; }
    else if (t === "tf") v.k[i] = E.k.value === "1"; else if (t === "blank") { const a = E.k.value.split(",").map(x => x.trim()).filter(Boolean); if (!a.length) throw new Error("Scrie răspunsul"); v.k[i] = a; }
    else if (t === "num") { const n = parseFloat(E.k.value.replace(",", ".")); if (!isFinite(n)) throw new Error("Rezultatul trebuie să fie un număr"); v.k[i] = { v: n }; } else v.k[i] = E.k.value.trim();
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
  if (d.rm !== undefined) { const i = +d.rm; ["q", "k", "src", "p", "ok"].forEach(a => v[a]?.splice(i, 1)); return drawTest(); }
  const more = type => { let ng, t = 0; do ng = generate(P, { n: 1, types: type, level: S.lv }); while ((!ng.total || v.q.some(x => x.q === ng.q[0].q)) && t++ < 8); return ng.total ? ng : null; };
  if (d.re !== undefined) { const i = +d.re, ng = more([v.q[i].t]); if (!ng) return toast("Nu am altă întrebare de acest tip"); v.q[i] = ng.q[0]; v.k[i] = ng.k[0]; v.src[i] = ng.src[0]; return drawTest(); }
  if (b.id === "addq") { const ng = more([...S.ty].filter(t => t !== "open")); if (!ng) return toast("Nu am altă întrebare"); v.q.push(ng.q[0]); v.k.push(ng.k[0]); v.src.push(ng.src[0]); return drawTest(); }
};
$("#hist").onclick = e => { if (e.target.id === "clh") { localStorage.removeItem("thist"); drawHist(); } };
/* ---------- PDF ---------- */
const askPdf = id => modal(id === "key" ? "Descarcă baremul (PDF)" : "Descarcă testul (PDF)", `<label>Titlul<input name="t" required value="${esc("Test · " + meta.tema)}"></label>${id === "key" ? "" : '<div class="grid"><label>Timp de lucru (minute, 0 = nu se afișează)<input name="m" type="number" min="0" max="180" value="45"></label><label>Mărimea textului<select name="s"><option value="0">Normală</option><option value="1">Mare (pentru clasele mici)</option></select></label></div>'}<p class="tag">${V.length > 1 ? `Fișierul conține toate cele ${V.length} variante, fiecare pe pagini separate.` : "Fișierul este gata de tipărit (format A4)."}</p>`, async f => {
  toast("Se creează PDF-ul…"); const E = f.elements, P2 = await import("./pdf.js"), titlu = E.t.value.trim() || "Test";
  const pages = id === "key" ? P2.keyPages(meta, V, { titlu }) : P2.testPages(meta, V, { titlu, minute: +(E.m?.value) || 0, big: E.s?.value === "1" });
  P2.save(await P2.toPdf(pages), `${id === "key" ? "barem" : "test"}-${slug(meta.tema)}.pdf`); toast("PDF descărcat");
}, "Descarcă PDF");
/* ---------- pornire ---------- */
const load = async () => {
  try { L = (await getDocs(collection(db, "lectii"))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { L = []; }
  if (!L.length) L = DEMO.map(x => ({ ...x }));
  loadS(); const l = new URLSearchParams(location.search).get("l"), f = L.find(x => x.id === l); if (f) { S.mat = f.materie; S.cl = f.clasa; S.ids = new Set([f.id]); }
  drawCfg(); drawHist();
};
whenRole(() => { load(); });
