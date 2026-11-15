import { describe, expect, it } from 'vitest';
import allSets from '../data/gen9.json';
import battleData from '../data/battle-data.json';
import pokedexIndex from '../data/pokedex-index.json';
import ouFixture from './__fixtures__/gen9ou-2026-10.json';
import { baseStatsOf, moveSummaryOf } from './battleData';
import {
  classifyMatchup, combatantOf, gauntletMember, prepareGauntlet, redundancyValue, runGauntlet, statusOf, stealthRockChip,
} from './gauntlet';
import { buildMeta } from './metaScore';
import { buildPokedexEntries } from './pokedex';
import { probableSet } from './sketchSets';
import { createBattleSet } from './stats';
import { attachRoles } from './teamRoles';

const entry = (id, name, types) => ({ id, name, species: name, types, isForm: false });
const TUSK = entry(984, 'great-tusk', ['ground', 'fighting']);
const GAMBIT = entry(983, 'kingambit', ['dark', 'steel']);
const CHOMP = entry(445, 'garchomp', ['dragon', 'ground']);
const PULT = entry(887, 'dragapult', ['dragon', 'ghost']);
const CHARIZARD = entry(6, 'charizard', ['fire', 'flying']);

const set = (nature, evs, moves, extra = {}) => ({
  ...createBattleSet(),
  nature,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...evs },
  moves: [...moves.map((slug) => moveSummaryOf(battleData, slug)), null, null, null, null].slice(0, 4),
  ...extra,
});

const member = (pokemon, memberSet) => gauntletMember(pokemon, memberSet, battleData);
// Ameaça com versões: a base e, opcionalmente, boostada.
function threat(pokemon, threatSet, { boosts = null, name = pokemon.name, usage = 10 } = {}) {
  const stats = baseStatsOf(battleData, pokemon.id);
  const versions = [{ key: 'base', label: 'base', combatant: combatantOf(pokemon, threatSet, stats) }];
  if (boosts) versions.push({ key: 'boosted', label: '+2 Atk (Swords Dance)', combatant: combatantOf(pokemon, threatSet, stats, { boosts }) });
  return { name, usage, entry: pokemon, set: threatSet, versions };
}
// A versão base de uma ameaça, no formato que classifyMatchup recebe.
const baseOf = (pokemon, threatSet) => ({ set: threatSet, combatant: threat(pokemon, threatSet).versions[0].combatant });
const gauntletOf = (threats) => ({
  threats,
  meta: { stats: new Map(), names: new Map() },
  field: { weather: '', terrain: '', magicRoom: false, wonderRoom: false, gravity: false, trickRoom: false },
  matchups: new Map(),
});

/*
  Contas à mão (nível 100, IVs 31, sem item nem habilidade, campo neutro). Base = ⌊⌊42 × poder × Atk / Def⌋ / 50⌋ + 2,
  dano = ⌊base × r / 100⌋ (r de 85 a 100), STAB ×1,5 arredondando ,5 para baixo, depois o tipo.

  Great Tusk Jolly 252 Atk / 252 Spe: HP 371, Atk 361, Def 298, Spe 300.
  Kingambit Adamant 252 HP / 252 Atk: HP 404, Atk 405, Def 276, Spe 136.
  Garchomp Adamant 252 HP / 252 Atk: HP 420, Atk 394, Def 226, Spe 240.
  Dragapult Timid 252 SpA / 252 Spe: HP 317, SpA 299, Def 186, Spe 421.

  1. Great Tusk × Kingambit: Close Combat ×4 com STAB, base 133 → menor 676 (≥ 404, OHKO). Iron Head de Kingambit:
     base 93, maior 139 = 37,5% de 371. Stealth Rock em Tusk: 12,5% × ¼ = 3,125%. Entra com 59,4% e faz OHKO → check.
  2. Garchomp × Kingambit: Earthquake ×2 com STAB, base 121 → menor ⌊102,85⌋ = 102 → 153 → 306 = 75,7% de 404.
     Kowtow Cleave neutro com STAB: base 129 → maior 193 = 46,0% de 420. Rocha em Garchomp: 12,5% × ½ = 6,25%.
     Entra com 100 − 6,25 − 46,0 = 47,8%; age primeiro (240 > 136): Kingambit fica com 24,3%, devolve 46,0% e
     Garchomp sobra com 1,85%; no turno 2 derruba → check.
     A +2 (Atk 810): base 257 → maior 385 = 91,7%. Entra com 2,1%, tira 75,7% e cai → só troca. O check é frágil.
  3. Dragapult × Kingambit: Focus Blast ×4 sem STAB, base 148 → menor 125 → 500 (OHKO). Sucker Punch (+1) ×2 com STAB:
     base 130 → menor 110 → 165 → 330 ≥ 317. Dragapult é mais rápido (421 > 136), mas o Sucker Punch age antes.
*/
const tuskSet = set('jolly', { atk: 252, spe: 252 }, ['close-combat', 'headlong-rush']);
const gambitSet = set('adamant', { hp: 252, atk: 252 }, ['kowtow-cleave', 'iron-head']);
const chompSet = set('adamant', { hp: 252, atk: 252 }, ['earthquake']);
const pultSet = set('timid', { spa: 252, spe: 252 }, ['focus-blast']);

describe('Stealth Rock', () => {
  it('Charizard sem Boots perde 50% ao entrar; com Heavy-Duty Boots, 0%', () => {
    const stats = baseStatsOf(battleData, CHARIZARD.id);
    expect(stealthRockChip(combatantOf(CHARIZARD, createBattleSet(), stats))).toBe(50);
    expect(stealthRockChip(combatantOf(CHARIZARD, { ...createBattleSet(), item: 'heavy-duty-boots' }, stats))).toBe(0);
    expect(stealthRockChip(combatantOf(CHARIZARD, { ...createBattleSet(), ability: 'magic-guard' }, stats))).toBe(0);
  });
});

describe('classifyMatchup', () => {
  it('calcula os atributos das contas à mão', () => {
    expect(member(TUSK, tuskSet).combatant.stats).toMatchObject({ hp: 371, atk: 361, def: 298, spe: 300 });
    expect(member(GAMBIT, gambitSet).combatant.stats).toMatchObject({ hp: 404, atk: 405, def: 276, spe: 136 });
    expect(member(CHOMP, chompSet).combatant.stats).toMatchObject({ hp: 420, atk: 394, def: 226, spe: 240 });
    expect(member(PULT, pultSet).combatant.stats).toMatchObject({ hp: 317, spa: 299, def: 186, spe: 421 });
  });

  it('check: Great Tusk entra levando Iron Head e faz OHKO', () => {
    const result = classifyMatchup(member(TUSK, tuskSet), baseOf(GAMBIT, gambitSet));
    expect(result.outcome).toBe('check');
    expect(result.chip).toBeCloseTo(3.125, 5);
    expect(result.taken).toBeCloseTo((139 / 371) * 100, 5);
    expect(result.dealt).toBeCloseTo((676 / 404) * 100, 5);
    expect(result.hitsToKo).toBe(1);
  });

  it('prioridade: o revenge mais rápido falha contra Sucker Punch que faz KO', () => {
    const attacker = member(PULT, pultSet);
    expect(classifyMatchup(attacker, baseOf(GAMBIT, gambitSet))).toMatchObject({ outcome: 'revenge', memberFirst: true });

    const suckerSet = set('adamant', { hp: 252, atk: 252 }, ['kowtow-cleave', 'sucker-punch']);
    const result = classifyMatchup(attacker, baseOf(GAMBIT, suckerSet));
    expect(result.memberFirst).toBe(false);
    expect(result.outcome).toBe('lose');
  });
});

describe('runGauntlet', () => {
  it('boost: Garchomp checa o Kingambit base, mas não o +2 → resposta frágil', () => {
    const gauntlet = gauntletOf([threat(GAMBIT, gambitSet, { boosts: { atk: 2 } })]);
    const result = runGauntlet(gauntlet, [member(CHOMP, chompSet)]);
    const [answer] = result.threats[0].answers;
    expect(answer).toMatchObject({ kind: 'check', solid: false, failsOn: '+2 Atk (Swords Dance)' });
    expect(answer.dealt).toBeCloseTo((306 / 404) * 100, 5);
    expect(answer.taken).toBeCloseTo((193 / 420) * 100, 5);
    // Frágil: a troca garantida (0,15) mais metade do que faltava para o check (0,6 − 0,15) = 0,375 → 38.
    expect(result.score).toBe(38);
    expect(result.threats[0].status).toBe('weak');
  });

  it('redundância: 2 checks valem mais do que 1', () => {
    const one = runGauntlet(gauntletOf([threat(GAMBIT, gambitSet)]), [member(CHOMP, chompSet), member(PULT, set('timid', {}, []))]);
    const two = runGauntlet(gauntletOf([threat(GAMBIT, gambitSet)]), [member(CHOMP, chompSet), member(TUSK, tuskSet)]);
    expect(one.score).toBe(60);
    expect(two.score).toBe(100);
    expect(statusOf(1)).toBe('solid');
    expect(statusOf(0.6)).toBe('ok');
  });

  it('a tabela de redundância segue a ordem pedida', () => {
    expect([redundancyValue(2, 0, 0), redundancyValue(1, 1, 0), redundancyValue(1, 0, 0), redundancyValue(0, 2, 0),
      redundancyValue(0, 1, 0), redundancyValue(0, 0, 1), redundancyValue(0, 0, 0)]).toEqual([1, 0.85, 0.6, 0.5, 0.35, 0.15, 0]);
  });

  it('sobrecarga: a única resposta de 4 ameaças perde 3 pontos', () => {
    const copies = (count) => Array.from({ length: count }, (_, i) => threat(GAMBIT, gambitSet, { name: `kingambit-${i}` }));
    const three = runGauntlet(gauntletOf(copies(3)), [member(TUSK, tuskSet)]);
    const four = runGauntlet(gauntletOf(copies(4)), [member(TUSK, tuskSet)]);
    expect(three.breakdown.overloaded).toEqual([]);
    expect(four.breakdown.overloaded).toEqual([{ member: 'Great Tusk', threats: ['kingambit-0', 'kingambit-1', 'kingambit-2', 'kingambit-3'], penalty: 3 }]);
    // Cada ameaça com um só check vale 0,6 → 60, menos 3 pela sobrecarga.
    expect(three.score).toBe(60);
    expect(four.score).toBe(57);
  });

  it('hazards: Charizard 4x a Rock sem Boots tira 5 pontos; com Boots, aparece sem penalidade', () => {
    const team = (item) => [member(TUSK, tuskSet), member(CHOMP, chompSet), member(CHARIZARD, set('timid', {}, ['flamethrower'], { item }))];
    const bare = runGauntlet(gauntletOf([threat(GAMBIT, gambitSet)]), team(''));
    expect(bare.breakdown.hazards).toEqual([{ member: 'Charizard', multiplier: 4, penalty: 5, protectedBy: null }]);
    expect(bare.score).toBe(95);
    const booted = runGauntlet(gauntletOf([threat(GAMBIT, gambitSet)]), team('heavy-duty-boots'));
    expect(booted.breakdown.hazards).toEqual([{ member: 'Charizard', multiplier: 4, penalty: 0, protectedBy: 'heavy-duty-boots' }]);
    expect(booted.score).toBe(100);
  });
});

describe('sanidade com o meta real do OU', () => {
  const resources = (entries, resource) => entries.map(([id, name]) => ({ name, url: `https://pokeapi.co/api/v2/${resource}/${id}/` }));
  const typeIndex = new Map(Object.entries(pokedexIndex.types).map(([id, types]) => [Number(id), types]));
  const pool = buildPokedexEntries({
    pokemon: resources(pokedexIndex.pokemon, 'pokemon'),
    species: resources(pokedexIndex.species, 'pokemon-species'),
    typeIndex,
  });
  const meta = attachRoles(buildMeta(ouFixture.rows, pool), pool, battleData);
  const byName = (name) => pool.find((pokemon) => pokemon.name === name);
  const teamOf = (names) => names.map((name) => {
    const pokemon = byName(name);
    const smogonName = meta.names.get(name);
    return member(pokemon, probableSet({ smogonName, tierKey: 'ou', allSets, stat: meta.stats.get(smogonName), battleData }));
  });

  it('um time de Pokémon fracos fica abaixo de 15', () => {
    const gauntlet = prepareGauntlet({ meta, pool, allSets, battleData, tierKey: 'ou' });
    const result = runGauntlet(gauntlet, teamOf(['magikarp', 'caterpie', 'weedle', 'wurmple', 'kricketot', 'feebas']));
    expect(result.score).toBeLessThan(15);
  });

  it('o time do problema (sol) fica abaixo de 90', () => {
    const gauntlet = prepareGauntlet({ meta, pool, allSets, battleData, tierKey: 'ou', weather: 'sun' });
    const team = teamOf(['charizard', 'torkoal', 'walking-wake', 'gholdengo', 'ursaluna', 'iron-hands']);
    const result = runGauntlet(gauntlet, team);
    expect(result.score).toBeLessThan(90);
    expect(new Set(result.threats.map((t) => t.status)).size).toBeGreaterThan(1);
    // O set mais provável do Charizard no OU usa Heavy-Duty Boots (30% dos sets): aparece, mas sem penalidade.
    expect(result.breakdown.hazards).toContainEqual({ member: 'Charizard', multiplier: 4, penalty: 0, protectedBy: 'heavy-duty-boots' });
  });
});
