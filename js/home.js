import { $, esc, toast, whenRole, modal, sheet, can, role, user, upload, safeUrl, db, collection, getDocs, addDoc, deleteDoc, doc } from "./core.js";
import { CATS, BELLS, HERO, HERO_MS } from "./config.js";
const all = async c => (await getDocs(collection(db, c))).docs.map(d => ({ id: d.id, ...d.data() }));
const p2 = n => String(n).padStart(2, "0"), iso = d => d.toISOString().slice(0, 10), fmt = d => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
/* hero: pozele se schimbă singure (se încarcă pe rând) */
const hs = $("#slides"), H = HERO.filter(h => h.src), show = i => { const d = hs.children[i]; if (!d.style.backgroundImage) d.style.backgroundImage = `url("${H[i].src}")`; };
H.forEach(h => { const d = hs.appendChild(document.createElement("div")); d.className = "slide"; d.style.backgroundPosition = h.pos || "center"; });
if (H.length) { hs.children[0].classList.add("on"); show(0); if (H.length > 1) { show(1); let i = 0; setInterval(() => { hs.children[i].classList.remove("on"); i = (i + 1) % H.length; hs.children[i].classList.add("on"); show((i + 1) % H.length); }, HERO_MS); } }
/* program ore + ora curentă */
const mi = t => t.split(":").reduce((h, m) => h * 60 + +m), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
let idx = -1, st = now.getDay() % 6 === 0 ? "Astăzi nu sunt ore" : nowM < mi(BELLS[0][1]) ? "Prima oră începe la " + BELLS[0][1] : "Programul de azi s-a încheiat";
if (now.getDay() % 6) BELLS.forEach((b, i) => { const nx = BELLS[i + 1]; if (nowM >= mi(b[1]) && nowM < mi(b[2])) { idx = i; st = `Acum este ora ${b[0]}, până la ${b[2]}`; } else if (nx && nowM >= mi(b[2]) && nowM < mi(nx[1])) st = "Pauză până la " + nx[1]; });
$("#now").textContent = st;
$("#bt").innerHTML = BELLS.map((b, i) => `<div class="slot${i === idx ? " on" : ""}"><b>${b[0]}</b><span>${b[1]} – ${b[2]}</span><em>${b[3] === "—" ? "final" : "pauză " + b[3]}</em></div>`).join("");
/* anunțuri */
let A = [], filt = "All", n = 6;
const mine = a => role === "admin" || (user && a.uid === user.uid);
const drawA = () => {
  $("#tabs").innerHTML = ["All", ...CATS].map(t => `<button aria-selected="${t === filt}" data-t="${esc(t)}">${t === "All" ? "Toate" : t}</button>`).join("");
  const l = A.filter(a => filt === "All" || a.c === filt);
  $("#posts").innerHTML = l.slice(0, n).map(a => `<article class="post" tabindex="0" data-id="${a.id}">${a.img ? `<div class="cv" style="background-image:url('${esc(safeUrl(a.img))}')"></div>` : `<div class="cv ph">${esc(a.c[0])}</div>`}<div class="pb"><span class="pill">${esc(a.c)}</span><h3>${esc(a.t)}</h3><p>${esc(a.b)}</p><div class="pf"><span>${fmt(a.d)}</span>${can("anunturi") && mine(a) ? `<button class="btn o s" data-del="anunturi/${a.id}">Șterge</button>` : "<span>Citește →</span>"}</div></div></article>`).join("") || '<p class="tag mid">Nu sunt anunțuri.</p>';
  $("#more").hidden = l.length <= n;
};
const loadA = async () => { A = (await all("anunturi")).sort((x, y) => (y.d || "").localeCompare(x.d || "")); drawA(); };
const open = c => { const a = A.find(x => x.id === c.dataset.id); a && sheet(a.t, `${a.img ? `<img alt="" src="${esc(safeUrl(a.img))}">` : ""}<p><span class="pill">${esc(a.c)}</span> <span class="tag">${fmt(a.d)}</span></p><p>${esc(a.b).replace(/\n/g, "<br>")}</p>`); };
$("#tabs").onclick = e => { if (e.target.dataset.t) { filt = e.target.dataset.t; n = 6; drawA(); } };
$("#more").onclick = () => { n += 6; drawA(); };
$("#posts").onclick = e => { const c = e.target.closest(".post"); if (c && !e.target.closest("[data-del]")) open(c); };
$("#posts").onkeydown = e => { if (e.key === "Enter" && e.target.classList.contains("post")) open(e.target); };
$("#addA").onclick = () => modal("Anunț nou", `<div class="grid"><label>Titlu<input name="t" required></label><label>Categorie<select name="c">${CATS.map(c => `<option>${c}</option>`).join("")}</select></label><label>Imagine<input name="f" type="file" accept="image/*"></label></div><label>Text<textarea name="b" rows="4" required></textarea></label><label class="ck"><input type="checkbox" name="s">Postează și pe Facebook și Instagram</label>`, async f => {
  const E = f.elements, file = E.f.files[0], social = E.s.checked, a = { t: E.t.value, c: E.c.value, b: E.b.value, d: iso(new Date()), uid: user.uid, social };
  if (file) a.img = await upload(file);
  await addDoc(collection(db, "anunturi"), a); toast(social && !file ? "Publicat. Instagram cere imagine — doar Facebook" : "Publicat"); loadA();
}, "Publică");
/* calendar: apasă pe o zi pentru detalii */
let E = [], cur = new Date();
const K = { vac: "Vacanță", teza: "Teză" }, dm = d => `${d.slice(8)}.${d.slice(5, 7)}`, rng = e => e.e && e.e !== e.d ? `${fmt(e.d)} – ${fmt(e.e)}` : fmt(e.d);
const on = (e, ds) => e.d <= ds && ds <= (e.e || e.d);
const drawE = () => {
  const y = cur.getFullYear(), m = cur.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), pre = `${y}-${p2(m + 1)}`, today = iso(new Date());
  $("#label").textContent = cur.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  let h = ["L", "M", "M", "J", "V", "S", "D"].map(d => `<div class="h">${d}</div>`).join("") + "<div class='e'></div>".repeat(first);
  for (let d = 1; d <= days; d++) { const ds = `${pre}-${p2(d)}`; h += `<div class="${ds === today ? "t" : ""}" data-d="${ds}" tabindex="0" role="button" aria-label="${d} ${$("#label").textContent}"><b>${d}</b>${E.filter(e => on(e, ds)).map(e => `<span class="ev ${esc(e.k)}">${esc(e.t)}</span>`).join("")}</div>`; }
  $("#cal").innerHTML = h;
  $("#evs").innerHTML = E.filter(e => e.d <= pre + "-31" && (e.e || e.d) >= pre + "-01").sort((a, b) => a.d.localeCompare(b.d)).map(e => `<li data-d="${e.d}" tabindex="0"><span><b>${e.e && e.e !== e.d ? dm(e.d) + " – " + dm(e.e) : dm(e.d)}</b> · ${esc(e.t)}</span><span class="pill ${esc(e.k)}">${K[e.k] || "Eveniment"}</span></li>`).join("") || '<li class="tag">Niciun eveniment în această lună.</li>';
};
const loadE = async () => { E = await all("evenimente"); drawE(); };
const day = ds => {
  const l = E.filter(e => on(e, ds)), adm = can("admin");
  const d = sheet(new Date(ds + "T12:00").toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    (l.map(e => `<div class="evc ${esc(e.k)}"><span class="pill">${K[e.k] || "Eveniment"}</span><h3>${esc(e.t)}</h3><p class="tag">${rng(e)}</p>${e.x ? `<p>${esc(e.x).replace(/\n/g, "<br>")}</p>` : ""}${adm ? `<button class="btn o s" data-del="evenimente/${e.id}">Șterge</button>` : ""}</div>`).join("") || '<p class="tag">Niciun eveniment în această zi.</p>') + (adm ? '<button class="btn s" id="addDay" type="button">＋ Adaugă în această zi</button>' : ""));
  const b = d.querySelector("#addDay"); if (b) b.onclick = () => { d.close(); addEvent(ds); };
};
$("#pm").onclick = () => { cur.setMonth(cur.getMonth() - 1); drawE(); };
$("#nm").onclick = () => { cur.setMonth(cur.getMonth() + 1); drawE(); };
$("#cal").onclick = e => { const c = e.target.closest("[data-d]"); if (c) day(c.dataset.d); };
$("#cal").onkeydown = e => { if (e.key === "Enter" && e.target.dataset.d) day(e.target.dataset.d); };
$("#evs").onclick = e => { const l = e.target.closest("li[data-d]"); if (l) day(l.dataset.d); };
$("#evs").onkeydown = e => { if (e.key === "Enter" && e.target.dataset.d) day(e.target.dataset.d); };
const addEvent = (date = "") => modal("Eveniment nou", `<label>Titlu<input name="t" required></label><div class="grid"><label>De la<input name="d" type="date" required value="${date}"></label><label>Până la (opțional)<input name="e" type="date"></label></div><label>Tip<select name="k"><option value="">Eveniment</option><option value="vac">Vacanță</option><option value="teza">Teză</option></select></label><label>Detalii (opțional)<textarea name="x" rows="3"></textarea></label><p class="tag">Pentru o singură zi lasă „Până la” gol.</p>`, async f => {
  const x = f.elements, v = { t: x.t.value, d: x.d.value, k: x.k.value }; if (x.e.value) { if (x.e.value < v.d) throw new Error("Data de final e înaintea celei de început"); v.e = x.e.value; } if (x.x.value.trim()) v.x = x.x.value.trim();
  await addDoc(collection(db, "evenimente"), v); toast("Adăugat"); loadE();
}, "Adaugă");
$("#addE").onclick = () => addEvent();
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-del]"); if (!b || !confirm("Ștergi?")) return;
  const [c, id] = b.dataset.del.split("/"); await deleteDoc(doc(db, c, id)); document.querySelectorAll("dialog[open]").forEach(d => d.close()); c === "anunturi" ? loadA() : loadE();
});
/* feedback */
$("#ff").onsubmit = async e => { e.preventDefault(); const b = e.target.querySelector(".btn"); b.disabled = true; try { await addDoc(collection(db, "feedback"), { n: $("#fN").value, t: $("#fT").value, d: new Date().toISOString() }); e.target.reset(); toast("Mulțumim pentru mesaj!"); } catch (x) { toast("Mesajul nu a putut fi trimis"); } b.disabled = false; };
whenRole(() => { loadA().catch(() => $("#posts").innerHTML = '<p class="tag mid">Anunțurile nu pot fi încărcate.</p>'); loadE().catch(drawE); });

if (location.hash.length > 1) setTimeout(() => { try { $(location.hash).scrollIntoView(); } catch (e) { } }, 900);
