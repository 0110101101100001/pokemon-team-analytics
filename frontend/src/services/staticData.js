// Dados gerados pelos scripts (um arquivo por golpe, por jogo ou por Pokémon) ficam em public/data e são baixados
// com fetch, um arquivo por vez. Não passam pelo import.meta.glob, que poria no pacote um mapa com todos os
// caminhos (centenas de KB só de nomes). O ?v= é o hash do conteúdo de public/data (vite.config.js): cada deploy
// com dados novos troca a URL, e o netlify.toml pode servir /data/* com cache imutável.
// eslint-disable-next-line no-undef
const VERSION = typeof __DATA_VERSION__ === 'string' ? __DATA_VERSION__ : 'dev';

const requests = new Map();

async function load(path) {
  const response = await fetch(`/data/${path}?v=${VERSION}`);
  // Arquivo que não existe: o fallback da SPA (Netlify e Vite) responde com o index.html, não com JSON.
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
  return response.json();
}

/** JSON de public/data/<path>, ou null se o arquivo não existe. Uma requisição por caminho; uma falha de rede não fica guardada. */
export function fetchStaticJson(path) {
  let pending = requests.get(path);
  if (!pending) {
    pending = load(path);
    pending.catch(() => requests.delete(path));
    requests.set(path, pending);
  }
  return pending;
}
