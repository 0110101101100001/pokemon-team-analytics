import { memo } from 'react';
import { ChevronDown, CloudSun, HeartPulse, Info, RotateCcw, SkipForward, Sparkles, Swords, X } from 'lucide-react';
import { formatSlug } from '../../utils/filters';

const SELECT = 'paper-field h-9 min-w-0 cursor-pointer px-2 text-[13px]';

// Ícone e cor de cada tipo de linha do registro (utils/turn.js).
const KINDS = {
  damage: [Swords, 'text-vermilion-deep', 'dano'],
  heal: [HeartPulse, 'text-olive-deep', 'cura'],
  status: [Sparkles, 'text-paint-magenta', 'efeito'],
  field: [CloudSun, 'text-paint-cobalt', 'campo'],
  faint: [X, 'text-vermilion-deep', 'desmaio'],
  info: [Info, 'text-umber', 'aviso'],
};

/** O texto da linha com "−N PS" em vermelho-escuro e "+N PS" em oliva, os dois em mono. */
function LineText({ text }) {
  return text.split(/([−+]\d+ PS)/).map((part, index) => {
    if (!/^[−+]\d+ PS$/.test(part)) return part;
    const tone = part.startsWith('+') ? 'text-olive-deep' : 'text-vermilion-deep';
    return <span key={index} className={`font-mono text-[12px] font-bold tabular-nums ${tone}`}>{part}</span>;
  });
}

function TurnLines({ lines }) {
  return (
    <ol className="space-y-1 font-reading text-[13px] leading-snug text-ink">
      {lines.map((line, index) => {
        const [Icon, tone, label] = KINDS[line.kind] ?? KINDS.info;
        return (
          <li key={index} className="flex gap-2">
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} aria-label={label} />
            <span className={line.kind === 'faint' ? 'font-semibold text-vermilion-deep' : ''}><LineText text={line.text} /></span>
          </li>
        );
      })}
    </ol>
  );
}

/** Golpe de um lado para o turno: só os espaços com golpe escolhido. */
function MovePick({ label, side, value, onChange }) {
  const options = side.moves.map((slot, index) => [index, slot.move]).filter(([, move]) => move);
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block font-hand text-base leading-none text-umber">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        disabled={options.length === 0 || Boolean(side.bide)}
        className={`${SELECT} w-full disabled:cursor-not-allowed`}
      >
        <option value="">{side.bide ? 'Bide (acumulando)' : 'Escolha um golpe'}</option>
        {options.map(([index, move]) => <option key={index} value={index}>{formatSlug(move.slug)}</option>)}
      </select>
    </label>
  );
}

/** Se dá para passar o turno: os dois Pokémon escolhidos, um golpe de cada lado (ou o Bide em curso) e ninguém desmaiado. */
export function turnReady(sides, picks) {
  const chosen = sides.every((side) => side.pokemon)
    && picks.every((pick, index) => sides[index].bide || (pick != null && sides[index].moves[pick]?.move));
  const fainted = sides.some((side) => side.currentHp === 0);
  return { chosen, fainted, ready: chosen && !fainted };
}

/**
 * Turno a turno: um golpe de cada lado e o botão de passar o turno, que tira dos PS o dano médio na ordem do jogo.
 * Embaixo, o registro: o último turno aberto e os anteriores recolhidos; "recomeçar" volta ao estado do início.
 */
function TurnPanel({ sides, picks, turn, history, names, onPick, onPass, onReset }) {
  const { chosen, fainted, ready } = turnReady(sides, picks);
  const [latest, ...older] = history;

  return (
    <section className="paper-card px-4 pb-3.5 pt-4" aria-label="Turno">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-bold leading-none text-ink">Turno {turn + 1}</h3>
        {turn > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[3px] px-2 py-0.5 font-hand text-base leading-none text-umber transition-colors hover:bg-umber/10"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            recomeçar
          </button>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <MovePick label="seu golpe" side={sides[0]} value={picks[0]} onChange={(slot) => onPick(0, slot)} />
        <MovePick label="golpe do oponente" side={sides[1]} value={picks[1]} onChange={(slot) => onPick(1, slot)} />
      </div>

      <button type="button" onClick={onPass} disabled={!ready} className="btn-action mt-3 w-full">
        <SkipForward className="h-4 w-4" aria-hidden="true" />
        Passar o turno
      </button>
      {!chosen && <p className="mt-1.5 font-reading text-xs italic text-ink-soft">Escolha um golpe seu e um do oponente.</p>}
      {fainted && <p className="mt-1.5 font-reading text-xs italic text-vermilion-deep">Um dos lados desmaiou: recomece ou ajuste os PS.</p>}

      {latest && (
        <div className="mt-3 border-t border-sepia/25 pt-2.5">
          <p className="mb-1.5 font-hand text-base leading-none text-sepia">turno {latest.turn}</p>
          <TurnLines lines={latest.lines} />
          <p className="sr-only" aria-live="polite">{`${names[0]} e ${names[1]}: turno ${latest.turn} concluído.`}</p>
        </div>
      )}
      {older.length > 0 && (
        <details className="group mt-2.5 border-t border-sepia/25 pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-hand text-base leading-none text-umber [&::-webkit-details-marker]:hidden">
            turnos anteriores ({older.length})
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <div className="mt-2 space-y-2.5">
            {older.map((entry) => (
              <div key={entry.turn}>
                <p className="mb-1 font-hand text-sm leading-none text-sepia">turno {entry.turn}</p>
                <TurnLines lines={entry.lines} />
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export default memo(TurnPanel);
