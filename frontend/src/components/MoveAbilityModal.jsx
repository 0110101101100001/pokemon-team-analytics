import { memo, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Languages, Loader2, Package, Sparkles, Swords, TriangleAlert, X } from 'lucide-react';
import PokemonTypeBadge from './PokemonTypeBadge';
import { fetchAbilityInfo, fetchItemInfo, fetchMoveInfo, thumbnailSpriteUrl, toPokeApiSlug } from '../services/api';
import { formatSlug } from '../utils/filters';
import { evolutionConditionLabel } from '../utils/itemData';
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

// Nomes das versões como aparecem nas capas; o restante vem do slug ("omega-ruby" → "Omega Ruby").
const VERSION_LABELS = {
  firered: 'FireRed',
  leafgreen: 'LeafGreen',
  heartgold: 'HeartGold',
  soulsilver: 'SoulSilver',
  xd: 'XD',
  'red-japan': 'Red (JP)',
  'green-japan': 'Green (JP)',
  'blue-japan': 'Blue (JP)',
  'lets-go-pikachu': "Let's Go Pikachu",
  'lets-go-eevee': "Let's Go Eevee",
  'the-isle-of-armor-sword': 'Isle of Armor (Sword)',
  'the-isle-of-armor-shield': 'Isle of Armor (Shield)',
  'the-crown-tundra-sword': 'Crown Tundra (Sword)',
  'the-crown-tundra-shield': 'Crown Tundra (Shield)',
  'the-teal-mask-scarlet': 'Teal Mask (Scarlet)',
  'the-teal-mask-violet': 'Teal Mask (Violet)',
  'the-indigo-disk-scarlet': 'Indigo Disk (Scarlet)',
  'the-indigo-disk-violet': 'Indigo Disk (Violet)',
  'legends-za': 'Legends: Z-A',
  'legends-arceus': 'Legends: Arceus',
  'black-2': 'Black 2',
  'white-2': 'White 2',
};

const versionLabel = (slug) => VERSION_LABELS[slug] ?? formatSlug(slug);

/** Pokémon selvagens que seguram o item em cada jogo, com a chance de estar segurando. */
function HeldBySection({ groups }) {
  if (groups.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="border-b border-ink/30 pb-1 font-reading text-xs font-semibold uppercase tracking-wider text-ink-soft">Onde encontrar</h3>
      <p className="font-reading text-sm text-ink-soft">Segurado por Pokémon selvagens; capture ou use Thief/Covet para pegar.</p>
      <ul className="space-y-2">
        {groups.map(({ versions, holders }) => (
          <li key={versions.join(',')} className="rounded-[3px] border-[1.5px] border-ink/70 bg-paper-2 px-3 py-2">
            <p className="font-reading text-sm font-semibold text-ink">{versions.map(versionLabel).join(' · ')}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {holders.map(({ name, id, rarity }) => (
                <li key={name} className="flex items-center gap-1 rounded-[2px] border-[1.5px] border-ink/50 bg-paper py-0.5 pl-0.5 pr-2">
                  <img src={thumbnailSpriteUrl(id)} alt="" width={24} height={24} loading="lazy" decoding="async" className="h-6 w-6 object-contain" />
                  <span className="font-reading text-sm font-medium text-ink">{formatSlug(name)}</span>
                  <span className="font-mono text-[11px] font-bold tabular-nums text-[#56643A]">{rarity}%</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EvolutionSide({ name, id }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <img src={thumbnailSpriteUrl(id)} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 shrink-0 object-contain [image-rendering:pixelated]" />
      <span className="truncate font-reading text-sm font-semibold text-ink">{formatSlug(name)}</span>
    </span>
  );
}

/** Evoluções que o item causa: quem evolui, em quem, e como (usar, trocar segurando, subir de nível segurando). */
function EvolutionSection({ evolutions }) {
  if (!evolutions?.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="border-b border-ink/30 pb-1 font-reading text-xs font-semibold uppercase tracking-wider text-ink-soft">Evolução</h3>
      <ul className="space-y-1.5">
        {evolutions.map((evolution) => (
          <li
            key={`${evolution.from}-${evolution.to}-${evolution.trigger}-${evolution.gender}-${evolution.timeOfDay}`}
            className="rounded-[3px] border-[1.5px] border-ink/70 bg-paper-2 px-2.5 py-1.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <EvolutionSide name={evolution.from} id={evolution.fromId} />
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" aria-label="evolui em" />
              <EvolutionSide name={evolution.to} id={evolution.toId} />
            </div>
            <p className="mt-0.5 font-reading text-xs italic text-ink-soft">{evolutionConditionLabel(evolution)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const attributesFor = (info) =>
  ATTRIBUTES[info.kind](info).filter(([, value]) => value != null && value !== false);

function TextBlock({ title, entries }) {
  const shown = entries.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h3 className="border-b border-ink/30 pb-1 font-reading text-xs font-semibold uppercase tracking-wider text-ink-soft">{title}</h3>
      {shown.map((entry, index) => (
        <p
          key={entry.text}
          lang={entry.translated ? 'pt-BR' : 'en'}
          className={`whitespace-pre-line font-reading text-[15px] leading-relaxed ${
            index === 0 && shown.length > 1 ? 'font-semibold text-ink' : 'text-ink'
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
  // Nos itens o efeito completo só repete o resumo com o contexto de uso na frente ("Used on a party Pokémon: ...");
  // nos golpes e habilidades a PokéAPI às vezes repete o resumo como efeito completo.
  const repeatsSummary = (kind === 'item' && info?.shortEffect) || info?.effect?.text === info?.shortEffect?.text;
  const detailedEffect = repeatsSummary ? null : info?.effect;

  // Portal: fica fora do drawer, que tem rolagem própria e cantos recortados.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4 animate-fade-in motion-reduce:animate-none md:bg-ink/45"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="paper-card relative flex max-h-[85vh] w-full max-w-lg flex-col shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 border-b-[1.5px] border-ink px-6 pb-4 pt-5">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper-2 text-ink shadow-[2px_2px_0_#4A463E]">
            {state.info?.sprite ? (
              <img src={state.info.sprite} alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain [image-rendering:pixelated]" />
            ) : (
              <Icon className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-hand text-lg leading-none text-ink-soft">{label}</p>
            <h2
              id={titleId}
              lang={title.translated ? 'pt-BR' : 'en'}
              className="mt-0.5 font-serif text-2xl font-black capitalize leading-tight tracking-tight text-ink"
            >
              {title.text}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-paper text-ink transition-colors hover:bg-paper-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto overscroll-contain px-6 pb-6 pt-4" aria-live="polite">
          {status === 'loading' && (
            <p className="flex items-center justify-center gap-2 py-10 font-reading text-sm italic text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Consultando a PokéAPI...
            </p>
          )}

          {status === 'error' && (
            <p className="flex items-center justify-center gap-2 py-10 text-center font-reading text-sm text-vermilion">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              Não foi possível carregar os dados de “{formatSlug(slug)}”.
            </p>
          )}

          {status === 'ready' && (
            <>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {attributesFor(info).map(([term, value]) => (
                  <div key={term} className="rounded-[3px] border-[1.5px] border-ink/70 bg-paper-2 px-3 py-2">
                    <dt className="font-reading text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{term}</dt>
                    <dd className="mt-0.5 font-reading text-[15px] font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              <TextBlock title="Descrição" entries={[info.description]} />
              <TextBlock title="Efeito em batalha" entries={[info.shortEffect, detailedEffect]} />
              <EvolutionSection evolutions={info.evolutions} />
              {info.heldBy && <HeldBySection groups={info.heldBy} />}

              {!info.description && !info.shortEffect && !info.effect && (
                <p className="font-reading text-sm italic text-ink-soft">A PokéAPI ainda não tem descrição para este registro.</p>
              )}

              {untranslated && (
                <p className="flex items-start gap-1.5 border-t border-ink/30 pt-3 font-reading text-xs italic leading-snug text-ink-soft">
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
