/**
 * Panel docente — Carga de fotos desde celular/PC, edición, textos de sala y moderación.
 */
(function (global) {
  'use strict';

  var state = {
    salas: [],
    obras: [],
    mensajes: [],
    queue: [],
    session: null,
    activeTab: 'subir'
  };

  var els = {
    connPill: document.getElementById('connPill'),
    userEmailLabel: document.getElementById('userEmailLabel'),
    btnToggleSetup: document.getElementById('btnToggleSetup'),
    btnLogout: document.getElementById('btnLogout'),
    setupCard: document.getElementById('setupCard'),
    setupForm: document.getElementById('setupForm'),
    sbUrl: document.getElementById('sbUrl'),
    sbKey: document.getElementById('sbKey'),
    btnDownloadConfig: document.getElementById('btnDownloadConfig'),
    btnClearOverride: document.getElementById('btnClearOverride'),
    loginCard: document.getElementById('loginCard'),
    loginForm: document.getElementById('loginForm'),
    loginPin: document.getElementById('loginPin'),
    btnLoginSubmit: document.getElementById('btnLoginSubmit'),
    workspace: document.getElementById('workspace'),
    tabObrasBtn: document.getElementById('tabObrasBtn'),
    tabMensajesBtn: document.getElementById('tabMensajesBtn'),
    upSala: document.getElementById('upSala'),
    inputCamera: document.getElementById('inputCamera'),
    inputGallery: document.getElementById('inputGallery'),
    queueList: document.getElementById('queueList'),
    queueActions: document.getElementById('queueActions'),
    btnUploadQueue: document.getElementById('btnUploadQueue'),
    btnClearQueue: document.getElementById('btnClearQueue'),
    admFilterSala: document.getElementById('admFilterSala'),
    admObrasList: document.getElementById('admObrasList'),
    admSalasList: document.getElementById('admSalasList'),
    admMensajesList: document.getElementById('admMensajesList'),
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editForm'),
    edId: document.getElementById('edId'),
    edSala: document.getElementById('edSala'),
    edAutor: document.getElementById('edAutor'),
    edTitulo: document.getElementById('edTitulo'),
    edDesc: document.getElementById('edDesc'),
    edSubmit: document.getElementById('edSubmit'),
    edCancel: document.getElementById('edCancel'),
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

  var toastTimer = null;
  function showToast(msg, isError) {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.classList.toggle('error', !!isError);
    els.toast.classList.add('visible');
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('visible');
    }, 3400);
  }

  function populateSalaSelects() {
    var baseOpts = '';
    state.salas.forEach(function (s) {
      baseOpts += '<option value="' + s.id + '">' + escapeHtml(s.grado + ' grado — ' + s.nombre) + '</option>';
    });
    els.upSala.innerHTML = baseOpts;
    els.edSala.innerHTML = baseOpts;
    els.admFilterSala.innerHTML = '<option value="">Todos los grados</option>' + baseOpts;
  }

  function renderHeaderAndGate() {
    var creds = global.getSupabaseCredentials();
    var isLive = creds.valid;
    els.sbUrl.value = creds.url || '';
    els.sbKey.value = creds.key || '';
    els.btnClearOverride.hidden = !(creds.valid && creds.source === 'local');

    if (isLive) {
      els.connPill.textContent = 'Supabase conectado';
      els.connPill.className = 'status-pill live';
      els.setupCard.hidden = true;
    } else {
      els.connPill.textContent = 'Modo vista previa';
      els.connPill.className = 'status-pill demo';
      els.setupCard.hidden = false;
    }

    if (isLive && !state.session) {
      els.loginCard.hidden = false;
      els.workspace.hidden = true;
      els.btnLogout.hidden = true;
      els.userEmailLabel.textContent = '';
    } else {
      els.loginCard.hidden = true;
      els.workspace.hidden = false;
      els.btnLogout.hidden = !isLive;
      els.userEmailLabel.textContent = state.session && state.session.user
        ? state.session.user.email
        : 'Pruebas locales (sin nube)';
    }
  }

  /* ---------- Cola de subida ---------- */
  function addFilesToQueue(fileList) {
    Array.from(fileList || []).forEach(function (file) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return;
      var previewUrl = URL.createObjectURL(file);
      state.queue.push({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        file: file,
        previewUrl: previewUrl,
        autor: '',
        titulo: '',
        descripcion: ''
      });
    });
    renderQueue();
  }

  function renderQueue() {
    if (!state.queue.length) {
      els.queueList.innerHTML = '';
      els.queueActions.hidden = true;
      return;
    }
    els.queueActions.hidden = false;
    var html = '';
    state.queue.forEach(function (item, idx) {
      var mb = (item.file.size / (1024 * 1024)).toFixed(2);
      html += '<div class="queue-item" data-q-idx="' + idx + '">'
        + '<img class="queue-thumb" src="' + escapeHtml(item.previewUrl) + '" alt="Vista previa" />'
        + '<div class="queue-fields">'
        + '<div class="queue-top"><span>Foto ' + (idx + 1) + ' (' + mb + ' MB · se comprimirá al subir)</span>'
        + '<button type="button" class="btn btn-xs btn-ghost" data-q-remove="' + idx + '">Quitar</button></div>'
        + '<div class="form-grid cols-2">'
        + '<div class="campo"><label>Autor/a (opcional)</label>'
        + '<input type="text" data-q-field="autor" data-q-idx="' + idx + '" value="' + escapeHtml(item.autor) + '" placeholder="Opcional" maxlength="80" /></div>'
        + '<div class="campo"><label>Título o técnica (opcional)</label>'
        + '<input type="text" data-q-field="titulo" data-q-idx="' + idx + '" value="' + escapeHtml(item.titulo) + '" placeholder="Ej. Acuarela / Collage" maxlength="100" /></div>'
        + '</div>'
        + '</div></div>';
    });
    els.queueList.innerHTML = html;
  }

  async function processQueueUpload() {
    if (!state.queue.length) return;
    var salaId = Number(els.upSala.value);
    els.btnUploadQueue.disabled = true;
    els.btnUploadQueue.textContent = 'Subiendo 0 de ' + state.queue.length + '…';

    var uploadedCount = 0;
    var remaining = [];

    for (var i = 0; i < state.queue.length; i++) {
      var item = state.queue[i];
      els.btnUploadQueue.textContent = 'Subiendo ' + (i + 1) + ' de ' + state.queue.length + '…';
      try {
        await global.ExpoStore.uploadObra({
          sala_id: salaId,
          turno: 'A',
          autor: item.autor,
          titulo: item.titulo,
          descripcion: item.descripcion,
          file: item.file
        });
        URL.revokeObjectURL(item.previewUrl);
        uploadedCount++;
      } catch (err) {
        remaining.push(item);
        showToast('Error en foto ' + (i + 1) + ': ' + (err.message || 'falló la subida'), true);
      }
    }

    state.queue = remaining;
    renderQueue();
    els.btnUploadQueue.disabled = false;
    els.btnUploadQueue.textContent = 'Publicar fotos en la muestra';

    if (uploadedCount > 0) {
      await reloadData();
      showToast(uploadedCount === 1 ? '¡Obra publicada!' : '¡Se publicaron ' + uploadedCount + ' obras!');
    }
  }

  /* ---------- Lista de obras ---------- */
  function renderObrasList() {
    els.tabObrasBtn.textContent = 'Obras cargadas (' + state.obras.length + ')';
    var salaF = els.admFilterSala.value;

    var filtered = state.obras.filter(function (o) {
      if (salaF && Number(o.sala_id) !== Number(salaF)) return false;
      return true;
    });

    if (!filtered.length) {
      els.admObrasList.innerHTML = '<div class="estado-vacio" style="grid-column:1/-1">No hay obras para mostrar en este grado.</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (o) {
      var sala = state.salas.find(function (s) { return s.id === Number(o.sala_id); }) || { grado: o.sala_id + '°' };
      var tituloCard = o.autor || o.titulo || (sala.grado + ' grado');
      html += '<article class="admin-obra-row">'
        + '<img src="' + escapeHtml(o.imagen_url) + '" alt="" loading="lazy" />'
        + '<div class="admin-obra-info">'
        + '<strong>' + escapeHtml(tituloCard) + '</strong>'
        + '<div class="admin-obra-meta">' + escapeHtml(sala.grado + ' grado')
        + (o.autor && o.titulo ? ' · ' + escapeHtml(o.titulo) : '')
        + ' · ' + (Number(o.likes_count) || 0) + ' me gusta</div>'
        + '<div class="admin-obra-btns">'
        + '<button type="button" class="btn btn-xs" data-edit-id="' + escapeHtml(o.id) + '">Editar</button>'
        + '<button type="button" class="btn btn-xs btn-danger" data-del-id="' + escapeHtml(o.id) + '">Borrar</button>'
        + '</div></div></article>';
    });
    els.admObrasList.innerHTML = html;
  }

  /* ---------- Editor de textos de salas ---------- */
  function renderSalasEditor() {
    var html = '';
    state.salas.forEach(function (s) {
      html += '<form class="sala-editor-item" data-sala-form="' + s.id + '">'
        + '<div class="sala-editor-head">'
        + '<span class="sala-chip-dot"><i style="background:' + escapeHtml(s.color) + '"></i>' + escapeHtml(s.grado + ' grado — ' + s.nombre) + '</span>'
        + '<button type="submit" class="btn btn-xs btn-primary">Guardar texto</button>'
        + '</div>'
        + '<div class="campo"><label>Descripción de la sala</label>'
        + '<textarea data-desc-a maxlength="260">' + escapeHtml(s.desc_a || s.desc_b || '') + '</textarea></div>'
        + '</form>';
    });
    els.admSalasList.innerHTML = html;
  }

  /* ---------- Moderación de mensajes ---------- */
  function renderMensajesAdmin() {
    els.tabMensajesBtn.textContent = 'Mensajes (' + state.mensajes.length + ')';
    if (!state.mensajes.length) {
      els.admMensajesList.innerHTML = '<div class="estado-vacio">Todavía no hay mensajes en el libro de visitas.</div>';
      return;
    }
    var html = '';
    state.mensajes.forEach(function (m) {
      var sala = m.sala_id ? state.salas.find(function (s) { return s.id === Number(m.sala_id); }) : null;
      html += '<div class="sala-editor-item">'
        + '<div class="sala-editor-head">'
        + '<strong>' + escapeHtml(m.autor_nombre) + (m.parentesco ? ' (' + escapeHtml(m.parentesco) + ')' : '') + ' · ' + escapeHtml(sala ? sala.grado + ' grado' : 'Toda la muestra') + '</strong>'
        + '<button type="button" class="btn btn-xs btn-danger" data-del-msg="' + escapeHtml(m.id) + '">Eliminar</button>'
        + '</div>'
        + '<p style="margin:0">' + escapeHtml(m.mensaje) + '</p>'
        + '</div>';
    });
    els.admMensajesList.innerHTML = html;
  }

  /* ---------- Modal edición ---------- */
  function openEditModal(obraId) {
    var obra = state.obras.find(function (o) { return String(o.id) === String(obraId); });
    if (!obra) return;
    els.edId.value = obra.id;
    els.edSala.value = String(obra.sala_id);
    els.edAutor.value = obra.autor || '';
    els.edTitulo.value = obra.titulo || '';
    els.edDesc.value = obra.descripcion || '';
    els.editModal.classList.add('abierto');
    els.edTitulo.focus();
  }

  function closeEditModal() {
    els.editModal.classList.remove('abierto');
  }

  /* ---------- Carga de datos ---------- */
  async function reloadData() {
    var res = await Promise.all([
      global.ExpoStore.fetchSalas(),
      global.ExpoStore.fetchObras(),
      global.ExpoStore.fetchMensajes()
    ]);
    state.salas = res[0].data;
    state.obras = res[1].data;
    state.mensajes = res[2].data;
    populateSalaSelects();
    renderObrasList();
    renderSalasEditor();
    renderMensajesAdmin();
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    els.btnToggleSetup.addEventListener('click', function () {
      els.setupCard.hidden = !els.setupCard.hidden;
    });

    els.setupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      global.setSupabaseOverride(els.sbUrl.value, els.sbKey.value);
      var creds = global.getSupabaseCredentials();
      if (!creds.valid) {
        showToast('Revisá el formato de la URL (https://....supabase.co) y la Publishable / anon key.', true);
        return;
      }
      state.session = await global.ExpoStore.getSession();
      renderHeaderAndGate();
      await reloadData();
      showToast('Credenciales guardadas. Iniciá sesión para gestionar la muestra.');
    });

    els.btnDownloadConfig.addEventListener('click', function () {
      var text = global.generateConfigFileText(els.sbUrl.value, els.sbKey.value);
      var blob = new Blob([text], { type: 'application/javascript;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'config.js';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      showToast('Se descargó config.js. Reemplazá js/config.js en tu repo de GitHub.');
    });

    els.btnClearOverride.addEventListener('click', async function () {
      global.setSupabaseOverride('', '');
      state.session = null;
      renderHeaderAndGate();
      await reloadData();
      showToast('Se quitaron las credenciales locales.');
    });

    els.loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      els.btnLoginSubmit.disabled = true;
      try {
        state.session = await global.ExpoStore.signInWithPin(els.loginPin.value.trim());
        els.loginPin.value = '';
        renderHeaderAndGate();
        await reloadData();
        showToast('¡Bienvenida al panel!');
      } catch (err) {
        showToast(err && err.message ? err.message : 'Número de acceso incorrecto.', true);
      } finally {
        els.btnLoginSubmit.disabled = false;
      }
    });

    els.btnLogout.addEventListener('click', async function () {
      await global.ExpoStore.signOut();
      state.session = null;
      renderHeaderAndGate();
    });

    document.querySelectorAll('[data-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        state.activeTab = target;
        document.querySelectorAll('[data-tab]').forEach(function (t) {
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(function (p) {
          p.hidden = p.id !== 'panel-' + target;
        });
      });
    });

    els.inputCamera.addEventListener('change', function () {
      addFilesToQueue(els.inputCamera.files);
      els.inputCamera.value = '';
    });
    els.inputGallery.addEventListener('change', function () {
      addFilesToQueue(els.inputGallery.files);
      els.inputGallery.value = '';
    });

    els.queueList.addEventListener('input', function (e) {
      var idx = e.target.getAttribute('data-q-idx');
      var field = e.target.getAttribute('data-q-field');
      if (idx != null && field && state.queue[idx]) {
        state.queue[idx][field] = e.target.value;
      }
    });
    els.queueList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-q-remove]');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-q-remove'), 10);
      if (state.queue[idx]) {
        URL.revokeObjectURL(state.queue[idx].previewUrl);
        state.queue.splice(idx, 1);
        renderQueue();
      }
    });
    els.btnClearQueue.addEventListener('click', function () {
      state.queue.forEach(function (it) { URL.revokeObjectURL(it.previewUrl); });
      state.queue = [];
      renderQueue();
    });
    els.btnUploadQueue.addEventListener('click', processQueueUpload);

    els.admFilterSala.addEventListener('change', renderObrasList);

    els.admObrasList.addEventListener('click', async function (e) {
      var editBtn = e.target.closest('[data-edit-id]');
      if (editBtn) {
        openEditModal(editBtn.getAttribute('data-edit-id'));
        return;
      }
      var delBtn = e.target.closest('[data-del-id]');
      if (delBtn) {
        var id = delBtn.getAttribute('data-del-id');
        var obra = state.obras.find(function (o) { return String(o.id) === String(id); });
        if (!obra) return;
        if (!global.confirm('¿Seguro que querés borrar esta obra' + (obra.autor ? ' de ' + obra.autor : '') + '?')) return;
        try {
          await global.ExpoStore.deleteObra(obra);
          await reloadData();
          showToast('Obra eliminada.');
        } catch (err) {
          showToast('No se pudo eliminar: ' + (err.message || ''), true);
        }
      }
    });

    els.edCancel.addEventListener('click', closeEditModal);
    els.editModal.addEventListener('click', function (e) {
      if (e.target === els.editModal) closeEditModal();
    });
    els.editForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      els.edSubmit.disabled = true;
      try {
        await global.ExpoStore.updateObra(els.edId.value, {
          sala_id: els.edSala.value,
          turno: 'A',
          autor: els.edAutor.value,
          titulo: els.edTitulo.value,
          descripcion: els.edDesc.value
        });
        closeEditModal();
        await reloadData();
        showToast('Cambios guardados.');
      } catch (err) {
        showToast('Error al guardar: ' + (err.message || ''), true);
      } finally {
        els.edSubmit.disabled = false;
      }
    });

    els.admSalasList.addEventListener('submit', async function (e) {
      var form = e.target.closest('[data-sala-form]');
      if (!form) return;
      e.preventDefault();
      var salaId = form.getAttribute('data-sala-form');
      var descA = form.querySelector('[data-desc-a]').value;
      try {
        await global.ExpoStore.updateSala(salaId, { desc_a: descA, desc_b: '' });
        await reloadData();
        showToast('Texto de ' + salaId + '° grado actualizado.');
      } catch (err) {
        showToast('Error al guardar textos: ' + (err.message || ''), true);
      }
    });

    els.admMensajesList.addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-del-msg]');
      if (!btn) return;
      if (!global.confirm('¿Eliminar este mensaje del libro de visitas?')) return;
      try {
        await global.ExpoStore.deleteMensaje(btn.getAttribute('data-del-msg'));
        await reloadData();
        showToast('Mensaje eliminado.');
      } catch (err) {
        showToast('No se pudo eliminar el mensaje.', true);
      }
    });
  }

  async function init() {
    bindEvents();
    try {
      state.session = await global.ExpoStore.getSession();
    } catch (_) {
      state.session = null;
    }
    renderHeaderAndGate();
    await reloadData();
  }

  init();
})(window);
