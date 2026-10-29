// Jurnalul de activitate (consola administratorilor): cine, ce a făcut și la ce oră.
// Fiecare acțiune a unui cont autentificat se scrie în colecția „jurnal”. Acțiunile identice făcute una după alta
// (de ex. importul a 40 de lecții) se unesc într-o singură linie, ca să nu umple consola.
import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const VERB = { add: "a adăugat", set: "a salvat", upd: "a modificat", del: "a șters" };
// colecție → [singular, plural]
const LABEL = {
  anunturi: ["anunț", "anunțuri"],
  galerie: ["poză în galerie", "poze în galerie"],
  resurse: ["resursă", "resurse"],
  lectii: ["lecție", "lecții"],
  evenimente: ["eveniment în calendar", "evenimente în calendar"],
  pagini: ["text de pagină", "texte de pagină"],
  profesori: ["profil în Echipa didactică", "profiluri în Echipa didactică"],
  orar: ["orar", "orare"],
  meniu: ["meniul cantinei", "meniuri ale cantinei"],
  users: ["cont", "conturi"],
  mesaje: ["mesaj", "mesaje"],
  regulamente: ["document în Informații", "documente în Informații"],
  consiliu: ["înregistrare Consiliul Elevilor", "înregistrări Consiliul Elevilor"],
  succese: ["succes al elevilor", "succese ale elevilor"],
};
const SKIP = new Set(["jurnal", "lectii_text"]); // lectii_text merge mereu împreună cu lectii
const WAIT = 1500; // ms de liniște după care se scrie linia unită

const page = () =>
  location.pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/\.html$/, "") || "acasă";
const titleOf = (d, id) => {
  const t =
    d && typeof d === "object"
      ? (d.titlu ?? d.t ?? d.nume ?? d.email ?? (typeof d.text === "string" ? d.text.slice(0, 50) : ""))
      : "";
  return String(t || id || "")
    .trim()
    .slice(0, 60);
};

const put = (who, e) =>
  addDoc(collection(db, "jurnal"), {
    uid: who.uid,
    nume: String(who.nume || "").slice(0, 80),
    rol: who.rol || "",
    pagina: page(),
    ts: Date.now(),
    ...e,
  }).catch(() => {}); // dacă regulile nu sunt încă publicate, site-ul merge mai departe fără jurnal

/** Scrie imediat o linie (conectare, ieșire, golirea consolei). */
export const logEvent = (who, act, text) => (who ? put(who, { act, text }) : Promise.resolve());

const pend = new Map();
let timer = 0;
const flush = () => {
  timer = 0;
  for (const e of pend.values()) {
    const [one, many] = LABEL[e.col] || [e.col, e.col];
    let text;
    if (e.n === 1) text = `${VERB[e.act]} ${one}${e.titles[0] ? ` «${e.titles[0]}»` : ""}`;
    else
      text = `${VERB[e.act]} ${e.n} ${many}${e.titles.length ? ` (${e.titles.join(", ")}${e.n > e.titles.length ? "…" : ""})` : ""}`;
    put(e.who, { act: e.act, col: e.col, n: e.n, text: text.slice(0, 280) });
  }
  pend.clear();
};

/** Notează o scriere în baza de date (add / set / upd / del). */
export function trackAction(who, act, col, id, data) {
  if (!who || SKIP.has(col) || (col === "mesaje" && act === "upd")) return;
  const k = `${act}|${col}`;
  const e = pend.get(k) || { who, act, col, n: 0, titles: [] };
  e.n++;
  const t = titleOf(data, id);
  if (t && !e.titles.includes(t) && e.titles.length < 3) e.titles.push(t);
  pend.set(k, e);
  clearTimeout(timer);
  timer = setTimeout(flush, WAIT);
}
addEventListener("pagehide", () => timer && flush());
