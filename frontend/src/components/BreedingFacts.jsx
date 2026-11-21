import { memo, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchGenderlessSpecies, thumbnailSpriteUrl } from '../services/api';
import { breedingPartners, genderRatio, hatchInfo } from '../utils/breeding';
import { eggGroupLabel, formatSlug } from '../utils/filters';

const LABEL = 'block text-[10px] font-semibold uppercase text-[#78614E]';
const TILE = 'rounded-[4px] border border-[#2A2421]/10 bg-paper/80 p-2.5';
const NOTE = 'font-reading text-sm italic text-[#4A463E]';
const MALE = '#4F6D8A';
const FEMALE = '#9E3D64';

const percent = (value) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const eggGroupsOf = (species) => (species.egg_groups ?? []).map((group) => group.name);

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

/** Gênero, ciclos do ovo e grupos de ovo: ficam à vista em Habilidades & Morfologia. */
export const BreedingBasics = memo(function BreedingBasics({ species }) {
  const hatch = hatchInfo(species.hatch_counter);
  const eggGroups = eggGroupsOf(species);
  return (
    <div className="grid grid-cols-2 gap-2">
      <GenderTile rate={species.gender_rate} />
      {hatch && (
        <div className={TILE}>
          <span className={LABEL}>Ovo</span>
          <span className="block text-xs font-bold text-[#2A2421]">{hatch.cycles} ciclos</span>
          <span className="text-[11px] text-[#4A463E]">cerca de {hatch.steps.toLocaleString('pt-BR')} passos</span>
        </div>
      )}
      <div className={`${TILE} col-span-2`}>
        <span className={LABEL}>Grupos de ovo</span>
        <span className="text-xs font-bold text-[#2A2421]">{eggGroups.map(eggGroupLabel).join(' · ') || '—'}</span>
      </div>
    </div>
  );
});

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

/** Espécies sem gênero (uma requisição em cache); null enquanto carrega. */
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

function PartnerList({ species, entries, onSelectPokemon }) {
  const genderless = useGenderless();
  const breeding = useMemo(() => (genderless && entries ? breedingPartners({
    speciesName: species.name,
    eggGroups: eggGroupsOf(species),
    isGenderless: species.gender_rate === -1,
    entries: [...entries.values()],
    genderless,
  }) : null), [genderless, entries, species]);

  if (!breeding) return <p className={NOTE}>Procurando parceiros...</p>;
  if (breeding.kind === 'none') {
    return (
      <p className={NOTE}>
        {species.is_baby ? 'Bebês não se reproduzem: o ovo vem da forma evoluída.' : 'Não se reproduz (grupo Undiscovered).'}
      </p>
    );
  }
  if (breeding.kind === 'everyone') return <p className={NOTE}>Cruza com qualquer Pokémon que se reproduz, menos outro Ditto.</p>;
  if (breeding.kind === 'dittoOnly') return <p className={NOTE}>Sem gênero: só cruza com Ditto.</p>;
  return (
    <div className="space-y-3">
      {breeding.groups.map(({ group, partners }) => (
        <PartnerGroup key={group} group={group} partners={partners} onSelectPokemon={onSelectPokemon} />
      ))}
      <p className={NOTE}>Também cruza com Ditto. Duas espécies que só têm machos (ou só fêmeas) não cruzam entre si.</p>
    </div>
  );
}

/**
 * "Com quem cruza", recolhido: ao abrir, as espécies parceiras por grupo de ovo. A lista (e a busca das espécies
 * sem gênero) só é montada na primeira abertura.
 */
function BreedingPartners({ species, entries, onSelectPokemon }) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="group rounded-[4px] border border-[#2A2421]/12 bg-paper"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt [&::-webkit-details-marker]:hidden">
        <span className="font-reading text-sm font-bold text-[#2A2421]">Com quem cruza</span>
        <span className="text-xs text-[#78614E]">{eggGroupsOf(species).map(eggGroupLabel).join(' · ')}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[#78614E] transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="border-t border-[#2A2421]/12 px-3 pb-3 pt-2.5">
        {opened && <PartnerList species={species} entries={entries} onSelectPokemon={onSelectPokemon} />}
      </div>
    </details>
  );
}

export default memo(BreedingPartners);
