import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Gauge, Wind } from 'lucide-react';
import SmeargleLoader from './SmeargleLoader';
import { thumbnailSpriteUrl } from '../services/api';
import { fetchSmogonNames, fetchTopUsage } from '../services/smogonMeta';
import { baseStatsOf, loadBattleData } from '../utils/battleData';
import { formatSlug } from '../utils/filters';
import { buildSmogonNameIndex } from '../utils/smogon';
import {
  INVESTMENTS, SPEED_TIER_SIZE, boostedSpeed, buildSpeedTiers, placeSpeed, speedStat, tierLevel, topSpread,
} from '../utils/speedTiers';

const LABEL = 'font-reading text-xs font-semibold uppercase tracking-wider text-ink-soft';
const FIELD = 'paper-field h-9 cursor-pointer pl-2.5 pr-7 font-reading text-sm';
const TOGGLE = 'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[3px] border-[1.5px] px-3 font-reading text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const TOGGLE_ON = 'border-vermilion font-semibold text-vermilion';
const TOGGLE_OFF = 'border-ink/40 font-medium text-ink hover:border-ink';

/** Os mais usados do tier com a velocidade do spread mais popular de cada um; carrega a cada troca de tier. */
function useSpeedTiers(tier, entries) {
  const [state, setState] = useState({ tier: null, status: 'loading', tiers: [] });

  useEffect(() => {
    let active = true;
    Promise.all([fetchTopUsage(tier), fetchSmogonNames(), loadBattleData()])
      .then(([rows, names, battleData]) => {
        // Nome na Smogon → entrada da Pokédex.
        const index = buildSmogonNameIndex([...entries.values()], names);
        const bySmogonName = new Map([...index].map(([entryName, smogonName]) => [smogonName, entries.get(entryName)]));
        const resolve = (name) => {
          const entry = bySmogonName.get(name);
          const stats = entry && baseStatsOf(battleData, entry.id);
          return stats ? { entryName: entry.name, id: entry.id, baseSpeed: stats.spe } : null;
        };
        if (active) setState({ tier, status: 'ready', tiers: buildSpeedTiers(rows, resolve, tierLevel(tier)) });
      })
      .catch(() => active && setState({ tier, status: 'error', tiers: [] }));
    return () => { active = false; };
  }, [tier, entries]);

  return state.tier === tier ? state : { status: 'loading', tiers: [] };
}

function Toggle({ pressed, onClick, icon: Icon, children }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`${TOGGLE} ${pressed ? TOGGLE_ON : TOGGLE_OFF}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

// "a, b e c".
const joinPt = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0]);

function Summary({ speed, place, total }) {
  const parts = [
    `é mais rápido que ${place.outspeeds}`,
    place.ties > 0 && `empata com ${place.ties}`,
    `perde para ${place.outspedBy}`,
  ].filter(Boolean);
  return (
    <p className="font-reading text-[15px] text-ink">
      Com <strong className="font-mono tabular-nums">{speed}</strong> de Velocidade, {joinPt(parts)} dos {total} mais usados.
    </p>
  );
}

function MetaRow({ tier, position, onSelect }) {
  const name = formatSlug(tier.entryName);
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_4.5rem] items-center gap-2 px-2 py-1 sm:grid-cols-[2rem_minmax(0,1fr)_4rem_3.5rem_5.5rem]">
      <span className="font-mono text-[11px] tabular-nums text-ink-soft">{position}</span>
      <button
        type="button"
        onClick={() => onSelect(tier.entryName)}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-[2px] text-left transition-colors hover:bg-olive/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
      >
        <img src={thumbnailSpriteUrl(tier.id)} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 shrink-0 object-contain [image-rendering:pixelated]" />
        <span className="truncate font-reading text-sm text-ink" title={name}>{name}</span>
      </button>
      <span className="hidden text-right font-mono text-[11px] tabular-nums text-ink-soft sm:block">{tier.usage.toFixed(1)}%</span>
      <span className="text-right font-mono text-sm font-bold tabular-nums text-ink">{tier.speed}</span>
      <span className="text-right font-mono text-[11px] tabular-nums text-ink-soft" title={tier.scarfSpeed ? `Choice Scarf em ${tier.scarfUsage.toFixed(0)}% dos sets` : undefined}>
        {tier.scarfSpeed ? <>{tier.scarfSpeed} <span className="opacity-75">({tier.scarfUsage.toFixed(0)}%)</span></> : '–'}
      </span>
    </li>
  );
}

const OwnRow = ({ rowRef, name, id, speed }) => (
  <li ref={rowRef} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-[3px] border-[1.5px] border-vermilion bg-vermilion/10 px-2 py-1">
    <span aria-hidden="true" className="font-serif text-sm font-black text-vermilion">▶</span>
    <span className="flex min-w-0 items-center gap-1.5">
      <img src={thumbnailSpriteUrl(id)} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain [image-rendering:pixelated]" />
      <span className="truncate font-reading text-sm font-semibold text-ink">{name}</span>
    </span>
    <span className="font-mono text-sm font-black tabular-nums text-vermilion">{speed}</span>
  </li>
);

/**
 * Onde o Pokémon da ficha fica entre os 50 mais usados do tier. Os outros usam o spread mais popular de cada um,
 * sem Tailwind; a coluna Scarf aparece para quem leva Choice Scarf em pelo menos 5% dos sets.
 * O Pokémon da ficha pode mudar de investimento e ganhar Scarf e Tailwind.
 */
function SpeedTierTable({ tier, pokemonName, pokemonId, baseSpeed, ownSpreads, entries, onSelectPokemon }) {
  const { status, tiers } = useSpeedTiers(tier, entries);
  const ownSpread = topSpread(ownSpreads);
  // Sem escolha do usuário, o spread mais usado dele (quando há dados no tier) ou a velocidade máxima.
  const [choice, setChoice] = useState(null);
  const fallback = ownSpread ? 'common' : 'max';
  const investment = choice && (choice !== 'common' || ownSpread) ? choice : fallback;
  const [scarf, setScarf] = useState(false);
  const [tailwind, setTailwind] = useState(false);
  const listRef = useRef(null);
  const ownRef = useRef(null);

  const spread = (investment === 'common' ? ownSpread : INVESTMENTS[investment].spread) ?? INVESTMENTS.max.spread;
  const speed = boostedSpeed(speedStat(baseSpeed, spread, tierLevel(tier)), { scarf, tailwind });

  // Ele mesmo sai da lista do meta: aparece uma vez só, na linha destacada.
  const others = useMemo(() => tiers.filter((candidate) => candidate.entryName !== pokemonName), [tiers, pokemonName]);
  const place = placeSpeed(others, speed);
  // A linha dele entra antes do primeiro que não é mais rápido (empatados ficam logo abaixo).
  const insertAt = others.findIndex((candidate) => candidate.speed <= speed);
  const ownIndex = insertAt === -1 ? others.length : insertAt;

  // Mantém a linha destacada à vista dentro da lista, sem rolar a ficha inteira.
  useLayoutEffect(() => {
    const list = listRef.current;
    const row = ownRef.current;
    if (!list || !row) return;
    list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2;
  }, [ownIndex, status, tier]);

  const ownName = formatSlug(pokemonName);
  const ownRow = <OwnRow key="own" rowRef={ownRef} name={ownName} id={pokemonId} speed={speed} />;

  return (
    <section className="space-y-3 rounded-[4px] border border-ink/12 bg-paper p-4">
      <header className="space-y-1">
        <h4 className="flex items-center gap-2 font-reading text-sm font-bold text-ink">
          <Gauge className="h-4 w-4 text-olive" aria-hidden="true" /> Velocidade no meta
        </h4>
        <p className="font-reading text-[13px] italic text-ink-soft">
          Os {SPEED_TIER_SIZE} mais usados do tier, cada um com o spread mais popular e sem Tailwind
          {tierLevel(tier) !== 100 && `, no nível ${tierLevel(tier)}`}.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-0 grow basis-56">
          <span className={`mb-1 block ${LABEL}`}>Investimento de {ownName}</span>
          <select value={investment} onChange={(e) => setChoice(e.target.value)} className={`${FIELD} w-full`}>
            {Object.entries(INVESTMENTS)
              .filter(([value]) => value !== 'common' || ownSpread)
              .map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
          </select>
        </label>
        <div role="group" aria-label={`Modificadores de ${ownName}`} className="flex gap-2">
          <Toggle pressed={scarf} onClick={() => setScarf((on) => !on)} icon={Gauge}>Choice Scarf</Toggle>
          <Toggle pressed={tailwind} onClick={() => setTailwind((on) => !on)} icon={Wind}>Tailwind</Toggle>
        </div>
      </div>

      {status === 'loading' && <SmeargleLoader label="Cronometrando o meta..." className="py-6" />}
      {status === 'error' && (
        <p className="text-center font-reading text-sm italic text-vermilion-deep">Não foi possível carregar o meta deste tier agora.</p>
      )}
      {status === 'ready' && others.length === 0 && (
        <p className="text-center font-reading text-sm italic text-ink-soft">Sem dados de uso neste tier.</p>
      )}
      {status === 'ready' && others.length > 0 && (
        <>
          <Summary speed={speed} place={place} total={others.length} />
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_4.5rem] gap-2 border-b border-ink/25 px-2 pb-1 sm:grid-cols-[2rem_minmax(0,1fr)_4rem_3.5rem_5.5rem]">
            <span className={LABEL}>#</span>
            <span className={LABEL}>Pokémon</span>
            <span className={`hidden text-right sm:block ${LABEL}`}>Uso</span>
            <span className={`text-right ${LABEL}`}>Vel.</span>
            <span className={`text-right ${LABEL}`}>Scarf</span>
          </div>
          <ol ref={listRef} className="relative max-h-96 space-y-0.5 overflow-y-auto overscroll-contain">
            {others.flatMap((candidate, index) => {
              const row = <MetaRow key={candidate.name} tier={candidate} position={index + 1} onSelect={onSelectPokemon} />;
              return index === ownIndex ? [ownRow, row] : [row];
            })}
            {ownIndex === others.length && ownRow}
          </ol>
        </>
      )}
    </section>
  );
}

export default memo(SpeedTierTable);
