import { calcStat, natureOf } from './stats';

// Tabela de velocidades: os mais usados de um tier da Smogon, cada um com o spread mais popular,
// e o Pokémon da ficha encaixado entre eles.

export const SPEED_TIER_SIZE = 50;
export const SCARF = 1.5;
export const TAILWIND = 2;
// Abaixo disso o Scarf é raro demais no Pokémon para valer uma coluna.
export const SCARF_MIN_USAGE = 5;

/** A Little Cup é jogada no nível 5; os outros tiers, no 100. */
export const tierLevel = (tier) => (tier.endsWith('lc') ? 5 : 100);

// "Jolly:0/252/0/0/4/252": natureza e os seis EVs, na ordem HP/Atk/Def/SpA/SpD/Spe.
const SPREAD_PATTERN = /^([A-Za-z]+):(\d+(?:\/\d+){5})$/;

function parseSpread(key) {
  const match = SPREAD_PATTERN.exec(key);
  if (!match) return null;
  return { nature: match[1].toLowerCase(), ev: Number(match[2].split('/')[5]) };
}

/** Spread mais usado ({ nature, ev } da Velocidade), ou null sem nenhum no formato. */
export function topSpread(spreads) {
  const ranked = Object.entries(spreads ?? {}).sort(([, a], [, b]) => b - a);
  for (const [key] of ranked) {
    const spread = parseSpread(key);
    if (spread) return spread;
  }
  return null;
}

/** Investimentos que o usuário pode escolher para o Pokémon da ficha. */
export const INVESTMENTS = {
  common: { label: 'Spread mais usado' },
  max: { label: 'Máxima (252 EVs, natureza +Vel.)', spread: { nature: 'jolly', ev: 252 } },
  neutral: { label: 'Neutra (252 EVs)', spread: { nature: 'hardy', ev: 252 } },
  min: { label: 'Mínima (Trick Room)', spread: { nature: 'brave', ev: 0, iv: 0 } },
};

/** Velocidade final, sem modificadores de batalha. */
export const speedStat = (base, { nature, ev, iv = 31 }, level) =>
  calcStat('spe', base, { level, ev, iv, nature: natureOf(nature) });

/** Aplica Choice Scarf e Tailwind, arredondando para baixo a cada passo, como no jogo. */
export function boostedSpeed(speed, { scarf = false, tailwind = false } = {}) {
  const scarfed = scarf ? Math.floor(speed * SCARF) : speed;
  return tailwind ? scarfed * TAILWIND : scarfed;
}

/**
 * Os `limit` mais usados com velocidade conhecida, do mais rápido ao mais lento.
 * `rows`: linhas da Smogon (name, usage_percent, spreads, items), já do mais usado ao menos usado.
 * `resolve(name)` devolve { entryName, id, baseSpeed } do Pokémon, ou null se ele não estiver na Pokédex.
 * Sem spread no formato, vale a velocidade máxima.
 */
export function buildSpeedTiers(rows, resolve, level, limit = SPEED_TIER_SIZE) {
  const tiers = [];
  for (const row of rows) {
    if (tiers.length === limit) break;
    const pokemon = resolve(row.name);
    if (!pokemon) continue;
    const speed = speedStat(pokemon.baseSpeed, topSpread(row.spreads) ?? INVESTMENTS.max.spread, level);
    const scarfUsage = row.items?.['Choice Scarf'] ?? 0;
    tiers.push({
      ...pokemon,
      name: row.name,
      usage: Number(row.usage_percent) || 0,
      speed,
      scarfUsage,
      scarfSpeed: scarfUsage >= SCARF_MIN_USAGE ? boostedSpeed(speed, { scarf: true }) : null,
    });
  }
  return tiers.sort((a, b) => b.speed - a.speed || b.usage - a.usage);
}

/** Quantos da tabela são mais lentos, empatam ou são mais rápidos que `speed`. */
export function placeSpeed(tiers, speed) {
  const result = { outspeeds: 0, ties: 0, outspedBy: 0 };
  for (const tier of tiers) {
    if (tier.speed < speed) result.outspeeds += 1;
    else if (tier.speed === speed) result.ties += 1;
    else result.outspedBy += 1;
  }
  return result;
}
