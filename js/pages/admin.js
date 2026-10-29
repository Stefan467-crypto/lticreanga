import {
  $,
  esc,
  safeUrl,
  toast,
  whenRole,
  modal,
  plusBtn,
  upload,
  user,
  db,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "../core/core.js";
import { auth, firebaseConfig } from "../core/firebase.js";
import { SUBJECTS, canon, ROLES, roleKey, roleOf, roleLabel, onTeam } from "../core/config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
// Un cont de profesor = documentul users/<uid> (rol) + documentul profesori/<uid> (fotografie, disciplină, contacte; public în „Echipa didactică”). Ambele se scriu împreună.
let U = [],
  P = [];
const ORD = ["admin-director", "admin-profesor", "admin", "profesor", "ce"];
const ini = n =>
  String(n || "?")
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const prof = id => P.find(p => p.id === id);
const av = (p, n) =>
  p?.img ? `<img class="av sm" alt="" src="${esc(safeUrl(p.img))}">` : `<div class="av sm ini">${esc(ini(n))}</div>`;
const draw = () => {
  const l = U.map(u => ({ ...u, key: roleKey(u) })).sort(
    (a, b) =>
      ORD.indexOf(a.key) - ORD.indexOf(b.key) ||
      String(a.nume || a.email).localeCompare(String(b.nume || b.email), "ro")
  );
  $("#users").innerHTML =
    l
      .map(u => {
        const p = prof(u.id),
          miss = onTeam(u.key) && !p;
        return `<li><span class="uwho">${av(p, u.nume)}<span><b>${esc(u.nume || u.email)}</b><br><span class="tag">${esc(u.email)} · ${esc(roleLabel(u.key))}${p?.materie ? " · " + esc(p.materie) : ""}${miss ? " · fără profil în Echipa didactică (Editează → Salvează)" : ""}</span></span></span><span class="row"><button class="btn o s" data-ed="${u.id}">Editează</button><button class="btn o s" data-pw="${u.id}">Parolă</button><button class="btn o s" data-rm="${u.id}">Elimină</button></span></li>`;
      })
      .join("") || '<li class="tag">Nu sunt conturi.</li>';
};
const load = async () => {
  [U, P] = await Promise.all(
    ["users", "profesori"].map(async c => (await getDocs(collection(db, c))).docs.map(d => ({ id: d.id, ...d.data() })))
  );
  draw();
};
const form = (u, linkId) => {
  const legacy = P.filter(p => !p.uid),
    cur = u ? prof(u.id) : null,
    key0 = u ? roleKey(u) : "profesor";
  const d = modal(
    u ? "Editează contul" : "Cont nou",
    `<div class="grid"><label>Nume și prenume<input name="n" required></label><label>Rol<select name="r">${ROLES.map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
<label>E-mail (autentificare)<input name="e" type="email" required></label><label id="pl">Parolă (min. 6)<input name="p" type="password" minlength="6" required autocomplete="new-password"></label></div>
<div id="tm">${!u && legacy.length ? `<label>Preia datele unui profesor existent (fără cont)<select name="l"><option value="">— cont nou, fără date —</option>${legacy.map(p => `<option value="${p.id}">${esc(p.nume)}${p.materie ? " · " + esc(p.materie) : ""}</option>`).join("")}</select></label>` : ""}
<div class="grid"><label>Disciplina<select name="m"><option value="">— fără —</option>${SUBJECTS.map(s => `<option>${s}</option>`).join("")}</select></label><label>Fotografie<input name="f" type="file" accept="image/*"></label>
<label>Telefon (pe site)<input name="t" type="tel" placeholder="opțional"></label><label>E-mail de contact (pe site)<input name="c" type="email" placeholder="opțional"></label></div>
${cur?.img ? '<label class="chk"><input type="checkbox" name="x"> Elimină fotografia actuală</label>' : ""}<p class="tag">Telefonul și e-mailul de contact apar public în „Echipa didactică”. Lasă gol ce profesorul nu dorește să afișeze. Fotografia rămâne cea actuală dacă nu alegi alta.</p></div>`,
    async f => {
      const E = f.elements,
        key = E.r.value,
        { role, sub } = roleOf(key),
        team = onTeam(key),
        nume = E.n.value.trim(),
        file = team && E.f.files[0];
      const leg = prof(E.l?.value || "") || null;
      if (u && u.id === user?.uid && role !== "admin")
        throw new Error("Nu îți poți scoate singur rolul de administrator");
      let img = file ? await upload(file) : E.x?.checked ? "" : cur?.img || leg?.img || "";
      const p = id => ({
        uid: id,
        nume,
        materie: E.m.value,
        tel: E.t.value.trim(),
        emailPub: E.c.value.trim(),
        rol: key,
        ts: cur?.ts || leg?.ts || Date.now(),
        ...(img ? { img } : {}),
      });
      if (u) {
        const { id, sub: _o, ...rest } = u;
        await setDoc(doc(db, "users", id), { ...rest, nume, role, ...(sub ? { sub } : {}) });
        if (team) await setDoc(doc(db, "profesori", id), p(id));
        else if (cur) await deleteDoc(doc(db, "profesori", id));
      } else {
        const em = E.e.value.trim(),
          c = await createUserWithEmailAndPassword(
            getAuth(initializeApp(firebaseConfig, "s" + Date.now())),
            em,
            E.p.value
          );
        await setDoc(doc(db, "users", c.user.uid), { email: em, nume, role, ...(sub ? { sub } : {}) });
        if (team) {
          await setDoc(doc(db, "profesori", c.user.uid), p(c.user.uid));
          if (leg) await deleteDoc(doc(db, "profesori", leg.id));
        }
        await signOut(getAuth(c.user.auth.app));
      }
      toast(u ? "Salvat" : "Cont creat");
      load();
    },
    u ? "Salvează" : "Creează contul"
  );
  const E = d.querySelector("form").elements,
    sync = () => {
      d.querySelector("#tm").hidden = !onTeam(E.r.value);
    };
  E.r.value = key0;
  E.r.onchange = sync;
  sync();
  const fill = p => {
    if (!p) return;
    E.n.value = p.nume || "";
    const m = canon(p.materie);
    if (SUBJECTS.includes(m)) E.m.value = m;
    E.t.value = p.tel || (p.contact && !/@/.test(p.contact) ? p.contact : "");
    E.c.value = p.emailPub || (/@/.test(p.contact || "") ? p.contact : "");
  };
  if (u) {
    E.e.value = u.email;
    E.e.disabled = true;
    E.p.required = false;
    d.querySelector("#pl").hidden = true;
    E.n.value = u.nume || "";
    fill(cur);
    E.n.value = u.nume || cur?.nume || "";
  } else if (E.l) {
    E.l.onchange = () => fill(prof(E.l.value));
    if (linkId) {
      E.l.value = linkId;
      fill(prof(linkId));
    }
  }
};
$("#users").onclick = async e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset,
    u = U.find(x => x.id === (d.ed || d.pw || d.rm));
  if (!u) return;
  if (d.ed) form(u);
  else if (d.pw) {
    try {
      await sendPasswordResetEmail(auth, u.email);
      toast("Am trimis e-mailul de resetare a parolei");
    } catch (x) {
      toast("E-mailul nu a putut fi trimis");
    }
  } else if (d.rm) {
    if (u.id === user?.uid) return toast("Nu îți poți elimina propriul cont");
    if (
      !confirm(
        "Elimini contul? Dispare și din „Echipa didactică”. (Contul de autentificare rămâne în Firebase, dar fără rol nu mai poate face nimic.)"
      )
    )
      return;
    await deleteDoc(doc(db, "users", u.id));
    if (prof(u.id)) await deleteDoc(doc(db, "profesori", u.id));
    toast("Eliminat");
    load();
  }
};
plusBtn($("#users"), "Cont nou", () => form());
whenRole(async r => {
  const ok = r === "admin";
  $("#deny").hidden = ok;
  $("#panel").hidden = !ok;
  if (!ok) return;
  await load();
  const q = new URLSearchParams(location.search);
  if (q.get("nou")) form();
  else if (q.get("link")) form(null, q.get("link"));
  else if (q.get("edit")) {
    const u = U.find(x => x.id === q.get("edit"));
    if (u) form(u);
  }
});
