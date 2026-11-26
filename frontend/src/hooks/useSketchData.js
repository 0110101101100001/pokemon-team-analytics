import { useEffect, useState } from 'react';
import { loadBattleData } from '../utils/battleData';
import { loadAllSets } from '../utils/smogonSets';

/** Builds da Smogon e dados de batalha do esboço e da comparação: baixados uma vez, quando a aba abre. */
export function useSketchData() {
  const [data, setData] = useState({ status: 'loading', battleData: null, allSets: null });
  useEffect(() => {
    let active = true;
    Promise.all([loadBattleData(), loadAllSets()])
      .then(([battleData, allSets]) => active && setData({ status: 'ready', battleData, allSets }))
      .catch(() => active && setData({ status: 'error', battleData: null, allSets: null }));
    return () => { active = false; };
  }, []);
  return data;
}
