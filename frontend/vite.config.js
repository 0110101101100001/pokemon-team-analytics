import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

// Hash do conteúdo de public/data (caminhos e bytes): vira o ?v= das URLs de src/services/staticData.js.
function hashDirectory(dir) {
  const hash = createHash('sha256');
  const walk = (relative) => {
    for (const entry of readdirSync(path.join(dir, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else hash.update(child).update(readFileSync(path.join(dir, child)));
    }
  };
  walk('');
  return hash.digest('hex').slice(0, 10);
}

// Preload da fonte do texto corrido (Newsreader, recorte latin): o nome tem hash, então entra no index.html só no
// build. Sem isso o navegador só descobre o arquivo depois de baixar e ler o CSS.
const PRELOADED_FONT = /newsreader-latin-opsz-normal-[\w-]+\.woff2$/;
const preloadFont = () => ({
  name: 'preload-font',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html, { bundle }) => {
      const file = Object.keys(bundle ?? {}).find((name) => PRELOADED_FONT.test(name));
      if (!file) return html;
      return [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' }, injectTo: 'head' }];
    },
  },
});

export default defineConfig({
  plugins: [react(), preloadFont()],
  build: {
    // As texturas e pincéis do header (src/assets/header) viram arquivos, nunca data: URI dentro do CSS: os SVG de
    // ~4 KB entrariam no limite padrão e, usados em mask e -webkit-mask, apareceriam duas vezes no CSS inicial.
    // Como arquivos, ficam no cache imutável de /assets e o CSS não precisa ser baixado de novo quando só eles mudam.
    assetsInlineLimit: (file) => (file.replace(/\\/g, '/').includes('/src/assets/header/') ? false : undefined),
  },
  define: {
    __DATA_VERSION__: JSON.stringify(hashDirectory(path.resolve(__dirname, 'public/data'))),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      'lucide.react': path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/lucide-react.js'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
