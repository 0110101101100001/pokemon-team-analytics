-- Limites nas tabelas que o usuário escreve direto pela API (teams, user_favorites, user_history), como user_builds
-- já tem. Sem eles, qualquer conta grava um JSON enorme ou milhões de linhas com a chave pública.
-- Os números ficam bem acima do uso normal: o site salva times de até 6 Pokémon com nome de até 40 caracteres
-- (TeamManagerModal.jsx) e mostra as 60 visitas mais recentes (HISTORY_LIMIT em userData.js).

-- teams: nome de 1 a 60 caracteres; pokemons é uma lista de até 6 itens, com menos de 16 KB.
alter table public.teams
  add constraint teams_name_length check (char_length(name) between 1 and 60),
  add constraint teams_pokemons_shape check (
    jsonb_typeof(pokemons) = 'array'
    and jsonb_array_length(pokemons) <= 6
    and pg_column_size(pokemons) < 16384
  );

alter table public.user_favorites
  add constraint user_favorites_pokemon_name_length check (char_length(pokemon_name) between 1 and 60);

alter table public.user_history
  add constraint user_history_pokemon_name_length check (char_length(pokemon_name) between 1 and 60);

-- Teto de linhas por usuário (o mesmo formato de enforce_user_builds_limit).
create or replace function public.enforce_teams_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.teams where user_id = new.user_id) >= 100 then
    raise exception 'limite de 100 times atingido';
  end if;
  return new;
end $$;

create trigger teams_limit
  before insert on public.teams
  for each row execute function public.enforce_teams_limit();

-- Favoritos: um por Pokémon (já há UNIQUE), então 2000 cobre todas as variedades com folga.
create or replace function public.enforce_user_favorites_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.user_favorites where user_id = new.user_id) >= 2000 then
    raise exception 'limite de 2000 favoritos atingido';
  end if;
  return new;
end $$;

create trigger user_favorites_limit
  before insert on public.user_favorites
  for each row execute function public.enforce_user_favorites_limit();

-- Histórico: em vez de recusar, apaga o que passou das 60 visitas mais recentes do usuário. O site só lê essas 60,
-- então nada some da tela. Roda com os direitos de quem inseriu, e a política de DELETE já permite apagar o próprio.
create or replace function public.trim_user_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.user_history
  where user_id = new.user_id
    and id not in (
      select id from public.user_history
      where user_id = new.user_id
      order by viewed_at desc
      limit 60
    );
  return null;
end $$;

create trigger user_history_trim
  after insert on public.user_history
  for each row execute function public.trim_user_history();

-- Gatilhos não são chamados pela API: ninguém de fora executa essas funções direto.
revoke execute on function public.enforce_teams_limit() from public, anon, authenticated;
revoke execute on function public.enforce_user_favorites_limit() from public, anon, authenticated;
revoke execute on function public.trim_user_history() from public, anon, authenticated;
