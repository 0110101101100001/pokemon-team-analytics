import { TYPE_NAMES, effectiveness } from './typeChart';
import { buildMetaProfile, scoreMeta } from './metaScore';

export const TEAM_SIZE = 6;

const WEIGHTS = { defense: 3, offense: 2, synergy: 1.5, counters: 2.5, stats: 1 };

// Exposição a um tipo atacante: fraqueza 2x = +1, 4x = +2; resistência 0.5x = -1, 0.25x = -2; imunidade = -3.
const exposureOf = (multiplier) => (multiplier === 0 ? -3 : Math.log2(multiplier));

// Quanto um candidato tapa uma brecha: imunidade vale mais do que resistência, e fraquezas pesam contra.
const patchValue = (multiplier) => {
  if (multiplier === 0) return 1.5;
  if (multiplier < 1) return multiplier < 0.5 ? 1.25 : 1;
  if (multiplier > 1) return multiplier > 2 ? -1.5 : -1;
  return 0;
};

const hitsSuperEffective = (attackTypes, defenseType) =>
  attackTypes.some((type) => effectiveness(type, [defenseType]) > 1);

const totalStats = (stats) => (stats ? Object.values(stats).reduce((sum, value) => sum + value, 0) : 0);

/** Resume a equipa num perfil reutilizável para pontuar toda a pool numa só passagem. */
export function buildTeamProfile(team) {
  const exposure = new Map(TYPE_NAMES.map((attack) => [attack, 0]));
  const resisted = new Set();
  const offenseCovered = new Set();
  const teamTypes = new Set();
  let speedSum = 0;
  let speedCount = 0;

  for (const member of team) {
    member.types.forEach((type) => teamTypes.add(type));

    for (const attack of TYPE_NAMES) {
      const multiplier = effectiveness(attack, member.types);
      exposure.set(attack, exposure.get(attack) + exposureOf(multiplier));
      if (multiplier < 1) resisted.add(attack);
    }

    for (const defense of TYPE_NAMES) {
      if (hitsSuperEffective(member.types, defense)) offenseCovered.add(defense);
    }

    if (member.stats?.speed != null) {
      speedSum += member.stats.speed;
      speedCount += 1;
    }
  }

  const holes = TYPE_NAMES.filter((attack) => exposure.get(attack) > 0);
  const threats = holes.filter((attack) => exposure.get(attack) >= 2);

  return {
    exposure,
    holes,
    threats,
    resisted,
    offenseCovered,
    teamTypes,
    averageSpeed: speedCount ? speedSum / speedCount : null,
  };
}

function scoreDefense(candidate, profile) {
  let score = 0;
  const patched = [];
  for (const attack of profile.holes) {
    const value = patchValue(effectiveness(attack, candidate.types));
    score += value * profile.exposure.get(attack);
    if (value > 0) patched.push(attack);
  }
  return { score, patched };
}

function scoreOffense(candidate, profile) {
  const added = TYPE_NAMES.filter(
    (defense) => !profile.offenseCovered.has(defense) && hitsSuperEffective(candidate.types, defense),
  );
  return { score: added.length, added };
}

function scoreSynergy(candidate, profile) {
  let score = 0;
  for (const attack of TYPE_NAMES) {
    if (effectiveness(attack, candidate.types) > 1) score += profile.resisted.has(attack) ? 1 : -1;
  }
  for (const type of candidate.types) {
    if (profile.teamTypes.has(type)) score -= 1;
  }
  return { score };
}

// Um counter resiste a um tipo que ameaça a equipa e devolve dano super eficaz com STAB.
function scoreCounters(candidate, profile) {
  const countered = profile.threats.filter(
    (threat) => effectiveness(threat, candidate.types) < 1 && hitsSuperEffective(candidate.types, threat),
  );
  return { score: countered.length, countered };
}

function scoreStats(candidate, profile) {
  if (!candidate.stats) return { score: 0 };
  const base = totalStats(candidate.stats) / 600;
  const needsSpeed = profile.averageSpeed != null && profile.averageSpeed < 80;
  const speedBonus = needsSpeed && candidate.stats.speed >= 100 ? 0.5 : 0;
  return { score: base + speedBonus };
}

/**
 * Pontua um candidato contra o perfil da equipa e devolve o total com a decomposição.
 * Com `meta` (dados da Smogon), soma uso no tier, pares frequentes e respostas às ameaças,
 * escala os tipos pelo tamanho do time e multiplica o total dos parceiros de núcleo.
 */
export function scoreCandidate(candidate, profile, meta = null) {
  const defense = scoreDefense(candidate, profile);
  const offense = scoreOffense(candidate, profile);
  const synergy = scoreSynergy(candidate, profile);
  const counters = scoreCounters(candidate, profile);
  const stats = scoreStats(candidate, profile);
  const smogon = meta && scoreMeta(candidate, profile.meta, meta);
  const typeScale = meta ? profile.meta.weights.types : 1;

  const breakdown = {
    defense: defense.score * WEIGHTS.defense * typeScale,
    offense: offense.score * WEIGHTS.offense * typeScale,
    synergy: synergy.score * WEIGHTS.synergy * typeScale,
    counters: counters.score * WEIGHTS.counters * typeScale,
    stats: stats.score * WEIGHTS.stats * typeScale,
    ...smogon?.breakdown,
  };

  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const multiplier = smogon?.multiplier ?? 1;
  // Num total negativo o multiplicador divide, para o bónus aproximar de zero em vez de afundar.
  const score = total >= 0 ? total * multiplier : total / multiplier;

  return {
    pokemon: candidate,
    score: Math.round(score * 10) / 10,
    multiplier,
    breakdown,
    reasons: { patched: defense.patched, newCoverage: offense.added, countered: counters.countered, ...smogon?.reasons },
  };
}

/** Ordena a pool pelas melhores adições à equipa, ignorando espécies que já lá estão. */
export function rankCandidates(team, pool, { limit = 10, meta = null } = {}) {
  if (team.length >= TEAM_SIZE) return [];

  const profile = buildTeamProfile(team);
  if (meta) profile.meta = buildMetaProfile(team, meta);
  const taken = new Set(team.map((member) => member.species ?? member.name));

  return pool
    .filter((candidate) => candidate.types?.length && !taken.has(candidate.species ?? candidate.name))
    .map((candidate) => scoreCandidate(candidate, profile, meta))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
