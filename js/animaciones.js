/**
 * Animaciones de la muestra — Pequeños grandes artistas
 *
 * Mejora progresiva: solo observa el DOM que dibuja expo-app.js y reacciona.
 * No cambia datos ni lógica. Si algo falla, se quita la clase .anim-js y la
 * página queda exactamente como sin este archivo.
 *
 * Reglas: solo transform y opacity; respeta prefers-reduced-motion (también si
 * cambia con la página abierta); las animaciones continuas se pausan fuera de
 * pantalla y con la pestaña oculta.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var root = doc.documentElement;

  if (!('IntersectionObserver' in global) || !('MutationObserver' in global) ||
      !global.Element || !global.Element.prototype.animate || !doc.querySelector) {
    return;
  }

  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  var EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  var EASE_CAIDA = 'cubic-bezier(0.55, 0, 0.9, 0.55)';

  var COLORES_FIESTA = ['#12a5b4', '#7c5cd6', '#2e7cd6', '#1e9e57', '#ef8a17', '#df3e7c', '#2b3a9e', '#ffc21f', '#d92e25'];
  var CORAZON = '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reducido = !!(mq && mq.matches);

  var el = {};
  var activo = false;

  /* ---------- Utilidades ---------- */
  function fallar(err) {
    activo = false;
    root.classList.remove('anim-js');
    if (global.console && global.console.warn) global.console.warn('[animaciones] desactivadas:', err);
  }

  function seguro(fn) {
    return function () {
      if (!activo) return undefined;
      try {
        return fn.apply(this, arguments);
      } catch (err) {
        fallar(err);
        return undefined;
      }
    };
  }

  function ahora() {
    return global.performance && global.performance.now ? global.performance.now() : Date.now();
  }

  function enPantalla(node, margen) {
    var r = node.getBoundingClientRect();
    var m = margen || 0;
    return r.width > 0 && r.bottom > m && r.top < global.innerHeight && r.right > 0 && r.left < global.innerWidth;
  }

  function capaNueva() {
    var capa = doc.createElement('div');
    capa.className = 'anim-capa';
    capa.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(capa);
    return capa;
  }

  function quitarAlTerminar(animaciones, nodo, extraMs) {
    var hecho = false;
    function fin() {
      if (hecho) return;
      hecho = true;
      if (nodo && nodo.parentNode) nodo.parentNode.removeChild(nodo);
    }
    var max = 0;
    animaciones.forEach(function (a) {
      var t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      if (t) max = Math.max(max, (t.delay || 0) + (t.duration || 0));
    });
    global.setTimeout(fin, max + (extraMs || 120));
  }

  function alturaBarra() {
    var b = doc.querySelector('.barra');
    return b ? b.offsetHeight : 70;
  }

  /* ---------- 1. Animaciones continuas: pausa fuera de pantalla / pestaña oculta ---------- */
  var continuas = [];
  var visibles = new WeakMap();
  var ioContinuas = null;

  function actualizarPausa(nodo) {
    nodo.classList.toggle('pausada', doc.hidden || !visibles.get(nodo));
  }

  function observarContinua(nodo) {
    if (!nodo || continuas.indexOf(nodo) !== -1) return;
    continuas.push(nodo);
    nodo.classList.add('pausada');
    ioContinuas.observe(nodo);
  }

  function limpiarContinuas() {
    continuas = continuas.filter(function (nodo) {
      if (nodo.isConnected) return true;
      ioContinuas.unobserve(nodo);
      return false;
    });
  }

  /* ---------- 2. Aparición de salas y tarjetas al entrar en pantalla ---------- */
  var ioRevelar = null;
  // Velocidad de scroll: si se pasa rápido, las tarjetas aparecen al instante
  // (no se llegaría a ver la animación y en celulares lentos traba el scroll).
  var scrollInfo = { y: 0, t: 0, v: 0 };

  function medirScroll() {
    var t = ahora();
    var y = global.scrollY || global.pageYOffset || 0;
    var dt = t - scrollInfo.t;
    if (dt > 0 && dt < 250) {
      var inst = Math.abs(y - scrollInfo.y) / dt;
      scrollInfo.v = scrollInfo.v * 0.5 + inst * 0.5;
    } else {
      scrollInfo.v = 0;
    }
    scrollInfo.y = y;
    scrollInfo.t = t;
  }

  function scrollRapido() {
    return ahora() - scrollInfo.t < 160 && scrollInfo.v > 1.2; // > 1200 px/s
  }

  function revelarAlInstante(nodo) {
    nodo.style.transition = 'none';
    nodo.classList.add('revelada');
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () { nodo.style.transition = ''; });
    });
  }

  function revelar(nodo, demora) {
    if (demora && !reducido) {
      nodo.style.transitionDelay = demora + 'ms';
      global.setTimeout(function () { nodo.style.transitionDelay = ''; }, demora + 700);
    }
    nodo.classList.add('revelada');
  }

  function revelarTodo() {
    if (!el.salas) return;
    el.salas.querySelectorAll('.obra-card, .sala-cabecera').forEach(function (nodo) {
      if (ioRevelar) ioRevelar.unobserve(nodo);
      nodo.classList.add('revelada');
    });
  }

  function prepararSalas(inicial) {
    var nodos = el.salas.querySelectorAll('.obra-card:not(.revelada), .sala-cabecera:not(.revelada)');
    nodos.forEach(function (nodo) {
      if (reducido) {
        nodo.classList.add('revelada');
        return;
      }
      // Lo que ya estaba a la vista antes de activar las animaciones no se esconde.
      if (inicial && enPantalla(nodo)) {
        nodo.classList.add('revelada');
        return;
      }
      ioRevelar.observe(nodo);
    });
  }

  /* ---------- 3. Barra de grados: píldora + grado en pantalla ---------- */
  var pildora = null;
  var objetivoId = null; // id de la sección marcada (ej. "sala-3")
  var pildoraVisible = false;
  var ioEspia = null;
  var enBanda = [];

  function asegurarPildora() {
    if (!pildora) {
      pildora = doc.createElement('span');
      pildora.className = 'chips-pildora';
      pildora.setAttribute('aria-hidden', 'true');
    }
    if (pildora.parentNode !== el.chips) {
      el.chips.insertBefore(pildora, el.chips.firstChild);
      pildoraVisible = false;
    }
  }

  function chipDe(id) {
    if (!id) return null;
    return el.chips.querySelector('a.chip[href="#' + id + '"]');
  }

  function marcarChip(chip) {
    el.chips.querySelectorAll('.chip.pildora-aqui').forEach(function (c) {
      if (c !== chip) c.classList.remove('pildora-aqui');
    });
    if (chip) chip.classList.add('pildora-aqui');
  }

  function moverPildora(chip, alScroll) {
    asegurarPildora();
    if (!chip) {
      pildora.style.opacity = '0';
      pildoraVisible = false;
      marcarChip(null);
      return;
    }
    // Medidas en caché: mover la píldora durante el scroll solo escribe estilos,
    // nunca fuerza al navegador a recalcular el diseño.
    if (!geoChips) medirChips();
    var g = geoChips.porHref[chip.getAttribute('href')];
    if (!g) { medirChips(); g = geoChips.porHref[chip.getAttribute('href')]; }
    if (!g) return;
    pildora.style.width = g.w + 'px';
    if (g.color) pildora.style.background = g.color;
    var destino = 'translate(' + g.x + 'px, ' + g.y + 'px)';
    if (!pildoraVisible || reducido) {
      // Primera aparición: se ubica sin deslizar y recién después se activa la transición.
      pildora.style.transition = 'none';
      pildora.style.transform = destino;
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () { pildora.style.transition = ''; });
      });
    } else {
      pildora.style.transform = destino;
    }
    pildora.style.opacity = '1';
    pildoraVisible = true;
    marcarChip(chip);

    // Que el chip marcado quede a la vista dentro de la fila deslizable.
    if (alScroll && geoChips.desborda) {
      var izq = g.x;
      var der = izq + g.w;
      if (izq < chipsScrollLeft + 8 || der > chipsScrollLeft + geoChips.ancho - 8) {
        var meta = Math.max(0, izq - (geoChips.ancho - g.w) / 2);
        if (el.chips.scrollTo) {
          el.chips.scrollTo({ left: meta, behavior: reducido ? 'auto' : 'smooth' });
        } else {
          el.chips.scrollLeft = meta;
        }
      }
    }
  }

  var geoChips = null;
  var chipsScrollLeft = 0;

  function medirChips() {
    var porHref = {};
    el.chips.querySelectorAll('a.chip').forEach(function (c) {
      porHref[c.getAttribute('href')] = {
        x: c.offsetLeft,
        y: c.offsetTop,
        w: c.offsetWidth,
        color: global.getComputedStyle(c).getPropertyValue('--sala').trim()
      };
    });
    geoChips = {
      porHref: porHref,
      ancho: el.chips.clientWidth,
      desborda: el.chips.scrollWidth > el.chips.clientWidth + 2
    };
    chipsScrollLeft = el.chips.scrollLeft;
  }

  function invalidarChips() {
    geoChips = null;
  }

  function seccionesEspiadas() {
    var lista = Array.prototype.slice.call(el.salas.querySelectorAll('section.sala'));
    var msgs = doc.getElementById('mensajes');
    if (msgs) lista.push(msgs);
    return lista;
  }

  function decidirObjetivo(alScroll, forzar) {
    var actual = null;
    var secciones = seccionesEspiadas();
    for (var i = 0; i < secciones.length; i++) {
      if (enBanda.indexOf(secciones[i]) !== -1) { actual = secciones[i]; break; }
    }
    var id = null;
    if (actual && actual.classList.contains('sala')) {
      id = actual.id;
    } else if (!actual) {
      // Arriba de todo: si se llegó por QR, la píldora queda en ese grado.
      var activa = el.chips.querySelector('.chip.activa');
      if (activa && global.scrollY < 400) id = (activa.getAttribute('href') || '').slice(1);
    }
    if (!forzar && id === objetivoId && pildora && pildora.parentNode === el.chips) return; // sin cambios
    objetivoId = id;
    moverPildora(chipDe(id), alScroll);
  }

  function crearEspia() {
    if (ioEspia) ioEspia.disconnect();
    enBanda = [];
    var arriba = alturaBarra() + 8;
    ioEspia = new IntersectionObserver(seguro(function (entradas) {
      entradas.forEach(function (en) {
        var idx = enBanda.indexOf(en.target);
        if (en.isIntersecting && idx === -1) enBanda.push(en.target);
        if (!en.isIntersecting && idx !== -1) enBanda.splice(idx, 1);
      });
      decidirObjetivo(true);
    }), { rootMargin: '-' + arriba + 'px 0px -58% 0px', threshold: 0 });
    seccionesEspiadas().forEach(function (s) { ioEspia.observe(s); });
  }

  /* ---------- 4. Me gusta: estallido, latido y contador ---------- */
  function latir(btn) {
    btn.classList.remove('latiendo');
    void btn.offsetWidth;
    btn.classList.add('latiendo');
    global.setTimeout(function () { btn.classList.remove('latiendo'); }, 420);
  }

  function estallido(btn, color) {
    var r = btn.getBoundingClientRect();
    if (!r.width) return;
    var svg = btn.querySelector('svg');
    var rs = svg ? svg.getBoundingClientRect() : r;
    var cx = rs.left + rs.width / 2;
    var cy = rs.top + rs.height / 2;
    var capa = capaNueva();
    var anims = [];
    var total = 8;
    for (var i = 0; i < total; i++) {
      var p = doc.createElement('span');
      var esCorazon = i % 2 === 0;
      p.className = 'anim-particula' + (esCorazon ? '' : ' punto');
      if (esCorazon) p.innerHTML = CORAZON;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.color = i % 4 === 1 ? '#ffc21f' : color;
      capa.appendChild(p);
      var ang = (-160 + (140 / (total - 1)) * i + (Math.random() * 14 - 7)) * Math.PI / 180;
      var dist = 24 + Math.random() * 18;
      var dx = Math.cos(ang) * dist;
      var dy = Math.sin(ang) * dist;
      var giro = Math.random() * 50 - 25;
      anims.push(p.animate([
        { transform: 'translate(0, 0) scale(0.4) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(1) rotate(' + giro + 'deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + (dx * 1.15) + 'px, ' + (dy * 1.15 + 8) + 'px) scale(0.7) rotate(' + giro + 'deg)', opacity: 0 }
      ], { duration: 550, easing: EASE_OUT, fill: 'both' }));
    }
    quitarAlTerminar(anims, capa);
  }

  function colorDeTarjeta(btn) {
    var card = btn.closest('.obra-card') || btn.closest('.sala');
    var c = card ? global.getComputedStyle(card).getPropertyValue('--sala-vivid').trim() : '';
    return c || '#d92e25';
  }

  function alCambiarMeGusta(btn, antes) {
    var ahoraVal = btn.getAttribute('aria-pressed');
    if (ahoraVal !== 'true' || antes === 'true') return;
    var enVisor = btn === el.vLike;
    var visorAbierto = el.visor.classList.contains('abierto');
    if (enVisor !== visorAbierto) return; // solo el botón que se está viendo
    if (reducido) return;
    latir(btn);
    estallido(btn, enVisor ? '#d92e25' : colorDeTarjeta(btn));
  }

  function numeroDe(texto) {
    var m = String(texto || '').match(/-?\d+/);
    return m ? parseInt(m[0], 10) : NaN;
  }

  function rodarContador(span, textoAntes) {
    if (reducido) return;
    var a = numeroDe(textoAntes);
    var b = numeroDe(span.textContent);
    if (isNaN(a) || isNaN(b) || a === b) return;
    var dir = b > a ? 1 : -1;
    var desplaz = span === el.vLikeTxt ? 35 : 60;
    span.animate([
      { transform: 'translateY(' + (dir * desplaz) + '%)', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: 220, easing: EASE_OUT });
  }

  /* ---------- 5. Visor: vuelo desde la tarjeta, swipe y cierre ---------- */
  var origen = null;          // { img, t } de la tarjeta tocada
  var clonVisor = null;
  var cierreTimer = null;
  var vueloAnim = null;
  var arrastre = null;        // estado del swipe en curso
  var boton = null;           // { dir, t } de ‹ ›
  var rafArrastre = 0;

  function quitarClon() {
    if (vueloAnim) { try { vueloAnim.cancel(); } catch (_) {} vueloAnim = null; }
    if (clonVisor && clonVisor.parentNode) clonVisor.parentNode.removeChild(clonVisor);
    clonVisor = null;
  }

  function crearClon(src, rect) {
    var c = new global.Image();
    c.className = 'visor-clon';
    c.alt = '';
    c.setAttribute('aria-hidden', 'true');
    c.decoding = 'sync';
    c.src = src;
    c.style.left = rect.left + 'px';
    c.style.top = rect.top + 'px';
    c.style.width = rect.width + 'px';
    c.style.height = rect.height + 'px';
    doc.body.appendChild(c);
    return c;
  }

  function transformDesde(desde, hasta) {
    // Escala uniforme por ancho, centrada verticalmente sobre la tarjeta.
    var s = desde.width / hasta.width;
    var dx = desde.left - hasta.left;
    var dy = desde.top + (desde.height - hasta.height * s) / 2 - hasta.top;
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
  }

  function cancelarCierre() {
    if (cierreTimer) { global.clearTimeout(cierreTimer); cierreTimer = null; }
    el.visor.classList.remove('cerrando', 'cerrando-vuelo');
    quitarClon();
  }

  function alAbrirVisor() {
    cancelarCierre();
    el.visor.classList.remove('vuelo', 'vuelo-img');
    var o = origen;
    origen = null;
    if (reducido || !o || !o.img || ahora() - o.t > 800) return; // queda la entrada simple
    if (!el.vImg.complete || !el.vImg.naturalWidth) return;
    if (!enPantalla(o.img)) return;

    el.visor.classList.add('vuelo', 'vuelo-img');
    var hasta = el.vImg.getBoundingClientRect();
    var desde = o.img.getBoundingClientRect();
    if (hasta.width < 40 || hasta.height < 40 || desde.width < 10) {
      el.visor.classList.remove('vuelo', 'vuelo-img');
      return;
    }
    clonVisor = crearClon(el.vImg.currentSrc || el.vImg.src, hasta);
    vueloAnim = clonVisor.animate([
      { transform: transformDesde(desde, hasta), borderRadius: '10px' },
      { transform: 'none' }
    ], { duration: 380, easing: EASE_DRAWER });
    vueloAnim.onfinish = function () {
      vueloAnim = null;
      el.visor.classList.remove('vuelo-img');
      quitarClon();
    };
  }

  // La grilla muestra la miniatura y el visor la versión grande (otra URL): la tarjeta se ubica por el id de la obra.
  function buscarTarjeta(id) {
    if (!id) return null;
    var tarjetas = el.salas.querySelectorAll('.obra-card');
    for (var i = 0; i < tarjetas.length; i++) {
      if (tarjetas[i].getAttribute('data-obra-id') === id) return tarjetas[i].querySelector('.obra-trigger img');
    }
    return null;
  }

  function alCerrarVisor() {
    if (vueloAnim) quitarClon();
    el.visor.classList.remove('vuelo', 'vuelo-img');
    if (reducido) return;

    el.visor.classList.add('cerrando');
    var duracion = 240;
    var tarjeta = buscarTarjeta(el.vImg.getAttribute('data-obra-id'));
    var hayZoom = el.vLienzo.classList.contains('zoom');
    if (tarjeta && !hayZoom && el.vImg.naturalWidth) {
      var desde = el.vImg.getBoundingClientRect();
      var hasta = tarjeta.getBoundingClientRect();
      var barra = alturaBarra();
      var aLaVista = hasta.width > 0 && hasta.top > barra && hasta.bottom < global.innerHeight;
      if (aLaVista && desde.width > 40) {
        el.visor.classList.add('cerrando-vuelo');
        clonVisor = crearClon(el.vImg.currentSrc || el.vImg.src, desde);
        vueloAnim = clonVisor.animate([
          { transform: 'none' },
          { transform: transformDesde(hasta, desde), opacity: 0.9 }
        ], { duration: duracion, easing: EASE_OUT, fill: 'forwards' });
      }
    }
    cierreTimer = global.setTimeout(seguro(function () {
      cierreTimer = null;
      el.visor.classList.remove('cerrando', 'cerrando-vuelo');
      quitarClon();
    }), duracion + 30);
  }

  function alCambiarImagenVisor() {
    if (el.vImg.hasAttribute('data-hd')) return; // cambio de miniatura a versión grande de la MISMA obra: sin animación
    if (!el.visor.classList.contains('abierto') || reducido) return;
    var dir = 0;
    var dur = 220;
    if (arrastre && arrastre.activo) {
      dir = arrastre.dx < 0 ? 1 : -1;
      arrastre.consumido = true;
      dur = 260;
    } else if (boton && ahora() - boton.t < 400) {
      dir = boton.dir;
    }
    boton = null;
    if (!dir) return; // teclado o apertura: sin animación
    el.vImg.style.transition = '';
    el.vImg.style.transform = '';
    el.vImg.animate([
      { transform: 'translateX(' + (dir * 24) + '%)', opacity: 0.15 },
      { transform: 'none', opacity: 1 }
    ], { duration: dur, easing: EASE_OUT });
  }

  function volverAlCentro(dx) {
    el.vImg.style.transition = '';
    el.vImg.style.transform = '';
    if (!dx) return;
    el.vImg.animate([
      { transform: 'translateX(' + dx + 'px)' },
      { transform: 'none' }
    ], { duration: 300, easing: EASE_SPRING });
  }

  function bindVisor() {
    // Captura: se ejecuta antes que el manejador de expo-app.js y solo registra datos.
    doc.addEventListener('click', seguro(function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-open-obra]') : null;
      if (t) origen = { img: t.querySelector('img'), t: ahora() };
      if (e.target && e.target.closest) {
        if (e.target.closest('#vNext')) boton = { dir: 1, t: ahora() };
        else if (e.target.closest('#vPrev')) boton = { dir: -1, t: ahora() };
      }
    }), true);

    el.visor.addEventListener('touchstart', seguro(function (e) {
      if (reducido || e.touches.length !== 1 || el.vLienzo.classList.contains('zoom')) { arrastre = null; return; }
      arrastre = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, activo: false, consumido: false };
    }), { passive: true });

    el.visor.addEventListener('touchmove', seguro(function (e) {
      if (!arrastre || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - arrastre.x0;
      var dy = e.touches[0].clientY - arrastre.y0;
      if (!arrastre.activo) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          arrastre.activo = true;
          el.vImg.style.transition = 'none';
        } else if (Math.abs(dy) > 12) {
          arrastre = null;
          return;
        } else {
          return;
        }
      }
      arrastre.dx = dx;
      if (!rafArrastre) {
        rafArrastre = global.requestAnimationFrame(function () {
          rafArrastre = 0;
          if (arrastre && arrastre.activo && !arrastre.consumido) {
            el.vImg.style.transform = 'translateX(' + (arrastre.dx * 0.85) + 'px)';
          }
        });
      }
    }), { passive: true });

    // Se registra después que el de expo-app.js: si cambió la obra, ya se animó la entrada.
    function finArrastre() {
      if (!arrastre) return;
      var a = arrastre;
      arrastre = null;
      if (a.activo && !a.consumido) volverAlCentro(a.dx * 0.85);
      else if (!a.consumido) { el.vImg.style.transition = ''; }
    }
    el.visor.addEventListener('touchend', seguro(finArrastre), { passive: true });
    el.visor.addEventListener('touchcancel', seguro(finArrastre), { passive: true });
  }

  /* ---------- 6. Libro de visitas: mensaje nuevo con rebote + confeti ---------- */
  var envioPendiente = 0;
  var cantidadMensajes = 0;

  function contarMensajes() {
    return el.msgLista.querySelectorAll('.msg-item').length;
  }

  function confeti(btn) {
    var r = btn.getBoundingClientRect();
    if (!r.width) return;
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var capa = capaNueva();
    var anims = [];
    var piezas = 28;
    for (var i = 0; i < piezas; i++) {
      var p = doc.createElement('span');
      p.className = 'anim-confeti' + (i % 3 === 0 ? ' redondo' : '');
      p.style.left = (cx + (Math.random() * r.width * 0.6 - r.width * 0.3)) + 'px';
      p.style.top = cy + 'px';
      p.style.background = COLORES_FIESTA[i % COLORES_FIESTA.length];
      capa.appendChild(p);
      var ang = (-150 + Math.random() * 120) * Math.PI / 180;
      var vel = 110 + Math.random() * 150;
      var dx = Math.cos(ang) * vel;
      var dyPico = Math.sin(ang) * vel;
      var giro = Math.random() * 540 - 270;
      anims.push(p.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, easing: EASE_OUT },
        { transform: 'translate(' + (dx * 0.8) + 'px, ' + dyPico + 'px) rotate(' + (giro * 0.6) + 'deg)', opacity: 1, offset: 0.45, easing: EASE_CAIDA },
        { transform: 'translate(' + dx + 'px, ' + (dyPico + 150) + 'px) rotate(' + giro + 'deg)', opacity: 0 }
      ], { duration: 800, delay: Math.random() * 60, fill: 'both' }));
    }
    quitarAlTerminar(anims, capa);
  }

  function alCambiarMensajes() {
    var n = contarMensajes();
    if (envioPendiente && ahora() - envioPendiente < 10000 && n === cantidadMensajes + 1) {
      envioPendiente = 0;
      var primero = el.msgLista.querySelector('.msg-item');
      if (primero && !reducido) {
        primero.classList.add('msg-nuevo');
        if (el.msgSubmit) confeti(el.msgSubmit);
      }
    }
    cantidadMensajes = n;
    limpiarContinuas();
  }

  /* ---------- Inicio ---------- */
  function onCambioMovimiento(e) {
    reducido = !!e.matches;
    if (reducido) revelarTodo();
  }

  function init() {
    try {
      el.salas = doc.getElementById('salas');
      el.chips = doc.getElementById('chipsSalas');
      el.visor = doc.getElementById('visor');
      el.vImg = doc.getElementById('vImg');
      el.vLienzo = doc.getElementById('vLienzo');
      el.vLike = doc.getElementById('vLike');
      el.vLikeTxt = doc.getElementById('vLikeTxt');
      el.msgLista = doc.getElementById('msgLista');
      el.msgForm = doc.getElementById('msgForm');
      el.msgSubmit = doc.getElementById('msgSubmit');
      if (!el.salas || !el.chips || !el.visor || !el.vImg || !el.msgLista) return;

      activo = true;

      ioContinuas = new IntersectionObserver(seguro(function (entradas) {
        entradas.forEach(function (en) {
          visibles.set(en.target, en.isIntersecting);
          actualizarPausa(en.target);
        });
      }));
      doc.addEventListener('visibilitychange', seguro(function () {
        continuas.forEach(actualizarPausa);
      }));
      observarContinua(doc.querySelector('.hero-formas'));
      doc.querySelectorAll('.esqueleto').forEach(observarContinua);

      global.addEventListener('scroll', medirScroll, { passive: true });

      ioRevelar = new IntersectionObserver(seguro(function (entradas) {
        var n = 0;
        var rapido = scrollRapido();
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          ioRevelar.unobserve(en.target);
          if (rapido) {
            revelarAlInstante(en.target);
            return;
          }
          var esTarjeta = en.target.classList.contains('obra-card');
          revelar(en.target, esTarjeta ? Math.min(n++, 5) * 50 : 0);
        });
      }), { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });

      // Cambios que hace expo-app.js en las salas (render, Me gusta, contadores).
      new MutationObserver(seguro(function (registros) {
        var rerender = false;
        registros.forEach(function (r) {
          if (r.type === 'attributes') {
            alCambiarMeGusta(r.target, r.oldValue);
          } else if (r.target === el.salas) {
            rerender = true;
          } else if (r.target.tagName === 'SPAN' && r.target.parentElement &&
                     r.target.parentElement.classList.contains('like-btn')) {
            var viejo = r.removedNodes[0] ? r.removedNodes[0].textContent : '';
            if (!el.visor.classList.contains('abierto')) rodarContador(r.target, viejo);
          }
        });
        if (rerender) {
          limpiarContinuas();
          prepararSalas(false);
          crearEspia();
        }
      })).observe(el.salas, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed'], attributeOldValue: true });

      new MutationObserver(seguro(function () {
        invalidarChips();
        asegurarPildora();
        decidirObjetivo(false, true);
      })).observe(el.chips, { childList: true });
      el.chips.addEventListener('scroll', function () { chipsScrollLeft = el.chips.scrollLeft; }, { passive: true });
      if (doc.fonts && doc.fonts.ready) {
        doc.fonts.ready.then(seguro(function () {
          invalidarChips();
          decidirObjetivo(false, true);
        }));
      }

      new MutationObserver(seguro(function (registros) {
        registros.forEach(function (r) {
          if (r.attributeName !== 'class') return;
          var antes = (r.oldValue || '').split(/\s+/).indexOf('abierto') !== -1;
          var ahoraAbierto = el.visor.classList.contains('abierto');
          if (!antes && ahoraAbierto) alAbrirVisor();
          else if (antes && !ahoraAbierto) alCerrarVisor();
        });
      })).observe(el.visor, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });

      new MutationObserver(seguro(alCambiarImagenVisor)).observe(el.vImg, { attributes: true, attributeFilter: ['src'] });

      if (el.vLike) {
        new MutationObserver(seguro(function (registros) {
          registros.forEach(function (r) { alCambiarMeGusta(r.target, r.oldValue); });
        })).observe(el.vLike, { attributes: true, attributeFilter: ['aria-pressed'], attributeOldValue: true });
      }
      if (el.vLikeTxt) {
        new MutationObserver(seguro(function (registros) {
          var r = registros[0];
          var viejo = r && r.removedNodes[0] ? r.removedNodes[0].textContent : '';
          if (el.visor.classList.contains('abierto')) rodarContador(el.vLikeTxt, viejo);
        })).observe(el.vLikeTxt, { childList: true });
      }

      new MutationObserver(seguro(alCambiarMensajes)).observe(el.msgLista, { childList: true });
      // En captura: corre antes que el envío de expo-app.js (en modo demo la lista
      // se redibuja enseguida y hay que saber de antemano que hubo un envío).
      doc.addEventListener('submit', seguro(function (e) {
        if (e.target === el.msgForm) envioPendiente = ahora();
      }), true);
      cantidadMensajes = contarMensajes();

      bindVisor();

      if (mq) {
        if (mq.addEventListener) mq.addEventListener('change', seguro(onCambioMovimiento));
        else if (mq.addListener) mq.addListener(seguro(onCambioMovimiento));
      }

      var redimTimer = 0;
      global.addEventListener('resize', seguro(function () {
        global.clearTimeout(redimTimer);
        redimTimer = global.setTimeout(seguro(function () {
          invalidarChips();
          crearEspia();
          decidirObjetivo(false, true);
        }), 200);
      }));

      // Todo listo: recién ahora se activan los estilos que dependen de este archivo.
      prepararSalas(true);
      root.classList.add('anim-js');
      asegurarPildora();
      crearEspia();
      decidirObjetivo(false, true);
    } catch (err) {
      fallar(err);
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
