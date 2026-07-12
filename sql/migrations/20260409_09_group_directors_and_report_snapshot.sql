begin;

alter table public.teacher_grade_assignments
  add column if not exists is_group_director boolean not null default false;

comment on column public.teacher_grade_assignments.is_group_director is
'Marks the teacher who serves as group director for a specific grade.';

create or replace function public.ensure_single_group_director()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  if new.is_group_director then
    update public.teacher_grade_assignments
    set is_group_director = false
    where grade_id = new.grade_id
      and id <> new.id
      and is_group_director = true;
  end if;

  return new;
end;
$function$;

drop trigger if exists teacher_grade_assignments_single_group_director
on public.teacher_grade_assignments;

create trigger teacher_grade_assignments_single_group_director
before insert or update on public.teacher_grade_assignments
for each row
execute function public.ensure_single_group_director();

create unique index if not exists teacher_grade_assignments_one_group_director_per_grade_idx
  on public.teacher_grade_assignments (grade_id)
  where is_group_director;

create or replace function public.get_student_report_snapshot(
  p_student_id uuid,
  p_period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_grade_id uuid;
  v_is_authorized boolean;
  v_period_average numeric;
  v_grade_rank integer;
  v_total_students integer;
  v_group_director_name text;
begin
  select s.grade_id
  into v_grade_id
  from public.students s
  where s.id = p_student_id
    and coalesce(s.is_active, true);

  if not found then
    raise exception 'Student not found or inactive.';
  end if;

  v_is_authorized :=
    public.is_user_rector()
    or exists (
      select 1
      from public.student_guardian_accounts sga
      where sga.user_id = auth.uid()
        and sga.student_id = p_student_id
    )
    or exists (
      select 1
      from public.teachers t
      join public.teacher_grade_assignments tga
        on tga.teacher_id = t.id
      where t.user_id = auth.uid()
        and tga.grade_id = v_grade_id
    );

  if not v_is_authorized then
    raise exception 'You are not allowed to access this report.';
  end if;

  with grade_student_averages as (
    select
      s.id as student_id,
      s.full_name,
      case
        when count(gr.id) > 0 then round(avg(gr.grade)::numeric, 2)
        else null
      end as period_average
    from public.students s
    left join public.grade_records gr
      on gr.student_id = s.id
     and gr.period_id = p_period_id
    where s.grade_id = v_grade_id
      and coalesce(s.is_active, true)
    group by s.id, s.full_name
  ),
  ranked_students as (
    select
      student_id,
      period_average,
      row_number() over (
        order by
          case when period_average is null then 1 else 0 end,
          period_average desc nulls last,
          full_name asc
      ) as grade_rank,
      count(*) over () as total_students
    from grade_student_averages
  )
  select
    rs.period_average,
    rs.grade_rank,
    rs.total_students
  into
    v_period_average,
    v_grade_rank,
    v_total_students
  from ranked_students rs
  where rs.student_id = p_student_id;

  select t.full_name
  into v_group_director_name
  from public.teacher_grade_assignments tga
  join public.teachers t
    on t.id = tga.teacher_id
  where tga.grade_id = v_grade_id
    and tga.is_group_director = true
    and coalesce(t.is_active, true)
  order by t.full_name
  limit 1;

  return jsonb_build_object(
    'class_schedules',
    coalesce((
      select jsonb_agg(
        jsonb_build_object('subject_id', s.subject_id)
        order by s.day_of_week, s.start_time, s.subject_id
      )
      from public.schedules s
      where s.grade_id = v_grade_id
        and s.subject_id is not null
    ), '[]'::jsonb),
    'grade_rank', v_grade_rank,
    'group_director_name', v_group_director_name,
    'period_average', v_period_average,
    'preescolar_evaluations',
    coalesce((
      select jsonb_agg(to_jsonb(pe) order by pe.dimension, pe.created_at)
      from public.preescolar_evaluations pe
      where pe.student_id = p_student_id
        and pe.period_id = p_period_id
    ), '[]'::jsonb),
    'student_grade_records',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'academic_periods', jsonb_build_object('name', ap.name),
          'achievements', gr.achievements,
          'comments', gr.comments,
          'grade', gr.grade,
          'period_id', gr.period_id,
          'subjects', jsonb_build_object(
            'id', sb.id,
            'name', sb.name
          )
        )
        order by sb.name, ap.start_date
      )
      from public.grade_records gr
      join public.subjects sb
        on sb.id = gr.subject_id
      left join public.academic_periods ap
        on ap.id = gr.period_id
      where gr.student_id = p_student_id
    ), '[]'::jsonb),
    'total_students', coalesce(v_total_students, 0)
  );
end;
$function$;

grant execute on function public.get_student_report_snapshot(uuid, uuid) to authenticated;

commit;
