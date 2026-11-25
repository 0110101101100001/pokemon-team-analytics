import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import MoveAbilityModal from '../components/MoveAbilityModal';
import MoveTable from '../components/moves/MoveTable';
import SpecialMoves, { specialMovesOf } from '../components/moves/SpecialMoves';
import ContestTable from '../components/moves/ContestTable';
import { CONTEST_CATEGORIES, CONTEST_MOVES, filterContestMoves } from '../utils/contests';
import { BrushUnderline } from '../components/InkDecor';
import { DAMAGE_CLASS_LABELS } from '../components/moves/moveTableStyles';
import { HeaderSearch, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import MOVE_LIST from '../data/moves.json';
import { TYPE_NAMES, movePowerOf } from '../services/api';
import { formatSlug } from '../utils/filters';

// moves.json (scripts/build-moves.mjs): [slug, tipo, categoria, poder, precisão, PP, geração].
const MOVES = MOVE_LIST.map(([slug, type, damageClass, power, accuracy, pp, generation]) => ({
  slug, type, damageClass, power: movePowerOf({ name: slug, power }), accuracy, pp, generation, label: formatSlug(slug).toLowerCase(),
}));

const toSearchTerm = (text) => text.trim().toLowerCase().replace(/-/g, ' ');

// Golpes comuns (os que algum Pokémon aprende) e os especiais, que entram só por Dynamax ou cristal Z.
const KINDS = [
  { value: 'learnable', label: 'Golpes' },
  { value: 'max', label: 'Dynamax / G-Max' },
  { value: 'z', label: 'Golpes Z' },
  { value: 'contest', label: 'Contests' },
];

function KindTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Tipo de golpe" className="inline-flex flex-wrap gap-1 border-b-[1.5px] border-ink/70">
      {KINDS.map((kind) => {
        const selected = kind.value === value;
        return (
          <button
            key={kind.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(kind.value)}
            className={`relative h-9 cursor-pointer rounded-[2px] px-3 font-reading text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
              selected ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {kind.label}
            <BrushUnderline color="var(--accent)" active={selected} className="inset-x-2 -bottom-1 h-[5px] w-[calc(100%-1rem)]" />
          </button>
        );
      })}
    </div>
  );
}

export default function MovesSection({ entryByName, onSelectPokemon }) {
  const [query, setQuery] = useState('');
  const [moveType, setMoveType] = useState('');
  const [damageClass, setDamageClass] = useState('');
  const [openMove, setOpenMove] = useState(null);
  const [detail, setDetail] = useState(null);
  const [kind, setKind] = useState('learnable');
  const special = kind === 'max' || kind === 'z';
  const contest = kind === 'contest';
  const [contestCategory, setContestCategory] = useState('');

  const deferredQuery = useDeferredValue(query);

  const moves = useMemo(() => {
    const term = toSearchTerm(deferredQuery);
    return MOVES.filter((move) =>
      (!moveType || move.type === moveType) &&
      (!damageClass || move.damageClass === damageClass) &&
      (!term || move.label.includes(term)));
  }, [moveType, damageClass, deferredQuery]);

  const specialFilters = useMemo(() => ({ term: toSearchTerm(deferredQuery), type: moveType }), [deferredQuery, moveType]);
  const contestMoves = useMemo(
    () => (contest ? filterContestMoves(CONTEST_MOVES, { ...specialFilters, category: contestCategory }) : []),
    [contest, specialFilters, contestCategory],
  );
  const specialCount = useMemo(() => {
    if (!special) return 0;
    const { first, second } = specialMovesOf(kind, specialFilters);
    return first.length + second.length;
  }, [special, kind, specialFilters]);

  const handleQuery = useCallback((e) => setQuery(e.target.value), []);
  const toggleMove = useCallback((slug) => setOpenMove((current) => (current === slug ? null : slug)), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const count = contest ? contestMoves.length : special ? specialCount : moves.length;

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <ToolbarRow rowFrom="lg">
          <HeaderSearch label="Pesquisar golpe por nome" placeholder="Nome do golpe..." value={query} onChange={handleQuery} />
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:contents">
            <HeaderSelect label="Filtrar por tipo do golpe" value={moveType} onChange={(e) => setMoveType(e.target.value)} className="lg:w-44 lg:shrink-0">
              <option value="" className={OPTION_CLASS}>Todos os tipos</option>
              {TYPE_NAMES.map((type) => <option key={type} value={type} data-type={type} className={OPTION_CLASS}>{formatSlug(type)}</option>)}
            </HeaderSelect>
            {/* Golpes Z e Max tomam a categoria do golpe base: o filtro só vale para os comuns. Nos Contests, vira a categoria do Contest. */}
            {contest ? (
              <HeaderSelect label="Filtrar pela categoria do Contest" value={contestCategory} onChange={(e) => setContestCategory(e.target.value)} className="lg:w-44 lg:shrink-0">
                <option value="" className={OPTION_CLASS}>Todas as categorias</option>
                {Object.entries(CONTEST_CATEGORIES).map(([value, { label, game }]) => (
                  <option key={value} value={value} className={OPTION_CLASS}>{label} ({game})</option>
                ))}
              </HeaderSelect>
            ) : (
              <HeaderSelect label="Filtrar por categoria do golpe" value={damageClass} onChange={(e) => setDamageClass(e.target.value)} disabled={special} className="lg:w-44 lg:shrink-0">
                <option value="" className={OPTION_CLASS}>Todas as categorias</option>
                {Object.entries(DAMAGE_CLASS_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className={OPTION_CLASS}>{label}</option>
                ))}
              </HeaderSelect>
            )}
          </div>
        </ToolbarRow>
      </HeaderToolbar>

      <SectionHeading
        title="Movimentos"
        subtitle={(
          <>
            <span className="font-semibold tabular-nums text-ink">{count}</span>{' '}
            {`golpe${count !== 1 ? 's' : ''}`}
            {deferredQuery.trim() && <> para <span className="font-serif italic">“{deferredQuery.trim()}”</span></>}
          </>
        )}
        aside={(
          <span className={HEADING_PILL_CLASS}>
            {contest ? 'Toque em “Combos” para ver os encadeamentos' : 'Toque em “Pokémon” para ver quem aprende'}
          </span>
        )}
      />

      <KindTabs value={kind} onChange={setKind} />

      {(kind === 'learnable' || contest) && (
        <p className="font-reading text-sm italic text-brown">* Clique no nome do golpe para ver mais informações.</p>
      )}

      {contest && <ContestTable moves={contestMoves} openMove={openMove} onToggleMove={toggleMove} onSelectMove={setDetail} />}
      {special && (
        <SpecialMoves kind={kind} filters={specialFilters} entryByName={entryByName} onSelectPokemon={onSelectPokemon} />
      )}
      {kind === 'learnable' && (
        <MoveTable
          moves={moves}
          openMove={openMove}
          onToggleMove={toggleMove}
          onSelectMove={setDetail}
          entryByName={entryByName}
          onSelectPokemon={onSelectPokemon}
        />
      )}

      {detail && <MoveAbilityModal kind="move" name={detail} onClose={closeDetail} />}
    </div>
  );
}
