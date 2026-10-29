# Liceul Teoretic „Ion Creangă” Cahul — portal școlar

Site static (HTML + CSS + JavaScript, module ES) cu Firebase (Auth + Firestore). Realizat pentru concursul Tekwill Junior Ambassadors, categoria Proiectare și Dezvoltare Web (gimnaziu).

## Structură

```
index.html                 pagina principală
pages/*.html               toate celelalte pagini (adrese fără .html: /pages/orar)
404.html                   trimite adresele vechi (/orar) la /pages/orar
css/style.css              tot stilul (bordo + crem, zi/noapte)
img/                       poze și iconițe
js/core/                   config.js (setări), firebase.js, core.js (meniu, roluri), theme.js
js/pages/                  câte un fișier pentru fiecare pagină (home, info, lectii, teste …)
js/teste/                  generatorul de teste: engine.js, exam.js, pdf.js, ai.js, demo.js
firestore.rules            regulile bazei de date (se lipesc în Firebase → Firestore → Rules)
sw.js, img/manifest.webmanifest   aplicație instalabilă
```

## Setări (js/core/config.js)

- `SOCIAL` — linkurile paginilor școlii (Facebook, Instagram). Regulamentul cere trimiteri spre rețelele sociale: completează-le.
- `CATALOG_URL` — linkul catalogului electronic (cât timp e `example.com`, butonul e ascuns).
- `AI_URL` — Worker-ul Cloudflare pentru AI (opțional; gol = AI oprit, site-ul merge cu motorul local).
- `CLOUDINARY`, `HERO`, `BELLS`, materiile (`DEFS`), `STATS`.

## Echipa didactică și conturi

În Panou, butonul + deschide formularul de cont: nume, e-mail, parolă, rol, disciplină, fotografie, telefon și e-mail de contact (opționale). Pentru Profesor și Administrator–Profesor/Director, datele se scriu și în `profesori/<uid>` și apar în pagina Echipa didactică. Directorul (Administrator – Director) este primul în Echipa didactică și în orarul profesorilor. Intrările vechi fără cont se pot lega de un cont nou (câmpul „Preia datele unui profesor existent”).

## Roluri

Administratorul are sub-rolurile Director și Profesor (câmpul `sub` din `users/<UID>`). Administrator (tot), profesor (anunțuri, resurse, lecții), membru CE (anunțuri, meniul cantinei), vizitator (doar citește). Conturile se creează din Panou. Primul admin: documentul `users/<UID>` cu `email`, `nume`, `role: "admin"`.

## Consolă (jurnal de activitate)

Pagina `consola` (doar pentru administratori, de toate tipurile) arată în timp real **cine** (cont + rol), **ce** a făcut și **la ce oră**: anunțuri, poze, resurse, lecții, orar, cantină, conturi, conectări etc. Orice scriere în baza de date făcută de un cont autentificat se notează automat (`js/core/jurnal.js`, funcțiile `addDoc/setDoc/updateDoc/deleteDoc/writeBatch` din `core.js`). Acțiunile identice făcute una după alta se unesc într-o singură linie.

- **Punct roșu** pe hamburger când e o noutate; dispare când deschizi meniul. Rămâne roșu pe linkul „Consolă” până deschizi consola. La fel pentru „Anunțuri” (toți vizitatorii) când apare un anunț nou (`js/core/notify.js`).
- Administratorii primesc și o notificare scurtă pe ecran când un alt cont face ceva; în consolă se poate porni și un **sunet** (per dispozitiv).
- **Important:** după actualizare, lipește `firestore.rules` în Firebase → Firestore → Rules, altfel jurnalul nu se scrie.

## Generator (teste și prezentări)

Pagina `teste` se numește „Generator”. Profesorii și administratorii au două file: **Teste** și **Prezentări**. La Prezentări, AI (același Worker Cloudflare) scrie planul diapozitivelor numai din textul lecțiilor alese, planul se poate edita, iar fișierul .pptx se creează în browser (`js/teste/pptx.js`, biblioteca `js/lib/pptxgen.bundle.js`).

## Fișiere (Resurse, Informații)

Fiecare fișier are butoanele „Deschide” (filă nouă) și „Descarcă”. Dacă PDF/ZIP nu se deschid, în Cloudinary → Settings → Security se bifează „PDF and ZIP files delivery”.

## Orarul din fișier

În pagina Orar, administratorul apasă „Importă din fișier” (.xlsx, .docx, .doc, .csv, .xls) sau „Exportă în fișier” (Excel sau Word, în aceeași formă, deci se poate reimporta). Fișierul nu se salvează, doar orarele extrase (`js/pages/orar-import.js`, `js/core/office.js`).

## Generator de teste

Testul se compune cu AI din lecțiile alese (când ești autentificat și `AI_URL` e setat); dacă AI nu răspunde, se folosește generatorul local. Exercițiile de același tip sunt grupate. Manualul PDF se încarcă o dată în Resurse („Manual digital”), apoi în Lecții → „Din manualul de pe site” se citește cuprinsul (semne de carte sau pagina „Cuprins”, oriunde în carte) și se importă temele pe capitole. Testele se compun doar din textul lecției, local, în browser; modelele „ca la examen” sunt în `js/teste/exam.js`.

## Conform regulamentului (Web)

HTML + CSS + JavaScript simplu, fără framework-uri JS și fără constructori de site; backend doar Firebase; 2 fonturi; disclaimerul în subsolul fiecărei pagini; meta descriere + cuvinte-cheie; Despre, Resurse/Servicii, Contact (telefon, e-mail, adresă, hartă încorporată); meniu pe toate paginile; adaptiv telefon/desktop; legături interne și externe.
