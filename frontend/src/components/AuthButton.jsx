import { memo, useCallback, useState } from 'react';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

const ICON = 'h-4 w-4 shrink-0';

/** Entrar ou sair, dentro do cartão da conta. Onde não cabe, o rótulo some (index.css) e fica o nome acessível. */
function AuthButton({ session, onOpen }) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }, []);

  if (!session) {
    return (
      <button type="button" onClick={onOpen} aria-label="Entrar" title="Entrar" className="account-action">
        <LogIn className={ICON} aria-hidden="true" />
        <span className="account-action-label">Entrar</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Sair" title="Sair" className="account-action">
      {signingOut ? <Loader2 className={`${ICON} animate-spin`} aria-hidden="true" /> : <LogOut className={ICON} aria-hidden="true" />}
      <span className="account-action-label">Sair</span>
    </button>
  );
}

export default memo(AuthButton);
