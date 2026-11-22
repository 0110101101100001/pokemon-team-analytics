// A PokéAPI publica sem poder os golpes que dependem da felicidade: vale sempre o máximo (felicidade 0 no Frustration).
// Módulo sem dependências, para rodar também no Worker do esboço.
const MAX_HAPPINESS_POWER = { return: 102, frustration: 102, 'pika-papow': 102, 'veevee-volley': 102 };

/** Poder do golpe pelo nome, com o máximo nos que dependem da felicidade. */
export const movePowerOf = (data) => data?.power ?? MAX_HAPPINESS_POWER[data?.name] ?? null;

/** Resumo de golpe já montado (times salvos guardam o poder da época) com o poder máximo preenchido. */
export function withMaxPower(move) {
  if (!move || move.power) return move;
  const power = movePowerOf({ name: move.slug });
  return power ? { ...move, power } : move;
}
