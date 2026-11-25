-- Fase A da troca de smogon_stats.date (text 'AAAA-MM') por date_month (date, dia 1). Nada é removido:
-- enquanto houver código gravando só uma das colunas, o gatilho preenche a outra.
alter table public.smogon_stats add column date_month date;
update public.smogon_stats set date_month = to_date(date || '-01', 'YYYY-MM-DD');

create function public.smogon_stats_sync_month() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.date_month is null and new.date is not null then
    new.date_month := to_date(new.date || '-01', 'YYYY-MM-DD');
  elsif new.date is null and new.date_month is not null then
    new.date := to_char(new.date_month, 'YYYY-MM');
  end if;
  return new;
end $$;

create trigger smogon_stats_sync_month before insert or update on public.smogon_stats
  for each row execute function public.smogon_stats_sync_month();

alter table public.smogon_stats alter column date_month set not null;
alter table public.smogon_stats alter column date drop not null;
alter table public.smogon_stats
  add constraint unique_pokemon_format_date_month unique (name, tier, date_month);
create index idx_smogon_query_month on public.smogon_stats (tier, date_month, usage_percent desc);
create index idx_smogon_stats_tier_name_key_month on public.smogon_stats (tier, name_key, date_month desc);
