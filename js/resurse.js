import { $, esc, toast, whenRole, modal, role, upload, safeUrl, db, collection, getDocs, addDoc, deleteDoc, doc, query, where } from "./core.js";
import { SUBJECTS, CLASSES, TYPES } from "./config.js";
const m = new URLSearchParams(location.search).get("m");
if (!m) $("#g").innerHTML = SUBJECTS.map(s => `<a class="card cat" href="resurse.html?m=${encodeURIComponent(s)}"><b>${esc(s)}</b><span>Deschide →</span></a>`).join("");
else {
  $("#g").hidden = true; $("#m").hidden = false; $("#back").hidden = false; $("#t").textContent = m; document.title = m + " · Liceul Teoretic";
  let R = [], cl = "Toate", ty = "Toate";
  const chips = (id, arr, cur, k) => $(id).innerHTML = ["Toate", ...arr].map(c => `<button aria-selected="${c === cur}" data-${k}="${c}">${c}</button>`).join("");
  const draw = () => {
    chips("#chips", CLASSES, cl, "c"); chips("#tchips", TYPES, ty, "y");
    $("#list").innerHTML = R.filter(r => (cl === "Toate" || r.clasa === "Toate" || r.clasa === cl) && (ty === "Toate" || r.tip === ty)).map(r => `<li><span><b>${esc(r.titlu)}</b><br><span class="tag">${r.clasa && r.clasa !== "Toate" ? "Clasa " + esc(r.clasa) + " · " : ""}${esc(r.tip)}</span></span><span class="row"><a class="btn s" href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">Deschide</a>${role !== "vizitator" ? `<button class="btn o s" data-id="${r.id}">Șterge</button>` : ""}</span></li>`).join("") || '<li class="tag">Nu sunt resurse.</li>';
  };
  const load = async () => { R = (await getDocs(query(collection(db, "resurse"), where("materie", "==", m)))).docs.map(d => ({ id: d.id, ...d.data() })); draw(); };
  $("#m").onclick = e => { const d = e.target.dataset; if (d.c) cl = d.c; if (d.y) ty = d.y; if (d.c || d.y) draw(); };
  $("#list").onclick = async e => { const id = e.target.dataset.id; if (id && confirm("Ștergi?")) { await deleteDoc(doc(db, "resurse", id)); load(); } };
  $("#addR").onclick = () => modal("Resursă nouă", `<div class="grid"><label>Titlu<input name="n" required></label><label>Clasa<select name="c">${["Toate", ...CLASSES].map(c => `<option value="${c}">${c === "Toate" ? "Toate clasele" : "Clasa " + c}</option>`).join("")}</select></label><label>Tip<select name="t">${TYPES.map(t => `<option>${t}</option>`).join("")}</select></label><label>Link<input name="u" type="url" placeholder="https://"></label><label>sau fișier<input name="f" type="file"></label></div>`, async f => {
    const E = f.elements; let url = E.u.value; if (E.f.files[0]) url = await upload(E.f.files[0]); if (!url) throw new Error("Adaugă un link sau un fișier");
    await addDoc(collection(db, "resurse"), { clasa: E.c.value, materie: m, titlu: E.n.value, tip: E.t.value, url }); toast("Adăugat"); load();
  }, "Adaugă");
  whenRole(() => load().catch(() => $("#list").innerHTML = '<li class="tag">Resursele nu pot fi încărcate.</li>'));
}
