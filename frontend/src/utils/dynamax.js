// Dynamax: 3 turnos com os PS dobrados (nível 10). Quem está em Dynamax só usa golpes Max, G-Max e Max Guard.
// `dynamax` guarda os turnos que faltam e `dynamaxSpent`, que ele acabou na batalha simulada. Enquanto dura,
// `stats.hp` e `currentHp` estão dobrados e `baseHp` guarda os PS máximos normais, que valem para cura e dano por turno.

export const DYNAMAX_TURNS = 3;

// Shedinja continua com 1 PS.
export const hpRatio = (species) => (species === 'shedinja' ? 1 : 2);

/** PS máximos sem o Dynamax. */
export const baseMaxHp = (side) => side.baseHp ?? side.stats.hp;

/** PS atuais convertidos para fora do Dynamax. */
export const withoutDynamax = (hp, species) => Math.ceil(hp / hpRatio(species));

/** O lado em batalha ao entrar em Dynamax. */
export function dynamaxed(side) {
  if (side.dynamax) return side;
  const ratio = hpRatio(side.species);
  return {
    ...side,
    dynamax: DYNAMAX_TURNS,
    dynamaxSpent: false,
    bide: null,
    baseHp: side.stats.hp,
    stats: { ...side.stats, hp: side.stats.hp * ratio },
    currentHp: side.currentHp == null ? side.currentHp : Math.min(side.currentHp, side.stats.hp) * ratio,
  };
}

/** O que muda no lado da calculadora ao ligar ou desligar o Dynamax à mão; `maxHp` são os PS máximos normais. */
export function toggleDynamax(side, maxHp, species = side.pokemon?.name) {
  const ratio = hpRatio(species);
  let { currentHp } = side;
  if (currentHp != null) {
    currentHp = side.dynamax
      ? withoutDynamax(Math.min(currentHp, maxHp * ratio), species)
      : Math.min(currentHp, maxHp) * ratio;
  }
  return { dynamax: side.dynamax ? 0 : DYNAMAX_TURNS, dynamaxSpent: false, bide: null, currentHp };
}

/** Modo em que o golpe sai de fato: o Dynamax obriga o Max, e depois que ele acaba o Max volta ao normal. */
export function effectiveMode(mode, side) {
  if (side?.dynamax) return mode === 'gmax' ? 'gmax' : 'max';
  if (side?.dynamaxSpent && (mode === 'max' || mode === 'gmax')) return '';
  return mode ?? '';
}
