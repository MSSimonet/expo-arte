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
    vVideo: document.getElementById('vVideo'),
    vVideoCtl: document.getElementById('vVideoCtl'),
    vPlay: document.getElementById('vPlay'),
    vProg: document.getElementById('vProg'),
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

  /** Llegada por QR: la sala del QR va primero y la barra ofrece "Todas"; ya no se muestra ningún aviso aparte. */
  var tituloBase = document.title; // título de la pestaña sin grado; se restituye al salir de la sala del QR

  function updateQrArrivalBanner() {
    state.qrSalaId ? document.body.setAttribute('data-sala', state.qrSalaId) : document.body.removeAttribute('data-sala');
    if (!state.qrSalaId) {
      els.hero.classList.remove('compacto');
      document.documentElement.style.setProperty('--hero-accent', '#086978');
      document.title = tituloBase;
      return;
    }

    var sala = state.salas.find(function (s) { return s.id === state.qrSalaId; });
    if (!sala) return;
    // Entrando por el QR de un grado, la pestaña (y el historial) dicen cuál: "Sala de 3° grado — Pequeños grandes artistas"
    document.title = 'Sala de ' + sala.grado + ' grado — ' + tituloBase.split(' — ')[0];

    els.hero.classList.add('compacto');
    document.documentElement.style.setProperty('--hero-accent', sala.color_dark || '#0b7d8e');
  }

  /** Marca con una clase si la barra de salas tiene más salas hacia un costado (el CSS desvanece ese borde) */
  function pistasDeLaBarra() {
    var c = els.chipsSalas;
    if (!c) return;
    var max = c.scrollWidth - c.clientWidth;
    c.classList.toggle('hay-mas-izq', max > 2 && c.scrollLeft > 2);
    c.classList.toggle('hay-mas-der', max > 2 && c.scrollLeft < max - 2);
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
    pistasDeLaBarra();

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

  /* ---------- Videos (obras tipo "video": animaciones, sin sonido) ---------- */
  function iconoPlay() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z" fill="currentColor"/></svg>';
  }
  function iconoPausa() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>';
  }
  /**
   * obras.json trae tipo/video, pero ExpoStore no los pasa. Se "escucha" la misma lectura que hace ExpoStore
   * (se clona su respuesta): sin una segunda descarga. Devuelve { promesa, soltar }.
   */
  function escucharObrasJson() {
    var original = global.fetch;
    var resolver;
    var promesa = new Promise(function (res) { resolver = res; });
    function mapaDesde(json) {
      var mapa = {};
      (json && json.obras || []).forEach(function (o) {
        if (o && o.tipo === 'video' && o.video) mapa[String(o.id)] = o;
      });
      return mapa;
    }
    if (typeof original !== 'function') { resolver({}); return { promesa: promesa, soltar: function () {} }; }
    global.fetch = function (entrada) {
      var url = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '';
      var p = original.apply(this, arguments);
      if (/(^|\/)obras\.json(\?|$)/.test(url)) {
        global.fetch = original;
        p.then(function (r) { return r.clone().json(); })
          .then(function (json) { resolver(mapaDesde(json)); })
          .catch(function () { resolver({}); });
      }
      return p;
    };
    return {
      promesa: promesa,
      soltar: function () { global.fetch = original; }
    };
  }
  function aplicarDatosDeVideos(mapa) {
    state.obras.forEach(function (o) {
      var d = mapa[String(o.id)];
      if (!d) return;
      o.tipo = 'video';
      o.video_url = String(d.video) + (d.v ? '?v=' + encodeURIComponent(d.v) : '');
      o.duracion = d.duracion || null;
    });
  }

  /** "Primer grado" → "Primer Grado" (para el texto alternativo del escudo) */
  function tituloNombre(nombre) {
    return String(nombre || '').replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  function renderSalas() {
    var orderedSalas = getOrderedSalas();
    var html = '';
    var fotosDibujadas = 0;

    orderedSalas.forEach(function (sala) {
      var obrasSala = state.obras.filter(function (o) { return Number(o.sala_id) === Number(sala.id); });
      var isHighlighted = state.qrSalaId === sala.id;

      html += '<section class="sala sala-' + sala.id + (isHighlighted ? ' destacada' : '') + '" id="sala-' + sala.id + '" aria-label="Sala de ' + escapeHtml(sala.grado) + ' grado">';
      var desc = sala.desc_a || sala.desc_b || '';

      // Encabezado: escudo con su fondo (imágenes) + cartel con la frase (texto real). La sala que se ve primero
      // (la del QR o, si no hay, la primera) carga sus imágenes con prioridad; las demás, de forma diferida.
      // Para no competir por ancho de banda con las primeras fotos, la sala visible arranca con un pixel vacío y
      // pone el escudo recién cuando esas fotos terminan de cargar (ver liberarEncabezado).
      var primeraVisible = state.qrSalaId ? isHighlighted : sala.id === orderedSalas[0].id;
      // En escritorio (>= 1024 px) el fondo es la acuarela con marco ornamentado de 1600 px; en pantallas menores, el de siempre.
      var esEscritorio = !!(global.matchMedia && global.matchMedia('(min-width: 1024px)').matches);
      var srcFondo = esEscritorio ? FONDO_ANCHO : FONDO_BASE, srcEscudo = 'assets/escudos/' + (ESCUDO_CORREGIDO[sala.id] || 'escudo-' + sala.id + '.webp?v=2');
      var cargaImg = primeraVisible ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"';
      var pixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
      html += '<div class="sala-encabezado' + (desc ? '' : ' sin-frase') + '">'
        + '<h2 class="sala-escudo" aria-label="Sala de ' + escapeHtml(sala.grado) + ' grado">'
        + '<img class="sala-escudo-fondo" src="' + (primeraVisible ? pixel + '" data-src="' + srcFondo : srcFondo) + '" alt="" width="' + (esEscritorio ? 1600 : 760) + '" height="' + (esEscritorio ? 430 : 258) + '"' + cargaImg + ' />'
        + '<img class="sala-escudo-img" src="' + (primeraVisible ? pixel + '" data-src="' + srcEscudo : srcEscudo) + '" alt="Escudo de ' + escapeHtml(tituloNombre(sala.nombre)) + '" width="480" height="326"' + cargaImg + ' />'
        + '</h2>'
        + '<div class="sala-cartel">' + (desc ? '<p class="sala-cartel-frase">' + escapeHtml(desc) + '</p>' : '') + '</div>'
        + '<div class="sala-subbar"><span class="pastilla">' + escapeHtml(sala.nombre) + ' · ' + obrasSala.length + (obrasSala.length === 1 ? ' obra' : ' obras') + '</span></div>'
        + '</div>';

      if (!obrasSala.length) {
        html += '<div class="estado-vacio">Todavía no se cargaron obras en ' + escapeHtml(sala.grado) + ' grado.</div>';
      } else {
        html += '<div class="galeria">';
        obrasSala.forEach(function (obra, posEnSala) {
          // "(3 de 31)": sin autor ni título en los datos, es lo que distingue una foto de otra para un lector de pantalla
          var lugar = ' (' + (posEnSala + 1) + ' de ' + obrasSala.length + ')';
          var idx = state.obras.indexOf(obra);
          var primaryLabel = obra.autor || obra.titulo || (sala.grado + ' grado');
          var primaryClass = (obra.autor || obra.titulo) ? 'obra-autor' : 'obra-autor sin-firma';
          var secondaryLabel = (obra.autor && obra.titulo) ? obra.titulo : '';
          var liked = global.ExpoStore.isObraLiked(obra.id);
          var likesCount = Number(obra.likes_count) || 0;
          var alt = 'Obra' + (obra.autor ? ' de ' + obra.autor : (obra.titulo ? ': ' + obra.titulo : '')) + ', ' + sala.grado + ' grado' + lugar;
          var esPrioritaria = fotosDibujadas < PRIORIDAD_FOTOS;
          fotosDibujadas++;
          // Proporción real de la foto (obras.json), limitada a 0,4–2,4; sin datos, la típica 1,3
          var anchoFoto = Number(obra.ancho) || 0, altoFoto = Number(obra.alto) || 0;
          var razon = (anchoFoto > 0 && altoFoto > 0) ? Math.min(2.4, Math.max(0.4, anchoFoto / altoFoto)) : 1.3;
          var dimsImg = (anchoFoto > 0 && altoFoto > 0) ? ' width="' + anchoFoto + '" height="' + altoFoto + '"' : '';
          var atributosCarga = esPrioritaria ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" fetchpriority="low" decoding="async"';

          var esVideo = obra.tipo === 'video' && obra.video_url;
          var cuerpo;
          if (esVideo) {
            var altV = 'Animación, ' + sala.grado + ' grado' + lugar;
            var poster = escapeHtml(obra.thumb_url || obra.imagen_url);
            cuerpo = '<button type="button" class="obra-trigger" data-open-obra="' + idx + '" aria-label="Ver en grande y reproducir: ' + escapeHtml(altV) + '">'
              + '<span class="lienzo marco-video"><span class="perf" aria-hidden="true"></span>'
              + '<span class="pantalla" style="--r:' + razon.toFixed(4) + '"><img src="' + poster + '" alt="' + escapeHtml(altV) + '"' + dimsImg + atributosCarga + ' />'
              + '<span class="video-pastilla">Animación</span><span class="video-play" aria-hidden="true">' + iconoPlay() + '</span></span>'
              + '<span class="perf" aria-hidden="true"></span></span>'
              + '</button>';
          } else {
            cuerpo = '<button type="button" class="obra-trigger" data-open-obra="' + idx + '" aria-label="Ver en grande: ' + escapeHtml(alt) + '">'
              + '<span class="lienzo" style="--r:' + razon.toFixed(4) + '"><img src="' + escapeHtml(obra.thumb_url || obra.imagen_url) + '" alt="' + escapeHtml(alt) + '"' + dimsImg + atributosCarga + ' /></span>'
              + '</button>';
          }

          html += '<article class="obra-card' + (esVideo ? ' obra-video' : '') + '" data-obra-idx="' + idx + '" data-obra-id="' + escapeHtml(obra.id) + '">'
            + cuerpo
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
    liberarEncabezado();
  }

  // Escudos con el texto corregido (archivo nuevo; el original no se toca). 3°: "TERCERO GRADO" decía mal, ahora "TERCER GRADO".
  var ESCUDO_CORREGIDO = { 3: 'escudo-3-tercer.webp?v=1' };
  var FONDO_BASE = 'assets/escudos/fondo-acuarela.webp?v=1';
  var FONDO_ANCHO = 'assets/escudos/fondo-sala-ancho.webp?v=1';

  /** Si la ventana cruza los 1024 px, cambia el fondo del escudo por el que corresponde (solo los ya cargados). */
  function vigilarFondoAncho() {
    if (!global.matchMedia) return;
    var mq = global.matchMedia('(min-width: 1024px)');
    function cambiar() {
      Array.prototype.forEach.call(els.salasMain.querySelectorAll('img.sala-escudo-fondo'), function (img) {
        var destino = mq.matches ? FONDO_ANCHO : FONDO_BASE;
        var ancho = mq.matches ? 1600 : 760;
        var alto = mq.matches ? 430 : 258;
        if (img.hasAttribute('data-src')) { img.setAttribute('data-src', destino); }
        else if (img.getAttribute('src') !== destino) { img.src = destino; }
        img.width = ancho; img.height = alto;
      });
    }
    if (mq.addEventListener) mq.addEventListener('change', cambiar); else if (mq.addListener) mq.addListener(cambiar);
  }
  vigilarFondoAncho();

  /** Pone el escudo de la sala visible y el marco del cartel cuando ya cargaron las primeras fotos (o a los 5 s). */
  function liberarEncabezado() {
    var raiz = global.document.documentElement;
    function poner() {
      Array.prototype.forEach.call(els.salasMain.querySelectorAll('img[data-src]'), function (img) {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      });
      raiz.classList.add('enc-listo');
    }
    if (raiz.classList.contains('enc-listo')) { poner(); return; }
    var hecho = false;
    function una() { if (!hecho) { hecho = true; poner(); } }
    esperarPrimerasFotos(5000).then(una);
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

    els.visor.setAttribute('data-sala-visor', String(obra.sala_id)); // la pared del visor toma el color del grado
    liberarVideoVisor();
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
    var delGrado = state.obras.filter(function (o) { return Number(o.sala_id) === Number(obra.sala_id); });
    els.vImg.alt = 'Obra' + (obra.autor ? ' de ' + obra.autor : (obra.titulo ? ': ' + obra.titulo : '')) + ', ' + sala.grado + ' grado (' + (delGrado.indexOf(obra) + 1) + ' de ' + delGrado.length + ')';
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

    // Obra de tipo video: el póster ya está en vImg; se superpone el video (muted, sin volumen) con controles propios
    els.vZoom.hidden = false;
    if (obra.tipo === 'video' && obra.video_url) {
      els.vZoom.hidden = true;
      els.vLienzo.classList.add('es-video');
      els.vVideo.hidden = false;
      els.vVideoCtl.hidden = false;
      els.vVideo.muted = true;
      els.vVideo.poster = obra.thumb_url || obra.imagen_url;
      els.vVideo.setAttribute('src', obra.video_url);
      actualizarControlesVideo();
      // El toque que abrió el visor habilita la reproducción (muted, sin sonido): empieza en ese momento
      var pv = els.vVideo.play();
      if (pv && pv.catch) pv.catch(function () { actualizarControlesVideo(); });
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

  /** Pausa y libera el video del visor (al cerrar, al pasar a otra obra o al mostrar una foto) */
  function liberarVideoVisor() {
    var v = els.vVideo;
    if (!v) return;
    v.pause();
    if (v.getAttribute('src')) {
      v.removeAttribute('src');
      try { v.load(); } catch (_) { /* nada */ }
    }
    v.hidden = true;
    els.vVideoCtl.hidden = true;
    els.vLienzo.classList.remove('es-video');
    els.vProg.value = 0;
  }
  function actualizarControlesVideo() {
    var v = els.vVideo;
    var jugando = v && !v.paused && !v.ended;
    els.vPlay.innerHTML = jugando ? iconoPausa() : iconoPlay();
    els.vPlay.setAttribute('aria-label', jugando ? 'Pausar la animación' : 'Reproducir la animación');
    if (v && v.duration > 0) els.vProg.value = Math.round(v.currentTime / v.duration * 1000);
  }
  function alternarVideoVisor() {
    var v = els.vVideo;
    if (!v || !v.getAttribute('src')) return;
    if (v.paused) {
      var p = v.play();
      if (p && p.catch) p.catch(function () { actualizarControlesVideo(); });
    } else {
      v.pause();
    }
  }

  var focoPrevio = null; // elemento que tenía el foco al abrir el visor (para devolvérselo al cerrar)

  function openVisor(idx) {
    if (!els.visor.classList.contains('abierto')) focoPrevio = document.activeElement;
    showObraInVisor(idx);
    els.visor.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    els.vCerrar.focus();
  }

  function closeVisor() {
    var estabaAbierto = els.visor.classList.contains('abierto');
    els.visor.classList.remove('abierto');
    document.body.style.overflow = '';
    liberarVideoVisor();
    if (estabaAbierto && focoPrevio && focoPrevio.isConnected && typeof focoPrevio.focus === 'function') {
      focoPrevio.focus({ preventScroll: true });
    }
    focoPrevio = null;
  }

  /** Con el visor abierto, Tab y Shift+Tab dan la vuelta dentro del visor (no se escapan a la página de atrás). */
  function mantenerFocoEnVisor(e) {
    var foco = Array.prototype.filter.call(
      els.visor.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.getClientRects().length > 0; }
    );
    if (!foco.length) return;
    var primero = foco[0], ultimo = foco[foco.length - 1];
    var actual = document.activeElement;
    if (e.shiftKey && (actual === primero || !els.visor.contains(actual))) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && (actual === ultimo || !els.visor.contains(actual))) {
      e.preventDefault();
      primero.focus();
    }
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
      if (obra.tipo === 'video' && obra.video_url) {
        var respV = await fetch(obra.video_url);
        triggerBlobDownload(await respV.blob(), fileBase + '-animacion.mp4');
      } else if (obra.imagen_url.indexOf('data:image/svg+xml') === 0) {
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
      showToast(obra.tipo === 'video' ? 'Descargando la animación…' : 'Descargando la foto de la obra…');
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

    els.chipsSalas.addEventListener('scroll', pistasDeLaBarra, { passive: true });
    global.addEventListener('resize', pistasDeLaBarra);
    global.addEventListener('load', pistasDeLaBarra);
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
      if (els.vLienzo.classList.contains('es-video')) { alternarVideoVisor(); return; }
      var z = els.vLienzo.classList.toggle('zoom');
      els.vZoomTxt.textContent = z ? 'Alejar' : 'Acercar';
    });
    els.vPlay.addEventListener('click', alternarVideoVisor);
    ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(function (ev) {
      els.vVideo.addEventListener(ev, actualizarControlesVideo);
    });
    els.vProg.addEventListener('input', function () {
      var v = els.vVideo;
      if (v && v.duration > 0) v.currentTime = v.duration * (Number(els.vProg.value) / 1000);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && els.vVideo && !els.vVideo.paused) els.vVideo.pause();
    });
    els.visor.addEventListener('click', function (e) {
      if (e.target === els.visor) closeVisor();
    });
    document.addEventListener('keydown', function (e) {
      if (!els.visor.classList.contains('abierto')) return;
      if (e.key === 'Escape') closeVisor();
      if (e.key === 'Tab') mantenerFocoEnVisor(e);
      if (e.key === 'ArrowLeft') stepVisor(-1);
      if (e.key === 'ArrowRight') stepVisor(1);
    });

    var touchX = null;
    var touchY = null;
    els.visor.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || (e.target.closest && e.target.closest('.video-ctl'))) { touchX = null; return; }
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
      if (!seccion) return;
      var texto = sala.desc_a || sala.desc_b || '';
      var enc = seccion.querySelector('.sala-encabezado');
      if (!enc) return;
      var escudo = enc.querySelector('.sala-escudo-img');
      if (escudo && sala.nombre) escudo.alt = 'Escudo de ' + tituloNombre(sala.nombre);
      var cartel = enc.querySelector('.sala-cartel');
      var p = enc.querySelector('.sala-cartel-frase');
      enc.classList.toggle('sin-frase', !texto);
      if (!texto) {
        if (p) p.remove();
        return;
      }
      if (p) {
        if (p.textContent !== texto) p.textContent = texto;
      } else if (cartel) {
        p = document.createElement('p');
        p.className = 'sala-cartel-frase';
        p.textContent = texto;
        cartel.appendChild(p);
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

    var chipMensajes = els.chipsSalas.querySelector('.c-msg');
    if (r[1] && !r[1].fallo) {
      state.mensajesCargados = true;
      state.mensajes = r[1].data;
      renderMensajes();
      if (chipMensajes) chipMensajes.textContent = 'Mensajes (' + state.mensajes.length + ')';
    } else {
      // Si no se pudieron leer, no se sabe cuántos hay: la barra dice "Mensajes" y no "Mensajes (0)".
      els.msgLista.innerHTML = '<div class="estado-vacio">No se pudieron cargar los mensajes. Revisá la conexión y volvé a abrir la página.</div>';
    }
  }

  async function init() {
    var route = parseInitialRoute();
    bindEvents();

    try {
      // Las fotos salen de obras.json: se dibuja la grilla apenas se lee, sin esperar a Supabase.
      var escucha = escucharObrasJson();
      var res = await global.ExpoStore.fetchObras();
      escucha.soltar();
      state.salas = global.ExpoStore.getSalasIniciales();
      state.obras = res.data;
      state.mode = res.mode;
      aplicarDatosDeVideos(await Promise.race([escucha.promesa, new Promise(function (r) { global.setTimeout(function () { r({}); }, 400); })]));

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
