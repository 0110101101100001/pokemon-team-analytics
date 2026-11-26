import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookMarked, Palette, Swords, UserRound, X } from 'lucide-react';
import ProfilePanel from '../profile/ProfilePanel';
import SavedTeamsPanel from './SavedTeamsPanel';
import MyBuilds from '../builds/MyBuilds';
import AppearancePanel from './AppearancePanel';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ACCOUNT_TABS } from './accountTabs';

const TAB_ICONS = { perfil: UserRound, times: Swords, builds: BookMarked, aparencia: Palette };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

// Tab e Shift+Tab giram dentro do diálogo.
function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const items = [...container.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Configurações da conta: Perfil, Times salvos, Builds salvas e Aparência. Navegação lateral no desktop e abas no topo no celular.
 * A aba aberta mora no endereço (App), então o link `?conta=aparencia` abre direto nela. Ao fechar, o foco volta
 * ao avatar do header (`returnFocusRef`).
 */
export default function AccountSettings({
  tab, onTabChange, onClose, returnFocusRef, account, profile, teams, appearance,
}) {
  const ids = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const tabRefs = useRef(new Map());
  useModalBehavior(onClose, closeRef);

  // Declarado depois do useModalBehavior: a limpeza roda depois e o foco termina no avatar.
  useEffect(() => {
    const target = returnFocusRef;
    return () => target?.current?.focus();
  }, [returnFocusRef]);

  const handleTabKeys = useCallback((event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = ACCOUNT_TABS.findIndex((candidate) => candidate.id === tab);
    const next = ACCOUNT_TABS[(index + step + ACCOUNT_TABS.length) % ACCOUNT_TABS.length];
    onTabChange(next.id);
    tabRefs.current.get(next.id)?.focus();
  }, [tab, onTabChange]);

  const panelId = `${ids}-painel`;
  const titleId = `${ids}-titulo`;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim p-2 animate-fade-in motion-reduce:animate-none sm:p-4 md:bg-scrim/80"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => trapFocus(event, dialogRef.current)}
        className="relative flex h-[min(92dvh,760px)] w-full max-w-5xl flex-col overflow-hidden paper-card font-reading shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-ink/15 px-4 py-3 sm:px-5">
          <h2 id={titleId} className="min-w-0 flex-1 truncate font-serif text-xl font-black text-ink sm:text-2xl">Configurações da conta</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink/60 text-ink transition-colors hover:bg-ink/5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="Seções da conta" className="shrink-0 border-b border-ink/15 md:w-56 md:border-b-0 md:border-r md:py-3">
            <div
              role="tablist"
              aria-labelledby={titleId}
              onKeyDown={handleTabKeys}
              className="flex md:flex-col"
            >
              {ACCOUNT_TABS.map(({ id, label, short }) => {
                const selected = id === tab;
                const Icon = TAB_ICONS[id];
                return (
                  <button
                    key={id}
                    ref={(node) => (node ? tabRefs.current.set(id, node) : tabRefs.current.delete(id))}
                    type="button"
                    role="tab"
                    id={`${ids}-aba-${id}`}
                    aria-selected={selected}
                    aria-controls={panelId}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onTabChange(id)}
                    className={`relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 px-2 text-sm transition-colors md:flex-none md:justify-start md:px-5 md:text-base ${
                      selected ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate md:hidden">{short ?? label}</span>
                    <span className="hidden truncate md:inline">{label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute bg-accent transition-opacity max-md:inset-x-3 max-md:bottom-0 max-md:h-[3px] md:inset-y-2 md:left-0 md:w-[3px] ${selected ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </button>
                );
              })}
            </div>
          </nav>

          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${ids}-aba-${tab}`}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 sm:p-5"
          >
            {tab === 'perfil' && <ProfilePanel account={account} {...profile} />}
            {tab === 'times' && <SavedTeamsPanel {...teams} />}
            {tab === 'builds' && <MyBuilds userId={profile.userId} pool={profile.pool} />}
            {tab === 'aparencia' && <AppearancePanel {...appearance} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
