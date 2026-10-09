import { $, esc, toast, whenRole, modal, can, db, collection, getDocs, setDoc, deleteDoc, doc } from "./core.js";
import { BELLS, CLASSES, LETTERS, SUBJECTS } from "./config.js";
const D = [["lu", "Luni"], ["ma", "Marți"], ["mi", "Miercuri"], ["jo", "Joi"], ["vi", "Vineri"]], N = BELLS.length, RX = /^(XII|XI|X|IX|VIII|VII|VI|V)\s*[-–]?\s*([A-Za-z])$/;
const slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const les = (o, d) => { const z = o.zile?.[d], a = Array.isArray(z) ? z : String(z || "").split("\n"); return Array.from({ length: N }, (_, i) => (a[i] || "").trim()); };
const mi = t => t.split(":").reduce((h, m) => h * 60 + +m), subIdx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; };
let all = [], tip = "elevi", cl = "", lt = "", sub = "Toate", cur = "", sel = null;
const stu = () => all.filter(o => o.tip === "elevi" && o.clasa), tea = () => all.filter(o => o.tip === "profesori").sort((a, b) => subIdx(a.materie) - subIdx(b.materie) || a.nume.localeCompare(b.nume, "ro"));
const chips = (arr, on, k, extra = () => "") => `<div class="tabs">${arr.map(([v, l]) => `<button data-${k}="${esc(v)}" aria-selected="${v === on}" class="${extra(v)}">${l}</button>`).join("")}</div>`;
const table = (o, title) => {
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), today = (now.getDay() + 6) % 7, wd = now.getDay() % 6 !== 0, lesNow = wd ? BELLS.findIndex(b => nm >= mi(b[1]) && nm < mi(b[2])) : -1;
  return `<h3 class="tt-t">${esc(title)}</h3><div class="tw"><table class="tt"><thead><tr><th>Ora</th>${D.map((d, i) => `<th class="${i === today && wd ? "today" : ""}">${d[1]}</th>`).join("")}</tr></thead><tbody>${BELLS.map((b, r) => `<tr><td>${b[0]}<small>${b[1]}</small></td>${D.map((d, i) => `<td class="${i === today && wd ? "today" : ""}${i === today && r === lesNow ? " now" : ""}">${esc(les(o, d[0])[r])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
};
const draw = () => {
  $("#tt").innerHTML = [["elevi", "Elevi"], ["profesori", "Profesori"]].map(([t, l]) => `<button data-t="${t}" aria-selected="${t === tip}">${l}</button>`).join("");
  let f = "", title = ""; sel = null;
  if (tip === "elevi") {
    const S = stu(), has = (c, l) => S.some(x => x.clasa === c && (!l || x.lit === l));
    if (!cl) cl = CLASSES.find(c => has(c)) || CLASSES[0]; if (!lt) lt = LETTERS.find(l => has(cl, l)) || LETTERS[0];
    sel = S.find(x => x.clasa === cl && x.lit === lt); title = `Clasa a ${cl}-a ${lt}`;
    f = `<p class="kick">Clasa</p>${chips(CLASSES.map(c => [c, c]), cl, "c", c => has(c) ? "has" : "")}<p class="kick">Litera</p>${chips(LETTERS.map(l => [l, l]), lt, "l", l => has(cl, l) ? "has" : "off")}`;
  } else {
    const T = tea(), subs = ["Toate", ...new Set(T.map(x => x.materie || "Alte"))], L = T.filter(x => sub === "Toate" || (x.materie || "Alte") === sub);
    if (!L.some(x => x.id === cur)) cur = L[0]?.id || ""; sel = L.find(x => x.id === cur); title = sel ? `${sel.nume} · ${sel.materie || ""}` : "";
    f = `<p class="kick">Materia</p>${chips(subs.map(s => [s, s]), sub, "s")}${L.length ? `<p class="kick">Profesor</p>${chips(L.map(x => [x.id, esc(x.nume) + (sub === "Toate" && x.materie ? `<small>${esc(x.materie)}</small>` : "")]), cur, "n")}` : ""}`;
  }
  $("#flt").innerHTML = f;
  $("#tbl").innerHTML = sel ? table(sel, title) : '<p class="tag mid">Orarul nu a fost publicat încă.</p>';
  $("#adm").hidden = !(sel && can("admin"));
};
const load = async () => { all = (await getDocs(collection(db, "orar"))).docs.map(d => { const o = { id: d.id, ...d.data() }; if (o.tip === "elevi" && !o.clasa) { const m = RX.exec(o.nume || ""); if (m) { o.clasa = m[1]; o.lit = m[2].toUpperCase(); } } return o; }); draw(); };
const edit = o => {
  const names = CLASSES.flatMap(c => LETTERS.map(l => c + " " + l)), opt = a => a.map(x => `<option>${x}</option>`).join("");
  const d = modal(o ? "Editează orarul" : "Orar nou", `<label>Pentru<select name="p"><option value="elevi">Elevi (clasă)</option><option value="profesori">Profesor</option></select></label>
<div class="grid" id="fe"><label>Clasa<select name="c">${opt(CLASSES)}</select></label><label>Litera<select name="l">${opt(LETTERS)}</select></label></div>
<div class="grid" id="fp"><label>Profesor<input name="n" placeholder="Nume Prenume"></label><label>Materia<select name="m">${opt(SUBJECTS)}</select></label></div>
<div class="tabs" id="dt">${D.map(([k, n], i) => `<button type="button" data-k="${k}" aria-selected="${!i}">${n}</button>`).join("")}</div>
${D.map(([k], i) => `<div class="day" data-k="${k}"${i ? " hidden" : ""}>${BELLS.map((b, r) => `<label class="lr"><span>${b[0]}<small>${b[1]}</small></span><input name="${k}${r}" list="dl" autocomplete="off" placeholder="—"></label>`).join("")}</div>`).join("")}<datalist id="dl"></datalist>`, async f => {
    const E = f.elements, t = E.p.value, zile = {}; D.forEach(([k]) => zile[k] = BELLS.map((_, r) => E[k + r].value.trim()));
    let id, data;
    if (t === "elevi") { id = `elevi-${E.c.value}-${E.l.value}`; data = { tip: t, clasa: E.c.value, lit: E.l.value, nume: `${E.c.value} ${E.l.value}`, zile }; }
    else { const n = E.n.value.trim(); if (!n) throw new Error("Scrie numele profesorului"); id = "profesori-" + slug(n); data = { tip: t, nume: n, materie: E.m.value, zile }; }
    await setDoc(doc(db, "orar", id), data); if (o && o.id !== id) await deleteDoc(doc(db, "orar", o.id));
    tip = t; if (t === "elevi") { cl = data.clasa; lt = data.lit; } else { sub = data.materie; cur = id; } toast("Salvat"); load();
  });
  const f = d.querySelector("form"), E = f.elements;
  const sync = () => { const t = E.p.value === "profesori"; f.querySelector("#fe").hidden = t; f.querySelector("#fp").hidden = !t; f.querySelector("#dl").innerHTML = (t ? names : SUBJECTS).map(x => `<option value="${x}">`).join(""); };
  E.p.onchange = sync; E.p.value = o?.tip || tip;
  if (o) { if (o.tip === "elevi") { E.c.value = o.clasa; E.l.value = o.lit; } else { E.n.value = o.nume; E.m.value = o.materie || SUBJECTS[0]; } D.forEach(([k]) => les(o, k).forEach((v, r) => E[k + r].value = v)); }
  else if (tip === "elevi") { E.c.value = cl; E.l.value = lt; }
  sync();
  f.querySelector("#dt").onclick = e => { const k = e.target.dataset.k; if (!k) return; f.querySelectorAll("#dt button").forEach(b => b.setAttribute("aria-selected", b.dataset.k === k)); f.querySelectorAll(".day").forEach(x => x.hidden = x.dataset.k !== k); };
};
$("#ow").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.t) tip = d.t; if (d.c) { cl = d.c; lt = LETTERS.find(l => stu().some(x => x.clasa === cl && x.lit === l)) || lt; } if (d.l) lt = d.l; if (d.s !== undefined) sub = d.s; if (d.n) cur = d.n;
  if (d.t || d.c || d.l || d.s !== undefined || d.n) draw();
};
$("#addO").onclick = () => edit(); $("#editO").onclick = () => sel && edit(sel);
$("#delO").onclick = async () => { if (sel && confirm("Ștergi acest orar?")) { await deleteDoc(doc(db, "orar", sel.id)); toast("Șters"); load(); } };
$("#prtO").onclick = () => print();
whenRole(() => load().catch(() => $("#tbl").innerHTML = '<p class="tag mid">Orarul nu poate fi încărcat.</p>'));
