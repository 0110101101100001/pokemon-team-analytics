import { memo } from 'react';
import ProfilePhoto from './ProfilePhoto';

const GUEST_DETAIL = 'Entre para salvar';

/**
 * Cartão da conta no header: avatar (abre o painel de sprites), o nome e o botão de entrar ou sair (`action`).
 * Logado, só o nome; visitante, "Visitante" e o convite para entrar, com o Pokémon padrão levemente cinza: só quem
 * entra escolhe o ícone, e o clique no avatar abre o login. Abaixo de 640px, só avatar e botão.
 */
function ProfileAvatar({ id, account, signedIn, compact, onOpen, action }) {
  const { name, initial } = account;
  const detail = signedIn ? null : GUEST_DETAIL;
  return (
    <div className="account-card" data-guest={signedIn ? undefined : ''} data-compact={compact ? '' : undefined}>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={signedIn ? 'Trocar ícone' : 'Entre para trocar o ícone'}
        title={signedIn ? 'Trocar ícone' : 'Entre para trocar o ícone'}
        className="profile-avatar account-avatar"
      >
        <ProfilePhoto id={id} initial={initial} />
      </button>
      <span aria-hidden="true" className="account-divider" />
      <span className="account-text">
        <span className="account-name" title={name}>{name}</span>
        {detail && <span className="account-detail" title={detail}>{detail}</span>}
      </span>
      {action}
    </div>
  );
}

export default memo(ProfileAvatar);
