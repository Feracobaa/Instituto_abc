-- Migration: Block report card downloads on tuition debt
-- Date: 2026-06-01

BEGIN;

-- 1. Add configuration column to institution_settings table
ALTER TABLE public.institution_settings 
ADD COLUMN IF NOT EXISTS block_reports_on_debt BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.institution_settings.block_reports_on_debt IS 
'Enables blocking grade report card (boletín) downloads for guardians when the student has outstanding tuition debts.';

-- 2. Update get_student_report_snapshot function to enforce debt check for parents/guardians
CREATE OR REPLACE FUNCTION public.get_student_report_snapshot(
  p_student_id uuid,
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_grade_id uuid;
  v_is_authorized boolean;
  v_period_average numeric;
  v_grade_rank integer;
  v_total_students integer;
  v_group_director_name text;
BEGIN
  -- Get student grade
  SELECT s.grade_id
  INTO v_grade_id
  FROM public.students s
  WHERE s.id = p_student_id
    AND coalesce(s.is_active, true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found or inactive.';
  END IF;

  -- Check basic role authorization
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

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You are not allowed to access this report.';
  END IF;

  -- SECURITY CHECK: If caller is a parent/guardian (and NOT rector or teacher of the grade),
  -- check if the institution blocks downloads on debt and if the student has pending debt.
  IF NOT public.is_user_rector() AND NOT exists (
    select 1
    from public.teachers t
    join public.teacher_grade_assignments tga
      on tga.teacher_id = t.id
    where t.user_id = auth.uid()
      and tga.grade_id = v_grade_id
  ) THEN
    DECLARE
      v_block_on_debt boolean := false;
      v_has_debt boolean := false;
    BEGIN
      -- Retrieve block settings for the student's institution
      select coalesce(block_reports_on_debt, false)
      into v_block_on_debt
      from public.institution_settings
      where institution_id = (select institution_id from public.students where id = p_student_id);

      IF v_block_on_debt THEN
        -- Check if student has any pending tuition month (pending_amount > 0)
        select exists (
          select 1
          from public.student_tuition_month_status
          where student_id = p_student_id
            and pending_amount > 0
        ) into v_has_debt;

        IF v_has_debt THEN
          RAISE EXCEPTION 'Descarga bloqueada por mora en pagos de pensiones.';
        END IF;
      END IF;
    END;
  END IF;

  -- Retrieve grade statistics
  WITH grade_student_averages as (
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

  -- Retrieve group director name
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

  -- Build and return JSON snapshot
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
END;
$function$;

-- 3. Restore execute permissions
GRANT EXECUTE ON FUNCTION public.get_student_report_snapshot(uuid, uuid) TO authenticated;

COMMIT;
