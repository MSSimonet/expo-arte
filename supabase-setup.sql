/* Pequeños grandes artistas — Configuración inicial de Supabase (Escuela N° 5 D.E. 13) */

-- 1. Tabla de Salas (1° a 7° grado)
create table if not exists public.salas (
  id integer primary key check (id between 1 and 7),
  grado text not null,
  nombre text not null,
  color text not null,
  color_dark text not null,
  desc_a text not null default '',
  desc_b text not null default '',
  updated_at timestamptz not null default now()
);

-- 2. Tabla de Obras
create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  sala_id integer not null references public.salas(id) on delete cascade,
  turno text not null check (turno in ('A', 'B')),
  autor text,
  titulo text,
  descripcion text,
  imagen_path text not null,
  imagen_url text not null,
  orden integer not null default 0,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_obras_sala_turno
  on public.obras (sala_id, turno, orden asc, created_at desc);

-- 3. Tabla de Mensajes (Libro de visitas de las familias)
create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  sala_id integer references public.salas(id) on delete set null,
  autor_nombre text not null check (char_length(btrim(autor_nombre)) between 1 and 60),
  parentesco text check (parentesco is null or char_length(btrim(parentesco)) <= 60),
  mensaje text not null check (char_length(btrim(mensaje)) between 1 and 400),
  aprobado boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_mensajes_created
  on public.mensajes (created_at desc);

-- 4. Función segura (RPC) para "Me gusta" anónimos sin abrir escritura directa en obras
create or replace function public.reaccionar_obra(p_obra_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuevo integer;
begin
  if p_delta not in (-1, 1) then
    raise exception 'Delta inválido: debe ser 1 o -1';
  end if;

  update public.obras
  set likes_count = greatest(0, likes_count + p_delta)
  where id = p_obra_id
  returning likes_count into v_nuevo;

  return coalesce(v_nuevo, 0);
end;
$$;

revoke all on function public.reaccionar_obra(uuid, integer) from public;
grant execute on function public.reaccionar_obra(uuid, integer) to anon, authenticated;

-- 4b. Acceso docente por número PIN (validado en servidor y políticas RLS)
create or replace function public.es_docente_pin()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-docente-pin',
    ''
  ) = '46411564';
$$;

create or replace function public.verificar_pin_docente(p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select btrim(coalesce(p_pin, '')) = '46411564';
$$;

revoke all on function public.verificar_pin_docente(text) from public;
grant execute on function public.verificar_pin_docente(text) to anon, authenticated;

-- 5. Row Level Security (RLS)
alter table public.salas enable row level security;
alter table public.obras enable row level security;
alter table public.mensajes enable row level security;

-- Lectura pública de salas y obras
drop policy if exists "Lectura publica de salas" on public.salas;
create policy "Lectura publica de salas"
  on public.salas for select
  using (true);

drop policy if exists "Docentes editan salas" on public.salas;
create policy "Docentes editan salas"
  on public.salas for all
  using (auth.role() = 'authenticated' or public.es_docente_pin())
  with check (auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Lectura publica de obras" on public.obras;
create policy "Lectura publica de obras"
  on public.obras for select
  using (true);

drop policy if exists "Docentes gestionan obras" on public.obras;
create policy "Docentes gestionan obras"
  on public.obras for all
  using (auth.role() = 'authenticated' or public.es_docente_pin())
  with check (auth.role() = 'authenticated' or public.es_docente_pin());

-- Mensajes: familias pueden leer los aprobados y enviar mensajes; docentes moderan/borran
drop policy if exists "Lectura publica de mensajes" on public.mensajes;
create policy "Lectura publica de mensajes"
  on public.mensajes for select
  using (aprobado = true or auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Familias dejan mensajes" on public.mensajes;
create policy "Familias dejan mensajes"
  on public.mensajes for insert
  with check (
    aprobado = true
    and char_length(btrim(autor_nombre)) between 1 and 60
    and char_length(btrim(mensaje)) between 1 and 400
  );

drop policy if exists "Docentes moderan mensajes" on public.mensajes;
create policy "Docentes moderan mensajes"
  on public.mensajes for update
  using (auth.role() = 'authenticated' or public.es_docente_pin())
  with check (auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Docentes borran mensajes" on public.mensajes;
create policy "Docentes borran mensajes"
  on public.mensajes for delete
  using (auth.role() = 'authenticated' or public.es_docente_pin());

-- 6. Storage: Bucket público "obras" para las fotografías
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'obras',
  'obras',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 6291456,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

drop policy if exists "Fotos publicas de obras" on storage.objects;
create policy "Fotos publicas de obras"
  on storage.objects for select
  using (bucket_id = 'obras');

drop policy if exists "Docentes suben fotos" on storage.objects;
create policy "Docentes suben fotos"
  on storage.objects for insert
  with check (bucket_id = 'obras' and (auth.role() = 'authenticated' or public.es_docente_pin()));

drop policy if exists "Docentes actualizan fotos" on storage.objects;
create policy "Docentes actualizan fotos"
  on storage.objects for update
  using (bucket_id = 'obras' and (auth.role() = 'authenticated' or public.es_docente_pin()));

drop policy if exists "Docentes borran fotos" on storage.objects;
create policy "Docentes borran fotos"
  on storage.objects for delete
  using (bucket_id = 'obras' and (auth.role() = 'authenticated' or public.es_docente_pin()));

-- 7. Datos iniciales de las 7 salas (1° a 7° grado)
insert into public.salas (id, grado, nombre, color, color_dark, desc_a, desc_b) values
  (1, '1°', 'Primer grado',  '#12a5b4', '#076b7a', 'Primeros trazos: exploramos líneas, manchas y colores con témpera y crayones.', 'Jugamos con las formas y los colores para crear nuestros primeros paisajes.'),
  (2, '2°', 'Segundo grado', '#7c5cd6', '#5b3ec2', 'El jardín de la escuela: observamos las plantas y las flores, y las dibujamos del natural.', 'Animales con formas geométricas: recortamos, pegamos y pintamos.'),
  (3, '3°', 'Tercer grado',  '#2e7cd6', '#1a5da8', 'El barrio: dibujamos las casas, la plaza y los lugares que recorremos todos los días.', 'Bajo el mar: peces, pulpos y tesoros con collage y acuarela.'),
  (4, '4°', 'Cuarto grado',  '#1e9e57', '#0f6b35', 'Retratos y autorretratos: nos miramos, nos dibujamos y nos reímos de nosotros mismos.', 'El cielo y el espacio: cohetes, planetas y estrellas sobre papel oscuro.'),
  (5, '5°', 'Quinto grado',  '#ef8a17', '#9a5500', 'Naturaleza argentina: paisajes de la montaña, el río y la llanura.', 'Estampas y sellos: repetimos motivos y creamos patrones llenos de color.'),
  (6, '6°', 'Sexto grado',   '#df3e7c', '#b81e5a', 'La ciudad en perspectiva: edificios, puentes y calles con profundidad.', 'Arte y reciclado: obras hechas con materiales reutilizados del aula.'),
  (7, '7°', 'Séptimo grado', '#2b3a9e', '#232f7d', 'Homenaje a grandes artistas: reinterpretamos obras famosas a nuestro modo.', 'Proyecto final: una obra libre para cerrar el paso por la escuela primaria.')
on conflict (id) do nothing;
