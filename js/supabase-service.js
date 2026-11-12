/**
 * Capa unificada de datos (Supabase real + respaldo interactivo en modo vista previa).
 * Compartida entre la muestra pública (index.html) y el panel docente (admin.html).
 */
(function (global) {
  'use strict';

  var KEYS = {
    LIKED: 'expo_liked_obras_v1',
    DOCENTE_PIN: 'expo_docente_pin_v1',
    DEMO_OBRAS: 'expo_demo_obras_v1',
    DEMO_MENSAJES: 'expo_demo_mensajes_v1',
    DEMO_SALAS: 'expo_demo_salas_v1'
  };

  var _client = null;
  var _clientSignature = '';

  function getStoredPin() {
    try {
      return global.localStorage.getItem(KEYS.DOCENTE_PIN) || '';
    } catch (_) {
      return '';
    }
  }

  function setStoredPin(pin) {
    try {
      if (pin) {
        global.localStorage.setItem(KEYS.DOCENTE_PIN, pin);
      } else {
        global.localStorage.removeItem(KEYS.DOCENTE_PIN);
      }
    } catch (_) {}
    _client = null;
    _clientSignature = '';
  }

  function getClient() {
    var creds = global.getSupabaseCredentials();
    if (!creds.valid || !global.supabase || !global.supabase.createClient) {
      return null;
    }
    var pin = getStoredPin();
    var sig = creds.url + '|' + creds.key + '|' + pin;
    if (!_client || _clientSignature !== sig) {
      var opts = {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      };
      if (pin) {
        opts.global = {
          headers: {
            'x-docente-pin': pin
          }
        };
      }
      _client = global.supabase.createClient(creds.url, creds.key, opts);
      _clientSignature = sig;
    }
    return _client;
  }

  function isLive() {
    return !!getClient();
  }

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  /* ---------- Likes locales por dispositivo ---------- */
  function getLikedSet() {
    var arr = readJson(KEYS.LIKED, []);
    return Array.isArray(arr) ? arr : [];
  }

  function isObraLiked(id) {
    return getLikedSet().indexOf(String(id)) !== -1;
  }

  function setObraLikedLocal(id, liked) {
    var sid = String(id);
    var set = getLikedSet().filter(function (x) { return x !== sid; });
    if (liked) set.push(sid);
    writeJson(KEYS.LIKED, set);
  }

  /* ---------- Salas ---------- */
  function ensureDemoSalas() {
    var saved = readJson(KEYS.DEMO_SALAS, null);
    if (Array.isArray(saved) && saved.length === 7) return saved;
    var fresh = global.SALAS_DEFAULT.map(function (s) { return Object.assign({}, s); });
    writeJson(KEYS.DEMO_SALAS, fresh);
    return fresh;
  }

  async function fetchSalas() {
    var sb = getClient();
    if (!sb) return { data: ensureDemoSalas(), mode: 'demo' };

    var res = await sb.from('salas').select('*').order('id', { ascending: true });
    if (res.error) throw res.error;
    var rows = Array.isArray(res.data) && res.data.length ? res.data : global.SALAS_DEFAULT;
    return { data: rows, mode: 'live' };
  }

  async function updateSala(id, patch) {
    var sb = getClient();
    var payload = {
      desc_a: String(patch.desc_a || '').trim(),
      desc_b: String(patch.desc_b || '').trim(),
      updated_at: new Date().toISOString()
    };

    if (!sb) {
      var salas = ensureDemoSalas().map(function (s) {
        return Number(s.id) === Number(id) ? Object.assign({}, s, payload) : s;
      });
      writeJson(KEYS.DEMO_SALAS, salas);
      return salas.find(function (s) { return Number(s.id) === Number(id); });
    }

    var res = await sb.from('salas').update(payload).eq('id', Number(id)).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  /* ---------- Obras ---------- */
  function ensureDemoObras() {
    var saved = readJson(KEYS.DEMO_OBRAS, null);
    if (Array.isArray(saved)) return saved;
    var seed = global.EXPO_DEMO.getDemoObras();
    writeJson(KEYS.DEMO_OBRAS, seed);
    return seed;
  }

  async function fetchObras() {
    var sb = getClient();
    if (!sb) {
      return { data: ensureDemoObras(), mode: 'demo' };
    }

    var res = await sb
      .from('obras')
      .select('*')
      .order('sala_id', { ascending: true })
      .order('turno', { ascending: true })
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });

    if (res.error) throw res.error;
    return { data: res.data || [], mode: 'live' };
  }

  async function reactToObra(obraId, shouldLike) {
    var delta = shouldLike ? 1 : -1;
    var sb = getClient();
    setObraLikedLocal(obraId, shouldLike);

    if (!sb) {
      var obras = ensureDemoObras();
      var nuevo = 0;
      obras = obras.map(function (o) {
        if (String(o.id) === String(obraId)) {
          nuevo = Math.max(0, (Number(o.likes_count) || 0) + delta);
          return Object.assign({}, o, { likes_count: nuevo });
        }
        return o;
      });
      writeJson(KEYS.DEMO_OBRAS, obras);
      return nuevo;
    }

    var res = await sb.rpc('reaccionar_obra', { p_obra_id: obraId, p_delta: delta });
    if (res.error) {
      setObraLikedLocal(obraId, !shouldLike);
      throw res.error;
    }
    return Number(res.data) || 0;
  }

  /* ---------- Compresión de fotos en navegador ---------- */
  async function compressImageFile(file, options) {
    var maxSide = (options && options.maxSide) || 1600;
    var quality = (options && options.quality) || 0.84;

    var imgSource = null;
    var width = 0;
    var height = 0;

    if (typeof global.createImageBitmap === 'function') {
      try {
        imgSource = await global.createImageBitmap(file, { imageOrientation: 'from-image' });
        width = imgSource.width;
        height = imgSource.height;
      } catch (_) {
        imgSource = null;
      }
    }

    if (!imgSource) {
      imgSource = await new Promise(function (resolve, reject) {
        var img = new Image();
        var objUrl = URL.createObjectURL(file);
        img.onload = function () {
          URL.revokeObjectURL(objUrl);
          resolve(img);
        };
        img.onerror = function (err) {
          URL.revokeObjectURL(objUrl);
          reject(err || new Error('No se pudo leer la imagen'));
        };
        img.src = objUrl;
      });
      width = imgSource.naturalWidth || imgSource.width;
      height = imgSource.naturalHeight || imgSource.height;
    }

    var scale = Math.min(1, maxSide / Math.max(width, height));
    var targetW = Math.max(1, Math.round(width * scale));
    var targetH = Math.max(1, Math.round(height * scale));

    var canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(imgSource, 0, 0, targetW, targetH);
    if (imgSource && typeof imgSource.close === 'function') {
      imgSource.close();
    }

    function toBlob(mime, q) {
      return new Promise(function (resolve) {
        canvas.toBlob(function (b) { resolve(b); }, mime, q);
      });
    }

    var blob = await toBlob('image/webp', quality);
    var mime = 'image/webp';
    var ext = 'webp';

    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob('image/jpeg', quality);
      mime = 'image/jpeg';
      ext = 'jpg';
    }

    return {
      blob: blob,
      mime: mime,
      ext: ext,
      width: targetW,
      height: targetH,
      originalBytes: file.size,
      compressedBytes: blob ? blob.size : file.size
    };
  }

  function randomId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function uploadObra(input) {
    var salaId = Number(input.sala_id);
    var turno = input.turno === 'B' ? 'B' : 'A';
    var autor = (input.autor || '').trim() || null;
    var titulo = (input.titulo || '').trim() || null;
    var descripcion = (input.descripcion || '').trim() || null;

    var compressed = await compressImageFile(input.file);
    var sb = getClient();

    if (!sb) {
      var dataUrl = await blobToDataUrl(compressed.blob);
      var nueva = {
        id: 'demo-' + randomId(),
        sala_id: salaId,
        turno: turno,
        autor: autor,
        titulo: titulo,
        descripcion: descripcion,
        imagen_path: 'demo/local',
        imagen_url: dataUrl,
        orden: 0,
        likes_count: 0,
        created_at: new Date().toISOString(),
        is_demo: true
      };
      var obras = ensureDemoObras();
      obras.unshift(nueva);
      writeJson(KEYS.DEMO_OBRAS, obras);
      return nueva;
    }

    var storagePath = 'sala-' + salaId + '/' + turno + '/' + Date.now() + '-' + randomId() + '.' + compressed.ext;
    var uploadRes = await sb.storage
      .from('obras')
      .upload(storagePath, compressed.blob, {
        contentType: compressed.mime,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadRes.error) throw uploadRes.error;

    var pub = sb.storage.from('obras').getPublicUrl(storagePath);
    var publicUrl = pub && pub.data && pub.data.publicUrl;

    var insertRes = await sb
      .from('obras')
      .insert({
        sala_id: salaId,
        turno: turno,
        autor: autor,
        titulo: titulo,
        descripcion: descripcion,
        imagen_path: storagePath,
        imagen_url: publicUrl
      })
      .select()
      .single();

    if (insertRes.error) {
      await sb.storage.from('obras').remove([storagePath]);
      throw insertRes.error;
    }

    return insertRes.data;
  }

  async function updateObra(id, patch) {
    var payload = {
      sala_id: Number(patch.sala_id),
      turno: patch.turno === 'B' ? 'B' : 'A',
      autor: (patch.autor || '').trim() || null,
      titulo: (patch.titulo || '').trim() || null,
      descripcion: (patch.descripcion || '').trim() || null
    };

    var sb = getClient();
    if (!sb) {
      var obras = ensureDemoObras().map(function (o) {
        return String(o.id) === String(id) ? Object.assign({}, o, payload) : o;
      });
      writeJson(KEYS.DEMO_OBRAS, obras);
      return obras.find(function (o) { return String(o.id) === String(id); });
    }

    var res = await sb.from('obras').update(payload).eq('id', id).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function deleteObra(obra) {
    var sb = getClient();
    if (!sb) {
      var obras = ensureDemoObras().filter(function (o) {
        return String(o.id) !== String(obra.id);
      });
      writeJson(KEYS.DEMO_OBRAS, obras);
      return true;
    }

    var res = await sb.from('obras').delete().eq('id', obra.id);
    if (res.error) throw res.error;

    if (obra.imagen_path && obra.imagen_path.indexOf('demo/') !== 0) {
      await sb.storage.from('obras').remove([obra.imagen_path]);
    }
    return true;
  }

  /* ---------- Libro de visitas ---------- */
  function ensureDemoMensajes() {
    var saved = readJson(KEYS.DEMO_MENSAJES, null);
    if (Array.isArray(saved)) return saved;
    var seed = global.EXPO_DEMO.getDemoMensajes();
    writeJson(KEYS.DEMO_MENSAJES, seed);
    return seed;
  }

  async function fetchMensajes() {
    var sb = getClient();
    if (!sb) return { data: ensureDemoMensajes(), mode: 'demo' };

    var res = await sb
      .from('mensajes')
      .select('*')
      .eq('aprobado', true)
      .order('created_at', { ascending: false })
      .limit(80);

    if (res.error) throw res.error;
    return { data: res.data || [], mode: 'live' };
  }

  async function createMensaje(input) {
    var row = {
      sala_id: input.sala_id ? Number(input.sala_id) : null,
      autor_nombre: String(input.autor_nombre || '').trim().slice(0, 60),
      parentesco: String(input.parentesco || '').trim().slice(0, 60) || null,
      mensaje: String(input.mensaje || '').trim().slice(0, 400),
      aprobado: true
    };

    if (!row.autor_nombre || !row.mensaje) {
      throw new Error('Completá tu nombre y el mensaje.');
    }

    var sb = getClient();
    if (!sb) {
      var created = Object.assign({}, row, {
        id: 'demo-msg-' + randomId(),
        created_at: new Date().toISOString()
      });
      var list = ensureDemoMensajes();
      list.unshift(created);
      writeJson(KEYS.DEMO_MENSAJES, list);
      return created;
    }

    var res = await sb.from('mensajes').insert(row).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function deleteMensaje(id) {
    var sb = getClient();
    if (!sb) {
      var list = ensureDemoMensajes().filter(function (m) {
        return String(m.id) !== String(id);
      });
      writeJson(KEYS.DEMO_MENSAJES, list);
      return true;
    }
    var res = await sb.from('mensajes').delete().eq('id', id);
    if (res.error) throw res.error;
    return true;
  }

  /* ---------- Autenticación de docentes ---------- */
  async function checkPinRemote(sb, pin) {
    var res = await sb.rpc('verificar_pin_docente', { p_pin: pin });
    if (res.error) {
      if (res.error.code === 'PGRST202' || String(res.error.message || '').indexOf('verificar_pin_docente') !== -1) {
        throw new Error('Falta ejecutar supabase-pin-update.sql en el SQL Editor de Supabase para habilitar el código de acceso.');
      }
      throw res.error;
    }
    return res.data === true;
  }

  async function getSession() {
    var sb = getClient();
    if (!sb) return null;

    var pin = getStoredPin();
    if (pin) {
      try {
        var ok = await checkPinRemote(sb, pin);
        if (ok) {
          return { pinVerified: true, user: { email: 'Docente autorizado' } };
        }
      } catch (_) {}
      setStoredPin('');
    }

    var res = await sb.auth.getSession();
    if (res.error) throw res.error;
    return res.data.session || null;
  }

  async function signIn(email, password) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase aún no está configurado.');
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data.session;
  }

  async function signInWithPin(pin) {
    var cleanPin = String(pin || '').trim();
    if (!cleanPin) {
      throw new Error('Ingresá el número de acceso docente.');
    }
    var sb = getClient();
    if (!sb) throw new Error('Supabase aún no está configurado.');

    var ok = await checkPinRemote(sb, cleanPin);
    if (!ok) {
      throw new Error('Número incorrecto. Verificá el código e intentá de nuevo.');
    }

    setStoredPin(cleanPin);
    return { pinVerified: true, user: { email: 'Docente autorizado' } };
  }

  async function signOut() {
    var sb = getClient();
    setStoredPin('');
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch (_) {}
  }

  function resetDemoData() {
    try {
      global.localStorage.removeItem(KEYS.DEMO_OBRAS);
      global.localStorage.removeItem(KEYS.DEMO_MENSAJES);
      global.localStorage.removeItem(KEYS.DEMO_SALAS);
      global.localStorage.removeItem(KEYS.LIKED);
    } catch (_) {}
  }

  global.ExpoStore = {
    isLive: isLive,
    isObraLiked: isObraLiked,
    fetchSalas: fetchSalas,
    updateSala: updateSala,
    fetchObras: fetchObras,
    reactToObra: reactToObra,
    compressImageFile: compressImageFile,
    uploadObra: uploadObra,
    updateObra: updateObra,
    deleteObra: deleteObra,
    fetchMensajes: fetchMensajes,
    createMensaje: createMensaje,
    deleteMensaje: deleteMensaje,
    getSession: getSession,
    signIn: signIn,
    signInWithPin: signInWithPin,
    signOut: signOut,
    resetDemoData: resetDemoData
  };
})(window);
