begin;

-- Normalize legacy duplicates before enforcing one grade record per
-- student/subject/period. We keep the newest row and merge numeric grade.
with duplicate_groups as (
  select
    gr.student_id,
    gr.subject_id,
    gr.period_id,
    round(avg(gr.grade)::numeric, 1) as merged_grade,
    (
      array_agg(
        gr.id
        order by gr.updated_at desc nulls last, gr.created_at desc nulls last, gr.id desc
      )
    )[1] as keep_id
  from public.grade_records gr
  group by gr.student_id, gr.subject_id, gr.period_id
  having count(*) > 1
),
rows_to_remove as (
  select gr.id
  from public.grade_records gr
  join duplicate_groups dg
    on dg.student_id = gr.student_id
   and dg.subject_id = gr.subject_id
   and dg.period_id = gr.period_id
  where gr.id <> dg.keep_id
)
update public.grade_records gr
set grade = dg.merged_grade,
    updated_at = now()
from duplicate_groups dg
where gr.id = dg.keep_id
  and gr.grade is distinct from dg.merged_grade;

delete from public.grade_records gr
using (
  with duplicate_groups as (
    select
      gr.student_id,
      gr.subject_id,
      gr.period_id,
      (
        array_agg(
          gr.id
          order by gr.updated_at desc nulls last, gr.created_at desc nulls last, gr.id desc
        )
      )[1] as keep_id
    from public.grade_records gr
    group by gr.student_id, gr.subject_id, gr.period_id
    having count(*) > 1
  )
  select gr.id
  from public.grade_records gr
  join duplicate_groups dg
    on dg.student_id = gr.student_id
   and dg.subject_id = gr.subject_id
   and dg.period_id = gr.period_id
  where gr.id <> dg.keep_id
) as rows_to_remove
where gr.id = rows_to_remove.id;

create unique index if not exists grade_records_student_subject_period_unique_idx
  on public.grade_records (student_id, subject_id, period_id);

create table if not exists public.grade_record_partials (
  id uuid primary key default gen_random_uuid(),
  grade_record_id uuid not null references public.grade_records(id) on delete cascade,
  partial_index integer not null,
  activity_name text,
  grade numeric(4, 2),
  achievements text,
  comments text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint grade_record_partials_partial_index_check
    check (partial_index >= 1),
  constraint grade_record_partials_grade_check
    check (grade is null or (grade >= 1 and grade <= 5))
);

alter table public.grade_record_partials
  add column if not exists activity_name text;

alter table public.grade_record_partials
  drop constraint if exists grade_record_partials_partial_index_check;

alter table public.grade_record_partials
  add constraint grade_record_partials_partial_index_check
    check (partial_index >= 1);

alter table public.grade_record_partials
  drop constraint if exists grade_record_partials_weight_check;

alter table public.grade_record_partials
  drop column if exists weight;

create unique index if not exists grade_record_partials_record_partial_unique_idx
  on public.grade_record_partials (grade_record_id, partial_index);

create index if not exists grade_record_partials_grade_record_id_idx
  on public.grade_record_partials (grade_record_id);

comment on table public.grade_record_partials is
'Stores graded classroom activities used to calculate the period final grade.';

create or replace function public.touch_grade_record_partials_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists grade_record_partials_set_updated_at
on public.grade_record_partials;

create trigger grade_record_partials_set_updated_at
before update on public.grade_record_partials
for each row
execute function public.touch_grade_record_partials_updated_at();

-- If this script is rerun after a partial previous attempt, avoid firing a
-- stale recalculation trigger during the historical backfill below.
drop trigger if exists grade_record_partials_recalculate_grade_record
on public.grade_record_partials;

create or replace function public.recalculate_grade_record_final(
  p_grade_record_id uuid
)
returns void
language plpgsql
set search_path = 'public'
as $function$
begin
  update public.grade_records gr
  set grade = coalesce(agg.final_grade, gr.grade),
      achievements = coalesce(agg.first_achievement, gr.achievements),
      comments = coalesce(agg.first_comment, gr.comments),
      updated_at = now()
  from (
    select
      round(avg(p.grade)::numeric, 1) as final_grade,
      (
        array_agg(nullif(btrim(p.achievements), '') order by p.partial_index)
          filter (where nullif(btrim(p.achievements), '') is not null)
      )[1] as first_achievement,
      (
        array_agg(nullif(btrim(p.comments), '') order by p.partial_index)
          filter (where nullif(btrim(p.comments), '') is not null)
      )[1] as first_comment
    from public.grade_record_partials p
    where p.grade_record_id = p_grade_record_id
      and p.grade is not null
  ) as agg
  where gr.id = p_grade_record_id;
end;
$function$;

-- Historical compatibility: each legacy final grade becomes Actividad 1.
insert into public.grade_record_partials (
  grade_record_id,
  partial_index,
  activity_name,
  grade,
  achievements,
  comments
)
select
  gr.id,
  1,
  'Actividad 1',
  gr.grade,
  gr.achievements,
  gr.comments
from public.grade_records gr
where not exists (
  select 1
  from public.grade_record_partials grp
  where grp.grade_record_id = gr.id
    and grp.partial_index = 1
);

with computed as (
  select
    p.grade_record_id,
    round(avg(p.grade)::numeric, 1) as final_grade
  from public.grade_record_partials p
  where p.grade is not null
  group by p.grade_record_id
)
update public.grade_records gr
set grade = c.final_grade,
    updated_at = now()
from computed c
where gr.id = c.grade_record_id
  and gr.grade is distinct from c.final_grade;

create or replace function public.sync_grade_record_final_from_partials()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
declare
  v_grade_record_id uuid;
begin
  v_grade_record_id := coalesce(new.grade_record_id, old.grade_record_id);
  perform public.recalculate_grade_record_final(v_grade_record_id);
  return null;
end;
$function$;

create trigger grade_record_partials_recalculate_grade_record
after insert or update or delete on public.grade_record_partials
for each row
execute function public.sync_grade_record_final_from_partials();

create or replace function public.can_manage_grade_record(
  p_grade_record_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select
    public.is_user_rector()
    or (
      public.is_user_profesor()
      and exists (
        select 1
        from public.grade_records gr
        join public.teachers t
          on t.id = gr.teacher_id
        where gr.id = p_grade_record_id
          and t.user_id = auth.uid()
          and exists (
            select 1
            from public.students s
            join public.teacher_grade_assignments tga
              on tga.grade_id = s.grade_id
            where s.id = gr.student_id
              and tga.teacher_id = t.id
          )
          and exists (
            select 1
            from public.teacher_subjects ts
            where ts.teacher_id = t.id
              and ts.subject_id = gr.subject_id
          )
      )
    );
$function$;

alter table public.grade_record_partials enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'grade_record_partials'
  loop
    execute format('drop policy %I on public.grade_record_partials', policy_row.policyname);
  end loop;
end
$$;

create policy grade_record_partials_select_managers
on public.grade_record_partials
for select
to authenticated
using (public.can_manage_grade_record(grade_record_id));

create policy grade_record_partials_insert_managers
on public.grade_record_partials
for insert
to authenticated
with check (public.can_manage_grade_record(grade_record_id));

create policy grade_record_partials_update_managers
on public.grade_record_partials
for update
to authenticated
using (public.can_manage_grade_record(grade_record_id))
with check (public.can_manage_grade_record(grade_record_id));

create policy grade_record_partials_delete_managers
on public.grade_record_partials
for delete
to authenticated
using (public.can_manage_grade_record(grade_record_id));

grant select, insert, update, delete on public.grade_record_partials to authenticated;
grant execute on function public.recalculate_grade_record_final(uuid) to authenticated;
grant execute on function public.can_manage_grade_record(uuid) to authenticated;

commit;
