-- Estilo do ícone do perfil (Configurações da conta → Perfil): a arte oficial do Pokémon ou o sprite 2D (pixel
-- art). As linhas que já existem ficam com a arte oficial, que era o único estilo. As permissões de user_profiles
-- são da tabela inteira (grant select, insert, update to authenticated), então a coluna nova já está coberta.
alter table public.user_profiles
  add column icon_style text not null default 'official'
    constraint user_profiles_icon_style check (icon_style in ('official', '2d'));

-- A página Tipos (#/tipos) também pode ser a seção inicial: a lista de Preferências vem de SECTIONS.
alter table public.user_settings drop constraint user_settings_home_section;
alter table public.user_settings
  add constraint user_settings_home_section check (
    home_section in ('pokedex', 'movimentos', 'habilidades', 'itens', 'tipos', 'treinadores', 'times', 'calculadora')
  );
