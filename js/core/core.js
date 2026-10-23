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
const slugF = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "fisier";
export async function upload(file) {
  if (!CLOUDINARY.cloud) throw new Error("Cloudinary nu este configurat în js/config.js");
  const media = /^(image|video|audio)\//.test(file.type), f = new FormData(); f.append("file", file); f.append("upload_preset", CLOUDINARY.preset);
  // documentele (pdf, docx, xlsx, zip…) se încarcă ca „raw”, cu numele și extensia păstrate în adresă; pozele rămân „auto”
  if (!media) { const m = /\.([a-z0-9]{1,6})$/i.exec(file.name), ext = m ? m[1].toLowerCase() : "bin"; f.append("public_id", `${Date.now().toString(36)}-${slugF(file.name.replace(/\.[^.]*$/, ""))}.${ext}`); }
  let r; try { r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud}/${media ? "auto" : "raw"}/upload`, { method: "POST", body: f }); } catch (e) { throw new Error("Încărcarea a eșuat: verifică conexiunea la internet"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Încărcarea a eșuat: " + (j.error?.message || "eroare " + r.status)); return j.secure_url;
}
/* ── fișiere: butoanele „Deschide” (fila nouă) și „Descarcă” (pe dispozitiv) ── */
const EXT = (n, u) => { const m = /\.([a-z0-9]{2,5})$/i.exec(String(n || "").trim()) || /\.([a-z0-9]{2,5})$/i.exec(String(u || "").split(/[?#]/)[0]); return m ? m[1].toLowerCase() : ""; };
const IMGX = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]), OFFX = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf"]), TXTX = new Set(["txt", "csv", "json"]);
export const isCloud = u => /^https?:\/\/res\.cloudinary\.com\//i.test(u || "");
const fname = (u, n) => (n && n.trim()) || decodeURIComponent(String(u || "").split(/[?#]/)[0].split("/").pop() || "fisier");
const BLOCK = "Fișierul nu s-a putut deschide. Dacă e PDF sau ZIP, administratorul trebuie să bifeze în Cloudinary → Settings → Security → „PDF and ZIP files delivery”.";
async function blobOf(u) { let r; try { r = await fetch(u); } catch (e) { throw new Error(BLOCK); } if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? BLOCK : "Fișierul nu poate fi descărcat (" + r.status + ")"); return r.blob(); }
export function saveBlob(b, n) { if (/\.pptx$/i.test(n) && b.type !== "application/vnd.openxmlformats-officedocument.presentationml.presentation") b = new Blob([b], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }); const a = document.createElement("a"), u = URL.createObjectURL(b); a.href = u; a.download = n; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); }
export async function downloadFile(url, name) {
  const n = fname(url, name);
  if (!isCloud(url)) { window.open(url, "_blank", "noopener"); return; }
  toast("Se descarcă…");
  try { saveBlob(await blobOf(url), n); } catch (e) { toast(e.message); }
}
export async function openFile(url, name) {
  const x = EXT(name, url);
  if (!isCloud(url) || IMGX.has(x)) { window.open(url, "_blank", "noopener"); return; }
  const w = window.open("", "_blank"), go = u => w ? w.location.replace(u) : (location.href = u); // fila se deschide imediat (altfel telefonul o blochează), apoi primește fișierul
  if (OFFX.has(x)) return go("https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(url));
  if (x === "pdf" && navigator.pdfViewerEnabled === false) return go("https://docs.google.com/gview?embedded=true&url=" + encodeURIComponent(url)); // Android: fără cititor PDF în browser
  if (x === "pdf" || TXTX.has(x)) { try { const b = await blobOf(url); return go(URL.createObjectURL(new Blob([b], { type: x === "pdf" ? "application/pdf" : "text/plain;charset=utf-8" }))); } catch (e) { if (w) w.close(); return toast(e.message); } }
  if (w) w.close(); downloadFile(url, name); // arhive și alte tipuri nu se pot afișa în browser: se descarcă
}
export const fileBtns = (url, name = "") => isCloud(url)
  ? `<div class="fbt"><button type="button" class="btn s" data-fopen="${esc(url)}" data-fname="${esc(name)}">Deschide</button><button type="button" class="btn o s" data-fdl="${esc(url)}" data-fname="${esc(name)}">Descarcă</button></div>`
  : `<div class="fbt"><a class="btn s" href="${esc(safeUrl(url))}" target="_blank" rel="noopener">Deschide</a></div>`;
export const extTag = (name, url) => { const x = EXT(name, url); return x ? x.toUpperCase() : "Fișier"; };
document.addEventListener("click", e => {
  const o = e.target.closest("[data-fopen]"), d = e.target.closest("[data-fdl]");
  if (o) { e.preventDefault(); openFile(o.dataset.fopen, o.dataset.fname); } else if (d) { e.preventDefault(); downloadFile(d.dataset.fdl, d.dataset.fname); }
});
/* meniu */
const hd = $(".hd");
if (document.body.classList.contains("home")) { const f = () => hd.classList.toggle("solid", scrollY > 40); f(); addEventListener("scroll", f, { passive: true }); }
const dr = $("#drawer"), bg = $("#burger");
function openD(o) { dr.classList.toggle("open", o); dr.inert = !o; bg.setAttribute("aria-expanded", o); document.documentElement.classList.toggle("lock", o); (o ? $("#closeD") : bg).focus(); }
dr.inert = true; bg.onclick = () => openD(true); $("#closeD").onclick = $(".scrim", dr).onclick = () => openD(false);
const norm = p => p.replace(/index(\.html)?$/, "");
dr.onclick = e => {
  const a = e.target.closest("a[href]"); if (!a || e.defaultPrevented) return;
  const u = new URL(a.href, location.href);
  if (norm(u.pathname) === norm(location.pathname) && u.origin === location.origin) {
    e.preventDefault(); openD(false); if (u.hash.length > 1) history.pushState(null, "", u.hash);
    setTimeout(() => { try { u.hash.length > 1 ? $(u.hash).scrollIntoView({ behavior: "smooth" }) : scrollTo({ top: 0, behavior: "smooth" }); } catch (x) { } }, 80);
  } else setTimeout(() => openD(false), 400);
};
addEventListener("keydown", e => { if (e.key === "Escape" && dr.classList.contains("open")) openD(false); });
document.querySelectorAll("[data-social]").forEach(a => { const u = SOCIAL[a.dataset.social]; if (u) { a.href = u; a.hidden = false; } });
document.querySelectorAll("[data-catalog]").forEach(a => { if (!CATALOG_URL || /example\.com/.test(CATALOG_URL)) { a.hidden = true; return; } a.href = CATALOG_URL; a.target = "_blank"; a.rel = "noopener"; });
/* roluri */
export let role = "vizitator", sub = "", user = null;
const cbs = []; let ready = false;
export const whenRole = cb => ready ? cb(role) : cbs.push(cb);
const CAP = { profesor: ["anunturi", "resurse", "mesaje"], ce: ["anunturi", "cantina"] };
export const can = c => role === "admin" || (CAP[role] || []).includes(c);
function apply() {
  document.querySelectorAll("[data-need]").forEach(el => el.hidden = !can(el.dataset.need));
  const a = $("#authLink"); a.textContent = user ? "Ieșire" : "Autentificare"; a.href = user ? "#" : "login";
  a.onclick = user ? e => { e.preventDefault(); signOut(auth).then(() => location.href = "./"); } : null;
}
onAuthStateChanged(auth, async u => {
  user = u; role = "vizitator"; sub = ""; apply();
  if (u) try {
    const s = await Promise.race([getDoc(doc(db, "users", u.uid)), new Promise((_, r) => setTimeout(() => r({ code: "timeout" }), 8000))]);
    if (s.exists()) { role = s.data().role || "vizitator"; sub = s.data().sub || ""; } else toast("Lipsește documentul users/" + u.uid);
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
/* fereastră de citire (anunțuri): imagine mare sus, text frumos dedesubt */
export function viewer(cls, inner) {
  const d = document.body.appendChild(document.createElement("dialog")); d.className = "modal " + cls;
  d.innerHTML = `<button type="button" class="xf" aria-label="Închide">${X}</button>${inner}`;
  d.querySelector(".xf").onclick = () => d.close(); d.onclose = () => d.remove(); d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal(); return d;
}
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
    out.innerHTML = l.map(x => `<article class="card pc">${x.img ? `<img loading="lazy" alt="" src="${esc(safeUrl(x.img))}">` : ""}<h3>${esc(x[F[0][0]])}</h3>${F.slice(1).map(([k]) => x[k] ? `<p>${esc(x[k])}</p>` : "").join("")}${x.url ? fileBtns(x.url, x.nume) : ""}${can(ED) ? `<button class="btn o s" data-id="${x.id}">Șterge</button>` : ""}</article>`).join("") || '<p class="tag">Nu sunt înregistrări.</p>';
  };
  out.onclick = async e => { const id = e.target.dataset.id; if (id && confirm("Ștergi?")) { await deleteDoc(doc(db, col, id)); load(); } };
  whenRole(r => {
    load().catch(() => out.innerHTML = '<p class="tag">Conținutul nu poate fi încărcat.</p>');
    if (can(ED)) plusBtn(el, "Adaugă", () => modal("Adaugă", '<div class="grid">' + F.map(([k, l], i) => `<label>${l}<input name="${k}" ${i ? "" : "required"}></label>`).join("") + (K ? `<label>${K === "img" ? "Imagine" : "Fișier"}<input name="_f" type="file" ${K === "img" ? 'accept="image/*"' : "required"}></label>` : "") + "</div>", async f => {
      const E = f.elements, v = { ts: Date.now() }; F.forEach(([k]) => v[k] = E[k].value.trim());
      const file = K && E._f.files[0]; if (file) { v[K] = await upload(file); if (K === "url") v.nume = file.name; }
      await addDoc(collection(db, col), v); toast("Adăugat"); load();
    }));
  });
}
document.querySelectorAll("[data-slug]").forEach(textBlock);
document.querySelectorAll("[data-col]").forEach(listBlock);

/* animații la derulare, contor, buton „sus” */
const calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
const count = b => { const t = +b.dataset.n; let s0; const f = ts => { s0 ??= ts; const p = Math.min((ts - s0) / 1300, 1); b.textContent = Math.round(t * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
if (!calm && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); x.target.querySelectorAll("b[data-n]").forEach(count); } }), { threshold: .12 });
  document.querySelectorAll(".shd,.q,.about>div,.orar,.calwrap,.fbk,.blk").forEach(el => { el.classList.add("rv"); io.observe(el); });
}
const up = document.body.appendChild(document.createElement("button")); up.className = "top"; up.type = "button"; up.setAttribute("aria-label", "Sus");
up.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
up.onclick = () => scrollTo({ top: 0, behavior: "smooth" }); addEventListener("scroll", () => up.classList.toggle("show", scrollY > 700), { passive: true });

/* accesibilitate */
let A = {}; try { A = JSON.parse(localStorage.a11y || "{}"); } catch (e) { }
const applyA = () => { const d = document.documentElement; d.style.setProperty("--fs", A.fs || 1); ["hc", "dys", "calm", "big"].forEach(k => d.classList.toggle("a-" + k, !!A[k])); try { localStorage.a11y = JSON.stringify(A); } catch (e) { } ap && ap.querySelectorAll("[data-a]").forEach(b => { if (["hc", "dys", "calm", "big"].includes(b.dataset.a)) b.setAttribute("aria-pressed", !!A[b.dataset.a]); }); };
const ap = $("#a11y");
if (ap) { ap.innerHTML = '<button data-a="fs-">A−</button><button data-a="fs+">A+</button><button data-a="hc">Contrast ridicat</button><button data-a="dys">Citire ușoară</button><button data-a="big">Butoane mari</button><button data-a="calm">Fără animații</button><button data-a="reset">Resetează</button>'; applyA(); ap.onclick = e => { const k = e.target.dataset.a; if (!k) return; if (k === "fs+") A.fs = Math.min(1.6, +((A.fs || 1) + .1).toFixed(2)); else if (k === "fs-") A.fs = Math.max(.9, +((A.fs || 1) - .1).toFixed(2)); else if (k === "reset") A = {}; else A[k] = !A[k]; applyA(); }; }
/* aplicație instalabilă (PWA) */
let ip; addEventListener("beforeinstallprompt", e => { e.preventDefault(); ip = e; const b = $("#inst"); if (b) b.hidden = false; });
const ib = $("#inst"); if (ib) ib.onclick = async () => { if (!ip) return; ip.prompt(); await ip.userChoice; ib.hidden = true; };
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
