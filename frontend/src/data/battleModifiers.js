// Itens, habilidades e grupos de golpes que a calculadora de dano sabe aplicar.
// Slugs da PokéAPI. O que não estiver aqui pode ser escolhido, mas não altera a conta.

/* ---------------------------------------------------------------- itens */

// Item que aumenta em 20% o poder dos golpes de um tipo.
export const TYPE_BOOST_ITEMS = {
  'silk-scarf': 'normal',
  charcoal: 'fire',
  'mystic-water': 'water',
  'miracle-seed': 'grass',
  magnet: 'electric',
  'never-melt-ice': 'ice',
  'black-belt': 'fighting',
  'poison-barb': 'poison',
  'soft-sand': 'ground',
  'sharp-beak': 'flying',
  'twisted-spoon': 'psychic',
  'silver-powder': 'bug',
  'hard-stone': 'rock',
  'spell-tag': 'ghost',
  'dragon-fang': 'dragon',
  'black-glasses': 'dark',
  'metal-coat': 'steel',
  'fairy-feather': 'fairy',
};

// Berry que corta pela metade um golpe super efetivo do tipo (Chilan vale para Normal em qualquer caso).
export const RESIST_BERRIES = {
  'chilan-berry': 'normal',
  'occa-berry': 'fire',
  'passho-berry': 'water',
  'rindo-berry': 'grass',
  'wacan-berry': 'electric',
  'yache-berry': 'ice',
  'chople-berry': 'fighting',
  'kebia-berry': 'poison',
  'shuca-berry': 'ground',
  'coba-berry': 'flying',
  'payapa-berry': 'psychic',
  'tanga-berry': 'bug',
  'charti-berry': 'rock',
  'kasib-berry': 'ghost',
  'haban-berry': 'dragon',
  'colbur-berry': 'dark',
  'babiri-berry': 'steel',
  'roseli-berry': 'fairy',
};

const typeLabel = (type) => type.charAt(0).toUpperCase() + type.slice(1);
const slugLabel = (slug) => slug.split('-').map(typeLabel).join(' ');

export const ITEM_GROUPS = [
  {
    label: 'Ataque',
    items: [
      ['choice-band', 'Choice Band · Atk ×1,5'],
      ['choice-specs', 'Choice Specs · SpA ×1,5'],
      ['life-orb', 'Life Orb · dano ×1,3'],
      ['expert-belt', 'Expert Belt · super efetivo ×1,2'],
      ['muscle-band', 'Muscle Band · físico ×1,1'],
      ['wise-glasses', 'Wise Glasses · especial ×1,1'],
      ['booster-energy', 'Booster Energy · ativa Protosynthesis e Quark Drive'],
      ...Object.entries(TYPE_BOOST_ITEMS).map(([slug, type]) => [slug, `${slugLabel(slug)} · ${typeLabel(type)} ×1,2`]),
    ],
  },
  {
    label: 'Defesa',
    items: [
      ['eviolite', 'Eviolite · Def e SpD ×1,5'],
      ['assault-vest', 'Assault Vest · SpD ×1,5'],
      ['air-balloon', 'Air Balloon · imune a Ground'],
      ['heavy-duty-boots', 'Heavy-Duty Boots · ignora hazards'],
      ['safety-goggles', 'Safety Goggles · ignora a areia'],
      ...Object.entries(RESIST_BERRIES).map(([slug, type]) => [slug, `${slugLabel(slug)} · resiste a ${typeLabel(type)}`]),
    ],
  },
  {
    label: 'Recuperação e velocidade',
    items: [
      ['leftovers', 'Leftovers · recupera 1/16 por turno'],
      ['black-sludge', 'Black Sludge · 1/16 (Poison) ou −1/8'],
      ['choice-scarf', 'Choice Scarf · Spe ×1,5'],
    ],
  },
];

export const KNOWN_ITEMS = new Set(ITEM_GROUPS.flatMap((group) => group.items.map(([slug]) => slug)));

/* ---------------------------------------------------------------- habilidades */

// Descrição curta do efeito na conta, exibida ao lado do nome no seletor.
export const ABILITY_EFFECTS = {
  adaptability: 'STAB ×2',
  'huge-power': 'Atk ×2',
  'pure-power': 'Atk ×2',
  hustle: 'Atk ×1,5',
  guts: 'Atk ×1,5 com status',
  technician: 'poder ≤ 60 ×1,5',
  'sheer-force': 'golpes com efeito ×1,3',
  'iron-fist': 'socos ×1,2',
  'strong-jaw': 'mordidas ×1,5',
  'mega-launcher': 'pulsos ×1,5',
  'tinted-lens': 'pouco efetivo ×2',
  sniper: 'crítico ×2,25',
  'solar-power': 'SpA ×1,5 no sol',
  'sand-force': 'Rock/Ground/Steel ×1,3 na areia',
  'water-bubble': 'Water ×2 · Fire recebido ×0,5',
  transistor: 'Electric ×1,3',
  'dragons-maw': 'Dragon ×1,5',
  'rocky-payload': 'Rock ×1,5',
  steelworker: 'Steel ×1,5',
  aerilate: 'Normal vira Flying ×1,2',
  pixilate: 'Normal vira Fairy ×1,2',
  refrigerate: 'Normal vira Ice ×1,2',
  galvanize: 'Normal vira Electric ×1,2',
  scrappy: 'Normal/Fighting acertam Ghost',
  'minds-eye': 'Normal/Fighting acertam Ghost',
  'mold-breaker': 'ignora habilidades do alvo',
  teravolt: 'ignora habilidades do alvo',
  turboblaze: 'ignora habilidades do alvo',
  unaware: 'ignora estágios do oponente',
  levitate: 'imune a Ground',
  'flash-fire': 'imune a Fire',
  'well-baked-body': 'imune a Fire',
  'water-absorb': 'imune a Water',
  'storm-drain': 'imune a Water',
  'dry-skin': 'imune a Water · Fire ×1,25',
  'volt-absorb': 'imune a Electric',
  'lightning-rod': 'imune a Electric',
  'motor-drive': 'imune a Electric',
  'sap-sipper': 'imune a Grass',
  'earth-eater': 'imune a Ground',
  'wonder-guard': 'só super efetivo acerta',
  'thick-fat': 'Fire/Ice ×0,5',
  heatproof: 'Fire ×0,5',
  'purifying-salt': 'Ghost ×0,5',
  multiscale: 'HP cheio: dano ×0,5',
  'shadow-shield': 'HP cheio: dano ×0,5',
  filter: 'super efetivo ×0,75',
  'solid-rock': 'super efetivo ×0,75',
  'prism-armor': 'super efetivo ×0,75',
  'fur-coat': 'Def ×2',
  'ice-scales': 'especial ×0,5',
  fluffy: 'Fire recebido ×2',
  'marvel-scale': 'Def ×1,5 com status',
  'magic-guard': 'sem dano indireto',
  'swift-swim': 'Spe ×2 na chuva',
  chlorophyll: 'Spe ×2 no sol',
  'sand-rush': 'Spe ×2 na areia',
  'slush-rush': 'Spe ×2 na neve',
  'quick-feet': 'Spe ×1,5 com status',
  'surge-surfer': 'Spe ×2 no Electric Terrain',
  'gorilla-tactics': 'Atk ×1,5',
  'flower-gift': 'Atk e SpD ×1,5 no sol',
  'slow-start': 'Atk e Spe ×0,5',
  'toxic-boost': 'físico ×1,5 envenenado',
  'flare-boost': 'especial ×1,5 queimado',
  'steely-spirit': 'Steel ×1,5',
  sharpness: 'golpes cortantes ×1,5',
  reckless: 'golpes com recuo ×1,2',
  'punk-rock': 'som ×1,3 · som recebido ×0,5',
  'liquid-voice': 'golpes de som viram Water',
  normalize: 'tudo vira Normal ×1,2',
  neuroforce: 'super efetivo ×1,25',
  merciless: 'crítico garantido em alvo envenenado',
  infiltrator: 'ignora Reflect, Light Screen e Aurora Veil',
  'skill-link': 'golpes de vários acertos sempre no máximo',
  'parental-bond': 'acerta duas vezes (2º ×0,25)',
  protean: 'STAB em todos os golpes',
  libero: 'STAB em todos os golpes',
  'orichalcum-pulse': 'traz sol · Atk ×1,33 no sol',
  'hadron-engine': 'traz Electric Terrain · SpA ×1,33 nele',
  protosynthesis: 'maior atributo ×1,3 no sol (Spe ×1,5)',
  'quark-drive': 'maior atributo ×1,3 no Electric Terrain (Spe ×1,5)',
  'sword-of-ruin': 'Def do oponente ×0,75',
  'beads-of-ruin': 'SpD do oponente ×0,75',
  'tablets-of-ruin': 'Atk do oponente ×0,75',
  'vessel-of-ruin': 'SpA do oponente ×0,75',
  'fairy-aura': 'Fairy em campo ×1,33',
  'dark-aura': 'Dark em campo ×1,33',
  'aura-break': 'inverte as auras (×0,75)',
  'grass-pelt': 'Def ×1,5 no Grassy Terrain',
  'tera-shell': 'HP cheio: tudo pouco efetivo',
  'battle-armor': 'não sofre crítico',
  'shell-armor': 'não sofre crítico',
  sturdy: 'HP cheio: não cai de um golpe só',
  soundproof: 'imune a golpes de som',
  bulletproof: 'imune a bombas e esferas',
  'wind-rider': 'imune a golpes de vento',
  dazzling: 'imune a prioridade',
  'queenly-majesty': 'imune a prioridade',
  'armor-tail': 'imune a prioridade',
  'bad-dreams': 'oponente dormindo perde 1/8 por turno',
  'poison-heal': 'envenenado recupera 1/8 por turno',
  'rain-dish': 'recupera 1/16 na chuva',
  'ice-body': 'recupera 1/16 na neve',
  'cloud-nine': 'anula o clima',
  'air-lock': 'anula o clima',
  'neutralizing-gas': 'anula as habilidades do oponente',
  comatose: 'conta como dormindo',
  'electric-surge': 'traz Electric Terrain',
  'grassy-surge': 'traz Grassy Terrain',
  'misty-surge': 'traz Misty Terrain',
  'psychic-surge': 'traz Psychic Terrain',
  drought: 'traz sol',
  drizzle: 'traz chuva',
  'sand-stream': 'traz areia',
  'snow-warning': 'traz neve',
  'desolate-land': 'traz sol extremo',
  'primordial-sea': 'traz chuva torrencial',
  'delta-stream': 'traz ventos fortes',
};

export const MOLD_BREAKERS = new Set(['mold-breaker', 'teravolt', 'turboblaze']);
// Habilidades defensivas que Mold Breaker não atravessa.
export const UNBREAKABLE_ABILITIES = new Set(['shadow-shield', 'prism-armor']);
export const WEATHER_SUPPRESSORS = new Set(['cloud-nine', 'air-lock']);
export const PRIORITY_BLOCKERS = new Set(['dazzling', 'queenly-majesty', 'armor-tail']);

/* ---------------------------------------------------------------- golpes */

const PUNCH_MOVES = new Set([
  'sky-uppercut', 'hammer-arm', 'ice-hammer', 'meteor-mash', 'double-iron-bash', 'rage-fist',
  'headlong-rush', 'surging-strikes', 'wicked-blow',
]);
export const isPunch = (slug) => slug.includes('punch') || PUNCH_MOVES.has(slug);

export const BITE_MOVES = new Set([
  'bite', 'crunch', 'fire-fang', 'ice-fang', 'thunder-fang', 'poison-fang', 'psychic-fangs',
  'hyper-fang', 'jaw-lock', 'fishious-rend',
]);

export const PULSE_MOVES = new Set(['aura-sphere', 'dark-pulse', 'dragon-pulse', 'water-pulse', 'origin-pulse', 'terrain-pulse']);

export const SOUND_MOVES = new Set([
  'boomburst', 'hyper-voice', 'bug-buzz', 'clanging-scales', 'disarming-voice', 'echoed-voice', 'overdrive',
  'relic-song', 'round', 'snarl', 'sparkling-aria', 'uproar', 'chatter', 'psychic-noise', 'alluring-voice',
  'torch-song', 'eerie-spell', 'snore',
]);

export const SLICING_MOVES = new Set([
  'aerial-ace', 'air-cutter', 'air-slash', 'aqua-cutter', 'behemoth-blade', 'bitter-blade', 'ceaseless-edge',
  'cross-poison', 'cut', 'fury-cutter', 'kowtow-cleave', 'leaf-blade', 'night-slash', 'population-bomb',
  'psycho-cut', 'razor-leaf', 'razor-shell', 'sacred-sword', 'secret-sword', 'slash', 'solar-blade',
  'stone-axe', 'x-scissor', 'tachyon-cutter', 'mighty-cleave', 'psyblade',
]);

export const RECOIL_MOVES = new Set([
  'brave-bird', 'double-edge', 'flare-blitz', 'head-charge', 'head-smash', 'high-jump-kick', 'jump-kick',
  'light-of-ruin', 'submission', 'take-down', 'volt-tackle', 'wave-crash', 'wild-charge', 'wood-hammer',
  'supercell-slam', 'axe-kick',
]);

// Bombas e esferas, barradas por Bulletproof.
export const BALL_MOVES = new Set([
  'acid-spray', 'aura-sphere', 'barrage', 'beak-blast', 'bullet-seed', 'egg-bomb', 'electro-ball', 'energy-ball',
  'focus-blast', 'gyro-ball', 'ice-ball', 'magnet-bomb', 'mist-ball', 'mud-bomb', 'octazooka', 'pollen-puff',
  'pyro-ball', 'rock-blast', 'rock-wrecker', 'searing-shot', 'seed-bomb', 'shadow-ball', 'sludge-bomb',
  'weather-ball', 'zap-cannon', 'syrup-bomb',
]);

export const WIND_MOVES = new Set([
  'aeroblast', 'air-cutter', 'bleakwind-storm', 'blizzard', 'fairy-wind', 'gust', 'heat-wave', 'hurricane',
  'icy-wind', 'petal-blizzard', 'sandsear-storm', 'springtide-storm', 'twister', 'wildbolt-storm',
]);

// Golpes que perdem metade do poder contra alvos no chão em Grassy Terrain.
export const GRASSY_HALVED = new Set(['earthquake', 'bulldoze', 'magnitude']);


/* ---------------------------------------------------------------- campo */

export const WEATHERS = [
  { value: '', label: 'Sem clima' },
  { value: 'sun', label: 'Sun (sol)' },
  { value: 'rain', label: 'Rain (chuva)' },
  { value: 'sand', label: 'Sand (tempestade de areia)' },
  { value: 'snow', label: 'Snow (neve)' },
  { value: 'harsh-sun', label: 'Harsh Sunshine (sol extremo)' },
  { value: 'heavy-rain', label: 'Heavy Rain (chuva torrencial)' },
  { value: 'strong-winds', label: 'Strong Winds (ventos fortes)' },
];

// Habilidades que trazem o clima ao entrar em campo. As três "primais" vencem qualquer outro clima.
export const WEATHER_ABILITIES = {
  drought: 'sun',
  'orichalcum-pulse': 'sun',
  drizzle: 'rain',
  'sand-stream': 'sand',
  'snow-warning': 'snow',
  'desolate-land': 'harsh-sun',
  'primordial-sea': 'heavy-rain',
  'delta-stream': 'strong-winds',
};
export const PRIMAL_WEATHERS = new Set(['harsh-sun', 'heavy-rain', 'strong-winds']);

// Habilidades que trazem o terreno ao entrar em campo.
export const TERRAIN_ABILITIES = {
  'electric-surge': 'electric',
  'hadron-engine': 'electric',
  'grassy-surge': 'grassy',
  'misty-surge': 'misty',
  'psychic-surge': 'psychic',
};

export const TERRAINS = [
  { value: '', label: 'Sem terreno' },
  { value: 'electric', label: 'Electric Terrain' },
  { value: 'grassy', label: 'Grassy Terrain' },
  { value: 'misty', label: 'Misty Terrain' },
  { value: 'psychic', label: 'Psychic Terrain' },
];

export const STATUSES = [
  { value: '', label: 'Saudável' },
  { value: 'burn', label: 'Queimado' },
  { value: 'poison', label: 'Envenenado' },
  { value: 'paralysis', label: 'Paralisado' },
  { value: 'sleep', label: 'Dormindo' },
  { value: 'freeze', label: 'Congelado' },
];
