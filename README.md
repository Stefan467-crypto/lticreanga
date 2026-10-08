# Liceul Teoretic – portal școlar
Site static (HTML + CSS + JS). Rulează-l pe un server/hosting (Firebase Hosting, Netlify), nu din `file://`.

## Configurare
1. Firebase: activează Email/Password; creează Firestore; lipește `firestore.rules` (Rules → Publish).
2. Primul admin: `users/<UID>` cu `email`, `nume`, `role: "admin"`.
3. `js/config.js`: Cloudinary (cloud + upload preset unsigned), `CATALOG_URL`, lista materiilor.

## Roluri
Personal = tot ce face adminul, mai puțin crearea/ștergerea conturilor. Admin = tot.

## Facebook + Instagram (opțional)
Cod în `functions/`. Cere planul Firebase Blaze, un cont Instagram Business/Creator legat de pagina de Facebook și o aplicație Meta cu token de pagină.
1. `functions/.env`: `FB_PAGE_ID=...` și `IG_USER_ID=...`
2. `firebase functions:secrets:set META_PAGE_TOKEN` (tokenul paginii, de lungă durată)
3. `firebase deploy --only functions`
Se postează doar anunțurile cu bifa activă. Instagram cere imagine.

## Structură
`index.html` (hero cu poze, anunțuri, orar, calendar), `resurse.html`, `info.html`, `profesori.html`, `cantina.html`, `login.html`, `admin.html` (Panou, doar admin).
Poze hero: `HERO` în `js/config.js`. Orar: `BELLS`. Materii: `SUBJECTS`. Cloudinary: `CLOUDINARY`.
