/**
 * Carga diferida del video del pie (retrato de la docente).
 *
 * El video pesa ~350 KB y está al final de la página: no tiene sentido bajarlo mientras las familias
 * esperan las fotos. Por eso el <video> lleva preload="none" (se ve solo el póster) y este archivo lo
 * reproduce recién cuando el pie se acerca a la pantalla.
 *
 * Mejora progresiva: si este archivo no carga, o la persona pidió menos movimiento, o tiene el ahorro
 * de datos activado, el video no se baja y queda el póster.
 */
(function (global) {
  'use strict';

  var video = document.querySelector('video.retrato');
  if (!video) return;

  var reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ahorroDeDatos = global.navigator && global.navigator.connection && global.navigator.connection.saveData;
  if (reducido || ahorroDeDatos || !('IntersectionObserver' in global)) return;

  var cerca = false;

  function reproducir() {
    if (video.preload !== 'auto') video.preload = 'auto';
    var promesa = video.play();
    if (promesa && promesa.catch) promesa.catch(function () { /* el navegador puede bloquearlo: queda el póster */ });
  }

  function actualizar() {
    if (cerca && !document.hidden) reproducir();
    else if (!video.paused) video.pause();
  }

  // 400 px antes de entrar en pantalla; se pausa al salir o con la pestaña oculta (ahorra batería).
  new IntersectionObserver(function (entradas) {
    cerca = entradas[entradas.length - 1].isIntersecting;
    actualizar();
  }, { rootMargin: '400px 0px' }).observe(video);

  document.addEventListener('visibilitychange', actualizar);
})(window);
