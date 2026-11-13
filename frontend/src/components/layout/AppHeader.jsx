import { memo } from 'react';
import SmeargleMascote from '../SmeargleMascote';
import SectionTabs from './SectionTabs';
import { InkEdge, InkSplatter } from '../InkDecor';
import { DEFAULT_SECTION, sectionHref } from '../../navigation/sections';

const EASE = 'transition-[padding,margin,width,max-height,opacity,font-size] duration-300 max-md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/**
 * Header fixo pintado a nanquim: marca, abas das seções e as ações passadas em `children`.
 * Os filtros não moram aqui: `toolbarRef` expõe um espaço vazio que a seção ativa preenche
 * com <HeaderToolbar>; se a seção não tem filtros, o espaço some.
 */
function AppHeader({ activeId, collapsed, toolbarRef, children }) {
  return (
    <header className="sticky top-0 z-40 bg-[#2A2421] text-[#F7F3EE]">
      <InkSplatter className="hidden md:block absolute -top-10 right-[10%] h-36 w-36 rotate-12 opacity-[0.12]" color="#829b72" />
      <InkSplatter className="hidden md:block absolute -bottom-8 left-[30%] h-20 w-20 -rotate-45 opacity-[0.1]" color="#785132" />

      <div className={`relative mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 ${EASE} ${collapsed ? 'py-1.5' : 'py-2 sm:py-3'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 xl:flex-nowrap xl:gap-x-6">
          {/* O mascote é um botão (alterna o shiny): fica fora do link da marca. */}
          <div className="order-1 flex min-w-0 items-center gap-3 sm:shrink-0">
            <div className={`hidden shrink-0 overflow-hidden md:block ${EASE} ${collapsed ? '-mr-3 w-0 opacity-0' : 'w-16 opacity-100'}`}>
              <SmeargleMascote className="m-1" />
            </div>
            <a
              href={sectionHref(DEFAULT_SECTION)}
              aria-label="Smearglepedia: ir para a Pokédex"
              className="block min-w-0 rounded-xl px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70"
            >
              <h1 className={`font-serif font-black leading-none tracking-tight text-[#FFFDF9] ${EASE} ${collapsed ? 'text-lg sm:text-xl' : 'text-xl sm:text-[1.75rem]'}`}>
                Smeargle
                <span className="relative isolate text-[#B7D99F]">
                  pedia
                  {/* A ponta da cauda do Smeargle: uma pincelada de tinta sob "pedia". */}
                  <svg aria-hidden="true" viewBox="0 0 100 12" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 -z-10 h-2 w-full text-[#829b72]">
                    <path fill="currentColor" opacity="0.75" d="M1 7c18-4 40-5 62-4 13 .5 24 1.5 34 .5 2 0 3 3 1 4-14 3-34 2-52 3-15 1-29 2-42 1C0 11 0 8 1 7z" />
                  </svg>
                </span>
              </h1>
              <p className={`hidden overflow-hidden font-hand text-base leading-none text-[#F7F3EE]/65 sm:block ${EASE} ${collapsed ? 'mt-0 max-h-0 opacity-0' : 'mt-1.5 max-h-5 opacity-100'}`}>
                guia de campo competitivo
              </p>
            </a>
          </div>

          <SectionTabs activeId={activeId} compact={collapsed} className="order-3 w-full xl:order-2 xl:w-auto xl:flex-1" />

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:order-3 xl:ml-0">{children}</div>
        </div>

        <div ref={toolbarRef} className="mx-auto mt-1.5 w-full max-w-4xl empty:hidden sm:mt-2.5" />
      </div>

      <InkEdge className="absolute left-0 top-full -mt-px" />
    </header>
  );
}

export default memo(AppHeader);
