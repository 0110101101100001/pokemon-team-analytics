import { memo, useCallback, useId, useMemo, useState } from 'react';
import { ChevronDown, Feather, Gem, Loader2, Minus, Plus, RotateCcw, TriangleAlert, Wind } from 'lucide-react';
import HpBar from './HpBar';
import MoveSlot from './MoveSlot';
import PartyStrip from './PartyStrip';
import SavedTeamPicker from './SavedTeamPicker';
import PokemonTypeBadge from '../PokemonTypeBadge';
import PokemonPicker from '../battle/PokemonPicker';
import StatSpreadEditor from '../battle/StatSpreadEditor';
import { TYPE_NAMES, animatedSpriteUrl, thumbnailSpriteUrl } from '../../services/api';
import { ABILITY_EFFECTS, ITEM_GROUPS, KNOWN_ITEMS, STATUSES } from '../../data/battleModifiers';
import { BOOST_STAGES } from '../../utils/damage';
import { hpRatio, toggleDynamax } from '../../utils/dynamax';
import { formatSlug } from '../../utils/filters';
import { MAX_EV_TOTAL, STAT_LABELS, calcStats, clampLevel, evTotal } from '../../utils/stats';

const SELECT = 'paper-field h-9 min-w-0 cursor-pointer px-2 text-[13px]';
const MAX_STAGE = BOOST_STAGES[0];
const BOOST_KEYS = ['atk', 'def', 'spa', 'spd', 'spe'];
const NO_BOOSTS = Object.fromEntries(BOOST_KEYS.map((key) => [key, 0]));

const AIRBORNE_LABELS = { levitate: 'Levitate', 'air-balloon': 'Air Balloon' };

// "charizard-mega-x" → "Mega X"; "kyogre-primal" → "Primal".
const formLabel = (form, baseName) => formatSlug(form.slice(baseName.length + 1));

const stageLabel = (stage) => (stage > 0 ? `+${stage}` : `${stage}`.replace('-', '−'));
const boostSummary = (boosts) =>
  BOOST_KEYS.filter((key) => boosts[key]).map((key) => `${stageLabel(boosts[key])} ${STAT_LABELS[key]}`).join(' · ') || 'nenhum';
const STEP_BUTTON = 'flex h-full w-6 shrink-0 cursor-pointer items-center justify-center text-umber transition-colors hover:bg-umber/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paint-cobalt disabled:cursor-not-allowed disabled:opacity-30';

/**
 * Sprite 2D animado do combatente: o GIF em pixel art de Black/White. Ele só existe até o nº 649 e sem as formas
 * novas; nesses casos fica o sprite 2D estático. Sempre sem suavizar.
 */
function BattleSprite({ id, fainted = false }) {
  const sources = useMemo(() => [animatedSpriteUrl(id), thumbnailSpriteUrl(id)], [id]);
  const [index, setIndex] = useState(0);
  const [shownId, setShownId] = useState(id);
  if (shownId !== id) {
    setShownId(id);
    setIndex(0);
  }
  return (
    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center sm:h-[88px] sm:w-[88px]">
      <img
        src={sources[index]}
        alt=""
        decoding="async"
        onError={() => setIndex((i) => Math.min(i + 1, sources.length - 1))}
        className={`max-h-full max-w-full object-contain transition-[filter,opacity] duration-500 [image-rendering:pixelated] ${
          fainted ? 'opacity-50 [filter:grayscale(1)_sepia(0.7)]' : ''
        }`}
      />
    </span>
  );
}

/** Estágio de um atributo, de −6 a +6: o nome em cima e o contador com menos e mais embaixo. */
function BoostStepper({ stat, value, onChange }) {
  const label = STAT_LABELS[stat];
  const tone = value > 0 ? 'border-smeargle-olive bg-smeargle-olive/10 text-smeargle-ink-darkGreen' : value < 0 ? 'border-vermilion/50 bg-vermilion/5 text-vermilion-deep' : 'border-umber/25 bg-paper/80 text-smeargle-text';
  return (
    <div className="min-w-0" role="group" aria-label={`Estágio de ${label}`}>
      <span className="mb-0.5 block text-center text-[10px] font-bold uppercase tracking-wider text-umber">{label}</span>
      <div className={`flex h-8 items-stretch overflow-hidden rounded-sketch border ${tone}`}>
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= -MAX_STAGE} aria-label={`Diminuir ${label}`} className={STEP_BUTTON}>
          <Minus className="h-3 w-3" aria-hidden="true" />
        </button>
        <span className="flex min-w-0 flex-1 items-center justify-center font-mono text-xs font-bold tabular-nums" aria-live="polite">
          {stageLabel(value)}
        </span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_STAGE} aria-label={`Aumentar ${label}`} className={STEP_BUTTON}>
          <Plus className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
const abilityLabel = (slug) => (ABILITY_EFFECTS[slug] ? `${formatSlug(slug)} · ${ABILITY_EFFECTS[slug]}` : formatSlug(slug));

function Field({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-0.5 block font-hand text-base leading-none text-umber">{label}</span>
      {children}
    </label>
  );
}

/**
 * Um lado da calculadora: o Pokémon (pela busca ou do time), Mega/Primal, Tera, nível, habilidade, item, status,
 * os estágios de cada atributo, os quatro golpes e, recolhidos, natureza, EVs e IVs.
 */
function CombatantPanel({ caption, title, pickerPlaceholder, side, battle, forms, gmaxMove, moveTypes, ownTypes, hpPreview, ability, speed, faster, airborne, pool, teams, loggedIn, teamsOpen, extraSource, planned, inBattle, onBring, onAddReserve, onRemoveReserve, onChange, onMoveChange, onPick, onLogin, className = '' }) {
  const { pokemon, set, boosts } = side;

  const patchSet = useCallback((changes) => onChange({ set: { ...set, ...changes } }), [set, onChange]);
  const stats = useMemo(() => (battle.baseStats ? calcStats(battle.baseStats, set) : null), [battle.baseStats, set]);

  const boosted = BOOST_KEYS.some((key) => boosts[key] !== 0);
  const stagesId = useId();
  const maxHp = stats && stats.hp * (side.dynamax ? hpRatio(pokemon?.name) : 1);
  const typeBySlot = moveTypes.split(',');
  // Os tipos em batalha sem o Tera (Plate, Memory, Forecast); antes de os dados chegarem, os da Pokédex.
  const shownTypes = ownTypes?.split(',') ?? pokemon?.types;

  return (
    <section className={`paper-card p-4 sm:p-5 ${className}`} aria-label={title}>
      <header className="mb-3 flex items-baseline gap-2">
        <h3 className="font-serif text-xl font-black tracking-tight text-ink">{title}</h3>
        <p className="font-hand text-lg leading-none text-umber">{caption}</p>
      </header>

      <PokemonPicker pool={pool} onPick={onPick} label={pickerPlaceholder} placeholder={pickerPlaceholder} />

      {/* Cada lado escolhe o próprio time: dá para pôr um time salvo de um lado e outro do lado oposto. */}
      <SavedTeamPicker
        teams={teams}
        loggedIn={loggedIn}
        activeMember={`${side.teamKey}|${side.teamIndex}`}
        defaultOpen={teamsOpen}
        onPick={onPick}
        onLogin={onLogin}
      />

      {extraSource}

      {pokemon && (
        <div className="mt-4 space-y-3.5 border-t border-sepia/25 pt-4">
          <div className="flex items-center gap-3">
            <BattleSprite id={side.form && battle.id ? battle.id : pokemon.id} fainted={side.currentHp === 0} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-serif text-xl font-black tracking-tight text-ink">
                {formatSlug(side.form || pokemon.name)}
                {battle.status === 'loading' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-umber" aria-label="carregando atributos" />}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {shownTypes.map((type) => (
                  <PokemonTypeBadge key={type} type={type} className={side.tera && side.tera !== 'stellar' ? 'line-through opacity-50' : ''} />
                ))}
                {side.tera && (
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-[#BFA2F2]/70 bg-[#BFA2F2]/20 py-0.5 pl-1.5 pr-2 text-[10px] font-bold uppercase tracking-wider text-paint-magenta">
                    <Gem className="h-3 w-3" aria-hidden="true" />
                    Tera {formatSlug(side.tera)}
                  </span>
                )}
                {AIRBORNE_LABELS[airborne] && (
                  <span
                    title="No ar: imune a golpes Ground e fora dos efeitos de terreno e Spikes"
                    className="inline-flex items-center gap-1 rounded-[3px] border border-[#8FB8C9]/70 bg-[#8FB8C9]/20 py-0.5 pl-1.5 pr-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                  >
                    <Feather className="h-3 w-3" aria-hidden="true" />
                    No ar · {AIRBORNE_LABELS[airborne]}
                  </span>
                )}
              </div>
              {speed != null && (
                <p className={`mt-1 flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${faster ? 'text-smeargle-ink-darkGreen' : 'text-umber'}`}>
                  <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                  Spe {speed}
                  {faster && <span className="font-hand text-base font-normal">· age primeiro</span>}
                </p>
              )}
            </div>
            <label className="flex shrink-0 items-center gap-1.5">
              <span className="font-hand text-base leading-none text-umber">Nível</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={set.level}
                onChange={(e) => patchSet({ level: clampLevel(e.target.value) })}
                className="paper-field h-9 w-14 px-1 text-center font-mono tabular-nums"
              />
            </label>
          </div>

          {battle.status === 'error' && (
            <p role="alert" className="flex items-center gap-2 text-xs font-medium text-vermilion-deep">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Não foi possível carregar os atributos deste Pokémon.
            </p>
          )}

          <PartyStrip
            bench={side.bench}
            pool={pool}
            planned={planned}
            inBattle={inBattle}
            onBring={onBring}
            onAdd={onAddReserve}
            onRemove={onRemoveReserve}
          />

          <div className="grid grid-cols-2 gap-2">
            <Field label="forma">
              <select
                value={side.form}
                onChange={(e) => onChange({ form: e.target.value, ability: '' })}
                disabled={forms.length === 0 && !side.form}
                className={`${SELECT} disabled:cursor-not-allowed`}
              >
                <option value="">{forms.length || side.form ? 'Normal' : 'Sem Mega'}</option>
                {/* Forma que veio da batalha (Palafin Hero). */}
                {side.form && !forms.includes(side.form) && <option value={side.form}>{formatSlug(side.form)}</option>}
                {forms.map((form) => <option key={form} value={form}>{formLabel(form, pokemon.name)}</option>)}
              </select>
            </Field>
            <Field label="tera">
              <select value={side.tera} onChange={(e) => onChange({ tera: e.target.value })} className={SELECT}>
                <option value="">Sem Terastal</option>
                {TYPE_NAMES.map((type) => <option key={type} value={type}>Tera {formatSlug(type)}</option>)}
                <option value="stellar">Tera Stellar</option>
              </select>
            </Field>
          </div>

          {stats && (
            <>
              <HpBar
                current={Math.min(side.currentHp ?? maxHp, maxHp)}
                max={maxHp}
                preview={hpPreview}
                onChange={(hp) => onChange({ currentHp: hp === maxHp ? null : hp })}
              />
              <button
                type="button"
                aria-pressed={Boolean(side.dynamax)}
                onClick={() => onChange(toggleDynamax(side, stats.hp))}
                title="PS dobrados por 3 turnos; os golpes viram Max e os de status, Max Guard"
                className={`h-7 cursor-pointer rounded-[3px] border px-2.5 font-serif text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
                  side.dynamax ? 'border-vermilion bg-vermilion text-paper' : 'border-umber/25 bg-paper/70 text-umber hover:border-umber/50'
                }`}
              >
                {side.dynamax ? `Em Dynamax · ${side.dynamax} ${side.dynamax > 1 ? 'turnos' : 'turno'}` : 'Dynamax'}
              </button>
            </>
          )}

          <Field label="habilidade">
            <select
              value={ability}
              onChange={(e) => onChange({ ability: e.target.value })}
              disabled={battle.abilities.length === 0}
              className={`${SELECT} w-full disabled:cursor-not-allowed`}
            >
              {battle.abilities.map((slug) => (
                <option key={slug} value={slug}>{abilityLabel(slug)}{slug === battle.hiddenAbility ? ' (oculta)' : ''}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="item">
              <select value={side.item} onChange={(e) => onChange({ item: e.target.value })} className={SELECT}>
                <option value="">Sem item</option>
                {side.item && !KNOWN_ITEMS.has(side.item) && (
                  <option value={side.item}>{formatSlug(side.item)} (não muda a conta)</option>
                )}
                {ITEM_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="status">
              <select value={side.status} onChange={(e) => onChange({ status: e.target.value, sleepTurns: null, toxicTurns: 0 })} className={SELECT}>
                {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <span className="mb-1 block font-hand text-base leading-none text-umber">golpes</span>
            <ul className="space-y-1.5">
              {side.moves.map((slot, index) => (
                // Os quatro espaços são fixos: a posição é a identidade de cada um.
                <MoveSlot key={index} index={index} slot={slot} learnset={battle.learnset} gmaxMove={gmaxMove} dynamax={side.dynamax} dynamaxSpent={side.dynamaxSpent} battleType={typeBySlot[index]} onChange={onMoveChange} />
              ))}
            </ul>
          </div>

          {/* Estágios começam fechados; o resumo mostra os que estão ativos. */}
          <details className="group rounded-[4px] border border-sepia/30 bg-page/50">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt [&::-webkit-details-marker]:hidden">
              <span id={stagesId} className="font-hand text-lg leading-none text-sepia">estágios</span>
              <span className="ml-auto truncate font-mono text-xs tabular-nums text-umber">{boostSummary(boosts)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-umber transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="border-t border-sepia/25 px-2.5 pb-2.5 pt-2" role="group" aria-labelledby={stagesId}>
              <div className="grid grid-cols-5 gap-1.5">
                {BOOST_KEYS.map((key) => (
                  <BoostStepper key={key} stat={key} value={boosts[key]} onChange={(stage) => onChange({ boosts: { ...boosts, [key]: stage } })} />
                ))}
              </div>
              {boosted && (
                <button
                  type="button"
                  onClick={() => onChange({ boosts: NO_BOOSTS })}
                  className="mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded-[3px] px-2 py-0.5 font-hand text-base leading-none text-umber transition-colors hover:bg-umber/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  zerar
                </button>
              )}
            </div>
          </details>

          <details className="group rounded-[4px] border border-sepia/30 bg-page/50">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt [&::-webkit-details-marker]:hidden">
              <span className="font-hand text-lg leading-none text-sepia">natureza, EVs e IVs</span>
              <span className="ml-auto truncate font-mono text-xs tabular-nums text-umber">
                {formatSlug(set.nature)} · {evTotal(set.evs)}/{MAX_EV_TOTAL} EVs
                {stats && ` · HP ${stats.hp}`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-umber transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="border-t border-sepia/25 px-3 pb-3 pt-2">
              <StatSpreadEditor baseStats={battle.baseStats} set={set} onChange={patchSet} />
            </div>
          </details>
        </div>
      )}
    </section>
  );
}

export default memo(CombatantPanel);
