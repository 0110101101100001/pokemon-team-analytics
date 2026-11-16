import { fetchPokemonList } from './api';

// Um arquivo por jogo (scripts/build-machines.mjs), baixado só quando a lista de quem aprende é aberta naquele jogo.
const FILES = import.meta.glob('../data/machine-learners/*.json', { import: 'default' });
const fileOf = (gameId) => FILES[`../data/machine-learners/${gameId}.json`];

const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());

let namesById = null;
const loadNamesById = () => {
  namesById ??= fetchPokemonList()
    .then((list) => new Map(list.map(({ name, url }) => [idFromUrl(url), name])))
    .catch((error) => {
      namesById = null;
      throw error;
    });
  return namesById;
};

/** Se a PokéAPI tem os dados de aprendizado por máquina do jogo. */
export const hasMachineLearners = (gameId) => Boolean(fileOf(gameId));

/** Os Pokémon que aprendem o golpe por máquina no jogo, como { name, id }. */
export async function fetchMachineLearners(gameId, move) {
  const load = fileOf(gameId);
  if (!load) return [];
  const [byMove, names] = await Promise.all([load(), loadNamesById()]);
  return (byMove[move] ?? [])
    .filter((id) => names.has(id))
    .map((id) => ({ id, name: names.get(id) }));
}
