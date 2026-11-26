import { memo, useMemo } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import CollectionTabs, { CollectionNotice } from '../components/CollectionTabs';
import { BrushUnderline } from '../components/InkDecor';
import FiltersBar, { ActiveFilters, AdvancedFilters } from '../components/FiltersBar';
import PokemonGrid from '../components/PokemonGrid';
import { SmogonSeal } from '../components/PokemonCard';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { ResultCount } from '../components/layout/SectionHeading';
import { useHeaderCollapsed } from '../components/layout/headerContext';
import { buildRegionalEntries, useRegionalDex } from '../hooks/useRegionalDex';
import { useBaseStats, viewNeedsStats } from '../hooks/usePokedexView';
import { sortEntries } from '../utils/pokedexView';

const REGIONAL_NOTICES = {
  loading: { icon: Loader2, iconClass: 'animate-spin', text: 'Folheando a Pokédex regional...' },
  error: { icon: TriangleAlert, iconClass: 'text-vermilion-deep', text: 'Não foi possível carregar esta Pokédex regional agora. Tente de novo em instantes.' },
};

function RegionalNotice({ status }) {
  const { icon: Icon, iconClass, text } = REGIONAL_NOTICES[status];
  return (
    <p className="flex items-center justify-center gap-2 py-16 text-center text-sm font-medium text-umber">
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      {text}
    </p>
  );
}

/** Legenda do selo dos cards: sem ela, a falta do selo parece dado faltando. */
function SmogonLegend() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <SmogonSeal />
      marca quem tem estatísticas de uso na Smogon
    </span>
  );
}

/** Seletor das dexes de um jogo que tem mais de uma (Kalos em três partes, DLCs de Galar e Paldea). */
function DexAreaTabs({ dexes, value, onChange }) {
  return (
    <div role="tablist" aria-label="Área da Pokédex regional" className="inline-flex flex-wrap gap-1 border-b-[1.5px] border-ink/70">
      {dexes.map((dex) => {
        const selected = dex.slug === value;
        return (
          <button
            key={dex.slug}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(dex.slug)}
            className={`relative h-9 cursor-pointer rounded-[2px] px-3 font-reading text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
              selected ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {dex.label}
            <BrushUnderline color="var(--accent)" active={selected} className="inset-x-2 -bottom-1 h-[5px] w-[calc(100%-1rem)]" />
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
  pokedexView,
  onSelect,
  onToggleFavorite,
  comparedSet,
  onToggleCompare,
  onLogin,
}) {
  const collapsed = useHeaderCollapsed();
  const { scope, game, dex, collection, searchTerm, applyFilters, suggestFor } = pokedex;
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

  // Ordenação e modo valem em todas as coleções. Os atributos base só são baixados quando a ordem ou a Lista pedem.
  const { sort, view, setSort, setView } = pokedexView;
  const baseStats = useBaseStats(viewNeedsStats(pokedexView));
  const sortedList = useMemo(() => sortEntries(filteredList, sort, baseStats), [filteredList, sort, baseStats]);
  const suggestion = useMemo(
    () => (filteredList.length === 0 ? suggestFor(baseList) : null),
    [filteredList, suggestFor, baseList],
  );

  const speciesCount = useMemo(() => pokemonList.filter((p) => !p.isForm).length, [pokemonList]);
  const collectionCounts = useMemo(
    () => ({ favorites: collections.favorites.length, history: collections.history.length }),
    [collections.favorites, collections.history],
  );

  const regionalPending = isRegional && regional.status !== 'ready';
  // Numa coleção sem login, carregando, com falha ou vazia, um aviso ocupa o lugar da grade.
  const collectionBlocked = !regionalPending && collection !== 'all' && (collections.status !== 'ready' || baseList.length === 0);
  const count = regionalPending || collectionBlocked ? 0 : filteredList.length;
  // A barra de gerações só faz sentido na Pokédex nacional inteira, na ordem dos números.
  const showGenerations = !isRegional && collection === 'all' && !searchTerm.trim()
    && pokedex.activeFilters.length === 0 && sort === 'number';

  return (
    <div className="space-y-4 font-reading sm:space-y-5">
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
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
            compact={collapsed}
          />
        </ToolbarRow>
        {pokedex.advancedOpen && <AdvancedFilters eggGroups={eggGroupNames} onAddFilter={pokedex.addFilter} />}
      </HeaderToolbar>

      <ActiveFilters activeFilters={pokedex.activeFilters} filterStatus={pokedex.filterStatus} onRemoveFilter={pokedex.removeFilter} />

      {isRegional && game.dexes.length > 1 && (
        <DexAreaTabs dexes={game.dexes} value={dex.slug} onChange={pokedex.selectDex} />
      )}

      <SectionHeading
        rule={!showGenerations}
        wideSubtitle
        title={isRegional ? 'Registro Regional' : 'Registro Nacional'}
        subtitle={(
          <>
            <ResultCount count={count} singular="Pokémon encontrado" plural="Pokémon encontrados" query={searchTerm} />
            <span className="text-brown/80">
              {' · '}
              {isRegional
                ? `numeração regional, ${scopedList.length} entradas`
                : `${speciesCount} espécies e ${pokemonList.length - speciesCount} formas até a 9ª geração`}
            </span>
            <span className="mt-1.5 block text-brown/80"><SmogonLegend /></span>
          </>
        )}
        aside={(
          <CollectionTabs
            view={collection}
            onChange={pokedex.setCollection}
            counts={collectionCounts}
            onClearHistory={collections.clearHistory}
            error={collections.error}
          />
        )}
      />

      {regionalPending ? (
        <RegionalNotice status={regional.status} />
      ) : collectionBlocked ? (
        <CollectionNotice view={collection} status={collections.status} isEmpty={baseList.length === 0} onLogin={onLogin} />
      ) : (
        <PokemonGrid
          // Grade e Lista têm alturas de linha diferentes: trocar de modo remonta a grade com as medidas certas.
          key={view}
          pokemonList={sortedList}
          view={view}
          showGenerations={showGenerations}
          baseStats={baseStats}
          selectedName={selectedName}
          onSelect={onSelect}
          hasSmogonDataMap={hasSmogonDataMap}
          favorites={collections.favoriteSet}
          onToggleFavorite={onToggleFavorite}
          comparedSet={comparedSet}
          onToggleCompare={onToggleCompare}
          suggestion={suggestion}
        />
      )}
    </div>
  );
}

export default memo(PokedexSection);
