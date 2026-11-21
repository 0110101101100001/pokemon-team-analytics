/** Rola até o elemento com o mesmo cuidado em todas as listas: suave, a não ser com movimento reduzido. */
export function scrollToElement(element) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  element?.querySelector('button')?.focus({ preventScroll: true });
}

/**
 * "Ir para: 1ª · Kanto, 2ª · Johto…": atalhos para as partes de uma lista longa.
 * `items`: [{ key, generation, region }], na ordem da lista.
 */
export default function JumpIndex({ label, items, onJump }) {
  return (
    <nav aria-label={label} className="mb-5 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-reading text-sm italic text-[#4A463E]">Ir para:</span>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onJump(item.key)}
          className="h-8 cursor-pointer rounded-[2px] border-[1.5px] border-[#1C1A17]/70 px-2.5 font-reading text-sm text-[#1C1A17] transition-colors hover:bg-[#E6D9BE] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <span className="font-mono text-xs tabular-nums">{item.generation}ª</span> · {item.region}
        </button>
      ))}
    </nav>
  );
}
