import { ROLE_LABELS, WALLBREAKER_BASE_STAT, roleEvidence } from './teamRoles';
import { formatSlug } from './filters';
import { capitalize } from './typeColors';

/*
  Textos do card do esboço: por que cada Pokémon entrou (começando pela função) e o set em uma linha.
  Os motivos vêm de rankCandidates; aqui saem os que não ajudam a ler o time:
  - "mesmo núcleo de X" quando X não está no time (em um time completo não há próximo Pokémon a sugerir);
  - "segura Y" para ameaças com menos de 1% de uso no tier.
*/

export const MIN_THREAT_USAGE = 1;
const SHORT_REASONS = 2;

// Pivot pela velocidade base: o lento troca depois do golpe do oponente e põe o parceiro em campo de graça.
// Teleport (prioridade −6) é sempre Slow Pivot.
export const SLOW_PIVOT_SPEED = 80;
export const FAST_PIVOT_SPEED = 100;

// Itens que mudam como o Pokémon joga, sem virar função da checklist.
const ITEM_NOTES = {
  'air-balloon': 'Air Balloon (entra imune a Ground)',
  'focus-sash': 'Focus Sash (aguenta um OHKO)',
  'assault-vest': 'Assault Vest (tanque especial)',
};

const ROLE_ORDER = ['weather:sun', 'weather:rain', 'weather:sand', 'weather:snow', 'trickRoom', 'hazards', 'removal',
  'pivot', 'speedControl', 'setup', 'wallbreaker', 'recovery', 'cleric'];

const listTypes = (types) => types.map(capitalize).join(', ');

function pivotLabel(evidence, baseStats) {
  if (evidence === 'Teleport' || (baseStats && baseStats.spe < SLOW_PIVOT_SPEED)) return 'Slow Pivot';
  if (baseStats && baseStats.spe >= FAST_PIVOT_SPEED) return 'Fast Pivot';
  return ROLE_LABELS.pivot;
}

// "Wallbreaker" sem item de Choice: o atributo que o justifica ("SpA base 133").
function offenseStat(baseStats) {
  if (!baseStats || Math.max(baseStats.atk, baseStats.spa) < WALLBREAKER_BASE_STAT) return null;
  return baseStats.spa > baseStats.atk ? `SpA base ${baseStats.spa}` : `Atk base ${baseStats.atk}`;
}

/**
 * Funções do Pokémon com o que as sustenta: "Speed Control (Choice Scarf)", "Setup Sweeper (Nasty Plot)".
 * São as mesmas funções das pílulas do card (uso na Smogon); a justificativa vem do set exibido e,
 * quando a função vem de outro set comum, aparece como "Choice Scarf em outros sets".
 */
export function rolePhrases(roles, { set = null, smogonStat = null, baseStats = null } = {}) {
  const fromSet = roleEvidence({ set });
  const fromMeta = roleEvidence({ smogonStat });
  return ROLE_ORDER.filter((role) => roles?.has(role)).map((role) => {
    const evidence = fromSet.get(role);
    const phrase = role === 'pivot' ? pivotLabel(evidence ?? fromMeta.get(role), baseStats) : ROLE_LABELS[role];
    const source = evidence
      || (role === 'wallbreaker' && offenseStat(baseStats))
      || (fromMeta.has(role) && `${fromMeta.get(role)} em outros sets`);
    return source ? `${phrase} (${source})` : phrase;
  });
}

/** Nota do item do set quando ele define o jeito de jogar (Air Balloon, Focus Sash…). */
export const itemNote = (set) => ITEM_NOTES[set?.item] ?? null;

/**
 * { roles, short, rest } de um Pokémon adicionado pelo esboço: as funções, os 2 motivos mais úteis e o resto.
 * `teamSmogonNames` são os nomes da Smogon dos membros do time; `set`, o set exibido no card.
 */
export function explainPick({ pokemon, reasons }, meta, teamSmogonNames, set = null) {
  const usageOf = (name) => meta.stats.get(name)?.usage ?? 0;
  const smogonStat = meta.stats.get(meta.names?.get(pokemon.name));
  const roles = rolePhrases(meta.roles?.get(pokemon.name), { set, smogonStat, baseStats: meta.baseStats?.get(pokemon.name) });
  const note = itemNote(set);
  const parts = [];
  const answers = (reasons?.answers ?? []).filter((name) => usageOf(name) >= MIN_THREAT_USAGE);
  if (answers.length) parts.push(`segura ${answers.join(', ')}`);
  if (reasons?.partners?.length) parts.push(`par de ${reasons.partners.join(', ')}`);
  if (reasons?.patched?.length) parts.push(`cobre ${listTypes(reasons.patched)}`);
  if (reasons?.countered?.length) parts.push(`responde a ${listTypes(reasons.countered)}`);
  if (reasons?.newCoverage?.length) parts.push(`bate em ${listTypes(reasons.newCoverage)}`);
  if (reasons?.core && teamSmogonNames.has(reasons.core)) parts.push(`mesmo núcleo de ${reasons.core}`);
  if (reasons?.usage != null) parts.push(`${reasons.usage.toFixed(1)}% de uso`);

  return {
    roles: note ? [...roles, note] : roles,
    short: parts.slice(0, SHORT_REASONS),
    rest: parts.slice(SHORT_REASONS),
  };
}

/** Set em uma linha: "Heat Rock · Drought · Tera Grass · Lava Plume, Rapid Spin, Stealth Rock, Will-O-Wisp". */
export function setLine(set) {
  if (!set) return '';
  const moves = (set.moves ?? []).filter(Boolean).map((move) => formatSlug(move.slug)).join(', ');
  return [
    set.item && formatSlug(set.item),
    set.ability && formatSlug(set.ability),
    set.teraType && `Tera ${formatSlug(set.teraType)}`,
    moves,
  ].filter(Boolean).join(' · ');
}
