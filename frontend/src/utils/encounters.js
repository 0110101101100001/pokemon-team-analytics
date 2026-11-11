// Ordem = do jogo mais recente para o mais antigo; define a ordem do acordeão.
const VERSION_GROUPS = [
  { key: 'scarlet-violet', label: 'Scarlet & Violet', versions: ['scarlet', 'violet'] },
  { key: 'legends-arceus', label: 'Legends: Arceus', versions: ['legends-arceus'] },
  { key: 'bdsp', label: 'Brilliant Diamond & Shining Pearl', versions: ['brilliant-diamond', 'shining-pearl'] },
  {
    key: 'crown-tundra',
    label: 'Sword & Shield · Crown Tundra',
    versions: ['the-crown-tundra-sword', 'the-crown-tundra-shield'],
    versionLabels: ['Sword', 'Shield'],
  },
  {
    key: 'isle-of-armor',
    label: 'Sword & Shield · Isle of Armor',
    versions: ['the-isle-of-armor-sword', 'the-isle-of-armor-shield'],
    versionLabels: ['Sword', 'Shield'],
  },
  { key: 'sword-shield', label: 'Sword & Shield', versions: ['sword', 'shield'] },
  { key: 'lets-go', label: "Let's Go Pikachu & Eevee", versions: ['lets-go-pikachu', 'lets-go-eevee'] },
  { key: 'usum', label: 'Ultra Sun & Ultra Moon', versions: ['ultra-sun', 'ultra-moon'] },
  { key: 'sun-moon', label: 'Sun & Moon', versions: ['sun', 'moon'] },
  { key: 'oras', label: 'Omega Ruby & Alpha Sapphire', versions: ['omega-ruby', 'alpha-sapphire'] },
  { key: 'x-y', label: 'X & Y', versions: ['x', 'y'] },
  { key: 'b2w2', label: 'Black 2 & White 2', versions: ['black-2', 'white-2'] },
  { key: 'black-white', label: 'Black & White', versions: ['black', 'white'] },
  { key: 'hgss', label: 'HeartGold & SoulSilver', versions: ['heartgold', 'soulsilver'] },
  { key: 'platinum', label: 'Platinum', versions: ['platinum'] },
  { key: 'diamond-pearl', label: 'Diamond & Pearl', versions: ['diamond', 'pearl'] },
  { key: 'frlg', label: 'FireRed & LeafGreen', versions: ['firered', 'leafgreen'] },
  { key: 'emerald', label: 'Emerald', versions: ['emerald'] },
  { key: 'ruby-sapphire', label: 'Ruby & Sapphire', versions: ['ruby', 'sapphire'] },
  { key: 'crystal', label: 'Crystal', versions: ['crystal'] },
  { key: 'gold-silver', label: 'Gold & Silver', versions: ['gold', 'silver'] },
  { key: 'yellow', label: 'Yellow', versions: ['yellow'] },
  { key: 'red-blue', label: 'Red & Blue', versions: ['red', 'blue'] },
  {
    key: 'rgb-japan',
    label: 'Red, Green & Blue (JP)',
    versions: ['red-japan', 'green-japan', 'blue-japan'],
    versionLabels: ['Red JP', 'Green JP', 'Blue JP'],
  },
];

const VERSION_LOOKUP = new Map(
  VERSION_GROUPS.flatMap((group, order) => {
    const names = group.versionLabels ?? group.label.split(' & ');
    return group.versions.map((version, i) => [
      version,
      { ...group, order, versionLabel: names.length === group.versions.length ? names[i] : group.label },
    ]);
  }),
);

const METHOD_LABELS = {
  walk: 'Andar',
  overworld: 'Visível no Mapa',
  'max-raid': 'Max Raid',
  surf: 'Surf',
  'old-rod': 'Cana Velha',
  'good-rod': 'Cana Boa',
  'super-rod': 'Super Cana',
  'rock-smash': 'Rock Smash',
  headbutt: 'Headbutt',
  'dark-grass': 'Erva Escura',
  'grass-spots': 'Erva a Abanar',
  'cave-spots': 'Pó na Gruta',
  'bridge-spots': 'Sombra na Ponte',
  'surf-spots': 'Água a Borbulhar',
  'super-rod-spots': 'Pesca em Ondulação',
  'rough-terrain': 'Terreno Acidentado',
  'roaming-grass': 'Errante (Erva)',
  'roaming-water': 'Errante (Água)',
  'sos-encounter': 'Chamada SOS',
  'island-scan': 'Island Scan',
  'npc-trade': 'Troca com NPC',
  gift: 'Oferta',
  'gift-egg': 'Ovo Oferecido',
  'only-one': 'Encontro Único',
  seaweed: 'Algas',
};

const titleCase = (slug) =>
  slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const formatLocationName = (areaName) => titleCase(areaName.replace(/-area$/, ''));

const methodLabel = (method) => METHOD_LABELS[method] ?? titleCase(method);

export function rarityOf(chance) {
  if (chance >= 100) return { label: 'Garantido', tone: 'guaranteed' };
  if (chance >= 40) return { label: 'Comum', tone: 'common' };
  if (chance >= 15) return { label: 'Incomum', tone: 'uncommon' };
  if (chance >= 5) return { label: 'Raro', tone: 'rare' };
  return { label: 'Muito raro', tone: 'very-rare' };
}

function resolveVersion(versionName) {
  return VERSION_LOOKUP.get(versionName) ?? {
    key: versionName,
    label: titleCase(versionName),
    versions: [versionName],
    order: VERSION_GROUPS.length,
    versionLabel: titleCase(versionName),
  };
}

function createLocation(areaName) {
  return {
    id: areaName,
    name: formatLocationName(areaName),
    versions: new Set(),
    methods: new Map(),
    minLevel: Infinity,
    maxLevel: -Infinity,
  };
}

function finalizeLocation(location, group) {
  const { minLevel, maxLevel } = location;
  const exclusive = location.versions.size < group.versions.length;

  return {
    id: location.id,
    name: location.name,
    levelRange: Number.isFinite(minLevel)
      ? minLevel === maxLevel ? `Nv. ${minLevel}` : `Nv. ${minLevel}–${maxLevel}`
      : null,
    exclusiveTo: exclusive ? [...location.versions].map((v) => resolveVersion(v).versionLabel) : null,
    methods: [...location.methods]
      .map(([name, chance]) => ({ name, label: methodLabel(name), chance, rarity: rarityOf(chance) }))
      .sort((a, b) => b.chance - a.chance),
  };
}

/**
 * Agrupa a resposta de /pokemon/{id}/encounters por par de jogos.
 * As chances do mesmo método são somadas por versão (cada slot de encontro conta)
 * e, entre versões do mesmo par, fica a maior.
 */
export function groupEncountersByVersion(encounters) {
  const groups = new Map();

  for (const { location_area: area, version_details: versionDetails } of encounters) {
    for (const { version, encounter_details: details } of versionDetails) {
      const meta = resolveVersion(version.name);
      if (!groups.has(meta.key)) groups.set(meta.key, { ...meta, locations: new Map() });
      const group = groups.get(meta.key);

      if (!group.locations.has(area.name)) group.locations.set(area.name, createLocation(area.name));
      const location = group.locations.get(area.name);
      location.versions.add(version.name);

      const chanceByMethod = new Map();
      for (const detail of details) {
        location.minLevel = Math.min(location.minLevel, detail.min_level);
        location.maxLevel = Math.max(location.maxLevel, detail.max_level);
        const method = detail.method.name;
        chanceByMethod.set(method, (chanceByMethod.get(method) ?? 0) + detail.chance);
      }
      for (const [method, chance] of chanceByMethod) {
        location.methods.set(method, Math.min(100, Math.max(location.methods.get(method) ?? 0, chance)));
      }
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      key: group.key,
      label: group.label,
      locations: [...group.locations.values()]
        .map((location) => finalizeLocation(location, group))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
