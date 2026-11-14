import { useEffect, useState } from 'react';
import { fetchSavedTeams } from '../services/userData';

/**
 * Times salvos do usuário logado, do mais recente para o mais antigo. Busca uma vez por montagem: quem salva um time
 * no Team Builder e abre outra aba já encontra a lista nova, porque as seções remontam ao trocar de aba.
 */
export function useSavedTeams(session) {
  const userId = session?.user?.id ?? null;
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!userId) {
      setTeams([]);
      return undefined;
    }
    let active = true;
    fetchSavedTeams(userId)
      .then((data) => active && setTeams(data))
      .catch((err) => {
        console.warn('Times salvos indisponíveis:', err);
        if (active) setTeams([]);
      });
    return () => { active = false; };
  }, [userId]);

  return teams;
}
