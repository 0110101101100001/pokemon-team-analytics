import { useCallback, useEffect, useMemo, useState } from 'react';
import CombatantPanel from '../components/calc/CombatantPanel';
import DamageResult from '../components/calc/DamageResult';
import FieldPanel from '../components/calc/FieldPanel';
import ResultsList from '../components/calc/ResultsList';
import TrainerTeamPicker from '../components/calc/TrainerTeamPicker';
import { createField, createSide, resolveSlot, sideFromPokemon } from '../components/calc/calcState';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { useBattleForms, useFormBattleData } from '../hooks/usePokemonBattleData';
import { useSavedTeams } from '../hooks/useSavedTeams';
import { gmaxMoveOf } from '../data/gmaxMoves';
import TurnPanel from '../components/calc/TurnPanel';
import BattleScoreboard from '../components/calc/BattleScoreboard';
import MobileTurnBar from '../components/calc/MobileTurnBar';
import { simulateTurn } from '../utils/turn';
import { fetchMoveSummary } from '../services/api';
import { USES_HAPPINESS } from '../utils/variablePower';
import { PRIMAL_WEATHERS, TERRAIN_ABILITIES, WEATHER_ABILITIES, WEATHER_SUPPRESSORS } from '../data/battleModifiers';
import { airborneBy, calcSpeed, calculateDamage, describeKnockout, isCalculable } from '../utils/damage';
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
function toCombatant(side, battle, ability) {
  const originalTypes = battle.types.length ? battle.types : side.pokemon.types;
  return {
    level: side.set.level,
    types: side.tera && side.tera !== 'stellar' ? [side.tera] : originalTypes,
    originalTypes,
    tera: side.tera,
    stats: calcStats(battle.baseStats, side.set),
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
    happiness: side.happiness,
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

const usesAny = (side, slugs) => side.moves.some((slot) => slot.move && slugs.has(slot.move.slug));

/** Felicidade: só quando o lado usa Return ou Frustration. */
const variableFieldsOf = (side) => ({ happiness: usesAny(side, USES_HAPPINESS) });

// O que a simulação muda em cada lado; "recomeçar" volta ao que era antes do primeiro turno.
const BATTLE_KEYS = ['currentHp', 'boosts', 'status', 'toxicTurns', 'sleepTurns', 'bide', 'lastHit', 'turnsOut'];
const battleSnapshot = (side) => Object.fromEntries(BATTLE_KEYS.map((key) => [key, side[key]]));

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
  // Campos extras de cada lado, só quando algum golpe escolhido precisa deles.
  const extraFields = sides.map(variableFieldsOf);
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
  const pickPokemon = useCallback((index, pokemon, set) => {
    setSides((current) => current.map((side, i) => (i === index ? sideFromPokemon(pokemon, set) : side)));
  }, []);

  const patchField = useCallback((changes) => setField((current) => ({ ...current, ...changes })), []);
  const patchFieldSide = useCallback((index, changes) => {
    setField((current) => ({ ...current, sides: current.sides.map((side, i) => (i === index ? { ...side, ...changes } : side)) }));
  }, []);

  // Callbacks estáveis por lado, para os painéis memorizados não re-renderizarem à toa.
  const handlers = useMemo(() => [0, 1].map((index) => ({
    change: (changes) => patchSide(index, changes),
    move: (slotIndex, changes) => patchMove(index, slotIndex, changes),
    pick: (pokemon, set) => pickPokemon(index, pokemon, set),
  })), [patchSide, patchMove, pickPokemon]);

  const ready = sides.every((side, index) => side.pokemon && battles[index].baseStats);

  const combatants = useMemo(
    () => (ready ? sides.map((side, index) => toCombatant(side, battles[index], abilities[index])) : null),
    // O hook devolve o mesmo objeto enquanto os dados não mudam, então cada lado entra como dependência.
    [ready, sides, battles[0], battles[1], abilities[0], abilities[1]],
  );

  const { autoWeather, autoTerrain } = useMemo(() => {
    const rawSpeeds = sides.map((side, index) => battles[index].baseStats && calcStats(battles[index].baseStats, side.set).spe);
    return {
      autoWeather: fromAbilities(abilities, rawSpeeds, WEATHER_ABILITIES),
      autoTerrain: fromAbilities(abilities, rawSpeeds, TERRAIN_ABILITIES),
    };
  }, [abilities[0], abilities[1], sides, battles[0], battles[1]]);
  const weatherSuppressor = abilities.find((ability) => WEATHER_SUPPRESSORS.has(ability)) ?? null;

  // Clima e terreno das habilidades valem quando nenhum foi escolhido à mão; os climas primais não podem ser trocados.
  // Cloud Nine e Air Lock anulam qualquer clima.
  const battleField = useMemo(() => {
    let weather = autoWeather && (!field.weather || PRIMAL_WEATHERS.has(autoWeather.value)) ? autoWeather.value : field.weather;
    if (weatherSuppressor) weather = '';
    const terrain = field.terrain || autoTerrain?.value || '';
    return { ...field, weather, terrain };
  }, [field, autoWeather, autoTerrain, weatherSuppressor]);

  // Velocidade e o que deixa cada lado no ar valem mesmo antes do outro lado ser escolhido.
  const sideStates = useMemo(
    () => sides.map((side, index) => {
      if (!side.pokemon || !battles[index].baseStats) return { speed: null, airborne: null };
      const combatant = toCombatant(side, battles[index], abilities[index]);
      return { speed: calcSpeed(combatant, battleField.sides[index], battleField), airborne: airborneBy(combatant, battleField) };
    }),
    [sides, battles[0], battles[1], abilities[0], abilities[1], battleField],
  );
  const speeds = sideStates.map((state) => state.speed);

  const directions = useMemo(() => [0, 1].map((from) => {
    const to = 1 - from;
    const rows = [];
    if (combatants) {
      sides[from].moves.forEach((slot, slotIndex) => {
        const move = resolveSlot(slot, gmaxMoves[from]);
        if (!isCalculable(move)) return;
        const context = { attacker: combatants[from], defender: combatants[to], attackerSide: battleField.sides[from], defenderSide: battleField.sides[to], field: battleField };
        const result = calculateDamage({ move, ...context });
        rows.push({ slotIndex, move, result, ko: describeKnockout(result, context) });
      });
    }
    return { key: from, attacker: shownPokemon(sides[from], battles[from]), defender: shownPokemon(sides[to], battles[to]), rows };
  }), [combatants, sides, gmaxMoves[0], gmaxMoves[1], battles[0], battles[1], battleField]);

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
  const pickTurnMove = useCallback((index, slot) => setTurnPicks((current) => current.map((pick, i) => (i === index ? slot : pick))), []);
  const passTurn = async () => {
    if (!combatants) return;
    const slots = await Promise.all(turnPicks.map(async (slot, index) => {
      const chosen = sides[index].moves[slot];
      return chosen?.move ? { ...chosen, move: await withEffects(chosen.move) } : null;
    }));
    const moves = slots.map((slot, index) => (slot ? resolveSlot(slot, gmaxMoves[index]) : null));
    const turn = simulateTurn({ combatants, moves, sideConditions: battleField.sides, field: battleField, names });
    const start = turnLog.start ?? { sides: sides.map(battleSnapshot), field };
    setSides((current) => current.map((side, index) => {
      const next = turn.sides[index];
      return { ...side, ...next, currentHp: next.currentHp === combatants[index].stats.hp ? null : next.currentHp };
    }));
    setField((current) => ({
      ...current,
      ...['weather', 'terrain', 'trickRoom', 'gravity', 'magicRoom', 'wonderRoom']
        .reduce((changes, key) => (turn.field[key] !== battleField[key] ? { ...changes, [key]: turn.field[key] } : changes), {}),
      sides: turn.conditions,
    }));
    const changed = [
      ...['weather', 'terrain', 'trickRoom', 'gravity', 'magicRoom', 'wonderRoom'].filter((key) => turn.field[key] !== battleField[key]),
      ...turn.conditions.flatMap((conditions, index) => Object.keys(conditions)
        .filter((key) => key !== 'protect' && conditions[key] !== battleField.sides[index][key])
        .map((key) => `${index}:${key}`)),
    ];
    setFieldFlash(changed.length ? { keys: changed, token: turnLog.turn + 1 } : null);
    setTurnLog((current) => ({
      turn: current.turn + 1,
      history: [{ turn: current.turn + 1, lines: turn.log }, ...current.history],
      start,
    }));
  };
  const resetBattle = () => {
    const { start } = turnLog;
    if (start) {
      setSides((current) => current.map((side, index) => ({ ...side, ...start.sides[index] })));
      setField(start.field);
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
      <MobileTurnBar fighters={fighters} sides={sides} picks={turnPicks} onPass={passTurn} />

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
            battle={battles[index]}
            forms={forms[index]}
            gmaxMove={gmaxMoves[index]}
            extraFields={extraFields[index]}
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
              <TrainerTeamPicker pool={pool} currentId={sides[index].pokemon?.id} initialBattleId={trainerBattleId} onPick={handlers[index].pick} />
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
