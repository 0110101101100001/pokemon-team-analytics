// Líderes de ginásio, Elite 4 e campeões por jogo, chaveados pelo id do jogo em data/games.js.
// Os dados ainda serão importados do banco de dados ou de um JSON; a aba lista sozinha os jogos presentes aqui.
//
// Formato de cada treinador:
// {
//   role: 'gym' | 'elite' | 'champion',
//   order: 1,                         // posição no caminho (1º ginásio, 1º da Elite 4…)
//   name: 'Brock',
//   city: 'Pewter City',              // só ginásios
//   badge: 'Boulder Badge',           // só ginásios
//   type: 'rock',                     // especialidade; null se não houver
//   team: [['geodude', 12], ['onix', 14]],  // [slug do Pokémon na PokéAPI, nível], na ordem de batalha
//   note: '...',                      // opcional: observação exibida no rodapé da ficha
// }
export const GYM_LEADERS = {};

export const LEADER_ROLES = {
  gym: { label: 'Ginásios', title: 'Líderes de ginásio', caption: (leader) => `${leader.order}º ginásio · ${leader.city}` },
  elite: { label: 'Elite 4', title: 'Elite 4', caption: (leader) => `${leader.order}º da Elite 4` },
  champion: { label: 'Campeão', title: 'Campeão', caption: () => 'campeão da liga' },
};
