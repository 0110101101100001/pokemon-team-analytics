import { archetypeFit } from './archetypes';
import { gauntletMember, runGauntlet } from './gauntlet';
import {
  MAX_SHARED, describeTeam, diversitySpecies, excludedByStyle, fitsTypeRule, sketchTeams, teamObjective,
} from './sketch';
import { coveredRoles } from './teamRoles';
import { TEAM_SIZE, rankCandidates, speciesOf } from './teamScore';
import { formatSlug } from './filters';

/*
  Edição de um esboço: fixar, trocar, corrigir a pior ameaça e regenerar.
  Um card é { members: [{ pokemon, set, locked, fromSeed, explain? }] } com 6 membros; `ctx` vem de sketchContext.
  Tudo aqui é síncrono e usa só dados já carregados; o cache de duelos do teste do meta faz uma troca calcular
  apenas os duelos do membro novo.
*/

export const HISTORY_LIMIT = 20;
export const STATUS_RANK = { none: 0, weak: 1, ok: 2, solid: 3 };

const teamOf = (members) => members.map((member) => member.pokemon);

/** Notas de um time: { gauntlet, fit, objective } e o que o card mostra (título, brechas, funções). */
export function evaluateTeam(members, ctx) {
  const team = teamOf(members);
  const gauntlet = runGauntlet(ctx.gauntlet, members.map((member) => gauntletMember(member.pokemon, member.set, ctx.battleData)));
  const fit = archetypeFit(team, ctx.archetype, ctx.meta);
  return { gauntlet, fit, objective: teamObjective(gauntlet, fit), ...describeTeam(team, ctx.archetype, ctx.meta) };
}

const statusMap = (evaluation) => new Map(evaluation.gauntlet.threats.map((threat) => [threat.name, threat.status]));

/** Ameaças que subiram (`fixed`) e que caíram (`worsened`) de status entre duas avaliações, por uso. */
export function compareThreats(before, after) {
  const was = statusMap(before);
  const fixed = [];
  const worsened = [];
  for (const threat of after.gauntlet.threats) {
    const change = STATUS_RANK[threat.status] - STATUS_RANK[was.get(threat.name) ?? 'none'];
    const entry = { name: threat.name, id: threat.id, usage: threat.usage, from: was.get(threat.name), to: threat.status };
    if (change > 0) fixed.push(entry);
    if (change < 0) worsened.push(entry);
  }
  const byUsage = (a, b) => b.usage - a.usage;
  return { fixed: fixed.sort(byUsage), worsened: worsened.sort(byUsage) };
}

/** Diferença entre duas avaliações, nas mesmas unidades das notas. */
export const deltaOf = (before, after) => ({
  gauntlet: after.gauntlet.score - before.gauntlet.score,
  fit: Math.round((after.fit.score - before.fit.score) * 100),
  objective: after.objective - before.objective,
});

/** Membro novo para um slot: set provável do tier e os motivos no formato do card. */
function newMember(pokemon, reasons, members, slotIndex, ctx) {
  const team = teamOf(members.map((member, index) => (index === slotIndex ? { pokemon } : member)));
  return {
    pokemon,
    set: ctx.setOf(pokemon),
    locked: false,
    fromSeed: false,
    explain: ctx.explain({ pokemon, reasons }, team),
  };
}

/** Avalia o time com `pokemon` no lugar do slot; o resultado é uma SwapOption. */
function optionFor(members, slotIndex, pokemon, reasons, before, ctx) {
  const member = newMember(pokemon, reasons, members, slotIndex, ctx);
  const nextMembers = members.map((current, index) => (index === slotIndex ? member : current));
  const evaluation = evaluateTeam(nextMembers, ctx);
  const rolesBefore = coveredRoles(teamOf(members), ctx.meta);
  const rolesAfter = coveredRoles(teamOf(nextMembers), ctx.meta);
  return {
    pokemon,
    set: member.set,
    member,
    slotIndex,
    evaluation,
    delta: deltaOf(before, evaluation),
    ...compareThreats(before, evaluation),
    rolesGained: [...rolesAfter].filter((role) => !rolesBefore.has(role)),
    rolesLost: [...rolesBefore].filter((role) => !rolesAfter.has(role)),
  };
}

/** Por que `entry` não pode entrar no slot: 'espécie repetida', 'na lista Não usar', 'fora do tier' ou 'limite de tipo'. */
export function swapError(members, slotIndex, entry, ctx) {
  const rest = teamOf(members.filter((_, index) => index !== slotIndex));
  if (rest.some((pokemon) => speciesOf(pokemon) === speciesOf(entry))) return 'espécie repetida';
  if (ctx.constraints.banned.has(entry.name)) return 'na lista Não usar';
  if (!ctx.tierPool.some((pokemon) => pokemon.name === entry.name)) return 'fora do tier';
  if (!fitsTypeRule(rest, entry, ctx.constraints.maxPerType)) return 'limite de tipo';
  return null;
}

/**
 * As melhores trocas para um slot, avaliadas com o teste do meta e o encaixe: os `pool` primeiros de rankCandidates
 * para o time sem o slot, dentro das regras do plano, ordenados pelo ganho no objetivo. Slot travado → [].
 * `before` (opcional) evita reavaliar o time atual; `include` (nomes de entrada) entra na avaliação mesmo fora
 * dos `pool` primeiros, se respeitar as regras.
 */
export function swapOptions(members, slotIndex, ctx, { limit = 5, pool = 15, before = evaluateTeam(members, ctx), include = [] } = {}) {
  if (members[slotIndex]?.locked) return [];
  const rest = teamOf(members.filter((_, index) => index !== slotIndex));
  const allowed = ctx.tierPool.filter((candidate) => !swapError(members, slotIndex, candidate, ctx)
    && speciesOf(candidate) !== speciesOf(members[slotIndex].pokemon)
    && !excludedByStyle(candidate, ctx.archetype, ctx.meta));

  const ranked = rankCandidates(rest, allowed, { limit: allowed.length, meta: ctx.meta });
  const wanted = new Set(include);
  return ranked
    .filter((candidate, index) => index < pool || wanted.has(candidate.pokemon.name))
    .map((candidate) => optionFor(members, slotIndex, candidate.pokemon, candidate.reasons, before, ctx))
    .sort((a, b) => b.delta.objective - a.delta.objective)
    .slice(0, limit);
}

/** Avalia um Pokémon escolhido à mão para o slot; devolve a SwapOption ou { error }. */
export function evaluateManualSwap(members, slotIndex, entry, ctx) {
  if (members[slotIndex]?.locked) return { error: 'membro travado' };
  const error = swapError(members, slotIndex, entry, ctx);
  if (error) return { error };
  const rest = teamOf(members.filter((_, index) => index !== slotIndex));
  const [ranked] = rankCandidates(rest, [entry], { limit: 1, meta: ctx.meta });
  return optionFor(members, slotIndex, entry, ranked?.reasons, evaluateTeam(members, ctx), ctx);
}

/** A ameaça mais importante a corrigir: a de maior uso sem resposta; sem nenhuma, a de maior uso fraca. */
export function worstThreat(evaluation) {
  const byUsage = [...evaluation.gauntlet.threats].sort((a, b) => b.usage - a.usage);
  return byUsage.find((threat) => threat.status === 'none') ?? byUsage.find((threat) => threat.status === 'weak') ?? null;
}

const targetAfter = (option, target) => option.evaluation.gauntlet.threats.find((threat) => threat.name === target.name);
const resolves = (option, target) => STATUS_RANK[targetAfter(option, target)?.status] >= STATUS_RANK.ok;

/**
 * Quem a Smogon lista como check do alvo e está na pool do tier: entram na busca da correção mesmo fora dos
 * primeiros do ranking (o ranking olha a sinergia com o time, não quem segura uma ameaça específica).
 */
export function checksOf(target, ctx) {
  const checkedBy = ctx.meta.stats.get(target.name)?.checkedBy ?? new Map();
  return ctx.tierPool.filter((entry) => checkedBy.has(ctx.meta.names.get(entry.name))).map((entry) => entry.name);
}

/**
 * Trocas de um slot que não baixam o teste do meta, marcadas com o que fazem pelo alvo (uma etapa de fixWorstThreat):
 * `resolves` quando ele sobe para ok ou sólido; `targetGain` é quanto o valor dele subiu.
 */
export function fixesForSlot(members, slotIndex, target, ctx, { before, pool = 25, include = checksOf(target, ctx) } = {}) {
  return swapOptions(members, slotIndex, ctx, { limit: Infinity, pool, before, include })
    .filter((option) => option.delta.gauntlet >= 0)
    .map((option) => ({ ...option, resolves: resolves(option, target), targetGain: targetAfter(option, target).value - target.value }));
}

const threatLabel = (target) => formatSlug(target.name.toLowerCase());

const STATUS_LABELS = { none: 'sem resposta', weak: 'fraca', ok: 'ok', solid: 'sólida' };

/**
 * Escolhe a melhor correção (a que resolve o alvo com o maior ganho no objetivo) ou explica por que não há.
 * Sem correção, `closest` é a troca que mais melhora o alvo sem baixar o teste do meta, para o usuário ver até onde dá.
 */
export function pickFix(target, candidates, members) {
  const [best] = candidates.filter((option) => option.resolves).sort((a, b) => b.delta.objective - a.delta.objective);
  if (best) return { target, option: best, slotIndex: best.slotIndex };

  const name = threatLabel(target);
  if (members.every((member) => member.locked)) {
    return { target, reason: `Todos os membros estão travados: destrave um para corrigir o ${name}.` };
  }
  const [closest] = candidates.filter((option) => option.targetGain > 0)
    .sort((a, b) => b.targetGain - a.targetGain || b.delta.objective - a.delta.objective);
  const base = `Nenhuma troca nos slots livres responde ao ${name} sem piorar o time. Destrave um membro ou mude o estilo.`;
  if (!closest) return { target, reason: base };
  const after = targetAfter(closest, target);
  const answer = after.answers.find((item) => item.member === formatSlug(closest.pokemon.name));
  const why = answer?.failsOn ? ` (${answer.kind === 'check' ? 'o check' : 'a resposta'} perde para a versão ${answer.failsOn})` : '';
  return {
    target,
    reason: `${base} O mais perto: ${formatSlug(members[closest.slotIndex].pokemon.name)} → ${formatSlug(closest.pokemon.name)} ${
      after.status === target.status
        ? `melhora a resposta ao ${name}, que continua ${STATUS_LABELS[after.status]}`
        : `leva o ${name} de ${STATUS_LABELS[target.status]} para ${STATUS_LABELS[after.status]}`
    }${why}.`,
    closest,
    slotIndex: closest.slotIndex,
  };
}

/**
 * Procura a troca que resolve a ameaça de maior uso sem resposta (ou fraca), sem baixar a nota do teste do meta.
 * Em cada slot livre avalia os `pool` primeiros do ranking e os checks do alvo listados pela Smogon.
 * Devolve { target, option, slotIndex } ou { target, reason }. Membros travados nunca saem.
 */
export function fixWorstThreat(members, ctx, { pool = 25 } = {}) {
  const before = evaluateTeam(members, ctx);
  const target = worstThreat(before);
  if (!target) return { target: null, reason: 'Nenhuma ameaça grave para corrigir' };
  const include = checksOf(target, ctx);
  const candidates = members.flatMap((member, slotIndex) =>
    (member.locked ? [] : fixesForSlot(members, slotIndex, target, ctx, { before, pool, include })));
  return pickFix(target, candidates, members);
}

const compositionKey = (team) => team.map(speciesOf).sort().join('|');

/**
 * Nova composição para o card mantendo os travados no lugar: 1 variação diferente da atual que divide no máximo
 * 2 Pokémon com cada um dos outros cards (fora dos fixos deste card e do setter de clima). null se não houver.
 */
export function regenerateCard(members, otherCards, ctx) {
  const locked = members.filter((member) => member.locked);
  // Sem nenhum fixo a busca recomeça do zero (pelos mais usados do tier).
  if (locked.length >= TEAM_SIZE) return null;

  const seed = locked.map((member) => ({ ...member.pokemon, set: member.set }));
  const current = compositionKey(teamOf(members));
  const fixedSpecies = new Set(locked.map((member) => speciesOf(member.pokemon)));
  const others = otherCards.map((card) =>
    diversitySpecies(card.members.map((member) => member.pokemon), ctx.archetype, ctx.meta).filter((species) => !fixedSpecies.has(species)));

  const variations = sketchTeams(seed, ctx.pool, ctx.meta, {
    archetype: ctx.archetype,
    banned: [...ctx.constraints.banned],
    maxPerType: ctx.constraints.maxPerType,
    minUsage: ctx.constraints.minUsage,
    rate: ctx.rate,
    variants: 12,
  });

  const choice = variations.find((variation) => {
    const team = variation.members.map((member) => member.pokemon);
    if (compositionKey(team) === current) return false;
    const picks = diversitySpecies(variation.members.filter((member) => !member.fromSeed).map((member) => member.pokemon), ctx.archetype, ctx.meta);
    return others.every((other) => picks.filter((species) => other.includes(species)).length <= MAX_SHARED);
  });
  if (!choice) return null;

  // Os travados ficam nos mesmos slots; os novos ocupam os outros, na ordem da busca.
  const added = choice.members.filter((member) => !member.fromSeed);
  const team = choice.members.map((member) => member.pokemon);
  let next = 0;
  return members.map((member) => {
    if (member.locked) return member;
    const { pokemon, reasons } = added[next];
    next += 1;
    return { pokemon, set: ctx.setOf(pokemon), locked: false, fromSeed: false, explain: ctx.explain({ pokemon, reasons }, team) };
  });
}

/**
 * O card com o rascunho novo do builder: os membros do rascunho antigo saem, os do novo entram fixos no começo, e os
 * que o card tinha adicionado ficam (primeiro os fixados pela pessoa), menos os da mesma espécie de alguém do rascunho.
 * Se sobrar vaga, a busca do esboço completa o time. Devolve os 6 membros, ou null se não houver como completar.
 * `seed` são os membros do builder (entradas com `set`).
 */
export function reseedMembers(members, seed, ctx) {
  if (seed.length >= TEAM_SIZE) return null;
  const seedSpecies = new Set(seed.map(speciesOf));
  const seedMembers = seed.map((pokemon) => ({ pokemon, set: ctx.setOf(pokemon), locked: true, fromSeed: true }));
  const kept = members
    .filter((member) => !member.fromSeed && !seedSpecies.has(speciesOf(member.pokemon)))
    .sort((a, b) => Number(b.locked) - Number(a.locked))
    .slice(0, TEAM_SIZE - seed.length);
  const partial = [...seedMembers, ...kept];
  if (partial.length === TEAM_SIZE) return partial;

  const [choice] = sketchTeams(partial.map((member) => ({ ...member.pokemon, set: member.set })), ctx.pool, ctx.meta, {
    archetype: ctx.archetype,
    banned: [...ctx.constraints.banned],
    maxPerType: ctx.constraints.maxPerType,
    minUsage: ctx.constraints.minUsage,
    rate: ctx.rate,
    variants: 1,
  });
  if (!choice) return null;
  const team = choice.members.map((member) => member.pokemon);
  const added = choice.members.filter((member) => !member.fromSeed).map(({ pokemon, reasons }) => (
    { pokemon, set: ctx.setOf(pokemon), locked: false, fromSeed: false, explain: ctx.explain({ pokemon, reasons }, team) }
  ));
  return [...partial, ...added];
}

/* --------------------------------------------------------------- estado do card */

/** Estado editável de um card a partir da variação gerada: os do rascunho começam travados. */
export function createCardState(variation, ctx) {
  const members = variation.members.map((member) => ({
    pokemon: member.pokemon,
    set: member.set,
    locked: member.fromSeed,
    fromSeed: member.fromSeed,
    explain: member.explain,
  }));
  return { members, history: [], evaluation: evaluateTeam(members, ctx), edited: false, lastChange: null };
}

/** Aplica novos membros ao card: guarda o estado anterior no histórico (até 20) e reavalia. */
export function commitMembers(card, members, ctx, { change = true } = {}) {
  const evaluation = evaluateTeam(members, ctx);
  const snapshot = { members: card.members, evaluation: card.evaluation, edited: card.edited };
  return {
    members,
    history: [...card.history, snapshot].slice(-HISTORY_LIMIT),
    evaluation,
    edited: true,
    lastChange: change ? { delta: deltaOf(card.evaluation, evaluation), ...compareThreats(card.evaluation, evaluation), at: Date.now() } : null,
  };
}

/** Fixa ou destrava um membro (também vai para o histórico). */
export function toggleLock(card, slotIndex, ctx) {
  const members = card.members.map((member, index) => (index === slotIndex ? { ...member, locked: !member.locked } : member));
  return { ...commitMembers(card, members, ctx, { change: false }), evaluation: card.evaluation };
}

/**
 * Card com o rascunho novo (ver reseedMembers): as notas são refeitas e o retorno mostra o efeito da troca, mas o
 * histórico recomeça, porque desfazer traria de volta o rascunho antigo. null se o card não puder ser completado.
 */
export function reseedCard(card, seed, ctx) {
  const members = reseedMembers(card.members, seed, ctx);
  if (!members) return null;
  return { ...commitMembers(card, members, ctx), history: [], edited: card.edited };
}

/** Volta ao estado anterior exatamente como era (membros, sets e notas). */
export function undo(card) {
  if (!card.history.length) return card;
  const previous = card.history.at(-1);
  return { ...previous, history: card.history.slice(0, -1), lastChange: null };
}
