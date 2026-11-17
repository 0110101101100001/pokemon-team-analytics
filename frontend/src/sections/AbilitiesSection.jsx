import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import AbilityTable from '../components/abilities/AbilityTable';
import MoveAbilityModal from '../components/MoveAbilityModal';
import { HeaderSearch, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import ABILITY_LIST from '../data/abilities.json';
import { TYPE_NAMES } from '../services/api';
import { GENERATIONS, formatSlug } from '../utils/filters';

// abilities.json (scripts/build-abilities.mjs): [slug, geração, efeito curto em inglês, [[id do Pokémon, oculta]]].
const ABILITIES = ABILITY_LIST.map(([slug, generation, effect, holders]) => ({
  slug, generation, effect, holders, label: formatSlug(slug).toLowerCase(),
}));
const HOLDERS_BY_SLUG = new Map(ABILITIES.map((ability) => [ability.slug, ability.holders]));

const toSearchTerm = (text) => text.trim().toLowerCase().replace(/-/g, ' ');

export default function AbilitiesSection({ entryByName, onSelectPokemon }) {
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState('');
  const [pokemonType, setPokemonType] = useState('');
  const [openAbility, setOpenAbility] = useState(null);
  const [detail, setDetail] = useState(null);

  const deferredQuery = useDeferredValue(query);

  const entryById = useMemo(() => new Map([...entryByName.values()].map((entry) => [entry.id, entry])), [entryByName]);

  // Quem tem cada habilidade, com a oculta marcada; fica fora quem não está no índice da Pokédex.
  const loadHolders = useCallback((slug) => Promise.resolve(
    (HOLDERS_BY_SLUG.get(slug) ?? []).flatMap(([id, hidden]) => {
      const entry = entryById.get(id);
      return entry ? [{ name: entry.name, id, hidden: hidden === 1 }] : [];
    }),
  ), [entryById]);

  const abilities = useMemo(() => {
    const term = toSearchTerm(deferredQuery);
    const hasType = (ability) => ability.holders.some(([id]) => entryById.get(id)?.types.includes(pokemonType));
    return ABILITIES.filter((ability) =>
      (!generation || ability.generation === Number(generation)) &&
      (!pokemonType || hasType(ability)) &&
      (!term || ability.label.includes(term)));
  }, [generation, pokemonType, deferredQuery, entryById]);

  const handleQuery = useCallback((e) => setQuery(e.target.value), []);
  const toggleAbility = useCallback((slug) => setOpenAbility((current) => (current === slug ? null : slug)), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const count = abilities.length;

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <ToolbarRow rowFrom="lg">
          <HeaderSearch label="Pesquisar habilidade por nome" placeholder="Nome da habilidade..." value={query} onChange={handleQuery} />
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:contents">
            <HeaderSelect label="Filtrar por geração da habilidade" value={generation} onChange={(e) => setGeneration(e.target.value)} className="lg:w-44 lg:shrink-0">
              <option value="" className={OPTION_CLASS}>Todas as gerações</option>
              {GENERATIONS.filter((gen) => Number(gen.value) >= 3).map((gen) => (
                <option key={gen.value} value={gen.value} className={OPTION_CLASS}>{gen.label}</option>
              ))}
            </HeaderSelect>
            <HeaderSelect label="Filtrar pelo tipo de quem tem a habilidade" value={pokemonType} onChange={(e) => setPokemonType(e.target.value)} className="lg:w-44 lg:shrink-0">
              <option value="" className={OPTION_CLASS}>Pokémon de todos os tipos</option>
              {TYPE_NAMES.map((type) => <option key={type} value={type} data-type={type} className={OPTION_CLASS}>Pokémon {formatSlug(type)}</option>)}
            </HeaderSelect>
          </div>
        </ToolbarRow>
      </HeaderToolbar>

      <SectionHeading
        title="Habilidades"
        subtitle={(
          <>
            <span className="font-semibold tabular-nums text-[#2A2421]">{count}</span>{' '}
            {`habilidade${count !== 1 ? 's' : ''}`}
            {deferredQuery.trim() && <> para <span className="font-serif italic">“{deferredQuery.trim()}”</span></>}
          </>
        )}
        aside={<span className={HEADING_PILL_CLASS}>Toque em “Pokémon” para ver quem tem</span>}
      />

      <AbilityTable
        abilities={abilities}
        openAbility={openAbility}
        onToggleAbility={toggleAbility}
        onSelectAbility={setDetail}
        loadHolders={loadHolders}
        entryByName={entryByName}
        onSelectPokemon={onSelectPokemon}
      />

      {detail && <MoveAbilityModal kind="ability" name={detail} onClose={closeDetail} />}
    </div>
  );
}
