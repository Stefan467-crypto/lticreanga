// Liste derulante personalizate: orice <select> din site primește aspectul site-ului (și meniul de opțiuni, nu doar câmpul).
// <select>-ul original rămâne în pagină (ascuns): valoarea, evenimentele „change” și formularele funcționează exact ca înainte.
// Dacă browserul nu știe „popover”, rămâne selectul obișnuit.
const OK = typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
let open = null; // lista deschisă acum

const label = s => {
  const o = s.options[s.selectedIndex];
  return o ? o.textContent.trim() : "";
};

function build(sel) {
  if (sel._dd || sel.multiple || sel.size > 1 || sel.dataset.native !== undefined) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = (sel.className ? sel.className + " " : "") + "dd";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  if (sel.id) btn.id = "dd-" + sel.id;
  sel.after(btn);
  sel.classList.add("dd-native");
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");
  const txt = document.createElement("span");
  btn.append(txt);
  const api = {
    btn,
    sel,
    list: null,
    refresh() {
      txt.textContent = label(sel) || " ";
      btn.disabled = sel.disabled;
      btn.hidden = sel.hidden;
      btn.classList.toggle("ph", !!sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].value === "");
      if (this.list && open === this) fill(this);
    },
  };
  sel._dd = api;
  api.refresh();
  sel.addEventListener("change", () => api.refresh());
  sel.addEventListener("focus", () => {
    if (!btn.disabled) btn.focus();
  }); // click pe <label> → câmpul nostru
  new MutationObserver(() => api.refresh()).observe(sel, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "hidden", "label"],
    characterData: true,
  });
  btn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    /* handlerele paginii (ex. „orice <button> din #cfg redesenează formularul”) nu trebuie să vadă clickul, altfel select-ul se reconstruiește sub noi */ open ===
    api
      ? close()
      : show(api);
  });
  btn.addEventListener("keydown", e => {
    if (open === api) return; // lista e deschisă: tastele sunt tratate de key()
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show(api, e.key === "ArrowUp" ? -1 : 0);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      jump(sel, e.key);
    }
  });
}
function jump(sel, ch) {
  // litera tastată sare la prima opțiune care începe cu ea (fără să deschidă lista)
  const c = ch.toLowerCase(),
    o = [...sel.options].find(
      (x, i) => !x.disabled && x.textContent.trim().toLowerCase().startsWith(c) && i !== sel.selectedIndex
    );
  if (o) {
    sel.value = o.value;
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
function fill(api) {
  const { sel, list } = api;
  list.textContent = "";
  let grp = null;
  [...sel.children].forEach(ch => {
    const add = (o, nested) => {
      const it = document.createElement("div");
      it.className = "dd-o" + (nested ? " in" : "");
      it.setAttribute("role", "option");
      it.tabIndex = -1;
      it.dataset.v = o.value;
      it.textContent = o.textContent.trim() || "—";
      if (o.disabled) it.setAttribute("aria-disabled", "true");
      const on = o === sel.options[sel.selectedIndex];
      if (on) {
        it.setAttribute("aria-selected", "true");
      }
      list.append(it);
    };
    if (ch.tagName === "OPTGROUP") {
      const h = document.createElement("div");
      h.className = "dd-g";
      h.textContent = ch.label;
      list.append(h);
      [...ch.children].forEach(o => add(o, true));
    } else if (ch.tagName === "OPTION") add(ch, false);
  });
}
function place(api) {
  const r = api.btn.getBoundingClientRect(),
    l = api.list,
    vh = innerHeight,
    vw = innerWidth;
  l.style.minWidth = r.width + "px";
  l.style.maxWidth = Math.min(vw - 16, Math.max(r.width, 420)) + "px";
  l.style.maxHeight = "";
  const want = Math.min(l.scrollHeight + 2, 320),
    below = vh - r.bottom - 12,
    above = r.top - 12,
    up = below < Math.min(want, 200) && above > below,
    mh = Math.max(120, Math.min(want, up ? above : below));
  l.style.maxHeight = mh + "px";
  const h = Math.min(want, mh);
  l.style.top = Math.max(8, up ? r.top - h - 6 : r.bottom + 6) + "px";
  l.style.left = Math.max(8, Math.min(r.left, vw - l.offsetWidth - 8)) + "px";
}
function show(api, dir = 0) {
  close();
  if (api.btn.disabled) return;
  const l = document.createElement("div");
  l.className = "ddl";
  l.setAttribute("popover", "manual");
  l.setAttribute("role", "listbox");
  l.tabIndex = -1;
  (api.btn.closest("dialog") || document.body).append(l); // în fereastra modală lista trebuie să stea în ea, altfel nu poate fi apăsată
  api.list = l;
  fill(api);
  api.btn.setAttribute("aria-expanded", "true");
  open = api;
  try {
    l.showPopover();
  } catch (e) {}
  place(api);
  const on = l.querySelector('[aria-selected="true"]') || l.querySelector(".dd-o:not([aria-disabled])");
  if (on) {
    on.scrollIntoView({ block: "nearest" });
    on.classList.add("hot");
  }
  l.addEventListener("pointerover", e => {
    const o = e.target.closest(".dd-o");
    if (o && !o.hasAttribute("aria-disabled")) {
      l.querySelectorAll(".hot").forEach(x => x.classList.remove("hot"));
      o.classList.add("hot");
    }
  });
  l.addEventListener("click", e => {
    e.stopPropagation();
    const o = e.target.closest(".dd-o");
    if (o && !o.hasAttribute("aria-disabled")) pick(api, o.dataset.v);
  });
  l.addEventListener("keydown", e => key(api, e));
  api.btn.addEventListener("keydown", (api._k = e => key(api, e))); // tastele merg și cât timp focusul rămâne pe câmp
  if (dir < 0) move(l, -1);
}
function items(l) {
  return [...l.querySelectorAll(".dd-o:not([aria-disabled])")];
}
function move(l, d) {
  const a = items(l);
  if (!a.length) return;
  let i = a.findIndex(x => x.classList.contains("hot"));
  i = i < 0 ? (d > 0 ? 0 : a.length - 1) : Math.max(0, Math.min(a.length - 1, i + d));
  l.querySelectorAll(".hot").forEach(x => x.classList.remove("hot"));
  a[i].classList.add("hot");
  a[i].scrollIntoView({ block: "nearest" });
}
function key(api, e) {
  if (open !== api) return;
  const l = api.list;
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close(true);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    move(l, 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    move(l, -1);
  } else if (e.key === "Home") {
    e.preventDefault();
    move(l, -1e3);
  } else if (e.key === "End") {
    e.preventDefault();
    move(l, 1e3);
  } else if (e.key === "Enter" || e.key === " ") {
    const h = l.querySelector(".hot");
    if (h) {
      e.preventDefault();
      e.stopImmediatePropagation();
      pick(api, h.dataset.v);
    }
  } else if (e.key === "Tab") close();
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    const c = e.key.toLowerCase(),
      a = items(l),
      cur = a.findIndex(x => x.classList.contains("hot")),
      n = [...a.slice(cur + 1), ...a.slice(0, cur + 1)].find(x => x.textContent.trim().toLowerCase().startsWith(c));
    if (n) {
      l.querySelectorAll(".hot").forEach(x => x.classList.remove("hot"));
      n.classList.add("hot");
      n.scrollIntoView({ block: "nearest" });
    }
  }
}
function pick(api, v) {
  const changed = api.sel.value !== v;
  close(true);
  if (changed) {
    api.sel.value = v;
    api.sel.dispatchEvent(new Event("input", { bubbles: true }));
    api.sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  api.refresh();
}
function close(refocus) {
  if (!open) return;
  const a = open;
  open = null;
  try {
    a.list.hidePopover();
  } catch (e) {}
  a.list.remove();
  a.list = null;
  a.btn.setAttribute("aria-expanded", "false");
  if (a._k) {
    a.btn.removeEventListener("keydown", a._k);
    a._k = null;
  }
  if (refocus) a.btn.focus();
}
function scan(root = document) {
  if (!OK) return;
  (root.matches && root.matches("select") ? [root] : [])
    .concat([...(root.querySelectorAll ? root.querySelectorAll("select") : [])])
    .forEach(build);
}
// valoarea setată din cod (select.value = …) trebuie să se vadă și în câmpul nostru
if (OK) {
  for (const p of ["value", "selectedIndex"]) {
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, p);
    if (d && d.set)
      Object.defineProperty(HTMLSelectElement.prototype, p, {
        ...d,
        set(v) {
          d.set.call(this, v);
          if (this._dd) this._dd.refresh();
        },
      });
  }
  document.addEventListener(
    "pointerdown",
    e => {
      if (open && !open.list.contains(e.target) && !open.btn.contains(e.target)) close();
    },
    true
  );
  addEventListener("resize", () => close());
  addEventListener(
    "scroll",
    e => {
      if (open && !(e.target.nodeType === 1 && open.list.contains(e.target))) close();
    },
    true
  );
  const go = () => {
    scan();
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && scan(n)))).observe(
      document.body,
      { childList: true, subtree: true }
    );
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
}
