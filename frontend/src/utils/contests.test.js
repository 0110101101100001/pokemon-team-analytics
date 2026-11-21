import { describe, expect, it } from 'vitest';
import { CONTEST_MOVES, filterContestMoves } from './contests';
import { CONTEST_EFFECT_TEXT, SUPER_CONTEST_EFFECT_TEXT } from '../data/contestEffects';
import CONTEST_DATA from '../data/contest-moves.json';

const bySlug = (slug) => CONTEST_MOVES.find((move) => move.slug === slug);

describe('Contests', () => {
  it('traz categoria, apelo, jam e o efeito em português', () => {
    expect(bySlug('thunder')).toMatchObject({
      category: 'cool',
      contest: { appeal: 2, jam: 2, text: CONTEST_EFFECT_TEXT[8] },
      superContest: { text: SUPER_CONTEST_EFFECT_TEXT[17] },
    });
  });

  it('lista os golpes que cada um prepara em combo', () => {
    expect(bySlug('rain-dance').combos).toContain('thunder');
  });

  it('tem tradução para todo efeito usado', () => {
    expect(Object.keys(CONTEST_DATA.effects).every((id) => CONTEST_EFFECT_TEXT[id])).toBe(true);
    expect(Object.keys(CONTEST_DATA.superEffects).every((id) => SUPER_CONTEST_EFFECT_TEXT[id])).toBe(true);
  });

  it('filtra por nome, tipo e categoria', () => {
    expect(filterContestMoves(CONTEST_MOVES, { term: 'rain dance', type: '', category: '' }).map((move) => move.slug)).toEqual(['rain-dance']);
    const cute = filterContestMoves(CONTEST_MOVES, { term: '', type: 'fairy', category: 'cute' });
    expect(cute.length).toBeGreaterThan(0);
    expect(cute.every((move) => move.type === 'fairy' && move.category === 'cute')).toBe(true);
  });
});
