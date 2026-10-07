(function () {
  var d = document.documentElement, t;
  try { t = localStorage.getItem("tema"); } catch (e) { }
  if (t === "noapte" || (!t && matchMedia("(prefers-color-scheme:dark)").matches)) d.dataset.theme = "noapte";
  function cur() { return d.dataset.theme === "noapte" ? "noapte" : "zi"; }
  function set(x) {
    if (x === "noapte") d.dataset.theme = "noapte"; else delete d.dataset.theme;
    try { localStorage.setItem("tema", x); } catch (e) { }
    var m = document.querySelector("meta[name=theme-color]"); if (m) m.content = getComputedStyle(d).getPropertyValue("--bg").trim() || m.content;
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#themeBtn")) set(cur() === "noapte" ? "zi" : "noapte"); });
})();
