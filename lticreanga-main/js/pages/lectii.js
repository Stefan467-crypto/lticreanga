import { $, esc, toast, whenRole, modal, sheet, can, user, db, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, deleteField, doc, writeBatch } from "../core/core.js";
import { aiOn, analyzeLesson, tocAI, pause } from "../teste/ai.js?v=24";
import { readPage } from "../teste/reading.js?v=24";
import { nrm, parseToc, outlineItems, goodToc, finish, findTocPages, isNotLesson, fixTitle, trimToTheme, titleKey, findOffsetWith, verifyShifts } from "../teste/cuprins.js?v=24";
import { SUBJECTS, CLASSES, classesOf, canon } from "../core/config.js";
import { parse, parseC, statOf, clean } from "../teste/engine.js?v=24";
import { DEMO } from "../teste/demo.js?v=24";
let L = [], RES = [], fm = "", fc = "", fk = "", selMode = false, SEL = new Set(), VIS = [];
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, ci = c => CLASSES.indexOf(c), NC = (a, b) => String(a).localeCompare(String(b), "ro", { numeric: true });
const opt = (a, v, all) => (all ? `<option value="">${all}</option>` : "") + a.map(x => `<option value="${esc(x)}"${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
const chap = l => l.capitol || "Fără capitol", enc = encodeURIComponent;
const stats = l => { const s = l.st || (l.text ? statOf(parseC(l.text)) : null); return s ? `${s.s} propoziții · ${s.d} definiții · ${s.f} formule · ${s.p} probleme` : ""; };
const card = x => `<article class="post lc${selMode ? " pick" + (SEL.has(x.id) ? " on" : "") : ""}" data-id="${x.id}"${selMode ? ` data-pk="${x.id}"` : ""}>${selMode ? '<span class="sck"></span>' : ""}<div class="pb"><h3>${esc(x.tema)}</h3><p>${stats(x)}${x.aiok ? " · ✦ AI" : ""}</p>${x.sursa ? `<p class="tag">Din manual: ${esc(x.sursa)}</p>` : ""}${selMode ? "" : `<div class="pf"><a class="btn s" href="teste?l=${x.id}">Generează test</a>${can("resurse") && !x.demo ? `<span class="row"><button class="btn o s" data-ed="${x.id}">Editează</button><button class="btn o s" data-rm="${x.id}">Șterge</button></span>` : ""}${aiOn() && can("resurse") && !x.demo ? `<button class="btn o s" data-ai="${x.id}">${x.aiok ? "✦ Refă cu AI" : "✦ Analizează cu AI"}</button>` : ""}</div>`}</div></article>`;
const draw = () => {
  const ms = SUBJECTS.filter(s => L.some(l => l.materie === s)); if (fm && !ms.includes(fm)) fm = "";
  const inM = L.filter(l => !fm || l.materie === fm), cs = CLASSES.filter(c => inM.some(l => l.clasa === c)); if (fc && !cs.includes(fc)) fc = "";
  const inC = inM.filter(l => !fc || l.clasa === fc), ks = [...new Set(inC.map(chap))].sort(NC); if (fk && !ks.includes(fk)) fk = "";
  $("#fm").innerHTML = opt(ms, fm, "Toate materiile"); $("#fc").innerHTML = '<option value="">Toate clasele</option>' + cs.map(c => `<option value="${c}"${c === fc ? " selected" : ""}>Clasa ${c}</option>`).join(""); $("#fk").innerHTML = opt(ks, fk, "Toate capitolele");
  const G = [];
  for (const x of inC.filter(x => !fk || chap(x) === fk).sort((a, b) => idx(a.materie) - idx(b.materie) || ci(a.clasa) - ci(b.clasa))) {
    let g = G.at(-1); if (!g || g.m !== x.materie || g.c !== x.clasa) G.push(g = { m: x.materie, c: x.clasa, ch: new Map(), demo: !!x.demo });
    if (!g.ch.has(chap(x))) g.ch.set(chap(x), []); g.ch.get(chap(x)).push(x);
  }
  const first = ls => Math.min(...ls.map(x => x.pag ?? 1e9));
  $("#ll").innerHTML = G.map(g => `<section class="grp"><p class="kick gh"><span>${esc(g.m)} · clasa ${esc(g.c)}</span>${can("resurse") && !selMode && !g.demo ? `<button class="btn o s dng" data-rg="${esc(g.m)}|${esc(g.c)}">Șterge toată clasa</button>` : ""}</p>${[...g.ch].sort((a, b) => first(a[1]) - first(b[1]) || NC(a[0], b[0])).map(([name, ls]) => `<div class="chh"><div><h3>${esc(name)}</h3><span class="tag">${ls.length} ${ls.length === 1 ? "temă" : "teme"}</span></div><span class="row"><a class="btn o s" href="teste?m=${enc(g.m)}&c=${enc(g.c)}&k=${enc(name)}">Test din tot capitolul</a>${can("resurse") && !ls[0].demo && !selMode ? `<button class="btn o s" data-rnc="${esc(g.m)}|${esc(g.c)}|${esc(name)}">Redenumește</button><button class="btn o s dng" data-rmc="${esc(g.m)}|${esc(g.c)}|${esc(name)}">Șterge capitolul</button>` : ""}${aiOn() && can("resurse") && !ls[0].demo && !selMode ? `<button class="btn o s" data-aic="${esc(g.m)}|${esc(g.c)}|${esc(name)}">✦ AI pe capitol</button>` : ""}</span></div><div class="posts">${ls.sort((a, b) => (a.pag ?? 1e9) - (b.pag ?? 1e9) || NC(a.tema, b.tema)).map(card).join("")}</div>`).join("")}</section>`).join("") || '<p class="tag mid">Nu sunt lecții. Adaugă prima lecție cu butonul +.</p>';
  VIS = inC.filter(x => (!fk || chap(x) === fk) && !x.demo).map(x => x.id); SEL = new Set([...SEL].filter(id => L.some(x => x.id === id)));
  const sb = $("#selbar"); if (sb) { sb.hidden = !can("resurse") || !L.some(x => !x.demo); sb.classList.toggle("act", selMode); sb.innerHTML = selMode ? `<span class="tag">${SEL.size} ${SEL.size === 1 ? "selectată" : "selectate"}</span><button class="btn o s" data-sa="1">${VIS.length && VIS.every(id => SEL.has(id)) ? "Deselectează tot" : "Selectează tot"}</button><button class="btn s dng" data-sd="1"${SEL.size ? "" : " disabled"}>Șterge selectate</button><button class="btn o s" data-sx="1">Renunță</button>` : '<button class="btn o s" data-sm="1">Selectează mai multe</button>'; }
  $("#demoBtn").hidden = !(can("resurse") && L.some(x => x.demo)); $("#dedupBtn").hidden = !can("admin") || L.some(x => x.demo);
};
const prep = x => ({ ...x, materie: canon(x.materie) });
const load = async () => {
  L = (await getDocs(collection(db, "lectii"))).docs.map(d => prep({ id: d.id, ...d.data() })); if (!L.length) L = DEMO.map(x => prep({ ...x }));
  try { RES = (await getDocs(collection(db, "resurse"))).docs.map(d => prep({ id: d.id, ...d.data() })).filter(r => r.tip === "Manual digital"); } catch (e) { RES = []; } draw();
};
/* Metadatele (listă rapidă) și textul (greu) sunt păstrate separat, ca lista să se încarce repede. */
const hs = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 ^ t.charCodeAt(i)) >>> 0; return h.toString(36); };
const lid = v => { const k = `${v.materie}|${v.clasa}|${v.capitol || ""}|${v.tema}`; return "l-" + nrm(k).replace(/ /g, "-").slice(0, 50) + "-" + hs(k); }; // aceeași temă importată din nou = suprascrie, nu dublează
async function saveLesson(v, id, keepAi) {
  const { text, ...meta } = v, ref = doc(db, "lectii", id || lid(v));
  await setDoc(ref, { ...meta, st: statOf(parse(text)), ...(keepAi ? { aiok: true } : {}) });
  await setDoc(doc(db, "lectii_text", ref.id), keepAi ? { text } : { text, ai: deleteField() }, { merge: true }); return ref.id;
}
/* ---------- citire PDF (pdf.js, încărcat doar când e nevoie) ---------- */
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/", cache = {};
async function lib() { if (!window.pdfjsLib) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = CDN + "pdf.min.js"; s.onload = ok; s.onerror = () => no(new Error("Nu pot încărca modulul PDF (verifică internetul)")); document.head.append(s); }); pdfjsLib.GlobalWorkerOptions.workerSrc = CDN + "pdf.worker.min.js"; return pdfjsLib; }
async function openPdf(src) {
  const lb = await lib(); let data;
  if (src instanceof File) data = await src.arrayBuffer();
  else { if (cache[src]) return cache[src]; let r; try { r = await fetch(src); } catch (e) { throw new Error("Browserul nu permite citirea manualului de la acest link. Alege fișierul PDF de pe telefon sau încarcă manualul în Resurse (butonul +)."); } if (!r.ok) throw new Error("Manualul nu poate fi descărcat (cod " + r.status + ")"); data = await r.arrayBuffer(); }
  const pdf = await lb.getDocument({ data }).promise; if (typeof src === "string") cache[src] = pdf; return pdf;
}
async function pagesText(pdf, a, b, rows = false) { // textul paginilor în ordinea de citire (coloane, casete, tabele) — vezi js/teste/reading.js
  let out = ""; for (let i = Math.max(1, a); i <= Math.min(pdf.numPages, b); i++) out += readPage((await (await pdf.getPage(i)).getTextContent()).items, rows) + "\n\n";
  return clean(out);
}
/* ---------- cuprins tipărit: citit din paginile alese de profesor ---------- */
const findOffset = (pdf, items, t1, t2) => { const cache = {}; return findOffsetWith(async pg => cache[pg] ??= nrm(await pagesText(pdf, pg, pg)), pdf.numPages, items, t1, t2); }; // decalajul tipărit → PDF (poate fi negativ)
async function tocFromPages(pdf, t1, t2, offManual, ai) {
  const raw = await pagesText(pdf, t1, t2, true), items = ai ? (await tocAI(raw)).map(x => ({ ...x, t: fixTitle(x.t), ch: x.ch ? fixTitle(x.ch) : x.ch, skip: isNotLesson(x.t) })) : parseToc(raw); if (!items.some(x => !x.skip)) return { T: [], off: 0 };
  const off = offManual ?? await findOffset(pdf, items.filter(x => !x.skip), t1, t2), last = t1 > pdf.numPages / 2 ? t1 - 1 : pdf.numPages; // cuprins la sfârșit → ultima pagină de lecție e cea de dinainte
  return { off, T: finish(items.map(x => ({ ...x, p: x.p + off })).filter(x => x.p <= last), last) };
}
async function toc(pdf) { const it = await outlineItems(pdf); return goodToc(it) ? finish(it, pdf.numPages) : []; } // semnele de carte, doar dacă arată a cuprins adevărat
const findToc = pdf => findTocPages(pdf, (p, a, b) => pagesText(p, a, b, true));

async function renderPage(pdf, n, canvas) { const pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), sc = Math.min(2, 760 / v0.width), v = pg.getViewport({ scale: sc }); canvas.width = v.width; canvas.height = v.height; await pg.render({ canvasContext: canvas.getContext("2d"), viewport: v }).promise; }
async function verifyToc(pdf, T, trust = false) { // titlul fiecărei teme trebuie să apară la pagina indicată; dacă e la ±3 pagini, corectăm; altfel avertizăm
  const cache = {}, w = await verifyShifts(T, async pg => cache[pg] ??= nrm(await pagesText(pdf, pg, pg)), pdf.numPages, { trust });
  return w.map(x => x.kind === "moved" ? `„${x.t}”: pagina corectată la ${x.p}` : `„${x.t}”: titlul nu apare la pagina ${x.p} — verifică`);
}
const tocText = T => { let cur = null, o = []; for (const x of T) { if ((x.ch || "") !== cur) { cur = x.ch || ""; if (cur) o.push("# " + cur); } o.push(`${x.t} | ${x.p}-${x.e}`); } return o.join("\n"); };
/* ---------- adăugare ---------- */
const start = () => { const d = sheet("Adaugă lecții", '<button class="btn" id="o1" type="button" style="width:100%;margin-bottom:.7rem">📘 Din manual (site sau PDF)</button><button class="btn o" id="o2" type="button" style="width:100%">✍️ Lipesc textul temei</button>'); d.querySelector("#o1").onclick = () => { d.close(); importMan(); }; d.querySelector("#o2").onclick = () => { d.close(); form(); }; };
const clsOpt = (m, v) => opt(classesOf(m), v);
function importMan() {
  const d = modal("Import din manual", `<div class="grid"><label>Materia<select name="m">${opt(SUBJECTS, fm || undefined)}</select></label><label>Clasa<select name="c">${clsOpt(fm || SUBJECTS[0], fc)}</select></label></div>
<label>Manualul de pe site<select name="man"></select></label><p class="tag" id="mn"></p><label>sau fișierul PDF<input name="f" type="file" accept="application/pdf"></label>
<span class="sub">Cuprinsul</span><div class="grid"><label>De la pagina<input name="t1" type="number" min="1" placeholder="ex. 3"></label><label>Până la pagina<input name="t2" type="number" min="1" placeholder="ex. 4"></label></div><input name="off" type="hidden"><input name="k" type="hidden">
<div class="row" style="margin:0 0 1.1rem"><button type="button" class="btn s" id="toc">Citește manualul</button><button type="button" class="btn o s" id="pv">Vezi paginile manualului</button></div>
<div id="pvbox" hidden><div class="row pvc"><button type="button" class="btn o s" id="pp" aria-label="Pagina anterioară">‹</button><input id="pn" type="number" min="1" value="1" aria-label="Numărul paginii"><button type="button" class="btn o s" id="pnx" aria-label="Pagina următoare">›</button><button type="button" class="btn s" id="st1">Cuprinsul începe aici</button><button type="button" class="btn s" id="st2">Se termină aici</button></div><canvas id="pvc"></canvas></div>
<p class="tag warn" id="tocw" hidden></p><label>Capitolele și temele<textarea name="t" rows="9" placeholder="# Capitolul 1. Optica&#10;Optica geometrică | 45-52&#10;Lentilele | 53-60"></textarea></label>`, async f => {
    const E = f.elements, src = E.f.files[0] || (RES.find(r => r.id === E.man.value) || {}).url; if (!src) throw new Error("Alege un manual sau un fișier PDF");
    let ch = E.k.value.trim(); const rows = [];
    for (const raw of E.t.value.split("\n")) { const l = raw.trim(); if (!l) continue; if (l.startsWith("#")) { ch = l.replace(/^#+\s*/, "").trim(); continue; } const m = /^(.+?)\s*[|;]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/.exec(l); if (m && !rows.some(r => r.ch === ch && nrm(r.t) === nrm(m[1]) && r.a === +m[2])) rows.push({ ch, t: m[1].trim(), a: +m[2], b: +(m[3] || m[2]) }); }
    if (!rows.length) throw new Error("Scrie cel puțin o temă: Titlu | 45-52");
    const pdf = await openPdf(src), btn = f.querySelector(".btn"), man = E.f.files[0]?.name || (RES.find(r => r.id === E.man.value) || {}).titlu || ""; let ok = 0, skip = [], nofind = [];
    for (const [i, r] of rows.entries()) { btn.textContent = `Se importă ${i + 1}/${rows.length}…`; const nx = rows[i + 1], raw = await pagesText(pdf, r.a, r.b + (nx && nx.a === r.b + 1 ? 1 : 0)), tr = trimToTheme(raw, r.t, nx?.t), text = tr.text.length >= 200 ? tr.text : raw;
      if (!tr.found) nofind.push(r.t);
      if (text.length < 200) { skip.push(r.t); continue; } await saveLesson({ materie: E.m.value, clasa: E.c.value, capitol: r.ch, pag: r.a, tema: r.t, text: text.slice(0, 60000), sursa: `${man}, pag. ${r.a}${r.b > r.a ? "–" + r.b : ""}`, uid: user.uid, ts: Date.now() }); ok++; }
    toast(`Importate ${ok} lecții${skip.length ? ` · fără text în PDF (scanat?): ${skip.join(", ")}` : ""}${nofind.length ? ` · titlul nu a fost găsit în text (verifică lecția): ${nofind.slice(0, 5).join(", ")}${nofind.length > 5 ? "…" : ""}` : ""}`); load();
  }, "Importă temele");
  const f = d.querySelector("form"), E = f.elements;
  const fill = () => { const l = RES.filter(r => r.materie === E.m.value && (r.clasa === E.c.value || r.clasa === "Toate" || !r.clasa)); E.man.innerHTML = l.length ? l.map(r => `<option value="${r.id}">${esc(r.titlu)}${r.clasa && r.clasa !== "Toate" ? " (cl. " + esc(r.clasa) + ")" : ""}</option>`).join("") : '<option value="">— niciun manual încărcat —</option>'; $("#mn").innerHTML = l.length ? "" : 'Nu e niciun manual la această materie. Încarcă-l în <a href="resurse?m=' + encodeURIComponent(E.m.value) + '">Resurse</a> (tip „Manual digital”, fișier PDF) și revino.'; };
  E.m.onchange = () => { const c = E.c.value; E.c.innerHTML = clsOpt(E.m.value, c); fill(); }; E.c.onchange = fill; fill();
  const srcOf = () => E.f.files[0] || (RES.find(r => r.id === E.man.value) || {}).url;
  const readToc = async ai => {
    const b = $(ai ? "#tocai" : "#toc"), lab = b.textContent; b.disabled = true; b.textContent = "Se citește…";
    try {
      const src = srcOf(); if (!src) throw new Error("Alege întâi un manual"); const pdf = await openPdf(src); let T = [], how = "";
      if (+E.t1.value) { const r = await tocFromPages(pdf, +E.t1.value, +E.t2.value || +E.t1.value, E.off.value === "" ? null : +E.off.value, ai); T = r.T; if (E.off.value === "") E.off.value = r.off; how = `din paginile ${E.t1.value}–${E.t2.value || E.t1.value}`; }
      else {
        T = ai ? [] : await toc(pdf); how = "din semnele de carte ale PDF-ului";
        if (!T.length) { const f = await findToc(pdf); if (f) { E.t1.value = f[0]; E.t2.value = f[1]; const r = await tocFromPages(pdf, f[0], f[1], E.off.value === "" ? null : +E.off.value, ai); T = r.T; E.off.value = r.off; how = `din paginile ${f[0]}–${f[1]} (le-am găsit eu)`; } }
      }
      if (!T.length) { toast("Nu am găsit cuprinsul. Apasă „Vezi paginile manualului”, găsește pagina cuprinsului și apasă „Cuprinsul începe aici”."); $("#pvbox").hidden ? $("#pv").click() : 0; }
      else { const w = await verifyToc(pdf, T, /semnele de carte/.test(how)), bx = $("#tocw"); bx.hidden = !w.length; bx.innerHTML = w.length ? "Verificare în PDF:<br>" + w.slice(0, 12).map(esc).join("<br>") + (w.length > 12 ? `<br>… și încă ${w.length - 12}` : "") : ""; E.t.value = tocText(T); const nc = new Set(T.map(x => x.ch).filter(Boolean)).size; toast(`Am găsit ${nc ? nc + " capitole și " : ""}${T.length} teme ${how}. Șterge rândurile care nu te interesează.`); }
    } catch (e) { toast(e.message); }
    b.disabled = false; b.textContent = lab;
  };
  $("#toc").onclick = () => readToc(false); if ($("#tocai")) $("#tocai").onclick = () => readToc(true);
  let pdfP = null; const show = async n => { try { const pdf = pdfP || (pdfP = await openPdf(srcOf())); n = Math.min(Math.max(1, n), pdf.numPages); $("#pn").value = n; $("#pn").max = pdf.numPages; await renderPage(pdf, n, $("#pvc")); } catch (e) { toast(e.message || "Nu pot afișa pagina"); } };
  $("#pv").onclick = async () => { if (!srcOf()) return toast("Alege întâi un manual"); pdfP = null; $("#pvbox").hidden = false; await show(+E.t1.value || 1); $("#pvbox").scrollIntoView({ block: "nearest" }); };
  $("#pp").onclick = () => show(+$("#pn").value - 1); $("#pnx").onclick = () => show(+$("#pn").value + 1); $("#pn").onchange = () => show(+$("#pn").value);
  $("#st1").onclick = () => { E.t1.value = $("#pn").value; if (!+E.t2.value || +E.t2.value < +E.t1.value) E.t2.value = $("#pn").value; toast(`Cuprinsul începe la pagina ${$("#pn").value}`); };
  $("#st2").onclick = () => { E.t2.value = $("#pn").value; if (!+E.t1.value) E.t1.value = $("#pn").value; toast(`Cuprinsul se termină la pagina ${$("#pn").value}`); };
  E.man.onchange = E.f.onchange = () => { pdfP = null; };
}
const form = o => {
  const d = modal(o ? "Editează lecția" : "Lipesc textul temei", `<div class="grid"><label>Materia<select name="m">${opt(SUBJECTS, o?.materie || fm || undefined)}</select></label><label>Clasa<select name="c">${clsOpt(o?.materie || fm || SUBJECTS[0], o?.clasa || fc)}</select></label></div>
<label>Capitolul<input name="k" list="chl" value="${esc(o?.capitol || (fk && fk !== "Fără capitol" ? fk : ""))}" placeholder="ex. Capitolul 1. Optica"></label><datalist id="chl"></datalist>
<label>Tema<input name="t" required value="${esc(o?.tema || "")}" placeholder="ex. Optica geometrică"></label>
<label>Textul lecției<textarea name="x" rows="12" required>${esc(o?.text || "")}</textarea></label>`, async f => {
    const E = f.elements, v = { materie: E.m.value, clasa: E.c.value, capitol: E.k.value.trim(), tema: E.t.value.trim(), text: E.x.value.trim(), uid: user.uid, ts: Date.now() }; if (o?.sursa) v.sursa = o.sursa; if (o?.pag != null) v.pag = o.pag;
    if (v.text.length < 200) throw new Error("Textul e prea scurt (minim ~200 caractere)");
    await saveLesson(v, o?.id, o && o.text === v.text && o.aiok); toast("Lecție salvată"); load();
  }), E = d.querySelector("form").elements;
  const chl = () => { $("#chl").innerHTML = [...new Set(L.filter(l => l.materie === E.m.value && l.clasa === E.c.value && l.capitol).map(l => l.capitol))].sort(NC).map(c => `<option value="${esc(c)}">`).join(""); };
  E.m.onchange = () => { const c = E.c.value; E.c.innerHTML = clsOpt(E.m.value, c); chl(); }; E.c.onchange = chl; chl();
};
$("#fm").onchange = e => { fm = e.target.value; fc = fk = ""; draw(); }; $("#fc").onchange = e => { fc = e.target.value; fk = ""; draw(); }; $("#fk").onchange = e => { fk = e.target.value; draw(); };
async function delLessons(ids) { // șterge lecțiile (și textele lor) în grupuri, o singură dată
  ids = ids.filter(id => { const x = L.find(y => y.id === id); return x && !x.demo; });
  for (let i = 0; i < ids.length; i += 100) { const b = writeBatch(db); ids.slice(i, i + 100).forEach(id => { b.delete(doc(db, "lectii", id)); b.delete(doc(db, "lectii_text", id)); }); await b.commit(); }
  SEL = new Set([...SEL].filter(id => !ids.includes(id))); return ids.length;
}
const delAsk = async (ids, what) => { if (!ids.length) return toast("Nu e nimic de șters"); if (!confirm(`Ștergi ${what} (${ids.length} ${ids.length === 1 ? "temă" : "teme"})? Nu se poate anula.`)) return; try { const n = await delLessons(ids); toast(`Șterse ${n} teme`); } catch (er) { toast("Nu am putut șterge: " + (er.code || er.message)); } load(); };
$("#selbar").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.sm) { selMode = true; SEL = new Set(); draw(); } else if (d.sx) { selMode = false; SEL = new Set(); draw(); }
  else if (d.sa) { VIS.every(id => SEL.has(id)) ? VIS.forEach(id => SEL.delete(id)) : VIS.forEach(id => SEL.add(id)); draw(); }
  else if (d.sd) delAsk([...SEL], "temele selectate").then(() => { selMode = false; draw(); });
};
$("#ll").onclick = async e => {
  const pk = e.target.closest("[data-pk]"); if (pk) { const id = pk.dataset.pk; SEL.has(id) ? SEL.delete(id) : SEL.add(id); return draw(); }
  const rg = e.target.dataset.rg, rmc = e.target.dataset.rmc;
  if (rg) { const [m, c] = rg.split("|"); return delAsk(L.filter(x => x.materie === m && x.clasa === c && !x.demo).map(x => x.id), `TOATE temele de la ${m}, clasa ${c}`); }
  if (rmc) { const [m, c, k] = rmc.split("|"); return delAsk(L.filter(x => x.materie === m && x.clasa === c && chap(x) === k && !x.demo).map(x => x.id), `capitolul „${k}”`); }
  const ed = e.target.dataset.ed, rm = e.target.dataset.rm, rn = e.target.dataset.rnc;
  if (ed) { const x = L.find(y => y.id === ed); form({ ...x, text: x.text ?? (await getDoc(doc(db, "lectii_text", x.id))).data()?.text ?? "" }); }
  if (rm && confirm("Ștergi lecția?")) { await deleteDoc(doc(db, "lectii", rm)); try { await deleteDoc(doc(db, "lectii_text", rm)); } catch (x) { } load(); }
  const ai = e.target.dataset.ai, aic = e.target.dataset.aic;
  if (ai) { const x = L.find(y => y.id === ai); e.target.disabled = true; try { await aiLesson(x); toast("Lecție analizată de AI"); } catch (er) { toast(er.message); } load(); }
  if (aic) { const [m, c, k] = aic.split("|"), ls = L.filter(x => x.materie === m && x.clasa === c && chap(x) === k && !x.demo); let n = 0; e.target.disabled = true; try { for (const x of ls) { toast(`AI: ${++n}/${ls.length} · ${x.tema}`); await aiLesson(x); if (n < ls.length) await pause(5000); } toast(`Analizate ${n} lecții cu AI`); } catch (er) { toast(`${er.message} (analizate ${n - 1} din ${ls.length})`); } load(); }
  if (rn) { const [m, c, k] = rn.split("|"), nn = prompt("Numele nou al capitolului:", k === "Fără capitol" ? "" : k); if (nn == null) return; for (const l of L.filter(x => x.materie === m && x.clasa === c && chap(x) === k)) await updateDoc(doc(db, "lectii", l.id), { capitol: nn.trim() }); toast("Capitol redenumit"); load(); }
};
async function aiLesson(x) { // AI citește lecția o singură dată; rezultatul se salvează și îl folosește generatorul local
  const text = x.text ?? (await getDoc(doc(db, "lectii_text", x.id))).data()?.text ?? ""; if (text.length < 200) throw new Error("Lecția are prea puțin text");
  const ai = await analyzeLesson(text, x); if (!ai.mcq.length && !ai.defs.length && !ai.tf.length) throw new Error("AI nu a găsit material util în această lecție");
  await setDoc(doc(db, "lectii_text", x.id), { text, ai }, { merge: true }); await updateDoc(doc(db, "lectii", x.id), { aiok: true });
}
$("#dedupBtn").onclick = async () => { // aceeași materie + clasă + temă (importată de mai multe ori)
  const G = new Map(); for (const x of L) { const k = [x.materie, x.clasa, nrm(x.tema)].join("|"); (G.get(k) || G.set(k, []).get(k)).push(x); }
  const del = []; for (const ls of G.values()) { ls.sort((a, b) => (b.capitol ? 1 : 0) - (a.capitol ? 1 : 0) || (b.ts || 0) - (a.ts || 0)); const kept = []; for (const x of ls) { if (kept.some(k => k.capitol === x.capitol || !k.capitol || !x.capitol || k.pag === x.pag)) del.push(x); else kept.push(x); } }
  if (!del.length) return toast("Nu am găsit dubluri"); if (!confirm(`Am găsit ${del.length} dubluri (aceeași materie, clasă și temă). Le șterg pe cele mai vechi sau fără capitol?`)) return;
  for (const x of del) { await deleteDoc(doc(db, "lectii", x.id)); try { await deleteDoc(doc(db, "lectii_text", x.id)); } catch (e) { } } toast(`Șterse ${del.length} dubluri`); load();
};
$("#addL").onclick = start;
$("#demoBtn").onclick = async () => { for (const x of DEMO) await saveLesson({ materie: canon(x.materie), clasa: x.clasa, capitol: x.capitol || "Exemple", tema: x.tema.replace(/ \(exemplu\)$/, ""), text: x.text, uid: user.uid, ts: Date.now() }); toast("Lecțiile de exemplu au fost adăugate"); load(); };
whenRole(() => load().catch(() => { L = DEMO.map(x => prep({ ...x })); draw(); }));
