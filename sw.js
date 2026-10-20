// Service worker: site instalabil + funcționează și fără internet (pentru paginile deja vizitate)
const V = "lt-ic-v13";
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(["./", "css/style.css", "js/core/core.js", "js/core/theme.js", "img/hero1.jpg"]).catch(() => { })).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then(m => m || caches.match("./"))));
});
