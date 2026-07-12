begin;

-- 1) Backfill teacher-grade assignments from existing schedules.
-- If a teacher is officially scheduled in a grade, that grade must exist in
-- teacher_grade_assignments because students/preescolar RLS depends on it.
insert into public.teacher_grade_assignments (teacher_id, grade_id)
select distinct
  s.teacher_id,
  s.grade_id
from public.schedules s
where s.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = s.teacher_id
      and tga.grade_id = s.grade_id
  );

-- 2) Backfill teacher-subject assignments from existing schedules.
insert into public.teacher_subjects (teacher_id, subject_id)
select distinct
  s.teacher_id,
  s.subject_id
from public.schedules s
where s.teacher_id is not null
  and s.subject_id is not null
  and not exists (
    select 1
    from public.teacher_subjects ts
    where ts.teacher_id = s.teacher_id
      and ts.subject_id = s.subject_id
  );

-- 3) Keep assignments in sync for future schedule changes.
create or replace function public.sync_teacher_assignments_from_schedule()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if new.teacher_id is not null and new.grade_id is not null then
    insert into public.teacher_grade_assignments (teacher_id, grade_id)
    select new.teacher_id, new.grade_id
    where not exists (
      select 1
      from public.teacher_grade_assignments tga
      where tga.teacher_id = new.teacher_id
        and tga.grade_id = new.grade_id
    );
  end if;

  if new.teacher_id is not null and new.subject_id is not null then
    insert into public.teacher_subjects (teacher_id, subject_id)
    select new.teacher_id, new.subject_id
    where not exists (
      select 1
      from public.teacher_subjects ts
      where ts.teacher_id = new.teacher_id
        and ts.subject_id = new.subject_id
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists schedules_sync_teacher_assignments on public.schedules;

create trigger schedules_sync_teacher_assignments
after insert or update of teacher_id, grade_id, subject_id
on public.schedules
for each row
execute function public.sync_teacher_assignments_from_schedule();

commit;

-- 4) Verification. Both counts should be zero after this script.
select
  'schedules_teacher_without_grade_assignment' as check_name,
  count(*) as affected_rows
from public.schedules s
where s.teacher_id is not null
  and s.grade_id is not null
  and not exists (
    select 1
    from public.teacher_grade_assignments tga
    where tga.teacher_id = s.teacher_id
      and tga.grade_id = s.grade_id
  )

union all

select
  'schedules_teacher_without_subject_assignment' as check_name,
  count(*) as affected_rows
from public.schedules s
where s.teacher_id is not null
  and s.subject_id is not null
  and not exists (
    select 1
    from public.teacher_subjects ts
    where ts.teacher_id = s.teacher_id
      and ts.subject_id = s.subject_id
  );
