import { memo } from 'react';
import SmeargleMascote from '../SmeargleMascote';
import SectionTabs from './SectionTabs';
import { InkEdge, InkStain, PaintSpeckle } from '../InkDecor';
import { DEFAULT_SECTION, sectionHref } from '../../navigation/sections';

const EASE = 'transition-[padding,margin,width,max-height,opacity,font-size] duration-300 max-md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/**
 * Header fixo pintado a nanquim: marca, abas das seções e as ações passadas em `children` na primeira faixa;
 * logo abaixo, em toda a largura, a zona de controle da seção ativa. Os filtros não moram aqui: `toolbarRef`
 * expõe um espaço vazio que a seção preenche com <HeaderToolbar>; se a seção não tem filtros, o espaço some.
 */
function AppHeader({ activeId, collapsed, toolbarRef, children }) {
  return (
    <header className="sticky top-0 z-40 bg-[#78614E] text-[#F7F3EE]">
      {/* Respingos claros de ateliê, atrás de tudo: perto das abas e da área de perfil. Somem no celular, onde o header é estreito. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block">
        <PaintSpeckle variant={0} color="#F7F3EE" className="absolute left-[31%] top-0 h-12 w-12 -translate-y-1/3 opacity-50" />
        <PaintSpeckle variant={1} color="#F2D9B8" className="absolute right-[11%] top-1 h-10 w-10 rotate-45 opacity-50" />
        <PaintSpeckle variant={2} color="#DCEBCF" className="absolute right-[2%] top-[42%] h-14 w-14 -rotate-12 opacity-45" />
        <PaintSpeckle variant={1} color="#E3D8F0" className="absolute left-[56%] top-[44%] h-9 w-9 rotate-[200deg] opacity-45 xl:top-[52%]" />
      </div>
      <div className={`relative mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 ${EASE} ${collapsed ? 'py-1.5' : 'py-2 sm:py-3'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 xl:flex-nowrap xl:gap-x-6">
          {/* O mascote é um botão (alterna o shiny): fica fora do link da marca. */}
          <div className="relative isolate order-1 flex min-w-0 items-center gap-3 sm:shrink-0">
            {/* Mancha de aquarela atrás da logo e do mascote. Some com o header recolhido: sem o mascote a área fica estreita e ela esticaria. */}
            <InkStain
              className={`-inset-x-5 -top-2.5 h-[calc(100%+1.75rem)] w-[calc(100%+2.75rem)] transition-opacity duration-300 motion-reduce:transition-none md:-inset-x-7 md:w-[calc(100%+3.5rem)] ${collapsed ? 'opacity-0' : 'opacity-100'}`}
            />
            <div className={`hidden shrink-0 overflow-hidden md:block ${EASE} ${collapsed ? '-mr-3 w-0 opacity-0' : 'w-[5.5rem] opacity-100'}`}>
              <SmeargleMascote className="m-1" />
            </div>
            <a
              href={sectionHref(DEFAULT_SECTION)}
              aria-label="Smearglepedia: ir para a Pokédex"
              className="block min-w-0 rounded-xl px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70"
            >
              <h1 className={`font-serif font-black leading-none tracking-tight text-[#FFFDF9] ${EASE} ${collapsed ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[2.4rem]'}`}>
                Smeargle
                <span className="relative isolate text-[#B7D99F]">
                  pedia
                  {/* A ponta da cauda do Smeargle: uma pincelada de tinta sob "pedia". */}
                  <svg aria-hidden="true" viewBox="0 0 100 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 -z-10 h-2.5 w-full text-[#829b72]">
                    <path fill="currentColor" opacity="0.75" d="M1 7c18-4 40-5 62-4 13 .5 24 1.5 34 .5 2 0 3 3 1 4-14 3-34 2-52 3-15 1-29 2-42 1C0 11 0 8 1 7z" />
                  </svg>
                </span>
              </h1>
              <p className={`hidden overflow-hidden font-hand text-lg leading-none text-[#F7F3EE]/80 sm:block ${EASE} ${collapsed ? 'mt-0 max-h-0 opacity-0' : 'mt-2 max-h-6 opacity-100'}`}>
                guia de campo competitivo
              </p>
            </a>
          </div>

          <SectionTabs activeId={activeId} compact={collapsed} className="order-3 w-full xl:order-2 xl:w-auto xl:flex-1" />

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:order-3 xl:ml-0">{children}</div>
        </div>

        <div ref={toolbarRef} className="mt-2 w-full empty:hidden sm:mt-3" />
      </div>

      <InkEdge className="absolute left-0 top-full -mt-px" />
    </header>
  );
}

export default memo(AppHeader);
