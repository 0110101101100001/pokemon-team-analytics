import { memo, useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkPlus, Loader2, TriangleAlert, X } from 'lucide-react';
import { useAppActions } from './appActions';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { insertBuild, isBuildLimitError } from '../../services/userBuilds';
import { BUILD_NAME_MAX, defaultBuildName, validateBuild } from '../../utils/builds';

/** Mini-modal com o nome da build. Fica acima da ficha e das configurações (z-[80]). */
function SaveBuildDialog({ build, userId, onClose, notify }) {
  const ids = useId();
  const inputRef = useRef(null);
  const [name, setName] = useState(() => defaultBuildName(build));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const problems = validateBuild(build);
  useModalBehavior(onClose, inputRef);

  const save = async (event) => {
    event.preventDefault();
    const trimmed = name.trim().slice(0, BUILD_NAME_MAX);
    if (!trimmed || problems.length) return;
    setSaving(true);
    setError(null);
    try {
      await insertBuild(userId, trimmed, build);
      notify('Build salva');
      onClose();
    } catch (saveError) {
      console.warn('Build não salva:', saveError);
      setSaving(false);
      if (isBuildLimitError(saveError)) {
        notify('Limite de 200 builds atingido', { tone: 'info' });
        onClose();
      } else {
        setError('Não foi possível salvar agora. Tente de novo.');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-scrim p-4 animate-fade-in motion-reduce:animate-none md:bg-scrim/80"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-titulo`}
        onSubmit={save}
        className="relative w-full max-w-sm paper-card p-5 font-reading shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[3px] text-ink-soft hover:bg-ink/10 hover:text-ink">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <h2 id={`${ids}-titulo`} className="pr-10 font-serif text-xl font-black text-ink">Salvar build</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{build.species}{build.item ? ` @ ${build.item}` : ''}</p>

        <label htmlFor={`${ids}-nome`} className="paper-label mt-4">Nome da build</label>
        <input
          ref={inputRef}
          id={`${ids}-nome`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={BUILD_NAME_MAX}
          required
          className="paper-field"
        />

        {(problems.length > 0 || error) && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-sketch border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error ?? problems.join(' ')}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
          <button type="submit" disabled={saving || problems.length > 0 || !name.trim()} className="btn-action">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Salvar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/**
 * "Salvar build" onde há um set montado (calculadora, Team Builder, builds da ficha).
 * `getBuild()` monta a build só no clique. Sem conta, o clique abre o login e nada do que está na tela se perde.
 */
function SaveBuildButton({ getBuild, disabled = false, className = '' }) {
  const { session, openLogin, notify } = useAppActions();
  const [build, setBuild] = useState(null);
  const close = useCallback(() => setBuild(null), []);

  const open = () => {
    if (!session) {
      openLogin();
      return;
    }
    const next = getBuild();
    if (next) setBuild(next);
  };

  return (
    <>
      <button type="button" onClick={open} disabled={disabled} className={`btn-outline !min-h-9 !px-3 !py-1 text-sm ${className}`}>
        <BookmarkPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
        Salvar build
      </button>
      {build && session && <SaveBuildDialog build={build} userId={session.user.id} onClose={close} notify={notify} />}
    </>
  );
}

export default memo(SaveBuildButton);
