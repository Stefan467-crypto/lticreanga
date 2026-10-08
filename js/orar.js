import { $, esc, toast, whenRole, modal, can, db, collection, getDocs, setDoc, deleteDoc, doc } from "./core.js";
import { BELLS } from "./config.js";
const D = [["lu", "Luni"], ["ma", "Marți"], ["mi", "Miercuri"], ["jo", "Joi"], ["vi", "Vineri"]], slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let all = [], tip = "elevi", cur = "";
const draw = () => {
  $("#tt").innerHTML = ["elevi", "profesori"].map(t => `<button aria-selected="${t === tip}" data-t="${t}">${t === "elevi" ? "Elevi" : "Profesori"}</button>`).join("");
  const l = all.filter(x => x.tip === tip).sort((a, b) => a.nume.localeCompare(b.nume, "ro", { numeric: true }));
  if (!l.some(x => x.id === cur)) cur = l[0]?.id || "";
  $("#sel").innerHTML = l.map(x => `<option value="${x.id}"${x.id === cur ? " selected" : ""}>${esc(x.nume)}</option>`).join("");
  $("#sel").hidden = !l.length; const o = l.find(x => x.id === cur), today = (new Date().getDay() + 5) % 7;
  $("#tbl").innerHTML = o ? `<table class="tt"><thead><tr><th>Ora</th>${D.map((d, i) => `<th class="${i === today ? "today" : ""}">${d[1]}</th>`).join("")}</tr></thead><tbody>${BELLS.map((b, r) => `<tr><td>${b[0]}<small>${b[1]}</small></td>${D.map((d, i) => `<td class="${i === today ? "today" : ""}">${esc((o.zile?.[d[0]] || "").split("\n")[r] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>` : '<p class="tag mid">Orarul nu a fost publicat încă.</p>';
  $("#adm").hidden = !(o && can("admin"));
};
const load = async () => { all = (await getDocs(collection(db, "orar"))).docs.map(d => ({ id: d.id, ...d.data() })); draw(); };
const edit = o => { const d = modal(o ? "Editează orarul" : "Orar nou", `<div class="grid"><label>Pentru<select name="p"><option value="elevi">Elevi (clasă)</option><option value="profesori">Profesor</option></select></label><label>Nume<input name="n" required placeholder="ex. VII A sau Popescu Ion"></label></div><p class="tag">Pentru fiecare zi: un rând = o oră (rând gol = fără oră).</p>${D.map(d => `<label>${d[1]}<textarea name="${d[0]}" rows="4"></textarea></label>`).join("")}`, async f => {
  const x = f.elements, nume = x.n.value.trim(), z = {}; D.forEach(d => z[d[0]] = x[d[0]].value.replace(/\s+$/, ""));
  const id = x.p.value + "-" + slug(nume); await setDoc(doc(db, "orar", id), { tip: x.p.value, nume, zile: z }); tip = x.p.value; cur = id; toast("Salvat"); load();
}); if (o) { const f = d.querySelector("form").elements; f.p.value = o.tip; f.n.value = o.nume; D.forEach(z => f[z[0]].value = o.zile?.[z[0]] || ""); } };
$("#tt").onclick = e => { if (e.target.dataset.t) { tip = e.target.dataset.t; draw(); } };
$("#sel").onchange = e => { cur = e.target.value; draw(); };
$("#addO").onclick = () => edit();
$("#editO").onclick = () => edit(all.find(x => x.id === cur));
$("#delO").onclick = async () => { if (cur && confirm("Ștergi acest orar?")) { await deleteDoc(doc(db, "orar", cur)); toast("Șters"); load(); } };
whenRole(r => { load().catch(() => $("#tbl").innerHTML = '<p class="tag mid">Orarul nu poate fi încărcat.</p>');  });
