begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schedules_block_kind_check'
      and conrelid = 'public.schedules'::regclass
  ) then
    alter table public.schedules
      add constraint schedules_block_kind_check
      check (
        (
          title is not null
          and btrim(title) <> ''
          and subject_id is null
          and teacher_id is null
        )
        or
        (
          subject_id is not null
          and teacher_id is not null
        )
      ) not valid;
  end if;
end
$$;

comment on constraint schedules_block_kind_check on public.schedules is
'Routine blocks must use title only. Academic blocks must use subject_id and teacher_id.';

commit;
