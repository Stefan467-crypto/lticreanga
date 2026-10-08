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
export const CATALOG_URL = "https://example.com/catalog";
export const SOCIAL = { facebook: "", instagram: "" }; // linkurile paginilor școlii (dacă sunt goale, nu apar)
export const CATS = ["Sărbători", "Examene/BAC/Teze", "Concursuri & Olimpiade", "Succesele elevilor", "Consiliul Elevilor", "General"];
export const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const SUBJECTS = ["Matematică", "Limba și literatura română", "Limba engleză", "Limba franceză", "Limba rusă", "Istorie", "Geografie", "Biologie", "Fizică", "Chimie", "Informatică", "Educație fizică"];
export const TYPES = ["Manual digital", "Joc educațional", "Fișă / exerciții", "BAC", "Teză", "Link"];
export const BELLS = [["1", "08:30", "09:15", "10 min"], ["2", "09:25", "10:10", "15 min"], ["3", "10:25", "11:10", "20 min"], ["4", "11:30", "12:15", "15 min"], ["5", "12:30", "13:15", "10 min"], ["6", "13:25", "14:10", "5 min"], ["7", "14:15", "15:00", "—"]];
