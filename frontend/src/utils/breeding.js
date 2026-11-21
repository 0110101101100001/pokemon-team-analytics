// Criação: gênero, ovo e com quem a espécie cruza, a partir dos grupos de ovo da Pokédex.

export const UNDISCOVERED = 'no-eggs';
export const DITTO_GROUP = 'ditto';
// Passos por ciclo de ovo da 4ª geração em diante.
const STEPS_PER_CYCLE = 255;

/** `gender_rate` (oitavos de fêmea, −1 sem gênero) → { female, male } em %, ou null sem gênero. */
export function genderRatio(rate) {
  if (rate == null || rate < 0) return null;
  const female = (rate / 8) * 100;
  return { female, male: 100 - female };
}

/** `hatch_counter` → ciclos e passos aproximados para chocar. */
export const hatchInfo = (cycles) => (cycles == null ? null : { cycles, steps: cycles * STEPS_PER_CYCLE });

/**
 * Com quem a espécie cruza: { kind, groups }.
 * - `none`: grupo Undiscovered (lendários, bebês) — não se reproduz;
 * - `everyone`: o próprio Ditto, que cruza com qualquer espécie que se reproduz;
 * - `dittoOnly`: espécie sem gênero, que só cruza com Ditto;
 * - `groups`: por grupo de ovo, as espécies parceiras (sem formas, sem ela mesma, sem Ditto e sem as sem gênero).
 * `entries` são as entradas da Pokédex (com `eggGroups`); `genderless`, o Set de espécies sem gênero.
 */
export function breedingPartners({ speciesName, eggGroups, isGenderless, entries, genderless }) {
  if (eggGroups.length === 0 || eggGroups.includes(UNDISCOVERED)) return { kind: 'none', groups: [] };
  if (eggGroups.includes(DITTO_GROUP)) return { kind: 'everyone', groups: [] };
  if (isGenderless) return { kind: 'dittoOnly', groups: [] };

  const species = entries.filter((entry) => !entry.isForm
    && entry.species !== speciesName
    && !genderless.has(entry.species)
    && !entry.eggGroups.includes(DITTO_GROUP));
  return {
    kind: 'groups',
    groups: eggGroups.map((group) => ({
      group,
      partners: species.filter((entry) => entry.eggGroups.includes(group)),
    })),
  };
}
