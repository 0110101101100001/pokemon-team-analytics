import { describe, expect, it } from 'vitest';
import allSets from '../data/gen9.json';
import battleData from '../data/battle-data.json';
import { probableSet, setFromBuild, setFromUsage, toPokeApiSlug } from './sketchSets';
import { createBattleSet } from './stats';

describe('toPokeApiSlug', () => {
  it.each([
    ['Heavy-Duty Boots', 'heavy-duty-boots'],
    ['U-turn', 'u-turn'],
    ['Choice Scarf', 'choice-scarf'],
    ["King's Shield", 'kings-shield'],
    ['Will-O-Wisp', 'will-o-wisp'],
    ['Mr. Mime', 'mr-mime'],
    ['Type: Null', 'type-null'],
  ])('%s → %s', (name, slug) => {
    expect(toPokeApiSlug(name)).toBe(slug);
  });
});

describe('probableSet', () => {
  const great = { smogonName: 'Great Tusk', allSets, battleData };

  it('usa a primeira build do tier, com Tera e a habilidade do uso quando a build não traz', () => {
    // Great Tusk OU, "Offensive Utility": Jolly, 252 Atk / 4 Def / 252 Spe, Heavy-Duty Boots, Tera Steel.
    // A Smogon omite a habilidade de quem só tem uma (Protosynthesis).
    const set = probableSet({ ...great, tierKey: 'ou', stat: { abilities: { Protosynthesis: 100 } } });
    expect(set).toMatchObject({ level: 100, nature: 'jolly', item: 'heavy-duty-boots', ability: 'protosynthesis', teraType: 'steel' });
    expect(set.evs).toEqual({ hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 });
    expect(set.ivs).toEqual(createBattleSet().ivs);
    expect(set.moves.map((move) => move?.slug)).toEqual(['headlong-rush', 'ice-spinner', 'rapid-spin', 'close-combat']);
    expect(set.moves[0]).toMatchObject({ type: 'ground', damageClass: 'physical', power: 120 });
    expect(probableSet({ ...great, tierKey: 'ou' }).ability).toBe('');
  });

  it('sem build no tier, usa o uso da Smogon', () => {
    const stat = { items: { Leftovers: 40 }, abilities: { Pressure: 90 }, spreads: { 'Bold:252/0/252/0/4/0': 30 }, moves: { Roost: 90, 'U-turn': 80 } };
    expect(probableSet({ ...great, tierKey: 'tier-inexistente', stat })).toMatchObject({ item: 'leftovers', ability: 'pressure', nature: 'bold' });
  });

  it('devolve um set vazio sem build nem uso', () => {
    expect(probableSet({ ...great, smogonName: 'Missingno', tierKey: 'ou' })).toEqual(createBattleSet());
    expect(probableSet({ ...great, tierKey: 'tier-inexistente' })).toEqual(createBattleSet());
  });
});

describe('setFromBuild', () => {
  it('preenche EVs ausentes com 0 e deixa null o golpe desconhecido', () => {
    const set = setFromBuild({ moves: ['Earthquake', 'Golpe Inventado'], evs: { spe: 252 }, nature: ['Jolly', 'Adamant'] }, battleData);
    expect(set.evs).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 252 });
    expect(set.nature).toBe('jolly');
    expect(set.moves.map((move) => move?.slug ?? null)).toEqual(['earthquake', null, null, null]);
    expect(set.teraType).toBeNull();
  });
});

describe('setFromUsage', () => {
  it('ignora "Other" e "Nothing" e lê o spread mais usado', () => {
    const set = setFromUsage({
      items: { Other: 50, Nothing: 20, 'Choice Band': 15 },
      abilities: { Other: 1, Intimidate: 80 },
      spreads: { Other: 60, 'Adamant:0/252/0/0/4/252': 25 },
      moves: { Other: 40, 'U-turn': 90, Earthquake: 70, 'Stone Edge': 60, Protect: 50, 'Swords Dance': 10 },
    }, battleData);
    expect(set).toMatchObject({ item: 'choice-band', ability: 'intimidate', nature: 'adamant' });
    expect(set.evs).toEqual({ hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 });
    expect(set.moves.map((move) => move.slug)).toEqual(['u-turn', 'earthquake', 'stone-edge', 'protect']);
  });
});
