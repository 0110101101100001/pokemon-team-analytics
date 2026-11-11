import { memo, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, Loader2, Package, Sparkles, Swords, TriangleAlert, X } from 'lucide-react';
import PokemonTypeBadge from './PokemonTypeBadge';
import { fetchAbilityInfo, fetchItemInfo, fetchMoveInfo, toPokeApiSlug } from '../services/api';
import { formatSlug } from '../utils/filters';
import { useModalBehavior } from '../hooks/useModalBehavior';

const KINDS = {
  move: { label: 'Golpe', icon: Swords, load: fetchMoveInfo },
  ability: { label: 'Habilidade', icon: Sparkles, load: fetchAbilityInfo },
  item: { label: 'Item', icon: Package, load: fetchItemInfo },
};

const DAMAGE_CLASS_LABELS = { physical: 'Físico', special: 'Especial', status: 'Status' };

const TARGET_LABELS = {
  'selected-pokemon': 'Um alvo à escolha',
  'selected-pokemon-me-first': 'Um alvo à escolha',
  'random-opponent': 'Um oponente aleatório',
  'all-opponents': 'Todos os oponentes',
  'all-other-pokemon': 'Todos os outros em campo',
  'all-pokemon': 'Todos em campo',
  'all-allies': 'Todos os aliados',
  ally: 'Um aliado',
  user: 'O próprio usuário',
  'user-or-ally': 'Usuário ou aliado',
  'user-and-allies': 'Usuário e aliados',
  'users-field': 'Lado do usuário',
  'opponents-field': 'Lado do oponente',
  'entire-field': 'Campo inteiro',
  'specific-move': 'Golpe específico',
  'fainting-pokemon': 'Pokémon desmaiado',
};

const generationLabel = (name) => (name ? `Geração ${name.split('-')[1]?.toUpperCase() ?? '?'}` : null);

const ATTRIBUTES = {
  move: (info) => [
    ['Tipo', info.type && <PokemonTypeBadge type={info.type} />],
    ['Categoria', DAMAGE_CLASS_LABELS[info.damageClass] ?? (info.damageClass && formatSlug(info.damageClass))],
    ['Poder', info.power ?? '—'],
    ['Precisão', info.accuracy ? `${info.accuracy}%` : '—'],
    ['PP', info.pp ?? '—'],
    ['Prioridade', info.priority ? (info.priority > 0 ? `+${info.priority}` : `${info.priority}`) : null],
    ['Chance de efeito', info.effectChance ? `${info.effectChance}%` : null],
    ['Alvo', TARGET_LABELS[info.target] ?? (info.target && formatSlug(info.target))],
    ['Introduzido na', generationLabel(info.generation)],
  ],
  ability: (info) => [
    ['Introduzida na', generationLabel(info.generation)],
    ['Pokémon com ela', info.pokemonCount || null],
  ],
  item: (info) => [
    ['Categoria', info.category && formatSlug(info.category)],
  ],
};

const attributesFor = (info) =>
  ATTRIBUTES[info.kind](info).filter(([, value]) => value != null && value !== false);

function TextBlock({ title, entries }) {
  const shown = entries.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#78614E]">{title}</h3>
      {shown.map((entry, index) => (
        <p
          key={entry.text}
          lang={entry.translated ? 'pt-BR' : 'en'}
          className={`whitespace-pre-line text-sm leading-relaxed ${
            index === 0 && shown.length > 1 ? 'font-semibold text-[#2A2421]' : 'text-[#3E3A35]'
          }`}
        >
          {entry.text}
        </p>
      ))}
    </section>
  );
}

/**
 * Modal de detalhes de um golpe, habilidade ou item. `name` aceita o slug da PokéAPI ("kings-shield")
 * ou o nome de exibição da Smogon ("King's Shield").
 */
function MoveAbilityModal({ kind, name, onClose }) {
  const { label, icon: Icon, load } = KINDS[kind];
  const slug = toPokeApiSlug(name);
  const [state, setState] = useState({ status: 'loading', info: null });
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading', info: null });
    load(slug)
      .then((info) => active && setState({ status: 'ready', info }))
      .catch(() => active && setState({ status: 'error', info: null }));
    return () => { active = false; };
  }, [load, slug]);

  useModalBehavior(onClose, closeRef);

  const { status, info } = state;
  const title = info?.name ?? { text: formatSlug(slug), translated: false };
  const texts = info ? [info.name, info.description, info.shortEffect, info.effect].filter(Boolean) : [];
  const untranslated = texts.some((entry) => !entry.translated);
  // A PokéAPI repete o resumo como efeito completo em alguns registros.
  const detailedEffect = info?.effect?.text === info?.shortEffect?.text ? null : info?.effect;

  // Portal: fica fora do drawer, que tem rolagem própria e cantos recortados.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 md:bg-black/50 md:backdrop-blur-md animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-panel border border-[#78614E]/30 bg-[#FFFEFB] shadow-lg md:shadow-panel animate-bubble-pop"
      >
        <header className="flex items-start gap-3 border-b border-dashed border-[#78614E]/25 px-6 pb-4 pt-5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#829b72]/40 bg-[#829b72]/15 text-[#5B7856]">
            {state.info?.sprite ? (
              <img src={state.info.sprite} alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain [image-rendering:pixelated]" />
            ) : (
              <Icon className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-hand text-lg leading-none text-[#78614E]">{label}</p>
            <h2
              id={titleId}
              lang={title.translated ? 'pt-BR' : 'en'}
              className="mt-0.5 font-serif text-2xl font-black capitalize leading-tight tracking-tight text-[#2A2421]"
            >
              {title.text}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#4A3B32]/20 bg-[#FFFEFB] text-[#78614E] transition-colors hover:border-[#4A3B32]/40 hover:text-[#2A2421] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#829b72]/70"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto overscroll-contain px-6 pb-6 pt-4" aria-live="polite">
          {status === 'loading' && (
            <p className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-[#78614E]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Consultando a PokéAPI...
            </p>
          )}

          {status === 'error' && (
            <p className="flex items-center justify-center gap-2 py-10 text-center text-xs font-medium text-[#8A3B27]">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              Não foi possível carregar os dados de “{formatSlug(slug)}”.
            </p>
          )}

          {status === 'ready' && (
            <>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {attributesFor(info).map(([term, value]) => (
                  <div key={term} className="rounded-xl border border-[#4A3B32]/10 bg-[#F7F3EE]/70 px-3 py-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#78614E]">{term}</dt>
                    <dd className="mt-0.5 text-sm font-bold text-[#2A2421]">{value}</dd>
                  </div>
                ))}
              </dl>

              <TextBlock title="Descrição" entries={[info.description]} />
              <TextBlock title="Efeito em batalha" entries={[info.shortEffect, detailedEffect]} />

              {!info.description && !info.shortEffect && !info.effect && (
                <p className="text-xs italic text-[#78614E]">A PokéAPI ainda não tem descrição para este registro.</p>
              )}

              {untranslated && (
                <p className="flex items-start gap-1.5 border-t border-dashed border-[#78614E]/20 pt-3 text-[11px] italic leading-snug text-[#78614E]/85">
                  <Languages className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  A PokéAPI ainda não tem tradução em português para este texto; ele aparece em inglês.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default memo(MoveAbilityModal);
