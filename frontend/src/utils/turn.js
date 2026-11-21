import { activeItem, calcSpeed, calculateDamage, residualEffects, sturdyHolds } from './damage';
import { formatSlug } from './filters';
import { PROTECT_MOVES, SLEEP_TURNS, applyMoveEffects, isFieldMove } from './moveEffects';
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
*/

const FLINCH_IMMUNE_ABILITIES = new Set(['inner-focus', 'shield-dust']);

const average = (rolls) => rolls.reduce((total, roll) => total + roll, 0) / rolls.length;

/** Dano médio de um uso: a média dos 16 resultados por acerto, somando os acertos e o 2º golpe do Parental Bond. */
export function averageDamage(result) {
  if (result.reason) return 0;
  const perHit = Math.round(average(result.rolls));
  return perHit * result.hits + (result.extraRolls ? Math.round(average(result.extraRolls)) : 0);
}

/** Quem age primeiro (0 ou 1): prioridade maior, depois mais rápido (mais lento sob Trick Room); empate, o seu lado. */
export function turnOrder(combatants, moves, sideConditions, field) {
  const priority = moves.map((move) => move?.priority ?? 0);
  if (priority[0] !== priority[1]) return priority[0] > priority[1] ? [0, 1] : [1, 0];
  const speeds = combatants.map((combatant, index) => calcSpeed(combatant, sideConditions[index], field));
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

/**
 * Simula um turno. `combatants` trazem `currentHp`, `boosts`, `status`, `toxicTurns`, `sleepTurns` e `bide`;
 * `moves` são os golpes resolvidos de cada lado (null = não age); `names` vão no registro.
 * Devolve o novo estado de cada lado ({ hp, boosts, status, toxicTurns, sleepTurns, bide, lastHit }),
 * as condições de cada lado, o campo e as linhas do registro.
 */
export function simulateTurn({ combatants, moves, sideConditions, field, names }) {
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
    // Protect só vale no turno em que é usado: a marcação manual do campo não entra na simulação.
    conditions: sideConditions.map((conditions) => ({ ...conditions, protect: false })),
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
  });
  // Quem está acumulando Bide só usa Bide.
  const chosen = moves.map((move, index) => (battle.bide[index] ? BIDE : move));
  const protecting = [false, false];
  const acted = [false, false];
  const flinched = [false, false];

  for (const from of turnOrder(combatants, chosen, battle.conditions, battle.field)) {
    const to = 1 - from;
    const move = chosen[from];
    if (!move || battle.hp[from] <= 0) continue;
    acted[from] = true;
    const moveName = move.name ?? formatSlug(move.slug);
    if (flinched[from]) {
      say(from, `${names[from]} recuou e não age.`);
      if (combatants[from].ability === 'steadfast' && battle.boosts[from].spe < 6) {
        battle.boosts[from] = { ...battle.boosts[from], spe: battle.boosts[from].spe + 1 };
        say(from, `${names[from]}: Spe +1 (Steadfast).`, 'status');
      }
      continue;
    }
    const skip = skipsTurn(battle, from);
    if (skip) {
      say(from, `${names[from]} ${skip}.`);
      continue;
    }

    if (PROTECT_MOVES.has(move.slug)) {
      protecting[from] = true;
      battle.conditions[from] = { ...battle.conditions[from], protect: true };
      say(from, `${names[from]} usa ${moveName} e se protege.`, 'status');
      continue;
    }

    // Bide: os dois primeiros usos só acumulam; o terceiro devolve o dobro (calculateDamage lê `bide`).
    if (move.slug === 'bide' && (!battle.bide[from] || battle.bide[from].turns < 2)) {
      const turns = (battle.bide[from]?.turns ?? 0) + 1;
      battle.bide[from] = { turns, stored: battle.bide[from]?.stored ?? 0 };
      say(from, `${names[from]} usa Bide e acumula energia (${turns}/2).`, 'status');
      continue;
    }

    if (battle.hp[to] <= 0 && !targetsUserSide(move)) continue;

    if (move.category === 'status') {
      if (protecting[to] && !targetsUserSide(move)) {
        say(from, `${names[from]} usa ${moveName}, mas ${names[to]} se protegeu.`);
        continue;
      }
      const notes = applyMoveEffects(battle, { from, to, move, damage: 0, names });
      say(from, `${names[from]} usa ${moveName}: ${notes.join('; ')}.`, isFieldMove(move.slug) ? 'field' : move.effects?.healing > 0 || move.slug === 'rest' ? 'heal' : 'status');
      continue;
    }

    const attacker = state(from);
    const defender = state(to);
    const result = calculateDamage({
      attacker, defender, move, field: battle.field, attackerSide: battle.conditions[from], defenderSide: battle.conditions[to],
    });
    if (move.slug === 'bide') battle.bide[from] = null;
    if (result.reason) {
      say(from, `${names[from]} usa ${moveName}: ${result.reason}`);
      continue;
    }

    let damage = averageDamage(result);
    if (sturdyHolds(result, defender, attacker) && damage >= battle.hp[to]) damage = battle.hp[to] - 1;
    damage = Math.min(damage, battle.hp[to]);
    battle.hp[to] -= damage;
    battle.lastHit[to] = { damage, category: move.category };
    if (battle.bide[to]) battle.bide[to] = { ...battle.bide[to], stored: battle.bide[to].stored + damage };

    const notes = applyMoveEffects(battle, { from, to, move, damage, names });
    // Recuo certo (Fake Out): só tira a vez se o alvo ainda não agiu neste turno.
    if (damage > 0 && move.effects?.flinchChance >= 100 && !acted[to] && battle.hp[to] > 0) {
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
    } else if (damage > 0 && activeItem(attacker, battle.field) === 'life-orb' && attacker.ability !== 'magic-guard') {
      const recoil = Math.min(battle.hp[from], Math.floor(attacker.stats.hp / 10));
      battle.hp[from] -= recoil;
      say(from, `${names[from]} perde ${recoil} PS pela Life Orb.`, 'damage');
    }
    if (battle.hp[to] === 0) say(to, `${names[to]} desmaiou.`, 'faint');
    if (battle.hp[from] === 0 && !result.fixed?.selfFaint) say(from, `${names[from]} desmaiou.`, 'faint');
  }

  // Fim do turno: o saldo por turno de cada lado que ainda está de pé (perdas menos recuperação).
  [0, 1].forEach((index) => {
    if (battle.hp[index] <= 0) return;
    const other = 1 - index;
    const combatant = state(index);
    const effects = residualEffects(combatant, battle.conditions[index], battle.field, state(other));
    if (battle.status[index] === 'toxic') battle.toxicTurns[index] += 1;
    // As notas também trazem os hazards de entrada, que não acontecem no fim do turno.
    const notes = effects.notes.filter((note) => note !== 'Stealth Rock' && !note.endsWith('Spikes'));
    const before = battle.hp[index];
    battle.hp[index] = Math.min(combatant.stats.hp, Math.max(0, battle.hp[index] - effects.perTurn));
    const change = battle.hp[index] - before;
    if (change !== 0) {
      say(index, `${names[index]}: ${change > 0 ? '+' : '−'}${Math.abs(change)} PS no fim do turno (${notes.join(', ')}).`, change > 0 ? 'heal' : 'damage');
    }

    // Leech Seed: o que o semeado perde vai para quem plantou, se ele estiver de pé.
    if (battle.conditions[index].leechSeed && notes.includes('Leech Seed') && battle.hp[other] > 0) {
      const drained = Math.min(before, Math.floor(combatant.stats.hp / 8));
      const max = combatants[other].stats.hp;
      const healed = Math.max(0, Math.min(drained, max - battle.hp[other]));
      battle.hp[other] += healed;
      if (healed) say(other, `${names[other]}: +${healed} PS do Leech Seed.`, 'heal');
    }
    if (battle.hp[index] === 0) say(index, `${names[index]} desmaiou.`, 'faint');
  });

  return {
    sides: [0, 1].map((index) => ({
      currentHp: battle.hp[index],
      boosts: battle.boosts[index],
      status: battle.status[index],
      toxicTurns: battle.toxicTurns[index],
      sleepTurns: battle.sleepTurns[index],
      bide: battle.bide[index],
      lastHit: battle.lastHit[index],
      // Mais um turno em campo para os dois lados (Fake Out só vale no primeiro).
      turnsOut: battle.turnsOut[index] + 1,
    })),
    // Protect não passa para o turno seguinte: devolve a marcação manual de antes.
    conditions: battle.conditions.map((conditions, index) => ({ ...conditions, protect: sideConditions[index].protect })),
    field: battle.field,
    log,
  };
}
