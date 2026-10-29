// Scrie fișiere .xlsx și .docx direct în browser, fără biblioteci (același principiu ca js/core/office.js, dar în sens invers).
// O „specificație de tabel” arată așa:
//   { name: "Elevi", title: "Orarul elevilor", rows: [[...]], merges: [[r1, c1, r2, c2]], hdr: 2, widths: [6, 20, ...], left: [1], font: 16 }
//   rows  = matrice de texte (sau numere); celulele acoperite de o îmbinare rămân goale
//   merges = îmbinări (indici de la 0, inclusiv); hdr = câte rânduri de la început sunt antet; widths = lățimi relative (≈ caractere)
//   left  = coloanele aliniate la stânga (restul sunt centrate); font = mărimea în jumătăți de punct pentru Word (16 = 8 pt)

const te = new TextEncoder();
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const x = s =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ---------- arhiva ZIP (fără compresie: „stored”) ---------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = u => {
  let c = 0xffffffff;
  for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
export function zip(files) {
  // files: [[nume, text]]
  const parts = [],
    central = [];
  let off = 0;
  const d = new Date(),
    dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  for (const [name, text] of files) {
    const n = te.encode(name),
      data = te.encode(text),
      crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, dt, true);
    lh.setUint16(12, dd, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, n.length, true);
    lh.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dt, true);
    ch.setUint16(14, dd, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, n.length, true);
    ch.setUint32(42, off, true);
    parts.push(new Uint8Array(lh.buffer), n, data);
    central.push(new Uint8Array(ch.buffer), n);
    off += 30 + n.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0),
    end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, csize, true);
  end.setUint32(16, off, true);
  return [...parts, ...central, new Uint8Array(end.buffer)];
}
const REL =
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="%T"/>';

/* ---------- .xlsx ---------- */
const colL = i => {
  let s = "";
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};
const STYLES =
  XML +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1DFE2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F3EA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9A8F86"/></left><right style="thin"><color rgb="FF9A8F86"/></right><top style="thin"><color rgb="FF9A8F86"/></top><bottom style="thin"><color rgb="FF9A8F86"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>`;
function sheetXml(t) {
  const W = Math.max(...t.rows.map(r => r.length)),
    left = new Set(t.left || []),
    hdr = t.hdr || 1,
    isH = r => (t.hdrRows ? t.hdrRows.includes(r) : r < hdr),
    dayCol = new Set((t.merges || []).filter(m => m[1] === m[3] && m[2] > m[0] && !isH(m[0])).map(m => m[1]));
  const cell = (v, r, c) => {
    const s = isH(r) ? 1 : left.has(c) ? 3 : dayCol.has(c) ? 4 : 2,
      ref = colL(c) + (r + 1);
    if (v === "" || v == null) return `<c r="${ref}" s="${s}"/>`;
    return typeof v === "number"
      ? `<c r="${ref}" s="${s}"><v>${v}</v></c>`
      : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  };
  const rows = t.rows
    .map(
      (row, r) =>
        `<row r="${r + 1}"${isH(r) ? ' ht="20" customHeight="1"' : ""}>${Array.from({ length: W }, (_, c) => cell(row[c], r, c)).join("")}</row>`
    )
    .join("");
  const cols = (t.widths || [])
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  const mg = (t.merges || []).map(m => `<mergeCell ref="${colL(m[1])}${m[0] + 1}:${colL(m[3])}${m[2] + 1}"/>`).join("");
  return (
    XML +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${rows}</sheetData>${mg ? `<mergeCells count="${(t.merges || []).length}">${mg}</mergeCells>` : ""}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`
  );
}
export function makeXlsx(tables) {
  // o foaie pentru fiecare tabel
  const files = [
    [
      "[Content_Types].xml",
      XML +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${tables.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    ],
    [
      "_rels/.rels",
      XML +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${REL.replace("%T", "xl/workbook.xml")}</Relationships>`,
    ],
    [
      "xl/workbook.xml",
      XML +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${tables
          .map(
            (t, i) =>
              `<sheet name="${x(
                String(t.name || "Foaia " + (i + 1))
                  .replace(/[\\/?*\[\]:]/g, " ")
                  .slice(0, 31)
              )}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
          )
          .join("")}</sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      XML +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${tables.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${tables.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    ["xl/styles.xml", STYLES],
    ...tables.map((t, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(t)]),
  ];
  return new Blob(zip(files), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ---------- .docx (pagină A4 pe lățime) ---------- */
const PAGE_W = 15700; // lățimea utilă, în twips (A4 orizontal, margini 0,4")
function docTable(t) {
  const W = Math.max(...t.rows.map(r => r.length)),
    hdr = t.hdr || 1,
    left = new Set(t.left || []),
    sz = t.font || 16,
    mg = t.merges || [];
  const ws = t.widths || Array(W).fill(8),
    sum = ws.reduce((a, b) => a + b, 0),
    tw = ws.map(w => Math.max(260, Math.round((PAGE_W * w) / sum)));
  const run = (txt, b, sub) =>
    `<w:r><w:rPr>${b ? "<w:b/>" : ""}<w:sz w:val="${sz}"/>${sub ? '<w:vertAlign w:val="subscript"/>' : ""}</w:rPr><w:t xml:space="preserve">${x(txt)}</w:t></w:r>`;
  const para = (v, r, c) => {
    const s = String(v ?? ""),
      m = /^(\d{1,2}[A-Da-d])\s*\((.+)\)$/.exec(s); // „10B (D/P)” → 10B cu D/P în indice, ca în orarul tipărit
    return `<w:p><w:pPr><w:jc w:val="${left.has(c) ? "left" : "center"}"/></w:pPr>${m ? run(m[1], 0) + run(m[2], 0, 1) : s ? run(s, r < hdr) : ""}</w:p>`;
  };
  const rows = t.rows
    .map((row, r) => {
      let tcs = "";
      for (let c = 0; c < W; c++) {
        const m = mg.find(q => r >= q[0] && r <= q[2] && c >= q[1] && c <= q[3]);
        if (m && c > m[1]) continue; // acoperit de o îmbinare pe orizontală
        const span = m ? m[3] - m[1] + 1 : 1,
          w = tw.slice(c, c + span).reduce((a, b) => a + b, 0),
          vm = m && m[2] > m[0] ? (r === m[0] ? '<w:vMerge w:val="restart"/>' : "<w:vMerge/>") : "";
        const head = r < hdr,
          shade = head
            ? '<w:shd w:val="clear" w:color="auto" w:fill="F1DFE2"/>'
            : m && m[2] > m[0]
              ? '<w:shd w:val="clear" w:color="auto" w:fill="F7F3EA"/>'
              : "";
        const txt = m && r > m[0] ? "" : row[c];
        tcs += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${vm}${shade}<w:vAlign w:val="center"/></w:tcPr>${para(txt, r, c)}</w:tc>`;
      }
      return `<w:tr><w:trPr><w:cantSplit/>${r < hdr ? "<w:tblHeader/>" : ""}</w:trPr>${tcs}</w:tr>`;
    })
    .join("");
  const b = k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="8A8078"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${tw.reduce((a, c) => a + c, 0)}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(b).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${tw.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows}</w:tbl>`;
}
export function makeDocx(tables) {
  // tables: [{ title, ...spec }]; titlul apare deasupra tabelului, fiecare tabel pe pagina lui
  const body =
    tables
      .map(
        (t, i) =>
          `${i ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ""}<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="8A1C2B"/><w:sz w:val="26"/></w:rPr><w:t xml:space="preserve">${x(t.title || "")}</w:t></w:r></w:p>${docTable(t)}`
      )
      .join("") + "<w:p/>";
  const files = [
    [
      "[Content_Types].xml",
      XML +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      XML +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${REL.replace("%T", "word/document.xml")}</Relationships>`,
    ],
    [
      "word/_rels/document.xml.rels",
      XML +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "word/styles.xml",
      XML +
        `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="18"/><w:lang w:val="ro-RO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    ],
    [
      "word/document.xml",
      XML +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="283" w:footer="283" w:gutter="0"/></w:sectPr></w:body></w:document>`,
    ],
  ];
  return new Blob(zip(files), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
