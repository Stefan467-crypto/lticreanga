// Lecții de exemplu (texte scrise pentru demonstrație, nu sunt copiate din manuale).
const L = (id, materie, clasa, tema, text) => ({ id: "demo-" + id, materie, clasa, tema: tema + " (exemplu)", demo: 1, text });
export const DEMO = [
  L("fizica", "Fizică", "IX", "Optica geometrică", `# Optica geometrică
Optica geometrică studiază fenomenele luminoase folosind noțiunea de rază de lumină.
Raza de lumină este o dreaptă orientată care indică direcția și sensul de propagare a luminii.
Un mediu transparent este mediul prin care lumina se propagă fără a fi absorbită sau împrăștiată în mod semnificativ.
Într-un mediu transparent și omogen lumina se propagă în linie dreaptă.
Viteza luminii în vid este de aproximativ 300000 km/s.
Reflexia luminii este fenomenul de întoarcere a luminii în mediul din care provine atunci când întâlnește suprafața de separare dintre două medii.
Legea reflexiei afirmă că unghiul de incidență este egal cu unghiul de reflexie.
Raza incidentă, raza reflectată și normala la suprafață se află în același plan.
Refracția luminii este fenomenul de schimbare a direcției de propagare a luminii la trecerea dintr-un mediu transparent în altul.
Indicele de refracție absolut al unui mediu este raportul dintre viteza luminii în vid și viteza luminii în acel mediu.
Indicele de refracție al apei este aproximativ 1,33 iar al sticlei aproximativ 1,5.
Indice de refracție: n = c / v
Convergența lentilei: C = 1 / f
Oglinda plană formează imagini virtuale, drepte și de aceeași mărime cu obiectul.
Imaginea virtuală este imaginea care nu poate fi proiectată pe un ecran.
Lentila convergentă este lentila care concentrează razele de lumină paralele într-un punct numit focar.
Lentila divergentă este lentila care împrăștie razele de lumină paralele.
Distanța focală este distanța dintre centrul optic al lentilei și focarul acesteia.
Convergența lentilei se măsoară în dioptrii.
Mărirea liniară transversală este raportul dintre înălțimea imaginii și înălțimea obiectului.
Mărire liniară: β = y2 / y1
@problema Un obiect se află la {x:10-40:5} cm de o oglindă plană. La ce distanță de obiect se află imaginea? => 2*x | cm
@problema O lentilă are distanța focală f = {f:0.1-0.5:0.05} m. Calculează convergența lentilei. => 1/f | dioptrii
@problema Viteza luminii într-un mediu este {v:150000-250000:10000} km/s. Calculează indicele de refracție al mediului (c = 300000 km/s). => 300000/v | fără unitate`),
  L("matematica", "Matematică", "VIII", "Teorema lui Pitagora", `# Teorema lui Pitagora
Triunghiul dreptunghic este triunghiul care are un unghi drept.
Ipotenuza este latura opusă unghiului drept și este cea mai lungă latură a triunghiului dreptunghic.
Catetele sunt laturile care formează unghiul drept al triunghiului dreptunghic.
Teorema lui Pitagora afirmă că într-un triunghi dreptunghic pătratul ipotenuzei este egal cu suma pătratelor catetelor.
Reciproca teoremei lui Pitagora afirmă că dacă într-un triunghi pătratul unei laturi este egal cu suma pătratelor celorlalte două laturi, atunci triunghiul este dreptunghic.
Perimetrul unui triunghi este suma lungimilor laturilor sale.
Suma măsurilor unghiurilor unui triunghi este de 180 de grade.
Un triplet pitagoreic este un set de trei numere naturale care verifică relația lui Pitagora, de exemplu 3, 4 și 5.
Teorema lui Pitagora: a² + b² = c²
Aria triunghiului: A = b · h / 2
Aria dreptunghiului: A = L · l
Perimetrul pătratului: P = 4 · l
@problema Un triunghi dreptunghic are catetele de {a:3-12} cm și {b:4-16} cm. Calculează lungimea ipotenuzei. => sqrt(a^2+b^2) | cm
@problema Un dreptunghi are lungimea {L:5-20} cm și lățimea {l:2-9} cm. Calculează aria dreptunghiului. => L*l | cm²
@problema Un pătrat are latura de {l:3-15} cm. Calculează perimetrul pătratului. => 4*l | cm
@problema Un triunghi are baza de {b:4-20} cm și înălțimea de {h:2-12} cm. Calculează aria triunghiului. => b*h/2 | cm²`),
  L("chimie", "Chimie", "VII", "Atomul", `# Atomul
Atomul este particula de bază din care sunt formate substanțele și care păstrează proprietățile elementului chimic.
Nucleul este partea centrală a atomului și conține protoni și neutroni.
Protonii sunt particulele cu sarcină electrică pozitivă din nucleul atomului.
Neutronii sunt particulele fără sarcină electrică din nucleul atomului.
Electronii sunt particulele cu sarcină electrică negativă care se mișcă în jurul nucleului.
Numărul atomic este numărul de protoni din nucleul unui atom și se notează cu Z.
Numărul de masă este suma dintre numărul de protoni și numărul de neutroni și se notează cu A.
Elementul chimic este totalitatea atomilor care au același număr atomic.
Un atom este neutru din punct de vedere electric deoarece numărul de protoni este egal cu numărul de electroni.
Izotopii sunt atomii aceluiași element chimic care au număr diferit de neutroni.
Numărul de masă: A = Z + N
@problema Un atom are Z = {z:3-20} protoni și {n:3-22} neutroni. Calculează numărul de masă A. => z+n | fără unitate
@problema Un atom are numărul de masă A = {a:20-60} și numărul atomic Z = {z:8-18}. Calculează numărul de neutroni. => a-z | fără unitate`),
  L("biologie", "Biologie", "VI", "Celula", `# Celula
Celula este unitatea structurală și funcțională de bază a organismelor vii.
Membrana celulară este învelișul care delimitează celula și controlează schimbul de substanțe cu mediul.
Nucleul este organitul care conține materialul genetic și coordonează activitatea celulei.
Mitocondria este organitul în care se produce cea mai mare parte a energiei celulei.
Cloroplastele conțin clorofila și se găsesc în celulele plantelor.
Ribozomii sunt organitele în care are loc sinteza proteinelor.
Peretele celular este un înveliș rigid care protejează celula vegetală.
Celula vegetală are cloroplaste, perete celular și vacuolă mare, iar celula animală nu le are.
Citoplasma este mediul semifluid în care se află organitele celulei.
Fotosinteza este procesul prin care plantele produc substanțe organice folosind lumina solară.
Respirația celulară este procesul prin care celulele eliberează energia din substanțele organice.
Țesutul este un grup de celule asemănătoare care îndeplinesc aceeași funcție.
Organismele unicelulare sunt formate dintr-o singură celulă.`),
  L("istorie", "Istorie", "VIII", "Unirea Principatelor Române", `# Unirea Principatelor Române
Unirea Principatelor Române a avut loc în anul 1859, prin dubla alegere a lui Alexandru Ioan Cuza.
Alexandru Ioan Cuza a fost ales domn al Moldovei la 5 ianuarie 1859.
Alexandru Ioan Cuza a fost ales domn al Țării Românești la 24 ianuarie 1859.
Dubla alegere este alegerea aceleiași persoane ca domn în ambele Principate Române.
Unirea deplină a Principatelor a fost realizată în anul 1862, când a luat ființă statul România cu capitala la București.
Secularizarea averilor mănăstirești a fost realizată în anul 1863.
Reforma agrară din 1864 a împroprietărit țăranii cu pământ.
Legea instrucțiunii din 1864 a stabilit învățământul primar gratuit și obligatoriu.
Alexandru Ioan Cuza a fost obligat să abdice la 11 februarie 1866.
După abdicarea lui Cuza, domn al României a devenit Carol I de Hohenzollern.
Prima Constituție modernă a României a fost adoptată în anul 1866.
Independența de stat a României a fost proclamată la 9 mai 1877.
România a devenit regat în anul 1881, iar Carol I a fost încoronat rege.`),
  L("geografie", "Geografie", "V", "Planeta Pământ", `# Planeta Pământ
Pământul este planeta de pe care observăm Universul și singura planetă cunoscută pe care există viață.
Forma Pământului este aproape sferică, puțin turtită la poli.
Globul geografic este modelul miniatural al Pământului.
Ecuatorul este linia imaginară care împarte globul pământesc în două emisfere: nordică și sudică.
Paralelele sunt cercuri imaginare paralele cu Ecuatorul.
Meridianele sunt semicercuri imaginare care unesc Polul Nord cu Polul Sud.
Meridianul zero este meridianul care trece prin localitatea Greenwich din apropierea Londrei.
Rotația Pământului este mișcarea Pământului în jurul axei sale și durează aproximativ 24 de ore.
Revoluția Pământului este mișcarea Pământului în jurul Soarelui și durează aproximativ 365 de zile și 6 ore.
Succesiunea zilei și a nopții este o consecință a mișcării de rotație.
Succesiunea anotimpurilor este o consecință a mișcării de revoluție și a înclinării axei Pământului.
Pe Pământ există șapte continente: Asia, Africa, America de Nord, America de Sud, Antarctida, Europa și Australia.
Oceanul Pacific este cel mai mare ocean de pe Pământ.`),
  L("romana", "Limba și literatura română", "V", "Substantivul", `# Substantivul
Substantivul este partea de vorbire care denumește ființe, lucruri, fenomene ale naturii și noțiuni abstracte.
Substantivul comun este substantivul care denumește ființe, lucruri sau fenomene dintr-o categorie.
Substantivul propriu este substantivul care denumește o singură ființă sau un singur lucru din categoria respectivă și se scrie cu inițială mare.
Genul substantivului poate fi masculin, feminin sau neutru.
Numărul substantivului poate fi singular sau plural.
Singularul este forma substantivului care denumește un singur obiect sau o singură ființă.
Pluralul este forma substantivului care denumește mai multe obiecte sau mai multe ființe.
Cazurile substantivului sunt nominativ, acuzativ, genitiv, dativ și vocativ.
Articolul este partea de vorbire care însoțește substantivul și arată dacă acesta este cunoscut sau necunoscut.
Vocativul este cazul care exprimă adresarea directă către cineva sau ceva.
Substantivul are în propoziție funcții sintactice precum subiect, nume predicativ, atribut și complement.`),
  L("informatica", "Informatică", "V", "Algoritmul", `# Algoritmul
Algoritmul este o succesiune finită de pași bine definiți care duc la rezolvarea unei probleme.
Datele de intrare sunt informațiile pe care algoritmul le primește la început.
Datele de ieșire sunt rezultatele pe care algoritmul le oferă la final.
Schema logică este reprezentarea grafică a unui algoritm cu ajutorul unor figuri geometrice.
Pseudocodul este modul de descriere a unui algoritm folosind un limbaj apropiat de limbajul natural.
Variabila este o zonă de memorie căreia îi dăm un nume și în care păstrăm o valoare.
Programul este un algoritm scris într-un limbaj de programare.
Structura liniară este structura în care instrucțiunile se execută una după alta, în ordinea în care sunt scrise.
Structura alternativă este structura în care execuția depinde de îndeplinirea unei condiții.
Structura repetitivă este structura în care un grup de instrucțiuni se execută de mai multe ori.
Un algoritm trebuie să fie corect, clar și să se termine după un număr finit de pași.`),
];
