import { $, esc, toast, whenRole, modal, sheet, can, upload, safeUrl, db, collection, getDocs, addDoc, setDoc, deleteDoc, doc } from "./core.js";
import { SUBJECTS } from "./config.js";
let T = [], f = "Toate";
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, ini = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const contact = c => { const d = c.replace(/\D/g, ""); return /@/.test(c) ? `<a href="mailto:${esc(c)}">${esc(c)}</a>` : d.length >= 6 ? `<a href="tel:${esc(c.replace(/[^\d+]/g, ""))}">${esc(c)}</a>` : esc(c); };
const av = (t, big) => t.img ? `<img class="av${big ? " big" : ""}" loading="lazy" alt="" src="${esc(safeUrl(t.img))}">` : `<div class="av ini${big ? " big" : ""}">${esc(ini(t.nume))}</div>`;
const draw = () => {
  const subs = ["Toate", ...new Set(T.map(t => t.materie || "Alte"))];
  $("#fl").innerHTML = subs.map(s => `<button aria-selected="${s === f}" data-s="${esc(s)}">${esc(s)}</button>`).join("");
  $("#tl").innerHTML = T.filter(t => f === "Toate" || (t.materie || "Alte") === f).map(t => `<article class="post tc" tabindex="0" data-id="${t.id}">${av(t)}<div class="pb">${t.materie ? `<span class="pill">${esc(t.materie)}</span>` : ""}<h3>${esc(t.nume)}</h3>${t.contact ? `<p>${esc(t.contact)}</p>` : ""}</div></article>`).join("") || '<p class="tag mid">Nu sunt profesori adăugați.</p>';
};
const load = async () => { T = (await getDocs(collection(db, "profesori"))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => idx(a.materie) - idx(b.materie) || a.nume.localeCompare(b.nume, "ro")); if (f !== "Toate" && !T.some(t => (t.materie || "Alte") === f)) f = "Toate"; draw(); };
const form = t => modal(t ? "Editează profesorul" : "Profesor nou", `<div class="grid"><label>Nume<input name="n" required value="${esc(t?.nume || "")}"></label><label>Materia<select name="m">${SUBJECTS.map(s => `<option${s === t?.materie ? " selected" : ""}>${s}</option>`).join("")}</select></label><label>Contact (telefon sau e-mail)<input name="c" value="${esc(t?.contact || "")}"></label><label>Poza<input name="f" type="file" accept="image/*"></label></div>`, async x => {
  const E = x.elements, file = E.f.files[0], v = { nume: E.n.value.trim(), materie: E.m.value, contact: E.c.value.trim(), ts: t?.ts || Date.now() };
  if (file) v.img = await upload(file); else if (t?.img) v.img = t.img;
  t ? await setDoc(doc(db, "profesori", t.id), v) : await addDoc(collection(db, "profesori"), v); toast("Salvat"); load();
});
const open = el => { const t = T.find(x => x.id === el.dataset.id); if (!t) return;
  const d = sheet(t.nume, `<div class="tcs">${av(t, 1)}${t.materie ? `<span class="pill">${esc(t.materie)}</span>` : ""}${t.contact ? `<p>${contact(t.contact)}</p>` : ""}${can("admin") ? '<div class="row" style="justify-content:center"><button class="btn o s" id="ed">Editează</button><button class="btn o s" id="rm">Șterge</button></div>' : ""}</div>`);
  const e = d.querySelector("#ed"); if (e) { e.onclick = () => { d.close(); form(t); }; d.querySelector("#rm").onclick = async () => { if (confirm("Ștergi profesorul?")) { await deleteDoc(doc(db, "profesori", t.id)); d.close(); load(); } }; } };
$("#fl").onclick = e => { if (e.target.dataset.s) { f = e.target.dataset.s; draw(); } };
$("#tl").onclick = e => { const c = e.target.closest(".post"); if (c) open(c); };
$("#tl").onkeydown = e => { if (e.key === "Enter" && e.target.classList.contains("post")) open(e.target); };
$("#addP").onclick = () => form();
whenRole(() => load().catch(() => $("#tl").innerHTML = '<p class="tag mid">Lista nu poate fi încărcată.</p>'));
