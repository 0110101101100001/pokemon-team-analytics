import { memo, useId, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { ErrorNote, PanelSection, SuccessNote } from './settingsUi';
import { supabase } from '../../services/supabase';
import { EMAIL_PATTERN, MIN_PASSWORD, authErrorMessage, passwordProblem } from '../../utils/accountSecurity';

function PasswordField({ label, value, onChange, autoComplete, describedBy }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          className="paper-field h-10 w-full pl-2 pr-10 text-base"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[3px] text-ink-soft hover:bg-ink/10"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button type="submit" disabled={busy} className="btn-action !h-10">
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/**
 * Troca de senha. Com "Secure password change" ligado no Supabase, um login antigo precisa de um código enviado
 * por e-mail (reauthenticate): o formulário pede o código e manda de novo com ele.
 */
function PasswordForm() {
  const hintId = useId();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [nonce, setNonce] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [state, setState] = useState({ busy: false, error: null, success: null });

  const submit = async (event) => {
    event.preventDefault();
    const problem = passwordProblem(password, confirmation);
    if (problem) {
      setState({ busy: false, error: problem, success: null });
      return;
    }
    setState({ busy: true, error: null, success: null });
    const { error } = await supabase.auth.updateUser(needsCode ? { password, nonce: nonce.trim() } : { password });
    if (error?.code === 'reauthentication_needed') {
      const sent = await supabase.auth.reauthenticate();
      setNeedsCode(true);
      setState({
        busy: false,
        error: sent.error ? authErrorMessage(sent.error) : null,
        success: sent.error ? null : 'Por segurança, enviamos um código para o seu e-mail. Digite-o abaixo e salve de novo.',
      });
      return;
    }
    if (error) {
      setState({ busy: false, error: authErrorMessage(error), success: null });
      return;
    }
    setPassword('');
    setConfirmation('');
    setNonce('');
    setNeedsCode(false);
    setState({ busy: false, error: null, success: 'Senha trocada. Use a nova no próximo login.' });
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-3">
      <ErrorNote>{state.error}</ErrorNote>
      <SuccessNote>{state.success}</SuccessNote>
      <PasswordField label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" describedBy={hintId} />
      <p id={hintId} className="-mt-2 text-xs italic text-umber">Pelo menos {MIN_PASSWORD} caracteres. Senhas longas e únicas são as mais seguras.</p>
      <PasswordField label="Repita a nova senha" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
      {needsCode && (
        <div>
          <label htmlFor={`${hintId}-codigo`} className="mb-1 block text-sm font-semibold text-ink">Código do e-mail</label>
          <input
            id={`${hintId}-codigo`}
            value={nonce}
            onChange={(event) => setNonce(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="paper-field h-10 w-40 px-2 font-mono text-base tracking-widest"
          />
        </div>
      )}
      <SubmitButton busy={state.busy}>Trocar senha</SubmitButton>
    </form>
  );
}

/** Troca de e-mail: o Supabase manda um link de confirmação (para o novo e, com "Secure email change", também para o atual). */
function EmailForm({ currentEmail }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, error: null, success: null });

  const submit = async (event) => {
    event.preventDefault();
    const next = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(next)) {
      setState({ busy: false, error: 'Digite um e-mail válido.', success: null });
      return;
    }
    if (next === currentEmail?.toLowerCase()) {
      setState({ busy: false, error: 'Esse já é o seu e-mail.', success: null });
      return;
    }
    setState({ busy: true, error: null, success: null });
    const { error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: window.location.origin });
    if (error) {
      setState({ busy: false, error: authErrorMessage(error), success: null });
      return;
    }
    setEmail('');
    setState({
      busy: false,
      error: null,
      success: `Enviamos um link de confirmação para ${next}. O e-mail só muda depois que você abrir o link (o Supabase também pode pedir confirmação no e-mail atual).`,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-3">
      <ErrorNote>{state.error}</ErrorNote>
      <SuccessNote>{state.success}</SuccessNote>
      <p className="text-sm text-ink-soft">E-mail atual: <span className="font-semibold text-ink">{currentEmail}</span></p>
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">Novo e-mail</label>
        <input
          id={id}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="paper-field h-10 w-full px-2 text-base"
        />
      </div>
      <SubmitButton busy={state.busy}>Trocar e-mail</SubmitButton>
    </form>
  );
}

function SecurityPanel({ email }) {
  return (
    <div>
      <PanelSection title="Senha" description="A troca vale para todos os aparelhos. Se o seu login for antigo, pedimos um código por e-mail.">
        <PasswordForm />
      </PanelSection>
      <PanelSection title="E-mail" description="Usado para entrar e para recuperar a conta.">
        <EmailForm currentEmail={email} />
      </PanelSection>
    </div>
  );
}

export default memo(SecurityPanel);
