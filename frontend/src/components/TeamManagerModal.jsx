import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Download, Loader2, Save, Trash2, TriangleAlert, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { thumbnailSpriteUrl } from '../services/api';
import { formatSlug } from '../utils/filters';

const TABLE = 'teams';
const MAX_TEAM_SIZE = 6;
const MAX_NAME_LENGTH = 40;

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const toStoredPokemon = ({ id, name, number, species, types }) => ({ id, name, number, species, types });

const describeError = (error) =>
  error?.code === '42501' || error?.code === 'PGRST301'
    ? 'Sessão expirada ou sem permissão. Entre novamente.'
    : error?.message ?? 'Algo deu errado. Tente novamente.';

const ICON_BUTTON_CLASS =
  'rounded-lg p-2 text-[#78614E]/75 transition-colors hover:bg-[#78614E]/10 hover:text-[#78614E] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60 disabled:cursor-wait disabled:opacity-60';

const TeamSprites = memo(function TeamSprites({ pokemons }) {
  return (
    <ul className="flex -space-x-1.5">
      {pokemons.map((pokemon) => (
        <li
          key={pokemon.id}
          title={formatSlug(pokemon.name)}
          className="h-9 w-9 rounded-full border border-[#78614E]/25 bg-[#FFFEFB] shadow-sm"
        >
          <img src={thumbnailSpriteUrl(pokemon.id)} alt={formatSlug(pokemon.name)} loading="lazy" className="h-full w-full object-contain" />
        </li>
      ))}
    </ul>
  );
});

const SavedTeamRow = memo(function SavedTeamRow({ team, onLoad, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const removed = await onDelete(team.id);
    if (!removed) {
      setDeleting(false);
      setConfirming(false);
    }
  }, [onDelete, team.id]);

  return (
    <li className="rounded-xl border border-[#78614E]/20 bg-[#FFFEFB]/70 px-3 py-2.5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-[#78614E]">{team.name}</p>
          <p className="font-serif text-[11px] italic text-smeargle-textDim/70">
            {DATE_FORMAT.format(new Date(team.created_at))}
          </p>
        </div>
        <TeamSprites pokemons={team.pokemons} />
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 border-t border-dashed border-[#78614E]/20 pt-2">
        {confirming ? (
          <>
            <span className="mr-auto font-hand text-lg leading-none text-[#8A3B27]">Apagar este time?</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#78614E] transition-colors hover:bg-[#78614E]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#B5543C] px-3 py-1.5 text-xs font-semibold text-[#FFFEFB] transition-colors hover:bg-[#8A3B27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B5543C]/50 disabled:cursor-wait disabled:opacity-70"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Apagar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onLoad(team)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-smeargle-ink-darkGreen transition-colors hover:bg-smeargle-olive/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Carregar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Apagar ${team.name}`}
              title="Apagar"
              className={ICON_BUTTON_CLASS}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
});

export default function TeamManagerModal({ open, onClose, session, team = [], onLoadTeam }) {
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const ids = useId();

  const userId = session?.user?.id ?? null;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return undefined;
    let active = true;
    setStatus('loading');
    setError(null);

    supabase
      .from(TABLE)
      .select('id, name, pokemons, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError(describeError(fetchError));
        setTeams(data ?? []);
        setStatus('idle');
      });

    return () => { active = false; };
  }, [open, userId]);

  useEffect(() => {
    if (!userId) setTeams([]);
  }, [userId]);

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !team.length || !userId) return;

    setSaving(true);
    setError(null);
    const { data, error: saveError } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, name: trimmed, pokemons: team.slice(0, MAX_TEAM_SIZE).map(toStoredPokemon) })
      .select('id, name, pokemons, created_at')
      .single();
    setSaving(false);

    if (saveError) {
      setError(describeError(saveError));
      return;
    }
    setTeams((current) => [data, ...current]);
    setName('');
  }, [name, team, userId]);

  const handleDelete = useCallback(async (id) => {
    setError(null);
    const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', id);
    if (deleteError) {
      setError(describeError(deleteError));
      return false;
    }
    setTeams((current) => current.filter((saved) => saved.id !== id));
    return true;
  }, []);

  const handleLoad = useCallback((saved) => {
    onLoadTeam?.(saved.pokemons, saved);
    onCloseRef.current?.();
  }, [onLoadTeam]);

  if (!open) return null;

  const canSave = Boolean(userId) && team.length > 0 && name.trim().length > 0 && !saving;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2A2421]/40 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-panel border border-[#78614E]/30 bg-[#FFFEFB]/85 p-7 shadow-panel backdrop-blur-xl animate-bubble-pop"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#78614E]/70 transition-colors hover:bg-[#78614E]/10 hover:text-[#78614E] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="mb-5 pr-6">
          <h2 id={`${ids}-title`} className="font-display text-2xl font-bold text-[#78614E]">Meus times</h2>
          <p className="mt-1 font-serif text-sm italic text-smeargle-textDim/80">Salve e retome as páginas do seu caderno.</p>
        </header>

        {!userId ? (
          <p className="rounded-xl border border-dashed border-[#78614E]/30 px-4 py-6 text-center font-serif text-sm italic text-smeargle-textDim/80">
            Entre na sua conta para salvar e ver seus times.
          </p>
        ) : (
          <>
            <form onSubmit={handleSave} className="mb-4">
              <label htmlFor={`${ids}-name`} className="mb-1.5 block font-hand text-lg leading-none text-[#78614E]">
                Salvar time atual
                <span className="ml-2 font-sans text-[11px] text-smeargle-textDim/70">{team.length}/{MAX_TEAM_SIZE}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id={`${ids}-name`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={team.length ? 'Nome do time' : 'Adicione Pokémon ao time primeiro'}
                  disabled={!team.length}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#78614E]/25 bg-[#FFFEFB]/70 px-3 font-serif text-sm text-smeargle-text shadow-inner transition-colors placeholder:italic placeholder:text-[#78614E]/55 hover:border-[#78614E]/45 focus:border-smeargle-olive focus:outline-none focus:ring-2 focus:ring-smeargle-olive/60 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!canSave}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#78614E] px-4 text-sm font-semibold tracking-wide text-[#FFFEFB] shadow-hard transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60 disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                  Salvar
                </button>
              </div>
            </form>

            {error && (
              <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#B5543C]/30 bg-[#B5543C]/10 px-3 py-2 text-xs text-[#8A3B27]">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              {status === 'loading' ? (
                <p className="flex items-center justify-center gap-2 py-8 font-hand text-xl text-[#78614E]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  A folhear o caderno...
                </p>
              ) : teams.length === 0 ? (
                <p className="flex flex-col items-center gap-2 py-8 text-center font-serif text-sm italic text-smeargle-textDim/70">
                  <BookOpen className="h-6 w-6 text-[#78614E]/50" aria-hidden="true" />
                  Você ainda não salvou nenhum time.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {teams.map((saved) => (
                    <SavedTeamRow key={saved.id} team={saved} onLoad={handleLoad} onDelete={handleDelete} />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
