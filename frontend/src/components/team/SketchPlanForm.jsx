import { memo, useMemo } from 'react';
import { PenLine, X } from 'lucide-react';
import PokemonPicker from '../battle/PokemonPicker';
import { thumbnailSpriteUrl } from '../../services/api';
import { ARCHETYPES, archetypeByKey } from '../../utils/archetypes';
import { formatSlug } from '../../utils/filters';
import { speciesOf } from '../../utils/teamScore';
import { SINGLES_TIERS } from '../../utils/tiers';

const MiniSprite = ({ pokemon, faded = false }) => (
  <img
    src={thumbnailSpriteUrl(pokemon.id)}
    alt=""
    width={32}
    height={32}
    loading="lazy"
    decoding="async"
    className={`h-8 w-8 shrink-0 object-contain ${faded ? 'opacity-50 grayscale' : ''}`}
  />
);

/**
 * Plano do esboço: tier, estilo, Pokémon proibidos e a regra de tipos. Nada é calculado aqui;
 * o botão "Esboçar" dispara a busca.
 */
function SketchPlanForm({ plan, onChange, seed, pool, onRun, running, disabled }) {
  const archetype = archetypeByKey(plan.archetype);
  const blockedSpecies = useMemo(
    () => new Set([...seed.map(speciesOf), ...plan.banned.map(speciesOf)]),
    [seed, plan.banned],
  );

  const ban = (pokemon) => onChange({ banned: [...plan.banned, pokemon] });
  const unban = (name) => onChange({ banned: plan.banned.filter((pokemon) => pokemon.name !== name) });

  return (
    <form
      className="space-y-4 rounded-sketch border border-ink/15 bg-paper/60 p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onRun();
      }}
    >
      <div>
        <span className="paper-label">Fixos</span>
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Pokémon fixos do rascunho">
          {seed.map((pokemon) => (
            <li key={pokemon.id} className="flex items-center gap-1 rounded-[3px] border border-umber/25 bg-paper py-0.5 pl-0.5 pr-2.5 font-reading text-xs font-semibold text-smeargle-text">
              <MiniSprite pokemon={pokemon} />
              {formatSlug(pokemon.name)}
            </li>
          ))}
        </ul>
      </div>

      <label className="block max-w-xs">
        <span className="paper-label">Tier</span>
        <select value={plan.tier} onChange={(e) => onChange({ tier: e.target.value })} className="paper-field cursor-pointer">
          {SINGLES_TIERS.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}
        </select>
      </label>

      <fieldset>
        <legend className="paper-label">Estilo</legend>
        <div className="flex flex-wrap gap-1.5">
          {ARCHETYPES.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={plan.archetype === option.key}
              title={option.description}
              onClick={() => onChange({ archetype: option.key })}
              className={`cursor-pointer rounded-[3px] border px-3 py-1.5 text-xs font-semibold transition-[background-color,border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
                plan.archetype === option.key
                  ? 'border-vermilion bg-vermilion text-paper shadow-[2px_2px_0_color-mix(in_srgb,var(--shadow-base)_25%,transparent)]'
                  : 'border-ink/20 bg-paper text-smeargle-text hover:border-ink/45'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 font-reading text-xs italic text-smeargle-textDim/90">{archetype.description}</p>
      </fieldset>

      <div>
        <span className="paper-label">Não usar</span>
        <PokemonPicker
          pool={pool}
          onPick={ban}
          excludedSpecies={blockedSpecies}
          label="Adicionar um Pokémon à lista de proibidos do esboço"
          placeholder="Buscar Pokémon para deixar de fora..."
        />
        {plan.banned.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Pokémon que o esboço não vai usar">
            {plan.banned.map((pokemon) => (
              <li key={pokemon.id}>
                <button
                  type="button"
                  onClick={() => unban(pokemon.name)}
                  aria-label={`Voltar a usar ${formatSlug(pokemon.name)}`}
                  className="flex cursor-pointer items-center gap-1 rounded-[3px] border border-paint-magenta/30 bg-paint-magenta/5 py-0.5 pl-0.5 pr-2 font-reading text-xs text-smeargle-text transition-colors hover:bg-paint-magenta/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
                >
                  <MiniSprite pokemon={pokemon} faded />
                  <span className="line-through decoration-paint-magenta/60">{formatSlug(pokemon.name)}</span>
                  <X className="h-3 w-3 text-paint-magenta" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 font-reading text-sm text-smeargle-text">
        <input
          type="checkbox"
          checked={plan.maxTwoPerType}
          onChange={(e) => onChange({ maxTwoPerType: e.target.checked })}
          className="h-4 w-4 cursor-pointer accent-olive"
        />
        No máximo 2 Pokémon do mesmo tipo
      </label>

      <div className="flex justify-end">
        <button type="submit" disabled={disabled || running} className="btn-action font-serif">
          <PenLine className="h-4 w-4" aria-hidden="true" />
          {running ? 'Esboçando...' : 'Esboçar'}
        </button>
      </div>
    </form>
  );
}

export default memo(SketchPlanForm);
