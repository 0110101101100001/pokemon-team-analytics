// Jogos principais, identificados pelo version group da PokéAPI. `dexes` são os slugs de /pokedex
// (a primeira é a principal); `region` casa com o sufixo das formas regionais nativas do jogo.
export const GAMES = [
  { id: 'red-blue', label: 'Red / Blue', generation: 1, region: null, dexes: [{ slug: 'kanto', label: 'Kanto' }] },
  { id: 'yellow', label: 'Yellow', generation: 1, region: null, dexes: [{ slug: 'kanto', label: 'Kanto' }] },
  { id: 'gold-silver', label: 'Gold / Silver', generation: 2, region: null, dexes: [{ slug: 'original-johto', label: 'Johto' }] },
  { id: 'crystal', label: 'Crystal', generation: 2, region: null, dexes: [{ slug: 'original-johto', label: 'Johto' }] },
  { id: 'ruby-sapphire', label: 'Ruby / Sapphire', generation: 3, region: null, dexes: [{ slug: 'hoenn', label: 'Hoenn' }] },
  { id: 'emerald', label: 'Emerald', generation: 3, region: null, dexes: [{ slug: 'hoenn', label: 'Hoenn' }] },
  { id: 'firered-leafgreen', label: 'FireRed / LeafGreen', generation: 3, region: null, dexes: [{ slug: 'kanto', label: 'Kanto' }] },
  { id: 'diamond-pearl', label: 'Diamond / Pearl', generation: 4, region: null, dexes: [{ slug: 'original-sinnoh', label: 'Sinnoh' }] },
  { id: 'platinum', label: 'Platinum', generation: 4, region: null, dexes: [{ slug: 'extended-sinnoh', label: 'Sinnoh' }] },
  { id: 'heartgold-soulsilver', label: 'HeartGold / SoulSilver', generation: 4, region: null, dexes: [{ slug: 'updated-johto', label: 'Johto' }] },
  { id: 'black-white', label: 'Black / White', generation: 5, region: null, dexes: [{ slug: 'original-unova', label: 'Unova' }] },
  { id: 'black-2-white-2', label: 'Black 2 / White 2', generation: 5, region: null, dexes: [{ slug: 'updated-unova', label: 'Unova' }] },
  {
    id: 'x-y',
    label: 'X / Y',
    generation: 6,
    region: null,
    dexes: [
      { slug: 'kalos-central', label: 'Kalos Central' },
      { slug: 'kalos-coastal', label: 'Kalos Costeira' },
      { slug: 'kalos-mountain', label: 'Kalos Montanhosa' },
    ],
  },
  { id: 'omega-ruby-alpha-sapphire', label: 'Omega Ruby / Alpha Sapphire', generation: 6, region: null, dexes: [{ slug: 'updated-hoenn', label: 'Hoenn' }] },
  {
    id: 'sun-moon',
    label: 'Sun / Moon',
    generation: 7,
    region: 'alola',
    dexes: [
      { slug: 'original-alola', label: 'Alola' },
      { slug: 'original-melemele', label: 'Melemele' },
      { slug: 'original-akala', label: 'Akala' },
      { slug: 'original-ulaula', label: "Ula'ula" },
      { slug: 'original-poni', label: 'Poni' },
    ],
  },
  {
    id: 'ultra-sun-ultra-moon',
    label: 'Ultra Sun / Ultra Moon',
    generation: 7,
    region: 'alola',
    dexes: [
      { slug: 'updated-alola', label: 'Alola' },
      { slug: 'updated-melemele', label: 'Melemele' },
      { slug: 'updated-akala', label: 'Akala' },
      { slug: 'updated-ulaula', label: "Ula'ula" },
      { slug: 'updated-poni', label: 'Poni' },
    ],
  },
  { id: 'lets-go-pikachu-lets-go-eevee', label: "Let's Go Pikachu / Eevee", generation: 7, region: null, dexes: [{ slug: 'letsgo-kanto', label: 'Kanto' }] },
  {
    id: 'sword-shield',
    label: 'Sword / Shield',
    generation: 8,
    region: 'galar',
    dexes: [
      { slug: 'galar', label: 'Galar' },
      { slug: 'isle-of-armor', label: 'Isle of Armor' },
      { slug: 'crown-tundra', label: 'Crown Tundra' },
    ],
  },
  { id: 'brilliant-diamond-shining-pearl', label: 'Brilliant Diamond / Shining Pearl', generation: 8, region: null, dexes: [{ slug: 'original-sinnoh', label: 'Sinnoh' }] },
  { id: 'legends-arceus', label: 'Legends: Arceus', generation: 8, region: 'hisui', dexes: [{ slug: 'hisui', label: 'Hisui' }] },
  {
    id: 'scarlet-violet',
    label: 'Scarlet / Violet',
    generation: 9,
    region: 'paldea',
    dexes: [
      { slug: 'paldea', label: 'Paldea' },
      { slug: 'kitakami', label: 'Kitakami' },
      { slug: 'blueberry', label: 'Blueberry' },
    ],
  },
  { id: 'legends-za', label: 'Legends: Z-A', generation: 9, region: null, dexes: [{ slug: 'lumiose-city', label: 'Lumiose' }] },
];

export const DEFAULT_GAME_ID = 'scarlet-violet';

const GAME_BY_ID = new Map(GAMES.map((game) => [game.id, game]));

export const gameById = (id) => GAME_BY_ID.get(id) ?? GAME_BY_ID.get(DEFAULT_GAME_ID);
