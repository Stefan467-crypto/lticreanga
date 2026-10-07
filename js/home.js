import { $, esc, toast, whenRole, modal, role, user, upload, safeUrl, db, collection, getDocs, addDoc, deleteDoc, doc } from "./core.js";
import { CATS, BELLS } from "./config.js";
const all = async c => (await getDocs(collection(db, c))).docs.map(d => ({ id: d.id, ...d.data() }));
const p2 = n => String(n).padStart(2, "0"), iso = d => d.toISOString().slice(0, 10);
$("#today").textContent = new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
/* orar + ora curentă */
const mi = t => t.split(":").reduce((h, m) => h * 60 + +m), now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
let idx = -1, st = now.getDay() % 6 === 0 ? "Astăzi nu sunt ore." : nm < mi(BELLS[0][1]) ? "Prima oră începe la " + BELLS[0][1] : "Programul de azi s-a încheiat.";
if (now.getDay() % 6) BELLS.forEach((b, i) => { if (nm >= mi(b[1]) && nm < mi(b[2])) { idx = i; st = `Acum: ora ${b[0]}, până la ${b[2]}`; } else if (BELLS[i + 1] && nm >= mi(b[2]) && nm < mi(BELLS[i + 1][1])) st = "Pauză până la " + BELLS[i + 1][1]; });
$("#now").textContent = st;
$("#bt").innerHTML = BELLS.map((b, i) => `<tr${i === idx ? ' class="now"' : ""}><td>${b[0]}</td><td>${b[1]}–${b[2]}</td><td>${b[3]}</td></tr>`).join("");
/* anunțuri */
let A = [], filt = "All", n = 6;
const drawA = () => {
  $("#tabs").innerHTML = ["All", ...CATS].map(t => `<button aria-selected="${t === filt}" data-t="${esc(t)}">${t === "All" ? "Toate" : t}</button>`).join("");
  const l = A.filter(a => filt === "All" || a.c === filt);
  $("#posts").innerHTML = l.slice(0, n).map(a => `<article class="post">${a.img ? `<img loading="lazy" alt="" src="${esc(safeUrl(a.img))}">` : ""}<p class="kick">${esc(a.c)} · ${esc(a.d)}</p><h3>${esc(a.t)}</h3><p>${esc(a.b)}</p>${role !== "vizitator" ? `<button class="btn o s" data-del="anunturi/${a.id}">Șterge</button>` : ""}</article>`).join("") || '<p class="tag">Nu sunt anunțuri.</p>';
  $("#more").hidden = l.length <= n;
};
const loadA = async () => { A = (await all("anunturi")).sort((x, y) => (y.d || "").localeCompare(x.d || "")); drawA(); };
$("#tabs").onclick = e => { if (e.target.dataset.t) { filt = e.target.dataset.t; n = 6; drawA(); } };
$("#more").onclick = () => { n += 6; drawA(); };
$("#addA").onclick = () => modal("Anunț nou", `<div class="grid"><label>Titlu<input name="t" required></label><label>Categorie<select name="c">${CATS.map(c => `<option>${c}</option>`).join("")}</select></label><label>Imagine<input name="f" type="file" accept="image/*"></label></div><label>Text<textarea name="b" rows="4" required></textarea></label><label class="ck"><input type="checkbox" name="s">Postează și pe Facebook și Instagram</label>`, async f => {
  const E = f.elements, file = E.f.files[0], social = E.s.checked, a = { t: E.t.value, c: E.c.value, b: E.b.value, d: iso(new Date()), uid: user.uid, social };
  if (file) a.img = await upload(file);
  await addDoc(collection(db, "anunturi"), a); toast(social && !file ? "Publicat. Instagram cere imagine — doar Facebook" : "Publicat"); loadA();
}, "Publică");
/* calendar */
let E = [], cur = new Date();
const drawE = () => {
  const y = cur.getFullYear(), m = cur.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), pre = `${y}-${p2(m + 1)}`, today = iso(new Date());
  $("#label").textContent = cur.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  let h = ["L", "M", "M", "J", "V", "S", "D"].map(d => `<div class="h">${d}</div>`).join("") + "<div style='visibility:hidden'></div>".repeat(first);
  for (let d = 1; d <= days; d++) { const ds = `${pre}-${p2(d)}`; h += `<div class="${ds === today ? "t" : ""}"><b>${d}</b>${E.filter(e => e.d === ds).map(e => `<span class="ev ${esc(e.k)}" title="${esc(e.t)}">${esc(e.t)}</span>`).join("")}</div>`; }
  $("#cal").innerHTML = h;
  $("#evs").innerHTML = E.filter(e => e.d.startsWith(pre)).sort((a, b) => a.d.localeCompare(b.d)).map(e => `<li><span><b>${e.d.slice(8)}.${e.d.slice(5, 7)}</b> — ${esc(e.t)}</span>${role !== "vizitator" ? `<button class="btn o s" data-del="evenimente/${e.id}">Șterge</button>` : ""}</li>`).join("") || '<li class="tag">Niciun eveniment în această lună.</li>';
};
const loadE = async () => { E = await all("evenimente"); drawE(); };
$("#pm").onclick = () => { cur.setMonth(cur.getMonth() - 1); drawE(); };
$("#nm").onclick = () => { cur.setMonth(cur.getMonth() + 1); drawE(); };
$("#addE").onclick = () => modal("Eveniment nou", '<div class="grid"><label>Titlu<input name="t" required></label><label>Data<input name="d" type="date" required></label><label>Tip<select name="k"><option value="">Eveniment</option><option value="vac">Vacanță</option><option value="teza">Teză</option></select></label></div>', async f => { const E = f.elements; await addDoc(collection(db, "evenimente"), { t: E.t.value, d: E.d.value, k: E.k.value }); toast("Adăugat"); loadE(); }, "Adaugă");
/* ștergere + feedback */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-del]"); if (!b || !confirm("Ștergi?")) return;
  const [c, id] = b.dataset.del.split("/"); await deleteDoc(doc(db, c, id)); c === "anunturi" ? loadA() : loadE();
});
$("#ff").onsubmit = async e => { e.preventDefault(); try { await addDoc(collection(db, "feedback"), { n: $("#fN").value, t: $("#fT").value, d: new Date().toISOString() }); e.target.reset(); toast("Mulțumim pentru mesaj!"); } catch (x) { toast("Mesajul nu a putut fi trimis"); } };
whenRole(() => { loadA().catch(() => $("#posts").innerHTML = '<p class="tag">Anunțurile nu pot fi încărcate.</p>'); loadE().catch(drawE); });
