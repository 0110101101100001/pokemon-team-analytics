import { Suspense, lazy, useRef } from 'react';
import InkDropLoader from './InkDropLoader';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { formatSlug } from '../utils/filters';

export const loadPokemonDrawer = () => import('./PokemonDrawer');
const PokemonDrawer = lazy(loadPokemonDrawer);

function DrawerFallback() {
  return <InkDropLoader label="Molhando o pincel..." className="h-full" />;
}

/** A ficha do Pokémon em modal: Esc fecha, a página por trás não rola e o foco volta ao card ao fechar. */
export default function PokemonSheet({ pokemonName, onClose, ...drawerProps }) {
  const dialogRef = useRef(null);
  useModalBehavior(onClose, dialogRef);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2421]/60 p-4 animate-fade-in motion-reduce:animate-none md:bg-[#2A2421]/45 md:backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${formatSlug(pokemonName)}`}
        tabIndex={-1}
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.8rem_1.5rem_1.9rem_1.4rem/1.5rem_1.9rem_1.4rem_1.8rem] border-[1.5px] border-[#2A2421] bg-[#FFFEFB] shadow-panel animate-bubble-pop focus:outline-none motion-reduce:animate-none sm:h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Suspense fallback={<DrawerFallback />}>
          <PokemonDrawer pokemonName={pokemonName} onClose={onClose} {...drawerProps} />
        </Suspense>
      </div>
    </div>
  );
}
