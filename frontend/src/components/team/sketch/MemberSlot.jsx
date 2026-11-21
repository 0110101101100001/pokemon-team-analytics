import { forwardRef, memo, useEffect, useRef } from 'react';
import { ArrowLeftRight, Lock, LockOpen } from 'lucide-react';
import { thumbnailSpriteUrl } from '../../../services/api';
import { formatSlug } from '../../../utils/filters';

/** Menu de um membro: fixar/destravar e trocar. Fecha com Esc ou clique fora; o foco volta ao sprite. */
function MemberMenu({ member, onToggleLock, onSwap, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const onPointer = (event) => { if (ref.current && !ref.current.parentElement.contains(event.target)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  const item = 'flex w-full cursor-pointer items-center gap-2 rounded-sketch px-2.5 py-1.5 text-left text-xs font-semibold text-smeargle-text hover:bg-olive/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';
  return (
    <div ref={ref} role="menu" aria-label={`Ações para ${formatSlug(member.pokemon.name)}`} className="absolute left-1/2 top-full z-20 mt-1 w-40 -translate-x-1/2 rounded-[4px] border border-ink/20 bg-paper p-1 shadow-[3px_3px_0_#4A463E]">
      <button type="button" role="menuitem" onClick={onToggleLock} className={item}>
        {member.locked ? <LockOpen className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        {member.locked ? 'Destravar' : 'Fixar'}
      </button>
      <button type="button" role="menuitem" onClick={onSwap} disabled={member.locked} title={member.locked ? 'Destrave para trocar' : undefined} className={item}>
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
        Trocar…
      </button>
      {member.locked && <p className="px-2.5 pb-1 text-[10px] italic text-smeargle-textDim">Destrave para trocar</p>}
    </div>
  );
}

/** Sprite de um membro do esboço como botão: cadeado quando fixo, selo "seu" quando veio do rascunho. */
const MemberSlot = forwardRef(function MemberSlot({ member, menuOpen, changed, onOpenMenu, onCloseMenu, onToggleLock, onSwap }, ref) {
  const name = formatSlug(member.pokemon.name);
  return (
    <li className="relative flex min-w-0 flex-col items-center gap-0.5">
      <button
        ref={ref}
        type="button"
        data-sketch-slot
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`${name}${member.fromSeed ? ' (seu rascunho)' : ''}${member.locked ? ', fixo' : ''}: abrir ações`}
        onClick={menuOpen ? onCloseMenu : onOpenMenu}
        className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-sketch border transition-[box-shadow,border-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt sm:h-14 sm:w-14 ${
          member.fromSeed ? 'border-dashed border-umber/35 bg-transparent' : 'border-ink/25 bg-paper shadow-card'
        } ${member.locked ? 'ring-1 ring-umber/40' : 'hover:border-ink/55'} ${changed ? 'motion-safe:animate-pulse ring-2 ring-olive' : ''}`}
      >
        <img
          src={thumbnailSpriteUrl(member.pokemon.id)}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          className={`h-11 w-11 object-contain sm:h-12 sm:w-12 ${member.fromSeed ? 'opacity-60 grayscale-[30%]' : ''}`}
        />
        {member.locked && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-umber text-paper shadow" aria-hidden="true">
            <Lock className="h-3 w-3" />
          </span>
        )}
        {member.fromSeed && (
          <span className="absolute -bottom-1.5 rounded-[3px] bg-umber px-1.5 font-hand text-[11px] leading-4 text-paper">seu</span>
        )}
      </button>
      <span className={`w-full truncate text-center font-serif text-[10px] ${member.fromSeed ? 'text-smeargle-textDim/70' : 'font-semibold text-smeargle-text'}`}>
        {name}
      </span>
      {menuOpen && <MemberMenu member={member} onToggleLock={onToggleLock} onSwap={onSwap} onClose={onCloseMenu} />}
    </li>
  );
});

export default memo(MemberSlot);
