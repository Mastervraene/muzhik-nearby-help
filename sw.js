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
const CACHE_VERSION = 'mnr-shell-v3';

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
    caches.keys()
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

// ===== Веб-пуш (18.10.2026) =====
// Обратная связь (30.10.2026): сообщаем серверу «пуш получен» и «нажали».
const PUSH_FN = 'https://youyvbqdxuigvjciklfk.supabase.co/functions/v1/webpush';
const PUSH_KEY = 'sb_publishable__cxPZ5uk7YSUwqN3vsTY7Q_Nt-N0KLw';
async function ackPush(nid, kind) {
  if (nid === undefined || nid === null || nid === '') return;
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return;
    await fetch(PUSH_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + PUSH_KEY, 'apikey': PUSH_KEY },
      body: JSON.stringify({ action: 'ack', nid: nid, endpoint: sub.endpoint, kind: kind }),
      keepalive: true,
    });
  } catch (e) { /* не критично */ }
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || 'Мужик', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/', nid: data.nid },
    }),
    ackPush(data.nid, 'received'),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.url || '/';
  event.waitUntil(Promise.all([
    ackPush(d.nid, 'click'),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  ]));
});
