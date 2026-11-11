import { resolveSmogonName } from './smogon';

// Ordem de preferência dos formatos; os que não estiverem aqui vão para o fim, em ordem alfabética.
const TIER_LABELS = {
  ou: 'OU',
  ubers: 'Ubers',
  uu: 'UU',
  ru: 'RU',
  nu: 'NU',
  pu: 'PU',
  zu: 'ZU',
  lc: 'Little Cup',
  nfe: 'NFE',
  doublesou: 'Doubles OU',
  vgc2025: 'VGC 2025',
  vgc2024: 'VGC 2024',
  vgc2023: 'VGC 2023',
  battlestadiumsingles: 'Battle Stadium Singles',
  ubersuu: 'Ubers UU',
  anythinggoes: 'Anything Goes',
  monotype: 'Monotype',
  '1v1': '1v1',
  nationaldex: 'National Dex',
  nationaldexubers: 'National Dex Ubers',
  nationaldexuu: 'National Dex UU',
  nationaldexru: 'National Dex RU',
  nationaldexmonotype: 'National Dex Monotype',
  nationaldexdoubles: 'National Dex Doubles',
  cap: 'CAP',
  almostanyability: 'Almost Any Ability',
  balancedhackmons: 'Balanced Hackmons',
  stabmons: 'STABmons',
  mixandmega: 'Mix and Mega',
  godlygift: 'Godly Gift',
  partnersincrime: 'Partners in Crime',
  inheritance: 'Inheritance',
};
const TIER_ORDER = Object.keys(TIER_LABELS);

export const tierLabel = (tier) => TIER_LABELS[tier] ?? tier;

const STATS = [['hp', 'HP'], ['atk', 'Atk'], ['def', 'Def'], ['spa', 'SpA'], ['spd', 'SpD'], ['spe', 'Spe']];

/** { atk: 252, spd: 4, spe: 252 } → "252 Atk / 4 SpD / 252 Spe" */
export const formatStatSpread = (spread) =>
  STATS.filter(([key]) => spread[key] != null).map(([key, label]) => `${spread[key]} ${label}`).join(' / ');

// No JSON cada campo é um valor único, uma lista de alternativas ou está ausente.
const alternatives = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

function normalizeSet(name, raw) {
  return {
    name,
    items: alternatives(raw.item),
    abilities: alternatives(raw.ability),
    natures: alternatives(raw.nature),
    evs: alternatives(raw.evs),
    ivs: alternatives(raw.ivs),
    teraTypes: alternatives(raw.teratypes),
    // Um slot por golpe; cada slot pode ter mais de uma opção.
    moves: (raw.moves ?? []).map(alternatives),
  };
}

let request = null;

/** O arquivo tem ~1 MB: é baixado à parte, uma vez, quando a aba Builds é aberta. */
function loadAllSets() {
  request ??= import('../data/gen9.json').then((module) => module.default).catch((error) => {
    request = null;
    throw error;
  });
  return request;
}

/**
 * Builds da Smogon para uma variedade { name, species, isForm }, agrupadas por formato:
 * [{ tier, label, sets }], já na ordem de exibição. Lista vazia se a variedade não tem builds;
 * uma forma nunca recebe as builds da espécie base.
 */
export async function fetchSmogonSets(variety) {
  const all = await loadAllSets();
  const smogonName = resolveSmogonName(variety, Object.keys(all));
  if (!smogonName) return { smogonName: null, tiers: [] };

  const rank = (tier) => (TIER_ORDER.includes(tier) ? TIER_ORDER.indexOf(tier) : TIER_ORDER.length);
  const tiers = Object.entries(all[smogonName])
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([tier, sets]) => ({
      tier,
      label: tierLabel(tier),
      sets: Object.entries(sets).map(([name, raw]) => normalizeSet(name, raw)),
    }));
  return { smogonName, tiers };
}

/**
 * Texto no formato de importação do Pokémon Showdown. O Showdown aceita uma opção por campo,
 * então vai a primeira alternativa de cada um (a preferida pela Smogon).
 */
export function toShowdownText(pokemonName, set) {
  const [item] = set.items;
  const lines = [item ? `${pokemonName} @ ${item}` : pokemonName];
  if (set.abilities[0]) lines.push(`Ability: ${set.abilities[0]}`);
  if (set.teraTypes[0]) lines.push(`Tera Type: ${set.teraTypes[0]}`);
  if (set.evs[0]) lines.push(`EVs: ${formatStatSpread(set.evs[0])}`);
  if (set.natures[0]) lines.push(`${set.natures[0]} Nature`);
  if (set.ivs[0]) lines.push(`IVs: ${formatStatSpread(set.ivs[0])}`);
  for (const [move] of set.moves) lines.push(`- ${move}`);
  return lines.join('\n');
}
