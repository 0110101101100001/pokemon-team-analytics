// Acesso ao localStorage que nunca quebra a página: aba anônima, bloqueio de cookies e cota cheia fazem o acesso
// lançar erro. Sem armazenamento, a leitura devolve null e a gravação não faz nada: a escolha vale só nesta visita.
// Guarde aqui só conveniências deste navegador (abas, modos de exibição, rascunhos), nunca o que precisa da conta.

/** O localStorage, ou null quando o navegador não deixa usar. */
export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Valor guardado em `key`, ou null. */
export function readStored(key) {
  try {
    return browserStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Guarda `value` (texto) em `key`; falhas são ignoradas. */
export function writeStored(key, value) {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // Sem armazenamento ou sem espaço: a escolha só vale até recarregar a página.
  }
}

/** Apaga `key`; falhas são ignoradas. */
export function removeStored(key) {
  try {
    browserStorage()?.removeItem(key);
  } catch {
    // Sem armazenamento, não há o que apagar.
  }
}
