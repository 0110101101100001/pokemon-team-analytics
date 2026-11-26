import { memo, useState } from 'react';
import { officialSpriteUrl, thumbnailSpriteUrl } from '../../services/api';

const OFFICIAL = { url: officialSpriteUrl, className: '' };
const PIXEL = { url: thumbnailSpriteUrl, className: 'profile-photo-pixel' };
// Ordem de tentativa por estilo: o escolhido primeiro e o outro se a imagem falhar.
const SOURCES = { official: [OFFICIAL, PIXEL], '2d': [PIXEL, OFFICIAL] };

function Photo({ id, initial, iconStyle }) {
  const [attempt, setAttempt] = useState(0);
  const source = (SOURCES[iconStyle] ?? SOURCES.official)[attempt];
  if (!source) return <span aria-hidden="true" className="profile-initial">{initial}</span>;

  return (
    <img
      key={attempt}
      src={source.url(id)}
      alt=""
      decoding="async"
      draggable={false}
      onError={() => setAttempt(attempt + 1)}
      className={`profile-photo ${source.className}`}
    />
  );
}

/**
 * A foto do perfil no estilo da conta (`iconStyle`: 'official' ou '2d'); se a imagem falhar, a do outro estilo; se as
 * duas falharem, a inicial da conta.
 */
function ProfilePhoto({ id, initial, iconStyle = 'official' }) {
  // Sem id (a conta ainda carrega), só a inicial. A key zera as tentativas ao trocar de Pokémon ou de estilo.
  if (id == null) return <span aria-hidden="true" className="profile-initial">{initial}</span>;
  return <Photo key={`${id}-${iconStyle}`} id={id} initial={initial} iconStyle={iconStyle} />;
}

export default memo(ProfilePhoto);
