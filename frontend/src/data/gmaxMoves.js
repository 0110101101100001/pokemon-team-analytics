// Golpes G-Max (Sword/Shield): a PokéAPI não os tem nem os liga às formas Gigantamax, por isso a tabela é própria.
// Cada um substitui o golpe Max do seu tipo quando a forma Gigantamax usa um golpe de dano desse tipo.
// `power` só vale para os três com poder fixo; nos outros, o poder vem do golpe base, como nos golpes Max.

const move = (name, type, effect, power = null) => ({ name, type, effect, power });

const GMAX_MOVES = {
  venusaur: move('G-Max Vine Lash', 'grass', 'Por 4 turnos, causa dano no fim de cada turno aos oponentes que não são do tipo Grama.'),
  charizard: move('G-Max Wildfire', 'fire', 'Por 4 turnos, causa dano no fim de cada turno aos oponentes que não são do tipo Fogo.'),
  blastoise: move('G-Max Cannonade', 'water', 'Por 4 turnos, causa dano no fim de cada turno aos oponentes que não são do tipo Água.'),
  butterfree: move('G-Max Befuddle', 'bug', 'Envenena, paralisa ou adormece cada oponente.'),
  pikachu: move('G-Max Volt Crash', 'electric', 'Paralisa os oponentes.'),
  meowth: move('G-Max Gold Rush', 'normal', 'Confunde os oponentes e rende dinheiro ao fim da batalha.'),
  machamp: move('G-Max Chi Strike', 'fighting', 'Aumenta a chance de acerto crítico do usuário e dos aliados; acumula.'),
  gengar: move('G-Max Terror', 'ghost', 'Impede os oponentes de fugir ou de serem trocados.'),
  kingler: move('G-Max Foam Burst', 'water', 'Reduz muito (−2) a Velocidade dos oponentes.'),
  lapras: move('G-Max Resonance', 'ice', 'Ergue Aurora Veil por 5 turnos, reduzindo o dano físico e especial recebido.'),
  eevee: move('G-Max Cuddle', 'normal', 'Deixa apaixonados os oponentes do gênero oposto.'),
  snorlax: move('G-Max Replenish', 'normal', 'Cada aliado tem 50% de chance de recuperar a Berry que já consumiu.'),
  garbodor: move('G-Max Malodor', 'poison', 'Envenena os oponentes.'),
  melmetal: move('G-Max Meltdown', 'steel', 'Aplica Torment: os oponentes não podem usar o mesmo golpe duas vezes seguidas.'),
  rillaboom: move('G-Max Drum Solo', 'grass', 'Ignora a habilidade do alvo.', 160),
  cinderace: move('G-Max Fireball', 'fire', 'Ignora a habilidade do alvo.', 160),
  inteleon: move('G-Max Hydrosnipe', 'water', 'Ignora a habilidade do alvo.', 160),
  corviknight: move('G-Max Wind Rage', 'flying', 'Remove telas, hazards e terrenos do campo, como Defog.'),
  orbeetle: move('G-Max Gravitas', 'psychic', 'Ativa Gravity por 5 turnos.'),
  drednaw: move('G-Max Stonesurge', 'water', 'Espalha Stealth Rock no lado dos oponentes.'),
  coalossal: move('G-Max Volcalith', 'rock', 'Por 4 turnos, causa dano no fim de cada turno aos oponentes que não são do tipo Pedra.'),
  flapple: move('G-Max Tartness', 'grass', 'Reduz a Evasão dos oponentes.'),
  appletun: move('G-Max Sweetness', 'grass', 'Cura as condições de status do usuário e dos aliados.'),
  sandaconda: move('G-Max Sandblast', 'ground', 'Prende os oponentes em um redemoinho de areia por 4 ou 5 turnos, com dano a cada turno.'),
  toxtricity: move('G-Max Stun Shock', 'electric', 'Envenena ou paralisa cada oponente.'),
  centiskorch: move('G-Max Centiferno', 'fire', 'Prende os oponentes em chamas por 4 ou 5 turnos, com dano a cada turno.'),
  hatterene: move('G-Max Smite', 'fairy', 'Confunde os oponentes.'),
  grimmsnarl: move('G-Max Snooze', 'dark', 'Tem 50% de chance de deixar o alvo sonolento: ele adormece no fim do turno seguinte.'),
  alcremie: move('G-Max Finale', 'fairy', 'Recupera 1/6 do HP máximo do usuário e dos aliados.'),
  copperajah: move('G-Max Steelsurge', 'steel', 'Espalha estacas de aço no lado dos oponentes: hazard do tipo Aço, como Stealth Rock.'),
  duraludon: move('G-Max Depletion', 'dragon', 'Tira 2 PP do último golpe usado pelo alvo.'),
  'urshifu-single-strike': move('G-Max One Blow', 'dark', 'Atinge mesmo através de Protect e Max Guard.'),
  'urshifu-rapid-strike': move('G-Max Rapid Flow', 'water', 'Atinge mesmo através de Protect e Max Guard.'),
};

// Toxtricity tem duas formas Gigantamax; as outras espécies, uma só: "<espécie>-gmax".
const GMAX_FORMS = { toxtricity: ['toxtricity-amped-gmax', 'toxtricity-low-key-gmax'] };

/** Todos os golpes G-Max, com a espécie de base (`species`) e as formas Gigantamax que o usam (`users`). */
export const GMAX_MOVE_LIST = Object.entries(GMAX_MOVES).map(([species, gmaxMove]) => ({
  ...gmaxMove,
  species,
  users: GMAX_FORMS[species] ?? [`${species}-gmax`],
}));

const GMAX_USERS = new Set(GMAX_MOVE_LIST.flatMap((gmaxMove) => gmaxMove.users));

/**
 * Golpe G-Max de um Pokémon que pode Gigantamaxizar ("charizard", "toxtricity-low-key") ou da própria forma
 * Gigantamax; null para as outras formas da espécie (Charizard Mega X, Meowth de Galar).
 */
export function gmaxMoveOf(name) {
  if (!name) return null;
  const formName = name.endsWith('-gmax') ? name : `${name}-gmax`;
  return GMAX_USERS.has(formName) ? gmaxMoveFor(formName) : null;
}

/**
 * Golpe G-Max de uma forma Gigantamax ("charizard-gmax", "toxtricity-low-key-gmax"), ou null para qualquer outra.
 * Procura do nome mais longo ao mais curto: Urshifu tem um golpe por estilo; Toxtricity, um só para as duas formas.
 */
export function gmaxMoveFor(formName) {
  if (!formName?.endsWith('-gmax')) return null;
  let base = formName.slice(0, -'-gmax'.length);
  while (base) {
    if (GMAX_MOVES[base]) return GMAX_MOVES[base];
    base = base.includes('-') ? base.slice(0, base.lastIndexOf('-')) : '';
  }
  return null;
}
