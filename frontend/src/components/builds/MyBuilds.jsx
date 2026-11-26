import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Calculator, Check, ClipboardCopy, FileInput, Loader2, Pencil, Search, Trash2, TriangleAlert, X,
} from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { useAppActions } from './appActions';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { thumbnailSpriteUrl } from '../../services/api';
import {
  deleteBuild, fetchBuildSpecies, fetchBuilds, insertBuild, isBuildLimitError, renameBuild,
} from '../../services/userBuilds';
import {
  BUILD_NAME_MAX, buildToShowdown, defaultBuildName, evSummary, isFutureBuild, parseShowdown,
} from '../../utils/builds';
import { toPokeApiSlug } from '../../utils/slug';
import MOVE_LIST from '../../data/moves.json';

// Tipo de cada golpe (data/moves.json: [slug, tipo, ...]) para pintar os chips sem ir à PokéAPI.
const MOVE_TYPE = new Map(MOVE_LIST.map(([slug, type]) => [slug, type]));
const SEARCH_DELAY_MS = 250;
const SMALL_BUTTON =
  'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

function MoveChip({ name }) {
  const type = MOVE_TYPE.get(toPokeApiSlug(name));
  return (
    <li
      className="rounded-[2px] border border-line bg-surface px-1.5 py-0.5 text-xs text-ink"
      // A faixa à esquerda leva a cor do tipo (tokens --type-* de index.css); sem tipo conhecido, só a borda.
      style={type ? { boxShadow: `inset 3px 0 0 var(--type-${type})` } : undefined}
      title={type ? `${name} (${type})` : name}
    >
      <span className="pl-1">{name}</span>
    </li>
  );
}

const BuildCard = memo(function BuildCard({ row, spriteId, onOpen, onRenamed, onDeleted }) {
  const { notify } = useAppActions();
  const { build } = row;
  const future = isFutureBuild(build);
  const [mode, setMode] = useState('view'); // 'view' | 'rename' | 'confirm'
  const [name, setName] = useState(row.name);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildToShowdown(build));
      notify('Build copiada no formato do Showdown');
    } catch {
      notify('Não foi possível copiar agora.', { tone: 'info' });
    }
  };

  const saveName = async (event) => {
    event.preventDefault();
    const trimmed = name.trim().slice(0, BUILD_NAME_MAX);
    if (!trimmed || trimmed === row.name) {
      setMode('view');
      return;
    }
    setBusy(true);
    try {
      await renameBuild(row.id, trimmed);
      onRenamed(row.id, trimmed);
      setMode('view');
    } catch (error) {
      console.warn('Build não renomeada:', error);
      notify('Não foi possível renomear a build.', { tone: 'info' });
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteBuild(row.id);
      onDeleted(row.id);
    } catch (error) {
      console.warn('Build não excluída:', error);
      notify('Não foi possível excluir a build.', { tone: 'info' });
      setBusy(false);
      setMode('view');
    }
  };

  return (
    <li className="rounded-sketch border border-line bg-paper p-3 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2">
          {spriteId ? (
            <img src={thumbnailSpriteUrl(spriteId)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 object-contain [image-rendering:pixelated]" />
          ) : (
            <span aria-hidden="true" className="font-serif text-xl font-black text-umber">{row.pokemon_name.charAt(0)}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          {mode === 'rename' ? (
            <form onSubmit={saveName} className="flex items-center gap-1.5">
              <label className="sr-only" htmlFor={`nome-${row.id}`}>Novo nome da build</label>
              <input
                id={`nome-${row.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={BUILD_NAME_MAX}
                autoFocus
                className="paper-field !h-9 min-w-0 flex-1"
              />
              <button type="submit" disabled={busy} aria-label="Salvar nome" className={`${SMALL_BUTTON} text-accent-text hover:bg-accent/15`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => { setName(row.name); setMode('view'); }} aria-label="Cancelar" className={`${SMALL_BUTTON} text-ink-soft hover:bg-ink/10`}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <p className="truncate font-display text-base font-bold text-ink">{row.name}</p>
          )}
          <p className="text-sm text-ink-soft">
            {row.pokemon_name}
            {build.item && <> @ <span className="text-ink">{build.item}</span></>}
            {build.nature && <> · {build.nature}</>}
          </p>
          {future ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-danger">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              Salva por uma versão mais nova do site: recarregue a página para ver.
            </p>
          ) : (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-umber">
                {build.teraType && (
                  <span className="inline-flex items-center gap-1">
                    Tera <PokemonTypeBadge type={toPokeApiSlug(build.teraType)} className="!px-1 !py-0.5 !text-[9px]" />
                  </span>
                )}
                {evSummary(build.evs) && <span className="font-mono">{evSummary(build.evs)}</span>}
              </div>
              {build.moves?.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Golpes">
                  {build.moves.map((move) => <MoveChip key={move} name={move} />)}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-ink/15 pt-2">
        {mode === 'confirm' ? (
          <>
            <span className="mr-auto text-sm italic text-danger">Excluir “{row.name}”?</span>
            <button type="button" onClick={() => setMode('view')} disabled={busy} className={`${SMALL_BUTTON} text-ink hover:bg-ink/10`}>Cancelar</button>
            <button type="button" onClick={remove} disabled={busy} className={`${SMALL_BUTTON} bg-danger text-paper hover:bg-danger/85`}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Excluir
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onOpen(build)} disabled={future} className={`${SMALL_BUTTON} text-accent-text hover:bg-accent/15`}>
              <Calculator className="h-4 w-4" aria-hidden="true" />
              Abrir na calculadora
            </button>
            <button type="button" onClick={copy} disabled={future} className={`${SMALL_BUTTON} text-ink hover:bg-ink/10`}>
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              Showdown
            </button>
            <button type="button" onClick={() => setMode('rename')} aria-label={`Renomear ${row.name}`} title="Renomear" className={`${SMALL_BUTTON} !px-2 text-umber hover:bg-ink/10 hover:text-ink`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setMode('confirm')} aria-label={`Excluir ${row.name}`} title="Excluir" className={`${SMALL_BUTTON} !px-2 text-umber hover:bg-ink/10 hover:text-ink`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
});

/** "Importar do Showdown": cola o texto, confere cada Pokémon e salva os válidos, um por um. */
function ImportForm({ userId, onImported, onClose }) {
  const { notify } = useAppActions();
  const ids = useId();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseShowdown(text) : []), [text]);
  const valid = parsed.filter((entry) => entry.errors.length === 0);
  const invalid = parsed.filter((entry) => entry.errors.length > 0);

  const save = async (event) => {
    event.preventDefault();
    if (!valid.length) return;
    setSaving(true);
    let saved = 0;
    for (const { build } of valid) {
      try {
        // Uma por vez: o limite de 200 do banco para no ponto certo.
        await insertBuild(userId, defaultBuildName(build), build);
        saved += 1;
      } catch (error) {
        console.warn('Build não importada:', error);
        notify(isBuildLimitError(error) ? 'Limite de 200 builds atingido' : 'Parte das builds não foi salva.', { tone: 'info' });
        break;
      }
    }
    setSaving(false);
    if (saved) {
      notify(saved === 1 ? 'Build salva' : `${saved} builds salvas`);
      onImported();
    }
  };

  return (
    <form onSubmit={save} className="rounded-sketch border border-line bg-surface-2/60 p-3">
      <label htmlFor={`${ids}-texto`} className="paper-label">Texto do Showdown</label>
      <textarea
        id={`${ids}-texto`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        spellCheck={false}
        placeholder={'Smeargle @ Focus Sash\nAbility: Own Tempo\nLevel: 50\nTera Type: Ghost\nEVs: 252 HP / 4 Def / 252 Spe\nJolly Nature\n- Spore\n- Fake Out\n- Follow Me\n- Wide Guard'}
        className="w-full rounded-[3px] border-[1.5px] border-line-strong bg-paper p-2 font-mono text-xs text-ink"
      />
      {parsed.length > 0 && (
        <div className="mt-2 text-sm" aria-live="polite">
          <p className="text-ink-soft">{valid.length} de {parsed.length} pronta(s) para salvar.</p>
          {invalid.map(({ build, errors }) => (
            <p key={`${build.species}-${errors.join()}`} className="mt-1 flex items-start gap-1.5 text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {build.species || 'Sem espécie'}: {errors.join(' ')}
            </p>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-outline !min-h-9 !py-1 text-sm">Cancelar</button>
        <button type="submit" disabled={saving || valid.length === 0} className="btn-action !h-9 text-sm">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar {valid.length > 1 ? `${valid.length} builds` : 'build'}
        </button>
      </div>
    </form>
  );
}

/**
 * Builds salvas (aba própria das configurações): busca por nome ou Pokémon, filtro por espécie, 50 por vez com "Carregar mais".
 * `pool` (a grade da Pokédex) dá o número de cada espécie para o sprite.
 */
function MyBuilds({ userId, pool }) {
  const { openBuildInCalculator } = useAppActions();
  const ids = useId();
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState('');
  const [speciesOptions, setSpeciesOptions] = useState([]);
  const [state, setState] = useState({ status: 'loading', rows: [], hasMore: false });
  const [importing, setImporting] = useState(false);
  const [reload, setReload] = useState(0);
  const search = useDebouncedValue(query, SEARCH_DELAY_MS);

  const spriteBySlug = useMemo(() => new Map(pool.map((entry) => [entry.name, entry.id])), [pool]);

  useEffect(() => {
    let active = true;
    fetchBuildSpecies(userId).then((list) => active && setSpeciesOptions(list)).catch(() => {});
    return () => { active = false; };
  }, [userId, reload]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    fetchBuilds(userId, { query: search, species })
      .then(({ rows, hasMore }) => active && setState({ status: 'ready', rows, hasMore }))
      .catch((error) => {
        console.warn('Builds indisponíveis:', error);
        if (active) setState({ status: 'error', rows: [], hasMore: false });
      });
    return () => { active = false; };
  }, [userId, search, species, reload]);

  const loadMore = async () => {
    setState((current) => ({ ...current, status: 'more' }));
    try {
      const { rows, hasMore } = await fetchBuilds(userId, { offset: state.rows.length, query: search, species });
      setState((current) => ({ status: 'ready', rows: [...current.rows, ...rows], hasMore }));
    } catch {
      setState((current) => ({ ...current, status: 'ready' }));
    }
  };

  const renamed = useCallback((id, name) => {
    setState((current) => ({ ...current, rows: current.rows.map((row) => (row.id === id ? { ...row, name } : row)) }));
  }, []);
  const deleted = useCallback((id) => {
    setState((current) => ({ ...current, rows: current.rows.filter((row) => row.id !== id) }));
  }, []);
  const imported = useCallback(() => {
    setImporting(false);
    setReload((value) => value + 1);
  }, []);

  const filtering = Boolean(search.trim() || species);

  return (
    <section aria-labelledby={`${ids}-titulo`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${ids}-titulo`} className="mr-auto font-serif text-lg font-bold text-ink">Builds salvas</h3>
        <button type="button" onClick={() => setImporting((open) => !open)} aria-expanded={importing} className="btn-outline !min-h-9 !py-1 text-sm">
          <FileInput className="h-4 w-4" aria-hidden="true" />
          Importar do Showdown
        </button>
      </div>

      {importing && <div className="mt-3"><ImportForm userId={userId} onImported={imported} onClose={() => setImporting(false)} /></div>}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_14rem]">
        <label className="relative block">
          <span className="sr-only">Buscar build por nome ou Pokémon</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou Pokémon..." className="paper-field !h-9 pl-8" />
        </label>
        <label className="block">
          <span className="sr-only">Filtrar por espécie</span>
          <select value={species} onChange={(event) => setSpecies(event.target.value)} className="paper-field !h-9">
            <option value="">Todos os Pokémon</option>
            {speciesOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-3">
        {state.status === 'loading' ? (
          <p className="flex items-center justify-center gap-2 py-8 italic text-umber">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando builds...
          </p>
        ) : state.status === 'error' ? (
          <p role="alert" className="py-6 text-center text-danger">Não foi possível carregar suas builds agora.</p>
        ) : state.rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="italic text-ink-soft">{filtering ? 'Nenhuma build com esse filtro.' : 'Nenhuma build salva ainda'}</p>
            {!filtering && (
              <p className="mt-1 text-sm text-umber">
                Use “Salvar build” na Calculadora, no Team Builder ou nas builds da Smogon na ficha de um Pokémon, ou importe do Showdown.
              </p>
            )}
          </div>
        ) : (
          <>
            <ul className="grid gap-2.5">
              {state.rows.map((row) => (
                <BuildCard
                  key={row.id}
                  row={row}
                  spriteId={spriteBySlug.get(toPokeApiSlug(row.pokemon_name)) ?? null}
                  onOpen={openBuildInCalculator}
                  onRenamed={renamed}
                  onDeleted={deleted}
                />
              ))}
            </ul>
            {state.hasMore && (
              <div className="mt-3 flex justify-center">
                <button type="button" onClick={loadMore} disabled={state.status === 'more'} className="btn-outline !min-h-9 !py-1 text-sm">
                  {state.status === 'more' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default memo(MyBuilds);
