import { useCallback, useEffect, useRef, useState } from 'react';
import { createProfile, fetchProfile, saveProfile } from '../services/userProfile';
import {
  DEFAULT_PROFILE_ICON_STYLE, DEFAULT_PROFILE_POKEMON, isProfileIconStyle, isProfilePokemonId,
} from '../utils/profilePokemon';
import { removeStored } from '../utils/browserStorage';

// Chaves de versões anteriores, quando o visitante também escolhia o ícone neste navegador.
const OLD_KEYS = ['smearglepedia:avatar', 'smearglepedia:profile-pokemon'];
const SAVE_DELAY_MS = 400;

function forgetOldChoices() {
  OLD_KEYS.forEach(removeStored);
}

/**
 * O Pokémon do perfil. Só a conta escolhe: o visitante fica sempre com o padrão. A escolha vive na linha da conta
 * em user_profiles, criada com o padrão na primeira visita. A escolha aparece na hora; a gravação espera 400ms de calma (cliques seguidos viram
 * uma gravação só), as gravações saem uma de cada vez e, se a última falhar, o avatar volta ao último valor salvo.
 * O estilo do ícone (arte oficial ou sprite 2D) vive na mesma linha e segue o mesmo caminho.
 * Devolve [id, escolher, status, estilo, escolherEstilo]; o id é null enquanto a conta carrega, para não mostrar o
 * Pokémon de outra pessoa. `status` acompanha a última escolha: 'idle', 'saving', 'saved' ou 'error'.
 */
export function useProfilePokemon(userId, onSaveError) {
  const [account, setAccount] = useState(null); // { userId, id, style }: o que a tela mostra para a conta
  const [status, setStatus] = useState('idle');
  const saved = useRef(null); // { userId, id, style }: o último valor confirmado pelo banco
  // A última escolha (ou o valor lido), atualizada na hora: duas escolhas seguidas somam, sem esperar o render.
  const latest = useRef(null);
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
    latest.current = null;
    setAccount(null);
    setStatus('idle');
    if (!userId) return undefined;

    let active = true;
    const settle = (id, style) => {
      if (!active) return;
      saved.current ??= { userId, id, style };
      // Uma escolha feita antes da resposta vence o valor lido.
      if (latest.current?.userId === userId) return;
      latest.current = { userId, id, style };
      setAccount(latest.current);
    };

    fetchProfile(userId)
      .then((profile) => {
        const style = isProfileIconStyle(profile?.iconStyle) ? profile.iconStyle : DEFAULT_PROFILE_ICON_STYLE;
        if (isProfilePokemonId(profile?.pokemonId)) return settle(profile.pokemonId, style);
        settle(DEFAULT_PROFILE_POKEMON, style);
        if (profile === null) createProfile(userId, DEFAULT_PROFILE_POKEMON).catch((error) => console.warn('Perfil não criado:', error));
        return undefined;
      })
      .catch((error) => {
        console.warn('Perfil indisponível, usando o padrão:', error);
        settle(DEFAULT_PROFILE_POKEMON, DEFAULT_PROFILE_ICON_STYLE);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    forgetOldChoices();
    return () => clearTimeout(timer.current);
  }, []);

  // Grava o perfil inteiro (Pokémon e estilo) depois de 400ms de calma; a falha da última escolha volta ao salvo.
  const commit = useCallback((patch) => {
    if (!userId) return;
    // Só o estilo, antes de o perfil chegar, gravaria o Pokémon padrão por cima do salvo: espera a leitura.
    if (latest.current?.userId !== userId && !('id' in patch)) return;
    const base = latest.current?.userId === userId
      ? latest.current
      : { userId, id: DEFAULT_PROFILE_POKEMON, style: DEFAULT_PROFILE_ICON_STYLE };
    const next = { ...base, ...patch };
    latest.current = next;
    setAccount(next);
    setStatus('saving');
    clearTimeout(timer.current);
    const mine = ++ticket.current;
    timer.current = setTimeout(() => {
      const value = next;
      queue.current = queue.current.then(() => saveProfile(userId, { pokemonId: value.id, iconStyle: value.style }).then(
        () => {
          if (currentUser.current !== userId) return;
          saved.current = value;
          if (mine === ticket.current) setStatus('saved');
        },
        (error) => {
          console.warn('Avatar não salvo:', error);
          // Só a última escolha reverte; se houver outra a caminho, ela decide.
          if (mine !== ticket.current) return;
          const previous = saved.current?.userId === userId
            ? saved.current
            : { userId, id: DEFAULT_PROFILE_POKEMON, style: DEFAULT_PROFILE_ICON_STYLE };
          latest.current = previous;
          setAccount((current) => (current?.userId === userId ? previous : current));
          setStatus('error');
          onSaveErrorRef.current?.('Não foi possível salvar seu ícone. Voltamos ao anterior.');
        },
      ));
    }, SAVE_DELAY_MS);
  }, [userId]);

  const choose = useCallback((id) => {
    if (isProfilePokemonId(id)) commit({ id });
  }, [commit]);
  const chooseStyle = useCallback((style) => {
    if (isProfileIconStyle(style)) commit({ style });
  }, [commit]);

  const mineNow = userId && account?.userId === userId ? account : null;
  const id = userId ? mineNow?.id ?? null : DEFAULT_PROFILE_POKEMON;
  const style = mineNow?.style ?? DEFAULT_PROFILE_ICON_STYLE;
  return [id, choose, status, style, chooseStyle];
}
