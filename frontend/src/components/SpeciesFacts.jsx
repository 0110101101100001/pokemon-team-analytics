import { memo, useMemo } from 'react';
import { SPECIES_STAT_MAX, captureDifficulty, formGenerationLabel, speciesFacts } from '../utils/speciesInfo';

const LABEL = 'block text-[10px] font-semibold uppercase text-umber';
const TILE = 'rounded-[4px] border border-ink/10 bg-paper/80 p-2.5';
const VALUE = 'text-xs font-bold text-ink';

const formatXp = (xp) => xp.toLocaleString('pt-BR');

/** Valor de 0 a 255 com a barra de tinta da ficha. */
function ScaleTile({ label, value, note }) {
  return (
    <div className={TILE}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={LABEL}>{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-ink">
          {value}
          <span className="text-[10px] font-medium text-umber">/{SPECIES_STAT_MAX}</span>
        </span>
      </div>
      <div className="brush-bar-track mt-1.5 !h-1.5">
        <div className="brush-bar bg-olive" style={{ width: `max(${(value / SPECIES_STAT_MAX) * 100}%, 4px)` }} />
      </div>
      {note && <span className="mt-1 block text-[11px] italic text-ink-soft">{note}</span>}
    </div>
  );
}

function FactTile({ label, children }) {
  return (
    <div className={TILE}>
      <span className={LABEL}>{label}</span>
      <span className={VALUE}>{children}</span>
    </div>
  );
}

/**
 * Dados da espécie na Ficha de Campo: captura, felicidade e curva de XP; e as classificações
 * (bebê, lendário, mítico), a geração de estreia, habitat, forma e cor.
 * A PokéAPI guarda esses dados só na espécie; a estreia é a única que segue a forma escolhida (`formName`).
 */
function SpeciesFacts({ species, formName, formLabel, gridGeneration, isAlternateForm }) {
  const facts = useMemo(() => speciesFacts(species), [species]);
  const generation = formGenerationLabel(formName, gridGeneration, species.generation?.name);

  return (
    <div className="space-y-3">
      {isAlternateForm && (
        <p className="text-[11px] italic text-ink-soft">
          A estreia é a de {formLabel}; os outros dados são da espécie, que a PokéAPI não separa por forma.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="font-reading text-sm font-bold text-ink">Captura & Criação</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {facts.captureRate != null && (
              <ScaleTile label="Taxa de captura" value={facts.captureRate} note={captureDifficulty(facts.captureRate)} />
            )}
            {facts.baseHappiness != null && <ScaleTile label="Felicidade inicial" value={facts.baseHappiness} />}
          </div>
          {facts.growthRate && (
            <FactTile label="Curva de XP">
              {facts.growthRate.label}
              {facts.growthRate.xp && (
                <span className="ml-1 font-normal text-ink-soft">· {formatXp(facts.growthRate.xp)} XP até o nível 100</span>
              )}
            </FactTile>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-reading text-sm font-bold text-ink">Classificação</h4>
          {facts.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {facts.badges.map((badge) => (
                <span key={badge} className="type-stamp font-bold text-vermilion">{badge}</span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {generation && <FactTile label="Estreia">{generation}</FactTile>}
            <FactTile label="Habitat">{facts.habitat ?? <span className="font-normal italic text-ink-soft">sem registro</span>}</FactTile>
            {facts.shape && <FactTile label="Forma">{facts.shape}</FactTile>}
            {facts.color && (
              <FactTile label="Cor">
                <span className="inline-flex items-center gap-1.5">
                  {facts.color.hex && (
                    <span aria-hidden="true" className="h-3 w-3 rounded-[2px] border border-ink/40" style={{ backgroundColor: facts.color.hex }} />
                  )}
                  {facts.color.label}
                </span>
              </FactTile>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SpeciesFacts);
