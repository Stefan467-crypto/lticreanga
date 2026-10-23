// Exportul orarului în fișier (.xlsx / .docx). Tabelele au aceeași formă ca fișierele pe care le importă site-ul
// (clasele pe coloane, zilele pe rânduri / profesorii pe rânduri, zilele pe coloane), deci fișierul exportat se poate reimporta.
import { makeXlsx, makeDocx } from "../core/officeout.js";

const PER_BLOCK = 12; // clase într-un bloc (ca în orarul tipărit)
const roman = o => `${o.clasa}-a „${o.lit}”`;

/* elevii: câte un bloc pentru fiecare grup de clase; rândul 0 = antet, apoi zilele × orele */
function studentBlocks(students, { les, D, N }) {
  const blocks = [];
  for (let i = 0; i < students.length; i += PER_BLOCK) {
    const g = students.slice(i, i + PER_BLOCK), rows = [["Ziua", "Nr.", ...g.map(roman)]], merges = [];
    D.forEach(([k, name]) => {
      const r0 = rows.length; merges.push([r0, 0, r0 + N - 1, 0]);
      for (let h = 0; h < N; h++) rows.push([h ? "" : name, h + 1, ...g.map(o => les(o, k)[h])]);
    });
    blocks.push({ name: "Elevi", title: `Orarul elevilor · clasele ${g[0].clasa} ${g[0].lit} – ${g.at(-1).clasa} ${g.at(-1).lit}`, rows, merges, hdr: 1, widths: [9, 5, ...g.map(() => 17)], font: 15 });
  }
  return blocks;
}

/* profesorii: Nr., nume, apoi zilele (fiecare cu orele 1–7), la sfârșit „Disciplina” */
function teacherTable(teachers, days, { les, D, N }, { subject, title, name, font, startNo = 0 }) {
  const W = 2 + days.length * N + (subject ? 1 : 0), top = ["Nr.", "Numele, prenumele profesorului"], hrs = ["", ""], merges = [[0, 0, 1, 0], [0, 1, 1, 1]];
  days.forEach(([k, label], i) => { top.push(label, ...Array(N - 1).fill("")); hrs.push(...Array.from({ length: N }, (_, h) => h + 1)); merges.push([0, 2 + i * N, 0, 1 + (i + 1) * N]); });
  if (subject) { top.push("Disciplina"); hrs.push(""); merges.push([0, W - 1, 1, W - 1]); }
  const rows = [top, hrs, ...teachers.map((o, i) => [`${startNo + i + 1}.`, o.nume, ...days.flatMap(([k]) => les(o, k)), ...(subject ? [o.materie || ""] : [])])];
  return { name, title, rows, merges, hdr: 2, widths: [4, 26, ...Array(days.length * N).fill(subject ? 6 : 6.2), ...(subject ? [22] : [])], left: [1, ...(subject ? [W - 1] : [])], font };
}

/* un singur tabel din mai multe blocuri puse unul sub altul (pentru foaia Excel) */
function stack(blocks) {
  const rows = [], merges = [], hdrRows = []; let widths = [];
  blocks.forEach(b => { const o = rows.length; hdrRows.push(o); rows.push(...b.rows); b.merges.forEach(m => merges.push([m[0] + o, m[1], m[2] + o, m[3]])); widths = b.widths.length > widths.length ? b.widths : widths; });
  return { name: blocks[0].name, rows, merges, hdrRows, widths };
}

/** what: "elevi" | "profesori" | "ambele"; fmt: "xlsx" | "docx" */
export function buildExport({ students, teachers, what, fmt }, h) {
  const st = what !== "profesori" ? students : [], te = what !== "elevi" ? teachers : [];
  if (!st.length && !te.length) throw new Error("Nu există orar de exportat");
  const out = [];
  if (fmt === "xlsx") {
    if (st.length) out.push(stack(studentBlocks(st, h)));
    if (te.length) out.push(teacherTable(te, h.D, h, { subject: true, name: "Profesori", title: "Orarul profesorilor", font: 14 }));
    return { blob: makeXlsx(out), name: `orar-${what === "ambele" ? "elevi-profesori" : what}.xlsx` };
  }
  if (st.length) out.push(...studentBlocks(st, h));
  if (te.length) {
    const g1 = h.D.slice(0, 3), g2 = h.D.slice(3);
    out.push(teacherTable(te, g1, h, { title: "Orarul profesorilor · Luni – Miercuri", name: "Profesori", font: 13 }), teacherTable(te, g2, h, { subject: true, title: "Orarul profesorilor · Joi – Vineri", name: "Profesori", font: 14 }));
  }
  return { blob: makeDocx(out), name: `orar-${what === "ambele" ? "elevi-profesori" : what}.docx` };
}
