import { memo, useMemo } from 'react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../../services/api';
import { TYPE_NAMES, effectiveness } from '../../utils/typeChart';
import { formatSlug } from '../../utils/filters';
import { capitalize } from '../../utils/typeColors';

const TIERS = {
  super: { label: '2×', className: 'border-smeargle-olive/50 bg-smeargle-olive/15', badge: 'bg-smeargle-olive text-[#FFFEFB]' },
  neutral: { label: '1×', className: 'border-[#78614E]/15 bg-[#FFFEFB]/70', badge: 'bg-[#78614E]/15 text-[#78614E]' },
  resisted: { label: '½', className: 'border-[#B5543C]/35 bg-[#B5543C]/10', badge: 'bg-[#B5543C]/80 text-[#FFFEFB]' },
  immune: { label: '0', className: 'border-[#2A2421]/35 bg-[#2A2421]/10', badge: 'bg-[#2A2421]/80 text-[#FFFEFB]' },
};

const tierOf = (best) => {
  if (best > 1) return TIERS.super;
  if (best === 1) return TIERS.neutral;
  return best === 0 ? TIERS.immune : TIERS.resisted;
};

const isAttack = (move) => Boolean(move && move.damageClass !== 'status');

/** Para cada tipo defensor: o melhor multiplicador entre os golpes do time e quem acerta super efetivo. */
function buildCoverage(team) {
  const attacks = team.flatMap((member) => member.set.moves.filter(isAttack).map((move) => ({ member, move })));
  const rows = TYPE_NAMES.map((type) => {
    let best = 0;
    const hitters = new Map();
    for (const { member, move } of attacks) {
      const multiplier = effectiveness(move.type, [type]);
      best = Math.max(best, multiplier);
      if (multiplier > 1) hitters.set(member.id, [...(hitters.get(member.id) ?? []), move.slug]);
    }
    return { type, best, hitters: team.filter((member) => hitters.has(member.id)).map((member) => ({ member, moves: hitters.get(member.id) })) };
  });
  return { attackCount: attacks.length, rows };
}

/** Cobertura ofensiva real do time: considera os golpes de ataque escolhidos, não os tipos dos Pokémon. */
function MoveCoverage({ team }) {
  const { attackCount, rows } = useMemo(() => buildCoverage(team), [team]);

  if (attackCount === 0) {
    return (
      <p className="py-8 text-center font-serif text-sm italic text-smeargle-textDim/70">
        Escolha golpes de ataque nos Pokémon do time para ver quais tipos eles acertam com dano super efetivo.
      </p>
    );
  }

  const covered = rows.filter((row) => row.best > 1);
  const walls = rows.filter((row) => row.best < 1);

  return (
    <div>
      <p className="mb-3 font-serif text-sm text-smeargle-text">
        <span className="ink-splotch font-black tabular-nums">{covered.length}</span>
        <span className="ml-2">de {TYPE_NAMES.length} tipos levam dano super efetivo de {attackCount} golpe{attackCount !== 1 ? 's' : ''}.</span>
      </p>

      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {rows.map(({ type, best, hitters }) => {
          const tier = tierOf(best);
          return (
            <li key={type} className={`flex min-h-[3.25rem] flex-col justify-center gap-1 rounded-xl border px-2 py-1.5 ${tier.className}`}>
              <div className="flex items-center justify-between gap-1">
                <PokemonTypeBadge type={type} className="!px-1.5 !text-[9px]" />
                <span className={`inline-flex h-5 min-w-6 items-center justify-center rounded-md px-1 font-mono text-xs font-bold ${tier.badge}`}>{tier.label}</span>
              </div>
              {hitters.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {hitters.map(({ member, moves }) => (
                    <img
                      key={member.id}
                      src={thumbnailSpriteUrl(member.id)}
                      alt={`${formatSlug(member.name)}: ${moves.map(formatSlug).join(', ')}`}
                      title={`${formatSlug(member.name)}: ${moves.map(formatSlug).join(', ')}`}
                      width={24}
                      height={24}
                      loading="lazy"
                      decoding="async"
                      className="h-6 w-6 object-contain"
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {walls.length > 0 && (
        <p className="mt-3 font-hand text-lg leading-tight text-[#8A3B27]">
          nenhum golpe passa de resistido contra: {walls.map((row) => capitalize(row.type)).join(', ')}
        </p>
      )}
      <p className="mt-2 font-serif text-[11px] italic text-smeargle-textDim/70">
        Cada célula mostra o melhor resultado dos golpes do time contra um Pokémon só daquele tipo, e quem o alcança com dano super efetivo.
      </p>
    </div>
  );
}

export default memo(MoveCoverage);
