/*
 * Кнопка «Поделиться» на страницах-листовках (masters.html, clients.html).
 * <button data-share data-share-url="/masters.html?utm_source=shlist1" data-share-text="…">…</button>
 * Сначала системное окно «Поделиться» (телефон). Если его нет (браузер внутри Telegram,
 * сканера QR и т.п.) или оно не сработало — показываем свои кнопки: Telegram, WhatsApp, ВКонтакте, «Скопировать».
 */
(function () {
  function copy(text) {
    try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(text); }); } catch (e) {}
    return Promise.resolve(legacy(text));
  }
  function legacy(text) {
    try {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(t); t.select();
      var ok = document.execCommand('copy'); t.remove(); return ok;
    } catch (e) { return false; }
  }
  function panel(btn, url, text) {
    var old = btn.parentNode.querySelector('.share-alt'); if (old) { old.remove(); return; }
    var u = encodeURIComponent(url), tx = encodeURIComponent(text);
    var box = document.createElement('div'); box.className = 'share-alt';
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px';
    var items = [
      ['Telegram', 'https://t.me/share/url?url=' + u + '&text=' + tx],
      ['WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url)],
      ['ВКонтакте', 'https://vk.com/share.php?url=' + u],
    ];
    items.forEach(function (it) {
      var a = document.createElement('a'); a.href = it[1]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = it[0];
      a.style.cssText = 'padding:9px 14px;border-radius:999px;background:#fff;color:#111;text-decoration:none;font-weight:700;font-size:14px;border:1.5px solid #d6d9de';
      box.appendChild(a);
    });
    var c = document.createElement('button'); c.type = 'button'; c.textContent = 'Скопировать ссылку';
    c.style.cssText = 'padding:9px 14px;border-radius:999px;background:#fff;color:#111;font-weight:700;font-size:14px;border:1.5px solid #d6d9de;font-family:inherit;cursor:pointer';
    c.onclick = function () { copy(text + ' ' + url).then(function (ok) { c.textContent = ok ? 'Скопировано ✓' : url; }); };
    box.appendChild(c);
    btn.insertAdjacentElement('afterend', box);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-share]'); if (!btn) return;
    e.preventDefault();
    var url = location.origin + (btn.getAttribute('data-share-url') || location.pathname);
    var text = btn.getAttribute('data-share-text') || document.title;
    if (navigator.share) {
      navigator.share({ title: 'Мужик', text: text, url: url }).catch(function (err) {
        if (!err || err.name !== 'AbortError') panel(btn, url, text); // отменил сам — ничего не показываем
      });
    } else {
      panel(btn, url, text);
    }
  });
})();
