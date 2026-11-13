import { memo, useCallback, useEffect, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { fetchPokemonEncounters } from '../services/api';
import { groupEncountersByVersion } from '../utils/encounters';

const RARITY_STYLES = {
  guaranteed: 'bg-[#2A2421] text-[#F7F3EE] border-[#2A2421]',
  common: 'bg-[#829b72]/15 text-[#5B7856] border-[#829b72]/30',
  uncommon: 'bg-[#C9A66B]/20 text-[#78614E] border-[#C9A66B]/40',
  rare: 'bg-[#C15454]/10 text-[#9A3F3F] border-[#C15454]/25',
  'very-rare': 'bg-[#780000]/10 text-[#780000] border-[#780000]/25',
};

const EncounterLocation = memo(function EncounterLocation({ location }) {
  return (
    <li className="p-2.5 rounded-lg bg-[#F7F3EE]/60 border border-[#2A2421]/10 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-[#2A2421] leading-snug">{location.name}</span>
        {location.levelRange && (
          <span className="shrink-0 text-[10px] font-semibold text-[#78614E]">{location.levelRange}</span>
        )}
      </div>
      {location.exclusiveTo && (
        <span className="inline-block px-1.5 py-px rounded bg-[#FFFEFB] border border-[#2A2421]/15 text-[9px] font-bold uppercase tracking-wider text-[#78614E]">
          Só em {location.exclusiveTo.join(', ')}
        </span>
      )}
      <div className="flex flex-wrap gap-1">
        {location.methods.map((method) => (
          <span
            key={method.name}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${RARITY_STYLES[method.rarity.tone]}`}
          >
            {method.label}
            <span className="font-medium opacity-80">· {method.rarity.label} {method.chance}%</span>
          </span>
        ))}
      </div>
    </li>
  );
});

const EncounterGroup = memo(function EncounterGroup({ group, open, onToggle }) {
  const count = group.locations.length;
  const panelId = `encounters-${group.key}`;

  return (
    <div className="rounded-xl border border-[#2A2421]/15 bg-[#FFFEFB] overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(group.key)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[#F7F3EE]/60 transition-colors cursor-pointer"
      >
        <span className="text-xs font-bold text-[#2A2421]">{group.label}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-[#78614E] uppercase tracking-wider">
            {count} {count === 1 ? 'local' : 'locais'}
          </span>
          <ChevronDown className={`w-4 h-4 text-[#78614E] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <ul id={panelId} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border-t border-[#2A2421]/10">
          {group.locations.map((location) => (
            <EncounterLocation key={location.id} location={location} />
          ))}
        </ul>
      )}
    </div>
  );
});

function PokemonEncounters({ pokemonId }) {
  const [state, setState] = useState({ status: 'loading', groups: [] });
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (!pokemonId) return;
    let active = true;
    setState({ status: 'loading', groups: [] });

    fetchPokemonEncounters(pokemonId)
      .then((data) => {
        if (!active) return;
        const groups = groupEncountersByVersion(data);
        setState({ status: 'ready', groups });
        setOpenKey(groups[0]?.key ?? null);
      })
      .catch(() => { if (active) setState({ status: 'error', groups: [] }); });

    return () => { active = false; };
  }, [pokemonId]);

  const toggle = useCallback((key) => setOpenKey((current) => (current === key ? null : key)), []);

  const { status, groups } = state;

  return (
    <div className="paper-card paper-card-quiet space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#829b72]" aria-hidden="true" />
          <h3 className="font-serif text-base font-bold tracking-tight text-[#2A2421]">Rotas de Encontro</h3>
        </div>
        {status === 'ready' && groups.length > 0 && (
          <span className="rounded-full border border-[#2A2421]/60 bg-[#829b72] px-2.5 py-1 text-[10px] font-bold text-white shadow-[2px_2px_0_rgba(42,36,33,0.2)]">
            {groups.length} {groups.length === 1 ? 'jogo' : 'jogos'}
          </span>
        )}
      </div>

      {status === 'loading' && (
        <p className="text-xs text-[#78614E] font-medium animate-pulse">Consultando o mapa de campo...</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-[#78614E]">Não foi possível carregar os locais de encontro.</p>
      )}
      {status === 'ready' && groups.length === 0 && (
        <p className="text-xs text-[#78614E]">Sem registros de encontro selvagem na PokéAPI.</p>
      )}
      {status === 'ready' && groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((group) => (
            <EncounterGroup key={group.key} group={group} open={openKey === group.key} onToggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(PokemonEncounters);
