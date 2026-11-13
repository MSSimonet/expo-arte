# Pequeños grandes artistas — Muestra interactiva con QR

Aplicación web para la exposición de arte de la **Escuela N° 5 D.E. 13 “Roberto Billinghurst”** (`Viernes 20 de noviembre de 2026`).

- **Muestra pública (`index.html`):** las familias escanean el código QR del grado con la cámara de su celular y acceden directo sin instalar ninguna app ni crear cuenta.
- **Entrada por QR por grado (`?sala=1` a `?sala=7`):** si escanean el QR de `3° grado`, ven primero esa sala con un cartel de bienvenida, pero conservan la barra superior para recorrer libremente todos los grados (`1°` a `7°`), dar **Me gusta**, ampliar/descargar/compartir por WhatsApp y dejar mensajes en el **Libro de visitas**.
- **Las fotos salen de la carpeta `Obras/`:** `Obras/1` es 1° grado, `Obras/2` es 2° grado, y así hasta `Obras/7`. Un script las optimiza y arma el sitio (ver **Cómo agregar fotos**).
- **Panel docente privado (`admin.html`):** para editar los textos de cada sala y moderar los mensajes del libro de visitas.
- **Carteles QR listos para imprimir (`qr-imprimir.html`):** genera los 7 carteles A4 por grado (más un cartel general opcional) para imprimir o guardar en PDF.

---

## Cómo agregar fotos

Las fotos **no** se suben desde el panel: se copian a la carpeta del grado y se corre un comando.

**Una sola vez** (en la computadora donde trabajás): instalá [Node.js](https://nodejs.org) y, dentro de la carpeta del proyecto, corré `npm install`.

**Cada vez que quieras agregar o cambiar fotos:**

1. **Copiá las fotos** a la carpeta del grado: `Obras/1` (1° grado) … `Obras/7` (7° grado). Sirven archivos `.jpg`, `.jpeg`, `.png` y `.webp`. Las fotos `.heic` del iPhone hay que convertirlas antes.
   - Se muestran **ordenadas por nombre** (con orden natural: `foto 2` va antes que `foto 10`).
   - *(Opcional)* Para mostrar autor y título, nombrá el archivo **`Autor - Título.jpg`** (con un espacio, un guion y un espacio). Por ejemplo `Sofía - Mi gato.jpg`. Las fotos con otro nombre (como las de WhatsApp) se muestran sin título.
2. **Corré el comando** dentro de la carpeta del proyecto:
   ```
   npm run obras
   ```
   Genera, para cada foto, una versión grande (hasta 1600 px, para el visor) y una miniatura (480 px, para la grilla) en `assets/obras/N/`, y escribe `obras.json`. Es rápido: lo que no cambió no se vuelve a procesar. Los archivos generados **no llevan metadatos** (ni ubicación GPS ni datos de la cámara).
3. **Subí los cambios a GitHub:** los archivos nuevos de `assets/obras/` y `obras.json` (`git add assets/obras obras.json`, `git commit`, `git push`). En un par de minutos las fotos aparecen en la muestra.

Cosas para saber:
- `Obras/` es **solo tuya**: el script únicamente la lee. **No se sube a GitHub** (está en `.gitignore`); conviene tener un respaldo aparte de tus fotos originales.
- Para **sacar** una foto, borrala de `Obras/N` y corré `npm run obras` otra vez: el script también limpia sus versiones generadas.
- Cada foto se identifica por su ruta (por ejemplo `3/foto.jpeg`). Si **renombrás o movés** una foto, es una foto nueva y su contador de **Me gusta** empieza de cero.
- Si una carpeta no existe o está vacía, esa sala muestra "Todavía no se cargaron obras".

---

## Guía rápida para publicar en GitHub Pages + Supabase

### Paso 1: Crear el proyecto en Supabase (gratis)
1. Entrá a [supabase.com](https://supabase.com), iniciá sesión y creá un proyecto nuevo (**New project**).
2. En el menú izquierdo, abrí **SQL Editor → New query**.
3. Copiá todo el contenido del archivo `supabase-setup.sql`, pegalo y tocá **Run**.
   - Esto crea las tablas `salas`, `obras`, `mensajes`, la función segura de *Me gusta* (`reaccionar_obra`), el bucket de fotos `obras` y las políticas de seguridad (RLS).
   - Después corré también, en otra consulta, **`supabase-me-gusta-fotos.sql`**: crea la tabla `obra_likes` y la función `reaccionar_foto`, que cuentan los *Me gusta* de las fotos de `Obras/`. **Hay que correrlo antes de publicar**, o los *Me gusta* dan error.
   - Para los textos de cada sala, corré **`supabase-descripciones-salas.sql`** (o editalos desde el panel docente, en *Textos de salas*).
   - Las tablas `obras` y el bucket `obras` quedan de la versión anterior (cuando las fotos se subían desde el panel): ya no se usan y se pueden dejar como respaldo.
4. En **Authentication → Users → Add user → Create new user**, creá el correo y contraseña con el que los docentes van a entrar a `admin.html`.
5. En **Project Settings → API**, copiá:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key** (`eyJ...`)

### Paso 2: Guardar las claves en la app
Podés hacerlo de cualquiera de estas dos maneras:
- **Directo en el código:** abrí `js/config.js` y completá `supabaseUrl` y `supabaseAnonKey`.
- **O desde el navegador:** abrí `admin.html`, pegá la URL y la clave en **Conectar con Supabase** y tocá **Descargar js/config.js para GitHub** para reemplazar el archivo `js/config.js`.

### Paso 3: Subir a GitHub Pages (gratis)
1. Creá un repositorio nuevo en GitHub (por ejemplo `pequenos-grandes-artistas`).
2. Subí todos los archivos del proyecto (`index.html`, `admin.html`, `qr-imprimir.html`, `obras.json`, `assets/` (incluye `assets/obras/`), `styles/`, `js/`, `.nojekyll`). La carpeta `Obras/` **no** se sube.
3. Entrá a **Settings → Pages** en tu repositorio:
   - En **Source** elegí **Deploy from a branch**.
   - Elegí rama `main` y carpeta `/ (root)` → **Save**.
4. En ~1 minuto tu web queda publicada en `https://tu-usuario.github.io/pequenos-grandes-artistas/`.

### Paso 4: Imprimir los QR
1. Abrí `https://tu-usuario.github.io/pequenos-grandes-artistas/qr-imprimir.html`.
2. Verificá que la URL superior sea la dirección pública de GitHub Pages (sin `localhost` ni `file://`).
3. Elegí **1 cartel grande por hoja A4** (para paredes/puertas) o **2 tarjetas por hoja A4** (para mesas).
4. Tocá **Imprimir / Guardar PDF**.
