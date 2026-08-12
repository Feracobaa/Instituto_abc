begin;

-- ============================================================================
-- MIGRACIÓN 20260815: SANEAMIENTO DE SEGURIDAD BIOMÉTRICA, AISLAMIENTO MULTI-TENANT
-- Y TRIGGER DE SINCRONIZACIÓN AUTOMÁTICA PARA PGVECTOR
-- ============================================================================

-- 1. Habilitar extensión vectorial si no está activa
create extension if not exists vector with schema extensions;

-- 2. Asegurar que student_biometrics tenga la columna vec_embedding
alter table public.student_biometrics
  add column if not exists vec_embedding extensions.vector(128);

-- 3. Función Trigger para sincronizar automáticamente embedding (array) y vec_embedding (vector)
create or replace function public.sync_student_biometrics_vec()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $function$
begin
  -- Si se inserta o actualiza el array 'embedding', sincronizar 'vec_embedding'
  if new.embedding is not null and array_length(new.embedding, 1) = 128 then
    new.vec_embedding := replace(replace(new.embedding::text, '{', '['), '}', ']')::extensions.vector(128);
  -- Si se inserta 'vec_embedding' directamente y 'embedding' está nulo, sincronizar 'embedding'
  elsif new.vec_embedding is not null and new.embedding is null then
    new.embedding := string_to_array(trim(both '[]' from new.vec_embedding::text), ',')::double precision[];
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

-- Crear o reemplazar el trigger en student_biometrics
drop trigger if exists student_biometrics_sync_vec_trigger on public.student_biometrics;

create trigger student_biometrics_sync_vec_trigger
before insert or update on public.student_biometrics
for each row
execute function public.sync_student_biometrics_vec();

-- 4. Backfill: Poblar vec_embedding para todos los estudiantes existentes que quedaron en NULL
update public.student_biometrics
set vec_embedding = replace(replace(embedding::text, '{', '['), '}', ']')::extensions.vector(128)
where vec_embedding is null and array_length(embedding, 1) = 128;

-- 5. Asegurar índices HNSW para búsqueda rápida por similitud coseno
create index if not exists student_biometrics_hnsw_idx
  on public.student_biometrics
  using hnsw (vec_embedding extensions.vector_cosine_ops);

create index if not exists staff_biometrics_hnsw_idx
  on public.staff_biometrics
  using hnsw (vec_embedding extensions.vector_cosine_ops);

-- 6. Redefinir la función RPC de Búsqueda de Login con Aislamiento Estricto por Institución
drop function if exists public.match_biometric_login(extensions.vector(128), double precision);
drop function if exists public.match_biometric_login(extensions.vector(128), uuid, double precision);

create or replace function public.match_biometric_login(
  query_embedding extensions.vector(128),
  p_institution_id uuid,
  match_threshold double precision default 0.92
)
returns table (
  target_user_id uuid,
  full_name text,
  email text,
  user_type text,
  similarity double precision
)
language plpgsql
security definer
set search_path = 'public', 'extensions', 'auth'
as $function$
begin
  -- Validación de parámetro institucional obligatorio
  if p_institution_id is null then
    raise exception 'El identificador institucional (p_institution_id) es obligatorio para la búsqueda biométrica.';
  end if;

  return query
  -- A. Buscar en Personal Institucional (Docentes, Rectores, Contables) de la misma institución
  select
    stb.user_id as target_user_id,
    coalesce(p.full_name, u.email) as full_name,
    u.email as email,
    'staff'::text as user_type,
    (1.0 - (stb.vec_embedding <=> query_embedding)) as similarity
  from public.staff_biometrics stb
  join auth.users u on u.id = stb.user_id
  left join public.profiles p on p.id = stb.user_id
  where stb.vec_embedding is not null
    and stb.institution_id = p_institution_id
    and (1.0 - (stb.vec_embedding <=> query_embedding)) >= match_threshold

  union all

  -- B. Buscar en Estudiantes / Familias vinculados a la misma institución
  select
    sga.user_id as target_user_id,
    s.full_name as full_name,
    (sga.username || '@familias.iabc.local')::text as email,
    'student'::text as user_type,
    (1.0 - (sb.vec_embedding <=> query_embedding)) as similarity
  from public.student_biometrics sb
  join public.students s on s.id = sb.student_id
  join public.student_guardian_accounts sga on sga.student_id = s.id
  where sb.vec_embedding is not null
    and s.institution_id = p_institution_id
    and (1.0 - (sb.vec_embedding <=> query_embedding)) >= match_threshold

  order by similarity desc
  limit 1;
end;
$function$;

comment on function public.match_biometric_login is
'Búsqueda biométrica unificada con aislamiento institucional multi-tenant estricto y umbral calibrado en servidor.';

commit;
