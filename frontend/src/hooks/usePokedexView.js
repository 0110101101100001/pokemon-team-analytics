import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatHash, navigateHash, parseHash } from '../navigation/hashRoute';
import {
  normalizeViewState, paramsWithViewState, readStoredViewState, sortNeedsStats, viewStateFromParams, writeStoredViewState,
} from '../utils/pokedexView';
import { fetchStaticJson } from '../services/staticData';
import { browserStorage } from '../utils/browserStorage';


/**
 * Ordenação e modo (Grade/Lista) da Pokédex. Valem para todas as coleções (Todos, Favoritos, Histórico) e ficam:
 * - no navegador (localStorage 'smearglepedia-pokedex-view'): a escolha volta na próxima visita;
 * - na URL da Pokédex (?sort=speed&view=list), para o link abrir igual. Padrões não aparecem na URL.
 * A tabela user_settings não tem colunas para isso, então a escolha não vai para a conta.
 * `route` é o hash já separado (useHashRoute); `active` diz se a Pokédex está aberta.
 */
export function usePokedexView(route, active) {
  const [state, setState] = useState(() => ({
    ...readStoredViewState(browserStorage()),
    ...viewStateFromParams(route.params),
  }));

  // O que a URL da Pokédex traz manda (link compartilhado, voltar no histórico); parâmetro inválido vira o padrão.
  const fromUrl = viewStateFromParams(route.params);
  const urlSort = fromUrl.sort;
  const urlView = fromUrl.view;
  useEffect(() => {
    if (!active) return;
    setState((current) => {
      const next = normalizeViewState({ sort: urlSort ?? current.sort, view: urlView ?? current.view });
      return next.sort === current.sort && next.view === current.view ? current : next;
    });
  }, [active, urlSort, urlView]);

  useEffect(() => writeStoredViewState(browserStorage(), state), [state]);

  // Ao entrar na Pokédex sem os parâmetros (pelo menu, por exemplo), a escolha guardada entra na URL, para o link
  // copiado abrir igual. Só ao entrar, e só completando o que falta: uma troca de hash com a Pokédex aberta (link
  // colado, voltar) chega antes do setState acima, e reescrever a URL ali traria de volta a escolha antiga.
  const wasActive = useRef(false);
  useEffect(() => {
    const entering = active && !wasActive.current;
    wasActive.current = active;
    if (!entering) return;
    const merged = { ...state, ...viewStateFromParams(route.params) };
    const params = paramsWithViewState(route.params, merged);
    if (params.toString() !== route.params.toString()) navigateHash(formatHash(route.segments, params), { replace: true });
  }, [state, active, route]);

  // Escolha da pessoa: vale na hora e vai para a URL atual (sem criar entrada no histórico).
  const choose = useCallback((patch) => {
    setState((current) => {
      const next = normalizeViewState({ ...current, ...patch });
      if (active) {
        const { segments, params } = parseHash(window.location.hash);
        const nextParams = paramsWithViewState(params, next);
        if (nextParams.toString() !== params.toString()) {
          // Fora do render: o setState não pode navegar no meio da atualização.
          queueMicrotask(() => navigateHash(formatHash(segments, nextParams), { replace: true }));
        }
      }
      return next;
    });
  }, [active]);

  const setSort = useCallback((sort) => choose({ sort }), [choose]);
  const setView = useCallback((view) => choose({ view }), [choose]);

  return useMemo(() => ({ ...state, setSort, setView }), [state, setSort, setView]);
}

/**
 * Atributos base de todas as entradas ({ id: [6 números] }), baixados uma vez (public/data/base-stats.json, ~12 KB
 * com gzip) e só quando alguém precisa: ordenação por atributo ou a visualização em Lista. null até chegar.
 */
export function useBaseStats(needed) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!needed || stats) return undefined;
    let active = true;
    fetchStaticJson('base-stats.json')
      .then((data) => active && data && setStats(data))
      .catch((error) => console.warn('Atributos base indisponíveis:', error));
    return () => { active = false; };
  }, [needed, stats]);
  return stats;
}

export const viewNeedsStats = ({ sort, view }) => sortNeedsStats(sort) || view === 'list';
