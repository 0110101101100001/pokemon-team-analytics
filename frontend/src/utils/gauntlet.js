import { createField, createSideConditions, defaultHits } from '../components/calc/calcState';
import { baseStatsOf, weightOf } from './battleData';
import { calcSpeed, calculateDamage, isCalculable } from './damage';
import { formTypes } from '../data/formItems';
import { formatSlug } from './filters';
import { probableSet } from './sketchSets';
import { calcStats } from './stats';
import { effectiveness } from './typeChart';

/*
  Teste do meta: cada time completo contra as ameaças mais usadas do tier.

  Cada membro enfrenta cada ameaça em um duelo curto e determinístico (até 6 turnos), com cada lado usando
  o golpe que derruba o outro (o de maior prioridade entre os que derrubam) ou, sem KO à vista, o de maior dano.
  As contas são conservadoras para o time: a ameaça bate com a rolagem máxima e o membro com a mínima, sem críticos;
  empate de velocidade é da ameaça. Quem entra perde o chip de Stealth Rock.

  Cada ameaça vem em até três versões: o set mais provável, a versão boostada pelo golpe de setup mais usado
  e a versão com o Tera da build. Uma resposta que vale contra todas é sólida; só contra a base, frágil.
*/

export const GAUNTLET_SIZE = 20;
export const MAX_TURNS = 6;
/** Fração do HP que Stealth Rock tira de quem é neutro a Rock. */
export const STEALTH_ROCK_FRACTION = 0.125;
/** Dano (% do HP) que um membro precisa causar de volta para a troca contar. */
export const TRADE_DAMAGE = 35;
/** Penalidade por ameaça além de 3 de que um membro é a única resposta sólida. */
export const OVERLOAD_LIMIT = 3;
export const OVERLOAD_PENALTY = 3;
export const HAZARD_PENALTY = { 4: 5, 2: 1 };

const NEUTRAL_SIDE = createSideConditions();
const NO_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const IGNORES_HAZARDS = new Set(['magic-guard']);

// Golpes de setup e os estágios que eles dão (o mais usado de cada ameaça monta a versão boostada).
export const SETUP_BOOSTS = {
  'Swords Dance': { atk: 2 },
  'Nasty Plot': { spa: 2 },
  'Shell Smash': { atk: 2, spa: 2 },
  'Belly Drum': { atk: 2 },
  'Dragon Dance': { atk: 1, spe: 1 },
  'Quiver Dance': { spa: 1, spd: 1, spe: 1 },
  'Calm Mind': { spa: 1, spd: 1 },
  'Bulk Up': { atk: 1, def: 1 },
  'Victory Dance': { atk: 1, def: 1, spe: 1 },
  'Tidy Up': { atk: 1, spe: 1 },
};

const BOOST_LABELS = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

/** Lado no formato de calculateDamage a partir de uma entrada da Pokédex, do set e dos atributos base. */
export function combatantOf(entry, set, baseStats, { boosts = NO_BOOSTS, tera = '', weight = null } = {}) {
  const originalTypes = formTypes(entry.name, set.item) ?? entry.types;
  return {
    level: set.level,
    species: entry.name,
    types: tera && tera !== 'stellar' ? [tera] : originalTypes,
    originalTypes,
    tera,
    stats: calcStats(baseStats, set),
    boosts: { ...NO_BOOSTS, ...boosts },
    item: set.item ?? '',
    ability: set.ability ?? '',
    status: '',
    ivs: set.ivs,
    baseStats,
    weight,
  };
}

/** % do HP que Stealth Rock tira ao entrar (0 com Heavy-Duty Boots ou Magic Guard). */
export function stealthRockChip(combatant) {
  if (combatant.item === 'heavy-duty-boots' || IGNORES_HAZARDS.has(combatant.ability)) return 0;
  return STEALTH_ROCK_FRACTION * effectiveness('rock', combatant.types) * 100;
}

const sum = (values) => values.reduce((total, value) => total + value, 0);

// Golpes de dano do atacante contra o alvo: { slug, priority, pct } com pct = % do HP do alvo por uso,
// na rolagem pedida ('min' ou 'max').
function moveOptions(attacker, moves, defender, field, roll) {
  const options = [];
  for (const summary of moves) {
    if (!summary) continue;
    const move = { ...summary, category: summary.damageClass, hits: defaultHits(summary), crit: false };
    if (!isCalculable(move)) continue;
    const result = calculateDamage({ attacker, defender, move, field, defenderSide: NEUTRAL_SIDE });
    if (result.reason) continue;
    const pick = (rolls) => (roll === 'max' ? rolls.at(-1) : rolls[0]);
    const perUse = pick(result.rolls) * result.hits + (result.extraRolls ? pick(result.extraRolls) : 0);
    if (perUse > 0) options.push({ slug: summary.slug, priority: summary.priority ?? 0, pct: (perUse / result.hp) * 100 });
  }
  return options;
}

// O golpe escolhido contra um alvo com `targetHp` %: o de maior prioridade entre os que derrubam;
// sem KO, o de maior dano.
function chooseMove(options, targetHp) {
  let best = null;
  for (const option of options) {
    const kills = option.pct >= targetHp;
    if (!best) { best = { ...option, kills }; continue; }
    if (kills !== best.kills) { if (kills) best = { ...option, kills }; continue; }
    const better = kills
      ? option.priority > best.priority || (option.priority === best.priority && option.pct > best.pct)
      : option.pct > best.pct;
    if (better) best = { ...option, kills };
  }
  return best;
}

const bestPct = (options) => Math.max(0, ...options.map((option) => option.pct));

/**
 * Duelo de até 6 turnos a partir do HP (%) de cada lado. A ordem segue a prioridade do golpe e depois a
 * velocidade; empate é da ameaça. Devolve { winner: 'member' | 'threat' | null, turns, memberHp, threatHp, memberFirst }
 * (`memberFirst` vale para o primeiro turno).
 */
export function simulateDuel({ memberOptions, threatOptions, memberSpeed, threatSpeed, memberHp = 100, threatHp = 100 }) {
  let memberFirst = null;
  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    const memberMove = chooseMove(memberOptions, threatHp);
    const threatMove = chooseMove(threatOptions, memberHp);
    if (!memberMove && !threatMove) return { winner: null, turns: turn - 1, memberHp, threatHp, memberFirst };

    const memberPriority = memberMove?.priority ?? -Infinity;
    const threatPriority = threatMove?.priority ?? -Infinity;
    const first = memberPriority > threatPriority || (memberPriority === threatPriority && memberSpeed > threatSpeed);
    if (turn === 1) memberFirst = first;

    for (const side of first ? ['member', 'threat'] : ['threat', 'member']) {
      if (side === 'member' && memberMove) threatHp -= memberMove.pct;
      if (side === 'threat' && threatMove) memberHp -= threatMove.pct;
      if (threatHp <= 0) return { winner: 'member', turns: turn, memberHp, threatHp: 0, memberFirst };
      if (memberHp <= 0) return { winner: 'threat', turns: turn, memberHp: 0, threatHp, memberFirst };
    }
  }
  return { winner: null, turns: MAX_TURNS, memberHp, threatHp, memberFirst };
}

/**
 * Um membro contra uma versão da ameaça, em um campo:
 * - check: entra levando um golpe e o chip de Stealth Rock e, daí em diante, derruba a ameaça antes de cair;
 * - revenge: entra de graça (só o chip), age primeiro e faz OHKO com a rolagem mínima;
 * - trade: aguenta a entrada e tira ≥ 35% de volta, sem derrubar;
 * - lose: o resto.
 * Devolve { outcome, dealt, taken, chip, memberFirst, hitsToKo, hitsSurvived }.
 */
export function classifyMatchup(member, threat, field = createField()) {
  const memberOptions = moveOptions(member.combatant, member.set.moves, threat.combatant, field, 'min');
  const threatOptions = moveOptions(threat.combatant, threat.set.moves, member.combatant, field, 'max');
  const memberSpeed = calcSpeed(member.combatant, NEUTRAL_SIDE, field);
  const threatSpeed = calcSpeed(threat.combatant, NEUTRAL_SIDE, field);
  const chip = stealthRockChip(member.combatant);
  const dealt = bestPct(memberOptions);
  const taken = bestPct(threatOptions);
  const base = { memberOptions, threatOptions, memberSpeed, threatSpeed };

  const free = simulateDuel({ ...base, memberHp: 100 - chip });
  const entryHit = chooseMove(threatOptions, 100 - chip)?.pct ?? 0;
  const entryHp = 100 - chip - entryHit;

  let outcome = 'lose';
  if (entryHp > 0 && simulateDuel({ ...base, memberHp: entryHp }).winner === 'member') outcome = 'check';
  else if (free.winner === 'member' && free.turns === 1 && free.memberFirst) outcome = 'revenge';
  else if (entryHp > 0 && dealt >= TRADE_DAMAGE) outcome = 'trade';

  return {
    outcome,
    dealt,
    taken,
    chip,
    memberFirst: free.memberFirst,
    hitsToKo: dealt > 0 ? Math.ceil(100 / dealt) : null,
    hitsSurvived: taken > 0 ? Math.max(0, Math.ceil((100 - chip) / taken) - 1) : Infinity,
  };
}

/* --------------------------------------------------------------- preparo */

function mostUsedSetup(stat) {
  return Object.keys(SETUP_BOOSTS)
    .map((move) => [move, stat?.moves?.[move] ?? 0])
    .filter(([, usage]) => usage > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

const boostLabel = (boosts) => Object.entries(boosts).map(([stat, stage]) => `+${stage} ${BOOST_LABELS[stat]}`).join(' ');

// Versões da ameaça: a base, a boostada (se ela tem a função setup) e a com o Tera da build.
function threatVersions(entry, set, baseStats, stat, roles, weight) {
  const versions = [{ key: 'base', label: 'base', combatant: combatantOf(entry, set, baseStats, { weight }) }];
  const setup = roles?.has('setup') ? mostUsedSetup(stat) : null;
  if (setup) {
    const boosts = SETUP_BOOSTS[setup];
    versions.push({ key: 'boosted', label: `${boostLabel(boosts)} (${setup})`, combatant: combatantOf(entry, set, baseStats, { boosts, weight }) });
  }
  if (set.teraType) {
    versions.push({ key: 'tera', label: `Tera ${formatSlug(set.teraType)}`, combatant: combatantOf(entry, set, baseStats, { tera: set.teraType, weight }) });
  }
  return versions;
}

/**
 * Prepara as ameaças do tier (as `size` mais usadas com entrada na Pokédex), cada uma com o set mais provável
 * e as versões boostada e Tera, e o campo (clima do estilo ou neutro). Chame uma vez por tier e clima.
 */
export function prepareGauntlet({ meta, pool, allSets, battleData, tierKey, weather = '', size = GAUNTLET_SIZE }) {
  const entryBySmogon = new Map();
  for (const entry of pool) {
    const smogonName = meta.names.get(entry.name);
    if (smogonName && !entryBySmogon.has(smogonName)) entryBySmogon.set(smogonName, entry);
  }

  const threats = [];
  for (const stat of [...meta.stats.values()].sort((a, b) => b.usage - a.usage)) {
    if (threats.length >= size) break;
    const entry = entryBySmogon.get(stat.name);
    const baseStats = entry && baseStatsOf(battleData, entry.id);
    if (!baseStats) continue;
    const set = probableSet({ smogonName: stat.name, tierKey, allSets, stat, battleData });
    threats.push({
      name: stat.name,
      usage: stat.usage,
      entry,
      set,
      versions: threatVersions(entry, set, baseStats, stat, meta.roles?.get(entry.name), weightOf(battleData, entry.id)),
    });
  }
  return { threats, meta, field: { ...createField(), weather }, matchups: new Map() };
}

const setKey = (set) => JSON.stringify([set.level, set.nature, set.item, set.ability, set.evs, set.ivs, set.moves.map((m) => m?.slug)]);

/** Membro do time pronto para o teste do meta: { entry, set, combatant, key }. null sem atributos base. */
export function gauntletMember(entry, set, battleData) {
  const baseStats = baseStatsOf(battleData, entry.id);
  if (!baseStats) return null;
  const combatant = combatantOf(entry, set, baseStats, { weight: weightOf(battleData, entry.id) });
  return { entry, set, combatant, key: `${entry.name}|${setKey(set)}` };
}

/* --------------------------------------------------------------- respostas e nota */

// Melhor resposta de um membro a uma ameaça, olhando as versões: sólida vale contra todas, frágil só contra a base.
function answerOf(gauntlet, member, threat) {
  const key = `${member.key}>${threat.name}`;
  const cached = gauntlet.matchups.get(key);
  if (cached) return cached;

  // `gauntlet.classify` permite contar os duelos nos testes; fora deles é sempre classifyMatchup.
  const classify = gauntlet.classify ?? classifyMatchup;
  const results = threat.versions.map((version) => ({
    version,
    ...classify(member, { set: threat.set, combatant: version.combatant }, gauntlet.field),
  }));
  const [base] = results;
  const failing = (kind) => results.find((result) => result.outcome !== kind)?.version.label ?? null;

  let kind = 'lose';
  let solid = false;
  if (base.outcome === 'check') {
    kind = 'check';
    solid = results.every((result) => result.outcome === 'check');
  } else if (base.outcome === 'revenge') {
    kind = 'revenge';
    solid = results.every((result) => result.outcome === 'revenge' || result.outcome === 'check');
  } else if (base.outcome === 'trade') {
    kind = 'trade';
  }
  const answer = {
    member: formatSlug(member.entry.name),
    kind,
    solid,
    failsOn: solid || kind === 'lose' || kind === 'trade' ? null : failing(kind),
    dealt: base.dealt,
    taken: base.taken,
    chip: base.chip,
    memberFirst: base.memberFirst,
    hitsToKo: base.hitsToKo,
    hitsSurvived: base.hitsSurvived,
  };
  gauntlet.matchups.set(key, answer);
  return answer;
}

/** Valor de uma ameaça pela tabela de redundância (contagens de checks, revenges e trocas). */
export function redundancyValue(checks, revenges, trades) {
  if (checks >= 2) return 1;
  if (checks >= 1 && revenges >= 1) return 0.85;
  if (checks >= 1) return 0.6;
  if (revenges >= 2) return 0.5;
  if (revenges >= 1) return 0.35;
  if (trades >= 1) return 0.15;
  return 0;
}

/** Uma resposta frágil vale metade de uma sólida: metade do ganho que ela traria se fosse sólida. */
export function threatValue(answers) {
  const count = (kind, solid) => answers.filter((answer) => answer.kind === kind && answer.solid === solid).length;
  const trades = answers.filter((answer) => answer.kind !== 'lose').length;
  const solidValue = redundancyValue(count('check', true), count('revenge', true), trades);
  const withFragile = redundancyValue(
    count('check', true) + count('check', false),
    count('revenge', true) + count('revenge', false),
    trades,
  );
  return solidValue + 0.5 * (withFragile - solidValue);
}

export const statusOf = (value) => (value >= 0.85 ? 'solid' : value >= 0.5 ? 'ok' : value > 0 ? 'weak' : 'none');

const KIND_RANK = { check: 3, revenge: 2, trade: 1, lose: 0 };
const pct = (value) => `${Math.round(value)}%`;
const hko = (hits) => (hits === 1 ? 'OHKO' : `${hits}HKO`);

/** Frase de uma resposta para o tooltip. */
export function describeAnswer(answer) {
  const quality = answer.solid ? 'sólido' : 'frágil';
  const fails = answer.failsOn ? `, perde para a versão ${answer.failsOn}` : '';
  if (answer.kind === 'check') {
    const survives = Number.isFinite(answer.hitsSurvived) ? `aguenta ${answer.hitsSurvived} golpe${answer.hitsSurvived === 1 ? '' : 's'}` : 'não sofre dano';
    return `${answer.member}: check ${quality}, ${survives} e faz ${hko(answer.hitsToKo)}${fails}`;
  }
  if (answer.kind === 'revenge') return `${answer.member}: revenge ${quality}, age primeiro e faz OHKO${fails}`;
  if (answer.kind === 'trade') return `${answer.member}: só troca, aguenta a entrada e tira ${pct(answer.dealt)}`;
  return `${answer.member}: perde (tira ${pct(answer.dealt)}, leva ${pct(answer.taken)})`;
}

function threatText(threat, answers) {
  const useful = answers.filter((answer) => answer.kind !== 'lose')
    .sort((a, b) => KIND_RANK[b.kind] - KIND_RANK[a.kind] || Number(b.solid) - Number(a.solid));
  if (!useful.length) {
    const ohkos = answers.filter((answer) => answer.taken >= 100 - answer.chip).length;
    return `Sem resposta: ${formatSlug(threat.entry.name)} vence todo o time${ohkos ? ` (OHKO em ${ohkos} de ${answers.length})` : ''}`;
  }
  const best = useful.slice(0, 2).map(describeAnswer);
  if (useful.length === 1 && !useful[0].solid && useful[0].kind === 'revenge') {
    return `Só revenge frágil de ${useful[0].member}${useful[0].failsOn ? `: perde para a versão ${useful[0].failsOn}` : ''}`;
  }
  return best.join(' · ');
}

/**
 * Nota do time contra o teste do meta (0–100): soma ponderada pelo uso do valor de cada ameaça (tabela de redundância),
 * menos as penalidades de sobrecarga e de Stealth Rock. `members` vem de gauntletMember.
 * Devolve { score, raw, threats: [{ name, id, usage, value, status, text, answers }], breakdown }.
 */
export function runGauntlet(gauntlet, members) {
  const valid = members.filter(Boolean);
  let total = 0;
  let possible = 0;
  const onlySolid = new Map();

  const threats = gauntlet.threats.map((threat) => {
    const answers = valid.map((member) => answerOf(gauntlet, member, threat));
    const value = threatValue(answers);
    total += threat.usage * value;
    possible += threat.usage;
    const solid = answers.filter((answer) => answer.solid && (answer.kind === 'check' || answer.kind === 'revenge'));
    if (solid.length === 1) onlySolid.set(solid[0].member, [...(onlySolid.get(solid[0].member) ?? []), threat.name]);
    return { name: threat.name, id: threat.entry.id, usage: threat.usage, value, status: statusOf(value), text: threatText(threat, answers), answers };
  });

  const overloaded = [...onlySolid]
    .filter(([, names]) => names.length > OVERLOAD_LIMIT)
    .map(([member, names]) => ({ member, threats: names, penalty: OVERLOAD_PENALTY * (names.length - OVERLOAD_LIMIT) }));

  // Todo membro 2x ou 4x fraco a Rock aparece; quem tem Boots ou Magic Guard fica sem penalidade.
  const hazards = valid
    .map((member) => {
      const multiplier = effectiveness('rock', member.combatant.types);
      const protectedBy = member.combatant.item === 'heavy-duty-boots' ? 'heavy-duty-boots'
        : IGNORES_HAZARDS.has(member.combatant.ability) ? member.combatant.ability : null;
      return { member: formatSlug(member.entry.name), multiplier, penalty: protectedBy ? 0 : HAZARD_PENALTY[multiplier] ?? 0, protectedBy };
    })
    .filter((hazard) => HAZARD_PENALTY[hazard.multiplier]);

  const raw = possible ? (total / possible) * 100 : 0;
  const penalties = sum(overloaded.map((o) => o.penalty)) + sum(hazards.map((h) => h.penalty));
  return {
    score: Math.max(0, Math.min(100, Math.round(raw - penalties))),
    raw: Math.round(raw),
    threats,
    breakdown: { overloaded, hazards, penalties },
  };
}
