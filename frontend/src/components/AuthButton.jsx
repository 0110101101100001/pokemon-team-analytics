import { memo, useCallback, useState } from 'react';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

const BASE_CLASS =
  'h-9 sm:h-10 inline-flex items-center gap-2 rounded-xl border border-[#F7F3EE]/30 bg-[#3E2A1F]/90 text-[#F7F3EE] shadow-inner transition-colors hover:border-[#F7F3EE]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70';

function Avatar({ user }) {
  const url = user.user_metadata?.avatar_url;
  if (url) return <img src={url} alt="" width={28} height={28} loading="lazy" decoding="async" className="h-7 w-7 rounded-full border border-[#F7F3EE]/40 object-cover" />;
  return (
    <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A4C294] font-serif text-sm font-bold uppercase text-[#2A1C14]">
      {user.email?.[0] ?? '?'}
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
        aria-label="Entrar / Cadastrar"
        className={`${BASE_CLASS} px-3 sm:px-4 text-xs font-serif font-semibold tracking-wide`}
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Entrar / Cadastrar</span>
      </button>
    );
  }

  const { user } = session;

  return (
    <div className={`${BASE_CLASS} pl-1.5 pr-1`}>
      <Avatar user={user} />
      <span className="hidden max-w-[10rem] truncate text-xs font-serif sm:inline" title={user.email}>{user.email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sair"
        title="Sair"
        className="rounded-lg p-1.5 text-[#F7F3EE]/80 transition-colors hover:bg-[#F7F3EE]/10 hover:text-[#F7F3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A4C294]/70 disabled:cursor-wait"
      >
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export default memo(AuthButton);
