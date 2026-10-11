import { $, esc, toast, whenRole, modal, db, doc, getDoc, setDoc } from "./core.js";
const iso = d => d.toISOString().slice(0, 10); let day = new Date(), text = "";
const load = async () => {
  $("#cd").textContent = day.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" }); text = "";
  try { const s = await getDoc(doc(db, "meniu", iso(day))); if (s.exists()) text = s.data().text; } catch (e) { toast("Meniul nu poate fi încărcat"); }
  $("#menu").innerHTML = text ? text.split("\n").filter(l => l.trim()).map(l => `<li>${esc(l.replace(/^-\s*/, ""))}</li>`).join("") : '<li class="tag">Meniul pentru această zi nu a fost publicat.</li>';
};
const go = n => { day.setDate(day.getDate() + n); load(); };
$("#pd").onclick = () => go(-1); $("#nd").onclick = () => go(1);
$("#editM").onclick = () => modal("Meniul din " + iso(day), '<p class="tag">Un rând = un fel de mâncare.</p><textarea name="t" rows="8"></textarea>', async f => { text = f.elements.t.value; await setDoc(doc(db, "meniu", iso(day)), { text }); toast("Salvat"); load(); }).querySelector("textarea").value = text;
whenRole(load);
