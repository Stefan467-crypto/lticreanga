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
Poze hero: `HERO` în `js/config.js`. Orar: `BELLS`. Materii și clasele lor: `DEFS` din `js/config.js`. Cifrele școlii (elevi, cadre, clase): se schimbă din pagina principală, de administrator. Cloudinary: `CLOUDINARY`.

## Generator de teste
- **Baza de lecții** (`lectii`): profesorii aduc textul manualelor automat. Manualul PDF se încarcă o dată în **Resurse** (tip „Manual digital”), apoi în Baza de lecții apeși „Din manualul de pe site”, citești cuprinsul și imporți toate temele deodată. Merge pentru orice materie.
- **Generatorul** (`teste`): creează teste unice doar din textul lecției (fără API). Elevii se antrenează și primesc nota; profesorii (modul „Test pe hârtie”) aleg variante diferite și **descarcă testul și baremul în PDF** (generat în browser).
- **Structura**: materie → clasă → capitol → teme. Capitolele se citesc singure din cuprinsul manualului (sau se scriu cu `# Capitol`).
- **Tipuri de exerciții pe materii** și **modele de test „ca la examen”** (gimnaziu la clasele V–IX, BAC la X–XII): `js/exam.js` (structură, număr de itemi, punctaj, timp). Conținutul vine mereu din lecție.
- **Probleme**: motorul le extrage singur din lecție („Problemă… Rezolvare… Răspuns…”) și le transformă în probleme cu numere noi la fiecare test.
- Nu se folosește niciun API extern (fără AI, fără costuri).

## Alte funcții
Galerie foto (Cloudinary), aplicație instalabilă (manifest + `sw.js`), panou de accesibilitate (mărime text, contrast, citire ușoară, fără animații).

## Optimizări generator
Lista lecțiilor se încarcă rapid (textul se aduce doar pentru temele alese, din `lectii_text`), analiza textului se memorează, setările și istoricul rămân pe dispozitiv, iar generatorul estimează câte întrebări permite lecția. Regulile Firestore trebuie să includă `lectii_text`.

## Cuprinsul manualului
La „Import din manual”: alegi paginile cuprinsului (de la–până la) și apeși „Citește cuprinsul”. Dacă nu alegi nimic, caut întâi semnele de carte ale PDF-ului, apoi pagina „Cuprins”. „Vezi paginile manualului” arată paginile ca să o găsești singur. Decalajul dintre numărul tipărit și pagina PDF se calculează automat sau îl scrii tu.
