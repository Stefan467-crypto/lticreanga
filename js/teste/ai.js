// AI opțional (Gemini gratuit, prin Worker). Rulează o dată pe lecție; rezultatul se salvează și se refolosește la nesfârșit.
// Tot ce vine de la AI este verificat: propoziția-sursă trebuie să existe în textul lecției, șabloanele trebuie să se calculeze.
import { AI_URL } from "../core/config.js";
import { auth } from "../core/firebase.js";
import { nz, checkTemplate } from "./engine.js";
export const aiOn = () => !!AI_URL;
export const pause = ms => new Promise(r => setTimeout(r, ms));
async function call(prompt) {
  const tok = await auth.currentUser?.getIdToken(); if (!tok) throw new Error("Autentifică-te pentru a folosi AI");
  let r; try { r = await fetch(AI_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, idToken: tok }) }); } catch (e) { throw new Error("Serviciul AI nu răspunde (verifică internetul)"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 429 ? "Limita gratuită AI s-a terminat pentru acum. Încearcă peste o oră sau mâine." : j.error || "Eroare AI (" + r.status + ")");
  const t = String(j.text || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(t); } catch (e) { throw new Error("Răspunsul AI nu e valid. Încearcă din nou."); }
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
REGULI: nu folosi cunoștințe din afara textului. Fiecare element are câmpul "sursa" = o propoziție copiată EXACT din text (max 200 de caractere) care îl justifică. Scrie în limba română corectă. Fără întrebări despre figuri, pagini sau exerciții din manual. Răspunsurile greșite din grile trebuie să fie plauzibile, din aceeași materie.
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
