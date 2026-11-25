import { supabase } from './supabase';
import { withPersistentCache } from './persistentCache';
import { groupTrainers, toTeam } from '../utils/trainers';

// Leitura pública (RLS pokemon_trainers_public_read): vai direto ao Supabase, sem o backend no Render.
const TABLE = 'PokemonTrainers';
const CARD_COLUMNS = [
  'Card_ID', 'Generation', 'Region', 'Games_Label', 'Games_JSON', 'Battle_Stage', 'Role', 'Order', 'Location', 'Badge_Name',
  'Trainer_Name', 'Trainer_Slug', 'Team_Variant', 'Specialty_Type', 'Battle_Gimmick', 'Ace_Pokemon_Slug',
  'Avg_Level', 'Team_Size', 'Multi_Battle',
];
const LIST_COLUMNS = CARD_COLUMNS.join(', ');
const FULL_COLUMNS = [...CARD_COLUMNS, 'Team_JSON'].join(', ');
const DAY_MS = 24 * 60 * 60 * 1000;
// Subir a versão descarta a lista guardada no navegador (ex.: coluna nova).
const LIST_CACHE_KEY = 'supabase:PokemonTrainers:list:v1';

async function selectRows(columns, filter = (query) => query) {
  const { data, error } = await filter(supabase.from(TABLE).select(columns));
  if (error) throw error;
  return data;
}

/** Guarda a promessa durante a sessão; uma falha não fica em cache. */
function once(load) {
  let request = null;
  return () => {
    request ??= load().catch((error) => {
      request = null;
      throw error;
    });
    return request;
  };
}

/**
 * Todos os treinadores, agrupados, sem os times (Team_JSON é quase metade do peso da tabela).
 * Uma consulta por dia: a lista fica no IndexedDB por 24 h.
 */
export const fetchTrainers = once(() =>
  withPersistentCache(LIST_CACHE_KEY, DAY_MS, () => selectRows(LIST_COLUMNS)).then(groupTrainers));

/** Os mesmos treinadores com os times de todas as batalhas, para o seletor da Calculadora. */
export const fetchTrainersWithTeams = once(() => selectRows(FULL_COLUMNS).then(groupTrainers));

const teamRequests = new Map();

/** Times das batalhas pedidas: Map Card_ID → membros. Uma consulta por treinador por sessão. */
export function fetchTrainerTeams(battleIds) {
  const key = [...battleIds].sort().join('|');
  if (!teamRequests.has(key)) {
    const request = selectRows('Card_ID, Team_JSON', (query) => query.in('Card_ID', battleIds))
      .then((rows) => new Map(rows.map((row) => [row.Card_ID, toTeam(row.Team_JSON)])))
      .catch((error) => {
        teamRequests.delete(key);
        throw error;
      });
    teamRequests.set(key, request);
  }
  return teamRequests.get(key);
}
