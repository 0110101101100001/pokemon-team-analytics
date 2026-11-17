grant select on public."PokemonTrainers" to anon, authenticated;

create policy "pokemon_trainers_public_read" on public."PokemonTrainers"
  for select to anon, authenticated using (true);
