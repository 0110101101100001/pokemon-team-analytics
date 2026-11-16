import { archetypeByKey } from './archetypes';
import { gauntletMember, prepareGauntlet, runGauntlet } from './gauntlet';
import { sketchTeams, tierPoolOf } from './sketch';
import { explainPick } from './sketchExplain';
import { probableSet } from './sketchSets';
import { attachRoles } from './teamRoles';
import { tierKeyOf } from './tiers';

// O meta com funções sai uma vez por meta (um por tier); as ameaças do teste do meta, uma vez por meta e clima.
const prepared = new WeakMap();

function prepare(meta, pool, battleData) {
  let entry = prepared.get(meta);
  if (!entry) {
    entry = { roleMeta: attachRoles(meta, pool, battleData), gauntlets: new Map(), sets: new Map() };
    prepared.set(meta, entry);
  }
  return entry;
}

function gauntletFor(entry, { pool, allSets, battleData, tier, weather }) {
  let gauntlet = entry.gauntlets.get(weather);
  if (!gauntlet) {
    gauntlet = prepareGauntlet({ meta: entry.roleMeta, pool, allSets, battleData, tierKey: tierKeyOf(tier), weather });
    entry.gauntlets.set(weather, gauntlet);
  }
  return gauntlet;
}

const hasMoves = (set) => set?.moves?.some(Boolean);

/**
 * Tudo o que o esboço e as edições usam, montado uma vez por meta, clima e plano:
 * { meta (com funções), pool, tierPool, gauntlet, archetype, constraints, allSets, battleData, tierKey, setOf, rate, explain }.
 * - `setOf(pokemon)`: o set do próprio Pokémon quando ele tem golpes (rascunho), senão o mais provável do tier;
 * - `rate(team)`: nota do teste do meta de um time de entradas (com `set` opcional);
 * - `explain(pick, team)`: os motivos de um Pokémon adicionado, no formato do card.
 */
export function sketchContext({ pool, meta, battleData, allSets, tier, archetypeKey, banned = [], maxPerType = null, minUsage = 1 }) {
  const entry = prepare(meta, pool, battleData);
  const { roleMeta, sets } = entry;
  const archetype = archetypeByKey(archetypeKey);
  const gauntlet = gauntletFor(entry, { pool, allSets, battleData, tier, weather: archetype.weather ?? '' });
  const tierKey = tierKeyOf(tier);
  const constraints = { banned: new Set(banned), maxPerType, minUsage };

  const probable = (pokemon) => {
    let set = sets.get(pokemon.name);
    if (!set) {
      const smogonName = roleMeta.names.get(pokemon.name);
      set = probableSet({ smogonName, tierKey, allSets, stat: roleMeta.stats.get(smogonName), battleData });
      sets.set(pokemon.name, set);
    }
    return set;
  };
  const setOf = (pokemon) => (hasMoves(pokemon.set) ? pokemon.set : probable(pokemon));
  const rate = (team) => runGauntlet(gauntlet, team.map((member) => gauntletMember(member, setOf(member), battleData)));
  const explain = (pick, team) =>
    explainPick(pick, roleMeta, new Set(team.map((pokemon) => roleMeta.names.get(pokemon.name)).filter(Boolean)), setOf(pick.pokemon));

  return {
    meta: roleMeta,
    pool,
    tierPool: tierPoolOf(pool, roleMeta, minUsage, constraints.banned),
    gauntlet,
    archetype,
    constraints,
    allSets,
    battleData,
    tierKey,
    setOf,
    rate,
    explain,
  };
}

/**
 * Roda o esboço completo: busca dos times no estilo e nota de cada um no teste do meta (com o clima do estilo).
 * `seed` são os membros do time atual (com `set`); os do rascunho usam o próprio set quando ele tem golpes,
 * os outros, o set mais provável do tier. Cada membro sai com `set`, e os adicionados também com `explain`.
 */
export function planSketch({ seed, ...plan }) {
  const ctx = sketchContext(plan);
  const { archetype, constraints } = ctx;
  return sketchTeams(seed, ctx.pool, ctx.meta, {
    archetype,
    banned: [...constraints.banned],
    maxPerType: constraints.maxPerType,
    minUsage: constraints.minUsage,
    rate: ctx.rate,
  }).map((variation) => {
    const team = variation.members.map(({ pokemon }) => pokemon);
    return {
      ...variation,
      members: variation.members.map((member) => ({
        ...member,
        set: ctx.setOf(member.pokemon),
        ...(!member.fromSeed && { explain: ctx.explain(member, team) }),
      })),
    };
  });
}
