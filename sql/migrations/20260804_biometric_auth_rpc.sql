begin;

-- ============================================================================
-- MIGRACIÓN 20260804: RPC PARA INICIO DE SESIÓN BIOMÉTRICO INSTITUCIONAL
-- ============================================================================

create or replace function public.match_biometric_login(
  query_embedding extensions.vector(128),
  match_threshold double precision default 0.90
)
returns table (
  student_id uuid,
  student_name text,
  username text,
  user_id uuid,
  similarity double precision
)
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $function$
begin
  return query
  select
    s.id as student_id,
    s.full_name as student_name,
    sga.username as username,
    sga.user_id as user_id,
    (1.0 - (sb.vec_embedding <=> query_embedding)) as similarity
  from public.student_biometrics sb
  join public.students s on s.id = sb.student_id
  join public.student_guardian_accounts sga on sga.student_id = s.id
  where sb.vec_embedding is not null
    and (1.0 - (sb.vec_embedding <=> query_embedding)) >= match_threshold
  order by sb.vec_embedding <=> query_embedding
  limit 1;
end;
$function$;

comment on function public.match_biometric_login is
'Busca el estudiante/usuario correspondiente a un vector facial con un umbral estricto para inicio de sesión seguro.';

commit;
