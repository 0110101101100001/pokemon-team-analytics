grant select on public.smogon_stats to anon, authenticated;

create policy "smogon_stats_public_read" on public.smogon_stats
  for select to anon, authenticated using (true);
