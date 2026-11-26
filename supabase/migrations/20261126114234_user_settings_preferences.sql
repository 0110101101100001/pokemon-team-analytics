-- Preferências da conta (Configurações da conta → Perfil, Preferências e Aparência). Todas têm padrão, então as
-- linhas que já existem continuam válidas e o site trata coluna nula como "padrão do site".

alter table public.user_settings
  -- Nome mostrado no header e no Perfil; null = parte do e-mail antes do @.
  add column display_name text
    constraint user_settings_display_name_length check (display_name is null or char_length(btrim(display_name)) between 1 and 40),
  -- Formato que a ficha abre (aba de uso da Smogon e ordem das builds).
  add column default_format text not null default 'ou'
    constraint user_settings_default_format check (default_format in ('ou', 'vgc', 'doubles')),
  -- Jogo já escolhido no filtro da Liga; null = todos.
  add column default_league_game text
    constraint user_settings_default_league_game_length check (default_league_game is null or char_length(default_league_game) between 1 and 60),
  -- Nível dos sets novos da calculadora.
  add column default_level smallint not null default 100
    constraint user_settings_default_level check (default_level in (50, 100)),
  -- Sprite da ficha: animado (Showdown) ou estático (arte oficial); shiny começa ligado ou não.
  add column sprite_style text not null default 'animated'
    constraint user_settings_sprite_style check (sprite_style in ('animated', 'static')),
  add column shiny_sprites boolean not null default false,
  -- Seção aberta quando o endereço não traz nenhuma.
  add column home_section text not null default 'pokedex'
    constraint user_settings_home_section check (
      home_section in ('pokedex', 'movimentos', 'habilidades', 'itens', 'treinadores', 'times', 'calculadora')
    ),
  -- Acessibilidade (Aparência).
  add column reduce_motion boolean not null default false,
  add column font_scale text not null default 'normal'
    constraint user_settings_font_scale check (font_scale in ('normal', 'large', 'larger'));
