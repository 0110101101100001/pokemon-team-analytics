import { buildSmogonNameIndex } from './smogon';

const WEIGHTS = { usage: 5, teammates: 6, answers: 25 };

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const lerp = (from, to, progress) => from + (to - from) * progress;

// O peso das ameaças cresce com o time: com poucos membros a lista de ameaças é pequena e
// enviesada, por isso só atinge o máximo na última escolha (5 membros, a escolher o 6.º).
const LAST_PICK_TEAM_SIZE = 5;
const ANSWERS_WEIGHT_FLOOR = 0.1;

/** Peso da métrica de ameaças para um time com `teamSize` membros (2,5 → 25, curva quadrática). */
export function answersWeight(teamSize) {
  const progress = clamp01((teamSize - 1) / (LAST_PICK_TEAM_SIZE - 1));
  return WEIGHTS.answers * (ANSWERS_WEIGHT_FLOOR + (1 - ANSWERS_WEIGHT_FLOOR) * progress ** 2);
}

// No início do time a Smogon já diz quem faz par com quem, mas a cobertura de tipos de
// 1–2 Pokémon ainda não diz nada: os companheiros mandam e os tipos entram aos poucos.
// A partir de 4 membros os pesos voltam ao normal.
const BALANCED_TEAM_SIZE = 4;
const EARLY_TEAMMATES_WEIGHT = 18;
const EARLY_TYPES_SCALE = 0.25;

/**
 * Pesos dependentes do tamanho do time:
 * - `types`: escala das métricas de tipos (0,25 → 1);
 * - `teammates`: peso dos companheiros (18 → 6);
 * - `answers`: peso das ameaças (2,5 → 25).
 */
export function metaWeights(teamSize) {
  const progress = clamp01((teamSize - 1) / (BALANCED_TEAM_SIZE - 1));
  return {
    types: lerp(EARLY_TYPES_SCALE, 1, progress),
    teammates: lerp(EARLY_TEAMMATES_WEIGHT, WEIGHTS.teammates, progress),
    answers: answersWeight(teamSize),
  };
}

// Multiplicador do score final para parceiros diretos ou do mesmo núcleo: até 2x com sinergia máxima.
const CORE_MULTIPLIER = 1;
// Núcleo partilhado mínimo para um par sem ligação direta contar como ligado.
const SHARED_LINK_THRESHOLD = 0.4;

// Lift = quantas vezes um par aparece junto acima do esperado pelo uso do parceiro.
// Um par 8x mais frequente do que o acaso já conta como sinergia máxima.
const LIFT_SATURATION = 8;
// Quanto o núcleo partilhado completa a ligação direta entre dois Pokémon.
const SHARED_CORE_WEIGHT = 0.85;
// No núcleo partilhado, peso do melhor parceiro em comum (o setter) face à sobreposição geral.
const HUB_SHARE = 0.7;
// Fração do que falta para a nota máxima que o núcleo do time (setter em comum) recupera.
const CORE_BOOST = 0.5;
// Afinidade mínima para um parceiro contar como núcleo e aparecer no motivo da sugestão.
const CORE_THRESHOLD = 0.5;
// Uso (%) em que a amostra de um Pokémon passa a valer metade da confiança.
const CONFIDENCE_HALF_USAGE = 0.5;
// Fração do défice de uso que a sinergia com o time consegue recuperar.
const NICHE_RELIEF = 0.75;
const PARTNER_THRESHOLD = 0.25;
const MAX_LISTED = 3;

const EMPTY = {
  breakdown: { usage: 0, teammates: 0, answers: 0 },
  reasons: { usage: null, partners: [], answers: [], core: null },
  multiplier: 1,
};

// Afinidade (0–1) com cada parceiro listado: o % em comum descontado do uso do parceiro,
// para um Pokémon omnipresente não parecer sinergia e um setter de nicho não passar despercebido.
function buildAffinity(teammates, usageByName) {
  const affinity = new Map();
  for (const [partner, shared] of Object.entries(teammates)) {
    const partnerUsage = usageByName.get(partner);
    if (!partnerUsage) continue;
    const value = clamp01(Math.log2(shared / partnerUsage) / Math.log2(LIFT_SATURATION));
    if (value > 0) affinity.set(partner, value);
  }
  return affinity;
}

/** Indexa as linhas de `smogon_stats` de um tier e liga-as às entradas da Pokédex. */
export function buildMeta(rows, entries) {
  const usageByName = new Map(rows.map((row) => [row.name, Number(row.usage_percent) || 0]));
  const stats = new Map();
  let maxUsage = 0;

  for (const row of rows) {
    const usage = usageByName.get(row.name);
    maxUsage = Math.max(maxUsage, usage);
    stats.set(row.name, {
      name: row.name,
      usage,
      affinity: buildAffinity(row.teammates ?? {}, usageByName),
      checkedBy: new Map((row.checks_and_counters ?? []).map((check) => [check.pokemon, check.score / 100])),
    });
  }

  return { stats, maxUsage, names: buildSmogonNameIndex(entries, rows.map((row) => row.name)) };
}

const statOf = (pokemon, meta) => meta.stats.get(meta.names.get(pokemon.name));

// Parceiros em torno dos quais o time orbita (setters de clima, suportes de um core).
// A força soma os membros de forma probabilística: dois abusers do mesmo setter pesam mais do que um.
function buildCores(members) {
  const cores = new Map();
  for (const member of members) {
    for (const [partner, value] of member.affinity) {
      cores.set(partner, 1 - (1 - (cores.get(partner) ?? 0)) * (1 - value));
    }
  }
  return cores;
}

/** Membros com dados no tier, os núcleos do time e as ameaças pesadas pela força do check. */
export function buildMetaProfile(team, meta) {
  const members = team.map((member) => statOf(member, meta)).filter(Boolean);
  const teamNames = new Set(members.map((member) => member.name));
  const threats = new Map();

  for (const member of members) {
    for (const [threat, strength] of member.checkedBy) {
      if (!teamNames.has(threat)) threats.set(threat, (threats.get(threat) ?? 0) + strength);
    }
  }

  return {
    members,
    cores: buildCores(members),
    threats: [...threats].sort((a, b) => b[1] - a[1]),
    weights: metaWeights(team.length),
  };
}

// Dois Pokémon pertencem ao mesmo núcleo quando orbitam os mesmos parceiros.
// O melhor parceiro em comum (ex.: Torkoal para Venusaur e Charizard) domina a nota;
// a sobreposição geral (Jaccard ponderado) completa-a.
function sharedCore(a, b) {
  let overlap = 0;
  let union = 0;
  let hub = 0;
  for (const [partner, value] of a.affinity) {
    if (partner === b.name) continue;
    const common = Math.min(value, b.affinity.get(partner) ?? 0);
    overlap += common;
    union += Math.max(value, b.affinity.get(partner) ?? 0);
    hub = Math.max(hub, common);
  }
  for (const [partner, value] of b.affinity) {
    if (partner !== a.name && !a.affinity.has(partner)) union += value;
  }
  const jaccard = union ? overlap / union : 0;
  return HUB_SHARE * hub + (1 - HUB_SHARE) * jaccard;
}

// Ligação direta nos dois sentidos, completada pelo núcleo partilhado quando o par
// não aparece nas listas (limitadas aos 10 principais) de nenhum dos dois.
// `linked` marca parceiros diretos ou do mesmo núcleo forte.
function pairSynergy(candidate, member) {
  const direct = Math.max(candidate.affinity.get(member.name) ?? 0, member.affinity.get(candidate.name) ?? 0);
  const shared = sharedCore(candidate, member);
  return {
    value: direct + (1 - direct) * SHARED_CORE_WEIGHT * shared,
    linked: direct > 0 || shared >= SHARED_LINK_THRESHOLD,
  };
}

// O núcleo mais forte que o candidato partilha com o time: um parceiro de suporte com
// afinidade alta dos dois lados, esteja ele já no time ou ainda por escolher.
function teamCore(stat, cores) {
  let name = null;
  let strength = 0;
  for (const [partner, value] of stat.affinity) {
    const common = Math.min(value, cores.get(partner) ?? 0);
    if (common > strength) {
      strength = common;
      name = partner;
    }
  }
  return { name, strength };
}

// Média entre o melhor par e a média do time: um núcleo forte conta mesmo num time grande,
// mas encaixar com vários membros vale mais do que com um só. O núcleo do time soma por cima.
function scoreTeammates(stat, { members, cores }) {
  if (!members.length) return { score: 0, partners: [], core: null, linked: false };
  let total = 0;
  let best = 0;
  let linked = false;
  const partners = [];

  for (const member of members) {
    const { value, linked: pairLinked } = pairSynergy(stat, member);
    total += value;
    best = Math.max(best, value);
    linked ||= pairLinked;
    if (value >= PARTNER_THRESHOLD) partners.push([member.name, value]);
  }

  const base = (best + total / members.length) / 2;
  const core = teamCore(stat, cores);
  // Amostras minúsculas (uso residual) geram pares ruidosos: a confiança cresce com o uso.
  const confidence = stat.usage / (stat.usage + CONFIDENCE_HALF_USAGE);

  return {
    score: (base + (1 - base) * CORE_BOOST * core.strength) * confidence,
    linked: linked || core.strength >= CORE_THRESHOLD,
    partners: partners.sort((a, b) => b[1] - a[1]).map(([name]) => name),
    // Um núcleo que já está no time aparece como parceiro; aqui só interessa o que ainda falta.
    core: core.strength >= CORE_THRESHOLD && !members.some((member) => member.name === core.name) ? core.name : null,
  };
}

// Uso em escala logarítmica; a sinergia com o time recupera parte do défice de quem é de nicho.
function scoreUsage(stat, synergy, meta) {
  const base = Math.log1p(stat.usage) / Math.log1p(meta.maxUsage);
  return base + (1 - base) * synergy * NICHE_RELIEF;
}

// O candidato cobre uma ameaça quando aparece na lista de checks dessa ameaça.
// O resultado é a fração (0–1) do peso total das ameaças da equipa que ele segura.
function scoreAnswers(stat, threats, meta) {
  let total = 0;
  let possible = 0;
  const answers = [];

  for (const [threat, weight] of threats) {
    possible += weight;
    const strength = meta.stats.get(threat)?.checkedBy.get(stat.name);
    if (!strength) continue;
    total += weight * strength;
    answers.push(threat);
  }
  return { score: possible ? total / possible : 0, answers };
}

/**
 * Bónus de meta de um candidato: uso no tier, sinergia com o time e respostas às ameaças.
 * `multiplier` (1–2) aplica-se ao score final quando o candidato é parceiro direto
 * ou do mesmo núcleo de algum membro.
 */
export function scoreMeta(candidate, metaProfile, meta) {
  const stat = statOf(candidate, meta);
  if (!stat) return EMPTY;

  const teammates = scoreTeammates(stat, metaProfile);
  const answers = scoreAnswers(stat, metaProfile.threats, meta);
  const { weights } = metaProfile;

  return {
    breakdown: {
      usage: scoreUsage(stat, teammates.score, meta) * WEIGHTS.usage,
      teammates: teammates.score * weights.teammates,
      answers: answers.score * weights.answers,
    },
    multiplier: teammates.linked ? 1 + CORE_MULTIPLIER * teammates.score : 1,
    reasons: {
      usage: stat.usage,
      partners: teammates.partners.slice(0, MAX_LISTED),
      answers: answers.answers.slice(0, MAX_LISTED),
      core: teammates.core,
    },
  };
}
