// Ajutoare pentru profesori în vârstă și elevi mici: bară mică cu A− / A+ (mărimea textului) și „Ascultă” (citește pagina cu voce tare).
// Setările se păstrează în același loc cu cele din meniu (localStorage.a11y), deci rămân și la următoarea vizită.
const get = () => {
  try {
    return JSON.parse(localStorage.a11y || "{}");
  } catch (e) {
    return {};
  }
};
const set = a => {
  try {
    localStorage.a11y = JSON.stringify(a);
  } catch (e) {}
  document.documentElement.style.setProperty("--fs", a.fs || 1);
  dispatchEvent(new Event("a11y-change"));
};
const SPEAK = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
let speaking = false;
function say(text) {
  const synth = speechSynthesis;
  synth.cancel();
  const parts = text.replace(/\s+/g, " ").match(/[^.!?;:]+[.!?;:]*\s*/g) || [text],
    voices = synth.getVoices(),
    v = voices.find(x => /^ro/i.test(x.lang));
  parts
    .map(p => p.trim())
    .filter(Boolean)
    .forEach((p, i, a) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = "ro-RO";
      if (v) u.voice = v;
      u.rate = 0.92;
      if (i === a.length - 1) u.onend = u.onerror = () => stop();
      synth.speak(u);
    });
}
function stop() {
  speaking = false;
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  const b = document.getElementById("hl-say");
  if (b) {
    b.setAttribute("aria-pressed", "false");
    b.querySelector("span").textContent = "Ascultă";
  }
}
function listen() {
  const b = document.getElementById("hl-say");
  if (speaking) return stop();
  const sel = String(getSelection()).trim(),
    root =
      document.querySelector("#out") && document.querySelector("#out").innerText.trim().length > 40
        ? document.querySelector("#out")
        : document.querySelector("main"),
    txt = (sel.length > 3 ? sel : root ? root.innerText : "").trim().slice(0, 6000);
  if (!txt) return;
  speaking = true;
  b.setAttribute("aria-pressed", "true");
  b.querySelector("span").textContent = "Oprește";
  say(txt);
}
function dock() {
  if (document.getElementById("hl")) return;
  const d = document.createElement("div");
  d.id = "hl";
  d.className = "hl";
  d.setAttribute("role", "group");
  d.setAttribute("aria-label", "Ajutor la citire");
  d.innerHTML = `<button type="button" id="hl-m" aria-label="Micșorează textul" title="Text mai mic">A<small>−</small></button><button type="button" id="hl-p" aria-label="Mărește textul" title="Text mai mare">A<small>+</small></button>${SPEAK ? '<button type="button" id="hl-say" class="say" aria-pressed="false" title="Citește cu voce tare textul selectat sau pagina"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg><span>Ascultă</span></button>' : ""}`;
  document.body.append(d);
  d.onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    const a = get();
    if (b.id === "hl-p") {
      a.fs = Math.min(1.6, +((a.fs || 1) + 0.1).toFixed(2));
      set(a);
    } else if (b.id === "hl-m") {
      a.fs = Math.max(0.9, +((a.fs || 1) - 0.1).toFixed(2));
      set(a);
    } else if (b.id === "hl-say") listen();
  };
  if (SPEAK) {
    speechSynthesis.getVoices();
    addEventListener("pagehide", stop);
  }
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", dock) : dock();
