import { memo, useEffect, useId, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Heart, Loader2, LogOut, Search, TriangleAlert } from 'lucide-react';
import ProfileSprite from './ProfileSprite';
import ProfilePhoto from './ProfilePhoto';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { fetchPokemonDetail } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { arrangeProfiles, searchProfiles } from '../../utils/profileSearch';
import { SaveStatus } from '../account/settingsUi';
import { DISPLAY_NAME_MAX, normalizeDisplayName } from '../../preferences/preferences';
import { usePreferenceSaver, usePreferences } from '../../preferences/usePreferences';

const GENERATIONS = Array.from({ length: 9 }, (_, index) => index + 1);

const PAGE_SIZE = 18;
const MISSING = <span aria-hidden="true" className="font-serif text-2xl font-black text-umber">?</span>;
const ICON_BUTTON =
  'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink/60 text-ink transition-colors hover:bg-ink/5 disabled:cursor-default disabled:opacity-30';

const SAVE_STATUS = {
  saving: { icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />, text: 'Salvando...', className: 'text-ink-soft' },
  saved: { icon: <Check className="h-4 w-4" aria-hidden="true" />, text: 'Ícone salvo', className: 'text-accent-text' },
  error: { icon: <TriangleAlert className="h-4 w-4" aria-hidden="true" />, text: 'Não foi possível salvar; voltamos ao anterior.', className: 'text-danger' },
};

/** Nome e tipos do escolhido, pela PokéAPI (com cache); até chegar, ou se ela falhar, valem os do índice local. */
function useProfileDetail(id, entry) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (id == null) return undefined;
    let active = true;
    fetchPokemonDetail(id)
      .then((data) => active && setDetail({ id, name: data.species.name, types: data.types.map(({ type }) => type.name) }))
      .catch((error) => console.warn('Dados do perfil indisponíveis:', error));
    return () => { active = false; };
  }, [id]);

  return detail?.id === id ? detail : { name: entry?.species ?? '', types: entry?.types ?? [] };
}

/**
 * Nome de exibição: salva ao sair do campo ou com Enter. Vazio volta ao nome automático (o do e-mail),
 * que aparece como sugestão no campo.
 */
function DisplayNameField({ fallbackName }) {
  const id = useId();
  const { values } = usePreferences();
  const saved = values.display_name ?? '';
  const [draft, setDraft] = useState(saved);
  const [status, save] = usePreferenceSaver();

  // Outra aba ou a carga inicial trouxe um nome novo: o campo acompanha, se não estiver sendo editado.
  useEffect(() => setDraft(saved), [saved]);

  const commit = async () => {
    const next = normalizeDisplayName(draft);
    setDraft(next ?? '');
    if (next === (values.display_name ?? null)) return;
    await save({ display_name: next });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <label htmlFor={id} className="text-xs italic text-umber">Nome</label>
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        maxLength={DISPLAY_NAME_MAX}
        placeholder={fallbackName}
        autoComplete="nickname"
        className="paper-field mt-0.5 h-9 w-full px-2 text-sm font-semibold"
      />
      <SaveStatus status={status} savedText="Nome salvo" />
    </form>
  );
}

const Option = memo(function Option({ entry, selected, onChoose }) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onChoose(entry.id)}
        className={`flex w-full cursor-pointer flex-col items-center rounded-[3px] border-[1.5px] px-1 pb-1.5 pt-1 transition-colors ${
          selected ? 'border-accent-text bg-accent/10' : 'border-ink/20 hover:border-ink/70'
        }`}
      >
        <span className="flex h-16 w-16 max-w-full items-center justify-center overflow-hidden">
          <ProfileSprite id={entry.id} fallback={MISSING} className="h-16 w-16" />
        </span>
        <span className="w-full truncate text-center text-[13px] leading-tight text-ink">{formatSlug(entry.species)}</span>
        <span className="font-mono text-[10px] text-ink-soft">{String(entry.number).padStart(4, '0')}</span>
      </button>
    </li>
  );
});

/**
 * Perfil da conta: o Pokémon do ícone (busca, filtro por geração, favoritos primeiro e grade paginada de 18), o nome de exibição
 * editável, o e-mail e o botão Sair.
 * A escolha vale na hora, inclusive no avatar do header; a gravação é do useProfilePokemon.
 */
function ProfilePanel({ account, pool, favorites, selectedId, saveStatus, onChoose, onSignOut, signingOut }) {
  const species = useMemo(() => pool.filter((entry) => !entry.isForm), [pool]);
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState(null);
  const [favoritesFirst, setFavoritesFirst] = useState(false);
  const favoriteSet = useMemo(() => new Set(favorites ?? []), [favorites]);
  // Abre na página de quem está escolhido.
  const [page, setPage] = useState(() => Math.max(0, Math.floor(species.findIndex((entry) => entry.id === selectedId) / PAGE_SIZE)));

  const results = useMemo(
    () => arrangeProfiles(searchProfiles(species, query), { generation, favorites: favoriteSet, favoritesFirst }),
    [species, query, generation, favoriteSet, favoritesFirst],
  );
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const options = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current = useProfileDetail(selectedId, species.find((entry) => entry.id === selectedId));
  const status = SAVE_STATUS[saveStatus];

  const search = (event) => {
    setQuery(event.target.value);
    setPage(0);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/15 pb-4 sm:gap-4">
        <span className="profile-avatar profile-avatar-preview">
          <ProfilePhoto id={selectedId} initial={account.initial} />
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-sm italic text-umber">Pokémon do perfil</p>
          <p className="truncate font-serif text-xl font-black text-ink">{formatSlug(current.name)}</p>
          <p className="mt-1 flex flex-wrap gap-1">
            {current.types.map((type) => <PokemonTypeBadge key={type} type={type} />)}
          </p>
          {status && (
            <p className={`mt-1.5 flex items-center gap-1.5 text-sm ${status.className}`}>
              {status.icon}
              {status.text}
            </p>
          )}
        </div>
        <dl className="w-full min-w-0 text-sm sm:w-64">
          <dd><DisplayNameField fallbackName={account.fallbackName} /></dd>
          {account.email && (
            <>
              <dt className="mt-1 text-xs italic text-umber">E-mail</dt>
              <dd className="truncate text-ink">{account.email}</dd>
            </>
          )}
          <dd className="mt-2">
            <button type="button" onClick={onSignOut} disabled={signingOut} className="btn-outline !min-h-9 !py-1 text-sm">
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
              Sair
            </button>
          </dd>
        </dl>
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2">
        <select
          value={generation ?? ''}
          onChange={(event) => {
            setGeneration(event.target.value ? Number(event.target.value) : null);
            setPage(0);
          }}
          aria-label="Geração"
          className="paper-field h-9 px-2 text-sm"
        >
          <option value="">Todas as gerações</option>
          {GENERATIONS.map((value) => <option key={value} value={value}>Geração {value}</option>)}
        </select>
        {favoriteSet.size > 0 && (
          <button
            type="button"
            aria-pressed={favoritesFirst}
            onClick={() => {
              setFavoritesFirst((current) => !current);
              setPage(0);
            }}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[3px] border-[1.5px] px-3 text-sm transition-colors ${
              favoritesFirst ? 'border-accent-text bg-accent/15 font-semibold text-ink' : 'border-ink/25 text-ink-soft hover:border-ink/60 hover:text-ink'
            }`}
          >
            <Heart className={`h-4 w-4 ${favoritesFirst ? 'fill-current' : ''}`} aria-hidden="true" />
            Favoritos primeiro
          </button>
        )}
      </div>

      <label className="relative mt-2 block shrink-0">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={search}
          aria-label="Buscar Pokémon por nome ou número"
          placeholder="Nome ou número..."
          className="h-10 w-full rounded-none border-0 border-b-[1.5px] border-line-strong bg-transparent pl-8 pr-2 text-base text-ink"
        />
      </label>

      <div className="py-4">
        {options.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {options.map((entry) => (
              <Option key={entry.id} entry={entry} selected={entry.id === selectedId} onChoose={onChoose} />
            ))}
          </ul>
        ) : (
          <p role="status" className="py-10 text-center italic text-ink-soft">Nenhum Pokémon com esse nome ou número.</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/15 pt-3">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Página anterior" className={ICON_BUTTON}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-sm tabular-nums text-ink-soft" aria-live="polite">{page + 1} de {pages}</p>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page + 1 >= pages} aria-label="Próxima página" className={ICON_BUTTON}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default memo(ProfilePanel);
