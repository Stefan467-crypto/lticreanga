import { $, esc, toast, whenRole, modal, can, saveBlob, db, collection, getDocs, setDoc, deleteDoc, doc, writeBatch } from "../core/core.js";
import { parseFiles, slug } from "./orar-import.js?v=28";
import { buildExport } from "./orar-export.js?v=28";
import { BELLS, CLASSES, LETTERS, SUBJECTS, canon } from "../core/config.js";
const D = [["lu", "Luni"], ["ma", "Marți"], ["mi", "Miercuri"], ["jo", "Joi"], ["vi", "Vineri"]], N = BELLS.length, RX = /^(XII|XI|X|IX|VIII|VII|VI|V)\s*[-–]?\s*([A-Za-z])$/;
const les = (o, d) => { const z = o.zile?.[d], a = Array.isArray(z) ? z : String(z || "").split("\n"); return Array.from({ length: N }, (_, i) => (a[i] || "").trim()); };
const mi = t => t.split(":").reduce((h, m) => h * 60 + +m), subIdx = s => { const i = SUBJECTS.indexOf(canon(s)); return i < 0 ? 99 : i; };
let all = [], staff = [], tip = "elevi", cl = "", lt = "", sub = "Toate", cur = "", sel = null;
// „Echipa didactică” (colecția profesori, legată de conturi): directorul apare primul în orarul profesorilor
const nk = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).sort().join(" ");
const member = o => (o.uid && staff.find(s => s.uid === o.uid)) || staff.find(s => nk(s.nume) === nk(o.nume));
const isDir = o => member(o)?.rol === "admin-director";
const stu = () => all.filter(o => o.tip === "elevi" && o.clasa).sort((a, b) => CLASSES.indexOf(a.clasa) - CLASSES.indexOf(b.clasa) || LETTERS.indexOf(a.lit) - LETTERS.indexOf(b.lit)),
  tea = () => all.filter(o => o.tip === "profesori").sort((a, b) => isDir(b) - isDir(a) || subIdx(a.materie) - subIdx(b.materie) || a.nume.localeCompare(b.nume, "ro"));
const chips = (arr, on, k, extra = () => "") => `<div class="tabs">${arr.map(([v, l]) => `<button data-${k}="${esc(v)}" aria-selected="${v === on}" class="${extra(v)}">${l}</button>`).join("")}</div>`;
const SH = ["Lun", "Mar", "Mie", "Joi", "Vin"], wk = () => { const w = (new Date().getDay() + 6) % 7; return w < 5 ? w : 0; };
let di = wk();
const table = (o, title) => {
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), today = (now.getDay() + 6) % 7, wd = now.getDay() % 6 !== 0, lesNow = wd ? BELLS.findIndex(b => nm >= mi(b[1]) && nm < mi(b[2])) : -1;
  const cnt = i => les(o, D[i][0]).filter(Boolean).length, day = les(o, D[di][0]), last = day.reduce((a, x, i) => x ? i : a, -1);
  const mob = `<div class="tt-m"><div class="dtabs">${D.map((d, i) => `<button data-di="${i}" aria-selected="${i === di}" class="${i === today && wd ? "tdy" : ""}">${SH[i]}<small>${cnt(i)} ore</small></button>`).join("")}</div>${last < 0 ? '<p class="tag mid" style="padding:1.5rem 0">Nu sunt ore în această zi.</p>' : `<ul class="lessons">${BELLS.slice(0, last + 1).map((b, r) => `<li class="les${day[r] ? "" : " empty"}${di === today && r === lesNow ? " now" : ""}"><span class="ln"><b>${b[0]}</b><small>${b[1]}</small></span><span class="lt">${day[r] ? esc(day[r]) : "Fereastră"}</span>${di === today && r === lesNow ? "<em>Acum</em>" : ""}</li>`).join("")}</ul>`}</div>`;
  const wide = `<div class="tt-w tw"><table class="tt"><thead><tr><th>Ora</th>${D.map((d, i) => `<th class="${i === today && wd ? "today" : ""}">${d[1]}</th>`).join("")}</tr></thead><tbody>${BELLS.map((b, r) => `<tr><td>${b[0]}<small>${b[1]}</small></td>${D.map((d, i) => `<td class="${i === today && wd ? "today" : ""}${i === today && r === lesNow ? " now" : ""}">${esc(les(o, d[0])[r])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return `<h3 class="tt-t">${esc(title)}</h3>${mob}${wide}`;
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
    const T = tea(), subs = ["Toate", ...new Set([...T].sort((a, b) => subIdx(a.materie) - subIdx(b.materie)).map(x => x.materie || "Alte"))], L = T.filter(x => sub === "Toate" || (x.materie || "Alte") === sub);
    if (!L.some(x => x.id === cur)) cur = L[0]?.id || ""; sel = L.find(x => x.id === cur); title = sel ? `${sel.nume} · ${sel.materie || ""}` : "";
    f = `<p class="kick">Materia</p>${chips(subs.map(s => [s, s]), sub, "s")}${L.length ? `<p class="kick">Profesor</p>${chips(L.map(x => [x.id, esc(x.nume) + (isDir(x) ? "<small>Director</small>" : sub === "Toate" && x.materie ? `<small>${esc(x.materie)}</small>` : "")]), cur, "n")}` : ""}`;
  }
  $("#flt").innerHTML = f;
  $("#tbl").innerHTML = sel ? table(sel, title) : '<p class="tag mid">Orarul nu a fost publicat încă.</p>';
  $("#adm").hidden = !(sel && can("admin"));
};
const load = async () => { staff = (await getDocs(collection(db, "profesori")).catch(() => ({ docs: [] }))).docs.map(d => ({ id: d.id, ...d.data() })); all = (await getDocs(collection(db, "orar"))).docs.map(d => { const o = { id: d.id, ...d.data() }; if (o.tip === "elevi" && !o.clasa) { const m = RX.exec(o.nume || ""); if (m) { o.clasa = m[1]; o.lit = m[2].toUpperCase(); } } return o; }); draw(); };
const edit = o => {
  const names = CLASSES.flatMap(c => LETTERS.map(l => c + " " + l)), opt = a => a.map(x => `<option>${x}</option>`).join("");
  const d = modal(o ? "Editează orarul" : "Orar nou", `<label>Pentru<select name="p"><option value="elevi">Elevi (clasă)</option><option value="profesori">Profesor</option></select></label>
<div class="grid" id="fe"><label>Clasa<select name="c">${opt(CLASSES)}</select></label><label>Litera<select name="l">${opt(LETTERS)}</select></label></div>
<div class="grid" id="fp"><label>Profesor<input name="n" placeholder="Nume Prenume" list="stf" autocomplete="off"></label><label>Materia<select name="m">${opt(SUBJECTS)}</select></label></div>
<div class="tabs" id="dt">${D.map(([k, n], i) => `<button type="button" data-k="${k}" aria-selected="${!i}">${n}</button>`).join("")}</div>
${D.map(([k], i) => `<div class="day" data-k="${k}"${i ? " hidden" : ""}>${BELLS.map((b, r) => `<label class="lr"><span>${b[0]}<small>${b[1]}</small></span><input name="${k}${r}" list="dl" autocomplete="off" placeholder="—"></label>`).join("")}</div>`).join("")}<datalist id="dl"></datalist><datalist id="stf">${staff.map(m => `<option value="${esc(m.nume)}">`).join("")}</datalist>`, async f => {
    const E = f.elements, t = E.p.value, zile = {}; D.forEach(([k]) => zile[k] = BELLS.map((_, r) => E[k + r].value.trim()));
    let id, data;
    if (t === "elevi") { id = `elevi-${E.c.value}-${E.l.value}`; data = { tip: t, clasa: E.c.value, lit: E.l.value, nume: `${E.c.value} ${E.l.value}`, zile }; }
    else { const n = E.n.value.trim(); if (!n) throw new Error("Scrie numele profesorului"); id = "profesori-" + slug(n); const m = member({ nume: n }); data = { tip: t, nume: n, materie: E.m.value, zile, ...(m?.uid ? { uid: m.uid } : {}) }; }
    await setDoc(doc(db, "orar", id), data); if (o && o.id !== id) await deleteDoc(doc(db, "orar", o.id));
    tip = t; if (t === "elevi") { cl = data.clasa; lt = data.lit; } else { sub = data.materie; cur = id; } toast("Salvat"); load();
  });
  const f = d.querySelector("form"), E = f.elements;
  const sync = () => { const t = E.p.value === "profesori"; f.querySelector("#fe").hidden = t; f.querySelector("#fp").hidden = !t; f.querySelector("#dl").innerHTML = (t ? names : SUBJECTS).map(x => `<option value="${x}">`).join(""); };
  E.p.onchange = sync; E.p.value = o?.tip || tip;
  E.n.onchange = () => { const m = member({ nume: E.n.value }); if (m) { E.n.value = m.nume; const c = canon(m.materie); if (SUBJECTS.includes(c)) E.m.value = c; } }; // numele ales din echipa didactică aduce și materia
  if (o) { if (o.tip === "elevi") { E.c.value = o.clasa; E.l.value = o.lit; } else { E.n.value = o.nume; E.m.value = canon(o.materie) || SUBJECTS[0]; } D.forEach(([k]) => les(o, k).forEach((v, r) => E[k + r].value = v)); }
  else if (tip === "elevi") { E.c.value = cl; E.l.value = lt; }
  sync();
  f.querySelector("#dt").onclick = e => { const k = e.target.dataset.k; if (!k) return; f.querySelectorAll("#dt button").forEach(b => b.setAttribute("aria-selected", b.dataset.k === k)); f.querySelectorAll(".day").forEach(x => x.hidden = x.dataset.k !== k); };
};
$("#ow").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.t) tip = d.t; if (d.c) { cl = d.c; lt = LETTERS.find(l => stu().some(x => x.clasa === cl && x.lit === l)) || lt; } if (d.l) lt = d.l; if (d.s !== undefined) sub = d.s; if (d.n) cur = d.n;
  if (d.di !== undefined) di = +d.di; if (d.t || d.c || d.l || d.s !== undefined || d.n || d.di !== undefined) draw();
};
/* ── Import din fișier (.xlsx / .docx / .csv): fișierul NU se salvează, doar orarele extrase ── */
const importFile = () => {
  let res = null;
  const d = modal("Importă orarul din fișier", `<p class="tag">Alege fișierul cu orarul (Excel .xlsx sau Word .docx / .doc). Poți alege mai multe fișiere deodată: orarul elevilor și al profesorilor. Fișierul nu se păstrează pe site, se citește doar orarul din el.</p>
<label>Fișierul<input name="f" type="file" accept=".xlsx,.xls,.docx,.doc,.csv,.ods" multiple></label><div id="pv"></div>
<label class="chk"><input type="checkbox" name="rp"> Șterge orarele vechi care nu apar în fișier</label>`, async f => {
    if (!res) throw new Error("Alege un fișier cu orarul");
    const E = f.elements, ops = [...res.students.map(o => [`elevi-${o.clasa}-${o.lit}`, o]), ...res.teachers.map(o => { const m = member(o); return [`profesori-${slug(o.nume)}`, m?.uid ? { ...o, uid: m.uid } : o]; })], keep = new Set(ops.map(x => x[0]));
    const tipuri = new Set([res.students.length && "elevi", res.teachers.length && "profesori"].filter(Boolean)), del = E.rp.checked ? all.filter(o => tipuri.has(o.tip) && !keep.has(o.id)).map(o => o.id) : [];
    const all2 = [...ops.map(([id, o]) => ({ s: [id, o] })), ...del.map(id => ({ d: id }))];
    for (let i = 0; i < all2.length; i += 400) { const b = writeBatch(db); all2.slice(i, i + 400).forEach(x => x.s ? b.set(doc(db, "orar", x.s[0]), x.s[1]) : b.delete(doc(db, "orar", x.d))); await b.commit(); }
    toast(`Importat: ${res.students.length} clase, ${res.teachers.length} profesori`); load();
  }, "Salvează orarul");
  const f = d.querySelector("form"), go = f.querySelector(".btn"), pv = f.querySelector("#pv"); go.disabled = true;
  f.elements.f.onchange = async () => {
    res = null; go.disabled = true; const files = [...f.elements.f.files]; if (!files.length) { pv.innerHTML = ""; return; }
    pv.innerHTML = '<p class="tag">Se citește…</p>';
    try {
      res = await parseFiles(files, all);
      const L = o => res.lessons(o), chip = t => `<span class="pill">${esc(t)}</span>`;
      pv.innerHTML = `<div class="capi"><b>Am găsit:</b> ${res.students.length} clase · ${res.teachers.length} profesori</div>
${res.students.length ? `<p class="kick">Clase</p><div class="row" style="gap:.4rem">${res.students.map(o => chip(`${o.nume} · ${L(o)} ore`)).join("")}</div>` : ""}
${res.teachers.length ? `<p class="kick">Profesori</p><div class="row" style="gap:.4rem">${res.teachers.map(o => chip(`${o.nume}${o.materie ? " · " + o.materie : ""}`)).join("")}</div>` : ""}
${res.warn.map(w => `<p class="tag warn">${esc(w)}</p>`).join("")}<p class="tag" style="margin-top:.8rem">Verifică lista, apoi apasă „Salvează orarul”. Orarele cu aceeași clasă sau același profesor se înlocuiesc.</p>`;
      go.disabled = false;
    } catch (e) { pv.innerHTML = `<p class="tag warn">${esc(e.message)}</p>`; }
  };
};
/* ── Export în fișier (Excel / Word), în aceeași formă ca fișierele care se importă ── */
const exportFile = () => modal("Exportă orarul în fișier", `<p class="tag">Fișierul are aceeași formă ca orarul tipărit (clasele pe coloane, respectiv profesorii pe rânduri) și poate fi importat înapoi.</p>
<div class="grid"><label>Ce exporți<select name="w"><option value="ambele">Elevii și profesorii</option><option value="elevi">Doar orarul elevilor</option><option value="profesori">Doar orarul profesorilor</option></select></label><label>Format<select name="f"><option value="xlsx">Excel (.xlsx)</option><option value="docx">Word (.docx)</option></select></label></div>`, async f => {
  const E = f.elements, { blob, name } = buildExport({ students: stu(), teachers: tea(), what: E.w.value, fmt: E.f.value }, { les, D, N });
  saveBlob(blob, name); toast("Se descarcă " + name);
}, "Descarcă");
$("#impO").onclick = importFile; $("#expO").onclick = exportFile;
$("#addO").onclick = () => edit(); $("#editO").onclick = () => sel && edit(sel);
$("#delO").onclick = async () => { if (sel && confirm("Ștergi acest orar?")) { await deleteDoc(doc(db, "orar", sel.id)); toast("Șters"); load(); } };
$("#prtO").onclick = () => print();
whenRole(() => load().catch(() => $("#tbl").innerHTML = '<p class="tag mid">Orarul nu poate fi încărcat.</p>'));
