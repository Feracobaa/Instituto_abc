begin;

-- ============================================================
-- Owner safety hardening: soft-delete institutions
-- ============================================================
-- We do not allow hard deletes from owner flows.
-- Institutions are archived/reactivated by toggling is_active,
-- with mandatory reason and provider audit logging.

create or replace function public.provider_set_institution_active(
  p_institution_id uuid,
  p_is_active boolean,
  p_reason text
)
returns public.institutions
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_reason text;
  v_before public.institutions;
  v_after public.institutions;
  v_action text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user is required.';
  end if;

  if not public.is_provider_owner() then
    raise exception 'Only provider owners can change institution status.';
  end if;

  v_reason := nullif(btrim(p_reason), '');
  if v_reason is null then
    raise exception 'Reason is required.';
  end if;

  select *
  into v_before
  from public.institutions i
  where i.id = p_institution_id
  limit 1;

  if v_before.id is null then
    raise exception 'Institution does not exist.';
  end if;

  update public.institutions
  set is_active = p_is_active
  where id = p_institution_id
  returning *
  into v_after;

  v_action := case when p_is_active then 'institution.reactivated' else 'institution.soft_deleted' end;

  insert into public.provider_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    institution_id,
    details,
    old_values,
    new_values
  )
  values (
    auth.uid(),
    v_action,
    'institutions',
    v_after.id::text,
    v_after.id,
    jsonb_build_object(
      'reason', v_reason,
      'requested_state', case when p_is_active then 'active' else 'inactive' end
    ),
    to_jsonb(v_before),
    to_jsonb(v_after)
  );

  return v_after;
end;
$function$;

grant execute on function public.provider_set_institution_active(uuid, boolean, text) to authenticated;

-- Replace broad FOR ALL policy with explicit policies that exclude DELETE.
drop policy if exists institutions_provider_owner_all on public.institutions;

drop policy if exists institutions_provider_owner_select on public.institutions;
create policy institutions_provider_owner_select
on public.institutions
for select
to authenticated
using (public.is_provider_owner());

drop policy if exists institutions_provider_owner_insert on public.institutions;
create policy institutions_provider_owner_insert
on public.institutions
for insert
to authenticated
with check (public.is_provider_owner());

drop policy if exists institutions_provider_owner_update on public.institutions;
create policy institutions_provider_owner_update
on public.institutions
for update
to authenticated
using (public.is_provider_owner())
with check (public.is_provider_owner());

revoke delete on public.institutions from authenticated;

commit;
