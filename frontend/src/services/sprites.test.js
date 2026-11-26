import { afterEach, describe, expect, it, vi } from 'vitest';
import { SPRITES_BASE, heroSpriteSources, isPixelSprite, preloadHeroSprite } from './sprites';
import { SPRITE_STYLES } from '../preferences/preferences';

const RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const CDN = `${SPRITES_BASE}/pokemon`;

// Recorte de /pokemon/25 da PokéAPI.
const pikachu = {
  id: 25,
  sprites: {
    front_default: `${RAW}/25.png`,
    front_shiny: `${RAW}/shiny/25.png`,
    versions: {
      'generation-v': {
        'black-white': { animated: { front_default: `${RAW}/versions/generation-v/black-white/animated/25.gif`, front_shiny: `${RAW}/versions/generation-v/black-white/animated/shiny/25.gif` } },
      },
    },
    other: {
      showdown: { front_default: `${RAW}/other/showdown/25.gif`, front_shiny: `${RAW}/other/showdown/shiny/25.gif` },
      'official-artwork': { front_default: `${RAW}/other/official-artwork/25.png`, front_shiny: `${RAW}/other/official-artwork/shiny/25.png` },
    },
  },
};

describe('heroSpriteSources', () => {
  it('cada estilo começa pelo próprio sprite, já pela CDN', () => {
    expect(heroSpriteSources(pikachu, { style: '2d' })[0]).toBe(`${CDN}/25.png`);
    expect(heroSpriteSources(pikachu, { style: '2d-animated' })[0]).toBe(`${CDN}/versions/generation-v/black-white/animated/25.gif`);
    expect(heroSpriteSources(pikachu, { style: '3d-animated' })[0]).toBe(`${CDN}/other/showdown/25.gif`);
    expect(heroSpriteSources(pikachu, { style: 'static' })[0]).toBe(`${CDN}/other/official-artwork/25.png`);
  });

  it('shiny troca todas as opções pela versão shiny', () => {
    const sources = heroSpriteSources(pikachu, { style: '2d-animated', shiny: true });
    expect(sources[0]).toBe(`${CDN}/versions/generation-v/black-white/animated/shiny/25.gif`);
    sources.forEach((url) => expect(url).toContain('/shiny/'));
  });

  it('2D animado depois do nº 649 (sem sprite de Black/White) cai no 2D parado', () => {
    const sprigatito = { id: 906, sprites: { front_default: `${RAW}/906.png`, versions: { 'generation-v': { 'black-white': { animated: { front_default: null } } } } } };
    expect(heroSpriteSources(sprigatito, { style: '2d-animated' })[0]).toBe(`${CDN}/906.png`);
  });

  it('sem os campos da PokéAPI, monta as URLs pelo número', () => {
    expect(heroSpriteSources({ id: 1 }, { style: '3d-animated' })).toEqual([
      `${CDN}/other/showdown/1.gif`, `${CDN}/other/official-artwork/1.png`, `${CDN}/1.png`,
    ]);
  });

  it('estilo desconhecido (ou o antigo "animated") usa o 3D animado', () => {
    expect(heroSpriteSources(pikachu, { style: 'animated' })[0]).toBe(`${CDN}/other/showdown/25.gif`);
  });

  it('não repete URL e sempre tem reserva', () => {
    for (const { value } of SPRITE_STYLES) {
      const sources = heroSpriteSources(pikachu, { style: value });
      expect(new Set(sources).size).toBe(sources.length);
      expect(sources.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('isPixelSprite', () => {
  it('só a arte oficial é lisa', () => {
    expect(isPixelSprite(`${CDN}/other/official-artwork/25.png`)).toBe(false);
    expect(isPixelSprite(`${CDN}/25.png`)).toBe(true);
    expect(isPixelSprite(`${CDN}/other/showdown/25.gif`)).toBe(true);
  });
});

it('as quatro opções das Preferências batem com o banco', () => {
  expect(SPRITE_STYLES.map((option) => option.value)).toEqual(['2d', '2d-animated', '3d-animated', 'static']);
});

describe('preloadHeroSprite', () => {
  afterEach(() => vi.unstubAllGlobals());

  function fakeImages() {
    const created = [];
    vi.stubGlobal('Image', class {
      constructor() { created.push(this); }
    });
    return created;
  }

  it('pede a mesma URL que a ficha vai usar quando os dados chegarem, em todos os estilos', () => {
    fakeImages();
    for (const { value: style } of SPRITE_STYLES) {
      for (const shiny of [false, true]) {
        expect(preloadHeroSprite(25, { style, shiny })).toBe(heroSpriteSources(pikachu, { style, shiny })[0]);
      }
    }
  });

  it('baixa uma vez por URL, com prioridade alta', () => {
    const created = fakeImages();
    preloadHeroSprite(150, { style: 'static' });
    preloadHeroSprite(150, { style: 'static' });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ src: `${CDN}/other/official-artwork/150.png`, fetchPriority: 'high' });
  });

  it('a outra cor (para o botão Shiny) pode sair com prioridade baixa', () => {
    const created = fakeImages();
    preloadHeroSprite(151, { style: '2d', shiny: true, priority: 'low' });
    expect(created[0]).toMatchObject({ src: `${CDN}/shiny/151.png`, fetchPriority: 'low' });
  });

  it('sem número (Pokémon fora da grade) não faz nada', () => {
    const created = fakeImages();
    expect(preloadHeroSprite(undefined)).toBeNull();
    expect(created).toHaveLength(0);
  });
});
