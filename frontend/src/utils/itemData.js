// Itens de evolução e Berries (scripts/build-item-data.mjs), com os rótulos em português.

/* ---------------------------------------------------------------- itens de evolução */

const TIMES_OF_DAY = { day: 'de dia', night: 'à noite', dusk: 'ao entardecer' };
const GENDERS = { male: 'só machos', female: 'só fêmeas' };

/** Como o item causa a evolução: "Trocar segurando o item, à noite (só fêmeas)". */
export function evolutionConditionLabel({ trigger, held, gender, timeOfDay }) {
  let base = 'Usar o item';
  if (held && trigger === 'trade') base = 'Trocar segurando o item';
  else if (held) base = 'Subir de nível segurando o item';
  const when = TIMES_OF_DAY[timeOfDay];
  return [`${base}${when ? `, ${when}` : ''}`, GENDERS[gender] && `(${GENDERS[gender]})`].filter(Boolean).join(' ');
}

let evolutionItems = null;

/** Evoluções que o item causa (identificador da PokéAPI), carregadas à parte só quando um item é aberto. */
export async function evolutionsByItem(slug) {
  evolutionItems ??= import('../data/evolution-items.json').then((module) => module.default);
  return (await evolutionItems)[slug] ?? [];
}

/* ---------------------------------------------------------------- Berries */

export const BERRY_CATEGORIES = {
  medicine: 'Cura status ou HP',
  'picky-healing': 'Cura conforme o sabor',
  'in-a-pinch': 'Em apuros',
  'type-protection': 'Reduz dano de um tipo',
  'pp-recovery': 'Recupera PP',
  'effort-drop': 'Reduz EVs',
  other: 'Outras',
  'baking-only': 'Só culinária',
};

// Ordem dos sabores no jogo.
export const FLAVORS = [
  ['spicy', 'Picante'],
  ['dry', 'Seco'],
  ['sweet', 'Doce'],
  ['bitter', 'Amargo'],
  ['sour', 'Azedo'],
];

const FIRMNESS = {
  'very-soft': 'Muito macia',
  soft: 'Macia',
  hard: 'Dura',
  'very-hard': 'Muito dura',
  'super-hard': 'Duríssima',
};

export const berryCategoryLabel = (category) => BERRY_CATEGORIES[category] ?? category?.replace(/-/g, ' ') ?? '—';
export const firmnessLabel = (firmness) => FIRMNESS[firmness] ?? firmness ?? '—';

/** Sabores com intensidade, do mais forte ao mais fraco. */
export const berryFlavors = (berry) =>
  FLAVORS.map(([key, label]) => ({ key, label, value: berry.flavors[key] ?? 0 }))
    .filter((flavor) => flavor.value > 0)
    .sort((a, b) => b.value - a.value);

/** Filtra por nome, categoria e tipo do Natural Gift. */
export function filterBerries(berries, { term, category, type }) {
  const query = term.trim().toLowerCase().replace(/\s+/g, '-');
  return berries.filter((berry) =>
    (!category || berry.category === category)
    && (!type || berry.naturalGift.type === type)
    && (!query || berry.name.includes(query)));
}
