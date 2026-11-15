import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { fetchSmogonMeta } from '../services/smogonMeta';
import { buildMeta } from '../utils/metaScore';

/**
 * Dados da Smogon do `tier` ligados às entradas da `pool`.
 * `status`: 'loading' enquanto a consulta não volta, 'ready' com `meta` montado,
 * 'unavailable' se a consulta falhou ou o tier não tem linhas (aí `meta` é null).
 */
export function useSmogonMeta(pool, tier = 'gen9ou') {
  const deferredPool = useDeferredValue(pool);
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setRows(null);
    setFailed(false);
    fetchSmogonMeta(tier)
      .then((data) => active && setRows(data))
      .catch((error) => {
        console.warn('Dados da Smogon indisponíveis:', error);
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, [tier]);

  const meta = useMemo(
    () => (rows?.length ? buildMeta(rows, deferredPool) : null),
    [rows, deferredPool],
  );

  const status = meta ? 'ready' : failed || rows ? 'unavailable' : 'loading';
  return { meta, status, pool: deferredPool };
}
