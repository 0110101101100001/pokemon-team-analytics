import { memo, useMemo } from 'react';
import PokemonTypeBadge from './PokemonTypeBadge';
import { thumbnailSpriteUrl } from '../services/api';
import { TYPE_NAMES, effectiveness } from '../data/typeChart';
import { formatSlug } from '../utils/filters';

// Fraqueza em vermelho (--danger) e resistência em verde (--good), iguais em todos os temas.
const MULTIPLIER_STYLE = {
  0: { label: '0', className: 'bg-ink/80 text-paper font-bold' },
  0.25: { label: '¼', className: 'bg-good/30 text-good font-bold' },
  0.5: { label: '½', className: 'bg-good/15 text-good font-semibold' },
  2: { label: '2', className: 'bg-danger/15 text-danger font-semibold' },
  4: { label: '4', className: 'bg-danger/30 text-danger font-bold' },
};

const CELL = 'h-8 px-1 text-center tabular-nums';
const HEAD = 'px-1.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-smeargle-textDim/80';

function buildRows(team) {
  return TYPE_NAMES.map((type) => {
    const multipliers = team.map((member) => effectiveness(type, member.types));
    return {
      type,
      multipliers,
      weak: multipliers.filter((value) => value > 1).length,
      resist: multipliers.filter((value) => value < 1).length,
      // Membros cujos próprios tipos (STAB) acertam este tipo com dano super efetivo.
      coverage: team.filter((member) => member.types.some((own) => effectiveness(own, [type]) > 1)).length,
    };
  });
}

const summaryClass = (danger, good) => {
  if (danger) return 'bg-danger/15 text-danger font-bold';
  if (good) return 'text-good font-semibold';
  return 'text-smeargle-textDim/80';
};

function TeamTypeTable({ team }) {
  const rows = useMemo(() => buildRows(team), [team]);

  return (
    <div>
      <div className="overflow-x-auto rounded-[4px] border border-umber/20 bg-paper/70">
        <table className="w-full border-collapse font-reading text-xs text-smeargle-text">
          <thead>
            <tr className="border-b border-umber/20">
              <th scope="col" className={`${HEAD} sticky left-0 bg-paper pl-3 pt-2 text-left`}>Ataque</th>
              {team.map((member) => (
                <th key={member.id} scope="col" className={`${HEAD} pt-1`} title={formatSlug(member.name)}>
                  <img src={thumbnailSpriteUrl(member.id)} alt={formatSlug(member.name)} width={36} height={36} loading="lazy" decoding="async" className="mx-auto h-9 w-9 object-contain" />
                </th>
              ))}
              <th scope="col" className={`${HEAD} border-l border-sepia/25 pt-2`}>Fracos</th>
              <th scope="col" className={`${HEAD} pt-2`}>Resist.</th>
              <th scope="col" className={`${HEAD} pt-2 pr-3`} title="Membros que acertam este tipo com dano super efetivo usando STAB">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ type, multipliers, weak, resist, coverage }) => (
              <tr key={type} className="border-b border-sepia/10 last:border-0">
                <th scope="row" className="sticky left-0 bg-paper py-1 pl-3 pr-2 text-left font-normal">
                  <PokemonTypeBadge type={type} className="!px-1.5 !text-[9px]" />
                </th>
                {multipliers.map((value, index) => {
                  const style = MULTIPLIER_STYLE[value];
                  return (
                    <td key={team[index].id} className={CELL}>
                      {style && <span className={`inline-flex h-6 w-7 items-center justify-center rounded-sketch ${style.className}`}>{style.label}</span>}
                    </td>
                  );
                })}
                <td className={`${CELL} border-l border-sepia/25`}>
                  <span className={`inline-flex h-6 min-w-7 items-center justify-center rounded-sketch px-1 ${summaryClass(weak >= 3 || weak > resist + 1, false)}`}>{weak}</span>
                </td>
                <td className={CELL}>
                  <span className={`inline-flex h-6 min-w-7 items-center justify-center rounded-sketch px-1 ${summaryClass(false, resist > 0)}`}>{resist}</span>
                </td>
                <td className={`${CELL} pr-3`}>
                  <span className={`inline-flex h-6 min-w-7 items-center justify-center rounded-sketch px-1 ${summaryClass(coverage === 0, coverage > 0)}`}>
                    {coverage || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-serif text-[11px] italic text-smeargle-textDim/70">
        Células: dano recebido de cada tipo (vazio = 1x). Fracos/Resist.: quantos membros são fracos ou resistem (inclui imunidade).
        Cobertura: quantos membros acertam esse tipo com dano super efetivo usando STAB.
      </p>
    </div>
  );
}

export default memo(TeamTypeTable);
