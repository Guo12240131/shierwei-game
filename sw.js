/* 土耳其十二位 —— 离线缓存。
   策略：**缓存优先**。
   这个游戏是单文件（three / 音效 / 封面全内联进 index.html），
   一共就一个请求，缓存优先既最快又最稳；联网时后台顺手更新。
   缓存名带内容哈希：index.html 一变，旧缓存整个作废，不会"改了却玩到老版本"。 */
const CACHE = 'sgn-4ec9311ba3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* 只接自己这一层的：跨域的（比如以后接了统计）直接放过 */
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        /* 后台悄悄换成新的，下次进来就是新版 */
        fetch(req).then((resp) => {
          if (resp && resp.ok) caches.open(CACHE).then((c) => c.put(req, resp.clone())).catch(() => {});
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
