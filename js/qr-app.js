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

  var QR_IMAGE_MAP = {
    general: 'QR/qr_general.png',
    1: 'QR/qr_1ro.png',
    2: 'QR/qr_2do.png',
    3: 'QR/qr_3ro.png',
    4: 'QR/qr_4to.png',
    5: 'QR/qr_5to.png',
    6: 'QR/qr_6to.png',
    7: 'QR/qr_7mo.png'
  };

  var QR_DOWNLOAD_MAP = {
    general: 'qr_general.png',
    1: 'qr_1ro.png',
    2: 'qr_2do.png',
    3: 'qr_3ro.png',
    4: 'qr_4to.png',
    5: 'qr_5to.png',
    6: 'qr_6to.png',
    7: 'qr_7mo.png'
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
        subtitle: '1° a 7° grado · Muestra de arte',
        hint: 'Escaneá el código con tu celular para recorrer todas las salas de la exposición.',
        color: '#14532f',
        qrSrc: QR_IMAGE_MAP.general,
        filename: QR_DOWNLOAD_MAP.general
      });
    }

    (global.SALAS_DEFAULT || []).forEach(function (s) {
      if (!selectedIds[s.id]) return;
      cards.push({
        key: 'sala-' + s.id,
        title: s.grado + ' grado',
        subtitle: s.nombre,
        hint: 'Escaneá el código con tu celular para ver las obras de ' + s.grado + ' grado y recorrer el resto de la muestra.',
        color: s.color_dark,
        qrSrc: QR_IMAGE_MAP[s.id] || ('QR/qr_' + s.id + '.png'),
        filename: QR_DOWNLOAD_MAP[s.id] || ('qr_sala_' + s.id + '.png')
      });
    });

    if (!cards.length) {
      els.wrap.innerHTML = '<div class="estado-vacio">Marcá al menos un grado arriba para ver o imprimir su afiche QR.</div>';
      return;
    }

    var html = '';
    cards.forEach(function (c, i) {
      html += '<article class="qr-poster" style="--poster-color:' + escapeHtml(c.color) + '">'
        + '<header class="qr-poster-band">'
        + '<div class="qr-poster-school">' + escapeHtml(global.EXPO_CONFIG ? global.EXPO_CONFIG.schoolName : '') + '</div>'
        + '<h2 class="qr-poster-title">' + escapeHtml(global.EXPO_CONFIG ? global.EXPO_CONFIG.expoTitle : 'Exposición de Arte') + '</h2>'
        + '</header>'
        + '<div class="qr-poster-body">'
        + '<div class="qr-poster-grade">' + escapeHtml(c.title) + '</div>'
        + '<div class="qr-poster-shift">' + escapeHtml(c.subtitle) + '</div>'
        + '<div class="qr-code-box"><img src="' + escapeHtml(c.qrSrc) + '" alt="Código QR para ' + escapeHtml(c.title) + '" loading="eager" /></div>'
        + '<p class="qr-poster-hint">' + escapeHtml(c.hint) + '</p>'
        + '<div class="qr-poster-date">' + escapeHtml(global.EXPO_CONFIG ? global.EXPO_CONFIG.expoDate : '') + '</div>'
        + '<div class="qr-poster-actions">'
        + '<button type="button" class="btn btn-primary" data-dl-qr="' + i + '">Descargar código QR</button>'
        + '</div>'
        + '</div></article>';
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
