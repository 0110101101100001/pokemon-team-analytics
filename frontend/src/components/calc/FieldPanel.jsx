import { memo } from 'react';
import { PRIMAL_WEATHERS, TERRAINS, WEATHERS } from '../../data/battleModifiers';
import { formatSlug } from '../../utils/filters';

const weatherLabel = (value) => WEATHERS.find((weather) => weather.value === value)?.label ?? value;
const terrainLabel = (value) => TERRAINS.find((terrain) => terrain.value === value)?.label ?? value;

const ROOMS = [
  { key: 'magicRoom', label: 'Magic Room', hint: 'desliga os itens' },
  { key: 'wonderRoom', label: 'Wonder Room', hint: 'troca Def e SpD' },
  { key: 'gravity', label: 'Gravity', hint: 'todos no chão' },
];

const SIDE_TOGGLES = [
  { key: 'stealthRock', label: 'Stealth Rock' },
  { key: 'reflect', label: 'Reflect' },
  { key: 'lightScreen', label: 'Light Screen' },
  { key: 'auroraVeil', label: 'Aurora Veil' },
  { key: 'tailwind', label: 'Tailwind' },
  { key: 'protect', label: 'Protect' },
  { key: 'leechSeed', label: 'Leech Seed' },
];

const SELECT = 'paper-field h-9 min-w-0 cursor-pointer px-2 text-[13px]';

function Chip({ pressed, onToggle, title, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      title={title}
      className={`h-7 cursor-pointer rounded-full border px-2.5 font-serif text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
        pressed ? 'border-smeargle-olive bg-smeargle-olive text-[#FFFEFB] shadow-sm' : 'border-[#78614E]/25 bg-[#FFFEFB]/70 text-[#78614E] hover:border-[#78614E]/50'
      }`}
    >
      {children}
    </button>
  );
}

function SideConditions({ title, conditions, onChange }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-[#5C4033]/25 p-2">
      <legend className="px-1 font-hand text-base leading-none text-[#5C4033]">{title}</legend>
      <div className="flex flex-wrap gap-1">
        {SIDE_TOGGLES.map(({ key, label }) => (
          <Chip key={key} pressed={conditions[key]} onToggle={() => onChange({ [key]: !conditions[key] })}>{label}</Chip>
        ))}
        <label className="flex h-7 items-center gap-1 rounded-full border border-[#78614E]/25 bg-[#FFFEFB]/70 pl-2.5 pr-1 font-serif text-[11px] font-semibold text-[#78614E]">
          Spikes
          <select
            value={conditions.spikes}
            onChange={(e) => onChange({ spikes: Number(e.target.value) })}
            className="h-5 cursor-pointer rounded-full bg-transparent font-mono text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
          >
            {[0, 1, 2, 3].map((layers) => <option key={layers} value={layers}>{layers}</option>)}
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
function FieldPanel({ field, autoWeather, autoTerrain, weatherSuppressor, sideTitles, onChange, onSideChange }) {
  return (
    <section className="paper-card space-y-2.5 p-3.5 sm:p-4" aria-label="Campo de batalha">
      <h3 className="font-hand text-xl leading-none text-[#5C4033]">campo de batalha</h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="mb-0.5 block font-hand text-base leading-none text-[#78614E]">clima</span>
          <select value={field.weather} onChange={(e) => onChange({ weather: e.target.value })} className={SELECT}>
            {WEATHERS.map((weather) => <option key={weather.value} value={weather.value}>{weather.label}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-0.5 block font-hand text-base leading-none text-[#78614E]">terreno</span>
          <select value={field.terrain} onChange={(e) => onChange({ terrain: e.target.value })} className={SELECT}>
            {TERRAINS.map((terrain) => <option key={terrain.value} value={terrain.value}>{terrain.label}</option>)}
          </select>
        </label>
      </div>

      {weatherSuppressor ? (
        <p className="font-hand text-base leading-tight text-[#5B7856]">
          sem clima: {formatSlug(weatherSuppressor)} anula qualquer clima em campo
        </p>
      ) : autoWeather && (!field.weather || PRIMAL_WEATHERS.has(autoWeather.value)) && (
        <p className="font-hand text-base leading-tight text-[#5B7856]">
          clima em campo: {weatherLabel(autoWeather.value)}, trazido por {formatSlug(autoWeather.ability)}
          {field.weather && field.weather !== autoWeather.value ? ' (clima primal: não pode ser trocado)' : ''}
        </p>
      )}
      {autoTerrain && !field.terrain && (
        <p className="font-hand text-base leading-tight text-[#5B7856]">
          terreno em campo: {terrainLabel(autoTerrain.value)}, trazido por {formatSlug(autoTerrain.ability)}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {ROOMS.map(({ key, label, hint }) => (
          <Chip key={key} pressed={field[key]} onToggle={() => onChange({ [key]: !field[key] })} title={hint}>{label}</Chip>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {sideTitles.map((title, index) => (
          <SideConditions key={title} title={title} conditions={field.sides[index]} onChange={(changes) => onSideChange(index, changes)} />
        ))}
      </div>
    </section>
  );
}

export default memo(FieldPanel);
