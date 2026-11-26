import { DEFAULT_ARCHETYPE, STRUCTURE_KEYS, archetypeByKey, archetypeFit, checklistOf } from './archetypes';
import { coveredRoles } from './teamRoles';
import { TEAM_SIZE, buildTeamProfile, rankCandidates, speciesOf } from './teamScore';

/*
  Esboço: beam search com diversidade sobre times parciais.
  - Cada estado é um time parcial. Para expandir, toda a pool do tier é pontuada por rankCandidates e
    cada candidato soma o ganho de encaixe no estilo e as funções novas que traz; ficam os BRANCHING melhores
    que ainda deixam espaço para as funções obrigatórias que faltam.
  - Por profundidade ficam BEAM_WIDTH estados, escolhidos por valor menos sobreposição com os já escolhidos.
  - Os times completos passam por `rate` (o teste do meta) e as variações finais saem por MMR:
    nota − λ × Pokémon em comum, sem nunca dividir mais de MAX_SHARED Pokémon além do rascunho
    (em um estilo de clima, o setter também não conta: repetir o único setter bom do tier é aceitável).
*/

export const BEAM_WIDTH = 12;
export const BRANCHING = 8;
// Pokémon em comum (fora do rascunho e do setter de clima) que duas variações podem dividir: limite rígido.
export const MAX_SHARED = 2;
const FIT_WEIGHT = 100;
const ROLE_WEIGHT = 6;
// λ do feixe, em pontos do valor da busca por Pokémon em comum com um estado já escolhido na mesma profundidade.
// Com MAX_SHARED = 2, 12 e 16 deixavam o feixe convergir e o meta de teste (16 Pokémon no tier) só rendia
// 2 variações no estilo Livre; com 20 saem 3 em todos os estilos testados, também no meta real do OU e do UU.
const BEAM_OVERLAP_PENALTY = 20;
// λ do MMR final, em pontos da nota (teste do meta 0–100) por Pokémon em comum com uma variação já escolhida:
// preferência suave por baixo do limite rígido de MAX_SHARED.
const FINAL_OVERLAP_PENALTY = 6;
const FINALISTS = 36;
// Do zero (rascunho vazio), o primeiro Pokémon sai entre os OPENERS mais usados do tier: sem time, o ranking não
// tem com o que combinar e escolheria pelo perfil de tipos, não pelo que funciona no meta.
const OPENERS = 12;
// Peso do encaixe no estilo ao lado da nota do teste do meta (0–100) na ordem final.
const FIT_IN_RANKING = 25;

/** Objetivo que ordena as variações e as edições: nota do teste do meta + 25 × encaixe no estilo (0–1). */
export const teamObjective = (gauntlet, fit) => gauntlet.score + FIT_IN_RANKING * fit.score;

const roundScore = (value) => Math.round(value * 10) / 10;

/** Entradas com nome na Smogon e uso mínimo no tier: sem isso entram banidos e Pokémon de outros tiers. */
export function tierPoolOf(pool, meta, minUsage = 1, banned = new Set()) {
  return pool.filter((entry) => {
    if (banned.has(entry.name)) return false;
    const smogonName = meta.names.get(entry.name);
    return smogonName != null && (meta.stats.get(smogonName)?.usage ?? 0) >= minUsage;
  });
}

/** Se o candidato cabe na regra de tipos repetidos (`maxPerType` null desliga a regra). */
export const fitsTypeRule = (team, candidate, maxPerType) => maxPerType == null
  || candidate.types.every((type) => team.filter((member) => member.types.includes(type)).length < maxPerType);

const missingRequired = (team, archetype, meta) => {
  const covered = coveredRoles(team, meta);
  return archetype.required.filter((role) => !covered.has(role));
};

/** Se o estilo tira o candidato da busca (setter de outro clima em um time de clima). */
export const excludedByStyle = (candidate, archetype, meta) =>
  (archetype.excludes ?? []).some((role) => meta.roles?.get(candidate.name)?.has(role));

/** Pokémon escolhidos (fora do rascunho) que contam para a diversidade: em um estilo de clima, sem o setter. */
export function diversitySpecies(picks, archetype, meta) {
  const setter = archetype.weather && `weather:${archetype.weather}`;
  return picks
    .map((pick) => pick.pokemon ?? pick)
    .filter((pokemon) => !(setter && meta.roles?.get(pokemon.name)?.has(setter)))
    .map(speciesOf);
}

const sharedPicks = (a, b) => a.diverse.filter((species) => b.diverseSet.has(species)).length;

function makeState(team, picks, value, archetype, meta) {
  const fit = archetypeFit(team, archetype, meta);
  const species = picks.map((pick) => speciesOf(pick.pokemon));
  const diverse = diversitySpecies(picks, archetype, meta);
  return { team, picks, value, fit, diverse, diverseSet: new Set(diverse), key: [...species].sort().join('|') };
}

// Os candidatos mais promissores para a próxima vaga de um estado.
function expand(state, tierPool, options, branching = BRANCHING) {
  const { archetype, meta, maxPerType } = options;
  const { team } = state;
  const slotsAfter = TEAM_SIZE - team.length - 1;
  const watched = new Set([...checklistOf(archetype), ...(archetype.desired ?? []).flatMap((rule) => rule.roles)]);
  const covered = coveredRoles(team, meta);
  const allowed = tierPool.filter((candidate) => fitsTypeRule(team, candidate, maxPerType)
    && !excludedByStyle(candidate, archetype, meta));

  return rankCandidates(team, allowed, { limit: allowed.length, meta })
    .map((ranked) => {
      const next = [...team, ranked.pokemon];
      if (missingRequired(next, archetype, meta).length > slotsAfter) return null;
      const fitGain = archetypeFit(next, archetype, meta).score - state.fit.score;
      const newRoles = [...(meta.roles?.get(ranked.pokemon.name) ?? [])].filter((role) => watched.has(role) && !covered.has(role));
      return { ranked, gain: ranked.score + FIT_WEIGHT * fitGain + ROLE_WEIGHT * newRoles.length };
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, branching);
}

// Os melhores estados, descontando a sobreposição com os já escolhidos para o feixe não virar um time só.
function diverseSelection(states, width, penalty) {
  const remaining = [...states].sort((a, b) => b.value - a.value);
  const chosen = [];
  while (chosen.length < width && remaining.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    remaining.forEach((state, index) => {
      const overlap = chosen.reduce((max, other) => Math.max(max, sharedPicks(state, other)), 0);
      const value = state.value - penalty * overlap;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    chosen.push(remaining.splice(bestIndex, 1)[0]);
  }
  return chosen;
}

function finalSelection(rated, variants) {
  const remaining = [...rated];
  const chosen = [];
  while (chosen.length < variants && remaining.length) {
    let bestIndex = -1;
    let bestValue = -Infinity;
    remaining.forEach((candidate, index) => {
      const overlaps = chosen.map((other) => sharedPicks(candidate.state, other.state));
      if (overlaps.some((overlap) => overlap > MAX_SHARED)) return;
      const value = candidate.relevance - FINAL_OVERLAP_PENALTY * Math.max(0, ...overlaps);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    if (bestIndex < 0) break;
    chosen.push(remaining.splice(bestIndex, 1)[0]);
  }
  return chosen;
}

// Estrutura que melhor descreve o time ("Bulky Offense" em um time de sol), para o título do card.
function structureOf(team, archetype, meta) {
  if (STRUCTURE_KEYS.includes(archetype.key)) return null;
  const [best] = STRUCTURE_KEYS
    .map((key) => ({ label: archetypeByKey(key).label, score: archetypeFit(team, archetypeByKey(key), meta).score }))
    .sort((a, b) => b.score - a.score);
  return best.label;
}

/** O que o card mostra de um time: título com o plano, brechas de tipo e quem cobre cada função do estilo. */
export function describeTeam(team, archetype, meta) {
  const covered = coveredRoles(team, meta);
  const coveredBy = Object.fromEntries(checklistOf(archetype).map((role) => [
    role,
    team.filter((member) => meta.roles?.get(member.name)?.has(role)).map((member) => member.name),
  ]));
  return {
    title: [archetype.label, structureOf(team, archetype, meta)].filter(Boolean).join(' · '),
    holes: buildTeamProfile(team).threats,
    roles: { covered: checklistOf(archetype).filter((role) => covered.has(role)), all: [...covered], coveredBy },
  };
}

function toVariation(seed, { state, rating }, archetype, meta) {
  return {
    ...describeTeam(state.team, archetype, meta),
    members: [
      ...seed.map((pokemon) => ({ pokemon, fromSeed: true })),
      ...state.picks.map(({ pokemon, score, reasons }) => ({ pokemon, fromSeed: false, score, reasons })),
    ],
    total: roundScore(state.picks.reduce((sum, pick) => sum + pick.score, 0)),
    fit: state.fit,
    gauntlet: rating,
  };
}

/**
 * Times completos para o rascunho (0 a 5 Pokémon; vazio = começar do zero) em um estilo, com o meta do tier (ver attachRoles).
 * Opções: `archetype`, `banned` (nomes de entrada), `maxPerType` (ex.: 2), `variants`, `minUsage` e
 * `rate(team)` → { score 0–100, … } (o teste do meta), que ordena as variações.
 * Devolve [{ title, members, holes, total, fit, roles, gauntlet }]; [] com o rascunho cheio, sem meta ou quando
 * nenhum time cumpre as funções obrigatórias.
 */
export function sketchTeams(seed, pool, meta, {
  archetype = DEFAULT_ARCHETYPE,
  banned = [],
  maxPerType = null,
  variants = 3,
  minUsage = 1,
  rate = null,
} = {}) {
  if (!meta || seed.length >= TEAM_SIZE) return [];

  const seedSpecies = new Set(seed.map(speciesOf));
  const tierPool = tierPoolOf(pool, meta, minUsage, new Set(banned))
    .filter((entry) => !seedSpecies.has(speciesOf(entry)));
  if (tierPool.length === 0) return [];

  const options = { archetype, meta, maxPerType };
  const usageOf = (entry) => meta.stats.get(meta.names.get(entry.name))?.usage ?? 0;
  const openers = [...tierPool].sort((a, b) => usageOf(b) - usageOf(a)).slice(0, OPENERS);
  let beam = [makeState(seed, [], 0, archetype, meta)];

  for (let size = seed.length; size < TEAM_SIZE; size += 1) {
    const children = new Map();
    for (const state of beam) {
      for (const { ranked, gain } of (state.team.length === 0 ? expand(state, openers, options, OPENERS) : expand(state, tierPool, options))) {
        const child = makeState([...state.team, ranked.pokemon], [...state.picks, ranked], state.value + gain, archetype, meta);
        const known = children.get(child.key);
        if (!known || known.value < child.value) children.set(child.key, child);
      }
    }
    if (children.size === 0) return [];
    const isLast = size + 1 === TEAM_SIZE;
    beam = diverseSelection([...children.values()], isLast ? FINALISTS : BEAM_WIDTH, BEAM_OVERLAP_PENALTY);
  }

  const complete = beam.filter((state) => missingRequired(state.team, archetype, meta).length === 0);
  if (complete.length === 0) return [];

  const best = Math.max(...complete.map((state) => state.value));
  const rated = complete.map((state) => {
    const rating = rate ? rate(state.team) : null;
    // Sem o teste do meta, a relevância é o valor da busca na mesma escala de 0 a 100.
    const relevance = rating ? teamObjective(rating, state.fit) : (100 * state.value) / (best || 1);
    return { state, rating, relevance };
  });

  // A diversidade decide quem entra; a ordem final é a da nota (teste do meta, com o encaixe no estilo de desempate).
  return finalSelection(rated.sort((a, b) => b.relevance - a.relevance), variants)
    .sort((a, b) => b.relevance - a.relevance)
    .map((choice) => toVariation(seed, choice, archetype, meta));
}
