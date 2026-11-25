/** Relevância de um resultado da busca: quanto menor, mais acima na grade. */
export const SEARCH_RANK = { exact: 0, prefix: 1, contains: 2, fuzzy: 3 };

const FUZZY_THRESHOLD = 0.3;
// A sugestão do "Quis dizer" aceita um erro maior que o dos resultados.
const SUGGEST_THRESHOLD = 0.4;
const MIN_FUZZY_LENGTH = 3;

const DEX_QUERY = /^(?:#|n[º°o]\.?\s*)?(\d+)$/i;
const DIACRITICS = /[̀-ͯ]/g;
const SEPARATORS = /[\s\-_'’.:]/g;

/** "Mr. Mime" → "mrmime", "Farfetch'd" → "farfetchd", "Flabébé" → "flabebe", "Nidoran♀" → "nidoranf". */
export function normalizeSearchText(text) {
  return text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(SEPARATORS, '');
}

// O fuse.js fica fora do pacote inicial: é baixado na primeira busca. Até chegar, valem só igual/começa/contém.
let Fuse = null;
let fuzzyRequest = null;

/** Carrega o fuse.js uma vez; resolve com true quando o fuzzy fica disponível. */
export function loadFuzzySearch() {
  fuzzyRequest ??= import('fuse.js')
    .then((module) => {
      Fuse = module.default;
      return true;
    })
    .catch(() => {
      fuzzyRequest = null;
      return false;
    });
  return fuzzyRequest;
}

/**
 * Índice dos nomes da Pokédex, montado uma vez por lista. O Fuse só é criado na primeira busca que precisa dele.
 * Os nomes da PokéAPI estão só em inglês: não há tradução para indexar.
 */
export function createSearchIndex(entries) {
  const docs = [...new Set(entries.map((entry) => entry.name))].map((name) => ({ name, key: normalizeSearchText(name) }));
  let fuse = null;
  return {
    docs,
    /** O Fuse deste índice, ou null enquanto o fuse.js não foi carregado. */
    get fuse() {
      if (!Fuse) return null;
      fuse ??= new Fuse(docs, { keys: ['key'], threshold: SUGGEST_THRESHOLD, ignoreLocation: true, includeScore: true });
      return fuse;
    },
  };
}

function textRanks(index, term) {
  const ranks = new Map();
  for (const { name, key } of index.docs) {
    if (key === term) ranks.set(name, SEARCH_RANK.exact);
    else if (key.startsWith(term)) ranks.set(name, SEARCH_RANK.prefix);
    else if (key.includes(term)) ranks.set(name, SEARCH_RANK.contains);
  }
  // O fuzzy só entra quando o texto não aparece em nenhum nome: com "nidoran" achando os dois Nidoran,
  // trazer Nidorina e Minior por semelhança seria ruído.
  if (ranks.size === 0 && term.length >= MIN_FUZZY_LENGTH && index.fuse) {
    for (const { item, score } of index.fuse.search(term)) {
      if (score <= FUZZY_THRESHOLD) ranks.set(item.name, SEARCH_RANK.fuzzy);
    }
  }
  return ranks;
}

/**
 * Converte o texto da pesquisa numa função `entrada → relevância` (undefined quando não casa), ou null sem busca.
 * - Número: "25", "025", "#25" e "Nº 25" são o número exato (as formas compartilham o da espécie).
 * - Nome: sem acentos, maiúsculas, espaços, hífens, apóstrofos e pontos; igual > começa com > contém > fuzzy.
 */
export function createSearch(index, rawTerm) {
  const trimmed = rawTerm.trim();
  if (!trimmed) return null;

  const dex = trimmed.match(DEX_QUERY);
  if (dex) {
    const number = Number(dex[1]);
    return (entry) => (entry.number === number ? SEARCH_RANK.exact : undefined);
  }

  const term = normalizeSearchText(trimmed);
  if (!term) return () => undefined;
  const ranks = textRanks(index, term);
  return (entry) => ranks.get(entry.name);
}

/** O nome mais parecido com o termo entre `allowed` (nomes que passam nos outros filtros), para o "Quis dizer". */
export function suggestName(index, rawTerm, allowed) {
  const term = normalizeSearchText(rawTerm.trim());
  if (term.length < MIN_FUZZY_LENGTH || DEX_QUERY.test(rawTerm.trim()) || !index.fuse) return null;
  return index.fuse.search(term).find(({ item }) => allowed.has(item.name))?.item.name ?? null;
}
