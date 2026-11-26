// Logos por tema: o mapa THEME_LOGOS aponta para WebP em public/, geradas (npm run build:logos) a partir de PNG com
// canal alfa (RGBA, tipo de cor 6) no tamanho que o header espera. Arquivo ausente ou trocado quebra o CI.
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOGO_SIZE, REDUCED_LOGO_SIZE, THEME_IDS, THEME_LOGOS } from './themes';

const PUBLIC = fileURLToPath(new URL('../../public', import.meta.url));
const PNG_SIGNATURE = '89504e470d0a1a0a';

// Largura, altura e tipo de cor do cabeçalho IHDR, sem decodificar a imagem.
function pngInfo(src) {
  const path = `${PUBLIC}${src}`;
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  return {
    png: bytes.subarray(0, 8).toString('hex') === PNG_SIGNATURE,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    alpha: bytes[25] === 6,
  };
}

const pngOf = (src) => src.replace(/\.webp$/, '.png');

// A WebP existe, tem alfa e o mesmo tamanho do PNG de origem.
async function expectWebpLike(src) {
  const png = pngInfo(pngOf(src));
  const meta = await sharp(`${PUBLIC}${src}`).metadata();
  expect({ format: meta.format, width: meta.width, height: meta.height, alpha: meta.hasAlpha }, src)
    .toEqual({ format: 'webp', width: png.width, height: png.height, alpha: true });
}

describe.each(THEME_IDS)('logos do tema %s', (id) => {
  const { logo, reducedLogo } = THEME_LOGOS[id];

  it('logo completa: 1x de 372 × 96 e 2x de 744 × 192, com alfa', () => {
    expect(logo.src).toMatch(/^\/logo-[a-z]+\.webp$/);
    expect(pngInfo(pngOf(logo.src)), logo.src).toEqual({ png: true, ...LOGO_SIZE, alpha: true });
    expect(pngInfo(pngOf(logo.src2x)), logo.src2x).toEqual({ png: true, width: LOGO_SIZE.width * 2, height: LOGO_SIZE.height * 2, alpha: true });
  });

  it('as WebP usadas pelo site batem com os PNG', async () => {
    for (const src of [logo.src, logo.src2x, reducedLogo.src]) await expectWebpLike(src);
  });

  it('logo reduzida: logo-reduzida-<id>.png com alfa e proporção 300:64 (±1%)', () => {
    expect(reducedLogo.src).toMatch(/^\/logo-reduzida-[a-z]+\.webp$/);
    const info = pngInfo(pngOf(reducedLogo.src));
    expect(info, reducedLogo.src).not.toBeNull();
    expect(info.png && info.alpha).toBe(true);
    const ratio = (info.width / info.height) / (REDUCED_LOGO_SIZE.width / REDUCED_LOGO_SIZE.height);
    expect(Math.abs(ratio - 1)).toBeLessThanOrEqual(0.01);
    // O arquivo é a versão 3x do tamanho exibido.
    expect(info.width).toBeGreaterThanOrEqual(REDUCED_LOGO_SIZE.width * 2);
  });
});
