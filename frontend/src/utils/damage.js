import { effectiveness } from './typeChart';
import {
  BALL_MOVES, BITE_MOVES, GRASSY_HALVED, MOLD_BREAKERS, PRIORITY_BLOCKERS, PULSE_MOVES, RECOIL_MOVES, RESIST_BERRIES,
  SLICING_MOVES, SOUND_MOVES, TYPE_BOOST_ITEMS, UNBREAKABLE_ABILITIES, WIND_MOVES, isPunch,
} from '../data/battleModifiers';

/*
  Fórmula de dano da Geração 5 em diante para batalhas simples, na ordem dos jogos. Os modificadores são em 4096 avos:
  4096 = ×1; 6144 = ×1,5; 2048 = ×0,5. Cada etapa arredonda como os jogos (metade para baixo).

  Lado (attacker/defender): { level, types, originalTypes, tera, stats, boosts, item, ability, status }
  `types` são os tipos em batalha (o Tera já aplicado); `originalTypes`, os da espécie ou forma, que valem para o STAB.
  `ability` já vem resolvida pela seção (Neutralizing Gas zera a do oponente).
  Golpe: { slug, type, category, power, priority, effectChance, hits, maxHits, crit }
  Campo: { weather, terrain, magicRoom, wonderRoom, gravity }; o clima já chega anulado por Cloud Nine e Air Lock.
  Condições do lado: { reflect, lightScreen, auroraVeil, protect, ... }
  Quem defende está com o HP cheio: Multiscale, Tera Shell e Sturdy valem.
*/

const ONE = 4096;

const pokeRound = (value) => (value % 1 > 0.5 ? Math.ceil(value) : Math.floor(value));
const applyMod = (value, mod) => pokeRound((value * mod) / ONE);
const chainMods = (mods) => mods.reduce((total, mod) => Math.round((total * mod) / ONE), ONE);

const boostMultiplier = (stage) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage));
export const applyBoost = (stat, stage) => Math.floor(stat * boostMultiplier(stage));

export const BOOST_STAGES = [6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6];

const ATE_ABILITIES = { aerilate: 'flying', pixilate: 'fairy', refrigerate: 'ice', galvanize: 'electric' };
const TYPE_ABILITY_BOOSTS = {
  transistor: ['electric', 5325],
  'dragons-maw': ['dragon', 6144],
  'rocky-payload': ['rock', 6144],
  steelworker: ['steel', 6144],
};
const TYPE_IMMUNITIES = {
  'earth-eater': 'ground',
  'flash-fire': 'fire',
  'well-baked-body': 'fire',
  'water-absorb': 'water',
  'storm-drain': 'water',
  'dry-skin': 'water',
  'volt-absorb': 'electric',
  'lightning-rod': 'electric',
  'motor-drive': 'electric',
  'sap-sipper': 'grass',
};
// Imunidades a grupos de golpes: [golpes, motivo exibido].
const MOVE_GROUP_IMMUNITIES = {
  soundproof: [SOUND_MOVES, 'Soundproof: o alvo é imune a golpes de som.'],
  bulletproof: [BALL_MOVES, 'Bulletproof: o alvo é imune a bombas e esferas.'],
  'wind-rider': [WIND_MOVES, 'Wind Rider: o alvo é imune a golpes de vento.'],
};
const TERRAIN_BOOSTS = { electric: 'electric', grassy: 'grass', psychic: 'psychic' };
const WEATHER_BALL_TYPES = { sun: 'fire', 'harsh-sun': 'fire', rain: 'water', 'heavy-rain': 'water', sand: 'rock', snow: 'ice' };
const SOLAR_MOVES = new Set(['solar-beam', 'solar-blade']);
const FACADE_STATUSES = new Set(['burn', 'poison', 'paralysis']);
const SUN = new Set(['sun', 'harsh-sun']);
const RAIN = new Set(['rain', 'heavy-rain']);
const STAT_ORDER = ['atk', 'def', 'spa', 'spd', 'spe'];

/** Item em efeito: Magic Room desliga todos. */
export const activeItem = (side, field) => (field.magicRoom ? '' : side.item);

/**
 * O que deixa o Pokémon no ar ('flying', 'levitate' ou 'air-balloon'), ou null se está no chão.
 * No ar: imune a Ground, fora dos terrenos e dos Spikes. Gravity derruba todos.
 */
export function airborneBy(side, field) {
  if (field.gravity) return null;
  if (side.types.includes('flying')) return 'flying';
  if (side.ability === 'levitate') return 'levitate';
  return activeItem(side, field) === 'air-balloon' ? 'air-balloon' : null;
}

export const isGrounded = (side, field) => !airborneBy(side, field);

/**
 * Atributo ampliado por Protosynthesis (sol) ou Quark Drive (Electric Terrain), ou pela Booster Energy:
 * o maior entre Atk, Def, SpA, SpD e Spe com estágios, desempatando nessa ordem. null quando inativo.
 */
export function paradoxStat(side, field) {
  const booster = activeItem(side, field) === 'booster-energy';
  const active = (side.ability === 'protosynthesis' && (SUN.has(field.weather) || booster))
    || (side.ability === 'quark-drive' && (field.terrain === 'electric' || booster));
  if (!active) return null;
  return STAT_ORDER.reduce((best, key) => (
    applyBoost(side.stats[key], side.boosts[key]) > applyBoost(side.stats[best], side.boosts[best]) ? key : best
  ));
}

/** Um golpe entra na conta se causa dano e tem poder (do golpe ou informado à mão). */
export const isCalculable = (move) => Boolean(move && move.category !== 'status' && move.power);

function effectiveTypeMultiplier(moveType, defenderTypes, { field, move, attackerAbility, groundHitsFlying }) {
  return defenderTypes.reduce((total, defenseType) => {
    let multiplier = effectiveness(moveType, [defenseType]);
    if (multiplier === 0 && defenseType === 'ghost' && ['normal', 'fighting'].includes(moveType)
      && ['scrappy', 'minds-eye'].includes(attackerAbility)) multiplier = 1;
    if (multiplier === 0 && defenseType === 'flying' && groundHitsFlying) multiplier = 1;
    if (move.slug === 'freeze-dry' && defenseType === 'water') multiplier = 2;
    // Strong Winds tira as fraquezas do tipo Flying.
    if (multiplier > 1 && defenseType === 'flying' && field.weather === 'strong-winds') multiplier = 1;
    return total * multiplier;
  }, 1);
}

/*
  STAB com e sem Terastal:
  - sem Tera: 1,5 nos tipos da espécie (Adaptability: 2); Protean e Libero dão STAB em qualquer golpe;
  - Tera de um tipo que já era seu: 2 (Adaptability: 2,25); Tera de outro tipo: 1,5 nele (Adaptability: 2),
    e os tipos originais continuam com 1,5;
  - Tera Stellar: 2 nos tipos originais e 1,2 nos demais.
*/
function stabOf(attacker, moveType) {
  const protean = !attacker.tera && ['protean', 'libero'].includes(attacker.ability);
  const original = protean || (attacker.originalTypes ?? attacker.types).includes(moveType);
  const adaptability = attacker.ability === 'adaptability';
  const { tera } = attacker;
  if (tera === 'stellar') return { stab: original, stabMod: original ? 8192 : 4915 };
  if (tera === moveType) {
    if (original) return { stab: true, stabMod: adaptability ? 9216 : 8192 };
    return { stab: true, stabMod: adaptability ? 8192 : 6144 };
  }
  if (!original) return { stab: false, stabMod: ONE };
  return { stab: true, stabMod: !tera && adaptability ? 8192 : 6144 };
}

/** Tipo final do golpe e se ganhou o bônus de troca de tipo (-ate e Normalize, ×1,2). */
function resolveMoveType(move, attacker, field, teraBlast) {
  if (teraBlast) return { moveType: attacker.tera, typeChanged: false };
  const moveType = move.slug === 'weather-ball' ? WEATHER_BALL_TYPES[field.weather] ?? move.type : move.type;
  if (attacker.ability === 'normalize') return { moveType: 'normal', typeChanged: true };
  const ateType = ATE_ABILITIES[attacker.ability];
  if (ateType && moveType === 'normal') return { moveType: ateType, typeChanged: true };
  if (attacker.ability === 'liquid-voice' && SOUND_MOVES.has(move.slug)) return { moveType: 'water', typeChanged: false };
  return { moveType, typeChanged: false };
}

/** Motivo de o golpe não acertar ou não causar dano antes da tabela de tipos; null se acerta. */
function immunityReason({ move, moveType, defenderAbility, defenderAirborne, defenderSide, field }) {
  if (defenderSide.protect) return 'O alvo está protegido (Protect).';
  if (field.weather === 'harsh-sun' && moveType === 'water') return 'Golpes de Water evaporam no sol extremo.';
  if (field.weather === 'heavy-rain' && moveType === 'fire') return 'Golpes de Fire se apagam na chuva torrencial.';
  if (move.priority > 0) {
    if (field.terrain === 'psychic' && !defenderAirborne) return 'Psychic Terrain bloqueia golpes de prioridade contra alvos no chão.';
    if (PRIORITY_BLOCKERS.has(defenderAbility)) return 'A habilidade do alvo bloqueia golpes de prioridade.';
  }
  if (TYPE_IMMUNITIES[defenderAbility] === moveType) return 'O alvo é imune por causa da habilidade.';
  const groupImmunity = MOVE_GROUP_IMMUNITIES[defenderAbility];
  if (groupImmunity?.[0].has(move.slug)) return groupImmunity[1];
  // Thousand Arrows acerta quem está no ar.
  if (moveType === 'ground' && move.slug !== 'thousand-arrows') {
    if (defenderAirborne === 'levitate') return 'Levitate: o alvo flutua e fica imune a Ground.';
    if (defenderAirborne === 'air-balloon') return 'O Air Balloon deixa o alvo imune a Ground.';
  }
  return null;
}

const failed = (reason, hp) => ({ rolls: [0], extraRolls: null, hits: 1, min: 0, max: 0, typeMultiplier: 0, stab: false, crit: false, hp, reason });

/**
 * Calcula os 16 resultados de um golpe (do menor para o maior) por acerto.
 * Golpes de vários acertos devolvem `hits` > 1: o total de um uso soma um resultado por acerto.
 * Com Parental Bond, `extraRolls` traz os resultados do segundo acerto (×0,25).
 */
export function calculateDamage({ attacker, defender, move, field, defenderSide }) {
  const hp = defender.stats.hp;
  const attackerItem = activeItem(attacker, field);
  const defenderItem = activeItem(defender, field);
  const breaksAbilities = MOLD_BREAKERS.has(attacker.ability);
  const defenderAbility = breaksAbilities && !UNBREAKABLE_ABILITIES.has(defender.ability) ? '' : defender.ability;
  const fieldAbilities = [attacker.ability, defender.ability];
  const teraActive = Boolean(attacker.tera) && attacker.tera !== 'stellar';
  // Tera Blast com Tera ativo vira o tipo Tera e usa o maior entre Atk e SpA (com estágios).
  const teraBlast = move.slug === 'tera-blast' && teraActive;
  const physical = teraBlast
    ? applyBoost(attacker.stats.atk, attacker.boosts.atk) > applyBoost(attacker.stats.spa, attacker.boosts.spa)
    : move.category === 'physical';

  const { moveType, typeChanged } = resolveMoveType(move, attacker, field, teraBlast);

  const attackerGrounded = isGrounded(attacker, field);
  // Com Mold Breaker o Levitate do alvo não conta: ele fica no chão, sofre Ground e os terrenos.
  const defenderAirborne = airborneBy({ ...defender, ability: defenderAbility }, field);
  const defenderGrounded = !defenderAirborne;

  const reason = immunityReason({ move, moveType, defenderAbility, defenderAirborne, defenderSide, field });
  if (reason) return failed(reason, hp);

  const groundHitsFlying = moveType === 'ground' && (field.gravity || move.slug === 'thousand-arrows');
  let typeMultiplier = effectiveTypeMultiplier(moveType, defender.types, { field, move, attackerAbility: attacker.ability, groundHitsFlying });
  if (typeMultiplier === 0) return failed('O alvo é imune a este tipo de golpe.', hp);
  if (defenderAbility === 'wonder-guard' && typeMultiplier <= 1) return failed('Wonder Guard: só golpes super efetivos acertam.', hp);
  if (defenderAbility === 'tera-shell') typeMultiplier = Math.min(typeMultiplier, 0.5);

  const crit = !['battle-armor', 'shell-armor'].includes(defenderAbility)
    && (move.crit || (attacker.ability === 'merciless' && defender.status === 'poison'));

  /* ---- poder */
  let basePower = move.power;
  if (move.slug === 'weather-ball' && WEATHER_BALL_TYPES[field.weather]) basePower *= 2;
  if (move.slug === 'facade' && FACADE_STATUSES.has(attacker.status)) basePower *= 2;
  if (move.slug === 'acrobatics' && !attackerItem) basePower *= 2;
  if (move.slug === 'hex' && (defender.status || defender.ability === 'comatose')) basePower *= 2;
  if (move.slug === 'venoshock' && defender.status === 'poison') basePower *= 2;
  // Com Tera, golpes do tipo Tera com menos de 60 de poder sobem para 60 (exceto os de vários acertos e os de prioridade).
  if (teraActive && moveType === attacker.tera && basePower < 60 && !(move.maxHits > 1) && !(move.priority > 0)) basePower = 60;

  const powerMods = [];
  if (typeChanged) powerMods.push(4915);
  if (attacker.ability === 'technician' && basePower <= 60) powerMods.push(6144);
  if (attacker.ability === 'iron-fist' && isPunch(move.slug)) powerMods.push(4915);
  if (attacker.ability === 'strong-jaw' && BITE_MOVES.has(move.slug)) powerMods.push(6144);
  if (attacker.ability === 'mega-launcher' && PULSE_MOVES.has(move.slug)) powerMods.push(6144);
  if (attacker.ability === 'sharpness' && SLICING_MOVES.has(move.slug)) powerMods.push(6144);
  if (attacker.ability === 'reckless' && RECOIL_MOVES.has(move.slug)) powerMods.push(4915);
  if (attacker.ability === 'punk-rock' && SOUND_MOVES.has(move.slug)) powerMods.push(5325);
  if (attacker.ability === 'sheer-force' && move.effectChance) powerMods.push(5325);
  if (attacker.ability === 'sand-force' && field.weather === 'sand' && ['rock', 'ground', 'steel'].includes(moveType)) powerMods.push(5325);
  if (attacker.ability === 'toxic-boost' && physical && attacker.status === 'poison') powerMods.push(6144);
  if (attacker.ability === 'flare-boost' && !physical && attacker.status === 'burn') powerMods.push(6144);
  if (attacker.ability === 'steely-spirit' && moveType === 'steel') powerMods.push(6144);
  // Fairy Aura e Dark Aura valem para os dois lados; Aura Break inverte o efeito.
  const aura = (moveType === 'fairy' && fieldAbilities.includes('fairy-aura')) || (moveType === 'dark' && fieldAbilities.includes('dark-aura'));
  if (aura) powerMods.push(fieldAbilities.includes('aura-break') ? 3072 : 5448);
  if (move.slug === 'knock-off' && defenderItem) powerMods.push(6144);
  if (SOLAR_MOVES.has(move.slug) && field.weather && !SUN.has(field.weather) && field.weather !== 'strong-winds') powerMods.push(2048);
  if (TYPE_BOOST_ITEMS[attackerItem] === moveType) powerMods.push(4915);
  if (attackerItem === 'muscle-band' && physical) powerMods.push(4505);
  if (attackerItem === 'wise-glasses' && !physical) powerMods.push(4505);
  if (attackerGrounded && TERRAIN_BOOSTS[field.terrain] === moveType) powerMods.push(5325);
  if (defenderGrounded && field.terrain === 'misty' && moveType === 'dragon') powerMods.push(2048);
  if (defenderGrounded && field.terrain === 'grassy' && GRASSY_HALVED.has(move.slug)) powerMods.push(2048);
  if (defenderAbility === 'dry-skin' && moveType === 'fire') powerMods.push(5120);
  const power = Math.max(1, applyMod(basePower, chainMods(powerMods)));

  /* ---- ataque */
  const attackKey = physical ? 'atk' : 'spa';
  let attackStage = defenderAbility === 'unaware' ? 0 : attacker.boosts[attackKey];
  if (crit) attackStage = Math.max(attackStage, 0);
  const attackMods = [];
  if (physical && ['huge-power', 'pure-power'].includes(attacker.ability)) attackMods.push(8192);
  if (physical && ['hustle', 'gorilla-tactics'].includes(attacker.ability)) attackMods.push(6144);
  if (physical && attacker.ability === 'guts' && attacker.status) attackMods.push(6144);
  if (physical && attacker.ability === 'flower-gift' && SUN.has(field.weather)) attackMods.push(6144);
  if (physical && attacker.ability === 'slow-start') attackMods.push(2048);
  if (physical && attacker.ability === 'orichalcum-pulse' && SUN.has(field.weather)) attackMods.push(5461);
  if (!physical && attacker.ability === 'hadron-engine' && field.terrain === 'electric') attackMods.push(5461);
  if (!physical && attacker.ability === 'solar-power' && SUN.has(field.weather)) attackMods.push(6144);
  if (paradoxStat(attacker, field) === attackKey) attackMods.push(5325);
  if (attacker.ability === 'water-bubble' && moveType === 'water') attackMods.push(8192);
  const typeAbilityBoost = TYPE_ABILITY_BOOSTS[attacker.ability];
  if (typeAbilityBoost?.[0] === moveType) attackMods.push(typeAbilityBoost[1]);
  // As habilidades "of Ruin" agem no campo: Mold Breaker não as desliga.
  if (physical && defender.ability === 'tablets-of-ruin' && attacker.ability !== 'tablets-of-ruin') attackMods.push(3072);
  if (!physical && defender.ability === 'vessel-of-ruin' && attacker.ability !== 'vessel-of-ruin') attackMods.push(3072);
  if (physical && attackerItem === 'choice-band') attackMods.push(6144);
  if (!physical && attackerItem === 'choice-specs') attackMods.push(6144);
  if (defenderAbility === 'thick-fat' && ['fire', 'ice'].includes(moveType)) attackMods.push(2048);
  if (defenderAbility === 'heatproof' && moveType === 'fire') attackMods.push(2048);
  if (defenderAbility === 'purifying-salt' && moveType === 'ghost') attackMods.push(2048);
  if (defenderAbility === 'water-bubble' && moveType === 'fire') attackMods.push(2048);
  const attack = Math.max(1, applyMod(applyBoost(attacker.stats[attackKey], attackStage), chainMods(attackMods)));

  /* ---- defesa (Wonder Room troca Def e SpD) */
  const defenseKey = physical !== field.wonderRoom ? 'def' : 'spd';
  const boostKey = physical ? 'def' : 'spd';
  let defenseStage = attacker.ability === 'unaware' ? 0 : defender.boosts[boostKey];
  if (crit) defenseStage = Math.min(defenseStage, 0);
  const defenseMods = [];
  if (!physical && field.weather === 'sand' && defender.types.includes('rock')) defenseMods.push(6144);
  if (physical && field.weather === 'snow' && defender.types.includes('ice')) defenseMods.push(6144);
  if (physical && attacker.ability === 'sword-of-ruin' && defender.ability !== 'sword-of-ruin') defenseMods.push(3072);
  if (!physical && attacker.ability === 'beads-of-ruin' && defender.ability !== 'beads-of-ruin') defenseMods.push(3072);
  if (defenderItem === 'eviolite') defenseMods.push(6144);
  if (!physical && defenderItem === 'assault-vest') defenseMods.push(6144);
  if (physical && defenderAbility === 'fur-coat') defenseMods.push(8192);
  if (physical && defenderAbility === 'marvel-scale' && defender.status) defenseMods.push(6144);
  if (physical && defenderAbility === 'grass-pelt' && field.terrain === 'grassy') defenseMods.push(6144);
  if (!physical && defenderAbility === 'flower-gift' && SUN.has(field.weather)) defenseMods.push(6144);
  if (paradoxStat({ ...defender, ability: defenderAbility }, field) === boostKey) defenseMods.push(5325);
  const defense = Math.max(1, applyMod(applyBoost(defender.stats[defenseKey], defenseStage), chainMods(defenseMods)));

  /* ---- modificadores finais */
  const finalMods = [];
  const screened = (physical && defenderSide.reflect) || (!physical && defenderSide.lightScreen) || defenderSide.auroraVeil;
  if (screened && !crit && attacker.ability !== 'infiltrator') finalMods.push(2048);
  if (['multiscale', 'shadow-shield'].includes(defenderAbility)) finalMods.push(2048);
  if (['filter', 'solid-rock', 'prism-armor'].includes(defenderAbility) && typeMultiplier > 1) finalMods.push(3072);
  if (defenderAbility === 'fluffy' && moveType === 'fire') finalMods.push(8192);
  if (defenderAbility === 'ice-scales' && !physical) finalMods.push(2048);
  if (defenderAbility === 'punk-rock' && SOUND_MOVES.has(move.slug)) finalMods.push(2048);
  if (attacker.ability === 'sniper' && crit) finalMods.push(6144);
  if (attacker.ability === 'tinted-lens' && typeMultiplier < 1) finalMods.push(8192);
  if (attacker.ability === 'neuroforce' && typeMultiplier > 1) finalMods.push(5120);
  if (attackerItem === 'expert-belt' && typeMultiplier > 1) finalMods.push(4915);
  if (attackerItem === 'life-orb') finalMods.push(5324);
  const berryType = RESIST_BERRIES[defenderItem];
  if (berryType === moveType && (typeMultiplier > 1 || berryType === 'normal')) finalMods.push(2048);
  const finalMod = chainMods(finalMods);

  const { stab, stabMod } = stabOf(attacker, moveType);
  const burned = physical && attacker.status === 'burn' && attacker.ability !== 'guts' && move.slug !== 'facade';

  // Dano base, Parental Bond, clima, crítico, fator aleatório, STAB, tipo, queimadura e modificadores finais.
  const rollsFor = (secondHitMod) => {
    let base = Math.floor(Math.floor((Math.floor((2 * attacker.level) / 5 + 2) * power * attack) / defense) / 50) + 2;
    if (secondHitMod) base = applyMod(base, secondHitMod);
    if (SUN.has(field.weather)) {
      if (moveType === 'fire') base = applyMod(base, 6144);
      if (moveType === 'water') base = applyMod(base, 2048);
    } else if (RAIN.has(field.weather)) {
      if (moveType === 'water') base = applyMod(base, 6144);
      if (moveType === 'fire') base = applyMod(base, 2048);
    }
    if (crit) base = applyMod(base, 6144);
    const rolls = [];
    for (let random = 85; random <= 100; random += 1) {
      let damage = Math.floor((base * random) / 100);
      damage = applyMod(damage, stabMod);
      damage = Math.floor(damage * typeMultiplier);
      if (burned) damage = Math.floor(damage / 2);
      rolls.push(Math.max(1, applyMod(damage, finalMod)));
    }
    return rolls;
  };

  const multiHit = move.maxHits > 1;
  const hits = multiHit && attacker.ability === 'skill-link' ? move.maxHits : Math.max(1, move.hits ?? 1);
  const rolls = rollsFor(null);
  const extraRolls = attacker.ability === 'parental-bond' && !multiHit ? rollsFor(1024) : null;
  return {
    rolls,
    extraRolls,
    hits,
    min: rolls[0] * hits + (extraRolls?.[0] ?? 0),
    max: rolls.at(-1) * hits + (extraRolls?.at(-1) ?? 0),
    typeMultiplier,
    stab,
    crit,
    hp,
    moveType,
    reason: null,
  };
}

/* ---------------------------------------------------------------- nocaute */

const MAX_TURNS = 4;
const SPIKES_FRACTION = [0, 1 / 8, 1 / 6, 1 / 4];
const SAND_IMMUNE_TYPES = ['rock', 'ground', 'steel'];
const SAND_IMMUNE_ABILITIES = new Set(['sand-veil', 'sand-rush', 'sand-force', 'overcoat', 'magic-guard']);

function convolve(a, b) {
  const result = new Map();
  for (const [x, px] of a) {
    for (const [y, py] of b) result.set(x + y, (result.get(x + y) ?? 0) + px * py);
  }
  return result;
}

function rollDistribution(rolls) {
  const distribution = new Map();
  for (const roll of rolls) distribution.set(roll, (distribution.get(roll) ?? 0) + 1 / rolls.length);
  return distribution;
}

function capDamage(distribution, cap) {
  const capped = new Map();
  for (const [damage, p] of distribution) capped.set(Math.min(damage, cap), (capped.get(Math.min(damage, cap)) ?? 0) + p);
  return capped;
}

function useDistribution({ rolls, hits, extraRolls }) {
  const single = rollDistribution(rolls);
  let distribution = new Map([[0, 1]]);
  for (let i = 0; i < hits; i += 1) distribution = convolve(distribution, single);
  return extraRolls ? convolve(distribution, rollDistribution(extraRolls)) : distribution;
}

/**
 * Hazards na entrada e o saldo de HP por turno (perdas menos recuperação), com o nome de cada efeito.
 * `attacker` entra pelas habilidades que ferem o oponente a cada turno (Bad Dreams).
 */
function residualEffects(defender, defenderSide, field, attacker) {
  const hp = defender.stats.hp;
  const item = activeItem(defender, field);
  const { ability } = defender;
  const magicGuard = ability === 'magic-guard';
  const grounded = isGrounded(defender, field);
  const asleep = defender.status === 'sleep' || ability === 'comatose';
  const notes = [];
  let entry = 0;
  let perTurn = 0;
  const lose = (fraction, note) => { perTurn += Math.floor(hp * fraction); notes.push(note); };
  const heal = (fraction, note) => { perTurn -= Math.floor(hp * fraction); notes.push(note); };

  if (!magicGuard && item !== 'heavy-duty-boots') {
    if (defenderSide.stealthRock) {
      entry += Math.floor((hp * effectiveness('rock', defender.types)) / 8);
      notes.push('Stealth Rock');
    }
    if (defenderSide.spikes > 0 && grounded) {
      entry += Math.floor(hp * SPIKES_FRACTION[defenderSide.spikes]);
      notes.push(`${defenderSide.spikes}× Spikes`);
    }
  }

  if (!magicGuard) {
    if (defenderSide.leechSeed && !defender.types.includes('grass')) lose(1 / 8, 'Leech Seed');
    if (field.weather === 'sand' && !defender.types.some((type) => SAND_IMMUNE_TYPES.includes(type))
      && !SAND_IMMUNE_ABILITIES.has(ability) && item !== 'safety-goggles') lose(1 / 16, 'areia');
    if (defender.status === 'burn') lose(ability === 'heatproof' ? 1 / 32 : 1 / 16, 'queimadura');
    if (defender.status === 'poison' && ability !== 'poison-heal') lose(1 / 8, 'veneno');
    if (asleep && attacker?.ability === 'bad-dreams') lose(1 / 8, 'Bad Dreams');
    if (SUN.has(field.weather) && ability === 'dry-skin') lose(1 / 8, 'Dry Skin no sol');
    if (SUN.has(field.weather) && ability === 'solar-power') lose(1 / 8, 'Solar Power');
  }

  if (defender.status === 'poison' && ability === 'poison-heal') heal(1 / 8, 'Poison Heal');
  if (RAIN.has(field.weather) && ability === 'dry-skin') heal(1 / 8, 'Dry Skin na chuva');
  if (RAIN.has(field.weather) && ability === 'rain-dish') heal(1 / 16, 'Rain Dish');
  if (field.weather === 'snow' && ability === 'ice-body') heal(1 / 16, 'Ice Body');
  if (item === 'leftovers' || (item === 'black-sludge' && defender.types.includes('poison'))) {
    heal(1 / 16, item === 'leftovers' ? 'Leftovers' : 'Black Sludge');
  } else if (item === 'black-sludge' && !magicGuard) {
    lose(1 / 8, 'Black Sludge');
  }
  if (field.terrain === 'grassy' && grounded) heal(1 / 16, 'Grassy Terrain');
  return { entry, perTurn, notes };
}

const percent = (value) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export const damagePercent = (damage, hp) => percent((damage / hp) * 100);

// Chances que arredondariam para 0% ou 100% sem ser certas ganham um limite em vez do número.
function chanceLabel(chance) {
  if (chance < 0.001) return 'menos de 0,1%';
  if (chance > 0.999) return 'mais de 99,9%';
  return `${percent(chance * 100)}%`;
}

const listNotes = (notes) => (notes.length > 1 ? `${notes.slice(0, -1).join(', ')} e ${notes.at(-1)}` : notes[0]);

/** Sturdy segura o primeiro golpe com 1 HP: só com HP cheio, contra um acerto só e sem Mold Breaker. */
const sturdyHolds = (result, defender, attacker, entry) => defender.ability === 'sturdy' && entry === 0
  && result.hits === 1 && !result.extraRolls && !MOLD_BREAKERS.has(attacker?.ability);

/**
 * Em quantos usos do golpe o alvo cai, em até 4, contando hazards na entrada e o saldo de HP
 * entre um turno e outro. Devolve { text, turns, chance } com chance de 0 a 1.
 */
export function describeKnockout(result, { attacker, defender, defenderSide, field }) {
  if (result.reason) return { text: result.reason, turns: null, chance: 0 };

  const { hp } = result;
  const { entry, perTurn, notes } = residualEffects(defender, defenderSide, field, attacker);
  const use = useDistribution(result);
  const sturdy = sturdyHolds(result, defender, attacker, entry);
  const allNotes = sturdy ? [...notes, 'Sturdy'] : notes;
  const suffix = allNotes.length ? ` (com ${listNotes(allNotes)})` : '';
  // Com Sturdy, o primeiro uso deixa o alvo com pelo menos 1 HP.
  const firstUse = sturdy ? capDamage(use, hp - 1) : use;

  let total = firstUse;
  for (let turns = 1; turns <= MAX_TURNS; turns += 1) {
    if (turns > 1) total = convolve(total, use);
    // HP que ainda falta tirar depois dos hazards e do saldo dos turnos anteriores; a recuperação não passa do HP cheio.
    const needed = Math.min(hp, hp - entry - (turns - 1) * perTurn);
    let chance = 0;
    for (const [damage, probability] of total) if (damage >= needed) chance += probability;
    if (chance > 1e-9) {
      const label = turns === 1 ? 'OHKO' : `${turns}HKO`;
      const text = chance > 1 - 1e-9 ? `${label} garantido` : `${chanceLabel(chance)} de chance de ${label}`;
      return { text: `${text}${suffix}.`, turns, chance: Math.min(chance, 1) };
    }
  }

  const average = (result.min + result.max) / 2;
  const estimate = perTurn < 0 && average <= -perTurn ? null : Math.ceil(hp / Math.max(average - Math.max(-perTurn, 0), 1));
  return {
    text: estimate ? `Cerca de ${estimate}HKO${suffix}.` : `Não derruba: a recuperação cobre o dano${suffix}.`,
    turns: null,
    chance: 0,
  };
}

/* ---------------------------------------------------------------- velocidade */

/** Velocidade efetiva em batalha: estágios, Choice Scarf, Tailwind, paralisia e habilidades de clima e terreno. */
export function calcSpeed(side, sideConditions, field) {
  const item = activeItem(side, field);
  let speed = applyBoost(side.stats.spe, side.boosts.spe);
  const mods = [];
  if (item === 'choice-scarf') mods.push(6144);
  if (sideConditions.tailwind) mods.push(8192);
  if (side.ability === 'swift-swim' && RAIN.has(field.weather)) mods.push(8192);
  if (side.ability === 'chlorophyll' && SUN.has(field.weather)) mods.push(8192);
  if (side.ability === 'sand-rush' && field.weather === 'sand') mods.push(8192);
  if (side.ability === 'slush-rush' && field.weather === 'snow') mods.push(8192);
  if (side.ability === 'surge-surfer' && field.terrain === 'electric') mods.push(8192);
  if (side.ability === 'quick-feet' && side.status) mods.push(6144);
  if (side.ability === 'slow-start') mods.push(2048);
  if (paradoxStat(side, field) === 'spe') mods.push(6144);
  speed = applyMod(speed, chainMods(mods));
  if (side.status === 'paralysis' && side.ability !== 'quick-feet') speed = Math.floor(speed / 2);
  return speed;
}
