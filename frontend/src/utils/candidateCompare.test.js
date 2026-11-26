import { beforeAll, describe, expect, it } from 'vitest';
import allSets from '../data/gen9.json';
import { MAX_CANDIDATES, bestOptionIndex, candidateError, compareCandidates } from './candidateCompare';
import { buildMeta } from './metaScore';
import { evaluateTeam } from './sketchEdit';
import { POOL, ROWS, battleData, byName } from './sketchFixtures';
import { sketchContext } from './sketchPlan';

const META = buildMeta(ROWS, POOL);
const member = (name) => ({ ...byName(name), set: { moves: [] } });
const TEAM = ['great-tusk', 'kingambit', 'gholdengo', 'dragapult', 'rillaboom'].map(member);

let ctx;
beforeAll(() => {
  ctx = sketchContext({ pool: POOL, meta: META, battleData, allSets, tier: 'gen9ou', archetypeKey: 'free' });
});

describe('compareCandidates', () => {
  it('cada candidato entra na vaga nova e é avaliado com o time inteiro', () => {
    const candidates = ['corviknight', 'toxapex', 'volcarona'].map(byName);
    const { baseline, options } = compareCandidates(TEAM, candidates, ctx);
    expect(baseline).toEqual(evaluateTeam(TEAM.map((pokemon) => ({ pokemon, set: ctx.setOf(pokemon) })), ctx));
    expect(options.map((option) => option.pokemon.name)).toEqual(['corviknight', 'toxapex', 'volcarona']);
    for (const option of options) {
      expect(option.error).toBeNull();
      const members = [...TEAM, option.pokemon].map((pokemon) => ({ pokemon, set: ctx.setOf(pokemon) }));
      expect(option.evaluation).toEqual(evaluateTeam(members, ctx));
      expect(option.delta.gauntlet).toBe(option.evaluation.gauntlet.score - baseline.gauntlet.score);
      expect(option.unanswered.every((threat) => threat.status === 'none')).toBe(true);
      expect(option.fixed.every((threat) => threat.id != null)).toBe(true);
    }
  });

  it('com replaceIndex, o candidato entra no lugar daquele membro', () => {
    const full = [...TEAM, member('corviknight')];
    const { baseline, options } = compareCandidates(full, [byName('toxapex')], ctx, { replaceIndex: 5 });
    const staying = TEAM.map((pokemon) => ({ pokemon, set: ctx.setOf(pokemon) }));
    expect(baseline).toEqual(evaluateTeam(staying, ctx));
    expect(options[0].evaluation).toEqual(evaluateTeam([...staying, { pokemon: byName('toxapex'), set: ctx.setOf(byName('toxapex')) }], ctx));
  });

  it('espécie repetida e time cheio viram erro, sem notas', () => {
    expect(candidateError(TEAM, byName('kingambit'))).toBe('espécie repetida');
    expect(candidateError([...TEAM, member('toxapex')], byName('corviknight'))).toBe('time cheio');
    expect(candidateError([...TEAM, member('toxapex')], byName('corviknight'), 5)).toBeNull();
    // Quem sai pode voltar como candidato de outra espécie, e a espécie de quem sai fica livre.
    expect(candidateError(TEAM, byName('great-tusk'), 0)).toBeNull();
    const { options } = compareCandidates(TEAM, [byName('kingambit')], ctx);
    expect(options[0]).toEqual({ pokemon: byName('kingambit'), error: 'espécie repetida' });
  });

  it(`no máximo ${MAX_CANDIDATES} candidatos; fora do tier é marcado`, () => {
    const { options } = compareCandidates(TEAM, ['corviknight', 'toxapex', 'volcarona', 'hatterene'].map(byName), ctx);
    expect(options).toHaveLength(MAX_CANDIDATES);
    const outside = compareCandidates(TEAM, [byName('mewtwo')], ctx).options[0];
    expect(outside.outOfTier).toBe(true);
  });

  it('bestOptionIndex escolhe o maior objetivo e ignora os com erro', () => {
    const option = (objective) => ({ error: null, evaluation: { objective } });
    expect(bestOptionIndex([option(10), option(30), option(20)])).toBe(1);
    expect(bestOptionIndex([{ error: 'espécie repetida' }, option(5)])).toBe(1);
    expect(bestOptionIndex([{ error: 'espécie repetida' }])).toBe(-1);
  });
});
