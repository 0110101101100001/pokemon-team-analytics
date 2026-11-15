import { describe, expect, it } from 'vitest';
import { createBattleSet, normalizeBattleSet } from './stats';

describe('normalizeBattleSet', () => {
  it('aceita um set salvo antes de habilidade e Tera existirem', () => {
    const old = {
      level: 100,
      nature: 'jolly',
      item: 'choice-scarf',
      evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: [{ slug: 'earthquake', type: 'ground' }, null, null, null],
    };
    const set = normalizeBattleSet(old);
    expect(set).toMatchObject({ nature: 'jolly', item: 'choice-scarf', ability: '', teraType: null });
    expect(set.moves[0].slug).toBe('earthquake');
  });

  it('mantém habilidade e Tera válidos', () => {
    expect(normalizeBattleSet({ ability: 'protosynthesis', teraType: 'stellar' })).toMatchObject({
      ability: 'protosynthesis',
      teraType: 'stellar',
    });
  });

  it('troca valores inválidos por vazio', () => {
    expect(normalizeBattleSet({ ability: 'Proto Synthesis!', teraType: 'shadow' })).toMatchObject({ ability: '', teraType: null });
    expect(normalizeBattleSet({ ability: 42, teraType: 7 })).toMatchObject({ ability: '', teraType: null });
  });

  it('sem set, devolve o padrão', () => {
    expect(normalizeBattleSet(null)).toEqual(createBattleSet());
  });
});
