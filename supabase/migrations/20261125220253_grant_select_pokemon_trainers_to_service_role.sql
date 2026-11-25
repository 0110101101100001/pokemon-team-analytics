-- O backup semanal (backup.yml) lê a tabela pela API REST com a chave service_role.
grant select on public."PokemonTrainers" to service_role;
