import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { fetchSmogonMeta } from '../services/smogonMeta';
import { buildMeta } from '../utils/metaScore';
import { rankCandidates } from '../utils/teamScore';

/**
 * Sugestões pontuadas para completar o time.
 * `team` e `pool` usam o formato das entradas da Pokédex ({ name, species, types, stats? }).
 * A pontuação parte dos tipos e soma os dados da Smogon do `tier` assim que chegam;
 * se a consulta falhar, as sugestões continuam só com tipos.
 */
export function useTeamBuilderScore(team, pool, { limit = 10, tier = 'gen9ou' } = {}) {
  const deferredPool = useDeferredValue(pool);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let active = true;
    setRows(null);
    fetchSmogonMeta(tier)
      .then((data) => active && setRows(data))
      .catch((error) => console.warn('Dados da Smogon indisponíveis para as sugestões:', error));
    return () => { active = false; };
  }, [tier]);

  const meta = useMemo(
    () => (rows?.length ? buildMeta(rows, deferredPool) : null),
    [rows, deferredPool],
  );

  return useMemo(
    () => rankCandidates(team, deferredPool, { limit, meta }),
    [team, deferredPool, limit, meta],
  );
}
