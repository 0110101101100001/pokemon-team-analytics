// Anéis da grade do teste do meta: vermelho, laranja, amarelo e verde fixos (--status-* em themes.css), para a
// legenda significar o mesmo em todos os temas; as cores de destaque do tema mudavam de matiz de um tema para outro.
export const STATUS = {
  none: { label: 'sem resposta', ring: 'ring-status-none', dot: 'bg-status-none' },
  weak: { label: 'fraca', ring: 'ring-status-weak', dot: 'bg-status-weak' },
  ok: { label: 'ok', ring: 'ring-status-ok', dot: 'bg-status-ok' },
  solid: { label: 'sólida', ring: 'ring-status-solid', dot: 'bg-status-solid' },
};
export const STATUS_ORDER = ['none', 'weak', 'ok', 'solid'];
