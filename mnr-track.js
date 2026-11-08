/*
 * Учёт переходов по UTM-меткам (листовки с QR и т.п.) — «Мужик», мастерврайоне.рф.
 * Пишет события в таблицу public.landing_events в Supabase (только вставка, читать с сайта нельзя).
 *
 *   visit     — открыта страница-сторис (masters.html / clients.html), с меткой или без
 *   cta       — на сторис нажата кнопка перехода на сайт
 *   site_open — открыта главная с меткой в адресе
 *   login     — вход/регистрация на устройстве, которое пришло по метке (не старше 30 дней)
 *
 * Метка запоминается в localStorage (mnr_utm) на 30 дней, чтобы связать переход с входом.
 * Никаких cookie, идентификаторов устройства и сторонних счётчиков.
 */
(function () {
  var URL_ = 'https://youyvbqdxuigvjciklfk.supabase.co/rest/v1/landing_events';
  var KEY_ = 'sb_publishable__cxPZ5uk7YSUwqN3vsTY7Q_Nt-N0KLw';
  var STORE = 'mnr_utm';
  var TTL = 30 * 24 * 3600 * 1000;
  var LANDINGS = { masters: 1, clients: 1 };

  function cut(v) { return v ? String(v).slice(0, 64) : null; }
  function pageName() {
    var p = location.pathname.replace(/^\/+/, '').replace(/\.html$/, '');
    return p || 'main';
  }
  function load() {
    try {
      var u = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (u && Date.now() - u.ts < TTL) return u;
    } catch (e) { /* нет хранилища — работаем без него */ }
    return null;
  }
  function save(u) {
    try { localStorage.setItem(STORE, JSON.stringify(u)); } catch (e) { /* ignore */ }
  }
  function send(event, u, userId) {
    try {
      var body = {
        event: event,
        page: cut(u && u.page),
        utm_source: cut(u && u.source),
        utm_medium: cut(u && u.medium),
        utm_campaign: cut(u && u.campaign),
        utm_content: cut(u && u.content),
        user_id: userId || null,
        is_mobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      };
      fetch(URL_, {
        method: 'POST',
        keepalive: true,
        headers: { apikey: KEY_, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) { /* статистика не должна ломать сайт */ }
  }

  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
  var here = pageName();
  var fromUrl = null;
  if (params && params.get('utm_source')) {
    fromUrl = {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      content: params.get('utm_content'),
      page: LANDINGS[here] ? here : (params.get('from') || here),
      ts: Date.now(),
      logins: []
    };
    var prev = load();
    if (prev && prev.source === fromUrl.source && prev.logins) fromUrl.logins = prev.logins;
    save(fromUrl);
  }

  if (LANDINGS[here]) {
    send('visit', fromUrl || { page: here });
  } else if (fromUrl) {
    send('site_open', fromUrl);
  }

  // На сторис: ссылки на главную ведут на тот же адрес сайта и несут метку дальше.
  if (LANDINGS[here]) {
    var tag = function () {
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var a = links[i];
        var isHome = a.hostname === location.hostname && (a.pathname === '/' || a.pathname === '/index.html');
        if (!isHome) continue;
        var q = new URLSearchParams();
        if (fromUrl) {
          ['source', 'medium', 'campaign', 'content'].forEach(function (k) {
            if (fromUrl[k]) q.set('utm_' + k, fromUrl[k]);
          });
          q.set('from', here);
        }
        var qs = q.toString();
        a.setAttribute('href', '/' + (qs ? '?' + qs : ''));
        if (a.classList.contains('cta')) {
          a.addEventListener('click', function () { send('cta', fromUrl || { page: here }); });
        }
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tag);
    else tag();
  }

  // Вызывается сайтом после входа/регистрации (см. saveSession в index.html).
  window.mnrTrackLogin = function (userId) {
    var u = load();
    if (!u || !userId) return;
    u.logins = u.logins || [];
    if (u.logins.indexOf(String(userId)) !== -1) return;
    u.logins.push(String(userId));
    save(u);
    send('login', u, String(userId));
  };
})();
