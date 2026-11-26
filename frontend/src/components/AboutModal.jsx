import { memo, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Github, X } from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { SECTIONS } from '../navigation/sections';

const REPOSITORY_URL = 'https://github.com/0110101101100001/pokemon-team-analytics';
const REPOSITORY_LABEL = REPOSITORY_URL.replace('https://github.com/', '');

const SUMMARIES = {
  pokedex: 'Dex nacional e regionais, formas, filtros e comparação de até 4 Pokémon. A ficha traz evolução, locais, criação, golpes por geração, uso na Smogon, builds e tabela de velocidade.',
  moves: 'Golpes e quem aprende cada um, com Z, Max, G-Max e Contests.',
  abilities: 'O efeito de cada habilidade e quem pode ter cada uma.',
  items: 'Itens em grade ou lista com o efeito de cada um, TMs por jogo, Megas e Primais, e Berries.',
  types: 'Tabela de tipos interativa: a matriz 18×18 de efetividade, o resumo de cada tipo e a calculadora de defesa para tipo duplo.',
  trainers: 'Líderes, Elite 4, campeões, rivais e vilões de Kanto a Paldea, com Hisui e Kitakami. O time de cada batalha abre na calculadora.',
  teamBuilder: 'Cobertura, fraquezas, sugestões, comparação de candidatos para uma vaga e esboço de times de singles (até do zero), com nota no teste do meta e exportação para o Showdown.',
  damageCalculator: 'Dano em batalhas simples pela fórmula da Gen 5+ e simulador de turnos com trocas, clima, terreno, Tera, golpes Z e Dynamax.',
};

const STACK = [
  { name: 'React + Vite', role: 'interface e cálculos no navegador', url: 'https://react.dev' },
  { name: 'Tailwind CSS', role: 'estilo', url: 'https://tailwindcss.com' },
  { name: 'Supabase', role: 'banco de dados e login', url: 'https://supabase.com' },
  { name: 'FastAPI', role: 'importação das estatísticas', url: 'https://fastapi.tiangolo.com' },
  { name: 'GitHub Actions', role: 'testes e tarefas agendadas', url: 'https://github.com/features/actions' },
];

const SOURCES = [
  { name: 'PokéAPI', role: 'Pokémon, golpes, itens, sprites e cries', url: 'https://pokeapi.co' },
  { name: 'Smogon', role: 'builds e uso mensal na Gen 9', url: 'https://www.smogon.com/stats/' },
  { name: 'Pokémon Showdown', role: 'sprites animados e de treinadores', url: 'https://pokemonshowdown.com' },
];

const LINK = 'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const TERM = 'text-[10px] font-bold uppercase tracking-wider text-umber';

function ExternalAnchor({ href, className = '', children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${LINK} ${className}`}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function CreditList({ title, entries }) {
  return (
    <div>
      <dt className={TERM}>{title}</dt>
      <dd className="mt-1">
        <ul className="divide-y divide-ink-soft/10 rounded-sketch border border-ink-soft/10 bg-page/50">
          {entries.map(({ name, role, url }) => (
            <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
              <ExternalAnchor href={url} className="font-semibold text-ink underline decoration-dotted decoration-umber/50 underline-offset-4 hover:text-olive-ink">
                {name}
              </ExternalAnchor>
              <span className="text-xs text-umber">{role}</span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function AboutModal({ onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  useModalBehavior(onClose, closeRef);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim p-4 animate-fade-in motion-reduce:animate-none md:bg-scrim/80"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col paper-card shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 border-b border-sepia/25 px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <p className="font-hand text-lg leading-none text-umber">sobre a Smearglepedia</p>
            <h2 id={titleId} className="mt-0.5 font-serif text-2xl font-black tracking-tight text-ink">
              Smeargle<span className="text-olive-ink">pedia</span>
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

        {/* Focável para rolar pelo teclado: a lista de abas não tem links. */}
        <div
          role="region"
          aria-labelledby={titleId}
          tabIndex={0}
          className="space-y-5 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paint-cobalt"
        >
          <p className="leading-relaxed">
            Guia de campo de Pokémon, do jogo principal ao competitivo: consulte a Pokédex, estude os treinadores,
            monte seu time e teste as batalhas. É gratuito e não exige conta para usar.
          </p>

          <dl className="space-y-4">
            <div>
              <dt className={TERM}>O que tem em cada aba</dt>
              <dd className="mt-1">
                <ul className="space-y-2.5">
                  {SECTIONS.map(({ id, label, icon: Icon }) => (
                    <li key={id} className="flex gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-umber" aria-hidden="true" />
                      <p className="min-w-0 leading-snug">
                        <strong className="block font-serif">{label}</strong>
                        {SUMMARIES[id]}
                      </p>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>

            <div>
              <dt className={TERM}>Com uma conta</dt>
              <dd className="mt-0.5 leading-snug">Você guarda favoritos, histórico de fichas e times salvos.</dd>
            </div>

            <div>
              <dt className={TERM}>Desenvolvedor</dt>
              <dd className="mt-0.5 font-serif text-base font-bold text-ink">Kaíque Nunes</dd>
            </div>

            <div>
              <dt className={TERM}>Código-fonte</dt>
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

            <CreditList title="Fontes dos dados" entries={SOURCES} />
            <CreditList title="Tecnologias" entries={STACK} />
          </dl>

          <p className="border-t border-sepia/20 pt-3 text-[11px] italic leading-snug text-umber/85">
            Projeto de fã, sem afiliação com Nintendo, Game Freak, The Pokémon Company, Smogon ou Pokémon Showdown.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default memo(AboutModal);
