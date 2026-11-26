// Peças comuns das ferramentas do esboço e da comparação de candidatos.

/** Botão secundário das barras de ferramentas dos cards (Corrigir, Regenerar, Desfazer, Salvar). */
export const TOOL_BUTTON_CLASS = 'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[3px] border border-ink/25 bg-paper px-3 text-xs font-semibold text-smeargle-text transition-colors hover:border-ink/55 hover:bg-olive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-paper';

/** Espera a próxima tarefa: deixa o navegador pintar o "Procurando…" antes de uma conta longa na thread principal. */
export const nextTask = () => new Promise((resolve) => { setTimeout(resolve, 0); });
