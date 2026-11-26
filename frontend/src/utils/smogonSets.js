import { buildSmogonNameIndex, resolveSmogonName } from './smogon';
import { smogonSetFile } from './smogonSetFile';
import { fetchStaticJson } from '../services/staticData';

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

/**
 * Todas as builds (gen9.json, ~1 MB), baixadas à parte e uma vez: só o esboço de times precisa delas,
 * porque percorre o meta inteiro. Quem olha um Pokémon usa fetchSmogonSets, que baixa só o arquivo dele.
 */
export function loadAllSets() {
  request ??= import('../data/gen9.json').then((module) => module.default).catch((error) => {
    request = null;
    throw error;
  });
  return request;
}

/** Nomes (como a Smogon escreve) dos Pokémon com builds: o índice de public/data/smogon-sets, poucos KB. */
export async function loadSmogonSetNames() {
  const names = await fetchStaticJson('smogon-sets/index.json');
  if (!names) throw new Error('Índice de builds indisponível');
  return names;
}

/**
 * Builds da Smogon para uma variedade { name, species, isForm }, agrupadas por formato:
 * [{ tier, label, sets }], já na ordem de exibição. Lista vazia se a variedade não tem builds;
 * uma forma nunca recebe as builds da espécie base.
 */
export async function fetchSmogonSets(variety) {
  const smogonName = resolveSmogonName(variety, await loadSmogonSetNames());
  if (!smogonName) return { smogonName: null, tiers: [] };
  const byTier = await fetchStaticJson(`smogon-sets/${smogonSetFile(smogonName)}.json`);
  if (!byTier) throw new Error(`Builds de ${smogonName} indisponíveis`);

  const rank = (tier) => (TIER_ORDER.includes(tier) ? TIER_ORDER.indexOf(tier) : TIER_ORDER.length);
  const tiers = Object.entries(byTier)
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([tier, sets]) => ({
      tier,
      label: tierLabel(tier),
      sets: Object.entries(sets).map(([name, raw]) => normalizeSet(name, raw)),
    }));
  return { smogonName, tiers };
}

/** Ids das entradas da grade que têm pelo menos uma build. */
export async function fetchPokemonIdsWithBuilds(entries) {
  const index = buildSmogonNameIndex(entries, await loadSmogonSetNames());
  return new Set(entries.filter((entry) => index.has(entry.name)).map((entry) => entry.id));
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
