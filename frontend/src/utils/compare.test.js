import { describe, expect, it } from 'vitest';
import { COMPARE_LIMIT, statLeaders, statTotal, toggleCompared, topUsage } from './compare';

const stats = (hp, atk, def, spa, spd, spe) => ({ hp, atk, def, spa, spd, spe });

describe('lista de comparação', () => {
  it('acrescenta no fim e tira quem já está', () => {
    expect(toggleCompared(['pikachu'], 'eevee')).toEqual(['pikachu', 'eevee']);
    expect(toggleCompared(['pikachu', 'eevee'], 'pikachu')).toEqual(['eevee']);
  });

  it('não passa do limite, mas ainda deixa tirar', () => {
    const full = ['a', 'b', 'c', 'd'];
    expect(full).toHaveLength(COMPARE_LIMIT);
    expect(toggleCompared(full, 'e')).toBe(full);
    expect(toggleCompared(full, 'b')).toEqual(['a', 'c', 'd']);
  });
});

describe('atributos comparados', () => {
  const garchomp = stats(108, 130, 95, 80, 85, 102);
  const dragapult = stats(88, 120, 75, 100, 75, 142);

  it('soma o total', () => {
    expect(statTotal(garchomp)).toBe(600);
  });

  it('marca o maior valor de cada atributo, ignorando quem ainda carrega', () => {
    expect(statLeaders([garchomp, null, dragapult])).toEqual({
      hp: 108, atk: 130, def: 95, spa: 100, spd: 85, spe: 142, total: 600,
    });
  });

  it('não destaca nada com um só Pokémon carregado', () => {
    expect(statLeaders([garchomp, null])).toEqual({});
  });
});

describe('uso na Smogon', () => {
  it('pega o mais usado, sem "Other" nem "Nothing"', () => {
    expect(topUsage({ Other: 40, Nothing: 30, Leftovers: 20, 'Choice Scarf': 10 })).toEqual(['Leftovers', 20]);
    expect(topUsage({})).toBeNull();
    expect(topUsage(undefined)).toBeNull();
  });
});
