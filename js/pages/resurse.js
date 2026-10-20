import { $, esc, toast, whenRole, modal, can, upload, fileBtns, db, collection, getDocs, addDoc, deleteDoc, doc, query, where } from "../core/core.js";
import { SUBJECTS, TYPES, classesOf, classRange, namesOf } from "../core/config.js";
/* Platforma națională EduResurse (Ministerul Educației): manuale PDF și interactive, lecții video, resurse pe trepte de învățământ */
const EDU_LINKS = [["Manuale PDF", "Manualele școlare oficiale, gata de descărcat", "catalog?type=pdf_textbook"], ["Manuale interactive", "Manuale digitale cu exerciții și animații", "catalog?type=digital_textbook"], ["Lecții video", "Explicații video și pregătire pentru examene", "catalog?type=video_lesson"], ["Clasele V–IX", "Toate resursele pentru gimnaziu", "catalog?education_category_id=3"], ["Clasele X–XII", "Toate resursele pentru liceu", "catalog?education_category_id=4"], ["Inteligența Artificială", "Materiale despre IA pentru elevi și profesori", "catalog?level=ai"], ["Ghidare în carieră", "Alegerea profesiei și a studiilor", "catalog?level=cariera"], ["Stare de bine", "Bunăstare emoțională și sănătate", "catalog?level=staredebine"]];
const EDU = `<section class="edu" aria-labelledby="edut" style="padding:2.4rem 0 0"><p class="kick">Platforma națională</p><h2 id="edut" style="margin-top:.2rem">EduResurse</h2><p class="tag">Resurse oficiale ale Ministerului Educației și Cercetării, gratuite: manuale, lecții video, fișe și teste pe materii și clase.</p><div class="grid">${EDU_LINKS.map(([t, d, u]) => `<a class="card cat" target="_blank" rel="noopener" href="https://eduresurse.gov.md/${u}"><b>${t}</b><span>${d} ↗</span></a>`).join("")}</div><p style="margin-top:1rem"><a class="btn o s" target="_blank" rel="noopener" href="https://eduresurse.gov.md/">Deschide eduresurse.gov.md ↗</a></p></section>`;
const m = new URLSearchParams(location.search).get("m");
if (!m) { $("#g").innerHTML = SUBJECTS.map(s => `<a class="card cat" href="resurse?m=${encodeURIComponent(s)}"><b>${esc(s)}</b><span>${classRange(s)} · Deschide →</span></a>`).join(""); $("#g").insertAdjacentHTML("afterend", EDU); }
else {
  $("#g").hidden = true; $("#m").hidden = false; $("#back").hidden = false; $("#t").textContent = m; document.title = m + " · Liceul Teoretic";
  let R = [], cl = "Toate", ty = "Toate";
  const chips = (id, arr, cur, k) => $(id).innerHTML = ["Toate", ...arr].map(c => `<button aria-selected="${c === cur}" data-${k}="${c}">${c}</button>`).join("");
  const draw = () => {
    chips("#chips", classesOf(m), cl, "c"); chips("#tchips", TYPES, ty, "y");
    $("#list").innerHTML = R.filter(r => (cl === "Toate" || r.clasa === "Toate" || r.clasa === cl) && (ty === "Toate" || r.tip === ty)).map(r => `<li><span><b>${esc(r.titlu)}</b><br><span class="tag">${r.clasa && r.clasa !== "Toate" ? "Clasa " + esc(r.clasa) + " · " : ""}${esc(r.tip)}</span></span><span class="row">${fileBtns(r.url, r.nume)}${can("resurse") ? `<button class="btn o s" data-id="${r.id}">Șterge</button>` : ""}</span></li>`).join("") || '<li class="tag">Nu sunt resurse.</li>';
  };
  const load = async () => { R = (await getDocs(query(collection(db, "resurse"), where("materie", "in", namesOf(m))))).docs.map(d => ({ id: d.id, ...d.data() })); draw(); };
  $("#m").onclick = e => { const d = e.target.dataset; if (d.c) cl = d.c; if (d.y) ty = d.y; if (d.c || d.y) draw(); };
  $("#list").onclick = async e => { const id = e.target.dataset.id; if (id && confirm("Ștergi?")) { await deleteDoc(doc(db, "resurse", id)); load(); } };
  $("#addR").onclick = () => modal("Resursă nouă", `<div class="grid"><label>Titlu<input name="n" required></label><label>Clasa<select name="c">${["Toate", ...classesOf(m)].map(c => `<option value="${c}">${c === "Toate" ? "Toate clasele" : "Clasa " + c}</option>`).join("")}</select></label><label>Tip<select name="t">${TYPES.map(t => `<option>${t}</option>`).join("")}</select></label><label>Link<input name="u" type="url" placeholder="https://"></label><label>sau fișier<input name="f" type="file"></label></div>`, async f => {
    const E = f.elements, file = E.f.files[0]; let url = E.u.value.trim(); if (file) url = await upload(file); if (!url) throw new Error("Adaugă un link sau un fișier");
    await addDoc(collection(db, "resurse"), { clasa: E.c.value, materie: m, titlu: E.n.value, tip: E.t.value, url, ...(file ? { nume: file.name } : {}) }); toast("Adăugat"); load();
  }, "Adaugă");
  whenRole(() => load().catch(() => $("#list").innerHTML = '<li class="tag">Resursele nu pot fi încărcate.</li>'));
}
