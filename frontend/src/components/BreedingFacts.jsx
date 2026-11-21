import { memo, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
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

const SEARCH_DEBOUNCE_MS = 150;
const normalizeName = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// O nome como aparece na tela ("Mr. Mime") e o slug ("mr-mime"): a busca acha pelos dois.
const searchableName = (name) => normalizeName(`${formatSlug(name)} ${name}`);

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
        // Colunas de no mínimo 4,5rem (cabe um nome de 12 letras) que se ajustam à largura; a altura cabe umas quatro linhas sem passar de metade da tela.
        // O respiro (p-1) deixa o contorno de foco inteiro dentro da área rolável.
        <ul
          className="grid max-h-[min(19rem,55vh)] grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5 overflow-y-auto overscroll-contain p-1"
          aria-label={`Cruza com o grupo ${eggGroupLabel(group)}`}
        >
          {partners.map((entry) => {
            const name = formatSlug(entry.name);
            return (
              <li key={entry.name}>
                <button
                  type="button"
                  onClick={() => onSelectPokemon(entry.name)}
                  aria-label={`Abrir a ficha de ${name}`}
                  className="group/sprite relative flex w-full cursor-pointer justify-center overflow-hidden rounded-[3px] border border-[#78614E]/20 bg-paper transition-colors hover:border-[#78614E]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
                >
                  <img src={thumbnailSpriteUrl(entry.id)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 object-contain [image-rendering:pixelated]" />
                  {/* O nome aparece dentro do quadro no hover e no foco pelo teclado (a rolagem da grade não o corta); nome longo quebra a linha. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/85 px-0.5 py-0.5 text-center font-reading text-[10px] leading-[1.1] tracking-tight [overflow-wrap:anywhere] text-paper opacity-0 transition-opacity group-hover/sprite:opacity-100 group-focus-visible/sprite:opacity-100 motion-reduce:transition-none"
                  >
                    {name}
                  </span>
                </button>
              </li>
            );
          })}
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

function PartnerSearch({ value, onChange }) {
  return (
    <div className="relative">
      <label className="block">
        <span className="sr-only">Buscar Pokémon nos grupos de ovo</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78614E]/70" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar pelo nome..."
          autoComplete="off"
          className="paper-field h-9 pl-9 pr-9 text-sm [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar a busca"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[3px] text-[#78614E] transition-colors hover:bg-[#78614E]/10 hover:text-[#2A2421] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
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

  // A busca vale para todos os grupos de uma vez; com ela, grupo sem resultado some e o contador mostra o filtrado.
  const [query, setQuery] = useState('');
  const term = normalizeName(useDebouncedValue(query, query ? SEARCH_DEBOUNCE_MS : 0).trim());
  const groups = useMemo(() => {
    const all = breeding?.groups ?? [];
    if (!term) return all;
    return all
      .map((group) => ({ ...group, partners: group.partners.filter((entry) => searchableName(entry.name).includes(term)) }))
      .filter((group) => group.partners.length > 0);
  }, [breeding, term]);

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
      <PartnerSearch value={query} onChange={setQuery} />
      {groups.length > 0 ? (
        groups.map(({ group, partners }) => (
          <PartnerGroup key={group} group={group} partners={partners} onSelectPokemon={onSelectPokemon} />
        ))
      ) : (
        <p className={NOTE} role="status">Nenhum Pokémon com “{query.trim()}” nesses grupos de ovo.</p>
      )}
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
