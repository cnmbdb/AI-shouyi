alter table public.site_settings
  drop constraint if exists site_settings_section_key;

alter table public.site_settings
  add constraint site_settings_section_key
  check (
    section_key in (
      'navigation',
      'footer',
      'home',
      'products',
      'blog',
      'about',
      'calculator',
      'agency',
      'contact'
    )
  );

comment on constraint site_settings_section_key on public.site_settings is
  'Restricts global public site configuration to supported CMS sections.';
