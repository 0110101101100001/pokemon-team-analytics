import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Lock, Mail, TriangleAlert, X } from 'lucide-react';
import { supabase } from '../services/supabase';

const MODES = {
  login: { title: 'Bem-vindo de volta', subtitle: 'Abra seu caderno de campo.', submit: 'Entrar' },
  signup: { title: 'Novo caderno', subtitle: 'Cadastre-se para guardar suas equipes.', submit: 'Criar conta' },
};

const ERROR_MESSAGES = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_not_confirmed: 'Confirme seu email antes de entrar.',
  user_already_exists: 'Já existe uma conta com este email.',
  weak_password: 'A senha é muito fraca (mínimo 6 caracteres).',
  over_email_send_rate_limit: 'Muitas tentativas. Tente novamente em breve.',
  over_request_rate_limit: 'Muitas tentativas. Tente novamente em breve.',
  validation_failed: 'Verifique o email e a senha.',
};

const describeError = (error) =>
  ERROR_MESSAGES[error?.code] ?? error?.message ?? 'Algo deu errado. Tente novamente.';

const FIELD_CLASS =
  'h-11 w-full rounded-xl border border-[#78614E]/25 bg-[#FFFEFB]/70 pl-10 pr-3 text-sm text-smeargle-text font-serif placeholder:italic placeholder:text-[#78614E]/55 shadow-inner transition-colors hover:border-[#78614E]/45 focus:outline-none focus:ring-2 focus:ring-smeargle-olive/60 focus:border-smeargle-olive';

const Field = forwardRef(function Field({ id, label, icon: Icon, ...inputProps }, ref) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block font-hand text-lg leading-none text-[#78614E]">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78614E]/70" aria-hidden="true" />
        <input ref={ref} id={id} className={FIELD_CLASS} {...inputProps} />
      </span>
    </label>
  );
});

export default function AuthModal({ open, onClose, onAuthChange }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const emailRef = useRef(null);
  const ids = useId();

  const onAuthChangeRef = useRef(onAuthChange);
  const onCloseRef = useRef(onClose);
  onAuthChangeRef.current = onAuthChange;
  onCloseRef.current = onClose;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      onAuthChangeRef.current?.(session, event);
      if (event === 'SIGNED_IN') onCloseRef.current?.();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    emailRef.current?.focus();
    const handleKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open) return;
    setPassword('');
    setError(null);
    setNotice(null);
    setStatus('idle');
  }, [open]);

  const switchMode = useCallback((next) => {
    setMode(next);
    setError(null);
    setNotice(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    setNotice(null);

    const credentials = { email: email.trim(), password };
    const { data, error: authError } = mode === 'login'
      ? await supabase.auth.signInWithPassword(credentials)
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
  }, [email, password, mode, switchMode]);

  if (!open) return null;

  const copy = MODES[mode];
  const loading = status === 'loading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2421]/55 p-4 md:bg-[#2A2421]/40 md:backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className="relative w-full max-w-sm rounded-panel border border-[#78614E]/30 bg-[#FFFEFB] p-7 shadow-lg md:bg-[#FFFEFB]/85 md:shadow-panel md:backdrop-blur-xl animate-bubble-pop"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar diálogo"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#78614E]/70 transition-colors hover:bg-[#78614E]/10 hover:text-[#78614E] focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="mb-6 pr-6">
          <h2 id={`${ids}-title`} className="font-display text-2xl font-bold text-[#78614E]">{copy.title}</h2>
          <p className="mt-1 font-serif text-sm italic text-smeargle-textDim/80">{copy.subtitle}</p>
        </header>

        <div role="tablist" className="relative mb-6 grid grid-cols-2 rounded-pill border border-[#78614E]/20 bg-[#78614E]/5 p-1">
          <span
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-pill bg-[#78614E] shadow-card transition-transform duration-300 ease-out ${mode === 'signup' ? 'translate-x-full' : ''}`}
          />
          {['login', 'signup'].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => switchMode(key)}
              className={`relative z-10 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${mode === key ? 'text-[#FFFEFB]' : 'text-[#78614E]/75 hover:text-[#78614E]'}`}
            >
              {key === 'login' ? 'Entrar' : 'Cadastro'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Field
            id={`${ids}-password`}
            label="Senha"
            icon={Lock}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#B5543C]/30 bg-[#B5543C]/10 px-3 py-2 text-xs text-[#8A3B27]">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl border border-smeargle-olive/40 bg-smeargle-olive/10 px-3 py-2 text-xs text-smeargle-ink-darkGreen">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#78614E] font-semibold tracking-wide text-[#FFFEFB] shadow-hard transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-smeargle-olive/60 disabled:cursor-wait disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {copy.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
