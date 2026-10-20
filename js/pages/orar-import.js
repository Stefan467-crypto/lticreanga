// Importul orarului din fișier (.xlsx / .docx / .csv). Fișierul nu se salvează nicăieri: se extrage doar informația.
// Recunoaște singur două tipuri de tabele (în același fișier sau în fișiere diferite):
//  • ORARUL ELEVILOR  — clasele pe coloane (V A, V B … XII B), zilele pe rânduri (Luni … Vineri), orele 1–7 în subrânduri; în celule = materia.
//  • ORARUL PROFESORILOR — profesorii pe rânduri, pe coloane zilele (Luni … Vineri) cu orele 1–7; în celule = clasa (ex. 10B).
// Materia fiecărui profesor se deduce singură, din orarul elevilor (ce se predă în clasa și la ora respectivă).
import { readTables } from "../core/office.js";
import { BELLS, SUBJECTS } from "../core/config.js";

const DAYS = ["lu", "ma", "mi", "jo", "vi"], N = BELLS.length;
const nrm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const DAYNAME = { luni: "lu", marti: "ma", miercuri: "mi", joi: "jo", vineri: "vi" };
const dayOf = s => DAYNAME[nrm(s)] || null;
const ROM = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* „VIII -a „B”” / „X-a A” / „5A” → { clasa: "VIII", lit: "B" } */
export function classHead(s) {
  const t = String(s ?? "").replace(/[„“”"«»'’`]/g, "").replace(/^\s*clasa\s+/i, "").replace(/\s+/g, " ").trim();
  let m = /^(XII|XI|IX|X|VIII|VII|VI|V)\s*[-–—]?\s*(?:a\s*)?[-–—]?\s*([A-Da-d])$/i.exec(t);
  if (m) return { clasa: m[1].toUpperCase(), lit: m[2].toUpperCase() };
  m = /^(\d{1,2})\s*[-–—]?\s*(?:a\s*)?([A-Da-d])$/i.exec(t);
  if (m && +m[1] >= 5 && +m[1] <= 12) return { clasa: ROM[+m[1] - 5], lit: m[2].toUpperCase() };
  return null;
}

/* materii: abrevierile din orarul tipărit → denumirea întreagă (ce nu se recunoaște rămâne exact cum e scris) */
const ABBR = {
  matemat: "Matematica", matematica: "Matematica", lromana: "Limba română", limbaromana: "Limba română", lenglez: "Limba engleză", lenglezaa: "Limba engleză", lengleza: "Limba engleză", limbaengleza: "Limba engleză",
  lfranceza: "Limba franceză", limbafranceza: "Limba franceză", geograf: "Geografie", geografie: "Geografie", istoria: "Istoria", istorie: "Istoria", fizica: "Fizica", chimia: "Chimia", biologia: "Biologie", biologie: "Biologie",
  informat: "Informatica", informatica: "Informatica", edfizica: "Educație fizică", edtehn: "Educația tehnologică", edmuzic: "Educația muzicală", edplastica: "Educația plastică", edplast: "Educația plastică",
  edpusociet: "Educația pentru societate", edpusocietate: "Educația pentru societate", dezpers: "Dezvoltarea personală", artacomp: "Arta comportamentală", stiinte: "Științe", stiinta: "Științe", litunivers: "Literatura universală", literatura: "Literatura universală",
  lstraina: "Limba străină", lstrainai: "Limba străină (I)", lstrainaii: "Limba străină (II)", edprinfilm: "Educația prin film", edstdeviata: "Educația pentru stil de viață", edecologica: "Educația ecologică",
};
const key = s => nrm(s).replace(/ /g, "");
export function lessonName(raw) {
  const t = String(raw ?? "").trim(); if (!t || /^[-–—.]+$/.test(t)) return "";
  const m = /^(.*?)\s*(\(.*\))?$/.exec(t), base = m[1].trim(), suf = (m[2] || "").trim();
  let full = ABBR[key(base)] || ABBR[key(base) + "a"]; if (!full) { const k2 = key(base + suf); if (ABBR[k2]) return ABBR[k2]; }
  if (full && /^Limba străină$/.test(full) && /^\((I|II)\)$/.test(suf)) return `${full} ${suf}`;
  return full ? (suf && !/^Limba străină/.test(full) ? `${full} ${suf}` : full) : t;
}
const baseSubject = n => { const b = String(n).replace(/\s*\(.*\)\s*$/, "").trim(); return SUBJECTS.includes(b) ? b : /^Limba străină/.test(b) ? "Limba străină" : ""; };
const SECOND = new Set(["Dezvoltarea personală", "Educația pentru societate", "Arta comportamentală", "Educația ecologică", "Limba străină"]); // „de completare”: câștigă materia principală a profesorului

/* celulă din orarul profesorilor: „6A”, „10B” + indice (M, D/P, opt.…) → „10B (D/P)” */
export function teacherCell(raw) {
  const t = String(raw ?? "").trim(); if (!t || /^[-–—.]+$/.test(t)) return "";
  const m = /^(\d{1,2})\s*([A-Da-d])\s*[_\-\s.]*(.*)$/.exec(t); if (!m || +m[1] < 5 || +m[1] > 12) return t.replace(/\s+/g, " ");
  const rest = m[3].replace(/^[()\s_]+|[()\s_]+$/g, ""); return m[1] + m[2].toUpperCase() + (rest ? ` (${rest})` : "");
}
const clsOfCell = s => { const m = /^(\d{1,2})\s*([A-Da-d])/.exec(String(s)); return m && +m[1] >= 5 && +m[1] <= 12 ? ROM[+m[1] - 5] + "|" + m[2].toUpperCase() : null; };

const emptyZile = () => Object.fromEntries(DAYS.map(d => [d, Array(N).fill("")]));
const countLessons = z => DAYS.reduce((a, d) => a + z[d].filter(Boolean).length, 0);

/* ---------- orarul elevilor ---------- */
function studentBlocks(g, out) {
  const heads = []; g.forEach((row, r) => { const cols = []; row.forEach((c, i) => { const h = classHead(c); if (h && !(cols.length && cols.at(-1).i === i - 1 && row[i - 1] === c)) cols.push({ i, ...h }); }); if (cols.length >= 2) heads.push({ r, cols }); });
  heads.forEach((h, k) => {
    const end = heads[k + 1]?.r ?? g.length, first = h.cols[0].i; let day = null, no = 0;
    for (let r = h.r + 1; r < end; r++) {
      const row = g[r]; let d = null, n = null;
      for (let c = 0; c < first; c++) { d = dayOf(row[c]) || d; if (/^\d$/.test(row[c])) n = +row[c]; }
      if (d && d !== day) { day = d; no = 0; } if (!day) continue; no++;
      const li = (n ?? no) - 1; if (li < 0 || li >= N) continue;
      for (const c of h.cols) { const key2 = c.clasa + "|" + c.lit, o = out.get(key2) || { tip: "elevi", clasa: c.clasa, lit: c.lit, nume: `${c.clasa} ${c.lit}`, zile: emptyZile() }; o.zile[day][li] = lessonName(row[c.i]); out.set(key2, o); }
    }
  });
}

/* ---------- orarul profesorilor ---------- */
function teacherBlocks(g, out) {
  for (let r = 0; r < g.length; r++) {
    const row = g[r], dn = row.map(dayOf), set = new Set(dn.filter(Boolean)); if (set.size < 3) continue;
    // rândul cu numerele orelor: același rând (fără zile) sau unul din următoarele două
    let nr = -1; for (let k = r; k <= Math.min(r + 2, g.length - 1); k++) if (g[k].filter(x => /^[1-9]$/.test(x)).length >= 8) { nr = k; break; }
    if (nr < 0) continue;
    const colMap = []; let cur = null;
    row.forEach((_, c) => { cur = dn[c] || cur; if (/^[1-9]$/.test(g[nr][c]) && cur) colMap[c] = { d: cur, l: +g[nr][c] - 1 }; });
    const cols = colMap.map((m, c) => m ? c : -1).filter(c => c >= 0); if (cols.length < 8) continue;
    const first = cols[0];
    for (let q = nr + 1; q < g.length; q++) {
      const rw = g[q]; if (dn.length && rw.map(dayOf).filter(Boolean).length >= 3) break;
      let name = ""; for (let c = 0; c < first; c++) { const v = rw[c]; if ((v.match(/\p{L}/gu) || []).length >= 3 && v.length > name.length) name = v; }
      if (!name || /profesor|numele|prenume|^nr/i.test(name)) continue;
      const o = out.get(slug(name)) || { tip: "profesori", nume: name.replace(/\s+/g, " "), materie: "", zile: emptyZile() };
      for (const c of cols) { const m = colMap[c]; if (m.l >= 0 && m.l < N && DAYS.includes(m.d)) { const v = teacherCell(rw[c]); if (v) o.zile[m.d][m.l] = v; } }
      out.set(slug(name), o);
    }
    return; // un tabel de profesori pe foaie
  }
}

/* materia profesorului = materia cea mai frecventă la orele lui, din orarul elevilor */
function inferSubjects(teachers, students) {
  const idx = new Map(students.map(s => [s.clasa + "|" + s.lit, s.zile]));
  for (const t of teachers) {
    const votes = new Map();
    for (const d of DAYS) t.zile[d].forEach((cell, l) => { const k = clsOfCell(cell), z = k && idx.get(k); if (!z) return; const b = baseSubject(z[d]?.[l] || ""); if (b) votes.set(b, (votes.get(b) || 0) + (SECOND.has(b) ? 0.4 : 1)); });
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]; if (best) t.materie = best[0];
  }
}

/** Citește unul sau mai multe fișiere. studentsKnown = orarele elevilor deja salvate (pentru a deduce materiile profesorilor din fișiere cu profesori). */
export async function parseFiles(files, studentsKnown = []) {
  const st = new Map(), te = new Map(), warn = [];
  for (const f of files) {
    let tables; try { tables = await readTables(f); } catch (e) { throw new Error(`${f.name}: ${e.message}`); }
    const a = st.size, b = te.size; for (const g of tables) { studentBlocks(g, st); teacherBlocks(g, te); }
    if (st.size === a && te.size === b) warn.push(`${f.name}: nu am găsit niciun orar (verifică antetul: clasele „V A … XII B” sau zilele „Luni … Vineri” cu orele 1–7).`);
  }
  const students = [...st.values()].filter(o => countLessons(o.zile)), teachers = [...te.values()].filter(o => countLessons(o.zile));
  const known = studentsKnown.filter(s => s.tip === "elevi" && s.zile).map(s => ({ clasa: s.clasa, lit: s.lit, zile: Object.fromEntries(DAYS.map(d => [d, (Array.isArray(s.zile[d]) ? s.zile[d] : String(s.zile[d] || "").split("\n")).map(x => String(x || "").trim())])) }));
  const pool = [...known.filter(k => !students.some(s => s.clasa === k.clasa && s.lit === k.lit)), ...students];
  inferSubjects(teachers, pool);
  const order = o => ROM.indexOf(o.clasa) * 10 + "ABCD".indexOf(o.lit);
  students.sort((a, b) => order(a) - order(b)); teachers.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  const noSub = teachers.filter(t => !t.materie).length; if (teachers.length && noSub) warn.push(`${noSub} profesori fără materie (nu am găsit orarul elevilor pentru orele lor). Poți încărca și orarul elevilor sau completa materia din „Editează”.`);
  if (!students.length && !teachers.length) throw new Error("Nu am recunoscut niciun orar în fișier. Tabelul trebuie să aibă clasele (V A … XII B) sau zilele (Luni … Vineri) cu orele 1–7 în antet.");
  return { students, teachers, warn, lessons: o => countLessons(o.zile) };
}
export { N as LESSONS };
