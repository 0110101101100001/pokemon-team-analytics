import { ROLE_LABELS } from './teamRoles';
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

const ROLE_PHRASES = {
  'weather:sun': 'setter de sol',
  'weather:rain': 'setter de chuva',
  'weather:sand': 'setter de areia',
  'weather:snow': 'setter de neve',
};

const listTypes = (types) => types.map(capitalize).join(', ');

/** Funções do Pokémon como frase curta: "setter de sol, armadilhas". */
export function rolePhrases(roles) {
  const order = ['weather:sun', 'weather:rain', 'weather:sand', 'weather:snow', 'trickRoom', 'hazards', 'removal',
    'pivot', 'speedControl', 'setup', 'wallbreaker', 'recovery', 'cleric'];
  return order.filter((role) => roles?.has(role)).map((role) => ROLE_PHRASES[role] ?? ROLE_LABELS[role]);
}

/**
 * { roles, short, rest } de um Pokémon adicionado pelo esboço: as funções, os 2 motivos mais úteis e o resto.
 * `teamSmogonNames` são os nomes da Smogon dos membros do time.
 */
export function explainPick({ pokemon, reasons }, meta, teamSmogonNames) {
  const usageOf = (name) => meta.stats.get(name)?.usage ?? 0;
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
    roles: rolePhrases(meta.roles?.get(pokemon.name)),
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
