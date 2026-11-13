import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, BookOpen, Cpu, Egg, NotebookPen, Ruler, Search, Shield, Sparkles, Swords, Weight, X,
} from 'lucide-react';
import PokemonTypeBadge, { TYPE_INK } from './PokemonTypeBadge';
import PokemonEncounters from './PokemonEncounters';
import EvolutionTree from './EvolutionTree';
import PokemonCry from './PokemonCry';
import MoveAbilityModal from './MoveAbilityModal';
import PokemonBuilds from './PokemonBuilds';
import FavoriteButton from './FavoriteButton';
import { capitalize } from '../utils/typeColors';
import {
  fetchEvolutionChain, fetchMove, fetchPokemonDetail, fetchPokemonSpecies,
  fetchSmogonNames, fetchSmogonStats, fetchTypeData, officialSpriteUrl,
} from '../services/api';
import { resolveSmogonName } from '../utils/smogon';
import BrushLoader from './BrushLoader';
import { BrushHighlight } from './InkDecor';

/* ---------------------------------------------------------------- dados estáticos */

const SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const STAT_META = {
  hp: { label: 'HP', color: '#829b72' },
  attack: { label: 'Ataque', color: '#B5654A' },
  defense: { label: 'Defesa', color: '#C9A66B' },
  'special-attack': { label: 'Atq. Esp.', color: '#6D98B5' },
  'special-defense': { label: 'Def. Esp.', color: '#7AB8B8' },
  speed: { label: 'Velocidade', color: '#B87A8A' },
};

const SMOGON_TIERS = [
  { value: 'gen9ou', label: 'Gen 9 OU' },
  { value: 'gen9ubers', label: 'Gen 9 Ubers' },
  { value: 'gen9uu', label: 'Gen 9 UU' },
  { value: 'gen9ru', label: 'Gen 9 RU' },
  { value: 'gen9nu', label: 'Gen 9 NU' },
  { value: 'gen9pu', label: 'Gen 9 PU' },
  { value: 'gen9lc', label: 'Gen 9 LC' },
  { value: 'gen9doublesou', label: 'Gen 9 Doubles OU' },
];

const MOVE_GENERATIONS = [
  { value: 'gen9', label: 'Gen 9 (Scarlet/Violet)' },
  { value: 'gen8', label: 'Gen 8 (Sw/Sh, PLA)' },
  { value: 'gen7', label: 'Gen 7 (S/M, US/UM)' },
  { value: 'gen6', label: 'Gen 6 (X/Y, ORAS)' },
  { value: 'gen5', label: 'Gen 5 (B/W, B2/W2)' },
  { value: 'gen4', label: 'Gen 4 (DPPt, HGSS)' },
  { value: 'gen3', label: 'Gen 3 (RSE, FRLG)' },
  { value: 'gen2', label: 'Gen 2 (GSC)' },
  { value: 'gen1', label: 'Gen 1 (RBY)' },
];

// Ordem = prioridade: o primeiro version group onde o Pokémon tem golpes define o learnset.
const GENERATION_VERSION_GROUPS = {
  gen9: ['scarlet-violet'],
  gen8: ['sword-shield', 'brilliant-diamond-and-shining-pearl', 'legends-arceus'],
  gen7: ['ultra-sun-ultra-moon', 'sun-moon', 'lets-go-pikachu-lets-go-eevee'],
  gen6: ['omega-ruby-alpha-sapphire', 'x-y'],
  gen5: ['black-2-white-2', 'black-white'],
  gen4: ['heartgold-soulsilver', 'platinum', 'diamond-pearl'],
  gen3: ['emerald', 'firered-leafgreen', 'ruby-sapphire'],
  gen2: ['crystal', 'gold-silver'],
  gen1: ['yellow', 'red-blue'],
};

const LEARN_METHODS = [
  { value: 'level-up', label: 'Por Nível' },
  { value: 'machine', label: 'TM / TR' },
  { value: 'egg', label: 'Ovo' },
];
const LEARN_METHOD_SET = new Set(LEARN_METHODS.map((m) => m.value));

const TABS = [
  { value: 'overview', label: 'Ficha de Campo', icon: BookOpen },
  { value: 'competitive', label: 'Competitivo', icon: BarChart3 },
  { value: 'moves', label: 'Movimentos', icon: Swords },
  { value: 'builds', label: 'Builds', icon: NotebookPen },
];

const EFFECTIVENESS_ROWS = {
  weak: [
    { key: 'quadruple', multiplier: '4×', label: 'Fraqueza extrema', tone: 'bg-[#780000] text-white' },
    { key: 'double', multiplier: '2×', label: 'Fraqueza', tone: 'bg-[#C15454] text-white' },
  ],
  resist: [
    { key: 'half', multiplier: '½×', label: 'Resistência', tone: 'bg-[#5B7856] text-white' },
    { key: 'quarter', multiplier: '¼×', label: 'Resistência dupla', tone: 'bg-[#3A4F38] text-white' },
    { key: 'immune', multiplier: '0×', label: 'Imunidade', tone: 'bg-[#2A2421] text-white' },
  ],
};

const PAPER_BG = {
  backgroundImage: 'var(--paper-grain)',
  backgroundSize: '220px 220px',
};

// As mesmas peças do resto do site: folha a nanquim, campo, pílula, botão redondo, bloco interno e rótulo.
const SHEET = 'paper-card paper-card-quiet';
const TILE = 'rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB]';
const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-[#785132]';
const FIELD = 'h-9 cursor-pointer rounded-xl border-[1.5px] border-[#2A2421]/25 bg-[#FFFEFB] px-3 text-xs font-semibold text-[#2A2421] transition-colors hover:border-[#2A2421]/45 focus:border-paint-cobalt focus:outline-none focus:ring-2 focus:ring-paint-cobalt/40';
const PILL = 'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-[background-color,border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const PILL_ON = 'border-[#2A2421]/70 bg-[#829b72] text-white shadow-[2px_2px_0_rgba(42,36,33,0.25)]';
const PILL_OFF = 'border-[#2A2421]/20 bg-[#FFFEFB] text-[#2A2421] hover:border-[#2A2421]/50';
const ROUND_BUTTON = 'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] transition-[border-color,box-shadow,color,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const ROUND_IDLE = 'border-[#2A2421]/25 bg-[#FFFEFB] text-[#5C4033] hover:border-[#2A2421]/60 hover:text-[#2A2421] hover:shadow-[2px_2px_0_rgba(42,36,33,0.15)]';
// Habilidades e golpes que abrem o modal de detalhes.
const CLICKABLE = 'transition-colors enabled:cursor-pointer enabled:hover:border-[#829b72] enabled:hover:bg-[#F7F3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';

/* ---------------------------------------------------------------- helpers puros */

// A Smogon lista "Nothing" e "Other" entre golpes e habilidades; não existem na PokéAPI.
const isSmogonPlaceholder = (name) => /^(nothing|other)$/i.test(name);

function formatFormName(formName) {
  if (!formName) return '';
  return formName
    .replace(/-mega-x$/i, ' Mega X')
    .replace(/-mega-y$/i, ' Mega Y')
    .replace(/-rotom-(heat|wash|frost|fan|mow)$/i, ' Rotom $1')
    .replace(/-(mega|primal|alola|galar|hisui|paldea|partner)$/i, ' $1')
    .split('-')
    .map(capitalize)
    .join(' ');
}

const getCleanPokemonName = (name) => (name ? name.toLowerCase().trim() : '');

const formatDexNumber = (id) => `#${String(id ?? 0).padStart(4, '0')}`;

function spriteSources(detail, shiny) {
  const other = detail.sprites?.other ?? {};
  const variant = shiny ? 'shiny/' : '';
  const animated = shiny ? other.showdown?.front_shiny : other.showdown?.front_default;
  const artwork = shiny ? other['official-artwork']?.front_shiny : other['official-artwork']?.front_default;
  return [
    animated ?? `${SPRITES_BASE}/other/showdown/${variant}${detail.id}.gif`,
    artwork ?? `${SPRITES_BASE}/other/official-artwork/${variant}${detail.id}.png`,
    shiny ? detail.sprites?.front_shiny : detail.sprites?.front_default,
    officialSpriteUrl(detail.id),
  ].filter(Boolean);
}

function resolveVersionGroup(moves, gen) {
  const available = new Set(moves.flatMap((m) => m.version_group_details.map((v) => v.version_group.name)));
  return GENERATION_VERSION_GROUPS[gen]?.find((g) => available.has(g)) ?? null;
}

function collectLearnset(moves, versionGroup) {
  const seen = new Set();
  const learnset = [];
  for (const { move, version_group_details } of moves) {
    for (const vgd of version_group_details) {
      const method = vgd.move_learn_method.name;
      if (vgd.version_group.name !== versionGroup || !LEARN_METHOD_SET.has(method)) continue;
      const level = method === 'level-up' ? vgd.level_learned_at : null;
      const id = `${move.name}-${method}-${level}`;
      if (seen.has(id)) continue;
      seen.add(id);
      learnset.push({ id, name: move.name, url: move.url, learn_method: method, level });
    }
  }
  return learnset;
}

function calculateTypeEffectiveness(typeDataArray) {
  const multipliers = {};
  const apply = (list, factor) => {
    for (const t of list ?? []) multipliers[t.name] = (multipliers[t.name] ?? 1) * factor;
  };
  for (const { damage_relations } of typeDataArray) {
    apply(damage_relations.no_damage_from, 0);
    apply(damage_relations.half_damage_from, 0.5);
    apply(damage_relations.double_damage_from, 2);
  }

  const grouped = { immune: [], quarter: [], half: [], double: [], quadruple: [] };
  for (const [type, mult] of Object.entries(multipliers)) {
    if (mult === 0) grouped.immune.push(type);
    else if (mult === 0.25) grouped.quarter.push(type);
    else if (mult === 0.5) grouped.half.push(type);
    else if (mult === 2) grouped.double.push(type);
    else if (mult === 4) grouped.quadruple.push(type);
  }
  return grouped;
}

async function fetchTypeEffectiveness(types) {
  const typeData = await Promise.all(types.map((t) => fetchTypeData(t.type.name)));
  return calculateTypeEffectiveness(typeData.filter(Boolean));
}

// A Smogon agrupa o que sobra em "Other"; não é uma habilidade, item, golpe nem spread de verdade.
const topEntries = (record, count) =>
  Object.entries(record ?? {})
    .filter(([name]) => name.toLowerCase() !== 'other')
    .sort(([, a], [, b]) => b - a)
    .slice(0, count);

// "Natureza:HP/Atk/Def/SpA/SpD/Spe", com seis valores de EV.
const SPREAD_PATTERN = /^([A-Za-z]+):(\d+(?:\/\d+){5})$/;

/** Spreads mais usadas, já decompostas; entradas fora do formato (como "Other") ficam de fora. */
function topSpreads(record, count) {
  return topEntries(record, Infinity)
    .map(([key, pct]) => {
      const match = SPREAD_PATTERN.exec(key);
      return match && { key, nature: match[1], evs: match[2].split('/').map(Number), pct };
    })
    .filter(Boolean)
    .slice(0, count);
}

/* ---------------------------------------------------------------- sub-componentes */

function TabStroke({ active }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-2 bottom-1 h-[3px] w-[calc(100%-1rem)] origin-left transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
        active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      }`}
    >
      <path
        fill="#829b72"
        d="M2 6.1C14 3.3 27 2.5 41 3.1c13 .6 24 1.8 38 1.2 13-.6 25-2.3 38-1.5 1.7.1 2 2.4.3 2.9-12 3.5-25 3.2-38 3.5-14 .3-27-1-41-.7-12 .3-23 1.7-35 1.2C.9 9.6.3 6.5 2 6.1z"
      />
    </svg>
  );
}

const HeroSprite = memo(function HeroSprite({ sources, alt }) {
  const [index, setIndex] = useState(0);
  const src = sources[Math.min(index, sources.length - 1)];
  const animated = src.endsWith('.gif');

  return (
    <img
      src={src}
      alt={alt}
      width={80}
      height={80}
      decoding="async"
      onError={() => setIndex((i) => (i + 1 < sources.length ? i + 1 : i))}
      className={`relative h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(42,36,33,0.18)] ${animated ? '[image-rendering:pixelated] scale-[1.35]' : ''}`}
    />
  );
});

const SectionCard = memo(function SectionCard({ icon: Icon, title, action, className = '', children }) {
  return (
    <section className={`${SHEET} space-y-3 p-4 sm:p-5 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-base font-bold tracking-tight text-[#2A2421]">
          {Icon && <Icon className="h-4 w-4 text-[#829b72]" aria-hidden="true" />}
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
});

const StatBar = memo(function StatBar({ name, value }) {
  const meta = STAT_META[name] ?? { label: capitalize(name), color: '#829b72' };
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 font-semibold text-[#785132]">{meta.label}</span>
      <div className="brush-bar-track flex-1">
        <div className="brush-bar" style={{ width: `max(${(value / 255) * 100}%, 6px)`, backgroundColor: meta.color }} />
      </div>
      <span className="w-8 text-right font-mono font-bold tabular-nums text-[#2A2421]">{value}</span>
    </div>
  );
});

const EffectivenessRow = memo(function EffectivenessRow({ types, multiplier, label, tone }) {
  if (!types?.length) return null;
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB]">
      <span className={`shrink-0 w-11 py-1 rounded-lg text-center text-[11px] font-black ${tone}`}>{multiplier}</span>
      <div className="space-y-1">
        <span className={`block ${LABEL}`}>{label}</span>
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => <PokemonTypeBadge key={t} type={t} />)}
        </div>
      </div>
    </div>
  );
});

const UsageChip = memo(function UsageChip({ name, pct, onSelect }) {
  const Tag = onSelect ? 'button' : 'span';
  const interactive = onSelect && { type: 'button', onClick: () => onSelect(name), disabled: isSmogonPlaceholder(name) };
  return (
    <Tag
      {...interactive}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#2A2421]/20 bg-[#FFFEFB] px-3 py-1.5 text-xs font-semibold capitalize ${onSelect ? CLICKABLE : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#829b72]" aria-hidden="true" />
      <span className="text-[#2A2421]">{name}</span>
      <span className="text-[10px] font-bold text-[#78614E]">{pct.toFixed(1)}%</span>
    </Tag>
  );
});

// `pct` já vem em percentual (os valores de `smogon.spreads` somam 100).
const SpreadCard = memo(function SpreadCard({ index, nature, evs, pct }) {
  const [hp, atk, def, spa, spd, spe] = evs;
  return (
    <div className="p-3 rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB]">
      <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-[#2A2421]">
        <span>
          Build {index + 1}
          <span className="ml-1 font-normal text-[10px] text-[#78614E]">({pct.toFixed(1)}%)</span>
        </span>
        <span className="px-2 py-0.5 rounded bg-[#829b72]/15 text-[#5B7856] text-[10px] font-mono">{nature}</span>
      </div>
      <p className="text-[11px] font-mono text-[#78614E] bg-[#F7F3EE] p-1.5 rounded">
        {hp} HP / {atk} Atk / {def} Def / {spa} SpA / {spd} SpD / {spe} Spe
      </p>
    </div>
  );
});

/* ---------------------------------------------------------------- drawer */

export default function PokemonDrawer({
  pokemonName, onClose, onSmogonDataFound, favorites, gridEntries, onToggleFavorite,
}) {
  const [detail, setDetail] = useState(null);
  const [species, setSpecies] = useState(null);
  const [forms, setForms] = useState([]);
  const [baseFormName, setBaseFormName] = useState(null);
  const [currentFormName, setCurrentFormName] = useState(null);
  const [evolutionChain, setEvolutionChain] = useState(null);
  const [typeEffectiveness, setTypeEffectiveness] = useState(null);
  const [loading, setLoading] = useState(true);

  const [shiny, setShiny] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [smogon, setSmogon] = useState(null);
  const [smogonLoading, setSmogonLoading] = useState(false);
  const [smogonError, setSmogonError] = useState(false);
  const [selectedSmogonTier, setSelectedSmogonTier] = useState('gen9ou');

  const [moveset, setMoveset] = useState([]);
  const [movesetLoading, setMovesetLoading] = useState(false);
  const [movesVisited, setMovesVisited] = useState(false);
  const [movesetSearch, setMovesetSearch] = useState('');
  const [learnMethod, setLearnMethod] = useState('level-up');
  const [selectedGen, setSelectedGen] = useState('gen9');

  // Golpe, habilidade ou item aberto no modal de detalhes: { kind, name } | null
  const [infoEntry, setInfoEntry] = useState(null);

  // Invalida respostas de troca de forma pendentes (troca rápida, mudança de Pokémon ou unmount).
  const formRequestRef = useRef(0);

  useEffect(() => {
    let active = true;
    formRequestRef.current++;
    setLoading(true);
    setActiveTab('overview');
    // Outro Pokémon: o learnset só volta a ser baixado se a aba Movimentos for aberta de novo.
    setMovesVisited(false);
    const cleanName = getCleanPokemonName(pokemonName);

    (async () => {
      try {
        // Caminho rápido: na maioria das espécies o slug do Pokémon é o da espécie.
        // Para formas (landorus-therian, deoxys-attack…) a espécie vem do próprio detalhe.
        const [d, guessedSpecies] = await Promise.all([
          fetchPokemonDetail(cleanName),
          fetchPokemonSpecies(cleanName),
        ]);
        const s = guessedSpecies?.name === d.species?.name
          ? guessedSpecies
          : await fetchPokemonSpecies(d.species?.name ?? cleanName);
        const [effectiveness, chainData] = await Promise.all([
          fetchTypeEffectiveness(d.types),
          s?.evolution_chain?.url ? fetchEvolutionChain(s.evolution_chain.url) : null,
        ]);
        if (!active) return;

        const varieties = s?.varieties ?? [];
        setDetail(d);
        setSpecies(s);
        setForms(varieties.filter((v) => !v.is_default).map((v) => v.pokemon.name));
        setBaseFormName(varieties.find((v) => v.is_default)?.pokemon.name ?? cleanName);
        setCurrentFormName(cleanName);
        setTypeEffectiveness(effectiveness);
        setEvolutionChain(chainData?.chain ?? null);
      } catch (err) {
        console.error('Erro ao carregar Pokémon:', err);
        if (active) setDetail(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      formRequestRef.current++;
    };
  }, [pokemonName]);

  // As estatísticas são buscadas pelo nome exato da variedade na Smogon ("Urshifu-Rapid-Strike").
  // Uma forma sem nome próprio na Smogon fica sem dados; nunca recebe os da espécie base.
  const speciesName = species?.name ?? detail?.species?.name;
  const variety = useMemo(
    () => ({ name: currentFormName, species: speciesName, isForm: currentFormName !== baseFormName }),
    [currentFormName, speciesName, baseFormName],
  );
  useEffect(() => {
    if (!currentFormName || !speciesName) return;
    const controller = new AbortController();
    setSmogonLoading(true);
    setSmogonError(false);

    fetchSmogonNames()
      .then((names) => {
        const smogonName = resolveSmogonName(variety, names);
        return smogonName && !controller.signal.aborted
          ? fetchSmogonStats(smogonName, selectedSmogonTier, { signal: controller.signal })
          : null;
      })
      .then((stats) => {
        if (controller.signal.aborted) return;
        setSmogon(stats);
        if (stats) onSmogonDataFound?.(pokemonName);
      })
      .catch((err) => {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        setSmogon(null);
        setSmogonError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setSmogonLoading(false); });

    return () => controller.abort();
  }, [variety, currentFormName, speciesName, selectedSmogonTier, pokemonName, onSmogonDataFound]);

  // O learnset (100–200 requisições) só é carregado quando a aba Movimentos é aberta.
  useEffect(() => {
    if (!detail || !movesVisited) return;
    let active = true;
    setMovesetLoading(true);
    const versionGroup = resolveVersionGroup(detail.moves, selectedGen);
    const learnset = versionGroup ? collectLearnset(detail.moves, versionGroup) : [];

    Promise.all(learnset.map((entry) => fetchMove(entry.url).then((data) => ({
      ...entry,
      damage_class: data?.damage_class?.name ?? 'status',
      type: data?.type?.name ?? 'normal',
      power: data?.power ?? null,
      accuracy: data?.accuracy ?? null,
      pp: data?.pp ?? null,
    })))).then((rows) => {
      if (!active) return;
      setMoveset(rows);
      setMovesetLoading(false);
    });

    return () => { active = false; };
  }, [detail, selectedGen, movesVisited]);

  const handleFormChange = useCallback(async (formName) => {
    const requestId = ++formRequestRef.current;
    setCurrentFormName(formName);
    try {
      const formDetail = await fetchPokemonDetail(getCleanPokemonName(formName));
      const effectiveness = await fetchTypeEffectiveness(formDetail.types);
      if (requestId !== formRequestRef.current) return;
      setDetail(formDetail);
      setTypeEffectiveness(effectiveness);
    } catch (err) {
      console.error('Erro ao trocar forma:', err);
    }
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'moves') setMovesVisited(true);
  }, []);

  const toggleShiny = useCallback(() => setShiny((s) => !s), []);

  const openAbility = useCallback((name) => setInfoEntry({ kind: 'ability', name }), []);
  const openMove = useCallback((name) => setInfoEntry({ kind: 'move', name }), []);
  const openItem = useCallback((name) => setInfoEntry({ kind: 'item', name }), []);
  const closeInfo = useCallback(() => setInfoEntry(null), []);

  const visibleMoves = useMemo(() => {
    const term = movesetSearch.trim().toLowerCase();
    return moveset
      .filter((m) => m.learn_method === learnMethod && (!term || m.name.includes(term)))
      .sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity) || a.name.localeCompare(b.name));
  }, [moveset, learnMethod, movesetSearch]);

  const heroSources = useMemo(() => (detail ? spriteSources(detail, shiny) : []), [detail, shiny]);

  const spreads = useMemo(() => topSpreads(smogon?.spreads, 2), [smogon]);

  /* ------------------------------------------------------------ estados vazios */

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F7F3EE]" style={PAPER_BG}>
        <BrushLoader label="Carregando dados de campo..." />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#F7F3EE] p-6 text-center" style={PAPER_BG}>
        <p className="text-sm font-medium text-[#78614E]">Não foi possível carregar “{formatFormName(pokemonName)}”.</p>
        <button type="button" onClick={onClose} className="btn-action">Fechar</button>
      </div>
    );
  }

  /* ------------------------------------------------------------ derivados de render */

  const currentTypes = detail.types.map((t) => t.type.name);
  const primaryInk = TYPE_INK[currentTypes[0]] ?? TYPE_INK.normal;
  const baseStats = detail.stats.map((s) => ({ name: s.stat.name, value: s.base_stat }));
  const totalStat = baseStats.reduce((sum, s) => sum + s.value, 0);
  const isAlternateForm = Boolean(currentFormName && baseFormName && currentFormName !== baseFormName);
  const displayName = formatFormName(detail.name);
  // Favorita-se a forma aberta quando ela existe na grade (Raticate de Alola); Megas e afins,
  // que só existem dentro da ficha, contam para o Pokémon que abriu a ficha.
  const favoriteName = gridEntries?.has(currentFormName) ? currentFormName : pokemonName;

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-[#F7F3EE]" style={PAPER_BG}>
      {/* Cabeçalho imersivo e fixo */}
      <header
        className="sticky top-0 z-20 border-b border-[#2A2421]/15"
        style={{ background: `radial-gradient(ellipse 55% 140% at 100% 0%, ${primaryInk.bg}, transparent 70%), radial-gradient(ellipse 40% 120% at 0% 100%, ${primaryInk.bg}99, transparent 70%), #FFFEFB` }}
      >
        {/*
          Celular: as ações ocupam a primeira linha, alinhadas à direita, e sprite + nome ficam com a largura toda.
          sm+: uma linha só, com as ações no fim.
        */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 pb-3 sm:flex-nowrap sm:gap-4 sm:px-5 sm:pt-4">
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#2A2421]/30 bg-[#FFFEFB] shadow-[3px_3px_0_rgba(42,36,33,0.12)] sm:h-24 sm:w-24"
          >
            {shiny && (
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#C9A66B] md:drop-shadow-sm" aria-hidden="true" />
            )}
            {/* A sombra do sprite é uma poça de aquarela na tinta do tipo. */}
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-1/2 h-4 w-14 -translate-x-1/2 rounded-[48%_52%_45%_55%/60%_55%_45%_40%] blur-[1.5px] sm:bottom-3 sm:w-16"
              style={{ background: `radial-gradient(ellipse at 50% 45%, ${primaryInk.border}99, ${primaryInk.border}33 60%, transparent 75%)` }}
            />
            <div className="w-16 h-16 sm:w-20 sm:h-20">
              <HeroSprite key={`${detail.id}-${shiny}`} sources={heroSources} alt={displayName} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#785132]">
              {formatDexNumber(species?.id ?? detail.id)}
              <span aria-hidden="true">·</span>
              {isAlternateForm ? 'Forma alternativa' : 'Pokédex'}
              {shiny && <span className="rounded border border-paint-ochre/50 bg-[#FBF1DC] px-1.5 text-[#6E4E14]">Shiny</span>}
            </p>
            <h2
              title={displayName}
              className="line-clamp-2 break-words font-serif text-xl font-black leading-tight tracking-tight text-[#2A2421] sm:text-3xl"
            >
              {/* A pincelada na tinta do tipo, como nos títulos das seções do site. */}
              <span className="relative isolate">
                <BrushHighlight color={primaryInk.border} />
                {displayName}
              </span>
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {currentTypes.map((type) => <PokemonTypeBadge key={type} type={type} />)}
            </div>
          </div>

          <div className="order-first flex w-full items-center justify-end gap-2 sm:order-none sm:w-auto sm:shrink-0 sm:self-start">
            {onToggleFavorite && (
              <FavoriteButton
                name={favoriteName}
                label={formatFormName(favoriteName)}
                active={favorites?.has(favoriteName) ?? false}
                onToggle={onToggleFavorite}
                variant="header"
              />
            )}
            <button
              type="button"
              onClick={toggleShiny}
              aria-pressed={shiny}
              title={shiny ? 'Ver cor normal' : 'Ver versão shiny'}
              className={`${ROUND_BUTTON} px-3 text-xs font-bold ${
                shiny ? 'border-paint-ochre bg-[#FBF1DC] text-[#6E4E14] shadow-[2px_2px_0_rgba(185,132,40,0.3)]' : ROUND_IDLE
              }`}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Shiny</span>
            </button>
            <PokemonCry criesUrl={detail.cries?.latest} pokemonId={detail.id} label={`Ouvir o cry de ${displayName}`} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className={`${ROUND_BUTTON} ${ROUND_IDLE} w-9`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas numa linha só: no celular dividem a largura; se ainda assim não couberem, rolam em vez de quebrar. */}
        <nav
          className="flex gap-0.5 sm:gap-1 overflow-x-auto px-2 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Seções do Pokémon"
        >
          {TABS.map(({ value, label, icon: Icon }) => {
            const active = activeTab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTabChange(value)}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap px-1 pb-3 pt-2.5 font-serif text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt sm:flex-none sm:px-3 sm:text-[13px] ${
                  active ? 'text-[#2A2421]' : 'text-[#785132]/80 hover:text-[#2A2421]'
                }`}
              >
                <Icon className={`hidden h-3.5 w-3.5 sm:block ${active ? 'text-[#829b72]' : ''}`} aria-hidden="true" />
                {label}
                <TabStroke active={active} />
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 p-4 space-y-4 sm:p-5 sm:space-y-5">
        {forms.length > 0 && (
          <div className={`${SHEET} flex flex-wrap items-center gap-2 px-4 py-3`}>
            <span className={`mr-1 ${LABEL}`}>Formas</span>
            {[baseFormName, ...forms].map((form, index) => {
              const selected = currentFormName === form;
              return (
                <button
                  key={form}
                  type="button"
                  onClick={() => handleFormChange(form)}
                  aria-pressed={selected}
                  className={`${PILL} ${selected ? PILL_ON : PILL_OFF}`}
                >
                  {index === 0 ? 'Base' : formatFormName(form)}
                </button>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------ Ficha de campo */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SectionCard
                icon={Cpu}
                title="Status Base"
                action={<span className="rounded-full border border-[#2A2421]/60 bg-[#829b72] px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-white shadow-[2px_2px_0_rgba(42,36,33,0.2)]">Total {totalStat}</span>}
              >
                <div className="space-y-2">
                  {baseStats.map((stat) => <StatBar key={stat.name} {...stat} />)}
                </div>
              </SectionCard>

              <SectionCard icon={Egg} title="Habilidades & Morfologia">
                <div className="flex flex-wrap gap-1.5">
                  {detail.abilities.map((a) => (
                    <button
                      key={a.ability.name}
                      type="button"
                      onClick={() => openAbility(a.ability.name)}
                      className={`rounded-lg border border-[#2A2421]/20 bg-[#FFFEFB] px-2.5 py-1 text-[11px] font-medium capitalize text-[#2A2421] ${CLICKABLE}`}
                    >
                      {a.ability.name.replace(/-/g, ' ')}
                      {a.is_hidden && <span className="ml-1 text-[9px] font-bold text-[#78614E]">(oculta)</span>}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFFEFB]/80 border border-[#2A2421]/10">
                    <Ruler className="w-4 h-4 text-[#78614E]" aria-hidden="true" />
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-[#78614E]">Altura</span>
                      <span className="text-xs font-bold text-[#2A2421]">{(detail.height / 10).toFixed(1)} m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFFEFB]/80 border border-[#2A2421]/10">
                    <Weight className="w-4 h-4 text-[#78614E]" aria-hidden="true" />
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-[#78614E]">Peso</span>
                      <span className="text-xs font-bold text-[#2A2421]">{(detail.weight / 10).toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>
                {species?.egg_groups?.length > 0 && (
                  <div>
                    <span className={`mb-1 block ${LABEL}`}>Grupos de ovo</span>
                    <div className="flex flex-wrap gap-1">
                      {species.egg_groups.map((g) => (
                        <span key={g.name} className="rounded-md border border-[#2A2421]/20 bg-[#FFFEFB] px-2 py-0.5 text-[10px] font-medium capitalize text-[#2A2421]">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {typeEffectiveness && (
              <SectionCard icon={Shield} title="Fraquezas & Resistências">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    {EFFECTIVENESS_ROWS.weak.map((row) => (
                      <EffectivenessRow key={row.key} types={typeEffectiveness[row.key]} multiplier={row.multiplier} label={row.label} tone={row.tone} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {EFFECTIVENESS_ROWS.resist.map((row) => (
                      <EffectivenessRow key={row.key} types={typeEffectiveness[row.key]} multiplier={row.multiplier} label={row.label} tone={row.tone} />
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Árvore Evolutiva">
              {evolutionChain ? (
                <EvolutionTree
                  chain={evolutionChain}
                  currentSpecies={species?.name}
                  currentForm={detail.name}
                  currentFormId={detail.id}
                />
              ) : (
                <p className="text-xs text-[#78614E]">Sem dados evolutivos.</p>
              )}
            </SectionCard>

            <PokemonEncounters pokemonId={detail.id} />
          </>
        )}

        {/* ------------------------------------------------ Competitivo */}
        {activeTab === 'competitive' && (
          <SectionCard
            icon={BarChart3}
            title="Painel Competitivo Smogon"
            action={
              <select value={selectedSmogonTier} onChange={(e) => setSelectedSmogonTier(e.target.value)} className={FIELD}>
                {SMOGON_TIERS.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}
              </select>
            }
          >
            {smogonLoading ? (
              <BrushLoader label="Sincronizando estatísticas..." className="py-8" />
            ) : smogon ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={LABEL}>Taxa de uso no tier</span>
                    <span className="font-serif text-2xl font-black tabular-nums text-[#5B7856]">{smogon.usage_percent?.toFixed(2)}%</span>
                  </div>
                  <div className="brush-bar-track">
                    <div className="brush-bar bg-[#829b72]" style={{ width: `max(${Math.min(smogon.usage_percent ?? 0, 100)}%, 6px)` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-[11px] text-[#78614E]">
                    <span>
                      <strong className="text-[#2A2421]">{smogon.name}</strong>
                      {' · '}
                      <span className="uppercase">{smogon.tier || selectedSmogonTier}</span>
                    </span>
                    <span>Coleta <strong className="text-[#2A2421]">{smogon.date}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 font-serif text-sm font-bold text-[#2A2421]">
                      <Cpu className="w-4 h-4 text-[#829b72]" aria-hidden="true" /> Spreads EV
                    </h4>
                    {spreads.length > 0 ? (
                      spreads.map(({ key, ...spread }, index) => <SpreadCard key={key} index={index} {...spread} />)
                    ) : (
                      <p className="text-[11px] italic text-[#78614E]">Nenhuma spread registrada.</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className={`mb-2 block ${LABEL}`}>Habilidades principais</span>
                      <div className="flex flex-wrap gap-1.5">
                        {topEntries(smogon.abilities, 3).map(([name, pct]) => (
                          <UsageChip key={name} name={name} pct={pct} onSelect={openAbility} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className={`mb-2 block ${LABEL}`}>Itens mais usados</span>
                      <div className="flex flex-wrap gap-1.5">
                        {topEntries(smogon.items, 3).map(([name, pct]) => <UsageChip key={name} name={name} pct={pct} />)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className={`mb-2 block ${LABEL}`}>Movimentos populares</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {topEntries(smogon.moves, 6).map(([name, pct]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => openMove(name)}
                        disabled={isSmogonPlaceholder(name)}
                        className={`flex items-center justify-between gap-3 p-2.5 text-left rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB] ${CLICKABLE}`}
                      >
                        <span className="text-xs font-bold capitalize text-[#2A2421]">{name.replace(/-/g, ' ')}</span>
                        <span className="flex items-center gap-2 w-1/3">
                          <span className="w-8 text-right text-[10px] font-bold text-[#78614E]">{pct.toFixed(0)}%</span>
                          <span className="brush-bar-track block flex-1 !h-1.5">
                            <span className="brush-bar block bg-[#829b72]" style={{ width: `max(${Math.min(pct, 100)}%, 6px)` }} />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="ink-wash p-4 text-center text-xs text-[#785132] rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB]">
                {smogonError
                  ? 'Não foi possível consultar a Smogon agora. Tente de novo em instantes.'
                  : isAlternateForm
                    ? `Sem dados da Smogon para ${displayName} neste tier. As estatísticas da forma base não valem para esta forma.`
                    : 'Sem dados da Smogon para este tier.'}
              </p>
            )}
          </SectionCard>
        )}

        {/* ------------------------------------------------ Movimentos */}
        {activeTab === 'moves' && (
          <SectionCard
            icon={Swords}
            title="Movimentos"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select value={selectedGen} onChange={(e) => setSelectedGen(e.target.value)} className={FIELD}>
                  {MOVE_GENERATIONS.map((gen) => <option key={gen.value} value={gen.value}>{gen.label}</option>)}
                </select>
                <label className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#78614E]" aria-hidden="true" />
                  <input
                    type="search"
                    value={movesetSearch}
                    onChange={(e) => setMovesetSearch(e.target.value)}
                    placeholder="Buscar golpe..."
                    aria-label="Buscar golpe"
                    className={`${FIELD} pl-8 w-36 sm:w-44 cursor-text font-medium`}
                  />
                </label>
              </div>
            }
          >
            <div className="flex gap-2">
              {LEARN_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setLearnMethod(method.value)}
                  aria-pressed={learnMethod === method.value}
                  className={`${PILL} px-3.5 ${learnMethod === method.value ? PILL_ON : PILL_OFF}`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#2A2421]/12 bg-[#FFFEFB]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2A2421]/15 bg-[#F7F3EE] font-serif text-xs font-bold text-[#5C4033]">
                    <th className="py-2.5 px-3">Aprender</th>
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3 text-right">Power</th>
                    <th className="py-2.5 px-3 text-right">Acc</th>
                    <th className="py-2.5 px-3 text-right">PP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2421]/10">
                  {movesetLoading ? (
                    <tr><td colSpan={7}><BrushLoader label="Compilando o learnset..." className="py-8" /></td></tr>
                  ) : visibleMoves.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-xs text-[#78614E]">Nenhum golpe para este filtro.</td></tr>
                  ) : (
                    visibleMoves.map((move) => (
                      <tr key={move.id} className="hover:bg-[#F7F3EE]/60 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-semibold text-[#78614E]">
                          {move.learn_method === 'level-up' ? (move.level > 0 ? `Nv. ${move.level}` : 'Inicial') : move.learn_method === 'machine' ? 'TM/TR' : 'Ovo'}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => openMove(move.name)}
                            className="rounded text-left text-xs font-bold capitalize text-[#2A2421] underline decoration-dotted decoration-[#78614E]/50 underline-offset-4 cursor-pointer hover:text-[#5B7856] hover:decoration-[#5B7856] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
                          >
                            {move.name.replace(/-/g, ' ')}
                          </button>
                        </td>
                        <td className="py-2.5 px-3"><PokemonTypeBadge type={move.type} /></td>
                        <td className="py-2.5 px-3 text-xs font-medium capitalize text-[#78614E]">{move.damage_class}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[#2A2421]">{move.power ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[#2A2421]">{move.accuracy ? `${move.accuracy}%` : '—'}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[#2A2421]">{move.pp ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ------------------------------------------------ Builds */}
        {activeTab === 'builds' && (
          <SectionCard icon={NotebookPen} title="Builds da Smogon">
            <PokemonBuilds
              variety={variety}
              pokemonLabel={displayName}
              onOpenItem={openItem}
              onOpenAbility={openAbility}
              onOpenMove={openMove}
            />
          </SectionCard>
        )}
      </div>

      {infoEntry && <MoveAbilityModal kind={infoEntry.kind} name={infoEntry.name} onClose={closeInfo} />}
    </div>
  );
}
