begin;

-- ============================================================
-- Institution Branding Personalization
-- ============================================================
-- Adds richer brand controls so institutions can look different
-- beyond primary_color.

alter table public.institution_settings
  add column if not exists secondary_color text,
  add column if not exists accent_color text,
  add column if not exists cover_image_url text,
  add column if not exists font_family text,
  add column if not exists visual_style text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'institution_settings_secondary_color_hex_check'
  ) then
    alter table public.institution_settings
      add constraint institution_settings_secondary_color_hex_check
      check (
        secondary_color is null
        or secondary_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'institution_settings_accent_color_hex_check'
  ) then
    alter table public.institution_settings
      add constraint institution_settings_accent_color_hex_check
      check (
        accent_color is null
        or accent_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'institution_settings_font_family_check'
  ) then
    alter table public.institution_settings
      add constraint institution_settings_font_family_check
      check (
        font_family is null
        or font_family in (
          'modern-sans',
          'academic-sans',
          'friendly-rounded',
          'classic-serif'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'institution_settings_visual_style_check'
  ) then
    alter table public.institution_settings
      add constraint institution_settings_visual_style_check
      check (
        visual_style is null
        or visual_style in ('clean', 'bold', 'minimal')
      );
  end if;
end
$$;

create or replace function public.get_public_institution_branding(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'id', i.id,
    'name', i.name,
    'slug', i.slug,
    'display_name', s.display_name,
    'logo_url', s.logo_url,
    'primary_color', s.primary_color,
    'secondary_color', s.secondary_color,
    'accent_color', s.accent_color,
    'cover_image_url', s.cover_image_url,
    'font_family', s.font_family,
    'visual_style', s.visual_style
  )
  into v_result
  from public.institutions i
  left join public.institution_settings s on s.institution_id = i.id
  where i.slug = p_slug
    and i.is_active = true;

  return coalesce(v_result, '{}'::json);
end;
$$;

grant execute on function public.get_public_institution_branding(text) to anon;
grant execute on function public.get_public_institution_branding(text) to authenticated;

commit;
