import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import GameOptions from '../components/GameOptions';
import MoveAbilityModal from '../components/MoveAbilityModal';
import ItemGrid from '../components/items/ItemGrid';
import MachineTable from '../components/items/MachineTable';
import { HeaderSearch, HeaderSegmented, HeaderSelect, OPTION_CLASS } from '../components/layout/HeaderControls';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { DEFAULT_GAME_ID, GAMES, gameById } from '../data/games';
import MACHINES from '../data/machines.json';
import { TYPE_NAMES, fetchItemIndex } from '../services/api';
import { formatSlug } from '../utils/filters';

const VIEWS = [
  { value: 'items', label: 'Itens' },
  { value: 'machines', label: 'TMs' },
];

// As máquinas têm a sua própria visão; fora dela, o bolso "machines" só repetiria a lista.
const MACHINE_POCKET = 'machines';
const POCKET_LABELS = {
  misc: 'Diversos',
  medicine: 'Medicina',
  pokeballs: 'Poké Bolas',
  berries: 'Berries',
  mail: 'Cartas',
  battle: 'Batalha',
  key: 'Itens-chave',
};

// Brilliant Diamond / Shining Pearl fica de fora: a PokéAPI só tem 17 das 100 máquinas do jogo.
const MACHINE_GAMES = GAMES.filter((game) => MACHINES.games[game.id] && game.id !== 'brilliant-diamond-shining-pearl');

const machinesOf = (gameId) =>
  MACHINES.games[gameId].map(([code, move]) => {
    const [type, damageClass, power, accuracy] = MACHINES.moves[move];
    return { code, move, type, damageClass, power, accuracy };
  });

const toSearchSlug = (text) => text.trim().toLowerCase().replace(/\s+/g, '-');

function useItemIndex(enabled) {
  const [state, setState] = useState({ status: 'idle', items: [] });

  useEffect(() => {
    if (!enabled || state.status !== 'idle') return;
    setState({ status: 'loading', items: [] });
    fetchItemIndex()
      .then((items) => setState({ status: 'ready', items: items.filter((item) => item.pocket !== MACHINE_POCKET) }))
      .catch(() => setState({ status: 'error', items: [] }));
  }, [enabled, state.status]);

  return state;
}

export default function ItemsSection() {
  const [view, setView] = useState('items');
  const [query, setQuery] = useState('');
  const [pocket, setPocket] = useState('');
  const [category, setCategory] = useState('');
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID);
  const [moveType, setMoveType] = useState('');
  // { kind: 'item' | 'move', name }
  const [detail, setDetail] = useState(null);

  const deferredQuery = useDeferredValue(query);
  const showingItems = view === 'items';
  const index = useItemIndex(showingItems);

  const categories = useMemo(() => {
    const scoped = pocket ? index.items.filter((item) => item.pocket === pocket) : index.items;
    return [...new Set(scoped.map((item) => item.category))].sort();
  }, [index.items, pocket]);

  const items = useMemo(() => {
    const term = toSearchSlug(deferredQuery);
    return index.items.filter((item) =>
      (!pocket || item.pocket === pocket) &&
      (!category || item.category === category) &&
      (!term || item.name.includes(term)));
  }, [index.items, pocket, category, deferredQuery]);

  const gameMachines = useMemo(() => machinesOf(gameId), [gameId]);
  const machines = useMemo(() => {
    const term = toSearchSlug(deferredQuery);
    return gameMachines.filter((machine) =>
      (!moveType || machine.type === moveType) &&
      (!term || machine.move.includes(term) || machine.code.includes(term)));
  }, [gameMachines, moveType, deferredQuery]);

  const handleQuery = useCallback((e) => setQuery(e.target.value), []);
  const handlePocket = useCallback((e) => {
    setPocket(e.target.value);
    setCategory('');
  }, []);
  const selectItem = useCallback((name) => setDetail({ kind: 'item', name }), []);
  const selectMove = useCallback((name) => setDetail({ kind: 'move', name }), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const count = showingItems ? items.length : machines.length;

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <ToolbarRow>
          <div className="flex items-center gap-1.5 sm:contents">
            <HeaderSegmented label="Visão dos itens" options={VIEWS} value={view} onChange={setView} className="shrink-0" />
            <HeaderSearch
              label={showingItems ? 'Pesquisar item por nome' : 'Pesquisar máquina por golpe ou número'}
              placeholder={showingItems ? 'Nome do item...' : 'Golpe ou número (ex.: tm26)...'}
              value={query}
              onChange={handleQuery}
              className="min-w-0 sm:flex-1"
            />
          </div>
          {showingItems ? (
            <div className="grid grid-cols-2 gap-1.5 sm:contents">
              <HeaderSelect label="Filtrar por bolso da mochila" value={pocket} onChange={handlePocket} className="sm:w-44 sm:shrink-0">
                <option value="" className={OPTION_CLASS}>Todos os bolsos</option>
                {Object.entries(POCKET_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className={OPTION_CLASS}>{label}</option>
                ))}
              </HeaderSelect>
              <HeaderSelect label="Filtrar por categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-44 sm:shrink-0">
                <option value="" className={OPTION_CLASS}>Todas as categorias</option>
                {categories.map((name) => <option key={name} value={name} className={OPTION_CLASS}>{formatSlug(name)}</option>)}
              </HeaderSelect>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:contents">
              <HeaderSelect label="Jogo das máquinas" value={gameId} onChange={(e) => setGameId(e.target.value)} className="sm:w-44 sm:shrink-0">
                <GameOptions games={MACHINE_GAMES} />
              </HeaderSelect>
              <HeaderSelect label="Filtrar por tipo do golpe" value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                <option value="" className={OPTION_CLASS}>Todos os tipos</option>
                {TYPE_NAMES.map((type) => <option key={type} value={type} className={OPTION_CLASS}>{formatSlug(type)}</option>)}
              </HeaderSelect>
            </div>
          )}
        </ToolbarRow>
      </HeaderToolbar>

      <SectionHeading
        caption={showingItems ? 'inventário de campo' : `máquinas de ${gameById(gameId).label}`}
        title={(
          <>
            <span className="ink-splotch tabular-nums">{count}</span>{' '}
            {showingItems ? `ite${count !== 1 ? 'ns' : 'm'}` : `máquina${count !== 1 ? 's' : ''}`}
          </>
        )}
        note={deferredQuery.trim() && (
          <>
            Resultado para <span className="font-serif italic">“{deferredQuery.trim()}”</span>
          </>
        )}
        aside={(
          <span className={HEADING_PILL_CLASS}>
            {showingItems ? 'Toque num item para ver o efeito' : 'Toque num golpe para ver os detalhes'}
          </span>
        )}
      />

      {!showingItems ? (
        <MachineTable machines={machines} onSelectMove={selectMove} />
      ) : index.status === 'ready' ? (
        <ItemGrid items={items} onSelect={selectItem} />
      ) : index.status === 'error' ? (
        <p role="alert" className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-[#8A3B27]">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          Não foi possível carregar os itens agora. Tente de novo em instantes.
        </p>
      ) : (
        <p className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-[#78614E]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Revirando a mochila...
        </p>
      )}

      {detail && <MoveAbilityModal kind={detail.kind} name={detail.name} onClose={closeDetail} />}
    </div>
  );
}
