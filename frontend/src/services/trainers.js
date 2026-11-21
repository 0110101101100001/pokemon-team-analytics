import { supabase } from './supabase';
import { groupTrainers } from '../utils/trainers';

// Leitura pública (RLS pokemon_trainers_public_read): vai direto ao Supabase, sem o backend no Render.
const TABLE = 'PokemonTrainers';
const COLUMNS = [
  'Card_ID', 'Generation', 'Region', 'Games_Label', 'Games_JSON', 'Battle_Stage', 'Role', 'Order', 'Location', 'Badge_Name',
  'Trainer_Name', 'Trainer_Slug', 'Team_Variant', 'Specialty_Type', 'Battle_Gimmick', 'Ace_Pokemon_Slug',
  'Avg_Level', 'Team_JSON', 'Multi_Battle',
].join(', ');

let request = null;

/** Todos os treinadores, agrupados; uma consulta por sessão (uma falha não fica em cache). */
export function fetchTrainers() {
  request ??= supabase
    .from(TABLE)
    .select(COLUMNS)
    .then(({ data, error }) => {
      if (error) throw error;
      return groupTrainers(data);
    })
    .catch((error) => {
      request = null;
      throw error;
    });
  return request;
}
