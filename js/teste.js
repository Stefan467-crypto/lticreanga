import { $, esc, toast, whenRole, modal, can, user, db, collection, getDocs, addDoc, getDoc, deleteDoc, doc } from "./core.js";
import { SUBJECTS, CLASSES, AI } from "./config.js";
import { parse, merge, generate, grade, nota, correct } from "./engine.js";
import { DEMO } from "./demo.js";
const TY = { mcq: "Grilă", tf: "Adevărat / Fals", blank: "Completare", num: "Problemă", open: "Deschisă" }, LV = ["Ușor", "Mediu", "Greu"], OL = "ABCD";
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let L = [], S = { mat: "", cl: "", ids: new Set(), n: 10, lv: 1, ty: new Set(["mcq", "tf", "blank", "num"]), mode: "train", nv: 2, gen: "local", extra: "" }, V = [], vi = 0, P = null, meta = null, busy = false;
const hist = () => { try { return JSON.parse(localStorage.tsig || "{}"); } catch (e) { return {}; } };
const chip = (a, on, t) => `<button type="button" ${a} aria-selected="${on}">${t}</button>`, sel = () => L.filter(l => S.ids.has(l.id));
const paper = () => S.mode === "paper" && can("resurse"), useAI = () => paper() && AI && S.gen === "ai";
/* ---------- configurare ---------- */
const drawCfg = () => {
  if (!L.length) { $("#cfg").innerHTML = '<p class="tag mid">Nu sunt lecții încă. Un profesor le adaugă în <a href="lectii">Baza de lecții</a>.</p>'; return; }
  const mats = [...new Set(L.map(l => l.materie))].sort((a, b) => idx(a) - idx(b)); if (!mats.includes(S.mat)) S.mat = mats[0];
  const cls = [...new Set(L.filter(l => l.materie === S.mat).map(l => l.clasa))].sort((a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b)); if (!cls.includes(S.cl)) S.cl = cls[0];
  const ts = L.filter(l => l.materie === S.mat && l.clasa === S.cl); S.ids = new Set([...S.ids].filter(id => ts.some(t => t.id === id))); if (!S.ids.size && ts[0]) S.ids.add(ts[0].id);
  const th = can("resurse"), ai = useAI(), types = Object.entries(TY).filter(([k]) => k !== "open" || ai);
  $("#cfg").innerHTML = `<h3><span class="num">1</span> Alege lecția</h3><p class="kick">Materia</p><div class="tabs">${mats.map(m => chip(`data-m="${esc(m)}"`, m === S.mat, esc(m))).join("")}</div><p class="kick">Clasa</p><div class="tabs">${cls.map(c => chip(`data-c="${c}"`, c === S.cl, c)).join("")}</div><p class="kick">Tema (poți alege mai multe)</p><div class="tabs">${ts.map(t => chip(`data-t="${t.id}"`, S.ids.has(t.id), esc(t.tema))).join("")}</div>
<h3 style="margin-top:1.6rem"><span class="num">2</span> Setează testul</h3><p class="kick">Număr de întrebări</p><div class="tabs">${[5, 10, 15, 20].map(n => chip(`data-n="${n}"`, n === S.n, n)).join("")}</div><p class="kick">Dificultate</p><div class="tabs">${LV.map((l, i) => chip(`data-lv="${i}"`, i === S.lv, l)).join("")}</div><p class="kick">Tipuri de întrebări</p><div class="tabs">${types.map(([k, v]) => chip(`data-ty="${k}"`, S.ty.has(k), v)).join("")}</div>
${th ? `<p class="kick">Pentru cine</p><div class="tabs seg">${chip('data-mode="train"', S.mode === "train", "Antrenament (elevi)")}${chip('data-mode="paper"', S.mode === "paper", "Test pe hârtie (profesor)")}</div>` : ""}
${paper() ? `<p class="kick">Variante diferite (pentru a nu copia)</p><div class="tabs">${[1, 2, 4, 6].map(n => chip(`data-nv="${n}"`, n === S.nv, n)).join("")}</div>${AI ? `<p class="kick">Cine scrie întrebările</p><div class="tabs seg">${chip('data-gen="local"', S.gen === "local", "Generator local")}${chip('data-gen="ai"', S.gen === "ai", "✦ Claude AI")}</div>${S.gen === "ai" ? '<label style="margin-top:.8rem">Cerințe suplimentare (opțional)<textarea id="ex" rows="2" placeholder="ex. mai multe probleme practice, formulări simple, fără formule…"></textarea></label>' : ""}` : ""}` : ""}
<button class="btn" id="go" type="button" style="width:100%;margin-top:1rem">✦ Generează testul</button>`;
  if ($("#ex")) $("#ex").value = S.extra;
};
$("#cfg").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.m) { S.mat = d.m; S.cl = ""; S.ids = new Set(); } if (d.c) { S.cl = d.c; S.ids = new Set(); } if (d.t) { S.ids.has(d.t) ? S.ids.size > 1 && S.ids.delete(d.t) : S.ids.add(d.t); }
  if (d.n) S.n = +d.n; if (d.lv) S.lv = +d.lv; if (d.mode) { S.mode = d.mode; if (d.mode !== "paper") S.ty.delete("open"); } if (d.nv) S.nv = +d.nv; if (d.gen) { S.gen = d.gen; if (d.gen === "ai") S.ty.add("open"); else S.ty.delete("open"); }
  if (d.ty) S.ty.has(d.ty) ? S.ty.size > 1 && S.ty.delete(d.ty) : S.ty.add(d.ty);
  if (b.id === "go") return make(); S.extra = $("#ex")?.value || S.extra; drawCfg();
};
/* ---------- generare ---------- */
async function make() {
  if (busy) return; const ls = sel(); if (!ls.length) return toast("Alege o temă");
  S.extra = $("#ex")?.value || ""; meta = { materie: S.mat, clasa: S.cl, tema: ls.map(l => l.tema.replace(/ \(exemplu\)$/, "")).join(" + ") };
  if (useAI()) return makeAI(ls);
  P = merge(ls.map(l => parse(l.text))); const key = [...S.ids].sort().join("+"), H = hist(), h = new Set(H[key] || []), nv = paper() ? S.nv : 1; V = []; vi = 0;
  for (let i = 0; i < nv; i++) { const g = generate(P, { n: S.n, types: [...S.ty].filter(t => t !== "open"), level: S.lv, hist: h }); g.sigs.forEach(s => h.add(s)); V.push(g); }
  H[key] = [...h].slice(-500); try { localStorage.tsig = JSON.stringify(H); } catch (e) { }
  if (!V[0].total) { $("#out").innerHTML = ""; return toast("Lecția nu are destulă informație pentru tipurile alese"); }
  if (V[0].total < S.n) toast(`Lecția permite doar ${V[0].total} întrebări de tipurile alese`);
  drawTest(); $("#out").scrollIntoView({ behavior: "smooth" });
}
/* ---------- Claude AI (prin funcția Firebase) ---------- */
async function makeAI(ls) {
  busy = true; const go = $("#go"); go.disabled = true; go.textContent = "Claude citește lecția…"; $("#out").innerHTML = '<div class="card mid"><div class="spin"></div><p>Claude citește lecția din manual și scrie testul. Durează de la 20 de secunde până la câteva minute (în funcție de număr și variante).</p></div>'; $("#out").scrollIntoView({ behavior: "smooth" });
  try {
    const text = ls.map(l => `## ${l.tema}\n${l.text}`).join("\n\n").slice(0, 60000);
    const ref = await addDoc(collection(db, "cereri_ai"), { uid: user.uid, materie: S.mat, clasa: S.cl, tema: meta.tema, text, n: S.n, lv: S.lv, types: [...S.ty], nv: S.nv, extra: S.extra.slice(0, 400), status: "nou", ts: Date.now() });
    let d = null; for (let t = 0; t < 110; t++) { await new Promise(r => setTimeout(r, 2500)); d = (await getDoc(doc(db, "cereri_ai", ref.id))).data(); if (d && d.status !== "nou" && d.status !== "lucru") break; }
    try { await deleteDoc(doc(db, "cereri_ai", ref.id)); } catch (e) { }
    if (!d || d.status !== "gata") throw new Error(d?.eroare || "Funcția Claude AI nu a răspuns. Verifică dacă este pusă online (vezi README).");
    const R = JSON.parse(d.rezultat); V = R.variante.map(v => ({ ai: 1, q: v.map(x => ({ t: x.t, q: x.q, ...(x.o ? { o: x.o } : {}) })), k: v.map(x => x.t === "num" ? { v: x.k } : x.k), src: v.map(x => x.src || ""), p: v.map(x => x.p || 1), ok: v.map(x => x.ok !== false), total: v.length })); vi = 0; P = null;
    if (!V[0]?.total) throw new Error("Claude nu a putut forma întrebări din textul acesta."); drawTest();
  } catch (e) { $("#out").innerHTML = ""; toast(e.message || "Eroare Claude AI"); }
  busy = false; go.disabled = false; go.textContent = "✦ Generează testul";
}
/* ---------- test ---------- */
const qHtml = (q, i, k, ev, re, warn) => `<li class="qs" data-i="${i}"><div class="qh"><b>${i + 1}</b><span class="pill">${TY[q.t]}</span>${ev ? `<span class="qa">${re ? `<button type="button" class="ib sm" data-re="${i}" aria-label="Schimbă întrebarea" title="Schimbă">↻</button>` : ""}<button type="button" class="ib sm" data-rm="${i}" aria-label="Șterge întrebarea" title="Șterge">×</button></span>` : ""}</div>
<p class="qt">${q.t === "tf" ? "Adevărat sau fals? " : ""}${esc(q.q)}</p>${q.t === "mcq" ? `<div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" ${ev ? "disabled" : ""}><span><b>${OL[j]}</b>${esc(o)}</span></label>`).join("")}</div>` : q.t === "tf" ? `<div class="opts two"><label class="opt"><input type="radio" name="q${i}" value="1" ${ev ? "disabled" : ""}><span>Adevărat</span></label><label class="opt"><input type="radio" name="q${i}" value="0" ${ev ? "disabled" : ""}><span>Fals</span></label></div>` : q.t === "open" ? `<textarea id="a${i}" class="ans" rows="2" ${ev ? "disabled" : ""} placeholder="Răspunsul tău"></textarea>` : `<input id="a${i}" class="ans" ${ev ? "disabled" : ""} autocomplete="off" inputmode="${q.t === "num" ? "decimal" : "text"}" placeholder="${q.t === "num" ? "Răspunsul tău (număr)" : "Răspunsul tău"}">`}
${ev ? `<p class="key">Răspuns corect: <b>${esc(correct(q, k))}</b></p>${warn === false ? '<p class="warn">⚠ Citatul-sursă nu a fost găsit în textul lecției — verifică întrebarea.</p>' : ""}` : ""}<div class="fb" hidden></div></li>`;
function drawTest() {
  const v = V[vi], ev = paper(), T = v.q.length;
  $("#out").innerHTML = `<div class="card tst"><div class="th"><div><span class="pill">${esc(meta.materie)} · cl. ${esc(meta.clasa)}</span><h2>${esc(meta.tema)}</h2><p class="tag">${T} întrebări · ${v.ai ? "scris de Claude AI din textul lecției" : "unic, creat doar din textul lecției"}</p></div></div>
${ev && V.length > 1 ? `<div class="tabs">${V.map((_, i) => chip(`data-v="${i}"`, i === vi, "Varianta " + (i + 1))).join("")}</div>` : ""}
<ol class="qs-list">${v.q.map((q, i) => qHtml(q, i, v.k[i], ev, !v.ai, v.ok?.[i])).join("")}</ol><div id="res"></div>
<div class="row" style="margin-top:1.2rem">${ev ? `<button class="btn" id="pdf" type="button">⬇ Descarcă testul (PDF)</button><button class="btn o" id="key" type="button">⬇ Barem (PDF)</button>${v.ai ? "" : '<button class="btn o" id="addq" type="button">＋ Întrebare</button>'}` : `<button class="btn" id="chk" type="button">Verifică testul</button><button class="btn o" id="pdf" type="button">⬇ Descarcă PDF</button>`}<button class="btn o" id="again" type="button">Alt test nou</button></div></div>`;
}
const val = (i, q) => q.t === "mcq" || q.t === "tf" ? document.querySelector(`input[name=q${i}]:checked`)?.value ?? "" : $(`#a${i}`).value.trim();
function check() {
  const v = V[0]; let s = 0;
  v.q.forEach((q, i) => {
    const li = document.querySelector(`.qs[data-i="${i}"]`), ok = grade(q, v.k[i], val(i, q)); s += ok; li.classList.add(ok ? "ok" : "bad");
    li.querySelectorAll("input,textarea").forEach(x => x.disabled = true); const f = li.querySelector(".fb"); f.hidden = false;
    f.innerHTML = `${ok ? "✓ Corect" : `✗ Răspuns corect: <b>${esc(correct(q, v.k[i]))}</b>`}<small>Sursa din lecție: „${esc(v.src[i])}”</small>`;
  });
  const t = v.q.length, p = Math.round(100 * s / t);
  $("#res").innerHTML = `<div class="score"><div class="ring" style="--p:${p}"><b>${s}/${t}</b></div><div><h3>Nota ${nota(s, t)}</h3><p>${p >= 85 ? "Excelent! Ești foarte bine pregătit." : p >= 60 ? "Bine! Mai repetă câteva noțiuni și încearcă un test nou." : "Mai citește lecția și încearcă din nou — fiecare test e diferit."}</p></div></div>`;
  $("#chk").hidden = true; $("#res").scrollIntoView({ behavior: "smooth", block: "center" });
}
$("#out").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (b.id === "chk") return check(); if (b.id === "again") return make();
  if (b.id === "pdf" || b.id === "key") return askPdf(b.id); if (d.v) { vi = +d.v; return drawTest(); }
  const v = V[vi];
  if (d.rm !== undefined) { const i = +d.rm; ["q", "k", "src", "p", "ok"].forEach(a => v[a]?.splice(i, 1)); return drawTest(); }
  const more = type => { let ng, t = 0; do ng = generate(P, { n: 1, types: type, level: S.lv }); while ((!ng.total || v.q.some(x => x.q === ng.q[0].q)) && t++ < 8); return ng.total ? ng : null; };
  if (d.re !== undefined) { const i = +d.re, ng = more([v.q[i].t]); if (!ng) return toast("Nu am altă întrebare de acest tip"); v.q[i] = ng.q[0]; v.k[i] = ng.k[0]; v.src[i] = ng.src[0]; return drawTest(); }
  if (b.id === "addq") { const ng = more([...S.ty].filter(t => t !== "open")); if (!ng) return toast("Nu am altă întrebare"); v.q.push(ng.q[0]); v.k.push(ng.k[0]); v.src.push(ng.src[0]); return drawTest(); }
};
/* ---------- PDF ---------- */
const askPdf = id => modal(id === "key" ? "Descarcă baremul (PDF)" : "Descarcă testul (PDF)", `<label>Titlul<input name="t" required value="${esc("Test · " + meta.tema)}"></label>${id === "key" ? "" : '<label>Timp de lucru (minute, 0 = nu se afișează)<input name="m" type="number" min="0" max="180" value="45"></label>'}<p class="tag">${V.length > 1 ? `Fișierul conține toate cele ${V.length} variante, fiecare pe pagini separate.` : "Fișierul este gata de tipărit (format A4)."}</p>`, async f => {
  toast("Se creează PDF-ul…"); const E = f.elements, P2 = await import("./pdf.js"), titlu = E.t.value.trim() || "Test";
  const pages = id === "key" ? P2.keyPages(meta, V, { titlu }) : P2.testPages(meta, V, { titlu, minute: +(E.m?.value) || 0 });
  P2.save(await P2.toPdf(pages), `${id === "key" ? "barem" : "test"}-${slug(meta.tema)}.pdf`); toast("PDF descărcat");
}, "Descarcă PDF");
/* ---------- pornire ---------- */
const load = async () => {
  try { L = (await getDocs(collection(db, "lectii"))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { L = []; }
  if (!L.length) L = DEMO.map(x => ({ ...x }));
  const l = new URLSearchParams(location.search).get("l"), f = L.find(x => x.id === l); if (f) { S.mat = f.materie; S.cl = f.clasa; S.ids = new Set([f.id]); }
  drawCfg();
};
whenRole(() => { load(); });
