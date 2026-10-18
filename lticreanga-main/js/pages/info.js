import { $, esc, toast, whenRole, can, modal, upload, safeUrl, db, collection, getDocs, addDoc, deleteDoc, doc } from "../core/core.js";
// Pagina „Informații”: documente (regulamente, acte). Adminul adaugă cu butonul + (denumire + fișier).
const FILE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
const COL = "regulamente";
async function load() {
  const box = $("#docs");
  try {
    const l = (await getDocs(collection(db, COL))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    box.innerHTML = l.map(x => `<div class="dw"><a class="q" href="${esc(safeUrl(x.url || ""))}" target="_blank" rel="noopener"><i>${FILE}</i><b>${esc(x.titlu || "Document")}</b><span>Deschide documentul →</span></a>${can("admin") ? `<button class="del" type="button" data-id="${x.id}" aria-label="Șterge documentul" title="Șterge">×</button>` : ""}</div>`).join("") || '<p class="empty">Nu sunt documente încă.</p>';
  } catch (e) { box.innerHTML = '<p class="empty">Documentele nu pot fi încărcate.</p>'; }
}
$("#docs").onclick = async e => { const b = e.target.closest(".del"); if (!b || !confirm("Ștergi documentul?")) return; await deleteDoc(doc(db, COL, b.dataset.id)); toast("Șters"); load(); };
$("#addD").onclick = () => modal("Adaugă document", '<label>Denumirea<input name="t" required placeholder="ex. Regulamentul intern"></label><label>Fișierul<input name="f" type="file" required></label>', async f => {
  const E = f.elements, file = E.f.files[0]; if (!file) throw new Error("Alege un fișier");
  const url = await upload(file); await addDoc(collection(db, COL), { titlu: E.t.value.trim(), url, ts: Date.now() }); toast("Adăugat"); load();
}, "Adaugă");
whenRole(load);
