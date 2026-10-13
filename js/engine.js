// Motor de teste: creează întrebări DOAR din textul lecțiilor (fără API, doar JavaScript).
export const nz = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[„”“"'’()\[\];:!?]/g, " ").replace(/\s+/g, " ").trim();
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const STOP = new Set("care este sunt prin pentru dintre precum această acest aceste acestea aceasta când unde cum dacă atunci având fiind poate pot trebuie între asupra după înainte numai foarte fiecare altfel însă deci astfel unui unei unor către mult multe fără sale său lor lui spre peste ceea cele celor același aceeași acelor altele alte alți doar decât cât câte câți nici sau încât deoarece aproximativ semnificativ".split(" "));
const BADT = /^(acesta|aceasta|aceștia|acestea|aceste|acest|această|ea|el|ele|care|ce|cine|ceea|aici|astfel|acolo)\b/i;
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const NUM = /\d+(?:[.,]\d+)?(?:\s?(?:°C|%|[A-Za-zμΩ]{1,4}(?:\/[A-Za-zμ]{1,3})?[²³]?)(?![\p{L}]))?/gu;
const AB = /\b(Fig|fig|ex|Ex|nr|Nr|cca|etc|pag|str|vol|Dr|dr|Prof|prof|ec|Ec)\./g;
const FR = /^(?:(.{2,40}?)\s*[:—–]\s*)?([^=:\s][^=:]{0,22}?)\s*=\s*([^=,;]{1,40}?)\s*(?:[,;(].*)?\.?$/;
const DEF = /^(?:(?:Un|O|Orice|Fiecare)\s+)?(.{3,60}?)\s+(?:este|sunt|reprezintă|constituie|se numește|se numesc|se definește ca|se definesc ca|numim|se notează cu)\s+(.{15,})$/i;
const DEF2 = /^Prin\s+(.{3,50}?)\s+se\s+înțelege\s+(.{15,})$/i;

export function splitSentences(t) {
  t = t.replace(AB, m => m.replace(".", "§")).replace(/(\d)[.](\d)/g, "$1§$2").replace(/(\b\d+)\.(\s)/g, "$1§$2");
  return (t.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map(s => s.replace(/§/g, ".").trim()).filter(s => s.length >= 30 && s.length <= 260 && /\p{L}{3}/u.test(s) && !/\b(fig\.|figura|tabelul|exercițiu|problema\s+\d|vezi)\b/i.test(s));
}
export function clean(t) { // curăță textul extras din PDF
  return t.replace(/\r/g, "").replace(/-\n(?=\p{Ll})/gu, "").replace(/([^.!?:\n])\n(?=\p{Ll})/gu, "$1 ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
/* ---- analiză lecție ---- */
export function parse(text, tema = "") {
  const P = { tema, sents: [], defs: [], forms: [], probs: [] };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const l = raw.trim(); if (!l || l.startsWith("# ")) continue;
    if (/^@problema/i.test(l)) { P.probs.push(l.replace(/^@problema\s*/i, "")); continue; }
    const f = l.length <= 90 && FR.exec(l.replace(/\.$/, ""));
    if (f && /[=]/.test(l) && !/\s(este|sunt|reprezintă)\s/i.test(l)) { P.forms.push({ name: (f[1] || "").trim(), left: f[2].trim(), right: f[3].trim() }); continue; }
    const m0 = /^([A-ZĂÂÎȘȚ][^:—–]{2,50}?)\s*[:—–]\s*(.{20,})$/.exec(l);
    if (m0 && !/\b(legea|formula)\b/i.test(m0[1]) && m0[1].split(/\s+/).length <= 5) P.defs.push({ term: m0[1].trim(), def: m0[2].replace(/\.$/, "").trim(), src: l });
    for (const s of splitSentences(l)) {
      P.sents.push(s);
      const m = DEF.exec(s) || DEF2.exec(s);
      if (m) { const term = m[1].trim().replace(/^(un|o|prin)\s+/i, ""); if (term.split(/\s+/).length <= 5 && !/[,]/.test(term) && term.length >= 4 && !BADT.test(term) && !/^(de\s+)?(aproximativ|circa|\d)/i.test(m[2].trim()) && !/\s(al|ale)\s+(apei|sticlei|aerului)\b/i.test(term)) P.defs.push({ term, def: m[2].replace(/[.!?]+$/, "").trim(), src: s }); }
    }
  }
  return P;
}
export function merge(list) { return list.reduce((a, p) => ({ sents: a.sents.concat(p.sents), defs: a.defs.concat(p.defs), forms: a.forms.concat(p.forms), probs: a.probs.concat(p.probs) }), { sents: [], defs: [], forms: [], probs: [] }); }
function keywords(sents) {
  const f = new Map(); for (const s of sents) for (const w of new Set(s.toLowerCase().match(/\p{L}{6,}/gu) || [])) if (!STOP.has(w)) f.set(w, (f.get(w) || 0) + 1);
  let k = [...f].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 90).map(x => x[0]);
  if (k.length < 12) k = [...f].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 70).map(x => x[0]);
  return k;
}
/* ---- calcul sigur (fără eval) ---- */
export function calc(expr, vars) {
  const tk = expr.replace(/·|×/g, "*").replace(/÷/g, "/").replace(/,/g, ".").match(/\d+(?:\.\d+)?|[a-zA-Z_]\w*|\*\*|[-+*/^()]/g) || [], out = [], ops = [], P = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, "**": 3 }, fn = { sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos }, st = [];
  const apply = o => { const b = st.pop(), a = st.pop(); st.push(o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : o === "/" ? a / b : a ** b); };
  for (let i = 0; i < tk.length; i++) {
    const t = tk[i];
    if (/^\d/.test(t)) st.push(+t); else if (t in fn) ops.push(t);
    else if (/^[a-zA-Z_]/.test(t)) { if (t === "pi") st.push(Math.PI); else if (t in vars) st.push(vars[t]); else throw new Error("var " + t); }
    else if (t === "(") ops.push(t);
    else if (t === ")") { while (ops.length && ops.at(-1) !== "(") apply(ops.pop()); ops.pop(); if (ops.length && ops.at(-1) in fn) st.push(fn[ops.pop()](st.pop())); }
    else { if (t === "-" && (i === 0 || /^[-+*/^(]|\*\*/.test(tk[i - 1]))) { st.push(0); } while (ops.length && ops.at(-1) in P && (P[ops.at(-1)] > P[t] || (P[ops.at(-1)] === P[t] && t !== "^" && t !== "**"))) apply(ops.pop()); ops.push(t); }
  }
  while (ops.length) apply(ops.pop()); return st.pop();
}
/* ---- generare ---- */
export function generate(P, { n = 10, types = ["mcq", "tf", "blank", "num"], level = 1, hist = new Set(), seed = (Date.now() ^ (Math.random() * 2 ** 31)) >>> 0 } = {}) {
  const R = rng(seed), pick = a => a[Math.floor(R() * a.length)], shuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const keys = keywords(P.sents), nums = [...new Set(P.sents.flatMap(s => s.match(NUM) || []).filter(x => /\d/.test(x)))];
  const target = s => { // ce ascundem dintr-o propoziție
    const d = P.defs.find(x => x.src === s); if (d && new RegExp(esc(d.term), "i").test(s) && s.indexOf(d.term) >= 0 && d.term.length >= 4 && !/\s/.test(d.term.trim().replace(/^\S+\s/, "")) ) return { kind: "w", a: d.term, def: 1 };
    const w = (s.match(/\p{L}{6,}/gu) || []).filter(x => keys.includes(x.toLowerCase())).sort((a, b) => b.length - a.length)[0]; if (w) return { kind: "w", a: w };
    const nn = (s.match(NUM) || []).filter(x => /\d/.test(x) && x.length >= 2)[0]; if (nn) return { kind: "n", a: nn.trim() };
    return null;
  };
  const mutNum = a => { const m = /^(\d+(?:[.,]\d+)?)(.*)$/.exec(a); if (!m) return a; const dec = /,/.test(m[1]), v = parseFloat(m[1].replace(",", ".")), f = pick([2, .5, 1.5, 10, .1, 3, .25]), r = +(v * f).toFixed(2); let s = String(r === v ? v + 1 : r); if (dec) s = s.replace(".", ","); return s + m[2]; };
  const distract = (t, s, cnt) => { // alternative plauzibile
    const out = new Set();
    if (t.kind === "n") { for (let i = 0; i < 12 && out.size < cnt; i++) { const x = nums.length && R() < .4 ? pick(nums) : mutNum(t.a); if (x !== t.a) out.add(x); } }
    else if (t.def) { const up = t.a[0] === t.a[0].toUpperCase(), pool = shuf(P.defs.map(x => x.term).filter(x => nz(x) !== nz(t.a) && nz(x).slice(0, 5) !== nz(t.a).slice(0, 5))); for (const p of pool) { if (out.size >= cnt) break; out.add(up ? cap(p) : p.charAt(0).toLowerCase() + p.slice(1)); } }
    else { let pool = keys.filter(k => nz(k) !== nz(t.a) && nz(k).slice(0, 5) !== nz(t.a).slice(0, 5) && !nz(s).includes(nz(k))); if (level > 0) pool = pool.sort((x, y) => Math.abs(x.length - t.a.length) - Math.abs(y.length - t.a.length)).slice(0, 10); pool = shuf(pool); const up = t.a[0] === t.a[0].toUpperCase(); for (const p of pool) { if (out.size >= cnt) break; out.add(up ? cap(p) : p); } }
    return out.size >= cnt ? [...out].slice(0, cnt) : null;
  };
  const blankOut = (s, t) => t.kind === "w" ? s.replace(new RegExp(`(?<![\\p{L}\\d])${esc(t.a)}(?![\\p{L}\\d])`, "giu"), "_____") : s.split(t.a).join("_____");
  const clip = (s, n = 130) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;
  const optsQ = (ans, wrong) => { const o = shuf([ans, ...wrong]); return { o, k: o.indexOf(ans) }; };
  const G = { mcq: [], tf: [], blank: [], num: [] };
  P.defs.forEach((d, i) => { if (P.defs.length >= 4) { G.mcq.push({ sig: `m|d${i}|r`, f: () => { const w = shuf(P.defs.filter(x => x.term !== d.term)).slice(0, 3).map(x => cap(x.term)); const { o, k } = optsQ(cap(d.term), w); return { t: "mcq", q: `Care noțiune corespunde descrierii: „${clip(d.def, 170)}”?`, o, k, src: d.src }; } }); G.mcq.push({ sig: `m|d${i}|f`, f: () => { const w = shuf(P.defs.filter(x => x.term !== d.term)).slice(0, 3).map(x => clip(cap(x.def), 110)); const { o, k } = optsQ(clip(cap(d.def), 110), w); return { t: "mcq", q: `Ce reprezintă „${d.term}”?`, o, k, src: d.src }; } }); } });
  P.sents.forEach((s, i) => {
    const t = target(s); if (!t) return;
    G.mcq.push({ sig: `m|c${i}`, f: () => { const w = distract(t, s, 3); if (!w) return null; const { o, k } = optsQ(t.a, w); return { t: "mcq", q: `Alege varianta corectă: ${blankOut(s, t)}`, o, k, src: s }; } });
    G.blank.push({ sig: `b|${i}`, f: () => ({ t: "blank", q: `Completează: ${blankOut(s, t)}${level === 0 && t.kind === "w" ? ` (începe cu „${t.a.slice(0, 2)}…”)` : ""}`, k: [t.a, t.a.replace(/\s/g, "")], src: s }) });
    G.tf.push({ sig: `t|${i}`, f: () => {
      const T = { t: "tf", q: s, k: true, src: s }; if (R() < .5) return T;
      const nn = (s.match(NUM) || []).filter(x => /\d/.test(x) && x.length >= 2)[0];
      if (nn) { const w = distract({ kind: "n", a: nn.trim() }, s, 1); return w ? { t: "tf", q: s.replace(nn.trim(), w[0]), k: false, src: s } : T; }
      const d = P.defs.find(x => x.src === s); if (d && t.def) { const w = distract(t, s, 1); if (w) return { t: "tf", q: s.replace(new RegExp(esc(d.term), "i"), w[0]), k: false, src: s }; }
      return T;
    } });
  });
  P.forms.forEach((fm, i) => {
    const form = `${fm.left} = ${fm.right}`;
    if (fm.name && P.forms.filter(x => x.name).length >= 3) G.mcq.push({ sig: `m|f${i}`, f: () => { const w = shuf(P.forms.filter(x => x !== fm)).slice(0, 3).map(x => `${x.left} = ${x.right}`); const { o, k } = optsQ(form, w); return { t: "mcq", q: `Care este formula pentru „${fm.name}”?`, o, k, src: form }; } });
    const vs = fm.right.match(/[A-Za-zα-ωΔ][A-Za-z0-9_]*/g); if (vs && vs.length) G.blank.push({ sig: `b|f${i}`, f: () => { const v = pick(vs); return { t: "blank", q: `Completează formula: ${fm.left} = ${fm.right.replace(new RegExp(`(?<![\\p{L}\\d])${esc(v)}(?![\\p{L}\\d])`, "u"), "_____")}`, k: [v], src: form }; } });
  });
  P.probs.forEach((p, i) => G.num.push({ sig: `n|${i}|${seed}`, fresh: 1, f: () => {
    const m = /^(.*?)=>\s*([^|]+?)\s*(?:\|\s*(.*))?$/.exec(p); if (!m) return null; const vars = {}; let txt = m[1].trim();
    txt = txt.replace(/\{(\w+):([\d.,]+)-([\d.,]+)(?::([\d.,]+))?\}/g, (_, v, a, b, st) => { a = +a.replace(",", "."); b = +b.replace(",", "."); st = st ? +st.replace(",", ".") : 1; const steps = Math.floor((b - a) / st + 1e-9), x = +(a + Math.floor(R() * (steps + 1)) * st).toFixed(4); vars[v] = x; return String(x).replace(".", ","); });
    let v; try { v = calc(m[2], vars); } catch (e) { return null; } if (!isFinite(v)) return null; v = +v.toPrecision(6);
    return { t: "num", q: `${txt}${m[3] && !/fără/i.test(m[3]) ? ` (răspuns în ${m[3].trim()}, rotunjit la 2 zecimale)` : " (rotunjește la 2 zecimale)"}`, k: { v }, src: "Problemă după șablon din lecție" };
  } }));
  const en = types.filter(t => G[t].length); if (!en.length) return { q: [], k: [], src: [], sigs: [], total: 0 };
  const W0 = { mcq: [.45, .35, .25], tf: [.25, .2, .15], blank: [.2, .25, .3], num: [.1, .2, .3] }, sum = en.reduce((a, t) => a + W0[t][level], 0);
  const quota = {}; let left = n; en.forEach(t => { quota[t] = Math.min(G[t].length * (t === "num" ? 3 : 1), Math.round(n * W0[t][level] / sum)); left -= quota[t]; });
  const items = [], used = new Set(), sigs = [];
  const skOf = sig => { let m; if ((m = /^m\|d(\d+)\|/.exec(sig))) return "s" + P.defs[+m[1]].src; if ((m = /^[mbt]\|f(\d+)$/.exec(sig))) return "f" + m[1]; if ((m = /^[mbt]\|c?(\d+)$/.exec(sig))) return "s" + P.sents[+m[1]]; return ""; };
  const usedSk = new Set();
  const take = (t, cnt, strict = true) => { const order = shuf(G[t]).sort((a, b) => (hist.has(a.sig) ? 1 : 0) - (hist.has(b.sig) ? 1 : 0)); let c = 0, tries = 0; const pool = t === "num" ? order.concat(order, order) : order; for (const g of pool) { if (c >= cnt) break; if (++tries > 600) break; if (!g.fresh && used.has(g.sig)) continue; const sk = g.fresh ? "" : skOf(g.sig); if (strict && sk && usedSk.has(sk)) continue; const q = g.f(); if (!q) continue; if (items.some(x => nz(x.q) === nz(q.q))) continue; used.add(g.sig); if (sk) usedSk.add(sk); items.push(q); sigs.push(g.fresh ? "" : g.sig); c++; } return c; };
  en.forEach(t => { left += quota[t] - take(t, quota[t]); });
  for (let r = 0; left > 0 && r < 4; r++) for (const t of shuf(en)) { if (left <= 0) break; left -= take(t, 1); }
  for (let r = 0; left > 0 && r < 6; r++) for (const t of shuf(en)) { if (left <= 0) break; left -= take(t, 1, false); }
  const idx = shuf(items.map((_, i) => i)).slice(0, n);
  return { q: idx.map(i => ({ t: items[i].t, q: items[i].q, ...(items[i].o ? { o: items[i].o } : {}) })), k: idx.map(i => items[i].k), src: idx.map(i => items[i].src), sigs: idx.map(i => sigs[i]).filter(Boolean), total: idx.length };
}
export function grade(q, k, a) {
  if (a == null || a === "" || q.t === "open") return 0;
  if (q.t === "mcq") return +a === k ? 1 : 0;
  if (q.t === "tf") return (a === true || a === "1" || a === 1) === k ? 1 : 0;
  if (q.t === "blank") return k.some(x => nz(x) === nz(a)) ? 1 : 0;
  const v = parseFloat(String(a).replace(",", ".")); return isFinite(v) && Math.abs(v - k.v) <= Math.max(Math.abs(k.v) * .01, .011) ? 1 : 0;
}
export const nota = (s, t) => t ? Math.max(1, Math.round(10 * s / t)) : 0;
export const correct = (q, k) => q.t === "open" ? String(k) : q.t === "mcq" ? q.o[k] : q.t === "tf" ? (k ? "Adevărat" : "Fals") : q.t === "blank" ? k[0] : String(+k.v.toFixed(2)).replace(".", ",");

/* ---- optimizări: analiză memorată și „câte întrebări permite lecția” ---- */
const memo = new Map(), hash = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 ^ t.charCodeAt(i)) >>> 0; return t.length + ":" + h; };
export function parseC(text) { const k = hash(text); let P = memo.get(k); if (!P) { P = parse(text); memo.set(k, P); if (memo.size > 60) memo.delete(memo.keys().next().value); } return P; }
const capMemo = new Map();
export function capacity(P, key = "") {
  if (key && capMemo.has(key)) return capMemo.get(key);
  const c = {}; for (const t of ["mcq", "tf", "blank", "num"]) { const g = generate(P, { n: 120, types: [t], level: 1, seed: 1 }); c[t] = t === "num" ? (P.probs.length ? 99 : 0) : g.total; }
  if (key) capMemo.set(key, c); return c;
}
export const statOf = P => ({ s: P.sents.length, d: P.defs.length, f: P.forms.length, p: P.probs.length });
