/**
 * Configuración central de la exposición y conexión con Supabase.
 *
 * Para publicar en GitHub Pages con base de datos real:
 * 1. Creá un proyecto en https://supabase.com y ejecutá supabase-setup.sql
 * 2. Pegá debajo tu Project URL y anon public key (Project Settings -> API)
 * 3. Subí los cambios a tu repositorio de GitHub
 */
(function (global) {
  'use strict';

  var STORAGE_OVERRIDE_KEY = 'expo_supabase_override_v1';

  var SALAS_DEFAULT = [
    {
      id: 1,
      grado: '1°',
      nombre: 'Primer grado',
      color: '#12a5b4',
      color_dark: '#076b7a',
      desc_a: 'Guardianes del Reino Minúsculo, forjadores de la pequeña fauna en trazo, color y volumen.',
      desc_b: ''
    },
    {
      id: 2,
      grado: '2°',
      nombre: 'Segundo grado',
      color: '#7c5cd6',
      color_dark: '#5b3ec2',
      desc_a: 'Protectores del Follaje Nativo y Señores de las Bestias Aladas, nacidos de la tinta y de los cuentos antiguos.',
      desc_b: ''
    },
    {
      id: 3,
      grado: '3°',
      nombre: 'Tercer grado',
      color: '#2e7cd6',
      color_dark: '#1a5da8',
      desc_a: 'Custodios de los Árboles Nativos y Exploradores de la Selva Misionera, señores del relieve y de la magia desplegable.',
      desc_b: ''
    },
    {
      id: 4,
      grado: '4°',
      nombre: 'Cuarto grado',
      color: '#1e9e57',
      color_dark: '#0f6b35',
      desc_a: 'Cartógrafos del Barrio y de las Calles, guardianes de las estatuas de piedra transformadas en relieve.',
      desc_b: ''
    },
    {
      id: 5,
      grado: '5°',
      nombre: 'Quinto grado',
      color: '#ef8a17',
      color_dark: '#9a5500',
      desc_a: 'Titanes del Movimiento y de la Materia, señores que otorgan danza y vida a los huesos en mundos imaginarios.',
      desc_b: ''
    },
    {
      id: 6,
      grado: '6°',
      nombre: 'Sexto grado',
      color: '#df3e7c',
      color_dark: '#b81e5a',
      desc_a: 'Sabios del Delta y Defensores de la Tierra, forjadores de relieves en cartón y guardianes del grabado ecológico.',
      desc_b: ''
    },
    {
      id: 7,
      grado: '7°',
      nombre: 'Séptimo grado',
      color: '#2b3a9e',
      color_dark: '#232f7d',
      desc_a: 'Maestros de la Perspectiva y Herederos del Muro, caballeros del esténcil y discípulos de la rebelión urbana.',
      desc_b: ''
    }
  ];

  var EXPO_CONFIG = {
    expoTitle: 'Pequeños grandes artistas',
    schoolName: 'Escuela N° 5 D.E. 13 “Roberto Billinghurst”',
    city: 'Ciudad de Buenos Aires',
    expoDate: 'Viernes 20 de noviembre de 2026',
    organizerName: 'Prof. Alicia Correa',
    organizerRole: 'Docente de Plástica — los trabajos de esta exposición son el resultado de su trabajo en el aula con cada grado.',
    // Completar con los datos de tu proyecto en Supabase:
    supabaseUrl: 'https://ffwnfluyutkfdtjfrypv.supabase.co',
    supabaseAnonKey: 'sb_publishable_Nj6KG9L88C9dZYEsTWVafQ_D30HINbJ'
  };

  function getOverride() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_OVERRIDE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) return parsed;
    } catch (_) {}
    return null;
  }

  function setOverride(url, key) {
    try {
      if (!url || !key) {
        global.localStorage.removeItem(STORAGE_OVERRIDE_KEY);
      } else {
        global.localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify({
          supabaseUrl: String(url).trim().replace(/\/+$/, ''),
          supabaseAnonKey: String(key).trim()
        }));
      }
    } catch (_) {}
  }

  function getSupabaseCredentials() {
    var url = (EXPO_CONFIG.supabaseUrl || '').trim().replace(/\/+$/, '');
    var key = (EXPO_CONFIG.supabaseAnonKey || '').trim();
    var source = 'config';
    if (!url || !key) {
      var ov = getOverride();
      if (ov) {
        url = ov.supabaseUrl;
        key = ov.supabaseAnonKey;
        source = 'local';
      }
    }
    var valid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 20;
    return { url: url, key: key, valid: valid, source: source };
  }

  function generateConfigFileText(url, key) {
    var safeUrl = String(url || '').trim().replace(/\/+$/, '').replace(/'/g, "\\'");
    var safeKey = String(key || '').trim().replace(/'/g, "\\'");
    return [
      '/**',
      ' * Configuración central de la exposición y conexión con Supabase.',
      ' */',
      '(function (global) {',
      "  'use strict';",
      "  var STORAGE_OVERRIDE_KEY = 'expo_supabase_override_v1';",
      '  var SALAS_DEFAULT = ' + JSON.stringify(SALAS_DEFAULT, null, 2) + ';',
      '  var EXPO_CONFIG = {',
      "    expoTitle: '" + EXPO_CONFIG.expoTitle + "',",
      "    schoolName: '" + EXPO_CONFIG.schoolName + "',",
      "    city: '" + EXPO_CONFIG.city + "',",
      "    expoDate: '" + EXPO_CONFIG.expoDate + "',",
      "    organizerName: '" + EXPO_CONFIG.organizerName + "',",
      "    organizerRole: '" + EXPO_CONFIG.organizerRole + "',",
      "    supabaseUrl: '" + safeUrl + "',",
      "    supabaseAnonKey: '" + safeKey + "'",
      '  };',
      '  function getOverride() {',
      '    try {',
      '      var raw = global.localStorage && global.localStorage.getItem(STORAGE_OVERRIDE_KEY);',
      '      if (!raw) return null;',
      '      var parsed = JSON.parse(raw);',
      '      if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) return parsed;',
      '    } catch (_) {}',
      '    return null;',
      '  }',
      '  function setOverride(u, k) {',
      '    try {',
      '      if (!u || !k) global.localStorage.removeItem(STORAGE_OVERRIDE_KEY);',
      '      else global.localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify({ supabaseUrl: String(u).trim().replace(/\\/+$/, ""), supabaseAnonKey: String(k).trim() }));',
      '    } catch (_) {}',
      '  }',
      '  function getSupabaseCredentials() {',
      '    var u = (EXPO_CONFIG.supabaseUrl || "").trim().replace(/\\/+$/, "");',
      '    var k = (EXPO_CONFIG.supabaseAnonKey || "").trim();',
      '    var source = "config";',
      '    if (!u || !k) { var ov = getOverride(); if (ov) { u = ov.supabaseUrl; k = ov.supabaseAnonKey; source = "local"; } }',
      '    var valid = /^https:\\/\\/[a-z0-9-]+\\.supabase\\.co$/i.test(u) && k.length > 20;',
      '    return { url: u, key: k, valid: valid, source: source };',
      '  }',
      '  global.EXPO_CONFIG = EXPO_CONFIG;',
      '  global.SALAS_DEFAULT = SALAS_DEFAULT;',
      '  global.getSupabaseCredentials = getSupabaseCredentials;',
      '  global.setSupabaseOverride = setOverride;',
      '})(window);',
      ''
    ].join('\n');
  }

  global.EXPO_CONFIG = EXPO_CONFIG;
  global.SALAS_DEFAULT = SALAS_DEFAULT;
  global.getSupabaseCredentials = getSupabaseCredentials;
  global.setSupabaseOverride = setOverride;
  global.generateConfigFileText = generateConfigFileText;
})(window);
