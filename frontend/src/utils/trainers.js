import { createBattleSet } from './stats';

// Treinadores da tabela PokemonTrainers: cada linha é uma batalha (jogo, papel, revanche, time por inicial);
// as linhas do mesmo Trainer_Slug viram um treinador só, com as batalhas como variantes.

export const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

// Ordem de lançamento dos jogos principais; um jogo fora da lista vai para o fim.
const GAME_ORDER = [
  'Red', 'Blue', 'Yellow', 'Gold', 'Silver', 'Crystal', 'Ruby', 'Sapphire', 'Emerald', 'FireRed', 'LeafGreen',
  'Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver', 'Black', 'White', 'Black 2', 'White 2', 'X', 'Y',
  'Omega Ruby', 'Alpha Sapphire', 'Sun', 'Moon', 'Ultra Sun', 'Ultra Moon', "Let's Go, Pikachu!", "Let's Go, Eevee!",
  'Sword', 'Shield', 'Brilliant Diamond', 'Shining Pearl', 'Legends: Arceus', 'Scarlet', 'Violet',
];
const gameRank = (game) => (GAME_ORDER.includes(game) ? GAME_ORDER.indexOf(game) : GAME_ORDER.length);

// Ordem do caminho até a Liga; `rank` também ordena os papéis no card.
export const ROLES = {
  'Gym Leader': { label: 'Líder de Ginásio', rank: 1 },
  'Trial Captain': { label: 'Capitão de Provação', rank: 2 },
  'Island Kahuna': { label: 'Kahuna', rank: 4 },
  'Champion Cup': { label: 'Copa dos Campeões', rank: 5 },
  'Elite Four': { label: 'Elite 4', rank: 6 },
  Champion: { label: 'Campeão', rank: 7 },
  'Former Champion': { label: 'Ex-campeão', rank: 8 },
  Rival: { label: 'Rival', rank: 9 },
};

// Etapa da batalha na história; a principal não aparece no rótulo. Uma etapa nova na tabela vai para o fim.
const STAGES = {
  'Main Story': { label: null, rank: 0 },
  'Post-Game': { label: 'pós-jogo', rank: 1 },
  Rematch: { label: 'revanche', rank: 2 },
};
const UNKNOWN_STAGE = { label: null, rank: Object.keys(STAGES).length };

const GIMMICKS = {
  'Mega Evolution': 'Mega Evolução',
  'Z-Move': 'Golpe Z',
  'Dynamax / Gigantamax': 'Dynamax / Gigantamax',
  Terastallize: 'Terastal',
};

// Especialidade "Multi-type" vira este valor nos filtros e no card.
export const MIXED_TYPE = 'mixed';

export const roleLabel = (role) => ROLES[role]?.label ?? role;
const roleRank = (role) => ROLES[role]?.rank ?? 99;

// Trainer_Slug já é o nome do arquivo no Showdown (ex.: arven-s).
export const trainerSpriteUrl = (slug) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`;

function toBattle(row) {
  const specialty = row.Specialty_Type;
  return {
    id: row.Card_ID,
    generation: row.Generation,
    region: row.Region,
    games: row.Games_Label,
    gameList: row.Games_JSON?.length ? row.Games_JSON : row.Games_Label.split(' / '),
    stage: row.Battle_Stage ? STAGES[row.Battle_Stage] ?? UNKNOWN_STAGE : STAGES['Main Story'],
    role: row.Role,
    order: row.Order,
    location: row.Location,
    badge: row.Badge_Name,
    teamVariant: row.Team_Variant,
    multiBattle: Boolean(row.Multi_Battle),
    type: !specialty || specialty === 'Multi-type' ? MIXED_TYPE : specialty.toLowerCase(),
    gimmick: GIMMICKS[row.Battle_Gimmick] ?? null,
    aceSlug: row.Ace_Pokemon_Slug,
    avgLevel: row.Avg_Level,
    team: (row.Team_JSON ?? []).map((member) => ({
      slug: member.slug,
      name: member.pokemon,
      level: member.level,
      moves: member.moves ?? [],
      isAce: Boolean(member.is_ace),
    })),
  };
}

// Jogo a jogo (lançamento); dentro do jogo, etapa e depois a ordem na história, sem olhar o papel:
// a Copa dos Campeões da Marnie vem depois das duas batalhas de rival.
const byBattleOrder = (a, b) =>
  a.generation - b.generation
  || gameRank(a.gameList[0]) - gameRank(b.gameList[0])
  || a.stage.rank - b.stage.rank
  || a.order - b.order
  || (a.teamVariant ?? '').localeCompare(b.teamVariant ?? '')
  || a.id.localeCompare(b.id);

const unique = (values) => [...new Set(values)];

// O mesmo confronto com times diferentes conforme o inicial do jogador: Games_Label, etapa e ordem iguais, menos a
// variante do time. Papel e local também entram: na tabela, as cinco batalhas da Arven dividem a mesma ordem.
export const battleKey = (battle) => [battle.games, battle.stage.rank, battle.role, battle.order, battle.location].join('|');

/** Variantes de time (Rivais), na ordem das batalhas. */
export const teamVariantsOf = (battles) => unique(battles.map((battle) => battle.teamVariant).filter(Boolean));

// Linhas da mesma batalha (jogo, etapa, ordem, papel e local), na ordem em que chegam; os times diferentes viram variantes.
function groupByBattle(battles) {
  const byKey = new Map();
  for (const battle of battles) {
    const key = battleKey(battle);
    byKey.set(key, [...(byKey.get(key) ?? []), battle]);
  }
  return [...byKey.entries()].map(([key, variants]) => ({ key, variants }));
}

// Confrontos da história contra o mesmo treinador, no mesmo papel e jogo, com times diferentes (os Rivais).
const isRepeatedBattle = (battle, battles) => battle.stage === STAGES['Main Story'] && battles.some((other) =>
  other.stage === battle.stage
  && other.role === battle.role
  && other.order !== battle.order
  && other.gameList.some((game) => battle.gameList.includes(game)));

/** Agrupa as linhas por treinador, na ordem em que aparecem nos jogos (geração, papel, posição). */
export function groupTrainers(rows) {
  const bySlug = new Map();
  for (const row of rows) {
    const trainer = bySlug.get(row.Trainer_Slug) ?? { slug: row.Trainer_Slug, name: row.Trainer_Name, battles: [] };
    trainer.battles.push(toBattle(row));
    bySlug.set(row.Trainer_Slug, trainer);
  }

  return [...bySlug.values()]
    .map((trainer) => {
      const battles = trainer.battles
        .sort(byBattleOrder)
        .map((battle, _, all) => ({ ...battle, sequence: isRepeatedBattle(battle, all) ? battle.order : null }));
      const typed = battles.filter((battle) => battle.type !== MIXED_TYPE);
      return {
        ...trainer,
        battles,
        regions: unique(battles.map((battle) => battle.region)),
        generations: unique(battles.map((battle) => battle.generation)),
        roles: unique(battles.map((battle) => battle.role)).sort((a, b) => roleRank(a) - roleRank(b)),
        battleCount: new Set(battles.map(battleKey)).size,
        type: (typed[0] ?? battles[0]).type,
      };
    })
    .sort((a, b) => {
      const [first, other] = [a.battles[0], b.battles[0]];
      return first.generation - other.generation
        || roleRank(first.role) - roleRank(other.role)
        || first.order - other.order
        || a.name.localeCompare(b.name);
    });
}

/** Jogos individuais das batalhas (Games_JSON: "Black", "White"…), sem repetir, em ordem de lançamento. */
export function gameListOf(battles) {
  const games = new Set(battles.flatMap((battle) => battle.gameList));
  return [...games].sort((a, b) => gameRank(a) - gameRank(b) || a.localeCompare(b));
}

/** Jogos individuais presentes nos treinadores, em ordem de lançamento. */
export const gamesOf = (trainers) => gameListOf(trainers.flatMap((trainer) => trainer.battles));

/** Rótulos de jogo das batalhas ("Red / Blue"), em ordem de lançamento: jogos que dividem o time ficam juntos. */
export function gameLabelsOf(battles) {
  const firstGame = new Map(battles.map((battle) => [battle.games, battle.gameList[0]]));
  return [...firstGame.keys()].sort((a, b) => gameRank(firstGame.get(a)) - gameRank(firstGame.get(b)) || a.localeCompare(b));
}

/** Papéis presentes nos treinadores, na ordem do caminho até a Liga; um papel novo na tabela aparece no fim. */
export function rolesOf(trainers) {
  const roles = new Set(trainers.flatMap((trainer) => trainer.roles));
  return [...roles].sort((a, b) => roleRank(a) - roleRank(b) || a.localeCompare(b));
}

export const FILTER_GROUPS = ['region', 'game', 'type', 'role'];

// Valores de cada batalha num grupo; uma batalha de "Red / Blue" vale para os dois jogos.
const battleValues = {
  region: (battle) => [battle.region],
  game: (battle) => battle.gameList,
  type: (battle) => [battle.type],
  role: (battle) => [battle.role],
};

/**
 * Batalhas do treinador que atendem aos filtros: dentro de um grupo as opções se somam (ou),
 * entre grupos todas precisam valer na mesma batalha (Koga em Kanto é líder, não Elite 4).
 */
export function matchingBattles(trainer, filters) {
  const groups = FILTER_GROUPS.filter((group) => filters[group]?.length);
  if (groups.length === 0) return trainer.battles;
  return trainer.battles.filter((battle) =>
    groups.every((group) => battleValues[group](battle).some((value) => filters[group].includes(value))));
}

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function createNameMatcher(query) {
  const term = normalize(query.trim());
  if (!term) return () => true;
  return (trainer) => normalize(trainer.name).includes(term);
}

function sequenceLabel({ sequence, multiBattle }) {
  const kind = multiBattle ? 'batalha em dupla' : 'batalha';
  if (sequence) return `${sequence}ª ${kind}`;
  return multiBattle ? kind : null;
}

const isChallengeMode = (games) => /[–-]\s*Challenge Mode$/.test(games);

/**
 * Rótulo de uma batalha na ficha, sem o jogo (ele já está escolhido no filtro): qual confronto ela é quando o
 * treinador enfrenta o jogador várias vezes no mesmo jogo (e se é em dupla), etapa (revanche, pós-jogo) e o
 * Challenge Mode de Black 2 / White 2. A variante do time fica de fora: ela tem seletor próprio.
 */
export function battleLabel(battle) {
  const parts = [sequenceLabel(battle), battle.stage.label, isChallengeMode(battle.games) && 'Challenge Mode'].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'batalha';
}

/**
 * Abas de batalha da ficha, na ordem do treinador. Rótulos repetidos ganham o local (os confrontos da Arven),
 * depois a ordem (as duas revanches do Barry na Fight Area) e, por último, o rótulo do jogo.
 */
export function battleTabsOf(battles) {
  const tabs = groupByBattle(battles).map((group) => ({ ...group, label: battleLabel(group.variants[0]) }));
  const byLocation = disambiguate(tabs, ({ variants: [first] }) => first.location);
  const byOrder = disambiguate(byLocation, ({ variants: [first] }) => `${first.order}ª`);
  return disambiguate(byOrder, ({ variants: [first] }) => first.games);
}

// Na calculadora a revanche vem antes do pós-jogo.
const PICKER_STAGE_RANK = new Map([[STAGES['Main Story'], 0], [STAGES.Rematch, 1], [STAGES['Post-Game'], 2]]);
const pickerStageRank = (stage) => PICKER_STAGE_RANK.get(stage) ?? PICKER_STAGE_RANK.size;

const groupLabel = ({ games, location, role }, withGame) => [withGame && games, location, roleLabel(role)].filter(Boolean).join(' · ');

// Rótulos repetidos (Rota 22 na 2ª e na 7ª batalha, os dois torneios do PWT) ganham etapa e, se preciso, o time ou a ordem.
// O sufixo só entra quando separa as opções de mesmo rótulo.
function disambiguate(groups, extra) {
  const suffixesByLabel = new Map();
  for (const group of groups) {
    suffixesByLabel.set(group.label, [...(suffixesByLabel.get(group.label) ?? []), extra(group)]);
  }
  return groups.map((group) => {
    const suffixes = suffixesByLabel.get(group.label);
    const suffix = extra(group);
    return suffix && new Set(suffixes).size > 1 ? { ...group, label: `${group.label} · ${suffix}` } : group;
  });
}

/**
 * Batalhas do treinador para a calculadora: um grupo por jogo, etapa, ordem, papel e local, com as linhas
 * de times diferentes (inicial do jogador) como variantes. Ordem: geração, etapa (história → revanche → pós-jogo), ordem.
 * Com `game` (um Games_Label), só as batalhas desse jogo, e o rótulo deixa de repetir o jogo.
 */
export function battleGroupsOf(trainer, game = null) {
  const groups = groupByBattle(game ? trainer.battles.filter((battle) => battle.games === game) : trainer.battles)
    .map((group) => ({ ...group, label: groupLabel(group.variants[0], !game) }))
    .sort(({ variants: [a] }, { variants: [b] }) =>
      a.generation - b.generation
      || pickerStageRank(a.stage) - pickerStageRank(b.stage)
      || a.order - b.order
      || gameRank(a.gameList[0]) - gameRank(b.gameList[0])
      || roleRank(a.role) - roleRank(b.role));

  const byStage = disambiguate(groups, ({ variants: [first] }) => first.stage.label);
  return disambiguate(byStage, ({ variants }) => (variants.length === 1 && variants[0].teamVariant) || `${variants[0].order}ª batalha`);
}

/** O grupo só oferece variantes quando tem pelo menos dois times diferentes. */
export const hasTeamVariants = (group) => teamVariantsOf(group.variants).length > 1;

/**
 * Entrada da Pokédex de um Pokémon do time. A tabela usa o nome da espécie, e algumas só existem com a forma
 * ("aegislash" → "aegislash-shield"); a primeira forma no índice é a padrão.
 */
export function resolveTrainerPokemon(entryByName, slug) {
  const exact = entryByName.get(slug);
  if (exact) return exact;
  for (const [name, entry] of entryByName) {
    if (name.startsWith(`${slug}-`)) return entry;
  }
  return null;
}

/** "Will-O-Wisp" → "will-o-wisp"; "King's Shield" → "kings-shield". */
export const moveSlug = (name) => name.toLowerCase().replace(/['’.,]/g, '').trim().replace(/\s+/g, '-');

/**
 * Set de batalha de um Pokémon do treinador: o nível e os golpes do jogo; o resto fica no padrão do Team Builder.
 * `summaryOf(slug)` devolve o golpe no formato da calculadora, ou null se não existir.
 */
export function trainerMemberSet(member, summaryOf) {
  const set = createBattleSet();
  return {
    ...set,
    level: member.level,
    moves: set.moves.map((_, index) => (member.moves[index] ? summaryOf(moveSlug(member.moves[index])) : null)),
  };
}
