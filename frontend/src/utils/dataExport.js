// Arquivo do "Exportar meus dados" (Configurações → Meus dados).

const EXPORT_VERSION = 1;

/** Nome do arquivo: smearglepedia-dados-2026-11-26.json (data local). */
export function exportFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `smearglepedia-dados-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** O conteúdo do arquivo: quem, quando e o que a conta guarda, tabela por tabela. */
export function buildExport({ email, userId, data, now = new Date() }) {
  return {
    site: 'Smearglepedia',
    versao: EXPORT_VERSION,
    exportado_em: now.toISOString(),
    conta: { id: userId, email },
    ...data,
  };
}
