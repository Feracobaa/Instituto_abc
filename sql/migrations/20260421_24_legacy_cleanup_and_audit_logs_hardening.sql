begin;

create schema if not exists safety_snapshots;

create table if not exists safety_snapshots.legacy_cleanup_report_20260421 (
  id bigserial primary key,
  snapshot_at timestamptz not null default now(),
  table_name text not null,
  row_count bigint not null,
  row_checksum text not null
);

do $$
declare
  target_table text;
  target_tables text[] := array[
    'active_exam_sessions',
    'exam_audit_log',
    'exam_progress',
    'exam_responses',
    'exam_settings',
    'examenes',
    'feedback_analytic',
    'preguntas',
    'question_statistics',
    'resultados',
    'simulacro_respuestas',
    'simulacro_resultados',
    'simulacros',
    'usuarios'
  ];
begin
  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is null then
      continue;
    end if;

    execute format(
      'drop table if exists safety_snapshots.%I',
      target_table || '_20260421'
    );

    execute format(
      'create table safety_snapshots.%I as table public.%I',
      target_table || '_20260421',
      target_table
    );

    execute format(
      $sql$
        insert into safety_snapshots.legacy_cleanup_report_20260421 (table_name, row_count, row_checksum)
        select
          %L,
          count(*)::bigint,
          md5(coalesce(string_agg(md5(to_jsonb(t)::text), ''), ''))
        from public.%I t
      $sql$,
      target_table,
      target_table
    );
  end loop;
end
$$;

do $$
declare
  target_table text;
  target_tables text[] := array[
    'active_exam_sessions',
    'exam_audit_log',
    'exam_progress',
    'exam_responses',
    'exam_settings',
    'examenes',
    'feedback_analytic',
    'preguntas',
    'question_statistics',
    'resultados',
    'simulacro_respuestas',
    'simulacro_resultados',
    'simulacros',
    'usuarios'
  ];
begin
  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is null then
      continue;
    end if;

    execute format(
      'revoke all privileges on table public.%I from authenticated',
      target_table
    );
  end loop;
end
$$;

drop table if exists public.exam_progress;
drop table if exists public.exam_responses;
drop table if exists public.exam_settings;
drop table if exists public.feedback_analytic;
drop table if exists public.question_statistics;
drop table if exists public.simulacro_respuestas;
drop table if exists public.simulacro_resultados;
drop table if exists public.active_exam_sessions;
drop table if exists public.exam_audit_log;
drop table if exists public.resultados;
drop table if exists public.preguntas;
drop table if exists public.simulacros;
drop table if exists public.examenes;
drop table if exists public.usuarios;

do $$
begin
  if to_regclass('public.audit_logs') is null then
    return;
  end if;

  create index if not exists audit_logs_changed_at_idx
    on public.audit_logs (changed_at desc);

  create index if not exists audit_logs_table_name_idx
    on public.audit_logs (table_name);

  alter table public.audit_logs enable row level security;

  drop policy if exists audit_logs_select_rector on public.audit_logs;
  drop policy if exists audit_logs_insert_rector on public.audit_logs;
  drop policy if exists audit_logs_update_rector on public.audit_logs;
  drop policy if exists audit_logs_delete_rector on public.audit_logs;

  create policy audit_logs_select_rector
  on public.audit_logs
  for select
  to authenticated
  using (public.is_user_rector());

  create policy audit_logs_insert_rector
  on public.audit_logs
  for insert
  to authenticated
  with check (public.is_user_rector());

  create policy audit_logs_update_rector
  on public.audit_logs
  for update
  to authenticated
  using (public.is_user_rector())
  with check (public.is_user_rector());

  create policy audit_logs_delete_rector
  on public.audit_logs
  for delete
  to authenticated
  using (public.is_user_rector());

  grant select, insert, update, delete on public.audit_logs to authenticated;
end
$$;

create or replace function public.purge_audit_logs(
  p_keep_interval interval default interval '12 months'
)
returns integer
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_deleted_rows integer := 0;
begin
  if not public.is_user_rector() then
    raise exception 'Only rector users can purge audit logs.';
  end if;

  if to_regclass('public.audit_logs') is null then
    return 0;
  end if;

  delete from public.audit_logs
  where changed_at < now() - p_keep_interval;

  get diagnostics v_deleted_rows = row_count;
  return v_deleted_rows;
end;
$function$;

grant execute on function public.purge_audit_logs(interval) to authenticated;

commit;
