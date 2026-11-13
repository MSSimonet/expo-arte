#!/usr/bin/env node
/**
 * Genera las fotos de la muestra a partir de la carpeta Obras/.
 *
 *   Obras/1 … Obras/7  →  fotos de 1° a 7° grado (jpg, jpeg, png o webp)
 *
 * Por cada foto crea, en assets/obras/N/:
 *   <id>.webp     versión grande (máx. 1600 px de lado) → la que se ve en el visor
 *   <id>-t.webp   miniatura (máx. 480 px de lado)        → la que se ve en la grilla
 * y escribe obras.json, que es lo que lee el sitio.
 *
 * Seguridad:
 *   - Obras/ solo se LEE: este script nunca escribe ni borra nada ahí.
 *   - Solo se limpia dentro de assets/obras/ (y únicamente archivos que él mismo genera).
 *   - Los WebP salen SIN metadatos (EXIF, GPS, etc.).
 *
 * Uso:   npm run obras
 * Opciones (para pruebas): --raiz <carpeta>  --entrada <carpeta>  --salida <carpeta>  --json <archivo>  --forzar
 */
import { readdir, readFile, writeFile, mkdir, rm, stat, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------- Ajustes ---------- */
const LADO_GRANDE = 1600;
const LADO_MINI = 480;
const CALIDAD_GRANDE = 82;
const CALIDAD_MINI = 74;
const OPCIONES = `g${LADO_GRANDE}q${CALIDAD_GRANDE}-m${LADO_MINI}q${CALIDAD_MINI}-v1`;
const EXTENSIONES = /\.(jpe?g|png|webp)$/i;
const IGNORAR = /^(\.|thumbs\.db$|desktop\.ini$)/i;
const NOMBRE_GENERADO = /^[0-9a-f]{16}(-t)?\.webp$/;
const GRADOS = [1, 2, 3, 4, 5, 6, 7];

/* ---------- Argumentos ---------- */
function leerArgumentos(argv) {
  const a = { forzar: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--forzar') a.forzar = true;
    else if (k === '--ayuda' || k === '-h') a.ayuda = true;
    else if (['--raiz', '--entrada', '--salida', '--json'].includes(k)) a[k.slice(2)] = argv[++i];
  }
  return a;
}

const args = leerArgumentos(process.argv.slice(2));
if (args.ayuda) {
  console.log('Uso: npm run obras\nOpciones: --raiz <carpeta> --entrada <carpeta> --salida <carpeta> --json <archivo> --forzar');
  process.exit(0);
}

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(args.raiz || path.join(aqui, '..'));
const ENTRADA = path.resolve(args.entrada || path.join(RAIZ, 'Obras'));
const SALIDA = path.resolve(args.salida || path.join(RAIZ, 'assets', 'obras'));
const ARCHIVO_JSON = path.resolve(args.json || path.join(RAIZ, 'obras.json'));

/* ---------- Utilidades ---------- */
const existe = p => access(p).then(() => true, () => false);
const posix = p => p.split(path.sep).join('/');
const sha1 = dato => createHash('sha1').update(dato).digest('hex');
const ordenNatural = new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare;
const kb = n => `${(n / 1024).toFixed(0)} KB`;

function dentroDe(hijo, padre) {
  const r = path.relative(padre, hijo);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
}

/** id estable de la foto: SHA-1 de su ruta relativa (siempre con "/" y normalizada), 16 caracteres hexadecimales. */
export function idDeFoto(rutaRelativa) {
  const normal = rutaRelativa.replace(/\\/g, '/').replace(/^\/+/, '').normalize('NFC');
  return sha1(normal).slice(0, 16);
}

/** "Autor - Título.jpg" → { autor, titulo }. Cualquier otro nombre queda sin autor ni título. */
export function deducirAutorTitulo(nombreArchivo) {
  const base = nombreArchivo.replace(/\.[^.]+$/, '').normalize('NFC').trim();
  const m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m) return { autor: null, titulo: null };
  const autor = m[1].trim().slice(0, 80);
  const titulo = m[2].trim().slice(0, 100);
  return { autor: autor || null, titulo: titulo || null };
}

async function cargarSharp() {
  try {
    return (await import('sharp')).default;
  } catch (e) {
    console.error('\nNo se encontró "sharp". Instalá las dependencias una vez con:\n\n    npm install\n');
    process.exit(1);
  }
}

async function leerJsonPrevio() {
  try {
    const j = JSON.parse(await readFile(ARCHIVO_JSON, 'utf8'));
    if (j && j.opciones === OPCIONES && Array.isArray(j.obras)) return new Map(j.obras.map(o => [o.id, o]));
  } catch (_) { /* sin archivo previo */ }
  return new Map();
}

/* ---------- Proceso ---------- */
async function main() {
  const t0 = Date.now();

  // Obras/ solo se lee: ni la salida ni el json pueden quedar adentro de la entrada.
  if (dentroDe(SALIDA, ENTRADA) || dentroDe(ENTRADA, SALIDA) || dentroDe(ARCHIVO_JSON, ENTRADA)) {
    console.error('Error de configuración: la carpeta de salida no puede estar dentro de la de entrada (ni al revés).');
    process.exit(1);
  }
  if (!(await existe(ENTRADA))) {
    console.error(`No existe la carpeta de fotos: ${ENTRADA}\nCreala y poné las fotos en Obras/1 … Obras/7. No se modificó nada.`);
    process.exit(1);
  }

  const sharp = await cargarSharp();
  const previo = args.forzar ? new Map() : await leerJsonPrevio();

  // Carpetas que no son grados (ej. Obras/8) se avisan y se ignoran.
  const contenido = await readdir(ENTRADA, { withFileTypes: true });
  for (const e of contenido) {
    if (IGNORAR.test(e.name)) continue;
    if (e.isDirectory() && !GRADOS.includes(Number(e.name))) console.warn(`  ⚠ Se ignora "Obras/${e.name}": solo se usan las carpetas 1 a 7.`);
    if (e.isFile()) console.warn(`  ⚠ Se ignora "Obras/${e.name}": las fotos van dentro de Obras/1 … Obras/7.`);
  }

  const obras = [];
  const resumen = [];
  const mantener = new Set(); // rutas (absolutas) de archivos generados que deben quedar

  for (const grado of GRADOS) {
    const dirGrado = path.join(ENTRADA, String(grado));
    const fila = { grado, fotos: 0, nuevas: 0, iguales: 0, omitidas: 0 };
    resumen.push(fila);
    if (!(await existe(dirGrado))) continue;

    const archivos = (await readdir(dirGrado, { withFileTypes: true }))
      .filter(e => e.isFile() && !IGNORAR.test(e.name))
      .map(e => e.name)
      .sort(ordenNatural);

    for (const nombre of archivos) {
      if (!EXTENSIONES.test(nombre)) {
        console.warn(`  ⚠ Obras/${grado}/${nombre}: formato no soportado (usá jpg, png o webp; las fotos .heic del iPhone hay que convertirlas). Se omite.`);
        fila.omitidas++;
        continue;
      }
      const rutaRel = `${grado}/${nombre}`;
      const id = idDeFoto(rutaRel);
      const archivoGrande = path.join(SALIDA, String(grado), `${id}.webp`);
      const archivoMini = path.join(SALIDA, String(grado), `${id}-t.webp`);

      try {
        const buf = await readFile(path.join(dirGrado, nombre));
        const v = sha1(buf).slice(0, 8);
        const { autor, titulo } = deducirAutorTitulo(nombre);
        const anterior = previo.get(id);
        let ancho, alto, ancho_mini, alto_mini;

        if (anterior && anterior.v === v && (await existe(archivoGrande)) && (await existe(archivoMini))) {
          ({ ancho, alto, ancho_mini, alto_mini } = anterior);
          fila.iguales++;
        } else {
          await mkdir(path.dirname(archivoGrande), { recursive: true });
          // .rotate() aplica la orientación EXIF; por defecto sharp NO copia metadatos (EXIF/GPS) a la salida.
          const base = sharp(buf, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });
          const g = await base.clone()
            .resize({ width: LADO_GRANDE, height: LADO_GRANDE, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: CALIDAD_GRANDE, effort: 5 })
            .toFile(archivoGrande);
          const m = await base.clone()
            .resize({ width: LADO_MINI, height: LADO_MINI, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: CALIDAD_MINI, effort: 5 })
            .toFile(archivoMini);
          ancho = g.width; alto = g.height; ancho_mini = m.width; alto_mini = m.height;
          fila.nuevas++;
        }

        mantener.add(archivoGrande);
        mantener.add(archivoMini);
        obras.push({
          id, grado, autor, titulo,
          imagen: posix(path.relative(RAIZ, archivoGrande)),
          miniatura: posix(path.relative(RAIZ, archivoMini)),
          ancho, alto, ancho_mini, alto_mini, v,
          origen: rutaRel
        });
        fila.fotos++;
      } catch (e) {
        console.warn(`  ⚠ Obras/${rutaRel}: no se pudo procesar (${e.message.split('\n')[0]}). Se omite.`);
        fila.omitidas++;
      }
    }
  }

  // Limpieza: solo dentro de la carpeta de salida y solo archivos con el nombre que genera este script.
  let borrados = 0;
  if (await existe(SALIDA)) {
    for (const g of await readdir(SALIDA, { withFileTypes: true })) {
      if (!g.isDirectory()) continue;
      const dirG = path.join(SALIDA, g.name);
      for (const f of await readdir(dirG, { withFileTypes: true })) {
        const abs = path.join(dirG, f.name);
        if (f.isFile() && NOMBRE_GENERADO.test(f.name) && dentroDe(abs, SALIDA) && !mantener.has(abs)) {
          await rm(abs);
          borrados++;
        }
      }
    }
  }

  const json = { version: 1, opciones: OPCIONES, generado: new Date().toISOString(), obras };
  await mkdir(path.dirname(ARCHIVO_JSON), { recursive: true });
  await writeFile(ARCHIVO_JSON, JSON.stringify(json, null, 1) + '\n', 'utf8');

  // Controles: tamaños y que los WebP no traigan metadatos.
  let bytesG = 0, bytesM = 0, conMetadatos = 0;
  for (const o of obras) {
    bytesG += (await stat(path.join(RAIZ, o.imagen))).size;
    bytesM += (await stat(path.join(RAIZ, o.miniatura))).size;
    for (const rel of [o.imagen, o.miniatura]) {
      const md = await sharp(path.join(RAIZ, rel)).metadata();
      if (md.exif || md.xmp || md.iptc) conMetadatos++;
    }
  }

  console.log('\nFotos por grado');
  for (const f of resumen) {
    console.log(`  ${f.grado}° grado: ${String(f.fotos).padStart(3)} foto(s)` + (f.nuevas ? `  (${f.nuevas} nueva/s)` : '') + (f.iguales ? `  (${f.iguales} sin cambios)` : '') + (f.omitidas ? `  (${f.omitidas} omitida/s)` : ''));
  }
  console.log(`\nTotal: ${obras.length} foto(s) → grandes ${kb(bytesG)}, miniaturas ${kb(bytesM)}.`);
  console.log(conMetadatos === 0 ? 'Metadatos (EXIF/GPS): ninguno en los WebP generados ✓' : `⚠ ${conMetadatos} archivo(s) con metadatos: revisar.`);
  if (borrados) console.log(`Se limpiaron ${borrados} archivo(s) generados que ya no corresponden a ninguna foto.`);
  console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s → ${posix(path.relative(RAIZ, ARCHIVO_JSON))}`);
  console.log('\nSiguiente paso: subí los cambios (assets/obras y obras.json) a GitHub.');
}

main().catch(e => {
  console.error('\nError inesperado:', e && e.message ? e.message : e);
  process.exit(1);
});
