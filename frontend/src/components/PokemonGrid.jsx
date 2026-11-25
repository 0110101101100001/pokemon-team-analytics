import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { measureElement, useWindowVirtualizer } from '@tanstack/react-virtual';
import PokemonCard from './PokemonCard';
import JumpIndex from './JumpIndex';
import { COMPARE_LIMIT } from '../utils/compare';
import { GENERATIONS, formatSlug } from '../utils/filters';
import EmptyState from './EmptyState';

// Os breakpoints do Tailwind (sm, md, lg, xl): de 1 a 5 colunas.
const COLUMN_QUERIES = [['(min-width: 1280px)', 5], ['(min-width: 1024px)', 4], ['(min-width: 768px)', 3], ['(min-width: 640px)', 2]];
// Os primeiros cards aparecem logo na abertura: os sprites deles não esperam o lazy loading.
const PRIORITY_CARDS = 10;
// Altura reservada para o header fixo quando o salto leva a uma linha (o antigo scroll-mt-40).
const HEADER_OFFSET = 160;
const OVERSCAN_ROWS = 3;

function readColumns() {
  if (typeof window === 'undefined' || !window.matchMedia) return 1;
  return COLUMN_QUERIES.find(([query]) => window.matchMedia(query).matches)?.[1] ?? 1;
}

function subscribeColumns(onChange) {
  const lists = COLUMN_QUERIES.map(([query]) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', onChange));
  return () => lists.forEach((list) => list.removeEventListener('change', onChange));
}

const useGridColumns = () => useSyncExternalStore(subscribeColumns, readColumns, () => 1);

/**
 * Distância do topo da grade ao topo do documento. Muda quando o header recolhe ou quando
 * aparecem filtros e avisos acima dela; a altura do documento muda junto, daí o observer no body.
 */
function useDocumentOffset(ref) {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const update = () => setOffset(node.getBoundingClientRect().top + window.scrollY);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [ref]);
  return offset;
}

/**
 * Posição do primeiro Pokémon de cada geração na lista, para o índice de saltos.
 * Só faz sentido na ordem nacional: se as espécies não vierem em ordem de geração
 * (Pokédex regional, coleções, busca por relevância), devolve null. As formas ficam junto da espécie e não contam.
 */
function generationStarts(list) {
  const starts = [];
  let current = 0;
  for (let index = 0; index < list.length; index += 1) {
    const { isForm, generation } = list[index];
    if (isForm || generation === current) continue;
    if (generation < current) return null;
    current = generation;
    starts.push({ generation, index });
  }
  return starts.length > 1 ? starts : null;
}

const REGION_OF = Object.fromEntries(GENERATIONS.map(({ value, label }) => [value, label.split(' · ')[1]]));

function emptyHint(suggestion) {
  if (suggestion) return `Quis dizer: ${formatSlug(suggestion)}?`;
  return 'Tente ajustar os filtros de busca ou limpe a pesquisa.';
}

function PokemonGrid({
  pokemonList,
  selectedName,
  onSelect,
  hasSmogonDataMap = {},
  favorites,
  onToggleFavorite,
  comparedSet,
  onToggleCompare,
  suggestion = null,
}) {
  const compareFull = (comparedSet?.size ?? 0) >= COMPARE_LIMIT;
  const columns = useGridColumns();
  const listRef = useRef(null);
  const scrollMargin = useDocumentOffset(listRef);
  // Altura medida de uma linha: estimativa das que ainda não foram montadas, para o salto cair no lugar certo.
  const rowHeightRef = useRef(340);
  // Primeiro card visível, para manter a posição quando o número de colunas muda (rotação, janela redimensionada).
  const anchorRef = useRef(0);

  const total = pokemonList.length;
  const rowCount = Math.ceil(total / columns);
  const starts = useMemo(() => generationStarts(pokemonList), [pokemonList]);
  const jumpItems = useMemo(
    () => starts?.map(({ generation, index }) => ({ key: index, generation, region: REGION_OF[generation] })),
    [starts],
  );

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeightRef.current,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
    scrollPaddingStart: HEADER_OFFSET,
    getItemKey: (row) => pokemonList[row * columns]?.name ?? row,
    measureElement: (element, entry, instance) => {
      const height = measureElement(element, entry, instance);
      if (height > 0) rowHeightRef.current = height;
      return height;
    },
    onChange: (instance) => {
      if (instance.range) anchorRef.current = instance.range.startIndex * columns;
    },
  });

  const lastColumns = useRef(columns);
  useLayoutEffect(() => {
    if (lastColumns.current === columns) return;
    lastColumns.current = columns;
    if (window.scrollY > scrollMargin) virtualizer.scrollToIndex(Math.floor(anchorRef.current / columns), { align: 'start' });
  }, [columns, scrollMargin, virtualizer]);

  // Salto pelo índice: rola até a linha do card e, quando a rolagem termina, acerta a posição (as linhas
  // medidas no caminho podem ter outra altura) e põe o foco no card.
  const jumpTo = useCallback((index) => {
    const row = Math.floor(index / columns);
    const [top] = virtualizer.getOffsetForIndex(row, 'start') ?? [0];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settle = () => {
      virtualizer.scrollToIndex(row, { align: 'start' });
      requestAnimationFrame(() => {
        listRef.current?.querySelector(`[data-card-index="${index}"] button`)?.focus({ preventScroll: true });
      });
    };
    if (reduceMotion || Math.abs(window.scrollY - top) < 2) {
      window.scrollTo({ top });
      settle();
      return;
    }
    const fallback = setTimeout(done, 1200);
    function done() {
      clearTimeout(fallback);
      window.removeEventListener('scrollend', done);
      settle();
    }
    window.addEventListener('scrollend', done, { once: true });
    window.scrollTo({ top, behavior: 'smooth' });
  }, [columns, virtualizer]);

  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <section className="w-full">
      {jumpItems && <JumpIndex label="Ir para a geração" items={jumpItems} onJump={jumpTo} />}

      {total === 0 ? (
        <EmptyState className="py-24" title="nenhum Pokémon encontrado" hint={emptyHint(suggestion)} />
      ) : (
        // Só as linhas perto da tela ficam montadas; o contêiner tem a altura da grade inteira.
        <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => {
            const first = row.index * columns;
            return (
              <div
                key={row.key}
                ref={virtualizer.measureElement}
                data-index={row.index}
                className="absolute inset-x-0 top-0 grid gap-4 pb-4 lg:gap-5 lg:pb-5"
                style={{ gridTemplateColumns, transform: `translateY(${row.start - scrollMargin}px)` }}
              >
                {pokemonList.slice(first, first + columns).map(({ name, id, number, types }, offset) => (
                  <PokemonCard
                    key={name}
                    index={first + offset}
                    priority={first + offset < PRIORITY_CARDS}
                    pokemon={name}
                    id={id}
                    number={number}
                    types={types}
                    isSelected={selectedName === name}
                    hasSmogonData={!!hasSmogonDataMap[name]}
                    isFavorite={favorites?.has(name) ?? false}
                    onSelect={onSelect}
                    onToggleFavorite={onToggleFavorite}
                    isCompared={comparedSet?.has(name) ?? false}
                    compareFull={compareFull}
                    onToggleCompare={onToggleCompare}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
export default memo(PokemonGrid);
