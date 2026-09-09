// Service worker for the «Мужик» PWA shell.
//
// Стратегия сознательно НЕ «cache-first»: сайт деплоится перезаливкой
// index.html без версионирования имени файла (см. GitHub upload UI),
// и в этой же сессии уже не раз ловили ситуацию, когда браузер отдаёт
// устаревший закэшированный index.html даже после успешного ребилда
// GitHub Pages. Агрессивный cache-first сделал бы эту проблему навсегда
// и для всех — поэтому здесь network-first с откатом в кэш только для
// офлайна, плюс явное версионирование кэша ниже (бампать CACHE_VERSION
// при следующей заметной правке app-шелла).
const CACHE_VERSION = 'mnr-shell-v1';

// Только публичная часть сайта — НЕ admin.html и НЕ тяжёлые
// изображения (og.png, coverage-map.jpg), которые не нужны для
// офлайн-заглушки главного экрана.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Только GET и только свой origin — Supabase/Яндекс.Карты/шрифты и
  // прочие внешние запросы SW не трогает вообще, идут напрямую в сеть.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Навигации (переход по адресу/открытие приложения) и index.html —
  // network-first, чтобы новый деплой всегда был виден при наличии
  // сети; в кэш откатываемся только если сети действительно нет.
  const isNavigation = req.mode === 'navigate' || req.url.endsWith('/index.html');
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Остальной app shell (иконки, manifest, логотип) — из кэша, с
  // фоновым обновлением записи на будущее.
  if (APP_SHELL.some((p) => req.url.endsWith(p))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
