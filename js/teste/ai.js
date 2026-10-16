// AI opțional (Gemini gratuit, prin Worker). Rulează o dată pe lecție; rezultatul se salvează și se refolosește la nesfârșit.
// Tot ce vine de la AI este verificat: propoziția-sursă trebuie să existe în textul lecției, șabloanele trebuie să se calculeze.
import { AI_URL } from "../core/config.js";
import { auth } from "../core/firebase.js";
import { nz, checkTemplate, calc, parseC, exercisesOf } from "./engine.js";
export const aiOn = () => !!AI_URL;
export const pause = ms => new Promise(r => setTimeout(r, ms));
// Extrage JSON-ul și din răspunsuri „murdare” (text înainte/după, ```json, virgule în plus).
// JSON tăiat la limita de tokeni: păstrăm tot ce e complet (elemente întregi din liste) și închidem parantezele.
const repair = t => {
  const st = []; let inS = false, ex = false, cutAt = -1, closers = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inS) { if (ex) ex = false; else if (c === "\\") ex = true; else if (c === '"') inS = false; continue; }
    if (c === '"') inS = true; else if (c === "{" || c === "[") st.push(c);
    else if (c === "}" || c === "]") { st.pop(); if (st.length >= 1 && st.length <= 2) { cutAt = i + 1; closers = st.map(x => x === "{" ? "}" : "]").reverse().join(""); } }
  }
  if (cutAt < 0) throw new Error("fără element complet");
  return JSON.parse(t.slice(0, cutAt) + closers);
};
const toJson = raw => {
  const t = String(raw || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(t); } catch (e) { }
  const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a >= 0 && b > a) { const c = t.slice(a, b + 1); try { return JSON.parse(c); } catch (e) { try { return JSON.parse(c.replace(/,\s*([}\]])/g, "$1")); } catch (e2) { } } }
  try { const a2 = t.indexOf("{"); if (a2 >= 0) return repair(t.slice(a2)); } catch (e3) { }
  throw new Error("Răspunsul AI nu e valid. Încearcă din nou.");
};
async function call(prompt, opt = {}) {
  const tok = await auth.currentUser?.getIdToken(); if (!tok) throw new Error("Autentifică-te pentru a folosi AI");
  for (let tr = 0; ; tr++) {
    let r; try { r = await fetch(AI_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, idToken: tok, json: true, temperature: opt.temperature ?? 0.3 }) }); } catch (e) { throw new Error("Serviciul AI nu răspunde (verifică internetul)"); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && tr < 1) { const m = /try again in ([\d.]+)\s*(ms|s|m)\b/i.exec(j.error || ""), w = m ? parseFloat(m[1]) * (m[2] === "ms" ? 1 : m[2] === "s" ? 1000 : 60000) : 0; if (w > 0 && w <= 45000) { await pause(w + 500); continue; } } // limita pe minut (Groq): așteptăm cât cere și mai încercăm o dată
    if (!r.ok) throw new Error(r.status === 429 ? "Limita gratuită AI s-a terminat pentru acum. Încearcă peste o oră sau mâine." : j.error || "Eroare AI (" + r.status + ")");
    try { return toJson(j.text); } catch (e) { if (tr >= 1) throw e; await pause(1500); } // o a doua încercare când JSON-ul vine tăiat sau stricat
  }
}
const arr = x => Array.isArray(x) ? x : [], str = (x, n = 400) => typeof x === "string" ? x.trim().slice(0, n) : "";
const inText = (hay, src) => { const n = nz(src); return n.length >= 15 && hay.includes(n.slice(0, 80)); };
export function validate(j, text) {
  const hay = nz(text), ok = { v: 1, ts: Date.now(), defs: [], mcq: [], tf: [], blank: [], open: [], sols: [], tpl: [] }, seen = new Set();
  for (const d of arr(j.definitii)) { const term = str(d.termen, 60), def = str(d.definitie, 400), src = str(d.sursa, 300); if (term && def.length >= 15 && term.split(/\s+/).length <= 6 && inText(hay, src) && !seen.has(nz(term))) { seen.add(nz(term)); ok.defs.push({ term, def, src }); } }
  for (const m of arr(j.grile)) { const q = str(m.enunt), o = arr(m.variante).map(x => str(x, 160)), k = +m.corect, src = str(m.sursa, 300); if (q.length >= 12 && o.length === 4 && o.every(Boolean) && new Set(o.map(nz)).size === 4 && k >= 0 && k <= 3 && Number.isInteger(k) && inText(hay, src)) ok.mcq.push({ q, o, k, src }); }
  for (const m of arr(j.adevarat_fals)) { const q = str(m.enunt), src = str(m.sursa, 300); if (q.length >= 12 && typeof m.adevarat === "boolean" && inText(hay, src)) ok.tf.push({ q, k: m.adevarat, src }); }
  for (const m of arr(j.completari)) { const q = str(m.enunt), a = str(m.raspuns, 60), src = str(m.sursa, 300); if (/_{2,}/.test(q) && a && inText(hay, src)) ok.blank.push({ q, a, src }); }
  for (const m of arr(j.raspuns_scurt)) { const q = str(m.enunt), a = str(m.model, 500), src = str(m.sursa, 300); if (q.length >= 12 && a.length >= 10 && inText(hay, src)) ok.open.push({ q, a, src }); }
  for (const m of arr(j.probleme)) { const q = str(m.enunt, 700), r = str(m.rezolvare, 900), a = str(m.raspuns, 120); if (q.length >= 25 && (r || a) && hay.includes(nz(q).slice(0, 40))) ok.sols.push({ q, a: (r + (a ? "\nRăspuns: " + a : "")).trim() }); }
  for (const t of arr(j.sabloane)) { const p = str(t, 700).replace(/=>\s*$/, ""); if (p && checkTemplate(p)) ok.tpl.push(p); }
  return ok;
}
export async function analyzeLesson(text, { materie, clasa, tema }) {
  const t = text.slice(0, 30000);
  const j = await call(`Ești profesor de ${materie}, clasa ${clasa}, în Republica Moldova. Din TEXTUL lecției „${tema}” de mai jos, și NUMAI din el, pregătește material pentru teste.
REGULI: nu folosi cunoștințe din afara textului. Fiecare element are câmpul "sursa" = primele 10-14 cuvinte ale propoziției-sursă din text, copiate EXACT (max 110 de caractere) care îl justifică. Scrie în limba română corectă. Fără întrebări despre figuri, pagini sau exerciții din manual. Răspunsurile greșite din grile trebuie să fie plauzibile, din aceeași materie.
Returnează DOAR JSON cu această formă:
{"definitii":[{"termen":"","definitie":"","sursa":""}],
"grile":[{"enunt":"","variante":["","","",""],"corect":0,"sursa":""}],
"adevarat_fals":[{"enunt":"","adevarat":true,"sursa":""}],
"completari":[{"enunt":"propoziție cu ___ în loc de cuvântul-cheie","raspuns":"","sursa":""}],
"raspuns_scurt":[{"enunt":"","model":"răspunsul-model complet","sursa":""}],
"probleme":[{"enunt":"problemă rezolvată în text, copiată","rezolvare":"","raspuns":""}],
"sabloane":["Enunț cu {a:2-10} și {b:1-5} ... => a*b | unitate"]}
Cantități: ~8 grile, ~6 adevărat/fals (jumătate false, falsul = o mică schimbare a unui fapt din text), ~6 completări, ~5 răspunsuri scurte, toate definițiile din text, toate problemele rezolvate din text (max 6).
"sabloane": pentru fiecare problemă numerică din text (max 4), un șablon în care numerele devin variabile {nume:min-max} sau {nume:min-max:pas}; formula de după => folosește doar acele nume și + - * / ^ ( ) sqrt(); după | scrie unitatea de măsură a rezultatului. Dacă nu există probleme numerice, lasă lista goală.
TEXT:
${t}`);
  return validate(j, t);
}
/* cuprinsul unui manual, citit de AI din textul paginilor de cuprins → [{t, p, ch}] */
export async function tocAI(raw) {
  const j = await call(`Acesta este textul paginilor „Cuprins” dintr-un manual școlar din Republica Moldova (extras din PDF, poate fi dezordonat). Scoate structura: capitole și, pentru fiecare, temele cu pagina tipărită.
REGULI: titluri curate (fără puncte de umplere și fără numărul paginii); unește titlurile rupte pe mai multe rânduri; nu repeta aceeași temă; nu include „Cuprins”, prefețe sau anexe fără pagină; păstrează ordinea din manual. Dacă manualul nu are capitole, pune toate temele într-un singur capitol cu titlul "".
Returnează DOAR JSON: {"capitole":[{"titlu":"","teme":[{"titlu":"","pagina":0}]}]}
TEXT:
${raw.slice(0, 20000)}`);
  const out = [], seen = new Set();
  for (const c of arr(j.capitole)) for (const t of arr(c.teme)) { const p = +t.pagina, ti = str(t.titlu, 160); if (ti && Number.isInteger(p) && p > 0 && !seen.has(nz(ti) + "|" + p)) { seen.add(nz(ti) + "|" + p); out.push({ t: ti, p, ch: str(c.titlu, 120) }); } }
  return out.sort((a, b) => a.p - b.p);
}

/* ---- test compus direct de AI, pe structura cerută (cantități pe tipuri) ----
   Fiecare item cere „sursa” (propoziție din lecție) și e verificat; ce nu trece de verificare rămâne pe locul lui din generatorul local.
   Capitolele lungi sunt împărțite în loturi de teme (fiecare lot = un apel), ca AI să vadă textul complet, nu doar începutul fiecărei teme.
   Problemele de calcul: AI dă doar ENUNȚUL și EXPRESIA de calcul; rezultatul îl calculează întotdeauna site-ul (modelele greșesc la aritmetică). */
const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BAD_Q = /(?<!\p{L})(?:în text|din text|text(?:ul|ului|e)?|lecți(?:a|ei|e)|mai sus|de mai sus|manual(?:ul|ului)?|conform|figur(?:a|ii)|fig\.|tabel(?:ul|ului)?|pagin(?:a|ii)|exerci[tț]i(?:ul|ului)|problema \d|activitatea)(?!\p{L})/iu; // întrebarea trebuie să se înțeleagă singură
const BAD_OPT = /^(?:toate|niciuna|nicio|toate cele|nici una)\b/i;
const NUMS_OK = new Set(["1", "2", "3", "10", "100", "1000", "0.5", "60", "3600", "180", "360"]); // constante permise în expresie chiar dacă nu apar în enunț
const numsOf = t => (String(t).replace(/(\d)\s(?=\d{3}(?!\d))/g, "$1").match(/\d+(?:[.,]\d+)?/g) || []).map(x => String(+x.replace(",", ".")));
const exampleOf = texts => { // probleme rezolvate (cu rezolvare) + exerciții numerotate din manual (fără rezolvare) → AI învață tipul, unitățile, nivelul
  const solved = texts.flatMap(t => { try { return parseC(t.text).sols.filter(x => x.q.length >= 40 && x.q.length <= 500 && /\d/.test(x.a)).slice(0, 2).map(x => ({ q: x.q, a: x.a.slice(0, 500) })); } catch (e) { return []; } });
  const plain = texts.flatMap(t => { try { return exercisesOf(t.text, 3).map(q => ({ q, a: "" })); } catch (e) { return []; } });
  const pick = (a, n) => a.filter((_, i) => i % Math.max(1, Math.ceil(a.length / n)) === 0).slice(0, n);
  return [...pick(solved, 2), ...pick(plain, 5 - Math.min(2, solved.length))];
};
const EXACT = new Set(["Matematica", "Fizica", "Chimia", "Informatica"]);
function planBatches(texts, max = 9000) { // [{ texts, w }] — loturi de teme consecutive, fiecare ≤ max caractere
  const cut = t => ({ ...t, text: t.text.slice(0, max) }), out = []; let cur = [], n = 0;
  for (const t0 of texts.map(cut)) { if (cur.length && n + t0.text.length > max) { out.push({ texts: cur, w: n }); cur = []; n = 0; } cur.push(t0); n += t0.text.length; }
  if (cur.length) out.push({ texts: cur, w: n });
  if (out.length <= 3) return out; return [0, 1, 2].map(i => out[Math.floor(i * out.length / 3)]); // max 3 apeluri (limita Groq pe minut/zi); peste 3 loturi se iau 3, la distanțe egale
}
function splitCounts(counts, w) { // împarte cantitățile pe loturi, proporțional cu textul (metoda restului cel mai mare)
  const tot = w.reduce((a, b) => a + b, 0) || 1, res = w.map(() => ({}));
  for (const [k, n] of Object.entries(counts)) { const raw = w.map(x => n * x / tot), fl = raw.map(Math.floor); let rest = n - fl.reduce((a, b) => a + b, 0); raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([_, i]) => { if (rest-- > 0) fl[i]++; }); fl.forEach((v, i) => { res[i][k] = v; }); }
  return res;
}
async function composeBatch(batch, counts, { materie, clasa, level, avoid, chapter }) {
  const body = batch.texts.map(t => `### ${t.tema}\n${t.text}`).join("\n\n"), ex = exampleOf(batch.texts);
  const want = { grile: counts.mcq || 0, adevarat_fals: counts.tf || 0, completari: counts.blank || 0, asocieri: counts.match || 0, raspuns_scurt: counts.open || 0, calcul: counts.num || 0, probleme: counts.prob || 0 };
  if (!Object.values(want).some(Boolean)) return null;
  const lv = ["ușoare, de recunoaștere și reproducere", "de dificultate medie, cu înțelegere", "dificile, cu aplicare și raționament"][level] || "de dificultate medie";
  return call(`Ești profesor de ${materie}, clasa ${clasa}, în Republica Moldova. Creează un TEST${chapter ? ` pentru capitolul „${chapter}”` : ""} din TEXTUL lecțiilor de mai jos, și NUMAI din el. Întrebările sunt ${lv}.
REGULI GENERALE: nu folosi cunoștințe din afara textului; nu întreba despre figuri, pagini, tabele, activități sau exerciții din manual; fiecare întrebare trebuie să se înțeleagă singură, fără manual (fără „în text”, „mai sus”, „lecția”); limba română corectă gramatical, cu diacritice (ă, â, î, ș, ț); întrebări diferite între ele, din teme diferite, variate (nu două întrebări despre aceeași propoziție). Fiecare element are "sursa" = primele 10-14 cuvinte ale propoziției-sursă din text, copiate EXACT (max 110 de caractere) pe care se sprijină.
GRILE: 4 variante plauzibile, de aceeași natură și lungime apropiată, din aceeași materie; o singură corectă; poziția corectă variază; răspunsul corect NU apare în enunț; fără „toate/niciuna dintre cele de mai sus”.
ADEVĂRAT/FALS: afirmații complete, de sine stătătoare (fără „acesta/aceasta” la început); aproximativ jumătate false (falsul = o mică schimbare a unui fapt din text: număr, termen, sens).
COMPLETĂRI: o propoziție cu ___ în locul UNUI singur termen-cheie (1–3 cuvinte), fără alt termen la fel de potrivit.
ASOCIERI: exact 4 perechi, corespondenți distincți.
CALCUL: probleme noi, cu numere noi, DAR cu aceleași formule și aceeași metodă ca la tema respectivă${ex.length ? " (vezi EXEMPLELE din manual de mai jos: învață din ele tipul de problemă, mărimile, unitățile de măsură și nivelul; schimbă numerele și situația)" : ""}.${EXACT.has(materie) ? " Textul e extras din PDF și FORMULELE din el pot lipsi sau fi rupte: folosește formulele standard ale temei pentru clasa " + clasa + " (cele din programa școlară), nu inventa formule." : ""} Datele numerice trebuie să fie complete în enunț (inclusiv constantele necesare, ex. viteza luminii), enunțul să nu pomenească „manualul”. Pune în "expresie" UN SINGUR calcul aritmetic final, folosind DOAR numerele din enunț și simbolurile + - * / ^ ( ) sqrt(), fără unități și fără litere (ex. "sqrt(3^2+4^2)" sau "0.5*12*8"); pune în "unitate" unitatea rezultatului. NU calcula tu rezultatul final — îl calculează calculatorul. "rezolvare" = pașii pe scurt, cu formula folosită.${avoid.length ? `\nNu repeta aceste întrebări deja folosite: ${avoid.slice(0, 40).map(x => "„" + x.slice(0, 70) + "”").join("; ")}` : ""}
Cantități EXACTE (dacă o cantitate e 0, lasă lista goală): ${Object.entries(want).map(([k, v]) => `${k}: ${v}`).join(", ")}.
Returnează DOAR JSON:
{"grile":[{"enunt":"","variante":["","","",""],"corect":0,"sursa":""}],
"adevarat_fals":[{"enunt":"","adevarat":true,"sursa":""}],
"completari":[{"enunt":"","raspuns":"","sursa":""}],
"asocieri":[{"enunt":"Asociază …","perechi":[{"termen":"","corespondent":""}],"sursa":""}],
"raspuns_scurt":[{"enunt":"","model":"","sursa":""}],
"calcul":[{"enunt":"","expresie":"","unitate":"","rezolvare":"","sursa":""}],
"probleme":[{"enunt":"","rezolvare":"","raspuns":"","sursa":""}]}
${ex.length ? "EXEMPLE DE PROBLEME DIN MANUAL (nu le copia; creează altele de același tip, cu alte numere):\n" + ex.map((x, i) => `${i + 1}) ${x.q}${x.a ? "\n   Rezolvare: " + x.a : ""}`).join("\n") + "\n" : ""}TEXT:
${body}`);
}
export async function composeTest(texts, counts, { materie, clasa, level = 1, avoid = [], chapter = "" }) {
  const hay = nz(texts.map(t => t.text).join("\n")), batches = planBatches(texts), parts = splitCounts(counts, batches.map(b => b.w)), used = [...avoid], js = [];
  for (const [i, b] of batches.entries()) { try { const j = await composeBatch(b, parts[i], { materie, clasa, level, avoid: used, chapter }); if (j) { js.push(j); [...arr(j.grile), ...arr(j.adevarat_fals), ...arr(j.completari), ...arr(j.raspuns_scurt)].forEach(x => used.push(str(x.enunt, 120))); } } catch (e) { if (!js.length && i === batches.length - 1) throw e; } if (i < batches.length - 1) await pause(9000); }
  const out = { mcq: [], tf: [], blank: [], match: [], open: [], num: [], prob: [] }, seenQ = new Set(), fresh = q => { const k = nz(q).slice(0, 60); if (seenQ.has(k)) return false; seenQ.add(k); return true; };
  for (const j of js) {
    for (const m of arr(j.grile)) { const q = str(m.enunt), o = arr(m.variante).map(x => str(x, 160)), k = +m.corect; if (q.length >= 12 && !BAD_Q.test(q) && o.length === 4 && o.every(Boolean) && !o.some(x => BAD_OPT.test(x)) && new Set(o.map(nz)).size === 4 && Number.isInteger(k) && k >= 0 && k <= 3 && !(nz(o[k]).length >= 4 && nz(q).includes(nz(o[k]))) && inText(hay, str(m.sursa, 300)) && fresh(q)) { const sh = shuffle(o.map((x, i) => [x, i === k])); out.mcq.push({ q: { t: "mcq", q, o: sh.map(x => x[0]) }, k: sh.findIndex(x => x[1]), src: str(m.sursa, 300) }); } }
    for (const m of arr(j.adevarat_fals)) { const q = str(m.enunt); if (q.length >= 12 && !BAD_Q.test(q) && typeof m.adevarat === "boolean" && inText(hay, str(m.sursa, 300)) && fresh(q)) out.tf.push({ q: { t: "tf", q }, k: m.adevarat, src: str(m.sursa, 300) }); }
    for (const m of arr(j.completari)) { const q = str(m.enunt).replace(/_{2,}/g, "_____"), a = str(m.raspuns, 60); if ((q.match(/_{5}/g) || []).length === 1 && !BAD_Q.test(q) && a && !nz(q).includes(nz(a)) && inText(hay, str(m.sursa, 300)) && fresh(q)) out.blank.push({ q: { t: "blank", q }, k: [a], src: str(m.sursa, 300) }); }
    for (const m of arr(j.asocieri)) { const P = arr(m.perechi).map(x => [str(x.termen, 90), str(x.corespondent, 140)]).filter(x => x[0] && x[1]); if (P.length === 4 && new Set(P.map(x => nz(x[1]))).size === 4 && new Set(P.map(x => nz(x[0]))).size === 4 && inText(hay, str(m.sursa, 300))) { const R = shuffle(P.map((x, i) => [x[1], i])); out.match.push({ q: { t: "match", q: str(m.enunt) || "Asociază noțiunile cu explicațiile potrivite.", L: P.map(x => x[0]), R: R.map(x => x[0]) }, k: P.map((_, i) => R.findIndex(x => x[1] === i)), src: str(m.sursa, 300) }); } }
    for (const m of arr(j.raspuns_scurt)) { const q = str(m.enunt), a = str(m.model, 500); if (q.length >= 12 && !BAD_Q.test(q) && a.length >= 10 && inText(hay, str(m.sursa, 300)) && fresh(q)) out.open.push({ q: { t: "open", q }, k: a, src: str(m.sursa, 300) }); }
    for (const m of arr(j.calcul)) { // rezultatul îl calculăm noi, din expresie; expresia poate folosi doar numere din enunț (sau constante uzuale)
      const q = str(m.enunt, 600), ex = str(m.expresie, 200), u = str(m.unitate, 20); if (q.length < 25 || !ex || BAD_Q.test(q) || /[a-zA-Z]/.test(ex.replace(/sqrt|abs|pi/g, ""))) continue;
      let v; try { v = calc(ex, {}); } catch (e) { continue; } if (!isFinite(v) || Math.abs(v) > 1e9) continue;
      const have = new Set(numsOf(q)); if (!numsOf(ex).every(n => have.has(n) || NUMS_OK.has(n))) continue; if (!numsOf(ex).some(n => have.has(n))) continue;
      v = +v.toPrecision(8); const whole = Math.abs(v - Math.round(v)) < 1e-9, rs = String(+v.toFixed(2)).replace(".", ",");
      if (fresh(q)) out.num.push({ q: { t: "num", q: q + (u ? ` Exprimă rezultatul în ${u}` : "") + (whole ? "." : (u ? "," : ".") + " rotunjit la 2 zecimale.") }, k: { v }, src: `${str(m.sursa, 300)} · Rezolvare: ${str(m.rezolvare, 400) || ex} = ${rs}${u ? " " + u : ""}`.replace(/^ · /, "") });
    }
    for (const m of arr(j.probleme)) { const q = str(m.enunt, 700), r = str(m.rezolvare, 900), a = str(m.raspuns, 120); if (q.length >= 25 && (r || a) && !BAD_Q.test(q) && inText(hay, str(m.sursa, 300)) && fresh(q)) out.prob.push({ q: { t: "prob", q }, k: (r + (a ? "\nRăspuns: " + a : "")).trim(), src: str(m.sursa, 300) }); }
  }
  return out;
}
