// Como um Pokémon aprende um golpe, a partir de data/move-learners/<golpe>.json (scripts/build-move-learners.mjs).
// A aba Golpes não tem filtro de jogo: os métodos somam todos os jogos.

export const LEARN_METHODS = [
  { value: 'level', label: 'Nível' },
  { value: 'machine', label: 'TM' },
  { value: 'egg', label: 'Ovo' },
  { value: 'tutor', label: 'Tutor' },
];

// Métodos raros da PokéAPI, mostrados juntos como "Especial" quando o Pokémon não tem nenhum dos comuns.
const OTHER_LABELS = {
  reminder: 'relembrador de golpes',
  train: 'treino (Pokémon Champions)',
  'form-change': 'troca de forma',
  'zygarde-cube': 'Zygarde Cube',
  'stadium-surfing-pikachu': 'evento do Pokémon Stadium',
  'colosseum-purification': 'purificação (Colosseum)',
  'xd-shadow': 'Pokémon sombrio (XD)',
  'xd-purification': 'purificação (XD)',
};

const joinList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items[0]);

function levelBadge(levels) {
  const positive = levels.filter((level) => level > 0);
  const onEvolution = levels.includes(0);
  if (positive.length === 0) {
    return { kind: 'level', text: 'Evolução', title: 'Aprende ao evoluir', ariaLabel: 'aprende ao evoluir' };
  }
  const [first, ...others] = positive;
  const extra = [others.length > 0 && `Nv. ${others.join(', ')}`, onEvolution && 'ao evoluir'].filter(Boolean);
  return {
    kind: 'level',
    text: `Nv. ${first}`,
    title: extra.length ? `Nv. ${first}; em outros jogos também ${joinList(extra)}` : `Nv. ${first}`,
    ariaLabel: `aprende por nível ${first}`,
  };
}

/**
 * Etiquetas de um Pokémon, na ordem Nível, TM, Ovo, Tutor; "Especial" só quando não há nenhuma dessas.
 * `gameLabel(slug)` dá o nome do jogo da máquina para a dica.
 */
export function learnBadges(entry, gameLabel = (slug) => slug) {
  if (!entry) return [];
  const badges = [];
  if (entry.l?.length) badges.push(levelBadge(entry.l));
  if (entry.m) {
    const game = entry.mg ? gameLabel(entry.mg) : null;
    badges.push({
      kind: 'machine',
      text: entry.m,
      title: game ? `${entry.m} em ${game}` : entry.m,
      ariaLabel: `aprende por ${entry.m}${game ? ` em ${game}` : ''}`,
    });
  }
  if (entry.e) badges.push({ kind: 'egg', text: 'Ovo', title: 'Aprende por ovo', ariaLabel: 'aprende por ovo' });
  if (entry.t) badges.push({ kind: 'tutor', text: 'Tutor', title: 'Aprende com tutor', ariaLabel: 'aprende com tutor' });
  if (badges.length === 0 && entry.o?.length) {
    const ways = entry.o.map((method) => OTHER_LABELS[method] ?? method);
    badges.push({ kind: 'other', text: 'Especial', title: `Aprende por ${joinList(ways)}`, ariaLabel: `aprende por ${joinList(ways)}` });
  }
  return badges;
}

const HAS_METHOD = {
  level: (entry) => Boolean(entry?.l?.length),
  machine: (entry) => Boolean(entry?.m),
  egg: (entry) => Boolean(entry?.e),
  tutor: (entry) => Boolean(entry?.t),
};

/** Se o Pokémon aprende pelo método do filtro ("all" aceita todos). */
export const learnsBy = (entry, method) => method === 'all' || (HAS_METHOD[method]?.(entry) ?? false);
