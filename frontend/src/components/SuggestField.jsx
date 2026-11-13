import { memo, useCallback, useId, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatSlug } from '../utils/filters';

const labelOf = (slug) => (slug ? formatSlug(slug) : '');
const normalize = (text) => text.trim().toLowerCase();

/**
 * Campo de texto com sugestões para escolher um slug de uma lista longa (golpes, itens).
 * As opções vêm prontas em `options` ou são buscadas no primeiro foco com `loadOptions`.
 * `onPick` recebe o slug escolhido, ou null quando o campo é esvaziado.
 */
function SuggestField({ label, placeholder, value, options, loadOptions, onPick, disabled = false }) {
  const listId = useId();
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(labelOf(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // O valor confirmado mudou por fora (outro Pokémon selecionado, golpe resolvido): o texto acompanha.
  if (syncedValue !== value) {
    setSyncedValue(value);
    setText(labelOf(value));
  }

  const available = options ?? loaded;
  const slugByLabel = useMemo(
    () => new Map((available ?? []).map((slug) => [formatSlug(slug).toLowerCase(), slug])),
    [available],
  );

  const handleFocus = useCallback(() => {
    if (!loadOptions || loaded || loading) return;
    setLoading(true);
    loadOptions().then(setLoaded).catch(() => setLoaded([])).finally(() => setLoading(false));
  }, [loadOptions, loaded, loading]);

  const handleChange = useCallback((e) => {
    const next = e.target.value;
    setText(next);
    const slug = slugByLabel.get(normalize(next));
    if (slug && slug !== value) onPick(slug);
  }, [slugByLabel, value, onPick]);

  const handleBlur = useCallback(() => {
    if (!normalize(text)) {
      if (value) onPick(null);
    } else if (!slugByLabel.has(normalize(text))) {
      setText(labelOf(value));
    }
  }, [text, value, slugByLabel, onPick]);

  return (
    <div className="relative">
      <input
        type="text"
        list={listId}
        value={text}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={label}
        aria-busy={loading}
        autoComplete="off"
        disabled={disabled}
        className="paper-field text-ellipsis pr-8 [&::-webkit-calendar-picker-indicator]:!hidden"
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#78614E]/70" aria-label="carregando sugestões" />
      )}
      <datalist id={listId}>
        {available?.map((slug) => <option key={slug} value={formatSlug(slug)} />)}
      </datalist>
    </div>
  );
}

export default memo(SuggestField);
