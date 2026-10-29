// ── Poze hero (se schimbă singure). Pune pozele în folderul img/ sau folosește linkuri (Cloudinary).
// Pentru o poză nouă adaugă o linie: { src: "img/hero10.jpg", pos: "center 40%" }  (pos = ce parte din poză rămâne vizibilă)
export const HERO = [
  { src: "img/hero1.jpg", pos: "center 50%" },
  { src: "img/hero2.jpg", pos: "center 35%" },
  { src: "img/hero3.jpg", pos: "center 45%" },
  { src: "img/hero4.jpg", pos: "center 55%" },
  { src: "img/hero5.jpg", pos: "center 35%" },
  { src: "img/hero6.jpg", pos: "center 50%" },
  { src: "img/hero7.jpg", pos: "center 60%" },
  { src: "img/hero8.jpg", pos: "center 62%" },
  { src: "img/hero9.jpg", pos: "center" },
];
export const HERO_MS = 6000; // cât stă fiecare poză (milisecunde)
export const CLOUDINARY = { cloud: "dp1y1xv5l", preset: "Lticreanga" };
export const CATALOG_URL = "https://agenda.sime.md";
export const SOCIAL = {
  facebook: "https://www.facebook.com/share/1C85paRqdb/",
  instagram: "https://www.instagram.com/consiliul.elevilor.ion.creanga?srtk=MW0yZGE5NWl1anc4OQ==",
}; // linkurile paginilor școlii (dacă sunt goale, nu apar)
export const CATS = [
  "Sărbători",
  "Examene/BAC/Teze",
  "Concursuri & Olimpiade",
  "Succesele elevilor",
  "Consiliul Elevilor",
  "General",
];
export const LETTERS = ["A", "B", "C", "D"]; // literele claselor
export const TYPES = ["Manual digital", "Joc educațional", "Fișă / exerciții", "BAC", "Teză", "Link"];
export const BELLS = [
  ["1", "08:30", "09:15", "10 min"],
  ["2", "09:25", "10:10", "15 min"],
  ["3", "10:25", "11:10", "20 min"],
  ["4", "11:30", "12:15", "15 min"],
  ["5", "12:30", "13:15", "10 min"],
  ["6", "13:25", "14:10", "5 min"],
  ["7", "14:15", "15:00", "—"],
];
export const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
// ── Materiile liceului și clasele la care se predau (număr de la 5 la 12). Ordinea de aici e ordinea din site.
const DEFS = [
  ["Limba română", 5, 12],
  ["Matematica", 5, 12],
  ["Geografie", 5, 12],
  ["Limba engleză", 5, 12],
  ["Limba franceză", 5, 12],
  ["Științe", 5, 5],
  ["Educația muzicală", 5, 8],
  ["Dezvoltarea personală", 5, 12],
  ["Educația tehnologică", 5, 9],
  ["Istoria", 5, 12],
  ["Educația plastică", 5, 7],
  ["Educație fizică", 5, 12],
  ["Educația pentru societate", 5, 12],
  ["Arta comportamentală", 5, 5],
  ["Biologie", 6, 12],
  ["Fizica", 6, 12],
  ["Informatica", 7, 12],
  ["Chimia", 7, 12],
  ["Literatura universală", 10, 12],
  ["Educația ecologică", 12, 12],
];
export const SUBJECTS = DEFS.map(d => d[0]);
export const classesOf = s => {
  const d = DEFS.find(x => x[0] === s);
  return d ? CLASSES.slice(d[1] - 5, d[2] - 4) : CLASSES;
};
export const classRange = s => {
  const c = classesOf(s);
  return c.length > 1 ? `cl. ${c[0]}–${c.at(-1)}` : `cl. ${c[0]}`;
};
// Denumirile vechi (din datele deja salvate) → denumirile noi. Astfel nimic nu se pierde.
const OLD = {
  Matematică: "Matematica",
  "Limba și literatura română": "Limba română",
  Istorie: "Istoria",
  Fizică: "Fizica",
  Chimie: "Chimia",
  Informatică: "Informatica",
  "Educația fizică": "Educație fizică",
};
export const canon = s => OLD[s] || s;
export const namesOf = s => [
  s,
  ...Object.entries(OLD)
    .filter(([, v]) => v === s)
    .map(([k]) => k),
];
// ── Cifrele școlii (se pot schimba din pagina principală, de către administrator)
export const STATS = { elevi: 675, cadre: 35, claseGim: 19, claseLic: 6 };
// Adresa serviciului AI gratuit (Cloudflare Worker, vezi README.md). Gol = AI oprit, site-ul merge normal doar cu motorul local.
export const AI_URL = "https://lticreanga.popovstefan647.workers.dev";

// ── Roluri din Panou. „Administrator” are două sub-roluri care apar și în Echipa didactică; Directorul are prioritate peste tot (primul în orar și în Echipa didactică).
export const ROLES = [
  ["admin-director", "Administrator – Director"],
  ["admin-profesor", "Administrator – Profesor"],
  ["admin", "Administrator (doar site)"],
  ["profesor", "Profesor"],
  ["ce", "Membru CE"],
];
export const roleKey = u =>
  u.role === "admin" ? (u.sub === "director" || u.sub === "profesor" ? "admin-" + u.sub : "admin") : u.role || "ce"; // contul → cheia din listă
export const roleOf = k =>
  k.startsWith("admin") ? { role: "admin", sub: k.split("-")[1] || "" } : { role: k, sub: "" }; // cheia din listă → câmpurile contului
export const roleLabel = k => (ROLES.find(r => r[0] === k) || [0, k])[1];
export const onTeam = k => k === "admin-director" || k === "admin-profesor" || k === "profesor"; // cine apare în pagina Echipa didactică
