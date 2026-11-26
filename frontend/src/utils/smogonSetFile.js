/**
 * Nome do arquivo das builds de um Pokémon em public/data/smogon-sets (sem .json), a partir do nome da Smogon:
 * "Raichu-Alola" → "raichu-alola", "Zygarde-10%" → "zygarde-10", "Oricorio-Pa'u" → "oricorio-pa-u".
 * Usado pelo site e por scripts/build-smogon-sets.mjs, que recusa dois nomes no mesmo arquivo.
 */
export const smogonSetFile = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
