import { memo } from 'react';
import SectionTabs from './SectionTabs';
import { InkEdge, PaintSpeckle } from '../InkDecor';
import { DEFAULT_SECTION, sectionHref } from '../../navigation/sections';

const EASE = 'transition-[padding,margin,width,height,max-height,opacity,font-size] duration-300 max-md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/*
  Marca: no topo, a logo completa (public/logo-header-*: a logo-principal sem a margem transparente, 372 × 96,
  2x = 744 × 192); com o header recolhido, e sempre no celular, a logo reduzida (public/logo-reduzida-header-*,
  233 × 44, 2x = 466 × 88), em traço claro sobre o marrom.
  As duas camadas ficam sobrepostas e trocam por opacidade; a escondida ganha `invisible`, que a tira também
  da leitura de tela. As imagens são definidas pela altura; a caixa repete a largura só para animar a troca.
  Logo com 96px de altura (372px) onde cabe: de lg a xl o menu desce para a linha de baixo, e marca, menu e
  botões cabem numa linha a partir de 1440px; de 1340 a 1439px ela fica com 64px e de 1280 a 1339px, com 52px.
  Até 1535px o espaço entre marca, abas e botões encolhe (SectionTabs e gap da linha) para nada passar da borda.
  Logo reduzida: 44px no desktop recolhido; 34px no celular, para caber na linha de 380px (tela de 412px)
  ao lado dos botões, com 8px entre eles.
*/
const BOX = {
  collapsed: 'h-[34px] w-[180px] sm:h-11 sm:w-[233px] xl:h-10 xl:w-[212px] min-[1340px]:h-11 min-[1340px]:w-[233px]',
  open: 'h-[34px] w-[180px] sm:h-[52px] sm:w-[202px] lg:h-24 lg:w-[372px] xl:h-[52px] xl:w-[202px] min-[1340px]:h-16 min-[1340px]:w-[248px] min-[1440px]:h-24 min-[1440px]:w-[372px]',
};
const SHOWN = 'visible opacity-100 scale-100';
const HIDDEN = 'invisible opacity-0 scale-90';
const LAYER = 'transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

function BrandMark({ collapsed }) {
  return (
    <span className={`relative block ${EASE} ${collapsed ? BOX.collapsed : BOX.open}`}>
      <img
        src="/logo-header-1x.png"
        srcSet="/logo-header-1x.png 1x, /logo-header-2x.png 2x"
        alt="Smearglepedia — guia de campo competitivo"
        width={372}
        height={96}
        decoding="async"
        className={`absolute left-0 top-0 h-full w-auto max-w-none origin-left ${LAYER} ${HIDDEN} ${collapsed ? '' : 'sm:visible sm:scale-100 sm:opacity-100'}`}
      />
      <img
        src="/logo-reduzida-header-1x.png"
        srcSet="/logo-reduzida-header-1x.png 1x, /logo-reduzida-header-2x.png 2x"
        alt="Smearglepedia"
        width={233}
        height={44}
        decoding="async"
        className={`absolute left-0 top-0 h-full w-auto max-w-none origin-left ${LAYER} ${SHOWN} ${
          collapsed ? '' : 'sm:invisible sm:scale-90 sm:opacity-0'
        }`}
      />
    </span>
  );
}

/**
 * Header fixo pintado a nanquim: marca, abas das seções e as ações passadas em `children` na primeira faixa;
 * logo abaixo, em toda a largura, a zona de controle da seção ativa. Os filtros não moram aqui: `toolbarRef`
 * expõe um espaço vazio que a seção preenche com <HeaderToolbar>; se a seção não tem filtros, o espaço some.
 */
function AppHeader({ activeId, collapsed, toolbarRef, children }) {
  return (
    <header className="sticky top-0 z-40 bg-umber text-page">
      {/* Respingos claros de ateliê, atrás de tudo, presos às bordas: atrás de texto eles derrubam o contraste. Somem no celular, onde o header é estreito. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block">
        <PaintSpeckle variant={0} color="#F7F3EE" className="absolute left-[31%] top-0 h-12 w-12 -translate-y-[58%] opacity-50" />
        <PaintSpeckle variant={1} color="#F2D9B8" className="absolute right-[11%] top-0 h-10 w-10 -translate-y-1/2 rotate-45 opacity-50" />
        <PaintSpeckle variant={2} color="#DCEBCF" className="absolute right-0 top-[42%] h-14 w-14 translate-x-1/2 -rotate-12 opacity-45" />
        <PaintSpeckle variant={1} color="#E3D8F0" className="absolute left-[56%] top-0 h-9 w-9 -translate-y-1/2 rotate-[200deg] opacity-45" />
      </div>
      <div className={`relative mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 ${EASE} ${collapsed ? 'py-1.5' : 'py-2 sm:py-3 lg:py-1'}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3 xl:flex-nowrap xl:gap-x-3 min-[1536px]:gap-x-6">
          <h1 className="order-1 m-0 min-w-0 sm:shrink-0">
            <a
              href={sectionHref(DEFAULT_SECTION)}
              className="block rounded-sketch focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-pistachio/70"
            >
              <BrandMark collapsed={collapsed} />
            </a>
          </h1>

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
