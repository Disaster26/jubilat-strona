/* Jubilat - skrypt strony (wersja testowa 05.11.2026).
   Godziny i kalendarz z <script id="dane">, czas zawsze wg Europe/Warsaw. */
(function () {
  'use strict';
  var D = {};
  try { D = JSON.parse(document.getElementById('dane').textContent); } catch (err) { D = { pl: [], nh: [], sw: [], skr: {} }; }
  var ROOT = (document.currentScript && document.currentScript.getAttribute('data-root')) || './';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- czas ---------- */
  var DNI_W = ['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'];
  var MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  function teraz() {
    var p = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + +p.minute };
    } catch (err) {
      var n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), min: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function ds(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function dzien(t, n) { var x = new Date(Date.UTC(t.y, t.m - 1, t.d + n)); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), dow: x.getUTCDay(), k: ds(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()) }; }
  function mm(s) { var a = s.split(':'); return +a[0] * 60 + +a[1]; }
  function hh(min) { return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0'); }
  var T = teraz(), DZIS = dzien(T, 0).k;

  function godzDnia(g, dz) {
    if (D.sw.indexOf(dz.k) > -1) return null;
    var h;
    if (dz.dow === 0) h = D.nh.indexOf(dz.k) > -1 ? g.nh : null;
    else if (dz.dow === 6) h = g.sob;
    else h = g.pt;
    if (h && D.skr && D.skr[dz.k]) h = [h[0], mm(D.skr[dz.k]) < mm(h[1]) ? D.skr[dz.k] : h[1]];
    return h;
  }
  function rodzajDnia(dz) { return D.sw.indexOf(dz.k) > -1 ? 'nd' : dz.dow === 0 ? (D.nh.indexOf(dz.k) > -1 ? 'nh' : 'nd') : dz.dow === 6 ? 'sob' : 'pt'; }
  function status(g) {
    var t = teraz(), dz = dzien(t, 0), h = godzDnia(g, dz);
    if (h && t.min >= mm(h[0]) && t.min < mm(h[1])) {
      var zost = mm(h[1]) - t.min;
      return { otw: true, do: mm(h[1]), wkrotce: zost <= 45, txt: zost <= 45 ? 'Zamykamy za ' + zost + ' min, o ' + hh(mm(h[1])) : 'Otwarte do ' + hh(mm(h[1])) };
    }
    for (var i = 0; i < 10; i++) {
      var d2 = dzien(t, i), h2 = godzDnia(g, d2);
      if (!h2 || (i === 0 && t.min >= mm(h2[0]))) continue;
      var kiedy = i === 0 ? 'dziś' : i === 1 ? 'jutro' : DNI_W[d2.dow];
      var sw = (i === 0 && D.sw.indexOf(dz.k) > -1) ? 'Dziś święto, ' : '';
      return { otw: false, za: i * 1440 + mm(h2[0]) - t.min, txt: (sw ? sw + 'nieczynne. Otwieramy ' : 'Zamknięte, otwieramy ') + kiedy + ' o ' + hh(mm(h2[0])) };
    }
    return { otw: false, za: 99999, txt: 'Zamknięte' };
  }
  var PL = {};
  D.pl.forEach(function (p) { PL[p.id] = p; });
  function godzId(id) { var a = id.split(':'), p = PL[a[0]]; if (!p) return null; return a.length > 1 && p.dz ? p.dz[+a[1]] : p.g; }

  function rysujStatusy() {
    $$('[data-st]').forEach(function (el) {
      var g = godzId(el.getAttribute('data-st')); if (!g) return;
      var s = status(g), pre = el.getAttribute('data-st-pre') || '';
      el.textContent = pre + (pre ? s.txt.charAt(0).toLowerCase() + s.txt.slice(1) : s.txt);
      el.classList.toggle('zamk', !s.otw);
      el.classList.toggle('wkrotce', !!s.wkrotce);
      el.setAttribute('data-otw', s.otw ? '1' : '0');
    });
    var tz = $('#teraz');
    if (tz) {
      var st = D.pl.map(function (p) { return { p: p, s: status(p.g) }; });
      var otw = st.filter(function (x) { return x.s.otw; }), t = $('#terazTxt');
      if (otw.length) {
        var dh = st[0], najdl = otw.slice().sort(function (a, b) { return b.s.do - a.s.do; })[0];
        tz.classList.remove('zamk');
        t.innerHTML = 'Teraz otwarte: <b>' + otw.length + ' z ' + st.length + ' placówek</b>. ' + (dh.s.otw ? 'Dom Handlowy do ' + hh(dh.s.do) + '.' : 'Najdłużej: ' + najdl.p.n + ', do ' + hh(najdl.s.do) + '.');
      } else {
        var najw = st.slice().sort(function (a, b) { return a.s.za - b.s.za; })[0];
        tz.classList.add('zamk');
        t.textContent = 'Teraz wszystkie placówki są zamknięte. ' + najw.s.txt.replace(/^(Dziś święto, nieczynne\. Otwieramy|Zamknięte, otwieramy)/, 'Najwcześniej otwieramy') + ' (' + najw.p.n + ').';
      }
    }
  }

  /* ---------- tabele godzin: wiersz "dziś" ---------- */
  function rysujDzis() {
    var r = rodzajDnia(dzien(teraz(), 0));
    $$('[data-gt] tr[data-r], .godz tr[data-r]').forEach(function (tr) { tr.classList.toggle('dzis-r', tr.getAttribute('data-r') === r); });
  }

  /* ---------- treści z datą od-do (banery, komunikaty, okazje, oferty) ---------- */
  function rysujDaty() {
    $$('[data-od],[data-do]').forEach(function (el) {
      var od = el.getAttribute('data-od'), dO = el.getAttribute('data-do');
      el.hidden = !!((od && DZIS < od) || (dO && DZIS > dO));
    });
    $$('[data-pusto]').forEach(function (c) {
      var info = document.getElementById(c.getAttribute('data-pusto'));
      var widac = $$(':scope > *', c).some(function (x) { return !x.hidden; });
      if (info) info.hidden = widac;
      c.hidden = !widac;
    });
    $$('[data-okazje-blok]').forEach(function (s) { s.hidden = !$$('.ok', s).some(function (b) { return !b.hidden; }); });
    $$('[data-blok-sekcja]').forEach(function (s) {
      var wid = $$('[data-blok]', s).filter(function (b) { return !b.hidden; });
      s.hidden = !wid.length; var u = $('.gaz-uklad', s); if (u) u.classList.toggle('gaz-jedna', wid.length === 1);
    });
    $$('.promocje').forEach(function (s) { s.hidden = !$$('.ban', s).some(function (b) { return !b.hidden; }); });
    $$('.kom').forEach(function (s) { s.hidden = !$$('p', s).some(function (b) { return !b.hidden; }); });
    $$('[data-gazetka]').forEach(function (el) {
      var od = '2026-10-21', dO = '2026-11-04';
      var g = el.closest('[data-gaz-od]');
      if (g) { od = g.getAttribute('data-gaz-od'); dO = g.getAttribute('data-gaz-do'); }
      var a = dO.split('-');
      if (DZIS > dO) { el.textContent = 'Oferta zakończona ' + (+a[2]) + ' ' + MIES[+a[1] - 1] + '. Nowa gazetka pojawi się tu wkrótce.'; el.classList.add('zamk'); }
      else if (DZIS < od) { el.textContent = 'Gazetka zacznie obowiązywać wkrótce.'; el.classList.add('zamk'); }
      else el.textContent = 'Gazetka aktualna, ważna do ' + (+a[2]) + ' ' + MIES[+a[1] - 1] + '.';
    });
  }

  /* ---------- menu barów ---------- */
  function rysujMenu() {
    if (!D.menu) return;
    var dz = dzien(teraz(), 0), wTyg = DZIS >= D.menu.od && DZIS <= D.menu.do && dz.dow >= 1 && dz.dow <= 5;
    $$('[data-menu]').forEach(function (ul) {
      $$('li[data-dzien]', ul).forEach(function (li) { li.classList.toggle('dzisiaj', wTyg && +li.getAttribute('data-dzien') === dz.dow); });
    });
    $$('[data-menu-dzis]').forEach(function (box) {
      var ul = document.querySelector('ul[data-menu="' + box.getAttribute('data-menu-dzis') + '"]');
      var li = wTyg && ul ? $('li[data-dzien="' + dz.dow + '"]', ul) : null;
      if (!li) return;
      var sp = li.querySelectorAll('span');
      box.innerHTML = '<p class="dzis-tyt">Dziś: zupa i drugie danie</p><p class="dzis-danie"></p><p class="dzis-cena"></p>';
      box.querySelector('.dzis-danie').textContent = sp[1].textContent;
      box.querySelector('.dzis-cena').textContent = sp[2].textContent;
    });
    if (D.menu.do && DZIS > D.menu.do) $$('[data-menu-blok]').forEach(function (b) { b.hidden = true; });
    if (!wTyg) $$('[data-menu-info]').forEach(function (p) {
      if (DZIS > D.menu.do) p.textContent = 'To menu z poprzedniego tygodnia. Aktualne menu publikujemy na początku każdego tygodnia, zadzwoń, żeby zapytać o dzisiejsze dania.';
    });
  }

  /* ---------- lista placówek: filtry, godziny, geolokalizacja ---------- */
  var lista = $('#lista'), filtr = 'all', tylkoOtw = false, poz = null;
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function fOdl(k) { return k < 1 ? Math.round(k * 100) * 10 + ' m' : k.toFixed(1).replace('.', ',') + ' km'; }
  function filtruj() {
    if (!lista) return;
    var lis = $$('.pl', lista), widac = 0;
    if (poz) {
      lis.sort(function (a, b) { return km(poz, PL[a.dataset.id]) - km(poz, PL[b.dataset.id]); }).forEach(function (li) { lista.appendChild(li); });
    }
    lis.forEach(function (li) {
      var st = $('.pl-status', li);
      var ok = (filtr === 'all' || li.dataset.typ === filtr) && (!tylkoOtw || (st && st.getAttribute('data-otw') === '1'));
      li.hidden = !ok; if (ok) widac++;
      var o = $('.odl', li);
      if (poz) { if (!o) { o = document.createElement('span'); o.className = 'odl'; st.appendChild(o); } o.textContent = fOdl(km(poz, PL[li.dataset.id])) + ' od Ciebie'; }
      else if (o) o.remove();
    });
    var pi = $('#pustoInfo'); if (pi) pi.hidden = widac > 0;
  }
  if (lista) {
    lista.addEventListener('click', function (e) {
      var b = e.target.closest('.pokaz-godz');
      if (!b) return;
      var g = $('.godz', b.closest('.pl'));
      g.hidden = !g.hidden; b.setAttribute('aria-expanded', String(!g.hidden)); b.textContent = g.hidden ? 'Godziny' : 'Zwiń godziny';
    });
    $$('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        filtr = b.dataset.f;
        $$('.seg button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        filtruj(); dopasuj();
      });
    });
    var to = $('#tylkoOtw'); if (to) to.addEventListener('change', function () { tylkoOtw = to.checked; filtruj(); dopasuj(); });
    var gb = $('#geoBtn'), gi = $('#geoInfo');
    if (gb) gb.addEventListener('click', function () {
      if (poz) { poz = null; TY = null; gb.classList.remove('on'); gi.hidden = true; filtruj(); if (mapa) mapaAll(mapa, null); return; }
      if (!navigator.geolocation) { gi.hidden = false; gi.textContent = 'Ta przeglądarka nie udostępnia lokalizacji.'; return; }
      gi.hidden = false; gi.textContent = 'Ustalamy Twoje położenie…';
      navigator.geolocation.getCurrentPosition(function (p) {
        poz = { lat: p.coords.latitude, lng: p.coords.longitude };
        gb.classList.add('on'); filtruj();
        var n = D.pl.slice().sort(function (a, b) { return km(poz, a) - km(poz, b); })[0];
        gi.textContent = 'Najbliżej: ' + n.n + ', ' + fOdl(km(poz, n)) + '. Lista posortowana od najbliższej placówki. Kliknij ponownie, żeby wyłączyć.';
        TY = poz; if (mapa) mapaAll(mapa, n.id);
      }, function () { gi.textContent = 'Bez dostępu do lokalizacji pokazujemy listę w zwykłej kolejności.'; }, { timeout: 10000, maximumAge: 300000 });
    });
  }

  /* ---------- mapy Google (osadzone, bez klucza; ładowane po wejściu w widok) ---------- */
  var mapa = null;
  function gUrl(p) { return 'https://maps.google.com/maps?q=' + encodeURIComponent(p.q) + '&z=16&hl=pl&output=embed'; }
  /* ---------- zgoda na cookies (12 miesięcy, localStorage + cookie) ---------- */
  var ZG_KLUCZ = 'jb_zgoda', ZG_DNI = 365;
  function zgodaCzytaj() {
    try { var z = JSON.parse(localStorage.getItem(ZG_KLUCZ) || 'null'); if (z && z.t && (Date.now() - z.t) < ZG_DNI * 864e5) return z; } catch (err) {}
    var m = document.cookie.match(/(?:^|; )jb_zgoda=([^;]+)/); if (m) { var a = decodeURIComponent(m[1]).split('|'); return { mapy: a[0] === '1', stat: a[1] === '1', t: +a[2] || Date.now() }; }
    return null;
  }
  function zgodaZapisz(z) {
    z.t = Date.now(); z.v = 1;
    try { localStorage.setItem(ZG_KLUCZ, JSON.stringify(z)); } catch (err) {}
    document.cookie = 'jb_zgoda=' + encodeURIComponent((z.mapy ? '1' : '0') + '|' + (z.stat ? '1' : '0') + '|' + z.t) + '; max-age=' + (ZG_DNI * 86400) + '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    ZGODA = z; zastosujZgode();
  }
  var ZGODA = zgodaCzytaj(), ck = $('#ck');
  function zastosujZgode() {
    $$('[data-mapa]').forEach(function (el) {
      if (el.getAttribute('data-widac') !== '1') return;
      if (el === mapa) { mapaAll(el, el.getAttribute('data-akt')); return; }
      if (ZGODA && ZGODA.mapy) { if (!el.querySelector('iframe')) ustawMape(el, el.getAttribute('data-akt')); } else if (el.querySelector('iframe')) zaslepka(el, el.getAttribute('data-akt'));
    });
    if (ZGODA && ZGODA.stat && ck && ck.getAttribute('data-ga4') && !window.gtag) {
      var g = ck.getAttribute('data-ga4'), s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(g); document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', g);
    }
  }
  function banerPokaz(ustawienia) {
    if (!ck) return;
    ck.hidden = false; document.body.classList.add('ck-on');
    var u = $('#ckUst'), m = $('#ckMapy'), st = $('#ckStat');
    if (m) m.checked = !!(ZGODA && ZGODA.mapy); if (st) st.checked = !!(ZGODA && ZGODA.stat);
    u.hidden = !ustawienia; $('[data-ck="zapisz"]', ck).hidden = !ustawienia; $('[data-ck="ustawienia"]', ck).hidden = !!ustawienia;
    $('[data-ck="ustawienia"]', ck).setAttribute('aria-expanded', String(!!ustawienia));
  }
  function banerZamknij() { if (ck) { ck.hidden = true; document.body.classList.remove('ck-on'); } }
  if (ck) {
    ck.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck]'); if (!b) return;
      var a = b.getAttribute('data-ck');
      if (a === 'wszystkie') { zgodaZapisz({ mapy: true, stat: true }); banerZamknij(); }
      else if (a === 'niezbedne') { zgodaZapisz({ mapy: false, stat: false }); banerZamknij(); }
      else if (a === 'ustawienia') banerPokaz(true);
      else if (a === 'zapisz') { var st = $('#ckStat'); zgodaZapisz({ mapy: $('#ckMapy').checked, stat: st ? st.checked : false }); banerZamknij(); }
    });
    if (!ZGODA) banerPokaz(false);
  }
  $$('[data-cookies-ustaw]').forEach(function (b) { b.addEventListener('click', function () { banerPokaz(true); }); });

  /* ---------- mapy Google: wczytywane po wejściu w widok, tylko ze zgodą na usługi zewnętrzne ----------
     Mapa wszystkich placówek (#mapa): klucz API (11 znaczników) > link My Maps > schemat z numerowaną listą.
     Mapy pojedynczych placówek: osadzona Mapa Google z pinezką. */
  var ETYK = {}; (function () { var n = 0; D.pl.forEach(function (p) { ETYK[p.id] = p.typ === 'dh' ? 'DH' : String(++n); }); })();
  var MM = D.mm || '', GK = D.gk || '', GMAP = null, GMARK = {}, GINFO = null, GTY = null, TY = null, GKOL = [];
  function trasa(p) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(p.q); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function zgMapy() { return !!(ZGODA && ZGODA.mapy); }
  function zgodaDaj() { var z = ZGODA || { stat: false }; z.mapy = true; zgodaZapisz(z); banerZamknij(); }
  function stTxt(id) {
    var s = lista && lista.querySelector('.pl[data-id="' + id + '"] .pl-status'); if (!s) return '';
    var o = s.querySelector('.odl'); return s.textContent.replace(o ? o.textContent : '', '').trim();
  }
  function zaslepka(el, id) {
    var p = PL[id]; if (!p) return;
    el.setAttribute('data-akt', id);
    el.innerHTML = '<div class="mz"><span class="mz-znak" aria-hidden="true"></span><p class="mz-n">' + esc(p.nz) + '</p><p class="mz-a">' + esc(p.q.replace(p.nz + ', ', '')) + '</p>'
      + '<div class="mz-akcje"><button type="button" class="mz-pokaz">Pokaż mapę (akceptuję cookies Google)</button><a class="mz-trasa" href="' + trasa(p) + '" target="_blank" rel="noopener">Wyznacz trasę</a></div></div>';
    $('.mz-pokaz', el).addEventListener('click', function () { zgodaDaj(); ustawMape(el, id); });
  }
  function iframe(el, src, tytul) {
    var f = el.querySelector('iframe');
    if (!f) { el.innerHTML = ''; f = document.createElement('iframe'); f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade'); f.setAttribute('allowfullscreen', ''); el.appendChild(f); }
    f.title = tytul; if (f.getAttribute('src') !== src) f.src = src;
  }
  /* mapa wszystkich placówek przed zgodą: zaproszenie do Mapy Google (bez ładowania Google) */
  function zaslepkaAll(el, p) {
    var ile = D.pl.length, sk = D.pl.filter(function (x) { return x.typ === 'sklep'; }).length;
    el.setAttribute('data-tryb', 'zgoda');
    el.innerHTML = '<div class="mz mz-all"><p class="mz-k">Mapa Google</p><p class="mz-n">' + (p ? esc(p.nz) : 'Sklepy Jubilat w Krakowie na jednej mapie') + '</p><p class="mz-a">'
      + (p ? esc(p.q.replace(p.nz + ', ', '')) : 'Dom Handlowy przy al. Krasińskiego, ' + sk + ' sklepów osiedlowych i bary mleczne Żaczek i Flisak.') + '</p>'
      + '<div class="mz-akcje"><button type="button" class="mz-pokaz">Pokaż mapę Google (akceptuję cookies Google)</button>' + (p ? '<a class="mz-trasa" href="' + trasa(p) + '" target="_blank" rel="noopener">Wyznacz trasę</a>' : '') + '</div></div>';
    $('.mz-pokaz', el).addEventListener('click', function () { zgodaDaj(); mapaAll(el, el.getAttribute('data-akt')); });
  }
  function podpis(el, p, pojedyncza) {
    if (el !== mapa) return;
    var c = $('#mapaPodpis');
    if (c) {
      var wroc = pojedyncza ? '<button type="button" class="mp-wszystkie">Wszystkie placówki</button>' : '';
      c.innerHTML = p ? '<b>' + esc(p.nz) + '</b><span><a href="' + p.u + '">Godziny i dojazd</a><a href="' + trasa(p) + '" target="_blank" rel="noopener">Wyznacz trasę</a>' + wroc + '</span>' : '';
    }
    $$('.pl').forEach(function (x) { x.classList.toggle('pl-akt', !!p && x.dataset.id === p.id); });
  }
  /* Google Maps JavaScript API: znaczniki w kolorach marki, karta placówki po kliknięciu */
  function apiLaduj(cb) {
    if (window.google && google.maps && google.maps.Map) { cb(); return; }
    GKOL.push(cb); if (GKOL.length > 1) return;
    window.jbGm = function () { var l = GKOL; GKOL = []; l.forEach(function (fn) { fn(); }); };
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(GK) + '&callback=jbGm&language=pl&region=PL&loading=async';
    document.head.appendChild(s);
  }
  function ikona(p, n) {
    var dh = p.typ === 'dh', s = dh ? 40 : 30, r = p.typ === 'bar' ? s / 2 : 7;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (s + 4) + '" height="' + (s + 4) + '"><rect x="3.5" y="3.5" width="' + s + '" height="' + s + '" rx="' + r + '" fill="#1d1d1b"/>'
      + '<rect x="1" y="1" width="' + (s - 1) + '" height="' + (s - 1) + '" rx="' + r + '" fill="#ec691a" stroke="' + (dh ? '#5f060f' : '#ffffff') + '" stroke-width="' + (dh ? 3 : 1.5) + '"/>'
      + '<text x="' + (s / 2 + .5) + '" y="' + (s / 2 + 5) + '" font-family="Arial" font-weight="700" font-size="13" text-anchor="middle" fill="' + (dh ? '#5f060f' : '#1d1d1b') + '">' + n + '</text></svg>';
    return { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), anchor: new google.maps.Point(s / 2, s / 2) };
  }
  function apiMapa(el, id) {
    el.setAttribute('data-tryb', 'api');
    apiLaduj(function () {
      if (!GMAP || !el.contains(GMAP.getDiv())) {
        el.innerHTML = ''; var d = document.createElement('div'); d.className = 'gm'; el.appendChild(d);
        GMAP = new google.maps.Map(d, { center: { lat: 50.06, lng: 19.92 }, zoom: 12, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: 'cooperative' });
        GINFO = new google.maps.InfoWindow(); GMARK = {}; GTY = null;
        var bb = new google.maps.LatLngBounds();
        D.pl.forEach(function (p, i) {
          var m = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map: GMAP, title: p.nz, icon: ikona(p, ETYK[p.id]), zIndex: p.typ === 'dh' ? 20 : 10 });
          m.addListener('click', function () { mapaAll(el, p.id); }); GMARK[p.id] = m; bb.extend(m.getPosition());
        });
        GMAP.fitBounds(bb, 36);
      }
      if (TY) {
        if (!GTY) GTY = new google.maps.Marker({ map: GMAP, title: 'Twoje położenie', zIndex: 30, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1a73e8', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } });
        GTY.setPosition(TY);
      } else if (GTY) { GTY.setMap(null); GTY = null; }
      var p = id && PL[id];
      if (p) {
        if (TY) { var b2 = new google.maps.LatLngBounds(); b2.extend(TY); b2.extend({ lat: p.lat, lng: p.lng }); GMAP.fitBounds(b2, 80); }
        else { GMAP.panTo({ lat: p.lat, lng: p.lng }); if (GMAP.getZoom() < 15) GMAP.setZoom(15); }
        GINFO.setContent('<div class="gm-k"><b>' + esc(p.nz) + '</b><span>' + esc(stTxt(id)) + '</span><span class="gm-a"><a href="' + p.u + '">Godziny i dojazd</a><a href="' + trasa(p) + '" target="_blank" rel="noopener">Wyznacz trasę</a></span></div>');
        GINFO.open({ map: GMAP, anchor: GMARK[id] });
      } else if (GINFO) GINFO.close();
    });
  }
  /* mapa wszystkich placówek; id = wybrana placówka, null = wszystkie */
  function mapaAll(el, id) {
    var p = id ? PL[id] : null;
    if (p) el.setAttribute('data-akt', id); else el.removeAttribute('data-akt');
    if (!zgMapy()) { zaslepkaAll(el, p); podpis(el, p, false); return; }
    if (GK) { apiMapa(el, id); podpis(el, p, false); return; }
    if (p) { iframe(el, gUrl(p), 'Mapa Google: ' + p.nz); el.setAttribute('data-tryb', 'jedna'); podpis(el, p, true); return; }
    if (MM) { iframe(el, MM, 'Mapa Google: wszystkie placówki Jubilat'); el.setAttribute('data-tryb', 'mymaps'); podpis(el, null); return; }
    /* bez klucza i bez My Maps: Mapa Google z wynikami wyszukiwania sklepów Jubilat w Krakowie (działa bez uprawnień) */
    iframe(el, 'https://maps.google.com/maps?q=' + encodeURIComponent('Jubilat sklep spożywczo-przemysłowy Kraków') + '&ll=50.075,19.89&z=' + (el.clientWidth < 560 ? 11 : 12) + '&hl=pl&output=embed', 'Mapa Google: sklepy Jubilat w Krakowie');
    el.setAttribute('data-tryb', 'wyszukiwanie'); podpis(el, null);
  }
  function ustawMape(el, id) {
    if (el === mapa) { mapaAll(el, id); return; }
    var p = PL[id]; if (!p) return;
    if (!zgMapy()) { zaslepka(el, id); return; }
    iframe(el, gUrl(p), 'Mapa Google: ' + p.nz); el.setAttribute('data-akt', id);
  }
  function startId(el) {
    var id = el.getAttribute('data-mapa');
    if (id === 'all') { mapa = el; return el.getAttribute('data-akt') || null; }
    return id;
  }
  function initMapa(el) { el.setAttribute('data-widac', '1'); ustawMape(el, startId(el)); }
  function dopasuj() {}
  document.addEventListener('click', function (e) {
    if (mapa && e.target.closest('.mp-wszystkie')) mapaAll(mapa, null);
  });
  if (lista) lista.addEventListener('click', function (e) {
    var b = e.target.closest('.na-mapie'); if (!b || !mapa) return;
    var id = b.closest('.pl').dataset.id; mapaAll(mapa, id);
    var r = mapa.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) mapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  var mapy = $$('[data-mapa]');
  mapy.forEach(function (el) { zaslepka(el, startId(el)); });
  if (mapy.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); initMapa(x.target); } });
      }, { rootMargin: '300px' });
      mapy.forEach(function (m) { io.observe(m); });
    } else mapy.forEach(initMapa);
  }
  zastosujZgode();

  /* ---------- licznik karuzeli kolekcji Eleganzy ---------- */
  var lkU = $('#lk'), lkL = $('#lkLicznik');
  if (lkU && lkL) {
    var lkIle = $$('li', lkU).length;
    var lkRys = function () { var w = lkU.firstElementChild ? lkU.firstElementChild.getBoundingClientRect().width + 12 : 1; lkL.textContent = Math.min(lkIle, Math.round(lkU.scrollLeft / w) + 1) + ' / ' + lkIle; };
    lkU.addEventListener('scroll', function () { window.requestAnimationFrame(lkRys); }, { passive: true }); lkRys();
  }
  /* ---------- sekcje zwijane na telefonie, otwarte na komputerze ---------- */
  $$('details.zw-mob').forEach(function (d) { if (window.matchMedia('(min-width: 761px)').matches) d.open = true; });

  /* ---------- skrócona lista placówek na telefonie (strona główna) ---------- */
  var lw = $('#listaWiecej'), ls = $('.lista-skrot');
  if (lw && ls) {
    var rozwin = function () { ls.classList.add('cala'); lw.hidden = true; };
    lw.addEventListener('click', rozwin);
    $$('.seg button, #tylkoOtw, #geoBtn').forEach(function (x) { x.addEventListener(x.id === 'tylkoOtw' ? 'change' : 'click', rozwin); });
  }

  /* ---------- półka produktów ---------- */
  var polka = $('#polka');
  $$('.strzalki button').forEach(function (b) {
    b.addEventListener('click', function () {
      var cel = document.getElementById(b.parentNode.getAttribute('data-cel') || 'polka') || polka; if (!cel) return;
      cel.scrollBy({ left: +b.dataset.kier * cel.clientWidth * 0.8, behavior: 'smooth' });
    });
  });

  /* ---------- lightbox (lookbook, strony gazetki) ---------- */
  var lbx = $('#lbx');
  if (lbx) {
    var items = $$('[data-lbx]'), cur = 0, lbImg = $('#lbxImg'), lbOpis = $('#lbxOpis'), lbNr = $('#lbxNr');
    var pokaz = function (i) {
      cur = (i + items.length) % items.length;
      var b = items[cur], im = $('img', b), fc = b.parentNode.querySelector('figcaption');
      lbImg.src = b.getAttribute('data-duze') || im.currentSrc || im.src; lbImg.alt = im.alt;
      lbOpis.textContent = fc ? fc.textContent : im.alt;
      lbNr.textContent = (cur + 1) + ' / ' + items.length;
    };
    items.forEach(function (b, i) {
      b.addEventListener('click', function () { pokaz(i); if (lbx.showModal) lbx.showModal(); else lbx.setAttribute('open', ''); document.body.style.overflow = 'hidden'; });
    });
    var zamknijLb = function () { if (lbx.close) lbx.close(); else lbx.removeAttribute('open'); document.body.style.overflow = ''; };
    lbx.addEventListener('close', function () { document.body.style.overflow = ''; if (items[cur]) items[cur].focus(); });
    $('#lbxZ').addEventListener('click', zamknijLb);
    $('#lbxP').addEventListener('click', function () { pokaz(cur - 1); });
    $('#lbxN').addEventListener('click', function () { pokaz(cur + 1); });
    lbx.addEventListener('click', function (e) { if (e.target === lbx) zamknijLb(); });
    lbx.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') pokaz(cur - 1); if (e.key === 'ArrowRight') pokaz(cur + 1); });
    var x0 = null;
    lbx.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lbx.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) pokaz(cur + (d < 0 ? 1 : -1)); x0 = null; });
  }

  /* ---------- wysyłka formularzy (REST WordPress; tryb pokazowy: data-demo) ---------- */
  var T0 = Math.floor(Date.now() / 1000);
  function pokazWynik(w, txt, blad) { w.hidden = false; w.textContent = txt; w.classList.toggle('blad', !!blad); }
  function wyslij(form, dane, w) {
    var hp = form.querySelector('[name="www"]'); dane.www = hp ? hp.value : ''; dane.t = T0;
    var btn = form.querySelector('[type="submit"]');
    if (form.hasAttribute('data-demo') || !form.getAttribute('data-endpoint')) {
      pokazWynik(w, 'Wersja testowa: formularz jest gotowy, ale wiadomość nie została wysłana. Po uruchomieniu strony trafi do Spółdzielni.'); return;
    }
    if (btn) btn.disabled = true;
    fetch(form.getAttribute('data-endpoint'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dane) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok, msg: j.msg }; }); })
      .then(function (x) { pokazWynik(w, x.msg || (x.ok ? 'Dziękujemy, wiadomość została wysłana.' : 'Nie udało się wysłać wiadomości.'), !x.ok); if (x.ok) form.reset(); })
      .catch(function () { pokazWynik(w, 'Nie udało się wysłać wiadomości. Zadzwoń: 12 422 80 40.', true); })
      .then(function () { if (btn) btn.disabled = false; });
  }

  /* ---------- formularz wynajmu (podgląd wiadomości + wysyłka) ---------- */
  var wf = $('#wynForm');
  if (wf) {
    var F = { typ: 'sala', biuro: '' };
    var NAZWY = { sala: 'sali konferencyjnej', biuro: 'biura', lokal: 'lokalu użytkowego przy ul. Machaya 1 (122 m²)', magazyn: 'powierzchni magazynowej' };
    var TELE = { sala: ['+48126193398', '12 619 33 98'], biuro: ['+48126193419', '12 619 34 19'], lokal: ['+48126193419', '12 619 34 19'], magazyn: ['+48126193419', '12 619 34 19'] };
    var v = function (id) { var x = document.getElementById(id); return x ? x.value.trim() : ''; };
    var tekst = function () {
      var L1 = ['Dzień dobry,', '', 'jestem zainteresowany/a wynajmem ' + NAZWY[F.typ] + ' w Handlowej Spółdzielni Jubilat.'];
      if (F.typ === 'sala') {
        if (v('fData')) { var a = v('fData').split('-'); L1.push('Termin: ' + (+a[2]) + ' ' + MIES[+a[1] - 1] + ' ' + a[0] + '.'); }
        if (v('fOsoby')) L1.push('Liczba osób: ' + v('fOsoby') + '.');
      }
      if (F.typ === 'biuro' && F.biuro) L1.push('Interesuje mnie biuro o powierzchni ' + F.biuro + '.');
      if (F.typ === 'magazyn' && v('fM2')) L1.push('Potrzebna powierzchnia: ok. ' + v('fM2') + ' m².');
      if (F.typ !== 'sala') L1.push('Termin: ' + (v('fOd') || 'od zaraz') + '.');
      if (v('fOpis')) L1.push('', v('fOpis'));
      L1.push('', 'Proszę o informację o dostępności i warunkach najmu.', '', 'Pozdrawiam');
      if (v('fImie')) L1.push(v('fImie'));
      if (v('fTel')) L1.push('tel. ' + v('fTel'));
      if (v('fEmail')) L1.push(v('fEmail'));
      return L1.join('\n');
    };
    var odswiez = function () {
      $$('.pola[data-dla]', wf).forEach(function (p) { p.hidden = p.dataset.dla.split(' ').indexOf(F.typ) < 0; });
      var t = tekst();
      $('#podglad').textContent = t;
      $('#wynTel').href = 'tel:' + TELE[F.typ][0]; $('#wynTel').textContent = 'lub zadzwoń: ' + TELE[F.typ][1];
    };
    $$('.chipy', wf).forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        $$('button', g).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        F[g.dataset.p] = b.dataset.v; odswiez();
      });
    });
    wf.addEventListener('input', odswiez);
    wf.addEventListener('submit', function (e) {
      e.preventDefault();
      var w = $('#wynWynik');
      if (!v('fImie') || (!v('fTel') && !v('fEmail'))) { pokazWynik(w, 'Podaj imię oraz telefon albo e-mail, żebyśmy mogli odpowiedzieć.', true); return; }
      wyslij(wf, { typ: 'wynajem', imie: v('fImie'), tel: v('fTel'), email: v('fEmail'), temat: NAZWY[F.typ].replace(' przy ul. Machaya 1 (122 m²)', ', ul. Machaya 1'), wiad: tekst() }, w);
    });
    $('#wynKopiuj').addEventListener('click', function () {
      var b = this, gotowe = function () { b.textContent = 'Skopiowano'; setTimeout(function () { b.textContent = 'Kopiuj treść'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(tekst()).then(gotowe, gotowe); else gotowe();
    });
    odswiez();
  }

  /* ---------- formularz kontaktowy ---------- */
  var kf = $('#kontaktForm');
  if (kf) kf.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!kf.checkValidity()) { kf.reportValidity(); return; }
    var d = {}; new FormData(kf).forEach(function (val, k) { d[k] = val; });
    d.typ = 'kontakt';
    wyslij(kf, d, $('#formWynik'));
  });

  /* ---------- menu mobilne i dolny pasek ---------- */
  var burger = $('.burger'), panel = $('#panel');
  function zamknij() { panel.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Otwórz menu'); document.body.style.overflow = ''; }
  if (burger) {
    burger.addEventListener('click', function () {
      var o = panel.hidden; panel.hidden = !o; burger.setAttribute('aria-expanded', String(o)); burger.setAttribute('aria-label', o ? 'Zamknij menu' : 'Otwórz menu');
      document.body.style.overflow = o ? 'hidden' : '';
    });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) zamknij(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { zamknij(); burger.focus(); } });
  }
  var mob = $('#mob'), cel = $('.hero-cta') || $('.bh-cta') || $('.elx-cta') || $('.elh-cta') || $('.ph-meta') || $('.ph h1') || $('.art h1');
  if (mob && cel && 'IntersectionObserver' in window) {
    var zaCel = false, stopkaWidac = false, st = $('.stopka');
    var rysujMob = function () { mob.classList.toggle('widac', zaCel && !stopkaWidac); document.body.classList.toggle('mob-on', zaCel && !stopkaWidac); };
    new IntersectionObserver(function (en) { zaCel = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; rysujMob(); }).observe(cel);
    if (st) new IntersectionObserver(function (en) { stopkaWidac = en[0].isIntersecting; rysujMob(); }).observe(st);
  }

  /* ---------- start ---------- */
  function wszystko() { T = teraz(); DZIS = dzien(T, 0).k; rysujStatusy(); rysujDzis(); rysujDaty(); rysujMenu(); filtruj(); }
  wszystko();
  /* ---------- menu baru: zakładki dni (telefon), dziś otwarte domyślnie ---------- */
  $$('.menu-karta').forEach(function (k) {
    var tabs = $$('.menu-dni button', k), ul = $('.menu-t', k); if (!tabs.length || !ul) return;
    var wybierz = function (d) {
      tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-dzien') === d)); });
      $$('li[data-dzien]', ul).forEach(function (li) { li.classList.toggle('wyb', li.getAttribute('data-dzien') === d); });
    };
    tabs.forEach(function (b) { b.addEventListener('click', function () { wybierz(b.getAttribute('data-dzien')); }); });
    var dz = $('li.dzisiaj', ul); wybierz(dz ? dz.getAttribute('data-dzien') : '1');
    if (dz) { var t = k.querySelector('.menu-dni button[data-dzien="' + dz.getAttribute('data-dzien') + '"]'); if (t) t.classList.add('dzis'); }
  });
  setInterval(wszystko, 60000);
})();
