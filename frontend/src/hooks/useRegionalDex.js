import { useEffect, useState } from 'react';
import { fetchRegionalDex } from '../services/api';

const IDLE = { status: 'idle', numbers: null };
const LOADING = { status: 'loading', numbers: null };

/**
 * Numeração de uma Pokédex regional: { status, numbers } com `numbers` = Map número nacional → número regional.
 * `slug` nulo desliga o hook (visão nacional).
 */
export function useRegionalDex(slug) {
  const [state, setState] = useState({ slug: null, ...IDLE });

  useEffect(() => {
    if (!slug) return undefined;
    let active = true;
    fetchRegionalDex(slug)
      .then((numbers) => active && setState({ slug, status: 'ready', numbers }))
      .catch(() => active && setState({ slug, status: 'error', numbers: null }));
    return () => { active = false; };
  }, [slug]);

  if (!slug) return IDLE;
  // Enquanto a requisição da dex nova não chega, o estado guardado ainda é o da anterior.
  return state.slug === slug ? state : LOADING;
}

/**
 * Entradas da grade para uma dex regional, na ordem e com o número do jogo.
 * Quando a espécie tem forma nativa da região do jogo (Meowth de Alola em Sun/Moon), só ela entra;
 * formas regionais de outras regiões ficam de fora.
 */
export function buildRegionalEntries(pokemonList, numbers, region) {
  const bySpecies = new Map();
  for (const entry of pokemonList) {
    if (!numbers.has(entry.number) || (entry.region && entry.region !== region)) continue;
    const forms = bySpecies.get(entry.number);
    if (forms) forms.push(entry);
    else bySpecies.set(entry.number, [entry]);
  }

  const entries = [];
  for (const [nationalNumber, forms] of bySpecies) {
    const native = region ? forms.filter((entry) => entry.region === region) : [];
    for (const entry of native.length ? native : forms) {
      entries.push({ ...entry, number: numbers.get(nationalNumber), nationalNumber });
    }
  }
  return entries.sort((a, b) => a.number - b.number || a.id - b.id);
}
