import { beforeAll, describe, expect, it, vi } from 'vitest';
import allSets from '../data/gen9.json';
import { classifyMatchup } from './gauntlet';
import { buildMeta } from './metaScore';
import { diversitySpecies } from './sketch';
import {
  STATUS_RANK, commitMembers, createCardState, evaluateManualSwap, evaluateTeam, fixWorstThreat, pickFix,
  regenerateCard, reseedCard, reseedMembers, swapError, swapOptions, toggleLock, undo, worstThreat,
} from './sketchEdit';
import { POOL, ROWS, battleData, byName } from './sketchFixtures';
import { planSketch, sketchContext } from './sketchPlan';
import { speciesOf } from './teamScore';

const META = buildMeta(ROWS, POOL);
const plan = (extra = {}) => ({ pool: POOL, meta: META, battleData, allSets, tier: 'gen9ou', archetypeKey: 'free', ...extra });
const SEED = [{ ...byName('great-tusk'), set: { moves: [] } }];

let ctx;
let cards;
beforeAll(() => {
  ctx = sketchContext(plan());
  cards = planSketch({ seed: SEED, ...plan() }).map((variation) => createCardState(variation, ctx));
});

const unlocked = (card) => ({ ...card, members: card.members.map((member) => ({ ...member, locked: false })) });
const names = (members) => members.map((member) => member.pokemon.name);

describe('swapOptions', () => {
  it('slot travado devolve []', () => {
    expect(cards[0].members[0].locked).toBe(true);
    expect(swapOptions(cards[0].members, 0, ctx)).toEqual([]);
  });

  it('nenhuma opção viola tier, "Não usar", espécie repetida ou limite de tipo', () => {
    const strict = sketchContext(plan({ banned: ['kingambit', 'corviknight'], maxPerType: 2 }));
    const card = createCardState(planSketch({ seed: SEED, ...plan({ banned: ['kingambit', 'corviknight'], maxPerType: 2 }) })[0], strict);
    for (let slot = 1; slot < 6; slot += 1) {
      for (const option of swapOptions(card.members, slot, strict, { limit: Infinity, pool: 30 })) {
        expect(swapError(card.members, slot, option.pokemon, strict)).toBeNull();
        expect(['kingambit', 'corviknight', 'mewtwo', 'pikachu']).not.toContain(option.pokemon.name);
        const team = card.members.map((member, index) => (index === slot ? option.pokemon : member.pokemon));
        expect(new Set(team.map(speciesOf)).size).toBe(6);
      }
    }
  });

  it('delta é a diferença das avaliações e fixed/worsened batem com os status', () => {
    const { members } = cards[0];
    const before = evaluateTeam(members, ctx);
    const options = swapOptions(members, 5, ctx);
    expect(options.length).toBeGreaterThan(0);
    expect(options.map((o) => o.delta.objective)).toEqual([...options.map((o) => o.delta.objective)].sort((a, b) => b - a));
    for (const option of options) {
      const after = evaluateTeam(members.map((member, index) => (index === 5 ? option.member : member)), ctx);
      expect(option.delta.gauntlet).toBe(after.gauntlet.score - before.gauntlet.score);
      expect(option.delta.fit).toBe(Math.round((after.fit.score - before.fit.score) * 100));
      expect(option.delta.objective).toBeCloseTo(after.objective - before.objective, 9);
      const was = new Map(before.gauntlet.threats.map((t) => [t.name, t.status]));
      const up = after.gauntlet.threats.filter((t) => STATUS_RANK[t.status] > STATUS_RANK[was.get(t.name)]).map((t) => t.name);
      const down = after.gauntlet.threats.filter((t) => STATUS_RANK[t.status] < STATUS_RANK[was.get(t.name)]).map((t) => t.name);
      expect(option.fixed.map((t) => t.name).sort()).toEqual(up.sort());
      expect(option.worsened.map((t) => t.name).sort()).toEqual(down.sort());
    }
  });
});

describe('evaluateManualSwap', () => {
  it('aponta cada restrição no caso certo', () => {
    const strict = sketchContext(plan({ banned: ['toxapex'], maxPerType: 2 }));
    // Time montado à mão: dois Steel (Kingambit e Gholdengo) e nenhum outro.
    const fixedTeam = ['great-tusk', 'kingambit', 'gholdengo', 'rillaboom', 'pelipper', 'dragapult'];
    const members = fixedTeam.map((name) => ({ pokemon: byName(name), set: ctx.setOf(byName(name)), locked: false, fromSeed: false }));
    expect(evaluateManualSwap(members, 3, byName('kingambit'), strict)).toEqual({ error: 'espécie repetida' });
    expect(evaluateManualSwap(members, 3, byName('toxapex'), strict)).toEqual({ error: 'na lista Não usar' });
    expect(evaluateManualSwap(members, 3, byName('mewtwo'), strict)).toEqual({ error: 'fora do tier' });
    expect(evaluateManualSwap(members, 3, byName('pikachu'), strict)).toEqual({ error: 'fora do tier' });
    // Excadrill seria o terceiro Steel: passa do limite de 2.
    expect(evaluateManualSwap(members, 3, byName('excadrill'), strict)).toEqual({ error: 'limite de tipo' });
    // Sem a regra de tipos, o mesmo Excadrill entra.
    expect(evaluateManualSwap(members, 3, byName('excadrill'), ctx).pokemon.name).toBe('excadrill');
    expect(evaluateManualSwap(cards[0].members, 0, byName('rillaboom'), ctx)).toEqual({ error: 'membro travado' });
  });

  it('um Pokémon válido vem avaliado como uma opção de troca', () => {
    const { members } = cards[0];
    const entry = POOL.find((pokemon) => !swapError(members, 5, pokemon, ctx));
    const option = evaluateManualSwap(members, 5, entry, ctx);
    expect(option.pokemon.name).toBe(entry.name);
    expect(option.delta.gauntlet).toBe(option.evaluation.gauntlet.score - evaluateTeam(members, ctx).gauntlet.score);
  });
});

describe('fixWorstThreat', () => {
  const evaluation = (statuses) => ({
    gauntlet: { threats: statuses.map(([name, usage, status]) => ({ name, usage, status, value: 0 })) },
  });

  it('o alvo é a ameaça sem resposta de maior uso; sem nenhuma, a fraca de maior uso', () => {
    expect(worstThreat(evaluation([['A', 30, 'weak'], ['B', 20, 'none'], ['C', 25, 'none']])).name).toBe('C');
    expect(worstThreat(evaluation([['A', 30, 'ok'], ['B', 20, 'weak'], ['C', 25, 'weak']])).name).toBe('C');
    expect(worstThreat(evaluation([['A', 30, 'ok'], ['B', 20, 'solid']]))).toBeNull();
  });

  it('nunca troca um travado nem devolve opção que baixa o teste do meta', () => {
    for (const card of cards) {
      const members = card.members.map((member, index) => ({ ...member, locked: index < 2 }));
      const result = fixWorstThreat(members, ctx);
      if (result.option) {
        expect(members[result.slotIndex].locked).toBe(false);
        expect(result.option.delta.gauntlet).toBeGreaterThanOrEqual(0);
      } else {
        expect(typeof result.reason).toBe('string');
      }
    }
  });

  it('pickFix escolhe a que resolve com maior objetivo e explica quando não há', () => {
    const target = { name: 'Kingambit', usage: 20, status: 'none', value: 0 };
    const option = (slotIndex, resolves, objective, gauntlet = 1) => ({ slotIndex, resolves, targetGain: resolves ? 0.6 : 0, delta: { objective, gauntlet } });
    expect(pickFix(target, [option(2, true, 3), option(3, true, 7), option(4, false, 20)], []).slotIndex).toBe(3);
    const free = [{ locked: false }];
    expect(pickFix(target, [option(4, false, 20)], free).reason).toMatch(/Nenhuma troca nos slots livres responde ao Kingambit/);
    expect(pickFix(target, [], [{ locked: true }]).reason).toMatch(/Todos os membros estão travados/);
  });

  it('com todos travados devolve o motivo', () => {
    const members = cards[0].members.map((member) => ({ ...member, locked: true }));
    const result = fixWorstThreat(members, ctx);
    expect(result.option).toBeUndefined();
    expect(result.reason).toBeTruthy();
  });
});

describe('regenerateCard', () => {
  it('mantém os travados, muda a composição e respeita a diversidade com os outros cards', () => {
    const members = cards[0].members.map((member, index) => ({ ...member, locked: index < 2 }));
    const next = regenerateCard(members, cards.slice(1), ctx);
    expect(next).not.toBeNull();
    expect(next).toHaveLength(6);
    expect(next.slice(0, 2)).toEqual(members.slice(0, 2));
    expect([...names(next)].sort()).not.toEqual([...names(members)].sort());
    const fixed = new Set(members.slice(0, 2).map((member) => speciesOf(member.pokemon)));
    const picks = diversitySpecies(next.filter((member) => !member.locked).map((member) => member.pokemon), ctx.archetype, ctx.meta);
    for (const other of cards.slice(1)) {
      const theirs = diversitySpecies(other.members.map((member) => member.pokemon), ctx.archetype, ctx.meta).filter((s) => !fixed.has(s));
      expect(picks.filter((species) => theirs.includes(species)).length).toBeLessThanOrEqual(2);
    }
  });

  it('devolve null quando é impossível', () => {
    expect(regenerateCard(cards[0].members.map((member) => ({ ...member, locked: true })), [], ctx)).toBeNull();
    const everyone = sketchContext(plan({ banned: POOL.map((p) => p.name).filter((n) => n !== 'great-tusk') }));
    expect(regenerateCard(cards[0].members, [], everyone)).toBeNull();
  });
});

describe('regenerateCard sem fixos', () => {
  it('recomeça do zero e devolve 6 membros diferentes da composição atual', () => {
    const { members } = unlocked(cards[0]);
    const next = regenerateCard(members, [], ctx);
    expect(next).toHaveLength(6);
    expect(new Set(next.map((member) => speciesOf(member.pokemon))).size).toBe(6);
    expect([...names(next)].sort()).not.toEqual([...names(members)].sort());
  });
});

describe('reseedMembers', () => {
  const builder = (name) => ({ ...byName(name), set: { moves: [] } });

  it('troca o rascunho antigo pelo novo e mantém os adicionados, fixados primeiro', () => {
    const card = cards[0];
    const members = card.members.map((member, index) => ({ ...member, locked: index === 0 || index === 4 }));
    const outside = ctx.tierPool.find((entry) => !members.some((member) => speciesOf(member.pokemon) === speciesOf(entry)));
    const seed = [{ ...outside, set: { moves: [] } }];
    const next = reseedMembers(members, seed, ctx);
    expect(next).toHaveLength(6);
    expect(next.slice(0, seed.length).map((member) => member.pokemon.name)).toEqual(seed.map((pokemon) => pokemon.name));
    expect(next.slice(0, seed.length).every((member) => member.fromSeed && member.locked)).toBe(true);
    expect(names(next)).not.toContain('great-tusk');
    // O adicionado que estava fixado vem logo depois do rascunho.
    expect(next[seed.length].pokemon.name).toBe(members[4].pokemon.name);
    expect(new Set(next.map((member) => speciesOf(member.pokemon))).size).toBe(6);
  });

  it('um adicionado da mesma espécie de alguém do rascunho novo sai, e a busca completa a vaga', () => {
    const card = cards[0];
    const taken = card.members.find((member) => !member.fromSeed).pokemon;
    const next = reseedMembers(card.members, [builder('great-tusk'), { ...taken, set: { moves: [] } }], ctx);
    expect(next).toHaveLength(6);
    expect(next.filter((member) => member.pokemon.name === taken.name)).toHaveLength(1);
    expect(next.slice(0, 2).every((member) => member.fromSeed)).toBe(true);
    expect(new Set(next.map((member) => speciesOf(member.pokemon))).size).toBe(6);
  });

  it('com o rascunho vazio, os adicionados ficam e a busca completa o time', () => {
    const next = reseedMembers(cards[0].members, [], ctx);
    expect(next).toHaveLength(6);
    expect(next.every((member) => !member.fromSeed)).toBe(true);
  });

  it('reseedCard reavalia, mostra o efeito e zera o histórico', () => {
    const card = cards[0];
    const next = reseedCard(card, [builder('kingambit')].filter((p) => !names(card.members).includes(p.name)), ctx);
    expect(next.history).toEqual([]);
    expect(next.edited).toBe(card.edited);
    expect(next.lastChange).not.toBeNull();
    expect(next.evaluation).toEqual(evaluateTeam(next.members, ctx));
  });
});

describe('estado do card', () => {
  it('desfazer volta exatamente ao estado anterior', () => {
    const card = cards[0];
    const [option] = swapOptions(card.members, 5, ctx);
    const swapped = commitMembers(card, card.members.map((member, index) => (index === 5 ? option.member : member)), ctx);
    expect(swapped.edited).toBe(true);
    expect(swapped.lastChange.delta).toEqual(option.delta);
    const back = undo(swapped);
    expect(back.members).toBe(card.members);
    expect(back.evaluation).toBe(card.evaluation);
    expect(back.edited).toBe(false);
    expect(back.history).toEqual([]);
  });

  it('fixar entra no histórico sem mudar as notas', () => {
    const locked = toggleLock(cards[0], 3, ctx);
    expect(locked.members[3].locked).toBe(true);
    expect(locked.evaluation).toBe(cards[0].evaluation);
    expect(undo(locked).members[3].locked).toBe(false);
  });
});

describe('cache do teste do meta', () => {
  it('em uma troca, só os duelos do membro novo são calculados', () => {
    const { members } = cards[1];
    evaluateTeam(members, ctx);
    const spy = vi.fn(classifyMatchup);
    ctx.gauntlet.classify = spy;
    try {
      const candidate = POOL.find((entry) => !swapError(members, 4, entry, ctx));
      // Nível 99: um set que o cache ainda não viu, então todos os duelos dele são novos.
      const fresh = { ...members[4], pokemon: candidate, set: { ...ctx.setOf(candidate), level: 99 } };
      evaluateTeam(members.map((member, index) => (index === 4 ? fresh : member)), ctx);
      const duelsOfNewMember = ctx.gauntlet.threats.reduce((total, threat) => total + threat.versions.length, 0);
      expect(spy).toHaveBeenCalledTimes(duelsOfNewMember);
    } finally {
      delete ctx.gauntlet.classify;
    }
  });
});
