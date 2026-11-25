import { memo } from 'react';
import { BookOpen, Heart, History, Loader2, LogIn, Trash2, TriangleAlert } from 'lucide-react';
import { BrushUnderline } from './InkDecor';

export const COLLECTIONS = {
  all: { label: 'Todos', icon: BookOpen },
  favorites: { label: 'Favoritos', icon: Heart },
  history: { label: 'Histórico', icon: History },
};

const NOTICES = {
  favorites: {
    signedOut: 'Entre na sua conta para guardar seus Pokémon favoritos.',
    empty: 'Você ainda não favoritou nenhum Pokémon. Toque no coração de um card para começar.',
  },
  history: {
    signedOut: 'Entre na sua conta para ver os Pokémon que você visitou.',
    empty: 'Seu histórico está vazio. As fichas que você abrir aparecem aqui.',
  },
};

/** Seletor entre a Pokédex completa, os favoritos e o histórico do usuário. */
function CollectionTabsComponent({ view, onChange, counts, onClearHistory, error }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div role="tablist" aria-label="Coleções" className="inline-flex gap-1 border-b-[1.5px] border-ink/70">
        {Object.entries(COLLECTIONS).map(([key, { label, icon: Icon }]) => {
          const selected = view === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(key)}
              className={`relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[2px] px-3 font-reading text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
                selected ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              {counts[key] > 0 && <span className="font-mono text-[11px] tabular-nums text-ink-soft">{counts[key]}</span>}
              <BrushUnderline color="var(--accent)" active={selected} className="inset-x-2 -bottom-1 h-[5px] w-[calc(100%-1rem)]" />
            </button>
          );
        })}
      </div>

      {view === 'history' && counts.history > 0 && (
        <button
          type="button"
          onClick={onClearHistory}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[2px] px-2.5 font-reading text-sm font-medium text-vermilion-deep transition-colors hover:bg-vermilion-deep/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Limpar histórico
        </button>
      )}

      {error && (
        <p role="alert" className="inline-flex items-center gap-1.5 text-xs font-medium text-vermilion-deep">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Estado de uma coleção que impede mostrar a grade (sem login, carregando, falha ou vazia).
 * Devolve null quando há Pokémon para listar.
 */
function CollectionNoticeComponent({ view, status, isEmpty, onLogin }) {
  const notices = NOTICES[view];
  if (!notices) return null;

  let content = null;
  if (status === 'signed-out') {
    content = (
      <>
        <p>{notices.signedOut}</p>
        <button type="button" onClick={onLogin} className="btn-action mt-4 font-serif">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Entrar / Cadastrar
        </button>
      </>
    );
  } else if (status === 'loading') {
    content = (
      <p className="inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Molhando o pincel...
      </p>
    );
  } else if (status === 'error') {
    content = <p className="text-vermilion-deep">Não foi possível carregar seus dados agora. Tente de novo em instantes.</p>;
  } else if (isEmpty) {
    content = <p>{notices.empty}</p>;
  }
  if (!content) return null;

  const { icon: Icon } = COLLECTIONS[view];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-sm font-medium text-umber">
      <div className="ink-stamp mb-4 h-14 w-14 text-umber">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="max-w-sm">{content}</div>
    </div>
  );
}

export const CollectionNotice = memo(CollectionNoticeComponent);
export default memo(CollectionTabsComponent);
