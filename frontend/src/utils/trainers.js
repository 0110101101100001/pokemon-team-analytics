// Treinadores da tabela PokemonTrainers: cada linha é uma batalha (jogo, papel, revanche, time por inicial);
// as linhas do mesmo Trainer_Slug viram um treinador só, com as batalhas como variantes.

export const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

// Ordem do caminho até a Liga; `rank` também ordena os papéis no card.
export const ROLES = {
  'Gym Leader': { label: 'Líder de Ginásio', rank: 1 },
  'Trial Captain': { label: 'Capitão de Provação', rank: 2 },
  'Totem Trial': { label: 'Provação Totem', rank: 3 },
  'Island Kahuna': { label: 'Kahuna', rank: 4 },
  'Champion Cup': { label: 'Copa dos Campeões', rank: 5 },
  'Elite Four': { label: 'Elite 4', rank: 6 },
  Champion: { label: 'Campeão', rank: 7 },
};

const GIMMICKS = {
  'Mega Evolution': 'Mega Evolução',
  'Z-Move': 'Golpe Z',
  'Dynamax / Gigantamax': 'Dynamax / Gigantamax',
  Terastallize: 'Terastal',
  'Totem Aura': 'Aura Totem',
};

// Especialidade "Multi-type" vira este valor nos filtros e no card.
export const MIXED_TYPE = 'mixed';

export const roleLabel = (role) => ROLES[role]?.label ?? role;
const roleRank = (role) => ROLES[role]?.rank ?? 99;

// O Showdown não tem todos os slugs sem sufixo; quem não tem sprite usa o do Pokémon ás.
const SPRITE_NAMES = {
  agatha: 'agatha-gen3',
  drake: 'drake-gen3',
  lorelei: 'lorelei-gen3',
  phoebe: 'phoebe-gen6',
  'tate-and-liza': 'tateandliza-gen6',
};
const WITHOUT_SPRITE = new Set(['kommo-o-totem']);

export function trainerSpriteUrl(slug) {
  if (WITHOUT_SPRITE.has(slug)) return null;
  const name = SPRITE_NAMES[slug] ?? slug.replace(/-/g, '');
  return `https://play.pokemonshowdown.com/sprites/trainers/${name}.png`;
}

function toBattle(row) {
  const specialty = row.Specialty_Type;
  return {
    id: row.Card_ID,
    generation: row.Generation,
    region: row.Region,
    games: row.Games_Label,
    rematch: row.Battle_Stage === 'Rematch',
    role: row.Role,
    order: row.Order,
    location: row.Location,
    badge: row.Badge_Name,
    teamVariant: row.Team_Variant,
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

const byBattleOrder = (a, b) =>
  a.generation - b.generation
  || a.rematch - b.rematch
  || roleRank(a.role) - roleRank(b.role)
  || a.games.localeCompare(b.games)
  || (a.teamVariant ?? '').localeCompare(b.teamVariant ?? '');

const unique = (values) => [...new Set(values)];

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
      const battles = trainer.battles.sort(byBattleOrder);
      const typed = battles.filter((battle) => battle.type !== MIXED_TYPE);
      return {
        ...trainer,
        battles,
        regions: unique(battles.map((battle) => battle.region)),
        generations: unique(battles.map((battle) => battle.generation)),
        roles: unique(battles.map((battle) => battle.role)).sort((a, b) => roleRank(a) - roleRank(b)),
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

export const FILTER_GROUPS = ['region', 'generation', 'type', 'role'];

const battleValue = {
  region: (battle) => battle.region,
  generation: (battle) => String(battle.generation),
  type: (battle) => battle.type,
  role: (battle) => battle.role,
};

/**
 * Batalhas do treinador que atendem aos filtros: dentro de um grupo as opções se somam (ou),
 * entre grupos todas precisam valer na mesma batalha (Koga em Kanto é líder, não Elite 4).
 */
export function matchingBattles(trainer, filters) {
  const groups = FILTER_GROUPS.filter((group) => filters[group]?.length);
  if (groups.length === 0) return trainer.battles;
  return trainer.battles.filter((battle) =>
    groups.every((group) => filters[group].includes(battleValue[group](battle))));
}

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function createNameMatcher(query) {
  const term = normalize(query.trim());
  if (!term) return () => true;
  return (trainer) => normalize(trainer.name).includes(term);
}

/** Rótulo de uma batalha no seletor de variantes: jogo, variante do time (inicial do jogador) e revanche. */
export function battleLabel(battle) {
  return [battle.games, battle.teamVariant, battle.rematch && 'revanche']
    .filter(Boolean)
    .join(' · ');
}
