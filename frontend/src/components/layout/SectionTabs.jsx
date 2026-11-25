import { memo } from 'react';
import { SECTIONS, sectionHref } from '../../navigation/sections';
import { BrushUnderline } from '../InkDecor';

/**
 * Navegação principal: as abas em texto, a ativa marcada pela pincelada na tinta da seção.
 * No celular vira um bloco com os ícones de todas as seções; `compact` esconde os rótulos ao rolar.
 * Até lg os rótulos são os curtos: os nomes completos das sete abas não cabem em uma linha.
 */
function SectionTabs({ activeId, compact = false, className = '' }) {
  return (
    <nav aria-label="Seções" className={`flex justify-center ${className}`}>
      <ul className="header-menu-stroke grid w-full grid-cols-7 gap-0.5 sm:flex sm:w-auto sm:items-center sm:gap-1 xl:gap-0.5 min-[1536px]:gap-1">
        {SECTIONS.map((section) => {
          const { id, label, shortLabel, icon: Icon, pigment } = section;
          const active = id === activeId;
          return (
            <li key={id} className="min-w-0">
              <a
                href={sectionHref(section)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 rounded-[3px] px-1 pb-2 pt-1.5 font-reading transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-pistachio/70 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 xl:px-2 min-[1536px]:px-3 ${
                  active ? 'font-semibold text-header-ink' : 'font-medium text-header-ink hover:underline hover:decoration-header-ink/50 hover:underline-offset-[6px]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" style={active ? { color: pigment } : undefined} aria-hidden="true" />
                <span className={`truncate text-[10px] leading-none sm:text-[13px] lg:hidden ${compact ? 'sr-only' : ''}`}>{shortLabel}</span>
                <span className="hidden whitespace-nowrap text-[15px] leading-none lg:inline">{label}</span>
                <BrushUnderline color={pigment} active={active} className="inset-x-3 bottom-0.5 h-[4px] w-[calc(100%-1.5rem)]" />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default memo(SectionTabs);
