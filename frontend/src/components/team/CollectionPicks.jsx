import { memo, useCallback, useId, useMemo, useState } from 'react';
import { ChevronDown, Heart, History, Loader2, LogIn } from 'lucide-react';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

const SOURCES = [
  { key: 'favorites', label: 'Favoritos', icon: Heart, empty: 'Nenhum favorito ainda. Toque no coração de um card da Pokédex.' },
  { key: 'history', label: 'Vistos recentemente', icon: History, empty: 'Nenhuma ficha visitada ainda. As que você abrir na Pokédex aparecem aqui.' },
];

const speciesOf = (pokemon) => pokemon.species ?? pokemon.name;

// Aberto ou fechado fica lembrado neste navegador; sem acesso ao armazenamento, começa aberto.
const OPEN_KEY = 'smearglepedia:team-collection-picks-open';

const readOpen = () => {
  try {
    return window.localStorage.getItem(OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
};

const saveOpen = (open) => {
  try {
    window.localStorage.setItem(OPEN_KEY, String(open));
  } catch {
    // Armazenamento bloqueado: a escolha só vale até recarregar a página.
  }
};

/** Atalhos para montar o time a partir dos favoritos e das fichas vistas recentemente. */
function CollectionPicks({ collections, entryByName, takenSpecies, disabled, onPick, onLogin }) {
  const [open, setOpen] = useState(readOpen);
  const [source, setSource] = useState('favorites');
  const panelId = useId();

  const toggleOpen = useCallback(() => {
    setOpen((current) => {
      saveOpen(!current);
      return !current;
    });
  }, []);
  const active = SOURCES.find((option) => option.key === source);

  const pokemon = useMemo(() => {
    const names = source === 'favorites' ? collections.favorites : collections.history.map((visit) => visit.name);
    return names.map((name) => entryByName.get(name)).filter(Boolean);
  }, [source, collections.favorites, collections.history, entryByName]);

  let content;
  if (collections.status === 'signed-out') {
    content = (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#78614E]">
        Entre na sua conta para usar seus favoritos e as fichas vistas.
        <button type="button" onClick={onLogin} className="btn-action !px-3 !py-1.5 font-serif text-xs">
          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
          Entrar
        </button>
      </p>
    );
  } else if (collections.status === 'loading') {
    content = (
      <p className="flex items-center gap-2 text-sm text-[#78614E]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Molhando o pincel...
      </p>
    );
  } else if (collections.status === 'error') {
    content = <p className="text-sm text-[#8A3B27]">Não foi possível carregar seus dados agora. Tente de novo em instantes.</p>;
  } else if (pokemon.length === 0) {
    content = <p className="font-serif text-sm italic text-smeargle-textDim/80">{active.empty}</p>;
  } else {
    content = (
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {pokemon.map((entry) => {
          const name = formatSlug(entry.name);
          const taken = takenSpecies.has(speciesOf(entry));
          return (
            <li key={entry.name} className="shrink-0">
              <button
                type="button"
                onClick={() => onPick(entry)}
                disabled={disabled || taken}
                title={taken ? `${name} já está no time` : `Adicionar ${name}`}
                aria-label={taken ? `${name} já está no time` : `Adicionar ${name} ao time`}
                className="flex w-[4.5rem] cursor-pointer flex-col items-center rounded-xl border border-transparent px-1 py-1 transition-colors hover:border-smeargle-olive/50 hover:bg-smeargle-olive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <img src={thumbnailSpriteUrl(entry.id)} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 object-contain" />
                <span className="w-full truncate text-center font-serif text-[11px] font-semibold text-smeargle-text">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="paper-card p-3 sm:p-4" aria-label="Adicionar dos favoritos ou vistos recentemente">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70"
      >
        <span className="font-hand text-xl leading-none text-[#78614E]">dos favoritos e vistos</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#78614E] transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
      <div id={panelId} className="mt-2.5">
      <div role="tablist" className="mb-2.5 flex flex-wrap gap-1">
        {SOURCES.map(({ key, label, icon: Icon }) => {
          const selected = key === source;
          const count = key === 'favorites' ? collections.favorites.length : collections.history.length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSource(key)}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 font-serif text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70 ${
                selected ? 'bg-[#78614E] text-[#FFFDF9] shadow-sm' : 'text-[#78614E] hover:bg-[#78614E]/10'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 font-sans text-[10px] font-bold tabular-nums ${selected ? 'bg-[#FFFDF9]/25' : 'bg-[#78614E]/15'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {content}
      </div>
      )}
    </section>
  );
}

export default memo(CollectionPicks);
