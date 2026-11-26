// Os sprites vêm do repositório PokeAPI/sprites pelo jsDelivr: a mesma árvore de arquivos, com CDN e cache de 7 dias
// (o raw.githubusercontent.com só guarda por 5 minutos). Sem dependências: dá para usar em testes e em qualquer tela.
export const SPRITES_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites';
const RAW_SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const POKEMON = `${SPRITES_BASE}/pokemon`;

/** As URLs de sprite que a PokéAPI devolve apontam para o raw do GitHub; aqui passam a usar a CDN. */
export const spriteCdnUrl = (url) => (url?.startsWith(RAW_SPRITES_BASE) ? SPRITES_BASE + url.slice(RAW_SPRITES_BASE.length) : url);

// O 2D animado é o de Black/White, que só existe até o fim da geração V.
export const LAST_GEN5_NUMBER = 649;

/**
 * Ordem de tentativa do sprite grande da ficha, pelo estilo escolhido em Configurações → Preferências:
 * - '2d': o sprite pixelado dos jogos, parado;
 * - '2d-animated': o animado de Black/White (até o nº 649), com o 2D parado de reserva;
 * - '3d-animated': o animado do Showdown;
 * - 'static': a arte oficial.
 * Cada estilo tenta primeiro os do mesmo jeito e só depois os outros, para a ficha nunca ficar sem imagem.
 * `detail` é a resposta de /pokemon/{id} da PokéAPI.
 */
export function heroSpriteSources(detail, { shiny = false, style = '3d-animated' } = {}) {
  const sprites = detail.sprites ?? {};
  const other = sprites.other ?? {};
  const pick = (group) => spriteCdnUrl(shiny ? group?.front_shiny : group?.front_default);
  const variant = shiny ? 'shiny/' : '';
  const { id } = detail;

  const flat2d = pick(sprites) ?? `${POKEMON}/${variant}${id}.png`;
  const gen5 = pick(sprites.versions?.['generation-v']?.['black-white']?.animated)
    ?? (id <= LAST_GEN5_NUMBER ? `${POKEMON}/versions/generation-v/black-white/animated/${variant}${id}.gif` : null);
  const showdown = pick(other.showdown) ?? `${POKEMON}/other/showdown/${variant}${id}.gif`;
  const artwork = pick(other['official-artwork']) ?? `${POKEMON}/other/official-artwork/${variant}${id}.png`;

  const order = {
    '2d': [flat2d, gen5, showdown, artwork],
    '2d-animated': [gen5, flat2d, showdown, artwork],
    '3d-animated': [showdown, artwork, flat2d],
    static: [artwork, showdown, flat2d],
  }[style] ?? [showdown, artwork, flat2d];

  return [...new Set(order.filter(Boolean))];
}

/** Arte oficial é desenho liso; o resto é pixel art e cresce sem borrar. */
export const isPixelSprite = (url) => !url.includes('/official-artwork/');

// Imagens em download: a referência fica até terminar, para o navegador não descartar o pedido.
const inFlight = new Set();
const requested = new Set();

/**
 * Começa a baixar o sprite da ficha antes de ele aparecer. As URLs de heroSpriteSources só dependem do número,
 * então a do primeiro estilo é a mesma que a ficha vai pedir: quando ela renderizar, a imagem já está no cache
 * (ou a caminho). Uma vez por URL, e só a primeira opção.
 * `priority`: 'high' para o que vai aparecer agora; 'low' para o que pode aparecer (a outra cor, no botão Shiny).
 */
export function preloadHeroSprite(id, { shiny = false, style = '3d-animated', priority = 'high' } = {}) {
  if (!Number.isInteger(id) || typeof Image === 'undefined') return null;
  const [url] = heroSpriteSources({ id }, { shiny, style });
  if (!url || requested.has(url)) return url ?? null;
  requested.add(url);
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = priority;
  const done = () => inFlight.delete(image);
  image.onload = done;
  image.onerror = done;
  inFlight.add(image);
  image.src = url;
  return url;
}
