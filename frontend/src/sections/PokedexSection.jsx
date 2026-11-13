import { memo, useMemo } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import CollectionTabs, { COLLECTIONS, CollectionNotice } from '../components/CollectionTabs';
import FiltersBar, { ActiveFilters, AdvancedFilters } from '../components/FiltersBar';
import PokemonGrid from '../components/PokemonGrid';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { useHeaderCollapsed } from '../components/layout/headerContext';
import { buildRegionalEntries, useRegionalDex } from '../hooks/useRegionalDex';

const REGIONAL_NOTICES = {
  loading: { icon: Loader2, iconClass: 'animate-spin', text: 'Folheando a Pokédex regional...' },
  error: { icon: TriangleAlert, iconClass: 'text-[#8A3B27]', text: 'Não foi possível carregar esta Pokédex regional agora. Tente de novo em instantes.' },
};

function RegionalNotice({ status }) {
  const { icon: Icon, iconClass, text } = REGIONAL_NOTICES[status];
  return (
    <p className="flex items-center justify-center gap-2 py-16 text-center text-sm font-medium text-[#78614E]">
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      {text}
    </p>
  );
}

/** Seletor das dexes de um jogo que tem mais de uma (Kalos em três partes, DLCs de Galar e Paldea). */
function DexAreaTabs({ dexes, value, onChange }) {
  return (
    <div role="tablist" aria-label="Área da Pokédex regional" className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#4A3B32]/15 bg-[#FFFEFB] p-1 shadow-xs">
      {dexes.map((dex) => {
        const selected = dex.slug === value;
        return (
          <button
            key={dex.slug}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(dex.slug)}
            className={`h-8 cursor-pointer rounded-full px-3 font-serif text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
              selected ? 'bg-[#829b72] text-[#FFFDF9] shadow-sm' : 'text-[#78614E] hover:bg-[#78614E]/10'
            }`}
          >
            {dex.label}
          </button>
        );
      })}
    </div>
  );
}

function PokedexSection({
  pokedex,
  pokemonList,
  eggGroupNames,
  collections,
  selectedName,
  hasSmogonDataMap,
  onSelect,
  onToggleFavorite,
  onLogin,
}) {
  const collapsed = useHeaderCollapsed();
  const { scope, game, dex, collection, searchTerm, applyFilters } = pokedex;
  const isRegional = scope === 'regional';
  const regional = useRegionalDex(isRegional ? dex.slug : null);

  const scopedList = useMemo(() => {
    if (!isRegional) return pokemonList;
    return regional.numbers ? buildRegionalEntries(pokemonList, regional.numbers, game.region) : [];
  }, [isRegional, pokemonList, regional.numbers, game.region]);

  // Favoritos e histórico são listas de nomes; na grade viram as mesmas entradas da Pokédex,
  // na ordem da coleção (mais recentes primeiro). A busca e os filtros valem sobre a coleção.
  const baseList = useMemo(() => {
    if (collection === 'all') return scopedList;
    const byName = new Map(scopedList.map((entry) => [entry.name, entry]));
    const names = collection === 'favorites' ? collections.favorites : collections.history.map((visit) => visit.name);
    return names.map((name) => byName.get(name)).filter(Boolean);
  }, [collection, scopedList, collections.favorites, collections.history]);

  const filteredList = useMemo(() => applyFilters(baseList), [applyFilters, baseList]);

  const speciesCount = useMemo(() => pokemonList.filter((p) => !p.isForm).length, [pokemonList]);
  const collectionCounts = useMemo(
    () => ({ favorites: collections.favorites.length, history: collections.history.length }),
    [collections.favorites, collections.history],
  );

  const regionalPending = isRegional && regional.status !== 'ready';
  // Numa coleção sem login, carregando, com falha ou vazia, um aviso ocupa o lugar da grade.
  const collectionBlocked = !regionalPending && collection !== 'all' && (collections.status !== 'ready' || baseList.length === 0);
  const count = regionalPending || collectionBlocked ? 0 : filteredList.length;
  const plural = count !== 1 ? 's' : '';

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <ToolbarRow>
          <FiltersBar
            initialQuery={searchTerm}
            onSearchChange={pokedex.setSearchTerm}
            onAddFilter={pokedex.addFilter}
            scope={scope}
            onScopeChange={pokedex.setScope}
            gameId={game.id}
            onGameChange={pokedex.selectGame}
            advancedOpen={pokedex.advancedOpen}
            advancedCount={pokedex.advancedCount}
            onToggleAdvanced={pokedex.toggleAdvanced}
            compact={collapsed}
          />
        </ToolbarRow>
        {pokedex.advancedOpen && <AdvancedFilters eggGroups={eggGroupNames} onAddFilter={pokedex.addFilter} />}
      </HeaderToolbar>

      <ActiveFilters activeFilters={pokedex.activeFilters} filterStatus={pokedex.filterStatus} onRemoveFilter={pokedex.removeFilter} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CollectionTabs
          view={collection}
          onChange={pokedex.setCollection}
          counts={collectionCounts}
          onClearHistory={collections.clearHistory}
          error={collections.error}
        />
        {isRegional && game.dexes.length > 1 && (
          <DexAreaTabs dexes={game.dexes} value={dex.slug} onChange={pokedex.selectDex} />
        )}
      </div>

      <SectionHeading
        caption={isRegional ? `pokédex de ${dex.label} · ${game.label}` : COLLECTIONS[collection].caption}
        title={(
          <>
            <span className="ink-splotch tabular-nums">{count}</span> Pokémon{plural} encontrado{plural}
          </>
        )}
        note={searchTerm && (
          <>
            Resultado para <span className="font-serif italic">“{searchTerm}”</span>
          </>
        )}
        aside={(
          <span className={HEADING_PILL_CLASS}>
            {isRegional
              ? `Numeração regional · ${scopedList.length} entradas`
              : `Até Gen 9 · ${speciesCount} espécies · ${pokemonList.length - speciesCount} formas`}
          </span>
        )}
      />

      {regionalPending ? (
        <RegionalNotice status={regional.status} />
      ) : collectionBlocked ? (
        <CollectionNotice view={collection} status={collections.status} isEmpty={baseList.length === 0} onLogin={onLogin} />
      ) : (
        <PokemonGrid
          pokemonList={filteredList}
          selectedName={selectedName}
          onSelect={onSelect}
          hasSmogonDataMap={hasSmogonDataMap}
          favorites={collections.favoriteSet}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </div>
  );
}

export default memo(PokedexSection);
