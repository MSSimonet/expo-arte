/**
 * Lógica de la muestra pública — Pequeños grandes artistas
 * Soporta entrada directa por QR (?sala=1..7), navegación por salas, zoom/descarga, Me gusta y libro de visitas.
 */
(function (global) {
  'use strict';

  var state = {
    salas: [],
    obras: [],
    mensajes: [],
    mode: 'demo',
    qrSalaId: null,
    currentObraIndex: -1,
    mensajesCargados: false,
    tocadas: {}
  };

  // Las primeras fotos de la página se piden con prioridad alta y sin carga diferida; el resto, diferida y con prioridad baja.
  var PRIORIDAD_FOTOS = 6;

  var els = {
    demoStrip: document.getElementById('demoStrip'),
    hero: document.getElementById('inicio'),
    qrArrival: document.getElementById('qrArrival'),
    qrArrivalBadge: document.getElementById('qrArrivalBadge'),
    qrArrivalTitle: document.getElementById('qrArrivalTitle'),
    qrArrivalSubtitle: document.getElementById('qrArrivalSubtitle'),
    btnVerTodas: document.getElementById('btnVerTodas'),
    chipsSalas: document.getElementById('chipsSalas'),
    salasMain: document.getElementById('salas'),
    msgForm: document.getElementById('msgForm'),
    msgAutor: document.getElementById('msgAutor'),
    msgParentesco: document.getElementById('msgParentesco'),
    msgSala: document.getElementById('msgSala'),
    msgTexto: document.getElementById('msgTexto'),
    msgCounter: document.getElementById('msgCounter'),
    msgSubmit: document.getElementById('msgSubmit'),
    msgLista: document.getElementById('msgLista'),
    visor: document.getElementById('visor'),
    vLienzo: document.getElementById('vLienzo'),
    vImg: document.getElementById('vImg'),
    vAutor: document.getElementById('vAutor'),
    vTitulo: document.getElementById('vTitulo'),
    vDonde: document.getElementById('vDonde'),
    vDesc: document.getElementById('vDesc'),
    vLike: document.getElementById('vLike'),
    vLikeTxt: document.getElementById('vLikeTxt'),
    vZoom: document.getElementById('vZoom'),
    vZoomTxt: document.getElementById('vZoomTxt'),
    vDescargar: document.getElementById('vDescargar'),
    vWhatsapp: document.getElementById('vWhatsapp'),
    vCerrar: document.getElementById('vCerrar'),
    vPrev: document.getElementById('vPrev'),
    vNext: document.getElementById('vNext'),
    toast: document.getElementById('toast')
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  var toastTimer = null;
  function showToast(msg, isError) {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.classList.toggle('error', !!isError);
    els.toast.classList.add('visible');
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('visible');
    }, 3200);
  }

  function parseInitialRoute() {
    var params = new URLSearchParams(global.location.search);
    var salaStr = params.get('sala');
    if (!salaStr && global.location.hash) {
      var hashMatch = global.location.hash.match(/^#sala-([1-7])$/);
      if (hashMatch) salaStr = hashMatch[1];
    }
    var n = parseInt(salaStr, 10);
    state.qrSalaId = (n >= 1 && n <= 7) ? n : null;
    return {
      obraId: params.get('obra') || null
    };
  }

  function formatRelativeTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Recién';
    if (diffMin < 60) return 'Hace ' + diffMin + ' min';
    var diffHs = Math.round(diffMin / 60);
    if (diffHs < 24) return 'Hace ' + diffHs + ' h';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  function getOrderedSalas() {
    var ordered = state.salas.slice().sort(function (a, b) { return a.id - b.id; });
    if (!state.qrSalaId) return ordered;
    var scanned = ordered.filter(function (s) { return s.id === state.qrSalaId; });
    var rest = ordered.filter(function (s) { return s.id !== state.qrSalaId; });
    return scanned.concat(rest);
  }

  function updateQrArrivalBanner() {
    state.qrSalaId ? document.body.setAttribute('data-sala', state.qrSalaId) : document.body.removeAttribute('data-sala');
    if (!state.qrSalaId) {
      els.qrArrival.hidden = true;
      els.hero.classList.remove('compacto');
      document.documentElement.style.setProperty('--hero-accent', '#086978');
      return;
    }

    var sala = state.salas.find(function (s) { return s.id === state.qrSalaId; });
    if (!sala) {
      els.qrArrival.hidden = true;
      return;
    }

    els.hero.classList.add('compacto');
    document.documentElement.style.setProperty('--hero-accent', sala.color_dark || '#0b7d8e');
    els.qrArrival.style.setProperty('--arrival-color', sala.color_dark || '#1a5da8');
    els.qrArrivalBadge.textContent = sala.grado + ' grado';
    els.qrArrivalTitle.textContent = 'Escaneaste el QR de ' + sala.nombre.toLowerCase();
    els.qrArrivalSubtitle.textContent = 'Ya estás viendo su sala primero. Si querés, podés recorrer los demás grados desde acá.';
    els.qrArrival.hidden = false;
  }

  function renderNavAndSelects() {
    var chipsHtml = '';
    if (state.qrSalaId) {
      chipsHtml += '<button type="button" class="chip c-all" data-reset-qr>Todas (1° a 7°)</button>';
    }
    state.salas.forEach(function (sala) {
      var isActive = state.qrSalaId === sala.id;
      chipsHtml += '<a class="chip c' + sala.id + (isActive ? ' activa' : '') + '" href="#sala-' + sala.id + '">Sala ' + escapeHtml(sala.grado) + '</a>';
    });
    chipsHtml += '<a class="chip c-msg" href="#mensajes">Mensajes' + (state.mensajesCargados ? ' (' + state.mensajes.length + ')' : '') + '</a>';
    els.chipsSalas.innerHTML = chipsHtml;

    var activeChip = els.chipsSalas.querySelector('.chip.activa');
    if (activeChip) {
      var targetLeft = activeChip.offsetLeft - (els.chipsSalas.clientWidth - activeChip.offsetWidth) / 2;
      els.chipsSalas.scrollLeft = Math.max(0, targetLeft);
    }

    var currentVal = els.msgSala.value;
    var optionsHtml = '<option value="">Toda la exposición</option>';
    state.salas.forEach(function (sala) {
      optionsHtml += '<option value="' + sala.id + '">' + escapeHtml(sala.grado + ' grado — ' + sala.nombre) + '</option>';
    });
    els.msgSala.innerHTML = optionsHtml;
    if (currentVal) {
      els.msgSala.value = currentVal;
    } else if (state.qrSalaId) {
      els.msgSala.value = String(state.qrSalaId);
    }
  }

  function heartSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function renderSalas() {
    var orderedSalas = getOrderedSalas();
    var html = '';
    var fotosDibujadas = 0;

    orderedSalas.forEach(function (sala) {
      var obrasSala = state.obras.filter(function (o) { return Number(o.sala_id) === Number(sala.id); });
      var isHighlighted = state.qrSalaId === sala.id;

      html += '<section class="sala sala-' + sala.id + (isHighlighted ? ' destacada' : '') + '" id="sala-' + sala.id + '" aria-label="Sala de ' + escapeHtml(sala.grado) + ' grado">';
      html += '<div class="sala-cabecera">'
        + '<h2>' + escapeHtml(sala.grado) + ' <em>grado</em></h2>'
        + '<div class="sala-subbar">'
        + '<span class="pastilla">' + escapeHtml(sala.nombre) + ' · ' + obrasSala.length + (obrasSala.length === 1 ? ' obra' : ' obras') + '</span>'
        + '</div>';

      var desc = sala.desc_a || sala.desc_b || '';
      if (desc) {
        html += '<p class="sala-desc">' + escapeHtml(desc) + '</p>';
      }
      html += '</div>';

      if (!obrasSala.length) {
        html += '<div class="estado-vacio">Todavía no se cargaron obras en ' + escapeHtml(sala.grado) + ' grado.</div>';
      } else {
        html += '<div class="galeria">';
        obrasSala.forEach(function (obra) {
          var idx = state.obras.indexOf(obra);
          var primaryLabel = obra.autor || obra.titulo || (sala.grado + ' grado');
          var primaryClass = (obra.autor || obra.titulo) ? 'obra-autor' : 'obra-autor sin-firma';
          var secondaryLabel = (obra.autor && obra.titulo) ? obra.titulo : '';
          var liked = global.ExpoStore.isObraLiked(obra.id);
          var likesCount = Number(obra.likes_count) || 0;
          var alt = 'Obra' + (obra.autor ? ' de ' + obra.autor : (obra.titulo ? ': ' + obra.titulo : '')) + ', ' + sala.grado + ' grado';
          var esPrioritaria = fotosDibujadas < PRIORIDAD_FOTOS;
          fotosDibujadas++;
          var atributosCarga = esPrioritaria ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" fetchpriority="low" decoding="async"';

          html += '<article class="obra-card" data-obra-idx="' + idx + '" data-obra-id="' + escapeHtml(obra.id) + '">'
            + '<button type="button" class="obra-trigger" data-open-obra="' + idx + '" aria-label="Ver en grande: ' + escapeHtml(alt) + '">'
            + '<span class="lienzo"><img src="' + escapeHtml(obra.thumb_url || obra.imagen_url) + '" alt="' + escapeHtml(alt) + '"' + atributosCarga + ' /></span>'
            + '</button>'
            + '<div class="obra-pie">'
            + '<div class="obra-meta">'
            + '<span class="' + primaryClass + '">' + escapeHtml(primaryLabel) + '</span>'
            + (secondaryLabel ? '<span class="obra-titulo">' + escapeHtml(secondaryLabel) + '</span>' : '')
            + '</div>'
            + '<button type="button" class="like-btn" data-like-id="' + escapeHtml(obra.id) + '" aria-pressed="' + (liked ? 'true' : 'false') + '" aria-label="Me gusta esta obra (' + likesCount + ')">'
            + heartSvg() + '<span>' + likesCount + '</span>'
            + '</button>'
            + '</div></article>';
        });
        html += '</div>';
      }

      html += '</section>';
    });

    els.salasMain.innerHTML = html;
  }

  function renderMensajes() {
    if (!state.mensajes.length) {
      els.msgLista.innerHTML = '<div class="estado-vacio">Todavía no hay mensajes. ¡Sé la primera familia en dejar un saludo!</div>';
      return;
    }
    var html = '';
    state.mensajes.forEach(function (m) {
      var sala = m.sala_id ? state.salas.find(function (s) { return s.id === Number(m.sala_id); }) : null;
      var tagHtml = sala
        ? '<span class="msg-sala-tag" style="background:' + escapeHtml(sala.color_dark || '#14532f') + '">' + escapeHtml(sala.grado) + ' grado</span>'
        : '<span class="msg-sala-tag" style="background:#14532f">Toda la muestra</span>';

      html += '<article class="msg-item">'
        + '<div class="msg-item-top">'
        + '<span class="msg-autor">' + escapeHtml(m.autor_nombre) + '</span>'
        + tagHtml
        + '</div>'
        + (m.parentesco ? '<div class="msg-parentesco">' + escapeHtml(m.parentesco) + '</div>' : '')
        + '<p class="msg-texto">' + escapeHtml(m.mensaje) + '</p>'
        + '<div class="msg-fecha">' + escapeHtml(formatRelativeTime(m.created_at)) + '</div>'
        + '</article>';
    });
    els.msgLista.innerHTML = html;
  }

  /* ---------- Likes ---------- */
  function syncLikeUI(obraId, count, liked) {
    var obra = state.obras.find(function (o) { return String(o.id) === String(obraId); });
    if (obra) obra.likes_count = count;

    document.querySelectorAll('[data-like-id]').forEach(function (btn) {
      if (btn.getAttribute('data-like-id') === String(obraId)) {
        btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
        btn.setAttribute('aria-label', 'Me gusta esta obra (' + count + ')');
        var span = btn.querySelector('span');
        if (span) span.textContent = String(count);
      }
    });

    if (state.currentObraIndex !== -1) {
      var cur = state.obras[state.currentObraIndex];
      if (cur && String(cur.id) === String(obraId)) {
        els.vLike.setAttribute('aria-pressed', liked ? 'true' : 'false');
        els.vLikeTxt.textContent = 'Me gusta (' + count + ')';
      }
    }
  }

  async function toggleLike(obraId) {
    var obra = state.obras.find(function (o) { return String(o.id) === String(obraId); });
    if (!obra) return;
    state.tocadas[String(obraId)] = true;
    var nextLiked = !global.ExpoStore.isObraLiked(obraId);
    var optimistic = Math.max(0, (Number(obra.likes_count) || 0) + (nextLiked ? 1 : -1));
    syncLikeUI(obraId, optimistic, nextLiked);

    try {
      var confirmedCount = await global.ExpoStore.reactToObra(obraId, nextLiked);
      syncLikeUI(obraId, confirmedCount, nextLiked);
    } catch (err) {
      var rollback = Math.max(0, optimistic + (nextLiked ? -1 : 1));
      syncLikeUI(obraId, rollback, !nextLiked);
      showToast('No se pudo guardar el Me gusta. Intentá de nuevo.', true);
    }
  }

  /* ---------- Visor / Lightbox ---------- */
  function getVisibleIndices() {
    var list = [];
    els.salasMain.querySelectorAll('.obra-card').forEach(function (card) {
      list.push(parseInt(card.getAttribute('data-obra-idx'), 10));
    });
    return list;
  }

  function showObraInVisor(idx) {
    var obra = state.obras[idx];
    if (!obra) return;
    state.currentObraIndex = idx;
    var sala = state.salas.find(function (s) { return s.id === Number(obra.sala_id); }) || { grado: obra.sala_id + '°' };

    els.vLienzo.classList.remove('zoom');
    els.vZoomTxt.textContent = 'Acercar';
    els.vImg.removeAttribute('data-hd');
    els.vImg.setAttribute('data-obra-id', String(obra.id));
    els.vImg.src = obra.thumb_url || obra.imagen_url;
    if (obra.thumb_url && obra.thumb_url !== obra.imagen_url) {
      var grande = new Image();
      grande.onload = function () {
        if (state.currentObraIndex === idx) {
          els.vImg.setAttribute('data-hd', '1'); // marca para que animaciones.js no lo trate como cambio de obra
          els.vImg.src = obra.imagen_url;
        }
      };
      grande.src = obra.imagen_url;
    }
    els.vImg.alt = 'Obra' + (obra.autor ? ' de ' + obra.autor : (obra.titulo ? ': ' + obra.titulo : '')) + ', ' + sala.grado + ' grado';
    els.vAutor.textContent = obra.autor ? 'Obra de ' + obra.autor : (obra.titulo || ('Obra de ' + sala.grado + ' grado'));
    els.vAutor.hidden = !(obra.autor || obra.titulo);

    if (obra.autor && obra.titulo) {
      els.vTitulo.textContent = obra.titulo;
      els.vTitulo.hidden = false;
    } else {
      els.vTitulo.hidden = true;
    }

    els.vDonde.textContent = sala.grado + ' grado — ' + global.EXPO_CONFIG.schoolName;

    if (obra.descripcion) {
      els.vDesc.textContent = obra.descripcion;
      els.vDesc.hidden = false;
    } else {
      els.vDesc.hidden = true;
    }

    var liked = global.ExpoStore.isObraLiked(obra.id);
    els.vLike.setAttribute('aria-pressed', liked ? 'true' : 'false');
    els.vLikeTxt.textContent = 'Me gusta (' + (Number(obra.likes_count) || 0) + ')';

    var shareUrl = global.location.origin + global.location.pathname + '?sala=' + obra.sala_id + '&obra=' + encodeURIComponent(obra.id);
    var shareText = '¡Mirá esta obra de la muestra «' + global.EXPO_CONFIG.expoTitle + '»! '
      + (obra.autor ? 'Es de ' + obra.autor + ', ' : '')
      + 'de ' + sala.grado + ' grado. '
      + shareUrl;
    els.vWhatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(shareText);
  }

  function openVisor(idx) {
    showObraInVisor(idx);
    els.visor.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    els.vCerrar.focus();
  }

  function closeVisor() {
    els.visor.classList.remove('abierto');
    document.body.style.overflow = '';
  }

  function stepVisor(delta) {
    var list = getVisibleIndices();
    var pos = list.indexOf(state.currentObraIndex);
    if (pos === -1 || !list.length) return;
    var nextIdx = list[(pos + delta + list.length) % list.length];
    showObraInVisor(nextIdx);
  }

  async function downloadCurrentObra() {
    var obra = state.obras[state.currentObraIndex];
    if (!obra) return;
    var slug = obra.autor || obra.titulo;
    var fileBase = 'obra-' + obra.sala_id + '-grado' + (slug ? '-' + normalizeText(slug).replace(/[^a-z0-9]+/g, '-') : '');

    try {
      if (obra.imagen_url.indexOf('data:image/svg+xml') === 0) {
        var img = new Image();
        await new Promise(function (resolve, reject) {
          img.onload = resolve;
          img.onerror = reject;
          img.src = obra.imagen_url;
        });
        var canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 900;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var pngBlob = await new Promise(function (res) { canvas.toBlob(res, 'image/png'); });
        triggerBlobDownload(pngBlob, fileBase + '.png');
      } else {
        var resp = await fetch(obra.imagen_url);
        var blob = await resp.blob();
        var ext = blob.type === 'image/webp' ? '.webp' : (blob.type === 'image/png' ? '.png' : '.jpg');
        triggerBlobDownload(blob, fileBase + ext);
      }
      showToast('Descargando la foto de la obra…');
    } catch (_) {
      global.open(obra.imagen_url, '_blank', 'noopener');
    }
  }

  function triggerBlobDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    function clearQrFocus() {
      state.qrSalaId = null;
      if (global.history && global.history.replaceState) {
        global.history.replaceState(null, '', global.location.pathname);
      }
      updateQrArrivalBanner();
      renderNavAndSelects();
      renderSalas();
    }

    els.btnVerTodas.addEventListener('click', clearQrFocus);
    els.chipsSalas.addEventListener('click', function (e) {
      if (e.target.closest('[data-reset-qr]')) {
        clearQrFocus();
      }
    });

    els.salasMain.addEventListener('click', function (e) {
      var likeBtn = e.target.closest('[data-like-id]');
      if (likeBtn) {
        toggleLike(likeBtn.getAttribute('data-like-id'));
        return;
      }
      var trigger = e.target.closest('[data-open-obra]');
      if (trigger) {
        openVisor(parseInt(trigger.getAttribute('data-open-obra'), 10));
      }
    });

    els.vLike.addEventListener('click', function () {
      var obra = state.obras[state.currentObraIndex];
      if (obra) toggleLike(obra.id);
    });
    els.vCerrar.addEventListener('click', closeVisor);
    els.vPrev.addEventListener('click', function () { stepVisor(-1); });
    els.vNext.addEventListener('click', function () { stepVisor(1); });
    els.vDescargar.addEventListener('click', downloadCurrentObra);
    els.vZoom.addEventListener('click', function () {
      var z = els.vLienzo.classList.toggle('zoom');
      els.vZoomTxt.textContent = z ? 'Alejar' : 'Acercar';
    });
    els.vLienzo.addEventListener('click', function () {
      var z = els.vLienzo.classList.toggle('zoom');
      els.vZoomTxt.textContent = z ? 'Alejar' : 'Acercar';
    });
    els.visor.addEventListener('click', function (e) {
      if (e.target === els.visor) closeVisor();
    });
    document.addEventListener('keydown', function (e) {
      if (!els.visor.classList.contains('abierto')) return;
      if (e.key === 'Escape') closeVisor();
      if (e.key === 'ArrowLeft') stepVisor(-1);
      if (e.key === 'ArrowRight') stepVisor(1);
    });

    var touchX = null;
    var touchY = null;
    els.visor.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { touchX = null; return; }
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });
    els.visor.addEventListener('touchend', function (e) {
      if (touchX === null || els.vLienzo.classList.contains('zoom')) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      stepVisor(dx < 0 ? 1 : -1);
    }, { passive: true });

    els.msgTexto.addEventListener('input', function () {
      els.msgCounter.textContent = els.msgTexto.value.length + ' / 400';
    });

    els.msgForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      els.msgSubmit.disabled = true;
      try {
        var created = await global.ExpoStore.createMensaje({
          sala_id: els.msgSala.value || null,
          autor_nombre: els.msgAutor.value,
          parentesco: els.msgParentesco.value,
          mensaje: els.msgTexto.value
        });
        state.mensajes.unshift(created);
        renderMensajes();
        renderNavAndSelects();
        els.msgAutor.value = '';
        els.msgParentesco.value = '';
        els.msgTexto.value = '';
        els.msgCounter.textContent = '0 / 400';
        showToast('¡Gracias! Tu mensaje quedó publicado.');
      } catch (err) {
        showToast(err && err.message ? err.message : 'No se pudo enviar el mensaje.', true);
      } finally {
        els.msgSubmit.disabled = false;
      }
    });
  }

  /* ---------- Datos que llegan después (Supabase) ---------- */
  function aplicarSalas(rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    state.salas = rows;
    rows.forEach(function (sala) {
      var seccion = document.getElementById('sala-' + sala.id);
      var cabecera = seccion && seccion.querySelector('.sala-cabecera');
      if (!cabecera) return;
      var texto = sala.desc_a || sala.desc_b || '';
      var p = cabecera.querySelector('.sala-desc');
      if (!texto) {
        if (p) p.remove();
        return;
      }
      if (p) {
        if (p.textContent !== texto) p.textContent = texto;
      } else {
        p = document.createElement('p');
        p.className = 'sala-desc';
        p.textContent = texto;
        cabecera.appendChild(p);
      }
    });
  }

  function aplicarLikes(mapa) {
    state.obras.forEach(function (obra) {
      var id = String(obra.id);
      if (state.tocadas[id] || mapa[id] === undefined) return;
      var cantidad = Number(mapa[id]) || 0;
      if (cantidad !== (Number(obra.likes_count) || 0)) {
        syncLikeUI(id, cantidad, global.ExpoStore.isObraLiked(id));
      }
    });
  }

  function esperarPrimerasFotos(maxMs) {
    return new Promise(function (resolve) {
      var pendientes = Array.prototype.slice
        .call(els.salasMain.querySelectorAll('.obra-card img'), 0, PRIORIDAD_FOTOS)
        .filter(function (img) { return !img.complete; });
      if (!pendientes.length) { resolve(); return; }
      var falta = pendientes.length;
      var listo = false;
      function fin() { if (!listo) { listo = true; resolve(); } }
      pendientes.forEach(function (img) {
        function uno() { falta--; if (falta <= 0) fin(); }
        img.addEventListener('load', uno, { once: true });
        img.addEventListener('error', uno, { once: true });
      });
      global.setTimeout(fin, maxMs);
    });
  }

  async function cargarDatosRemotos() {
    var store = global.ExpoStore;
    // Con conexión real: primero las fotos (hasta 3 s) y recién después el SDK y las consultas a Supabase.
    if (store.hasCredentials()) await esperarPrimerasFotos(3000);
    await store.ready();

    var r = await Promise.all([
      store.fetchSalas().catch(function () { return null; }),
      store.fetchMensajes().catch(function () { return { fallo: true }; }),
      store.fetchLikes().catch(function () { return null; })
    ]);

    if (r[0]) aplicarSalas(r[0].data);
    if (r[2]) aplicarLikes(r[2].data);

    state.mensajesCargados = true;
    if (r[1] && !r[1].fallo) {
      state.mensajes = r[1].data;
      renderMensajes();
    } else {
      els.msgLista.innerHTML = '<div class="estado-vacio">No se pudieron cargar los mensajes. Revisá la conexión y volvé a abrir la página.</div>';
    }
    var chipMensajes = els.chipsSalas.querySelector('.c-msg');
    if (chipMensajes) chipMensajes.textContent = 'Mensajes (' + state.mensajes.length + ')';
  }

  async function init() {
    var route = parseInitialRoute();
    bindEvents();

    try {
      // Las fotos salen de obras.json: se dibuja la grilla apenas se lee, sin esperar a Supabase.
      var res = await global.ExpoStore.fetchObras();
      state.salas = global.ExpoStore.getSalasIniciales();
      state.obras = res.data;
      state.mode = res.mode;

      els.demoStrip.hidden = state.mode === 'live';
      updateQrArrivalBanner();
      renderNavAndSelects();
      renderSalas();

      if (route.obraId) {
        var idx = state.obras.findIndex(function (o) { return String(o.id) === String(route.obraId); });
        if (idx !== -1) openVisor(idx);
      }
    } catch (err) {
      els.salasMain.innerHTML = '<div class="estado-vacio">Ocurrió un problema al cargar la muestra. Revisá la conexión o recargá la página.</div>';
      showToast('Error al cargar la galería.', true);
      return;
    }

    // Descripciones de las salas, contadores de Me gusta y mensajes: se completan al llegar, sin redibujar.
    cargarDatosRemotos();
  }

  init();
})(window);
