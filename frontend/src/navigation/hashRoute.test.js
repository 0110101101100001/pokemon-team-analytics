import { describe, expect, it } from 'vitest';
import { formatHash, parseHash } from './hashRoute';
import { trainerBattleFromHash, trainerHref } from './sections';

describe('parseHash', () => {
  it('separa segmentos e parâmetros', () => {
    const { segments, params } = parseHash('#/treinadores/giovanni?pokemon=gyarados');
    expect(segments).toEqual(['treinadores', 'giovanni']);
    expect(params.get('pokemon')).toBe('gyarados');
  });

  it('aceita hash vazio e segmento mal codificado', () => {
    expect(parseHash('').segments).toEqual([]);
    expect(parseHash('#/itens/%E0').segments).toEqual(['itens', '%E0']);
  });
});

describe('formatHash', () => {
  it('codifica os segmentos e omite parâmetros vazios', () => {
    expect(formatHash(['calculadora', 'treinador', 'gen1/a b'])).toBe('#/calculadora/treinador/gen1%2Fa%20b');
    expect(formatHash(['pokedex'], new URLSearchParams({ pokemon: 'mr-mime' }))).toBe('#/pokedex?pokemon=mr-mime');
  });

  it('volta ao mesmo endereço depois de lido', () => {
    const hash = '#/treinadores/tate-liza?pokemon=solrock';
    const { segments, params } = parseHash(hash);
    expect(formatHash(segments, params)).toBe(hash);
  });
});

describe('links da Liga', () => {
  it('monta o link do treinador', () => {
    expect(trainerHref('giovanni')).toBe('#/treinadores/giovanni');
  });

  it('lê a batalha da calculadora mesmo com a ficha aberta por cima', () => {
    expect(trainerBattleFromHash('#/calculadora/treinador/gen1-kanto-gym-brock?pokemon=onix')).toBe('gen1-kanto-gym-brock');
    expect(trainerBattleFromHash('#/pokedex')).toBeNull();
  });
});
