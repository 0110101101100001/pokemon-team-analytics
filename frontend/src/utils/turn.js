import {
  activeItem, calcSpeed, calculateDamage, confusionDamage, isDynamaxed, poweredType, residualEffects, sturdyHolds,
} from './damage';
import { baseMaxHp, dynamaxed, hpRatio, withoutDynamax } from './dynamax';
import { MOLD_BREAKERS } from '../data/battleModifiers';
import { formatSlug } from './filters';
import { PROTECT_MOVES, SLEEP_TURNS, activeField, applyMoveEffects, isFieldMove, passEffects, removesSecondary } from './moveEffects';
import { poweredMove } from './poweredMoves';
import {
  PHAZE_MOVES, PIVOT_MOVES, arrive, canDrag, incomingOf, releaseOpponent, replaceActive, settlePrimal, trapReason,
} from './switching';
import { currentHp } from './variablePower';

/*
  Um turno da calculadora: cada lado usa o golpe escolhido, na ordem do jogo (prioridade, depois velocidade;
  Trick Room inverte), e o dano tirado é o médio dos 16 resultados. Quem cai não age; quem dorme ou está
  congelado perde a vez. Golpes de status aplicam o efeito (utils/moveEffects). No fim do turno entram veneno,
  queimadura, areia, Leech Seed (que cura quem plantou), Leftovers e o resto do saldo por turno.
  O golpe que cada lado recebe fica anotado (`lastHit`), para Counter, Mirror Coat e Metal Burst no mesmo turno.

  Bide: no primeiro uso o lado passa a acumular o dano recebido; no segundo continua; no terceiro devolve o dobro.
  Enquanto acumula, o lado só usa Bide.

  Recuo (flinch): um golpe com 100% de recuo que acerta antes do alvo agir tira a vez dele (Fake Out). Inner Focus,
  Shield Dust e Covert Cloak impedem; Steadfast sobe a Spe de quem recua. Chances menores não entram (resultado médio).

  Dynamax: escolher um Max ou G-Max liga o Dynamax no começo do turno, e ele acaba no fim do terceiro.
  Confusão (33% de se acertar) e paixão (50% de não agir) entram pela média no dano; um golpe de status só falha
  se a chance de agir ficar abaixo de 50%.

  Trocas (utils/switching): acontecem antes dos golpes e do Dynamax, o mais rápido primeiro; Pursuit pega quem sai.
  U-turn e afins trocam depois do golpe e Roar e afins arrastam: entra `incoming` ou, sem escolha, a primeira reserva
  de pé. Com `replacing`, só entram os substitutos de quem desmaiou: ninguém age e o turno não passa.
*/

const FLINCH_IMMUNE_ABILITIES = new Set(['inner-focus', 'shield-dust']);

// Chance de crítico com os acúmulos do G-Max Chi Strike (com 3, calculateDamage já dá o crítico).
const CRIT_CHANCE = [0, 1 / 8, 1 / 2];
const CONFUSION_SELF_HIT = 0.33;
const INFATUATION_STOP = 0.5;
const PROTECTS_FROM_MAX = 'max-guard';
// Golpes de status que Protect não barra.
const THROUGH_PROTECT = new Set([
  'stealth-rock', 'spikes', 'toxic-spikes', 'sticky-web', 'roar', 'whirlwind', 'mean-look', 'block', 'tidy-up',
]);

const average = (rolls) => rolls.reduce((total, roll) => total + roll, 0) / rolls.length;

/** Dano médio de um uso: a média dos 16 resultados por acerto, somando os acertos e o 2º golpe do Parental Bond. */
export function averageDamage(result) {
  if (result.reason) return 0;
  const perHit = Math.round(average(result.rolls));
  return perHit * result.hits + (result.extraRolls ? Math.round(average(result.extraRolls)) : 0);
}

/** Quem age primeiro (0 ou 1): prioridade maior, depois mais rápido (mais lento sob Trick Room); empate, o seu lado. */
export function turnOrder(combatants, moves, sideConditions, field) {
  // Z e Max agem com prioridade 0; a do golpe original só conta para o que bloqueia prioridade.
  const priority = moves.map((move) => (move?.powered ? 0 : move?.priority ?? 0));
  if (priority[0] !== priority[1]) return priority[0] > priority[1] ? [0, 1] : [1, 0];
  const speeds = combatants.map((combatant, index) => {
    const noScarf = isDynamaxed(moves[index]) && combatant.item === 'choice-scarf';
    return calcSpeed(noScarf ? { ...combatant, item: '' } : combatant, sideConditions[index], field);
  });
  if (speeds[0] === speeds[1]) return [0, 1];
  const firstIsFaster = speeds[0] > speeds[1];
  return firstIsFaster !== Boolean(field.trickRoom) ? [0, 1] : [1, 0];
}

const BIDE = { slug: 'bide', name: 'Bide', type: 'normal', category: 'physical', damageClass: 'physical', power: null, priority: 1, hits: 1, crit: false };
const targetsUserSide = (move) => ['user', 'users-field', 'user-and-allies', 'entire-field'].includes(move.effects?.target);

/** Se o lado perde a vez por sono ou congelamento; o sono conta os turnos e acorda quando eles acabam. */
function skipsTurn(battle, index) {
  if (battle.status[index] === 'freeze') return 'está congelado e não age';
  if (battle.status[index] !== 'sleep') return null;
  const turns = battle.sleepTurns[index] ?? SLEEP_TURNS;
  if (turns > 0) {
    battle.sleepTurns[index] = turns - 1;
    return 'está dormindo';
  }
  battle.status[index] = '';
  battle.sleepTurns[index] = null;
  return null;
}

/** Z e Max são decididos na hora do ataque: o clima, o terreno ou a Gravity podem ter mudado no mesmo turno. */
function convertNow(move, attacker, field) {
  if (!move?.powerUp) return move;
  const { move: original, mode, gmaxMove } = move.powerUp;
  const { category, hits, crit, outcome } = move;
  return { ...poweredMove(original, mode, gmaxMove, poweredType(original, mode, attacker, field)), category, hits, crit, outcome };
}

/**
 * Simula um turno. `combatants` trazem `currentHp`, `boosts`, `status`, `toxicTurns`, `sleepTurns` e `bide`;
 * `moves` são os golpes resolvidos de cada lado (null = não age); `names` vão no registro.
 * Devolve o novo estado de cada lado ({ hp, boosts, status, toxicTurns, sleepTurns, bide, lastHit }),
 * as condições de cada lado, o campo e as linhas do registro.
 */
export function simulateTurn({
  combatants: entering, moves, sideConditions, field, names: startNames,
  bench = [[], []], switches = [null, null], incoming = [null, null], replacing = false,
}) {
  // As trocas mudam quem está em campo, e com isso o nome no registro.
  const names = [...startNames];
  const activates = entering.map((side, index) => (
    !replacing && switches[index] == null && !side.dynamax && currentHp(side) > 0 && isDynamaxed(moves[index])
  ));
  const combatants = entering.map((side, index) => (activates[index] ? dynamaxed(side) : side));
  const battle = {
    combatants,
    hp: combatants.map(currentHp),
    boosts: combatants.map((combatant) => ({ ...combatant.boosts })),
    status: combatants.map((combatant) => combatant.status ?? ''),
    toxicTurns: combatants.map((combatant) => combatant.toxicTurns ?? 0),
    sleepTurns: combatants.map((combatant) => combatant.sleepTurns ?? null),
    bide: combatants.map((combatant) => combatant.bide ?? null),
    turnsOut: combatants.map((combatant) => combatant.turnsOut ?? 0),
    lastHit: [null, null],
    volatiles: combatants.map((combatant) => ({ ...combatant.volatiles })),
    boostUsed: combatants.map((combatant) => Boolean(combatant.boostUsed)),
    bench: bench.map((members) => [...members]),
    benched: new Map(),
    // Protect só vale no turno em que é usado: a marcação manual do campo não entra na simulação.
    conditions: sideConditions.map((conditions) => ({ ...conditions, protect: false, maxGuard: false })),
    field: { ...field },
  };
  const log = [];
  // Cada linha do registro tem um tipo, que a interface mostra com ícone: damage, heal, status, field, faint, info.
  const say = (side, text, kind = 'info') => log.push({ side, text, kind });
  const state = (index) => ({
    ...combatants[index],
    currentHp: battle.hp[index],
    boosts: battle.boosts[index],
    status: battle.status[index],
    toxicTurns: battle.toxicTurns[index],
    lastHit: battle.lastHit[index],
    bide: battle.bide[index],
    volatiles: battle.volatiles[index],
  });
  // Quem está acumulando Bide só usa Bide.
  const chosen = moves.map((move, index) => {
    if (replacing || switches[index] != null) return null;
    return battle.bide[index] ? BIDE : move;
  });
  const protecting = [false, false];
  const acted = [false, false];
  const flinched = [false, false];
  const arrived = [false, false];
  const report = (lines) => lines.forEach((line) => say(line.side, line.text, line.kind));
  /** Tira `index` de campo e põe `next`; quem entra não age mais neste turno. */
  const bringIn = (index, next, { pass = false, effects = true } = {}) => {
    report(replaceActive(battle, index, next, { pass, names }));
    chosen[index] = null;
    acted[index] = false;
    flinched[index] = false;
    protecting[index] = false;
    arrived[index] = true;
    battle.conditions[index] = { ...battle.conditions[index], protect: false, maxGuard: false };
    if (effects) report(arrive(battle, index, names));
  };

  const act = (from, { calledBack = false } = {}) => {
    const to = 1 - from;
    let move = convertNow(chosen[from], state(from), activeField(battle));
    // Pursuit pega quem está saindo com o dobro do poder.
    if (calledBack) move = { ...move, power: move.power * 2 };
    if (!move || battle.hp[from] <= 0) return;
    acted[from] = true;
    const moveName = move.name ?? formatSlug(move.slug);
    if (flinched[from]) {
      say(from, `${names[from]} recuou e não age.`);
      if (combatants[from].ability === 'steadfast' && battle.boosts[from].spe < 6) {
        battle.boosts[from] = { ...battle.boosts[from], spe: battle.boosts[from].spe + 1 };
        say(from, `${names[from]}: Spe +1 (Steadfast).`, 'status');
      }
      return;
    }
    const skip = skipsTurn(battle, from);
    if (skip) {
      say(from, `${names[from]} ${skip}.`);
      return;
    }

    const usedSlug = move.poweredFrom ?? move.slug;
    if (battle.volatiles[from].torment && !combatants[from].dynamax && battle.volatiles[from].lastMove === usedSlug) {
      say(from, `${names[from]} não pode repetir ${moveName} (Torment).`);
      return;
    }

    // Parte das vezes em que o lado consegue agir.
    let actChance = 1;
    if (battle.volatiles[from].confusion) {
      battle.volatiles[from] = { ...battle.volatiles[from], confusion: battle.volatiles[from].confusion - 1 };
      actChance = 1 - CONFUSION_SELF_HIT;
      const hurt = Math.min(battle.hp[from], Math.round(confusionDamage(state(from)) * CONFUSION_SELF_HIT));
      battle.hp[from] -= hurt;
      say(from, `${names[from]} está confuso: em média perde ${hurt} PS e age em 67% das vezes.`, 'damage');
      if (battle.hp[from] === 0) {
        say(from, `${names[from]} desmaiou.`, 'faint');
        return;
      }
    }
    if (battle.volatiles[from].infatuated) {
      actChance *= 1 - INFATUATION_STOP;
      say(from, `${names[from]} está apaixonado: age em metade das vezes.`);
    }
    if (move.category === 'status' && actChance < 0.5) {
      say(from, `${names[from]} não consegue usar ${moveName}.`);
      return;
    }
    battle.volatiles[from] = { ...battle.volatiles[from], lastMove: usedSlug };

    if (PROTECT_MOVES.has(move.slug)) {
      protecting[from] = true;
      battle.conditions[from] = { ...battle.conditions[from], protect: true, maxGuard: move.slug === PROTECTS_FROM_MAX };
      say(from, `${names[from]} usa ${moveName} e se protege.`, 'status');
      return;
    }

    // Bide: os dois primeiros usos só acumulam; o terceiro devolve o dobro (calculateDamage lê `bide`).
    if (move.slug === 'bide' && (!battle.bide[from] || battle.bide[from].turns < 2)) {
      const turns = (battle.bide[from]?.turns ?? 0) + 1;
      battle.bide[from] = { turns, stored: battle.bide[from]?.stored ?? 0 };
      say(from, `${names[from]} usa Bide e acumula energia (${turns}/2).`, 'status');
      return;
    }

    if (battle.hp[to] <= 0 && !targetsUserSide(move)) return;

    if (move.category === 'status') {
      if (protecting[to] && !targetsUserSide(move) && !THROUGH_PROTECT.has(move.slug)) {
        say(from, `${names[from]} usa ${moveName}, mas ${names[to]} se protegeu.`);
        return;
      }
      const before = battle.boosts[to];
      let notes = applyMoveEffects(battle, { from, to, move, damage: 0, names });
      let follow = null;
      if (PHAZE_MOVES.has(move.slug)) {
        if (move.slug === 'roar' && combatants[to].ability === 'soundproof' && !MOLD_BREAKERS.has(combatants[from].ability)) {
          notes = ['falhou: o alvo é imune a golpes de som'];
        } else if (!canDrag(combatants[from], combatants[to])) notes = [`falhou: ${names[to]} não sai do campo`];
        else {
          const next = incomingOf(battle.bench[to], incoming[to]);
          if (next) follow = () => bringIn(to, next);
          notes = [next ? `arrasta ${names[to]} para fora` : 'falhou: não há reservas'];
        }
      } else if (PIVOT_MOVES.has(move.slug)) {
        const next = incomingOf(battle.bench[from], incoming[from]);
        // Parting Shot só troca se mudou algum estágio do alvo.
        const works = move.slug !== 'parting-shot' || battle.boosts[to] !== before;
        notes = notes.filter((note) => note !== 'sem efeito na conta' && !note.startsWith('efeito desconhecido'));
        if (works && next) follow = () => bringIn(from, next, { pass: move.slug === 'baton-pass' });
        if (follow) notes.push('volta para o time');
        else if (!notes.length) notes.push(works ? 'falhou: não há reservas' : 'falhou');
      }
      say(from, `${names[from]} usa ${moveName}: ${notes.join('; ')}.`, isFieldMove(move.slug) ? 'field' : move.effects?.healing > 0 || move.slug === 'rest' ? 'heal' : 'status');
      follow?.();
      return;
    }

    const attacker = state(from);
    const defender = state(to);
    const result = calculateDamage({
      attacker, defender, move, field: activeField(battle), attackerSide: battle.conditions[from], defenderSide: battle.conditions[to],
      targetMoved: acted[to],
    });
    if (move.slug === 'bide') battle.bide[from] = null;
    if (result.reason) {
      say(from, `${names[from]} usa ${moveName}: ${result.reason}`);
      return;
    }

    let damage = averageDamage(result);
    const critChance = result.crit || result.fixed ? 0 : CRIT_CHANCE[attacker.volatiles.critStage] ?? 0;
    if (critChance) {
      const critical = calculateDamage({
        attacker, defender, move: { ...move, crit: true }, field: activeField(battle),
        attackerSide: battle.conditions[from], defenderSide: battle.conditions[to], targetMoved: acted[to],
      });
      damage = Math.round(damage * (1 - critChance) + averageDamage(critical) * critChance);
    }
    if (sturdyHolds(result, defender, attacker) && damage >= battle.hp[to]) damage = battle.hp[to] - 1;
    if (actChance < 1) damage = Math.round(damage * actChance);
    damage = Math.min(damage, battle.hp[to]);
    battle.hp[to] -= damage;
    battle.lastHit[to] = { damage, category: move.category };
    if (battle.bide[to]) battle.bide[to] = { ...battle.bide[to], stored: battle.bide[to].stored + damage };

    const notes = applyMoveEffects(battle, { from, to, move, damage, names });
    // Recuo certo (Fake Out): só tira a vez se o alvo ainda não agiu neste turno.
    if (damage > 0 && move.effects?.flinchChance >= 100 && !removesSecondary(move, attacker)
      && !combatants[to].dynamax && !acted[to] && battle.hp[to] > 0) {
      const target = combatants[to];
      if (FLINCH_IMMUNE_ABILITIES.has(target.ability)) notes.push(`${names[to]} não recua (${formatSlug(target.ability)})`);
      else if (activeItem(target, battle.field) === 'covert-cloak') notes.push(`${names[to]} não recua (Covert Cloak)`);
      else {
        flinched[to] = true;
        notes.push(`${names[to]} recua`);
      }
    }
    say(from, `${names[from]} usa ${moveName}: −${damage} PS em ${names[to]}${notes.length ? `; ${notes.join('; ')}` : ''}.`, 'damage');

    if (result.fixed?.selfFaint) {
      battle.hp[from] = 0;
      say(from, `${names[from]} desmaia (Final Gambit).`, 'faint');
    } else if (damage > 0 && activeItem(attacker, battle.field) === 'life-orb' && attacker.ability !== 'magic-guard'
      && !removesSecondary(move, attacker)) {
      const recoil = Math.min(battle.hp[from], Math.floor(baseMaxHp(attacker) / 10));
      battle.hp[from] -= recoil;
      say(from, `${names[from]} perde ${recoil} PS pela Life Orb.`, 'damage');
    }
    if (battle.hp[to] === 0) say(to, `${names[to]} desmaiou.`, 'faint');
    if (battle.hp[from] === 0 && !result.fixed?.selfFaint) say(from, `${names[from]} desmaiou.`, 'faint');

    for (const index of [from, to]) {
      if (battle.hp[index] > 0) continue;
      releaseOpponent(battle, index);
      if (settlePrimal(battle)) say(index, 'o clima primal acaba.', 'field');
    }
    if (damage <= 0 || calledBack || battle.hp[from] <= 0) return;
    if (PIVOT_MOVES.has(move.slug)) {
      const next = incomingOf(battle.bench[from], incoming[from]);
      if (next) bringIn(from, next);
    } else if (PHAZE_MOVES.has(move.slug) && battle.hp[to] > 0) {
      const next = incomingOf(battle.bench[to], incoming[to]);
      if (!next) return;
      if (canDrag(attacker, defender)) bringIn(to, next);
      else say(to, `${names[to]} não é arrastado para fora.`);
    }
  };

  if (replacing) {
    // Os substitutos entram juntos e só depois os efeitos de entrada agem.
    const replaced = [0, 1].filter((index) => {
      if (battle.hp[index] > 0 || switches[index] == null) return false;
      const next = battle.bench[index].find((member) => member.uid === switches[index] && member.currentHp !== 0);
      if (next) bringIn(index, next, { effects: false });
      return Boolean(next);
    });
    for (const index of turnOrder(combatants.map((_, side) => state(side)), [null, null], battle.conditions, activeField(battle))) {
      if (replaced.includes(index)) report(arrive(battle, index, names));
    }
    return outcome();
  }

  for (const index of turnOrder(combatants, [null, null], battle.conditions, activeField(battle))) {
    if (switches[index] == null || battle.hp[index] <= 0) continue;
    const other = 1 - index;
    const next = battle.bench[index].find((member) => member.uid === switches[index] && member.currentHp !== 0);
    if (!next) continue;
    const reason = battle.bide[index] ? 'está acumulando Bide' : trapReason(state(index), state(other), battle.field);
    if (reason) {
      say(index, `${names[index]} não pode trocar: ${reason}.`);
      continue;
    }
    if (chosen[other]?.slug === 'pursuit' && !acted[other]) {
      act(other, { calledBack: true });
      chosen[other] = null;
      // Se caiu, a troca não acontece: escolhe-se um substituto no fim do turno.
      if (battle.hp[index] <= 0) continue;
    }
    bringIn(index, next);
  }
  activates.forEach((active, index) => {
    if (active) say(index, `${names[index]} entra em Dynamax.`, 'status');
  });
  const order = turnOrder(combatants.map((_, index) => state(index)), chosen, battle.conditions, activeField(battle));
  for (const from of order) act(from);

  // Fim do turno: o saldo por turno de cada lado que ainda está de pé (perdas menos recuperação).
  [0, 1].forEach((index) => {
    if (battle.hp[index] <= 0) return;
    const other = 1 - index;
    const combatant = state(index);
    const effects = residualEffects(combatant, battle.conditions[index], activeField(battle), state(other));
    if (battle.status[index] === 'toxic') battle.toxicTurns[index] += 1;
    // As notas também trazem os hazards de entrada, que não acontecem no fim do turno.
    const notes = effects.notes.filter((note) => note !== 'Stealth Rock' && note !== 'Steelsurge' && !note.endsWith('Spikes'));
    const before = battle.hp[index];
    battle.hp[index] = Math.min(combatant.stats.hp, Math.max(0, battle.hp[index] - effects.perTurn - effects.timed.reduce((total, loss) => total + loss.amount, 0)));
    const change = battle.hp[index] - before;
    if (change !== 0) {
      say(index, `${names[index]}: ${change > 0 ? '+' : '−'}${Math.abs(change)} PS no fim do turno (${notes.join(', ')}).`, change > 0 ? 'heal' : 'damage');
    }

    // Leech Seed: o que o semeado perde vai para quem plantou, se ele estiver de pé.
    if (battle.conditions[index].leechSeed && notes.includes('Leech Seed') && battle.hp[other] > 0) {
      const drained = Math.min(before, Math.floor(baseMaxHp(combatant) / 8));
      const max = combatants[other].stats.hp;
      const healed = Math.max(0, Math.min(drained, max - battle.hp[other]));
      battle.hp[other] += healed;
      if (healed) say(other, `${names[other]}: +${healed} PS do Leech Seed.`, 'heal');
    }
    if (battle.hp[index] === 0) {
      say(index, `${names[index]} desmaiou.`, 'faint');
      releaseOpponent(battle, index);
      if (settlePrimal(battle)) say(index, 'o clima primal acaba.', 'field');
    }
  });

  for (const line of passEffects(battle, names)) say(line.side, line.text, line.kind);

  return outcome();

  function outcome() {
    const dynamax = combatants.map((side, index) => {
      if (replacing) return { dynamax: side.dynamax ?? 0, dynamaxSpent: Boolean(side.dynamaxSpent) };
      if (!side.dynamax) return { dynamax: 0, dynamaxSpent: Boolean(side.dynamaxSpent) };
      const left = battle.hp[index] > 0 ? side.dynamax - 1 : 0;
      if (left) return { dynamax: left, dynamaxSpent: false };
      if (battle.hp[index] > 0) {
        battle.hp[index] = withoutDynamax(battle.hp[index], side.species);
        say(index, `${names[index]} sai do Dynamax.`, 'status');
      }
      return { dynamax: 0, dynamaxSpent: true };
    });

    return {
      sides: [0, 1].map((index) => ({
        ...dynamax[index],
        volatiles: battle.volatiles[index],
        currentHp: battle.hp[index],
        boosts: battle.boosts[index],
        status: battle.status[index],
        toxicTurns: battle.toxicTurns[index],
        sleepTurns: battle.sleepTurns[index],
        bide: battle.bide[index],
        lastHit: battle.lastHit[index],
        // Mais um turno em campo para os dois lados (Fake Out só vale no primeiro).
        turnsOut: arrived[index] || replacing ? battle.turnsOut[index] : battle.turnsOut[index] + 1,
        entered: true,
        boostUsed: battle.boostUsed[index],
      })),
      // Quem terminou em campo, quem saiu (por uid) e se houve troca.
      active: combatants.map((side) => side.uid),
      maxHp: combatants.map((side, index) => baseMaxHp(side) * (dynamax[index].dynamax ? hpRatio(side.species) : 1)),
      abilities: combatants.map((side) => side.ability),
      benched: battle.benched,
      switched: arrived.some(Boolean),
      // Protect não passa para o turno seguinte: devolve a marcação manual de antes.
      conditions: battle.conditions.map(({ maxGuard, ...conditions }, index) => ({ ...conditions, protect: sideConditions[index].protect })),
      field: battle.field,
      log,
    };
  }
}
