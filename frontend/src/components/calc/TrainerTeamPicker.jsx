import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, TriangleAlert } from 'lucide-react';
import { MemberShortcut, SelectField, SourcePanel } from './SourcePanel';
import { fetchTrainers } from '../../services/trainers';
import { loadBattleData, moveSummaryOf } from '../../utils/battleData';
import { formatSlug } from '../../utils/filters';
import { battleGroupsOf, battleKey, createNameMatcher, gameLabelsOf, hasTeamVariants, resolveTrainerPokemon, trainerMemberSet } from '../../utils/trainers';

const RESULT_LIMIT = 6;

/** Busca de treinador pelo nome, com os resultados logo abaixo do campo. Enter escolhe o primeiro. */
function TrainerSearch({ trainers, onPick }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim().length > 0;

  const results = useMemo(() => {
    if (!searching) return [];
    const matches = createNameMatcher(deferredQuery);
    return trainers
      .filter(matches)
      .slice(0, RESULT_LIMIT);
  }, [deferredQuery, searching, trainers]);

  const pick = (trainer) => {
    onPick(trainer.slug);
    setQuery('');
  };

  return (
    <div>
      <label className="block">
        <span className="mb-0.5 block font-hand text-base leading-none text-[#78614E]">treinador</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78614E]/70" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                e.preventDefault();
                pick(results[0]);
              }
            }}
            placeholder="Nome do treinador..."
            className="paper-field h-9 w-full pl-8 font-reading text-[13px]"
          />
        </span>
      </label>

      {searching && (
        results.length ? (
          <ul className="mt-1.5 space-y-1">
            {results.map((trainer) => (
              <li key={trainer.slug}>
                <button
                  type="button"
                  onClick={() => pick(trainer)}
                  className="block w-full cursor-pointer truncate rounded-[4px] border border-[#78614E]/15 bg-paper/70 px-2.5 py-1.5 text-left transition-colors hover:border-smeargle-olive hover:bg-smeargle-olive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
                >
                  <span className="font-reading text-sm font-semibold text-smeargle-text">{trainer.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-center font-reading text-sm italic text-smeargle-textDim/70">Nenhum treinador encontrado.</p>
        )
      )}
    </div>
  );
}

/**
 * Puxa o time de um líder, Elite 4 ou campeão para o lado do oponente: escolhe o treinador, a batalha e,
 * quando houver, a variante do time; cada Pokémon vira um atalho com o nível e os golpes do jogo.
 * Os dados só são buscados ao abrir.
 */
/** Jogo, batalha e variante escolhidos; o que estiver vazio ou não existir mais cai na primeira opção. */
function resolveSelection(trainer, { game, groupKey, battleId }) {
  if (!trainer) return { games: [], groups: [] };
  const games = gameLabelsOf(trainer.battles);
  const chosenGame = games.includes(game) ? game : games[0];
  const groups = battleGroupsOf(trainer, chosenGame);
  const group = groups.find((candidate) => candidate.key === groupKey) ?? groups[0];
  const battle = group?.variants.find((candidate) => candidate.id === battleId) ?? group?.variants[0];
  return { games, game: chosenGame, groups, group, battle };
}

/** Seleção que abre direto em uma batalha (o link "Abrir na Calculadora" do card da Liga), ou null. */
function selectionForBattle(trainers, battleId) {
  for (const trainer of trainers) {
    const battle = trainer.battles.find((candidate) => candidate.id === battleId);
    if (battle) return { slug: trainer.slug, game: battle.games, groupKey: battleKey(battle), battleId };
  }
  return null;
}

function TrainerTeamPicker({ pool, currentId, initialBattleId = null, onPick }) {
  const [state, setState] = useState({ status: 'idle', trainers: [], battleData: null });
  const [selection, setSelection] = useState({ slug: '', game: '', groupKey: '', battleId: '' });

  const entryByName = useMemo(() => new Map(pool.map((entry) => [entry.name, entry])), [pool]);

  // Ao trocar de treinador, jogo, batalha ou variante, o primeiro Pokémon do time já entra em campo.
  // Trocar de jogo volta para a primeira batalha dele; trocar de batalha, para a primeira variante.
  const apply = (next, trainers, battleData) => {
    setSelection(next);
    const lead = resolveSelection(trainers.find((candidate) => candidate.slug === next.slug), next).battle?.team[0];
    const entry = lead && resolveTrainerPokemon(entryByName, lead.slug);
    if (entry) onPick(entry, trainerMemberSet(lead, (moveSlug) => moveSummaryOf(battleData, moveSlug)));
  };
  const choose = (slug, game = '', groupKey = '', battleId = '') =>
    apply({ slug, game, groupKey, battleId }, state.trainers, state.battleData);

  const load = () => {
    if (state.status !== 'idle' && state.status !== 'error') return;
    setState((current) => ({ ...current, status: 'loading' }));
    Promise.all([fetchTrainers(), loadBattleData()])
      .then(([trainers, battleData]) => {
        setState({ status: 'ready', trainers, battleData });
        const preset = initialBattleId && selectionForBattle(trainers, initialBattleId);
        if (preset) apply(preset, trainers, battleData);
      })
      .catch(() => setState({ status: 'error', trainers: [], battleData: null }));
  };

  // Com uma batalha pedida no endereço, o seletor já abre e carrega sozinho.
  useEffect(() => {
    if (initialBattleId) load();
  }, []); // Só na montagem: a seção lê o endereço uma vez.

  const trainer = state.trainers.find((candidate) => candidate.slug === selection.slug);
  const { games, game, groups, group, battle } = useMemo(() => resolveSelection(trainer, selection), [trainer, selection]);

  const members = useMemo(() => {
    if (!battle || !state.battleData) return [];
    const summaryOf = (slug) => moveSummaryOf(state.battleData, slug);
    return battle.team
      .map((member) => ({ member, entry: resolveTrainerPokemon(entryByName, member.slug) }))
      .filter(({ entry }) => entry)
      .map(({ member, entry }) => ({ member, entry, set: trainerMemberSet(member, summaryOf) }));
  }, [battle, state.battleData, entryByName]);

  return (
    <SourcePanel title="time de um treinador" selected={trainer?.name} defaultOpen={Boolean(initialBattleId)} onOpen={load}>
      {state.status === 'loading' && (
        <p className="flex items-center gap-2 py-2 font-reading text-sm italic text-[#78614E]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chamando os treinadores...
        </p>
      )}

      {state.status === 'error' && (
        <p role="alert" className="flex items-center gap-2 py-1 text-xs font-medium text-[#8A3B27]">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Não foi possível carregar os treinadores.
          <button type="button" onClick={load} className="cursor-pointer underline underline-offset-2">Tentar de novo</button>
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <TrainerSearch trainers={state.trainers} onPick={choose} />
          {group && (games.length > 1 || groups.length > 1 || hasTeamVariants(group)) && (
            <div className="flex flex-wrap items-end gap-2">
              {games.length > 1 && (
                <div className="min-w-0 grow basis-40">
                  <SelectField label="jogo" value={game} onChange={(nextGame) => choose(trainer.slug, nextGame)}>
                    {games.map((label) => <option key={label} value={label}>{label}</option>)}
                  </SelectField>
                </div>
              )}
              {groups.length > 1 && (
                <div className="min-w-0 grow-[2] basis-48">
                  <SelectField label="batalha" value={group.key} onChange={(groupKey) => choose(trainer.slug, game, groupKey)}>
                    {groups.map((candidate) => (
                      <option key={candidate.key} value={candidate.key}>{candidate.label}</option>
                    ))}
                  </SelectField>
                </div>
              )}
              {hasTeamVariants(group) && (
                <div className="min-w-0 grow basis-32">
                  <SelectField label="variante" value={battle.id} onChange={(battleId) => choose(trainer.slug, game, group.key, battleId)}>
                    {group.variants.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.teamVariant}</option>
                    ))}
                  </SelectField>
                </div>
              )}
            </div>
          )}

          {members.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Time de ${trainer.name}`}>
              {members.map(({ member, entry, set }, index) => (
                // O mesmo Pokémon pode aparecer duas vezes num time (os dois Onix de Bruno), daí o índice na chave.
                <li key={`${member.slug}-${index}`}>
                  <MemberShortcut
                    spriteId={entry.id}
                    label={`Usar ${formatSlug(entry.name)} (nível ${member.level}) de ${trainer.name}`}
                    caption={`Nv. ${member.level}`}
                    active={currentId === entry.id}
                    onClick={() => onPick(entry, set)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SourcePanel>
  );
}

export default memo(TrainerTeamPicker);
