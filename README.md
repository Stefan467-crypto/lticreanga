# Liceul Teoretic „Ion Creangă” Cahul — portal școlar
Site static (HTML + CSS + JavaScript, module ES) cu Firebase (Auth + Firestore). Realizat pentru concursul Tekwill Junior Ambassadors, categoria Proiectare și Dezvoltare Web (gimnaziu).

## Structură
```
index.html … (11 pagini)   pagini, adrese fără .html pe GitHub Pages
css/style.css              tot stilul (bordo + crem, zi/noapte)
img/                       poze și iconițe
js/core/                   config.js (setări), firebase.js, core.js (meniu, roluri), theme.js
js/pages/                  câte un fișier pentru fiecare pagină
js/teste/                  generatorul de teste: engine.js, exam.js, pdf.js, ai.js, demo.js
firestore.rules            regulile bazei de date (se lipesc în Firebase → Firestore → Rules)
sw.js, manifest.webmanifest   aplicație instalabilă
```

## Setări (js/core/config.js)
- `SOCIAL` — linkurile paginilor școlii (Facebook, Instagram). Regulamentul cere trimiteri spre rețelele sociale: completează-le.
- `CATALOG_URL` — linkul catalogului electronic (cât timp e `example.com`, butonul e ascuns).
- `AI_URL` — Worker-ul Cloudflare pentru AI (opțional; gol = AI oprit, site-ul merge cu motorul local).
- `CLOUDINARY`, `HERO`, `BELLS`, materiile (`DEFS`), `STATS`.

## Roluri
Administrator (tot), profesor (anunțuri, resurse, lecții), membru CE (anunțuri, meniul cantinei), vizitator (doar citește). Conturile se creează din Panou. Primul admin: documentul `users/<UID>` cu `email`, `nume`, `role: "admin"`.

## Generator de teste
Manualul PDF se încarcă o dată în Resurse („Manual digital”), apoi în Lecții → „Din manualul de pe site” se citește cuprinsul (semne de carte sau pagina „Cuprins”, oriunde în carte) și se importă temele pe capitole. Testele se compun doar din textul lecției, local, în browser; modelele „ca la examen” sunt în `js/teste/exam.js`.

## Conform regulamentului (Web)
HTML + CSS + JavaScript simplu, fără framework-uri JS și fără constructori de site; backend doar Firebase; 2 fonturi; disclaimerul în subsolul fiecărei pagini; meta descriere + cuvinte-cheie; Despre, Resurse/Servicii, Contact (telefon, e-mail, adresă, hartă încorporată); meniu pe toate paginile; adaptiv telefon/desktop; legături interne și externe.
