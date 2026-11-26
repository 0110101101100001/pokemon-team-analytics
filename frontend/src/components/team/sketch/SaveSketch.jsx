import { memo, useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2, Save, X } from 'lucide-react';
import { SAVED_TEAM_NAME_MAX, describeSavedTeamError } from '../../../utils/savedTeams';
import { TOOL_BUTTON_CLASS } from './shared';

const toolButton = TOOL_BUTTON_CLASS;

/**
 * "Salvar" de um esboço: abre um campo com o nome sugerido e salva o time na conta (Meus times), sem trocar o time
 * do builder. Sem conta, o botão fica desativado e diz por quê. `onSave(name)` rejeita com o erro do banco.
 */
function SaveSketch({ defaultName, canSave, disabled, onSave }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [status, setStatus] = useState({ state: 'idle' });
  const inputRef = useRef(null);
  const inputId = useId();

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  // Um time salvo: o aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (status.state !== 'saved') return undefined;
    const timer = setTimeout(() => setStatus({ state: 'idle' }), 4000);
    return () => clearTimeout(timer);
  }, [status.state]);

  const start = () => {
    setName(defaultName);
    setStatus({ state: 'idle' });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStatus({ state: 'saving' });
    try {
      await onSave(trimmed);
      setStatus({ state: 'saved', name: trimmed });
      setOpen(false);
    } catch (error) {
      setStatus({ state: 'error', message: describeSavedTeamError(error) });
    }
  };

  if (!open) {
    return (
      <>
        {status.state === 'saved' && (
          <span role="status" className="inline-flex items-center gap-1 font-reading text-xs text-olive-deep">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Salvo em Meus times
          </span>
        )}
        <button
          type="button"
          onClick={start}
          disabled={disabled || !canSave}
          title={canSave ? 'Salvar este esboço em Meus times, sem trocar o time atual' : 'Entre na conta para salvar times'}
          className={toolButton}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Salvar
        </button>
      </>
    );
  }

  const saving = status.state === 'saving';
  return (
    <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
      <label htmlFor={inputId} className="sr-only">Nome do time salvo</label>
      <input
        ref={inputRef}
        id={inputId}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        maxLength={SAVED_TEAM_NAME_MAX}
        disabled={saving}
        className="paper-field !h-9 min-w-0 flex-1 !py-1 font-reading text-sm sm:w-56 sm:flex-none"
      />
      <button type="submit" disabled={saving || !name.trim()} className={toolButton}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
      <button type="button" onClick={() => setOpen(false)} disabled={saving} aria-label="Cancelar" className={toolButton}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {status.state === 'error' && (
        <p role="alert" className="w-full font-reading text-xs text-vermilion-deep">{status.message}</p>
      )}
    </form>
  );
}

export default memo(SaveSketch);
