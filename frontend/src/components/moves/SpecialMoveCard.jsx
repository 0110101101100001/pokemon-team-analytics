import { memo } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';

const LABEL = 'block text-[10px] font-semibold uppercase text-umber';

/**
 * Card de um golpe especial (Z, Max ou G-Max): nome, tipo, os dados em `facts` ([rótulo, valor]), efeito e,
 * quando houver, os Pokémon que o usam (`users`: entradas da Pokédex), que abrem a ficha ao toque.
 */
function SpecialMoveCard({ name, type, badge, facts = [], effect, users = [], onSelectPokemon }) {
  const shownFacts = facts.filter(([, value]) => value != null && value !== '');
  return (
    <article className="flex flex-col gap-2.5 rounded-[4px] border border-ink/12 bg-paper p-3.5">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="font-serif text-base font-black tracking-tight text-ink">{name}</h4>
        <PokemonTypeBadge type={type} />
        {badge && <span className="type-stamp font-bold text-vermilion">{badge}</span>}
      </header>

      {effect && <p className="font-reading text-sm text-ink">{effect}</p>}

      {shownFacts.length > 0 && (
        <dl className="grid grid-cols-2 gap-1.5">
          {shownFacts.map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-[4px] border border-ink/10 bg-paper/80 px-2 py-1.5">
              <dt className={LABEL}>{label}</dt>
              <dd className="truncate text-xs font-bold text-ink" title={String(value)}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {users.length > 0 && onSelectPokemon && (
        <ul className="mt-auto flex flex-wrap gap-1" aria-label={`Quem usa ${name}`}>
          {users.map((entry) => (
            <li key={entry.name}>
              <button
                type="button"
                onClick={() => onSelectPokemon(entry.name)}
                title={formatSlug(entry.name)}
                aria-label={`Abrir a ficha de ${formatSlug(entry.name)}`}
                className="cursor-pointer rounded-[3px] border border-umber/25 bg-paper transition-colors hover:border-umber/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
              >
                <img src={thumbnailSpriteUrl(entry.id)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 object-contain [image-rendering:pixelated]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default memo(SpecialMoveCard);
