// Comparar candidatos para uma vaga do time ("fecho com Corviknight, Toxapex ou Skarmory?"): cada um entra no time
// atual e passa pelo mesmo teste do meta do esboço. Sem React, para os testes.
import { compareThreats, deltaOf, evaluateTeam } from './sketchEdit';
import { coveredRoles } from './teamRoles';
import { TEAM_SIZE, speciesOf } from './teamScore';

export const MAX_CANDIDATES = 3;

const membersOf = (team, ctx) => team.map((pokemon) => ({ pokemon, set: ctx.setOf(pokemon) }));
const teamOf = (members) => members.map((member) => member.pokemon);

/**
 * Por que o candidato não pode entrar na vaga, ou null: 'espécie repetida' (de quem fica no time) ou 'time cheio'
 * (6 Pokémon e nenhuma vaga escolhida para liberar).
 */
export function candidateError(team, candidate, replaceIndex = null) {
  const staying = team.filter((_, index) => index !== replaceIndex);
  if (staying.length >= TEAM_SIZE) return 'time cheio';
  if (staying.some((pokemon) => speciesOf(pokemon) === speciesOf(candidate))) return 'espécie repetida';
  return null;
}

/**
 * Avalia cada candidato na vaga: no fim do time ou, com `replaceIndex`, no lugar daquele membro.
 * `ctx` vem de sketchContext. Devolve { baseline, options } com, por candidato:
 * { pokemon, set, evaluation, delta, fixed, worsened, unanswered, rolesGained, rolesLost, outOfTier, error }.
 * `baseline` é o time sem o candidato (e sem quem sai), para os deltas; `unanswered` são as ameaças que continuam
 * sem resposta. Candidato com `error` (espécie repetida) vem sem as notas.
 */
export function compareCandidates(team, candidates, ctx, { replaceIndex = null } = {}) {
  const staying = membersOf(team.filter((_, index) => index !== replaceIndex), ctx);
  const baseline = evaluateTeam(staying, ctx);
  const rolesBefore = coveredRoles(teamOf(staying), ctx.meta);
  const inTier = new Set(ctx.tierPool.map((entry) => entry.name));

  const options = candidates.slice(0, MAX_CANDIDATES).map((pokemon) => {
    const error = candidateError(team, pokemon, replaceIndex);
    if (error) return { pokemon, error };
    const member = { pokemon, set: ctx.setOf(pokemon) };
    const members = [...staying, member];
    const evaluation = evaluateTeam(members, ctx);
    const rolesAfter = coveredRoles(teamOf(members), ctx.meta);
    return {
      pokemon,
      set: member.set,
      evaluation,
      delta: deltaOf(baseline, evaluation),
      ...compareThreats(baseline, evaluation),
      unanswered: evaluation.gauntlet.threats.filter((threat) => threat.status === 'none').sort((a, b) => b.usage - a.usage),
      rolesGained: [...rolesAfter].filter((role) => !rolesBefore.has(role)),
      rolesLost: [...rolesBefore].filter((role) => !rolesAfter.has(role)),
      outOfTier: !inTier.has(pokemon.name),
      error: null,
    };
  });

  return { baseline, options };
}

/** Índice do candidato com a maior nota no teste do meta (empate: o maior encaixe), ou -1 sem nenhum válido. */
export function bestOptionIndex(options) {
  let best = -1;
  options.forEach((option, index) => {
    if (option.error) return;
    const current = options[best];
    if (!current || option.evaluation.objective > current.evaluation.objective) best = index;
  });
  return best;
}
