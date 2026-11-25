import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calculator, Loader2, TriangleAlert, X } from 'lucide-react';
import MoveAbilityModal from '../MoveAbilityModal';
import TrainerSprite from './TrainerSprite';
import { SpecialtyStamp, blotColor } from './TrainerCard';
import { thumbnailSpriteUrl } from '../../services/api';
import { fetchTrainerTeams } from '../../services/trainers';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { calculatorTrainerHref } from '../../navigation/sections';
import {
  battleKey, battleTabsOf, gameListOf, hasTeamVariants, resolveTrainerPokemon, roleLabel,
} from '../../utils/trainers';

const LABEL = 'font-reading text-xs font-semibold uppercase tracking-wider text-ink-soft';
const PILL = 'cursor-pointer rounded-[3px] border-[1.5px] px-3 py-1.5 font-reading text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const PILL_ON = 'border-vermilion font-semibold text-vermilion';
const PILL_OFF = 'border-ink/40 font-medium text-ink hover:border-ink';

const positionLabel = (battle) => {
  // Só batalha de ginásio da história tem insígnia; no PWT a ordem é só para ordenar.
  if (battle.role === 'Gym Leader') return battle.badge ? `${battle.order}º ginásio` : null;
  if (battle.role === 'Elite Four') return `${battle.order}º da Elite 4`;
  return null;
};

function battleFacts(battle) {
  return [
    ['Papel', [roleLabel(battle.role), positionLabel(battle)].filter(Boolean).join(' · ')],
    ['Local', battle.location],
    ['Insígnia', battle.badge],
    ['Jogos', battle.games],
    ['Região', `${battle.region} · ${battle.generation}ª geração`],
    ['Mecânica', battle.gimmick],
    ['Nível médio', battle.avgLevel != null && `Nv. ${Math.round(battle.avgLevel * 10) / 10}`],
  ].filter(([, value]) => value);
}

function ChoiceGroup({ title, label, children }) {
  return (
    <section className="space-y-2">
      <h3 className={LABEL}>{title}</h3>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function TeamMember({ member, entry, onSelectPokemon, onSelectMove }) {
  return (
    <li className="flex flex-col rounded-[3px] border-[1.5px] border-ink/70 bg-paper-2 p-2.5">
      <button
        type="button"
        onClick={() => onSelectPokemon(entry.name)}
        disabled={!entry}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[2px] text-left transition-colors hover:bg-olive/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-default disabled:hover:bg-transparent"
      >
        {entry ? (
          <img src={thumbnailSpriteUrl(entry.id)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated]" />
        ) : (
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center font-serif text-2xl font-bold text-ink/45">?</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-base font-bold text-ink">{member.name}</span>
          <span className="font-mono text-[11px] font-bold tabular-nums text-ink-soft">Nv. {member.level}</span>
        </span>
        {member.isAce && <span className="type-stamp shrink-0 font-bold text-vermilion">Ás</span>}
      </button>

      {member.moves.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-1 border-t border-ink/20 pt-2">
          {member.moves.map((move) => (
            <li key={move} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelectMove(move)}
                className="w-full cursor-pointer truncate rounded-[2px] px-1 py-0.5 text-left font-reading text-[13px] text-ink underline decoration-ink/25 underline-offset-2 transition-colors hover:decoration-vermilion focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
              >
                {move}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Ficha do treinador: escolhe o jogo (começa pelo primeiro lançado), escolhe a batalha e, quando ela tiver, a variante do time (Rivais), e mostra o time.
 * Tocar num Pokémon abre a ficha dele por cima; tocar num golpe abre o golpe.
 */
/** Times das batalhas do treinador, buscados ao abrir o modal (a lista da Liga vem sem eles). */
function useBattleTeams(battles) {
  const missing = useMemo(() => battles.filter((battle) => !battle.team).map((battle) => battle.id), [battles]);
  const [state, setState] = useState({ status: 'loading', teams: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (missing.length === 0) return undefined;
    let active = true;
    setState({ status: 'loading', teams: null });
    fetchTrainerTeams(missing)
      .then((teams) => active && setState({ status: 'ready', teams }))
      .catch(() => active && setState({ status: 'error', teams: null }));
    return () => { active = false; };
  }, [missing, attempt]);

  return {
    status: missing.length === 0 ? 'ready' : state.status,
    teamOf: (battle) => battle.team ?? state.teams?.get(battle.id) ?? null,
    retry: () => setAttempt((count) => count + 1),
  };
}

function TeamStatus({ status, onRetry }) {
  if (status === 'error') {
    return (
      <p role="alert" className="flex items-center gap-2 py-2 font-reading text-sm text-vermilion-deep">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        Não foi possível carregar o time.
        <button type="button" onClick={onRetry} className="cursor-pointer underline underline-offset-2">Tentar de novo</button>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 py-2 font-reading text-sm italic text-umber">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Chamando o time...
    </p>
  );
}

export default function TrainerModal({ trainer, initialBattleId, entryByName, onSelectPokemon, onClose }) {
  const initial = trainer.battles.find((candidate) => candidate.id === initialBattleId) ?? trainer.battles[0];
  const games = useMemo(() => gameListOf(trainer.battles), [trainer.battles]);
  const [game, setGame] = useState(games[0]);
  const [selectedKey, setSelectedKey] = useState(() => battleKey(initial));
  const [move, setMove] = useState(null);
  const titleId = useId();
  const closeRef = useRef(null);
  useModalBehavior(onClose, closeRef);
  const teams = useBattleTeams(trainer.battles);

  const gameBattles = useMemo(
    () => trainer.battles.filter((candidate) => candidate.gameList.includes(game)),
    [trainer.battles, game],
  );
  const tabs = useMemo(() => battleTabsOf(gameBattles), [gameBattles]);
  const tab = tabs.find((candidate) => candidate.key === selectedKey) ?? tabs[0];
  // A variante escolhida vale para as outras batalhas que a tiverem (o mesmo inicial do jogador).
  const [variant, setVariant] = useState(initial.teamVariant ?? null);
  const showVariants = hasTeamVariants(tab);
  const battle = (showVariants && tab.variants.find((candidate) => candidate.teamVariant === variant)) || tab.variants[0];
  const team = teams.teamOf(battle);

  return createPortal(
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center bg-ink/60 p-4 animate-fade-in motion-reduce:animate-none md:bg-ink/45 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="paper-card relative flex max-h-[90vh] w-full max-w-3xl flex-col shadow-panel animate-bubble-pop motion-reduce:animate-none"
      >
        <header className="flex items-start gap-4 border-b-[1.5px] border-ink px-5 pb-4 pt-5 sm:px-6">
          <div className="relative isolate flex h-24 w-24 shrink-0 items-center justify-center">
            <span aria-hidden="true" className="print-blot absolute -z-10 h-[90%] aspect-[1.1]" style={{ backgroundColor: blotColor(trainer.type) }} />
            <TrainerSprite trainer={trainer} entryByName={entryByName} />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="font-hand text-lg leading-none text-ink-soft">{trainer.roles.map(roleLabel).join(' · ')}</p>
            <h2 id={titleId} className="mt-0.5 font-serif text-2xl font-black leading-tight tracking-tight text-ink sm:text-3xl">
              {trainer.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SpecialtyStamp type={battle.type} />
              <span className="font-reading text-sm italic text-ink-soft">{trainer.regions.join(' · ')}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-paper text-ink transition-colors hover:bg-paper-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 sm:px-6">
          {games.length > 1 && (
            <ChoiceGroup title="Jogo" label="Escolher o jogo">
              {games.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={candidate === game}
                  onClick={() => setGame(candidate)}
                  className={`${PILL} ${candidate === game ? PILL_ON : PILL_OFF}`}
                >
                  {candidate}
                </button>
              ))}
            </ChoiceGroup>
          )}

          {tabs.length > 1 && (
            <ChoiceGroup title="Batalhas" label="Escolher a batalha">
              {tabs.map((candidate) => {
                const selected = candidate.key === tab.key;
                return (
                  <button
                    key={candidate.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedKey(candidate.key)}
                    className={`${PILL} ${selected ? PILL_ON : PILL_OFF}`}
                  >
                    {candidate.label}
                    {trainer.roles.length > 1 && <span className="font-normal opacity-75"> · {roleLabel(candidate.variants[0].role)}</span>}
                  </button>
                );
              })}
            </ChoiceGroup>
          )}

          {showVariants && (
            <div className="space-y-2">
              <ChoiceGroup title="Variante do time" label="Escolher a variante do time">
                {tab.variants.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={candidate.id === battle.id}
                    onClick={() => setVariant(candidate.teamVariant)}
                    className={`${PILL} ${candidate.id === battle.id ? PILL_ON : PILL_OFF}`}
                  >
                    {candidate.teamVariant ?? 'Padrão'}
                  </button>
                ))}
              </ChoiceGroup>
              <p className="font-reading text-sm italic text-ink-soft">O time muda conforme a escolha do jogador no começo da aventura.</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
            {battleFacts(battle).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className={LABEL}>{label}</dt>
                <dd className="font-reading text-[15px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={LABEL}>Time · {team?.length ?? battle.teamSize} Pokémon</h3>
              <a href={calculatorTrainerHref(battle.id)} className="btn-outline min-h-9 px-3 py-1.5 text-sm">
                <Calculator className="h-4 w-4" aria-hidden="true" />
                Abrir na Calculadora
              </a>
            </div>
            {!team && <TeamStatus status={teams.status} onRetry={teams.retry} />}
            {team && (
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((member, index) => (
                  // O mesmo Pokémon pode aparecer duas vezes num time (os dois Onix de Bruno), daí o índice na chave.
                  <TeamMember
                    key={`${member.slug}-${index}`}
                    member={member}
                    entry={resolveTrainerPokemon(entryByName, member.slug)}
                    onSelectPokemon={onSelectPokemon}
                    onSelectMove={setMove}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {move && <MoveAbilityModal kind="move" name={move} onClose={() => setMove(null)} />}
    </div>,
    document.body,
  );
}
