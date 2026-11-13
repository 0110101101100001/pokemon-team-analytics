import { memo } from 'react';
import { SECTIONS, sectionHref } from '../../navigation/sections';

// Traço rápido e discreto sob a aba ativa: cresce da esquerda para a direita, como uma pincelada leve.
function BrushStroke({ color, active }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-3 bottom-1 h-[3px] w-[calc(100%-1.5rem)] origin-left transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none sm:inset-x-4 sm:bottom-1 sm:w-[calc(100%-2rem)] ${
        active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      }`}
    >
      <path
        fill={color}
        d="M2 6.1C14 3.3 27 2.5 41 3.1c13 .6 24 1.8 38 1.2 13-.6 25-2.3 38-1.5 1.7.1 2 2.4.3 2.9-12 3.5-25 3.2-38 3.5-14 .3-27-1-41-.7-12 .3-23 1.7-35 1.2C.9 9.6.3 6.5 2 6.1z"
      />
    </svg>
  );
}


/**
 * Navegação principal, agrupada num estojo em pílula (fundo escuro translúcido e borda fina clara).
 * No celular vira um bloco com os cinco ícones; `compact` esconde os rótulos ao rolar.
 */
function SectionTabs({ activeId, compact = false, className = '' }) {
  return (
    <nav aria-label="Seções" className={`flex justify-center ${className}`}>
      <ul className="grid w-full grid-cols-5 gap-0.5 rounded-2xl border border-[#F7F3EE]/20 bg-[#3E2A1F]/35 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)] sm:flex sm:w-auto sm:items-center sm:gap-0.5 sm:rounded-full">
        {SECTIONS.map((section) => {
          const { id, label, shortLabel, icon: Icon, pigment } = section;
          const active = id === activeId;
          return (
            <li key={id} className="min-w-0">
              <a
                href={sectionHref(section)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-1 pb-2 pt-1.5 font-serif font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2 ${
                  active ? 'bg-[#F7F3EE]/[0.13] text-[#FFFDF9]' : 'text-[#F7F3EE]/80 hover:bg-[#F7F3EE]/[0.07] hover:text-[#FFFDF9]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" style={active ? { color: pigment } : undefined} aria-hidden="true" />
                <span className={`truncate text-[10px] leading-none sm:hidden ${compact ? 'sr-only' : ''}`}>{shortLabel}</span>
                <span className="hidden whitespace-nowrap text-[13px] leading-none tracking-wide sm:inline">{label}</span>
                <BrushStroke color={pigment} active={active} />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default memo(SectionTabs);
