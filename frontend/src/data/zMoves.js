// Golpes Z (Sun/Moon e Ultra Sun/Ultra Moon). A PokéAPI tem os golpes, mas não diz quem usa cada exclusivo
// nem com qual cristal; por isso a tabela é própria. Os nomes de Pokémon são os da PokéAPI.

const generic = (name, type, crystal) => ({ name, type, crystal });

/** Um por tipo: o golpe de dano daquele tipo vira o golpe Z, com poder pelo poder do golpe base (100 a 200). */
export const GENERIC_Z_MOVES = [
  generic('Breakneck Blitz', 'normal', 'Normalium Z'),
  generic('All-Out Pummeling', 'fighting', 'Fightinium Z'),
  generic('Supersonic Skystrike', 'flying', 'Flyinium Z'),
  generic('Acid Downpour', 'poison', 'Poisonium Z'),
  generic('Tectonic Rage', 'ground', 'Groundium Z'),
  generic('Continental Crush', 'rock', 'Rockium Z'),
  generic('Savage Spin-Out', 'bug', 'Buginium Z'),
  generic('Never-Ending Nightmare', 'ghost', 'Ghostium Z'),
  generic('Corkscrew Crash', 'steel', 'Steelium Z'),
  generic('Inferno Overdrive', 'fire', 'Firium Z'),
  generic('Hydro Vortex', 'water', 'Waterium Z'),
  generic('Bloom Doom', 'grass', 'Grassium Z'),
  generic('Gigavolt Havoc', 'electric', 'Electrium Z'),
  generic('Shattered Psyche', 'psychic', 'Psychium Z'),
  generic('Subzero Slammer', 'ice', 'Icium Z'),
  generic('Devastating Drake', 'dragon', 'Dragonium Z'),
  generic('Black Hole Eclipse', 'dark', 'Darkinium Z'),
  generic('Twinkle Tackle', 'fairy', 'Fairium Z'),
];

const PIKACHU_CAPS = ['original', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'partner', 'world'].map((cap) => `pikachu-${cap}-cap`);

// `users`: formas que podem usá-lo; `shown`: as entradas da Pokédex que aparecem como atalho na lista.
const exclusive = (name, type, category, power, baseMove, crystal, users, effect, shown = users) => ({
  name, type, category, power, baseMove, crystal, users, effect, shown,
});

export const EXCLUSIVE_Z_MOVES = [
  exclusive('Catastropika', 'electric', 'physical', 210, 'Volt Tackle', 'Pikanium Z', ['pikachu'], 'Pikachu se lança com toda a eletricidade do corpo.'),
  exclusive('10,000,000 Volt Thunderbolt', 'electric', 'special', 195, 'Thunderbolt', 'Pikashunium Z', PIKACHU_CAPS, 'Tem alta chance de acerto crítico.', ['pikachu']),
  exclusive('Stoked Sparksurfer', 'electric', 'special', 175, 'Thunderbolt', 'Aloraichium Z', ['raichu-alola'], 'Paralisa o alvo.'),
  exclusive('Extreme Evoboost', 'normal', 'status', null, 'Last Resort', 'Eevium Z', ['eevee'], 'Aumenta muito (+2) todos os atributos do usuário.'),
  exclusive('Pulverizing Pancake', 'normal', 'physical', 210, 'Giga Impact', 'Snorlium Z', ['snorlax'], 'Snorlax esmaga o alvo com o corpo inteiro.'),
  exclusive('Genesis Supernova', 'psychic', 'special', 185, 'Psychic', 'Mewnium Z', ['mew'], 'Deixa Psychic Terrain no campo por 5 turnos.'),
  exclusive('Sinister Arrow Raid', 'ghost', 'physical', 180, 'Spirit Shackle', 'Decidium Z', ['decidueye'], 'Uma chuva de flechas sombrias sobre o alvo.'),
  exclusive('Malicious Moonsault', 'dark', 'physical', 180, 'Darkest Lariat', 'Incinium Z', ['incineroar'], 'Incineroar salta das cordas e cai sobre o alvo.'),
  exclusive('Oceanic Operetta', 'water', 'special', 195, 'Sparkling Aria', 'Primarium Z', ['primarina'], 'Primarina invoca uma enorme massa de água.'),
  exclusive('Splintered Stormshards', 'rock', 'physical', 190, 'Stone Edge', 'Lycanium Z', ['lycanroc-midday', 'lycanroc-midnight', 'lycanroc-dusk'], 'Remove o terreno do campo.'),
  exclusive("Let's Snuggle Forever", 'fairy', 'physical', 190, 'Play Rough', 'Mimikium Z', ['mimikyu-disguised', 'mimikyu-busted'], 'Mimikyu arrasta o alvo para baixo do disfarce.', ['mimikyu-disguised']),
  exclusive('Clangorous Soulblaze', 'dragon', 'special', 185, 'Clanging Scales', 'Kommonium Z', ['kommo-o'], 'Atinge os dois oponentes e aumenta (+1) todos os atributos do usuário.'),
  exclusive('Guardian of Alola', 'fairy', 'special', null, "Nature's Madness", 'Tapunium Z', ['tapu-koko', 'tapu-lele', 'tapu-bulu', 'tapu-fini'], 'Tira 3/4 do HP atual do alvo, sem olhar ataque nem defesa.'),
  exclusive('Soul-Stealing 7-Star Strike', 'ghost', 'physical', 195, 'Spectral Thief', 'Marshadium Z', ['marshadow'], 'Marshadow golpeia a sombra do alvo sete vezes.'),
  exclusive('Menacing Moonraze Maelstrom', 'ghost', 'special', 200, 'Moongeist Beam', 'Lunalium Z', ['lunala', 'necrozma-dawn'], 'Ignora a habilidade do alvo.'),
  exclusive('Searing Sunraze Smash', 'steel', 'physical', 200, 'Sunsteel Strike', 'Solganium Z', ['solgaleo', 'necrozma-dusk'], 'Ignora a habilidade do alvo.'),
  exclusive('Light That Burns the Sky', 'psychic', 'special', 200, 'Photon Geyser', 'Ultranecrozium Z', ['necrozma-ultra'], 'Usa o maior entre Ataque e Ataque Especial e ignora a habilidade do alvo.'),
];

/** Golpes Z exclusivos que a forma pode usar (Necrozma Dawn Wings tem um; Pikachu comum, outro), ou lista vazia. */
export const zMovesFor = (formName) => EXCLUSIVE_Z_MOVES.filter((move) => move.users.includes(formName));
