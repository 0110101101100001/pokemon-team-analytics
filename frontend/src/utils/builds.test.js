import { describe, expect, it } from 'vitest';
import {
  buildFromSet, buildToShowdown, defaultBuildName, evSummary, isFutureBuild, parseShowdown, setFromBuild, speciesName,
  validateBuild,
} from './builds';
import { createBattleSet } from './stats';

const SMEARGLE = {
  v: 1,
  species: 'Smeargle',
  level: 50,
  nature: 'Jolly',
  ability: 'Own Tempo',
  item: 'Focus Sash',
  teraType: 'Ghost',
  evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 },
  ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
  moves: ['Spore', 'Fake Out', 'Follow Me', 'Wide Guard'],
};

const SMEARGLE_TEXT = `Smeargle @ Focus Sash
Ability: Own Tempo
Level: 50
Tera Type: Ghost
EVs: 252 HP / 4 Def / 252 Spe
Jolly Nature
IVs: 0 Atk
- Spore
- Fake Out
- Follow Me
- Wide Guard`;

describe('validateBuild', () => {
  it('aceita a build do exemplo', () => {
    expect(validateBuild(SMEARGLE)).toEqual([]);
  });

  it('recusa EV acima de 252, soma acima de 510, IV fora de 0–31 e mais de 4 golpes', () => {
    expect(validateBuild({ ...SMEARGLE, evs: { ...SMEARGLE.evs, atk: 253 } })).toContain('Cada EV vai de 0 a 252.');
    expect(validateBuild({ ...SMEARGLE, evs: { hp: 252, atk: 252, def: 8, spa: 0, spd: 0, spe: 0 } })).toContain('A soma dos EVs passa de 510.');
    expect(validateBuild({ ...SMEARGLE, evs: { hp: 252, atk: 252, def: 6, spa: 0, spd: 0, spe: 0 } })).toEqual([]);
    expect(validateBuild({ ...SMEARGLE, ivs: { ...SMEARGLE.ivs, spe: 32 } })).toContain('Cada IV vai de 0 a 31.');
    expect(validateBuild({ ...SMEARGLE, moves: [...SMEARGLE.moves, 'Protect'] })).toContain('A build tem no máximo 4 golpes.');
  });

  it('build de versão futura é marcada e não passa na validação', () => {
    expect(isFutureBuild({ ...SMEARGLE, v: 2 })).toBe(true);
    expect(isFutureBuild(SMEARGLE)).toBe(false);
    expect(validateBuild({ ...SMEARGLE, v: 2 })).not.toEqual([]);
  });
});

describe('Showdown', () => {
  it('exporta no formato padrão', () => {
    expect(buildToShowdown(SMEARGLE)).toBe(SMEARGLE_TEXT);
  });

  it('importa o próprio texto exportado sem perder nada', () => {
    const [{ build, errors }] = parseShowdown(SMEARGLE_TEXT);
    expect(errors).toEqual([]);
    expect(build).toEqual(SMEARGLE);
  });

  it('entende apelido, gênero, alternativas, Hidden Power, linhas extras e vários Pokémon', () => {
    const text = `Pintor (Smeargle) (M) @ Focus Sash / Covert Cloak
Ability: Moody
Shiny: Yes
EVs: 4 HP / 252 Atk / 252 Spe
Adamant Nature
- Spore / Dark Void
- Hidden Power [Fire]

Garchomp
Ability: Rough Skin
- Earthquake`;
    const [first, second] = parseShowdown(text);
    expect(first.build).toMatchObject({ species: 'Smeargle', item: 'Focus Sash', ability: 'Moody', nature: 'Adamant', level: 100 });
    expect(first.build.moves).toEqual(['Spore', 'Hidden Power']);
    expect(second.build).toMatchObject({ species: 'Garchomp', item: '', moves: ['Earthquake'] });
    expect(second.errors).toEqual([]);
  });

  it('marca o que não dá para salvar', () => {
    const [entry] = parseShowdown('Smeargle\nEVs: 252 HP / 252 Atk / 252 Spe\n- Spore');
    expect(entry.errors).toContain('A soma dos EVs passa de 510.');
  });
});

describe('conversão com o set do site', () => {
  it('set do Team Builder → build → set', () => {
    const set = {
      ...createBattleSet(),
      level: 50,
      nature: 'jolly',
      item: 'focus-sash',
      ability: 'own-tempo',
      teraType: 'ghost',
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 },
      moves: [{ slug: 'spore' }, { slug: 'fake-out' }, null, { slug: 'wide-guard' }],
    };
    const build = buildFromSet(speciesName('smeargle'), set);
    expect(build).toMatchObject({ species: 'Smeargle', nature: 'Jolly', item: 'Focus Sash', ability: 'Own Tempo', teraType: 'Ghost' });
    expect(build.moves).toEqual(['Spore', 'Fake Out', 'Wide Guard']);
    expect(validateBuild(build)).toEqual([]);

    const back = setFromBuild(build);
    expect(back.speciesSlug).toBe('smeargle');
    expect(back.moveSlugs).toEqual(['spore', 'fake-out', 'wide-guard']);
    expect(back.set).toMatchObject({ level: 50, nature: 'jolly', item: 'focus-sash', ability: 'own-tempo', teraType: 'ghost' });
  });

  it('formas viram o nome do Showdown e voltam ao slug', () => {
    expect(speciesName('ogerpon-wellspring')).toBe('Ogerpon-Wellspring');
    expect(setFromBuild({ ...SMEARGLE, species: 'Ogerpon-Wellspring' }).speciesSlug).toBe('ogerpon-wellspring');
  });

  it('Tera desconhecido vira null', () => {
    expect(setFromBuild({ ...SMEARGLE, teraType: 'Sound' }).set.teraType).toBeNull();
  });
});

describe('resumos', () => {
  it('EVs do maior para o menor; no empate, de Spe para HP', () => {
    expect(evSummary({ hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 })).toBe('252 Spe / 252 Atk / 4 HP');
    expect(evSummary({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })).toBe('');
  });

  it('nome padrão: "<Espécie> – <Nature>"', () => {
    expect(defaultBuildName(SMEARGLE)).toBe('Smeargle – Jolly');
  });
});
