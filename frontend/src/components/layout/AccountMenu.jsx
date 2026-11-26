import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookMarked, Loader2, LogOut, Palette, Swords, UserRound } from 'lucide-react';
import ProfilePhoto from '../profile/ProfilePhoto';

// Itens do menu da conta, na ordem: cada um abre o modal das configurações numa aba (ids de account/accountTabs.js).
const TAB_ITEMS = [
  { tab: 'perfil', label: 'Configurações da conta', icon: UserRound },
  { tab: 'times', label: 'Times salvos', icon: Swords },
  { tab: 'builds', label: 'Builds salvas', icon: BookMarked },
  { tab: 'aparencia', label: 'Aparência', icon: Palette },
];

const ITEM_CLASS =
  'flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-[3px] px-3 text-left font-reading text-[15px] text-ink transition-colors hover:bg-ink/[0.07] focus:outline-none focus-visible:bg-ink/[0.07] focus-visible:ring-2 focus-visible:ring-accent-text disabled:cursor-wait disabled:opacity-60';

/**
 * Menu da conta no header (logado): só o avatar, que abre um menu ancorado à direita com o nome e o e-mail,
 * os atalhos para as configurações e Sair. Padrão de menu do WAI-ARIA: setas ↑↓ e Home/End andam pelos itens,
 * Esc, clique fora e escolher um item fecham, e o foco volta ao avatar.
 */
function AccountMenu({ profileId, iconStyle, account, compact, onOpenAccount, onSignOut, signingOut, buttonRef }) {
  const [open, setOpen] = useState(false);
  const ids = useId();
  const rootRef = useRef(null);
  const itemsRef = useRef([]);
  const fallbackRef = useRef(null);
  const avatarRef = buttonRef ?? fallbackRef;

  const focusItem = useCallback((index) => {
    const items = itemsRef.current.filter(Boolean);
    if (!items.length) return;
    items[(index + items.length) % items.length].focus();
  }, []);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) avatarRef.current?.focus();
  }, [avatarRef]);

  // Ao abrir, o foco vai para o primeiro item (ou o último, se aberto com ↑).
  const openWith = useCallback((at) => {
    setOpen(true);
    requestAnimationFrame(() => focusItem(at));
  }, [focusItem]);

  // Clique ou toque fora fecha, sem roubar o foco de onde a pessoa clicou.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const onAvatarKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openWith(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openWith(-1);
    }
  };

  const onMenuKeyDown = (event) => {
    const items = itemsRef.current.filter(Boolean);
    const current = items.indexOf(document.activeElement);
    const moves = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: items.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      focusItem(moves[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      // Tab sai do menu: fecha e deixa o foco seguir o caminho normal da página.
      close(false);
    }
  };

  const choose = (action) => {
    close();
    action();
  };

  let index = 0;
  const register = (node) => {
    itemsRef.current[index] = node;
    index += 1;
  };
  itemsRef.current = [];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={avatarRef}
        type="button"
        onClick={() => (open ? close() : openWith(0))}
        onKeyDown={onAvatarKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${ids}-menu` : undefined}
        aria-label={`Menu da conta de ${account.name}`}
        title={account.name}
        data-compact={compact ? '' : undefined}
        className="profile-avatar account-avatar account-menu-avatar"
      >
        <ProfilePhoto id={profileId} initial={account.initial} iconStyle={iconStyle} />
      </button>

      {open && (
        <div
          id={`${ids}-menu`}
          role="menu"
          aria-label="Conta"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-[6px] border-[1.5px] border-ink bg-surface p-1.5 text-ink shadow-panel animate-fade-in motion-reduce:animate-none"
        >
          <div role="none" className="flex items-center gap-2.5 px-2 pb-2 pt-1">
            <span className="profile-avatar !h-9 !w-9 shrink-0" aria-hidden="true">
              <ProfilePhoto id={profileId} initial={account.initial} iconStyle={iconStyle} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-[15px] font-bold text-ink" title={account.name}>{account.name}</span>
              {account.email && <span className="block truncate text-xs text-muted" title={account.email}>{account.email}</span>}
            </span>
          </div>
          <div role="none" className="mb-1 border-t border-line" />
          {TAB_ITEMS.map(({ tab, label, icon: Icon }) => (
            <button key={tab} ref={register} type="button" role="menuitem" tabIndex={-1} onClick={() => choose(() => onOpenAccount(tab))} className={ITEM_CLASS}>
              <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              {label}
            </button>
          ))}
          <div role="separator" className="my-1 border-t border-line" />
          <button ref={register} type="button" role="menuitem" tabIndex={-1} onClick={() => choose(onSignOut)} disabled={signingOut} className={ITEM_CLASS}>
            {signingOut ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(AccountMenu);
