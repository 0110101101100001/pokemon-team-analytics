import { memo, useMemo } from 'react';
import { ArrowLeftRight, Eraser } from 'lucide-react';
import { TYPE_NAMES, defensiveProfile } from '../../data/typeChart';
import { capitalize } from '../../utils/typeColors';

// Grupos da defesa combinada, do pior ao melhor; as faixas usam as cores fixas de efetividade (themes.css).
const GROUPS = [
  { key: 'x4', label: '4×', caption: 'fraqueza dupla', tone: 'bg-eff-weak4 text-fixed-light' },
  { key: 'x2', label: '2×', caption: 'fraqueza', tone: 'bg-eff-weak2 text-fixed-light' },
  { key: 'x1', label: '1×', caption: 'normal', tone: 'border border-line-strong text-ink' },
  { key: 'x05', label: '½×', caption: 'resiste', tone: 'bg-eff-resist2 text-fixed-light' },
  { key: 'x025', label: '¼×', caption: 'resiste muito', tone: 'bg-eff-resist4 text-fixed-light' },
  { key: 'x0', label: '0×', caption: 'imune', tone: 'bg-ink text-paper' },
];

function TypeSelect({ label, value, onChange, optional = false, exclude = null }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="paper-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="paper-field cursor-pointer">
        <option value="">{optional ? '—' : 'Escolha um tipo'}</option>
        {TYPE_NAMES.filter((type) => type !== exclude).map((type) => (
          <option key={type} value={type}>{capitalize(type)}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * Defesa de um Pokémon de 1 ou 2 tipos: quanto dano cada tipo de ataque causa, agrupado em 4×, 2×, 1×, ½×, ¼× e
 * imune (defensiveProfile). Os tipos vêm de fora (`first`, `second`, '' quando vazios) para a página os guardar no
 * endereço; `onChange({ first, second })` recebe a troca.
 */
function DefenseCalculator({ first, second, onChange }) {
  const profile = useMemo(() => {
    const types = [first, second].filter(Boolean);
    return types.length ? defensiveProfile(types) : null;
  }, [first, second]);

  return (
    <section aria-labelledby="tipos-defesa" className="paper-card space-y-4 p-4 sm:p-5">
      <h3 id="tipos-defesa" className="section-title !mb-0">Calculadora de defesa</h3>
      <p className="font-reading text-sm text-ink-soft">
        Escolha um ou dois tipos para ver quanto dano cada tipo de ataque causa nessa combinação.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TypeSelect label="Tipo 1" value={first} onChange={(value) => onChange({ first: value, second: value === second ? '' : second })} />
        <TypeSelect label="Tipo 2 (opcional)" value={second} optional exclude={first} onChange={(value) => onChange({ first, second: value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ first: second, second: first })}
          disabled={!first || !second}
          className="btn-outline !min-h-9 !px-3 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Trocar tipos
        </button>
        <button
          type="button"
          onClick={() => onChange({ first: '', second: '' })}
          disabled={!first && !second}
          className="btn-outline !min-h-9 !px-3 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
          Limpar
        </button>
      </div>

      {profile ? (
        <dl className="space-y-2" aria-live="polite">
          {GROUPS.map(({ key, label, caption, tone }) => (
            <div key={key} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
              <dt className="flex flex-col items-start gap-0.5">
                <span className={`inline-flex h-6 min-w-10 items-center justify-center rounded-[3px] px-1.5 font-mono text-sm font-bold ${tone}`}>{label}</span>
                <span className="font-reading text-[11px] text-muted">{caption}</span>
              </dt>
              <dd className="flex min-h-6 flex-wrap gap-1.5">
                {profile[key].length
                  ? profile[key].map((type) => <span key={type} className="type-chip !text-[11px]" data-type={type}>{capitalize(type)}</span>)
                  : <span className="font-reading text-sm italic text-ink-soft">nenhum</span>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="font-reading text-sm italic text-ink-soft">Escolha o tipo 1 para ver a defesa.</p>
      )}
    </section>
  );
}

export default memo(DefenseCalculator);
