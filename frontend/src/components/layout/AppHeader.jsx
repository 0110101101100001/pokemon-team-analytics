import { Suspense, lazy, memo, useCallback, useMemo, useRef, useState } from 'react';
import SectionTabs from './SectionTabs';
import { InkEdge, PaintSpeckle } from '../InkDecor';
import ProfileAvatar from '../profile/ProfileAvatar';
import { useProfilePokemon } from '../../hooks/useProfilePokemon';
import { profileAccount } from '../../utils/profileAccount';
import { DEFAULT_SECTION, sectionHref } from '../../navigation/sections';
import { supabase } from '../../services/supabase';

// As configurações só abrem por ação do usuário (ou link): ficam fora do pacote inicial.
const AccountSettings = lazy(() => import('../account/AccountSettings'));

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
 *
 * Canto direito: o cartão da conta (avatar, nome, entrar ou sair) e Sobre. De xl em diante o grupo reserva sempre 261px e o que passa disso
 * avança sobre a folga até o menu, que assim fica no mesmo lugar com ou sem conta. O grupo tem de caber em 270px até
 * 1699px e em 365px depois: por isso, nas faixas apertadas, os rótulos perdem o ícone (.header-action-icon).
 */
function AppHeader({
  activeId, collapsed, toolbarRef, profilePool, profileUser, onProfileError, onLogin, accountAction, children,
  accountTab, onOpenAccount, onAccountTab, onCloseAccount, onOpenTeam, onCreateTeam, theme, onChooseTheme,
}) {
  const [profileId, chooseProfile, profileStatus] = useProfilePokemon(profileUser?.id ?? null, onProfileError);
  const account = useMemo(() => profileAccount(profileUser), [profileUser]);
  const avatarRef = useRef(null);
  const [signingOut, setSigningOut] = useState(false);
  const openAccount = useCallback(() => onOpenAccount('perfil'), [onOpenAccount]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    onCloseAccount();
  }, [onCloseAccount]);

  return (
    <header className="header-paper sticky top-0 z-40 bg-header text-header-ink">
      <div aria-hidden="true" className="header-texture pointer-events-none absolute inset-0 -z-10" />
      {/* Respingos no creme da logo, só nas bordas livres: nunca atrás da logo, de texto ou da busca. Somem no celular. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block">
        <PaintSpeckle variant={0} className="absolute -top-1 left-0 h-8 w-8 -translate-x-1/3 opacity-40" />
        <PaintSpeckle variant={1} className="absolute bottom-1 left-0 h-6 w-6 -translate-x-1/4 rotate-180 opacity-30" />
        <PaintSpeckle variant={2} className="absolute right-0 top-[18%] h-8 w-8 translate-x-1/3 -rotate-12 opacity-40" />
        <PaintSpeckle variant={1} className="absolute -bottom-1 right-0 h-7 w-7 translate-x-1/3 rotate-45 opacity-30" />
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

          <div className="order-2 ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-2 xl:order-3 xl:ml-0 xl:w-[261px] xl:gap-1.5 min-[1700px]:gap-2">
            <ProfileAvatar
              id={profileId}
              account={account}
              signedIn={Boolean(profileUser)}
              compact={collapsed}
              onOpen={profileUser ? openAccount : onLogin}
              action={accountAction}
              buttonRef={avatarRef}
            />
            {children}
          </div>
        </div>

        {/* flow-root: a margem da faixa fica aqui dentro, e as pinceladas nunca sobem até a logo e o menu. */}
        <div className="relative flow-root">
          <span aria-hidden="true" className="header-brush header-brush-left" />
          <span aria-hidden="true" className="header-brush header-brush-right" />
          <div ref={toolbarRef} className="mt-2 w-full empty:hidden sm:mt-3" />
        </div>
      </div>

      <InkEdge className="absolute left-0 top-full -mt-px" />

      {accountTab && profileUser && (
        <Suspense fallback={null}>
          <AccountSettings
            tab={accountTab}
            onTabChange={onAccountTab}
            onClose={onCloseAccount}
            returnFocusRef={avatarRef}
            account={account}
            profile={{
              pool: profilePool, selectedId: profileId, saveStatus: profileStatus, onChoose: chooseProfile, onSignOut: signOut, signingOut,
            }}
            teams={{ userId: profileUser.id, onOpenTeam, onCreateTeam }}
            appearance={{ theme, onChooseTheme }}
          />
        </Suspense>
      )}
    </header>
  );
}

export default memo(AppHeader);
