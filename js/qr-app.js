/**
 * Generador local de códigos QR por grado (1° a 7°) + cartel general, listos para imprimir en A4.
 */
(function (global) {
  'use strict';

  var els = {
    baseUrl: document.getElementById('qrBaseUrl'),
    layout: document.getElementById('qrLayout'),
    btnPrint: document.getElementById('btnPrintAll'),
    warning: document.getElementById('qrLocalWarning'),
    checks: document.getElementById('qrChecks'),
    wrap: document.getElementById('qrSheetWrap')
  };

  var selectedIds = { general: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inferDefaultBaseUrl() {
    var loc = global.location;
    if (loc.protocol === 'https:' || loc.protocol === 'http:') {
      var dir = loc.pathname.replace(/[^/]*$/, '');
      return loc.origin + dir;
    }
    return 'https://tu-usuario.github.io/pequenos-grandes-artistas/';
  }

  function normalizeBaseUrl(raw) {
    var clean = String(raw || '').trim();
    if (!clean) clean = inferDefaultBaseUrl();
    clean = clean.replace(/index\.html$/i, '').replace(/qr-imprimir\.html$/i, '');
    if (!/\/$/.test(clean) && clean.indexOf('?') === -1) clean += '/';
    return clean;
  }

  function updateLocalWarning(url) {
    var isLocal = /^file:|^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url) || url.indexOf('tu-usuario.github.io') !== -1;
    els.warning.hidden = !isLocal;
  }

  function renderChecks() {
    var html = '<label class="qr-check"><input type="checkbox" data-pick="general"' + (selectedIds.general ? ' checked' : '') + ' /> Cartel general (Entrada)</label>';
    global.SALAS_DEFAULT.forEach(function (s) {
      html += '<label class="qr-check"><input type="checkbox" data-pick="' + s.id + '"' + (selectedIds[s.id] ? ' checked' : '') + ' /> ' + escapeHtml(s.grado) + ' grado</label>';
    });
    els.checks.innerHTML = html;
  }

  function buildTargetUrl(baseUrl, salaId) {
    if (!salaId) return baseUrl;
    var sep = baseUrl.indexOf('?') === -1 ? '?' : '&';
    return baseUrl + sep + 'sala=' + salaId;
  }

  async function renderPosters() {
    var baseUrl = normalizeBaseUrl(els.baseUrl.value);
    updateLocalWarning(baseUrl);

    els.wrap.className = 'qr-sheet-wrap ' + (els.layout.value === '2up' ? 'layout-2up' : 'layout-1up');

    var cards = [];
    if (selectedIds.general) {
      cards.push({
        key: 'general',
        title: 'Toda la muestra',
        subtitle: '1° a 7° grado · Muestra de arte',
        hint: 'Escaneá el código con tu celular para recorrer todas las salas de la exposición.',
        color: '#14532f',
        url: buildTargetUrl(baseUrl, null),
        filename: 'qr-muestra-general.png'
      });
    }

    global.SALAS_DEFAULT.forEach(function (s) {
      if (!selectedIds[s.id]) return;
      cards.push({
        key: 'sala-' + s.id,
        title: s.grado + ' grado',
        subtitle: s.nombre,
        hint: 'Escaneá el código con tu celular para ver las obras de ' + s.grado + ' grado y recorrer el resto de la muestra.',
        color: s.color_dark,
        url: buildTargetUrl(baseUrl, s.id),
        filename: 'qr-sala-' + s.id + '-grado.png'
      });
    });

    if (!cards.length) {
      els.wrap.innerHTML = '<div class="estado-vacio">Marcá al menos un grado arriba para generar su cartel QR.</div>';
      return;
    }

    var html = '';
    cards.forEach(function (c, i) {
      html += '<article class="qr-poster" style="--poster-color:' + escapeHtml(c.color) + '">'
        + '<header class="qr-poster-band">'
        + '<div class="qr-poster-school">' + escapeHtml(global.EXPO_CONFIG.schoolName) + '</div>'
        + '<h2 class="qr-poster-title">' + escapeHtml(global.EXPO_CONFIG.expoTitle) + '</h2>'
        + '</header>'
        + '<div class="qr-poster-body">'
        + '<div class="qr-poster-grade">' + escapeHtml(c.title) + '</div>'
        + '<div class="qr-poster-shift">' + escapeHtml(c.subtitle) + '</div>'
        + '<div class="qr-code-box"><img id="qr-img-' + i + '" alt="Código QR para ' + escapeHtml(c.title) + '" /></div>'
        + '<p class="qr-poster-hint">' + escapeHtml(c.hint) + '</p>'
        + '<div class="qr-poster-url">' + escapeHtml(c.url) + '</div>'
        + '<div class="qr-poster-date">' + escapeHtml(global.EXPO_CONFIG.expoDate) + '</div>'
        + '<div class="qr-poster-actions">'
        + '<a class="btn" href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener">Probar enlace</a>'
        + '<button type="button" class="btn btn-primary" data-dl-qr="' + i + '">Descargar PNG</button>'
        + '</div>'
        + '</div></article>';
    });
    els.wrap.innerHTML = html;

    for (var i = 0; i < cards.length; i++) {
      var imgEl = document.getElementById('qr-img-' + i);
      if (imgEl && global.QRCode && typeof global.QRCode.toDataURL === 'function') {
        var dataUrl = await global.QRCode.toDataURL(cards[i].url, {
          width: 640,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#111820', light: '#ffffff' }
        });
        imgEl.src = dataUrl;
        cards[i].dataUrl = dataUrl;
      }
    }

    els.wrap.querySelectorAll('[data-dl-qr]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-dl-qr'), 10);
        var card = cards[idx];
        if (!card || !card.dataUrl) return;
        var a = document.createElement('a');
        a.href = card.dataUrl;
        a.download = card.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    });
  }

  function init() {
    els.baseUrl.value = inferDefaultBaseUrl();
    renderChecks();
    renderPosters();

    els.baseUrl.addEventListener('input', renderPosters);
    els.layout.addEventListener('change', renderPosters);
    els.checks.addEventListener('change', function (e) {
      var pick = e.target.getAttribute('data-pick');
      if (pick) {
        selectedIds[pick] = e.target.checked;
        renderPosters();
      }
    });
    els.btnPrint.addEventListener('click', function () {
      global.print();
    });
  }

  init();
})(window);
