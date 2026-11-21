import { memo } from 'react';
import { Scale, X } from 'lucide-react';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

/**
 * Bandeja no canto inferior direito com os Pokémon separados para comparar (vindos da ficha).
 * Com dois ou mais, o botão abre a comparação.
 */
function CompareTray({ names, entryByName, onRemove, onOpen }) {
  const entries = names.map((name) => entryByName.get(name)).filter(Boolean);
  if (entries.length === 0) return null;
  const ready = entries.length >= 2;

  return (
    <aside
      aria-label="Pokémon para comparar"
      className="paper-card fixed bottom-4 right-4 z-30 flex max-w-[calc(100vw-5.5rem)] items-center gap-2 p-2 shadow-[3px_3px_0_#4A463E] animate-fade-in motion-reduce:animate-none sm:bottom-6 sm:right-6"
    >
      <ul className="flex min-w-0 gap-1">
        {entries.map((entry) => (
          <li key={entry.name} className="relative">
            <img src={thumbnailSpriteUrl(entry.id)} alt={formatSlug(entry.name)} title={formatSlug(entry.name)} width={40} height={40} className="h-10 w-10 object-contain [image-rendering:pixelated]" />
            <button
              type="button"
              onClick={() => onRemove(entry.name)}
              aria-label={`Tirar ${formatSlug(entry.name)} da comparação`}
              className="absolute -right-1 -top-1 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-ink bg-paper text-ink transition-colors hover:bg-[#E6D9BE] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpen}
        disabled={!ready}
        title={ready ? undefined : 'Escolha mais um Pokémon na ficha para comparar'}
        className="btn-action h-10 shrink-0 px-3 text-sm"
      >
        <Scale className="h-4 w-4" aria-hidden="true" />
        Comparar
        <span className="font-mono text-xs tabular-nums">({entries.length})</span>
      </button>
    </aside>
  );
}

export default memo(CompareTray);
