import { memo } from 'react';
import { GENERATIONS } from '../utils/filters';

// "1ª geração · Kanto" → { number: 1, region: 'Kanto' }, uma vez só.
const GENS = GENERATIONS.map(({ value, label }) => ({ number: Number(value), region: label.split(' · ')[1] }));
export const GENERATION_BAR_HEIGHT = 40;

/**
 * Navegação por geração, fixa logo abaixo do header: 9 segmentos, um por geração, cada um um botão que rola até o
 * primeiro Pokémon dela. A geração no topo da tela fica destacada (--accent), as já passadas ficam preenchidas
 * (--border-strong) e as próximas, neutras (--border). À esquerda, "Geração 3 de 9 · Hoenn".
 * No celular os segmentos mostram só o número; o rótulo mantém o nome.
 * `starts`: [{ generation, index }] da lista; `current`: a geração no topo; `onJump(index)`.
 */
function GenerationBar({ starts, current, onJump }) {
  const startOf = new Map(starts.map((start) => [start.generation, start.index]));
  const region = GENS.find((gen) => gen.number === current)?.region ?? '';

  return (
    <nav
      aria-label="Gerações"
      className="sticky z-30 -mx-4 mb-3 flex items-center gap-3 border-b border-line bg-bg px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ top: 'var(--app-header-h, 160px)', height: GENERATION_BAR_HEIGHT }}
    >
      <p aria-live="polite" className="w-[5.75rem] shrink-0 truncate text-xs text-ink-soft sm:w-44 sm:text-sm">
        <span className="sr-only sm:not-sr-only">Geração </span>
        <span className="font-mono font-semibold tabular-nums text-ink">{current}</span>
        <span className="sm:hidden">/9</span>
        <span className="hidden sm:inline"> de 9</span>
        <span className="font-semibold text-ink"> · {region}</span>
      </p>
      <ol className="flex min-w-0 flex-1 items-stretch gap-1">
        {GENS.map(({ number, region: name }) => {
          const index = startOf.get(number);
          const state = number === current ? 'current' : number < current ? 'past' : 'next';
          return (
            <li key={number} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onJump(index)}
                disabled={index === undefined}
                aria-label={`${number}ª · ${name}`}
                aria-current={state === 'current' ? 'true' : undefined}
                title={`${number}ª · ${name}`}
                className={`group flex h-8 w-full cursor-pointer flex-col items-center justify-end gap-1 rounded-[3px] px-0.5 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-text disabled:cursor-default disabled:opacity-40 ${
                  state === 'current' ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span className={`w-full truncate text-center font-reading text-[11px] leading-none sm:text-xs ${state === 'current' ? 'font-bold' : ''}`}>
                  <span className="md:hidden">{number}</span>
                  <span className="hidden md:inline">{name}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`block w-full rounded-full transition-colors ${
                    state === 'current' ? 'h-1.5 bg-accent' : state === 'past' ? 'h-1 bg-line-strong' : 'h-1 bg-line group-hover:bg-line-strong'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default memo(GenerationBar);
