/* Pequeños grandes artistas — Habilitar ingreso docente con número de acceso (PIN) */

-- IMPORTANTE: el número de acceso docente real NO se guarda en este repositorio.
-- Antes de ejecutar este archivo, reemplazá CAMBIAR_ANTES_DE_EJECUTAR (aparece 2 veces, en las dos funciones de abajo)
-- por el número elegido, escrito entre comillas simples. Si lo ejecutás sin reemplazarlo, el acceso docente por
-- número queda cerrado (nadie puede ingresar) hasta que lo cambies.
-- Para cambiar el número en una base ya creada, usá un archivo SQL local que no se versione (ver .gitignore).

create or replace function public.es_docente_pin()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-docente-pin',
    ''
  ) = nullif('CAMBIAR_ANTES_DE_EJECUTAR', 'CAMBIAR_' || 'ANTES_DE_EJECUTAR');
$$;

create or replace function public.verificar_pin_docente(p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select btrim(coalesce(p_pin, '')) = nullif('CAMBIAR_ANTES_DE_EJECUTAR', 'CAMBIAR_' || 'ANTES_DE_EJECUTAR');
$$;

revoke all on function public.verificar_pin_docente(text) from public;
grant execute on function public.verificar_pin_docente(text) to anon, authenticated;

drop policy if exists "Docentes editan salas" on public.salas;
create policy "Docentes editan salas"
  on public.salas for all
  using (auth.role() = 'authenticated' or public.es_docente_pin())
  with check (auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Docentes gestionan obras" on public.obras;
create policy "Docentes gestionan obras"
  on public.obras for all
  using (auth.role() = 'authenticated' or public.es_docente_pin())
  with check (auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Lectura publica de mensajes" on public.mensajes;
create policy "Lectura publica de mensajes"
  on public.mensajes for select
  using (aprobado = true or auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Docentes moderan mensajes" on public.mensajes;
create policy "Docentes moderan mensajes"
  on public.mensajes for update
  using (auth.role() = 'authenticated' or public.es_docente_pin())
  with check (auth.role() = 'authenticated' or public.es_docente_pin());

drop policy if exists "Docentes borran mensajes" on public.mensajes;
create policy "Docentes borran mensajes"
  on public.mensajes for delete
  using (auth.role() = 'authenticated' or public.es_docente_pin());

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
