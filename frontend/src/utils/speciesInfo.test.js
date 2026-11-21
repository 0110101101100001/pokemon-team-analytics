import { describe, expect, it } from 'vitest';
import { captureDifficulty, formGenerationLabel, generationLabel, speciesFacts } from './speciesInfo';

const named = (name) => ({ name });

describe('dados da espécie', () => {
  it('traduz curva de XP, habitat, forma e cor', () => {
    const facts = speciesFacts({
      capture_rate: 45,
      base_happiness: 50,
      growth_rate: named('medium-slow'),
      is_baby: false,
      is_legendary: false,
      is_mythical: false,
      generation: named('generation-i'),
      habitat: named('grassland'),
      shape: named('quadruped'),
      color: named('green'),
    });
    expect(facts).toMatchObject({
      captureRate: 45,
      baseHappiness: 50,
      growthRate: { label: 'Média-lenta', xp: 1059860 },
      badges: [],
      generation: '1ª geração · Kanto',
      habitat: 'Campos',
      shape: 'Quadrúpede',
      color: { label: 'Verde' },
    });
  });

  it('marca bebê, lendário e mítico e aceita habitat ausente', () => {
    const facts = speciesFacts({
      capture_rate: 3, base_happiness: 0, is_legendary: true, is_mythical: true, habitat: null, generation: named('generation-ix'),
    });
    expect(facts.badges).toEqual(['Lendário', 'Mítico']);
    expect(facts.habitat).toBeNull();
    expect(facts.baseHappiness).toBe(0);
    expect(facts.generation).toBe('9ª geração · Paldea');
  });

  it('mostra pelo nome o que ainda não tem tradução', () => {
    expect(generationLabel('generation-x')).toBe('generation-x');
    expect(speciesFacts({ growth_rate: named('very-new') }).growthRate).toEqual({ label: 'very new', xp: null });
  });

  it('classifica a dificuldade de captura', () => {
    expect([3, 45, 120, 255].map(captureDifficulty)).toEqual(['Muito difícil', 'Difícil', 'Média', 'Fácil']);
  });

  it('usa a estreia da forma, não a da espécie', () => {
    expect(formGenerationLabel('vulpix-alola', 7, 'generation-i')).toBe('7ª geração · Alola');
    expect(formGenerationLabel('charizard-mega-x', undefined, 'generation-i')).toBe('6ª geração · X / Y e ORAS');
    expect(formGenerationLabel('kyogre-primal', undefined, 'generation-iii')).toBe('6ª geração · X / Y e ORAS');
    expect(formGenerationLabel('raichu-mega-x', undefined, 'generation-i')).toBe('9ª geração · Legends: Z-A');
    expect(formGenerationLabel('charizard-gmax', undefined, 'generation-i')).toBe('8ª geração · Galar');
    expect(formGenerationLabel('pikachu', 1, 'generation-i')).toBe('1ª geração · Kanto');
    expect(formGenerationLabel('unknown-form', undefined, 'generation-ii')).toBe('2ª geração · Johto');
  });
});
