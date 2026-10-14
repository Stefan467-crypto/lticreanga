// Tipurile de exerciții pe materii și structurile testelor („ca la examen”).
// IMPORTANT: aici se modifică structura (numărul de itemi, punctajul, timpul). Conținutul îl dă mereu lecția din manual.
//
// Surse folosite pentru structură:
//  • Matematica, examenul de absolvire a gimnaziului: Programa ANCE 2022 — test de 120 min, 12 itemi, 50 puncte
//    (3 itemi cu completare de casete, 7 probleme cu rezolvare, 1 „arătați că”, 1 problemă finală).
//  • BAC (clasele X–XII): testele ANCE pentru exersare, 2026 — 180 min, itemi cu „Rezolvare” și „Răspuns”, punctaj pe item (5–10 p.).
//    La Limba română, numărul de itemi a fost redus în 2026 (profil real 12 → 10).
// Pentru celelalte materii structura este un model apropiat de cel oficial, ușor de ajustat mai jos.

export const KIND = {
  mcq: "Grilă", tf: "Adevărat / Fals", blank: "Completare", num: "Problemă (calcul)", match: "Asociere",
  open: "Răspuns scurt / definiție", prob: "Problemă cu rezolvare din manual", compose: "Redactare",
};
export const OPEN_KINDS = new Set(["open", "prob", "compose"]); // nu se corectează automat → doar „test pe hârtie”

const EXACT = { d: "probleme de calcul, formule, definiții, grile", all: ["num", "prob", "blank", "mcq", "tf", "match", "open"], def: ["num", "blank", "mcq", "tf"] };
const NAT = { d: "grile, adevărat/fals, completări, asocieri, definiții", all: ["mcq", "tf", "blank", "match", "num", "open", "prob"], def: ["mcq", "tf", "blank", "match"] };
const HUM = { d: "grile, adevărat/fals, completări, asocieri, răspunsuri scurte", all: ["mcq", "tf", "blank", "match", "open"], def: ["mcq", "tf", "blank", "match"] };
const PRA = { d: "grile, adevărat/fals, completări, asocieri", all: ["mcq", "tf", "blank", "match", "open"], def: ["mcq", "tf", "blank", "match"] };
export const PROFILE = {
  "Matematica": EXACT, "Fizica": EXACT, "Chimia": EXACT, "Informatica": EXACT,
  "Biologie": NAT, "Științe": NAT, "Geografie": NAT, "Educația ecologică": NAT,
  "Limba română": HUM, "Literatura universală": HUM, "Istoria": HUM, "Educația pentru societate": HUM, "Dezvoltarea personală": HUM,
  "Limba engleză": HUM, "Limba franceză": HUM, "Arta comportamentală": HUM,
  "Educația muzicală": PRA, "Educația plastică": PRA, "Educația tehnologică": PRA, "Educație fizică": PRA,
};
export const profile = m => PROFILE[m] || HUM;

// rot = true: tipul preferat se schimbă de la un item la altul (mai multă varietate)
const it = (n, k, p, rot = false) => Array.from({ length: n }, (_, i) => ({ k: rot ? [...k.slice(i % k.length), ...k.slice(0, i % k.length)] : k, p: Array.isArray(p) ? p[i] : p }));
const part = (t, d, items) => ({ t, d, it: items });
const OBJ = ["mcq", "tf", "match", "blank"], SHORT = ["blank", "open", "mcq"], CALC = ["num", "prob", "open"];

const EVAL = { id: "eval", nume: "Test de evaluare", minute: 45, parts: [
  part("Partea A — itemi cu alegere", "Alege răspunsul corect.", it(6, OBJ, 1, true)),
  part("Partea B — completări și răspunsuri scurte", "Scrie răspunsul în spațiul indicat.", it(4, SHORT, 2, true)),
  part("Partea C — itemi cu răspuns dezvoltat", "Scrie rezolvarea completă.", it(2, CALC, 3)),
] };

// Examenul de absolvire a gimnaziului (clasa a IX-a): se exersează și la clasele V–VIII, cu aceeași structură.
const GIM_MAT = { id: "gim", nume: "Ca la examenul de absolvire a gimnaziului", minute: 120, parts: [
  part("Partea I — completează caseta", "Scrie răspunsul în casetă.", [{ k: ["num", "blank", "mcq"], p: 3 }, { k: ["num", "blank", "mcq"], p: 2 }, { k: ["blank", "num", "mcq"], p: 2 }]),
  part("Partea a II-a — probleme cu rezolvare", "Scrie rezolvarea completă și răspunsul.", it(7, ["num", "prob", "open"], [5, 5, 4, 5, 5, 5, 4])),
  part("Partea a III-a — argumentare", "Demonstrează, argumentează.", [{ k: ["open", "prob", "num"], p: 6 }, { k: ["prob", "num", "open"], p: 4 }]),
] };
const GIM_ROM = { id: "gim", nume: "Ca la examenul de absolvire a gimnaziului", minute: 120, parts: [
  part("Partea I — itemi cu alegere și completare", "Alege sau completează.", it(8, ["mcq", "blank", "match", "tf"], 1, true)),
  part("Partea a II-a — răspunsuri scurte", "Răspunde pe scurt, cu propriile cuvinte.", it(4, ["open", "blank"], 3, true)),
  part("Partea a III-a — redactare", "Redactează un text coerent.", [{ k: ["compose"], p: 10 }]),
] };

// BAC (clasele X–XII)
const BAC_MAT = { id: "bac", nume: "Ca la BAC", minute: 180, parts: [
  part("Partea I — rezolvări scurte", "Scrie rezolvarea și răspunsul.", it(6, ["num", "blank", "mcq"], 5)),
  part("Partea a II-a — probleme", "Scrie rezolvarea completă.", it(5, ["num", "prob", "open"], 8)),
  part("Partea a III-a — probleme complexe, argumentare", "Argumentează fiecare pas.", it(3, ["prob", "num", "open"], 10)),
] };
const BAC_SCI = { id: "bac", nume: "Ca la BAC", minute: 180, parts: [
  part("Partea I — itemi obiectivi", "Alege răspunsul corect sau completează.", it(10, OBJ, 2, true)),
  part("Partea a II-a — răspuns scurt și explicații", "Răspunde în scris.", it(5, ["blank", "open", "match"], 8, true)),
  part("Partea a III-a — probleme / răspuns dezvoltat", "Scrie rezolvarea completă.", it(4, CALC, 10)),
] };
const BAC_HUM = { id: "bac", nume: "Ca la BAC", minute: 180, parts: [
  part("Partea I — itemi obiectivi", "Alege răspunsul corect sau completează.", it(10, ["mcq", "tf", "match", "blank"], 2, true)),
  part("Partea a II-a — răspuns scurt", "Răspunde pe scurt.", it(6, ["blank", "open", "mcq"], 5, true)),
  part("Partea a III-a — răspuns dezvoltat", "Răspunde argumentat.", it(3, ["open", "blank"], 10)),
  part("Partea a IV-a — redactare", "Redactează un text argumentativ.", [{ k: ["compose"], p: 20 }]),
] };

const BAC_OF = { "Matematica": BAC_MAT, "Fizica": BAC_SCI, "Chimia": BAC_SCI, "Informatica": BAC_SCI, "Biologie": BAC_SCI,
  "Limba română": BAC_HUM, "Istoria": BAC_HUM, "Geografie": BAC_HUM, "Limba engleză": BAC_HUM, "Limba franceză": BAC_HUM };
const GIM_OF = { "Matematica": GIM_MAT, "Limba română": GIM_ROM };
const HIGH = ["X", "XI", "XII"], LOW = ["V", "VI", "VII", "VIII", "IX"];

// Modelele de test disponibile pentru materia și clasa aleasă. Primul = test de evaluare (liber, orice materie).
export function models(materie, clasa) {
  const l = [EVAL], ex = HIGH.includes(clasa) ? BAC_OF[materie] : LOW.includes(clasa) ? GIM_OF[materie] : null;
  if (ex) l.push(ex);
  return l;
}
export const total = t => t.parts.reduce((a, p) => a + p.it.reduce((b, x) => b + x.p, 0), 0);
