begin;

alter table public.subjects
  alter column grade_level drop default;

comment on column public.subjects.grade_level is
'Optional official grade level. Leave null for shared subjects or parent subjects.';

commit;
