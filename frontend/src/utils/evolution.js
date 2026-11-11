const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());

const titleCase = (slug) =>
  slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const ITEM_NAMES = {
  'moon-stone': 'Pedra Lunar',
  'fire-stone': 'Pedra do Fogo',
  'water-stone': 'Pedra da Água',
  'thunder-stone': 'Pedra do Trovão',
  'leaf-stone': 'Pedra da Folha',
  'sun-stone': 'Pedra Solar',
  'dusk-stone': 'Pedra do Crepúsculo',
  'dawn-stone': 'Pedra da Aurora',
  'shiny-stone': 'Pedra Brilhante',
  'ice-stone': 'Pedra do Gelo',
  'oval-stone': 'Pedra Oval',
  'kings-rock': 'Pedra do Rei',
  'metal-coat': 'Revestimento Metálico',
  'dragon-scale': 'Escama de Dragão',
  'up-grade': 'Up-Grade',
  'dubious-disc': 'Disco Duvidoso',
  protector: 'Protetor',
  electirizer: 'Eletrizador',
  magmarizer: 'Magmarizador',
  'reaper-cloth': 'Manto Ceifeiro',
  'razor-claw': 'Garra Navalha',
  'razor-fang': 'Presa Navalha',
  'prism-scale': 'Escama Prisma',
  'deep-sea-tooth': 'Dente Abissal',
  'deep-sea-scale': 'Escama Abissal',
  sachet: 'Saqueta Perfumada',
  'whipped-dream': 'Doce Chantilly',
  'tart-apple': 'Maçã Ácida',
  'sweet-apple': 'Maçã Doce',
  'syrupy-apple': 'Maçã Xaroposa',
  'cracked-pot': 'Bule Rachado',
  'chipped-pot': 'Bule Lascado',
  'galarica-cuff': 'Pulseira Galarica',
  'galarica-wreath': 'Grinalda Galarica',
  'black-augurite': 'Augurita Negra',
  'peat-block': 'Bloco de Turfa',
  'linking-cord': 'Cabo de Ligação',
  'auspicious-armor': 'Armadura Auspiciosa',
  'malicious-armor': 'Armadura Maliciosa',
  'unremarkable-teacup': 'Chávena Banal',
  'masterpiece-teacup': 'Chávena Prima',
  'metal-alloy': 'Liga Metálica',
  'leaders-crest': 'Crista do Líder',
  'scroll-of-darkness': 'Pergaminho da Escuridão',
  'scroll-of-waters': 'Pergaminho das Águas',
};

const itemName = (slug) => ITEM_NAMES[slug] ?? titleCase(slug);

const TIME_OF_DAY = {
  day: { icon: 'day', text: 'De dia' },
  night: { icon: 'night', text: 'De noite' },
  dusk: { icon: 'dusk', text: 'Ao entardecer' },
};

const RELATIVE_STATS = {
  1: 'Ataque > Defesa',
  0: 'Ataque = Defesa',
  '-1': 'Ataque < Defesa',
};

const TRIGGER_BADGES = {
  shed: { icon: 'party', text: 'Vaga no time e uma Poké Ball' },
  spin: { icon: 'spin', text: 'Girar no lugar' },
  'tower-of-darkness': { icon: 'tower', text: 'Torre da Escuridão' },
  'tower-of-waters': { icon: 'tower', text: 'Torre das Águas' },
  'three-critical-hits': { icon: 'move', text: '3 golpes críticos em uma batalha' },
  'take-damage': { icon: 'damage', text: 'Sofrer dano e atravessar o arco de pedra' },
  'recoil-damage': { icon: 'damage', text: '294 de dano de recuo acumulado' },
  'agile-style-move': { icon: 'move', text: 'Usar o ataque em estilo ágil 20x' },
  'strong-style-move': { icon: 'move', text: 'Usar o ataque em estilo forte 20x' },
  other: { icon: 'special', text: 'Condição especial' },
};

/** Converte um objeto `evolution_details` da PokéAPI numa lista de badges { icon, text }. */
export function parseEvolutionDetail(detail) {
  const badges = [];
  const trigger = detail.trigger?.name ?? 'level-up';

  if (detail.min_level) badges.push({ icon: 'level', text: `Nível ${detail.min_level}` });

  if (trigger === 'trade') {
    if (detail.trade_species) badges.push({ icon: 'trade', text: `Troca por ${titleCase(detail.trade_species.name)}` });
    else if (detail.held_item) badges.push({ icon: 'trade', text: `Troca com ${itemName(detail.held_item.name)}` });
    else badges.push({ icon: 'trade', text: 'Troca' });
  } else if (detail.held_item) {
    badges.push({ icon: 'item', text: `Segurando ${itemName(detail.held_item.name)}` });
  }

  if (trigger === 'use-item' && detail.item) badges.push({ icon: 'stone', text: itemName(detail.item.name) });
  if (detail.min_happiness) badges.push({ icon: 'heart', text: 'Amizade alta' });
  if (detail.min_affection) badges.push({ icon: 'heart', text: 'Afeição alta' });
  if (detail.min_beauty) badges.push({ icon: 'sparkle', text: 'Beleza alta' });
  if (detail.known_move) badges.push({ icon: 'move', text: `Sabe ${titleCase(detail.known_move.name)}` });
  if (detail.known_move_type) badges.push({ icon: 'move', text: `Sabe ataque ${titleCase(detail.known_move_type.name)}` });
  if (detail.location) badges.push({ icon: 'location', text: titleCase(detail.location.name) });
  if (detail.time_of_day && TIME_OF_DAY[detail.time_of_day]) badges.push(TIME_OF_DAY[detail.time_of_day]);
  if (detail.gender) badges.push({ icon: 'gender', text: detail.gender === 1 ? 'Fêmea' : 'Macho' });
  if (detail.relative_physical_stats != null) {
    badges.push({ icon: 'stats', text: RELATIVE_STATS[detail.relative_physical_stats] });
  }
  if (detail.party_species) badges.push({ icon: 'party', text: `${titleCase(detail.party_species.name)} no time` });
  if (detail.party_type) badges.push({ icon: 'party', text: `Tipo ${titleCase(detail.party_type.name)} no time` });
  if (detail.needs_overworld_rain) badges.push({ icon: 'rain', text: 'Com chuva' });
  if (detail.turn_upside_down) badges.push({ icon: 'spin', text: 'Consola invertida' });
  if (TRIGGER_BADGES[trigger]) badges.push(TRIGGER_BADGES[trigger]);

  if (badges.length === 0) {
    badges.push(trigger === 'level-up'
      ? { icon: 'level', text: 'Subir de nível' }
      : { icon: 'special', text: 'Evolução especial' });
  }
  return badges;
}

const MAX_ALTERNATIVES = 3;

/** Lista de alternativas (cada uma é uma lista de badges), sem duplicados. */
export function describeEvolution(details = []) {
  const seen = new Set();
  const alternatives = [];
  for (const detail of details) {
    const badges = parseEvolutionDetail(detail);
    const key = badges.map((b) => b.text).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    alternatives.push(badges);
  }
  return alternatives.slice(0, MAX_ALTERNATIVES);
}

/**
 * Transforma a `chain` da PokéAPI num layout em grade:
 * `stage` é a coluna; `row` a linha (as folhas ocupam linhas inteiras,
 * os pais ficam centrados em relação aos filhos).
 */
export function layoutEvolutionChain(chain) {
  const nodes = [];
  const edges = [];
  let nextRow = 0;
  let stageCount = 0;

  const visit = (link, stage, parentId) => {
    const node = { id: link.species.name, speciesId: idFromUrl(link.species.url), parentId, stage, row: 0 };
    nodes.push(node);
    stageCount = Math.max(stageCount, stage + 1);

    const children = (link.evolves_to ?? []).filter((child) => child.species?.url);
    if (children.length === 0) {
      node.row = nextRow++;
    } else {
      const rows = children.map((child) => visit(child, stage + 1, node.id).row);
      node.row = (rows[0] + rows[rows.length - 1]) / 2;
    }

    if (parentId) {
      edges.push({ from: parentId, to: node.id, alternatives: describeEvolution(link.evolution_details) });
    }
    return node;
  };

  visit(chain, 0, null);
  return { nodes, edges, stageCount, rowCount: nextRow };
}

/* ------------------------------------------------------------------ variantes regionais */

export const REGIONS = {
  alola: { label: 'Alola', generation: 7 },
  galar: { label: 'Galar', generation: 8 },
  hisui: { label: 'Hisui', generation: 8 },
  paldea: { label: 'Paldea', generation: 9 },
};

const REGION_PATTERN = /-(alola|galar|hisui|paldea)(?:-|$)/;

// Formas regionais cujo slug não traz o sufixo da região.
const FORM_REGION = { 'basculin-white-striped': 'hisui' };

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };

/** Região da forma aberta no drawer (`zoroark-hisui` → 'hisui'), ou null. */
export function detectRegion(formName) {
  if (!formName) return null;
  return FORM_REGION[formName] ?? formName.match(REGION_PATTERN)?.[1] ?? null;
}

// Variedades com o nome da região que não são formas regionais (pikachu-alola-cap, raticate-totem-alola).
const NON_REGIONAL_VARIETY = /-(cap|totem)(-|$)/;

function regionalVariety(species, region) {
  const matches = (species?.varieties ?? [])
    .map((v) => v.pokemon)
    .filter((p) => detectRegion(p.name) === region && !NON_REGIONAL_VARIETY.test(p.name));
  // `darmanitan-galar-standard` antes de `darmanitan-galar-zen`.
  return matches.sort((a, b) => a.name.length - b.name.length)[0] ?? null;
}

const speciesGeneration = (species) => ROMAN[species?.generation?.name?.split('-')[1]] ?? null;

const regionsOf = (species) =>
  Object.keys(REGIONS).filter((region) => regionalVariety(species, region));

/**
 * Linha regional: um nó lhe pertence se tem variante dessa região (zorua → zorua-hisui),
 * se é espécie nova dessa geração (Perrserker, Sirfetch'd, Clodsire…) ou se é antecessor
 * de um nó da linha (bebês compartilhados: Pichu, Mime Jr.).
 */
function regionalNodes(layout, speciesByName, region) {
  const meta = REGIONS[region];
  const nodes = layout.nodes.map((node) => {
    const species = speciesByName.get(node.id);
    const variety = regionalVariety(species, region);
    return {
      ...node,
      formName: variety?.name ?? null,
      spriteId: variety ? idFromUrl(variety.url) : node.speciesId,
      regionLabel: variety ? meta.label : null,
      inLine: Boolean(variety) || speciesGeneration(species) === meta.generation,
    };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    if (!node.inLine) continue;
    for (let parent = byId.get(node.parentId); parent && !parent.inLine; parent = byId.get(parent.parentId)) {
      parent.inLine = true;
    }
  }
  return nodes;
}

/**
 * Linha base: um nó fica fora se o pai tem uma variante regional e o nó é uma espécie nova
 * da geração dessa região, isto é, só a forma regional do pai evolui para ele
 * (Meowth → Perrserker, Wooper → Clodsire, Sneasel → Sneasler). Os descendentes herdam.
 * Kleavor e Ursaluna ficam na linha: Scyther e Ursaring não têm variante regional.
 */
function baseNodes(layout, speciesByName) {
  const nodes = layout.nodes.map((node) => ({ ...node, inLine: true }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    const parent = byId.get(node.parentId);
    if (!parent) continue;
    if (!parent.inLine) {
      node.inLine = false;
      continue;
    }
    const generation = speciesGeneration(speciesByName.get(node.id));
    node.inLine = !regionsOf(speciesByName.get(parent.id))
      .some((region) => REGIONS[region].generation === generation);
  }
  return nodes;
}

/**
 * Adapta os nós de `layoutEvolutionChain` à forma aberta no drawer.
 * `speciesByName`: Map nome da espécie → resposta de /pokemon-species.
 * `region`: região da forma (`detectRegion`) ou null para a forma base.
 * Os nós fora da linha ficam marcados `outOfLine` (ex.: Persian para Meowth-Galar,
 * Perrserker para o Meowth normal).
 */
export function applyRegionalLine(layout, speciesByName, region) {
  const nodes = region ? regionalNodes(layout, speciesByName, region) : baseNodes(layout, speciesByName);
  const inLine = new Map(nodes.map((n) => [n.id, n.inLine]));

  return {
    ...layout,
    nodes: nodes.map(({ inLine: keep, ...node }) => ({ ...node, outOfLine: !keep })),
    edges: layout.edges.map((edge) => ({ ...edge, outOfLine: !inLine.get(edge.to) })),
  };
}
