import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, Loader2 } from 'lucide-react';
import { resolveSmogonName } from '../../utils/smogon';
import { loadAllSets } from '../../utils/smogonSets';
import { teamToShowdown } from '../../utils/showdownExport';

const FEEDBACK_MS = 2000;
const LABELS = { idle: 'Copiar para o Showdown', working: 'Copiando...', done: 'Copiado!', error: 'Não foi possível copiar' };

// Nome da espécie como a Smogon (e o Showdown) o escrevem, a partir das chaves de gen9.json.
async function smogonNameResolver() {
  try {
    const names = Object.keys(await loadAllSets());
    return (member) => resolveSmogonName(member, names) ?? undefined;
  } catch {
    return () => undefined;
  }
}

/**
 * Copia o time no formato de importação do Showdown. `getTeam` devolve (ou promete) [{ name, species, isForm, set }]:
 * o esboço monta os sets só no clique.
 */
function CopyShowdownButton({ getTeam, disabled = false, className = 'btn-outline !min-h-9 font-serif' }) {
  const [state, setState] = useState('idle');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    setState('working');
    try {
      const [team, nameOf] = await Promise.all([getTeam(), smogonNameResolver()]);
      await navigator.clipboard.writeText(teamToShowdown(team, nameOf));
      setState('done');
    } catch {
      setState('error');
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), FEEDBACK_MS);
  }, [getTeam]);

  const Icon = state === 'working' ? Loader2 : state === 'done' ? Check : ClipboardCopy;
  return (
    <button type="button" onClick={copy} disabled={disabled || state === 'working'} className={className}>
      <Icon className={`h-4 w-4 ${state === 'working' ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span aria-live="polite">{LABELS[state]}</span>
    </button>
  );
}

export default memo(CopyShowdownButton);
