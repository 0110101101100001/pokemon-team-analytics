import { memo, useEffect, useRef, useState } from 'react';
import { Paintbrush } from 'lucide-react';
import PokemonCard from './PokemonCard';

const BATCH_SIZE = 24;
// O próximo lote começa a ser montado antes de o fim da grade chegar à tela.
const PRELOAD_MARGIN = '600px 0px';

function PokemonGrid({
  pokemonList,
  selectedName,
  onSelect,
  hasSmogonDataMap = {},
}) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [renderedList, setRenderedList] = useState(pokemonList);
  const sentinelRef = useRef(null);

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

  return (
    <section className="w-full">
      {/* Grade sempre com 100% do espaço, de 1 a 5 colunas dependendo da tela */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
        {pokemonList.slice(0, shown).map(({ name, id, number, types }) => (
          <PokemonCard
            key={name}
            pokemon={name}
            id={id}
            number={number}
            types={types}
            isSelected={selectedName === name}
            hasSmogonData={!!hasSmogonDataMap[name]}
            onSelect={onSelect}
          />
        ))}

        {/* Mensagem de Vazio caso os filtros não retornem nada */}
        {total === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 mb-4 rounded-full bg-white border border-[#4A3B32]/15 shadow-sm flex items-center justify-center">
              <Paintbrush className="w-6 h-6 text-[#78614E]" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold font-serif text-[#2A2421]">Nenhum Pokémon encontrado</h3>
            <p className="text-[#78614E] font-medium mt-1">Tente ajustar os filtros de busca ou limpe a pesquisa.</p>
          </div>
        )}
      </div>

      {/* Sentinela do scroll infinito. Também é um botão: serve ao teclado e a navegadores sem IntersectionObserver. */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            ref={sentinelRef}
            type="button"
            onClick={() => setVisibleCount((count) => count + BATCH_SIZE)}
            className="btn-outline font-serif"
          >
            Mostrar mais · {shown} de {total}
          </button>
        </div>
      )}
    </section>
  );
}
export default memo(PokemonGrid);
