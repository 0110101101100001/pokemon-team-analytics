import { effectiveness } from '../data/typeChart';
import {
  BALL_MOVES, BITE_MOVES, GRASSY_HALVED, MOLD_BREAKERS, PRIORITY_BLOCKERS, PULSE_MOVES, RECOIL_MOVES, RESIST_BERRIES,
  SLICING_MOVES, SOUND_MOVES, TYPE_BOOST_ITEMS, UNBREAKABLE_ABILITIES, WIND_MOVES, boostedBySheerForce, isPunch,
} from '../data/battleModifiers';
import { NATURAL_GIFT } from '../data/battleModifiers';
import { DRIVE_TYPES, MEMORY_TYPES, PLATE_TYPES, heldForGood } from '../data/formItems';
import { turnsLeft } from './durations';
import { baseMaxHp, hpRatio, withoutDynamax } from './dynamax';
import { currentHp, fixedDamage, hiddenPowerType, variablePower } from './variablePower';

/*
  Fórmula de dano da Geração 5 em diante para batalhas simples, na ordem dos jogos. Os modificadores são em 4096 avos:
  4096 = ×1; 6144 = ×1,5; 2048 = ×0,5. Cada etapa arredonda como os jogos (metade para baixo).

  Lado (attacker/defender): { level, types, originalTypes, tera, stats, boosts, item, ability, status }, e para os golpes de
  poder variável e dano fixo (utils/variablePower): { weight, currentHp, ivs, baseStats, lastHit, toxicTurns };
  `dynamax` e `baseHp` vêm de utils/dynamax e `volatiles`, dos G-Max (utils/moveEffects);
  `species` é o nome na PokéAPI, para golpes e itens que dependem da forma;
  `turnsOut` conta os turnos do lado em campo (Fake Out e First Impression só valem no primeiro).
  `types` são os tipos em batalha (o Tera já aplicado); `originalTypes`, os da espécie ou forma, que valem para o STAB.
  `ability` já vem resolvida pela seção (Neutralizing Gas zera a do oponente).
  Golpe: { slug, type, category, power, priority, effectChance, hits, maxHits, crit }; Z e Max já chegam com o tipo
  decidido por poweredType.
  Campo: { weather, terrain, magicRoom, wonderRoom, gravity, trickRoom }; o clima já chega anulado por Cloud Nine e Air Lock.
  Trick Room não muda o dano: só inverte quem age primeiro, o que a calculadora mostra ao lado da velocidade.
  Condições do lado: { reflect, lightScreen, auroraVeil, protect, ... }
  PS atuais: `currentHp` (sem ele, cheio). Multiscale, Shadow Shield, Tera Shell e Sturdy só valem com os PS cheios.
*/

const ONE = 4096;
const NO_SIDE_CONDITIONS = { tailwind: false };

const pokeRound = (value) => (value % 1 > 0.5 ? Math.ceil(value) : Math.floor(value));
const applyMod = (value, mod) => pokeRound((value * mod) / ONE);
const chainMods = (mods) => mods.reduce((total, mod) => Math.round((total * mod) / ONE), ONE);

const boostMultiplier = (stage) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage));
export const applyBoost = (stat, stage) => Math.floor(stat * boostMultiplier(stage));

export const BOOST_STAGES = [6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6];

const ATE_ABILITIES = { aerilate: 'flying', pixilate: 'fairy', refrigerate: 'ice', galvanize: 'electric' };
// Mantêm o próprio tipo com -ate e Normalize; virando Max, a exceção não vale.
const ATE_EXEMPT = new Set(['judgment', 'multi-attack', 'natural-gift', 'revelation-dance', 'techno-blast', 'terrain-pulse', 'weather-ball']);
const NORMALIZE_EXEMPT = new Set([...ATE_EXEMPT, 'hidden-power', 'struggle']);
const ITEM_TYPED_MOVES = { judgment: PLATE_TYPES, 'multi-attack': MEMORY_TYPES, 'techno-blast': DRIVE_TYPES };
const FORM_TYPED_MOVES = {
  'ivy-cudgel': { 'ogerpon-wellspring-mask': 'water', 'ogerpon-hearthflame-mask': 'fire', 'ogerpon-cornerstone-mask': 'rock' },
  'raging-bull': { 'tauros-paldea-combat-breed': 'fighting', 'tauros-paldea-blaze-breed': 'fire', 'tauros-paldea-aqua-breed': 'water' },
  'aura-wheel': { 'morpeko-hangry': 'dark' },
};
// Estes G-Max atravessam Protect com o dano inteiro.
const FULL_THROUGH_PROTECT = new Set(['g-max-one-blow', 'g-max-rapid-flow']);
const THROUGH_MAX_GUARD = new Set([...FULL_THROUGH_PROTECT, 'feint', 'future-sight', 'doom-desire']);
// Dobram contra quem está em Dynamax.
const ANTI_DYNAMAX = new Set(['behemoth-blade', 'behemoth-bash', 'dynamax-cannon']);
// Dano por turno dos G-Max: [nome, tipo imune].
const GMAX_DAMAGE = {
  'g-max-wildfire': ['G-Max Wildfire', 'fire'],
  'g-max-vine-lash': ['G-Max Vine Lash', 'grass'],
  'g-max-cannonade': ['G-Max Cannonade', 'water'],
  'g-max-volcalith': ['G-Max Volcalith', 'rock'],
};
const TRAP_NAMES = {
  'g-max-centiferno': 'G-Max Centiferno', 'g-max-sandblast': 'G-Max Sandblast',
  bind: 'Bind', wrap: 'Wrap', clamp: 'Clamp', 'fire-spin': 'Fire Spin', whirlpool: 'Whirlpool', 'sand-tomb': 'Sand Tomb',
  'magma-storm': 'Magma Storm', infestation: 'Infestation', 'snap-trap': 'Snap Trap', 'thunder-cage': 'Thunder Cage',
};
// Derrubam as telas antes de causar o dano.
export const SCREEN_BREAKERS = new Set(['brick-break', 'psychic-fangs', 'raging-bull']);
const IGNORES_ABILITY = new Set(['g-max-drum-solo', 'g-max-fireball', 'g-max-hydrosnipe']);
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
const FORECAST_TYPES = { sun: 'fire', 'harsh-sun': 'fire', rain: 'water', 'heavy-rain': 'water', snow: 'ice' };
const SOLAR_MOVES = new Set(['solar-beam', 'solar-blade']);
// Golpes especiais que acertam a Def do alvo.
const HITS_DEFENSE = new Set(['psyshock', 'psystrike', 'secret-sword']);
const ALWAYS_CRIT = new Set(['wicked-blow', 'surging-strikes', 'flower-trick', 'frost-breath', 'storm-throw', 'zippy-zap']);
// Super efetivos ganham ×1,33 (5461/4096).
const SUPER_EFFECTIVE_BOOST = new Set(['collision-course', 'electro-drift']);
// Dobram de poder quando o usuário age antes do alvo.
const FIRST_STRIKE_MOVES = new Set(['bolt-beak', 'fishious-rend']);
const TERRAIN_PULSE_TYPES = { electric: 'electric', grassy: 'grass', misty: 'fairy', psychic: 'psychic' };
// Só funcionam no primeiro turno do usuário em campo (`turnsOut` 0).
export const FIRST_TURN_MOVES = new Set(['fake-out', 'first-impression']);
const FACADE_STATUSES = new Set(['burn', 'poison', 'toxic', 'paralysis']);
const isPoisoned = (side) => side.status === 'poison' || side.status === 'toxic';
const SUN = new Set(['sun', 'harsh-sun']);
const RAIN = new Set(['rain', 'heavy-rain']);
const STAT_ORDER = ['atk', 'def', 'spa', 'spd', 'spe'];

/** Item em efeito: Magic Room desliga todos; Klutz, o do próprio Pokémon. */
export const activeItem = (side, field) => (field.magicRoom || side.ability === 'klutz' ? '' : side.item);

/** Se o usuário está em Dynamax ao usar o golpe: Choice e Gorilla Tactics param de valer e ele não recua. */
export const isDynamaxed = (move) => move?.powered === 'max' || move?.powered === 'gmax';

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

/** O lado com o tipo que o clima lhe dá: Castform com Forecast. */
export function withWeatherType(side, field) {
  if (side.species !== 'castform' || side.ability !== 'forecast') return side;
  const originalTypes = [FORECAST_TYPES[field.weather] ?? 'normal'];
  return { ...side, originalTypes, types: side.tera && side.tera !== 'stellar' ? side.types : originalTypes };
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

/**
 * Todo golpe de dano entra na conta, com poder fixo ou não; o poder variável é resolvido em calculateDamage,
 * que devolve um motivo quando não sabe calculá-lo.
 */
export const isCalculable = (move) => Boolean(move && move.category !== 'status');

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

/** Tipo que o próprio golpe assume na batalha, antes das habilidades. */
function ownType(move, attacker, field) {
  if (move.slug === 'tera-blast' && attacker.tera && attacker.tera !== 'stellar') return attacker.tera;
  if (move.slug === 'weather-ball') return WEATHER_BALL_TYPES[field.weather] ?? move.type;
  if (move.slug === 'hidden-power' && attacker.ivs) return hiddenPowerType(attacker.ivs);
  const item = activeItem(attacker, field);
  if (ITEM_TYPED_MOVES[move.slug]) return ITEM_TYPED_MOVES[move.slug][item] ?? move.type;
  if (FORM_TYPED_MOVES[move.slug]) return FORM_TYPED_MOVES[move.slug][attacker.species] ?? move.type;
  if (move.slug === 'revelation-dance') return attacker.types[0] ?? move.type;
  if (move.slug === 'natural-gift' && NATURAL_GIFT[item]) return NATURAL_GIFT[item].type;
  if (move.slug === 'terrain-pulse' && isGrounded(attacker, field)) return TERRAIN_PULSE_TYPES[field.terrain] ?? move.type;
  return move.type;
}

/** Tipo dado por -ate ou Normalize a um golpe que já está com `type`; null se a habilidade não age nele. */
function abilityType(move, type, attacker, toMax = false) {
  if (move.slug === 'tera-blast' && attacker.tera) return null;
  const normalize = attacker.ability === 'normalize';
  if (!toMax && (normalize ? NORMALIZE_EXEMPT : ATE_EXEMPT).has(move.slug)) return null;
  if (normalize) return 'normal';
  return type === 'normal' ? ATE_ABILITIES[attacker.ability] ?? null : null;
}

/**
 * Tipo com que o golpe vira Z ou Max, que decide qual golpe ele vira. No Z só a Weather Ball muda de tipo e as
 * habilidades não agem; no Max (e G-Max) valem o tipo do próprio golpe e as habilidades.
 */
export function poweredType(move, mode, attacker, field) {
  if (mode === 'z') return move.slug === 'weather-ball' ? ownType(move, attacker, field) : move.type;
  const type = ownType(move, attacker, field);
  return abilityType(move, type, attacker, true) ?? type;
}

/** Tipo final do golpe e se ganhou o bônus de troca de tipo (-ate e Normalize, ×1,2). */
function resolveMoveType(move, attacker, field) {
  // Z e Max já vêm com o tipo. O Normalize age de novo sobre o Max, e só por isso ele ganha o bônus; as -ate, não.
  if (move.powered) {
    return { moveType: move.type, typeChanged: move.powered !== 'z' && attacker.ability === 'normalize' };
  }
  const moveType = ownType(move, attacker, field);
  const changedType = abilityType(move, moveType, attacker);
  if (changedType) return { moveType: changedType, typeChanged: true };
  if (attacker.ability === 'liquid-voice' && SOUND_MOVES.has(move.slug)) return { moveType: 'water', typeChanged: false };
  return { moveType, typeChanged: false };
}

/** Tipo para exibir: o que entra na conta; golpes de status mostram o próprio. */
export const battleTypeOf = (move, attacker, field) => (
  attacker && isCalculable(move) ? resolveMoveType(move, attacker, field).moveType : move.type
);

/** Motivo de o golpe não acertar ou não causar dano antes da tabela de tipos; null se acerta. */
function immunityReason({ attacker, move, moveType, defenderAbility, defenderAirborne, defenderSide, field }) {
  if (FIRST_TURN_MOVES.has(move.slug) && attacker.turnsOut > 0) return 'Só funciona no primeiro turno do usuário em campo.';
  // Golpes Z e Max atravessam Protect, com 1/4 do dano (ver os modificadores finais).
  if (defenderSide.maxGuard && !THROUGH_MAX_GUARD.has(move.slug)) return 'O alvo está protegido (Max Guard).';
  if (defenderSide.protect && !move.powered) return 'O alvo está protegido (Protect).';
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
 * Se o usuário age antes do alvo: no turno simulado vem de `targetMoved`; fora dele, pela velocidade
 * (Trick Room inverte; empate não conta, porque é sorteado).
 */
function strikesFirst(attackerSpeed, defenderSpeed, field, targetMoved) {
  if (targetMoved !== undefined) return !targetMoved;
  if (attackerSpeed === defenderSpeed) return false;
  return (attackerSpeed > defenderSpeed) !== Boolean(field.trickRoom);
}

/**
 * Calcula os 16 resultados de um golpe (do menor para o maior) por acerto.
 * Golpes de vários acertos devolvem `hits` > 1: o total de um uso soma um resultado por acerto.
 * Com Parental Bond, `extraRolls` traz os resultados do segundo acerto (×0,25).
 */
export function calculateDamage({ attacker: user, defender: target, move, field, defenderSide, attackerSide = NO_SIDE_CONDITIONS, targetMoved }) {
  const attacker = withWeatherType(user, field);
  const defender = withWeatherType(target, field);
  const hp = defender.stats.hp;
  const attackerItem = activeItem(attacker, field);
  const defenderItem = activeItem(defender, field);
  const breaksAbilities = MOLD_BREAKERS.has(attacker.ability) || IGNORES_ABILITY.has(move.slug);
  const defenderAbility = breaksAbilities && !UNBREAKABLE_ABILITIES.has(defender.ability) ? '' : defender.ability;
  const fieldAbilities = [attacker.ability, defender.ability];
  const teraActive = Boolean(attacker.tera) && attacker.tera !== 'stellar';
  // Tera Blast com Tera ativo vira o tipo Tera e usa o maior entre Atk e SpA (com estágios).
  const teraBlast = move.slug === 'tera-blast' && teraActive;
  const physical = teraBlast
    ? applyBoost(attacker.stats.atk, attacker.boosts.atk) > applyBoost(attacker.stats.spa, attacker.boosts.spa)
    : move.category === 'physical';

  const { moveType, typeChanged } = resolveMoveType(move, attacker, field);

  const attackerGrounded = isGrounded(attacker, field);
  // Com Mold Breaker o Levitate do alvo não conta: ele fica no chão, sofre Ground e os terrenos.
  const defenderAirborne = airborneBy({ ...defender, ability: defenderAbility }, field);
  const defenderGrounded = !defenderAirborne;

  const reason = immunityReason({ attacker, move, moveType, defenderAbility, defenderAirborne, defenderSide, field });
  if (reason) return failed(reason, hp);

  const groundHitsFlying = moveType === 'ground' && (field.gravity || move.slug === 'thousand-arrows');
  let typeMultiplier = effectiveTypeMultiplier(moveType, defender.types, { field, move, attackerAbility: attacker.ability, groundHitsFlying });
  if (typeMultiplier === 0) return failed('O alvo é imune a este tipo de golpe.', hp);
  if (defenderAbility === 'wonder-guard' && typeMultiplier <= 1) return failed('Wonder Guard: só golpes super efetivos acertam.', hp);
  const defenderFull = currentHp(defender) === hp;
  if (defenderAbility === 'tera-shell' && defenderFull) typeMultiplier = Math.min(typeMultiplier, 0.5);

  // Dano fixo (Seismic Toss, Super Fang, Counter, OHKO…): só a imunidade de tipo vale; o resto da fórmula não.
  const fixed = fixedDamage(move, { attacker, defender, defenderAbility });
  if (fixed?.reason) return failed(fixed.reason, hp);
  if (fixed) {
    return {
      rolls: fixed.rolls, extraRolls: null, hits: 1, min: fixed.rolls[0], max: fixed.rolls.at(-1),
      typeMultiplier, stab: false, crit: false, hp, moveType, fixed, variablePower: null, reason: null,
    };
  }

  const crit = !['battle-armor', 'shell-armor'].includes(defenderAbility)
    && (move.crit || ALWAYS_CRIT.has(move.slug) || attacker.volatiles?.critStage >= 3 || (attacker.ability === 'merciless' && isPoisoned(defender)));

  /* ---- poder */
  const attackerSpeed = calcSpeed(attacker, attackerSide, field);
  const defenderSpeed = calcSpeed(defender, defenderSide, field);
  const variable = move.power ? null : variablePower(move, { attacker, defender, attackerItem, attackerSpeed, defenderSpeed });
  if (variable?.reason) return failed(variable.reason, hp);
  let basePower = variable ? variable.power : move.power;
  if (move.slug === 'weather-ball' && WEATHER_BALL_TYPES[field.weather]) basePower *= 2;
  if (move.slug === 'facade' && FACADE_STATUSES.has(attacker.status)) basePower *= 2;
  if (move.slug === 'acrobatics' && !attacker.item) basePower *= 2;
  if (move.slug === 'hex' && (defender.status || defender.ability === 'comatose')) basePower *= 2;
  if (move.slug === 'venoshock' && isPoisoned(defender)) basePower *= 2;
  if (move.slug === 'barb-barrage' && isPoisoned(defender)) basePower *= 2;
  if (move.slug === 'infernal-parade' && (defender.status || defender.ability === 'comatose')) basePower *= 2;
  if (move.slug === 'smelling-salts' && defender.status === 'paralysis') basePower *= 2;
  if (move.slug === 'wake-up-slap' && defender.status === 'sleep') basePower *= 2;
  if (FIRST_STRIKE_MOVES.has(move.slug) && strikesFirst(attackerSpeed, defenderSpeed, field, targetMoved)) basePower *= 2;
  if (move.slug === 'brine' && currentHp(defender) * 2 <= hp) basePower *= 2;
  if (move.slug === 'rising-voltage' && field.terrain === 'electric' && defenderGrounded) basePower *= 2;
  if (move.slug === 'terrain-pulse' && field.terrain && attackerGrounded) basePower *= 2;
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
  if (attacker.ability === 'sheer-force' && boostedBySheerForce(move)) powerMods.push(5325);
  if (attacker.ability === 'sand-force' && field.weather === 'sand' && ['rock', 'ground', 'steel'].includes(moveType)) powerMods.push(5325);
  if (attacker.ability === 'toxic-boost' && physical && isPoisoned(attacker)) powerMods.push(6144);
  if (attacker.ability === 'flare-boost' && !physical && attacker.status === 'burn') powerMods.push(6144);
  if (attacker.ability === 'steely-spirit' && moveType === 'steel') powerMods.push(6144);
  // Fairy Aura e Dark Aura valem para os dois lados; Aura Break inverte o efeito.
  const aura = (moveType === 'fairy' && fieldAbilities.includes('fairy-aura')) || (moveType === 'dark' && fieldAbilities.includes('dark-aura'));
  if (aura) powerMods.push(fieldAbilities.includes('aura-break') ? 3072 : 5448);
  // Knock Off olha o item segurado, mesmo desligado, e só ganha o bônus se puder tirá-lo.
  if (move.slug === 'knock-off' && defender.item && ![attacker, defender].some((side) => heldForGood(side.species, defender.item))) {
    powerMods.push(6144);
  }
  if (move.slug === 'expanding-force' && field.terrain === 'psychic' && attackerGrounded) powerMods.push(6144);
  if (move.slug === 'misty-explosion' && field.terrain === 'misty' && attackerGrounded) powerMods.push(6144);
  if (move.slug === 'psyblade' && field.terrain === 'electric') powerMods.push(6144);
  if (move.slug === 'grav-apple' && field.gravity) powerMods.push(6144);
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
  // Body Press usa a Def do usuário; Foul Play, o Atk e os estágios do alvo.
  const attackKey = move.slug === 'body-press' ? 'def' : physical ? 'atk' : 'spa';
  const attackSource = move.slug === 'foul-play' ? defender : attacker;
  let attackStage = defenderAbility === 'unaware' ? 0 : attackSource.boosts[attackKey];
  if (crit) attackStage = Math.max(attackStage, 0);
  const attackMods = [];
  const dynamaxed = Boolean(attacker.dynamax) || isDynamaxed(move);
  if (physical && ['huge-power', 'pure-power'].includes(attacker.ability)) attackMods.push(8192);
  if (physical && (attacker.ability === 'hustle' || (attacker.ability === 'gorilla-tactics' && !dynamaxed))) attackMods.push(6144);
  if (physical && attacker.ability === 'guts' && attacker.status) attackMods.push(6144);
  if (physical && attacker.ability === 'flower-gift' && SUN.has(field.weather)) attackMods.push(6144);
  if (physical && attacker.ability === 'slow-start') attackMods.push(2048);
  if (physical && attacker.ability === 'orichalcum-pulse' && SUN.has(field.weather)) attackMods.push(5461);
  if (!physical && attacker.ability === 'hadron-engine' && field.terrain === 'electric') attackMods.push(5461);
  if (!physical && attacker.ability === 'solar-power' && SUN.has(field.weather)) attackMods.push(6144);
  if (paradoxStat(attacker, field) === attackKey && move.slug !== 'foul-play') attackMods.push(5325);
  if (attacker.ability === 'water-bubble' && moveType === 'water') attackMods.push(8192);
  const typeAbilityBoost = TYPE_ABILITY_BOOSTS[attacker.ability];
  if (typeAbilityBoost?.[0] === moveType) attackMods.push(typeAbilityBoost[1]);
  // As habilidades "of Ruin" agem no campo: Mold Breaker não as desliga.
  if (physical && defender.ability === 'tablets-of-ruin' && attacker.ability !== 'tablets-of-ruin') attackMods.push(3072);
  if (!physical && defender.ability === 'vessel-of-ruin' && attacker.ability !== 'vessel-of-ruin') attackMods.push(3072);
  if (physical && !dynamaxed && attackerItem === 'choice-band') attackMods.push(6144);
  if (!physical && !dynamaxed && attackerItem === 'choice-specs') attackMods.push(6144);
  if (defenderAbility === 'thick-fat' && ['fire', 'ice'].includes(moveType)) attackMods.push(2048);
  if (defenderAbility === 'heatproof' && moveType === 'fire') attackMods.push(2048);
  if (defenderAbility === 'purifying-salt' && moveType === 'ghost') attackMods.push(2048);
  if (defenderAbility === 'water-bubble' && moveType === 'fire') attackMods.push(2048);
  const attack = Math.max(1, applyMod(applyBoost(attackSource.stats[attackKey], attackStage), chainMods(attackMods)));

  /* ---- defesa (Wonder Room troca Def e SpD; Psyshock, Psystrike e Secret Sword são especiais que acertam a Def) */
  const hitsDef = physical || HITS_DEFENSE.has(move.slug);
  const defenseKey = hitsDef !== field.wonderRoom ? 'def' : 'spd';
  const boostKey = hitsDef ? 'def' : 'spd';
  let defenseStage = attacker.ability === 'unaware' ? 0 : defender.boosts[boostKey];
  if (crit) defenseStage = Math.min(defenseStage, 0);
  const defenseMods = [];
  if (!hitsDef && field.weather === 'sand' && defender.types.includes('rock')) defenseMods.push(6144);
  if (hitsDef && field.weather === 'snow' && defender.types.includes('ice')) defenseMods.push(6144);
  if (physical && attacker.ability === 'sword-of-ruin' && defender.ability !== 'sword-of-ruin') defenseMods.push(3072);
  if (!physical && attacker.ability === 'beads-of-ruin' && defender.ability !== 'beads-of-ruin') defenseMods.push(3072);
  if (defenderItem === 'eviolite') defenseMods.push(6144);
  if (!hitsDef && defenderItem === 'assault-vest') defenseMods.push(6144);
  if (hitsDef && defenderAbility === 'fur-coat') defenseMods.push(8192);
  if (hitsDef && defenderAbility === 'marvel-scale' && defender.status) defenseMods.push(6144);
  if (hitsDef && defenderAbility === 'grass-pelt' && field.terrain === 'grassy') defenseMods.push(6144);
  if (!hitsDef && defenderAbility === 'flower-gift' && SUN.has(field.weather)) defenseMods.push(6144);
  if (paradoxStat({ ...defender, ability: defenderAbility }, field) === boostKey) defenseMods.push(5325);
  const defense = Math.max(1, applyMod(applyBoost(defender.stats[defenseKey], defenseStage), chainMods(defenseMods)));

  /* ---- modificadores finais */
  const finalMods = [];
  const screened = (physical && defenderSide.reflect) || (!physical && defenderSide.lightScreen) || defenderSide.auroraVeil;
  if (screened && !crit && attacker.ability !== 'infiltrator' && !SCREEN_BREAKERS.has(move.slug)) finalMods.push(2048);
  if (move.powered && defenderSide.protect && !FULL_THROUGH_PROTECT.has(move.slug)) finalMods.push(1024);
  if (defenderFull && ['multiscale', 'shadow-shield'].includes(defenderAbility)) finalMods.push(2048);
  if (['filter', 'solid-rock', 'prism-armor'].includes(defenderAbility) && typeMultiplier > 1) finalMods.push(3072);
  if (defenderAbility === 'fluffy' && moveType === 'fire') finalMods.push(8192);
  if (defenderAbility === 'ice-scales' && !physical) finalMods.push(2048);
  if (defenderAbility === 'punk-rock' && SOUND_MOVES.has(move.slug)) finalMods.push(2048);
  if (attacker.ability === 'sniper' && crit) finalMods.push(6144);
  if (attacker.ability === 'tinted-lens' && typeMultiplier < 1) finalMods.push(8192);
  if (attacker.ability === 'neuroforce' && typeMultiplier > 1) finalMods.push(5120);
  if (SUPER_EFFECTIVE_BOOST.has(move.slug) && typeMultiplier > 1) finalMods.push(5461);
  if (attackerItem === 'expert-belt' && typeMultiplier > 1) finalMods.push(4915);
  if (attackerItem === 'life-orb') finalMods.push(5324);
  if (defender.dynamax && ANTI_DYNAMAX.has(move.slug)) finalMods.push(8192);
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
      if (moveType === 'water') base = applyMod(base, move.slug === 'hydro-steam' ? 6144 : 2048);
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
  // Parental Bond não dá o segundo golpe a golpes Z e Max.
  const extraRolls = attacker.ability === 'parental-bond' && !multiHit && !move.powered ? rollsFor(1024) : null;
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
    breaksAbilities,
    fixed: null,
    // Golpe de poder variável: o poder usado e de onde ele veio.
    variablePower: variable,
    reason: null,
  };
}

/** Dano médio de se acertar na confusão: físico, 40 de poder, sem tipo. */
export function confusionDamage(side) {
  const attack = applyBoost(side.stats.atk, side.boosts.atk);
  const defense = applyBoost(side.stats.def, side.boosts.def);
  const base = Math.floor(Math.floor((Math.floor((2 * side.level) / 5 + 2) * 40 * attack) / defense) / 50) + 2;
  // O fator aleatório vai de 85% a 100%.
  return Math.max(1, Math.floor(base * 0.925));
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

/** Saldo perdido do fim do turno `from` + 1 ao fim do turno `to`, com as perdas que têm prazo. */
const drainBetween = ({ perTurn, timed }, from, to) => perTurn * (to - from)
  + timed.reduce((total, { amount, turns }) => total + amount * Math.max(0, Math.min(to, turns) - Math.min(from, turns)), 0);

function capDamage(distribution, cap) {
  const capped = new Map();
  for (const [damage, p] of distribution) capped.set(Math.min(damage, cap), (capped.get(Math.min(damage, cap)) ?? 0) + p);
  return capped;
}

function perUseDistribution({ rolls, hits, extraRolls }) {
  const single = rollDistribution(rolls);
  let distribution = new Map([[0, 1]]);
  for (let i = 0; i < hits; i += 1) distribution = convolve(distribution, single);
  return extraRolls ? convolve(distribution, rollDistribution(extraRolls)) : distribution;
}

/**
 * Hazards na entrada e o saldo de HP por turno (perdas menos recuperação), com o nome de cada efeito.
 * `attacker` entra pelas habilidades que ferem o oponente a cada turno (Bad Dreams).
 */
export function residualEffects(side, defenderSide, field, attacker) {
  const defender = withWeatherType(side, field);
  const hp = baseMaxHp(defender);
  const item = activeItem(defender, field);
  const { ability } = defender;
  const magicGuard = ability === 'magic-guard';
  const grounded = isGrounded(defender, field);
  const asleep = defender.status === 'sleep' || ability === 'comatose';
  const notes = [];
  // `timed`: perdas com prazo, { amount, turns }, que não entram em perTurn.
  const timed = [];
  let entry = 0;
  let perTurn = 0;
  // `ticks`: quantas vezes ainda acontece, para o que tem prazo.
  const change = (amount, note, ticks = null) => {
    if (ticks === 0) return;
    if (ticks) timed.push({ amount, turns: ticks });
    else perTurn += amount;
    notes.push(note);
  };
  const lose = (fraction, note, ticks) => change(Math.floor(hp * fraction), note, ticks);
  const heal = (fraction, note, ticks) => change(-Math.floor(hp * fraction), note, ticks);
  // O clima acaba antes de agir no último turno; o terreno, depois.
  const weatherLeft = turnsLeft(field, 'weather');
  const weatherTicks = weatherLeft ? weatherLeft - 1 : null;
  const terrainTicks = turnsLeft(field, 'terrain') || null;

  if (!magicGuard && item !== 'heavy-duty-boots') {
    if (defenderSide.stealthRock) {
      entry += Math.floor((hp * effectiveness('rock', defender.types)) / 8);
      notes.push('Stealth Rock');
    }
    if (defenderSide.steelsurge) {
      entry += Math.floor((hp * effectiveness('steel', defender.types)) / 8);
      notes.push('Steelsurge');
    }
    if (defenderSide.spikes > 0 && grounded) {
      entry += Math.floor(hp * SPIKES_FRACTION[defenderSide.spikes]);
      notes.push(`${defenderSide.spikes}× Spikes`);
    }
  }

  if (!magicGuard) {
    const lasting = defenderSide.gmaxDamage;
    if (lasting && !defender.types.includes(GMAX_DAMAGE[lasting.slug][1])) {
      timed.push({ amount: Math.floor(hp / 6), turns: lasting.turns });
      notes.push(GMAX_DAMAGE[lasting.slug][0]);
    }
    const trap = defender.volatiles?.trap;
    if (trap) {
      timed.push({ amount: Math.floor(hp / 8), turns: trap.turns });
      notes.push(TRAP_NAMES[trap.slug]);
    }
    if (defenderSide.leechSeed && !defender.types.includes('grass')) lose(1 / 8, 'Leech Seed');
    if (field.weather === 'sand' && !defender.types.some((type) => SAND_IMMUNE_TYPES.includes(type))
      && !SAND_IMMUNE_ABILITIES.has(ability) && item !== 'safety-goggles') lose(1 / 16, 'areia', weatherTicks);
    if (defender.status === 'burn') lose(ability === 'heatproof' ? 1 / 32 : 1 / 16, 'queimadura');
    if (defender.status === 'poison' && ability !== 'poison-heal') lose(1 / 8, 'veneno');
    // Veneno forte: 1/16 no primeiro turno, 2/16 no segundo… até 15/16.
    if (defender.status === 'toxic' && ability !== 'poison-heal') lose(Math.min(15, (defender.toxicTurns ?? 0) + 1) / 16, 'veneno forte');
    if (asleep && attacker?.ability === 'bad-dreams') lose(1 / 8, 'Bad Dreams');
    if (SUN.has(field.weather) && ability === 'dry-skin') lose(1 / 8, 'Dry Skin no sol', weatherTicks);
    if (SUN.has(field.weather) && ability === 'solar-power') lose(1 / 8, 'Solar Power', weatherTicks);
  }

  if (isPoisoned(defender) && ability === 'poison-heal') heal(1 / 8, 'Poison Heal');
  if (RAIN.has(field.weather) && ability === 'dry-skin') heal(1 / 8, 'Dry Skin na chuva', weatherTicks);
  if (RAIN.has(field.weather) && ability === 'rain-dish') heal(1 / 16, 'Rain Dish', weatherTicks);
  if (field.weather === 'snow' && ability === 'ice-body') heal(1 / 16, 'Ice Body', weatherTicks);
  if (item === 'leftovers' || (item === 'black-sludge' && defender.types.includes('poison'))) {
    heal(1 / 16, item === 'leftovers' ? 'Leftovers' : 'Black Sludge');
  } else if (item === 'black-sludge' && !magicGuard) {
    lose(1 / 8, 'Black Sludge');
  }
  if (field.terrain === 'grassy' && grounded) heal(1 / 16, 'Grassy Terrain', terrainTicks);
  // A entrada vem antes do Dynamax, então dobra junto com os PS.
  return { entry: defender.dynamax ? entry * hpRatio(defender.species) : entry, perTurn, timed, notes };
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

/** Sturdy segura o primeiro golpe com 1 HP: só com HP cheio, contra um acerto só e se o golpe não ignora habilidades. */
export const sturdyHolds = (result, defender, attacker, entry = 0) => defender.ability === 'sturdy' && entry === 0
  && currentHp(defender) === defender.stats.hp && result.hits === 1 && !result.extraRolls && !result.breaksAbilities && !MOLD_BREAKERS.has(attacker?.ability);

/**
 * Em quantos usos do golpe o alvo cai, em até 4, contando hazards na entrada e o saldo de HP
 * entre um turno e outro. Devolve { text, turns, chance } com chance de 0 a 1.
 */
export function describeKnockout(result, { attacker, defender, defenderSide, field, resultAt }) {
  if (result.reason) return { text: result.reason, turns: null, chance: 0 };

  const { hp } = result;
  const remaining = currentHp(defender);
  // Hazards só contam na entrada: com PS já perdidos ou a batalha em andamento, o alvo já está em campo.
  const effects = residualEffects(defender, defenderSide, field, attacker);
  const entry = remaining === hp && !defender.entered ? effects.entry : 0;
  const { perTurn } = effects;
  const notes = defender.entered
    ? effects.notes.filter((note) => note !== 'Stealth Rock' && note !== 'Steelsurge' && !note.endsWith('Spikes'))
    : effects.notes;
  const use = perUseDistribution(result);
  const sturdy = sturdyHolds(result, defender, attacker, entry);
  const allNotes = sturdy ? [...notes, 'Sturdy'] : notes;
  const suffix = allNotes.length ? ` (com ${listNotes(allNotes)})` : '';
  // Com Sturdy, o primeiro uso deixa o alvo com pelo menos 1 HP.
  const firstUse = sturdy ? capDamage(use, remaining - 1) : use;

  let total = firstUse;
  // PS de onde a conta parte e o teto deles; quando o Dynamax acaba, os dois passam a ser os normais.
  let start = remaining - entry;
  let cap = hp;
  let since = 0;
  for (let turns = 1; turns <= MAX_TURNS; turns += 1) {
    if (defender.dynamax && turns === defender.dynamax + 1) {
      const normal = baseMaxHp(defender);
      const drained = drainBetween(effects, 0, defender.dynamax);
      const converted = new Map();
      for (const [damage, probability] of total) {
        const left = Math.min(cap, start - drained) - damage;
        const dealt = left <= 0 ? Infinity : normal - withoutDynamax(left, defender.species);
        converted.set(dealt, (converted.get(dealt) ?? 0) + probability);
      }
      total = converted;
      start = normal;
      cap = normal;
      since = defender.dynamax;
    }
    if (turns > 1) {
      // `resultAt` dá o golpe num turno em que telas, clima ou salas já acabaram (null se nada mudou).
      const changed = resultAt?.(turns);
      let next = use;
      if (changed) next = changed.reason ? new Map([[0, 1]]) : perUseDistribution(changed);
      total = convolve(total, next);
    }
    // HP que ainda falta tirar depois dos hazards e do saldo dos turnos anteriores; a recuperação não passa do HP cheio.
    const needed = Math.min(cap, start - drainBetween(effects, since, turns - 1));
    let chance = 0;
    for (const [damage, probability] of total) if (damage >= needed) chance += probability;
    if (chance > 1e-9) {
      const label = turns === 1 ? 'OHKO' : `${turns}HKO`;
      const text = chance > 1 - 1e-9 ? `${label} garantido` : `${chanceLabel(chance)} de chance de ${label}`;
      return { text: `${text}${suffix}.`, turns, chance: Math.min(chance, 1) };
    }
  }

  const lastUse = resultAt?.(MAX_TURNS + 1) ?? result;
  if (lastUse.reason) return { text: `Não derruba: o golpe deixa de funcionar${suffix}.`, turns: null, chance: 0 };
  const average = (lastUse.min + lastUse.max) / 2;
  const pace = Math.max(average - Math.max(-perTurn, 0), 1);
  // O que resta quando o Dynamax acaba cai pela metade.
  const boosted = defender.dynamax ? defender.dynamax * pace : Infinity;
  const scheduled = effects.timed.reduce((sum, { amount, turns }) => sum + amount * turns, 0);
  const left = remaining - scheduled;
  const toDeal = Math.max(1, left > boosted ? boosted + (left - boosted) / hpRatio(defender.species) : left);
  const estimate = perTurn < 0 && average <= -perTurn ? null : Math.ceil(toDeal / pace);
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
  if (item === 'choice-scarf' && !side.dynamax) mods.push(6144);
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
