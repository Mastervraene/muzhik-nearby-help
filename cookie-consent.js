/*
 * Баннер согласия на cookie для сайта «Мужик» (мастерврайоне.рф).
 * Один файл, подключается на каждой публичной странице:
 *   <script defer src="/cookie-consent.js"></script>
 *
 * Как включить реальную аналитику, когда она появится:
 *   1. Впишите ID счётчика(ов) в COOKIE_ANALYTICS_CONFIG ниже.
 *   2. Больше ничего менять не нужно — скрипт сам подгрузит счётчик,
 *      но только у тех посетителей, кто нажал «Принять» в баннере.
 *      Пока ID не вписан (null) — счётчик нигде не грузится и никакие
 *      данные никуда не уходят, несмотря на то что баннер уже показывается.
 */
window.COOKIE_ANALYTICS_CONFIG = window.COOKIE_ANALYTICS_CONFIG || {
  yandexMetrikaId: null, // например: 12345678
  vkPixelId: null,       // например: 'VK-RTRG-000000-xxxxx'
};

(function () {
  var STORAGE_KEY = 'cookieConsent';

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setConsent(status) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: status, ts: Date.now() }));
    } catch (e) {
      /* localStorage недоступен (приватный режим и т.п.) — просто не запоминаем выбор */
    }
  }

  function loadYandexMetrika(counterId) {
    if (!counterId || window.__ymLoaded) return;
    window.__ymLoaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(counterId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }

  function loadVkPixel(pixelId) {
    if (!pixelId || window.__vkPixelLoaded) return;
    window.__vkPixelLoaded = true;
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = 'https://vk.com/js/api/openapi.js?169';
    s.onload = function () {
      if (window.VK && window.VK.Retargeting) {
        window.VK.Retargeting.Init(pixelId);
        window.VK.Retargeting.Hit();
      }
    };
    document.head.appendChild(s);
  }

  function loadAnalyticsIfConsented() {
    var consent = getConsent();
    if (!consent || consent.status !== 'accepted') return;
    var cfg = window.COOKIE_ANALYTICS_CONFIG || {};
    loadYandexMetrika(cfg.yandexMetrikaId);
    loadVkPixel(cfg.vkPixelId);
  }

  function injectStyles() {
    if (document.getElementById('cc-banner-styles')) return;
    var style = document.createElement('style');
    style.id = 'cc-banner-styles';
    style.textContent =
      '.cc-banner{position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
      'background:var(--gray-0,#fff);border-top:1px solid var(--gray-200,#ddd);' +
      'box-shadow:0 -4px 20px rgba(15,23,42,.12);padding:16px 20px;' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:14px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}' +
      '.cc-banner__text{flex:1 1 320px;font-size:13.5px;line-height:1.5;color:var(--gray-700,#383838);margin:0;}' +
      '.cc-banner__text a{color:var(--accent,#2563eb);text-decoration:underline;}' +
      '.cc-banner__actions{display:flex;gap:10px;flex:0 0 auto;margin-left:auto;}' +
      '.cc-banner__btn{border:none;border-radius:999px;padding:11px 20px;font-size:13.5px;font-weight:600;' +
      'cursor:pointer;white-space:nowrap;font-family:inherit;}' +
      '.cc-banner__btn--accept{background:var(--accent,#2563eb);color:#fff;}' +
      '.cc-banner__btn--accept:hover{background:var(--accent-strong,#1d4ed8);}' +
      '.cc-banner__btn--decline{background:var(--gray-100,#eee);color:var(--gray-700,#383838);}' +
      '.cc-banner__btn--decline:hover{background:var(--gray-200,#ddd);}' +
      '.cc-reopen{position:fixed;left:10px;bottom:10px;z-index:99998;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;' +
      'font-size:11px;color:var(--gray-400,#9c9c9c);background:rgba(255,255,255,.85);' +
      'border:1px solid var(--gray-200,#ddd);border-radius:999px;padding:4px 10px;' +
      'cursor:pointer;text-decoration:none;}' +
      '.cc-reopen:hover{color:var(--gray-700,#383838);}' +
      '@media (max-width:520px){.cc-banner{padding:14px 16px;}.cc-banner__actions{width:100%;margin-left:0;}' +
      '.cc-banner__btn{flex:1 1 0;text-align:center;}}';
    document.head.appendChild(style);
  }

  function removeBanner() {
    var el = document.getElementById('cc-banner');
    if (el) el.remove();
  }

  function renderBanner() {
    injectStyles();
    removeBanner();
    var el = document.createElement('div');
    el.id = 'cc-banner';
    el.className = 'cc-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Уведомление об использовании cookie');
    el.innerHTML =
      '<p class="cc-banner__text">Мы используем технические файлы cookie и localStorage для работы сайта, ' +
      'а с вашего согласия — аналитические cookie (например, Яндекс Метрику) для статистики посещаемости. ' +
      'Подробнее — в <a href="/privacy-policy.html#cookie">Политике конфиденциальности</a>.</p>' +
      '<div class="cc-banner__actions">' +
      '<button type="button" class="cc-banner__btn cc-banner__btn--decline" id="cc-decline">Отказаться</button>' +
      '<button type="button" class="cc-banner__btn cc-banner__btn--accept" id="cc-accept">Принять</button>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('cc-accept').addEventListener('click', function () {
      setConsent('accepted');
      removeBanner();
      loadAnalyticsIfConsented();
    });
    document.getElementById('cc-decline').addEventListener('click', function () {
      setConsent('declined');
      removeBanner();
    });
  }

  function renderReopenControl() {
    if (document.getElementById('cc-reopen')) return;
    var btn = document.createElement('button');
    btn.id = 'cc-reopen';
    btn.type = 'button';
    btn.className = 'cc-reopen';
    btn.textContent = 'Cookie';
    btn.setAttribute('aria-label', 'Настройки cookie');
    btn.addEventListener('click', function () {
      injectStyles();
      renderBanner();
    });
    document.body.appendChild(btn);
  }

  function init() {
    injectStyles();
    renderReopenControl();
    var consent = getConsent();
    if (!consent) {
      renderBanner();
    } else if (consent.status === 'accepted') {
      loadAnalyticsIfConsented();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
