import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, PenLine, RefreshCw, Undo2, Wand2 } from 'lucide-react';
import CopyShowdownButton from './CopyShowdownButton';
import PokemonTypeBadge from '../PokemonTypeBadge';
import FixProposal from './sketch/FixProposal';
import MemberSlot from './sketch/MemberSlot';
import SaveSketch from './sketch/SaveSketch';
import SwapPanel from './sketch/SwapPanel';
import { Delta } from './sketch/SwapOptionRow';
import { STATUS, STATUS_ORDER } from './sketch/threatStatus';
import { TOOL_BUTTON_CLASS, nextTask } from './sketch/shared';
import { thumbnailSpriteUrl } from '../../services/api';
import { formatSlug } from '../../utils/filters';
import { setLine } from '../../utils/sketchExplain';
import { fixesForSlot, checksOf, pickFix, worstThreat } from '../../utils/sketchEdit';
import { ROLE_LABELS } from '../../utils/teamRoles';

/** Por quanto tempo o retorno da última edição (deltas e pulso na grade) fica visível. */
const FEEDBACK_MS = 4000;


/** Bloco recolhível; <details> abre com clique, toque e teclado. */
function Expandable({ summary, children, className = '' }) {
  return (
    <details className={`group ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-semibold text-brown marker:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        {summary}
      </summary>
      <div className="mt-1.5">{children}</div>
    </details>
  );
}

const minus = (value) => `−${value}`;

function gauntletLines(gauntlet) {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, gauntlet.threats.filter((threat) => threat.status === status).length]));
  const lines = [
    `${counts.solid} sólidas, ${counts.ok} ok, ${counts.weak} fracas, ${counts.none} sem resposta entre as ${gauntlet.threats.length} ameaças mais usadas`,
    `Nota pelas respostas, ponderada pelo uso: ${gauntlet.raw}${gauntlet.breakdown.penalties ? `, menos ${gauntlet.breakdown.penalties} de penalidades` : ''}`,
  ];
  for (const hazard of gauntlet.breakdown.hazards) {
    lines.push(hazard.penalty
      ? `${minus(hazard.penalty)}: ${hazard.member} ${hazard.multiplier}x a Stealth Rock sem Boots`
      : `${hazard.member} ${hazard.multiplier}x a Stealth Rock, protegido por ${formatSlug(hazard.protectedBy)}`);
  }
  for (const overload of gauntlet.breakdown.overloaded) {
    lines.push(`${minus(overload.penalty)}: ${overload.member} é a única resposta sólida a ${overload.threats.length} ameaças`);
  }
  return lines;
}

function fitLines(fit) {
  const lines = [`Funções do estilo cobertas: ${Math.round(fit.parts.checklist * 100)}%`];
  lines.push(...fit.notes.filter((note) => !note.startsWith('falta:')));
  for (const penalty of fit.parts.penalties) lines.push(`${minus(Math.round(penalty.value * 100))}%: ${penalty.label}`);
  return lines;
}

function ScoreBadge({ value, caption, title }) {
  return (
    <span className="flex flex-col items-center rounded-sketch bg-umber px-2.5 py-1 text-paper" title={title}>
      <span className="font-mono text-xl font-bold leading-none tabular-nums">{value}</span>
      <span className="text-[9px] uppercase tracking-wider">{caption}</span>
    </span>
  );
}

function GauntletGrid({ threats, changed }) {
  const sorted = useMemo(
    () => [...threats].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.usage - a.usage),
    [threats],
  );
  const [active, setActive] = useState(null);
  const shown = sorted.find((threat) => threat.name === active);

  return (
    <div>
      <ul className="mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-smeargle-textDim" aria-label="Legenda do teste do meta">
        {STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS[status].dot}`} aria-hidden="true" />
            {STATUS[status].label}
          </li>
        ))}
      </ul>
      {/* No celular a grade rola sozinha na horizontal; a página não. */}
      <div className="-mx-1 overflow-x-auto p-1">
        <ul className="grid w-max grid-cols-[repeat(10,2.25rem)] gap-1.5 sm:w-auto" aria-label="Ameaças mais usadas do tier">
          {sorted.map((threat) => (
            <li key={threat.name}>
              <button
                type="button"
                aria-label={`${threat.name}: ${STATUS[threat.status].label}`}
                aria-pressed={active === threat.name}
                onMouseEnter={() => setActive(threat.name)}
                onFocus={() => setActive(threat.name)}
                // Dentro da grade que rola na horizontal, o toque pode virar arrasto e o click não chegar:
                // pointerdown já seleciona. O click (teclado, mouse) também, sem alternar.
                onPointerDown={() => setActive(threat.name)}
                onClick={() => setActive(threat.name)}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-paper ring-[2.5px] transition-transform hover:scale-110 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paint-cobalt ${STATUS[threat.status].ring} ${active === threat.name ? 'scale-110' : ''} ${changed?.has(threat.name) ? 'motion-safe:animate-pulse ring-[3.5px]' : ''}`}
              >
                <img src={thumbnailSpriteUrl(threat.id)} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 object-contain" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-1 min-h-[2.5rem] font-serif text-[11px] leading-snug text-smeargle-textDim" aria-live="polite">
        {shown ? (
          <>
            <strong className="font-semibold text-smeargle-text">{shown.name}</strong> ({shown.usage.toFixed(1)}% de uso, {STATUS[shown.status].label}): {shown.text}
          </>
        ) : (
          <span className="italic">Passe o mouse ou toque em uma ameaça para ver quem responde e como.</span>
        )}
      </p>
    </div>
  );
}

// Pílula de função: altura fixa, rótulo da função e quem cobre em tom mais leve.
const rolePill = 'inline-flex h-6 items-center gap-1.5 rounded-[3px] border px-2.5 text-[11px] leading-none tracking-[0.01em]';
const roleName = 'font-semibold';

function RoleChecklist({ checklist, coveredBy }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Funções do estilo">
      {checklist.map((role) => {
        const members = coveredBy[role] ?? [];
        return members.length ? (
          <li key={role} className={`${rolePill} border-olive-deep/40 bg-olive/10 text-olive-ink`}>
            <span className={roleName}>{ROLE_LABELS[role]}</span>
            <span className="h-3 w-px bg-olive-deep/35" aria-hidden="true" />
            <span className="text-smeargle-textDim">{members.slice(0, 2).map(formatSlug).join(', ')}</span>
          </li>
        ) : (
          <li key={role} className={`${rolePill} border-dashed border-danger/55 bg-danger/[0.06] text-danger`}>
            <span className="text-[10px] uppercase tracking-wider opacity-80">falta</span>
            <span className={roleName}>{ROLE_LABELS[role]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PickReasons({ members }) {
  return (
    <ul className="space-y-1">
      {members.map(({ pokemon, explain }) => (
        <li key={pokemon.id} className="font-serif text-[11px] leading-snug text-smeargle-textDim/90">
          <span className="font-semibold text-smeargle-text">{formatSlug(pokemon.name)}:</span>{' '}
          {explain ? (
            <>
              {explain.roles.length > 0 && <span className="text-smeargle-text">{explain.roles.join(', ')}</span>}
              {explain.roles.length > 0 && explain.short.length > 0 && ' · '}
              {explain.short.join(' · ')}
              {!explain.roles.length && !explain.short.length && 'completa o time'}
            </>
          ) : 'escolhido por você'}
          {explain?.rest.length > 0 && (
            <Expandable summary="detalhes" className="ml-1 inline-block align-top">
              <span className="italic">{explain.rest.join(' · ')}</span>
            </Expandable>
          )}
        </li>
      ))}
    </ul>
  );
}

const toolButton = TOOL_BUTTON_CLASS;

/**
 * Um esboço editável: fixar e trocar membros, corrigir a pior ameaça, regenerar e desfazer, com as notas
 * recalculadas a cada edição. O estado (card) vive no painel; aqui ficam só menus, painel de troca e proposta.
 */
function SketchCard({
  index, card, ctx, checklist, busy, applying, disabled, tierLabel, canSave, onEdit, onRegenerate, onApply, onBuildTeam, onSave,
}) {
  const { members, evaluation, edited, lastChange } = card;
  const added = members.filter((member) => !member.fromSeed);
  const getTeam = useCallback(() => onBuildTeam(card), [onBuildTeam, card]);
  const saveAs = useCallback((name) => onSave(card, name), [onSave, card]);
  const fitPercent = Math.round(evaluation.fit.score * 100);
  const slotRefs = useRef([]);
  const [menuSlot, setMenuSlot] = useState(null);
  const [swapSlot, setSwapSlot] = useState(null);
  const [fix, setFix] = useState({ status: 'idle' });
  const [notice, setNotice] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Retorno da última edição: deltas perto das notas e pulso nas ameaças que mudaram, por ~4 s.
  useEffect(() => {
    if (!lastChange) { setFeedback(null); return undefined; }
    setFeedback({ ...lastChange, changed: new Set([...lastChange.fixed, ...lastChange.worsened].map((threat) => threat.name)) });
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [lastChange]);

  const focusSlot = (slot) => requestAnimationFrame(() => slotRefs.current[slot]?.focus());
  const closeMenu = useCallback(() => { const slot = menuSlot; setMenuSlot(null); if (slot != null) focusSlot(slot); }, [menuSlot]);
  const closeSwap = useCallback(() => { const slot = swapSlot; setSwapSlot(null); if (slot != null) focusSlot(slot); }, [swapSlot]);

  const swap = useCallback((option) => {
    setSwapSlot(null);
    setFix({ status: 'idle' });
    setNotice(null);
    onEdit(index, { type: 'swap', slotIndex: option.slotIndex, member: option.member });
    focusSlot(option.slotIndex);
  }, [index, onEdit]);

  // "Corrigir a pior ameaça" em etapas, um slot por tarefa, para a interface não travar.
  const findFix = useCallback(async () => {
    setNotice(null);
    setFix({ status: 'searching' });
    const started = performance.now();
    const target = worstThreat(evaluation);
    if (!target) { setFix({ status: 'done', result: { target: null, reason: 'Nenhuma ameaça grave para corrigir.' } }); return; }
    const include = checksOf(target, ctx);
    const candidates = [];
    for (const [slotIndex, member] of members.entries()) {
      if (member.locked) continue;
      await nextTask();
      candidates.push(...fixesForSlot(members, slotIndex, target, ctx, { before: evaluation, include }));
    }
    setFix({ status: 'done', result: pickFix(target, candidates, members), ms: Math.round(performance.now() - started) });
  }, [evaluation, members, ctx]);

  const regenerate = useCallback(async () => {
    setFix({ status: 'idle' });
    setNotice(null);
    const ok = await onRegenerate(index);
    if (!ok) setNotice('Não há outra composição com estes fixos que respeite a diversidade com os outros esboços. Destrave um membro ou mude o plano.');
  }, [index, onRegenerate]);

  return (
    <li className="min-w-0 rounded-sketch border border-ink/20 bg-paper/70 p-3 shadow-card sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-x-1.5 font-serif text-base font-bold leading-tight text-smeargle-text">
            {evaluation.title} <span className="font-sans text-xs font-semibold text-smeargle-textDim/70">#{index + 1}</span>
            {edited && <span className="rounded-[3px] bg-paint-ochre/20 px-2 py-0.5 font-hand text-sm font-normal leading-4 text-ochre-deep">editado</span>}
          </h3>
          {evaluation.fit.averageSpeed != null && (
            <p className="text-[11px] text-smeargle-textDim">velocidade base média {Math.round(evaluation.fit.averageSpeed)}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <ScoreBadge value={`${fitPercent}%`} caption="estilo" title="Encaixe no estilo: abra os detalhes abaixo" />
            <ScoreBadge value={evaluation.gauntlet.score} caption="teste do meta" title="Nota do teste do meta (0–100): abra os detalhes abaixo" />
          </div>
          {feedback && (
            <p className="flex gap-2 text-[11px]" role="status">
              <Delta label="Teste do meta" value={feedback.delta.gauntlet} />
              <span aria-hidden="true">·</span>
              <Delta label="Estilo" value={feedback.delta.fit} suffix="%" />
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <ul className="grid grid-cols-6 gap-1" aria-label="Membros do esboço">
          {members.map((member, slot) => (
            <MemberSlot
              key={`${slot}-${member.pokemon.id}`}
              ref={(element) => { slotRefs.current[slot] = element; }}
              member={member}
              menuOpen={menuSlot === slot}
              changed={feedback && card.history.at(-1)?.members[slot]?.pokemon.id !== member.pokemon.id}
              onOpenMenu={() => { setSwapSlot(null); setMenuSlot(slot); }}
              onCloseMenu={closeMenu}
              onToggleLock={() => { setMenuSlot(null); onEdit(index, { type: 'lock', slotIndex: slot }); focusSlot(slot); }}
              onSwap={() => { setMenuSlot(null); setSwapSlot(slot); }}
            />
          ))}
        </ul>
        {swapSlot != null && (
          <SwapPanel members={members} slotIndex={swapSlot} ctx={ctx} before={evaluation} onSwap={swap} onClose={closeSwap} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="toolbar" aria-label="Editar o esboço">
        <button type="button" onClick={findFix} disabled={disabled || busy || fix.status === 'searching'} className={toolButton}>
          {fix.status === 'searching' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {fix.status === 'searching' ? 'Procurando…' : 'Corrigir a pior ameaça'}
        </button>
        <button type="button" onClick={regenerate} disabled={disabled || busy} title="Mantém os fixos" className={toolButton}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          {busy ? 'Procurando…' : 'Regenerar'}
        </button>
        <button type="button" onClick={() => { setFix({ status: 'idle' }); setNotice(null); onEdit(index, { type: 'undo' }); }} disabled={disabled || !card.history.length} className={toolButton}>
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          Desfazer
        </button>
      </div>
      <p className="mt-1 text-[10px] text-smeargle-textDim/80">Toque em um Pokémon para fixar ou trocar. Regenerar mantém os fixos.</p>

      {fix.status === 'done' && (
        <div className="mt-2">
          <FixProposal
            result={fix.result}
            members={members}
            onApply={(result) => swap(result.option)}
            onSeeOptions={(slot) => { setFix({ status: 'idle' }); setSwapSlot(slot); }}
            onClose={() => setFix({ status: 'idle' })}
          />
        </div>
      )}
      {notice && <p role="status" className="mt-2 rounded-[4px] border border-danger/30 bg-danger/5 p-2.5 font-reading text-xs text-smeargle-text">{notice}</p>}

      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <Expandable summary={`Por que ${evaluation.gauntlet.score} no teste do meta?`}>
            <ul className="list-disc space-y-0.5 pl-4 font-serif text-[11px] text-smeargle-textDim">
              {gauntletLines(evaluation.gauntlet).map((line) => <li key={line}>{line}</li>)}
            </ul>
          </Expandable>
          <Expandable summary={`Por que ${fitPercent}% no estilo?`}>
            <ul className="list-disc space-y-0.5 pl-4 font-serif text-[11px] text-smeargle-textDim">
              {fitLines(evaluation.fit).map((line) => <li key={line}>{line}</li>)}
            </ul>
          </Expandable>
        </div>

        <RoleChecklist checklist={checklist} coveredBy={evaluation.roles.coveredBy} />
        <GauntletGrid threats={evaluation.gauntlet.threats} changed={feedback?.changed} />
        <PickReasons members={added} />

        <Expandable summary="Sets dos Pokémon novos">
          <ul className="space-y-1 font-serif text-[11px] text-smeargle-textDim">
            {added.map(({ pokemon, set }) => (
              <li key={pokemon.id}>
                <span className="font-semibold text-smeargle-text">{formatSlug(pokemon.name)}:</span> {setLine(set) || 'sem build no tier'}
              </li>
            ))}
          </ul>
        </Expandable>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-brown">Brechas:</span>
          {evaluation.holes.length
            ? evaluation.holes.map((type) => <PokemonTypeBadge key={type} type={type} className="!px-1.5 !text-[8px]" />)
            : <span className="font-serif italic text-smeargle-textDim/80">Sem brechas graves</span>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <SaveSketch
          defaultName={`${tierLabel} · ${evaluation.title}`.slice(0, 40)}
          canSave={canSave}
          disabled={disabled}
          onSave={saveAs}
        />
        <CopyShowdownButton getTeam={getTeam} disabled={disabled} />
        <button type="button" onClick={() => onApply(card)} disabled={disabled} className="btn-action !h-9 font-serif">
          {applying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PenLine className="h-4 w-4" aria-hidden="true" />}
          {applying ? 'Montando os sets...' : 'Usar este esboço'}
        </button>
      </div>
    </li>
  );
}

export default memo(SketchCard);
