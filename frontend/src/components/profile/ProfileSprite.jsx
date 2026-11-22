import { memo, useState } from 'react';
import { thumbnailSpriteUrl } from '../../services/api';

/** Sprite de 96px da PokéAPI; `fallback` ocupa o lugar dele se a imagem falhar. */
function ProfileSprite({ id, fallback, className = '' }) {
  // O id que falhou, e não um booleano: ao trocar de Pokémon a imagem nova é tentada de novo.
  const [failedId, setFailedId] = useState(null);
  if (failedId === id) return fallback;

  return (
    <img
      key={id}
      src={thumbnailSpriteUrl(id)}
      alt=""
      width={96}
      height={96}
      decoding="async"
      onError={() => setFailedId(id)}
      className={`max-w-none shrink-0 [image-rendering:pixelated] ${className}`}
    />
  );
}

export default memo(ProfileSprite);
