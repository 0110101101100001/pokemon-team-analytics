import { describe, expect, it } from 'vitest';
import BERRIES from '../data/berries.json';
import { berryFlavors, evolutionConditionLabel, evolutionsByItem, filterBerries } from './itemData';

describe('itens de evolução', () => {
  it('descreve como o item causa a evolução', () => {
    expect(evolutionConditionLabel({ trigger: 'use-item', held: false })).toBe('Usar o item');
    expect(evolutionConditionLabel({ trigger: 'trade', held: true })).toBe('Trocar segurando o item');
    expect(evolutionConditionLabel({ trigger: 'level-up', held: true, timeOfDay: 'night' })).toBe('Subir de nível segurando o item, à noite');
    expect(evolutionConditionLabel({ trigger: 'use-item', held: false, gender: 'female' })).toBe('Usar o item (só fêmeas)');
  });

  it('acha as evoluções pelo identificador do item, com as formas regionais', async () => {
    const iceStone = await evolutionsByItem('ice-stone');
    expect(iceStone.map((evolution) => [evolution.from, evolution.to])).toContainEqual(['vulpix-alola', 'ninetales-alola']);
    expect(await evolutionsByItem('potion')).toEqual([]);
  });
});

describe('Berries', () => {
  it('lista os sabores do mais forte ao mais fraco', () => {
    expect(berryFlavors({ flavors: { spicy: 10, dry: 0, sweet: 30, bitter: 0, sour: 10 } }).map((flavor) => flavor.label))
      .toEqual(['Doce', 'Picante', 'Azedo']);
  });

  it('filtra por nome, categoria e tipo do Natural Gift', () => {
    expect(filterBerries(BERRIES, { term: 'sitrus', category: '', type: '' }).map((berry) => berry.name)).toEqual(['sitrus-berry']);
    const pinch = filterBerries(BERRIES, { term: '', category: 'in-a-pinch', type: '' });
    expect(pinch.length).toBeGreaterThan(0);
    expect(pinch.every((berry) => berry.category === 'in-a-pinch')).toBe(true);
    expect(filterBerries(BERRIES, { term: '', category: '', type: 'fire' }).every((berry) => berry.naturalGift.type === 'fire')).toBe(true);
  });
});
