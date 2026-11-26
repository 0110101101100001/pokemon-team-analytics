import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { REFERENCE_GROUP, SECTIONS, sectionHref } from '../../navigation/sections';
import { BrushUnderline } from '../InkDecor';

const LINK_CLASS = 'relative flex flex-col items-center gap-1 rounded-[3px] px-1 pb-2 pt-1.5 font-reading transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-pistachio/70 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 xl:px-2 min-[1536px]:px-3';
const stateClass = (active) => (active
  ? 'font-semibold text-header-ink'
  : 'font-medium text-header-ink hover:underline hover:decoration-header-ink/50 hover:underline-offset-[6px]');

const groupSections = SECTIONS.filter((section) => REFERENCE_GROUP.sectionIds.includes(section.id));
const firstOfGroup = groupSections[0]?.id;

/** Uma aba do menu: ícone, rótulo curto até lg e completo dali em diante, e a pincelada da ativa. */
function SectionLink({ section, active, compact }) {
  const { label, shortLabel, icon: Icon, pigment } = section;
  return (
    <a href={sectionHref(section)} aria-current={active ? 'page' : undefined} className={`${LINK_CLASS} ${stateClass(active)}`}>
      <Icon className="h-4 w-4 shrink-0" style={active ? { color: pigment } : undefined} aria-hidden="true" />
      <span className={`truncate text-[10px] leading-none sm:text-[13px] lg:hidden ${compact ? 'sr-only' : ''}`}>{shortLabel}</span>
      <span className="hidden whitespace-nowrap text-[15px] leading-none lg:inline">{label}</span>
      <BrushUnderline color={pigment} active={active} className="inset-x-3 bottom-0.5 h-[4px] w-[calc(100%-1.5rem)]" />
    </a>
  );
}

/**
 * "Referência": Movimentos, Habilidades, Itens e Tipos num menu suspenso (padrão de divulgação: botão com
 * aria-expanded e uma lista de links). Esc fecha e devolve o foco ao botão, clique fora fecha, ↑↓ andam pelos links.
 * Com uma das abas do grupo aberta, o botão fica marcado com a tinta dela.
 */
function ReferenceMenu({ activeId }) {
  const [open, setOpen] = useState(false);
  const ids = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const linksRef = useRef([]);
  const active = groupSections.find((section) => section.id === activeId) ?? null;
  const { icon: Icon, label } = REFERENCE_GROUP;

  const close = useCallback((returnFocus) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  const focusLink = (index) => {
    const links = linksRef.current.filter(Boolean);
    links[(index + links.length) % links.length]?.focus();
  };

  // Clique fora fecha; trocar de aba (o hash muda) também.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close(false);
    };
    const onHashChange = () => close(false);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [open, close]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    const links = linksRef.current.filter(Boolean);
    const current = links.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        setOpen(true);
        requestAnimationFrame(() => focusLink(step > 0 ? 0 : -1));
      } else {
        focusLink(current < 0 ? (step > 0 ? 0 : -1) : current + step);
      }
    }
  };

  // Foco saiu do grupo (Tab): fecha sem puxar o foco de volta.
  const onBlur = (event) => {
    if (open && !rootRef.current?.contains(event.relatedTarget)) close(false);
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${ids}-referencia`}
        onClick={() => setOpen((current) => !current)}
        className={`${LINK_CLASS} cursor-pointer ${stateClass(Boolean(active))}`}
      >
        <Icon className="h-4 w-4 shrink-0" style={active ? { color: active.pigment } : undefined} aria-hidden="true" />
        <span className="whitespace-nowrap text-[13px] leading-none lg:text-[15px]">
          {label}
          {active && <span className="sr-only">: {active.label} aberta</span>}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        <BrushUnderline color={active?.pigment ?? 'transparent'} active={Boolean(active)} className="inset-x-3 bottom-0.5 h-[4px] w-[calc(100%-1.5rem)]" />
      </button>
      <ul
        id={`${ids}-referencia`}
        hidden={!open}
        className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 rounded-[6px] border-[1.5px] border-ink bg-surface p-1.5 text-ink shadow-panel animate-fade-in motion-reduce:animate-none"
      >
        {groupSections.map((section, index) => {
          const { id, label: name, icon: ItemIcon, pigment } = section;
          const isActive = id === activeId;
          return (
            <li key={id}>
              <a
                ref={(node) => { linksRef.current[index] = node; }}
                href={sectionHref(section)}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => close(false)}
                className={`flex min-h-10 items-center gap-2.5 rounded-[3px] px-3 font-reading text-[15px] transition-colors hover:bg-ink/[0.07] focus:outline-none focus-visible:bg-ink/[0.07] focus-visible:ring-2 focus-visible:ring-accent-text ${
                  isActive ? 'font-semibold' : ''
                }`}
              >
                <ItemIcon className="h-4 w-4 shrink-0" style={{ color: isActive ? pigment : undefined }} aria-hidden="true" />
                {name}
                {isActive && <span className="ml-auto h-2 w-2 rounded-full" style={{ backgroundColor: pigment }} aria-hidden="true" />}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Navegação principal: as abas em texto, a ativa marcada pela pincelada na tinta da seção.
 * No celular é um bloco com os ícones de todas as seções (`compact` esconde os rótulos ao rolar); do sm em diante,
 * as abas de consulta (REFERENCE_GROUP) entram no menu "Referência" para as oito caberem sem se espremer.
 */
function SectionTabs({ activeId, compact = false, className = '' }) {
  return (
    <nav aria-label="Seções" className={`relative z-20 flex justify-center ${className}`}>
      <ul className="header-menu-stroke grid w-full grid-cols-8 gap-0.5 sm:hidden">
        {SECTIONS.map((section) => (
          <li key={section.id} className="min-w-0">
            <SectionLink section={section} active={section.id === activeId} compact={compact} />
          </li>
        ))}
      </ul>
      <ul className="header-menu-stroke hidden items-center gap-1 sm:flex xl:gap-0.5 min-[1536px]:gap-1">
        {SECTIONS.map((section) => {
          if (REFERENCE_GROUP.sectionIds.includes(section.id)) {
            return section.id === firstOfGroup ? <li key={REFERENCE_GROUP.id}><ReferenceMenu activeId={activeId} /></li> : null;
          }
          return (
            <li key={section.id} className="min-w-0">
              <SectionLink section={section} active={section.id === activeId} compact={compact} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default memo(SectionTabs);
