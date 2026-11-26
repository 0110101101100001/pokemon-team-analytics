// A Content-Security-Policy mora no netlify.toml. Este teste quebra quando o script de tema do index.html muda
// sem atualizar o hash, ou quando o código passa a buscar sprites, sons ou dados num domínio que a política bloqueia.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPRITES_BASE } from '../services/api';
import { trainerSpriteUrl } from '../utils/trainers';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const csp = read('../../../netlify.toml').match(/Content-Security-Policy = "([^"]+)"/)[1];
const directive = (name) => csp.split(';').map((part) => part.trim().split(/\s+/)).find(([key]) => key === name)?.slice(1) ?? [];
const origin = (url) => new URL(url).origin;

describe('Content-Security-Policy do netlify.toml', () => {
  it('libera o script inline do index.html pelo hash (o Netlify serve com LF)', () => {
    const inline = read('../../index.html').replace(/\r\n/g, '\n').match(/<script>([\s\S]*?)<\/script>/)[1];
    const hash = `'sha256-${createHash('sha256').update(inline).digest('base64')}'`;
    expect(directive('script-src'), `troque o hash no netlify.toml por ${hash}`).toContain(hash);
  });

  it('o index.html tem um único script inline', () => {
    expect(read('../../index.html').match(/<script>/g)).toHaveLength(1);
  });

  it('não libera eval nem scripts inline sem hash', () => {
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('script-src')).not.toContain("'unsafe-eval'");
    expect(directive('object-src')).toEqual(["'none'"]);
    expect(directive('frame-ancestors')).toEqual(["'none'"]);
  });

  it('libera os domínios de imagem, som e dados que o código usa', () => {
    expect(directive('img-src')).toEqual(expect.arrayContaining([origin(SPRITES_BASE), origin(trainerSpriteUrl('red'))]));
    const cries = read('../components/PokemonCry.jsx').match(/CRIES_BASE = '([^']+)'/)[1];
    expect(directive('media-src')).toContain(origin(cries));
    const pokeApi = read('../services/api.js').match(/POKEAPI_BASE = '([^']+)'/)[1];
    expect(directive('connect-src')).toContain(origin(pokeApi));
  });
});
