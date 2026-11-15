// Meta falso de teste para o esboço, as funções e os estilos: Pokémon reais (ids e atributos de battle-data.json)
// com linhas de uso montadas à mão. Só os testes importam este arquivo.
import battleData from '../data/battle-data.json';
import { buildMeta } from './metaScore';
import { attachRoles } from './teamRoles';

const entry = (id, name, types) => ({ id, name, species: name, types, isForm: false });

export const POOL = [
  entry(984, 'great-tusk', ['ground', 'fighting']),
  entry(983, 'kingambit', ['dark', 'steel']),
  entry(1000, 'gholdengo', ['steel', 'ghost']),
  entry(887, 'dragapult', ['dragon', 'ghost']),
  entry(1006, 'iron-valiant', ['fairy', 'fighting']),
  entry(823, 'corviknight', ['flying', 'steel']),
  entry(748, 'toxapex', ['poison', 'water']),
  entry(812, 'rillaboom', ['grass']),
  entry(637, 'volcarona', ['bug', 'fire']),
  entry(279, 'pelipper', ['water', 'flying']),
  entry(847, 'barraskewda', ['water']),
  entry(858, 'hatterene', ['psychic', 'fairy']),
  entry(488, 'cresselia', ['psychic']),
  entry(324, 'torkoal', ['fire']),
  entry(635, 'hydreigon', ['dark', 'dragon']),
  entry(530, 'excadrill', ['ground', 'steel']),
  entry(3, 'venusaur', ['grass', 'poison']),
  entry(25, 'pikachu', ['electric']),
  entry(150, 'mewtwo', ['psychic']),
];

export const byName = (name) => POOL.find((pokemon) => pokemon.name === name);

const row = (name, usage, { moves = {}, items = {}, abilities = {}, teammates = {}, checks = [] } = {}) => ({
  name,
  usage_percent: usage,
  moves,
  items,
  abilities,
  teammates,
  checks_and_counters: checks.map(([pokemon, score]) => ({ pokemon, score })),
});

// Mewtwo fica fora (banido do tier); Pikachu tem uso abaixo do mínimo.
export const ROWS = [
  row('Great Tusk', 30, { moves: { 'Rapid Spin': 90, 'Stealth Rock': 37, 'Headlong Rush': 84 }, abilities: { Protosynthesis: 100 }, teammates: { Kingambit: 40, Gholdengo: 25 }, checks: [['Corviknight', 60]] }),
  row('Kingambit', 28, { moves: { 'Swords Dance': 70, 'Kowtow Cleave': 95 }, teammates: { 'Great Tusk': 45, Dragapult: 30 }, checks: [['Great Tusk', 70]] }),
  row('Gholdengo', 26, { moves: { 'Nasty Plot': 40, Recover: 50, 'Make It Rain': 95 }, teammates: { 'Great Tusk': 35 }, checks: [['Kingambit', 65]] }),
  row('Dragapult', 24, { moves: { 'U-turn': 45, 'Dragon Darts': 80 }, items: { 'Choice Specs': 35 }, teammates: { Kingambit: 30 }, checks: [['Kingambit', 60]] }),
  row('Iron Valiant', 18, { moves: { 'Calm Mind': 50, Moonblast: 90 }, teammates: { Rillaboom: 25 }, checks: [['Gholdengo', 70]] }),
  row('Corviknight', 15, { moves: { 'U-turn': 60, Defog: 50, Roost: 90 }, teammates: { Toxapex: 40 }, checks: [['Volcarona', 50]] }),
  row('Toxapex', 10, { moves: { 'Toxic Spikes': 50, Recover: 90 }, teammates: { Corviknight: 45 }, checks: [['Great Tusk', 65]] }),
  row('Rillaboom', 9, { moves: { 'U-turn': 70, 'Grassy Glide': 90 }, items: { 'Choice Band': 60 }, teammates: { 'Iron Valiant': 30 } }),
  row('Volcarona', 7, { moves: { 'Quiver Dance': 90, 'Morning Sun': 40 }, teammates: { Gholdengo: 20 } }),
  row('Pelipper', 6, { moves: { 'U-turn': 85, Roost: 67, Hurricane: 93 }, abilities: { Drizzle: 99.6 }, teammates: { Barraskewda: 50 } }),
  row('Barraskewda', 5, { moves: { Liquidation: 90, 'Flip Turn': 60 }, abilities: { 'Swift Swim': 95 }, teammates: { Pelipper: 60 } }),
  row('Hatterene', 4, { moves: { 'Trick Room': 80, 'Psychic': 90 }, teammates: { Torkoal: 40 } }),
  row('Cresselia', 3, { moves: { 'Trick Room': 70, Moonlight: 80 }, teammates: { Hatterene: 30 } }),
  row('Torkoal', 3, { moves: { 'Rapid Spin': 60, 'Stealth Rock': 50 }, abilities: { Drought: 100 }, teammates: { Hatterene: 40 } }),
  row('Hydreigon', 3, { moves: { 'U-turn': 40, 'Nasty Plot': 35 }, items: { 'Choice Specs': 40 } }),
  row('Excadrill', 3, { moves: { 'Rapid Spin': 80, 'Swords Dance': 40 }, abilities: { 'Sand Rush': 60 } }),
  row('Venusaur', 2, { moves: { 'Giga Drain': 80, 'Sludge Bomb': 70, Synthesis: 40 }, abilities: { Chlorophyll: 90 }, teammates: { Torkoal: 50 } }),
  row('Pikachu', 0.5, { moves: { 'Volt Switch': 90 } }),
];

export const META = attachRoles(buildMeta(ROWS, POOL), POOL, battleData);
export { battleData };
