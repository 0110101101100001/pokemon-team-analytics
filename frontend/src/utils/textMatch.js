// Busca por texto das listas do site (golpes, habilidades, itens, Megas, Berries, treinadores): uma regra só, a mesma
// da Pokédex (normalizeSearchText). Ignora maiúsculas, acentos, espaços, hífens e apóstrofos, então "king's rock",
// "kings rock" e "kings-rock" acham o mesmo item, e "uturn" acha U-turn.
import { normalizeSearchText } from './search';

/** Texto pronto para comparar: "King's Rock" → "kingsrock". */
export const searchKey = (text) => normalizeSearchText(String(text ?? ''));

/**
 * Função que diz se algum dos textos contém o que foi digitado. Busca vazia aceita tudo.
 * Ex.: const matches = createTextMatcher(query); items.filter((item) => matches(item.name, item.category)).
 */
export function createTextMatcher(query) {
  const term = searchKey(String(query ?? '').trim());
  if (!term) return () => true;
  return (...texts) => texts.some((text) => text != null && searchKey(text).includes(term));
}
