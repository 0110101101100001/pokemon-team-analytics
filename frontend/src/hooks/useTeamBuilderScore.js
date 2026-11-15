import { useMemo } from 'react';
import { rankCandidates } from '../utils/teamScore';
import { useSmogonMeta } from './useSmogonMeta';

/**
 * Sugestões pontuadas para completar o time.
 * `team` e `pool` usam o formato das entradas da Pokédex ({ name, species, types, stats? }).
 * A pontuação parte dos tipos e soma os dados da Smogon do `tier` assim que chegam;
 * se a consulta falhar, as sugestões continuam só com tipos.
 */
export function useTeamBuilderScore(team, pool, { limit = 10, tier = 'gen9ou' } = {}) {
  const { meta, pool: deferredPool } = useSmogonMeta(pool, tier);

  return useMemo(
    () => rankCandidates(team, deferredPool, { limit, meta }),
    [team, deferredPool, limit, meta],
  );
}
