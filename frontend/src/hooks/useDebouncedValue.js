import { useEffect, useState } from 'react';

/** Devolve `value` só depois de ele ficar `delay` ms sem mudar. Com `delay` 0, propaga no próximo tick. */
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
