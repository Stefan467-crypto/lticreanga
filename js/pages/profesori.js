import { $, esc, toast, whenRole, modal, sheet, can, upload, safeUrl, db, collection, getDocs, addDoc, setDoc, deleteDoc, doc } from "../core/core.js";
import { SUBJECTS, canon } from "../core/config.js";
import { nz } from "../teste/engine.js";
let T = [], f = "Toate";
const idx = s => { if (s === "Conducere") return -1; const i = SUBJECTS.indexOf(canon(s)); return i < 0 ? 99 : i; }, ini = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const contact = c => { const d = c.replace(/\D/g, ""); return /@/.test(c) ? `<a href="mailto:${esc(c)}">${esc(c)}</a>` : d.length >= 6 ? `<a href="tel:${esc(c.replace(/[^\d+]/g, ""))}">${esc(c)}</a>` : esc(c); };
const isDir = t => t.rol === "admin-director", grp = t => t.materie || (isDir(t) ? "Conducere" : "Alte");
const ct = t => [t.tel, t.emailPub || "", !t.tel && !t.emailPub ? t.contact : ""].filter(Boolean);
const av = (t, big) => t.img ? `<img class="av${big ? " big" : ""}" loading="lazy" alt="" src="${esc(safeUrl(t.img))}">` : `<div class="av ini${big ? " big" : ""}">${esc(ini(t.nume))}</div>`;
let q = "";
const draw = () => {
  const subs = [...new Set(T.map(t => grp(t)))].sort((a, b) => idx(a) - idx(b));
  $("#sf").innerHTML = `<option value="Toate">Toate disciplinele (${T.length})</option>` + subs.map(x => `<option value="${esc(x)}"${x === f ? " selected" : ""}>${esc(x)} (${T.filter(t => (grp(t)) === x).length})</option>`).join("");
  const l = T.filter(t => (f === "Toate" || (grp(t)) === f) && (!q || nz(t.nume + " " + (t.materie || "") + (isDir(t) ? " director" : "")).includes(nz(q))));
  $("#cnt").textContent = `${l.length} ${l.length === 1 ? "profesor" : "profesori"}`;
  $("#tl").innerHTML = l.map(t => `<article class="post tc${isDir(t) ? " dir" : ""}" tabindex="0" data-id="${t.id}">${av(t)}<div class="pb">${isDir(t) ? '<span class="pill dir">Director</span>' : t.materie ? `<span class="pill">${esc(t.materie)}</span>` : ""}<h3>${esc(t.nume)}</h3>${isDir(t) && t.materie ? `<p class="ct">${esc(t.materie)}</p>` : ""}${ct(t).map(c => `<p class="ct">${esc(c)}</p>`).join("")}${t.uid ? `<button type="button" class="btn o s" data-msg="${t.id}">Scrie mesaj</button>` : ""}</div></article>`).join("") || '<p class="tag mid">Niciun profesor găsit.</p>';
};
const load = async () => { T = (await getDocs(collection(db, "profesori"))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => isDir(b) - isDir(a) || idx(grp(a)) - idx(grp(b)) || a.nume.localeCompare(b.nume, "ro")); if (f !== "Toate" && !T.some(t => (grp(t)) === f)) f = "Toate"; draw(); };
const form = t => modal(t ? "Editează profesorul" : "Profesor nou", `<div class="grid"><label>Nume<input name="n" required value="${esc(t?.nume || "")}"></label><label>Materia<select name="m">${SUBJECTS.map(s => `<option${s === t?.materie ? " selected" : ""}>${s}</option>`).join("")}</select></label><label>Contact (telefon sau e-mail)<input name="c" value="${esc(t?.contact || "")}"></label><label>Poza<input name="f" type="file" accept="image/*"></label></div>`, async x => {
  const E = x.elements, file = E.f.files[0], v = { nume: E.n.value.trim(), materie: E.m.value, contact: E.c.value.trim(), ts: t?.ts || Date.now() };
  if (file) v.img = await upload(file); else if (t?.img) v.img = t.img;
  t ? await setDoc(doc(db, "profesori", t.id), v) : await addDoc(collection(db, "profesori"), v); toast("Salvat"); load();
});
const msg = t => modal("Mesaj pentru " + t.nume, `<label>Nume Prenume<input name="n" required maxlength="80" autocomplete="name"></label><label>Mesaj<textarea name="m" rows="6" required maxlength="2000"></textarea></label>`, async f => {
  if (Date.now() - (+localStorage.msgT || 0) < 20000) throw new Error("Așteaptă puțin înainte de următorul mesaj");
  await addDoc(collection(db, "mesaje"), { nume: f.elements.n.value.trim(), mesaj: f.elements.m.value.trim(), toUid: t.uid, toNume: t.nume, ts: Date.now() });
  try { localStorage.msgT = Date.now(); } catch (e) { } toast("Mesajul a fost trimis");
}, "Trimite");
const open = el => { const t = T.find(x => x.id === el.dataset.id); if (!t) return;
  const d = sheet(t.nume, `<div class="tcs">${av(t, 1)}${isDir(t) ? '<span class="pill dir">Director</span>' : ""}${t.materie ? `<span class="pill">${esc(t.materie)}</span>` : ""}${ct(t).map(c => `<p>${contact(c)}</p>`).join("")}${t.uid ? `<button type="button" class="btn s" id="wm">Scrie mesaj</button>` : ""}${can("admin") ? (t.uid ? `<div class="row" style="justify-content:center"><a class="btn o s" href="admin?edit=${esc(t.uid)}">Editează în Panou</a></div>` : `<p class="tag">Fără cont de utilizator.</p><div class="row" style="justify-content:center"><a class="btn s" href="admin?link=${esc(t.id)}">Creează cont</a><button class="btn o s" id="ed">Editează</button><button class="btn o s" id="rm">Șterge</button></div>`) : ""}</div>`);
  const w = d.querySelector("#wm"); if (w) w.onclick = () => { d.close(); msg(t); };
  const e = d.querySelector("#ed"); if (e) { e.onclick = () => { d.close(); form(t); }; d.querySelector("#rm").onclick = async () => { if (confirm("Ștergi profesorul?")) { await deleteDoc(doc(db, "profesori", t.id)); d.close(); load(); } }; } };
$("#sf").onchange = e => { f = e.target.value; draw(); };
$("#qs").oninput = e => { q = e.target.value; draw(); };
$("#tl").onclick = e => { const mb = e.target.closest("[data-msg]"); if (mb) return msg(T.find(x => x.id === mb.dataset.msg)); const c = e.target.closest(".post"); if (c) open(c); };
$("#tl").onkeydown = e => { if (e.key === "Enter" && e.target.classList.contains("post")) open(e.target); };
$("#addP").onclick = () => { location.href = "admin?nou=1"; }; // profesorii noi se adaugă împreună cu contul, din Panou
whenRole(() => load().catch(() => $("#tl").innerHTML = '<p class="tag mid">Lista nu poate fi încărcată.</p>'));
