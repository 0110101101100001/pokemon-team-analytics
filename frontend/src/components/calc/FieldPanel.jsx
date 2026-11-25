import { memo } from 'react';
import { PRIMAL_WEATHERS, TERRAINS, WEATHERS } from '../../data/battleModifiers';
import { FOREVER, MAX_DURATION, turnsLeft, withTimer, withoutTimer } from '../../utils/durations';
import { formatSlug } from '../../utils/filters';

const weatherLabel = (value) => WEATHERS.find((weather) => weather.value === value)?.label ?? value;
const terrainLabel = (value) => TERRAINS.find((terrain) => terrain.value === value)?.label ?? value;

const ROOMS = [
  { key: 'magicRoom', label: 'Magic Room', hint: 'desliga os itens' },
  { key: 'wonderRoom', label: 'Wonder Room', hint: 'troca Def e SpD' },
  { key: 'gravity', label: 'Gravity', hint: 'todos no chão' },
  { key: 'trickRoom', label: 'Trick Room', hint: 'o mais lento age primeiro' },
];

const SIDE_TOGGLES = [
  { key: 'stealthRock', label: 'Stealth Rock' },
  { key: 'steelsurge', label: 'Steelsurge' },
  { key: 'stickyWeb', label: 'Sticky Web' },
  { key: 'reflect', label: 'Reflect' },
  { key: 'lightScreen', label: 'Light Screen' },
  { key: 'auroraVeil', label: 'Aurora Veil' },
  { key: 'tailwind', label: 'Tailwind' },
  { key: 'protect', label: 'Protect' },
  { key: 'leechSeed', label: 'Leech Seed' },
];

const SELECT = 'paper-field h-9 min-w-0 cursor-pointer px-2 text-[13px]';

// O que o último turno mudou pisca uma vez em aguada ocre (`flash.keys`; `flash.token` reinicia a animação).
const flashClass = (flash, key) => (flash?.keys.includes(key) ? 'animate-ink-flash motion-reduce:animate-none' : '');
const flashKey = (flash, key) => (flash?.keys.includes(key) ? `${key}-${flash.token}` : key);

function Chip({ pressed, onToggle, title, flashing = '', children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      title={title}
      className={`h-7 cursor-pointer rounded-[3px] border px-2.5 font-serif text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${flashing} ${
        pressed ? 'border-vermilion bg-vermilion text-paper' : 'border-umber/25 bg-paper/70 text-umber hover:border-umber/50'
      }`}
    >
      {children}
    </button>
  );
}

const TURN_OPTIONS = Array.from({ length: MAX_DURATION }, (_, index) => index + 1);

/** Turnos que faltam de um efeito, editáveis; ∞ = sem prazo. Some quando o efeito não está em campo. */
function TurnsSelect({ label, turns, pressed = false, onChange }) {
  if (turns == null) return null;
  return (
    <select
      value={turns}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={`Turnos restantes de ${label}`}
      title="Turnos que faltam, contando este"
      className={`shrink-0 cursor-pointer rounded-[3px] font-mono text-[11px] font-bold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
        pressed ? 'h-7 border border-vermilion bg-paper px-0.5 text-vermilion-deep' : 'h-5 bg-transparent text-umber'
      }`}
    >
      {TURN_OPTIONS.map((count) => <option key={count} value={count}>{count}t</option>)}
      <option value={FOREVER}>∞</option>
    </select>
  );
}

function SideConditions({ index, title, conditions, timed, flash, onChange }) {
  return (
    <fieldset className="min-w-0 rounded-[4px] border border-sepia/25 p-2">
      <legend className="px-1 font-hand text-base leading-none text-sepia">{title}</legend>
      <div className="flex flex-wrap gap-1">
        {SIDE_TOGGLES.map(({ key, label }) => (
          <span key={flashKey(flash, `${index}:${key}`)} className="inline-flex gap-px">
            <Chip
              pressed={conditions[key]}
              flashing={flashClass(flash, `${index}:${key}`)}
              onToggle={() => onChange({ [key]: !conditions[key], timers: withoutTimer(conditions.timers, key) })}
            >
              {label}
            </Chip>
            <TurnsSelect
              pressed
              label={`${label} (${title})`}
              turns={turnsLeft(timed, key)}
              onChange={(turns) => onChange({ timers: withTimer(timed, key, turns).timers })}
            />
          </span>
        ))}
        {conditions.gmaxDamage && (
          <Chip
            key={flashKey(flash, `${index}:gmaxDamage`)}
            pressed
            title="Tirar este efeito do campo"
            flashing={flashClass(flash, `${index}:gmaxDamage`)}
            onToggle={() => onChange({ gmaxDamage: null })}
          >
            {formatSlug(conditions.gmaxDamage.slug).replace('G Max', 'G-Max')} · {conditions.gmaxDamage.turns}t
          </Chip>
        )}
        <label
          key={flashKey(flash, `${index}:spikes`)}
          className={`flex h-7 items-center gap-1 rounded-[3px] border border-umber/25 bg-paper/70 pl-2.5 pr-1 font-serif text-[11px] font-semibold text-umber ${flashClass(flash, `${index}:spikes`)}`}
        >
          Spikes
          <select
            value={conditions.spikes}
            onChange={(e) => onChange({ spikes: Number(e.target.value) })}
            className="h-5 cursor-pointer rounded-[3px] bg-transparent font-mono text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            {[0, 1, 2, 3].map((layers) => <option key={layers} value={layers}>{layers}</option>)}
          </select>
        </label>
        <label
          key={flashKey(flash, `${index}:toxicSpikes`)}
          className={`flex h-7 items-center gap-1 rounded-[3px] border border-umber/25 bg-paper/70 pl-2.5 pr-1 font-serif text-[11px] font-semibold text-umber ${flashClass(flash, `${index}:toxicSpikes`)}`}
        >
          Toxic Spikes
          <select
            value={conditions.toxicSpikes}
            onChange={(e) => onChange({ toxicSpikes: Number(e.target.value) })}
            className="h-5 cursor-pointer rounded-[3px] bg-transparent font-mono text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            {[0, 1, 2].map((layers) => <option key={layers} value={layers}>{layers}</option>)}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

/**
 * Campo de batalha: clima, terreno, salas e as condições de cada lado.
 * `autoWeather` e `autoTerrain` vêm das habilidades (Drought, Electric Surge…); `weatherSuppressor` é a
 * Cloud Nine ou Air Lock em campo. Todos são avisados embaixo do campo.
 */
function FieldPanel({ field, battleField, rawWeather, autoWeather, autoTerrain, weatherSuppressor, sideTitles, flash, onChange, onSideChange }) {
  // Com Cloud Nine o clima segue contando, por isso o prazo é o do clima que existe.
  const timed = { ...battleField, weather: rawWeather };
  const setTurns = (key) => (turns) => onChange({ timers: withTimer(timed, key, turns).timers });
  const setValue = (key, value) => onChange({ [key]: value, timers: withoutTimer(field.timers, key) });

  return (
    <section className="paper-card space-y-2.5 p-3.5 sm:p-4" aria-label="Campo de batalha">
      <h3 className="font-hand text-xl leading-none text-sepia">campo de batalha</h3>

      <div className="grid grid-cols-2 gap-2">
        <div key={flashKey(flash, 'weather')} className={`min-w-0 rounded-[3px] ${flashClass(flash, 'weather')}`}>
          <div className="mb-0.5 flex h-5 items-end justify-between gap-1">
            <span className="font-hand text-base leading-none text-umber">clima</span>
            <TurnsSelect label="clima" turns={turnsLeft(timed, 'weather')} onChange={setTurns('weather')} />
          </div>
          <select aria-label="clima" value={field.weather} onChange={(e) => setValue('weather', e.target.value)} className={`${SELECT} w-full`}>
            {field.weather === 'none' && <option value="none">Clima encerrado</option>}
            {WEATHERS.map((weather) => <option key={weather.value} value={weather.value}>{weather.label}</option>)}
          </select>
        </div>
        <div key={flashKey(flash, 'terrain')} className={`min-w-0 rounded-[3px] ${flashClass(flash, 'terrain')}`}>
          <div className="mb-0.5 flex h-5 items-end justify-between gap-1">
            <span className="font-hand text-base leading-none text-umber">terreno</span>
            <TurnsSelect label="terreno" turns={turnsLeft(timed, 'terrain')} onChange={setTurns('terrain')} />
          </div>
          <select aria-label="terreno" value={field.terrain} onChange={(e) => setValue('terrain', e.target.value)} className={`${SELECT} w-full`}>
            {(autoTerrain || field.terrain === 'none') && <option value="none">Terreno encerrado</option>}
            {TERRAINS.map((terrain) => <option key={terrain.value} value={terrain.value}>{terrain.label}</option>)}
          </select>
        </div>
      </div>

      {weatherSuppressor ? (
        <p className="font-hand text-base leading-tight text-olive-ink">
          sem clima: {formatSlug(weatherSuppressor)} anula qualquer clima em campo
        </p>
      ) : autoWeather && (!field.weather || PRIMAL_WEATHERS.has(autoWeather.value)) && (
        <p className="font-hand text-base leading-tight text-olive-ink">
          clima em campo: {weatherLabel(autoWeather.value)}, trazido por {formatSlug(autoWeather.ability)}
          {field.weather && field.weather !== 'none' && field.weather !== autoWeather.value ? ' (clima primal: não pode ser trocado)' : ''}
        </p>
      )}
      {autoTerrain && !field.terrain && (
        <p className="font-hand text-base leading-tight text-olive-ink">
          terreno em campo: {terrainLabel(autoTerrain.value)}, trazido por {formatSlug(autoTerrain.ability)}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {ROOMS.map(({ key, label, hint }) => (
          <span key={flashKey(flash, key)} className="inline-flex gap-px">
            <Chip pressed={field[key]} flashing={flashClass(flash, key)} onToggle={() => setValue(key, !field[key])} title={hint}>
              {label}
            </Chip>
            <TurnsSelect pressed label={label} turns={turnsLeft(timed, key)} onChange={setTurns(key)} />
          </span>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {sideTitles.map((title, index) => (
          <SideConditions
            key={title}
            index={index}
            title={title}
            conditions={field.sides[index]}
            timed={battleField.sides[index]}
            flash={flash}
            onChange={(changes) => onSideChange(index, changes)}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(FieldPanel);
