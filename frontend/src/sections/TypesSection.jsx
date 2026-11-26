import { useCallback, useRef, useState } from 'react';
import DefenseCalculator from '../components/types/DefenseCalculator';
import TypeMatrix from '../components/types/TypeMatrix';
import TypePanel from '../components/types/TypePanel';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { isTypeName } from '../data/typeChart';
import { useHashRoute } from '../hooks/useHashPath';
import { formatHash, navigateHash, parseHash } from '../navigation/hashRoute';

// Tipos da Calculadora de defesa no endereço (`#/tipos?t1=fire&t2=flying`), para o link abrir igual.
const FIRST_PARAM = 't1';
const SECOND_PARAM = 't2';

/** Os dois tipos do endereço; valores inválidos (ou o 2º igual ao 1º) são ignorados. */
export function defenseTypesFromParams(params) {
  const first = isTypeName(params.get(FIRST_PARAM)) ? params.get(FIRST_PARAM) : '';
  const rawSecond = params.get(SECOND_PARAM);
  const second = first && isTypeName(rawSecond) && rawSecond !== first ? rawSecond : '';
  return { first, second };
}

const reducedMotion = () =>
  document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Tabela de tipos: a matriz 18 × 18, o resumo de um tipo e a calculadora de defesa para tipo duplo.
 * `onShowPokemon(type)` abre a Pokédex com o filtro desse tipo.
 */
export default function TypesSection({ onShowPokemon }) {
  const route = useHashRoute();
  const { first, second } = defenseTypesFromParams(route.params);
  const [selected, setSelected] = useState(null);
  const panelRef = useRef(null);

  // Escolher um tipo na matriz leva o resumo à tela quando ele está fora dela (no celular, fica abaixo da matriz).
  const selectType = useCallback((type) => {
    setSelected(type);
    if (!type) return;
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const { top, bottom } = panel.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) {
        panel.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }, []);

  // A troca de tipos reescreve o endereço sem criar entrada no histórico; os outros parâmetros ficam.
  const changeDefense = useCallback(({ first: nextFirst, second: nextSecond }) => {
    const { segments, params } = parseHash(window.location.hash);
    const next = new URLSearchParams(params);
    const set = (key, value) => (value ? next.set(key, value) : next.delete(key));
    set(FIRST_PARAM, nextFirst || nextSecond);
    set(SECOND_PARAM, nextFirst ? nextSecond : '');
    navigateHash(formatHash(segments, next), { replace: true });
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Tabela de tipos"
        subtitle="Quanto dano cada tipo de ataque causa em cada tipo, na geração atual (com Fairy)."
        aside={<span className={HEADING_PILL_CLASS}>Toque num tipo para ver o resumo</span>}
      />

      <section aria-labelledby="tipos-matriz" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h3 id="tipos-matriz" className="section-title !mb-0">Matriz de efetividade</h3>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 font-reading text-xs text-ink-soft" aria-label="Legenda da matriz">
            <li className="flex items-center gap-1.5"><span className="type-cell inline-flex h-5 w-6 items-center justify-center rounded-[2px] font-mono font-bold" data-value="2">2</span>super efetivo</li>
            <li className="flex items-center gap-1.5"><span className="type-cell inline-flex h-5 w-6 items-center justify-center rounded-[2px] font-mono font-bold" data-value="0.5">½</span>pouco efetivo</li>
            <li className="flex items-center gap-1.5"><span className="type-cell inline-flex h-5 w-6 items-center justify-center rounded-[2px] font-mono font-bold" data-value="0">0</span>sem efeito</li>
            <li className="flex items-center gap-1.5"><span className="inline-flex h-5 w-6 rounded-[2px] border border-line" />vazio: normal (1×)</li>
          </ul>
        </div>
        <TypeMatrix selected={selected} onSelectType={selectType} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div ref={panelRef} className="min-w-0 scroll-mt-28">
          <TypePanel type={selected} onSelect={selectType} onShowPokemon={onShowPokemon} />
        </div>
        <div className="min-w-0">
          <DefenseCalculator first={first} second={second} onChange={changeDefense} />
        </div>
      </div>
    </div>
  );
}
