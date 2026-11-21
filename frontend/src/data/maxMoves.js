// Golpes Max (Sword/Shield): o golpe de dano de cada tipo vira o golpe Max desse tipo durante o Dynamax,
// com poder pelo golpe base; os de status viram Max Guard.

const max = (name, type, effect) => ({ name, type, effect });

export const MAX_MOVES = [
  max('Max Strike', 'normal', 'Reduz (−1) a Velocidade dos oponentes.'),
  max('Max Knuckle', 'fighting', 'Aumenta (+1) o Ataque do usuário e dos aliados.'),
  max('Max Airstream', 'flying', 'Aumenta (+1) a Velocidade do usuário e dos aliados.'),
  max('Max Ooze', 'poison', 'Aumenta (+1) o Ataque Especial do usuário e dos aliados.'),
  max('Max Quake', 'ground', 'Aumenta (+1) a Defesa Especial do usuário e dos aliados.'),
  max('Max Rockfall', 'rock', 'Ativa tempestade de areia por 5 turnos.'),
  max('Max Flutterby', 'bug', 'Reduz (−1) o Ataque Especial dos oponentes.'),
  max('Max Phantasm', 'ghost', 'Reduz (−1) a Defesa dos oponentes.'),
  max('Max Steelspike', 'steel', 'Aumenta (+1) a Defesa do usuário e dos aliados.'),
  max('Max Flare', 'fire', 'Ativa sol forte por 5 turnos.'),
  max('Max Geyser', 'water', 'Ativa chuva por 5 turnos.'),
  max('Max Overgrowth', 'grass', 'Ativa Grassy Terrain por 5 turnos.'),
  max('Max Lightning', 'electric', 'Ativa Electric Terrain por 5 turnos.'),
  max('Max Mindstorm', 'psychic', 'Ativa Psychic Terrain por 5 turnos.'),
  max('Max Hailstorm', 'ice', 'Ativa granizo por 5 turnos.'),
  max('Max Wyrmwind', 'dragon', 'Reduz (−1) o Ataque dos oponentes.'),
  max('Max Darkness', 'dark', 'Reduz (−1) a Defesa Especial dos oponentes.'),
  max('Max Starfall', 'fairy', 'Ativa Misty Terrain por 5 turnos.'),
  max('Max Guard', 'normal', 'Protege o usuário de todos os golpes no turno, inclusive golpes Max. Substitui os golpes de status.'),
];
