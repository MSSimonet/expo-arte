/**
 * Generador de afiches/carteles QR por grado (1° a 7°) + cartel general, listos para imprimir en A4.
 * Los códigos QR provienen de archivos PNG estáticos en la carpeta QR/.
 */
(function (global) {
  'use strict';

  var els = {
    layout: document.getElementById('qrLayout'),
    btnPrint: document.getElementById('btnPrintAll'),
    checks: document.getElementById('qrChecks'),
    wrap: document.getElementById('qrSheetWrap')
  };

  var selectedIds = { general: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true };

  // Carteles terminados (imagen completa con su QR): el general es vertical, los de grado son horizontales.
  var QR_IMAGE_MAP = {
    general: 'QR/cartel-general.jpg',
    1: 'QR/cartel-1.jpg',
    2: 'QR/cartel-2.jpg',
    3: 'QR/cartel-3.jpg',
    4: 'QR/cartel-4.jpg',
    5: 'QR/cartel-5.jpg',
    6: 'QR/cartel-6.jpg',
    7: 'QR/cartel-7.jpg'
  };

  var QR_DOWNLOAD_MAP = {
    general: 'cartel-general.jpg',
    1: 'cartel-1.jpg',
    2: 'cartel-2.jpg',
    3: 'cartel-3.jpg',
    4: 'cartel-4.jpg',
    5: 'cartel-5.jpg',
    6: 'cartel-6.jpg',
    7: 'cartel-7.jpg'
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderChecks() {
    var html = '<label class="qr-check"><input type="checkbox" data-pick="general"' + (selectedIds.general ? ' checked' : '') + ' /> Cartel general (Entrada)</label>';
    (global.SALAS_DEFAULT || []).forEach(function (s) {
      html += '<label class="qr-check"><input type="checkbox" data-pick="' + s.id + '"' + (selectedIds[s.id] ? ' checked' : '') + ' /> ' + escapeHtml(s.grado) + ' grado</label>';
    });
    if (els.checks) {
      els.checks.innerHTML = html;
    }
  }

  function renderPosters() {
    if (!els.wrap) return;

    var layoutVal = els.layout ? els.layout.value : '1up';
    els.wrap.className = 'qr-sheet-wrap ' + (layoutVal === '2up' ? 'layout-2up' : 'layout-1up');

    var cards = [];
    if (selectedIds.general) {
      cards.push({
        key: 'general',
        title: 'Toda la muestra',
        orient: 'v',
        qrSrc: QR_IMAGE_MAP.general,
        filename: QR_DOWNLOAD_MAP.general
      });
    }

    (global.SALAS_DEFAULT || []).forEach(function (s) {
      if (!selectedIds[s.id]) return;
      cards.push({
        key: 'sala-' + s.id,
        title: s.grado + ' grado',
        orient: 'h',
        qrSrc: QR_IMAGE_MAP[s.id] || ('QR/cartel-' + s.id + '.jpg'),
        filename: QR_DOWNLOAD_MAP[s.id] || ('cartel-' + s.id + '.jpg')
      });
    });

    if (!cards.length) {
      els.wrap.innerHTML = '<div class="estado-vacio">Marcá al menos un grado arriba para ver o imprimir su afiche QR.</div>';
      return;
    }

    var html = '';
    cards.forEach(function (c, i) {
      html += '<article class="qr-poster qr-poster-' + c.orient + '">'
        + '<img class="qr-poster-img" src="' + escapeHtml(c.qrSrc) + '" alt="Cartel con código QR: ' + escapeHtml(c.title) + '" loading="eager" decoding="async" />'
        + '<div class="qr-poster-actions">'
        + '<button type="button" class="btn btn-primary" data-dl-qr="' + i + '">Descargar cartel</button>'
        + '</div>'
        + '</article>';
    });
    els.wrap.innerHTML = html;

    els.wrap.querySelectorAll('[data-dl-qr]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-dl-qr'), 10);
        var card = cards[idx];
        if (!card || !card.qrSrc) return;
        var a = document.createElement('a');
        a.href = card.qrSrc;
        a.download = card.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    });
  }

  function init() {
    renderChecks();
    renderPosters();

    if (els.layout) {
      els.layout.addEventListener('change', renderPosters);
    }
    if (els.checks) {
      els.checks.addEventListener('change', function (e) {
        var pick = e.target.getAttribute('data-pick');
        if (pick) {
          selectedIds[pick] = e.target.checked;
          renderPosters();
        }
      });
    }
    if (els.btnPrint) {
      els.btnPrint.addEventListener('click', function () {
        global.print();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
