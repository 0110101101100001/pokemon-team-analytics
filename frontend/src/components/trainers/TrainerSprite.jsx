import { useState } from 'react';
import { thumbnailSpriteUrl } from '../../services/api';
import { trainerSpriteUrl } from '../../utils/trainers';

/**
 * Sprite do treinador no Showdown (80px, tamanho original). Sem sprite (Kommo-o Totem) ou se ele não carregar,
 * mostra o Pokémon ás; sem nenhum dos dois, um ponto de interrogação a tinta.
 */
export default function TrainerSprite({ trainer, entryByName }) {
  const aceEntry = entryByName.get(trainer.battles[0].aceSlug);
  const sources = [trainerSpriteUrl(trainer.slug), aceEntry && thumbnailSpriteUrl(aceEntry.id)].filter(Boolean);
  const [attempt, setAttempt] = useState(0);
  const src = sources[attempt];

  if (!src) return <span aria-hidden="true" className="font-serif text-5xl font-bold text-[#1C1A17]/45">?</span>;
  return (
    <img
      src={src}
      alt=""
      width={80}
      height={80}
      loading="lazy"
      decoding="async"
      onError={() => setAttempt((current) => current + 1)}
      className="h-20 w-20 object-contain [image-rendering:pixelated]"
    />
  );
}
