const RELATIVE = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const STEPS = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];

/** "há 5 minutos", "ontem", "há 3 semanas". */
export function timeAgo(iso, now = Date.now()) {
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [size, unit] of STEPS) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return '';
}
