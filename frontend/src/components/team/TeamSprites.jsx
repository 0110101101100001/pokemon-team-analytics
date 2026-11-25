import { memo } from 'react';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

/** Os sprites de um time salvo (`pokemons` de teams), sobrepostos como fichas. */
function TeamSprites({ pokemons }) {
  return (
    <ul className="flex -space-x-1.5">
      {pokemons.map((pokemon) => (
        <li
          key={pokemon.id}
          title={formatSlug(pokemon.name)}
          className="h-9 w-9 rounded-full border border-umber/25 bg-paper shadow-sm"
        >
          <img src={thumbnailSpriteUrl(pokemon.id)} alt={formatSlug(pokemon.name)} width={36} height={36} loading="lazy" decoding="async" className="h-full w-full object-contain" />
        </li>
      ))}
    </ul>
  );
}

export default memo(TeamSprites);
