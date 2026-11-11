import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HISTORY_LIMIT, addFavorite, clearHistory as clearRemoteHistory, fetchFavorites, fetchHistory,
  recordView as recordRemoteView, removeFavorite,
} from '../services/userData';

const EMPTY = [];

/**
 * Favoritos e histórico do usuário logado.
 * `status`: 'signed-out' | 'loading' | 'ready' | 'error' (falha ao carregar).
 * `error`: mensagem da última ação que falhou (favoritar, limpar), ou null.
 * As ações atualizam a tela na hora e desfazem a mudança se o Supabase recusar.
 */
export function useUserCollections(session) {
  const userId = session?.user?.id ?? null;
  const [favorites, setFavorites] = useState(EMPTY);
  const [history, setHistory] = useState(EMPTY);
  const [status, setStatus] = useState(userId ? 'loading' : 'signed-out');
  const [error, setError] = useState(null);

  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  useEffect(() => {
    setFavorites(EMPTY);
    setHistory(EMPTY);
    setError(null);
    if (!userId) {
      setStatus('signed-out');
      return undefined;
    }

    let active = true;
    setStatus('loading');
    Promise.all([fetchFavorites(userId), fetchHistory(userId)])
      .then(([favoriteNames, visits]) => {
        if (!active) return;
        setFavorites(favoriteNames);
        setHistory(visits);
        setStatus('ready');
      })
      .catch((loadError) => {
        console.warn('Favoritos e histórico indisponíveis:', loadError);
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [userId]);

  const toggleFavorite = useCallback(async (name) => {
    if (!userId) return;
    const wasFavorite = favoritesRef.current.includes(name);
    const without = (list) => list.filter((item) => item !== name);
    setError(null);
    setFavorites((current) => (wasFavorite ? without(current) : [name, ...without(current)]));
    try {
      await (wasFavorite ? removeFavorite : addFavorite)(userId, name);
    } catch (actionError) {
      console.warn('Falha ao atualizar favorito:', actionError);
      setFavorites((current) => (wasFavorite ? [name, ...without(current)] : without(current)));
      setError('Não foi possível atualizar o favorito. Tente de novo.');
    }
  }, [userId]);

  // Silencioso: uma falha ao registrar a visita não interrompe a abertura da ficha.
  const recordView = useCallback((name) => {
    if (!userId) return;
    setHistory((current) => [
      { name, viewedAt: new Date().toISOString() },
      ...current.filter((visit) => visit.name !== name),
    ].slice(0, HISTORY_LIMIT));
    recordRemoteView(userId, name).catch((viewError) => console.warn('Visita não registrada:', viewError));
  }, [userId]);

  const clearHistory = useCallback(async () => {
    if (!userId) return;
    const previous = history;
    setError(null);
    setHistory(EMPTY);
    try {
      await clearRemoteHistory(userId);
    } catch (actionError) {
      console.warn('Falha ao limpar o histórico:', actionError);
      setHistory(previous);
      setError('Não foi possível limpar o histórico. Tente de novo.');
    }
  }, [userId, history]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  return { status, error, favorites, favoriteSet, history, toggleFavorite, recordView, clearHistory };
}
