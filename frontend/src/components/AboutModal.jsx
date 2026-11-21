import { memo, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Github, X } from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';

const REPOSITORY_URL = 'https://github.com/0110101101100001/pokemon-team-analytics';
const REPOSITORY_LABEL = REPOSITORY_URL.replace('https://github.com/', '');

const STACK = [
  { name: 'React + Vite', role: 'interface (SPA)', url: 'https://react.dev' },
  { name: 'FastAPI', role: 'API e estatísticas da Smogon', url: 'https://fastapi.tiangolo.com' },
  { name: 'Supabase', role: 'banco de dados e login', url: 'https://supabase.com' },
  { name: 'PokéAPI', role: 'dados de Pokémon, golpes e habilidades', url: 'https://pokeapi.co' },
];

const LINK = 'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';

function ExternalAnchor({ href, className = '', children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${LINK} ${className}`}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function AboutModal({ onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  useModalBehavior(onClose, closeRef);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4 animate-fade-in motion-reduce:animate-none md:bg-ink/45"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col paper-card shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 border-b border-sepia/25 px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <p className="font-hand text-lg leading-none text-umber">sobre a Smearglepedia</p>
            <h2 id={titleId} className="mt-0.5 font-serif text-2xl font-black tracking-tight text-ink">
              Smeargle<span className="text-olive-deep">pedia</span>
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-ink-soft/20 bg-paper text-umber transition-colors hover:border-ink-soft/40 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 text-sm text-ink">
          <p className="leading-relaxed">
            Pokédex com estatísticas competitivas da Smogon, fichas de campo e um team builder.
          </p>

          <dl className="space-y-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-umber">Desenvolvedor</dt>
              <dd className="mt-0.5 font-serif text-base font-bold text-ink">Kaíque Nunes</dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-umber">Código-fonte</dt>
              <dd className="mt-1">
                <ExternalAnchor
                  href={REPOSITORY_URL}
                  className="inline-flex max-w-full items-center gap-2 border border-ink-soft/15 bg-page/70 px-3 py-2 font-medium text-ink transition-colors hover:border-olive/70 hover:bg-page"
                >
                  <Github className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{REPOSITORY_LABEL}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-umber" aria-hidden="true" />
                </ExternalAnchor>
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-umber">Tecnologias</dt>
              <dd className="mt-1">
                <ul className="divide-y divide-ink-soft/10 rounded-sketch border border-ink-soft/10 bg-page/50">
                  {STACK.map(({ name, role, url }) => (
                    <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                      <ExternalAnchor href={url} className="font-semibold text-ink underline decoration-dotted decoration-umber/50 underline-offset-4 hover:text-olive-deep">
                        {name}
                      </ExternalAnchor>
                      <span className="text-xs text-umber">{role}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>

          <p className="border-t border-sepia/20 pt-3 text-[11px] italic leading-snug text-umber/85">
            Dados competitivos da Smogon. Projeto de fã, sem afiliação com Nintendo, Game Freak ou The Pokémon Company.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default memo(AboutModal);
