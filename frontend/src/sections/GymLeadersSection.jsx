import { useMemo, useState } from 'react';
import { Medal } from 'lucide-react';
import GameOptions from '../components/GameOptions';
import LeaderCard from '../components/leaders/LeaderCard';
import { HeaderSegmented, HeaderSelect } from '../components/layout/HeaderControls';
import HeaderToolbar, { ToolbarRow } from '../components/layout/HeaderToolbar';
import SectionHeading, { HEADING_PILL_CLASS } from '../components/layout/SectionHeading';
import { GAMES, gameById } from '../data/games';
import { GYM_LEADERS, LEADER_ROLES } from '../data/gymLeaders';

const LEADER_GAMES = GAMES.filter((game) => GYM_LEADERS[game.id]);

const ROLE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'gym', label: LEADER_ROLES.gym.label },
  { value: 'elite', label: LEADER_ROLES.elite.label },
];

// O campeão é a última batalha da Liga: aparece junto com a Elite 4.
const ROLES_BY_FILTER = { all: ['gym', 'elite', 'champion'], gym: ['gym'], elite: ['elite', 'champion'] };

function EmptyLeaders() {
  return (
    <div className="space-y-6">
      <SectionHeading caption="rumo à liga" title="Gym Leaders" />
      <div className="ink-scatter flex flex-col items-center justify-center py-16 text-center text-sm font-medium text-[#78614E]">
        <div className="ink-stamp mb-4 h-14 w-14 text-[#78614E]">
          <Medal className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="font-hand text-2xl leading-none">página ainda em branco</p>
        <p className="mt-2 max-w-sm">Os líderes de ginásio, a Elite 4 e os campeões de cada jogo vão aparecer aqui em breve.</p>
      </div>
    </div>
  );
}

export default function GymLeadersSection(props) {
  return LEADER_GAMES.length ? <LeadersByGame {...props} /> : <EmptyLeaders />;
}

function LeadersByGame({ entryByName, onSelectPokemon }) {
  const [gameId, setGameId] = useState(LEADER_GAMES[0].id);
  const [roleFilter, setRoleFilter] = useState('all');

  const groups = useMemo(
    () => ROLES_BY_FILTER[roleFilter]
      .map((role) => ({ role, leaders: GYM_LEADERS[gameId].filter((leader) => leader.role === role) }))
      .filter((group) => group.leaders.length > 0),
    [gameId, roleFilter],
  );

  const count = groups.reduce((sum, group) => sum + group.leaders.length, 0);

  return (
    <div className="space-y-6">
      <HeaderToolbar>
        <ToolbarRow>
          <HeaderSelect label="Jogo" value={gameId} onChange={(e) => setGameId(e.target.value)} className="sm:flex-1">
            <GameOptions games={LEADER_GAMES} />
          </HeaderSelect>
          <HeaderSegmented label="Tipo de batalha" options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} />
        </ToolbarRow>
      </HeaderToolbar>

      <SectionHeading
        caption={`rumo à liga · ${gameById(gameId).label}`}
        title={(
          <>
            <span className="ink-splotch tabular-nums">{count}</span> treinador{count !== 1 ? 'es' : ''} no caminho
          </>
        )}
        aside={<span className={HEADING_PILL_CLASS}>Toque num Pokémon para abrir a ficha</span>}
      />

      {groups.map(({ role, leaders }) => (
        <section key={role} aria-label={LEADER_ROLES[role].title}>
          <h3 className="section-title">{LEADER_ROLES[role].title}</h3>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {leaders.map((leader) => (
              <LeaderCard key={`${role}-${leader.name}`} leader={leader} entryByName={entryByName} onSelectPokemon={onSelectPokemon} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
