begin;

-- Self-healing backfill in case new grades/evaluations were created
-- after the last audit run but before applying the hardened RLS.
insert into public.teacher_grade_assignments (teacher_id, grade_id)
select distinct
  gr.teacher_id,
  s.grade_id
from public.grade_records gr
join public.students s
  on s.id = gr.student_id
where gr.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = gr.teacher_id
      and tga.grade_id = s.grade_id
  );

insert into public.teacher_grade_assignments (teacher_id, grade_id)
select distinct
  pe.teacher_id,
  s.grade_id
from public.preescolar_evaluations pe
join public.students s
  on s.id = pe.student_id
where pe.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = pe.teacher_id
      and tga.grade_id = s.grade_id
  );

insert into public.teacher_subjects (teacher_id, subject_id)
select distinct
  gr.teacher_id,
  gr.subject_id
from public.grade_records gr
where gr.teacher_id is not null
  and gr.subject_id is not null
  and not exists (
    select 1
    from public.teacher_subjects ts
    where ts.teacher_id = gr.teacher_id
      and ts.subject_id = gr.subject_id
  );

do $$
begin
  if to_regclass('public.teacher_grade_assignments') is null then
    raise exception 'Missing table public.teacher_grade_assignments. Aborting RLS hardening.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_user_rector'
  ) then
    raise exception 'Missing function public.is_user_rector(). Aborting RLS hardening.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_user_profesor'
  ) then
    raise exception 'Missing function public.is_user_profesor(). Aborting RLS hardening.';
  end if;

  if exists (
    select 1
    from public.grade_records gr
    where gr.teacher_id is null
       or not exists (
         select 1
         from public.students s
         join public.teacher_grade_assignments tga
           on tga.grade_id = s.grade_id
         where s.id = gr.student_id
           and tga.teacher_id = gr.teacher_id
       )
       or not exists (
         select 1
         from public.teacher_subjects ts
         where ts.teacher_id = gr.teacher_id
           and ts.subject_id = gr.subject_id
       )
  ) then
    raise exception 'Found inconsistent rows in public.grade_records. Run sql/migrations/20260408_00_audit_school_integrity.sql and fix the data before hardening RLS.';
  end if;

  if exists (
    select 1
    from public.preescolar_evaluations pe
    where pe.teacher_id is null
       or not exists (
         select 1
         from public.students s
         join public.teacher_grade_assignments tga
           on tga.grade_id = s.grade_id
         where s.id = pe.student_id
           and tga.teacher_id = pe.teacher_id
       )
  ) then
    raise exception 'Found inconsistent rows in public.preescolar_evaluations. Run sql/migrations/20260408_00_audit_school_integrity.sql and fix the data before hardening RLS.';
  end if;
end
$$;

alter table public.students enable row level security;
alter table public.grade_records enable row level security;
alter table public.preescolar_evaluations enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
  loop
    execute format('drop policy %I on public.students', policy_row.policyname);
  end loop;

  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'grade_records'
  loop
    execute format('drop policy %I on public.grade_records', policy_row.policyname);
  end loop;

  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'preescolar_evaluations'
  loop
    execute format('drop policy %I on public.preescolar_evaluations', policy_row.policyname);
  end loop;
end
$$;

create policy students_select_rector
on public.students
for select
to authenticated
using (public.is_user_rector());

create policy students_select_professor_grades
on public.students
for select
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    join public.teacher_grade_assignments tga
      on tga.teacher_id = t.id
    where t.user_id = auth.uid()
      and tga.grade_id = students.grade_id
  )
);

create policy students_insert_rector
on public.students
for insert
to authenticated
with check (public.is_user_rector());

create policy students_update_rector
on public.students
for update
to authenticated
using (public.is_user_rector())
with check (public.is_user_rector());

create policy students_delete_rector
on public.students
for delete
to authenticated
using (public.is_user_rector());

create policy grade_records_select_rector
on public.grade_records
for select
to authenticated
using (public.is_user_rector());

create policy grade_records_select_professor_own
on public.grade_records
for select
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
);

create policy grade_records_insert_rector
on public.grade_records
for insert
to authenticated
with check (
  public.is_user_rector()
  and exists (
    select 1
    from public.teachers t
    where t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
);

create policy grade_records_insert_professor_own
on public.grade_records
for insert
to authenticated
with check (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
);

create policy grade_records_update_rector
on public.grade_records
for update
to authenticated
using (public.is_user_rector())
with check (
  public.is_user_rector()
  and exists (
    select 1
    from public.teachers t
    where t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
);

create policy grade_records_update_professor_own
on public.grade_records
for update
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
)
with check (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
);

create policy grade_records_delete_rector
on public.grade_records
for delete
to authenticated
using (public.is_user_rector());

create policy grade_records_delete_professor_own
on public.grade_records
for delete
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = grade_records.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = grade_records.student_id
          and tga.teacher_id = t.id
      )
      and exists (
        select 1
        from public.teacher_subjects ts
        where ts.teacher_id = t.id
          and ts.subject_id = grade_records.subject_id
      )
  )
);

create policy preescolar_select_rector
on public.preescolar_evaluations
for select
to authenticated
using (public.is_user_rector());

create policy preescolar_select_professor_own
on public.preescolar_evaluations
for select
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
);

create policy preescolar_insert_rector
on public.preescolar_evaluations
for insert
to authenticated
with check (
  public.is_user_rector()
  and exists (
    select 1
    from public.teachers t
    where t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
);

create policy preescolar_insert_professor_own
on public.preescolar_evaluations
for insert
to authenticated
with check (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
);

create policy preescolar_update_rector
on public.preescolar_evaluations
for update
to authenticated
using (public.is_user_rector())
with check (
  public.is_user_rector()
  and exists (
    select 1
    from public.teachers t
    where t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
);

create policy preescolar_update_professor_own
on public.preescolar_evaluations
for update
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
)
with check (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
);

create policy preescolar_delete_rector
on public.preescolar_evaluations
for delete
to authenticated
using (public.is_user_rector());

create policy preescolar_delete_professor_own
on public.preescolar_evaluations
for delete
to authenticated
using (
  public.is_user_profesor()
  and exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and t.id = preescolar_evaluations.teacher_id
      and exists (
        select 1
        from public.students s
        join public.teacher_grade_assignments tga
          on tga.grade_id = s.grade_id
        where s.id = preescolar_evaluations.student_id
          and tga.teacher_id = t.id
      )
  )
);

grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.grade_records to authenticated;
grant select, insert, update, delete on public.preescolar_evaluations to authenticated;

commit;
