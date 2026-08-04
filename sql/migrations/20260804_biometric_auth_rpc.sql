begin;

-- ============================================================================
-- MIGRACIÓN 20260804: BIOMETRÍA UNIFICADA PARA PERSONAL Y ESTUDIANTES
-- ============================================================================

-- 1. Crear la tabla de biometría para el personal institucional (Profesores, Rectores, Contables)
create table if not exists public.staff_biometrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete cascade,
  vec_embedding extensions.vector(128),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Index HNSW para búsqueda coseno espacial sub-milisegundo en personal
create index if not exists staff_biometrics_hnsw_idx
  on public.staff_biometrics
  using hnsw (vec_embedding extensions.vector_cosine_ops);

-- RLS para staff_biometrics
alter table public.staff_biometrics enable row level security;

create policy "Staff members can view their own biometric record"
  on public.staff_biometrics for select
  using (auth.uid() = user_id);

create policy "Staff members or rectors can update biometric records"
  on public.staff_biometrics for all
  using (
    auth.uid() = user_id or exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() and ur.role = 'rector'
    )
  );

-- 2. Eliminar firma anterior si existe y crear la función RPC de Búsqueda Biométrica Unificada
drop function if exists public.match_biometric_login(extensions.vector(128), double precision);

create or replace function public.match_biometric_login(
  query_embedding extensions.vector(128),
  match_threshold double precision default 0.90
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
  -- A. Buscar primero en Personal Institucional (Rectores, Profesores, Contables)
  return query
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
    and (1.0 - (stb.vec_embedding <=> query_embedding)) >= match_threshold

  union all

  -- B. Buscar en Estudiantes / Familias
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
    and (1.0 - (sb.vec_embedding <=> query_embedding)) >= match_threshold

  order by similarity desc
  limit 1;
end;
$function$;

comment on function public.match_biometric_login is
'Busca de forma unificada el usuario (profesor, rector, contable o estudiante) con mayor similitud facial.';

commit;
