import { memo } from 'react';
import { BookOpen, Heart, History, Loader2, LogIn, Trash2, TriangleAlert } from 'lucide-react';

export const COLLECTIONS = {
  all: { label: 'Pokédex', caption: 'anotações de campo', icon: BookOpen },
  favorites: { label: 'Favoritos', caption: 'meus favoritos', icon: Heart },
  history: { label: 'Histórico', caption: 'visitados recentemente', icon: History },
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
      <div role="tablist" aria-label="Coleções" className="inline-flex rounded-full border border-[#4A3B32]/15 bg-[#FFFEFB] p-1 shadow-xs">
        {Object.entries(COLLECTIONS).map(([key, { label, icon: Icon }]) => {
          const selected = view === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(key)}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 font-serif text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70 ${
                selected ? 'bg-[#78614E] text-[#FFFDF9] shadow-sm' : 'text-[#78614E] hover:bg-[#78614E]/10'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              {counts[key] > 0 && (
                <span className={`rounded-full px-1.5 font-sans text-[10px] font-bold tabular-nums ${selected ? 'bg-[#FFFDF9]/25' : 'bg-[#78614E]/15'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {view === 'history' && counts.history > 0 && (
        <button
          type="button"
          onClick={onClearHistory}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-serif text-xs font-semibold text-[#8A3B27] transition-colors hover:bg-[#8A3B27]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Limpar histórico
        </button>
      )}

      {error && (
        <p role="alert" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A3B27]">
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
        Folheando o caderno...
      </p>
    );
  } else if (status === 'error') {
    content = <p className="text-[#8A3B27]">Não foi possível carregar seus dados agora. Tente de novo em instantes.</p>;
  } else if (isEmpty) {
    content = <p>{notices.empty}</p>;
  }
  if (!content) return null;

  const { icon: Icon } = COLLECTIONS[view];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-sm font-medium text-[#78614E]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#4A3B32]/15 bg-white shadow-sm">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="max-w-sm">{content}</div>
    </div>
  );
}

export const CollectionNotice = memo(CollectionNoticeComponent);
export default memo(CollectionTabsComponent);
