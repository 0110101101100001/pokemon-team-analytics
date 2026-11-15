-- Busca de um Pokémon por nome sem diferenciar maiúsculas.
-- O ilike usado antes não aproveita índice btree; a coluna gerada permite um "=" indexado.
alter table public.smogon_stats
  add column if not exists name_key text generated always as (lower(name)) stored;

-- Ficha do Pokémon: (tier, nome) e o mês mais recente primeiro.
-- Filtros só por (tier, date) já usam idx_smogon_query.
create index if not exists idx_smogon_stats_tier_name_key
  on public.smogon_stats (tier, name_key, date desc);
