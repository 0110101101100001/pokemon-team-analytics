import { memo } from 'react';
import { turnsLeft } from '../../utils/durations';

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
  steelsurge: 'Steelsurge',
  stickyWeb: 'Sticky Web',
};

const OUTLINE = 'inline-flex h-5 items-center border-[1.5px] px-1 font-mono text-[10px] font-bold leading-none tabular-nums';

function statusDetail(side) {
  if (side.status === 'toxic') return ` ${Math.min(15, (side.toxicTurns ?? 0) + 1)}/16`;
  if (side.status === 'sleep') return ` ${side.sleepTurns ?? 2}`;
  return '';
}

/** Selos do que os G-Max deixaram no Pokémon e no lado dele. */
function gmaxStates({ volatiles = {} }, conditions) {
  const { trap, trapped, confusion, infatuated, yawn, torment, critStage } = volatiles;
  return [
    conditions?.gmaxDamage && `Dano G-Max ${conditions.gmaxDamage.turns}t`,
    conditions?.toxicSpikes > 0 && `${conditions.toxicSpikes}× Toxic Spikes`,
    trap && `Preso ${trap.turns}t`,
    trapped && 'Sem troca',
    confusion > 0 && `Confuso ${confusion}t`,
    infatuated && 'Apaixonado',
    yawn > 0 && 'Sonolento',
    torment > 0 && `Torment ${torment}t`,
    critStage > 0 && `Crít. +${critStage}`,
  ].filter(Boolean);
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
  const lingering = gmaxStates(side, conditions);
  if (!status && boosts.length === 0 && active.length === 0 && !spikes && !side.bide && !side.dynamax && lingering.length === 0) return null;

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
          className={`${OUTLINE} ${stage > 0 ? 'border-good/70 text-good' : 'border-danger/70 text-danger'}`}
        >
          {STAT_LABELS[stat]} {stage > 0 ? `+${stage}` : `−${-stage}`}
        </li>
      ))}
      {active.map(([key, label]) => {
        const left = turnsLeft(conditions, key);
        return <li key={key} className={`${OUTLINE} border-sepia/50 font-reading text-sepia`}>{label}{left ? ` ${left}t` : ''}</li>;
      })}
      {spikes > 0 && <li className={`${OUTLINE} border-sepia/50 font-reading text-sepia`}>{spikes}× Spikes</li>}
      {side.dynamax > 0 && <li className={`${OUTLINE} border-vermilion text-vermilion-deep`}>Dynamax {side.dynamax}t</li>}
      {lingering.map((label) => <li key={label} className={`${OUTLINE} border-ochre text-ochre-deep`}>{label}</li>)}
      {side.bide && <li className={`${OUTLINE} border-ochre text-ochre-deep`}>Bide {side.bide.turns}/2</li>}
    </ul>
  );
}

export default memo(StateChips);
