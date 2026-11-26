-- Quatro temas novos (Aggron, Ninetales Shiny, Staraptor, Maushold): a lista de temas aceitos em user_settings.theme
-- ganha os ids deles. Os doze que já existiam continuam iguais.
alter table public.user_settings drop constraint user_settings_theme_chk;

alter table public.user_settings
  add constraint user_settings_theme_chk check (theme in (
    'smeargle', 'wailord', 'empoleon', 'groudon', 'zoroark', 'chandelure',
    'serperior', 'pikachu', 'sylveon', 'haxorus', 'heracross', 'darkrai',
    'aggron', 'ninetales-shiny', 'staraptor', 'maushold'
  ));
