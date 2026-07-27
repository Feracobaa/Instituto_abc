begin;

-- ============================================================================
-- MIGRACIÓN 20260727_42: POLÍTICA RLS DE ELIMINACIÓN (DELETE) PARA BIOMETRÍA FACIAL
-- ============================================================================

drop policy if exists student_biometrics_delete_policy on public.student_biometrics;

create policy student_biometrics_delete_policy
  on public.student_biometrics
  for delete
  using (
    public.is_user_rector()
    or (
      public.is_user_profesor()
      and exists (
        select 1
        from public.students s
        join public.teachers t on t.user_id = auth.uid()
        join public.teacher_grade_assignments tga on tga.teacher_id = t.id and tga.grade_id = s.grade_id
        where s.id = student_biometrics.student_id
      )
    )
  );

commit;
