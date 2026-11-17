import { memo, useMemo, useState } from 'react';
import { ChevronDown, Loader2, TriangleAlert } from 'lucide-react';
import { thumbnailSpriteUrl } from '../../services/api';
import { fetchTrainers } from '../../services/trainers';
import { loadBattleData, moveSummaryOf } from '../../utils/battleData';
import { formatSlug } from '../../utils/filters';
import { REGIONS, battleLabel, resolveTrainerPokemon, roleLabel, trainerMemberSet } from '../../utils/trainers';

const SELECT = 'paper-field h-9 w-full min-w-0 cursor-pointer appearance-none pl-2.5 pr-7 font-reading text-[13px]';

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block font-hand text-base leading-none text-[#78614E]">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78614E]" aria-hidden="true" />
      </span>
    </label>
  );
}

/**
 * Puxa o time de um líder, Elite 4 ou campeão para o lado do oponente: escolhe o treinador e a batalha,
 * e cada Pokémon do time vira um atalho com o nível e os golpes do jogo. Os dados só são buscados ao abrir.
 */
function TrainerTeamPicker({ pool, currentId, onPick }) {
  const [state, setState] = useState({ status: 'idle', trainers: [], battleData: null });
  const [selection, setSelection] = useState({ slug: '', battleId: '' });

  const entryByName = useMemo(() => new Map(pool.map((entry) => [entry.name, entry])), [pool]);

  const load = () => {
    if (state.status !== 'idle' && state.status !== 'error') return;
    setState((current) => ({ ...current, status: 'loading' }));
    Promise.all([fetchTrainers(), loadBattleData()])
      .then(([trainers, battleData]) => setState({ status: 'ready', trainers, battleData }))
      .catch(() => setState({ status: 'error', trainers: [], battleData: null }));
  };

  const byRegion = useMemo(() => REGIONS
    .map((region) => ({ region, trainers: state.trainers.filter((trainer) => trainer.battles[0].region === region) }))
    .filter((group) => group.trainers.length > 0), [state.trainers]);

  const trainer = state.trainers.find((candidate) => candidate.slug === selection.slug);
  const battle = trainer?.battles.find((candidate) => candidate.id === selection.battleId) ?? trainer?.battles[0];

  const members = useMemo(() => {
    if (!battle || !state.battleData) return [];
    const summaryOf = (slug) => moveSummaryOf(state.battleData, slug);
    return battle.team
      .map((member) => ({ member, entry: resolveTrainerPokemon(entryByName, member.slug) }))
      .filter(({ entry }) => entry)
      .map(({ member, entry }) => ({ member, entry, set: trainerMemberSet(member, summaryOf) }));
  }, [battle, state.battleData, entryByName]);

  // Ao trocar de treinador ou de batalha, o primeiro Pokémon do time já entra em campo.
  const choose = (slug, battleId) => {
    setSelection({ slug, battleId });
    const chosen = state.trainers.find((candidate) => candidate.slug === slug);
    const chosenBattle = chosen?.battles.find((candidate) => candidate.id === battleId) ?? chosen?.battles[0];
    const lead = chosenBattle?.team[0];
    const entry = lead && resolveTrainerPokemon(entryByName, lead.slug);
    if (entry) onPick(entry, trainerMemberSet(lead, (moveSlug) => moveSummaryOf(state.battleData, moveSlug)));
  };

  return (
    <details className="group mt-2 rounded-[4px] border border-[#5C4033]/30 bg-[#F7F3EE]/50" onToggle={(e) => e.currentTarget.open && load()}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt [&::-webkit-details-marker]:hidden">
        <span className="font-hand text-lg leading-none text-[#5C4033]">time de um treinador</span>
        {trainer && <span className="ml-auto truncate font-reading text-xs font-semibold text-[#5C4033]">{trainer.name}</span>}
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#78614E] transition-transform group-open:rotate-180 motion-reduce:transition-none ${trainer ? '' : 'ml-auto'}`} aria-hidden="true" />
      </summary>

      <div className="space-y-2.5 border-t border-[#5C4033]/25 px-3 pb-3 pt-2">
        {state.status === 'loading' && (
          <p className="flex items-center gap-2 py-2 font-reading text-sm italic text-[#78614E]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chamando os treinadores...
          </p>
        )}

        {state.status === 'error' && (
          <p role="alert" className="flex items-center gap-2 py-1 text-xs font-medium text-[#8A3B27]">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Não foi possível carregar os treinadores.
            <button type="button" onClick={load} className="cursor-pointer underline underline-offset-2">Tentar de novo</button>
          </p>
        )}

        {state.status === 'ready' && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SelectField label="treinador" value={selection.slug} onChange={(slug) => choose(slug, '')}>
                <option value="">Escolher...</option>
                {byRegion.map(({ region, trainers }) => (
                  <optgroup key={region} label={region}>
                    {trainers.map((candidate) => <option key={candidate.slug} value={candidate.slug}>{candidate.name}</option>)}
                  </optgroup>
                ))}
              </SelectField>
              {trainer && trainer.battles.length > 1 && (
                <SelectField label="batalha" value={battle.id} onChange={(battleId) => choose(trainer.slug, battleId)}>
                  {trainer.battles.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {battleLabel(candidate)}{trainer.roles.length > 1 ? ` · ${roleLabel(candidate.role)}` : ''}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>

            {members.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label={`Time de ${trainer.name}`}>
                {members.map(({ member, entry, set }, index) => (
                  // O mesmo Pokémon pode aparecer duas vezes num time (os dois Onix de Bruno), daí o índice na chave.
                  <li key={`${member.slug}-${index}`}>
                    <button
                      type="button"
                      onClick={() => onPick(entry, set)}
                      aria-label={`Usar ${member.name} (nível ${member.level}) de ${trainer.name}`}
                      title={`${formatSlug(entry.name)} · Nv. ${member.level}`}
                      className={`flex cursor-pointer flex-col items-center rounded-[3px] border bg-paper px-1 pb-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt ${
                        currentId === entry.id ? 'border-smeargle-olive ring-1 ring-smeargle-olive' : 'border-[#78614E]/25 hover:border-[#78614E]/60'
                      }`}
                    >
                      <img src={thumbnailSpriteUrl(entry.id)} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 object-contain" />
                      <span className="font-mono text-[10px] font-bold tabular-nums text-[#78614E]">Nv. {member.level}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export default memo(TrainerTeamPicker);
