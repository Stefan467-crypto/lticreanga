// Constructor de teste: profesorul alcătuiește singur testul, exercițiu cu exercițiu (fără generator).
// Ciorna rămâne pe dispozitiv. PDF-ul (test + barem) se creează la sfârșit, cu aceleași funcții ca generatorul (js/teste/pdf.js).
import { esc, toast, modal } from "../core/core.js";
import { wt } from "../teste/engine.js?v=24";

const OL = "ABCDEFGH";
export const TYPES = [
  { id: "mcq", n: "Grilă", d: "Întrebare cu 2–6 variante, una corectă" },
  { id: "tf", n: "Adevărat / Fals", d: "O afirmație pe care elevul o judecă" },
  { id: "blank", n: "Completare", d: "Propoziție cu un spațiu liber" },
  { id: "match", n: "Asociere", d: "Două coloane de legat între ele" },
  { id: "num", n: "Problemă cu rezultat numeric", d: "Răspunsul este un număr" },
  { id: "prob", n: "Problemă cu rezolvare", d: "Elevul scrie rezolvarea; baremul e text" },
  { id: "open", n: "Răspuns scurt / dezvoltat", d: "Răspuns în câteva rânduri" },
  { id: "essay", n: "Eseu / redactare", d: "Text lung, evaluat pe criterii" },
  { id: "src", n: "Item pe sursă", d: "Un text-sursă (document, fragment, date) și o sarcină" },
];
const TN = Object.fromEntries(TYPES.map(t => [t.id, t.n])), LABS = ["Sursa", "Textul", "Documentul", "Situația", "Datele"];
const DEFP = { mcq: 1, tf: 1, blank: 1, match: 2, num: 3, prob: 5, open: 3, essay: 10, src: 3 };
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : NaN; };
const fmt = n => String(+(+n).toFixed(2)).replace(".", ",");
const lines = s => String(s).split("\n").map(x => x.trim()).filter(Boolean);

/* ---------- logică pură (testabilă fără browser) ---------- */
export const kindOf = it => it.q.s ? "src" : it.q.essay ? "essay" : it.q.t;
export const emptyDraft = () => ({ items: [], parts: null, minute: 45, title: "", big: false });
// aduce ciorna la forma corectă: itemii sortați stabil după secțiune, secțiunile în limite
export function norm(B) {
  if (!B.parts || !B.parts.length) { B.parts = null; B.items.forEach(x => { x.sc = 0; }); return B; }
  B.items.forEach(x => { x.sc = Math.min(Math.max(0, x.sc | 0), B.parts.length - 1); });
  B.items = B.items.map((x, i) => [x, i]).sort((a, b) => a[0].sc - b[0].sc || a[1] - b[1]).map(x => x[0]); return B;
}
// forma așteptată de pdf.js (aceeași ca la testele generate)
export function toV(B) {
  norm(B); const it = B.items;
  return { q: it.map(x => x.q), k: it.map(x => x.k), src: it.map(() => ""), p: it.map(x => x.p), sc: it.map(x => x.sc), ...(B.parts ? { parts: B.parts.map(x => ({ t: x.t, d: x.d })) } : {}), total: it.length, ai: false };
}
export const points = B => B.items.reduce((a, x) => a + x.p, 0);
export function check(B) {
  if (!B.items.length) return "Adaugă cel puțin un exercițiu";
  const bad = B.items.findIndex(x => !(x.p > 0) || !String(x.q.q || "").trim()); return bad >= 0 ? `Exercițiul ${bad + 1} nu e complet` : "";
}
// citește și validează un exercițiu din formular; aruncă Error cu mesaj pentru profesor
export function readItem(type, E, init) {
  const q0 = String(E.q.value).trim(); if (!q0) throw new Error("Scrie enunțul");
  const p = num(E.p.value); if (!(p > 0)) throw new Error("Punctajul trebuie să fie mai mare ca 0");
  const rows = E.r && E.r.value !== "" ? Math.round(num(E.r.value)) : 0, q = { t: type, q: q0 }; let k;
  if (type === "mcq") {
    const o = [0, 1, 2, 3, 4, 5].map(j => E["o" + j].value.trim()); let n = o.length; while (n && !o[n - 1]) n--;
    if (n < 2) throw new Error("Scrie cel puțin două variante"); if (o.slice(0, n).some(x => !x)) throw new Error("Completează variantele în ordine, fără goluri");
    k = +E.k.value; if (k >= n) throw new Error("Varianta corectă trebuie să fie una completată"); q.o = o.slice(0, n);
  } else if (type === "tf") k = E.k.value === "1";
  else if (type === "blank") {
    if (!/_{2,}|…|\.{4,}/.test(q0)) throw new Error("Pune ______ în enunț, în locul cuvântului care lipsește");
    k = E.k.value.split(",").map(x => x.trim()).filter(Boolean); if (!k.length) throw new Error("Scrie răspunsul corect");
  } else if (type === "match") {
    q.L = lines(E.L.value); q.R = lines(E.R.value); if (q.L.length < 2) throw new Error("Scrie cel puțin două noțiuni în coloana din stânga"); if (q.R.length < q.L.length) throw new Error("Coloana din dreapta trebuie să aibă cel puțin tot atâtea rânduri");
    if (q.R.length > 8) throw new Error("Cel mult 8 rânduri în coloana din dreapta"); k = E.k.value.split(",").map(x => OL.indexOf(x.trim().toUpperCase()));
    if (k.length !== q.L.length || k.some(x => x < 0 || x >= q.R.length)) throw new Error("Scrie câte o literă pentru fiecare noțiune din stânga (ex. B,A,C)");
  } else if (type === "num") { const v = num(E.k.value); if (!isFinite(v)) throw new Error("Rezultatul trebuie să fie un număr"); k = { v }; }
  else { k = String(E.k.value).trim(); if (!k) throw new Error("Scrie baremul / răspunsul-model, pentru fișierul cu barem"); if (type === "essay") { q.t = "open"; q.essay = true; } }
  if (rows > 0 && ["prob", "open", "essay", "src"].includes(type)) q.rows = Math.min(rows, 40);
  if (type === "src") {
    const lab = E.lab.value, S = [0, 1, 2, 3].map(j => E["s" + j].value.trim()); let n = S.length; while (n && !S[n - 1]) n--; if (!n) throw new Error("Scrie sursa (textul de studiat)"); if (S.slice(0, n).some(x => !x)) throw new Error("Completează sursele în ordine, fără goluri");
    q.t = "open"; q.s = S.slice(0, n).map((t, j) => ({ l: n === 1 ? lab : `${lab} ${"ABCD"[j]}`, t })); q.g = init?.q?.g || "b" + Date.now().toString(36) + Math.floor(Math.random() * 1e3);
  }
  return { q, k, p, sc: init?.sc ?? 0 };
}

/* ---------- interfață ---------- */
function fieldsOf(type, it, B, isNew) {
  const q = it?.q || {}, k = it?.k, tx = (n, l, v, r = 3, ph = "") => `<label>${l}<textarea name="${n}" rows="${r}" placeholder="${esc(ph)}">${esc(v ?? "")}</textarea></label>`;
  let h = tx("q", type === "tf" ? "Afirmația" : type === "blank" ? "Enunțul (pune ______ în locul cuvântului lipsă)" : "Enunțul exercițiului", q.q, type === "essay" ? 4 : 3);
  if (type === "src") {
    const S = q.s || [{ l: "Sursa", t: "" }], lab = (S[0]?.l || "Sursa").replace(/ [A-D]$/, "");
    h = `<label>Materialul se numește<select name="lab">${LABS.map(x => `<option${x === lab ? " selected" : ""}>${x}</option>`).join("")}</select></label>` + [0, 1, 2, 3].map(j => tx("s" + j, `${j ? "Încă o sursă (opțional)" : "Sursa — textul pe care îl studiază elevul"}`, S[j]?.t, j ? 3 : 6)).join("") + `<p class="tag">Sursele se aplică tuturor sarcinilor aceleiași surse (se tipăresc o singură dată).</p>` + tx("q", "Sarcina pentru elev", q.q, 3);
  }
  if (type === "mcq") { const o = q.o || ["", "", "", ""]; h += [0, 1, 2, 3, 4, 5].map(j => `<label>Varianta ${OL[j]}${j < 2 ? " *" : " (opțional)"}<input name="o${j}" value="${esc(o[j] || "")}"></label>`).join("") + `<label>Varianta corectă<select name="k">${[0, 1, 2, 3, 4, 5].map(j => `<option value="${j}"${j === (k ?? 0) ? " selected" : ""}>${OL[j]}</option>`).join("")}</select></label>`; }
  else if (type === "tf") h += `<label>Răspunsul corect<select name="k"><option value="1"${k !== false ? " selected" : ""}>Adevărat</option><option value="0"${k === false ? " selected" : ""}>Fals</option></select></label>`;
  else if (type === "blank") h += `<label>Răspunsuri acceptate (separate prin virgulă)<input name="k" value="${esc(Array.isArray(k) ? k.join(", ") : "")}"></label>`;
  else if (type === "match") h += tx("L", "Coloana din stânga (un rând = o noțiune)", (q.L || []).join("\n"), 4) + tx("R", "Coloana din dreapta (un rând = un răspuns; poți pune unul în plus)", (q.R || []).join("\n"), 4) + `<label>Perechile corecte — literele din dreapta, în ordinea noțiunilor (ex. B,A,C)<input name="k" value="${esc(Array.isArray(k) ? k.map(x => OL[x]).join(",") : "")}"></label>`;
  else if (type === "num") h += `<label>Rezultatul corect (număr)<input name="k" inputmode="decimal" value="${k ? esc(String(k.v).replace(".", ",")) : ""}"></label>`;
  else h += tx("k", type === "essay" ? "Criterii de evaluare și punctaj (pentru barem)" : "Barem / răspuns-model (pentru fișierul cu barem)", typeof k === "string" ? k : "", 5);
  h += `<div class="grid"><label>Puncte<input name="p" type="number" step="0.5" min="0.5" value="${it?.p ?? DEFP[type]}"></label>`;
  if (["prob", "open", "essay", "src", "num"].includes(type) && type !== "num") h += `<label>Rânduri de scris în PDF (gol = automat)<input name="r" type="number" min="1" max="40" value="${q.rows ?? ""}"></label>`;
  h += `</div>`;
  if (B.parts) h += `<label>Secțiunea<select name="sc">${B.parts.map((x, j) => `<option value="${j}"${j === (it?.sc ?? B.parts.length - 1) ? " selected" : ""}>${esc(x.t)}</option>`).join("")}</select></label>`;
  return h;
}
const prev = it => {
  const q = it.q, k = it.k, t = kindOf(it), cut = (s, n = 150) => { s = String(s); return s.length > n ? s.slice(0, n) + "…" : s; };
  if (t === "mcq") return q.o.map((o, j) => j === k ? `<b>${OL[j]}) ${esc(o)} ✓</b>` : `${OL[j]}) ${esc(o)}`).join("  ·  ");
  if (t === "tf") return `Răspuns: <b>${k ? "Adevărat" : "Fals"}</b>`;
  if (t === "blank") return `Răspuns: <b>${esc(k.join(" / "))}</b>`;
  if (t === "match") return q.L.map((x, j) => `${j + 1}. ${esc(cut(x, 40))} → <b>${OL[k[j]]}</b>`).join("  ·  ");
  if (t === "num") return `Rezultat: <b>${esc(fmt(k.v))}</b>`;
  return `Barem: ${esc(cut(k))}`;
};

export function createBuilder(ctx) { // ctx: { meta(), defTitle(), hasLesson(), suggest(type, have) → {q,k}|null, slug(s) }
  let B = emptyDraft(), root = null, adding = false, useSug = true, addSc = null;
  try { const s = JSON.parse(localStorage.tbld || "null"); if (s && Array.isArray(s.items)) B = norm({ ...emptyDraft(), ...s }); } catch (e) { }
  const save = () => { try { localStorage.tbld = JSON.stringify(B); } catch (e) { } };
  const change = () => { norm(B); save(); render(); };

  function itemHtml(it, i, prevIt, n) {
    const q = it.q, t = kindOf(it), src = q.s && q.g !== prevIt?.q.g ? `<div class="srcbox">${q.s.map(x => `<blockquote><b>${esc(x.l)}</b><p>${esc(x.t)}</p></blockquote>`).join("")}</div>` : "";
    const sameA = B.items[i - 1] && B.items[i - 1].sc === it.sc, sameB = B.items[i + 1] && B.items[i + 1].sc === it.sc;
    return `<div class="bi">${src}<div class="qh"><b>${n}</b><span class="pill">${TN[t]}</span><span class="tag pts">${fmt(it.p)} p.</span><span class="qa">${sameA ? `<button type="button" class="ib sm" data-a="up" data-i="${i}" aria-label="Mută sus">↑</button>` : ""}${sameB ? `<button type="button" class="ib sm" data-a="dn" data-i="${i}" aria-label="Mută jos">↓</button>` : ""}<button type="button" class="ib sm" data-a="ed" data-i="${i}" aria-label="Editează" title="Editează">✎</button>${t === "src" ? `<button type="button" class="ib sm" data-a="task" data-i="${i}" aria-label="Încă o sarcină la aceeași sursă" title="Încă o sarcină la aceeași sursă">＋</button>` : ""}<button type="button" class="ib sm" data-a="dup" data-i="${i}" aria-label="Copiază" title="Copiază">⧉</button><button type="button" class="ib sm" data-a="rm" data-i="${i}" aria-label="Șterge" title="Șterge">×</button></span></div><p class="qt">${esc(q.q)}</p><p class="tag bprev">${prev(it)}</p></div>`;
  }
  function html() {
    const T = points(B), n = B.items.length; let list = "", c = 0;
    const row = i => { const h = itemHtml(B.items[i], i, B.items[i - 1], ++c); return h; };
    if (B.parts) B.parts.forEach((pt, s) => { list += `<div class="bsec"><div><b>${esc(pt.t)}</b><span class="tag">${esc(pt.d)}</span></div><span class="qa"><button type="button" class="ib sm" data-a="pe" data-i="${s}" aria-label="Editează secțiunea">✎</button><button type="button" class="ib sm" data-a="pr" data-i="${s}" aria-label="Șterge secțiunea">×</button></span></div>`; B.items.forEach((it, i) => { if (it.sc === s) list += row(i); }); list += `<button type="button" class="btn o s badd" data-a="addin" data-i="${s}">＋ Exercițiu în „${esc(pt.t)}”</button>`; });
    else B.items.forEach((_, i) => { list += row(i); });
    const pal = adding ? `<div class="bpal">${TYPES.map(t => `<button type="button" class="bt" data-a="new" data-t="${t.id}"><b>${t.n}</b><span>${t.d}</span></button>`).join("")}${ctx.hasLesson() ? `<label class="bsug"><input type="checkbox" data-a="sug" ${useSug ? "checked" : ""}> Propune un exercițiu din lecția aleasă (îl poți modifica)</label>` : ""}</div>` : "";
    return `<div class="bld"><label class="f">Titlul testului<input data-b="title" value="${esc(B.title)}" placeholder="${esc(ctx.defTitle() || "Test")}"></label>
<div class="fgrid"><label class="f">Timp de lucru (minute, 0 = nu se afișează)<input data-b="minute" type="number" min="0" max="240" value="${B.minute}"></label><label class="f">Mărimea textului<select data-b="big"><option value="0"${B.big ? "" : " selected"}>Normală</option><option value="1"${B.big ? " selected" : ""}>Mare (clase mici)</option></select></label></div>
<p class="kick">Secțiuni (părți ale testului, cu instrucțiuni)</p><div class="tabs seg"><button type="button" data-a="sec0" aria-selected="${!B.parts}">Fără secțiuni</button><button type="button" data-a="sec1" aria-selected="${!!B.parts}">Secțiuni proprii</button>${B.parts ? `<button type="button" class="o" data-a="pn">＋ Secțiune</button>` : ""}</div>
<div class="blist">${n ? list : `<p class="tag mid">Testul e gol. Apasă „Adaugă exercițiu” și alege tipul.</p>`}</div>
<button type="button" class="btn${n ? " o" : ""}" data-a="add" style="width:100%;margin-top:.8rem">${adding ? "× Închide lista" : "＋ Adaugă exercițiu"}</button>${pal}
<p class="capi bsum"><b>${n}</b> ${n === 1 ? "exercițiu" : "exerciții"} · <b>${fmt(T)}</b> puncte</p>
<div class="row" style="margin-top:.4rem"><button type="button" class="btn" data-a="pdf">⬇ Test (PDF)</button><button type="button" class="btn o" data-a="key">⬇ Barem (PDF)</button><button type="button" class="btn o" data-a="both">⬇ Ambele</button><button type="button" class="btn o" data-a="clear">Test nou</button></div>
<p class="tag">Ciorna se păstrează pe acest dispozitiv. PDF-ul se creează doar când îl descarci.</p></div>`;
  }
  function render(el) { if (el) root = el; if (!root) return; root.innerHTML = html(); root.onclick = onClick; root.oninput = onInput; root.onchange = onInput; }
  function onInput(e) { e.stopPropagation(); const t = e.target; if (t.dataset.a === "sug") { useSug = t.checked; return; } const f = t.dataset.b; if (!f) return; if (f === "title") B.title = t.value; if (f === "minute") B.minute = Math.max(0, Math.min(240, +t.value || 0)); if (f === "big") B.big = t.value === "1"; save(); }

  async function openEditor(type, i, init) { // i = indexul exercițiului editat (sau null = exercițiu nou); init = conținut de pornire
    const isNew = i === null, it = init || (isNew ? null : B.items[i]), title = (isNew ? "Exercițiu nou · " : "Editează · ") + TN[type];
    modal(title, fieldsOf(type, it, B, isNew), async f => {
      const r = readItem(type, f.elements, isNew ? init : B.items[i]); r.sc = B.parts ? +(f.elements.sc?.value ?? B.parts.length - 1) : 0;
      if (isNew) { if (init?.sc !== undefined && !f.elements.sc) r.sc = init.sc; B.items.push(r); }
      else { B.items[i] = r; }
      if (r.q.s) B.items.forEach((x, j) => { if (x.q.g === r.q.g && x !== r) B.items[j] = { ...x, q: { ...x.q, s: r.q.s } }; }); // sursele se schimbă la tot grupul
      change(); if (isNew) { adding = false; render(); }
    }, isNew ? "Adaugă în test" : "Salvează");
  }
  async function newItem(type, sc) {
    addSc = sc ?? null; let init = null;
    if (useSug && ctx.hasLesson() && type !== "essay") { try { const have = new Set(B.items.map(x => x.q.q)); const sg = await ctx.suggest(type === "src" ? "src" : type, have); if (sg) init = { q: sg.q.s ? { ...sg.q, g: undefined } : sg.q, k: sg.k, p: DEFP[type], sc: addSc ?? (B.parts ? B.parts.length - 1 : 0) }; /* o sursă propusă primește grup nou, altfel s-ar uni cu alte surse */ else toast("Nu am o propunere din lecție pentru acest tip. Scrie exercițiul."); } catch (e) { } }
    if (!init && addSc !== null) init = { q: {}, p: DEFP[type], sc: addSc }; else if (init === null && B.parts) init = { q: {}, p: DEFP[type], sc: B.parts.length - 1 };
    openEditor(type, null, init && { ...init, q: { ...init.q } });
  }
  async function exportPdf(kind) {
    const err = check(B); if (err) return toast(err); toast("Se creează PDF-ul…");
    const P2 = await import("../teste/pdf.js?v=24"), V = [toV(B)], base = ctx.meta(), titlu = B.title.trim() || ctx.defTitle() || "Test", meta = { ...base, tema: titlu }, nm = ctx.slug(titlu) || "test";
    if (kind !== "key") P2.save(await P2.toPdf(P2.testPages(meta, V, { titlu, minute: B.minute || 0, big: B.big })), `test-${nm}.pdf`);
    if (kind === "both") await new Promise(r => setTimeout(r, 700));
    if (kind !== "pdf") P2.save(await P2.toPdf(P2.keyPages(meta, V, { titlu })), `barem-${nm}.pdf`);
    toast(kind === "both" ? "Test și barem descărcate" : "PDF descărcat");
  }
  function onClick(e) {
    const b = e.target.closest("button"); e.stopPropagation(); if (!b || !b.dataset.a) return; const a = b.dataset.a, i = +b.dataset.i;
    if (a === "add") { adding = !adding; addSc = null; return render(); }
    if (a === "new") return newItem(b.dataset.t, addSc);
    if (a === "addin") { adding = true; addSc = i; render(); return root.querySelector(".bpal")?.scrollIntoView({ behavior: "smooth", block: "center" }); }
    if (a === "ed") { const it = B.items[i]; return openEditor(kindOf(it), i); }
    if (a === "task") { const it = B.items[i]; return openEditor("src", null, { q: { s: it.q.s.map(x => ({ ...x })), g: it.q.g }, p: DEFP.src, sc: it.sc }); }
    if (a === "dup") { B.items.splice(i + 1, 0, JSON.parse(JSON.stringify(B.items[i]))); return change(); }
    if (a === "rm") { if (!confirm("Ștergi acest exercițiu?")) return; B.items.splice(i, 1); return change(); }
    if (a === "up" || a === "dn") { const j = a === "up" ? i - 1 : i + 1; [B.items[i], B.items[j]] = [B.items[j], B.items[i]]; return change(); }
    if (a === "sec0") { if (B.parts && B.items.length && !confirm("Elimini secțiunile? Exercițiile rămân în ordinea lor.")) return; B.parts = null; return change(); }
    if (a === "sec1") { if (!B.parts) { B.parts = [{ t: "Partea I", d: "Rezolvă cerințele." }]; B.items.forEach(x => { x.sc = 0; }); } return change(); }
    if (a === "pn" || a === "pe") {
      const cur = a === "pe" ? B.parts[i] : { t: `Partea ${["I", "a II-a", "a III-a", "a IV-a", "a V-a", "a VI-a"][B.parts.length] || B.parts.length + 1}`, d: "Rezolvă cerințele." };
      return modal(a === "pe" ? "Editează secțiunea" : "Secțiune nouă", `<label>Titlul secțiunii<input name="t" required value="${esc(cur.t)}"></label><label>Instrucțiunea pentru elev<input name="d" value="${esc(cur.d)}"></label>`, async f => { const o = { t: f.elements.t.value.trim() || cur.t, d: f.elements.d.value.trim() }; if (a === "pe") B.parts[i] = o; else B.parts.push(o); change(); }, "Salvează");
    }
    if (a === "pr") { if (B.parts.length < 2) { if (B.items.length && !confirm("Elimini secțiunea? Exercițiile rămân în test.")) return; B.parts = null; return change(); } if (!confirm("Ștergi secțiunea? Exercițiile ei trec în secțiunea dinainte.")) return; B.parts.splice(i, 1); B.items.forEach(x => { if (x.sc === i) x.sc = Math.max(0, i - 1); else if (x.sc > i) x.sc--; }); return change(); }
    if (a === "pdf" || a === "key" || a === "both") return exportPdf(a);
    if (a === "clear") { if (B.items.length && !confirm("Ștergi tot și începi un test nou?")) return; B = emptyDraft(); adding = false; return change(); }
  }
  return { render, get draft() { return B; } };
}
