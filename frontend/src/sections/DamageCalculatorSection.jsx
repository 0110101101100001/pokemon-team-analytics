import { useCallback, useMemo, useState } from 'react';
import CombatantPanel from '../components/calc/CombatantPanel';
import DamageResult from '../components/calc/DamageResult';
import FieldPanel from '../components/calc/FieldPanel';
import ResultsList from '../components/calc/ResultsList';
import { createField, createSide, resolveSlot, sideFromPokemon } from '../components/calc/calcState';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { useBattleForms, useFormBattleData } from '../hooks/usePokemonBattleData';
import { useSavedTeams } from '../hooks/useSavedTeams';
import { PRIMAL_WEATHERS, TERRAIN_ABILITIES, WEATHER_ABILITIES, WEATHER_SUPPRESSORS } from '../data/battleModifiers';
import { airborneBy, calcSpeed, calculateDamage, describeKnockout, isCalculable } from '../utils/damage';
import { calcStats } from '../utils/stats';

const SIDES = [
  { title: 'Seu Pokémon', caption: 'do seu lado', picker: 'Escolher seu Pokémon por nome ou número...', field: 'Seu lado' },
  { title: 'Oponente', caption: 'do outro lado', picker: 'Escolher o oponente por nome ou número...', field: 'Lado do oponente' },
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

/** Neutralizing Gas desliga a habilidade do oponente (a não ser que ele também a tenha). */
const neutralize = (abilities) => abilities.map((ability, index) => (
  abilities[1 - index] === 'neutralizing-gas' && ability !== 'neutralizing-gas' ? '' : ability
));

/** Nome e sprite em exibição: os da Mega/Primal quando escolhida. */
const shownPokemon = (side, battle) => (side.pokemon && side.form
  ? { id: battle.id ?? side.pokemon.id, name: side.form }
  : side.pokemon);

function resultHint(sides) {
  if (!sides[0].pokemon) return 'Escolha o seu Pokémon.';
  if (!sides[1].pokemon) return 'Escolha o oponente.';
  if (sides.every((side) => side.moves.every((slot) => !slot.move))) return 'Escolha ao menos um golpe de um dos lados.';
  return 'Nenhum dos golpes escolhidos causa dano com poder fixo (são de status ou de poder variável).';
}

export default function DamageCalculatorSection({ pool, team, session }) {
  const [sides, setSides] = useState(() => [createSide(), createSide()]);
  const [field, setField] = useState(createField);
  const [selected, setSelected] = useState({ side: 0, slot: 0 });

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
        const move = resolveSlot(slot);
        if (!isCalculable(move)) return;
        const context = { attacker: combatants[from], defender: combatants[to], defenderSide: battleField.sides[to], field: battleField };
        const result = calculateDamage({ move, ...context });
        rows.push({ slotIndex, move, result, ko: describeKnockout(result, context) });
      });
    }
    return { key: from, attacker: shownPokemon(sides[from], battles[from]), defender: shownPokemon(sides[to], battles[to]), rows };
  }), [combatants, sides, battles[0], battles[1], battleField]);

  // O detalhe mostra o golpe escolhido; se ele sumiu, o primeiro golpe com conta.
  const allRows = directions.flatMap((direction) => direction.rows.map((row) => ({ ...row, side: direction.key })));
  const current = allRows.find((row) => row.side === selected.side && row.slotIndex === selected.slot) ?? allRows[0];
  const detail = current && {
    ...current,
    attackerName: shownPokemon(sides[current.side], battles[current.side]).name,
    defenderName: shownPokemon(sides[1 - current.side], battles[1 - current.side]).name,
  };
  const activeSelection = current ? { side: current.side, slot: current.slotIndex } : selected;

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Conta de Batalha"
        subtitle="Simulador de Dano e Proj. de Turno"
        aside={<span className={HEADING_PILL_CLASS}>Fórmula da Gen 5+ · batalhas simples</span>}
      />

      {/*
        Telas largas: seu Pokémon | resultado, golpes e campo | oponente.
        lg: resultado e campo em cima, os dois lados embaixo. Celular: tudo empilhado, resultado primeiro.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.9fr)_minmax(0,1fr)]">
        <div className="space-y-3 lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:block xl:space-y-3">
          <div className="space-y-3">
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
            ability={chosenAbilities[index]}
            speed={speeds[index]}
            airborne={sideStates[index].airborne}
            faster={speeds[0] != null && speeds[1] != null && speeds[index] > speeds[1 - index]}
            pool={pool}
            teams={teamSources}
            onChange={handlers[index].change}
            onMoveChange={handlers[index].move}
            onPick={handlers[index].pick}
          />
        ))}
      </div>
    </div>
  );
}
