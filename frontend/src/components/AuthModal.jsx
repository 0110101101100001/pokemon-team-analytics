import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Lock, Mail, TriangleAlert, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { MIN_PASSWORD, passwordProblem } from '../utils/accountSecurity';

// login e signup são as abas; forgot pede o e-mail do link de redefinição; recovery é a volta desse link.
const MODES = {
  login: { title: 'Bem-vindo de volta', subtitle: 'Abra seu guia de campo.', submit: 'Entrar' },
  signup: { title: 'Nova conta', subtitle: 'Cadastre-se para salvar seus times.', submit: 'Criar conta' },
  forgot: { title: 'Esqueci minha senha', subtitle: 'Mandamos um link para você criar uma senha nova.', submit: 'Enviar link' },
  recovery: { title: 'Nova senha', subtitle: 'Escolha a senha que vai usar daqui em diante.', submit: 'Salvar senha' },
};
const TABBED = new Set(['login', 'signup']);
// Mesma resposta exista ou não a conta: o formulário não revela quais e-mails estão cadastrados.
const RESET_SENT = 'Se houver uma conta com esse e-mail, o link chega em instantes. Confira também o spam.';

const ERROR_MESSAGES = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_not_confirmed: 'Confirme seu email antes de entrar.',
  user_already_exists: 'Já existe uma conta com este email.',
  weak_password: 'A senha é muito fraca (mínimo 6 caracteres).',
  over_email_send_rate_limit: 'Muitas tentativas. Tente novamente em breve.',
  over_request_rate_limit: 'Muitas tentativas. Tente novamente em breve.',
  validation_failed: 'Verifique o email e a senha.',
  same_password: 'A nova senha precisa ser diferente da anterior.',
  session_not_found: 'O link expirou. Peça um novo em "Esqueci minha senha".',
};

const describeError = (error) =>
  ERROR_MESSAGES[error?.code] ?? error?.message ?? 'Algo deu errado. Tente novamente.';

const FIELD_CLASS =
  'paper-field h-11 pl-10 pr-3 placeholder:text-umber/70';

const Field = forwardRef(function Field({ id, label, icon: Icon, ...inputProps }, ref) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block font-hand text-lg leading-none text-umber">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-umber/70" aria-hidden="true" />
        <input ref={ref} id={id} className={FIELD_CLASS} {...inputProps} />
      </span>
    </label>
  );
});

/**
 * Entrar, criar conta e recuperar a senha. Fica montado mesmo fechado: é ele quem ouve as mudanças de sessão.
 * Quando a página abre pelo link de "Esqueci minha senha", pede para abrir (`onRequestOpen`) já em "Nova senha".
 */
export default function AuthModal({ open, onClose, onAuthChange, onRequestOpen }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [remember, setRemember] = useState(() => supabase.auth.getRemember());
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const emailRef = useRef(null);
  const ids = useId();

  const onAuthChangeRef = useRef(onAuthChange);
  const onCloseRef = useRef(onClose);
  const onRequestOpenRef = useRef(onRequestOpen);
  const recovering = useRef(false);
  onAuthChangeRef.current = onAuthChange;
  onCloseRef.current = onClose;
  onRequestOpenRef.current = onRequestOpen;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      onAuthChangeRef.current?.(session, event);
      // O link de recuperação entra com uma sessão: em vez de fechar, o modal abre pedindo a senha nova.
      // O auth-js avisa com PASSWORD_RECOVERY; consumeRecoveryLink cobre o aviso que sai antes da inscrição.
      if (session && (event === 'PASSWORD_RECOVERY' || supabase.auth.consumeRecoveryLink())) {
        recovering.current = true;
        setMode('recovery');
        setError(null);
        setNotice(null);
        onRequestOpenRef.current?.();
        return;
      }
      if (event === 'SIGNED_IN' && !recovering.current) onCloseRef.current?.();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    // O cliente de login só é baixado quando precisa: abrir o modal já adianta o download.
    supabase.auth.preload();
    emailRef.current?.focus();
    const handleKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open) return;
    setPassword('');
    setConfirmation('');
    setError(null);
    setNotice(null);
    setStatus('idle');
    // Fechar no meio da recuperação desiste dela; a próxima abertura volta ao login.
    recovering.current = false;
    setMode((current) => (TABBED.has(current) ? current : 'login'));
  }, [open]);

  const switchMode = useCallback((next) => {
    setMode(next);
    setError(null);
    setNotice(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'recovery') {
      const problem = passwordProblem(password, confirmation);
      if (problem) {
        setError(problem);
        return;
      }
      setStatus('loading');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      setStatus('idle');
      if (updateError) {
        setError(describeError(updateError));
        return;
      }
      recovering.current = false;
      onCloseRef.current?.();
      return;
    }

    setStatus('loading');
    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      setStatus('idle');
      // O limite de envios é o único erro mostrado; o resto recebe a mesma resposta de sucesso.
      if (resetError && /rate_limit/.test(resetError.code ?? '')) setError(describeError(resetError));
      else setNotice(RESET_SENT);
      return;
    }

    const credentials = { email: email.trim(), password };
    const { data, error: authError } = mode === 'login'
      ? await supabase.auth.signInWithPassword(credentials, { remember })
      : await supabase.auth.signUp(credentials);

    setStatus('idle');
    if (authError) {
      setError(describeError(authError));
      return;
    }
    if (mode === 'signup' && !data.session) {
      switchMode('login');
      setPassword('');
      setNotice('Conta criada. Verifique seu email para confirmar o cadastro.');
    }
  }, [email, password, confirmation, mode, remember, switchMode]);

  if (!open) return null;

  const copy = MODES[mode];
  const loading = status === 'loading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4 animate-fade-in motion-reduce:animate-none md:bg-scrim/80"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className="relative w-full max-w-sm paper-card p-7 shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar diálogo"
          className="absolute right-4 top-4 rounded-full p-1.5 text-umber/70 transition-colors hover:bg-umber/10 hover:text-umber focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="mb-6 pr-6">
          <h2 id={`${ids}-title`} className="font-display text-2xl font-bold text-umber">{copy.title}</h2>
          <p className="mt-1 font-serif text-sm italic text-smeargle-textDim/80">{copy.subtitle}</p>
        </header>

        {TABBED.has(mode) && (
          <div role="tablist" className="relative mb-6 grid grid-cols-2 rounded-pill border border-umber/20 bg-umber/5 p-1">
            <span
              aria-hidden="true"
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-pill bg-umber shadow-card transition-transform duration-300 ease-out ${mode === 'signup' ? 'translate-x-full' : ''}`}
            />
            {['login', 'signup'].map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => switchMode(key)}
                className={`relative z-10 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${mode === key ? 'text-paper' : 'text-umber/75 hover:text-umber'}`}
              >
                {key === 'login' ? 'Entrar' : 'Cadastro'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'recovery' && (
            <Field
              ref={emailRef}
              id={`${ids}-email`}
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="treinador@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          {mode !== 'forgot' && (
            <Field
              ref={mode === 'recovery' ? emailRef : undefined}
              id={`${ids}-password`}
              label={mode === 'recovery' ? 'Nova senha' : 'Senha'}
              icon={Lock}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'recovery' ? MIN_PASSWORD : 6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {mode === 'recovery' && (
            <Field
              id={`${ids}-confirmation`}
              label="Repita a nova senha"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              placeholder="••••••••"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
          )}

          {mode === 'login' && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[var(--accent-fill)]"
                />
                Lembre-se de mim
              </label>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="cursor-pointer text-accent-text underline decoration-dotted underline-offset-4 hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
              >
                Esqueci minha senha
              </button>
            </div>
          )}
          {mode === 'login' && !remember && (
            <p className="-mt-2 text-xs italic text-umber">Você sai ao fechar o navegador. Bom para computador compartilhado.</p>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-sketch border border-vermilion/30 bg-vermilion/10 px-3 py-2 text-xs text-vermilion-deep">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-sketch border border-smeargle-olive/40 bg-smeargle-olive/10 px-3 py-2 text-xs text-smeargle-ink-darkGreen">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-action w-full disabled:cursor-wait"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {copy.submit}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mx-auto flex cursor-pointer items-center gap-1.5 text-sm text-umber hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar ao login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
