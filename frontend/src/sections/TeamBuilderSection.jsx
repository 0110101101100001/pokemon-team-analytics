import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Crosshair, ShieldHalf, Sparkles } from 'lucide-react';
import PokemonPicker from '../components/battle/PokemonPicker';
import CollectionPicks from '../components/team/CollectionPicks';
import SectionHeading from '../components/layout/SectionHeading';
import MoveCoverage from '../components/team/MoveCoverage';
import TeamMemberEditor from '../components/team/TeamMemberEditor';
import TeamSlots from '../components/team/TeamSlots';
import TeamSuggestions from '../components/team/TeamSuggestions';
import TeamManagerModal from '../components/TeamManagerModal';
import TeamTypeTable from '../components/TeamTypeTable';
import { createBattleSet, normalizeBattleSet } from '../utils/stats';
import { TEAM_SIZE } from '../utils/teamScore';

const PANELS = [
  { key: 'coverage', label: 'cobertura dos golpes', icon: Crosshair },
  { key: 'defense', label: 'fraquezas', icon: ShieldHalf },
  { key: 'suggestions', label: 'sugestões', icon: Sparkles },
];

const speciesOf = (pokemon) => pokemon.species ?? pokemon.name;

export default function TeamBuilderSection({ team, onTeamChange, pool, session, collections, entryByName, onLogin }) {
  const [selectedId, setSelectedId] = useState(null);
  const [panel, setPanel] = useState('coverage');
  const [managerOpen, setManagerOpen] = useState(false);

  const isFull = team.length >= TEAM_SIZE;
  const selected = team.find((member) => member.id === selectedId) ?? team[0] ?? null;
  const takenSpecies = useMemo(() => new Set(team.map(speciesOf)), [team]);

  const addPokemon = useCallback((pokemon) => {
    onTeamChange((current) =>
      current.length >= TEAM_SIZE || current.some((member) => speciesOf(member) === speciesOf(pokemon))
        ? current
        : [...current, { ...pokemon, set: createBattleSet() }]);
    setSelectedId(pokemon.id);
  }, [onTeamChange]);

  const removePokemon = useCallback((id) => {
    onTeamChange((current) => current.filter((member) => member.id !== id));
  }, [onTeamChange]);

  // `changes` é um objeto parcial do set ou uma função (set atual) → objeto parcial.
  const updateSet = useCallback((id, changes) => {
    onTeamChange((current) => current.map((member) => {
      if (member.id !== id) return member;
      const resolved = typeof changes === 'function' ? changes(member.set) : changes;
      return { ...member, set: { ...member.set, ...resolved } };
    }));
  }, [onTeamChange]);

  const loadTeam = useCallback((stored) => {
    const byId = new Map(pool.map((pokemon) => [pokemon.id, pokemon]));
    onTeamChange(stored.slice(0, TEAM_SIZE).map((pokemon) => ({
      ...(byId.get(pokemon.id) ?? pokemon),
      set: normalizeBattleSet(pokemon.set),
    })));
    setSelectedId(null);
  }, [pool, onTeamChange]);

  const openManager = useCallback(() => setManagerOpen(true), []);
  const closeManager = useCallback(() => setManagerOpen(false), []);

  // Com o time completo não há o que sugerir.
  const activePanel = isFull && panel === 'suggestions' ? 'coverage' : panel;

  return (
    <div className="space-y-6">
      <SectionHeading
        caption="esboço de equipe"
        title={(
          <>
            Team Builder
            <span className="ml-2 font-sans text-xs font-semibold text-smeargle-textDim/70">{team.length}/{TEAM_SIZE}</span>
          </>
        )}
        aside={(
          <button
            type="button"
            onClick={openManager}
            className="btn-outline cursor-pointer font-serif"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Salvar / Meus times
          </button>
        )}
      />

      <TeamSlots team={team} selectedId={selected?.id} onSelect={setSelectedId} onRemove={removePokemon} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <PokemonPicker
            pool={pool}
            onPick={addPokemon}
            excludedSpecies={takenSpecies}
            disabled={isFull}
            label="Adicionar Pokémon ao time"
            placeholder={isFull ? 'Time completo: remova um Pokémon para trocar' : 'Adicionar por nome ou número...'}
          />
          <CollectionPicks
            collections={collections}
            entryByName={entryByName}
            takenSpecies={takenSpecies}
            disabled={isFull}
            onPick={addPokemon}
            onLogin={onLogin}
          />
          {selected ? (
            <TeamMemberEditor key={selected.id} member={selected} onChange={updateSet} />
          ) : (
            <p className="paper-card ink-wash ink-blotted px-6 py-10 font-hand text-xl leading-snug text-[#5C4033]">
              Adicione o primeiro Pokémon para montar o set: item, natureza, EVs, IVs e golpes.
            </p>
          )}
        </div>

        <section className="paper-card ink-blotted p-4 pt-5 sm:p-5 sm:pt-6" aria-label="Análise do time">
          <div role="tablist" className="isolate mb-4 flex flex-wrap gap-x-1 gap-y-2">
            {PANELS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activePanel === key}
                disabled={key === 'suggestions' && isFull}
                onClick={() => setPanel(key)}
                className="ink-tab"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {team.length === 0 ? (
            <p className="py-8 text-center font-serif text-sm italic text-smeargle-textDim/70">
              A análise aparece aqui assim que o time tiver um Pokémon.
            </p>
          ) : activePanel === 'coverage' ? (
            <MoveCoverage team={team} />
          ) : activePanel === 'defense' ? (
            <TeamTypeTable team={team} />
          ) : (
            <TeamSuggestions team={team} pool={pool} onAdd={addPokemon} />
          )}
        </section>
      </div>

      <TeamManagerModal open={managerOpen} onClose={closeManager} session={session} team={team} onLoadTeam={loadTeam} />
    </div>
  );
}
