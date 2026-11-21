import { useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import PokemonPicker from '../battle/PokemonPicker';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { usePokemonDetails, useSmogonUsage } from '../../hooks/useCompareData';
import { COMPARE_LIMIT, statLeaders, statTotal } from '../../utils/compare';
import { formatSlug } from '../../utils/filters';
import { STAT_KEYS } from '../../utils/stats';
import { DEFAULT_TIER, SINGLES_TIERS } from '../../utils/tiers';

const LABEL = 'font-reading text-xs font-semibold uppercase tracking-wider text-ink-soft';

// Uma tinta por coluna, na ordem em que os Pokémon entraram: liga o card às barras dos atributos.
const SERIES = ['#4F6D8A', '#9E3D64', '#B98428', '#5F7A52'];

const STAT_NAMES = { hp: 'HP', atk: 'Ataque', def: 'Defesa', spa: 'Atq. Esp.', spd: 'Def. Esp.', spe: 'Velocidade' };
const STAT_MAX = 255;
const TOTAL_MAX = 780;

const dexNumber = (number) => `#${String(number).padStart(4, '0')}`;

function SeriesMark({ index }) {
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: SERIES[index] }} />;
}

function UsageLine({ label, entry }) {
  if (!entry) return null;
  const [name, pct] = entry;
  return (
    <p className="truncate font-reading text-[13px] text-ink" title={`${label}: ${name}`}>
      <span className="text-ink-soft">{label}:</span> {name}{' '}
      <span className="font-mono text-[11px] font-bold tabular-nums text-ink-soft">{pct.toFixed(1)}%</span>
    </p>
  );
}

function SmogonUsage({ usage }) {
  if (usage === undefined) return <p className="font-reading text-sm italic text-ink-soft">Carregando...</p>;
  if (usage === 'error') return <p className="font-reading text-sm italic text-vermilion-deep">Não foi possível carregar.</p>;
  if (!usage) return <p className="font-reading text-sm italic text-ink-soft">Sem dados neste tier.</p>;
  return (
    <div className="space-y-0.5">
      <p className="font-serif text-xl font-black tabular-nums text-ink">{usage.usage?.toFixed(2)}%</p>
      <UsageLine label="Item" entry={usage.item} />
      <UsageLine label="Habilidade" entry={usage.ability} />
    </div>
  );
}

function Abilities({ detail }) {
  if (!detail) return <p className="font-reading text-sm italic text-ink-soft">Carregando...</p>;
  if (detail === 'error') return <p className="font-reading text-sm italic text-vermilion-deep">Não foi possível carregar.</p>;
  return (
    <ul className="space-y-0.5 font-reading text-sm text-ink">
      {detail.abilities.map((ability) => <li key={ability}>{formatSlug(ability)}</li>)}
      {detail.hiddenAbility && (
        <li>{formatSlug(detail.hiddenAbility)} <span className="italic text-ink-soft">(oculta)</span></li>
      )}
    </ul>
  );
}

function PokemonColumn({ entry, index, detail, usage, onSelect, onRemove }) {
  const name = formatSlug(entry.name);
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-[3px] border-[1.5px] border-ink/70 border-t-[5px] bg-paper-2 p-3" style={{ borderTopColor: SERIES[index] }}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onSelect(entry.name)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[2px] text-left transition-colors hover:bg-olive/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <img src={thumbnailSpriteUrl(entry.id)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated]" />
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-bold text-ink" title={name}>{name}</span>
            <span className="font-mono text-[11px] font-bold tabular-nums text-ink-soft">{dexNumber(entry.number)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.name)}
          aria-label={`Tirar ${name} da comparação`}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border border-ink/40 text-ink transition-colors hover:border-ink hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entry.types.map((type) => <PokemonTypeBadge key={type} type={type} />)}
      </div>

      <section className="space-y-1">
        <h4 className={LABEL}>Habilidades</h4>
        <Abilities detail={detail} />
      </section>

      <section className="space-y-1">
        <h4 className={LABEL}>Uso na Smogon</h4>
        <SmogonUsage usage={usage} />
      </section>
    </li>
  );
}

function StatBars({ label, values, leader, max }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
      <span className="font-reading text-sm font-semibold text-ink">{label}</span>
      <div className="space-y-1">
        {values.map((value, index) => (
          // A posição é a identidade da coluna: a cor da barra vem dela.
          <div key={index} className="flex items-center gap-2">
            <div className="brush-bar-track min-w-0 flex-1">
              {value != null && (
                <div className="brush-bar" style={{ width: `${Math.min(value / max, 1) * 100}%`, backgroundColor: SERIES[index] }} />
              )}
            </div>
            <span className={`w-9 text-right font-mono text-xs tabular-nums ${value === leader ? 'font-black text-ink' : 'font-medium text-ink-soft'}`}>
              {value ?? '–'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Até quatro Pokémon lado a lado: tipos, habilidades, uso na Smogon (no tier escolhido) e atributos base,
 * com uma barra por Pokémon em cada atributo e o maior valor em destaque.
 */
export default function CompareModal({ names, entryByName, pool, onAdd, onRemove, onClear, onSelectPokemon, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const [tier, setTier] = useState(DEFAULT_TIER);
  useModalBehavior(onClose, closeRef);

  const entries = useMemo(() => names.map((name) => entryByName.get(name)).filter(Boolean), [names, entryByName]);
  const details = usePokemonDetails(names);
  const usage = useSmogonUsage(entries, tier);

  const statsList = entries.map((entry) => (details[entry.name]?.stats ?? null));
  const leaders = statLeaders(statsList);

  return createPortal(
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center bg-ink/60 p-4 animate-fade-in motion-reduce:animate-none md:bg-ink/45 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="paper-card relative flex max-h-[90vh] w-full max-w-5xl flex-col shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <header className="flex items-start gap-4 border-b-[1.5px] border-ink px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-hand text-lg leading-none text-ink-soft">{entries.length} de {COMPARE_LIMIT} Pokémon</p>
            <h2 id={titleId} className="mt-0.5 font-serif text-2xl font-black leading-tight tracking-tight text-ink sm:text-3xl">
              Comparar Pokémon
            </h2>
          </div>
          <button type="button" onClick={onClear} className="btn-outline min-h-9 px-3 py-1.5 text-sm">Limpar</button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-paper text-ink transition-colors hover:bg-paper-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="block w-full sm:w-44">
              <span className={`mb-1 block ${LABEL}`}>Tier da Smogon</span>
              <span className="relative block">
                <select value={tier} onChange={(e) => setTier(e.target.value)} className="paper-field h-9 w-full cursor-pointer appearance-none pl-2.5 pr-7 font-reading text-sm">
                  {SINGLES_TIERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-umber" aria-hidden="true" />
              </span>
            </label>
            {entries.length < COMPARE_LIMIT && (
              <div className="w-full sm:w-80">
                <span className={`mb-1 block ${LABEL}`}>Adicionar Pokémon</span>
                <PokemonPicker
                  pool={pool}
                  onPick={(entry) => onAdd(entry.name)}
                  label="Adicionar Pokémon à comparação"
                  placeholder="Nome ou número..."
                />
              </div>
            )}
          </div>

          <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {entries.map((entry, index) => (
              <PokemonColumn
                key={entry.name}
                entry={entry}
                index={index}
                detail={details[entry.name]}
                usage={usage[entry.name]}
                onSelect={onSelectPokemon}
                onRemove={onRemove}
              />
            ))}
          </ul>

          {entries.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={LABEL}>Atributos base</h3>
                <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Legenda das barras">
                  {entries.map((entry, index) => (
                    <li key={entry.name} className="flex items-center gap-1.5 font-reading text-[13px] text-ink">
                      <SeriesMark index={index} />
                      {formatSlug(entry.name)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                {STAT_KEYS.map((key) => (
                  <StatBars key={key} label={STAT_NAMES[key]} values={statsList.map((stats) => stats?.[key] ?? null)} leader={leaders[key]} max={STAT_MAX} />
                ))}
                <div className="border-t border-ink/20 pt-3">
                  <StatBars label="Total" values={statsList.map((stats) => (stats ? statTotal(stats) : null))} leader={leaders.total} max={TOTAL_MAX} />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
