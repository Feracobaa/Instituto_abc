begin;

do $$
declare
  target_view text;
  target_views text[] := array[
    'student_tuition_month_status',
    'student_tuition_summary',
    'accounting_ledger'
  ];
begin
  foreach target_view in array target_views loop
    if to_regclass('public.' || target_view) is null then
      raise notice 'Skipping view public.%, it does not exist.', target_view;
      continue;
    end if;

    execute format(
      'alter view public.%I set (security_invoker = on)',
      target_view
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
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_user_rector'
  ) then
    raise exception 'Missing function public.is_user_rector(). Aborting RLS remediation.';
  end if;

  foreach target_table in array target_tables loop
    if to_regclass('public.' || target_table) is null then
      raise notice 'Skipping table public.%, it does not exist.', target_table;
      continue;
    end if;

    execute format(
      'alter table public.%I enable row level security',
      target_table
    );

    execute format(
      'drop policy if exists %I on public.%I',
      'Acceso autenticado a ' || target_table,
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_select',
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_insert',
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_update',
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_delete',
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_select_authenticated',
      target_table
    );
    execute format(
      'drop policy if exists %I on public.%I',
      target_table || '_all_rector',
      target_table
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      target_table || '_select_authenticated',
      target_table
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_user_rector()) with check (public.is_user_rector())',
      target_table || '_all_rector',
      target_table
    );

    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      target_table
    );
  end loop;
end
$$;

commit;
