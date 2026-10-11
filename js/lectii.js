import { $, esc, toast, whenRole, modal, sheet, can, user, db, collection, getDocs, addDoc, setDoc, deleteDoc, doc } from "./core.js";
import { SUBJECTS, CLASSES } from "./config.js";
import { parse, clean } from "./engine.js";
import { DEMO } from "./demo.js";
let L = [], RES = [], fm = "", fc = "";
const idx = s => { const i = SUBJECTS.indexOf(s); return i < 0 ? 99 : i; }, ci = c => CLASSES.indexOf(c), opt = (a, v) => a.map(x => `<option value="${esc(x)}"${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
const stats = l => { const P = parse(l.text); return `${P.sents.length} propoziții · ${P.defs.length} definiții · ${P.forms.length} formule · ${P.probs.length} probleme`; };
const draw = () => {
  const m = [...new Set(L.map(l => l.materie))].sort((a, b) => idx(a) - idx(b));
  $("#fm").innerHTML = `<option value="">Toate materiile</option>` + opt(m, fm); $("#fc").innerHTML = `<option value="">Toate clasele</option>` + CLASSES.map(x => `<option value="${x}"${x === fc ? " selected" : ""}>Clasa ${x}</option>`).join("");
  const l = L.filter(x => (!fm || x.materie === fm) && (!fc || x.clasa === fc)).sort((a, b) => idx(a.materie) - idx(b.materie) || ci(a.clasa) - ci(b.clasa) || a.tema.localeCompare(b.tema, "ro"));
  $("#ll").innerHTML = l.map(x => `<article class="post lc" data-id="${x.id}"><div class="pb"><span class="pill">${esc(x.materie)} · cl. ${esc(x.clasa)}</span><h3>${esc(x.tema)}</h3><p>${stats(x)}</p>${x.sursa ? `<p class="tag">Din manual: ${esc(x.sursa)}</p>` : ""}<div class="pf"><a class="btn s" href="teste?l=${x.id}">Generează test</a>${can("resurse") && !x.demo ? `<span class="row"><button class="btn o s" data-ed="${x.id}">Editează</button><button class="btn o s" data-rm="${x.id}">Șterge</button></span>` : ""}</div></div></article>`).join("") || '<p class="tag mid">Nu sunt lecții. Adaugă prima lecție cu butonul +.</p>';
  $("#demoBtn").hidden = !(can("resurse") && L.some(x => x.demo));
};
const load = async () => {
  L = (await getDocs(collection(db, "lectii"))).docs.map(d => ({ id: d.id, ...d.data() })); if (!L.length) L = DEMO.map(x => ({ ...x }));
  try { RES = (await getDocs(collection(db, "resurse"))).docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.tip === "Manual digital"); } catch (e) { RES = []; } draw();
};
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
async function toc(pdf) { // cuprinsul (semnele de carte) din PDF → teme cu pagini
  const out = await pdf.getOutline(); if (!out || !out.length) return []; const items = [];
  const walk = async (arr, d) => { for (const it of arr) { if (it.items && it.items.length && d < 2) { await walk(it.items, d + 1); continue; } let pg = 0; try { let dest = it.dest; if (typeof dest === "string") dest = await pdf.getDestination(dest); if (Array.isArray(dest)) pg = (await pdf.getPageIndex(dest[0])) + 1; } catch (e) { } if (pg) items.push({ t: it.title.trim(), p: pg }); } };
  await walk(out, 0); items.sort((a, b) => a.p - b.p); return items.map((x, i) => ({ ...x, e: Math.max(x.p, Math.min(x.p + 11, (items[i + 1]?.p ?? pdf.numPages + 1) - 1)) }));
}
/* ---------- adăugare ---------- */
const start = () => { const d = sheet("Adaugă lecții", '<p class="tag">Alege cum aduci textul manualului:</p><button class="btn" id="o1" type="button" style="width:100%;margin-bottom:.7rem">📘 Din manualul de pe site (automat)</button><button class="btn o" id="o2" type="button" style="width:100%">✍️ Lipesc textul sau aleg un PDF</button>'); d.querySelector("#o1").onclick = () => { d.close(); importMan(); }; d.querySelector("#o2").onclick = () => { d.close(); form(); }; };
function importMan() {
  const d = modal("Import din manual", `<div class="grid"><label>Materia<select name="m">${opt(SUBJECTS)}</select></label><label>Clasa<select name="c">${opt(CLASSES)}</select></label></div>
<label>Manualul de pe site<select name="man"></select></label><p class="tag" id="mn"></p><label>sau alege fișierul PDF de pe telefon<input name="f" type="file" accept="application/pdf"></label>
<button type="button" class="btn o s" id="toc" style="margin:.4rem 0 1rem">Citește cuprinsul manualului</button>
<label>Temele de importat — un rând = o temă: <b>Titlu | pagina de la – până la</b><textarea name="t" rows="7" placeholder="Optica geometrică | 45-52&#10;Lentilele | 53-60"></textarea></label>`, async f => {
    const E = f.elements, src = E.f.files[0] || (RES.find(r => r.id === E.man.value) || {}).url; if (!src) throw new Error("Alege un manual sau un fișier PDF");
    const rows = E.t.value.split("\n").map(l => /^(.+?)\s*[|;]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/.exec(l.trim())).filter(Boolean); if (!rows.length) throw new Error("Scrie cel puțin o temă: Titlu | 45-52");
    const pdf = await openPdf(src), btn = f.querySelector(".btn"), man = E.f.files[0]?.name || (RES.find(r => r.id === E.man.value) || {}).titlu || ""; let ok = 0, skip = [];
    for (const [i, r] of rows.entries()) { btn.textContent = `Se importă ${i + 1}/${rows.length}…`; const a = +r[2], b = +(r[3] || r[2]), text = await pagesText(pdf, a, b);
      if (text.length < 200) { skip.push(r[1]); continue; } await addDoc(collection(db, "lectii"), { materie: E.m.value, clasa: E.c.value, tema: r[1].trim(), text: text.slice(0, 60000), sursa: `${man}, pag. ${a}${b > a ? "–" + b : ""}`, uid: user.uid, ts: Date.now() }); ok++; }
    toast(`Importate ${ok} lecții${skip.length ? ` · fără text în PDF (scanat?): ${skip.join(", ")}` : ""}`); load();
  }, "Importă temele");
  const f = d.querySelector("form"), E = f.elements;
  const fill = () => { const l = RES.filter(r => r.materie === E.m.value && (r.clasa === E.c.value || r.clasa === "Toate" || !r.clasa)); E.man.innerHTML = l.length ? l.map(r => `<option value="${r.id}">${esc(r.titlu)}${r.clasa && r.clasa !== "Toate" ? " (cl. " + esc(r.clasa) + ")" : ""}</option>`).join("") : '<option value="">— niciun manual încărcat —</option>'; $("#mn").innerHTML = l.length ? "" : 'Nu e niciun manual la această materie. Încarcă-l în <a href="resurse?m=' + encodeURIComponent(E.m.value) + '">Resurse</a> (tip „Manual digital”, fișier PDF) și revino.'; };
  E.m.onchange = E.c.onchange = fill; fill();
  $("#toc").onclick = async () => { const b = $("#toc"); b.disabled = true; b.textContent = "Se citește…"; try { const src = E.f.files[0] || (RES.find(r => r.id === E.man.value) || {}).url; if (!src) throw new Error("Alege întâi un manual"); const T = await toc(await openPdf(src)); if (!T.length) toast("PDF-ul nu are cuprins integrat. Scrie temele manual (Titlu | pagini)."); else { E.t.value = T.map(x => `${x.t} | ${x.p}-${x.e}`).join("\n"); toast(`Am găsit ${T.length} teme. Șterge rândurile care nu te interesează.`); } } catch (e) { toast(e.message); } b.disabled = false; b.textContent = "Citește cuprinsul manualului"; };
}
const form = o => {
  const d = modal(o ? "Editează lecția" : "Lecție nouă", `<div class="grid"><label>Materia<select name="m">${opt(SUBJECTS, o?.materie)}</select></label><label>Clasa<select name="c">${opt(CLASSES, o?.clasa)}</select></label></div><label>Tema<input name="t" required value="${esc(o?.tema || "")}" placeholder="ex. Optica geometrică"></label>
<details class="how"><summary>Cum scriu lecția?</summary><p>Lipește textul din manual. Un rând = o idee. Poți ajuta generatorul:</p><ul><li><b>Definiții:</b> „Termen este …”</li><li><b>Formule:</b> „Viteza: v = d / t”</li><li><b>Probleme cu numere diferite la fiecare test:</b><br><code>@problema Un corp are masa {m:2-10} kg și accelerația {a:1-5} m/s². Calculează forța. =&gt; m*a | N</code></li></ul></details>
<div class="grid"><label>Extrage din PDF (opțional)<input name="f" type="file" accept="application/pdf"></label><label>Paginile<span class="row" style="flex-wrap:nowrap"><input name="p1" type="number" min="1" placeholder="de la"><input name="p2" type="number" min="1" placeholder="până la"></span></label></div><button type="button" class="btn o s" id="imp">Extrage textul din PDF</button>
<label style="margin-top:1rem">Textul lecției<textarea name="x" rows="12" required>${esc(o?.text || "")}</textarea></label><p class="tag" id="an"></p>`, async f => {
    const E = f.elements, v = { materie: E.m.value, clasa: E.c.value, tema: E.t.value.trim(), text: E.x.value.trim(), uid: user.uid, ts: Date.now() }; if (o?.sursa) v.sursa = o.sursa;
    if (v.text.length < 200) throw new Error("Textul e prea scurt (minim ~200 caractere)");
    o ? await setDoc(doc(db, "lectii", o.id), v) : await addDoc(collection(db, "lectii"), v); toast("Lecție salvată"); load();
  }), E = d.querySelector("form").elements;
  const an = () => { const P = parse(E.x.value); $("#an").textContent = `Analiză: ${P.sents.length} propoziții utile · ${P.defs.length} definiții · ${P.forms.length} formule · ${P.probs.length} probleme`; }; E.x.oninput = an; an();
  $("#imp").onclick = async () => { const file = E.f.files[0]; if (!file) return toast("Alege un fișier PDF"); const b = $("#imp"); b.disabled = true; b.textContent = "Se extrage…"; try { E.x.value = await pagesText(await openPdf(file), +E.p1.value || 1, +E.p2.value || (+E.p1.value || 1) + 4); an(); toast("Text extras. Verifică-l și corectează-l."); } catch (e) { toast(e.message || "Nu am putut citi PDF-ul"); } b.disabled = false; b.textContent = "Extrage textul din PDF"; };
};
$("#fm").onchange = e => { fm = e.target.value; draw(); }; $("#fc").onchange = e => { fc = e.target.value; draw(); };
$("#ll").onclick = async e => { const ed = e.target.dataset.ed, rm = e.target.dataset.rm; if (ed) form(L.find(x => x.id === ed)); if (rm && confirm("Ștergi lecția?")) { await deleteDoc(doc(db, "lectii", rm)); load(); } };
$("#addL").onclick = start;
$("#demoBtn").onclick = async () => { for (const x of DEMO) await addDoc(collection(db, "lectii"), { materie: x.materie, clasa: x.clasa, tema: x.tema, text: x.text, uid: user.uid, ts: Date.now() }); toast("Lecțiile de exemplu au fost adăugate"); load(); };
whenRole(() => load().catch(() => { L = DEMO.map(x => ({ ...x })); draw(); }));
