import { $, esc, toast, whenRole, can, user, db, collection, getDocs, query, where, updateDoc, deleteDoc, doc } from "../core/core.js";
// Mesajele trimise din pagina Echipa didactică. Profesorul vede doar mesajele pentru el; administratorul le vede pe toate.
let M = [];
const when = t => new Date(t).toLocaleString("ro-RO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const draw = () => {
  $("#cnt").textContent = `${M.length} ${M.length === 1 ? "mesaj" : "mesaje"}`;
  $("#ml").innerHTML = M.map(m => `<li class="msg${m.citit ? "" : " new"}"><div class="mh"><b>${esc(m.nume)}</b><span class="tag">${esc(when(m.ts))}${m.toUid !== user?.uid ? " · pentru " + esc(m.toNume || "") : ""}</span></div><p>${esc(m.mesaj)}</p><button class="btn o s" data-rm="${m.id}">Șterge</button></li>`).join("") || '<li class="tag">Nu ai mesaje.</li>';
};
const load = async () => {
  const col = collection(db, "mesaje"), snap = await getDocs(can("admin") ? col : query(col, where("toUid", "==", user.uid)));
  M = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.ts - a.ts); draw();
  M.filter(m => !m.citit && m.toUid === user.uid).forEach(m => updateDoc(doc(db, "mesaje", m.id), { citit: true }).catch(() => { }));
};
$("#ml").onclick = async e => { const id = e.target.dataset.rm; if (!id || !confirm("Ștergi mesajul?")) return; await deleteDoc(doc(db, "mesaje", id)); M = M.filter(m => m.id !== id); draw(); };
whenRole(() => { const ok = can("mesaje"); $("#deny").hidden = ok; $("#box").hidden = !ok; if (ok) load().catch(() => toast("Mesajele nu pot fi încărcate")); });
