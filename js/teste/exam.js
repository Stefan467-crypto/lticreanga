// Tipurile de exerciții pe materii și structurile testelor („ca la examen”).
// IMPORTANT: aici se modifică structura (numărul de itemi, punctajul, timpul). Conținutul îl dă mereu lecția din manual.
//
// Surse folosite pentru structură:
// MODELE OFICIALE (câmpul ofic: true) — structura, punctajul și timpul sunt preluate din testele ANCE pentru exersare, februarie 2026 (ance.gov.md):
//  • Gimnaziu (cl. IX), 120 min, 50 p: Matematica (12 itemi), Limba română (13 itemi pe un text, ultimul = corectitudinea scrisului),
//    Istoria românilor și universală (Subiectul I 12 p · II 23 p · III 15 p, toți itemii pe surse).
//  • BAC (cl. XII), 180 min, 100 p: Matematica profil real (14 sub-itemi pe 4 domenii), Limba română umanist (12 itemi + 20 p redactare)
//    și real (10 itemi + 20 p redactare), Istoria umanist (Subiectele I 24 p · II 22 p · III 19 p · IV 35 p).
//  • + Fizica real (12 itemi), Chimia real (12 itemi), Geografia (14 itemi, 3 domenii), Limba engleză și franceză (lectură 30 p + eseu 40 p + articol 30 p) — ANCE 2026;
//    Biologia real și Informatica real — structura testelor ANCE din 2024 (testele din 2026 nu s-au putut deschide).
// Celelalte materii/profiluri au un model ORIENTATIV (ofic: false): structură apropiată, neverificată pe un test oficial — se completează când ai testele ANCE ale materiei.
// Itemii „src” = itemi pe sursă/text: sursele sunt fragmente din lecție alese de site (js/teste/surse.js); AI scrie doar sarcinile și baremul.
// Câmpuri la un item (slot): k = tipurile acceptate, p = puncte, g = grupul care împarte aceleași surse, ns = nr. de surse ale grupului, h = indicație pentru sarcină.

export const KIND = {
  mcq: "Grilă",
  tf: "Adevărat / Fals",
  blank: "Completare",
  num: "Problemă de calcul",
  match: "Asociere",
  open: "Răspuns scurt",
  prob: "Problemă cu rezolvare din manual",
  compose: "Redactare",
  src: "Item pe sursă",
  crit: "Criterii de redactare",
};
export const OPEN_KINDS = new Set(["open", "prob", "compose", "src", "crit"]); // nu se corectează automat; „src” se poate exersa și pe ecran, cu autoevaluare după barem

const EXACT = {
  d: "probleme de calcul, formule, definiții, grile",
  all: ["num", "prob", "blank", "mcq", "tf", "match", "open"],
  def: ["num", "blank", "mcq", "tf"],
};
const NAT = {
  d: "grile, adevărat/fals, completări, asocieri, definiții",
  all: ["mcq", "tf", "blank", "match", "num", "open", "prob"],
  def: ["mcq", "tf", "blank", "match"],
};
const HUM = {
  d: "grile, adevărat/fals, completări, asocieri, răspunsuri scurte",
  all: ["mcq", "tf", "blank", "match", "open"],
  def: ["mcq", "tf", "blank", "match"],
};
const SRC = {
  d: "grile, adevărat/fals, completări, asocieri, itemi pe sursă",
  all: ["mcq", "tf", "blank", "match", "src", "open"],
  def: ["mcq", "tf", "blank", "match", "src"],
}; // materii cu itemi pe sursă/text
const PRA = {
  d: "grile, adevărat/fals, completări, asocieri",
  all: ["mcq", "tf", "blank", "match", "open"],
  def: ["mcq", "tf", "blank", "match"],
};
export const PROFILE = {
  Matematica: EXACT,
  Fizica: EXACT,
  Chimia: EXACT,
  Informatica: EXACT,
  Biologie: NAT,
  Științe: NAT,
  Geografie: { ...NAT, all: [...NAT.all.filter(k => k !== "open"), "src", "open"], def: [...NAT.def, "src"] },
  "Educația ecologică": { ...NAT, all: [...NAT.all, "src"], def: [...NAT.def, "src"] },
  "Limba română": SRC,
  "Literatura universală": SRC,
  Istoria: SRC,
  "Educația pentru societate": SRC,
  "Dezvoltarea personală": SRC,
  "Limba engleză": SRC,
  "Limba franceză": SRC,
  "Arta comportamentală": HUM,
  "Educația muzicală": PRA,
  "Educația plastică": PRA,
  "Educația tehnologică": PRA,
  "Educație fizică": PRA,
};
export const profile = m => PROFILE[m] || HUM;

// rot = true: tipul preferat se schimbă de la un item la altul (mai multă varietate)
const it = (n, k, p, rot = false) =>
  Array.from({ length: n }, (_, i) => ({
    k: rot ? [...k.slice(i % k.length), ...k.slice(0, i % k.length)] : k,
    p: Array.isArray(p) ? p[i] : p,
  }));
const part = (t, d, items) => ({ t, d, it: items });
const OBJ = ["mcq", "tf", "match", "blank"],
  SHORT = ["blank", "open", "mcq"],
  CALC = ["num", "prob", "open"];

const EVAL = {
  id: "eval",
  nume: "Test de evaluare",
  minute: 45,
  parts: [
    part("Partea A — itemi cu alegere", "Alege răspunsul corect.", it(6, OBJ, 1, true)),
    part("Partea B — completări și răspunsuri scurte", "Scrie răspunsul în spațiul indicat.", it(4, SHORT, 2, true)),
    part("Partea C — itemi cu răspuns dezvoltat", "Scrie rezolvarea completă.", it(2, CALC, 3)),
  ],
};

// ---------- Examenul de absolvire a gimnaziului (clasa a IX-a). Se exersează și la clasele V–VIII, cu aceeași structură. ----------
const SRC1 = (p, g, o = {}) => ({ k: ["src"], p, g, ...o });
const CRIT = (p, h) => ({ k: ["crit"], p, h });
const OF = "ANCE · test pentru exersare, februarie 2026";

const GIM_MAT = {
  id: "gim",
  nume: "Ca la examenul de absolvire a gimnaziului",
  minute: 120,
  ofic: true,
  ref: "ANCE · programa de examen (2022)",
  parts: [
    part("Partea I — completează caseta", "Scrie răspunsul în casetă.", [
      { k: ["num", "blank", "mcq"], p: 3 },
      { k: ["num", "blank", "mcq"], p: 2 },
      { k: ["blank", "num", "mcq"], p: 2 },
    ]),
    part(
      "Partea a II-a — probleme cu rezolvare",
      "Scrie rezolvarea completă și răspunsul.",
      it(7, ["num", "prob", "open"], [5, 5, 4, 5, 5, 5, 4])
    ),
    part("Partea a III-a — argumentare", "Demonstrează, argumentează.", [
      { k: ["open", "prob", "num"], p: 6 },
      { k: ["prob", "num", "open"], p: 4 },
    ]),
  ],
};
// Limba română IX: un text, 13 itemi (3+2+5+5+6+4+3+2+5+2+4+4+5 = 50 p)
const T1 = (p, h) => SRC1(p, "t", { ns: 1, h });
const GIM_ROM = {
  id: "gim",
  nume: "Ca la examenul de absolvire a gimnaziului",
  minute: 120,
  ofic: true,
  ref: OF,
  parts: [
    part("Subiect unic — citește textul și realizează sarcinile", "Citește textul și realizează sarcinile.", [
      T1(3, "Răspunde, în enunțuri complete, la trei întrebări (a, b, c) despre conținutul textului."),
      T1(2, "Numește două elemente din literatura studiată, legate de text (personaje, titluri, autori)."),
      T1(5, "Rezumă, în limita a 60–65 de cuvinte, ultimele două alineate (sau un fragment indicat)."),
      T1(
        5,
        "Lexic: sinonim, sens figurat, sensul din text al unui cuvânt (cu cinci cerințe a–e; dacă lecția nu are articol de dicționar, folosește cuvinte din text)."
      ),
      T1(6, "Exprimă-ți opinia despre o idee din text, aducând trei argumente."),
      T1(4, "Explică, în două enunțuri, cum înțelegi o expresie din text."),
      T1(3, "Numește trei elemente dintr-o categorie amintită în text."),
      T1(2, "Gramatică: transcrie un enunț din text schimbând timpul verbelor."),
      T1(5, "Gramatică: scrie partea de vorbire a cinci cuvinte subliniate dintr-un enunț din text."),
      T1(2, "Ortografie/punctuație: formulează o regulă, ilustrând-o cu un exemplu din text."),
      T1(4, "Construiește un dialog din patru replici pe o temă legată de text."),
      T1(4, "Descrie un loc, un personaj sau un obiect din text, în câteva rânduri."),
      CRIT(
        5,
        "Pentru corectitudinea tuturor secvențelor scrise: ortografie 2 p., punctuație 2 p., exprimare și coerență 1 p."
      ),
    ]),
  ],
};
// Istoria IX: Subiectul I 12 p (4 surse, câte un item de 3 p) · II 23 p (material suport, 7 itemi) · III 15 p (text argumentativ pe surse)
const GIM_IST = {
  id: "gim",
  nume: "Ca la examenul de absolvire a gimnaziului",
  minute: 120,
  ofic: true,
  ref: OF,
  parts: [
    part(
      "Subiectul I (12 puncte)",
      "Studiază fiecare sursă în parte și realizează sarcina propusă.",
      [1, 2, 3, 4].map(n =>
        SRC1(3, "i" + n, {
          ns: 1,
          h: "Studiază sursa. Formulează/Determină/Apreciază … Argumentează răspunsul. (scară 0–3 p.)",
        })
      )
    ),
    part("Subiectul al II-lea (23 de puncte)", "Studiază materialul suport și realizează sarcinile propuse.", [
      SRC1(2, "ii", { ns: 4, h: "Utilizează sursa A: identifică două fapte/evenimente relevante." }),
      SRC1(1, "ii", { h: "Utilizează sursa B: identifică contextul istoric al unui fapt." }),
      SRC1(2, "ii", { h: "Explică un termen istoric din surse." }),
      SRC1(4, "ii", { h: "Formulează două caracteristici și explică răspunsul." }),
      SRC1(4, "ii", { h: "Descrie două consecințe." }),
      SRC1(5, "ii", { h: "Numește o personalitate din surse și formulează două argumente." }),
      SRC1(5, "ii", { h: "Exprimă-ți opinia (da/nu) și formulează două argumente." }),
    ]),
    part("Subiectul al III-lea (15 puncte)", "Studiază sursele A–D.", [
      SRC1(15, "iii", {
        ns: 4,
        h: "Utilizează sursele pentru a argumenta, într-un text coerent, o afirmație (cel puțin trei argumente). Baremul împarte cele 15 p. pe criterii: argumente, structură, relații cauză-efect, limbaj istoric.",
      }),
    ]),
  ],
};

// ---------- BAC (clasa a XII-a) ----------
const CRIT20 =
  "Pentru redactarea tuturor secvențelor scrise (20 p.): organizarea ideilor și limita de întindere 2 p.; aptitudini de analiză și interpretare critică 3 p.; corectitudinea stilistică 5 p.; norme ortografice și gramaticale 5 p.; norme de punctuație 5 p.";
const BAC_ROM_U = {
  id: "bac-u",
  nume: "Ca la BAC — profil umanist",
  minute: 180,
  ofic: true,
  ref: OF,
  parts: [
    part("Citește textul și realizează itemii (80 de puncte)", "Citește textul propus și realizează itemii.", [
      T1(3, "Lexic: prezintă trei sinonime ale unui cuvânt din text."),
      T1(
        4,
        "Lexic: ilustrează în câte un enunț propriu sensurile definite ale două cuvinte (definițiile se dau în item)."
      ),
      T1(3, "Explică sensul unui cuvânt/verb din text, susținând cu un exemplu din text."),
      T1(4, "Interpretează, în text coerent de 5–6 rânduri, o idee sau o stare exprimată într-un fragment indicat."),
      T1(6, "Comentează semnificația unei imagini/unui simbol/procedeu artistic dintr-un fragment."),
      T1(
        8,
        "Analizează un motiv literar din textul dat, în raport cu același motiv dintr-un alt text din literatura română."
      ),
      T1(4, "Argumentează, în două teze (raționament și exemplu), apartenența textului la un gen literar."),
      T1(
        6,
        "Meditează, în text coerent de 8–9 rânduri, asupra unei idei din text, prin raportare la propria experiență."
      ),
      T1(4, "Propune un alt titlu, argumentând opțiunea într-un enunț."),
      T1(
        7,
        "Numește un personaj din literatura română, model sau antimodel, susținând opinia prin două argumente și două referințe la textul ales."
      ),
      T1(
        7,
        "Text funcțional (anunț/invitație/scrisoare): redactează cu datele dintr-o legendă pe care o scrii tu (nume, clasa a XII-a, liceu, eveniment, dată, oră)."
      ),
      T1(
        24,
        "Eseu structurat de 1–1,5 pagini pornind de la o afirmație; reperele a–g cu punctajele (2,4,6,4,4,2,2 = 24 p.) apar în barem."
      ),
      CRIT(20, CRIT20),
    ]),
  ],
};
const BAC_ROM_R = {
  id: "bac-r",
  nume: "Ca la BAC — profil real",
  minute: 180,
  ofic: true,
  ref: OF,
  parts: [
    part(
      "Citește textul și realizează itemii (80 de puncte)",
      "Citește textul propus și scrie răspunsul la fiecare cerință.",
      [
        T1(4, "Lexic: câte un sinonim contextual pentru patru cuvinte evidențiate."),
        T1(5, "Selectează din text trei termeni dintr-un câmp lexical, argumentând relevanța lor contextuală."),
        T1(5, "Gramatică/morfologie: identifică într-un alineat substantive, verbe la gerunziu, adjective (a, b, c)."),
        T1(
          5,
          "Comentează, în 6–7 rânduri, sugestia contextuală a unei figuri de stil dintr-o secvență dată (rescrie și numește figura)."
        ),
        T1(
          8,
          "Analizează un motiv literar din text, în raport cu același motiv dintr-un alt text din literatura română."
        ),
        T1(4, "Propune un titlu sugestiv pentru fragment, cu explicația lui."),
        T1(
          10,
          "Schițează, în text coerent de 11–12 rânduri, portretul moral al unui personaj (tip uman, două trăsături cu exemple)."
        ),
        T1(9, "Text funcțional (invitație/anunț): redactează cu datele dintr-o legendă pe care o scrii tu."),
        T1(
          6,
          "Formulează două argumente, fiecare cu un exemplu, care demonstrează apartenența textului la un gen literar."
        ),
        T1(
          24,
          "Eseu argumentativ de 1–1,5 pagini în raport cu o afirmație; repere a–f (2,4,4,8,5,1 = 24 p.) în barem."
        ),
        CRIT(20, CRIT20),
      ]
    ),
  ],
};
const BAC_IST_U = {
  id: "bac",
  nume: "Ca la BAC — profil umanist",
  minute: 180,
  ofic: true,
  ref: OF + " (Subiectul III, cu hartă în original, e înlocuit aici cu surse scrise)",
  parts: [
    part("Subiectul I (24 de puncte)", "Studiază sursele și realizează sarcinile propuse.", [
      SRC1(3, "i", { ns: 2, h: "Explică, în baza surselor, un termen istoric." }),
      SRC1(2, "i", { h: "Determină, în baza sursei A, două fapte/invenții/idei." }),
      SRC1(5, "i", {
        h: "Dedu, în baza surselor și a cunoștințelor anterioare, principalele caracteristici ale unui proces.",
      }),
      SRC1(7, "i", { h: "Compară opiniile autorilor surselor. Argumentează cu trimitere la surse." }),
      SRC1(7, "i", { h: "Exprimă-ți argumentat opinia despre consecințele de durată ale procesului." }),
    ]),
    part("Subiectul al II-lea (22 de puncte)", "Studiază sursa și realizează sarcinile propuse.", [
      SRC1(2, "ii", { ns: 1, h: "Identifică în sursă două fapte/teritorii/personalități." }),
      SRC1(2, "ii", { h: "Determină în sursă o schimbare/o caracteristică." }),
      SRC1(5, "ii", { h: "Demonstrează, în baza sursei, un impact/o relație cauză-efect." }),
      SRC1(7, "ii", { h: "Explică valabilitatea unei afirmații din sursă; argumentează cu un fapt istoric." }),
      SRC1(6, "ii", { h: "Apreciază rolul unei personalități/al unui eveniment. Argumentează răspunsul." }),
    ]),
    part("Subiectul al III-lea (19 puncte)", "Studiază sursa/sursele și realizează sarcinile propuse.", [
      SRC1(5, "iii", {
        ns: 2,
        h: "Numește un fapt istoric pentru care sursa servește ca sursă de informare; argumentează cu trimitere la sursă.",
      }),
      SRC1(7, "iii", {
        h: "Determină contextul intern și extern al faptului istoric; argumentează cu trimitere la sursă și cunoștințe anterioare.",
      }),
      SRC1(7, "iii", {
        h: "Demonstrează, în baza sursei și a cunoștințelor anterioare, o idee (simbol, consecință, semnificație).",
      }),
    ]),
    part("Subiectul al IV-lea (35 de puncte)", "Studiază sursa și redactează un eseu.", [
      SRC1(35, "iv", {
        ns: 1,
        h: "Redactează, într-o pagină, un eseu pe o temă legată de sursă. Baremul (35 p.): argumente relevante, cel puțin trei — 10 p.; relații de cauză-efect, cel puțin două — 6 p.; integrarea critică a informațiilor din sursă — 4 p.; plasarea în timp și spațiu — 4 p.; o personalitate istorică — 2 p.; plan logic cu introducere, cuprins, concluzie — 7 p.; limbaj istoric — 2 p.",
      }),
    ]),
  ],
};
const BAC_MAT_R = {
  id: "bac",
  nume: "Ca la BAC — profil real",
  minute: 180,
  ofic: true,
  ref: OF,
  parts: [
    part(
      "Algebră (34 de puncte)",
      "Scrie rezolvarea și răspunsul.",
      [5, 5, 8, 8, 8].map(p => ({ k: ["num", "prob", "open"], p }))
    ),
    part(
      "Geometrie (21 de puncte)",
      "Scrie rezolvarea și răspunsul.",
      [5, 8, 8].map(p => ({ k: ["num", "prob", "open"], p }))
    ),
    part(
      "Analiză matematică (29 de puncte)",
      "Scrie rezolvarea și răspunsul.",
      [5, 8, 8, 8].map(p => ({ k: ["prob", "num", "open"], p }))
    ),
    part(
      "Combinatorică, binomul lui Newton, probabilități (16 puncte)",
      "Scrie rezolvarea și răspunsul.",
      [8, 8].map(p => ({ k: ["num", "prob", "open"], p }))
    ),
  ],
};

// Model orientativ pentru restul materiilor de BAC (ofic: false): se înlocuiește când există testul ANCE al materiei.
const BAC_SCI = {
  id: "bac",
  nume: "Ca la BAC (model orientativ)",
  minute: 180,
  ofic: false,
  parts: [
    part("Partea I — itemi obiectivi", "Alege răspunsul corect sau completează.", it(10, OBJ, 2, true)),
    part(
      "Partea a II-a — răspuns scurt și explicații",
      "Răspunde în scris.",
      it(5, ["blank", "open", "match"], 8, true)
    ),
    part("Partea a III-a — probleme / răspuns dezvoltat", "Scrie rezolvarea completă.", it(4, CALC, 10)),
  ],
};
const BAC_HUM = {
  id: "bac",
  nume: "Ca la BAC (model orientativ)",
  minute: 180,
  ofic: false,
  parts: [
    part(
      "Partea I — itemi obiectivi",
      "Alege răspunsul corect sau completează.",
      it(10, ["mcq", "tf", "match", "blank"], 2, true)
    ),
    part("Partea a II-a — răspuns scurt", "Răspunde pe scurt.", it(6, ["blank", "open", "mcq"], 5, true)),
    part("Partea a III-a — răspuns dezvoltat", "Răspunde argumentat.", it(3, ["open", "blank"], 10)),
    part("Partea a IV-a — redactare", "Redactează un text argumentativ.", [{ k: ["compose"], p: 20 }]),
  ],
};
const BAC_SRC = {
  id: "bac",
  nume: "Ca la BAC (model orientativ, cu surse)",
  minute: 180,
  ofic: false,
  parts: [
    part(
      "Partea I — itemi obiectivi",
      "Alege răspunsul corect sau completează.",
      it(10, ["mcq", "tf", "match", "blank"], 3, true)
    ),
    part("Partea a II-a — itemi pe sursă", "Studiază sursa și realizează sarcinile.", [
      SRC1(10, "a", { ns: 2 }),
      SRC1(10, "a"),
      SRC1(10, "a"),
    ]),
    part("Partea a III-a — text argumentativ pe surse", "Redactează un text argumentativ pe baza surselor.", [
      SRC1(40, "b", { ns: 2, h: "Text/eseu argumentativ pe baza surselor; baremul împarte punctajul pe criterii." }),
    ]),
  ],
};

// ---------- BAC: alte discipline (ANCE) ----------
const K = (ks, ps) => ps.map(p => ({ k: ks, p })),
  KS = arr => arr.map(([k, p]) => ({ k, p }));
const BAC_FIZ_R = {
  id: "bac",
  nume: "Ca la BAC — profil real",
  minute: 180,
  ofic: true,
  ref: OF,
  parts: [
    part(
      "I. Răspunsuri scurte (30 de puncte)",
      "Răspundeți scurt la întrebări conform cerințelor.",
      KS([
        [["blank"], 10],
        [["match", "blank"], 10],
        [["tf"], 10],
      ])
    ),
    part(
      "II. Întrebări și probleme (40 de puncte)",
      "Răspundeți sau rezolvați, scriind argumentările.",
      KS([
        [["open", "prob"], 4],
        [["num", "prob"], 6],
        [["num", "prob"], 5],
        [["num", "prob"], 7],
        [["num", "prob"], 9],
        [["num", "prob"], 9],
      ])
    ),
    part(
      "III. Situații de problemă (30 de puncte)",
      "Scrieți rezolvarea completă.",
      KS([
        [["prob", "num"], 11],
        [["prob", "num"], 11],
        [["open", "prob"], 8],
      ])
    ),
  ],
};
const BAC_CHI_R = {
  id: "bac",
  nume: "Ca la BAC — profil real",
  minute: 180,
  ofic: true,
  ref: OF,
  parts: [
    part(
      "Itemii 1–12 (100 de puncte)",
      "Efectuați operațiile solicitate.",
      KS([
        [["tf"], 5],
        [["blank", "match"], 9],
        [["prob", "open"], 7],
        [["tf"], 5],
        [["num", "prob"], 10],
        [["open", "blank"], 8],
        [["match"], 6],
        [["open", "blank"], 6],
        [["open"], 8],
        [["num", "prob"], 12],
        [["blank", "num"], 10],
        [["blank", "open"], 14],
      ])
    ),
  ],
};
const BAC_BIO_R = {
  id: "bac",
  nume: "Ca la BAC — profil real",
  minute: 180,
  ofic: true,
  ref: "ANCE · test pentru exersare, februarie 2024",
  parts: [
    part(
      "Diversitatea în lumea vie și particularitățile evolutive (25 p.)",
      "Completați, definiți, argumentați.",
      KS([
        [["blank", "match"], 6],
        [["blank", "open"], 6],
        [["match", "blank", "open"], 7],
        [["open"], 6],
      ])
    ),
    part(
      "Sisteme și procese vitale (42 p.)",
      "Completați, definiți, argumentați.",
      KS([
        [["blank", "open"], 4],
        [["blank", "open"], 11],
        [["blank", "match"], 9],
        [["blank"], 4],
        [["open", "blank"], 6],
        [["open", "blank"], 8],
      ])
    ),
    part(
      "Bazele geneticii și ameliorarea organismelor (24 p.)",
      "Completați, definiți, rezolvați.",
      KS([
        [["blank", "open"], 4],
        [["open", "blank", "match"], 9],
        [["num", "prob"], 11],
      ])
    ),
    part("Ecologia și protecția mediului (9 p.)", "Completați, explicați.", KS([[["blank", "open"], 9]])),
  ],
};
// Geografia: în original itemii folosesc atlasul și harta-contur; aici sunt înlocuiți cu itemi din textul lecției
const BAC_GEO = {
  id: "bac",
  nume: "Ca la BAC (în original, cu atlas și hărți)",
  minute: 180,
  ofic: true,
  ref: OF + " — itemii cu atlas/hartă din original se înlocuiesc cu itemi din lecție",
  parts: [
    part(
      "I. Cunoaștere și înțelegere (30 p.)",
      "Citiți, completați, asociați.",
      KS([
        [["tf"], 6],
        [["blank"], 6],
        [["match"], 7],
        [["open"], 5],
        [["match", "blank"], 6],
      ])
    ),
    part(
      "II. Aplicare și operare (40 p.)",
      "Identificați, calculați, caracterizați.",
      KS([
        [["num", "blank"], 6],
        [["open", "blank"], 8],
        [["open", "blank"], 8],
        [["num", "blank"], 8],
        [["blank", "open"], 10],
      ])
    ),
    part(
      "III. Integrare și transfer (30 p.)",
      "Argumentați, evaluați, propuneți.",
      KS([
        [["open"], 6],
        [["open"], 8],
        [["open"], 8],
        [["open"], 8],
      ])
    ),
  ],
};
const BAC_INF_R = {
  id: "bac",
  nume: "Ca la BAC — profil real",
  minute: 180,
  ofic: true,
  ref: "ANCE · test pentru exersare, februarie 2024",
  parts: [
    part(
      "Subiectul I (25 de puncte)",
      "Informație, codificare, circuite logice.",
      KS([
        [["num", "open"], 9],
        [["num", "blank"], 9],
        [["open", "blank"], 7],
      ])
    ),
    part(
      "Subiectul al II-lea (32 de puncte)",
      "Programare: tipuri, instrucțiuni, programe scurte.",
      KS([
        [["blank", "open"], 9],
        [["open", "blank"], 8],
        [["open", "prob"], 9],
        [["prob", "open"], 6],
      ])
    ),
    part(
      "Subiectul al III-lea (30 de puncte)",
      "Analiza și elaborarea programelor.",
      KS([
        [["blank", "open"], 7],
        [["prob", "open"], 16],
        [["prob", "open"], 7],
      ])
    ),
    part("Subiectul al IV-lea (13 puncte)", "Baze de date.", KS([[["open"], 13]])),
  ],
};
// Limba străină (engleză / franceză): lectură 30 p (7 sarcini pe un text) + eseu 40 p (180–200 cuvinte) + articol 30 p (100–110 cuvinte)
const LT = (p, h) => SRC1(p, "t", { ns: 1, h });
const BAC_LANG = {
  id: "bac",
  nume: "Ca la BAC",
  minute: 180,
  ofic: true,
  ref: OF,
  parts: [
    part("I. Reading comprehension / Compréhension écrite (30 p.)", "Citește textul și realizează sarcinile.", [
      LT(4, "Patru enunțuri cu 3 variante (a, b, c), de completat pe baza textului; răspuns corect = 1 p."),
      LT(2, "Două itemi de vocabular: sensul unui cuvânt din text (3 variante)."),
      LT(4, "Patru întrebări cu răspuns scurt, luat din text."),
      LT(4, "Asociere: patru începuturi de propoziții (1–4) cu cinci sfârșituri (a–e), unul în plus."),
      LT(6, "Trei enunțuri adevărat/fals; elevul justifică prin citat din text (2 p. fiecare)."),
      LT(8, "Patru idei principale (A–D) de ordonat în ordinea din text (2 p. fiecare)."),
      LT(2, "Ideea principală a textului (3 variante)."),
    ]),
    part("II. Written production — eseu / essay (40 p.)", "Scrie un text de 180–200 de cuvinte conform cerințelor.", [
      SRC1(40, "w", {
        ns: 0,
        h: "Eseu de 180–200 de cuvinte pe o temă legată de lecție, cu 4–5 cerințe numerotate (introducere și temă; trei avantaje/dezavantaje; două exemple cu detalii; opinie personală; două concluzii/sfaturi) și structura introducere–cuprins–concluzie. Baremul împarte cele 40 p. pe criterii: conținut, structură, vocabular, gramatică, ortografie și punctuație.",
      }),
    ]),
    part("III. Cultural domain / Domaine culture (30 p.)", "Scrie un text de 100–110 cuvinte conform cerințelor.", [
      SRC1(30, "c", {
        ns: 0,
        h: "Articol de 100–110 cuvinte pentru ziarul/revista școlii pe o temă culturală din lecție (o țară sau o personalitate), cu 4 cerințe (prezentare; trei fapte; două locuri/aspecte; recomandare/apreciere) și structura titlu–introducere–cuprins–concluzie. Baremul împarte cele 30 p. pe criterii: conținut cultural, structură, limbă, ortografie.",
      }),
    ]),
  ],
};

const BAC_OF = {
  Matematica: [BAC_MAT_R],
  Istoria: [BAC_IST_U],
  "Limba română": [BAC_ROM_U, BAC_ROM_R],
  Fizica: [BAC_FIZ_R, { ...BAC_SCI, id: "bac-u", nume: "Ca la BAC — profil umanist (model orientativ)" }],
  Chimia: [BAC_CHI_R, { ...BAC_SCI, id: "bac-u", nume: "Ca la BAC — profil umanist (model orientativ)" }],
  Biologie: [BAC_BIO_R, { ...BAC_SCI, id: "bac-u", nume: "Ca la BAC — profil umanist (model orientativ)" }],
  Informatica: [BAC_INF_R, { ...BAC_SCI, id: "bac-u", nume: "Ca la BAC — profil umanist (model orientativ)" }],
  Geografie: [BAC_GEO],
  "Limba engleză": [BAC_LANG],
  "Limba franceză": [BAC_LANG],
};
const GIM_OF = { Matematica: [GIM_MAT], "Limba română": [GIM_ROM], Istoria: [GIM_IST] };
const HIGH = ["X", "XI", "XII"],
  LOW = ["V", "VI", "VII", "VIII", "IX"];

// Modelele de test disponibile pentru materia și clasa aleasă. Primul = test de evaluare (liber, orice materie).
export function models(materie, clasa) {
  const l = [EVAL],
    ex = HIGH.includes(clasa) ? BAC_OF[materie] : LOW.includes(clasa) ? GIM_OF[materie] : null;
  if (ex) l.push(...ex);
  return l;
}
export const total = t => t.parts.reduce((a, p) => a + p.it.reduce((b, x) => b + x.p, 0), 0);
// itemii unui model care se pot face pe ecran (se corectează automat sau sunt „pe sursă”, cu autoevaluare după barem)
export const screenOk = m => m.parts.some(p => p.it.some(x => x.k.some(k => !OPEN_KINDS.has(k) || k === "src")));
