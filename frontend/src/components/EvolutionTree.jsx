import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  ArrowLeftRight, Castle, CloudRain, Dumbbell, Gem, Heart, MapPin, Moon, Package,
  RotateCcw, Sparkles, Sun, Sunset, Swords, TrendingUp, User, Users, Zap,
} from 'lucide-react';
import { fetchPokemonSpecies, thumbnailSpriteUrl } from '../services/api';
import {
  REGIONS, applyRegionalLine, detectRegion, layoutEvolutionChain, withEvolutionConditions,
} from '../utils/evolution';

const BADGE_ICONS = {
  level: TrendingUp,
  trade: ArrowLeftRight,
  item: Package,
  stone: Gem,
  heart: Heart,
  sparkle: Sparkles,
  move: Swords,
  location: MapPin,
  day: Sun,
  night: Moon,
  dusk: Sunset,
  gender: User,
  stats: Dumbbell,
  party: Users,
  rain: CloudRain,
  spin: RotateCcw,
  tower: Castle,
  damage: Zap,
  special: Sparkles,
};

const INK = '#785132';
const NODE_W = 88;
const ROW_H = 108;
const GAP = 184;
const PAD_X = 8;
const PAD_TOP = 26;
const PAD_BOTTOM = 6;
const SPRITE_R = 28;
const SPRITE_CY = SPRITE_R;
const LABEL_SPAN = 0.68;
const STAGE_LABELS = ['Forma base', '1ª evolução', '2ª evolução', '3ª evolução'];

const nodeX = (stage) => PAD_X + stage * (NODE_W + GAP);
const nodeY = (row) => PAD_TOP + row * ROW_H;
const spriteCenter = (node) => ({ x: nodeX(node.stage) + NODE_W / 2, y: nodeY(node.row) + SPRITE_CY });

function edgePath(from, to) {
  const start = spriteCenter(from);
  const end = spriteCenter(to);
  const x0 = start.x + SPRITE_R + 4;
  const x1 = end.x - SPRITE_R - 6;
  const bend = (x1 - x0) * 0.5;
  return {
    d: `M ${x0} ${start.y} C ${x0 + bend} ${start.y}, ${x1 - bend} ${end.y}, ${x1} ${end.y}`,
    start: { x: x0, y: start.y },
  };
}

const formatSpeciesName = (slug) =>
  slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const EvolutionBadge = memo(function EvolutionBadge({ icon, text }) {
  const Icon = BADGE_ICONS[icon] ?? Sparkles;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-paper border border-[#785132]/30 text-[10px] font-semibold text-[#2A2421] leading-tight shadow-2xs">
      <Icon className="w-3 h-3 shrink-0 text-[#78614E]" aria-hidden="true" />
      {text}
    </span>
  );
});

// Espécies cuja variedade padrão tem outro nome ("lycanroc" → "lycanroc-midday") só abrem pelo nome da variedade.
const defaultVarietyOf = (species) => species?.varieties?.find((v) => v.is_default)?.pokemon.name;

const SpeciesNode = memo(function SpeciesNode({ node, current, onSelect }) {
  const regional = Boolean(node.regionLabel);
  const ring = current
    ? 'border-[#829b72] shadow-[0_0_0_4px_rgba(130,155,114,0.18)]'
    : regional
      ? 'border-dashed border-[#5B7856]/70 shadow-[0_0_0_3px_rgba(164,194,148,0.25)]'
      : 'border-[#785132]/35 shadow-2xs';

  const name = formatSpeciesName(node.id);
  const Tag = onSelect && !current ? 'button' : 'div';
  const interactive = Tag === 'button' && {
    type: 'button',
    onClick: () => onSelect(node),
    'aria-label': `Abrir a ficha de ${name}`,
  };

  return (
    <Tag
      {...interactive}
      className={`group absolute flex flex-col items-center transition-opacity ${node.outOfLine ? 'opacity-40 grayscale' : ''} ${
        interactive ? 'cursor-pointer rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt' : ''
      }`}
      style={{ left: nodeX(node.stage), top: nodeY(node.row), width: NODE_W }}
      title={node.outOfLine ? 'Não faz parte desta linha evolutiva' : undefined}
    >
      <div
        className={`relative flex items-center justify-center rounded-[3px] bg-paper border-2 transition-[box-shadow,transform] ${ring} ${
          interactive ? 'group-hover:-translate-x-px group-hover:-translate-y-px group-hover:border-[#2A2421] group-hover:shadow-[2px_2px_0_#4A463E] motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0' : ''
        }`}
        style={{ width: SPRITE_R * 2, height: SPRITE_R * 2 }}
      >
        <img
          src={thumbnailSpriteUrl(node.spriteId ?? node.speciesId)}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="object-contain md:drop-shadow-sm"
        />
        {regional && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 rounded-[3px] bg-[#5B7856] text-[8px] font-bold uppercase tracking-wider text-[#F7F3EE] shadow-2xs">
            {node.regionLabel}
          </span>
        )}
      </div>
      <span
        className={`mt-1.5 text-[11px] font-serif text-center leading-tight ${
          current ? 'font-black text-[#2A2421]' : 'font-bold text-[#2A2421]/85'
        } ${interactive ? 'underline decoration-transparent decoration-dashed underline-offset-2 group-hover:decoration-[#78614E]/60' : ''}`}
      >
        {name}
      </span>
      <span className="text-[9px] font-mono tracking-wide text-[#78614E]">
        #{String(node.speciesId).padStart(3, '0')}
      </span>
    </Tag>
  );
});

/** Espécies de cada nó (em cache), para adaptar a árvore à forma aberta. */
function useChainSpecies(baseLayout) {
  const [state, setState] = useState({ key: null, speciesByName: null });
  const key = baseLayout.edges.length > 0 ? baseLayout.nodes.map((n) => n.id).join(',') : null;

  useEffect(() => {
    if (!key) return;
    let active = true;
    Promise.all(baseLayout.nodes.map((n) => fetchPokemonSpecies(n.id)))
      .then((list) => {
        if (active) setState({ key, speciesByName: new Map(baseLayout.nodes.map((n, i) => [n.id, list[i]])) });
      })
      .catch(() => { if (active) setState({ key, speciesByName: new Map() }); });
    return () => { active = false; };
  }, [key, baseLayout]);

  return state.key === key ? state.speciesByName : null;
}

function EvolutionTree({ chain, currentSpecies, currentForm, currentFormId, onSelectPokemon }) {
  const uid = useId();
  const region = detectRegion(currentForm);
  const baseLayout = useMemo(() => layoutEvolutionChain(chain), [chain]);
  const speciesByName = useChainSpecies(baseLayout);
  // As condições dependem só da forma aberta; ficam certas antes mesmo de as espécies chegarem.
  const conditioned = useMemo(
    () => withEvolutionConditions(baseLayout, { region, form: currentForm }),
    [baseLayout, region, currentForm],
  );
  const layout = useMemo(() => {
    const resolved = speciesByName ? applyRegionalLine(conditioned, speciesByName, region) : conditioned;
    if (!currentFormId) return resolved;
    // O nó do Pokémon aberto mostra sempre a variedade aberta (Lycanroc Midnight, Mega, Totem…).
    return {
      ...resolved,
      nodes: resolved.nodes.map((node) => (node.id === currentSpecies ? { ...node, spriteId: currentFormId } : node)),
    };
  }, [conditioned, speciesByName, region, currentSpecies, currentFormId]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  // Um nó regional abre a forma regional (Raichu de Alola); os demais, a variedade padrão da espécie.
  const selectNode = useCallback(
    (node) => onSelectPokemon(node.formName ?? defaultVarietyOf(speciesByName?.get(node.id)) ?? node.id),
    [onSelectPokemon, speciesByName],
  );
  const handleSelect = onSelectPokemon ? selectNode : undefined;

  if (region && !speciesByName) {
    return (
      <p className="py-6 text-center font-hand text-lg text-[#78614E] animate-pulse">
        traçando a linha de {REGIONS[region].label}...
      </p>
    );
  }

  const hasOutOfLine = layout.nodes.some((n) => n.outOfLine);

  const width = PAD_X * 2 + layout.stageCount * NODE_W + (layout.stageCount - 1) * GAP;
  const height = PAD_TOP + Math.max(layout.rowCount, 1) * ROW_H + PAD_BOTTOM;
  const markerId = `${uid}-arrow`;

  if (layout.edges.length === 0) {
    return (
      <div className="flex items-center gap-4 py-2">
        <div className="relative shrink-0" style={{ width: NODE_W, height: ROW_H - PAD_TOP + 8 }}>
          <SpeciesNode node={{ ...layout.nodes[0], stage: 0, row: 0 }} current />
        </div>
        <p className="text-xs italic text-[#78614E]">Esta espécie não evolui.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-1">
      <div
        className="relative mx-auto"
        style={{
          width,
          height,
          backgroundImage: 'radial-gradient(rgba(120, 81, 50, 0.14) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      >
        {Array.from({ length: layout.stageCount }, (_, stage) => (
          <span
            key={stage}
            className="absolute top-0 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#78614E]/80"
            style={{ left: nodeX(stage), width: NODE_W }}
          >
            {STAGE_LABELS[stage] ?? `${stage}ª evolução`}
          </span>
        ))}

        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 1.5 1.5 L 8 5 L 1.5 8.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {layout.edges.map((edge) => {
            const { d, start } = edgePath(nodeById.get(edge.from), nodeById.get(edge.to));
            return (
              <g key={`${edge.from}-${edge.to}`} opacity={edge.outOfLine ? 0.25 : 0.85}>
                <circle cx={start.x} cy={start.y} r="2.2" fill={INK} />
                <path
                  d={d}
                  fill="none"
                  stroke={INK}
                  strokeWidth="1.5"
                  strokeDasharray="3 6"
                  strokeLinecap="round"
                  markerEnd={`url(#${markerId})`}
                />
              </g>
            );
          })}
        </svg>

        {layout.edges.map((edge) => {
          const to = nodeById.get(edge.to);
          const childLeft = nodeX(to.stage);
          return (
            <div
              key={`${edge.from}-${edge.to}`}
              className={`absolute flex flex-col items-center justify-center gap-1 -translate-y-1/2 ${edge.outOfLine ? 'opacity-40' : ''}`}
              style={{
                left: childLeft - GAP * LABEL_SPAN,
                width: GAP * LABEL_SPAN - 8,
                top: nodeY(to.row) + SPRITE_CY,
              }}
            >
              {edge.alternatives.map((badges, index) => (
                <div key={index} className="flex flex-wrap items-center justify-center gap-1">
                  {index > 0 && <span className="text-[9px] italic text-[#78614E]">ou</span>}
                  {badges.map((badge) => <EvolutionBadge key={badge.text} {...badge} />)}
                </div>
              ))}
            </div>
          );
        })}

        {layout.nodes.map((node) => (
          <SpeciesNode key={node.id} node={node} current={node.id === currentSpecies} onSelect={handleSelect} />
        ))}
      </div>

      {(region || hasOutOfLine) && (
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-[#78614E]">
          {region && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] border-2 border-dashed border-[#5B7856]/70" aria-hidden="true" />
              Linha evolutiva de {REGIONS[region].label}
            </span>
          )}
          {hasOutOfLine && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-[#785132]/25" aria-hidden="true" />
              {region ? 'esmaecido: não pertence a esta variante' : 'esmaecido: só uma forma regional evolui para esta espécie'}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export default memo(EvolutionTree);
