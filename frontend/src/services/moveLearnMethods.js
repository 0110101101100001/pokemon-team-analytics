import { fetchStaticJson } from './staticData';

// Um arquivo por golpe em public/data/move-learners (scripts/build-move-learners.mjs), baixado só quando a lista de
// quem aprende é aberta.

/** { "<id do Pokémon>": métodos } do golpe; {} para golpes que nenhum Pokémon aprende nos dados. */
export async function fetchLearnMethods(move) {
  return (await fetchStaticJson(`move-learners/${move}.json`)) ?? {};
}
