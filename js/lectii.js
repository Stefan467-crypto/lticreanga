import { $, esc, toast, whenRole, modal, sheet, can, user, db, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc } from "./core.js";
import { SUBJECTS, CLASSES, classesOf, canon } from "./config.js";
import { parse, parseC, statOf, clean } from "./engine.js";
import { DEMO } from "./demo.js";
let L = [], RES = [], fm = "", fc = "", fk = "";
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, ci = c => CLASSES.indexOf(c), NC = (a, b) => String(a).localeCompare(String(b), "ro", { numeric: true });
const opt = (a, v, all) => (all ? `<option value="">${all}</option>` : "") + a.map(x => `<option value="${esc(x)}"${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
const chap = l => l.capitol || "Fără capitol", enc = encodeURIComponent;
const stats = l => { const s = l.st || (l.text ? statOf(parseC(l.text)) : null); return s ? `${s.s} propoziții · ${s.d} definiții · ${s.f} formule · ${s.p} probleme` : ""; };
const card = x => `<article class="post lc" data-id="${x.id}"><div class="pb"><h3>${esc(x.tema)}</h3><p>${stats(x)}</p>${x.sursa ? `<p class="tag">Din manual: ${esc(x.sursa)}</p>` : ""}<div class="pf"><a class="btn s" href="teste?l=${x.id}">Generează test</a>${can("resurse") && !x.demo ? `<span class="row"><button class="btn o s" data-ed="${x.id}">Editează</button><button class="btn o s" data-rm="${x.id}">Șterge</button></span>` : ""}</div></div></article>`;
const draw = () => {
  const ms = SUBJECTS.filter(s => L.some(l => l.materie === s)); if (fm && !ms.includes(fm)) fm = "";
  const inM = L.filter(l => !fm || l.materie === fm), cs = CLASSES.filter(c => inM.some(l => l.clasa === c)); if (fc && !cs.includes(fc)) fc = "";
  const inC = inM.filter(l => !fc || l.clasa === fc), ks = [...new Set(inC.map(chap))].sort(NC); if (fk && !ks.includes(fk)) fk = "";
  $("#fm").innerHTML = opt(ms, fm, "Toate materiile"); $("#fc").innerHTML = '<option value="">Toate clasele</option>' + cs.map(c => `<option value="${c}"${c === fc ? " selected" : ""}>Clasa ${c}</option>`).join(""); $("#fk").innerHTML = opt(ks, fk, "Toate capitolele");
  const G = [];
  for (const x of inC.filter(x => !fk || chap(x) === fk).sort((a, b) => idx(a.materie) - idx(b.materie) || ci(a.clasa) - ci(b.clasa))) {
    let g = G.at(-1); if (!g || g.m !== x.materie || g.c !== x.clasa) G.push(g = { m: x.materie, c: x.clasa, ch: new Map() });
    if (!g.ch.has(chap(x))) g.ch.set(chap(x), []); g.ch.get(chap(x)).push(x);
  }
  const first = ls => Math.min(...ls.map(x => x.pag ?? 1e9));
  $("#ll").innerHTML = G.map(g => `<section class="grp"><p class="kick">${esc(g.m)} · clasa ${esc(g.c)}</p>${[...g.ch].sort((a, b) => first(a[1]) - first(b[1]) || NC(a[0], b[0])).map(([name, ls]) => `<div class="chh"><div><h3>${esc(name)}</h3><span class="tag">${ls.length} ${ls.length === 1 ? "temă" : "teme"}</span></div><span class="row"><a class="btn o s" href="teste?m=${enc(g.m)}&c=${enc(g.c)}&k=${enc(name)}">Test din tot capitolul</a>${can("resurse") && !ls[0].demo ? `<button class="btn o s" data-rnc="${esc(g.m)}|${esc(g.c)}|${esc(name)}">Redenumește</button>` : ""}</span></div><div class="posts">${ls.sort((a, b) => (a.pag ?? 1e9) - (b.pag ?? 1e9) || NC(a.tema, b.tema)).map(card).join("")}</div>`).join("")}</section>`).join("") || '<p class="tag mid">Nu sunt lecții. Adaugă prima lecție cu butonul +.</p>';
  $("#demoBtn").hidden = !(can("resurse") && L.some(x => x.demo));
};
const prep = x => ({ ...x, materie: canon(x.materie) });
const load = async () => {
  L = (await getDocs(collection(db, "lectii"))).docs.map(d => prep({ id: d.id, ...d.data() })); if (!L.length) L = DEMO.map(x => prep({ ...x }));
  try { RES = (await getDocs(collection(db, "resurse"))).docs.map(d => prep({ id: d.id, ...d.data() })).filter(r => r.tip === "Manual digital"); } catch (e) { RES = []; } draw();
};
/* Metadatele (listă rapidă) și textul (greu) sunt păstrate separat, ca lista să se încarce repede. */
async function saveLesson(v, id) {
  const { text, ...meta } = v, ref = id ? doc(db, "lectii", id) : doc(collection(db, "lectii"));
  await setDoc(ref, { ...meta, st: statOf(parse(text)) }); await setDoc(doc(db, "lectii_text", ref.id), { text }); return ref.id;
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
async function pagesText(pdf, a, b) {
  let out = ""; for (let i = Math.max(1, a); i <= Math.min(pdf.numPages, b); i++) { const t = await (await pdf.getPage(i)).getTextContent(); let line = "", y = null; for (const it of t.items) { if (y !== null && Math.abs(it.transform[5] - y) > 3) { out += line.trim() + "\n"; line = ""; } line += it.str + " "; y = it.transform[5]; } out += line.trim() + "\n\n"; }
  return clean(out);
}
const withEnd = (items, last) => items.map((x, i) => ({ ...x, e: Math.max(x.p, Math.min(x.p + 11, (items[i + 1]?.p ?? last + 1) - 1)) }));
async function toc(pdf) { // cuprinsul (semnele de carte) din PDF → capitole cu teme și pagini
  const out = await pdf.getOutline(); if (!out || !out.length) return []; const items = [];
  const walk = async (arr, ch, d) => { for (const it of arr) { if (it.items && it.items.length && d < 2) { await walk(it.items, d === 0 ? it.title.trim() : ch, d + 1); continue; } let pg = 0; try { let dest = it.dest; if (typeof dest === "string") dest = await pdf.getDestination(dest); if (Array.isArray(dest)) pg = (await pdf.getPageIndex(dest[0])) + 1; } catch (e) { } if (pg) items.push({ t: it.title.trim(), p: pg, ch }); } };
  await walk(out, "", 0); items.sort((a, b) => a.p - b.p); return withEnd(items, pdf.numPages);
}
/* ---------- cuprins tipărit: citit din paginile alese de profesor ---------- */
const nrm = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const CHRE = /^(capitolul|capitol|cap\.|unitatea(?:\s+de\s+(?:învățare|invatare))?|modulul|partea)\s+[\dIVXLC]+/i;
function parseToc(text) { // „Capitolul 1 …”, apoi „Titlu ........ 45” → [{t, p, ch}]
  const out = []; let buf = "", ch = "";
  for (const raw of text.split("\n")) {
    const l = raw.replace(/\s+/g, " ").trim(); if (!l || /^(cuprins|conținut|continut|pagina|pag\.?)$/i.test(l)) continue;
    const mp = /^(.*\p{L}.*?)[\s.·…_\-–—]+(\d{1,3})$/u.exec(l);
    if (CHRE.test(l)) { ch = (mp ? mp[1] : l).replace(/[\s.·…_\-–—]+$/, "").trim(); buf = ""; continue; }
    let t = "", p = 0;
    if (/^\d{1,3}$/.test(l)) { if (buf) { t = buf; p = +l; } } else if (mp) { t = (buf ? buf + " " : "") + mp[1]; p = +mp[2]; } else { buf = (buf && buf.length < 110 ? buf + " " : "") + l; continue; }
    buf = ""; t = t.replace(/[\s.·…_\-–—]+$/, "").trim(); if (p && (t.match(/\p{L}/gu) || []).length >= 4) out.push({ t, p, ch });
  }
  const keep = []; let last = 0; for (const x of out) if (x.p >= last - 1) { keep.push(x); last = Math.max(last, x.p); }
  const nums = keep.filter(x => /^\d+\.\d+/.test(x.t)).length; // „1. Mecanica” urmat de „1.1 …”, „1.2 …” → capitol
  if (nums >= 3) { let cur = ""; for (const x of keep) { const m = /^(\d+)\.(?!\d)\s*(.+)/.exec(x.t); if (m && keep.some(y => y.t.startsWith(m[1] + "."+ "1"))) { cur = x.t; x.hdr = 1; } else if (!x.ch && /^\d+\.\d+/.test(x.t)) x.ch = cur; } return keep.filter(x => !x.hdr); }
  return keep;
}
async function findOffset(pdf, items, after) { // diferența dintre numărul tipărit și pagina din PDF
  for (const it of items.slice(0, 4)) { const key = nrm(it.t).slice(0, 26); if (key.length < 8) continue; for (let off = 0; off <= 45; off++) { const pg = it.p + off; if (pg > pdf.numPages) break; if (pg <= after) continue; if (nrm(await pagesText(pdf, pg, pg)).includes(key)) return off; } }
  return 0;
}
async function tocFromPages(pdf, t1, t2, offManual) {
  const items = parseToc(await pagesText(pdf, t1, t2)); if (!items.length) return { T: [], off: 0 };
  const off = offManual ?? await findOffset(pdf, items, t2);
  return { off, T: withEnd(items.map(x => ({ ...x, p: x.p + off })), pdf.numPages) };
}
async function findTocPages(pdf) { // caută singur pagina „Cuprins”
  for (let i = 1; i <= Math.min(30, pdf.numPages); i++) {
    const tx = await pagesText(pdf, i, i); if (!/cuprins|con[tț]inut/i.test(nrm(tx)) && !(tx.split("\n").filter(l => /[\p{L}].*[\s.·…]\d{1,3}$/u.test(l.trim())).length >= 8)) continue;
    if (parseToc(tx).length < 4) continue; let e = i; while (e < Math.min(i + 4, pdf.numPages) && parseToc(await pagesText(pdf, e + 1, e + 1)).length >= 4) e++; return [i, e];
  }
  return null;
}
async function renderPage(pdf, n, canvas) { const pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), sc = Math.min(2, 760 / v0.width), v = pg.getViewport({ scale: sc }); canvas.width = v.width; canvas.height = v.height; await pg.render({ canvasContext: canvas.getContext("2d"), viewport: v }).promise; }
const tocText = T => { let cur = null, o = []; for (const x of T) { if ((x.ch || "") !== cur) { cur = x.ch || ""; if (cur) o.push("# " + cur); } o.push(`${x.t} | ${x.p}-${x.e}`); } return o.join("\n"); };
/* ---------- adăugare ---------- */
const start = () => { const d = sheet("Adaugă lecții", '<p class="tag">Alege cum aduci textul manualului:</p><button class="btn" id="o1" type="button" style="width:100%;margin-bottom:.7rem">📘 Din manualul de pe site (automat)</button><button class="btn o" id="o2" type="button" style="width:100%">✍️ Lipesc textul sau aleg un PDF</button>'); d.querySelector("#o1").onclick = () => { d.close(); importMan(); }; d.querySelector("#o2").onclick = () => { d.close(); form(); }; };
const clsOpt = (m, v) => opt(classesOf(m), v);
function importMan() {
  const d = modal("Import din manual", `<div class="grid"><label>Materia<select name="m">${opt(SUBJECTS, fm || undefined)}</select></label><label>Clasa<select name="c">${clsOpt(fm || SUBJECTS[0], fc)}</select></label></div>
<label>Manualul de pe site<select name="man"></select></label><p class="tag" id="mn"></p><label>sau alege fișierul PDF de pe telefon<input name="f" type="file" accept="application/pdf"></label>
<p class="kick" style="margin-top:1rem">Cuprinsul manualului (capitole și teme)</p>
<div class="grid"><label>Cuprinsul e la pagina (de la)<input name="t1" type="number" min="1" placeholder="ex. 3"></label><label>până la pagina<input name="t2" type="number" min="1" placeholder="ex. 4"></label></div>
<label>Diferența dintre numărul tipărit și pagina din PDF <small class="tag">(gol = o calculez eu)</small><input name="off" type="number" placeholder="automat"></label>
<div class="row" style="margin:.2rem 0 1rem"><button type="button" class="btn s" id="toc">Citește cuprinsul</button><button type="button" class="btn o s" id="pv">Vezi paginile manualului</button></div>
<div id="pvbox" hidden><div class="row pvc"><button type="button" class="btn o s" id="pp" aria-label="Pagina anterioară">‹</button><input id="pn" type="number" min="1" value="1" aria-label="Numărul paginii"><button type="button" class="btn o s" id="pnx" aria-label="Pagina următoare">›</button><button type="button" class="btn s" id="st1">Cuprinsul începe aici</button><button type="button" class="btn s" id="st2">Se termină aici</button></div><canvas id="pvc"></canvas></div>
<label>Capitolul pentru temele fără capitol <small class="tag">(opțional)</small><input name="k" placeholder="ex. Capitolul 1. Mecanica"></label>
<label>Capitolele și temele — un rând = o temă: <b>Titlu | pagina de la – până la</b>. Un rând care începe cu <b>#</b> este un capitol nou.<textarea name="t" rows="9" placeholder="# Capitolul 1. Optica&#10;Optica geometrică | 45-52&#10;Lentilele | 53-60&#10;# Capitolul 2. Electricitatea&#10;Curentul electric | 61-70"></textarea></label>`, async f => {
    const E = f.elements, src = E.f.files[0] || (RES.find(r => r.id === E.man.value) || {}).url; if (!src) throw new Error("Alege un manual sau un fișier PDF");
    let ch = E.k.value.trim(); const rows = [];
    for (const raw of E.t.value.split("\n")) { const l = raw.trim(); if (!l) continue; if (l.startsWith("#")) { ch = l.replace(/^#+\s*/, "").trim(); continue; } const m = /^(.+?)\s*[|;]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/.exec(l); if (m) rows.push({ ch, t: m[1].trim(), a: +m[2], b: +(m[3] || m[2]) }); }
    if (!rows.length) throw new Error("Scrie cel puțin o temă: Titlu | 45-52");
    const pdf = await openPdf(src), btn = f.querySelector(".btn"), man = E.f.files[0]?.name || (RES.find(r => r.id === E.man.value) || {}).titlu || ""; let ok = 0, skip = [];
    for (const [i, r] of rows.entries()) { btn.textContent = `Se importă ${i + 1}/${rows.length}…`; const text = await pagesText(pdf, r.a, r.b);
      if (text.length < 200) { skip.push(r.t); continue; } await saveLesson({ materie: E.m.value, clasa: E.c.value, capitol: r.ch, pag: r.a, tema: r.t, text: text.slice(0, 60000), sursa: `${man}, pag. ${r.a}${r.b > r.a ? "–" + r.b : ""}`, uid: user.uid, ts: Date.now() }); ok++; }
    toast(`Importate ${ok} lecții${skip.length ? ` · fără text în PDF (scanat?): ${skip.join(", ")}` : ""}`); load();
  }, "Importă temele");
  const f = d.querySelector("form"), E = f.elements;
  const fill = () => { const l = RES.filter(r => r.materie === E.m.value && (r.clasa === E.c.value || r.clasa === "Toate" || !r.clasa)); E.man.innerHTML = l.length ? l.map(r => `<option value="${r.id}">${esc(r.titlu)}${r.clasa && r.clasa !== "Toate" ? " (cl. " + esc(r.clasa) + ")" : ""}</option>`).join("") : '<option value="">— niciun manual încărcat —</option>'; $("#mn").innerHTML = l.length ? "" : 'Nu e niciun manual la această materie. Încarcă-l în <a href="resurse?m=' + encodeURIComponent(E.m.value) + '">Resurse</a> (tip „Manual digital”, fișier PDF) și revino.'; };
  E.m.onchange = () => { const c = E.c.value; E.c.innerHTML = clsOpt(E.m.value, c); fill(); }; E.c.onchange = fill; fill();
  const srcOf = () => E.f.files[0] || (RES.find(r => r.id === E.man.value) || {}).url;
  $("#toc").onclick = async () => {
    const b = $("#toc"); b.disabled = true; b.textContent = "Se citește…";
    try {
      const src = srcOf(); if (!src) throw new Error("Alege întâi un manual"); const pdf = await openPdf(src); let T = [], how = "";
      if (+E.t1.value) { const r = await tocFromPages(pdf, +E.t1.value, +E.t2.value || +E.t1.value, E.off.value === "" ? null : +E.off.value); T = r.T; if (E.off.value === "") E.off.value = r.off; how = `din paginile ${E.t1.value}–${E.t2.value || E.t1.value}`; }
      else {
        T = await toc(pdf); how = "din semnele de carte ale PDF-ului";
        if (!T.length) { const f = await findTocPages(pdf); if (f) { E.t1.value = f[0]; E.t2.value = f[1]; const r = await tocFromPages(pdf, f[0], f[1], E.off.value === "" ? null : +E.off.value); T = r.T; E.off.value = r.off; how = `din paginile ${f[0]}–${f[1]} (le-am găsit eu)`; } }
      }
      if (!T.length) { toast("Nu am găsit cuprinsul. Apasă „Vezi paginile manualului”, găsește pagina cuprinsului și apasă „Cuprinsul începe aici”."); $("#pvbox").hidden ? $("#pv").click() : 0; }
      else { E.t.value = tocText(T); const nc = new Set(T.map(x => x.ch).filter(Boolean)).size; toast(`Am găsit ${nc ? nc + " capitole și " : ""}${T.length} teme ${how}. Șterge rândurile care nu te interesează.`); }
    } catch (e) { toast(e.message); }
    b.disabled = false; b.textContent = "Citește cuprinsul";
  };
  let pdfP = null; const show = async n => { try { const pdf = pdfP || (pdfP = await openPdf(srcOf())); n = Math.min(Math.max(1, n), pdf.numPages); $("#pn").value = n; $("#pn").max = pdf.numPages; await renderPage(pdf, n, $("#pvc")); } catch (e) { toast(e.message || "Nu pot afișa pagina"); } };
  $("#pv").onclick = async () => { if (!srcOf()) return toast("Alege întâi un manual"); pdfP = null; $("#pvbox").hidden = false; await show(+E.t1.value || 1); $("#pvbox").scrollIntoView({ block: "nearest" }); };
  $("#pp").onclick = () => show(+$("#pn").value - 1); $("#pnx").onclick = () => show(+$("#pn").value + 1); $("#pn").onchange = () => show(+$("#pn").value);
  $("#st1").onclick = () => { E.t1.value = $("#pn").value; if (!+E.t2.value || +E.t2.value < +E.t1.value) E.t2.value = $("#pn").value; toast(`Cuprinsul începe la pagina ${$("#pn").value}`); };
  $("#st2").onclick = () => { E.t2.value = $("#pn").value; if (!+E.t1.value) E.t1.value = $("#pn").value; toast(`Cuprinsul se termină la pagina ${$("#pn").value}`); };
  E.man.onchange = E.f.onchange = () => { pdfP = null; };
}
const form = o => {
  const d = modal(o ? "Editează lecția" : "Lecție nouă", `<div class="grid"><label>Materia<select name="m">${opt(SUBJECTS, o?.materie || fm || undefined)}</select></label><label>Clasa<select name="c">${clsOpt(o?.materie || fm || SUBJECTS[0], o?.clasa || fc)}</select></label></div>
<label>Capitolul<input name="k" list="chl" value="${esc(o?.capitol || (fk && fk !== "Fără capitol" ? fk : ""))}" placeholder="ex. Capitolul 1. Optica"></label><datalist id="chl"></datalist>
<label>Tema<input name="t" required value="${esc(o?.tema || "")}" placeholder="ex. Optica geometrică"></label>
<details class="how"><summary>Cum scriu lecția?</summary><p>Lipește textul din manual. Un rând = o idee. Generatorul recunoaște singur:</p><ul><li><b>Definiții:</b> „Termen este …”, „Se numește … ”, „Prin … se înțelege …”, „Definiție: …”</li><li><b>Formule:</b> „Viteza: v = d / t”</li><li><b>Probleme rezolvate:</b> rândul „Problemă…”, apoi „Rezolvare: F = m · a = 2 · 3 = 6 N” și „Răspuns: …”. Din ele se fac probleme cu numere noi la fiecare test.</li><li>Poți scrie și direct o problemă-șablon:<br><code>@problema Un corp are masa {m:2-10} kg și accelerația {a:1-5} m/s². Calculează forța. =&gt; m*a | N</code></li></ul></details>
<div class="grid"><label>Extrage din PDF (opțional)<input name="f" type="file" accept="application/pdf"></label><label>Paginile<span class="row" style="flex-wrap:nowrap"><input name="p1" type="number" min="1" placeholder="de la"><input name="p2" type="number" min="1" placeholder="până la"></span></label></div><button type="button" class="btn o s" id="imp">Extrage textul din PDF</button>
<label style="margin-top:1rem">Textul lecției<textarea name="x" rows="12" required>${esc(o?.text || "")}</textarea></label><p class="tag" id="an"></p>`, async f => {
    const E = f.elements, v = { materie: E.m.value, clasa: E.c.value, capitol: E.k.value.trim(), tema: E.t.value.trim(), text: E.x.value.trim(), uid: user.uid, ts: Date.now() }; if (o?.sursa) v.sursa = o.sursa; if (o?.pag != null) v.pag = o.pag;
    if (v.text.length < 200) throw new Error("Textul e prea scurt (minim ~200 caractere)");
    await saveLesson(v, o?.id); toast("Lecție salvată"); load();
  }), E = d.querySelector("form").elements;
  const chl = () => { $("#chl").innerHTML = [...new Set(L.filter(l => l.materie === E.m.value && l.clasa === E.c.value && l.capitol).map(l => l.capitol))].sort(NC).map(c => `<option value="${esc(c)}">`).join(""); };
  E.m.onchange = () => { const c = E.c.value; E.c.innerHTML = clsOpt(E.m.value, c); chl(); }; E.c.onchange = chl; chl();
  const an = () => { const P = parse(E.x.value); $("#an").textContent = `Analiză: ${P.sents.length} propoziții utile · ${P.defs.length} definiții · ${P.forms.length} formule · ${Math.max(P.probs.length, P.sols.length)} probleme`; }; E.x.oninput = an; an();
  $("#imp").onclick = async () => { const file = E.f.files[0]; if (!file) return toast("Alege un fișier PDF"); const b = $("#imp"); b.disabled = true; b.textContent = "Se extrage…"; try { E.x.value = await pagesText(await openPdf(file), +E.p1.value || 1, +E.p2.value || (+E.p1.value || 1) + 4); an(); toast("Text extras. Verifică-l și corectează-l."); } catch (e) { toast(e.message || "Nu am putut citi PDF-ul"); } b.disabled = false; b.textContent = "Extrage textul din PDF"; };
};
$("#fm").onchange = e => { fm = e.target.value; fc = fk = ""; draw(); }; $("#fc").onchange = e => { fc = e.target.value; fk = ""; draw(); }; $("#fk").onchange = e => { fk = e.target.value; draw(); };
$("#ll").onclick = async e => {
  const ed = e.target.dataset.ed, rm = e.target.dataset.rm, rn = e.target.dataset.rnc;
  if (ed) { const x = L.find(y => y.id === ed); form({ ...x, text: x.text ?? (await getDoc(doc(db, "lectii_text", x.id))).data()?.text ?? "" }); }
  if (rm && confirm("Ștergi lecția?")) { await deleteDoc(doc(db, "lectii", rm)); try { await deleteDoc(doc(db, "lectii_text", rm)); } catch (x) { } load(); }
  if (rn) { const [m, c, k] = rn.split("|"), nn = prompt("Numele nou al capitolului:", k === "Fără capitol" ? "" : k); if (nn == null) return; for (const l of L.filter(x => x.materie === m && x.clasa === c && chap(x) === k)) await updateDoc(doc(db, "lectii", l.id), { capitol: nn.trim() }); toast("Capitol redenumit"); load(); }
};
$("#addL").onclick = start;
$("#demoBtn").onclick = async () => { for (const x of DEMO) await saveLesson({ materie: canon(x.materie), clasa: x.clasa, capitol: x.capitol || "Exemple", tema: x.tema.replace(/ \(exemplu\)$/, ""), text: x.text, uid: user.uid, ts: Date.now() }); toast("Lecțiile de exemplu au fost adăugate"); load(); };
whenRole(() => load().catch(() => { L = DEMO.map(x => prep({ ...x })); draw(); }));
