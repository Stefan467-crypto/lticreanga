// AI opțional (Gemini gratuit, prin Worker). Rulează o dată pe lecție; rezultatul se salvează și se refolosește la nesfârșit.
// Tot ce vine de la AI este verificat: propoziția-sursă trebuie să existe în textul lecției, șabloanele trebuie să se calculeze.
import { AI_URL } from "../core/config.js";
import { auth } from "../core/firebase.js";
import { nz, checkTemplate, calc, parseC, exercisesOf } from "./engine.js?v=27";
import { pickSources, planOf, styleOf, assignSources, validateGroup, localTask } from "./surse.js?v=27";
export const aiOn = () => !!AI_URL;
export const pause = ms => new Promise(r => setTimeout(r, ms));
let lastModel = ""; // modelul care a răspuns ultima dată (Gemini nu cere pauzele lungi necesare pentru limita pe minut Groq)
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
  return obj(JSON.parse(t.slice(0, cutAt) + closers));
};
const obj = v => { if (v && typeof v === "object" && !Array.isArray(v)) return v; throw new Error("nu e obiect"); };
const toJson = raw => {
  const t = String(raw || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try { return obj(JSON.parse(t)); } catch (e) { }
  const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a >= 0 && b > a) { const c = t.slice(a, b + 1); try { return obj(JSON.parse(c)); } catch (e) { try { return obj(JSON.parse(c.replace(/,\s*([}\]])/g, "$1"))); } catch (e2) { } } }
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
    lastModel = j.model || "";
    try { return toJson(j.text); } catch (e) { if (tr >= 1) throw e; await pause(1500); } // o a doua încercare când JSON-ul vine tăiat sau stricat
  }
}
const arr = x => Array.isArray(x) ? x : [], objs = x => arr(x).filter(v => v && typeof v === "object" && !Array.isArray(v)), str = (x, n = 400) => typeof x === "string" ? x.trim().slice(0, n) : "";
const inText = (hay, src) => { const n = nz(src); return n.length >= 15 && hay.includes(n.slice(0, 80)); };
export function validate(j, text) {
  const hay = nz(text), ok = { v: 1, ts: Date.now(), defs: [], mcq: [], tf: [], blank: [], open: [], sols: [], tpl: [] }, seen = new Set();
  for (const d of objs(j.definitii)) { const term = str(d.termen, 60), def = str(d.definitie, 400), src = str(d.sursa, 300); if (term && def.length >= 15 && term.split(/\s+/).length <= 6 && inText(hay, src) && !seen.has(nz(term))) { seen.add(nz(term)); ok.defs.push({ term, def, src }); } }
  for (const m of objs(j.grile)) { const q = str(m.enunt), o = arr(m.variante).map(x => str(x, 160)), k = +m.corect, src = str(m.sursa, 300); if (q.length >= 12 && o.length === 4 && o.every(Boolean) && new Set(o.map(nz)).size === 4 && k >= 0 && k <= 3 && Number.isInteger(k) && inText(hay, src)) ok.mcq.push({ q, o, k, src }); }
  for (const m of objs(j.adevarat_fals)) { const q = str(m.enunt), src = str(m.sursa, 300); if (q.length >= 12 && typeof m.adevarat === "boolean" && inText(hay, src)) ok.tf.push({ q, k: m.adevarat, src }); }
  for (const m of objs(j.completari)) { const q = str(m.enunt), a = str(m.raspuns, 60), src = str(m.sursa, 300); if (/_{2,}/.test(q) && a && inText(hay, src)) ok.blank.push({ q, a, src }); }
  for (const m of objs(j.raspuns_scurt)) { const q = str(m.enunt), a = str(m.model, 500), src = str(m.sursa, 300); if (q.length >= 12 && a.length >= 10 && inText(hay, src)) ok.open.push({ q, a, src }); }
  for (const m of objs(j.probleme)) { const q = str(m.enunt, 700), r = str(m.rezolvare, 900), a = str(m.raspuns, 120); if (q.length >= 25 && (r || a) && hay.includes(nz(q).slice(0, 40))) ok.sols.push({ q, a: (r + (a ? "\nRăspuns: " + a : "")).trim() }); }
  for (const t of objs(j.sabloane)) { const p = str(t, 700).replace(/=>\s*$/, ""); if (p && checkTemplate(p)) ok.tpl.push(p); }
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
  for (const c of objs(j.capitole)) for (const t of objs(c.teme)) { const p = +t.pagina, ti = str(t.titlu, 160); if (ti && Number.isInteger(p) && p > 0 && !seen.has(nz(ti) + "|" + p)) { seen.add(nz(ti) + "|" + p); out.push({ t: ti, p, ch: str(c.titlu, 120) }); } }
  return out.sort((a, b) => a.p - b.p);
}

/* ---- test compus direct de AI, pe structura cerută (cantități pe tipuri) ----
   Fiecare item cere „sursa” (propoziție din lecție) și e verificat; ce nu trece de verificare rămâne pe locul lui din generatorul local.
   Capitolele lungi sunt împărțite în loturi de teme (fiecare lot = un apel), ca AI să vadă textul complet, nu doar începutul fiecărei teme.
   Problemele de calcul: AI dă doar ENUNȚUL și EXPRESIA de calcul; rezultatul îl calculează întotdeauna site-ul (modelele greșesc la aritmetică). */
const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BAD_Q = /(?<!\p{L})(?:în text|din text|text(?:ul|ului|e)?|lecți(?:a|ei|e)|mai sus|de mai sus|manual(?:ul|ului)?|conform|figur(?:a|ii)|fig\.|tabel(?:ul|ului)?|pagin(?:a|ii)|exerci[tț]i(?:ul|ului)|problema \d|activitatea)(?!\p{L})/iu; // întrebarea trebuie să se înțeleagă singură
const BAD_OPT = /^(?:toate|niciuna|nicio|toate cele|nici una)\b/i;
const NUMS_OK = new Set(["1", "2", "3", "10", "100", "1000", "0.5", "60", "3600", "180", "360", "4200", "9.8", "273", "340"]); // + constante uzuale (c apă, g, 0 °C în K, viteza sunetului)
// conversii de unități: g→kg, cm→m, min→s, kW→W… (numărul din expresie = numărul din enunț × / ÷ 10^k sau × 60 / 3600)
const derived = (n, have) => { n = +n; for (const h0 of have) { const h = +h0; if (!h || !n || h === n) continue; const r = n > h ? n / h : h / n, k = Math.round(r); if (Math.abs(r - k) < 1e-9 && (/^10+$/.test(String(k)) || k === 60 || k === 3600 || k === 24)) return true; } return false; };
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
// Ce fel de exerciții are fiecare materie (se adaugă în promptul AI). Tipurile permise vin și din js/teste/exam.js (profile).
const LANGS = { "Limba engleză": "engleză", "Limba franceză": "franceză" };
const SUBJ_RULES = {
  "Matematica": "MATERIA: matematică. Întrebările verifică definiții, proprietăți, formule și metode; la CALCUL dai probleme cu calcul efectiv (numere, expresii, ecuații, geometrie), cu date complete. Fără eseuri, fără întrebări de opinie.",
  "Fizica": "MATERIA: fizică. Mixează: definiții și legi (grile, adevărat/fals, completări), mărimi și unități de măsură, interpretarea unor situații fizice, ȘI probleme de calcul cu formulele temei (date, necunoscută, unități; folosește g = 10 N/kg dacă e nevoie și scrie constantele în enunț). Fără eseuri.",
  "Chimia": "MATERIA: chimie. Mixează: noțiuni, proprietăți, formule chimice, ecuații de reacție (completări), clasificări (asocieri) ȘI probleme de calcul (masă molară, mol, concentrație, stoechiometrie; scrie masele atomice în enunț). Fără eseuri.",
  "Informatica": "MATERIA: informatică. Întrebări despre noțiuni, sintaxă, tipuri de date, rezultatul unei secvențe scurte de cod (scrisă în enunț), reprezentarea informației; la CALCUL: număr de iterații, valori, conversii simple. Fără eseuri.",
  "Biologie": "MATERIA: biologie. Noțiuni, structuri și funcții, clasificări, procese (grile, adevărat/fals, completări, asocieri organ–funcție sau termen–definiție). Probleme de calcul DOAR dacă lecția are date numerice (ex. genetică, ecologie). Fără eseuri lungi.",
  "Științe": "MATERIA: științe (clasa a V-a). Întrebări simple, concrete, pe înțelesul copiilor de 10–11 ani: noțiuni, fenomene, observații, clasificări. Fără calcule complicate.",
  "Geografie": "MATERIA: geografie. Locuri, relief, clime, ape, populație, economie: noțiuni, localizări, cauze și efecte, asocieri (termen–definiție, țară/regiune–caracteristică). Calcule DOAR simple (densitate, scară, altitudine, spor natural), dacă apar în lecție.",
  "Istoria": "MATERIA: istorie (curriculum Republica Moldova: Istoria românilor și universală). Evenimente, date, personalități, cauze și consecințe, cronologie, relații de cauzalitate, timp–spațiu–personalitate: grile, adevărat/fals, completări cu date/nume/locuri, asocieri eveniment–dată sau personalitate–rol. Datele (ani, secole) se copiază exact din text. FĂRĂ probleme de calcul.",
  "Limba română": "MATERIA: limba și literatura română. Teorie literară (curente, genuri, specii, figuri de stil, trăsături), autori și opere, personaje, teme și motive, ȘI limbă (părți de vorbire, sintaxă, ortografie, vocabular). Fără probleme de calcul. Nu cere interpretarea unui fragment care nu e în textul dat.",
  "Literatura universală": "MATERIA: literatură universală. Autori, opere, curente, teme, personaje, context cultural; asocieri autor–operă. Fără probleme de calcul.",
  "Limba engleză": "SUBJECT: English as a foreign language. Write ALL questions and answer options in ENGLISH (level of the class), not in Romanian. Test the language itself: vocabulary (meaning, synonyms, word forms), grammar (choose the correct form, tenses, prepositions, articles), reading comprehension of the given text, gap-fill sentences, matching words with definitions. No calculation problems.",
  "Limba franceză": "MATIÈRE : français langue étrangère. Écris TOUTES les questions et les variantes en FRANÇAIS (niveau de la classe), pas en roumain. Teste la langue : vocabulaire, grammaire (conjugaison, accords, articles, prépositions), compréhension du texte donné, phrases à compléter, associations mot–définition. Pas de problèmes de calcul.",
  "Educația pentru societate": "MATERIA: educație pentru societate. Noțiuni civice, drepturi și responsabilități, instituții, procese democratice, studii de caz scurte (grile, adevărat/fals, completări, asocieri). Fără calcule.",
  "Dezvoltarea personală": "MATERIA: dezvoltare personală. Noțiuni, comportamente, situații de viață, decizii (grile, adevărat/fals, completări). Fără calcule.",
  "Educația ecologică": "MATERIA: educație ecologică. Noțiuni de ecologie și protecția mediului, cauze și efecte, bune practici (grile, adevărat/fals, completări, asocieri).",
  "Educația muzicală": "MATERIA: educație muzicală. Noțiuni de teorie muzicală, compozitori, epoci și genuri, instrumente (grile, adevărat/fals, completări, asocieri compozitor–operă). Fără calcule.",
  "Educația plastică": "MATERIA: educație plastică. Noțiuni (culoare, linie, compoziție, tehnici), artiști și curente (grile, adevărat/fals, completări, asocieri). Fără calcule.",
  "Educația tehnologică": "MATERIA: educație tehnologică. Materiale, unelte, tehnici, etape ale unui proiect, norme de siguranță (grile, adevărat/fals, completări, asocieri). Fără calcule complicate.",
  "Educație fizică": "MATERIA: educație fizică. Reguli, tehnică, igiena efortului, noțiuni despre mișcare și sănătate (grile, adevărat/fals, completări). Fără calcule.",
  "Arta comportamentală": "MATERIA: arta comportamentală. Reguli de conduită, politețe, situații de viață (grile, adevărat/fals, completări). Fără calcule.",
};
async function composeBatch(batch, counts, { materie, clasa, level, avoid, chapter }) {
  const body = batch.texts.map(t => `### ${t.tema}\n${t.text}`).join("\n\n"), ex = exampleOf(batch.texts);
  const want = { grile: counts.mcq || 0, adevarat_fals: counts.tf || 0, completari: counts.blank || 0, asocieri: counts.match || 0, raspuns_scurt: counts.open || 0, calcul: counts.num || 0, probleme: counts.prob || 0 };
  if (!Object.values(want).some(Boolean)) return null;
  const lv = ["ușoare, de recunoaștere și reproducere", "de dificultate medie, cu înțelegere", "dificile, cu aplicare și raționament"][level] || "de dificultate medie";
  return call(`Ești profesor de ${materie}, clasa ${clasa}, în Republica Moldova. Creează un TEST${chapter ? ` pentru capitolul „${chapter}”` : ""} din TEXTUL lecțiilor de mai jos, și NUMAI din el. Întrebările sunt ${lv}.
REGULI GENERALE: nu folosi cunoștințe din afara textului; nu întreba despre figuri, pagini, tabele, activități sau exerciții din manual; fiecare întrebare trebuie să se înțeleagă singură, fără manual (fără „în text”, „mai sus”, „lecția”); ${LANGS[materie] ? `scrie în limba ${LANGS[materie]} (nu în română), corect gramatical;` : "limba română corectă gramatical, cu diacritice (ă, â, î, ș, ț);"} întrebări diferite între ele, din teme diferite, variate (nu două întrebări despre aceeași propoziție). Fiecare element are "sursa" = primele 10-14 cuvinte ale propoziției-sursă din text, copiate EXACT (max 110 de caractere) pe care se sprijină.${SUBJ_RULES[materie] ? `\n${SUBJ_RULES[materie]}` : ""}
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
  const NUMK = ["num", "prob"]; let lastErr = null;
  for (const [i, b] of batches.entries()) {
    const parts2 = [Object.fromEntries(Object.entries(parts[i]).filter(([k]) => !NUMK.includes(k))), Object.fromEntries(Object.entries(parts[i]).filter(([k]) => NUMK.includes(k)))]; // întâi tipurile cu text, apoi calculele
    for (const [pi, cn] of parts2.entries()) {
      if (!Object.values(cn).some(Boolean)) continue;
      try { const j = await composeBatch(b, cn, { materie, clasa, level, avoid: used, chapter }); if (j) { js.push(j); [...objs(j.grile), ...objs(j.adevarat_fals), ...objs(j.completari), ...objs(j.raspuns_scurt)].forEach(x => used.push(str(x.enunt, 120))); } } catch (e) { lastErr = e; }
      await pause(i < batches.length - 1 || (pi === 0 && Object.values(parts2[1]).some(Boolean)) ? (/^gemini/.test(lastModel) ? 700 : 9000) : 0);
    }
  }
  if (!js.length) throw lastErr || new Error("AI nu a returnat nimic. Încearcă din nou.");
  const out = { mcq: [], tf: [], blank: [], match: [], open: [], num: [], prob: [] }, seenQ = new Set(), fresh = q => { const k = nz(q).slice(0, 60); if (seenQ.has(k)) return false; seenQ.add(k); return true; };
  for (const j of js) {
    for (const m of objs(j.grile)) { const q = str(m.enunt), o = arr(m.variante).map(x => str(x, 160)), k = +m.corect; if (q.length >= 12 && !BAD_Q.test(q) && o.length === 4 && o.every(Boolean) && !o.some(x => BAD_OPT.test(x)) && new Set(o.map(nz)).size === 4 && Number.isInteger(k) && k >= 0 && k <= 3 && !(nz(o[k]).length >= 4 && nz(q).includes(nz(o[k]))) && inText(hay, str(m.sursa, 300)) && fresh(q)) { const sh = shuffle(o.map((x, i) => [x, i === k])); out.mcq.push({ q: { t: "mcq", q, o: sh.map(x => x[0]) }, k: sh.findIndex(x => x[1]), src: str(m.sursa, 300) }); } }
    for (const m of objs(j.adevarat_fals)) { const q = str(m.enunt); if (q.length >= 12 && !BAD_Q.test(q) && typeof m.adevarat === "boolean" && inText(hay, str(m.sursa, 300)) && fresh(q)) out.tf.push({ q: { t: "tf", q }, k: m.adevarat, src: str(m.sursa, 300) }); }
    for (const m of objs(j.completari)) { const q = str(m.enunt).replace(/_{2,}/g, "_____"), a = str(m.raspuns, 60); if ((q.match(/_{5}/g) || []).length === 1 && !BAD_Q.test(q) && a && !nz(q).includes(nz(a)) && inText(hay, str(m.sursa, 300)) && fresh(q)) out.blank.push({ q: { t: "blank", q }, k: [a], src: str(m.sursa, 300) }); }
    for (const m of objs(j.asocieri)) { const P = objs(m.perechi).map(x => [str(x.termen, 90), str(x.corespondent, 140)]).filter(x => x[0] && x[1]); if (P.length === 4 && new Set(P.map(x => nz(x[1]))).size === 4 && new Set(P.map(x => nz(x[0]))).size === 4 && inText(hay, str(m.sursa, 300))) { const R = shuffle(P.map((x, i) => [x[1], i])); out.match.push({ q: { t: "match", q: str(m.enunt) || "Asociază noțiunile cu explicațiile potrivite.", L: P.map(x => x[0]), R: R.map(x => x[0]) }, k: P.map((_, i) => R.findIndex(x => x[1] === i)), src: str(m.sursa, 300) }); } }
    for (const m of objs(j.raspuns_scurt)) { const q = str(m.enunt), a = str(m.model, 500); if (q.length >= 12 && !BAD_Q.test(q) && a.length >= 10 && inText(hay, str(m.sursa, 300)) && fresh(q)) out.open.push({ q: { t: "open", q }, k: a, src: str(m.sursa, 300) }); }
    for (const m of objs(j.calcul)) { // rezultatul îl calculăm noi, din expresie; expresia poate folosi doar numere din enunț (sau constante uzuale)
      const q = str(m.enunt, 600), ex = str(m.expresie, 200), u = str(m.unitate, 20); if (q.length < 25 || !ex || BAD_Q.test(q) || /[a-zA-Z]/.test(ex.replace(/sqrt|abs|pi/g, ""))) continue;
      let v; try { v = calc(ex, {}); } catch (e) { continue; } if (!isFinite(v) || Math.abs(v) > 1e9) continue;
      const have = new Set(numsOf(q)); if (!numsOf(ex).every(n => have.has(n) || NUMS_OK.has(n) || derived(n, have))) continue; if (!numsOf(ex).some(n => have.has(n) || derived(n, have))) continue;
      v = +v.toPrecision(8); const whole = Math.abs(v - Math.round(v)) < 1e-9, rs = String(+v.toFixed(2)).replace(".", ",");
      if (fresh(q)) out.num.push({ q: { t: "num", q: q + (u ? ` Exprimă rezultatul în ${u}` : "") + (whole ? "." : (u ? "," : ".") + " rotunjit la 2 zecimale.") }, k: { v }, src: `${str(m.sursa, 300)} · Rezolvare: ${str(m.rezolvare, 400) || ex} = ${rs}${u ? " " + u : ""}`.replace(/^ · /, "") });
    }
    for (const m of objs(j.probleme)) { const q = str(m.enunt, 700), r = str(m.rezolvare, 900), a = str(m.raspuns, 120); if (q.length >= 25 && (r || a) && !BAD_Q.test(q) && inText(hay, str(m.sursa, 300)) && fresh(q)) out.prob.push({ q: { t: "prob", q }, k: (r + (a ? "\nRăspuns: " + a : "")).trim(), src: str(m.sursa, 300) }); }
  }
  return out;
}


/* ---- itemi pe sursă (Istorie, Geografie, Română, limbi străine…) ----
   Sursele sunt fragmente din lecție alese de SITE (js/teste/surse.js): AI nu poate inventa citate. AI primește sursele și scrie doar sarcinile și baremul.
   Rezultatul: Map(indexul slotului → { q: {t:"open", q, s:[{l,t}], g}, k: barem, src }). Ce nu trece de verificare → sarcină de rezervă (localTask). */
const LEVEL = ["ușoare, de recunoaștere (identificare, localizare)", "de dificultate medie (explicare, comparare)", "dificile (argumentare, apreciere, sinteză)"];
export async function composeSourceBlocks(texts, slots, { materie, clasa, level = 1, chapter = "" }) {
  const st = styleOf(materie), plans = planOf(slots), pool = pickSources(texts.map(t => ({ tema: t.tema, text: t.text })), plans.reduce((a, p) => a + p.ns, 0) || 1, { long: st.kind === "text" });
  const by = assignSources(pool, plans.map(p => ({ g: p.g, n: p.ns })), st), out = new Map(), ok = new Map();
  const usable = plans.filter(p => (by.get(p.g) || []).length || p.ns === 0);
  if (usable.length && aiOn()) {
    const lang = LANGS[materie] ? `Scrie TOT (sarcini și bareme) în limba ${LANGS[materie]}, nu în română.` : "Scrie în limba română corectă, cu diacritice (ă, â, î, ș, ț).";
    const ctx = texts.map(t => `### ${t.tema}\n${t.text}`).join("\n\n").slice(0, 4500);
    const blocks = usable.map(p => `GRUP ${p.g}\n${p.ns === 0 ? "(fără surse: sarcina se rezolvă din cunoștințele lecției; scrie tu cerințele numerotate)" : by.get(p.g).map(s => `[${s.l}] ${s.t}`).join("\n")}\nITEMI:\n${p.items.map((x, n) => `${n + 1}. puncte=${x.p}${x.h ? "; tip: " + x.h : ""}`).join("\n")}`).join("\n\n");
    try {
      const j = await call(`Ești profesor de ${materie}, clasa ${clasa}, în Republica Moldova, și compui itemii unui test în stilul testelor ANCE${chapter ? ` (capitolul „${chapter}”)` : ""}. Itemii sunt ${LEVEL[level] || LEVEL[1]}.
Mai jos sunt GRUPURI. Fiecare grup are SURSELE lui (${st.ask}; fragmente din lecție, deja alese — NU le modifica și NU adăuga alte citate) și o listă de ITEMI cu punctaj.
Pentru fiecare item scrie:
- "enunt": sarcina pentru elev. Începe cu verbul-sarcină (Identifică, Determină, Explică, Compară, Demonstrează, Dedu, Apreciază, Formulează, Exprimă-ți opinia, Argumentează…); când grupul are mai multe surse, spune pe care o folosește („Utilizează sursa B”). Se rezolvă DOAR din sursele grupului și din cunoștințele lecției. Fără cuvintele „manual”, „lecție”, „pagina”, „figura”. Respectă „tip” (ce fel de sarcină se cere), iar la itemii cu mai multe puncte cere argumentare.
- "barem": răspunsul-model + repartizarea punctajului pe criterii, cu „(… p.)” la fiecare criteriu; suma criteriilor = punctajul itemului. La opinie/eseu enumeră criteriile și punctajul lor.
Nu inventa fapte, nume, date sau citate care nu sunt în surse sau în lecție. ${lang}${SUBJ_RULES[materie] ? "\n" + SUBJ_RULES[materie] : ""}
Returnează DOAR JSON: {"grupuri":[{"g":"","itemi":[{"enunt":"","barem":""}]}]}
${blocks}

LECȚIA (doar pentru cunoștințele necesare):
${ctx}`);
      for (const g of objs(j.grupuri)) { const pl = usable.find(p => p.g === String(g.g)); if (pl) { const v = validateGroup(pl, by.get(pl.g), g); if (v) ok.set(pl.g, v); } }
    } catch (e) { /* rămân sarcinile locale */ }
  }
  for (const p of plans) {
    const ss = by.get(p.g) || []; if (!ss.length && p.ns !== 0) continue; const v = ok.get(p.g);
    p.items.forEach((it, n) => {
      const sl = slots.find(s => s.i === it.i) || {}, loc = v ? null : localTask(st, it.i, ss[0]?.tema || texts[0]?.tema, sl);
      out.set(it.i, { q: { t: "open", q: v ? v[n].q : loc[0], s: ss.map(({ l, t }) => ({ l, t })), g: p.g, ...(v ? {} : { loc: 1 }) }, k: v ? v[n].k : loc[1], src: ss[0] ? ss[0].t.slice(0, 110) : "Cerințe formulate pe baza lecției", ai: !!v });
    });
  }
  return out;
}


/* ---- prezentări .pptx: AI scrie planul diapozitivelor, numai din textul lecțiilor alese ---- */
const SL_TIP = ["obiective", "continut", "definitii", "rezumat", "intrebari"];
export async function composeSlides(texts, { materie, clasa, n = 10, quiz = true, notes = true, chapter = "" }) {
  const pool = texts.length > 14 ? Array.from({ length: 14 }, (_, i) => texts[Math.floor(i * texts.length / 14)]) : texts, per = Math.max(700, Math.floor(9000 / pool.length));
  const body = pool.map(t => `### ${t.tema}\n${t.text.slice(0, per)}`).join("\n\n"), lang = LANGS[materie] ? `scrie în limba ${LANGS[materie]} (nu în română), corect gramatical` : "limba română corectă gramatical, cu diacritice (ă, â, î, ș, ț)";
  const j = await call(`Ești profesor de ${materie}, clasa ${clasa}, în Republica Moldova. Creează PLANUL unei PREZENTĂRI PowerPoint pentru ora la clasă${chapter ? ` (capitolul „${chapter}”)` : ""}, din TEXTUL lecțiilor de mai jos, și NUMAI din el.
REGULI: nu folosi cunoștințe din afara textului și nu inventa fapte, date sau numere; ignoră trimiterile la figuri, pagini, activități sau exerciții din manual și resturile din PDF (numere de pagină, titluri rupte); ${lang}.
STRUCTURA: exact ${n - 1} diapozitive (fără diapozitivul de titlu), în ordinea:
1) un diapozitiv "obiective" (3-4 puncte: ce vor învăța elevii);
2) diapozitive "continut" (3-5 puncte fiecare, câte un subiect pe diapozitiv, în ordinea din text) și 1-2 diapozitive "definitii" (2-4 termeni cu definiție scurtă), dacă textul are definiții;
3) un diapozitiv "rezumat" (3-5 puncte)${quiz ? ';\n4) ultimul diapozitiv, "intrebari": 4-5 întrebări de verificare (fiecare întrebare = un punct, fără răspuns)' : ""}.
STIL: titlul diapozitivului max. 8 cuvinte; fiecare punct max. 16 cuvinte, o expresie sau o propoziție clară (nu paragraf), fără numerotare; ${notes ? '"notite" = 1-3 propoziții pentru profesor (ce explică, ce întrebare pune clasei, un exemplu din text)' : '"notite" = ""'}.
Returnează DOAR JSON:
{"titlu":"titlul prezentării (max. 8 cuvinte)","diapozitive":[{"tip":"obiective|continut|definitii|rezumat|intrebari","titlu":"","puncte":[""],"termeni":[{"termen":"","definitie":""}],"notite":""}]}
La "definitii" completezi "termeni" (puncte = []); la celelalte tipuri completezi "puncte" (termeni = []).

TEXT:
${body}`, { temperature: 0.4 });
  let slides = objs(j.diapozitive).map(s => {
    let tip = SL_TIP.includes(s.tip) ? s.tip : "continut"; const puncte = arr(s.puncte).map(x => str(x, 220)).filter(Boolean).slice(0, 6), termeni = objs(s.termeni).map(x => ({ termen: str(x.termen, 60), definitie: str(x.definitie, 260) })).filter(x => x.termen && x.definitie).slice(0, 4);
    if (tip === "definitii" && !termeni.length) tip = "continut"; if (tip !== "definitii" && !puncte.length && termeni.length) tip = "definitii";
    return { tip, titlu: str(s.titlu, 90), puncte: tip === "definitii" ? [] : puncte, termeni: tip === "definitii" ? termeni : [], notite: notes ? str(s.notite, 500) : "" };
  }).filter(s => s.titlu && (s.puncte.length || s.termeni.length));
  const rank = s => s.tip === "obiective" ? 0 : s.tip === "rezumat" ? 8 : s.tip === "intrebari" ? 9 : 5;
  slides = slides.map((s, i) => [s, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
  if (!quiz) slides = slides.filter(s => s.tip !== "intrebari");
  if (slides.length < 3) throw new Error("AI nu a creat destule diapozitive. Încearcă din nou.");
  return { titlu: str(j.titlu, 90), slides: slides.slice(0, n - 1), ai: true };
}
