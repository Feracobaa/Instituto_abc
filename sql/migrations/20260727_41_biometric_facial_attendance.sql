begin;

-- ============================================================================
-- MIGRACIÓN 20260727_41: MÓDULO DE ASISTENCIA Y RECONOCIMIENTO BIOMÉTRICO FACIAL
-- ============================================================================

-- 1. Tabla para almacenar los descriptores/embeddings faciales (128 dimensiones)
create table if not exists public.student_biometrics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  embedding double precision[] not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint student_biometrics_unique_student unique (student_id),
  constraint student_biometrics_embedding_size_check check (array_length(embedding, 1) = 128)
);

create index if not exists student_biometrics_student_id_idx
  on public.student_biometrics (student_id);

comment on table public.student_biometrics is
'Vectores de características biométricas faciales (128 dimensiones) de estudiantes para reconocimiento en tiempo real.';

-- 2. Función y Trigger para mantener updated_at
create or replace function public.touch_student_biometrics_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists student_biometrics_set_updated_at
on public.student_biometrics;

create trigger student_biometrics_set_updated_at
before update on public.student_biometrics
for each row
execute function public.touch_student_biometrics_updated_at();

-- 3. Extensión de la tabla student_attendance con campos biométricos
alter table public.student_attendance
  add column if not exists capture_method text default 'manual',
  add column if not exists liveness_verified boolean default false;

-- Constraint para tipo de captura
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_capture_method_check'
  ) then
    alter table public.student_attendance
      add constraint student_attendance_capture_method_check
      check (capture_method in ('facial_mobile', 'manual', 'totem'));
  end if;
end
$$;

-- 4. Seguridad RLS (Row Level Security) para student_biometrics
alter table public.student_biometrics enable row level security;

-- Política de lectura: Rectores y Profesores autorizados para el estudiante
drop policy if exists student_biometrics_select_policy on public.student_biometrics;
create policy student_biometrics_select_policy
  on public.student_biometrics
  for select
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

-- Política de inserción/actualización: Rectores y Profesores autorizados
drop policy if exists student_biometrics_insert_policy on public.student_biometrics;
create policy student_biometrics_insert_policy
  on public.student_biometrics
  for insert
  with check (
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

drop policy if exists student_biometrics_update_policy on public.student_biometrics;
create policy student_biometrics_update_policy
  on public.student_biometrics
  for update
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

-- Permisos de lectura/escritura para usuarios autenticados
grant select, insert, update, delete on public.student_biometrics to authenticated;

commit;
