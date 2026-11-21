import { memo, useEffect, useMemo, useRef, useState } from 'react';
import PokemonCard from './PokemonCard';
import JumpIndex, { scrollToElement } from './JumpIndex';
import { COMPARE_LIMIT } from '../utils/compare';
import { GENERATIONS } from '../utils/filters';
import EmptyState from './EmptyState';

const BATCH_SIZE = 24;
// O próximo lote começa a ser montado antes de o fim da grade chegar à tela.
const PRELOAD_MARGIN = '600px 0px';

/**
 * Posição do primeiro Pokémon de cada geração na lista, para o índice de saltos.
 * Só faz sentido na ordem nacional: se as espécies não vierem em ordem de geração
 * (Pokédex regional, coleções), devolve null. As formas ficam junto da espécie e não contam.
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

function PokemonGrid({
  pokemonList,
  selectedName,
  onSelect,
  hasSmogonDataMap = {},
  favorites,
  onToggleFavorite,
  comparedSet,
  onToggleCompare,
}) {
  const compareFull = (comparedSet?.size ?? 0) >= COMPARE_LIMIT;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [renderedList, setRenderedList] = useState(pokemonList);
  const [jumpTarget, setJumpTarget] = useState(null);
  const sentinelRef = useRef(null);
  const gridRef = useRef(null);
  const starts = useMemo(() => generationStarts(pokemonList), [pokemonList]);
  const jumpItems = useMemo(
    () => starts?.map(({ generation, index }) => ({ key: index, generation, region: REGION_OF[generation] })),
    [starts],
  );

  // Busca ou filtro novo: volta ao primeiro lote em vez de manter centenas de cards montados.
  if (renderedList !== pokemonList) {
    setRenderedList(pokemonList);
    setVisibleCount(BATCH_SIZE);
  }

  const total = pokemonList.length;
  const shown = Math.min(visibleCount, total);
  const hasMore = shown < total;

  // Um observer novo a cada lote: se o botão ainda estiver à vista, ele dispara de novo
  // e a grade continua enchendo até preencher a tela.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!hasMore || !node || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisibleCount((count) => count + BATCH_SIZE),
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, shown]);

  // Salto pelo índice: monta os cards até um lote depois do alvo e, já montado, rola até ele.
  const jumpTo = (index) => {
    setVisibleCount((count) => Math.max(count, index + BATCH_SIZE));
    setJumpTarget(index);
  };

  useEffect(() => {
    if (jumpTarget === null) return;
    scrollToElement(gridRef.current?.children[jumpTarget]);
    setJumpTarget(null);
  }, [jumpTarget]);

  return (
    <section className="w-full">
      {jumpItems && <JumpIndex label="Ir para a geração" items={jumpItems} onJump={jumpTo} />}
      {/* Grade sempre com 100% do espaço, de 1 a 5 colunas dependendo da tela. scroll-mt deixa o card do salto abaixo do header fixo. */}
      <div ref={gridRef} className="grid [&>*]:scroll-mt-40 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
        {pokemonList.slice(0, shown).map(({ name, id, number, types }) => (
          <PokemonCard
            key={name}
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

        {total === 0 && (
          <EmptyState className="py-24" title="nenhum Pokémon encontrado" hint="Tente ajustar os filtros de busca ou limpe a pesquisa." />
        )}
      </div>

      {/*
        Sentinela do scroll infinito. Também é um botão: serve ao teclado e a navegadores sem IntersectionObserver.
        overflow-anchor: none impede o navegador de ancorar a rolagem nele: sem isso, cada lote inserido acima
        faz a página rolar para acompanhar o botão, que continua à vista e carrega o lote seguinte, até o fim.
      */}
      {hasMore && (
        <div className="mt-8 flex justify-center [overflow-anchor:none]">
          <button
            ref={sentinelRef}
            type="button"
            onClick={() => setVisibleCount((count) => count + BATCH_SIZE)}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[3px] border-[1.5px] border-ink/80 px-4 font-reading text-[15px] font-medium text-ink transition-colors hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            Mostrar mais <span className="font-mono text-xs tabular-nums text-ink-soft">{shown} de {total}</span>
          </button>
        </div>
      )}
    </section>
  );
}
export default memo(PokemonGrid);
