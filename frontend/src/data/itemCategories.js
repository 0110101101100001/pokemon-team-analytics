/*
  Categorias de item da PokéAPI vistas pelo competitivo: o que fica fora do site e como o resto se agrupa na aba Itens.
*/

// Fora do índice e, com isso, da listagem e da busca: itens sem uso em batalha.
export const HIDDEN_ITEM_CATEGORIES = new Set([
  // Sobras sem uso (Mega Pendant), marcadores das Dynamax Crystals (★And603) e Data Cards.
  'unused', 'dynamax-crystals', 'data-cards',
  // Itens-chave de história, de evento e de exploração.
  'plot-advancement', 'event-items', 'gameplay', 'apricorn-box',
  // Scarlet/Violet: materiais de TM, piquenique e ingredientes de sanduíche; Sword/Shield: ingredientes de curry.
  'tm-materials', 'picnic', 'sandwich-ingredients', 'curry-ingredients',
  // Pokémon GO, Let's Go e concursos.
  'species-candies', 'catching-bonus', 'baking-only', 'scarves',
  // Itens de venda, coleção, fósseis, adubos e cartas.
  'loot', 'collectibles', 'spelunking', 'dex-completion', 'mulch', 'all-mail',
]);

/*
  Grupos do filtro da aba Itens, na ordem de importância para o competitivo; a listagem também segue essa ordem,
  então sem filtro os itens segurados vêm primeiro. Uma categoria nova da PokéAPI que não esteja em nenhum grupo
  cai em "Outros" em vez de sumir.
*/
export const ITEM_GROUPS = [
  {
    id: 'held',
    label: 'Itens segurados',
    categories: [
      'held-items', 'choice', 'bad-held-items', 'type-enhancement', 'species-specific',
      'mega-stones', 'z-crystals', 'plates', 'memories', 'jewels',
    ],
  },
  { id: 'berries', label: 'Berries', categories: ['medicine', 'in-a-pinch', 'type-protection', 'picky-healing', 'other'] },
  { id: 'healing', label: 'Cura e medicina', categories: ['healing', 'revival', 'status-cures', 'pp-recovery'] },
  { id: 'training', label: 'Treino e Tera', categories: ['nature-mints', 'vitamins', 'effort-drop', 'effort-training', 'training', 'tera-shard'] },
  { id: 'evolution', label: 'Evolução', categories: ['evolution'] },
  { id: 'battle', label: 'Uso em batalha', categories: ['stat-boosts', 'flutes', 'miracle-shooter'] },
  { id: 'balls', label: 'Poké Bolas', categories: ['standard-balls', 'special-balls', 'apricorn-balls'] },
];

export const OTHER_GROUP = { id: 'other', label: 'Outros' };

const GROUP_BY_CATEGORY = new Map(
  ITEM_GROUPS.flatMap((group, order) => group.categories.map((category) => [category, { group, order }])),
);

/** Grupo de uma categoria e a posição dele na ordem da listagem. */
export function itemGroupOf(category) {
  return GROUP_BY_CATEGORY.get(category) ?? { group: OTHER_GROUP, order: ITEM_GROUPS.length };
}

/** Posição da categoria dentro do grupo, para os itens parecidos ficarem juntos na listagem. */
export function categoryOrder(category) {
  const { group } = itemGroupOf(category);
  const index = group.categories?.indexOf(category) ?? -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
