// O ateliê do esboço guardado no navegador: o plano (tier, estilo, "Não usar", regra de tipos) e o último resultado
// com os cards editados, para voltar igual depois de trocar de aba ou recarregar. Sem React, para os testes.
// Os cards guardam só os membros (Pokémon, set, fixo, motivos); as notas são recalculadas ao restaurar, e o histórico
// do "Desfazer" não é guardado.
import { evaluateTeam } from './sketchEdit';
import { TEAM_SIZE } from './teamScore';

export const SKETCH_STATE_KEY = 'smearglepedia:sketch-state';
const VERSION = 1;

// A entrada da Pokédex sem o set do builder (que o card guarda à parte).
const entryOf = (pokemon) => {
  const entry = { ...pokemon };
  delete entry.set;
  return entry;
};
const isEntry = (pokemon) => Boolean(pokemon && Number.isFinite(pokemon.id) && typeof pokemon.name === 'string');

const serializePlan = (plan) => ({
  tier: plan.tier,
  archetype: plan.archetype,
  banned: plan.banned.map(entryOf),
  maxTwoPerType: Boolean(plan.maxTwoPerType),
});

/** O que vai para o navegador: { version, plan, result: { plan, teamKey, ms } | null, cards: [{ members, edited }] }. */
export function serializeSketchState({ plan, result, cards }) {
  const done = result?.status === 'done';
  return {
    version: VERSION,
    plan: serializePlan(plan),
    result: done ? { plan: serializePlan(result.plan), teamKey: result.teamKey, ms: result.ms } : null,
    cards: done
      ? cards.map((card) => ({
        edited: Boolean(card.edited),
        members: card.members.map(({ pokemon, set, locked, fromSeed, explain }) => ({
          pokemon: entryOf(pokemon), set, locked: Boolean(locked), fromSeed: Boolean(fromSeed), ...(explain && { explain }),
        })),
      }))
      : [],
  };
}

/** Plano guardado e válido, ou null. `isTier` e `isArchetype` validam os valores (podem mudar entre versões). */
export function parsePlan(raw, { isTier, isArchetype }) {
  if (!raw || !isTier(raw.tier)) return null;
  return {
    tier: raw.tier,
    archetype: isArchetype(raw.archetype) ? raw.archetype : 'free',
    banned: Array.isArray(raw.banned) ? raw.banned.filter(isEntry) : [],
    maxTwoPerType: Boolean(raw.maxTwoPerType),
  };
}

/** Estado guardado ({ plan, result, cards } já validados) ou null se não houver ou estiver corrompido. */
export function readSketchState(storage, validators) {
  try {
    const raw = JSON.parse(storage?.getItem(SKETCH_STATE_KEY) ?? 'null');
    if (raw?.version !== VERSION) return null;
    const plan = parsePlan(raw.plan, validators);
    if (!plan) return null;
    const resultPlan = raw.result && parsePlan(raw.result.plan, validators);
    const cards = Array.isArray(raw.cards)
      ? raw.cards.filter((card) => Array.isArray(card?.members) && card.members.length === TEAM_SIZE
        && card.members.every((member) => isEntry(member?.pokemon)))
      : [];
    const result = resultPlan && cards.length
      ? { plan: resultPlan, teamKey: String(raw.result.teamKey ?? ''), ms: Number(raw.result.ms) || 0 }
      : null;
    return { plan, result, cards: result ? cards : [] };
  } catch {
    return null;
  }
}

export function writeSketchState(storage, state) {
  try {
    storage?.setItem(SKETCH_STATE_KEY, JSON.stringify(serializeSketchState(state)));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio, cota): o esboço vale só enquanto a aba estiver aberta.
  }
}

/** Cards guardados de volta ao formato do painel, com as notas recalculadas no `ctx` do plano do resultado. */
export function restoreCards(storedCards, ctx) {
  return storedCards.map((stored) => {
    const members = stored.members.map((member) => ({
      pokemon: member.pokemon,
      set: member.set ?? null,
      locked: member.locked,
      fromSeed: member.fromSeed,
      explain: member.explain,
    }));
    return { members, history: [], evaluation: evaluateTeam(members, ctx), edited: stored.edited, lastChange: null };
  });
}
