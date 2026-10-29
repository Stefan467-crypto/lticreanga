// Bancă de probleme de calcul pe materii (șabloane cu numere diferite la fiecare test).
// Se activează singure după conținutul lecției: o lecție despre căldură primește probleme cu Q = c·m·Δt, una despre curent – cu legea lui Ohm etc.
// Sintaxa șablonului (aceeași ca la „@problema” din motor): „Enunț cu {a:min-max:pas} … => expresie | unitate ~ formula”.
// Constantele (g = 10 N/kg, c apei = 4200 J/(kg·°C) etc.) sunt scrise în enunț, ca elevul să le aibă la îndemână.
import { nz } from "./engine.js?v=29";

// [materii, cuvinte-cheie (pe text normalizat, fără diacritice), de câte ori trebuie să apară în lecție, șablonul]
const B = [
  /* ================= FIZICĂ ================= */
  [
    "F",
    "miscare uniforma|miscarea uniforma|miscare rectilinie|viteza medie|viteza corpului|viteza unui",
    2,
    "Un automobil se deplasează uniform și parcurge distanța de {d:120-600:60} km în {t:2-6} h. Care este viteza lui? => d/t | km/h ~ v = d/t",
  ],
  [
    "F",
    "miscare uniforma|miscarea uniforma|miscare rectilinie|viteza medie|viteza corpului|viteza unui",
    2,
    "Un biciclist se mișcă uniform cu viteza de {v:4-12} m/s timp de {t:10-60:10} s. Ce distanță parcurge? => v*t | m ~ d = v·t",
  ],
  [
    "F",
    "miscare uniforma|miscarea uniforma|miscare rectilinie|viteza medie|viteza corpului|viteza unui",
    2,
    "Un tren merge uniform cu viteza de {v:54-108:18} km/h. În cât timp parcurge {d:90-360:90} km? => d/v | h ~ t = d/v",
  ],
  [
    "F",
    "viteza medie|miscare uniforma|miscarea uniforma",
    3,
    "Un autobuz parcurge {d1:20-60:10} km în {t1:1-2} h, apoi {d2:30-90:10} km în {t2:1-3} h. Care este viteza medie pe tot traseul? => (d1+d2)/(t1+t2) | km/h ~ v_m = d_total / t_total",
  ],
  [
    "F",
    "miscare uniforma|miscarea uniforma|viteza corpului|viteza unui",
    3,
    "Un atlet aleargă {d:100-400:100} m în {t:10-50:10} s. Exprimă viteza lui în km/h. => d/t*3.6 | km/h ~ v = d/t; 1 m/s = 3,6 km/h",
  ],
  [
    "F",
    "acceleratie|uniform accelerat|uniform variat",
    2,
    "Un corp pornește din repaus și atinge viteza de {v:10-40:5} m/s în {t:2-10:2} s. Care este accelerația lui? => v/t | m/s² ~ a = Δv/Δt",
  ],
  [
    "F",
    "acceleratie|uniform accelerat|uniform variat",
    2,
    "Un mobil cu accelerația de {a:2-6} m/s² pornește din repaus. Ce viteză are după {t:3-10} s? => a*t | m/s ~ v = a·t",
  ],
  [
    "F",
    "acceleratie|uniform accelerat|uniform variat",
    2,
    "Un mobil pornește din repaus cu accelerația de {a:2-6} m/s². Ce distanță parcurge în {t:2-10:2} s? => a*t^2/2 | m ~ d = a·t²/2",
  ],
  [
    "F",
    "densitate",
    2,
    "Un corp are masa de {m:100-500:100} g și volumul de {V:50-100:50} cm³. Calculează densitatea lui. => m/V | g/cm³ ~ ρ = m/V",
  ],
  [
    "F",
    "densitate",
    2,
    "Un bloc de aluminiu (ρ = 2700 kg/m³) are volumul de {V:2-10} m³. Care este masa blocului? => 2700*V | kg ~ m = ρ·V",
  ],
  [
    "F",
    "densitate",
    2,
    "Un vas cu volumul de {V:2-10} L este umplut cu apă (ρ = 1000 kg/m³; 1 L = 0,001 m³). Care este masa apei? => 1000*V*0.001 | kg ~ m = ρ·V",
  ],
  [
    "F",
    "greutate|forta de greutate|forta gravitationala",
    2,
    "Un corp are masa de {m:2-20:2} kg. Care este greutatea lui? (g = 10 N/kg) => m*10 | N ~ G = m·g",
  ],
  [
    "F",
    "greutate|forta de greutate|forta gravitationala",
    2,
    "Greutatea unui corp este de {G:50-500:50} N. Care este masa lui? (g = 10 N/kg) => G/10 | kg ~ m = G/g",
  ],
  [
    "F",
    "elastic|hooke|resort|alungire",
    2,
    "Un resort cu constanta elastică k = {k:100-500:100} N/m este alungit cu {x:2-10:2} cm. Care este forța elastică? => k*x/100 | N ~ F = k·Δl",
  ],
  [
    "F",
    "elastic|hooke|resort|alungire",
    2,
    "Sub acțiunea unei forțe de {F:10-50:10} N un resort se alungește cu {x:2-10:2} cm. Care este constanta elastică a resortului? => F/(x/100) | N/m ~ k = F/Δl",
  ],
  [
    "F",
    "presiune",
    2,
    "O forță de {F:100-900:100} N acționează perpendicular pe o suprafață de {S:2-10:2} m². Care este presiunea exercitată? => F/S | Pa ~ p = F/S",
  ],
  [
    "F",
    "presiune hidrostatica|presiunea hidrostatica|adancime|lichide",
    2,
    "Care este presiunea hidrostatică a apei (ρ = 1000 kg/m³, g = 10 N/kg) la adâncimea de {h:2-20:2} m? => 1000*10*h | Pa ~ p = ρ·g·h",
  ],
  [
    "F",
    "arhimede|forta arhimedica|plutirea corpurilor",
    2,
    "Un corp cu volumul de {V:2-10:2} dm³ este scufundat complet în apă (ρ = 1000 kg/m³, g = 10 N/kg; 1 dm³ = 0,001 m³). Care este forța arhimedică? => 1000*10*V*0.001 | N ~ F_A = ρ·g·V",
  ],
  [
    "F",
    "lucru mecanic",
    2,
    "O forță de {F:20-100:20} N deplasează un corp pe distanța de {d:2-10:2} m, în direcția forței. Care este lucrul mecanic efectuat? => F*d | J ~ L = F·d",
  ],
  [
    "F",
    "puterea mecanica|putere mecanica|puterea medie|unitatea de putere",
    3,
    "Un motor efectuează lucrul mecanic de {L:600-3000:600} J în {t:10-60:10} s. Care este puterea lui? => L/t | W ~ P = L/t",
  ],
  [
    "F",
    "energie cinetica|energia cinetica",
    2,
    "Un corp cu masa de {m:2-10:2} kg se mișcă cu viteza de {v:2-10:2} m/s. Care este energia lui cinetică? => m*v^2/2 | J ~ E_c = m·v²/2",
  ],
  [
    "F",
    "energie potentiala|energia potentiala|inaltime",
    2,
    "Un corp cu masa de {m:1-10} kg se află la înălțimea de {h:2-20:2} m față de sol. Care este energia lui potențială gravitațională? (g = 10 N/kg) => m*10*h | J ~ E_p = m·g·h",
  ],
  [
    "F",
    "randament",
    2,
    "Un motor primește energia de {Q:1000-5000:1000} J și efectuează lucrul mecanic util de {L:400-800:100} J. Care este randamentul lui? => L/Q*100 | % ~ η = L_util / Q · 100",
  ],
  [
    "F",
    "parghi|brat|moment",
    2,
    "Pe o pârghie în echilibru, forța F₁ = {F1:20-100:20} N acționează la brațul d₁ = {d1:2-10:2} dm, iar forța F₂ acționează la brațul d₂ = {d2:4-20:4} dm. Care este valoarea forței F₂? => F1*d1/d2 | N ~ F₁·d₁ = F₂·d₂",
  ],
  [
    "F",
    "oscilat|pendul|perioada oscilatiilor|frecventa oscilatiilor",
    2,
    "Un pendul efectuează {N:20-60:10} oscilații complete în {t:10-60:10} s. Care este perioada oscilațiilor? => t/N | s ~ T = t/N",
  ],
  [
    "F",
    "oscilat|pendul|perioada oscilatiilor|frecventa oscilatiilor",
    2,
    "Un pendul efectuează {N:20-60:10} oscilații complete în {t:10-60:10} s. Care este frecvența oscilațiilor? => N/t | Hz ~ ν = N/t",
  ],
  [
    "F",
    "oscilat|pendul|perioada oscilatiilor|frecventa oscilatiilor",
    2,
    "Perioada unui oscilator este de {T:0.2-2:0.2} s. Care este frecvența lui? => 1/T | Hz ~ ν = 1/T",
  ],
  [
    "F",
    "pendul gravitational|pendulul gravitational|pendul",
    3,
    "Care este perioada unui pendul gravitațional cu lungimea de {l:1-4} m? (g = 10 m/s²) => 2*pi*sqrt(l/10) | s ~ T = 2π√(l/g)",
  ],
  [
    "F",
    "lungime de unda|lungimea de unda|unde mecanice|unda mecanica|unde sonore|ondulator|propagarea undelor",
    2,
    "O undă are frecvența de {nu:2-20:2} Hz și lungimea de undă de {la:2-10:2} m. Care este viteza ei de propagare? => nu*la | m/s ~ v = λ·ν",
  ],
  [
    "F",
    "lungime de unda|lungimea de unda|unde mecanice|unda mecanica|unde sonore|ondulator|propagarea undelor",
    2,
    "O undă se propagă cu viteza de {v:100-400:100} m/s și are perioada de {T:0.1-0.5:0.1} s. Care este lungimea ei de undă? => v*T | m ~ λ = v·T",
  ],
  [
    "F",
    "sunet|ecou",
    2,
    "Un ecou revine după {t:2-10:2} s de la emiterea sunetului. Viteza sunetului în aer este de 340 m/s. La ce distanță se află obstacolul? => 340*t/2 | m ~ d = v·t/2",
  ],
  [
    "F",
    "caldura specifica|cantitatea de caldura|capacitate termica|calorimetr",
    2,
    "Câtă căldură este necesară pentru a încălzi {m:1-5} kg de apă de la {t1:10-30:5} °C la {t2:50-90:10} °C? (c = 4200 J/(kg·°C)) => 4200*m*(t2-t1)/1000 | kJ ~ Q = c·m·Δt",
  ],
  [
    "F",
    "caldura specifica|cantitatea de caldura|capacitate termica|calorimetr",
    2,
    "Un corp din cupru (c = 380 J/(kg·°C)) cu masa de {m:1-5} kg se răcește cu {dt:10-50:10} °C. Ce cantitate de căldură cedează? => 380*m*dt | J ~ Q = c·m·Δt",
  ],
  [
    "F",
    "caldura specifica|cantitatea de caldura|capacitate termica|calorimetr",
    2,
    "Unui corp cu masa de {m:0.5-2.5:0.5} kg i se transmit {Q:4000-20000:4000} J, iar temperatura lui crește cu {dt:10-40:10} °C. Care este căldura specifică a substanței? => Q/(m*dt) | J/(kg·°C) ~ c = Q/(m·Δt)",
  ],
  [
    "F",
    "capacitate termica|capacitatea termica",
    2,
    "Un corp cu masa de {m:2-10:2} kg este făcut dintr-o substanță cu căldura specifică c = {c:400-900:100} J/(kg·°C). Care este capacitatea termică a corpului? => c*m | J/°C ~ C = c·m",
  ],
  [
    "F",
    "calorimetr|ecuatia calorimetrica|amestec",
    2,
    "Se amestecă {m1:1-4} kg de apă la {t1:60-90:10} °C cu {m2:1-4} kg de apă la {t2:10-30:10} °C. Care este temperatura finală a amestecului (pierderi de căldură neglijabile)? => (m1*t1+m2*t2)/(m1+m2) | °C ~ θ = (m₁t₁ + m₂t₂)/(m₁ + m₂)",
  ],
  [
    "F",
    "topire|solidificare|latent",
    2,
    "Câtă căldură este necesară pentru topirea a {m:1-5} kg de gheață aflată la 0 °C? (λ = 332 kJ/kg) => 332*m | kJ ~ Q = λ·m",
  ],
  [
    "F",
    "vaporizare|condensare|fierbere|latent",
    2,
    "Câtă căldură este necesară pentru vaporizarea a {m:0.5-2.5:0.5} kg de apă aflată la 100 °C? (λ = 2260 kJ/kg) => 2260*m | kJ ~ Q = λ·m",
  ],
  [
    "F",
    "combustibil|putere calorica|ardere",
    2,
    "Prin arderea completă a {m:2-10:2} kg de cărbune (q = 30 MJ/kg) se degajă o căldură de: => 30*m | MJ ~ Q = q·m",
  ],
  [
    "F",
    "motor termic|randamentul motorului|motoare termice",
    2,
    "Un motor termic primește căldura Q₁ = {Q1:1000-5000:1000} J și cedează sursei reci Q₂ = {Q2:400-900:100} J. Care este randamentul lui? => (Q1-Q2)/Q1*100 | % ~ η = (Q₁ − Q₂)/Q₁ · 100",
  ],
  [
    "F",
    "intensitatea curentului|sarcina electrica|curent electric",
    2,
    "Prin secțiunea unui conductor trece sarcina electrică de {q:10-60:10} C în {t:2-10:2} s. Care este intensitatea curentului? => q/t | A ~ I = q/t",
  ],
  [
    "F",
    "intensitatea curentului|sarcina electrica|curent electric",
    3,
    "Un curent de {I:2-10:2} A circulă printr-un conductor timp de {t:5-30:5} s. Ce sarcină electrică trece prin conductor? => I*t | C ~ q = I·t",
  ],
  [
    "F",
    "ohm|rezistenta electrica|tensiune electrica",
    2,
    "Un rezistor cu rezistența de {R:10-100:10} Ω este parcurs de un curent de {I:1-5} A. Care este tensiunea la capetele lui? => R*I | V ~ U = I·R",
  ],
  [
    "F",
    "ohm|rezistenta electrica|tensiune electrica",
    2,
    "La capetele unui rezistor cu rezistența de {R:4-24:4} Ω se aplică tensiunea de {U:12-120:12} V. Care este intensitatea curentului? => U/R | A ~ I = U/R",
  ],
  [
    "F",
    "ohm|rezistenta electrica|tensiune electrica",
    2,
    "Printr-un consumator trece un curent de {I:2-6} A când la bornele lui tensiunea este de {U:12-120:12} V. Care este rezistența lui? => U/I | Ω ~ R = U/I",
  ],
  [
    "F",
    "rezistivitate|rezistenta conductorului",
    2,
    "Un fir de cupru (ρ = 0,017 Ω·mm²/m) are lungimea de {l:100-500:100} m și secțiunea de {S:1-5} mm². Care este rezistența firului? => 0.017*l/S | Ω ~ R = ρ·l/S",
  ],
  [
    "F",
    "legate in serie|gruparea in serie|grupare|rezistoare",
    3,
    "Două rezistoare, R₁ = {R1:10-50:10} Ω și R₂ = {R2:10-50:10} Ω, sunt legate în serie. Care este rezistența echivalentă? => R1+R2 | Ω ~ R_s = R₁ + R₂",
  ],
  [
    "F",
    "in paralel|gruparea in paralel|grupare|rezistoare",
    3,
    "Două rezistoare, R₁ = {R1:10-50:10} Ω și R₂ = {R2:10-50:10} Ω, sunt legate în paralel. Care este rezistența echivalentă? => R1*R2/(R1+R2) | Ω ~ R_p = R₁R₂/(R₁ + R₂)",
  ],
  [
    "F",
    "puterea curentului|putere electrica|puterea electrica|lucrul curentului|joule",
    2,
    "Un consumator funcționează la tensiunea de {U:110-220:110} V și este parcurs de un curent de {I:1-5} A. Care este puterea lui? => U*I | W ~ P = U·I",
  ],
  [
    "F",
    "energia electrica|puterea curentului|lucrul curentului|kwh|bec",
    2,
    "Un bec cu puterea de {P:40-100:20} W funcționează {t:2-10:2} h. Ce energie electrică consumă? => P*t/1000 | kWh ~ W = P·t",
  ],
  [
    "F",
    "joule|efectul termic|caldura degajata",
    2,
    "Un rezistor de {R:10-50:10} Ω este parcurs de un curent de {I:1-5} A timp de {t:10-60:10} s. Ce căldură se degajă? => I^2*R*t | J ~ Q = I²·R·t",
  ],
  [
    "F",
    "lentil|distanta focala|convergenta",
    2,
    "O lentilă convergentă are distanța focală de {f:10-50:10} cm. Care este convergența ei? => 100/f | dioptrii ~ C = 1/f (f în metri)",
  ],
  [
    "F",
    "lentil|formula lentilei|imagine",
    3,
    "O lentilă convergentă cu distanța focală de {f:10-20:10} cm formează imaginea unui obiect aflat la {d:30-60:30} cm de lentilă. La ce distanță de lentilă se formează imaginea? => d*f/(d-f) | cm ~ 1/f = 1/d + 1/d'",
  ],
  [
    "F",
    "indice de refractie|refractie",
    2,
    "Viteza luminii în vid este de 300000 km/s, iar în sticlă este de {v:150000-250000:50000} km/s. Care este indicele de refracție al sticlei? => 300000/v | fără unitate ~ n = c/v",
  ],
  [
    "F",
    "gaz ideal|gazului ideal|ecuatia de stare|ecuatia termica",
    2,
    "{nu:1-5} mol de gaz ideal se află la temperatura de {T:300-600:100} K într-un vas cu volumul de {V:1-5} m³. Care este presiunea gazului? (R = 8,31 J/(mol·K)) => nu*8.31*T/V/1000 | kPa ~ p·V = ν·R·T",
  ],
  [
    "F",
    "izoterm|transformare izoterma|legea boyle",
    2,
    "Un gaz ideal aflat la presiunea de {p1:100-400:100} kPa ocupă volumul de {V1:2-6:2} L. Care este presiunea după o comprimare izotermă până la volumul de {V2:1-2} L? => p1*V1/V2 | kPa ~ p₁V₁ = p₂V₂",
  ],
  [
    "F",
    "energia interna|principiul intai|principiul i|termodinamic",
    2,
    "Un gaz primește căldura Q = {Q:200-800:200} J și efectuează lucrul mecanic L = {L:50-150:50} J. Cu cât variază energia lui internă? => Q-L | J ~ ΔU = Q − L",
  ],
  [
    "F",
    "impuls|ciocnire",
    2,
    "Un corp cu masa de {m:2-10:2} kg se mișcă cu viteza de {v:3-12:3} m/s. Care este impulsul lui? => m*v | kg·m/s ~ p = m·v",
  ],
  [
    "F",
    "miscare circulara|miscarea circulara|perioada de rotatie|viteza unghiulara",
    2,
    "Un punct se mișcă uniform pe un cerc cu raza de {R:1-5} m, cu perioada de {T:2-10:2} s. Care este viteza lui liniară? => 2*pi*R/T | m/s ~ v = 2πR/T",
  ],
  [
    "F",
    "radioactiv|timp de njumatatire|dezintegr",
    2,
    "Dintr-o probă cu {N0:800-3200:800} nuclee radioactive, după un număr n = {n:1-4} de timpi de înjumătățire rămân nedezintegrate: => N0/2^n | nuclee ~ N = N₀ / 2ⁿ",
  ],
  [
    "F",
    "forta electromagnetica|forta amper|inductie magnetica|camp magnetic",
    2,
    "Un conductor lung de {l:0.2-1:0.2} m, parcurs de curentul de {I:2-10:2} A, se află perpendicular pe un câmp magnetic cu inducția de {B:0.1-0.5:0.1} T. Care este forța electromagnetică? => B*I*l | N ~ F = B·I·l",
  ],
  [
    "F",
    "transformator",
    2,
    "Primarul unui transformator are {N1:100-500:100} spire, iar secundarul {N2:50-250:50} spire. Tensiunea la primar este de 220 V. Care este tensiunea la secundar? => 220*N2/N1 | V ~ U₂/U₁ = N₂/N₁",
  ],
  [
    "F",
    "condensator|capacitate electrica",
    2,
    "Un condensator cu capacitatea de {C:10-100:10} µF este încărcat la tensiunea de {U:10-50:10} V. Ce energie înmagazinează? => C*U^2/2/1000 | mJ ~ W = C·U²/2",
  ],
  [
    "F",
    "circuit intreg|tensiune electromotoare|t.e.m|rezistenta interna",
    2,
    "O sursă cu t.e.m. E = {E:12-24:12} V și rezistența internă r = {r:1-2} Ω alimentează un rezistor de {R:4-10:2} Ω. Care este intensitatea curentului din circuit? => E/(R+r) | A ~ I = E/(R + r)",
  ],
  [
    "F",
    "curent alternativ|reactanta|inductiva",
    2,
    "O bobină cu inductanța de {L:0.1-0.5:0.1} H este conectată la un circuit de curent alternativ cu frecvența de 50 Hz. Care este reactanța ei inductivă? => 2*pi*50*L | Ω ~ X_L = 2π·ν·L",
  ],

  [
    "F",
    "foton|efectul fotoelectric|fotoelectric",
    2,
    "Care este energia unui foton cu frecvența de {nu:4-9}·10¹⁴ Hz? (h = 4,14·10⁻¹⁵ eV·s) => 0.414*nu | eV ~ E = h·ν",
  ],
  [
    "F",
    "foton|efectul fotoelectric|fotoelectric",
    2,
    "Care este energia unui foton cu lungimea de undă de {l:400-700:100} nm? (h·c = 1240 eV·nm) => 1240/l | eV ~ E = h·c / λ",
  ],
  [
    "F",
    "efectul fotoelectric|fotoelectric|lucru de extractie|lucrul de extractie",
    2,
    "Un foton cu energia de {E:5-8} eV extrage electroni dintr-un metal cu lucrul de extracție de {L:2-4} eV. Care este energia cinetică maximă a fotoelectronilor? => E-L | eV ~ E_c,max = h·ν − L_ext",
  ],
  [
    "F",
    "defect de masa|energia de legatura|nucleul atomic|nuclee",
    2,
    "Defectul de masă al unui nucleu este Δm = {dm:0.01-0.05:0.01} u. Care este energia lui de legătură? (1 u = 931,5 MeV) => dm*931.5 | MeV ~ E_l = Δm·c²",
  ],
  [
    "F",
    "numar de masa|numarul de masa|numar atomic|protoni|neutroni",
    2,
    "Un nucleu are numărul de masă A = {A:20-60:10} și numărul atomic Z = {Z:8-20:4}. Câți neutroni conține? => A-Z | neutroni ~ N = A − Z",
  ],

  /* ================= CHIMIE ================= */
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a apei, H₂O (A_H = 1, A_O = 16). => 2*1+16 | fără unitate ~ M = 2·A_H + A_O",
  ],
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a dioxidului de carbon, CO₂ (A_C = 12, A_O = 16). => 12+2*16 | fără unitate ~ M = A_C + 2·A_O",
  ],
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a acidului sulfuric, H₂SO₄ (A_H = 1, A_S = 32, A_O = 16). => 2*1+32+4*16 | fără unitate ~ M = 2·A_H + A_S + 4·A_O",
  ],
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a carbonatului de calciu, CaCO₃ (A_Ca = 40, A_C = 12, A_O = 16). => 40+12+3*16 | fără unitate ~ M = A_Ca + A_C + 3·A_O",
  ],
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a hidroxidului de calciu, Ca(OH)₂ (A_Ca = 40, A_O = 16, A_H = 1). => 40+2*(16+1) | fără unitate ~ M = A_Ca + 2·(A_O + A_H)",
  ],
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a sulfatului de aluminiu, Al₂(SO₄)₃ (A_Al = 27, A_S = 32, A_O = 16). => 2*27+3*(32+4*16) | fără unitate ~ M = 2·A_Al + 3·(A_S + 4·A_O)",
  ],
  [
    "C",
    "masa moleculara|masa molara|masa atomica",
    1,
    "Calculează masa moleculară relativă a glucozei, C₆H₁₂O₆ (A_C = 12, A_H = 1, A_O = 16). => 6*12+12*1+6*16 | fără unitate ~ M = 6·A_C + 12·A_H + 6·A_O",
  ],
  [
    "C",
    "(?<![a-z])mol(?![a-z])|moli|masa molara|cantitatea de substanta",
    2,
    "Câți moli de apă (M = 18 g/mol) se găsesc în {m:18-180:18} g de apă? => m/18 | mol ~ n = m/M",
  ],
  [
    "C",
    "(?<![a-z])mol(?![a-z])|moli|masa molara|cantitatea de substanta",
    2,
    "Ce masă au {n:0.5-5:0.5} mol de dioxid de carbon, CO₂ (M = 44 g/mol)? => n*44 | g ~ m = n·M",
  ],
  [
    "C",
    "volum molar|conditii normale|gaz",
    2,
    "Ce volum ocupă {n:0.5-5:0.5} mol de gaz în condiții normale? (V_m = 22,4 L/mol) => n*22.4 | L ~ V = n·V_m",
  ],
  [
    "C",
    "volum molar|conditii normale|gaz",
    2,
    "Câți moli de gaz se află în {V:11.2-112:11.2} L de gaz, măsurați în condiții normale? (V_m = 22,4 L/mol) => V/22.4 | mol ~ n = V/V_m",
  ],
  [
    "C",
    "concentratia procentuala|concentratie procentuala|solutie|dizolv",
    2,
    "Se dizolvă {md:10-50:10} g de sare în {mw:40-190:30} g de apă. Care este concentrația procentuală a soluției obținute? => md/(md+mw)*100 | % ~ c = m_d / m_s · 100",
  ],
  [
    "C",
    "concentratia procentuala|concentratie procentuala|solutie",
    2,
    "Ce masă de substanță dizolvată se află în {ms:100-500:100} g de soluție cu concentrația de {c:5-25:5} %? => ms*c/100 | g ~ m_d = c·m_s / 100",
  ],
  [
    "C",
    "dilu|concentratia procentuala|solutie",
    3,
    "La {ms:100-300:100} g de soluție cu concentrația de 20 % se adaugă {mw:100-300:100} g de apă. Care este concentrația soluției obținute? => ms*20/100/(ms+mw)*100 | % ~ c = m_d / (m_s + m_apă) · 100",
  ],
  [
    "C",
    "concentratia molara|molar|solutie",
    2,
    "Câte grame de NaOH (M = 40 g/mol) sunt necesare pentru a prepara {V:0.5-2:0.5} L de soluție cu concentrația molară de {c:0.1-1:0.1} mol/L? => c*V*40 | g ~ m = c_M · V · M",
  ],
  [
    "C",
    "concentratia molara|molar|solutie",
    2,
    "O soluție cu volumul de {V:0.5-2:0.5} L conține {n:1-4} mol de substanță dizolvată. Care este concentrația ei molară? => n/V | mol/L ~ c_M = n / V",
  ],
  [
    "C",
    "(?<![a-z])ph(?![a-z])|aciditate|scara ph",
    3,
    "Care este pH-ul unei soluții în care concentrația ionilor H⁺ este de 10^(−{n:1-6}) mol/L? => n | fără unitate ~ pH = −lg[H⁺]",
  ],
  [
    "C",
    "compozitia procentuala|fractia de masa|parte de masa",
    1,
    "Calculează fracția de masă a oxigenului în apă, H₂O (A_O = 16, M = 18 g/mol). => 16/18*100 | % ~ ω(O) = A_O · n / M · 100",
  ],
  [
    "C",
    "compozitia procentuala|fractia de masa|parte de masa",
    1,
    "Calculează fracția de masă a calciului în carbonatul de calciu, CaCO₃ (A_Ca = 40, M = 100 g/mol). => 40/100*100 | % ~ ω(Ca) = A_Ca / M · 100",
  ],
  [
    "C",
    "compozitia procentuala|fractia de masa|parte de masa",
    1,
    "Calculează fracția de masă a fierului în oxidul de fier(III), Fe₂O₃ (A_Fe = 56, M = 160 g/mol). => 2*56/160*100 | % ~ ω(Fe) = 2·A_Fe / M · 100",
  ],
  [
    "C",
    "ecuatia reactiei|stoechiometr|calcule chimice|ecuatii chimice",
    2,
    "Câte grame de apă se formează din {m:4-40:4} g de hidrogen, conform ecuației 2H₂ + O₂ → 2H₂O? (M(H₂) = 2 g/mol, M(H₂O) = 18 g/mol) => m/(2*2)*(2*18) | g ~ m(H₂O) = m(H₂)/(2·M(H₂)) · 2·M(H₂O)",
  ],
  [
    "C",
    "stoechiometr|calcule chimice|descompunerea|carbonat",
    2,
    "Câte grame de oxid de calciu se obțin prin descompunerea a {m:100-500:100} g de CaCO₃, conform CaCO₃ → CaO + CO₂? (M(CaCO₃) = 100 g/mol, M(CaO) = 56 g/mol) => m/100*56 | g ~ m(CaO) = m(CaCO₃)/M(CaCO₃) · M(CaO)",
  ],
  [
    "C",
    "stoechiometr|calcule chimice|descompunerea|carbonat",
    2,
    "Ce volum de CO₂, măsurat în condiții normale, se degajă la descompunerea a {m:100-500:100} g de CaCO₃? (M(CaCO₃) = 100 g/mol, V_m = 22,4 L/mol) => m/100*22.4 | L ~ V = n · V_m",
  ],
  [
    "C",
    "stoechiometr|calcule chimice|acid clorhidric|metale active",
    2,
    "Ce volum de hidrogen, în condiții normale, se degajă din {m:12-60:12} g de magneziu, conform Mg + 2HCl → MgCl₂ + H₂? (A_Mg = 24, V_m = 22,4 L/mol) => m/24*22.4 | L ~ V(H₂) = m/M(Mg) · V_m",
  ],
  [
    "C",
    "randament",
    2,
    "Din calcul s-ar fi obținut teoretic {mt:100-500:100} g de produs, dar practic s-au obținut {mp:50-90:10} g. Care este randamentul reacției? => mp/mt*100 | % ~ η = m_practic / m_teoretic · 100",
  ],
  [
    "C",
    "ardere|metan|alcan|hidrocarb",
    2,
    "Ce volum de CO₂ (condiții normale) se formează la arderea completă a {n:1-5} mol de metan, CH₄ + 2O₂ → CO₂ + 2H₂O? (V_m = 22,4 L/mol) => n*22.4 | L ~ V(CO₂) = n(CH₄) · V_m",
  ],

  /* ================= MATEMATICĂ ================= */
  [
    "M",
    "procent|procente",
    2,
    "Un produs costă {p:100-900:100} lei și se scumpește cu {c:5-30:5} %. Care este noul preț? => p*(1+c/100) | lei ~ p_nou = p·(1 + c/100)",
  ],
  [
    "M",
    "procent|procente",
    2,
    "Calculează {c:10-50:10} % din {n:100-500:100}. => c*n/100 | fără unitate ~ c % din n = c·n/100",
  ],
  [
    "M",
    "ecuatia de gradul i|ecuatii de gradul i|necunoscuta|ecuatii liniare",
    3,
    "Rezolvă ecuația x/{a:2-9} + {b:1-9} = {c:10-20}. Care este valoarea lui x? => a*(c-b) | fără unitate ~ x = a·(c − b)",
  ],
  [
    "M",
    "ecuatii de gradul ii|ecuatia de gradul ii|discriminant|gradul al doilea|gradul 2",
    2,
    "Calculează discriminantul ecuației {a:1-3}x² + {b:2-10:2}x + {c:1-3} = 0. => b^2-4*a*c | fără unitate ~ Δ = b² − 4ac",
  ],
  [
    "M",
    "ecuatii de gradul ii|ecuatia de gradul ii|viete|gradul al doilea|gradul 2",
    2,
    "Care este suma rădăcinilor ecuației {a:1-4}x² − {b:2-12:2}x + {c:1-5} = 0? => b/a | fără unitate ~ x₁ + x₂ = −b/a",
  ],
  [
    "M",
    "sistem|sisteme",
    2,
    "Rezolvă sistemul x + y = {s:10-20:2}, x − y = {d:2-8:2}. Care este valoarea lui x? => (s+d)/2 | fără unitate ~ x = (s + d)/2",
  ],
  [
    "M",
    "pitagora|triunghi dreptunghic|ipotenuz",
    2,
    "Într-un triunghi dreptunghic catetele au lungimile de {a:3-12:3} cm și {b:4-16:4} cm. Care este lungimea ipotenuzei? => sqrt(a^2+b^2) | cm ~ c² = a² + b²",
  ],
  [
    "M",
    "dreptunghi|perimetru|aria",
    2,
    "Un dreptunghi are lungimea de {L:5-20} cm și lățimea de {l:2-10} cm. Care este aria lui? => L*l | cm² ~ A = L·l",
  ],
  [
    "M",
    "dreptunghi|perimetru|patrat|poligon",
    2,
    "Un dreptunghi are lungimea de {L:5-20} cm și lățimea de {l:2-10} cm. Care este perimetrul lui? => 2*(L+l) | cm ~ P = 2(L + l)",
  ],
  [
    "M",
    "aria triunghiului|aria unui triunghi|triunghi",
    2,
    "Un triunghi are baza de {b:4-20:2} cm și înălțimea corespunzătoare de {h:3-15:3} cm. Care este aria lui? => b*h/2 | cm² ~ A = b·h/2",
  ],
  [
    "M",
    "cerc(?![a-z])|cercul|aria cercului|discul",
    2,
    "Un cerc are raza de {r:2-10} cm. Care este aria lui? (π ≈ 3,14) => 3.14*r^2 | cm² ~ A = π·r²",
  ],
  [
    "M",
    "cerc(?![a-z])|cercul|lungimea cercului",
    2,
    "Un cerc are raza de {r:2-10} cm. Care este lungimea lui? (π ≈ 3,14) => 2*3.14*r | cm ~ L = 2π·r",
  ],
  [
    "M",
    "paralelipiped|prisma|(?<![a-z])cub(?![a-z])|cubul",
    2,
    "Un paralelipiped dreptunghic are dimensiunile de {a:2-10} cm, {b:2-10} cm și {c:2-10} cm. Care este volumul lui? => a*b*c | cm³ ~ V = a·b·c",
  ],
  [
    "M",
    "cilindru|volum",
    2,
    "Un cilindru circular drept are raza bazei de {r:2-8} cm și înălțimea de {h:3-15} cm. Care este volumul lui? (π ≈ 3,14) => 3.14*r^2*h | cm³ ~ V = π·r²·h",
  ],
  [
    "M",
    "con circular|conul|volumul conului",
    2,
    "Un con circular drept are raza bazei de {r:3-9:3} cm și înălțimea de {h:4-12:4} cm. Care este volumul lui? (π ≈ 3,14) => 3.14*r^2*h/3 | cm³ ~ V = π·r²·h / 3",
  ],
  [
    "M",
    "sfera|sferă|volum",
    2,
    "O sferă are raza de {r:3-9:3} cm. Care este volumul ei? (π ≈ 3,14) => 4*3.14*r^3/3 | cm³ ~ V = 4πr³/3",
  ],
  [
    "M",
    "progresie aritmetica|progresii aritmetice|progresia aritmetica",
    1,
    "Într-o progresie aritmetică primul termen este a₁ = {a1:1-10}, iar rația este r = {r:2-5}. Care este termenul a₁₀? => a1+9*r | fără unitate ~ aₙ = a₁ + (n − 1)·r",
  ],
  [
    "M",
    "progresie aritmetica|progresii aritmetice|progresia aritmetica",
    1,
    "Într-o progresie aritmetică a₁ = {a1:1-10} și r = {r:2-5}. Care este suma primilor 10 termeni? => 10*(2*a1+9*r)/2 | fără unitate ~ Sₙ = n(2a₁ + (n − 1)r)/2",
  ],
  [
    "M",
    "progresie geometrica|progresii geometrice|progresia geometrica",
    1,
    "Într-o progresie geometrică b₁ = {b:1-5} și rația q = {q:2-3}. Care este termenul b₅? => b*q^4 | fără unitate ~ bₙ = b₁·qⁿ⁻¹",
  ],
  [
    "M",
    "combinari|aranjamente|permutari|combinatoric",
    2,
    "Câte perechi diferite se pot forma dintr-un grup de {n:4-15} elevi? => n*(n-1)/2 | perechi ~ C(n,2) = n(n − 1)/2",
  ],
  [
    "M",
    "combinari|aranjamente|permutari|combinatoric",
    2,
    "Câte moduri există de a alege 3 elevi dintr-un grup de {n:5-12} elevi? => n*(n-1)*(n-2)/6 | moduri ~ C(n,3) = n(n − 1)(n − 2)/6",
  ],
  [
    "M",
    "probabilit",
    2,
    "O urnă conține {r:2-10} bile roșii și {a:3-10} bile albastre. Care este probabilitatea (în procente) de a extrage o bilă roșie? => r/(r+a)*100 | % ~ P = cazuri favorabile / cazuri posibile",
  ],
  [
    "M",
    "derivat",
    2,
    "Fie f(x) = {a:1-5}x³ − {b:1-9}x. Calculează f ′({x:1-4}). => 3*a*x^2-b | fără unitate ~ f′(x) = 3a·x² − b",
  ],
  [
    "M",
    "integral|primitiv",
    2,
    "Calculează integrala definită ∫ de la 0 la {n:2-6} din {a:1-5}·x dx. => a*n^2/2 | fără unitate ~ ∫ a·x dx = a·x²/2",
  ],
  [
    "M",
    "functie liniara|functia liniara|functii|functie",
    3,
    "Fie f(x) = {a:2-5}x + {b:1-9}. Calculează f({x:1-6}). => a*x+b | fără unitate ~ f(x) = ax + b",
  ],
  [
    "M",
    "panta|dreapta|coordonate",
    3,
    "Care este panta dreptei care trece prin A({x1:1-3}, {y1:1-5}) și B({x2:5-9}, {y2:6-14})? => (y2-y1)/(x2-x1) | fără unitate ~ m = (y₂ − y₁)/(x₂ − x₁)",
  ],
  [
    "M",
    "numere complexe|modulul|complex",
    2,
    "Calculează modulul numărului complex z = {a:3-12:3} + {b:4-16:4}i. => sqrt(a^2+b^2) | fără unitate ~ |z| = √(a² + b²)",
  ],
  [
    "M",
    "trigonometr|sinus|cosinus|unghi",
    3,
    "Într-un triunghi dreptunghic ipotenuza are {c:10-30:10} cm, iar un unghi ascuțit are 30°. Care este lungimea catetei opuse acestui unghi? => c*sin(30) | cm ~ cateta opusă = ipotenuza · sin α",
  ],
  [
    "M",
    "dobanda|calcul financiar|depozit",
    2,
    "O sumă de {C:1000-5000:1000} lei este depusă cu dobânda compusă de {p:5-10:5} % pe an. Ce sumă se obține după 2 ani? => C*(1+p/100)^2 | lei ~ S = C·(1 + p/100)ⁿ",
  ],
  [
    "M",
    "media aritmetica|statistic|mediana",
    2,
    "Notele unui elev sunt {a:6-10}, {b:6-10} și {c:6-10}. Care este media lor aritmetică? => (a+b+c)/3 | fără unitate ~ m = (a + b + c)/3",
  ],

  /* ================= INFORMATICĂ ================= */
  [
    "I",
    "octet|(?<![a-z])biti(?![a-z])|(?<![a-z])bit(?![a-z])|unitati de masura",
    2,
    "Câți biți conține un fișier de {k:1-10} octeți? => 8*k | biți ~ 1 octet = 8 biți",
  ],
  [
    "I",
    "binar|baza 2|reprezentarea binara",
    2,
    "Câte valori diferite se pot reprezenta pe {n:2-10} biți? => 2^n | valori ~ 2ⁿ",
  ],
  [
    "I",
    "bucl|instructiunea for|instructiunea while|repeat|iteratii|iteratie",
    2,
    "Câte iterații execută instrucțiunea for i:=1 to {n:5-30} do …? => n | iterații ~ n − 1 + 1 = n",
  ],
  [
    "I",
    "bucl|instructiunea for|instructiunea while|algoritm",
    3,
    "Care este valoarea sumei s = 1 + 2 + 3 + … + {n:5-20}, calculată într-o buclă? => n*(n+1)/2 | fără unitate ~ s = n(n + 1)/2",
  ],

  /* ================= GEOGRAFIE / BIOLOGIE (numerice) ================= */
  [
    "G",
    "densitatea populatiei|populatie|locuitori",
    2,
    "Un stat are {P:2000000-9000000:1000000} locuitori și o suprafață de {S:20000-90000:10000} km². Care este densitatea populației? => P/S | loc./km² ~ d = P / S",
  ],
  [
    "G",
    "scara hartii|scara numerica|harta",
    2,
    "Pe o hartă la scara 1:{s:100000-500000:100000} distanța dintre două localități este de {d:2-10} cm. Care este distanța reală? => d*s/100000 | km ~ distanța reală = d · s (1 km = 100000 cm)",
  ],
  [
    "G",
    "gradient termic|altitudine|temperatura aerului",
    2,
    "La baza unui munte temperatura aerului este de {t:10-25:5} °C. Temperatura scade cu 0,6 °C la fiecare 100 m. Ce temperatură este la altitudinea de {h:500-3000:500} m deasupra bazei? => t-h*0.6/100 | °C ~ t = t₀ − 0,6 · h/100",
  ],
  [
    "G",
    "sporul natural|natalitate|mortalitate",
    2,
    "Natalitatea unei țări este de {n:10-20}‰, iar mortalitatea de {m:5-12}‰. Care este sporul natural? => n-m | ‰ ~ sporul natural = natalitatea − mortalitatea",
  ],
];

const SUBJ = { Fizica: "F", Chimia: "C", Matematica: "M", Informatica: "I", Geografie: "G" };
const re = {},
  rx = s => (re[s] ??= new RegExp("(?<![a-z])(?:" + s + ")", "g"));
export const hasBank = materie => !!SUBJ[materie];
/* Șabloanele potrivite lecției: cuvintele-cheie trebuie să apară de destule ori în text (titlul numără dublu);
   păstrăm doar temele dominante ale lecției (cele mai frecvente), ca o lecție despre presiune să nu primească probleme despre unde. */
export function bankFor(materie, text, tema = "", max = 5, perGroup = 3) {
  const g = SUBJ[materie];
  if (!g) return [];
  const hay = (nz(tema) + " ").repeat(3) + nz(text),
    byKw = new Map();
  for (const [gr, kw, min, tpl] of B) {
    if (gr !== g) continue;
    if (!byKw.has(kw)) {
      const m = hay.match(rx(kw));
      byKw.set(kw, { n: m ? m.length : 0, min, tpls: [] });
    }
    byKw.get(kw).tpls.push(tpl);
  }
  const all = [...byKw.values()].filter(x => x.n >= Math.max(x.min, 4)),
    top = Math.max(0, ...all.map(x => x.n / x.min));
  const ok = all
    .filter(x => x.n / x.min >= 0.3 * top)
    .sort((a, b) => b.n / b.min - a.n / a.min)
    .slice(0, max); // doar temele dominante ale lecției
  const some = a =>
    a
      .map(v => [Math.random(), v])
      .sort((x, y) => x[0] - y[0])
      .slice(0, perGroup)
      .map(x => x[1]); // cel mult câteva șabloane din fiecare grup (varietate)
  return ok.flatMap(x => some(x.tpls));
}
export const BANK_SIZE = B.length;
