# Pequeños grandes artistas — Muestra interactiva con QR

Aplicación web para la exposición de arte de la **Escuela N° 5 D.E. 13 “Roberto Billinghurst”** (`Viernes 20 de noviembre de 2026`).

- **Muestra pública (`index.html`):** las familias escanean el código QR del grado con la cámara de su celular y acceden directo sin instalar ninguna app ni crear cuenta.
- **Entrada por QR por grado (`?sala=1` a `?sala=7`):** si escanean el QR de `3° grado`, ven primero esa sala con un cartel de bienvenida, pero conservan la barra superior para recorrer libremente todos los grados (`1°` a `7°`), filtrar por turno (`Mañana A` / `Tarde B`), buscar por nombre, dar **Me gusta**, ampliar/descargar/compartir por WhatsApp y dejar mensajes en el **Libro de visitas**.
- **Panel docente privado (`admin.html`):** pensado para usar desde el celular en el aula (sacar o elegir fotos, compresión automática a WebP/JPEG, editar datos y textos de cada sala, moderar mensajes).
- **Carteles QR listos para imprimir (`qr-imprimir.html`):** genera los 7 carteles A4 por grado (más un cartel general opcional) para imprimir o guardar en PDF.

---

## Guía rápida para publicar en GitHub Pages + Supabase

### Paso 1: Crear el proyecto en Supabase (gratis)
1. Entrá a [supabase.com](https://supabase.com), iniciá sesión y creá un proyecto nuevo (**New project**).
2. En el menú izquierdo, abrí **SQL Editor → New query**.
3. Copiá todo el contenido del archivo `supabase-setup.sql`, pegalo y tocá **Run**.
   - Esto crea las tablas `salas`, `obras`, `mensajes`, la función segura de *Me gusta* (`reaccionar_obra`), el bucket de fotos `obras` y las políticas de seguridad (RLS).
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
2. Subí todos los archivos del proyecto (`index.html`, `admin.html`, `qr-imprimir.html`, `assets/`, `styles/`, `js/`, `.nojekyll`).
3. Entrá a **Settings → Pages** en tu repositorio:
   - En **Source** elegí **Deploy from a branch**.
   - Elegí rama `main` y carpeta `/ (root)` → **Save**.
4. En ~1 minuto tu web queda publicada en `https://tu-usuario.github.io/pequenos-grandes-artistas/`.

### Paso 4: Imprimir los QR
1. Abrí `https://tu-usuario.github.io/pequenos-grandes-artistas/qr-imprimir.html`.
2. Verificá que la URL superior sea la dirección pública de GitHub Pages (sin `localhost` ni `file://`).
3. Elegí **1 cartel grande por hoja A4** (para paredes/puertas) o **2 tarjetas por hoja A4** (para mesas).
4. Tocá **Imprimir / Guardar PDF**.
