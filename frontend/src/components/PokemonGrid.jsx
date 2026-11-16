import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Paintbrush } from 'lucide-react';
import PokemonCard from './PokemonCard';
import { GENERATIONS } from '../utils/filters';

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

function GenerationIndex({ starts, onJump }) {
  return (
    <nav aria-label="Ir para a geração" className="mb-5 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-reading text-sm italic text-[#4A463E]">Ir para:</span>
      {starts.map(({ generation, index }) => (
        <button
          key={generation}
          type="button"
          onClick={() => onJump(index)}
          className="h-8 cursor-pointer rounded-[2px] border-[1.5px] border-[#1C1A17]/70 px-2.5 font-reading text-sm text-[#1C1A17] transition-colors hover:bg-[#E6D9BE] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <span className="font-mono text-xs tabular-nums">{generation}ª</span> · {REGION_OF[generation]}
        </button>
      ))}
    </nav>
  );
}

function PokemonGrid({
  pokemonList,
  selectedName,
  onSelect,
  hasSmogonDataMap = {},
  favorites,
  onToggleFavorite,
}) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [renderedList, setRenderedList] = useState(pokemonList);
  const [jumpTarget, setJumpTarget] = useState(null);
  const sentinelRef = useRef(null);
  const gridRef = useRef(null);
  const starts = useMemo(() => generationStarts(pokemonList), [pokemonList]);

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
    const card = gridRef.current?.children[jumpTarget];
    card?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    card?.querySelector('button')?.focus({ preventScroll: true });
    setJumpTarget(null);
  }, [jumpTarget]);

  return (
    <section className="w-full">
      {starts && <GenerationIndex starts={starts} onJump={jumpTo} />}
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
          />
        ))}

        {/* Mensagem de Vazio caso os filtros não retornem nada */}
        {total === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
            <div className="ink-stamp mb-4 h-14 w-14">
              <Paintbrush className="w-6 h-6 text-[#78614E]" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold font-serif text-[#2A2421]">Nenhum Pokémon encontrado</h3>
            <p className="text-[#78614E] font-medium mt-1">Tente ajustar os filtros de busca ou limpe a pesquisa.</p>
          </div>
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
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[3px] border-[1.5px] border-[#1C1A17]/80 px-4 font-reading text-[15px] font-medium text-[#1C1A17] transition-colors hover:bg-[#E6D9BE] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            Mostrar mais <span className="font-mono text-xs tabular-nums text-[#4A463E]">{shown} de {total}</span>
          </button>
        </div>
      )}
    </section>
  );
}
export default memo(PokemonGrid);
