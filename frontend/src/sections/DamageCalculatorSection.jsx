import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CombatantPanel from '../components/calc/CombatantPanel';
import DamageResult from '../components/calc/DamageResult';
import FieldPanel from '../components/calc/FieldPanel';
import ResultsList from '../components/calc/ResultsList';
import TrainerTeamPicker from '../components/calc/TrainerTeamPicker';
import {
  MAX_RESERVES, createField, createSide, resolveSlot, sideFromPokemon, sideFromTeam, swapIn,
} from '../components/calc/calcState';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { fetchCombatData, useBattleForms, useFormBattleData } from '../hooks/usePokemonBattleData';
import { useSavedTeams } from '../hooks/useSavedTeams';
import { formTypes } from '../data/formItems';
import { gmaxMoveOf } from '../data/gmaxMoves';
import TurnPanel, { switchPick, switchUid, turnReady } from '../components/calc/TurnPanel';
import BattleScoreboard from '../components/calc/BattleScoreboard';
import MobileTurnBar from '../components/calc/MobileTurnBar';
import { PHAZE_MOVES, PIVOT_MOVES, trapReason } from '../utils/switching';
import { simulateTurn } from '../utils/turn';
import { fetchMoveSummary } from '../services/api';
import { PRIMAL_WEATHERS, TERRAIN_ABILITIES, WEATHER_ABILITIES, WEATHER_SUPPRESSORS } from '../data/battleModifiers';
import { activeItem, airborneBy, battleTypeOf, calcSpeed, calculateDamage, describeKnockout, isCalculable, withWeatherType } from '../utils/damage';
import { fieldAtTurn, withTimers } from '../utils/durations';
import { hpRatio } from '../utils/dynamax';
import { calcStats } from '../utils/stats';
import { formatSlug } from '../utils/filters';
import { navigateHash } from '../navigation/hashRoute';
import { CALCULATOR_HREF, trainerBattleFromHash } from '../navigation/sections';

// `trainers`: o lado pode puxar o time de um líder, Elite 4 ou campeão.
const SIDES = [
  { title: 'Seu Pokémon', caption: 'do seu lado', picker: 'Escolher seu Pokémon por nome ou número...', field: 'Seu lado' },
  { title: 'Oponente', caption: 'do outro lado', picker: 'Escolher o oponente por nome ou número...', field: 'Lado do oponente', trainers: true },
];

/**
 * O lado como a fórmula espera: atributos finais, habilidade resolvida, item, status e estágios.
 * Os tipos são os da forma escolhida (Mega/Primal); com Tera, os tipos em batalha passam a ser só o tipo Tera
 * (Stellar mantém os originais), e os originais seguem valendo para o STAB.
 */
function toCombatant(side, battle, ability, rawAbility = ability) {
  const stats = calcStats(battle.baseStats, side.set);
  const baseHp = stats.hp;
  if (side.dynamax) stats.hp *= hpRatio(side.pokemon.name);
  const originalTypes = formTypes(side.pokemon.name, side.item) ?? (battle.types.length ? battle.types : side.pokemon.types);
  return {
    uid: side.uid,
    name: formatSlug(side.form || side.pokemon.name),
    rawAbility,
    entered: side.entered,
    boostUsed: side.boostUsed,
    level: side.set.level,
    species: side.pokemon.name,
    types: side.tera && side.tera !== 'stellar' ? [side.tera] : originalTypes,
    originalTypes,
    tera: side.tera,
    stats,
    baseHp,
    dynamax: side.dynamax,
    dynamaxSpent: side.dynamaxSpent,
    volatiles: side.volatiles,
    boosts: side.boosts,
    item: side.item,
    ability,
    status: side.status,
    weight: battle.weight,
    currentHp: side.currentHp,
    toxicTurns: side.toxicTurns,
    sleepTurns: side.sleepTurns,
    bide: side.bide,
    lastHit: side.lastHit,
    turnsOut: side.turnsOut,
    ivs: side.set.ivs,
    baseStats: battle.baseStats,
  };
}

/**
 * Clima ou terreno trazido pelas habilidades dos dois lados (Drought, Electric Surge…): { value, ability } ou null.
 * Um clima primal vence; entre dois comuns, fica o do mais lento, que entra em campo por último.
 */
function fromAbilities(abilities, speeds, table) {
  const candidates = abilities
    .map((ability, index) => ({ ability, value: table[ability], speed: speeds[index] ?? 0 }))
    .filter((candidate) => candidate.value);
  if (candidates.length === 0) return null;
  const primal = candidates.find((candidate) => PRIMAL_WEATHERS.has(candidate.value));
  return primal ?? candidates.reduce((slowest, candidate) => (candidate.speed < slowest.speed ? candidate : slowest));
}

/** Se o lado `index` age antes do outro: o mais rápido, ou o mais lento sob Trick Room. Empate não marca ninguém. */
function actsFirst(speeds, index, trickRoom) {
  const [own, other] = [speeds[index], speeds[1 - index]];
  if (own == null || other == null) return false;
  return trickRoom ? own < other : own > other;
}

/** Neutralizing Gas desliga a habilidade do oponente (a não ser que ele também a tenha). */
const neutralize = (abilities) => abilities.map((ability, index) => (
  abilities[1 - index] === 'neutralizing-gas' && ability !== 'neutralizing-gas' ? '' : ability
));

/** Nome e sprite em exibição: os da Mega/Primal quando escolhida. */
const shownPokemon = (side, battle) => (side.pokemon && side.form
  ? { id: battle.id ?? side.pokemon.id, name: side.form }
  : side.pokemon);

// O que a simulação muda em cada Pokémon; "recomeçar" volta ao que era antes do primeiro turno.
const BATTLE_KEYS = ['currentHp', 'boosts', 'status', 'toxicTurns', 'sleepTurns', 'bide', 'lastHit', 'turnsOut', 'dynamax', 'dynamaxSpent', 'volatiles', 'entered', 'boostUsed'];
const BATTLE_FIELD_KEYS = ['weather', 'terrain', 'trickRoom', 'gravity', 'magicRoom', 'wonderRoom'];
const membersOf = (side) => [side, ...side.bench];
const pickReset = [null, null];
// O herói do Palafin é a única forma que a própria batalha muda.
const HERO_FORM = 'palafin-hero';

/** O lado antes do primeiro turno: quem estava em campo, a ordem e o estado de cada um, por uid. */
const battleSnapshot = (side) => ({
  active: side.uid,
  order: side.bench.map((member) => member.uid),
  members: new Map(membersOf(side).map((member) => [
    member.uid, { form: member.form, ...Object.fromEntries(BATTLE_KEYS.map((key) => [key, member[key]])) },
  ])),
});

/** O lado de volta ao snapshot, mantendo o que foi editado no set e quem entrou no time depois. */
function restoreSide(side, saved) {
  const members = membersOf(side).map((member) => {
    const before = saved.members.get(member.uid);
    if (!before) return { ...member, bench: [] };
    const { form, ...state } = before;
    return { ...member, ...state, bench: [], form: member.form === HERO_FORM ? form : member.form };
  });
  const active = members.find((member) => member.uid === saved.active) ?? members[0];
  const position = (member) => {
    const at = saved.order.indexOf(member.uid);
    return at === -1 ? saved.order.length : at;
  };
  const bench = members.filter((member) => member !== active).sort((a, b) => position(a) - position(b));
  return { ...active, bench };
}

/** O lado depois do turno: o estado novo de quem está em campo e de quem saiu, e quem ficou na vaga de quem. */
function sideAfterTurn(side, turn, index) {
  const next = turn.sides[index];
  const activeUid = turn.active[index];
  const current = { ...next, currentHp: next.currentHp === turn.maxHp[index] ? null : next.currentHp };
  const updated = (member) => ({ ...member, ...(member.uid === activeUid ? current : turn.benched.get(member.uid)) });
  const { bench, ...own } = side;
  const merged = { ...updated(own), bench: bench.map(updated) };
  return activeUid === side.uid ? merged : swapIn(merged, activeUid);
}

// Resumos antigos (times salvos antes dos efeitos ou do recuo) não têm `effects` completos: busca de novo, do cache.
const withEffects = (move) => (move && move.effects?.flinchChance === undefined ? fetchMoveSummary(move.slug).then((fresh) => fresh ?? move) : move);

function resultHint(sides) {
  if (!sides[0].pokemon) return 'Escolha o seu Pokémon.';
  if (!sides[1].pokemon) return 'Escolha o oponente.';
  if (sides.every((side) => side.moves.every((slot) => !slot.move))) return 'Escolha ao menos um golpe de um dos lados.';
  return 'Nenhum dos golpes escolhidos causa dano (são todos de status).';
}

export default function DamageCalculatorSection({ pool, team, session, onLogin }) {
  const [sides, setSides] = useState(() => [createSide(), createSide()]);
  const [field, setField] = useState(createField);
  const [selected, setSelected] = useState({ side: 0, slot: 0 });
  // Turno a turno: o golpe escolhido de cada lado, quantos turnos passaram e o registro do último.
  const [turnPicks, setTurnPicks] = useState([null, null]);
  // Registro: os turnos já passados (o mais recente primeiro) e o estado de antes do primeiro, para "recomeçar".
  const [turnLog, setTurnLog] = useState({ turn: 0, history: [], start: null });
  // O que o último turno mudou no campo, para piscar no painel de campo.
  const [fieldFlash, setFieldFlash] = useState(null);
  // Quem entra se o lado sair por U-turn, Roar e afins.
  const [incoming, setIncoming] = useState(pickReset);
  const [turnError, setTurnError] = useState(null);
  const passing = useRef(false);
  const inBattle = turnLog.history.length > 0;
  // Lido pelos callbacks, que precisam ficar estáveis entre renderizações.
  const latest = useRef(null);
  latest.current = { sides, inBattle };
  // Vindo do card da Liga, o endereço traz a batalha; ela é lida uma vez e sai do endereço,
  // para um recarregamento não desfazer o que o usuário mudou depois.
  const [trainerBattleId] = useState(trainerBattleFromHash);
  useEffect(() => {
    if (trainerBattleId) navigateHash(CALCULATOR_HREF, { replace: true });
  }, [trainerBattleId]);

  // Atalhos de Pokémon de cada lado: o time em montagem no Team Builder e, com login, os times salvos.
  const savedTeams = useSavedTeams(session);
  const teamSources = useMemo(() => [
    ...(team.length ? [{ id: 'current', label: 'Time em montagem', members: team }] : []),
    ...savedTeams
      .filter((saved) => saved.pokemons?.length)
      .map((saved) => ({ id: saved.id, label: saved.name, members: saved.pokemons })),
  ], [team, savedTeams]);

  const battles = [
    useFormBattleData(sides[0].pokemon?.name ?? null, sides[0].form),
    useFormBattleData(sides[1].pokemon?.name ?? null, sides[1].form),
  ];
  const forms = [useBattleForms(sides[0].pokemon?.name ?? null), useBattleForms(sides[1].pokemon?.name ?? null)];
  // G-Max de cada lado: só a forma base que Gigantamaxiza (Charizard sim, Charizard Mega X não).
  const gmaxMoves = sides.map((side) => gmaxMoveOf(side.form || side.pokemon?.name));
  // Só valem habilidades da espécie (ou da forma); sem escolha válida, a primeira delas.
  const chosenAbilities = sides.map((side, index) => {
    const own = battles[index].abilities;
    return own.includes(side.ability) ? side.ability : own[0] ?? '';
  });
  const abilities = neutralize(chosenAbilities);

  const patchSide = useCallback((index, changes) => {
    setSides((current) => current.map((side, i) => (i === index ? { ...side, ...changes } : side)));
  }, []);
  const patchMove = useCallback((index, slotIndex, changes) => {
    setSides((current) => current.map((side, i) => (i !== index ? side : {
      ...side,
      moves: side.moves.map((slot, s) => (s === slotIndex ? { ...slot, ...changes } : slot)),
    })));
  }, []);
  // Um terreno removido volta quando outro Pokémon ou outra habilidade entra em campo.
  const restoreTerrain = useCallback(() => {
    setField((current) => (current.terrain === 'none' || current.weather === 'none'
      ? { ...current, terrain: current.terrain === 'none' ? '' : current.terrain, weather: current.weather === 'none' ? '' : current.weather }
      : current));
  }, []);
  const pickTurnMove = useCallback((index, slot) => setTurnPicks((current) => current.map((pick, i) => (i === index ? slot : pick))), []);
  const pickIncoming = useCallback((index, uid) => setIncoming((current) => current.map((pick, i) => (i === index ? uid : pick))), []);
  // Antes da batalha a reserva só vai a campo; com ela em andamento, vira a troca do próximo turno.
  const bringReserve = useCallback((index, uid) => {
    if (latest.current.inBattle) {
      pickTurnMove(index, switchPick(uid));
      return;
    }
    setSides((current) => current.map((side, i) => (i === index ? swapIn(side, uid) : side)));
    pickTurnMove(index, null);
    restoreTerrain();
  }, [pickTurnMove, restoreTerrain]);
  const addReserve = useCallback((index, pokemon) => {
    const reserve = sideFromPokemon(pokemon);
    setSides((current) => current.map((side, i) => (
      i === index && side.bench.length < MAX_RESERVES ? { ...side, bench: [...side.bench, reserve] } : side
    )));
  }, []);
  const removeReserve = useCallback((index, uid) => {
    setSides((current) => current.map((side, i) => (
      i === index ? { ...side, bench: side.bench.filter((member) => member.uid !== uid) } : side
    )));
  }, []);
  // Com `team`, o time inteiro vem junto; tocar em outro membro do mesmo time é uma troca, e não apaga o estado de ninguém.
  const pickPokemon = useCallback((index, pokemon, set, team = null) => {
    if (team) {
      const side = latest.current.sides[index];
      if (side.pokemon && side.teamKey === team.key) {
        if (side.teamIndex === team.index) return;
        const reserve = side.bench.find((member) => member.teamKey === team.key && member.teamIndex === team.index);
        if (reserve) {
          if (reserve.currentHp !== 0) bringReserve(index, reserve.uid);
          return;
        }
      }
    }
    const picked = team ? sideFromTeam(team) : sideFromPokemon(pokemon, set);
    setSides((current) => current.map((side, i) => {
      if (i !== index) return side;
      return team ? picked : { ...picked, bench: side.bench };
    }));
    pickTurnMove(index, null);
    restoreTerrain();
  }, [bringReserve, pickTurnMove, restoreTerrain]);

  const patchField = useCallback((changes) => setField((current) => ({ ...current, ...changes })), []);
  const patchFieldSide = useCallback((index, changes) => {
    setField((current) => ({ ...current, sides: current.sides.map((side, i) => (i === index ? { ...side, ...changes } : side)) }));
  }, []);

  // Callbacks estáveis por lado, para os painéis memorizados não re-renderizarem à toa.
  const handlers = useMemo(() => [0, 1].map((index) => ({
    change: (changes) => {
      patchSide(index, changes);
      if ('ability' in changes) restoreTerrain();
    },
    move: (slotIndex, changes) => patchMove(index, slotIndex, changes),
    pick: (pokemon, set, team) => pickPokemon(index, pokemon, set, team),
    bring: (uid) => bringReserve(index, uid),
    addReserve: (pokemon) => addReserve(index, pokemon),
    removeReserve: (uid) => removeReserve(index, uid),
  })), [patchSide, patchMove, pickPokemon, bringReserve, addReserve, removeReserve, restoreTerrain]);

  const ready = sides.every((side, index) => side.pokemon && battles[index].baseStats);

  const combatants = useMemo(
    () => (ready ? sides.map((side, index) => toCombatant(side, battles[index], abilities[index], chosenAbilities[index])) : null),
    // O hook devolve o mesmo objeto enquanto os dados não mudam, então cada lado entra como dependência.
    [ready, sides, battles[0], battles[1], abilities[0], abilities[1], chosenAbilities[0], chosenAbilities[1]],
  );

  const { autoWeather, autoTerrain } = useMemo(() => {
    const rawSpeeds = sides.map((side, index) => battles[index].baseStats && calcStats(battles[index].baseStats, side.set).spe);
    return {
      // Quem desmaiou não sustenta clima primal; o clima comum continua.
      autoWeather: fromAbilities(
        abilities.map((ability, index) => (sides[index].currentHp === 0 && PRIMAL_WEATHERS.has(WEATHER_ABILITIES[ability]) ? '' : ability)),
        rawSpeeds,
        WEATHER_ABILITIES,
      ),
      autoTerrain: fromAbilities(abilities, rawSpeeds, TERRAIN_ABILITIES),
    };
  }, [abilities[0], abilities[1], sides, battles[0], battles[1]]);
  const weatherSuppressor = abilities.find((ability) => WEATHER_SUPPRESSORS.has(ability)) ?? null;

  // Clima e terreno das habilidades valem quando nenhum foi escolhido à mão; os climas primais não podem ser trocados.
  // Cloud Nine e Air Lock anulam qualquer clima.
  // O clima que existe no campo, mesmo anulado: o turno precisa dele para quando o Cloud Nine sair.
  const rawWeather = autoWeather && (!field.weather || PRIMAL_WEATHERS.has(autoWeather.value))
    ? autoWeather.value
    : field.weather === 'none' ? '' : field.weather;
  const heldItems = sides.map((side, index) => activeItem({ item: side.item, ability: abilities[index] }, field));
  const battleField = useMemo(() => {
    // 'none': removido na batalha, então a habilidade que o trouxe não o repõe.
    const terrain = field.terrain === 'none' ? '' : field.terrain || autoTerrain?.value || '';
    // Os prazos são do clima que existe, mesmo com Cloud Nine o anulando.
    const timed = withTimers(
      { ...field, weather: rawWeather, terrain },
      [0, 1].map((index) => ({ ability: abilities[index], item: heldItems[index] })),
    );
    return { ...timed, weather: weatherSuppressor ? '' : rawWeather };
  }, [field, rawWeather, autoTerrain, weatherSuppressor, abilities[0], abilities[1], heldItems[0], heldItems[1]]);

  // Velocidade e o que deixa cada lado no ar valem mesmo antes do outro lado ser escolhido.
  const sideStates = useMemo(
    () => sides.map((side, index) => {
      if (!side.pokemon || !battles[index].baseStats) return { combatant: null, speed: null, airborne: null };
      const combatant = withWeatherType(toCombatant(side, battles[index], abilities[index]), battleField);
      return { combatant, speed: calcSpeed(combatant, battleField.sides[index], battleField), airborne: airborneBy(combatant, battleField) };
    }),
    [sides, battles[0], battles[1], abilities[0], abilities[1], battleField],
  );
  const speeds = sideStates.map((state) => state.speed);

  const sideMoves = useMemo(
    () => sides.map((side, index) => side.moves.map((slot) => (
      resolveSlot(slot, gmaxMoves[index], { attacker: sideStates[index].combatant, field: battleField })
    ))),
    [sides, gmaxMoves[0], gmaxMoves[1], sideStates, battleField],
  );
  // Como texto, para o painel memorizado só re-renderizar quando um tipo muda.
  const moveTypes = sideMoves.map((moves, index) => moves
    .map((move) => (move ? battleTypeOf(move, sideStates[index].combatant, battleField) : ''))
    .join(','));

  const directions = useMemo(() => [0, 1].map((from) => {
    const to = 1 - from;
    const rows = [];
    if (combatants) {
      sideMoves[from].forEach((move, slotIndex) => {
        if (!isCalculable(move)) return;
        const context = { attacker: combatants[from], defender: combatants[to], attackerSide: battleField.sides[from], defenderSide: battleField.sides[to], field: battleField };
        const result = calculateDamage({ move, ...context });
        // O golpe nos turnos seguintes, se até lá algum prazo acabar.
        const resultAt = (turn) => {
          const later = fieldAtTurn(battleField, turn);
          return later && calculateDamage({ move, ...context, attackerSide: later.sides[from], defenderSide: later.sides[to], field: later });
        };
        rows.push({ slotIndex, move, result, ko: describeKnockout(result, { ...context, resultAt }) });
      });
    }
    return { key: from, attacker: shownPokemon(sides[from], battles[from]), defender: shownPokemon(sides[to], battles[to]), rows };
  }), [combatants, sides, sideMoves, battles[0], battles[1], battleField]);

  // O detalhe mostra o golpe escolhido; se ele sumiu, o primeiro golpe com conta.
  const allRows = directions.flatMap((direction) => direction.rows.map((row) => ({ ...row, side: direction.key })));
  const current = allRows.find((row) => row.side === selected.side && row.slotIndex === selected.slot) ?? allRows[0];
  const detail = current && {
    ...current,
    attackerName: shownPokemon(sides[current.side], battles[current.side]).name,
    defenderName: shownPokemon(sides[1 - current.side], battles[1 - current.side]).name,
  };
  const activeSelection = current ? { side: current.side, slot: current.slotIndex } : selected;

  const names = sides.map((side, index) => (side.pokemon ? formatSlug(shownPokemon(side, battles[index]).name) : ''));
  const trapped = [0, 1].map((index) => (combatants ? trapReason(combatants[index], combatants[1 - index], battleField) : null));
  const passTurn = async () => {
    if (!combatants || passing.current) return;
    const { ready: canPass, replacing } = turnReady(sides, turnPicks, trapped);
    if (!canPass) return;
    passing.current = true;
    setTurnError(null);
    try {
      await playTurn(replacing);
    } catch (error) {
      console.warn('Turno não simulado:', error);
      setTurnError('Não foi possível carregar os dados das reservas. Tente de novo.');
    } finally {
      passing.current = false;
    }
  };
  async function playTurn(replacing) {
    const switches = sides.map((side, index) => (
      (replacing ? side.currentHp === 0 : !side.bide) ? switchUid(turnPicks[index]) : null
    ));
    const slotIndexes = turnPicks.map((pick, index) => (!replacing && switches[index] == null ? pick : null));
    // As reservas só são carregadas quando alguém pode sair de campo.
    const mayMove = switches.some((uid) => uid != null) || slotIndexes.some((slot, index) => {
      const slug = sides[index].moves[slot]?.move?.slug;
      return PIVOT_MOVES.has(slug) || PHAZE_MOVES.has(slug);
    });
    const bench = await Promise.all(sides.map((side) => Promise.all((mayMove ? side.bench : []).map(async (member) => {
      const data = await fetchCombatData(member.pokemon.name, member.form);
      const ability = data.abilities.includes(member.ability) ? member.ability : data.abilities[0] ?? '';
      return toCombatant(member, data, ability);
    }))));
    const slots = await Promise.all(slotIndexes.map(async (slot, index) => {
      const chosen = sides[index].moves[slot];
      return chosen?.move ? { ...chosen, move: await withEffects(chosen.move) } : null;
    }));
    const moves = slots.map((slot, index) => (slot ? resolveSlot(slot, gmaxMoves[index], { attacker: combatants[index], field: battleField }) : null));
    const turnField = { ...battleField, weather: rawWeather };
    const turn = simulateTurn({
      combatants, moves, bench, switches, incoming, replacing, names, sideConditions: battleField.sides, field: turnField,
    });
    const start = turnLog.start ?? { sides: sides.map(battleSnapshot), field };
    setSides((current) => current.map((side, index) => sideAfterTurn(side, turn, index)));
    // Quem entrou tem outros golpes, e quem caiu precisa de substituto: a escolha não vale mais.
    setTurnPicks((current) => current.map((pick, index) => (
      turn.active[index] !== sides[index].uid || turn.sides[index].currentHp === 0 || switches[index] != null ? null : pick
    )));
    setField((current) => ({
      ...current,
      ...BATTLE_FIELD_KEYS.reduce((changes, key) => {
        const value = turn.field[key];
        const setters = { weather: WEATHER_ABILITIES, terrain: TERRAIN_ABILITIES }[key];
        // Depois de uma troca, o clima e o terreno deixam de seguir a habilidade de quem está em campo.
        if (setters && turn.switched) {
          const wouldReturn = turn.abilities.some((ability) => setters[ability]);
          return { ...changes, [key]: value || (wouldReturn ? 'none' : '') };
        }
        if (value === turnField[key]) return changes;
        return { ...changes, [key]: setters && !value ? 'none' : value };
      }, {}),
      timers: turn.field.timers,
      sides: turn.conditions,
    }));
    const changed = [
      ...BATTLE_FIELD_KEYS.filter((key) => turn.field[key] !== turnField[key]),
      ...turn.conditions.flatMap((conditions, index) => Object.keys(conditions)
        .filter((key) => key !== 'protect' && key !== 'timers' && conditions[key] !== battleField.sides[index][key])
        .map((key) => `${index}:${key}`)),
    ];
    setFieldFlash(changed.length ? { keys: changed, token: turnLog.history.length + 1 } : null);
    setTurnLog((current) => {
      const number = replacing ? current.turn : current.turn + 1;
      const entry = { id: current.history.length + 1, label: replacing ? `substituição após o turno ${number}` : `turno ${number}`, lines: turn.log };
      return { turn: number, history: [entry, ...current.history], start };
    });
  }
  const resetBattle = () => {
    const { start } = turnLog;
    if (start) {
      setSides((current) => current.map((side, index) => restoreSide(side, start.sides[index])));
      setField(start.field);
      // Uma troca muda os golpes em campo; sem ela, a escolha continua valendo.
      setTurnPicks((current) => current.map((pick, index) => (sides[index].uid === start.sides[index].active ? pick : null)));
      setIncoming(pickReset);
      setTurnError(null);
    }
    setTurnLog({ turn: 0, history: [], start: null });
    setFieldFlash(null);
  };

  // Prévia do turno: o dano que o golpe escolhido de um lado tira do outro (mínimo e máximo).
  const previews = [0, 1].map((to) => {
    const from = 1 - to;
    if (sides[from].bide) return null;
    const row = directions[from].rows.find((entry) => entry.slotIndex === turnPicks[from]);
    return row && !row.result.reason ? { min: row.result.min, max: row.result.max } : null;
  });
  const fighters = [0, 1].map((index) => {
    if (!combatants) return null;
    const max = combatants[index].stats.hp;
    return {
      name: names[index],
      spriteId: shownPokemon(sides[index], battles[index]).id,
      current: Math.min(sides[index].currentHp ?? max, max),
      max,
      preview: previews[index],
      side: sides[index],
      conditions: battleField.sides[index],
    };
  });

  return (
    <div className={`space-y-4 ${fighters.every(Boolean) ? 'pb-32 lg:pb-0' : ''}`}>
      <SectionHeading
        title="Conta de Batalha"
        subtitle="Simulador de Dano e Proj. de Turno"
        aside={<span className={HEADING_PILL_CLASS}>Fórmula da Gen 5+ · batalhas simples</span>}
      />

      <BattleScoreboard fighters={fighters} />
      <MobileTurnBar fighters={fighters} sides={sides} picks={turnPicks} trapped={trapped} onPass={passTurn} />

      {/*
        Telas largas: seu Pokémon | resultado, golpes e campo | oponente.
        lg: resultado e campo em cima, os dois lados embaixo. Celular: tudo empilhado, resultado primeiro.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.9fr)_minmax(0,1fr)]">
        <div className="space-y-3 lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:block xl:space-y-3">
          <div className="space-y-3">
            <TurnPanel
              sides={sides}
              picks={turnPicks}
              incoming={incoming}
              trapped={trapped}
              error={turnError}
              onIncoming={pickIncoming}
              turn={turnLog.turn}
              history={turnLog.history}
              names={names}
              onPick={pickTurnMove}
              onPass={passTurn}
              onReset={resetBattle}
            />
            <DamageResult entry={detail} hint={resultHint(sides)} />
            <ResultsList directions={directions} selected={activeSelection} onSelect={setSelected} />
          </div>
          <FieldPanel
            field={field}
            battleField={battleField}
            rawWeather={rawWeather}
            autoWeather={autoWeather}
            autoTerrain={autoTerrain}
            weatherSuppressor={weatherSuppressor}
            sideTitles={SIDES.map((side) => side.field)}
            onChange={patchField}
            onSideChange={patchFieldSide}
            flash={fieldFlash}
          />
        </div>

        {SIDES.map((meta, index) => (
          <CombatantPanel
            key={meta.title}
            className={index === 0 ? 'xl:col-start-1 xl:row-start-1' : 'xl:col-start-3 xl:row-start-1'}
            title={meta.title}
            caption={meta.caption}
            pickerPlaceholder={meta.picker}
            side={sides[index]}
            planned={switchUid(turnPicks[index])}
            inBattle={inBattle}
            onBring={handlers[index].bring}
            onAddReserve={handlers[index].addReserve}
            onRemoveReserve={handlers[index].removeReserve}
            battle={battles[index]}
            forms={forms[index]}
            gmaxMove={gmaxMoves[index]}
            moveTypes={moveTypes[index]}
            ownTypes={sideStates[index].combatant?.originalTypes.join(',')}
            hpPreview={previews[index]}
            ability={chosenAbilities[index]}
            speed={speeds[index]}
            airborne={sideStates[index].airborne}
            faster={actsFirst(speeds, index, field.trickRoom)}
            pool={pool}
            teams={teamSources}
            loggedIn={Boolean(session)}
            teamsOpen={index === 0}
            onLogin={onLogin}
            extraSource={meta.trainers && (
              <TrainerTeamPicker pool={pool} activeMember={`${sides[index].teamKey}|${sides[index].teamIndex}`} initialBattleId={trainerBattleId} onPick={handlers[index].pick} />
            )}
            onChange={handlers[index].change}
            onMoveChange={handlers[index].move}
            onPick={handlers[index].pick}
          />
        ))}
      </div>
    </div>
  );
}
