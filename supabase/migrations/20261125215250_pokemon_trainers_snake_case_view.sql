-- Etapa (a) do snake_case de PokemonTrainers: o front lê esta view; a tabela não muda.
-- security_invoker: valem o RLS e os grants da tabela (pokemon_trainers_public_read).
create view public.pokemon_trainers with (security_invoker = true) as
select
  "Card_ID" as card_id, "Generation" as generation, "Region" as region, "Location_Region" as location_region,
  "Games_Label" as games_label, "Games_JSON" as games_json, "Battle_Stage" as battle_stage, "Role" as role,
  "Order" as "order", "Location" as location, "Badge_Name" as badge_name, "Badge_Slug" as badge_slug,
  "Trainer_Name" as trainer_name, "Trainer_Slug" as trainer_slug, "Team_Variant" as team_variant,
  "Specialty_Type" as specialty_type, "Battle_Gimmick" as battle_gimmick, "Team_Size" as team_size,
  "Ace_Pokemon" as ace_pokemon, "Ace_Pokemon_Slug" as ace_pokemon_slug, "Ace_Level" as ace_level,
  "Avg_Level" as avg_level, "Team_Summary" as team_summary, "Team_JSON" as team_json, "Multi_Battle" as multi_battle
from public."PokemonTrainers";
grant select on public.pokemon_trainers to anon, authenticated;
