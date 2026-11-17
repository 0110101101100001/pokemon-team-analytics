import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import MoveAbilityModal from '../MoveAbilityModal';
import TrainerSprite from './TrainerSprite';
import { SpecialtyStamp, blotColor } from './TrainerCard';
import { thumbnailSpriteUrl } from '../../services/api';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { battleLabel, roleLabel } from '../../utils/trainers';

const LABEL = 'font-reading text-xs font-semibold uppercase tracking-wider text-[#4A463E]';
const PILL = 'cursor-pointer rounded-[3px] border-[1.5px] px-3 py-1.5 font-reading text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';
const PILL_ON = 'border-[#B8402A] font-semibold text-[#B8402A]';
const PILL_OFF = 'border-[#1C1A17]/40 font-medium text-[#1C1A17] hover:border-[#1C1A17]';

const positionLabel = (battle) => {
  if (battle.role === 'Gym Leader') return `${battle.order}º ginásio`;
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

// A tabela usa o nome da espécie; na Pokédex algumas só existem com a forma ("aegislash" → "aegislash-shield").
// A primeira forma no índice é a padrão.
function resolveEntry(entryByName, slug) {
  const exact = entryByName.get(slug);
  if (exact) return exact;
  for (const [name, entry] of entryByName) {
    if (name.startsWith(`${slug}-`)) return entry;
  }
  return null;
}

function TeamMember({ member, entry, onSelectPokemon, onSelectMove }) {
  return (
    <li className="flex flex-col rounded-[3px] border-[1.5px] border-[#1C1A17]/70 bg-paper-2 p-2.5">
      <button
        type="button"
        onClick={() => onSelectPokemon(entry.name)}
        disabled={!entry}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[2px] text-left transition-colors hover:bg-[#829b72]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-default disabled:hover:bg-transparent"
      >
        {entry ? (
          <img src={thumbnailSpriteUrl(entry.id)} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated]" />
        ) : (
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center font-serif text-2xl font-bold text-[#1C1A17]/45">?</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-base font-bold text-[#1C1A17]">{member.name}</span>
          <span className="font-mono text-[11px] font-bold tabular-nums text-[#4A463E]">Nv. {member.level}</span>
        </span>
        {member.isAce && <span className="type-stamp shrink-0 font-bold text-[#B8402A]">Ás</span>}
      </button>

      {member.moves.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-1 border-t border-[#1C1A17]/20 pt-2">
          {member.moves.map((move) => (
            <li key={move} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelectMove(move)}
                className="w-full cursor-pointer truncate rounded-[2px] px-1 py-0.5 text-left font-reading text-[13px] text-[#1C1A17] underline decoration-[#1C1A17]/25 underline-offset-2 transition-colors hover:decoration-[#B8402A] focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
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
 * Ficha do treinador: escolhe a batalha (jogo, variante do time, revanche) e mostra o time dela.
 * Tocar num Pokémon abre a ficha dele por cima; tocar num golpe abre o golpe.
 */
export default function TrainerModal({ trainer, initialBattleId, entryByName, onSelectPokemon, onClose }) {
  const [battleId, setBattleId] = useState(initialBattleId ?? trainer.battles[0].id);
  const [move, setMove] = useState(null);
  const titleId = useId();
  const closeRef = useRef(null);
  useModalBehavior(onClose, closeRef);

  const battle = trainer.battles.find((candidate) => candidate.id === battleId) ?? trainer.battles[0];
  const hasTeamVariants = trainer.battles.some((candidate) => candidate.teamVariant);

  return createPortal(
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center bg-[#2A2421]/60 p-4 animate-fade-in motion-reduce:animate-none md:bg-[#2A2421]/45 sm:p-6"
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
              <span className="font-reading text-sm italic text-[#4A463E]">{trainer.regions.join(' · ')}</span>
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
          {trainer.battles.length > 1 && (
            <section className="space-y-2">
              <h3 className={LABEL}>Variantes</h3>
              <div role="group" aria-label="Escolher a batalha" className="flex flex-wrap gap-2">
                {trainer.battles.map((candidate) => {
                  const selected = candidate.id === battle.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBattleId(candidate.id)}
                      className={`${PILL} ${selected ? PILL_ON : PILL_OFF}`}
                    >
                      {battleLabel(candidate)}
                      {trainer.roles.length > 1 && <span className="font-normal opacity-75"> · {roleLabel(candidate.role)}</span>}
                    </button>
                  );
                })}
              </div>
              {hasTeamVariants && (
                <p className="font-reading text-sm italic text-[#4A463E]">O time muda conforme a escolha do jogador no começo da aventura.</p>
              )}
            </section>
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
            <h3 className={LABEL}>Time · {battle.team.length} Pokémon</h3>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {battle.team.map((member, index) => (
                // O mesmo Pokémon pode aparecer duas vezes num time (os dois Onix de Bruno), daí o índice na chave.
                <TeamMember
                  key={`${member.slug}-${index}`}
                  member={member}
                  entry={resolveEntry(entryByName, member.slug)}
                  onSelectPokemon={onSelectPokemon}
                  onSelectMove={setMove}
                />
              ))}
            </ul>
          </section>
        </div>
      </div>

      {move && <MoveAbilityModal kind="move" name={move} onClose={() => setMove(null)} />}
    </div>,
    document.body,
  );
}
