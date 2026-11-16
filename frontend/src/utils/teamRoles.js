import { baseStatsOf, moveSummaryOf } from './battleData';
import { toPokeApiSlug } from './slug';

/** Fração dos sets (em %) a partir da qual um golpe, item ou habilidade define uma função. */
export const ROLE_USAGE_CUTOFF = 30;
/** Atributo ofensivo base que, sozinho, já faz de um Pokémon um wallbreaker. */
export const WALLBREAKER_BASE_STAT = 120;

export const ROLES = [
  'hazards', 'removal', 'pivot', 'speedControl', 'setup', 'recovery', 'cleric', 'trickRoom',
  'weather:sun', 'weather:rain', 'weather:sand', 'weather:snow', 'wallbreaker',
];

export const ROLE_LABELS = {
  hazards: 'Hazards',
  removal: 'Hazard Control',
  pivot: 'Pivot',
  speedControl: 'Speed Control',
  setup: 'Setup Sweeper',
  recovery: 'Recovery',
  cleric: 'Cleric',
  trickRoom: 'Trick Room',
  'weather:sun': 'Sun Setter',
  'weather:rain': 'Rain Setter',
  'weather:sand': 'Sand Setter',
  'weather:snow': 'Snow Setter',
  wallbreaker: 'Wallbreaker',
};

// Golpes e habilidades com os nomes como a Smogon os grava.
const MOVE_ROLES = {
  hazards: ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'],
  removal: ['Rapid Spin', 'Defog', 'Mortal Spin', 'Tidy Up', 'Court Change'],
  pivot: ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport', 'Chilly Reception', 'Shed Tail'],
  speedControl: ['Sticky Web', 'Thunder Wave', 'Icy Wind', 'Tailwind', 'Trick Room'],
  setup: [
    'Swords Dance', 'Dragon Dance', 'Nasty Plot', 'Calm Mind', 'Quiver Dance', 'Shell Smash',
    'Bulk Up', 'Belly Drum', 'Victory Dance', 'Tidy Up',
  ],
  recovery: [
    'Recover', 'Roost', 'Slack Off', 'Soft-Boiled', 'Moonlight', 'Synthesis', 'Morning Sun',
    'Shore Up', 'Strength Sap', 'Wish', 'Rest',
  ],
  cleric: ['Heal Bell', 'Aromatherapy', 'Wish'],
  trickRoom: ['Trick Room'],
};

const ABILITY_ROLES = {
  'weather:sun': ['Drought', 'Orichalcum Pulse'],
  'weather:rain': ['Drizzle'],
  'weather:sand': ['Sand Stream'],
  'weather:snow': ['Snow Warning'],
};

const ITEM_ROLES = {
  speedControl: ['Choice Scarf'],
  wallbreaker: ['Choice Band', 'Choice Specs'],
};

const ROLE_SOURCES = [
  ...Object.entries(ITEM_ROLES).map(([role, names]) => ['items', role, names]),
  ...Object.entries(MOVE_ROLES).map(([role, names]) => ['moves', role, names]),
  ...Object.entries(ABILITY_ROLES).map(([role, names]) => ['abilities', role, names]),
];

const usedEnough = (usage, names) => names.some((name) => (usage?.[name] ?? 0) >= ROLE_USAGE_CUTOFF);

/**
 * Funções de um Pokémon a partir do uso na Smogon ({ moves, items, abilities } em %).
 * Com `baseStats`, Atk ou SpA base ≥ 120 também marca wallbreaker.
 */
export function rolesOf(smogonStat, baseStats = null) {
  const roles = new Set();
  if (!smogonStat) return roles;
  for (const [role, moves] of Object.entries(MOVE_ROLES)) {
    if (usedEnough(smogonStat.moves, moves)) roles.add(role);
  }
  for (const [role, abilities] of Object.entries(ABILITY_ROLES)) {
    if (usedEnough(smogonStat.abilities, abilities)) roles.add(role);
  }
  for (const [role, items] of Object.entries(ITEM_ROLES)) {
    if (usedEnough(smogonStat.items, items)) roles.add(role);
  }
  if (baseStats && Math.max(baseStats.atk, baseStats.spa) >= WALLBREAKER_BASE_STAT) roles.add('wallbreaker');
  return roles;
}

/**
 * O que sustenta cada função (Map role → nome como a Smogon grava), item antes de golpe:
 * - `set`: o set exibido ({ item, ability, moves: [{ slug }] }, em slugs da PokéAPI);
 * - `smogonStat`: sem `set`, o mais usado entre os que passam do corte.
 */
export function roleEvidence({ set = null, smogonStat = null }) {
  const evidence = new Map();
  const inSet = set && {
    items: new Set([set.item].filter(Boolean)),
    abilities: new Set([set.ability].filter(Boolean)),
    moves: new Set((set.moves ?? []).filter(Boolean).map((move) => move.slug)),
  };
  for (const [field, role, names] of ROLE_SOURCES) {
    if (evidence.has(role)) continue;
    const found = inSet
      ? names.find((name) => inSet[field].has(toPokeApiSlug(name)))
      : names
        .filter((name) => (smogonStat?.[field]?.[name] ?? 0) >= ROLE_USAGE_CUTOFF)
        .sort((a, b) => smogonStat[field][b] - smogonStat[field][a])[0];
    if (found) evidence.set(role, found);
  }
  return evidence;
}

// Tipos dos golpes de dano usados em ≥ 30% dos sets.
function attackTypesOf(smogonStat, battleData) {
  const types = new Set();
  for (const [name, usage] of Object.entries(smogonStat.moves ?? {})) {
    if (usage < ROLE_USAGE_CUTOFF) continue;
    const move = moveSummaryOf(battleData, toPokeApiSlug(name));
    if (move?.power && move.damageClass !== 'status') types.add(move.type);
  }
  return types;
}

/**
 * O meta com o que o esboço precisa de cada entrada da pool que tem dados no tier:
 * `roles` (Map entry.name → Set de funções), `baseStats` (Map entry.name → atributos base)
 * e `attackTypes` (Map entry.name → tipos dos golpes de dano mais usados).
 */
export function attachRoles(meta, pool, battleData) {
  const roles = new Map();
  const baseStats = new Map();
  const attackTypes = new Map();
  for (const entry of pool) {
    const stat = meta.stats.get(meta.names.get(entry.name));
    if (!stat) continue;
    const stats = baseStatsOf(battleData, entry.id);
    roles.set(entry.name, rolesOf(stat, stats));
    attackTypes.set(entry.name, attackTypesOf(stat, battleData));
    if (stats) baseStats.set(entry.name, stats);
  }
  return { ...meta, roles, baseStats, attackTypes };
}

/** Funções cobertas por pelo menos um membro. */
export function coveredRoles(team, meta) {
  const covered = new Set();
  for (const member of team) meta.roles?.get(member.name)?.forEach((role) => covered.add(role));
  return covered;
}
