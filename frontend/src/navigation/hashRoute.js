// Endereço no hash: `#/<seção>/<detalhe…>?pokemon=<nome>`. O caminho diz a seção e o que está aberto nela
// (`#/treinadores/giovanni`); a ficha do Pokémon vai como parâmetro porque abre por cima de qualquer seção.

/** `#/treinadores/giovanni?pokemon=gyarados` → { segments: ['treinadores', 'giovanni'], params }. */
export function parseHash(hash) {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const segments = path.split('/').filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  return { segments, params: new URLSearchParams(query) };
}

export function formatHash(segments, params = new URLSearchParams()) {
  const query = params.toString();
  return `#/${segments.map(encodeURIComponent).join('/')}${query ? `?${query}` : ''}`;
}

/**
 * Troca o endereço. `replace` não cria entrada no histórico; como `replaceState` não dispara `hashchange`,
 * o evento é emitido à mão para quem acompanha o hash.
 */
export function navigateHash(hash, { replace = false } = {}) {
  if (hash === window.location.hash) return;
  if (!replace) {
    window.location.hash = hash;
    return;
  }
  window.history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
