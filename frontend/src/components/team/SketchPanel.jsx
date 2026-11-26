import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import SketchCard from './SketchCard';
import SketchPlanForm from './SketchPlanForm';
import SmeargleLoader from '../SmeargleLoader';
import { useSketchData } from '../../hooks/useSketchData';
import { useSmogonMeta } from '../../hooks/useSmogonMeta';
import { insertSavedTeam } from '../../services/userData';
import { ARCHETYPES, archetypeByKey, checklistOf } from '../../utils/archetypes';
import { commitMembers, createCardState, regenerateCard, reseedCard, toggleLock, undo } from '../../utils/sketchEdit';
import { readSketchState, restoreCards, writeSketchState } from '../../utils/sketchStore';
import { toStoredTeam } from '../../utils/savedTeams';
import { nextTask } from './sketch/shared';
import { browserStorage, readStored } from '../../utils/browserStorage';
import { planSketch, sketchContext } from '../../utils/sketchPlan';
import { DEFAULT_TIER, isSinglesTier, tierLabelOf } from '../../utils/tiers';

const TIER_STORAGE_KEY = 'smearglepedia:sketch-tier';


// Antes o painel guardava só o tier, nesta chave: vale como padrão para quem ainda não tem o plano guardado.
function storedTier() {
  const tier = readStored(TIER_STORAGE_KEY);
  return isSinglesTier(tier) ? tier : DEFAULT_TIER;
}

const VALIDATORS = { isTier: isSinglesTier, isArchetype: (key) => ARCHETYPES.some((archetype) => archetype.key === key) };
const defaultPlan = () => ({ tier: storedTier(), archetype: 'free', banned: [], maxTwoPerType: false });

const teamKey = (team) => team.map((member) => member.id).join('-');

/** O que o esboço recebe de um plano do formulário (o rascunho vem à parte, em `seed`). */
const planInputOf = (plan, { pool, meta, battleData, allSets }) => ({
  pool,
  meta,
  battleData,
  allSets,
  tier: plan.tier,
  archetypeKey: plan.archetype,
  banned: plan.banned.map((pokemon) => pokemon.name),
  maxPerType: plan.maxTwoPerType ? 2 : null,
});

const Message = ({ children }) => (
  <p className="py-6 text-center font-reading text-sm italic text-smeargle-textDim/80">{children}</p>
);

/**
 * Ateliê do esboço: o plano (tier, estilo, restrições) e, ao clicar em "Esboçar", três times completos
 * testados contra o teste do meta. Cada card é editável (fixar, trocar, corrigir, regenerar, desfazer);
 * o estado dos cards vive aqui, e as contas, em utils/sketchEdit.js.
 * O plano e os cards ficam guardados no navegador (utils/sketchStore.js): trocar de aba ou recarregar não os perde.
 * Com o rascunho vazio, o esboço começa do zero.
 */
function SketchPanel({ team, pool, session, onLoadTeam }) {
  // Lido uma vez: o plano entra já no primeiro render; os cards, quando os dados do tier chegarem.
  const [stored] = useState(() => readSketchState(browserStorage(), VALIDATORS));
  const pendingRestore = useRef(stored?.result ? stored : null);
  const [plan, setPlan] = useState(() => stored?.plan ?? defaultPlan());
  const [result, setResult] = useState({ status: 'idle' });
  const [cards, setCards] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [busyCard, setBusyCard] = useState(null);
  const [applying, setApplying] = useState(null);
  const [reseeding, setReseeding] = useState(false);
  const [reseedNotice, setReseedNotice] = useState(null);
  const { meta, status: metaStatus, pool: deferredPool } = useSmogonMeta(pool, plan.tier);
  const data = useSketchData();
  const userId = session?.user?.id ?? null;

  const changePlan = useCallback((changes) => {
    setPlan((current) => ({ ...current, ...changes }));
  }, []);

  const ready = metaStatus === 'ready' && data.status === 'ready';
  const editedCount = cards.filter((card) => card.edited).length;
  const sources = useMemo(
    () => ({ pool: deferredPool, meta, battleData: data.battleData, allSets: data.allSets }),
    [deferredPool, meta, data],
  );

  // Os cards guardados voltam quando o meta do tier deles estiver pronto (só se o plano ainda for desse tier).
  useEffect(() => {
    const saved = pendingRestore.current;
    if (!saved) return;
    if (saved.result.plan.tier !== plan.tier) { pendingRestore.current = null; return; }
    if (!ready) return;
    pendingRestore.current = null;
    try {
      const ctx = sketchContext(planInputOf(saved.result.plan, sources));
      setCards(restoreCards(saved.cards, ctx));
      setResult({ status: 'done', ctx, ms: saved.result.ms, plan: saved.result.plan, teamKey: saved.result.teamKey });
    } catch (error) {
      console.warn('Esboço guardado inválido:', error);
    }
  }, [ready, plan.tier, sources]);

  // Guarda o plano e os cards a cada mudança; enquanto a restauração não roda, não sobrescreve o que está guardado.
  useEffect(() => {
    if (pendingRestore.current || result.status === 'running') return;
    writeSketchState(browserStorage(), { plan, result, cards });
  }, [plan, result, cards]);

  const generate = useCallback(() => {
    if (!ready) return;
    setConfirming(false);
    setReseedNotice(null);
    pendingRestore.current = null;
    setResult({ status: 'running' });
    // Um quadro para o loader aparecer antes do cálculo, que roda na thread principal (~100–200 ms).
    requestAnimationFrame(() => setTimeout(() => {
      const started = performance.now();
      const planInput = planInputOf(plan, sources);
      const variations = planSketch({ seed: team, ...planInput });
      const ctx = sketchContext(planInput);
      setCards(variations.map((variation) => createCardState(variation, ctx)));
      setResult({ status: 'done', ctx, ms: Math.round(performance.now() - started), plan, teamKey: teamKey(team) });
    }, 0));
  }, [ready, team, sources, plan]);

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

  // Rascunho mudou no builder: cada card troca os membros do rascunho antigo pelos do novo e mantém o resto.
  const reseed = useCallback(async () => {
    setReseeding(true);
    setReseedNotice(null);
    await nextTask();
    try {
      const updated = cards.map((card) => reseedCard(card, team, result.ctx));
      const kept = updated.filter(Boolean);
      const dropped = updated.length - kept.length;
      setCards(kept);
      setResult((current) => ({ ...current, teamKey: teamKey(team) }));
      if (dropped && kept.length) {
        setReseedNotice(dropped === 1
          ? '1 esboço não pôde ser completado com o rascunho novo e saiu da lista.'
          : `${dropped} esboços não puderam ser completados com o rascunho novo e saíram da lista.`);
      } else if (dropped) {
        setReseedNotice('Nenhum esboço pôde ser completado com o rascunho novo: esboce de novo.');
      }
    } finally {
      setReseeding(false);
    }
  }, [cards, team, result.ctx]);

  // Salva o card como um time da conta, sem mexer no time do builder.
  const save = useCallback(async (card, name) => {
    if (!userId) throw new Error('Entre na conta para salvar times.');
    await insertSavedTeam(userId, name, toStoredTeam(await buildTeam(card)));
  }, [userId, buildTeam]);

  const stale = result.status === 'done' && result.teamKey !== teamKey(team);
  const resultArchetype = useMemo(() => archetypeByKey(result.plan?.archetype), [result.plan]);
  const checklist = useMemo(() => checklistOf(resultArchetype), [resultArchetype]);

  return (
    <div className="space-y-4">
      <p className="font-reading text-xs italic text-smeargle-textDim/90">
        Monte times inteiros para um plano e melhore cada um: fixe quem fica, troque um membro vendo o efeito nas notas,
        corrija a pior ameaça ou regenere o resto. Cada esboço traz as funções cobertas, os sets completos e uma nota
        contra as 20 ameaças mais usadas do tier. Sem ninguém no time, o esboço começa do zero.
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
        <div role="alertdialog" aria-label="Descartar edições" className="flex flex-wrap items-center gap-2 rounded-[4px] border border-danger/35 bg-danger/5 p-3 font-reading text-sm text-smeargle-text">
          <p className="flex-1">
            Você editou {editedCount === 1 ? '1 esboço' : `${editedCount} esboços`}. Gerar de novo descarta {editedCount === 1 ? 'essa edição' : 'essas edições'}.
          </p>
          <button type="button" onClick={generate} className="btn-action !h-9 !px-4 font-reading !text-xs">Gerar de novo</button>
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
            {reseedNotice ?? <>Nenhum time cumpre o estilo {resultArchetype.label} com estas restrições: tente tirar algum &quot;Não usar&quot; ou mudar o estilo.</>}
          </Message>
        ) : (
          <div className="space-y-2">
            <p className="flex flex-wrap justify-between gap-2 text-[11px] text-smeargle-textDim">
              <span>{tierLabelOf(result.plan.tier)} · {resultArchetype.label}</span>
              <span>calculado em {result.ms} ms</span>
            </p>
            {stale && (
              <div role="status" className="flex flex-wrap items-center gap-2 rounded-[4px] border border-paint-magenta/35 bg-paint-magenta/5 p-3 font-reading text-sm text-smeargle-text">
                <p className="min-w-0 flex-1">
                  O time do builder mudou. Atualize os esboços para trocar o rascunho antigo pelo novo e manter o resto.
                </p>
                <button type="button" onClick={reseed} disabled={reseeding} className="btn-action !h-9 !px-4 font-reading !text-xs">
                  <RefreshCw className={`h-3.5 w-3.5 ${reseeding ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {reseeding ? 'Atualizando…' : 'Atualizar os esboços'}
                </button>
              </div>
            )}
            {reseedNotice && (
              <p role="status" className="rounded-[4px] border border-danger/30 bg-danger/5 p-2.5 font-reading text-xs text-smeargle-text">{reseedNotice}</p>
            )}
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
                  disabled={applying !== null || stale || reseeding}
                  tierLabel={tierLabelOf(result.plan.tier)}
                  canSave={Boolean(userId)}
                  onSave={save}
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
