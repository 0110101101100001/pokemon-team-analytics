import { useEffect, useMemo, useState } from 'react';
import { fetchBattleForms, fetchPokemonDetail } from '../services/api';
import { toBaseStats } from '../utils/stats';

const EMPTY = { status: 'idle', id: null, types: [], baseStats: null, learnset: [], abilities: [], hiddenAbility: null };
const LOADING = { ...EMPTY, status: 'loading' };

/**
 * Atributos base, tipos, golpes que aprende e habilidades de um Pokémon, para o editor de sets e a calculadora.
 * `name` nulo desliga o hook. As respostas ficam no cache do serviço: voltar a um Pokémon não refaz a requisição.
 */
export function usePokemonBattleData(name) {
  const [state, setState] = useState({ name: null, ...EMPTY });

  useEffect(() => {
    if (!name) return undefined;
    let active = true;
    fetchPokemonDetail(name)
      .then((data) => active && setState({
        name,
        status: 'ready',
        id: data.id,
        types: data.types.map(({ type }) => type.name),
        baseStats: toBaseStats(data.stats),
        learnset: data.moves.map(({ move }) => move.name).sort(),
        // Habilidades da espécie na ordem do jogo; a oculta vem por último.
        abilities: data.abilities.map(({ ability }) => ability.name),
        hiddenAbility: data.abilities.find((entry) => entry.is_hidden)?.ability.name ?? null,
      }))
      .catch(() => active && setState({ name, ...EMPTY, status: 'error' }));
    return () => { active = false; };
  }, [name]);

  if (!name) return EMPTY;
  return state.name === name ? state : LOADING;
}

const NO_FORMS = [];

/** Megas e Primal disponíveis para uma variedade (lista vazia enquanto carrega ou se não houver). */
export function useBattleForms(name) {
  const [state, setState] = useState({ name: null, forms: NO_FORMS });

  useEffect(() => {
    if (!name) return undefined;
    let active = true;
    fetchBattleForms(name)
      .then((forms) => active && setState({ name, forms }))
      .catch(() => active && setState({ name, forms: NO_FORMS }));
    return () => { active = false; };
  }, [name]);

  return name && state.name === name ? state.forms : NO_FORMS;
}

/**
 * Dados de batalha de um Pokémon com a forma escolhida (Mega/Primal) por cima da base:
 * atributos, tipos e habilidades vêm da forma; os golpes, da base (a PokéAPI não lista golpes das Megas).
 */
export function useFormBattleData(baseName, formName) {
  const base = usePokemonBattleData(baseName);
  const form = usePokemonBattleData(formName || null);
  // Memorizado: quem usa o resultado como dependência só recalcula quando os dados mudam.
  return useMemo(() => {
    if (!formName) return base;
    const status = form.status === 'ready' && base.status !== 'ready' ? base.status : form.status;
    return { ...form, learnset: base.learnset, status };
  }, [formName, base, form]);
}
