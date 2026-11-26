import { memo, useEffect, useId, useState } from 'react';
import { ChoiceGroup, PanelSection, SaveStatus, Toggle } from './settingsUi';
import { FORMATS, LEVELS, SPRITE_STYLES } from '../../preferences/preferences';
import { usePreferenceSaver, usePreferences } from '../../preferences/usePreferences';
import { SECTIONS } from '../../navigation/sections';
import { fetchTrainers } from '../../services/trainers';
import { gamesOf } from '../../utils/trainers';

const LEVEL_OPTIONS = LEVELS.map((level) => ({ value: level, label: `Nível ${level}` }));
const HOME_OPTIONS = SECTIONS.map((section) => ({ value: section.path, label: section.label }));

// Jogos da Liga, da mesma lista que o filtro da seção usa (em cache por 24 h).
function useLeagueGames() {
  const [games, setGames] = useState(null);
  useEffect(() => {
    let active = true;
    fetchTrainers()
      .then((trainers) => active && setGames(gamesOf(trainers)))
      .catch(() => active && setGames([]));
    return () => { active = false; };
  }, []);
  return games;
}

/** Preferências de uso: valem na hora e ficam na conta (user_settings). */
function PreferencesPanel() {
  const { values } = usePreferences();
  const [status, save] = usePreferenceSaver();
  const games = useLeagueGames();
  const gameId = useId();
  const homeId = useId();

  return (
    <div>
      <div className="mb-3 flex justify-end"><SaveStatus status={status} /></div>

      <PanelSection title="Batalha" description="O ponto de partida da ficha e da calculadora. Você ainda pode trocar em cada tela.">
        <div className="space-y-4">
          <ChoiceGroup
            label="Formato padrão"
            options={FORMATS}
            value={values.default_format}
            onChange={(default_format) => save({ default_format })}
          />
          <p className="-mt-2 text-xs italic text-umber">
            Abre a ficha nas builds desse formato. O uso da Smogon de VGC e Doubles vem do Doubles OU, o único em dupla nos dados mensais.
          </p>
          <ChoiceGroup
            label="Nível dos Pokémon novos na calculadora"
            options={LEVEL_OPTIONS}
            value={values.default_level}
            onChange={(default_level) => save({ default_level })}
          />
        </div>
      </PanelSection>

      <PanelSection title="Sprites" description="Como o Pokémon aparece no alto da ficha.">
        <div className="space-y-4">
          <div>
            <ChoiceGroup
              label="Estilo"
              options={SPRITE_STYLES}
              value={values.sprite_style}
              onChange={(sprite_style) => save({ sprite_style })}
            />
            <p className="mt-1.5 text-xs italic text-umber">
              {SPRITE_STYLES.find((option) => option.value === values.sprite_style)?.hint}
            </p>
          </div>
          <Toggle
            label="Abrir em shiny"
            description="A ficha já começa com a coloração shiny; o botão da ficha continua alternando."
            checked={values.shiny_sprites}
            onChange={(shiny_sprites) => save({ shiny_sprites })}
          />
        </div>
      </PanelSection>

      <PanelSection title="Navegação">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={homeId} className="mb-1.5 block text-sm font-semibold text-ink">Página inicial</label>
            <select
              id={homeId}
              value={values.home_section}
              onChange={(event) => save({ home_section: event.target.value })}
              className="paper-field h-10 w-full px-2 text-sm"
            >
              {HOME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <p className="mt-1 text-xs italic text-umber">Vale quando você abre o site sem uma seção no endereço.</p>
          </div>
          <div>
            <label htmlFor={gameId} className="mb-1.5 block text-sm font-semibold text-ink">Jogo padrão da Liga</label>
            <select
              id={gameId}
              value={values.default_league_game ?? ''}
              onChange={(event) => save({ default_league_game: event.target.value || null })}
              disabled={games === null}
              className="paper-field h-10 w-full px-2 text-sm disabled:opacity-60"
            >
              <option value="">Todos os jogos</option>
              {/* Um jogo salvo que saiu da lista continua visível, para não sumir em silêncio. */}
              {values.default_league_game && games && !games.includes(values.default_league_game) && (
                <option value={values.default_league_game}>{values.default_league_game}</option>
              )}
              {(games ?? []).map((game) => <option key={game} value={game}>{game}</option>)}
            </select>
            <p className="mt-1 text-xs italic text-umber">A seção Liga já abre filtrada por esse jogo.</p>
          </div>
        </div>
      </PanelSection>
    </div>
  );
}

export default memo(PreferencesPanel);
