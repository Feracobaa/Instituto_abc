begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'user_role_enum'
      and e.enumlabel = 'contable'
  ) then
    alter type public.user_role_enum add value 'contable';
  end if;
end
$$;

commit;
