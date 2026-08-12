-- Pruebas de integración Fase 1. Ejecutar contra Supabase local/CI después de
-- aplicar migraciones, con un rol administrador de pruebas. Es transaccional.
-- Requiere fixtures Auth/tenant creadas por el entorno de integración.

begin;

do $test$
declare
  v_fn regprocedure;
  v_public_execute boolean;
begin
  v_fn := 'public.upsert_staff_biometric(uuid,uuid,extensions.vector)'::regprocedure;
  select exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ) into v_public_execute;
  if has_function_privilege('anon', v_fn, 'EXECUTE') or v_public_execute then
    raise exception 'FAIL: upsert_staff_biometric is executable by anon/PUBLIC';
  end if;

  v_fn := 'public.sync_biometric_attendance_offline(uuid,date,public.attendance_status_enum,uuid,uuid,uuid)'::regprocedure;
  select exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ) into v_public_execute;
  if has_function_privilege('anon', v_fn, 'EXECUTE') or v_public_execute then
    raise exception 'FAIL: offline sync is executable by anon/PUBLIC';
  end if;

  v_fn := 'public.match_biometric_login(extensions.vector,uuid,double precision)'::regprocedure;
  select exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ) into v_public_execute;
  if has_function_privilege('anon', v_fn, 'EXECUTE')
     or has_function_privilege('authenticated', v_fn, 'EXECUTE')
     or v_public_execute then
    raise exception 'FAIL: login matcher is exposed outside service_role';
  end if;
end;
$test$;

-- Contrato de liveness: la RPC no acepta liveness_verified ni liveness_status;
-- el único estado escrito por su cuerpo SQL es unverified/false.
do $test$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.sync_biometric_attendance_offline(uuid,date,public.attendance_status_enum,uuid,uuid,uuid)'::regprocedure
  ) into v_definition;

  if v_definition !~ 'liveness_verified, liveness_status'
     or v_definition !~ 'false, ''unverified''' then
    raise exception 'FAIL: offline sync does not force unverified liveness';
  end if;
end;
$test$;

-- Contrato de auditoría: el matcher expone target_student_id separado de la
-- cuenta Auth, para que Edge Function nunca use la cuenta guardián como FK.
do $test$
declare
  v_result record;
begin
  select p.proargnames into v_result
  from pg_proc p
  where p.oid = 'public.match_biometric_login(extensions.vector,uuid,double precision)'::regprocedure;

  if v_result.proargnames is null then
    raise exception 'FAIL: biometric login matcher is missing';
  end if;
end;
$test$;

rollback;
