import { Suspense, lazy, memo, useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import SectionTabs from './SectionTabs';
import { InkEdge, PaintSpeckle } from '../InkDecor';
import ProfileAvatar from '../profile/ProfileAvatar';
import AccountMenu from './AccountMenu';
import { useMeasureHeader } from './headerHeight';
import { useProfilePokemon } from '../../hooks/useProfilePokemon';
import { profileAccount } from '../../utils/profileAccount';
import { usePreferences } from '../../preferences/usePreferences';
import { DEFAULT_SECTION, sectionHref } from '../../navigation/sections';
import { supabase } from '../../services/supabase';
import { DEFAULT_THEME, THEME_LOGOS, logosFor } from '../../theme/themes';

// As configurações só abrem por ação do usuário (ou link): ficam fora do pacote inicial.
const AccountSettings = lazy(() => import('../account/AccountSettings'));

const EASE = 'transition-[padding,margin,width,height,max-height,opacity,font-size] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/*
  Marca, por tema (THEME_LOGOS em theme/themes.js): no topo, a logo completa (372 × 96, com 2x); com o header
  recolhido, e sempre no celular, a logo reduzida (emblema + "Smearglepedia", arquivo 3x de 300 × 64).
  As duas ficam montadas e já baixadas, sobrepostas, e trocam por opacidade em 200ms; a inativa leva aria-hidden e
  alt vazio (e `invisible`). As imagens são definidas pela altura; a caixa repete a largura só para animar a troca.
  Logo completa com 96px de altura onde cabe: de lg a xl o menu desce para a linha de baixo, e marca, menu e
  botões cabem numa linha a partir de 1440px; de 1340 a 1439px ela fica com 64px e de 1280 a 1339px, com 52px.
  Logo reduzida: 64px de altura (300px) onde o topo é mais alto que isso; 52px onde o topo também tem 52px
  (de 640 a 1023px e de 1280 a 1339px), para o header recolhido nunca ficar mais alto que o do topo. No celular,
  clamp(36px, 10vw, 64px) de altura: 41px numa tela de 412px, ao lado do avatar e do Sobre só com ícone.
*/
const PHONE_LOGO = 'h-[clamp(36px,10vw,64px)] w-[calc(clamp(36px,10vw,64px)*4.6875)]';
const BOX = {
  collapsed: `${PHONE_LOGO} sm:h-[52px] sm:w-[244px] lg:h-16 lg:w-[300px] xl:h-[52px] xl:w-[244px] min-[1340px]:h-16 min-[1340px]:w-[300px]`,
  open: `${PHONE_LOGO} sm:h-[52px] sm:w-[202px] lg:h-24 lg:w-[372px] xl:h-[52px] xl:w-[202px] min-[1340px]:h-16 min-[1340px]:w-[248px] min-[1440px]:h-24 min-[1440px]:w-[372px]`,
};
const SHOWN = 'visible opacity-100 scale-100';
const HIDDEN = 'invisible opacity-0 scale-95';
const LAYER = 'transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
const BRAND_ALT = 'Smearglepedia — guia de campo competitivo';

// O tema vem do atributo do <html>, que o script do <head> já definiu antes da primeira pintura: a logo nasce
// certa, sem esperar a sessão.
const subscribeTheme = (onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};
const readTheme = () => document.documentElement.dataset.theme || DEFAULT_THEME;

const PHONE_QUERY = '(max-width: 639px)';
const subscribePhone = (onChange) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const readPhone = () => window.matchMedia(PHONE_QUERY).matches;

function BrandMark({ collapsed }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme);
  const phone = useSyncExternalStore(subscribePhone, readPhone);
  // Arquivo que falhou neste tema: cai para o do Smeargle.
  const [failed, setFailed] = useState({ logo: null, reducedLogo: null });
  const pick = (kind) => (failed[kind] === theme ? THEME_LOGOS[DEFAULT_THEME] : logosFor(theme))[kind];
  const fallBack = (kind) => () => {
    if (theme !== DEFAULT_THEME) setFailed((current) => ({ ...current, [kind]: theme }));
  };
  const full = pick('logo');
  const reduced = pick('reducedLogo');
  const reducedActive = collapsed || phone;

  return (
    <span className={`relative block ${EASE} ${collapsed ? BOX.collapsed : BOX.open}`}>
      <img
        src={full.src}
        srcSet={`${full.src} 1x, ${full.src2x} 2x`}
        alt={reducedActive ? '' : BRAND_ALT}
        aria-hidden={reducedActive || undefined}
        width={full.width}
        height={full.height}
        decoding="async"
        onError={fallBack('logo')}
        className={`absolute left-0 top-0 h-full w-auto max-w-none origin-left ${LAYER} ${HIDDEN} ${collapsed ? '' : 'sm:visible sm:scale-100 sm:opacity-100'}`}
      />
      <img
        src={reduced.src}
        alt={reducedActive ? 'Smearglepedia' : ''}
        aria-hidden={reducedActive ? undefined : true}
        width={reduced.width}
        height={reduced.height}
        decoding="async"
        onError={fallBack('reducedLogo')}
        className={`absolute left-0 top-0 h-full w-auto max-w-none origin-left ${LAYER} ${SHOWN} ${
          collapsed ? '' : 'sm:invisible sm:scale-95 sm:opacity-0'
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
  accountTab, onOpenAccount, onAccountTab, onCloseAccount, onOpenTeam, onCreateTeam, theme, onChooseTheme, collections,
}) {
  const [profileId, chooseProfile, profileStatus] = useProfilePokemon(profileUser?.id ?? null, onProfileError);
  const { values: preferences } = usePreferences();
  const account = useMemo(() => profileAccount(profileUser, preferences.display_name), [profileUser, preferences.display_name]);
  const avatarRef = useRef(null);
  const headerRef = useRef(null);
  useMeasureHeader(headerRef);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    onCloseAccount();
  }, [onCloseAccount]);

  return (
    <header ref={headerRef} className="header-paper sticky top-0 z-40 bg-header text-header-ink">
      <div aria-hidden="true" className="header-texture pointer-events-none absolute inset-0 -z-10" />
      {/* Respingos no creme da logo, só nas bordas livres: nunca atrás da logo, de texto ou da busca. Somem no celular. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block">
        <PaintSpeckle variant={0} className="absolute -top-1 left-0 h-8 w-8 -translate-x-1/3 opacity-40" />
        <PaintSpeckle variant={1} className="absolute bottom-1 left-0 h-6 w-6 -translate-x-1/4 rotate-180 opacity-30" />
        <PaintSpeckle variant={2} className="absolute right-0 top-[18%] h-8 w-8 translate-x-1/3 -rotate-12 opacity-40" />
        <PaintSpeckle variant={1} className="absolute -bottom-1 right-0 h-7 w-7 translate-x-1/3 rotate-45 opacity-30" />
      </div>
      <div className={`relative mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 ${EASE} ${collapsed ? 'py-1' : 'py-2 sm:py-3 lg:py-1'}`}>
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
            {/* Logado: só o avatar, que abre o menu da conta. Visitante: o cartão com o convite e o botão Entrar. */}
            {profileUser ? (
              <AccountMenu
                profileId={profileId}
                account={account}
                compact={collapsed}
                onOpenAccount={onOpenAccount}
                onSignOut={signOut}
                signingOut={signingOut}
                buttonRef={avatarRef}
              />
            ) : (
              <ProfileAvatar
                id={profileId}
                account={account}
                signedIn={false}
                compact={collapsed}
                onOpen={onLogin}
                action={accountAction}
                buttonRef={avatarRef}
              />
            )}
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
              userId: profileUser.id, pool: profilePool, selectedId: profileId, saveStatus: profileStatus, onChoose: chooseProfile, onSignOut: signOut, signingOut,
            }}
            teams={{ userId: profileUser.id, onOpenTeam, onCreateTeam }}
            appearance={{ theme, onChooseTheme }}
            collections={collections}
          />
        </Suspense>
      )}
    </header>
  );
}

export default memo(AppHeader);
