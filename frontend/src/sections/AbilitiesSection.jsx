import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import AbilityTable from '../components/abilities/AbilityTable';
import MoveAbilityModal from '../components/MoveAbilityModal';
import { HeaderSearch, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS, ResultCount } from '../components/layout/SectionHeading';
import ABILITY_LIST from '../data/abilities.json';
import { fetchPokemonList } from '../services/api';
import { GENERATIONS } from '../utils/filters';
import { createTextMatcher } from '../utils/textMatch';

// abilities.json (scripts/build-abilities.mjs): [slug, geração, efeito curto em inglês, [[id do Pokémon, oculta]]].
const ABILITIES = ABILITY_LIST.map(([slug, generation, effect, holders]) => ({ slug, generation, effect, holders }));
const HOLDERS_BY_SLUG = new Map(ABILITIES.map((ability) => [ability.slug, ability.holders]));

// Nome de cada id pelo índice completo da Pokédex: as Megas e outras formas fora da grade também têm habilidade.
let nameByIdRequest = null;
const loadNameById = () => {
  nameByIdRequest ??= fetchPokemonList()
    .then((list) => new Map(list.map(({ name, url }) => [Number(url.split('/').at(-2)), name])))
    .catch((error) => {
      nameByIdRequest = null;
      throw error;
    });
  return nameByIdRequest;
};

// Quem tem a habilidade, com a oculta marcada.
const loadHolders = (slug) => loadNameById().then((nameById) =>
  (HOLDERS_BY_SLUG.get(slug) ?? []).flatMap(([id, hidden]) => {
    const name = nameById.get(id);
    return name ? [{ name, id, hidden: hidden === 1 }] : [];
  }));


export default function AbilitiesSection({ entryByName, onSelectPokemon }) {
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState('');
  const [openAbility, setOpenAbility] = useState(null);
  const [detail, setDetail] = useState(null);

  const deferredQuery = useDeferredValue(query);

  const abilities = useMemo(() => {
    const matches = createTextMatcher(deferredQuery);
    return ABILITIES.filter((ability) =>
      (!generation || ability.generation === Number(generation)) &&
      matches(ability.slug));
  }, [generation, deferredQuery]);

  const handleQuery = useCallback((e) => setQuery(e.target.value), []);
  const toggleAbility = useCallback((slug) => setOpenAbility((current) => (current === slug ? null : slug)), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const count = abilities.length;

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <ToolbarRow rowFrom="lg">
          <HeaderSearch label="Pesquisar habilidade por nome" placeholder="Nome da habilidade..." value={query} onChange={handleQuery} />
          <HeaderSelect label="Filtrar por geração da habilidade" value={generation} onChange={(e) => setGeneration(e.target.value)} className="lg:w-52 lg:shrink-0">
            <option value="" className={OPTION_CLASS}>Todas as gerações</option>
            {GENERATIONS.filter((gen) => Number(gen.value) >= 3).map((gen) => (
              <option key={gen.value} value={gen.value} className={OPTION_CLASS}>{gen.label}</option>
            ))}
          </HeaderSelect>
        </ToolbarRow>
      </HeaderToolbar>

      <SectionHeading
        title="Habilidades"
        subtitle={<ResultCount count={count} singular="habilidade" plural="habilidades" query={deferredQuery} />}
        aside={<span className={HEADING_PILL_CLASS}>Toque em “Pokémon” para ver quem tem</span>}
      />

      <p className="font-reading text-sm italic text-brown">* Toque no nome da habilidade para ver mais informações.</p>

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
