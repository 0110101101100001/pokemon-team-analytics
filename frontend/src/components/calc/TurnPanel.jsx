import { memo } from 'react';
import { ChevronDown, CloudSun, HeartPulse, Info, RotateCcw, SkipForward, Sparkles, Swords, X } from 'lucide-react';
import { formatSlug } from '../../utils/filters';
import { PHAZE_MOVES, PIVOT_MOVES, incomingOf } from '../../utils/switching';

const SELECT = 'paper-field h-9 min-w-0 cursor-pointer px-2 text-[13px]';

// Ícone e cor de cada tipo de linha do registro (utils/turn.js).
const KINDS = {
  damage: [Swords, 'text-vermilion-deep', 'dano'],
  heal: [HeartPulse, 'text-olive-ink', 'cura'],
  status: [Sparkles, 'text-paint-magenta', 'efeito'],
  field: [CloudSun, 'text-paint-cobalt', 'campo'],
  faint: [X, 'text-vermilion-deep', 'desmaio'],
  info: [Info, 'text-umber', 'aviso'],
};

/** O texto da linha com "−N PS" em vermelho-escuro e "+N PS" em oliva, os dois em mono. */
function LineText({ text }) {
  return text.split(/([−+]\d+ PS)/).map((part, index) => {
    if (!/^[−+]\d+ PS$/.test(part)) return part;
    const tone = part.startsWith('+') ? 'text-good' : 'text-danger';
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

const SWITCH = 'switch:';
const memberName = (member) => formatSlug(member.form || member.pokemon.name);
const standingReserves = (side) => side.bench.filter((member) => member.currentHp !== 0);

/** Valor da ação "trocar para `uid`" na escolha do turno. */
export const switchPick = (uid) => `${SWITCH}${uid}`;

/** O uid da troca escolhida, ou null se a escolha é um golpe. */
export const switchUid = (pick) => (typeof pick === 'string' && pick.startsWith(SWITCH) ? Number(pick.slice(SWITCH.length)) : null);

/** Nome da ação escolhida, para a barra do celular. */
export function actionName(side, pick) {
  const uid = switchUid(pick);
  if (uid != null) {
    const member = side.bench.find((candidate) => candidate.uid === uid);
    return member ? `trocar: ${memberName(member)}` : '—';
  }
  const move = side.moves[pick]?.move;
  return move ? formatSlug(move.slug) : '—';
}

/** Ação de um lado para o turno: um golpe ou uma troca; desmaiado, só o substituto. */
function MovePick({ label, side, value, trapped, onChange }) {
  const down = side.currentHp === 0;
  const moves = down ? [] : side.moves.map((slot, index) => [index, slot.move]).filter(([, move]) => move);
  const reserves = standingReserves(side);
  const known = moves.some(([index]) => index === value) || reserves.some((member) => switchPick(member.uid) === value);
  let placeholder = 'Escolha um golpe';
  if (down) placeholder = reserves.length ? 'Escolha o substituto' : 'Sem reservas';
  else if (side.bide) placeholder = 'Bide (acumulando)';

  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block font-hand text-base leading-none text-umber">{label}</span>
      <select
        value={known ? value : ''}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === '' ? null : next.startsWith(SWITCH) ? next : Number(next));
        }}
        disabled={(moves.length === 0 && reserves.length === 0) || (Boolean(side.bide) && !down)}
        className={`${SELECT} w-full disabled:cursor-not-allowed`}
      >
        <option value="">{placeholder}</option>
        {moves.map(([index, move]) => <option key={index} value={index}>{formatSlug(move.slug)}</option>)}
        {reserves.length > 0 && (
          <optgroup label={trapped && !down ? `Trocar (${trapped})` : down ? 'Entra' : 'Trocar para'}>
            {reserves.map((member) => (
              <option key={member.uid} value={switchPick(member.uid)} disabled={Boolean(trapped) && !down}>{memberName(member)}</option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}

/** Se o golpe escolhido de um dos lados pode tirar `index` de campo. */
function mayLeave(sides, picks, index) {
  if (sides.some((side) => side.currentHp === 0)) return false;
  const slugOf = (at) => sides[at].moves[picks[at]]?.move?.slug;
  return PIVOT_MOVES.has(slugOf(index)) || PHAZE_MOVES.has(slugOf(1 - index));
}

/** Quem entra se o lado sair por U-turn, Roar e afins (no jogo, o do Roar é sorteado). */
function IncomingPick({ label, side, value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block font-hand text-base leading-none text-umber">{label}</span>
      <select value={incomingOf(side.bench, value)?.uid ?? ''} onChange={(e) => onChange(Number(e.target.value))} className={`${SELECT} w-full`}>
        {standingReserves(side).map((member) => <option key={member.uid} value={member.uid}>{memberName(member)}</option>)}
      </select>
    </label>
  );
}

/**
 * Se dá para seguir: com os dois de pé, uma ação de cada lado (golpe, Bide em curso ou troca permitida); com alguém
 * desmaiado (`replacing`), o substituto de cada um que caiu. `over`: um lado caiu e não tem mais reservas.
 */
export function turnReady(sides, picks, trapped = [null, null]) {
  if (!sides.every((side) => side.pokemon)) return { chosen: false, replacing: false, over: false, ready: false };
  const replacing = sides.some((side) => side.currentHp === 0);
  const over = sides.some((side) => side.currentHp === 0 && standingReserves(side).length === 0);
  const chosen = sides.every((side, index) => {
    const uid = switchUid(picks[index]);
    const reserve = uid != null && standingReserves(side).some((member) => member.uid === uid);
    if (replacing) return side.currentHp !== 0 || reserve;
    if (side.bide) return true;
    if (reserve) return !trapped[index];
    return picks[index] != null && Boolean(side.moves[picks[index]]?.move);
  });
  return { chosen, replacing, over, ready: chosen && !over };
}

/**
 * Turno a turno: um golpe de cada lado e o botão de passar o turno, que tira dos PS o dano médio na ordem do jogo.
 * Embaixo, o registro: o último turno aberto e os anteriores recolhidos; "recomeçar" volta ao estado do início.
 */
function TurnPanel({ sides, picks, incoming, trapped, error, turn, history, names, onPick, onIncoming, onPass, onReset }) {
  const { chosen, replacing, over, ready } = turnReady(sides, picks, trapped);
  const leaving = [0, 1].filter((index) => mayLeave(sides, picks, index) && standingReserves(sides[index]).length > 0);
  const [latest, ...older] = history;

  return (
    <section className="paper-card px-4 pb-3.5 pt-4" aria-label="Turno">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-bold leading-none text-ink">Turno {turn + 1}</h3>
        {history.length > 0 && (
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
        <MovePick label="seu golpe" side={sides[0]} value={picks[0]} trapped={trapped[0]} onChange={(slot) => onPick(0, slot)} />
        <MovePick label="golpe do oponente" side={sides[1]} value={picks[1]} trapped={trapped[1]} onChange={(slot) => onPick(1, slot)} />
        {leaving.map((index) => (
          <div key={index} className={index ? 'col-start-2' : 'col-start-1'}>
            <IncomingPick
              label={index ? 'entra no oponente' : 'entra no seu lado'}
              side={sides[index]}
              value={incoming[index]}
              onChange={(uid) => onIncoming(index, uid)}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={onPass} disabled={!ready} className="btn-action mt-3 w-full">
        <SkipForward className="h-4 w-4" aria-hidden="true" />
        {replacing && !over ? 'Colocar em campo' : 'Passar o turno'}
      </button>
      {!chosen && !over && (
        <p className="mt-1.5 font-reading text-xs italic text-ink-soft">
          {replacing ? 'Escolha quem entra no lugar de quem desmaiou.' : 'Escolha um golpe seu e um do oponente.'}
        </p>
      )}
      {over && <p className="mt-1.5 font-reading text-xs italic text-vermilion-deep">Um dos lados ficou sem Pokémon: recomece, adicione reservas ou ajuste os PS.</p>}
      {error && <p role="alert" className="mt-1.5 font-reading text-xs italic text-vermilion-deep">{error}</p>}

      {latest && (
        <div className="mt-3 border-t border-sepia/25 pt-2.5">
          <p className="mb-1.5 font-hand text-base leading-none text-sepia">{latest.label}</p>
          <TurnLines lines={latest.lines} />
          <p className="sr-only" aria-live="polite">{`${names[0]} e ${names[1]}: ${latest.label} concluído.`}</p>
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
              <div key={entry.id}>
                <p className="mb-1 font-hand text-sm leading-none text-sepia">{entry.label}</p>
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
