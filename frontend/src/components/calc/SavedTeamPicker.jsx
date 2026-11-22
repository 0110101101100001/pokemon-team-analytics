import { memo, useState } from 'react';
import { MemberShortcut, SelectField, SourcePanel } from './SourcePanel';
import { formatSlug } from '../../utils/filters';

const NOTE = 'font-reading text-sm italic text-umber';
const LINK = 'cursor-pointer font-semibold not-italic text-sepia underline underline-offset-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt';

/**
 * Puxa um dos seus times (o em montagem no Team Builder e, com login, os salvos) para um dos lados:
 * escolher o time já põe o primeiro Pokémon em campo, com o set salvo; os outros viram atalhos.
 * Se o time escolhido sair da lista (apagado, logout), volta para o primeiro.
 */
function SavedTeamPicker({ teams, loggedIn, activeMember, defaultOpen = false, onPick, onLogin }) {
  const [teamId, setTeamId] = useState(null);
  const team = teams.find((source) => source.id === teamId) ?? teams[0];

  // O time inteiro vai junto, para os outros virarem reservas.
  const pick = (source, index) => {
    const members = source.members.map(({ set, ...pokemon }) => ({ pokemon, set }));
    onPick(members[index].pokemon, members[index].set, { key: `team:${source.id}`, index, members });
  };

  const choose = (id) => {
    setTeamId(id);
    const source = teams.find((candidate) => candidate.id === id);
    if (source?.members.length) pick(source, 0);
  };

  return (
    <SourcePanel title="seus times" selected={team?.label} defaultOpen={defaultOpen && Boolean(team)}>
      {team && (
        <>
          {teams.length > 1 && (
            <SelectField label="time" value={team.id} onChange={choose}>
              {teams.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </SelectField>
          )}
          <ul className="flex flex-wrap gap-1.5" aria-label={`Pokémon de ${team.label}`}>
            {team.members.map((member, index) => (
              <li key={`${team.id}-${member.id}`}>
                <MemberShortcut
                  spriteId={member.id}
                  label={`Usar ${formatSlug(member.name)} de ${team.label}`}
                  caption={member.set?.level && member.set.level !== 100 ? `Nv. ${member.set.level}` : null}
                  active={activeMember === `team:${team.id}|${index}`}
                  onClick={() => pick(team, index)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {!loggedIn && (
        <p className={NOTE}>
          <button type="button" onClick={onLogin} className={LINK}>Entre na sua conta</button>
          {' '}para puxar os times que você salvou.
        </p>
      )}
      {loggedIn && teams.every((source) => source.id === 'current') && (
        <p className={NOTE}>
          Você ainda não tem times salvos. Monte e salve um na aba{' '}
          <a href="#/times" className={LINK}>Times</a>.
        </p>
      )}
    </SourcePanel>
  );
}

export default memo(SavedTeamPicker);
