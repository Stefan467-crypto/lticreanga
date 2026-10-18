import { $, esc, toast, whenRole, db, collection, getDocs, setDoc, updateDoc, deleteDoc, doc } from "../core/core.js";
import { firebaseConfig } from "../core/firebase.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
const users = async () => $("#users").innerHTML = (await getDocs(collection(db, "users"))).docs.map(d => { const u = d.data(); return `<li><span><b>${esc(u.nume || u.email)}</b><br><span class="tag">${esc(u.email)}</span></span><span class="row"><select data-role="${d.id}">${[["admin", "Administrator"], ["profesor", "Profesor"], ["ce", "Membru CE"]].map(([r, l]) => `<option value="${r}"${r === u.role ? " selected" : ""}>${l}</option>`).join("")}</select><button class="btn o s" data-del="users/${d.id}">Elimină</button></span></li>`; }).join("");
$("#form").onsubmit = async e => {
  e.preventDefault();
  try {
    const sec = getAuth(initializeApp(firebaseConfig, "s" + Date.now())), em = $("#uE").value.trim(), c = await createUserWithEmailAndPassword(sec, em, $("#uP").value);
    await setDoc(doc(db, "users", c.user.uid), { email: em, nume: $("#uN").value, role: $("#uR").value }); await signOut(sec); e.target.reset(); toast("Cont creat"); users();
  } catch (x) { toast(x.message); }
};
$("#users").onchange = async e => { const id = e.target.dataset.role; if (id) { await updateDoc(doc(db, "users", id), { role: e.target.value }); toast("Rol actualizat"); } };
document.addEventListener("click", async e => { const b = e.target.closest("[data-del]"); if (!b || !confirm("Ștergi?")) return; const [c, id] = b.dataset.del.split("/"); await deleteDoc(doc(db, c, id)); users(); });
whenRole(r => { const ok = r === "admin"; $("#deny").hidden = ok; $("#panel").hidden = !ok; if (ok) users(); });
