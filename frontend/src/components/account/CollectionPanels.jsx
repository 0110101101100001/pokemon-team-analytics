import { memo, useMemo, useState } from 'react';
import { Heart, History, Loader2, Trash2, X } from 'lucide-react';
import { ErrorNote, Loading, SMALL_BUTTON } from './settingsUi';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { formatHash } from '../../navigation/hashRoute';
import { timeAgo } from '../../utils/timeAgo';

// Link da ficha: fecha as Configurações (o parâmetro ?conta some) e abre o Pokémon na Pokédex.
const sheetHref = (name) => formatHash(['pokedex'], new URLSearchParams({ pokemon: name }));

function PokemonRow({ name, entry, meta, action }) {
  return (
    <li className="flex items-center gap-3 rounded-sketch border border-line bg-paper px-2 py-1.5 shadow-card">
      <a href={sheetHref(name)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center">
          {entry && (
            <img src={thumbnailSpriteUrl(entry.id)} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 object-contain [image-rendering:pixelated]" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-base font-bold text-ink">{formatSlug(name)}</span>
          {meta && <span className="block text-xs italic text-umber">{meta}</span>}
        </span>
      </a>
      {action}
    </li>
  );
}

const usePoolIndex = (pool) => useMemo(() => new Map(pool.map((entry) => [entry.name, entry])), [pool]);

function Empty({ icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Icon className="h-7 w-7 text-umber" aria-hidden="true" />
      <p className="max-w-sm italic text-ink-soft">{children}</p>
    </div>
  );
}

/** Favoritos da conta, do mais recente ao mais antigo: abrir a ficha ou remover. */
export const FavoritesPanel = memo(function FavoritesPanel({ collections, pool }) {
  const { status, error, favorites, toggleFavorite } = collections;
  const byName = usePoolIndex(pool);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorNote>Não foi possível carregar seus favoritos agora.</ErrorNote>;

  return (
    <div>
      <ErrorNote>{error}</ErrorNote>
      {favorites.length === 0 ? (
        <Empty icon={Heart}>Nenhum favorito ainda. Use o coração na ficha de um Pokémon para guardar aqui.</Empty>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">{favorites.length} Pokémon</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {favorites.map((name) => (
              <PokemonRow
                key={name}
                name={name}
                entry={byName.get(name)}
                action={(
                  <button
                    type="button"
                    onClick={() => toggleFavorite(name)}
                    aria-label={`Remover ${formatSlug(name)} dos favoritos`}
                    title="Remover dos favoritos"
                    className={`${SMALL_BUTTON} !px-2 text-umber hover:bg-ink/10 hover:text-ink`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
});

/** Fichas abertas recentemente (as 60 últimas, uma por Pokémon), com "Limpar histórico". */
export const HistoryPanel = memo(function HistoryPanel({ collections, pool }) {
  const { status, error, history, clearHistory } = collections;
  const byName = usePoolIndex(pool);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorNote>Não foi possível carregar seu histórico agora.</ErrorNote>;

  const clear = async () => {
    setClearing(true);
    await clearHistory();
    setClearing(false);
    setConfirming(false);
  };

  return (
    <div>
      <ErrorNote>{error}</ErrorNote>
      {history.length === 0 ? (
        <Empty icon={History}>O histórico está vazio. As fichas que você abrir aparecem aqui.</Empty>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">As {history.length} fichas mais recentes</p>
            {confirming ? (
              <span className="flex flex-wrap items-center gap-1">
                <span className="text-sm italic text-danger">Apagar todo o histórico?</span>
                <button type="button" onClick={() => setConfirming(false)} disabled={clearing} className={`${SMALL_BUTTON} text-ink hover:bg-ink/10`}>
                  Cancelar
                </button>
                <button type="button" onClick={clear} disabled={clearing} className={`${SMALL_BUTTON} bg-danger text-paper hover:bg-danger/85`}>
                  {clearing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  Limpar
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={`${SMALL_BUTTON} text-umber hover:bg-ink/10 hover:text-ink`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Limpar histórico
              </button>
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {history.map((visit) => (
              <PokemonRow
                key={visit.name}
                name={visit.name}
                entry={byName.get(visit.name)}
                meta={<time dateTime={visit.viewedAt}>{timeAgo(visit.viewedAt)}</time>}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
});
