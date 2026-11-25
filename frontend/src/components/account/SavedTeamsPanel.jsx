import { memo, useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, PenLine, Plus, Trash2, TriangleAlert } from 'lucide-react';
import TeamSprites from '../team/TeamSprites';
import { deleteSavedTeam, fetchSavedTeams } from '../../services/userData';

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const SMALL_BUTTON =
  'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60';

const SavedTeam = memo(function SavedTeam({ team, onOpen, onDelete }) {
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
    <li className="rounded-sketch border border-line bg-paper px-3 py-2.5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-ink">{team.name}</p>
          <p className="text-xs italic text-umber">
            {team.pokemons.length} Pokémon · <time dateTime={team.created_at}>{DATE_FORMAT.format(new Date(team.created_at))}</time>
          </p>
        </div>
        <TeamSprites pokemons={team.pokemons.slice(0, 6)} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-ink/15 pt-2">
        {confirming ? (
          <>
            <span className="mr-auto text-sm italic text-danger">Excluir “{team.name}”?</span>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className={`${SMALL_BUTTON} text-ink hover:bg-ink/10`}>
              Cancelar
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting} className={`${SMALL_BUTTON} bg-danger text-paper hover:bg-danger/85`}>
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Excluir
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onOpen(team)} className={`${SMALL_BUTTON} text-accent-text hover:bg-accent/15`}>
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Abrir e editar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Excluir ${team.name}`}
              title="Excluir"
              className={`${SMALL_BUTTON} !px-2 text-umber hover:bg-ink/10 hover:text-ink`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
});

/** Times salvos da conta, do mais recente para o mais antigo: abrir no Team Builder ou excluir. */
function SavedTeamsPanel({ userId, onOpenTeam, onCreateTeam }) {
  const [state, setState] = useState({ status: 'loading', teams: [], error: null });

  useEffect(() => {
    let active = true;
    fetchSavedTeams(userId)
      .then((teams) => active && setState({ status: 'ready', teams, error: null }))
      .catch((error) => {
        console.warn('Times salvos indisponíveis:', error);
        if (active) setState({ status: 'error', teams: [], error: 'Não foi possível carregar seus times agora.' });
      });
    return () => { active = false; };
  }, [userId]);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteSavedTeam(id);
      setState((current) => ({ ...current, teams: current.teams.filter((team) => team.id !== id), error: null }));
      return true;
    } catch (error) {
      console.warn('Time não excluído:', error);
      setState((current) => ({ ...current, error: 'Não foi possível excluir o time. Tente de novo.' }));
      return false;
    }
  }, []);

  if (state.status === 'loading') {
    return (
      <p className="flex items-center justify-center gap-2 py-10 italic text-umber">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Molhando o pincel...
      </p>
    );
  }

  return (
    <div>
      {state.error && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-sketch border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.teams.length === 0 ? (
        state.status === 'ready' && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <BookOpen className="h-7 w-7 text-umber" aria-hidden="true" />
            <p className="italic text-ink-soft">Você ainda não salvou nenhum time.</p>
            <button type="button" onClick={onCreateTeam} className="btn-action">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar um time
            </button>
          </div>
        )
      ) : (
        <ul className="space-y-2.5">
          {state.teams.map((team) => (
            <SavedTeam key={team.id} team={team} onOpen={onOpenTeam} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default memo(SavedTeamsPanel);
