import { formatStatSpread } from './smogonSets';
import { titleFromSlug } from './slug';
import { MAX_IV, MAX_LEVEL, STAT_KEYS } from './stats';

const nonZero = (spread, keep) =>
  Object.fromEntries(STAT_KEYS.filter((key) => keep(spread?.[key])).map((key) => [key, spread[key]]));

/**
 * Um membro { name, set } no formato de importação do Pokémon Showdown.
 * `displayName` é o nome da espécie como o Showdown o conhece ("Ogerpon-Wellspring");
 * sem ele, o slug vira nome com iniciais maiúsculas.
 */
export function memberToShowdown({ name, set }, displayName = titleFromSlug(name)) {
  const lines = [set.item ? `${displayName} @ ${titleFromSlug(set.item)}` : displayName];
  if (set.ability) lines.push(`Ability: ${titleFromSlug(set.ability)}`);
  if (set.level && set.level !== MAX_LEVEL) lines.push(`Level: ${set.level}`);
  if (set.teraType) lines.push(`Tera Type: ${titleFromSlug(set.teraType)}`);
  const evs = formatStatSpread(nonZero(set.evs, (value) => value > 0));
  if (evs) lines.push(`EVs: ${evs}`);
  if (set.nature) lines.push(`${titleFromSlug(set.nature)} Nature`);
  const ivs = formatStatSpread(nonZero(set.ivs, (value) => value != null && value !== MAX_IV));
  if (ivs) lines.push(`IVs: ${ivs}`);
  for (const move of set.moves ?? []) {
    if (move?.slug) lines.push(`- ${titleFromSlug(move.slug)}`);
  }
  return lines.join('\n');
}

/** O time inteiro, um Pokémon por bloco. `nameOf(member)` devolve o nome do Showdown ou undefined. */
export function teamToShowdown(team, nameOf = () => undefined) {
  return team.map((member) => memberToShowdown(member, nameOf(member) ?? titleFromSlug(member.name))).join('\n\n');
}
