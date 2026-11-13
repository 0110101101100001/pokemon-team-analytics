import { memo } from 'react';
import { SECTIONS, sectionHref } from '../../navigation/sections';

// A pincelada cresce da esquerda para a direita quando a aba fica ativa, como um traço de pincel.
function BrushStroke({ color, active }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-1 bottom-0 h-[6px] w-[calc(100%-0.5rem)] origin-left transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none sm:inset-x-2 sm:h-[7px] sm:w-[calc(100%-1rem)] ${
        active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      }`}
    >
      <path
        fill={color}
        d="M2 6.1C14 3.3 27 2.5 41 3.1c13 .6 24 1.8 38 1.2 13-.6 25-2.3 38-1.5 1.7.1 2 2.4.3 2.9-12 3.5-25 3.2-38 3.5-14 .3-27-1-41-.7-12 .3-23 1.7-35 1.2C.9 9.6.3 6.5 2 6.1z"
      />
      <circle cx="117" cy="8.6" r="1" fill={color} />
    </svg>
  );
}

/** Navegação principal. No celular vira uma barra de cinco ícones; `compact` esconde os rótulos ao rolar. */
function SectionTabs({ activeId, compact = false, className = '' }) {
  return (
    <nav aria-label="Seções" className={className}>
      <ul className="grid grid-cols-5 sm:flex sm:items-center sm:justify-center sm:gap-1">
        {SECTIONS.map((section) => {
          const { id, label, shortLabel, icon: Icon, pigment } = section;
          const active = id === activeId;
          return (
            <li key={id} className="min-w-0">
              <a
                href={sectionHref(section)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-1 pb-2 pt-1.5 font-serif font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 sm:flex-row sm:gap-2 sm:px-3 sm:pb-2.5 sm:pt-2 ${
                  active ? 'text-[#FFFDF9]' : 'text-[#F7F3EE]/60 hover:text-[#F7F3EE]'
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
