import { describe, expect, it } from 'vitest';
import absorb from '../../public/data/move-learners/absorb.json';
import earthquake from '../../public/data/move-learners/earthquake.json';
import curse from '../../public/data/move-learners/curse.json';
import aerialAce from '../../public/data/move-learners/aerial-ace.json';
import { learnBadges, learnsBy } from './learnMethods';

const texts = (entry) => learnBadges(entry, (slug) => `jogo ${slug}`).map((badge) => badge.text);
const ZUBAT = 41;
const GARCHOMP = 445;
const BULBASAUR = 1;
const WINGULL = 278;

describe('learnBadges com os dados da PokéAPI', () => {
  it('Absorb: Zubat aprende por nível', () => {
    expect(texts(absorb[ZUBAT])).toEqual(['Nv. 1']);
    expect(learnBadges(absorb[ZUBAT])[0].ariaLabel).toBe('aprende por nível 1');
  });

  it('Earthquake: o Garchomp aprende só por máquina, com o número do jogo', () => {
    const [badge] = learnBadges(earthquake[GARCHOMP], (slug) => `jogo ${slug}`);
    expect(badge.kind).toBe('machine');
    expect(badge.text).toMatch(/^TM \d+$/);
    expect(badge.title).toContain('jogo ');
  });

  it('Curse: o Bulbasaur aprende por ovo', () => {
    expect(texts(curse[BULBASAUR])).toContain('Ovo');
  });

  it('Aerial Ace: o Wingull aprende por nível, TM e ovo e mostra as três etiquetas', () => {
    expect(texts(aerialAce[WINGULL]).map((text) => text.split(' ')[0])).toEqual(['Nv.', 'TM', 'Ovo']);
  });
});

describe('learnBadges', () => {
  it('mostra o menor nível e os outros na dica', () => {
    const [badge] = learnBadges({ l: [0, 9, 13] });
    expect(badge.text).toBe('Nv. 9');
    expect(badge.title).toBe('Nv. 9; em outros jogos também Nv. 13 e ao evoluir');
  });

  it('nível 0 sozinho é aprender ao evoluir', () => {
    expect(texts({ l: [0] })).toEqual(['Evolução']);
  });

  it('tutor tem etiqueta própria; métodos raros viram "Especial" só sem outra etiqueta', () => {
    expect(texts({ t: 1, o: ['reminder'] })).toEqual(['Tutor']);
    const [special] = learnBadges({ o: ['form-change'] });
    expect(special.text).toBe('Especial');
    expect(special.ariaLabel).toBe('aprende por troca de forma');
  });

  it('sem dados, nenhuma etiqueta', () => {
    expect(learnBadges(undefined)).toEqual([]);
  });
});

describe('learnsBy', () => {
  it('filtra pelo método', () => {
    const entry = { l: [5], e: 1 };
    expect(learnsBy(entry, 'all')).toBe(true);
    expect(learnsBy(entry, 'level')).toBe(true);
    expect(learnsBy(entry, 'egg')).toBe(true);
    expect(learnsBy(entry, 'machine')).toBe(false);
    expect(learnsBy(undefined, 'level')).toBe(false);
  });
});
