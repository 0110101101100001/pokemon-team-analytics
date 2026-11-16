import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import MoveAbilityModal from '../components/MoveAbilityModal';
import MoveTable from '../components/moves/MoveTable';
import { DAMAGE_CLASS_LABELS } from '../components/moves/moveTableStyles';
import { HeaderSearch, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import MOVE_LIST from '../data/moves.json';
import { TYPE_NAMES } from '../services/api';
import { formatSlug } from '../utils/filters';

// moves.json (scripts/build-moves.mjs): [slug, tipo, categoria, poder, precisão, PP, geração].
const MOVES = MOVE_LIST.map(([slug, type, damageClass, power, accuracy, pp, generation]) => ({
  slug, type, damageClass, power, accuracy, pp, generation, label: formatSlug(slug).toLowerCase(),
}));

const toSearchTerm = (text) => text.trim().toLowerCase().replace(/-/g, ' ');

export default function MovesSection({ entryByName, onSelectPokemon }) {
  const [query, setQuery] = useState('');
  const [moveType, setMoveType] = useState('');
  const [damageClass, setDamageClass] = useState('');
  const [openMove, setOpenMove] = useState(null);
  const [detail, setDetail] = useState(null);

  const deferredQuery = useDeferredValue(query);

  const moves = useMemo(() => {
    const term = toSearchTerm(deferredQuery);
    return MOVES.filter((move) =>
      (!moveType || move.type === moveType) &&
      (!damageClass || move.damageClass === damageClass) &&
      (!term || move.label.includes(term)));
  }, [moveType, damageClass, deferredQuery]);

  const handleQuery = useCallback((e) => setQuery(e.target.value), []);
  const toggleMove = useCallback((slug) => setOpenMove((current) => (current === slug ? null : slug)), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const count = moves.length;

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
            <HeaderSelect label="Filtrar por categoria do golpe" value={damageClass} onChange={(e) => setDamageClass(e.target.value)} className="lg:w-44 lg:shrink-0">
              <option value="" className={OPTION_CLASS}>Todas as categorias</option>
              {Object.entries(DAMAGE_CLASS_LABELS).map(([value, label]) => (
                <option key={value} value={value} className={OPTION_CLASS}>{label}</option>
              ))}
            </HeaderSelect>
          </div>
        </ToolbarRow>
      </HeaderToolbar>

      <SectionHeading
        title="Movimentos"
        subtitle={(
          <>
            <span className="font-semibold tabular-nums text-[#2A2421]">{count}</span>{' '}
            {`golpe${count !== 1 ? 's' : ''}`}
            {deferredQuery.trim() && <> para <span className="font-serif italic">“{deferredQuery.trim()}”</span></>}
          </>
        )}
        aside={<span className={HEADING_PILL_CLASS}>Toque em “Pokémon” para ver quem aprende</span>}
      />

      <MoveTable
        moves={moves}
        openMove={openMove}
        onToggleMove={toggleMove}
        onSelectMove={setDetail}
        entryByName={entryByName}
        onSelectPokemon={onSelectPokemon}
      />

      {detail && <MoveAbilityModal kind="move" name={detail} onClose={closeDetail} />}
    </div>
  );
}
