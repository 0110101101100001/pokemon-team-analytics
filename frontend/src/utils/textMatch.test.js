import { describe, expect, it } from 'vitest';
import { createTextMatcher, searchKey } from './textMatch';

describe('createTextMatcher', () => {
  it('ignora maiúsculas, acentos, espaços, hífens e apóstrofos', () => {
    expect(searchKey("King's Rock")).toBe('kingsrock');
    for (const query of ["king's rock", 'kings rock', 'kings-rock', 'KINGS ROCK']) {
      expect(createTextMatcher(query)('kings-rock')).toBe(true);
    }
    expect(createTextMatcher('uturn')('u-turn')).toBe(true);
    expect(createTextMatcher('flabebe')('Flabébé')).toBe(true);
  });

  it('busca vazia aceita tudo; vários textos valem se algum contém o termo', () => {
    expect(createTextMatcher('   ')('qualquer')).toBe(true);
    expect(createTextMatcher('')()).toBe(true);
    const matches = createTextMatcher('tm26');
    expect(matches('earthquake', 'tm26')).toBe(true);
    expect(matches('earthquake', null, 'tm25')).toBe(false);
  });
});
