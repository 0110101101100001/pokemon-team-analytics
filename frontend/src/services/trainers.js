import { supabase } from './supabase';
import { withPersistentCache } from './persistentCache';
import { groupTrainers, toTeam } from '../utils/trainers';

// Leitura pública pela view pokemon_trainers (nomes em snake_case; security_invoker, vale o RLS
// pokemon_trainers_public_read da tabela PokemonTrainers): vai direto ao Supabase, sem o backend no Render.
const TABLE = 'pokemon_trainers';
const CARD_COLUMNS = [
  'card_id', 'generation', 'region', 'games_label', 'games_json', 'battle_stage', 'role', 'order', 'location', 'badge_name',
  'trainer_name', 'trainer_slug', 'team_variant', 'specialty_type', 'battle_gimmick', 'ace_pokemon_slug',
  'avg_level', 'team_size', 'multi_battle',
];
const LIST_COLUMNS = CARD_COLUMNS.join(', ');
const FULL_COLUMNS = [...CARD_COLUMNS, 'team_json'].join(', ');
const DAY_MS = 24 * 60 * 60 * 1000;
// Subir a versão descarta a lista guardada no navegador (ex.: coluna nova).
const LIST_CACHE_KEY = 'supabase:pokemon_trainers:list:v1';

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
 * Todos os treinadores, agrupados, sem os times (team_json é quase metade do peso da tabela).
 * Uma consulta por dia: a lista fica no IndexedDB por 24 h.
 */
export const fetchTrainers = once(() =>
  withPersistentCache(LIST_CACHE_KEY, DAY_MS, () => selectRows(LIST_COLUMNS)).then(groupTrainers));

/** Os mesmos treinadores com os times de todas as batalhas, para o seletor da Calculadora. */
export const fetchTrainersWithTeams = once(() => selectRows(FULL_COLUMNS).then(groupTrainers));

const teamRequests = new Map();

/** Times das batalhas pedidas: Map card_id → membros. Uma consulta por treinador por sessão. */
export function fetchTrainerTeams(battleIds) {
  const key = [...battleIds].sort().join('|');
  if (!teamRequests.has(key)) {
    const request = selectRows('card_id, team_json', (query) => query.in('card_id', battleIds))
      .then((rows) => new Map(rows.map((row) => [row.card_id, toTeam(row.team_json)])))
      .catch((error) => {
        teamRequests.delete(key);
        throw error;
      });
    teamRequests.set(key, request);
  }
  return teamRequests.get(key);
}
