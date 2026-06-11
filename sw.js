/* 恒达云 ERP Service Worker —— 网络优先（保证拿到最新），离线回退缓存 */
const CACHE = "hengdayun-erp-v2";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./erp/login.html",
  "./erp/index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // 网络优先：在线时总是取最新，并顺手更新缓存；断网时回退缓存
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./erp/login.html")))
  );
});
