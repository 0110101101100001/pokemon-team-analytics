import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import SketchCard from './SketchCard';
import SketchPlanForm from './SketchPlanForm';
import SmeargleLoader from '../SmeargleLoader';
import { useSmogonMeta } from '../../hooks/useSmogonMeta';
import { archetypeByKey, checklistOf } from '../../utils/archetypes';
import { loadBattleData } from '../../utils/battleData';
import { commitMembers, createCardState, regenerateCard, toggleLock, undo } from '../../utils/sketchEdit';
import { planSketch, sketchContext } from '../../utils/sketchPlan';
import { loadAllSets } from '../../utils/smogonSets';
import { DEFAULT_TIER, SINGLES_TIERS, isSinglesTier } from '../../utils/tiers';

const TIER_STORAGE_KEY = 'smearglepedia:sketch-tier';
const tierLabelOf = (tier) => SINGLES_TIERS.find((option) => option.value === tier)?.label ?? tier;

function storedTier() {
  try {
    const tier = window.localStorage.getItem(TIER_STORAGE_KEY);
    return isSinglesTier(tier) ? tier : DEFAULT_TIER;
  } catch {
    return DEFAULT_TIER;
  }
}

function rememberTier(tier) {
  try {
    window.localStorage.setItem(TIER_STORAGE_KEY, tier);
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): o tier só vale nesta sessão.
  }
}

// Builds da Smogon e dados de batalha: baixados uma vez, quando a aba abre.
function useSketchData() {
  const [data, setData] = useState({ status: 'loading', battleData: null, allSets: null });
  useEffect(() => {
    let active = true;
    Promise.all([loadBattleData(), loadAllSets()])
      .then(([battleData, allSets]) => active && setData({ status: 'ready', battleData, allSets }))
      .catch(() => active && setData({ status: 'error', battleData: null, allSets: null }));
    return () => { active = false; };
  }, []);
  return data;
}

const teamKey = (team) => team.map((member) => member.id).join('-');
const nextTask = () => new Promise((resolve) => { setTimeout(resolve, 0); });

const Message = ({ children }) => (
  <p className="py-6 text-center font-serif text-sm italic text-smeargle-textDim/80">{children}</p>
);

/**
 * Ateliê do esboço: o plano (tier, estilo, restrições) e, ao clicar em "Esboçar", três times completos
 * testados contra o teste do meta. Cada card é editável (fixar, trocar, corrigir, regenerar, desfazer);
 * o estado dos cards vive aqui, e as contas, em utils/sketchEdit.js.
 */
function SketchPanel({ team, pool, onLoadTeam }) {
  const [plan, setPlan] = useState(() => ({ tier: storedTier(), archetype: 'free', banned: [], maxTwoPerType: false }));
  const [result, setResult] = useState({ status: 'idle' });
  const [cards, setCards] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [busyCard, setBusyCard] = useState(null);
  const [applying, setApplying] = useState(null);
  const { meta, status: metaStatus, pool: deferredPool } = useSmogonMeta(pool, plan.tier);
  const data = useSketchData();

  const changePlan = useCallback((changes) => {
    setPlan((current) => ({ ...current, ...changes }));
    if (changes.tier) rememberTier(changes.tier);
  }, []);

  const ready = metaStatus === 'ready' && data.status === 'ready';
  const editedCount = cards.filter((card) => card.edited).length;

  const generate = useCallback(() => {
    if (!ready) return;
    setConfirming(false);
    setResult({ status: 'running' });
    // Um quadro para o loader aparecer antes do cálculo, que roda na thread principal (~100–200 ms).
    requestAnimationFrame(() => setTimeout(() => {
      const started = performance.now();
      const planInput = {
        pool: deferredPool,
        meta,
        battleData: data.battleData,
        allSets: data.allSets,
        tier: plan.tier,
        archetypeKey: plan.archetype,
        banned: plan.banned.map((pokemon) => pokemon.name),
        maxPerType: plan.maxTwoPerType ? 2 : null,
      };
      const variations = planSketch({ seed: team, ...planInput });
      const ctx = sketchContext(planInput);
      setCards(variations.map((variation) => createCardState(variation, ctx)));
      setResult({ status: 'done', ctx, ms: Math.round(performance.now() - started), plan, teamKey: teamKey(team) });
    }, 0));
  }, [ready, team, deferredPool, meta, data, plan]);

  // Gerar de novo descarta as edições: com algum card editado, pede confirmação antes.
  const run = useCallback(() => {
    if (editedCount > 0) setConfirming(true);
    else generate();
  }, [editedCount, generate]);

  const edit = useCallback((index, action) => {
    const { ctx } = result;
    setCards((current) => current.map((card, i) => {
      if (i !== index) return card;
      if (action.type === 'undo') return undo(card);
      if (action.type === 'lock') return toggleLock(card, action.slotIndex, ctx);
      const members = card.members.map((member, slot) => (slot === action.slotIndex ? action.member : member));
      return commitMembers(card, members, ctx);
    }));
  }, [result]);

  // Regenerar roda a busca do esboço com os fixos como rascunho; devolve se achou outra composição.
  const regenerate = useCallback(async (index) => {
    setBusyCard(index);
    await nextTask();
    try {
      const members = regenerateCard(cards[index].members, cards.filter((_, i) => i !== index), result.ctx);
      if (!members) return false;
      setCards((current) => current.map((card, i) => (i === index ? commitMembers(card, members, result.ctx) : card)));
      return true;
    } finally {
      setBusyCard(null);
    }
  }, [cards, result]);

  // Time com os sets do card: o rascunho mantém os do builder; os outros levam os do card (os que o teste do meta testou).
  const buildTeam = useCallback(async (card) => {
    const currentById = new Map(team.map((member) => [member.id, member]));
    return card.members.map(({ pokemon, fromSeed, set }) => (
      fromSeed ? currentById.get(pokemon.id) ?? { ...pokemon, set } : { ...pokemon, set }
    ));
  }, [team]);

  const apply = useCallback(async (card) => {
    setApplying(card);
    try {
      onLoadTeam(await buildTeam(card));
    } finally {
      setApplying(null);
    }
  }, [buildTeam, onLoadTeam]);

  const stale = result.status === 'done' && result.teamKey !== teamKey(team);
  const resultArchetype = useMemo(() => archetypeByKey(result.plan?.archetype), [result.plan]);
  const checklist = useMemo(() => checklistOf(resultArchetype), [resultArchetype]);

  return (
    <div className="space-y-4">
      <p className="font-serif text-xs italic text-smeargle-textDim/90">
        Monte times inteiros para um plano e melhore cada um: fixe quem fica, troque um membro vendo o efeito nas notas,
        corrija a pior ameaça ou regenere o resto. Cada esboço traz as funções cobertas, os sets completos e uma nota
        contra as 20 ameaças mais usadas do tier.
      </p>

      <SketchPlanForm
        plan={plan}
        onChange={changePlan}
        seed={team}
        pool={pool}
        onRun={run}
        running={result.status === 'running'}
        disabled={!ready}
      />

      {confirming && (
        <div role="alertdialog" aria-label="Descartar edições" className="flex flex-wrap items-center gap-2 rounded-xl border border-[#B5543C]/35 bg-[#B5543C]/5 p-3 font-serif text-sm text-smeargle-text">
          <p className="flex-1">
            Você editou {editedCount === 1 ? '1 esboço' : `${editedCount} esboços`}. Gerar de novo descarta {editedCount === 1 ? 'essa edição' : 'essas edições'}.
          </p>
          <button type="button" onClick={generate} className="btn-action !h-9 !px-4 font-serif !text-xs">Gerar de novo</button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-outline !min-h-9 !px-3 !py-1 !text-xs">Cancelar</button>
        </div>
      )}

      {metaStatus === 'loading' || data.status === 'loading' ? (
        <SmeargleLoader label="Carregando os dados da Smogon..." className="py-8" />
      ) : metaStatus === 'unavailable' ? (
        <Message>
          O {tierLabelOf(plan.tier)} não tem dados da Smogon no mês mais recente (ou eles não puderam ser carregados agora).
          Escolha outro tier ou tente de novo em instantes.
        </Message>
      ) : data.status === 'error' ? (
        <Message>Não foi possível carregar as builds e os atributos usados no esboço. Tente de novo em instantes.</Message>
      ) : result.status === 'running' ? (
        <SmeargleLoader label="Esboçando e testando contra o meta..." className="py-8" />
      ) : result.status === 'done' ? (
        cards.length === 0 ? (
          <Message>
            Nenhum time cumpre o estilo {resultArchetype.label} com estas restrições: tente tirar algum &quot;Não usar&quot; ou mudar o estilo.
          </Message>
        ) : (
          <div className="space-y-2">
            <p className="flex flex-wrap justify-between gap-2 text-[11px] text-smeargle-textDim">
              <span>
                {tierLabelOf(result.plan.tier)} · {resultArchetype.label}
                {stale && <strong className="ml-2 font-semibold text-[#9E3D64]">O rascunho mudou: esboce de novo.</strong>}
              </span>
              <span>calculado em {result.ms} ms</span>
            </p>
            <ol className="grid gap-3">
              {cards.map((card, index) => (
                <SketchCard
                  // A posição identifica o card: as edições trocam membros, mas o card continua o mesmo.
                  key={`card-${index}`}
                  index={index}
                  card={card}
                  ctx={result.ctx}
                  checklist={checklist}
                  busy={busyCard === index}
                  applying={applying === card}
                  disabled={applying !== null || stale}
                  onEdit={edit}
                  onRegenerate={regenerate}
                  onApply={apply}
                  onBuildTeam={buildTeam}
                />
              ))}
            </ol>
          </div>
        )
      ) : null}
    </div>
  );
}

export default memo(SketchPanel);
