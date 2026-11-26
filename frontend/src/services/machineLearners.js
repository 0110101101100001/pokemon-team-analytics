import { fetchPokemonList } from './api';
import { fetchStaticJson } from './staticData';
import MACHINES from '../data/machines.json';

// Um arquivo por jogo e golpe em public/data/machine-learners/<jogo>/<golpe>.json (scripts/build-machines.mjs),
// baixado só quando a lista de quem aprende aquele golpe é aberta naquele jogo.
const LEARNER_GAMES = new Set(MACHINES.learnerGames);

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
export const hasMachineLearners = (gameId) => LEARNER_GAMES.has(gameId);

/** Os Pokémon que aprendem o golpe por máquina no jogo, como { name, id }. */
export async function fetchMachineLearners(gameId, move) {
  if (!hasMachineLearners(gameId)) return [];
  const [ids, names] = await Promise.all([fetchStaticJson(`machine-learners/${gameId}/${move}.json`), loadNamesById()]);
  return (ids ?? [])
    .filter((id) => names.has(id))
    .map((id) => ({ id, name: names.get(id) }));
}
