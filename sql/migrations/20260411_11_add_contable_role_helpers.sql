begin;

create or replace function public.is_user_contable()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'contable'::public.user_role_enum
  );
$function$;

grant execute on function public.is_user_contable() to authenticated;

commit;
