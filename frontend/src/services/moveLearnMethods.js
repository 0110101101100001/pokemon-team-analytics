// Um arquivo por golpe (scripts/build-move-learners.mjs), baixado só quando a lista de quem aprende é aberta.
const FILES = import.meta.glob('../data/move-learners/*.json', { import: 'default' });

/** { "<id do Pokémon>": métodos } do golpe; {} para golpes que nenhum Pokémon aprende nos dados. */
export function fetchLearnMethods(move) {
  const load = FILES[`../data/move-learners/${move}.json`];
  return load ? load() : Promise.resolve({});
}
