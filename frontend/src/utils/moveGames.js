// Jogos do filtro de golpes da ficha. Cada opção junta os "version groups" da PokéAPI que formam um jogo: a DLC
// entra no jogo base (Isle of Armor e Crown Tundra em Sword/Shield, Teal Mask e Indigo Disk em Scarlet/Violet,
// Mega Dimension em Legends: Z-A) e as versões japonesas de Red/Green e Blue em Red/Blue. Ordem: do mais novo
// ao mais antigo (a coluna `order` de version_groups.csv da PokéAPI).
export const MOVE_GAMES = [
  { value: 'champions', label: 'Pokémon Champions', generation: 9, groups: ['champions'] },
  { value: 'legends-za', label: 'Legends: Z-A', generation: 9, groups: ['legends-za', 'mega-dimension'] },
  { value: 'scarlet-violet', label: 'Scarlet / Violet', generation: 9, groups: ['scarlet-violet', 'the-teal-mask', 'the-indigo-disk'] },
  { value: 'legends-arceus', label: 'Legends: Arceus', generation: 8, groups: ['legends-arceus'] },
  { value: 'brilliant-diamond-shining-pearl', label: 'Brilliant Diamond / Shining Pearl', generation: 8, groups: ['brilliant-diamond-shining-pearl'] },
  { value: 'sword-shield', label: 'Sword / Shield', generation: 8, groups: ['sword-shield', 'the-isle-of-armor', 'the-crown-tundra'] },
  { value: 'lets-go-pikachu-lets-go-eevee', label: "Let's Go Pikachu / Eevee", generation: 7, groups: ['lets-go-pikachu-lets-go-eevee'] },
  { value: 'ultra-sun-ultra-moon', label: 'Ultra Sun / Ultra Moon', generation: 7, groups: ['ultra-sun-ultra-moon'] },
  { value: 'sun-moon', label: 'Sun / Moon', generation: 7, groups: ['sun-moon'] },
  { value: 'omega-ruby-alpha-sapphire', label: 'Omega Ruby / Alpha Sapphire', generation: 6, groups: ['omega-ruby-alpha-sapphire'] },
  { value: 'x-y', label: 'X / Y', generation: 6, groups: ['x-y'] },
  { value: 'black-2-white-2', label: 'Black 2 / White 2', generation: 5, groups: ['black-2-white-2'] },
  { value: 'black-white', label: 'Black / White', generation: 5, groups: ['black-white'] },
  { value: 'heartgold-soulsilver', label: 'HeartGold / SoulSilver', generation: 4, groups: ['heartgold-soulsilver'] },
  { value: 'platinum', label: 'Platinum', generation: 4, groups: ['platinum'] },
  { value: 'diamond-pearl', label: 'Diamond / Pearl', generation: 4, groups: ['diamond-pearl'] },
  { value: 'firered-leafgreen', label: 'FireRed / LeafGreen', generation: 3, groups: ['firered-leafgreen'] },
  { value: 'xd', label: 'XD: Gale of Darkness', generation: 3, groups: ['xd'] },
  { value: 'colosseum', label: 'Colosseum', generation: 3, groups: ['colosseum'] },
  { value: 'emerald', label: 'Emerald', generation: 3, groups: ['emerald'] },
  { value: 'ruby-sapphire', label: 'Ruby / Sapphire', generation: 3, groups: ['ruby-sapphire'] },
  { value: 'crystal', label: 'Crystal', generation: 2, groups: ['crystal'] },
  { value: 'gold-silver', label: 'Gold / Silver', generation: 2, groups: ['gold-silver'] },
  { value: 'yellow', label: 'Yellow', generation: 1, groups: ['yellow'] },
  { value: 'red-blue', label: 'Red / Blue', generation: 1, groups: ['red-blue', 'red-green-japan', 'blue-japan'] },
];

const GAME_BY_VALUE = new Map(MOVE_GAMES.map((game) => [game.value, game]));

/** Os version groups da PokéAPI de um jogo do filtro ([] se o valor não existir). */
export const versionGroupsOf = (value) => GAME_BY_VALUE.get(value)?.groups ?? [];

/**
 * Jogos em que o Pokémon tem golpes registrados, do mais novo ao mais antigo, a partir de `moves` (o campo
 * `moves` do /pokemon da PokéAPI). Com `methods` (Set), só contam os golpes desses jeitos de aprender: Pokémon
 * Champions, por exemplo, só tem "train", e um jogo sem nada a mostrar não deve aparecer no filtro.
 * Version groups que esta lista não conhece ficam de fora.
 */
export function gamesWithMoves(moves, methods = null) {
  const present = new Set((moves ?? []).flatMap((move) => move.version_group_details
    .filter((detail) => !methods || methods.has(detail.move_learn_method?.name))
    .map((detail) => detail.version_group.name)));
  return MOVE_GAMES.filter((game) => game.groups.some((group) => present.has(group)));
}

/** O jogo escolhido, se o Pokémon estiver nele; senão, o mais novo em que ele está (ou null, sem nenhum). */
export const activeMoveGame = (games, chosen) =>
  (games.some((game) => game.value === chosen) ? chosen : games[0]?.value ?? null);

/** Os jogos agrupados por geração, para os <optgroup> do filtro: [{ generation, games }]. */
export function groupByGeneration(games) {
  const groups = [];
  for (const game of games) {
    const last = groups.at(-1);
    if (last?.generation === game.generation) last.games.push(game);
    else groups.push({ generation: game.generation, games: [game] });
  }
  return groups;
}
