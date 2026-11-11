import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, BookOpen, Cpu, Egg, Ruler, Search, Shield, Sparkles, Swords, Weight, X, Zap,
} from 'lucide-react';
import PokemonTypeBadge, { TYPE_INK } from './PokemonTypeBadge';
import PokemonEncounters from './PokemonEncounters';
import EvolutionTree from './EvolutionTree';
import PokemonCry from './PokemonCry';
import { capitalize } from '../utils/typeColors';
import {
  fetchEvolutionChain, fetchMove, fetchPokemonDetail, fetchPokemonSpecies,
  fetchSmogonStats, fetchTypeData, officialSpriteUrl,
} from '../services/api';

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
  backgroundImage: 'radial-gradient(rgba(120, 81, 50, 0.10) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

const GLASS_CARD = 'rounded-2xl border border-white/70 bg-white/55 backdrop-blur-md shadow-[0_8px_30px_-14px_rgba(62,46,36,0.25)]';
const FIELD = 'h-9 px-3 rounded-xl border border-[#4A3B32]/20 bg-[#FFFEFB]/80 text-xs font-semibold text-[#2A2421] focus:outline-none focus:ring-1 focus:ring-[#829b72] cursor-pointer';

/* ---------------------------------------------------------------- helpers puros */

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

const topEntries = (record, count) =>
  Object.entries(record ?? {}).sort(([, a], [, b]) => b - a).slice(0, count);

/* ---------------------------------------------------------------- sub-componentes */

const HeroSprite = memo(function HeroSprite({ sources, alt }) {
  const [index, setIndex] = useState(0);
  const src = sources[Math.min(index, sources.length - 1)];
  const animated = src.endsWith('.gif');

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setIndex((i) => (i + 1 < sources.length ? i + 1 : i))}
      className={`h-full w-full object-contain drop-shadow-[0_10px_14px_rgba(62,46,36,0.28)] ${animated ? '[image-rendering:pixelated] scale-[1.35]' : ''}`}
    />
  );
});

const SectionCard = memo(function SectionCard({ icon: Icon, title, action, className = '', children }) {
  return (
    <section className={`${GLASS_CARD} p-4 space-y-3 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#78614E]">
          {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
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
      <span className="w-20 font-semibold text-[#78614E]">{meta.label}</span>
      <div className="flex-1 h-2 rounded-full bg-[#4A3B32]/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${(value / 255) * 100}%`, backgroundColor: meta.color }}
        />
      </div>
      <span className="w-8 text-right font-bold text-[#2A2421]">{value}</span>
    </div>
  );
});

const EffectivenessRow = memo(function EffectivenessRow({ types, multiplier, label, tone }) {
  if (!types?.length) return null;
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
      <span className={`shrink-0 w-11 py-1 rounded-lg text-center text-[11px] font-black ${tone}`}>{multiplier}</span>
      <div className="space-y-1">
        <span className="block text-[10px] font-semibold uppercase text-[#78614E]">{label}</span>
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => <PokemonTypeBadge key={t} type={t} />)}
        </div>
      </div>
    </div>
  );
});

const UsageChip = memo(function UsageChip({ name, pct }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/15 text-xs font-semibold capitalize">
      <span className="w-1.5 h-1.5 rounded-full bg-[#829b72]" aria-hidden="true" />
      <span className="text-[#2A2421]">{name}</span>
      <span className="text-[10px] font-bold text-[#78614E]">{pct.toFixed(1)}%</span>
    </span>
  );
});

const SpreadCard = memo(function SpreadCard({ index, spreadKey, pct }) {
  const [nature = 'Hardy', evs = '0/0/0/0/0/0'] = spreadKey.split(':');
  const [hp, atk, def, spa, spd, spe] = evs.split('/');
  return (
    <div className="p-3 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
      <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-[#2A2421]">
        <span>
          Build {index + 1}
          <span className="ml-1 font-normal text-[10px] text-[#78614E]">({(pct * 100).toFixed(1)}%)</span>
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

export default function PokemonDrawer({ pokemonName, onClose, onSmogonDataFound }) {
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
  const [selectedSmogonTier, setSelectedSmogonTier] = useState('gen9ou');

  const [moveset, setMoveset] = useState([]);
  const [movesetLoading, setMovesetLoading] = useState(false);
  const [movesVisited, setMovesVisited] = useState(false);
  const [movesetSearch, setMovesetSearch] = useState('');
  const [learnMethod, setLearnMethod] = useState('level-up');
  const [selectedGen, setSelectedGen] = useState('gen9');

  // Invalida respostas de troca de forma pendentes (troca rápida, mudança de Pokémon ou unmount).
  const formRequestRef = useRef(0);

  useEffect(() => {
    let active = true;
    formRequestRef.current++;
    setLoading(true);
    setActiveTab('overview');
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

  useEffect(() => {
    if (!currentFormName) return;
    const controller = new AbortController();
    setSmogonLoading(true);

    fetchSmogonStats(formatFormName(currentFormName), selectedSmogonTier, { signal: controller.signal })
      .then((stats) => {
        if (controller.signal.aborted) return;
        setSmogon(stats);
        if (stats) onSmogonDataFound?.(pokemonName);
      })
      .catch((err) => { if (err.name !== 'AbortError') setSmogon(null); })
      .finally(() => { if (!controller.signal.aborted) setSmogonLoading(false); });

    return () => controller.abort();
  }, [currentFormName, selectedSmogonTier, pokemonName, onSmogonDataFound]);

  // O learnset (100–200 pedidos) só é carregado quando a aba Movimentos é aberta.
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

  const visibleMoves = useMemo(() => {
    const term = movesetSearch.trim().toLowerCase();
    return moveset
      .filter((m) => m.learn_method === learnMethod && (!term || m.name.includes(term)))
      .sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity) || a.name.localeCompare(b.name));
  }, [moveset, learnMethod, movesetSearch]);

  const heroSources = useMemo(() => (detail ? spriteSources(detail, shiny) : []), [detail, shiny]);

  /* ------------------------------------------------------------ estados vazios */

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#F7F3EE]" style={PAPER_BG}>
        <div className="w-14 h-14 rounded-full bg-[#FFFEFB] border border-[#4A3B32]/20 flex items-center justify-center animate-pulse">
          <Zap className="w-6 h-6 text-[#829b72]" />
        </div>
        <p className="text-sm font-medium text-[#78614E]">Carregando dados de campo...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#F7F3EE] p-6 text-center" style={PAPER_BG}>
        <p className="text-sm font-medium text-[#78614E]">Não foi possível carregar “{formatFormName(pokemonName)}”.</p>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-[#829b72] text-white text-xs font-bold">Fechar</button>
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

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-[#F7F3EE]" style={PAPER_BG}>
      {/* Cabeçalho imersivo e fixo */}
      <header
        className="sticky top-0 z-20 border-b border-[#4A3B32]/10 backdrop-blur-xl shadow-[0_10px_30px_-18px_rgba(62,46,36,0.35)]"
        style={{ background: `linear-gradient(120deg, ${primaryInk.bg}F2 0%, #FFFEFBE6 60%, ${primaryInk.bg}CC 100%)` }}
      >
        <div className="flex items-center gap-4 px-5 pt-4 pb-3">
          <div
            className="relative shrink-0 w-24 h-24 rounded-full flex items-center justify-center border-2 bg-[#FFFEFB]/70 shadow-inner"
            style={{ borderColor: `${primaryInk.border}66` }}
          >
            {shiny && (
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#C9A66B] drop-shadow-sm" aria-hidden="true" />
            )}
            <div className="w-20 h-20">
              <HeroSprite key={`${detail.id}-${shiny}`} sources={heroSources} alt={displayName} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#78614E]">
              {formatDexNumber(species?.id ?? detail.id)}
              <span aria-hidden="true">·</span>
              {isAlternateForm ? 'Forma alternativa' : 'Pokédex'}
              {shiny && <span className="px-1.5 rounded bg-[#C9A66B]/25 text-[#7F682F]">Shiny</span>}
            </p>
            <h2 className="truncate font-serif text-2xl sm:text-3xl font-black tracking-tight text-[#2A2421]">
              {displayName}
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {currentTypes.map((type) => <PokemonTypeBadge key={type} type={type} />)}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start">
            <button
              type="button"
              onClick={toggleShiny}
              aria-pressed={shiny}
              title={shiny ? 'Ver cor normal' : 'Ver versão shiny'}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                shiny
                  ? 'bg-[#C9A66B] border-[#C9A66B] text-white shadow-sm'
                  : 'bg-[#FFFEFB]/80 border-[#4A3B32]/20 text-[#78614E] hover:border-[#C9A66B] hover:text-[#7F682F]'
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
              className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#FFFEFB]/80 border border-[#4A3B32]/20 text-[#78614E] hover:text-[#2A2421] hover:border-[#4A3B32]/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex gap-1 px-5" aria-label="Seções do Pokémon">
          {TABS.map(({ value, label, icon: Icon }) => {
            const active = activeTab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTabChange(value)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                  active
                    ? 'border-[#829b72] text-[#2A2421]'
                    : 'border-transparent text-[#78614E] hover:text-[#2A2421] hover:border-[#4A3B32]/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 p-5 space-y-5">
        {forms.length > 0 && (
          <div className={`${GLASS_CARD} px-4 py-3 flex flex-wrap items-center gap-2`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78614E] mr-1">Formas</span>
            {[baseFormName, ...forms].map((form, index) => {
              const selected = currentFormName === form;
              return (
                <button
                  key={form}
                  type="button"
                  onClick={() => handleFormChange(form)}
                  aria-pressed={selected}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#829b72] text-white shadow-sm'
                      : 'bg-[#FFFEFB]/80 border border-[#4A3B32]/20 text-[#2A2421] hover:bg-[#F7F3EE]'
                  }`}
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
                action={<span className="px-2.5 py-1 rounded-full bg-[#829b72] text-white text-[11px] font-bold">Total {totalStat}</span>}
              >
                <div className="space-y-2">
                  {baseStats.map((stat) => <StatBar key={stat.name} {...stat} />)}
                </div>
              </SectionCard>

              <SectionCard icon={Egg} title="Habilidades & Morfologia">
                <div className="flex flex-wrap gap-1.5">
                  {detail.abilities.map((a) => (
                    <span
                      key={a.ability.name}
                      className="px-2.5 py-1 rounded-lg bg-[#FFFEFB]/80 border border-[#4A3B32]/15 text-[11px] font-medium capitalize text-[#2A2421]"
                    >
                      {a.ability.name.replace(/-/g, ' ')}
                      {a.is_hidden && <span className="ml-1 text-[9px] font-bold text-[#78614E]">(oculta)</span>}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
                    <Ruler className="w-4 h-4 text-[#78614E]" aria-hidden="true" />
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-[#78614E]">Altura</span>
                      <span className="text-xs font-bold text-[#2A2421]">{(detail.height / 10).toFixed(1)} m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
                    <Weight className="w-4 h-4 text-[#78614E]" aria-hidden="true" />
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-[#78614E]">Peso</span>
                      <span className="text-xs font-bold text-[#2A2421]">{(detail.weight / 10).toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>
                {species?.egg_groups?.length > 0 && (
                  <div>
                    <span className="block mb-1 text-[10px] font-semibold uppercase text-[#78614E]">Grupos de ovo</span>
                    <div className="flex flex-wrap gap-1">
                      {species.egg_groups.map((g) => (
                        <span key={g.name} className="px-2 py-0.5 rounded-md bg-[#FFFEFB]/80 border border-[#4A3B32]/15 text-[10px] font-medium capitalize text-[#2A2421]">
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
                      <EffectivenessRow key={row.key} types={typeEffectiveness[row.key]} {...row} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {EFFECTIVENESS_ROWS.resist.map((row) => (
                      <EffectivenessRow key={row.key} types={typeEffectiveness[row.key]} {...row} />
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Árvore Evolutiva">
              {evolutionChain ? (
                <EvolutionTree chain={evolutionChain} currentSpecies={species?.name} currentForm={detail.name} />
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
              <p className="p-8 text-center text-xs font-medium text-[#78614E] animate-pulse">Sincronizando estatísticas...</p>
            ) : smogon ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-[#78614E]">Taxa de uso no tier</span>
                    <span className="text-xl font-black text-[#829b72]">{smogon.usage_percent?.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#4A3B32]/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#829b72] transition-[width] duration-500"
                      style={{ width: `${Math.min(smogon.usage_percent ?? 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-[11px] text-[#78614E]">
                    <span>Tier <strong className="uppercase text-[#2A2421]">{smogon.tier || selectedSmogonTier}</strong></span>
                    <span>Coleta <strong className="text-[#2A2421]">{smogon.date}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2A2421]">
                      <Cpu className="w-4 h-4 text-[#829b72]" aria-hidden="true" /> Spreads EV
                    </h4>
                    {topEntries(smogon.spreads, 2).length > 0 ? (
                      topEntries(smogon.spreads, 2).map(([key, pct], index) => (
                        <SpreadCard key={key} index={index} spreadKey={key} pct={pct} />
                      ))
                    ) : (
                      <p className="text-[11px] italic text-[#78614E]">Nenhuma spread registada.</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="block mb-2 text-xs font-bold uppercase tracking-wider text-[#78614E]">Habilidades principais</span>
                      <div className="flex flex-wrap gap-1.5">
                        {topEntries(smogon.abilities, 3).map(([name, pct]) => <UsageChip key={name} name={name} pct={pct} />)}
                      </div>
                    </div>
                    <div>
                      <span className="block mb-2 text-xs font-bold uppercase tracking-wider text-[#78614E]">Itens mais usados</span>
                      <div className="flex flex-wrap gap-1.5">
                        {topEntries(smogon.items, 3).map(([name, pct]) => <UsageChip key={name} name={name} pct={pct} />)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block mb-2 text-xs font-bold uppercase tracking-wider text-[#78614E]">Movimentos populares</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {topEntries(smogon.moves, 6).map(([name, pct]) => (
                      <div key={name} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
                        <span className="text-xs font-bold capitalize text-[#2A2421]">{name.replace(/-/g, ' ')}</span>
                        <div className="flex items-center gap-2 w-1/3">
                          <span className="w-8 text-right text-[10px] font-bold text-[#78614E]">{pct.toFixed(0)}%</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#4A3B32]/10 overflow-hidden">
                            <div className="h-full rounded-full bg-[#829b72]" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="p-4 text-center text-xs text-[#78614E] rounded-xl bg-[#FFFEFB]/80 border border-[#4A3B32]/10">
                Sem dados do Smogon para este tier.
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    learnMethod === method.value
                      ? 'bg-[#829b72] text-white shadow-sm'
                      : 'bg-[#FFFEFB]/80 border border-[#4A3B32]/20 text-[#2A2421] hover:bg-[#F7F3EE]'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#4A3B32]/15 bg-[#FFFEFB]/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#4A3B32]/15 bg-[#F7F3EE]/70 text-[11px] font-bold uppercase tracking-wider text-[#78614E]">
                    <th className="py-2.5 px-3">Aprender</th>
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3 text-right">Power</th>
                    <th className="py-2.5 px-3 text-right">Acc</th>
                    <th className="py-2.5 px-3 text-right">PP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4A3B32]/10">
                  {movesetLoading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-xs font-medium text-[#78614E] animate-pulse">A compilar o learnset...</td></tr>
                  ) : visibleMoves.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-xs text-[#78614E]">Nenhum golpe para este filtro.</td></tr>
                  ) : (
                    visibleMoves.map((move) => (
                      <tr key={move.id} className="hover:bg-[#F7F3EE]/60 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-semibold text-[#78614E]">
                          {move.learn_method === 'level-up' ? (move.level > 0 ? `Nv. ${move.level}` : 'Inicial') : move.learn_method === 'machine' ? 'TM/TR' : 'Ovo'}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-bold capitalize text-[#2A2421]">{move.name.replace(/-/g, ' ')}</td>
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
      </div>
    </div>
  );
}
