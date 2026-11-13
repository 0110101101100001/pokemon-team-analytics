import { memo } from 'react';
import SmeargleMascote from '../SmeargleMascote';
import SectionTabs from './SectionTabs';
import { InkSplash, InkSplatter, TornEdge } from '../InkDecor';
import { DEFAULT_SECTION, sectionHref } from '../../navigation/sections';

const EASE = 'transition-all duration-500 max-md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

// Celular: fundo opaco e sombra curta (blur e sombras longas pesam no scroll). md+: vidro e sombra longa.
const SURFACE = {
  collapsed: 'bg-[#78614E] shadow-md md:bg-[#78614E]/88 md:backdrop-blur-xl md:shadow-[0_18px_40px_-20px_rgba(38,26,19,0.7)]',
  expanded: 'bg-[#78614E] shadow-md md:bg-[#78614E]/96 md:backdrop-blur-md md:shadow-lg',
};

/**
 * Header fixo: marca, abas das seções e as ações passadas em `children`.
 * Os filtros não moram aqui: `toolbarRef` expõe um espaço vazio que a seção ativa preenche
 * com <HeaderToolbar>; se a seção não tem filtros, o espaço some.
 */
function AppHeader({ activeId, collapsed, toolbarRef, children }) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-[#261A13]/60 text-[#F7F3EE] ${EASE} ${collapsed ? SURFACE.collapsed : SURFACE.expanded}`}
    >
      <InkSplatter className="hidden md:block absolute -top-6 right-[8%] w-36 h-36 opacity-[0.14] mix-blend-multiply rotate-12" color="#2A1C14" />
      <InkSplatter className="hidden md:block absolute -bottom-10 left-[22%] w-24 h-24 opacity-[0.16] -rotate-45" color="#A4C294" />

      <div className={`relative mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 ${EASE} ${collapsed ? 'py-1.5' : 'py-2 sm:py-3'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 xl:flex-nowrap xl:gap-x-6">
          {/* O mascote fica fora do link: o embed do Tenor traz as próprias âncoras. */}
          <div className="order-1 flex min-w-0 items-center gap-3 sm:shrink-0">
            <div className={`hidden shrink-0 overflow-hidden md:block ${EASE} ${collapsed ? '-mr-3 w-0 opacity-0' : 'w-16 opacity-100'}`}>
              <SmeargleMascote />
            </div>
            <a
              href={sectionHref(DEFAULT_SECTION)}
              aria-label="Smearglepedia: ir para a Pokédex"
              className={`relative isolate block min-w-0 rounded-2xl px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 ${EASE} ${collapsed ? 'py-1' : 'py-1 sm:py-1.5'}`}
            >
              <InkSplash />
              <h1 className={`font-serif font-black leading-none tracking-tight text-[#FFFDF9] [text-shadow:0_1px_2px_rgba(38,26,19,0.35)] ${EASE} ${collapsed ? 'text-lg sm:text-xl' : 'text-xl sm:text-[1.7rem]'}`}>
                Smeargle<span className="text-[#B7D99F]">pedia</span>
              </h1>
              <p className={`hidden overflow-hidden font-hand text-base leading-none text-[#FFFDF9]/75 sm:block ${EASE} ${collapsed ? 'mt-0 max-h-0 opacity-0' : 'mt-1 max-h-5 opacity-100'}`}>
                caderno de campo competitivo
              </p>
            </a>
          </div>

          <SectionTabs activeId={activeId} compact={collapsed} className="order-3 w-full xl:order-2 xl:w-auto xl:flex-1" />

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:order-3 xl:ml-0">{children}</div>
        </div>

        <div ref={toolbarRef} className="mx-auto mt-1.5 w-full max-w-4xl empty:hidden sm:mt-2.5" />
      </div>

      <TornEdge className={`absolute left-0 top-full -mt-px text-[#78614E] ${EASE} ${collapsed ? 'opacity-[0.88]' : 'opacity-[0.96]'}`} />
    </header>
  );
}

export default memo(AppHeader);
