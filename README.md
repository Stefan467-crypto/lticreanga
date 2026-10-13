# Liceul Teoretic – portal școlar
Site static (HTML + CSS + JS). Rulează-l pe un server/hosting (Firebase Hosting, Netlify), nu din `file://`.

## Configurare
1. Firebase: activează Email/Password; creează Firestore; lipește `firestore.rules` (Rules → Publish).
2. Primul admin: `users/<UID>` cu `email`, `nume`, `role: "admin"`.
3. `js/config.js`: Cloudinary (cloud + upload preset unsigned), `CATALOG_URL`, lista materiilor.

## Roluri
- **Administrator** — totul (inclusiv conturi, calendar, orare, texte, profesori, regulamente).
- **Profesor** — anunțuri și resurse didactice.
- **Membru CE** — anunțuri și meniul zilei de la cantină.
Conturile se creează din `admin` (Panou). Rolurile sunt valorile `admin`, `profesor`, `ce` din câmpul `role`.

## Linkuri fără .html
Site-ul folosește adrese curate (`/resurse`, `/orar`). GitHub Pages le rezolvă automat. Local, folosește un server care face același lucru.

## Facebook + Instagram (opțional)
Cod în `functions/`. Cere planul Firebase Blaze, un cont Instagram Business/Creator legat de pagina de Facebook și o aplicație Meta cu token de pagină.
1. `functions/.env`: `FB_PAGE_ID=...` și `IG_USER_ID=...`
2. `firebase functions:secrets:set META_PAGE_TOKEN` (tokenul paginii, de lungă durată)
3. `firebase deploy --only functions`
Se postează doar anunțurile cu bifa activă. Instagram cere imagine.

## Structură
`index.html` (hero cu poze, anunțuri, orar, calendar), `resurse.html`, `info.html`, `profesori.html`, `cantina.html`, `login.html`, `admin.html` (Panou, doar admin).
Poze hero: `HERO` în `js/config.js`. Orar: `BELLS`. Materii: `SUBJECTS`. Cloudinary: `CLOUDINARY`.

## Generator de teste
- **Baza de lecții** (`lectii`): profesorii aduc textul manualelor automat. Manualul PDF se încarcă o dată în **Resurse** (tip „Manual digital”), apoi în Baza de lecții apeși „Din manualul de pe site”, citești cuprinsul și imporți toate temele deodată. Merge pentru orice materie.
- **Generatorul** (`teste`): creează teste unice doar din textul lecției (fără API). Elevii se antrenează și primesc nota; profesorii (modul „Test pe hârtie”) aleg variante diferite și **descarcă testul și baremul în PDF** (generat în browser).
- **Claude AI (opțional)**: dacă pui `AI = true` în `js/config.js` și funcția `aiTest` e online, profesorii pot cere ca Claude să citească lecția și să scrie testul (inclusiv întrebări deschise și probleme), cu citatul-sursă verificat în text.

### Pornirea funcției Claude AI (o singură dată)
1. Firebase: planul **Blaze**. Cheie API de la console.anthropic.com (nu o pune niciodată în site sau în repo).
2. Google Cloud Console → Secret Manager → creează secretul `ANTHROPIC_API_KEY` cu cheia ta.
3. De pe un calculator: `npm i -g firebase-tools`, `firebase login`, apoi în folderul site-ului `npm i --prefix functions && firebase deploy --only functions`.
   (Alternativ, din GitHub: adaugi secretul `FIREBASE_SERVICE_ACCOUNT` și rulezi workflow-ul „Deploy functions”.)
4. În `js/config.js` pune `AI = true`. Limita: 30 de teste AI pe profesor pe zi (`DAILY` în `functions/index.js`). Modelul se poate schimba cu variabila `AI_MODEL`.

## Alte funcții
Galerie foto (Cloudinary), aplicație instalabilă (manifest + `sw.js`), panou de accesibilitate (mărime text, contrast, citire ușoară, fără animații).

## Optimizări generator
Lista lecțiilor se încarcă rapid (textul se aduce doar pentru temele alese, din `lectii_text`), analiza textului se memorează, setările și istoricul rămân pe dispozitiv, iar generatorul estimează câte întrebări permite lecția. Regulile Firestore trebuie să includă `lectii_text`.
