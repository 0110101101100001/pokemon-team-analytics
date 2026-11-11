import { memo } from 'react';
import { Paintbrush } from 'lucide-react';
import PokemonCard from './PokemonCard';

function PokemonGrid({
  pokemonList,
  selectedName,
  onSelect,
  hasSmogonDataMap = {},
}) {
  return (
    <section className="w-full">
      {/* Grade sempre com 100% do espaço, de 1 a 5 colunas dependendo da tela */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
        {pokemonList.map(({ name, id, number, types }) => (
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
        {pokemonList.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 mb-4 rounded-full bg-white border border-[#4A3B32]/15 shadow-sm flex items-center justify-center">
              <Paintbrush className="w-6 h-6 text-[#78614E]" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold font-serif text-[#2A2421]">Nenhum Pokémon encontrado</h3>
            <p className="text-[#78614E] font-medium mt-1">Tente ajustar os filtros de busca ou limpe a pesquisa.</p>
          </div>
        )}
      </div>
    </section>
  );
}
export default memo(PokemonGrid);
