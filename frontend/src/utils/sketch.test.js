import { describe, expect, it } from 'vitest';
import { archetypeByKey } from './archetypes';
import { buildMeta } from './metaScore';
import { MAX_SHARED, diversitySpecies, sketchTeams } from './sketch';
import { META, POOL, battleData, byName } from './sketchFixtures';
import { attachRoles } from './teamRoles';
import { TEAM_SIZE, speciesOf } from './teamScore';

const SEED = [byName('great-tusk')];
const namesOf = (variation) => variation.members.map((member) => member.pokemon.name);
const averageSpeed = (variation) =>
  variation.members.reduce((sum, member) => sum + META.baseStats.get(member.pokemon.name).spe, 0) / variation.members.length;

describe('sketchTeams', () => {
  const variations = sketchTeams(SEED, POOL, META);

  it('devolve 3 times completos que preservam o rascunho', () => {
    expect(variations).toHaveLength(3);
    for (const variation of variations) {
      expect(variation.members).toHaveLength(TEAM_SIZE);
      expect(variation.members[0]).toEqual({ pokemon: SEED[0], fromSeed: true });
      const species = variation.members.map((member) => speciesOf(member.pokemon));
      expect(new Set(species).size).toBe(TEAM_SIZE);
    }
  });

  it.each(['free', 'balance', 'rain', 'sun', 'hyperOffense'])(
    'em %s, variações dividem no máximo 2 Pokémon fora do rascunho e do setter',
    (key) => {
      const archetype = archetypeByKey(key);
      const result = sketchTeams(SEED, POOL, META, { archetype });
      expect(result.length).toBeGreaterThan(0);
      expect(MAX_SHARED).toBe(2);
      const diverse = result.map((variation) =>
        diversitySpecies(variation.members.filter((member) => !member.fromSeed), archetype, META));
      for (let i = 0; i < diverse.length; i += 1) {
        for (let j = i + 1; j < diverse.length; j += 1) {
          expect(diverse[i].filter((species) => diverse[j].includes(species)).length).toBeLessThanOrEqual(MAX_SHARED);
        }
      }
    },
  );

  it('cada variação traz título, quem cobre cada função e o encaixe com rótulo', () => {
    const [first] = sketchTeams(SEED, POOL, META, { archetype: archetypeByKey('rain') });
    expect(first.title.startsWith('Chuva · ')).toBe(true);
    expect(first.roles.coveredBy['weather:rain']).toEqual(['pelipper']);
    expect(first.fit.label).toBe('Chuva');
  });

  it('nunca usa Pokémon fora do tier ou abaixo do uso mínimo', () => {
    const used = variations.flatMap(namesOf);
    expect(used).not.toContain('mewtwo');
    expect(used).not.toContain('pikachu');
  });

  it('respeita o "Não usar"', () => {
    const banned = ['kingambit', 'corviknight', 'gholdengo'];
    const result = sketchTeams(SEED, POOL, META, { banned });
    expect(result.length).toBeGreaterThan(0);
    for (const name of result.flatMap(namesOf)) expect(banned).not.toContain(name);
  });

  it('respeita a regra de no máximo 2 do mesmo tipo', () => {
    const result = sketchTeams(SEED, POOL, META, { maxPerType: 2 });
    expect(result.length).toBeGreaterThan(0);
    for (const variation of result) {
      const counts = {};
      for (const { pokemon } of variation.members) pokemon.types.forEach((type) => { counts[type] = (counts[type] ?? 0) + 1; });
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
    }
  });

  it('Balance cobre Hazards, Hazard Control e Pivot em todos os times', () => {
    const result = sketchTeams(SEED, POOL, META, { archetype: archetypeByKey('balance') });
    expect(result.length).toBeGreaterThan(0);
    for (const variation of result) expect(variation.roles.covered).toEqual(['hazards', 'removal', 'pivot']);
  });

  it('Chuva sempre traz o setter e nunca um setter de outro clima', () => {
    const result = sketchTeams(SEED, POOL, META, { archetype: archetypeByKey('rain') });
    expect(result.length).toBeGreaterThan(0);
    for (const variation of result) {
      expect(namesOf(variation)).toContain('pelipper');
      expect(namesOf(variation)).not.toContain('torkoal');
    }
  });

  it('Trick Room sai mais lento do que Hyper Offense com o mesmo meta', () => {
    const trickRoom = sketchTeams(SEED, POOL, META, { archetype: archetypeByKey('trickRoom') });
    const hyperOffense = sketchTeams(SEED, POOL, META, { archetype: archetypeByKey('hyperOffense') });
    expect(trickRoom.length).toBeGreaterThan(0);
    expect(hyperOffense.length).toBeGreaterThan(0);
    const slowest = Math.max(...trickRoom.map(averageSpeed));
    const fastest = Math.min(...hyperOffense.map(averageSpeed));
    expect(slowest).toBeLessThan(fastest);
  });

  it('ordena pela nota de `rate` quando há teste do meta', () => {
    const rate = (team) => ({ score: team.some((member) => member.name === 'corviknight') ? 90 : 40, threats: [] });
    const result = sketchTeams(SEED, POOL, META, { rate });
    const scores = result.map((variation) => variation.gauntlet.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('devolve [] para rascunho vazio, rascunho cheio, meta vazio ou estilo impossível', () => {
    expect(sketchTeams([], POOL, META)).toEqual([]);
    expect(sketchTeams(POOL.slice(0, TEAM_SIZE), POOL, META)).toEqual([]);
    expect(sketchTeams(SEED, POOL, null)).toEqual([]);
    expect(sketchTeams(SEED, POOL, attachRoles(buildMeta([], POOL), POOL, battleData))).toEqual([]);
    // Stall pede Cleric, e ninguém neste meta tem Heal Bell, Aromatherapy ou Wish.
    expect(sketchTeams(SEED, POOL, META, { archetype: archetypeByKey('stall') })).toEqual([]);
  });
});
