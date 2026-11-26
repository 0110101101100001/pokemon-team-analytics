import { memo, useCallback, useMemo, useState } from 'react';
import { Crown, Plus, TriangleAlert, X } from 'lucide-react';
import PokemonPicker from '../battle/PokemonPicker';
import PokemonTypeBadge from '../PokemonTypeBadge';
import SmeargleLoader from '../SmeargleLoader';
import { Delta } from './sketch/SwapOptionRow';
import { STATUS } from './sketch/threatStatus';
import { useSketchData } from '../../hooks/useSketchData';
import { useSmogonMeta } from '../../hooks/useSmogonMeta';
import { thumbnailSpriteUrl } from '../../services/api';
import { MAX_CANDIDATES, bestOptionIndex, compareCandidates } from '../../utils/candidateCompare';
import { formatSlug } from '../../utils/filters';
import { setLine } from '../../utils/sketchExplain';
import { sketchContext } from '../../utils/sketchPlan';
import { readSketchState } from '../../utils/sketchStore';
import { browserStorage } from '../../utils/browserStorage';
import { ROLE_LABELS } from '../../utils/teamRoles';
import { TEAM_SIZE, speciesOf } from '../../utils/teamScore';
import { DEFAULT_TIER, SINGLES_TIERS, isSinglesTier, tierLabelOf } from '../../utils/tiers';

const SPRITES_SHOWN = 6;
const NEW_SLOT = 'new';

// O tier começa no mesmo do esboço (guardado no navegador), para as duas abas falarem do mesmo meta.
function initialTier() {
  return readSketchState(browserStorage(), { isTier: isSinglesTier, isArchetype: () => true })?.plan.tier ?? DEFAULT_TIER;
}

/** Sprites das ameaças com o anel do status novo; passa de 6, mostra "+n". */
function ThreatSprites({ threats, statusOf = (threat) => threat.status }) {
  const shown = threats.slice(0, SPRITES_SHOWN);
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {shown.map((threat) => (
        <li key={threat.name} title={`${threat.name}: ${STATUS[statusOf(threat)].label}`}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-paper ring-2 ${STATUS[statusOf(threat)].ring}`}>
            <img src={thumbnailSpriteUrl(threat.id)} alt={threat.name} width={24} height={24} loading="lazy" decoding="async" className="h-6 w-6 object-contain" />
          </span>
        </li>
      ))}
      {threats.length > SPRITES_SHOWN && (
        <li className="font-mono text-[11px] text-smeargle-textDim">+{threats.length - SPRITES_SHOWN}</li>
      )}
    </ul>
  );
}

function Row({ label, children }) {
  return (
    <div className="space-y-1 border-t border-ink/10 pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brown">{label}</p>
      {children}
    </div>
  );
}

const Empty = ({ children }) => <p className="font-serif text-[11px] italic text-smeargle-textDim/80">{children}</p>;

const roleList = (roles) => roles.map((role) => ROLE_LABELS[role] ?? formatSlug(role)).join(', ');

function CandidateColumn({ option, best, showBest, onRemove, onPlace }) {
  const { pokemon } = option;
  const name = formatSlug(pokemon.name);
  return (
    <li className={`flex min-w-0 flex-col gap-2 rounded-sketch border bg-paper/70 p-3 shadow-card ${best && showBest ? 'border-olive-deep/60' : 'border-ink/20'}`}>
      <div className="flex items-start gap-2">
        <img src={thumbnailSpriteUrl(pokemon.id)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-bold leading-tight text-smeargle-text">{name}</p>
          <span className="mt-0.5 flex flex-wrap gap-1">
            {pokemon.types.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(pokemon.name)}
          aria-label={`Tirar ${name} da comparação`}
          className="-m-1 cursor-pointer rounded-[3px] p-1.5 text-umber/70 transition-colors hover:bg-umber/10 hover:text-umber focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {option.error ? (
        <p className="flex items-start gap-1.5 font-reading text-xs text-vermilion-deep">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {option.error === 'espécie repetida' ? 'Essa espécie já está no time.' : 'O time está cheio: escolha quem sai.'}
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-mono text-3xl font-bold leading-none tabular-nums text-smeargle-text">{option.evaluation.gauntlet.score}</p>
              <p className="mt-0.5 text-[10px] text-smeargle-textDim">teste do meta</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-[11px]">
              {best && showBest && (
                <span className="inline-flex items-center gap-1 rounded-[3px] bg-olive-deep px-2 py-0.5 font-semibold text-paper">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  melhor nota
                </span>
              )}
              <Delta label="vs. sem ele" value={option.delta.gauntlet} />
            </div>
          </div>
          {option.outOfTier && (
            <p className="font-reading text-[11px] italic text-vermilion-deep">Fora do tier: sem set nem dados de uso da Smogon.</p>
          )}

          <Row label={`Resolve (${option.fixed.length})`}>
            {option.fixed.length ? <ThreatSprites threats={option.fixed} statusOf={(threat) => threat.to} /> : <Empty>Nenhuma ameaça muda de status.</Empty>}
          </Row>
          {option.worsened.length > 0 && (
            <Row label={`Piora (${option.worsened.length})`}>
              <ThreatSprites threats={option.worsened} statusOf={(threat) => threat.to} />
            </Row>
          )}
          <Row label={`Ainda sem resposta (${option.unanswered.length})`}>
            {option.unanswered.length ? <ThreatSprites threats={option.unanswered} /> : <Empty>Nenhuma.</Empty>}
          </Row>
          <Row label="Brechas de tipo">
            {option.evaluation.holes.length ? (
              <span className="flex flex-wrap gap-1">
                {option.evaluation.holes.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)}
              </span>
            ) : <Empty>Sem brechas graves.</Empty>}
          </Row>
          <Row label="Funções">
            {option.rolesGained.length || option.rolesLost.length ? (
              <p className="font-reading text-xs text-smeargle-text">
                {option.rolesGained.length > 0 && <span>traz {roleList(option.rolesGained)}</span>}
                {option.rolesGained.length > 0 && option.rolesLost.length > 0 && ' · '}
                {option.rolesLost.length > 0 && <span className="text-vermilion-deep">perde {roleList(option.rolesLost)}</span>}
              </p>
            ) : <Empty>Nenhuma função nova.</Empty>}
          </Row>
          <Row label="Set testado">
            <p className="font-serif text-[11px] leading-snug text-smeargle-textDim">{setLine(option.set) || 'sem build no tier'}</p>
          </Row>

          <button type="button" onClick={() => onPlace(option)} className="btn-action mt-auto !h-9 w-full justify-center font-serif">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Colocar no time
          </button>
        </>
      )}
    </li>
  );
}

/**
 * Comparar 2 ou 3 candidatos para uma vaga: cada um entra no time atual (na vaga nova ou no lugar de alguém) e passa
 * pelo teste do meta do esboço. Mostra a nota, o que resolve, o que continua sem resposta, as brechas e as funções.
 * `onPlace(pokemon, replaceIndex)` coloca o escolhido no time, com o set testado.
 */
function CandidateCompare({ team, pool, onPlace }) {
  const [tier, setTier] = useState(initialTier);
  const [candidates, setCandidates] = useState([]);
  const isFull = team.length >= TEAM_SIZE;
  const [slot, setSlot] = useState(isFull ? '0' : NEW_SLOT);
  const replaceIndex = slot === NEW_SLOT || !team[Number(slot)] ? null : Number(slot);
  // Time cheio sem vaga escolhida não acontece pelo select; se o time encher com a aba aberta, cai na 1ª vaga.
  const effectiveReplace = replaceIndex ?? (isFull ? 0 : null);

  const { meta, status: metaStatus, pool: deferredPool } = useSmogonMeta(pool, tier);
  const data = useSketchData();
  const ready = metaStatus === 'ready' && data.status === 'ready';

  const ctx = useMemo(() => (ready ? sketchContext({
    pool: deferredPool, meta, battleData: data.battleData, allSets: data.allSets, tier, archetypeKey: 'free',
  }) : null), [ready, deferredPool, meta, data, tier]);

  const comparison = useMemo(
    () => (ctx && candidates.length ? compareCandidates(team, candidates, ctx, { replaceIndex: effectiveReplace }) : null),
    [ctx, team, candidates, effectiveReplace],
  );
  const best = comparison ? bestOptionIndex(comparison.options) : -1;

  // Quem fica no time e quem já está na comparação não aparecem na busca.
  const blocked = useMemo(() => new Set([
    ...team.filter((_, index) => index !== effectiveReplace).map(speciesOf),
    ...candidates.map(speciesOf),
  ]), [team, effectiveReplace, candidates]);

  const add = useCallback((pokemon) => {
    setCandidates((current) => (current.length >= MAX_CANDIDATES ? current : [...current, pokemon]));
  }, []);
  const remove = useCallback((name) => setCandidates((current) => current.filter((pokemon) => pokemon.name !== name)), []);
  const place = useCallback((option) => {
    onPlace({ ...option.pokemon, set: option.set }, effectiveReplace);
    setCandidates([]);
  }, [onPlace, effectiveReplace]);

  const tierLabel = tierLabelOf(tier);
  const full = candidates.length >= MAX_CANDIDATES;

  return (
    <div className="space-y-4">
      <p className="font-reading text-xs italic text-smeargle-textDim/90">
        Na dúvida entre 2 ou 3 Pokémon para fechar o time? Escolha a vaga e os candidatos: cada um entra no time atual com o
        set mais usado do tier e passa pelo mesmo teste do meta do esboço, contra as 20 ameaças mais usadas.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="paper-label">Tier</span>
          <select value={tier} onChange={(event) => setTier(event.target.value)} className="paper-field cursor-pointer">
            {SINGLES_TIERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="paper-label">Vaga</span>
          <select value={effectiveReplace == null ? NEW_SLOT : String(effectiveReplace)} onChange={(event) => setSlot(event.target.value)} className="paper-field cursor-pointer">
            {!isFull && <option value={NEW_SLOT}>Vaga nova ({team.length + 1}ª)</option>}
            {team.map((pokemon, index) => (
              <option key={pokemon.id} value={String(index)}>No lugar de {formatSlug(pokemon.name)}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="paper-label">Candidatos ({candidates.length}/{MAX_CANDIDATES})</span>
        <PokemonPicker
          pool={pool}
          onPick={add}
          excludedSpecies={blocked}
          disabled={full}
          label="Adicionar um candidato à comparação"
          placeholder={full ? 'Até 3 candidatos: tire um para trocar' : 'Buscar Pokémon para comparar...'}
        />
      </div>

      {candidates.length === 0 ? (
        <p className="py-6 text-center font-reading text-sm italic text-smeargle-textDim/80">
          Adicione de 2 a 3 candidatos para ver qual fecha melhor o time.
        </p>
      ) : metaStatus === 'loading' || data.status === 'loading' ? (
        <SmeargleLoader label="Carregando os dados da Smogon..." className="py-8" />
      ) : metaStatus === 'unavailable' ? (
        <p className="py-6 text-center font-reading text-sm italic text-smeargle-textDim/80">
          O {tierLabel} não tem dados da Smogon agora. Escolha outro tier ou tente de novo em instantes.
        </p>
      ) : data.status === 'error' ? (
        <p className="py-6 text-center font-reading text-sm italic text-smeargle-textDim/80">
          Não foi possível carregar as builds e os atributos usados na comparação. Tente de novo em instantes.
        </p>
      ) : comparison && (
        <div className="space-y-2">
          <p className="text-[11px] text-smeargle-textDim">
            {tierLabel} · sem o candidato{effectiveReplace != null && ` (e sem ${formatSlug(team[effectiveReplace].name)})`}, o time faz{' '}
            <strong className="font-semibold text-smeargle-text">{comparison.baseline.gauntlet.score}</strong> no teste do meta.
            {candidates.length === 1 && ' Adicione mais um candidato para comparar.'}
          </p>
          <ol className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
            {comparison.options.map((option, index) => (
              <CandidateColumn
                key={option.pokemon.name}
                option={option}
                best={index === best}
                showBest={comparison.options.length > 1}
                onRemove={remove}
                onPlace={place}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default memo(CandidateCompare);
