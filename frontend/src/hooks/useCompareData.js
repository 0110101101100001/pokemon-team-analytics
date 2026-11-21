import { useEffect, useState } from 'react';
import { fetchPokemonDetail } from '../services/api';
import { fetchSmogonNames, fetchSmogonStats } from '../services/smogonMeta';
import { topUsage } from '../utils/compare';
import { resolveSmogonName } from '../utils/smogon';
import { toBaseStats } from '../utils/stats';

const ERROR = 'error';

/**
 * Atributos base e habilidades de cada Pokémon: { [name]: { stats, abilities, hiddenAbility } | 'error' }.
 * Quem ainda carrega fica de fora. As respostas ficam no cache do serviço.
 */
export function usePokemonDetails(names) {
  const [details, setDetails] = useState({});
  const key = names.join('|');

  useEffect(() => {
    let active = true;
    const save = (name, value) => active && setDetails((current) => ({ ...current, [name]: value }));
    for (const name of key ? key.split('|') : []) {
      fetchPokemonDetail(name)
        .then((data) => save(name, {
          stats: toBaseStats(data.stats),
          abilities: data.abilities.filter((entry) => !entry.is_hidden).map(({ ability }) => ability.name),
          hiddenAbility: data.abilities.find((entry) => entry.is_hidden)?.ability.name ?? null,
        }))
        .catch(() => save(name, ERROR));
    }
    return () => { active = false; };
  }, [key]);

  return details;
}

/**
 * Uso de cada Pokémon em um tier da Smogon, no mês mais recente dele:
 * { [name]: { usage, item, ability } | null (sem dados no tier) | 'error' }. Quem ainda carrega fica de fora.
 */
export function useSmogonUsage(entries, tier) {
  const [state, setState] = useState({ tier, byName: {} });
  const key = entries.map((entry) => entry.name).join('|');

  useEffect(() => {
    let active = true;
    const save = (name, value) => active && setState((current) => ({
      tier,
      byName: { ...(current.tier === tier ? current.byName : {}), [name]: value },
    }));

    fetchSmogonNames()
      .then((smogonNames) => entries.forEach((entry) => {
        const smogonName = resolveSmogonName(entry, smogonNames);
        if (!smogonName) return save(entry.name, null);
        return fetchSmogonStats(smogonName, tier)
          .then((stats) => save(entry.name, stats && {
            usage: stats.usage_percent,
            item: topUsage(stats.items),
            ability: topUsage(stats.abilities),
          }))
          .catch(() => save(entry.name, ERROR));
      }))
      .catch(() => entries.forEach((entry) => save(entry.name, ERROR)));
    return () => { active = false; };
  }, [key, tier]); // `key` resume as entradas: a mesma lista em um array novo não refaz as consultas.

  return state.tier === tier ? state.byName : {};
}
