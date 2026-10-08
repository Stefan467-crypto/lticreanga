import { db, auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { CATALOG_URL, CLOUDINARY, SOCIAL } from "./config.js";
export * from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
export { db };
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = u => /^https?:\/\//i.test(u) ? u : "#";
export function toast(m) {
  let t = $("#toast"); if (!t) { t = document.body.appendChild(document.createElement("div")); t.id = "toast"; t.setAttribute("popover", "manual"); t.setAttribute("role", "status"); }
  t.textContent = m; t.hidden = false; try { t.hidePopover(); } catch (e) { } try { t.showPopover(); } catch (e) { }
  clearTimeout(t._t); t._t = setTimeout(() => { try { t.hidePopover(); } catch (e) { } t.hidden = true; }, 3200);
}
export async function upload(file) {
  if (!CLOUDINARY.cloud) throw new Error("Cloudinary nu este configurat în js/config.js");
  const f = new FormData(); f.append("file", file); f.append("upload_preset", CLOUDINARY.preset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud}/auto/upload`, { method: "POST", body: f });
  if (!r.ok) throw new Error("Încărcarea a eșuat"); return (await r.json()).secure_url;
}
/* meniu */
const hd = $(".hd");
if (document.body.classList.contains("home")) { const f = () => hd.classList.toggle("solid", scrollY > 40); f(); addEventListener("scroll", f, { passive: true }); }
const dr = $("#drawer"), bg = $("#burger");
function openD(o) { dr.classList.toggle("open", o); dr.inert = !o; bg.setAttribute("aria-expanded", o); document.documentElement.classList.toggle("lock", o); (o ? $("#closeD") : bg).focus(); }
dr.inert = true; bg.onclick = () => openD(true); $("#closeD").onclick = $(".scrim", dr).onclick = () => openD(false);
dr.onclick = e => { if (e.target.closest("a[href]")) openD(false); };
addEventListener("keydown", e => { if (e.key === "Escape" && dr.classList.contains("open")) openD(false); });
document.querySelectorAll("[data-social]").forEach(a => { const u = SOCIAL[a.dataset.social]; if (u) { a.href = u; a.hidden = false; } });
document.querySelectorAll("[data-catalog]").forEach(a => { a.href = CATALOG_URL; a.target = "_blank"; a.rel = "noopener"; });
/* roluri */
export let role = "vizitator", user = null;
const cbs = []; let ready = false;
export const whenRole = cb => ready ? cb(role) : cbs.push(cb);
const CAP = { profesor: ["anunturi", "resurse"], ce: ["anunturi", "cantina"] };
export const can = c => role === "admin" || (CAP[role] || []).includes(c);
function apply() {
  document.querySelectorAll("[data-need]").forEach(el => el.hidden = !can(el.dataset.need));
  const a = $("#authLink"); a.textContent = user ? "Ieșire" : "Autentificare"; a.href = user ? "#" : "login";
  a.onclick = user ? e => { e.preventDefault(); signOut(auth).then(() => location.href = "./"); } : null;
}
onAuthStateChanged(auth, async u => {
  user = u; role = "vizitator"; apply();
  if (u) try {
    const s = await Promise.race([getDoc(doc(db, "users", u.uid)), new Promise((_, r) => setTimeout(() => r({ code: "timeout" }), 8000))]);
    if (s.exists()) role = s.data().role || "vizitator"; else toast("Lipsește documentul users/" + u.uid);
  } catch (e) { toast("Rolul nu poate fi citit: " + (e.code || e.message)); }
  ready = true; apply(); cbs.splice(0).forEach(f => f(role));
});
/* modal + butoane + / ✎ */
const X = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const PEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
function dlg(title, inner) {
  const d = document.body.appendChild(document.createElement("dialog")); d.className = "modal";
  d.innerHTML = `<div class="mt"><h3>${esc(title)}</h3><button type="button" class="ib x" aria-label="Închide">${X}</button></div>${inner}`;
  d.querySelector(".x").onclick = () => d.close(); d.onclose = () => d.remove(); d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal(); return d;
}
export const sheet = (title, body) => dlg(title, `<div class="sb">${body}</div>`);
export function modal(title, body, onSubmit, btn = "Salvează") {
  const d = dlg(title, `<form>${body}<button class="btn">${btn}</button></form>`), f = d.querySelector("form");
  f.onsubmit = async e => { e.preventDefault(); const b = f.querySelector(".btn"); b.disabled = true; try { await onSubmit(f); d.close(); } catch (err) { toast(err.message); b.disabled = false; } };
  return d;
}
export function plusBtn(el, label, fn, pen) {
  const h = el.previousElementSibling, host = h && (h.classList.contains("sec") || h.classList.contains("shd")) ? h : el.parentNode, b = document.createElement("button");
  b.type = "button"; b.className = "plus"; b.title = label; b.setAttribute("aria-label", label); b.innerHTML = pen ? PEN : "+"; b.onclick = fn; host.append(b);
}
/* texte editabile: <el data-slug="x"> */
const html = t => { let h = "", u = 0; for (const l of t.split("\n")) { const s = l.trim(); if (s.startsWith("- ")) { h += (u ? "" : "<ul>") + "<li>" + esc(s.slice(2)) + "</li>"; u = 1; continue; } if (u) { h += "</ul>"; u = 0; } h += s.startsWith("# ") ? "<h3>" + esc(s.slice(2)) + "</h3>" : s ? "<p>" + esc(s) + "</p>" : ""; } return h + (u ? "</ul>" : ""); };
async function textBlock(el) {
  const slug = el.dataset.slug; let text = "";
  try { const s = await getDoc(doc(db, "pagini", slug)); if (s.exists()) { text = s.data().text; el.innerHTML = html(text); } } catch (e) { }
  whenRole(() => can(el.dataset.edit || "admin") && plusBtn(el, "Editează", () => {
    const d = modal("Editează textul", '<p class="tag">Rând gol = paragraf nou. „# ” = subtitlu, „- ” = listă.</p><textarea name="t" rows="10"></textarea>', async f => { text = f.elements.t.value; await setDoc(doc(db, "pagini", slug), { text }); el.innerHTML = html(text); toast("Salvat"); });
    d.querySelector("textarea").value = text || el.innerText.trim();
  }, 1));
}
/* liste editabile: <el data-col data-fields="cheie:Etichetă,..." data-img="1" data-max="3"> */
function listBlock(el) {
  const col = el.dataset.col, F = el.dataset.fields.split(",").map(f => f.split(":")), max = +el.dataset.max || 99, ED = el.dataset.edit || "admin", K = el.dataset.img ? "img" : el.dataset.file ? "url" : "";
  const out = el.appendChild(document.createElement("div")); out.className = "grid";
  const load = async () => {
    const l = (await getDocs(collection(db, col))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, max);
    out.innerHTML = l.map(x => `<article class="card pc">${x.img ? `<img loading="lazy" alt="" src="${esc(safeUrl(x.img))}">` : ""}<h3>${esc(x[F[0][0]])}</h3>${F.slice(1).map(([k]) => x[k] ? `<p>${esc(x[k])}</p>` : "").join("")}${x.url ? `<a class="btn s" href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">Deschide</a> ` : ""}${can(ED) ? `<button class="btn o s" data-id="${x.id}">Șterge</button>` : ""}</article>`).join("") || '<p class="tag">Nu sunt înregistrări.</p>';
  };
  out.onclick = async e => { const id = e.target.dataset.id; if (id && confirm("Ștergi?")) { await deleteDoc(doc(db, col, id)); load(); } };
  whenRole(r => {
    load().catch(() => out.innerHTML = '<p class="tag">Conținutul nu poate fi încărcat.</p>');
    if (can(ED)) plusBtn(el, "Adaugă", () => modal("Adaugă", '<div class="grid">' + F.map(([k, l], i) => `<label>${l}<input name="${k}" ${i ? "" : "required"}></label>`).join("") + (K ? `<label>${K === "img" ? "Imagine" : "Fișier"}<input name="_f" type="file" ${K === "img" ? 'accept="image/*"' : "required"}></label>` : "") + "</div>", async f => {
      const E = f.elements, v = { ts: Date.now() }; F.forEach(([k]) => v[k] = E[k].value.trim());
      const file = K && E._f.files[0]; if (file) v[K] = await upload(file);
      await addDoc(collection(db, col), v); toast("Adăugat"); load();
    }));
  });
}
document.querySelectorAll("[data-slug]").forEach(textBlock);
document.querySelectorAll("[data-col]").forEach(listBlock);
