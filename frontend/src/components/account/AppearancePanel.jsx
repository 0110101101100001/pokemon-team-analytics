import { memo, useRef } from 'react';
import { Check } from 'lucide-react';
import PokemonTypeBadge from '../PokemonTypeBadge';
import { DEFAULT_THEME, THEMES, THEME_GROUPS, prefetchThemeLogos } from '../../theme/themes';
import { SPRITES_BASE } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { ChoiceGroup, SaveStatus, Toggle } from './settingsUi';
import { FONT_SCALES } from '../../preferences/preferences';
import { usePreferenceSaver, usePreferences } from '../../preferences/usePreferences';

// A faixa de cores da prévia: os seis papéis da paleta, lidos do próprio tema.
const SWATCHES = ['bg', 'surface', 'border', 'ink', 'accent', 'secondary'];

// Sprite da prévia: o mesmo da grade da Pokédex (ou o shiny, no Darkrai Shiny).
const previewSprite = ({ number, shiny }) => `${SPRITES_BASE}/pokemon/${shiny ? 'shiny/' : ''}${number}.png`;

/**
 * Prévia em miniatura, com o Pokémon do próprio tema. O data-theme no cartão faz os tokens valerem a paleta
 * daquele tema (themes.css): nenhuma cor é repetida aqui.
 */
function ThemePreview({ theme }) {
  const { pokemon } = theme;
  return (
    <span aria-hidden="true" className="block overflow-hidden rounded-[3px] border border-line bg-bg">
      <span className="flex items-center justify-between bg-header px-2 py-1.5">
        <span className="font-serif text-[13px] font-bold text-header-ink">Smearglepedia</span>
        <span className="rounded-[2px] bg-accent-fill px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent-on">Entrar</span>
      </span>
      <span className="block p-2">
        <span className="flex items-center gap-2 rounded-[3px] border border-ink bg-surface py-1 pl-2 pr-1 shadow-[2px_2px_0_var(--shadow-hard)]">
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9px] text-ink-soft">
              Nº {String(pokemon.number).padStart(4, '0')}{pokemon.shiny ? ' · shiny' : ''}
            </span>
            <span className="block truncate font-serif text-sm font-bold leading-tight text-ink">{formatSlug(pokemon.species ?? theme.id)}</span>
            <span className="mt-1 flex gap-1">
              {pokemon.types.map((type) => (
                <PokemonTypeBadge key={type} type={type} className="!px-1 !py-0.5 !text-[8px]" />
              ))}
            </span>
          </span>
          <img
            src={previewSprite(pokemon)}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="h-12 w-12 shrink-0 object-contain [image-rendering:pixelated]"
          />
        </span>
      </span>
      <span className="flex h-2.5">
        {SWATCHES.map((token) => <span key={token} className="flex-1" style={{ backgroundColor: `var(--${token})` }} />)}
      </span>
    </span>
  );
}

const ThemeCard = memo(function ThemeCard({ theme, checked, onChoose, cardRef }) {
  return (
    <button
      ref={cardRef}
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      data-theme={theme.id}
      onClick={() => onChoose(theme.id)}
      // As logos do tema começam a baixar antes do clique: a troca do header sai sem buraco.
      onMouseEnter={() => prefetchThemeLogos(theme.id)}
      onFocus={() => prefetchThemeLogos(theme.id)}
      className={`relative flex cursor-pointer flex-col gap-2 rounded-[4px] border-2 bg-surface p-2 text-left text-ink transition-colors ${
        checked ? 'border-accent-text' : 'border-line hover:border-line-strong'
      }`}
    >
      <ThemePreview theme={theme} />
      <span className="flex items-start gap-2 px-0.5">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-serif text-base font-bold">{theme.name}</span>
            {theme.id === DEFAULT_THEME && (
              <span className="rounded-[2px] border border-line-strong px-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft">Padrão</span>
            )}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{theme.description}</span>
        </span>
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            checked ? 'border-accent-fill bg-accent-fill text-accent-on' : 'border-line-strong'
          }`}
        >
          {checked && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
});

const NEXT_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
// As setas seguem a ordem da tela: os claros, depois os escuros.
const ORDERED = THEME_GROUPS.flatMap((group) => THEMES.filter((candidate) => candidate.group === group.id));

/** "Tema do site": um radiogroup com os dois grupos; as setas andam pelos doze temas e já escolhem. */
function AppearancePanel({ theme, onChooseTheme }) {
  const cards = useRef(new Map());

  const handleKeyDown = (event) => {
    const step = NEXT_KEYS[event.key];
    const index = ORDERED.findIndex((candidate) => candidate.id === theme);
    let next = null;
    if (step) next = ORDERED[(index + step + ORDERED.length) % ORDERED.length];
    else if (event.key === 'Home') next = ORDERED[0];
    else if (event.key === 'End') next = ORDERED.at(-1);
    if (!next) return;
    event.preventDefault();
    onChooseTheme(next.id);
    cards.current.get(next.id)?.focus();
  };

  return (
    <div>
      <section aria-labelledby="tema-do-site" className="border-b border-ink/15 pb-5">
        <h3 id="tema-do-site" className="font-serif text-lg font-bold text-ink">Tema do site</h3>
        <p className="mt-0.5 text-sm text-ink-soft">O tema fica salvo na sua conta e vale em qualquer aparelho em que você entrar.</p>
        <div role="radiogroup" aria-labelledby="tema-do-site" onKeyDown={handleKeyDown} className="mt-4 space-y-5">
          {THEME_GROUPS.map((group) => (
            <div key={group.id} role="group" aria-labelledby={`grupo-${group.id}`}>
              <h4 id={`grupo-${group.id}`} className="mb-2 text-sm font-semibold italic text-umber">{group.label}</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {THEMES.filter((candidate) => candidate.group === group.id).map((candidate) => (
                  <ThemeCard
                    key={candidate.id}
                    theme={candidate}
                    checked={candidate.id === theme}
                    onChoose={onChooseTheme}
                    cardRef={(node) => (node ? cards.current.set(candidate.id, node) : cards.current.delete(candidate.id))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <AccessibilitySection />
    </div>
  );
}

/** Acessibilidade: valem na hora, em todo o site, e ficam na conta. */
function AccessibilitySection() {
  const { values } = usePreferences();
  const [status, save] = usePreferenceSaver();
  return (
    <section aria-labelledby="acessibilidade" className="pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="acessibilidade" className="font-serif text-lg font-bold text-ink">Acessibilidade</h3>
        <SaveStatus status={status} />
      </div>
      <div className="mt-3 space-y-4">
        <Toggle
          label="Reduzir animações"
          description="Tira transições, pinceladas animadas e rolagem suave, mesmo que o sistema não peça."
          checked={values.reduce_motion}
          onChange={(reduce_motion) => save({ reduce_motion })}
        />
        <ChoiceGroup
          label="Tamanho do texto"
          options={FONT_SCALES}
          value={values.font_scale}
          onChange={(font_scale) => save({ font_scale })}
        />
      </div>
    </section>
  );
}

export default memo(AppearancePanel);
