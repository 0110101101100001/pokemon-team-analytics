import { memo, useEffect, useMemo, useState } from 'react';
import { fetchGenderlessSpecies, thumbnailSpriteUrl } from '../services/api';
import { breedingPartners, genderRatio, hatchInfo } from '../utils/breeding';
import { eggGroupLabel, formatSlug } from '../utils/filters';

const LABEL = 'block text-[10px] font-semibold uppercase text-[#78614E]';
const TILE = 'rounded-[4px] border border-[#2A2421]/10 bg-paper/80 p-2.5';
const NOTE = 'font-reading text-sm italic text-[#4A463E]';
const MALE = '#4F6D8A';
const FEMALE = '#9E3D64';

const percent = (value) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function GenderTile({ rate }) {
  const ratio = genderRatio(rate);
  return (
    <div className={TILE}>
      <span className={LABEL}>Gênero</span>
      {ratio ? (
        <>
          <div className="mt-1 flex justify-between text-xs font-bold">
            <span style={{ color: MALE }}>♂ {percent(ratio.male)}</span>
            <span style={{ color: FEMALE }}>♀ {percent(ratio.female)}</span>
          </div>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full" aria-hidden="true">
            <span style={{ width: `${ratio.male}%`, backgroundColor: MALE }} />
            <span style={{ width: `${ratio.female}%`, backgroundColor: FEMALE }} />
          </div>
        </>
      ) : (
        <span className="text-xs font-bold text-[#2A2421]">Sem gênero</span>
      )}
    </div>
  );
}

function PartnerGroup({ group, partners, onSelectPokemon }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-[#2A2421]">
        {eggGroupLabel(group)} <span className="font-mono font-medium tabular-nums text-[#78614E]">· {partners.length}</span>
      </p>
      {partners.length > 0 ? (
        <ul className="flex max-h-40 flex-wrap gap-1 overflow-y-auto overscroll-contain" aria-label={`Cruza com o grupo ${eggGroupLabel(group)}`}>
          {partners.map((entry) => (
            <li key={entry.name}>
              <button
                type="button"
                onClick={() => onSelectPokemon(entry.name)}
                title={formatSlug(entry.name)}
                aria-label={`Abrir a ficha de ${formatSlug(entry.name)}`}
                className="cursor-pointer rounded-[3px] border border-[#78614E]/20 bg-paper transition-colors hover:border-[#78614E]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
              >
                <img src={thumbnailSpriteUrl(entry.id)} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 object-contain [image-rendering:pixelated]" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={NOTE}>Nenhuma outra espécie com gênero neste grupo.</p>
      )}
    </div>
  );
}

/** Espécies sem gênero, buscadas uma vez (uma requisição em cache); null enquanto carrega ou se falhar. */
function useGenderless() {
  const [genderless, setGenderless] = useState(null);
  useEffect(() => {
    let active = true;
    fetchGenderlessSpecies()
      .then((names) => active && setGenderless(names))
      .catch(() => active && setGenderless(new Set()));
    return () => { active = false; };
  }, []);
  return genderless;
}

/**
 * Criação na Ficha de Campo: proporção de gênero, ciclos para chocar, grupos de ovo e com quem a espécie cruza.
 * Parceiros são espécies de um grupo em comum; formas e espécies sem gênero ficam de fora.
 */
function BreedingFacts({ species, entries, onSelectPokemon }) {
  const genderless = useGenderless();
  const eggGroups = useMemo(() => (species.egg_groups ?? []).map((group) => group.name), [species]);
  const hatch = hatchInfo(species.hatch_counter);

  const breeding = useMemo(() => (genderless && entries ? breedingPartners({
    speciesName: species.name,
    eggGroups,
    isGenderless: species.gender_rate === -1,
    entries: [...entries.values()],
    genderless,
  }) : null), [genderless, entries, species, eggGroups]);

  return (
    <div className="space-y-3">
      <h4 className="font-reading text-sm font-bold text-[#2A2421]">Criação</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <GenderTile rate={species.gender_rate} />
        {hatch && (
          <div className={TILE}>
            <span className={LABEL}>Ovo</span>
            <span className="text-xs font-bold text-[#2A2421]">
              {hatch.cycles} ciclos <span className="font-normal text-[#4A463E]">· cerca de {hatch.steps.toLocaleString('pt-BR')} passos</span>
            </span>
          </div>
        )}
        <div className={TILE}>
          <span className={LABEL}>Grupos de ovo</span>
          <span className="text-xs font-bold text-[#2A2421]">{eggGroups.map(eggGroupLabel).join(' · ') || '—'}</span>
        </div>
      </div>

      <div className="space-y-2">
        <span className={LABEL}>Com quem cruza</span>
        {!breeding && <p className={NOTE}>Procurando parceiros...</p>}
        {breeding?.kind === 'none' && (
          <p className={NOTE}>
            {species.is_baby
              ? 'Bebês não se reproduzem: o ovo vem da forma evoluída.'
              : 'Não se reproduz (grupo Undiscovered).'}
          </p>
        )}
        {breeding?.kind === 'everyone' && <p className={NOTE}>Cruza com qualquer Pokémon que se reproduz, menos outro Ditto.</p>}
        {breeding?.kind === 'dittoOnly' && <p className={NOTE}>Sem gênero: só cruza com Ditto.</p>}
        {breeding?.kind === 'groups' && (
          <>
            {breeding.groups.map(({ group, partners }) => (
              <PartnerGroup key={group} group={group} partners={partners} onSelectPokemon={onSelectPokemon} />
            ))}
            <p className={NOTE}>Também cruza com Ditto. Duas espécies que só têm machos (ou só fêmeas) não cruzam entre si.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(BreedingFacts);
