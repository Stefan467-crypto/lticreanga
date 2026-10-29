// Consola administratorilor: cine (cont + rol), ce a făcut și la ce oră. Se actualizează singură, în timp real.
import {
  $,
  esc,
  toast,
  whenRole,
  db,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  writeBatch,
  doc,
  user,
  markSeen,
  seenOf,
  soundOn,
  setSound,
  logEvent,
} from "../core/core.js";
import { roleLabel } from "../core/config.js";

const MAX = 300; // câte linii se păstrează pe ecran
let L = []; // liniile (cele mai vechi primele)
let firstLoad = true;
let since = 0; // ce era „necitit” când s-a deschis consola
let stop = null;

const pad = n => String(n).padStart(2, "0");
const stamp = t => {
  const d = new Date(t);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const hue = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

const draw = () => {
  const f = $("#cf").value,
    t = $("#term");
  const atEnd = t.scrollHeight - t.scrollTop - t.clientHeight < 60;
  const rows = L.filter(x => !f || x.uid === f);
  t.innerHTML =
    rows
      .map(
        x =>
          `<div class="tline ${esc(x.act)}${x.ts > since && x.uid !== user?.uid ? " fresh" : ""}"><time>${stamp(x.ts)}</time><b style="color:hsl(${hue(x.uid)} 75% 72%)">${esc(x.nume)}</b><i>${esc(roleLabel(x.rol))}</i><span class="tx">${esc(x.text)}</span><em>${esc(x.pagina || "")}</em></div>`
      )
      .join("") ||
    '<div class="tline mut">Nicio activitate încă. Când cineva adaugă, modifică sau șterge ceva, apare aici.</div>';
  if (atEnd || firstLoad) t.scrollTop = t.scrollHeight;
};

const fillFilter = () => {
  const sel = $("#cf"),
    cur = sel.value,
    m = new Map();
  L.forEach(x => m.set(x.uid, x.nume));
  sel.innerHTML =
    '<option value="">Toate conturile</option>' +
    [...m]
      .sort((a, b) => a[1].localeCompare(b[1], "ro"))
      .map(([u, n]) => `<option value="${esc(u)}">${esc(n)}</option>`)
      .join("");
  sel.value = m.has(cur) ? cur : "";
};

const sound = () => {
  const on = soundOn();
  $("#snd").textContent = "Sunet: " + (on ? "pornit" : "oprit");
  $("#snd").setAttribute("aria-pressed", on);
};

function start() {
  since = seenOf("jurnal");
  stop = onSnapshot(
    query(collection(db, "jurnal"), orderBy("ts", "desc"), limit(MAX)),
    snap => {
      L = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      fillFilter();
      draw();
      firstLoad = false;
      $("#cst").textContent = "● live · " + L.length + (L.length === 1 ? " linie" : " linii");
      markSeen("jurnal"); // ce se vede pe ecran e citit
    },
    err => {
      $("#cst").textContent = "fără acces";
      toast(
        err.code === "permission-denied"
          ? "Publică regulile din firestore.rules în Firebase (colecția „jurnal”)"
          : "Consola nu poate fi încărcată"
      );
    }
  );
}

$("#cf").onchange = draw;
$("#snd").onclick = () => {
  setSound(!soundOn());
  sound();
  if (soundOn()) toast("Sunetul e pornit pentru acest dispozitiv");
};
$("#clr").onclick = async () => {
  if (!L.length || !confirm("Golești consola? Toate liniile se șterg definitiv.")) return;
  try {
    const all = (await getDocs(collection(db, "jurnal"))).docs;
    for (let i = 0; i < all.length; i += 400) {
      const b = writeBatch(db);
      all.slice(i, i + 400).forEach(d => b.delete(doc(db, "jurnal", d.id)));
      await b.commit();
    }
    logEvent("clear", "a golit consola");
    toast("Consola a fost golită");
  } catch (e) {
    toast("Nu am putut goli consola: " + (e.code || e.message));
  }
};
sound();
whenRole(r => {
  const ok = r === "admin";
  $("#deny").hidden = ok;
  $("#panel").hidden = !ok;
  if (ok && !stop) start();
});
