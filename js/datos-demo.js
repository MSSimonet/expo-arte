/**
 * Datos e ilustraciones de ejemplo usados únicamente mientras Supabase aún no esté conectado.
 * Permiten previsualizar la app, los filtros, el zoom, los "Me gusta" y el libro de visitas.
 */
(function (global) {
  'use strict';

  var FONDOS = ['#dff3fb', '#fdf3d8', '#e9f7e3', '#fdeef4', '#eef0ff', '#fff1de'];

  function buildSampleSvg(tipo, semilla) {
    var f = FONDOS[semilla % FONDOS.length];
    var inner = '';
    switch (tipo) {
      case 'pez':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<ellipse cx="196" cy="156" rx="104" ry="60" fill="#f4762a"/>'
          + '<path d="M292 156 L364 112 L364 200 Z" fill="#f4762a"/>'
          + '<circle cx="152" cy="140" r="12" fill="#fff"/><circle cx="152" cy="140" r="6" fill="#22303c"/>'
          + '<path d="M104 184 Q152 204 208 188" stroke="#c24e12" stroke-width="8" fill="none" stroke-linecap="round"/>'
          + '<circle cx="84" cy="92" r="12" fill="#bfe6f5"/><circle cx="116" cy="56" r="8" fill="#bfe6f5"/><circle cx="320" cy="72" r="10" fill="#bfe6f5"/>'
          + '<path d="M0 276 Q50 256 100 276 T200 276 T300 276 T400 276 L400 300 L0 300 Z" fill="#7cc7e8"/>';
        break;
      case 'casa':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<circle cx="328" cy="68" r="38" fill="#ffc21f"/>'
          + '<rect y="208" width="400" height="92" fill="#69b96a"/>'
          + '<rect x="124" y="132" width="132" height="92" fill="#fff" stroke="#d8cfc0" stroke-width="4"/>'
          + '<path d="M108 136 L190 80 L272 136 Z" fill="#e8443a"/>'
          + '<rect x="172" y="168" width="36" height="56" fill="#8a5a33"/>'
          + '<rect x="136" y="148" width="28" height="28" fill="#bfe6f5"/><rect x="216" y="148" width="28" height="28" fill="#bfe6f5"/>'
          + '<path d="M40 236 q12 -20 24 0 M320 244 q12 -20 24 0" stroke="#3d8b4f" stroke-width="6" fill="none" stroke-linecap="round"/>';
        break;
      case 'arcoiris':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<path d="M60 216 A140 140 0 0 1 340 216" stroke="#e8443a" stroke-width="22" fill="none"/>'
          + '<path d="M84 216 A116 116 0 0 1 316 216" stroke="#f4762a" stroke-width="22" fill="none"/>'
          + '<path d="M108 216 A92 92 0 0 1 292 216" stroke="#ffc21f" stroke-width="22" fill="none"/>'
          + '<path d="M132 216 A68 68 0 0 1 268 216" stroke="#3fae5a" stroke-width="22" fill="none"/>'
          + '<ellipse cx="68" cy="220" rx="40" ry="20" fill="#fff"/><ellipse cx="332" cy="220" rx="40" ry="20" fill="#fff"/>'
          + '<rect y="236" width="400" height="64" fill="#69b96a"/>'
          + '<circle cx="104" cy="264" r="8" fill="#e8443a"/><circle cx="192" cy="276" r="8" fill="#ffc21f"/><circle cx="292" cy="262" r="8" fill="#df3e7c"/>';
        break;
      case 'flor':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<circle cx="344" cy="56" r="28" fill="#ffc21f"/>'
          + '<rect y="224" width="400" height="76" fill="#69b96a"/>'
          + '<path d="M200 236 L200 148" stroke="#3d8b4f" stroke-width="12" stroke-linecap="round"/>'
          + '<path d="M200 192 Q156 176 148 144 Q188 148 200 180" fill="#3fae5a"/>'
          + '<g fill="#df3e7c"><circle cx="200" cy="84" r="24"/><circle cx="160" cy="112" r="24"/><circle cx="240" cy="112" r="24"/><circle cx="172" cy="140" r="22"/><circle cx="228" cy="140" r="22"/></g>'
          + '<circle cx="200" cy="116" r="22" fill="#ffc21f"/>'
          + '<circle cx="88" cy="252" r="8" fill="#fff"/><circle cx="316" cy="256" r="8" fill="#fff"/>';
        break;
      case 'sol':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<g stroke="#f4762a" stroke-width="12" stroke-linecap="round">'
          + '<path d="M200 24v28M200 192v28M68 124h28M304 124h28M108 48l20 20M272 180l20 20M292 48l-20 20M128 180l-20 20"/></g>'
          + '<circle cx="200" cy="124" r="72" fill="#ffc21f"/>'
          + '<circle cx="174" cy="112" r="8" fill="#22303c"/><circle cx="226" cy="112" r="8" fill="#22303c"/>'
          + '<path d="M168 148 Q200 176 232 148" stroke="#22303c" stroke-width="8" fill="none" stroke-linecap="round"/>'
          + '<circle cx="148" cy="136" r="12" fill="#f4a04e" opacity=".7"/><circle cx="252" cy="136" r="12" fill="#f4a04e" opacity=".7"/>'
          + '<ellipse cx="68" cy="252" rx="48" ry="18" fill="#fff"/><ellipse cx="336" cy="260" rx="52" ry="18" fill="#fff"/>';
        break;
      case 'arbol':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<rect y="224" width="400" height="76" fill="#69b96a"/>'
          + '<path d="M188 232 L196 152 L204 152 L212 232 Z" fill="#8a5a33"/>'
          + '<circle cx="200" cy="104" r="60" fill="#3fae5a"/><circle cx="144" cy="132" r="40" fill="#4cba67"/><circle cx="256" cy="132" r="40" fill="#35954e"/>'
          + '<circle cx="172" cy="88" r="10" fill="#e8443a"/><circle cx="224" cy="116" r="10" fill="#e8443a"/><circle cx="196" cy="68" r="10" fill="#e8443a"/><circle cx="252" cy="88" r="10" fill="#e8443a"/>'
          + '<circle cx="72" cy="256" r="8" fill="#ffc21f"/><circle cx="328" cy="252" r="8" fill="#df3e7c"/>';
        break;
      case 'mariposa':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<rect y="236" width="400" height="64" fill="#69b96a"/>'
          + '<ellipse cx="144" cy="116" rx="52" ry="40" fill="#7c5cd6" transform="rotate(-24 144 116)"/>'
          + '<ellipse cx="256" cy="116" rx="52" ry="40" fill="#7c5cd6" transform="rotate(24 256 116)"/>'
          + '<ellipse cx="152" cy="184" rx="38" ry="28" fill="#b79bf0" transform="rotate(20 152 184)"/>'
          + '<ellipse cx="248" cy="184" rx="38" ry="28" fill="#b79bf0" transform="rotate(-20 248 184)"/>'
          + '<ellipse cx="200" cy="152" rx="14" ry="52" fill="#22303c"/>'
          + '<path d="M192 104 Q172 72 152 68 M208 104 Q228 72 248 68" stroke="#22303c" stroke-width="6" fill="none" stroke-linecap="round"/>'
          + '<circle cx="140" cy="112" r="10" fill="#ffc21f"/><circle cx="260" cy="112" r="10" fill="#ffc21f"/>'
          + '<circle cx="80" cy="260" r="10" fill="#df3e7c"/><circle cx="324" cy="264" r="10" fill="#e8443a"/>';
        break;
      case 'cohete':
        inner = '<rect width="400" height="300" fill="#26315e"/>'
          + '<circle cx="68" cy="60" r="6" fill="#fff"/><circle cx="336" cy="44" r="6" fill="#fff"/><circle cx="300" cy="236" r="6" fill="#fff"/><circle cx="52" cy="208" r="5" fill="#fff"/><circle cx="364" cy="140" r="5" fill="#fff"/><circle cx="116" cy="256" r="5" fill="#fff"/>'
          + '<path d="M200 32 C236 68 244 124 236 184 L164 184 C156 124 164 68 200 32 Z" fill="#eef1f6"/>'
          + '<path d="M200 32 C216 52 226 76 230 104 L170 104 C174 76 184 52 200 32 Z" fill="#e8443a"/>'
          + '<circle cx="200" cy="136" r="22" fill="#7cc7e8" stroke="#9aa7b8" stroke-width="6"/>'
          + '<path d="M164 168 L128 216 L164 204 Z" fill="#e8443a"/><path d="M236 168 L272 216 L236 204 Z" fill="#e8443a"/>'
          + '<path d="M184 192 Q200 244 216 192 Q208 212 200 212 Q192 212 184 192Z" fill="#f4762a"/>'
          + '<circle cx="328" cy="88" r="20" fill="#ffc21f" opacity=".9"/>';
        break;
      case 'barco':
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<circle cx="60" cy="56" r="26" fill="#ffc21f"/>'
          + '<path d="M196 216 L196 80 L264 184 L196 184" fill="#fff" stroke="#d8cfc0" stroke-width="4"/>'
          + '<path d="M184 216 L184 112 L128 184 L184 184" fill="#fbd3d0" stroke="#d8cfc0" stroke-width="4"/>'
          + '<path d="M104 212 L296 212 L272 252 L128 252 Z" fill="#b06a35"/>'
          + '<path d="M0 264 Q32 248 66 264 T132 264 T198 264 T264 264 T330 264 T400 264 L400 300 L0 300 Z" fill="#4aa3d8"/>'
          + '<path d="M0 284 Q32 272 66 284 T132 284 T198 284 T264 284 T330 284 T400 284 L400 300 L0 300 Z" fill="#2e7cd6"/>';
        break;
      default:
        inner = '<rect width="400" height="300" fill="' + f + '"/>'
          + '<rect y="236" width="400" height="64" fill="#a8dcb0"/>'
          + '<path d="M124 124 L116 60 L172 96 Z" fill="#f4a04e"/><path d="M276 124 L284 60 L228 96 Z" fill="#f4a04e"/>'
          + '<path d="M132 116 L126 80 L160 100 Z" fill="#fbd3d0"/><path d="M268 116 L274 80 L240 100 Z" fill="#fbd3d0"/>'
          + '<circle cx="200" cy="164" r="84" fill="#f7b267"/>'
          + '<circle cx="168" cy="152" r="10" fill="#22303c"/><circle cx="232" cy="152" r="10" fill="#22303c"/>'
          + '<path d="M190 180 L210 180 L200 192 Z" fill="#df3e7c"/>'
          + '<path d="M200 192 Q200 208 180 204 M200 192 Q200 208 220 204" stroke="#22303c" stroke-width="6" fill="none" stroke-linecap="round"/>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="800" height="600">' + inner + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var SEED_SPECS = [
    { sala_id: 1, turno: 'A', autor: 'Valentina', titulo: 'Pez naranja en el agua', tipo: 'pez', likes: 8 },
    { sala_id: 1, turno: 'A', autor: 'Mateo', titulo: 'Sol sonriente', tipo: 'sol', likes: 5 },
    { sala_id: 1, turno: 'A', autor: null, titulo: 'Casita con jardín', tipo: 'casa', likes: 4 },
    { sala_id: 1, turno: 'A', autor: 'Sofía', titulo: 'Flor rosada', tipo: 'flor', likes: 6 },
    { sala_id: 1, turno: 'B', autor: 'Thiago', titulo: 'Mi casa', tipo: 'casa', likes: 7 },
    { sala_id: 1, turno: 'B', autor: 'Emma', titulo: 'Arcoíris después de la lluvia', tipo: 'arcoiris', likes: 9 },
    { sala_id: 1, turno: 'B', autor: 'León', titulo: 'Sol de verano', tipo: 'sol', likes: 3 },

    { sala_id: 2, turno: 'A', autor: 'Bautista', titulo: 'Flor de primavera', tipo: 'flor', likes: 6 },
    { sala_id: 2, turno: 'A', autor: 'Catalina', titulo: 'Árbol con manzanas', tipo: 'arbol', likes: 8 },
    { sala_id: 2, turno: 'A', autor: 'Felipe', titulo: 'Mariposa violeta', tipo: 'mariposa', likes: 5 },
    { sala_id: 2, turno: 'B', autor: 'Simón', titulo: 'Gato naranja', tipo: 'gato', likes: 11 },
    { sala_id: 2, turno: 'B', autor: 'Olivia', titulo: 'Pez nadador', tipo: 'pez', likes: 4 },
    { sala_id: 2, turno: 'B', autor: 'Dante', titulo: 'Mariposa del patio', tipo: 'mariposa', likes: 7 },

    { sala_id: 3, turno: 'A', autor: 'Alma', titulo: 'Casas del barrio', tipo: 'casa', likes: 10 },
    { sala_id: 3, turno: 'A', autor: 'Vicente', titulo: 'La plaza del árbol', tipo: 'arbol', likes: 6 },
    { sala_id: 3, turno: 'A', autor: 'Lucía', titulo: 'Barco en el río', tipo: 'barco', likes: 9 },
    { sala_id: 3, turno: 'B', autor: 'Salvador', titulo: 'Fondo del mar', tipo: 'pez', likes: 7 },
    { sala_id: 3, turno: 'B', autor: 'Emilia', titulo: 'Velero viajero', tipo: 'barco', likes: 5 },
    { sala_id: 3, turno: 'B', autor: 'Ramiro', titulo: 'Pez de colores', tipo: 'pez', likes: 4 },

    { sala_id: 4, turno: 'A', autor: 'Tomás', titulo: 'Retrato felino', tipo: 'gato', likes: 12 },
    { sala_id: 4, turno: 'A', autor: 'Valentina', titulo: 'Margarita', tipo: 'flor', likes: 5 },
    { sala_id: 4, turno: 'B', autor: 'Benjamín', titulo: 'Cohete al espacio', tipo: 'cohete', likes: 14 },
    { sala_id: 4, turno: 'B', autor: 'Isabella', titulo: 'Planetas y estrellas', tipo: 'sol', likes: 8 },

    { sala_id: 5, turno: 'A', autor: 'Martina', titulo: 'Río y velero', tipo: 'barco', likes: 7 },
    { sala_id: 5, turno: 'A', autor: 'Joaquina', titulo: 'Bosque del sur', tipo: 'arbol', likes: 9 },
    { sala_id: 5, turno: 'B', autor: 'Olivia', titulo: 'Estampa de flores', tipo: 'flor', likes: 6 },
    { sala_id: 5, turno: 'B', autor: 'Dante', titulo: 'Arcoíris en sellos', tipo: 'arcoiris', likes: 8 },

    { sala_id: 6, turno: 'A', autor: 'Renata', titulo: 'Esquina en perspectiva', tipo: 'casa', likes: 10 },
    { sala_id: 6, turno: 'A', autor: 'Ciro', titulo: 'Cohete urbano', tipo: 'cohete', likes: 7 },
    { sala_id: 6, turno: 'B', autor: 'Gael', titulo: 'Gato con cartón reciclado', tipo: 'gato', likes: 13 },
    { sala_id: 6, turno: 'B', autor: 'Aurora', titulo: 'Mariposa de papel', tipo: 'mariposa', likes: 9 },

    { sala_id: 7, turno: 'A', autor: 'Juana', titulo: 'Homenaje al color', tipo: 'arcoiris', likes: 15 },
    { sala_id: 7, turno: 'A', autor: 'Ramiro', titulo: 'Noche estrellada', tipo: 'cohete', likes: 11 },
    { sala_id: 7, turno: 'B', autor: 'Sofía', titulo: 'Travesía final', tipo: 'barco', likes: 16 },
    { sala_id: 7, turno: 'B', autor: 'Thiago', titulo: 'Nuestro árbol', tipo: 'arbol', likes: 12 }
  ];

  function getDemoObras() {
    return SEED_SPECS.map(function (item, idx) {
      return {
        id: 'demo-' + (idx + 1),
        sala_id: item.sala_id,
        turno: item.turno,
        autor: item.autor,
        titulo: item.titulo,
        descripcion: 'Trabajo de muestra — se reemplaza por las fotografías reales al conectar Supabase.',
        imagen_path: 'demo/' + item.tipo,
        imagen_url: buildSampleSvg(item.tipo, idx + item.sala_id),
        orden: idx + 1,
        likes_count: item.likes,
        created_at: new Date(Date.now() - (idx * 3600000)).toISOString(),
        is_demo: true
      };
    });
  }

  function getDemoMensajes() {
    return [
      {
        id: 'demo-msg-1',
        sala_id: 3,
        autor_nombre: 'Familia Gómez',
        parentesco: 'Mamá y papá de Alma',
        mensaje: '¡Hermosos todos los trabajos del barrio! Qué lindo ver cuánto crearon este año con la profe Alicia.',
        aprobado: true,
        created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString()
      },
      {
        id: 'demo-msg-2',
        sala_id: null,
        autor_nombre: 'Abuelos de Mateo',
        parentesco: 'Abuelos',
        mensaje: 'Felicitaciones a todos los chicos y chicas de la Billinghurst por esta exposición llena de color.',
        aprobado: true,
        created_at: new Date(Date.now() - 1000 * 60 * 115).toISOString()
      }
    ];
  }

  global.EXPO_DEMO = {
    getDemoObras: getDemoObras,
    getDemoMensajes: getDemoMensajes
  };
})(window);
