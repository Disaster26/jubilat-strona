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
    if (mapa) rysujMarkery();
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
      if (poz) { poz = null; gb.classList.remove('on'); gi.hidden = true; filtruj(); return; }
      if (!navigator.geolocation) { gi.hidden = false; gi.textContent = 'Ta przeglądarka nie udostępnia lokalizacji.'; return; }
      gi.hidden = false; gi.textContent = 'Ustalamy Twoje położenie…';
      navigator.geolocation.getCurrentPosition(function (p) {
        poz = { lat: p.coords.latitude, lng: p.coords.longitude };
        gb.classList.add('on'); filtruj();
        var n = D.pl.slice().sort(function (a, b) { return km(poz, a) - km(poz, b); })[0];
        gi.textContent = 'Najbliżej: ' + n.n + ', ' + fOdl(km(poz, n)) + '. Lista posortowana od najbliższej placówki. Kliknij ponownie, żeby wyłączyć.';
        if (mapa) mapa.setView([n.lat, n.lng], 14);
      }, function () { gi.textContent = 'Bez dostępu do lokalizacji pokazujemy listę w zwykłej kolejności.'; }, { timeout: 10000, maximumAge: 300000 });
    });
  }

  /* ---------- mapa (Leaflet wczytywany dopiero przy przewinięciu) ---------- */
  var mapa = null, markery = {}, lfLaduje = null;
  function wczytajLeaflet() {
    if (window.L) return Promise.resolve();
    if (lfLaduje) return lfLaduje;
    lfLaduje = new Promise(function (ok, bl) {
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = ROOT + 'assets/vendor/leaflet/leaflet.css'; document.head.appendChild(c);
      var s = document.createElement('script'); s.src = ROOT + 'assets/vendor/leaflet/leaflet.js'; s.onload = ok; s.onerror = bl; document.head.appendChild(s);
    });
    return lfLaduje;
  }
  function ikona(p, otw, akt) {
    var dh = p.typ === 'dh';
    return L.divIcon({ className: '', iconSize: dh ? [38, 38] : [26, 26], iconAnchor: dh ? [19, 19] : [13, 13],
      html: '<div class="pin' + (dh ? ' dh' : '') + (p.typ === 'bar' ? ' bar' : '') + (otw ? '' : ' zamk') + (akt ? ' pin-akt' : '') + '"></div>' });
  }
  function rysujMarkery() {
    D.pl.forEach(function (p) {
      var li = lista && document.getElementById('pl-' + p.id), widac = !li || !li.hidden;
      var s = status(p.g);
      if (!widac) { if (markery[p.id]) { mapa.removeLayer(markery[p.id]); delete markery[p.id]; } return; }
      if (!markery[p.id]) {
        markery[p.id] = L.marker([p.lat, p.lng], { icon: ikona(p, s.otw), title: p.n, zIndexOffset: p.typ === 'dh' ? 500 : 0 }).addTo(mapa);
        markery[p.id].on('click', function () { var el = document.getElementById('pl-' + p.id); $$('.pl.pl-akt').forEach(function (x) { x.classList.remove('pl-akt'); }); if (el) { el.classList.add('pl-akt'); } });
      }
      markery[p.id].setIcon(ikona(p, s.otw)).bindPopup('<b>' + p.n + '</b><br>' + s.txt + '<br><a href="' + (/^https?:/.test(p.u) ? p.u : ROOT + p.u) + '">Godziny i dojazd</a>');
    });
  }
  function dopasuj() {
    if (!mapa || !window.L) return;
    var pts = Object.keys(markery).map(function (k) { return markery[k].getLatLng(); });
    if (pts.length) mapa.fitBounds(L.latLngBounds(pts).pad(0.12), { maxZoom: 15 });
  }
  function initMapa(el) {
    wczytajLeaflet().then(function () {
      var id = el.getAttribute('data-mapa');
      var m = L.map(el, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      m.attributionControl.setPrefix(false);
      if (id === 'all') { mapa = m; rysujMarkery(); dopasuj(); }
      else {
        var p = PL[id]; if (!p) return;
        L.marker([p.lat, p.lng], { icon: ikona(p, status(p.g).otw, true), title: p.n }).addTo(m);
        m.setView([p.lat, p.lng], 16);
      }
    }).catch(function () {});
  }
  var mapy = $$('[data-mapa]');
  if (mapy.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); initMapa(x.target); } });
      }, { rootMargin: '200px' });
      mapy.forEach(function (m) { io.observe(m); });
    } else mapy.forEach(initMapa);
  }

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
  var mob = $('#mob'), cel = $('.hero-cta') || $('.elh-cta') || $('.ph-meta') || $('.ph h1') || $('.art h1');
  if (mob && cel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { mob.classList.toggle('widac', !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(cel);
  }

  /* ---------- start ---------- */
  function wszystko() { T = teraz(); DZIS = dzien(T, 0).k; rysujStatusy(); rysujDzis(); rysujDaty(); rysujMenu(); filtruj(); }
  wszystko();
  setInterval(wszystko, 60000);
})();
