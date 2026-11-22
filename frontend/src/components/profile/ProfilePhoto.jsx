import { memo, useState } from 'react';
import { officialSpriteUrl, thumbnailSpriteUrl } from '../../services/api';

const SOURCES = [
  { url: officialSpriteUrl, className: '' },
  { url: thumbnailSpriteUrl, className: 'profile-photo-pixel' },
];

function Photo({ id, initial }) {
  const [attempt, setAttempt] = useState(0);
  const source = SOURCES[attempt];
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

/** A foto do perfil: arte oficial; se falhar, o pixel art; se os dois falharem, a inicial da conta. */
function ProfilePhoto({ id, initial }) {
  // Sem id (a conta ainda carrega), só a inicial. A key zera as tentativas ao trocar de Pokémon.
  if (id == null) return <span aria-hidden="true" className="profile-initial">{initial}</span>;
  return <Photo key={id} id={id} initial={initial} />;
}

export default memo(ProfilePhoto);
