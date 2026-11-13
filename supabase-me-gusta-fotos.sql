-- Pequeños grandes artistas — Me gusta de las fotos de la carpeta Obras/
--
-- Se corre A MANO, una sola vez, en el SQL Editor de Supabase (no se ejecuta desde la app ni desde ningún script).
-- Hay que correrlo ANTES de publicar el sitio nuevo; si no, los Me gusta devuelven error.
--
-- Qué hace:
--   * Crea la tabla public.obra_likes (un contador por foto). La foto se identifica con un id de 16 caracteres
--     hexadecimales: el SHA-1 de su ruta relativa (ej. "3/foto.jpeg"), que calcula el script `npm run obras`.
--   * Activa RLS: cualquiera puede LEER los contadores y nadie puede escribir en la tabla directamente.
--   * Crea la función public.reaccionar_foto(foto, +1 / -1): es la única forma de cambiar un contador.
--   * No toca la tabla public.obras ni sus fotos.
--
-- Es seguro correrlo más de una vez.

-- 1. Tabla de contadores
create table if not exists public.obra_likes (
  foto_id text primary key check (foto_id ~ '^[0-9a-f]{16}$'),
  likes_count integer not null default 0 check (likes_count >= 0),
  updated_at timestamptz not null default now()
);

-- 2. Seguridad (RLS): solo lectura pública, sin escritura directa
alter table public.obra_likes enable row level security;

drop policy if exists "Lectura publica de me gusta de fotos" on public.obra_likes;
create policy "Lectura publica de me gusta de fotos"
  on public.obra_likes for select
  using (true);

-- (A propósito no hay políticas de insert / update / delete.)
revoke all on public.obra_likes from anon, authenticated;
grant select on public.obra_likes to anon, authenticated;

-- 3. Función segura para sumar o restar un Me gusta
create or replace function public.reaccionar_foto(p_foto_id text, p_delta integer)
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

  if p_foto_id is null or p_foto_id !~ '^[0-9a-f]{16}$' then
    raise exception 'Identificador de foto inválido';
  end if;

  insert into public.obra_likes as l (foto_id, likes_count)
  values (p_foto_id, greatest(0, p_delta))
  on conflict (foto_id) do update
    set likes_count = greatest(0, l.likes_count + p_delta),
        updated_at = now()
  returning l.likes_count into v_nuevo;

  return v_nuevo;
end;
$$;

revoke all on function public.reaccionar_foto(text, integer) from public;
grant execute on function public.reaccionar_foto(text, integer) to anon, authenticated;
