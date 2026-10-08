import { $, esc, toast, whenRole, db, collection, getDocs, setDoc, updateDoc, deleteDoc, doc, orderBy, query } from "./core.js";
import { firebaseConfig } from "./firebase.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
const users = async () => $("#users").innerHTML = (await getDocs(collection(db, "users"))).docs.map(d => { const u = d.data(); return `<li><span><b>${esc(u.nume || u.email)}</b><br><span class="tag">${esc(u.email)}</span></span><span class="row"><select data-role="${d.id}">${["personal", "admin"].map(r => `<option${r === u.role ? " selected" : ""}>${r}</option>`).join("")}</select><button class="btn o s" data-del="users/${d.id}">Elimină</button></span></li>`; }).join("");
const fb = async () => $("#fb").innerHTML = (await getDocs(query(collection(db, "feedback"), orderBy("d", "desc")))).docs.map(d => { const f = d.data(); return `<li><span>${esc(f.t)}<br><span class="tag">${esc(f.n || "anonim")} · ${esc(f.d.slice(0, 10))}</span></span><button class="btn o s" data-del="feedback/${d.id}">Șterge</button></li>`; }).join("") || '<li class="tag">Niciun mesaj.</li>';
$("#form").onsubmit = async e => {
  e.preventDefault();
  try {
    const sec = getAuth(initializeApp(firebaseConfig, "s" + Date.now())), em = $("#uE").value.trim(), c = await createUserWithEmailAndPassword(sec, em, $("#uP").value);
    await setDoc(doc(db, "users", c.user.uid), { email: em, nume: $("#uN").value, role: $("#uR").value }); await signOut(sec); e.target.reset(); toast("Cont creat"); users();
  } catch (x) { toast(x.message); }
};
$("#users").onchange = async e => { const id = e.target.dataset.role; if (id) { await updateDoc(doc(db, "users", id), { role: e.target.value }); toast("Rol actualizat"); } };
document.addEventListener("click", async e => { const b = e.target.closest("[data-del]"); if (!b || !confirm("Ștergi?")) return; const [c, id] = b.dataset.del.split("/"); await deleteDoc(doc(db, c, id)); c === "feedback" ? fb() : users(); });
whenRole(r => { const ok = r === "admin"; $("#deny").hidden = ok; $("#panel").hidden = !ok; if (ok) { fb(); users(); } });
