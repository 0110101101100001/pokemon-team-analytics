import { memo, useCallback, useState } from 'react';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';
import { HEADER_BUTTON_CLASS } from './layout/HeaderControls';

// O nome que aparece no header: o primeiro nome do perfil (Google), nunca o e-mail.
const firstName = (user) => (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '').trim().split(/\s+/)[0] || null;

function Avatar({ user }) {
  const url = user.user_metadata?.avatar_url;
  if (url) return <img src={url} alt="" width={28} height={28} loading="lazy" decoding="async" className="h-6 w-6 rounded-full border border-page/40 object-cover" />;
  return (
    <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-paint-pistachio font-reading text-sm font-bold uppercase text-ink">
      {(firstName(user) ?? user.email)?.[0] ?? '?'}
    </span>
  );
}

function AuthButton({ session, onOpen }) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }, []);

  if (!session) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={HEADER_BUTTON_CLASS}
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="sm:hidden">Entrar</span>
        <span className="hidden sm:inline">Entrar / Cadastrar</span>
      </button>
    );
  }

  const { user } = session;
  const name = firstName(user);

  return (
    <div className="inline-flex h-9 items-center gap-1.5 rounded-[3px] border-[1.5px] border-page/55 pl-1.5 pr-1 font-reading text-sm font-medium text-paper sm:h-10">
      <Avatar user={user} />
      {name && <span className="hidden max-w-[8rem] truncate sm:inline xl:max-w-[5rem] min-[1700px]:max-w-[8rem]">{name}</span>}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sair"
        title="Sair"
        className="rounded-[2px] p-1.5 text-page/80 transition-colors hover:bg-page/10 hover:text-page focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-pistachio/70 disabled:cursor-wait"
      >
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export default memo(AuthButton);
