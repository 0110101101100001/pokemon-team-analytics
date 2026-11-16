import { ROLE_LABELS, ROLE_USAGE_CUTOFF, coveredRoles } from './teamRoles';

/*
  Estilos de time como regras declarativas:
  - required: funções obrigatórias (um time completo sem elas é descartado);
  - core: funções básicas que contam para a nota e aparecem como "falta: …", mas não descartam o time;
  - desired: [{ roles, min }] quantos membros deveriam ter pelo menos uma dessas funções;
  - excess: { função: máximo } acima do qual cada membro a mais pesa contra (Recovery em Hyper Offense);
  - speed: faixa da velocidade base média { min?, max? };
  - weather: clima do estilo; conta quem aproveita e pesa contra quem é atrapalhado;
  - excludes: funções que tiram o Pokémon da busca (setters de outro clima em um time de clima);
  - penalize: funções que pesam contra; fastAbove: velocidade base a partir da qual um membro pesa contra.
*/

// Quem aproveita cada clima: habilidades, golpes e o tipo de golpe favorecido (ou o tipo que ganha defesa).
export const WEATHER_ABUSERS = {
  sun: {
    abilities: ['Chlorophyll', 'Protosynthesis', 'Solar Power', 'Flower Gift', 'Harvest', 'Leaf Guard', 'Orichalcum Pulse'],
    moves: ['Solar Beam', 'Solar Blade', 'Weather Ball', 'Morning Sun', 'Synthesis', 'Growth', 'Hydro Steam'],
    attackType: 'fire',
  },
  rain: {
    abilities: ['Swift Swim', 'Hydration', 'Dry Skin', 'Rain Dish'],
    moves: ['Hurricane', 'Thunder', 'Weather Ball', 'Electro Shot'],
    attackType: 'water',
  },
  sand: {
    abilities: ['Sand Rush', 'Sand Force', 'Sand Veil'],
    moves: ['Shore Up', 'Weather Ball'],
    attackType: 'rock',
    defenseType: 'rock',
  },
  snow: {
    abilities: ['Slush Rush', 'Ice Body', 'Snow Cloak'],
    moves: ['Blizzard', 'Aurora Veil', 'Weather Ball'],
    attackType: 'ice',
    defenseType: 'ice',
  },
};

/*
  Quem o clima atrapalha:
  - sol: quem depende de golpes de Water com STAB (o sol corta Water pela metade) e não tem nada que aproveite o sol;
  - chuva: quem depende de golpes de Fire com STAB (a chuva corta Fire pela metade);
  - chuva, areia e neve: quem usa Solar Beam ou Solar Blade em ≥ 30% dos sets (o poder cai pela metade fora do sol).
  Areia e neve não cortam nenhum tipo: o chip da areia em quem não é Rock, Ground ou Steel fica de fora.
*/
export const WEATHER_HINDERED = {
  sun: { attackType: 'water', moves: [] },
  rain: { attackType: 'fire', moves: ['Solar Beam', 'Solar Blade'] },
  sand: { attackType: null, moves: ['Solar Beam', 'Solar Blade'] },
  snow: { attackType: null, moves: ['Solar Beam', 'Solar Blade'] },
};

export const WEATHER_NAMES = { sun: 'sol', rain: 'chuva', sand: 'areia', snow: 'neve' };
/** Número de membros que aproveitam o clima a partir do qual a parte de clima chega ao máximo. */
export const FULL_WEATHER_ABUSERS = 3;

const BASICS = ['hazards', 'removal', 'speedControl'];

const weatherStyle = (weather, label, description) => ({
  key: weather,
  label,
  description,
  required: [`weather:${weather}`],
  core: ['hazards', 'removal'],
  desired: [],
  weather,
  // Um setter de outro clima desfaz o do estilo.
  excludes: ['sun', 'rain', 'sand', 'snow'].filter((other) => other !== weather).map((other) => `weather:${other}`),
});

export const ARCHETYPES = [
  {
    key: 'free',
    label: 'Livre',
    description: 'Só as funções básicas: Hazards, Hazard Control e Speed Control.',
    required: [],
    core: BASICS,
    desired: [],
  },
  {
    key: 'hyperOffense',
    label: 'Hyper Offense',
    description: 'Hazards e Setup Sweepers rápidos que derrubam antes de apanhar.',
    required: ['hazards'],
    core: [],
    desired: [{ roles: ['setup', 'wallbreaker'], min: 3 }],
    excess: { recovery: 1 },
    speed: { min: 95 },
  },
  {
    key: 'bulkyOffense',
    label: 'Bulky Offense',
    description: 'Atacantes resistentes e Pivots para ganhar momentum nas trocas.',
    required: ['hazards', 'pivot'],
    core: ['removal'],
    desired: [{ roles: ['wallbreaker'], min: 2 }],
    speed: { min: 75, max: 100 },
  },
  {
    key: 'balance',
    label: 'Balance',
    description: 'Hazards, Hazard Control e Pivots, com defensivos que têm Recovery.',
    required: ['hazards', 'removal', 'pivot'],
    core: [],
    desired: [{ roles: ['recovery'], min: 2 }],
  },
  {
    key: 'stall',
    label: 'Stall',
    description: 'Walls com Recovery e um Cleric; vence pelo desgaste.',
    required: ['hazards', 'removal', 'cleric'],
    core: [],
    desired: [{ roles: ['recovery'], min: 4 }],
    penalize: ['wallbreaker'],
  },
  weatherStyle('sun', 'Sol', 'Um Sun Setter e os abusers do sol: Chlorophyll, Protosynthesis, golpes de Fire.'),
  weatherStyle('rain', 'Chuva', 'Um Rain Setter e os abusers da chuva: Swift Swim, golpes de Water, Hurricane.'),
  weatherStyle('sand', 'Areia', 'Um Sand Setter e os abusers da areia: Sand Rush, Sand Force, tipo Rock.'),
  weatherStyle('snow', 'Neve', 'Um Snow Setter e os abusers da neve: Slush Rush, Aurora Veil, tipo Ice.'),
  {
    key: 'trickRoom',
    label: 'Trick Room',
    description: 'Setters de Trick Room e atacantes lentos que agem primeiro dentro dela.',
    required: ['trickRoom'],
    core: [],
    desired: [{ roles: ['trickRoom'], min: 2 }],
    speed: { max: 60 },
    fastAbove: 80,
  },
];

export const DEFAULT_ARCHETYPE = ARCHETYPES[0];
/** Estilos de estrutura, usados para descrever um time de clima, de Trick Room ou livre ("Sol · Bulky Offense"). */
export const STRUCTURE_KEYS = ['hyperOffense', 'bulkyOffense', 'balance', 'stall'];

const ARCHETYPE_BY_KEY = new Map(ARCHETYPES.map((archetype) => [archetype.key, archetype]));
export const archetypeByKey = (key) => ARCHETYPE_BY_KEY.get(key) ?? DEFAULT_ARCHETYPE;

/** Funções que o estilo cobra (obrigatórias e básicas), sem repetição. */
export const checklistOf = (archetype) => [...new Set([...archetype.required, ...archetype.core])];

const statOf = (member, meta) => meta.stats.get(meta.names.get(member.name));
const usedEnough = (usage, names) => names.some((name) => (usage?.[name] ?? 0) >= ROLE_USAGE_CUTOFF);

/** Se o membro aproveita o clima: habilidade ou golpe em ≥ 30% dos sets, golpe do tipo favorecido ou tipo que ganha defesa. */
export function isWeatherAbuser(member, weather, meta) {
  const rules = WEATHER_ABUSERS[weather];
  if (!rules) return false;
  if (rules.defenseType && member.types.includes(rules.defenseType)) return true;
  if (meta.attackTypes?.get(member.name)?.has(rules.attackType)) return true;
  const stat = statOf(member, meta);
  return usedEnough(stat?.abilities, rules.abilities) || usedEnough(stat?.moves, rules.moves);
}

/** Se o clima atrapalha o membro (ver WEATHER_HINDERED); quem também o aproveita não conta. */
export function isWeatherHindered(member, weather, meta) {
  const rules = WEATHER_HINDERED[weather];
  if (!rules || isWeatherAbuser(member, weather, meta)) return false;
  const stab = rules.attackType != null && member.types.includes(rules.attackType)
    && meta.attackTypes?.get(member.name)?.has(rules.attackType);
  return Boolean(stab) || usedEnough(statOf(member, meta)?.moves, rules.moves);
}

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
/** Curva das funções desejadas: 0,75 no mínimo pedido e continua subindo, com retorno decrescente. */
export const desiredCurve = (count, min) => 1 - 0.25 ** (count / min);

const WEIGHTS = { checklist: 0.35, desired: 0.25, speed: 0.15, weather: 0.4 };
const SPEED_TOLERANCE = 30;
const PENALTY = 0.1;
const EXCESS_PENALTY = 0.08;
const roleList = (roles) => roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');
const nameOf = (member) => member.name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
const countWithRoles = (team, roles, meta) =>
  team.filter((member) => roles.some((role) => meta.roles?.get(member.name)?.has(role))).length;

/**
 * Quanto o time encaixa no estilo:
 * { score 0–1, label, parts: { checklist, desired, speed, weather, penalties }, missing, notes, averageSpeed, abusers }.
 * Partes que o estilo não cobra ficam null e saem da média; `penalties` é [{ label, value }].
 * `meta` precisa de `roles`, `baseStats` e `attackTypes` (ver attachRoles).
 */
export function archetypeFit(team, archetype, meta) {
  const covered = coveredRoles(team, meta);
  const checklist = checklistOf(archetype);
  const missing = checklist.filter((role) => !covered.has(role));
  const notes = missing.length ? [`falta: ${roleList(missing)}`] : [];
  const penalties = [];
  const parts = { checklist: checklist.length ? 1 - missing.length / checklist.length : 1, desired: null, speed: null, weather: null };

  if (archetype.desired?.length) {
    const scores = archetype.desired.map(({ roles, min }) => {
      const count = countWithRoles(team, roles, meta);
      notes.push(`${count} de ${min} com ${roles.map((role) => ROLE_LABELS[role]).join(' ou ')}`);
      return desiredCurve(count, min);
    });
    parts.desired = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const speeds = team.map((member) => meta.baseStats?.get(member.name)?.spe).filter((speed) => speed != null);
  const averageSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  if (archetype.speed && averageSpeed != null) {
    const { min = -Infinity, max = Infinity } = archetype.speed;
    const distance = averageSpeed < min ? min - averageSpeed : averageSpeed > max ? averageSpeed - max : 0;
    parts.speed = clamp01(1 - distance / SPEED_TOLERANCE);
    if (distance > 0) {
      const wanted = Number.isFinite(min) && Number.isFinite(max) ? `${min}–${max}` : Number.isFinite(min) ? `≥ ${min}` : `≤ ${max}`;
      notes.push(`velocidade base média ${Math.round(averageSpeed)} (o estilo pede ${wanted})`);
    }
  }

  let abusers = [];
  if (archetype.weather) {
    const setter = `weather:${archetype.weather}`;
    const weatherName = WEATHER_NAMES[archetype.weather];
    // O setter não conta como quem aproveita o próprio clima.
    abusers = team.filter((member) => !meta.roles?.get(member.name)?.has(setter) && isWeatherAbuser(member, archetype.weather, meta));
    parts.weather = Math.min(abusers.length / FULL_WEATHER_ABUSERS, 1);
    notes.push(abusers.length >= FULL_WEATHER_ABUSERS
      ? `${abusers.length} abusers de ${weatherName}`
      : `${abusers.length} de ${FULL_WEATHER_ABUSERS} abusers de ${weatherName}`);
    for (const member of team) {
      if (isWeatherHindered(member, archetype.weather, meta)) {
        penalties.push({ label: `${nameOf(member)} é atrapalhado por ${weatherName}`, value: PENALTY });
      }
    }
  }

  for (const member of team) {
    const roles = meta.roles?.get(member.name) ?? new Set();
    const speed = meta.baseStats?.get(member.name)?.spe;
    const role = archetype.penalize?.find((penalized) => roles.has(penalized));
    if (role) penalties.push({ label: `${nameOf(member)}: ${ROLE_LABELS[role]} não combina com o estilo`, value: PENALTY });
    if (archetype.fastAbove != null && speed > archetype.fastAbove) {
      penalties.push({ label: `${nameOf(member)} é rápido demais (velocidade base ${speed})`, value: PENALTY });
    }
  }
  for (const [role, max] of Object.entries(archetype.excess ?? {})) {
    const extra = countWithRoles(team, [role], meta) - max;
    if (extra > 0) penalties.push({ label: `${extra} com ${ROLE_LABELS[role]} além de ${max}`, value: EXCESS_PENALTY * extra });
  }

  const present = Object.entries(parts).filter(([, value]) => value != null);
  const weighted = present.reduce((total, [key, value]) => total + WEIGHTS[key] * value, 0)
    / present.reduce((total, [key]) => total + WEIGHTS[key], 0);
  const penaltyTotal = penalties.reduce((total, penalty) => total + penalty.value, 0);

  return {
    score: clamp01(weighted - penaltyTotal),
    label: archetype.label,
    parts: { ...parts, penalties },
    missing,
    notes,
    averageSpeed,
    abusers: abusers.map((member) => member.name),
  };
}
