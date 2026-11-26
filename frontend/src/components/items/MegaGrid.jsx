import { memo, useState } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { itemSpriteUrl, thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { MEGA_STAT_KEYS, megaDebutLabel } from '../../utils/megas';
import { STAT_LABELS } from '../../utils/stats';
import EmptyState from '../EmptyState';

const LABEL = 'block text-[10px] font-semibold uppercase text-umber';
const LINK = 'cursor-pointer rounded-[2px] text-left font-semibold underline decoration-umber/35 decoration-dashed underline-offset-4 transition-colors hover:text-olive-ink hover:decoration-olive-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';

const signed = (value) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0');
const diffTone = (value) => (value > 0 ? 'text-good' : value < 0 ? 'text-danger' : 'text-umber');

// Megas novas podem ainda não ter sprite no repositório da PokéAPI: aí entra o da forma base.
function MegaSprite({ id, baseId }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={thumbnailSpriteUrl(failed ? baseId : id)}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 object-contain [image-rendering:pixelated]"
    />
  );
}

function StatDiffs({ mega }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] font-semibold uppercase text-umber">
          <th className="pb-1 text-left font-semibold">Atributo</th>
          <th className="pb-1 text-right font-semibold">Base</th>
          <th className="pb-1 text-right font-semibold">Mega</th>
          <th className="pb-1 text-right font-semibold">Dif.</th>
        </tr>
      </thead>
      <tbody className="font-mono tabular-nums">
        {MEGA_STAT_KEYS.map((key, index) => (
          <tr key={key}>
            <td className="py-0.5 font-reading font-semibold text-ink">{STAT_LABELS[key]}</td>
            <td className="py-0.5 text-right text-ink-soft">{mega.baseStats[index] ?? '—'}</td>
            <td className="py-0.5 text-right font-bold text-ink">{mega.stats[index] ?? '—'}</td>
            <td className={`py-0.5 text-right font-bold ${diffTone(mega.diffs[index])}`}>{signed(mega.diffs[index])}</td>
          </tr>
        ))}
        <tr className="border-t border-ink/15">
          <td className="pt-1 font-reading font-bold text-ink">Total</td>
          <td className="pt-1 text-right text-ink-soft">{mega.baseTotal}</td>
          <td className="pt-1 text-right font-bold text-ink">{mega.total}</td>
          <td className={`pt-1 text-right font-bold ${diffTone(mega.total - mega.baseTotal)}`}>{signed(mega.total - mega.baseTotal)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function MegaCard({ mega, baseEntry, onSelectPokemon, onSelectItem, onSelectAbility }) {
  return (
    <li className="paper-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-3">
        <MegaSprite id={mega.id} baseId={mega.baseId} />
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg font-black tracking-tight text-ink" title={formatSlug(mega.name)}>{formatSlug(mega.name)}</h3>
          {baseEntry ? (
            <button type="button" onClick={() => onSelectPokemon(baseEntry.name)} className={`${LINK} text-xs text-ink-soft`}>
              de {formatSlug(mega.base)}
            </button>
          ) : (
            <span className="text-xs text-ink-soft">de {formatSlug(mega.base)}</span>
          )}
          <span className="mt-0.5 block text-[11px] italic text-umber">{megaDebutLabel(mega.generation) ?? `${mega.generation}ª geração`}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className={LABEL}>{mega.isPrimal ? 'Orbe' : 'Pedra'}</span>
          {mega.stone ? (
            <button type="button" onClick={() => onSelectItem(mega.stone)} className={`${LINK} inline-flex items-center gap-1 text-xs text-ink`}>
              <img src={itemSpriteUrl(mega.stone)} alt="" width={24} height={24} loading="lazy" className="h-6 w-6 [image-rendering:pixelated]" />
              {formatSlug(mega.stone)}
            </button>
          ) : (
            <span className="text-xs font-semibold text-ink">Sem pedra: Dragon Ascent</span>
          )}
        </div>
        <div>
          <span className={LABEL}>Habilidade</span>
          {mega.ability ? (
            <button type="button" onClick={() => onSelectAbility(mega.ability)} className={`${LINK} text-xs text-ink`}>
              {formatSlug(mega.ability)}
            </button>
          ) : (
            <span className="text-xs italic text-ink-soft">ainda sem dados</span>
          )}
        </div>
      </div>

      <div>
        <span className={LABEL}>Tipos</span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {mega.typesChanged && (
            <>
              {mega.baseTypes.map((type) => <PokemonTypeBadge key={`base-${type}`} type={type} className="opacity-60" />)}
              <span aria-label="viram" className="text-xs text-umber">→</span>
            </>
          )}
          {mega.types.map((type) => <PokemonTypeBadge key={type} type={type} />)}
        </div>
      </div>

      <StatDiffs mega={mega} />
    </li>
  );
}

/** Grade das Megas e Primais: pedra, habilidade, tipos e quanto muda cada atributo em relação à forma base. */
function MegaGrid({ megas, resolveBase, onSelectPokemon, onSelectItem, onSelectAbility }) {
  if (megas.length === 0) {
    return <EmptyState title="nenhuma Mega com esses filtros" hint="Ajuste a busca ou o tipo." />;
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {megas.map((mega) => (
        <MegaCard
          key={mega.name}
          mega={mega}
          baseEntry={resolveBase(mega.base)}
          onSelectPokemon={onSelectPokemon}
          onSelectItem={onSelectItem}
          onSelectAbility={onSelectAbility}
        />
      ))}
    </ul>
  );
}

export default memo(MegaGrid);
