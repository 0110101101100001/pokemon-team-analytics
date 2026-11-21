import { memo } from 'react';

// Status como selo cheio na cor do tipo que combina com ele (queimadura = Fire, veneno = Poison…).
const STATUS_CHIPS = {
  burn: ['BRN', 'fire', 'queimado'],
  poison: ['PSN', 'poison', 'envenenado'],
  toxic: ['TOX', 'poison', 'muito envenenado'],
  paralysis: ['PAR', 'electric', 'paralisado'],
  sleep: ['SLP', 'psychic', 'dormindo'],
  freeze: ['FRZ', 'ice', 'congelado'],
};
const STAT_LABELS = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const CONDITION_LABELS = {
  leechSeed: 'Leech Seed',
  reflect: 'Reflect',
  lightScreen: 'Light Screen',
  auroraVeil: 'Aurora Veil',
  tailwind: 'Tailwind',
  stealthRock: 'Stealth Rock',
};

const OUTLINE = 'inline-flex h-5 items-center border-[1.5px] px-1 font-mono text-[10px] font-bold leading-none tabular-nums';

function statusDetail(side) {
  if (side.status === 'toxic') return ` ${Math.min(15, (side.toxicTurns ?? 0) + 1)}/16`;
  if (side.status === 'sleep') return ` ${side.sleepTurns ?? 2}`;
  return '';
}

/**
 * Estado do lado num olhar: status (selo cheio), estágios (contorno oliva para cima, vermelho-escuro para baixo),
 * condições do lado e o Bide em curso. Nada aparece quando o lado está limpo.
 */
function StateChips({ side, conditions, className = '' }) {
  const status = STATUS_CHIPS[side.status];
  const boosts = Object.entries(side.boosts ?? {}).filter(([, stage]) => stage);
  const active = Object.entries(CONDITION_LABELS).filter(([key]) => conditions?.[key]);
  const spikes = conditions?.spikes ?? 0;
  if (!status && boosts.length === 0 && active.length === 0 && !spikes && !side.bide) return null;

  return (
    <ul className={`flex flex-wrap gap-1 ${className}`} aria-label="Estado em batalha">
      {status && (
        <li className="type-chip !px-1 !py-0.5 font-mono text-[10px]" data-type={status[1]} title={status[2]}>
          {status[0]}{statusDetail(side)}
        </li>
      )}
      {boosts.map(([stat, stage]) => (
        <li
          key={stat}
          className={`${OUTLINE} ${stage > 0 ? 'border-olive-deep text-olive-ink' : 'border-vermilion-deep/70 text-vermilion-deep'}`}
        >
          {STAT_LABELS[stat]} {stage > 0 ? `+${stage}` : `−${-stage}`}
        </li>
      ))}
      {active.map(([key, label]) => <li key={key} className={`${OUTLINE} border-sepia/50 font-reading text-sepia`}>{label}</li>)}
      {spikes > 0 && <li className={`${OUTLINE} border-sepia/50 font-reading text-sepia`}>{spikes}× Spikes</li>}
      {side.bide && <li className={`${OUTLINE} border-ochre text-ochre-deep`}>Bide {side.bide.turns}/2</li>}
    </ul>
  );
}

export default memo(StateChips);
