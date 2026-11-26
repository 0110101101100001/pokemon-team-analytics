import { toPokeApiSlug, titleFromSlug } from './slug';
import { STAT_KEYS, TERA_TYPES } from './stats';

/*
  Build salva (coluna `build` de user_builds), versionada:
  { v: 1, species, level, nature, ability, item, teraType, evs, ivs, moves }
  Os nomes vão como o Showdown os escreve ("Focus Sash", "Own Tempo", "Jolly"); o site trabalha com slugs da
  PokéAPI, e as funções abaixo convertem nos dois sentidos.
*/
export const BUILD_VERSION = 1;
export const BUILD_NAME_MAX = 60;
export const BUILD_MOVES_MAX = 4;
// Limites do jogo para a validação no cliente (o banco só confere o tamanho do JSON).
const EV_MAX = 252;
const EV_TOTAL_MAX = 510;
const IV_MAX = 31;
const LEVEL_MAX = 100;

// Rótulos do Showdown para os atributos, na ordem do jogo.
export const SHOWDOWN_STATS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const STAT_BY_LABEL = new Map(Object.entries(SHOWDOWN_STATS).map(([key, label]) => [label.toLowerCase(), key]));

const fillStats = (value) => Object.fromEntries(STAT_KEYS.map((key) => [key, value]));
const isInt = (value) => Number.isInteger(value);
const slugOrEmpty = (name) => (name ? toPokeApiSlug(name) : '');

/** Slug da espécie → nome do Showdown: "ogerpon-wellspring" → "Ogerpon-Wellspring". */
export const speciesName = (slug) => slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-');

/** "jolly" → "Jolly"; "focus-sash" → "Focus Sash". */
const displayName = (slug) => (slug ? titleFromSlug(slug) : '');

/** Build de versão que este código não conhece: mostrar aviso, não abrir. */
export const isFutureBuild = (build) => Number(build?.v) > BUILD_VERSION;

/** Lista de problemas da build (vazia = válida). Mensagens em português, para mostrar ao usuário. */
export function validateBuild(build) {
  const errors = [];
  if (!build || typeof build !== 'object') return ['Build vazia.'];
  if (build.v !== BUILD_VERSION) errors.push(`Versão da build desconhecida (${build.v}).`);
  if (typeof build.species !== 'string' || !build.species.trim() || build.species.length > BUILD_NAME_MAX) {
    errors.push('Falta a espécie do Pokémon.');
  }
  if (!isInt(build.level) || build.level < 1 || build.level > LEVEL_MAX) errors.push('O nível vai de 1 a 100.');
  const evs = STAT_KEYS.map((key) => build.evs?.[key]);
  if (evs.some((value) => !isInt(value) || value < 0 || value > EV_MAX)) errors.push('Cada EV vai de 0 a 252.');
  else if (evs.reduce((sum, value) => sum + value, 0) > EV_TOTAL_MAX) errors.push('A soma dos EVs passa de 510.');
  if (STAT_KEYS.some((key) => !isInt(build.ivs?.[key]) || build.ivs[key] < 0 || build.ivs[key] > IV_MAX)) {
    errors.push('Cada IV vai de 0 a 31.');
  }
  if (!Array.isArray(build.moves) || build.moves.length > BUILD_MOVES_MAX || build.moves.some((move) => typeof move !== 'string' || !move)) {
    errors.push('A build tem no máximo 4 golpes.');
  }
  return errors;
}

/**
 * Set do site (slugs, golpes como objetos { slug }) → build salva. `species` é o nome exibido ("Ogerpon-Wellspring").
 * Na calculadora item, habilidade e Tera moram no lado, não no set: chegam em `overrides`.
 */
export function buildFromSet(species, set, overrides = {}) {
  const merged = { ...set, ...overrides };
  return {
    v: BUILD_VERSION,
    species,
    level: merged.level,
    nature: displayName(merged.nature),
    ability: displayName(merged.ability),
    item: displayName(merged.item),
    teraType: merged.teraType ? displayName(merged.teraType) : null,
    evs: { ...fillStats(0), ...merged.evs },
    ivs: { ...fillStats(IV_MAX), ...merged.ivs },
    moves: (merged.moves ?? [])
      .map((move) => (typeof move === 'string' ? move : move?.slug))
      .filter(Boolean)
      .slice(0, BUILD_MOVES_MAX)
      .map((slug) => displayName(slug)),
  };
}

/**
 * Build salva → set do site. Os golpes saem como slugs (`moveSlugs`): quem carrega busca os dados de cada um.
 * Tera desconhecido vira null; o resto é saneado pelo normalizeBattleSet de quem usar.
 */
export function setFromBuild(build) {
  const tera = slugOrEmpty(build.teraType);
  return {
    speciesSlug: toPokeApiSlug(build.species),
    moveSlugs: (build.moves ?? []).slice(0, BUILD_MOVES_MAX).map(toPokeApiSlug),
    set: {
      level: build.level,
      nature: slugOrEmpty(build.nature) || 'hardy',
      item: slugOrEmpty(build.item),
      ability: slugOrEmpty(build.ability),
      teraType: TERA_TYPES.includes(tera) ? tera : null,
      evs: { ...fillStats(0), ...build.evs },
      ivs: { ...fillStats(IV_MAX), ...build.ivs },
    },
  };
}

/** "252 Spe / 252 Atk / 4 HP": os EVs usados, do maior para o menor (no empate, de Spe para HP, como no exemplo do brief). */
export function evSummary(evs) {
  return STAT_KEYS
    .map((key, order) => ({ key, order, value: evs?.[key] ?? 0 }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value || b.order - a.order)
    .map(({ key, value }) => `${value} ${SHOWDOWN_STATS[key]}`)
    .join(' / ');
}

const spread = (values, keep) => STAT_KEYS
  .filter((key) => keep(values?.[key]))
  .map((key) => `${values[key]} ${SHOWDOWN_STATS[key]}`)
  .join(' / ');

/** Nome sugerido: "Smeargle – Jolly". */
export const defaultBuildName = (build) =>
  (build.nature ? `${build.species} – ${build.nature}` : build.species).slice(0, BUILD_NAME_MAX);

/** Build no formato de importação do Showdown. */
export function buildToShowdown(build) {
  const lines = [build.item ? `${build.species} @ ${build.item}` : build.species];
  if (build.ability) lines.push(`Ability: ${build.ability}`);
  lines.push(`Level: ${build.level}`);
  if (build.teraType) lines.push(`Tera Type: ${build.teraType}`);
  const evs = spread(build.evs, (value) => value > 0);
  if (evs) lines.push(`EVs: ${evs}`);
  if (build.nature) lines.push(`${build.nature} Nature`);
  const ivs = spread(build.ivs, (value) => value != null && value !== IV_MAX);
  if (ivs) lines.push(`IVs: ${ivs}`);
  for (const move of build.moves ?? []) lines.push(`- ${move}`);
  return lines.join('\n');
}

// "Atk" e "SpA" também aparecem escritos de outros jeitos em exportações antigas.
const STAT_ALIASES = { attack: 'atk', defense: 'def', 'sp. atk': 'spa', 'sp. def': 'spd', speed: 'spe', spatk: 'spa', spdef: 'spd' };

function parseSpread(text, base) {
  const values = { ...base };
  for (const part of text.split('/')) {
    const match = part.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const label = match[2].trim().toLowerCase();
    const key = STAT_BY_LABEL.get(label) ?? STAT_ALIASES[label];
    if (key) values[key] = Number(match[1]);
  }
  return values;
}

// Alternativas ("Choice Band / Choice Scarf"): fica a primeira.
const firstOption = (value) => value.split(' / ')[0].trim();

// "Apelido (Espécie) (M) @ Item" → espécie e item.
function parseHeader(line) {
  const [left, item = ''] = line.split(' @ ');
  let name = left.replace(/\s+\((M|F)\)\s*$/, '').trim();
  const nested = name.match(/\(([^()]+)\)\s*$/);
  if (nested) name = nested[1].trim();
  return { species: name, item: item ? firstOption(item) : '' };
}

function parseBlock(block) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  const { species, item } = parseHeader(lines[0]);
  const build = {
    v: BUILD_VERSION, species, level: LEVEL_MAX, nature: '', ability: '', item, teraType: null,
    evs: fillStats(0), ivs: fillStats(IV_MAX), moves: [],
  };
  for (const line of lines.slice(1)) {
    const [, key = '', rest = ''] = line.match(/^([^:]+):\s*(.*)$/) ?? [];
    if (line.startsWith('-')) {
      // "Hidden Power [Fire]" fica como "Hidden Power".
      const move = firstOption(line.replace(/^-\s*/, '')).replace(/\s*\[.*\]$/, '');
      if (move && build.moves.length < BUILD_MOVES_MAX) build.moves.push(move);
    } else if (/^(\w+)\s+Nature$/i.test(line)) {
      build.nature = line.replace(/\s+Nature$/i, '').trim();
    } else if (/^ability$/i.test(key)) {
      build.ability = firstOption(rest);
    } else if (/^level$/i.test(key)) {
      build.level = Number.parseInt(rest, 10) || LEVEL_MAX;
    } else if (/^tera type$/i.test(key)) {
      build.teraType = firstOption(rest) || null;
    } else if (/^evs$/i.test(key)) {
      build.evs = parseSpread(rest, fillStats(0));
    } else if (/^ivs$/i.test(key)) {
      build.ivs = parseSpread(rest, fillStats(IV_MAX));
    }
    // Shiny, Happiness, Gigantamax e afins não entram na build.
  }
  return build;
}

/**
 * Texto do Showdown (um ou vários Pokémon separados por linha em branco) → [{ build, errors }].
 * Cada build vem com a lista de problemas de validateBuild; quem chama decide o que salvar.
 */
export function parseShowdown(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const build = parseBlock(block);
      return { build, errors: validateBuild(build) };
    });
}
