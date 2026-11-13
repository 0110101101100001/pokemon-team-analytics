import { memo, useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCopy, Loader2, Package, TriangleAlert } from 'lucide-react';
import PokemonTypeBadge from './PokemonTypeBadge';
import { itemSpriteUrl } from '../services/api';
import { fetchSmogonSets, formatStatSpread, toShowdownText } from '../utils/smogonSets';

const FIELD = 'h-9 px-3 rounded-xl border border-[#2A2421]/20 bg-[#FFFEFB]/80 text-xs font-semibold text-[#2A2421] focus:outline-none focus:ring-1 focus:ring-[#829b72] cursor-pointer';
const LINK = 'rounded text-left font-semibold text-[#2A2421] underline decoration-dotted decoration-[#78614E]/50 underline-offset-4 cursor-pointer hover:text-[#5B7856] hover:decoration-[#5B7856] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const COPY_FEEDBACK_MS = 1800;

/** Alternativas de um campo separadas por "/"; cada uma abre o modal de detalhes se `onSelect` existir. */
function Options({ values, onSelect, render = (value) => value }) {
  return values.map((value, index) => (
    <span key={typeof value === 'string' ? value : index} className="inline-flex items-center gap-1">
      {index > 0 && <span className="text-[#78614E]/70" aria-hidden="true">/</span>}
      {onSelect ? (
        <button type="button" onClick={() => onSelect(value)} className={LINK}>{render(value)}</button>
      ) : (
        <span className="font-semibold text-[#2A2421]">{render(value)}</span>
      )}
    </span>
  ));
}

function ItemIcon({ name }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Package className="h-4 w-4 shrink-0 text-[#78614E]" aria-hidden="true" />;
  return (
    <img
      src={itemSpriteUrl(name)}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-6 w-6 shrink-0 object-contain [image-rendering:pixelated]"
    />
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <dt className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#78614E]">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">{children}</dd>
    </div>
  );
}

const BuildCard = memo(function BuildCard({ pokemonName, set, onOpenItem, onOpenAbility, onOpenMove }) {
  const [copyState, setCopyState] = useState('idle');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toShowdownText(pokemonName, set));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
  }, [pokemonName, set]);

  const CopyIcon = copyState === 'copied' ? Check : copyState === 'failed' ? TriangleAlert : ClipboardCopy;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[#2A2421]/10 bg-[#FFFEFB]/80 p-3.5">
      <header className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 break-words font-serif text-base font-black leading-tight text-[#2A2421]">{set.name}</h4>
        <button
          type="button"
          onClick={handleCopy}
          title="Copiar no formato do Pokémon Showdown"
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#2A2421]/20 bg-[#FFFEFB] px-2.5 text-[11px] font-bold text-[#78614E] transition-colors hover:border-[#829b72]/70 hover:text-[#2A2421] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-live="polite">
            {copyState === 'copied' ? 'Copiado' : copyState === 'failed' ? 'Falhou' : 'Showdown'}
          </span>
        </button>
      </header>

      <dl className="space-y-1.5">
        {set.items.length > 0 && (
          <Field label="Item">
            <ItemIcon name={set.items[0]} />
            <Options values={set.items} onSelect={onOpenItem} />
          </Field>
        )}
        {set.abilities.length > 0 && (
          <Field label="Habilidade"><Options values={set.abilities} onSelect={onOpenAbility} /></Field>
        )}
        {set.natures.length > 0 && <Field label="Natureza"><Options values={set.natures} /></Field>}
        {set.evs.length > 0 && (
          <Field label="EVs"><Options values={set.evs} render={formatStatSpread} /></Field>
        )}
        {set.ivs.length > 0 && (
          <Field label="IVs"><Options values={set.ivs} render={formatStatSpread} /></Field>
        )}
        {set.teraTypes.length > 0 && (
          <Field label="Tera">
            {set.teraTypes.map((type) => <PokemonTypeBadge key={type} type={type.toLowerCase()} />)}
          </Field>
        )}
      </dl>

      <ol className="space-y-1 rounded-lg bg-[#F7F3EE]/70 p-2.5 text-xs">
        {set.moves.map((slot, index) => (
          <li key={slot.join('|')} className="flex items-baseline gap-2">
            <span className="w-3 shrink-0 text-right font-mono text-[10px] text-[#78614E]">{index + 1}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Options values={slot} onSelect={onOpenMove} />
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
});

/**
 * Builds recomendadas pela Smogon para a variedade aberta, por formato.
 * `variety`: { name, species, isForm }, como em `resolveSmogonName`.
 */
function PokemonBuilds({ variety, pokemonLabel, onOpenItem, onOpenAbility, onOpenMove }) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [tier, setTier] = useState(null);
  const { name, species, isForm } = variety;

  useEffect(() => {
    let active = true;
    setState({ status: 'loading', data: null });
    setTier(null);
    fetchSmogonSets({ name, species, isForm })
      .then((data) => active && setState({ status: 'ready', data }))
      .catch(() => active && setState({ status: 'error', data: null }));
    return () => { active = false; };
  }, [name, species, isForm]);

  if (state.status === 'loading') {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-xs font-medium text-[#78614E]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando as builds...
      </p>
    );
  }
  if (state.status === 'error') {
    return <p className="py-8 text-center text-xs text-[#8A3B27]">Não foi possível carregar as builds.</p>;
  }

  const { smogonName, tiers } = state.data;
  if (tiers.length === 0) {
    return (
      <p className="rounded-xl border border-[#2A2421]/10 bg-[#FFFEFB]/80 p-4 text-center text-xs text-[#78614E]">
        {isForm
          ? `A Smogon não tem builds para ${pokemonLabel}. As da forma base não valem para esta forma.`
          : `A Smogon não tem builds de Geração 9 para ${pokemonLabel}.`}
      </p>
    );
  }

  const current = tiers.find((entry) => entry.tier === tier) ?? tiers[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#78614E]">
          Formato
          <select value={current.tier} onChange={(e) => setTier(e.target.value)} className={FIELD}>
            {tiers.map((entry) => (
              <option key={entry.tier} value={entry.tier}>{entry.label} ({entry.sets.length})</option>
            ))}
          </select>
        </label>
        <span className="text-[11px] text-[#78614E]">
          Builds de <strong className="text-[#2A2421]">{smogonName}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {current.sets.map((set) => (
          <BuildCard
            key={set.name}
            pokemonName={smogonName}
            set={set}
            onOpenItem={onOpenItem}
            onOpenAbility={onOpenAbility}
            onOpenMove={onOpenMove}
          />
        ))}
      </div>

      <p className="text-[11px] italic text-[#78614E]/85">
        Opções separadas por “/” são alternativas para o mesmo campo. O botão Showdown copia a primeira de cada.
      </p>
    </div>
  );
}

export default memo(PokemonBuilds);
