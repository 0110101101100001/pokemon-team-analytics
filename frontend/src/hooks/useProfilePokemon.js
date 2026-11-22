import { useCallback, useEffect, useRef, useState } from 'react';
import { createProfile, fetchProfilePokemon, saveProfilePokemon } from '../services/userProfile';
import { DEFAULT_PROFILE_POKEMON, isProfilePokemonId } from '../utils/profilePokemon';

// Chaves de versões anteriores, quando o visitante também escolhia o ícone neste navegador.
const OLD_KEYS = ['smearglepedia:avatar', 'smearglepedia:profile-pokemon'];
const SAVE_DELAY_MS = 400;

function forgetOldChoices() {
  try {
    OLD_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Sem armazenamento, não há o que limpar.
  }
}

/**
 * O Pokémon do perfil. Só a conta escolhe: o visitante fica sempre com o padrão. A escolha vive na linha da conta
 * em user_profiles, criada com o padrão na primeira visita. A escolha aparece na hora; a gravação espera 400ms de calma (cliques seguidos viram
 * uma gravação só), as gravações saem uma de cada vez e, se a última falhar, o avatar volta ao último valor salvo.
 * Devolve [id, escolher]; o id é null enquanto a conta carrega, para não mostrar o Pokémon de outra pessoa.
 */
export function useProfilePokemon(userId, onSaveError) {
  const [account, setAccount] = useState(null); // { userId, id }: o que a tela mostra para a conta
  const saved = useRef(null); // { userId, id }: o último valor confirmado pelo banco
  const timer = useRef(0);
  const queue = useRef(Promise.resolve());
  const ticket = useRef(0);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  useEffect(() => {
    // Trocar de conta (ou sair) descarta a gravação que ainda esperava o debounce e as respostas atrasadas.
    clearTimeout(timer.current);
    ticket.current += 1;
    saved.current = null;
    setAccount(null);
    if (!userId) return undefined;

    let active = true;
    const settle = (id) => {
      if (!active) return;
      saved.current ??= { userId, id };
      // Uma escolha feita antes da resposta vence o valor lido.
      setAccount((current) => (current?.userId === userId ? current : { userId, id }));
    };

    fetchProfilePokemon(userId)
      .then((id) => {
        if (isProfilePokemonId(id)) return settle(id);
        settle(DEFAULT_PROFILE_POKEMON);
        if (id === null) createProfile(userId, DEFAULT_PROFILE_POKEMON).catch((error) => console.warn('Perfil não criado:', error));
        return undefined;
      })
      .catch((error) => {
        console.warn('Perfil indisponível, usando o padrão:', error);
        settle(DEFAULT_PROFILE_POKEMON);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    forgetOldChoices();
    return () => clearTimeout(timer.current);
  }, []);

  const choose = useCallback((id) => {
    if (!userId || !isProfilePokemonId(id)) return;

    setAccount({ userId, id });
    clearTimeout(timer.current);
    const mine = ++ticket.current;
    timer.current = setTimeout(() => {
      queue.current = queue.current.then(() => saveProfilePokemon(userId, id).then(
        () => {
          if (currentUser.current === userId) saved.current = { userId, id };
        },
        (error) => {
          console.warn('Avatar não salvo:', error);
          // Só a última escolha reverte; se houver outra a caminho, ela decide.
          if (mine !== ticket.current) return;
          const previous = saved.current?.userId === userId ? saved.current.id : DEFAULT_PROFILE_POKEMON;
          setAccount((current) => (current?.userId === userId ? { userId, id: previous } : current));
          onSaveErrorRef.current?.('Não foi possível salvar seu ícone. Voltamos ao anterior.');
        },
      ));
    }, SAVE_DELAY_MS);
  }, [userId]);

  const id = userId ? (account?.userId === userId ? account.id : null) : DEFAULT_PROFILE_POKEMON;
  return [id, choose];
}
