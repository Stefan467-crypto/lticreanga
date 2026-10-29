// Puncte roșii de noutate: pe butonul de meniu (hamburger), apoi pe linkul care duce la noutate.
//  • toți vizitatorii: anunț nou  → punct pe hamburger + pe „Anunțuri”
//  • administratorii: acțiune nouă a altui cont → punct pe hamburger + pe „Consolă”, notificare scurtă pe ecran
// Punctul de pe hamburger dispare când se deschide meniul; punctul de pe link dispare când se deschide pagina respectivă.
import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const store = {
  get: k => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      /* mod privat */
    }
  },
};
const ITEMS = { jurnal: 'a[href$="consola"]', anunturi: 'a[href$="#anunturi"]' };
const latest = {}; // item → ora celei mai noi noutăți
let who = "-";
const kSeen = i => `ltic:seen:${i}:${who}`;
const kMenu = () => `ltic:menu:${who}`;
export const seenOf = i => +store.get(kSeen(i)) || 0;
const menuSeen = () => +store.get(kMenu()) || 0;

const dot = el => {
  if (!el._dot) {
    el._dot = el.appendChild(document.createElement("span"));
    el._dot.className = "dot";
    el._dot.setAttribute("aria-hidden", "true");
  }
  return el._dot;
};

function render() {
  let menu = false;
  for (const [item, sel] of Object.entries(ITEMS)) {
    const s = seenOf(item),
      t = latest[item] || 0;
    if (t > s && t > menuSeen()) menu = true;
    document.querySelectorAll(sel).forEach(a => {
      dot(a).hidden = !(t > s);
      a.classList.toggle("nou", t > s);
    });
  }
  const b = document.getElementById("burger");
  if (b) {
    b._lbl ??= b.getAttribute("aria-label");
    dot(b).hidden = !menu;
    b.setAttribute("aria-label", menu ? `${b._lbl} (noutăți)` : b._lbl);
  }
}

/** Meniul a fost deschis. */
export function markMenu() {
  store.set(kMenu(), Math.max(Date.now(), ...Object.values(latest)));
  render();
}
/** Pagina (consola, anunțurile) a fost văzută. */
export function markSeen(item) {
  store.set(kSeen(item), Math.max(Date.now(), latest[item] || 0));
  render();
}

/* sunet scurt (opțional, se pornește din consolă) */
export const soundOn = () => store.get("ltic:sound") === "1";
export const setSound = on => store.set("ltic:sound", on ? "1" : "0");
let ac;
export function beep() {
  if (!soundOn()) return;
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.4);
  } catch (e) {
    /* browserul nu permite sunet încă */
  }
}

let stop = null;
export function startNotify({ user, role, toast }) {
  stop?.();
  stop = null;
  who = user?.uid || "-";
  Object.keys(latest).forEach(k => delete latest[k]);

  // anunțuri noi (pentru toți). Prima vizită doar fixează punctul de plecare, ca să nu apară roșu degeaba.
  if (!store.get(kSeen("anunturi"))) store.set(kSeen("anunturi"), Date.now());
  getDocs(query(collection(db, "anunturi"), orderBy("ts", "desc"), limit(1)))
    .then(s => {
      latest.anunturi = s.docs[0]?.data().ts || 0;
      render();
    })
    .catch(() => {});
  const sec = document.getElementById("anunturi");
  if (sec && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.some(e => e.isIntersecting) && markSeen("anunturi"), {
      threshold: 0.3,
    });
    io.observe(sec);
  }
  document.querySelectorAll(ITEMS.anunturi).forEach(a => a.addEventListener("click", () => markSeen("anunturi")));

  // consola (doar administratori): acțiunile celorlalte conturi, în timp real
  if (role === "admin") {
    if (!store.get(kSeen("jurnal"))) store.set(kSeen("jurnal"), Date.now());
    const onConsole = /(^|\/)consola(\.html)?$/.test(location.pathname);
    let first = true;
    stop = onSnapshot(
      query(collection(db, "jurnal"), where("ts", ">", seenOf("jurnal")), orderBy("ts", "desc"), limit(50)),
      snap => {
        const others = snap.docs.map(d => d.data()).filter(d => d.uid !== user.uid);
        latest.jurnal = others.reduce((m, d) => Math.max(m, d.ts || 0), 0);
        if (!first && !onConsole)
          snap.docChanges().forEach(c => {
            const d = c.doc.data();
            if (c.type === "added" && d.uid !== user.uid) {
              toast(`${d.nume}: ${d.text}`);
              beep();
            }
          });
        first = false;
        render();
      },
      () => {} // regulile pentru „jurnal” nu sunt publicate încă
    );
  }
  render();
}
